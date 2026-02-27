import { useState, useMemo } from "react";

/* ─── DEFAULT DATA ─── */
const DEFAULT_ALLOWANCES = [
  { id: 1, name: "Site Allowance", type: "perHour", amount: 2.50, superApplicable: false, enabled: true },
];

const DEFAULT_MILESTONES = [
  { id: 1, name: "6 Month Commencement", amount: 3500, month: 6 },
  { id: 2, name: "Halfway", amount: 3000, month: 24 },
  { id: 3, name: "Completion", amount: 3500, month: 48 },
];

const DEFAULT_PENALTIES = [
  { id: "ot15", label: "Time & a Half", mult: 1.5, cat: "overtime" },
  { id: "ot20", label: "Double Time", mult: 2.0, cat: "overtime" },
  { id: "ot25", label: "Double Time & a Half", mult: 2.5, cat: "overtime" },
  { id: "ph", label: "Public Holiday Worked", mult: 2.5, cat: "penalty" },
  { id: "night12", label: "Night Shift (≤4 nights)", mult: 1.2, cat: "penalty" },
  { id: "night13", label: "Night Shift (4+ weeks)", mult: 1.3, cat: "penalty" },
  { id: "satnight", label: "Saturday Night Shift", mult: 1.5, cat: "penalty" },
  { id: "sunnight", label: "Sunday Night Shift", mult: 2.0, cat: "penalty" },
];

/* ─── CALCULATION ENGINE ─── */
function calculate(cfg) {
  const {
    wage, allowances, superRate, wcRate, leaveLoad, marginType, marginVal,
    ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk,
    billableWk, appYears, superOnOT, fundingTotal, fundingMethod, fundingPct,
    penalties
  } = cfg;

  // Allowance aggregation
  let allowPerHour = 0, allowPerHourSuper = 0;
  (allowances || []).filter(a => a.enabled).forEach(a => {
    let ph = 0;
    if (a.type === "perHour") ph = a.amount;
    else if (a.type === "perDay") ph = a.amount / (hpw / dpw);
    else if (a.type === "perWeek") ph = a.amount / hpw;
    else if (a.type === "percent") ph = wage * (a.amount / 100);
    else if (a.type === "perKm") ph = a.amount; // user enters effective $/hr
    allowPerHour += ph;
    if (a.superApplicable) allowPerHourSuper += ph;
  });

  const recv = wage + allowPerHour;
  const superBearingRate = wage + allowPerHourSuper; // base for super calc
  const wkPay = recv * hpw;
  const wkWage = wage * hpw;
  const wkSuperBearing = superBearingRate * hpw;

  // Week allocation
  const alWk = alDays / dpw;
  const phWk = phDays / dpw;
  const sickWk = sickDays / dpw;
  const totalNonBillable = alWk + phWk + sickWk + trainWk;
  const impliedBillable = 52 - totalNonBillable;

  // Annual pay components
  const worked = wkPay * billableWk;
  const tafePay = wkPay * trainWk;
  const alPay = (wkPay * alWk) * (1 + leaveLoad);
  const persLeave = wkPay * sickWk;
  const phPay = wkPay * phWk;

  // Total annual pay (48 productive weeks + AL)
  const totAnnPay = (wkPay * 48) + alPay;

  // Super on total annual pay (using super-bearing portion)
  const totAnnPaySuper = (wkSuperBearing * 48) + ((wkWage * alWk) * (1 + leaveLoad));
  const superAmt = totAnnPaySuper * superRate;

  const annPkg = totAnnPay + superAmt;
  const wc = (worked + tafePay) * wcRate;

  // Overheads: flat or %
  const oh = ohType === "percent" ? totAnnPay * (ohVal / 100) : ohVal;

  const totCost = annPkg + cfg.study + cfg.ppe + wc + oh;

  // Hourly calcs
  const bHrs = billableWk * hpw;
  const tHrs = 52 * hpw;
  const trainHrs = trainWk * hpw;
  const nonBillHrs = tHrs - bHrs - trainHrs;

  const billedWage = (recv * tHrs) / bHrs;
  const ordCost = totCost / bHrs;
  const billedOnc = ordCost - billedWage;

  // Margin: flat or %
  const marginPH = marginType === "percent" ? ordCost * (marginVal / 100) : marginVal;
  const quoted = ordCost + marginPH;

  // OT base
  const otOncFactor = 0.12;
  const otOnc = (totAnnPay * otOncFactor) / bHrs;
  const otSuperPH = superOnOT ? (superBearingRate * superRate) : 0;
  const ot1x = recv + marginPH + otOnc;

  // Penalty oncosts for complex penalty calcs
  const penOnc = (cfg.study + cfg.ppe + wc) / bHrs + 0.15;

  // Funding calculation
  const totalBillableHrsApp = bHrs * appYears;
  let fundingPH = 0;
  if (fundingMethod === "reduce" && totalBillableHrsApp > 0) {
    fundingPH = fundingTotal / totalBillableHrsApp;
  } else if (fundingMethod === "passPercent" && totalBillableHrsApp > 0) {
    fundingPH = (fundingTotal * (fundingPct / 100)) / totalBillableHrsApp;
  }
  // "passThrough" = no charge rate impact

  // Per-hour oncost breakdown
  const oncAL = alPay / bHrs;
  const oncPH = phPay / bHrs;
  const oncSick = persLeave / bHrs;
  const oncTafe = tafePay / bHrs;
  const oncStudy = cfg.study / bHrs;
  const oncPPE = cfg.ppe / bHrs;
  const oncSuper = superAmt / bHrs;
  const oncWC = wc / bHrs;
  const oncOH = oh / bHrs;
  const totOnc = oncAL + oncPH + oncSick + oncTafe + oncStudy + oncPPE + oncSuper + oncWC + oncOH;

  // Build charge rates
  const rates = {};
  // Ordinary time
  rates.ord = { charge: quoted, funded: quoted - fundingPH, funding: fundingPH };

  penalties.forEach(pr => {
    if (pr.cat === "overtime") {
      // OT: no funding discount
      const otCharge = ot1x * pr.mult + (superOnOT ? otSuperPH * (pr.mult - 1) : 0);
      rates[pr.id] = { charge: otCharge, funded: otCharge, funding: 0 };
    } else if (pr.cat === "penalty") {
      // Penalty on ordinary hours: funding discount applies FLAT (not multiplied)
      const penCharge = ((48 / 52) * penOnc * pr.mult) + (billedWage * pr.mult) + marginPH;
      rates[pr.id] = { charge: penCharge, funded: penCharge - fundingPH, funding: fundingPH };
    }
  });

  return {
    recv, wkPay, wkWage, worked, tafePay, alPay, persLeave, phPay,
    totAnnPay, superAmt, annPkg, wc, oh, totCost,
    bHrs, tHrs, trainHrs, nonBillHrs,
    billedWage, billedOnc, ordCost, quoted, marginPH,
    otOnc, ot1x, penOnc,
    oncAL, oncPH, oncSick, oncTafe, oncStudy, oncPPE, oncSuper, oncWC, oncOH, totOnc,
    rates, billableWk, fundingPH, fundingTotal, totalBillableHrsApp,
    allowPerHour, allowPerHourSuper,
    // Week allocation
    alWk, phWk, sickWk, trainWk, impliedBillable,
  };
}

/* ─── HELPERS ─── */
const f = (v, d = 2) => v == null || isNaN(v) ? "—" : v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });
const fd = (v, d = 2) => `$${f(v, d)}`;
let _id = 100;
const nid = () => ++_id;

/* ─── UI COMPONENTS ─── */
const V = { bg: "#080c14", sf: "#0f1520", cd: "#161f2e", inp: "#131a28", brd: "#1c2840", acc: "#e5a526", acc2: "#3b82f6", txt: "#e8edf5", ts: "#8896ab", tm: "#576880", grn: "#34d399", red: "#f87171" };

function Inp({ label, value, onChange, suffix, step = "0.01", min = "0", wide }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="block text-xs mb-1" style={{ color: V.tm, letterSpacing: "0.04em" }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step} min={min}
          className="w-full rounded px-2 py-1.5 text-sm font-mono border focus:outline-none focus:ring-1"
          style={{ background: V.inp, borderColor: V.brd, color: V.txt, "--tw-ring-color": V.acc }} />
        {suffix && <span className="text-xs whitespace-nowrap min-w-fit" style={{ color: V.tm }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative w-8 h-4 rounded-full transition-colors" style={{ background: value ? V.acc : V.brd }}
        onClick={() => onChange(!value)}>
        <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all bg-white" style={{ left: value ? "17px" : "2px" }} />
      </div>
      <span className="text-xs" style={{ color: V.ts }}>{label}</span>
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: V.tm, letterSpacing: "0.04em" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded px-2 py-1.5 text-sm border focus:outline-none focus:ring-1"
        style={{ background: V.inp, borderColor: V.brd, color: V.txt, "--tw-ring-color": V.acc }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Panel({ title, children, accent, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColor = accent === "blue" ? V.acc2 : accent === "green" ? V.grn : V.acc;
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: V.sf, borderColor: V.brd }}>
      <div className="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none"
        onClick={() => collapsible && setOpen(!open)}
        style={{ borderBottom: open ? `1px solid ${V.brd}` : "none" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: V.tm }}>{title}</span>
        </div>
        {collapsible && <span className="text-xs transition-transform" style={{ color: V.tm, transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>}
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function WeekBar({ label, weeks, color, total = 52 }) {
  const pct = (weeks / total) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-24 text-right truncate" style={{ color: V.ts }}>{label}</span>
      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: V.brd }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-12 text-right" style={{ color: V.ts }}>{f(weeks, 1)}w</span>
    </div>
  );
}

function CostRow({ label, val, total, bold }) {
  const pct = total > 0 ? Math.min(Math.abs(val / total) * 100, 100) : 0;
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? "font-semibold" : ""}`} style={{ color: bold ? V.acc : V.ts }}>
      <span className="text-sm truncate mr-2">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        {!bold && <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: V.brd }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: V.acc }} />
        </div>}
        <span className="text-sm font-mono w-24 text-right">{fd(val)}</span>
      </div>
    </div>
  );
}

function RateCard({ label, charge, funded, funding, big, glow }) {
  const hasFunding = funding > 0;
  return (
    <div className="rounded-lg p-2.5 transition-colors" style={{ background: glow ? "rgba(229,165,38,0.08)" : V.cd, border: `1px solid ${glow ? "rgba(229,165,38,0.25)" : V.brd}` }}>
      <div className="text-xs mb-0.5" style={{ color: V.tm }}>{label}</div>
      {hasFunding ? (
        <>
          <div className={`font-mono font-bold ${big ? "text-xl" : "text-base"}`} style={{ color: glow ? V.acc : V.txt }}>
            {fd(funded)}<span className="text-xs font-normal ml-0.5" style={{ color: V.tm }}>/hr</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-mono line-through" style={{ color: V.tm }}>{fd(charge)}</span>
            <span className="text-xs font-mono" style={{ color: V.grn }}>−{fd(funding)}</span>
          </div>
        </>
      ) : (
        <div className={`font-mono font-bold ${big ? "text-xl" : "text-base"}`} style={{ color: glow ? V.acc : V.txt }}>
          {fd(charge)}<span className="text-xs font-normal ml-0.5" style={{ color: V.tm }}>/hr</span>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function App() {
  // Core
  const [wage, setWage] = useState(29.50);
  const [hpw, setHpw] = useState(38);
  const [hpd, setHpd] = useState(7.6);
  const [dpw, setDpw] = useState(5);
  const [billableWk, setBillableWk] = useState(39);
  const [trainWk, setTrainWk] = useState(5);
  const [appYears, setAppYears] = useState(4);

  // Leave
  const [alDays, setAlDays] = useState(20);
  const [phDays, setPhDays] = useState(10);
  const [sickDays, setSickDays] = useState(10);
  const [leaveLoad, setLeaveLoad] = useState(17.5);

  // Oncosts
  const [superRate, setSuperRate] = useState(12.0);
  const [superOnOT, setSuperOnOT] = useState(false);
  const [wcRate, setWcRate] = useState(4.7);
  const [ohType, setOhType] = useState("percent");
  const [ohVal, setOhVal] = useState(6.5);
  const [study, setStudy] = useState(850);
  const [ppe, setPpe] = useState(350);

  // Margin
  const [marginType, setMarginType] = useState("flat");
  const [marginVal, setMarginVal] = useState(2.10);

  // Allowances
  const [allowances, setAllowances] = useState(DEFAULT_ALLOWANCES);

  // Funding
  const [fundingEnabled, setFundingEnabled] = useState(true);
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [fundingMethod, setFundingMethod] = useState("reduce");
  const [fundingPct, setFundingPct] = useState(100);

  // Penalties
  const [penalties, setPenalties] = useState(DEFAULT_PENALTIES);

  // UI
  const [tab, setTab] = useState("rates");
  const [compare, setCompare] = useState(false);

  const fundingTotal = fundingEnabled ? milestones.reduce((s, m) => s + m.amount, 0) : 0;

  const cfg = {
    wage, allowances, superRate: superRate / 100, wcRate: wcRate / 100, leaveLoad: leaveLoad / 100,
    marginType, marginVal: marginType === "percent" ? marginVal : marginVal,
    ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk, billableWk,
    appYears, superOnOT, fundingTotal, fundingMethod, fundingPct, study, ppe, penalties,
  };

  const res = useMemo(() => calculate(cfg), [wage, JSON.stringify(allowances), superRate, wcRate, leaveLoad, marginType, marginVal, ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk, billableWk, appYears, superOnOT, fundingTotal, fundingMethod, fundingPct, study, ppe, JSON.stringify(penalties)]);

  // Compare across 3 standard models
  const cmpModels = [
    { key: "s39", label: "Standard (39w)", bw: 39 },
    { key: "a48", label: "ALEX (48w)", bw: 48 },
    { key: "w52", label: "52 Week", bw: 52 },
  ];
  const cmpRes = useMemo(() => {
    if (!compare) return null;
    return Object.fromEntries(cmpModels.map(m => [m.key, calculate({ ...cfg, billableWk: m.bw })]));
  }, [compare, wage, JSON.stringify(allowances), superRate, wcRate, leaveLoad, marginType, marginVal, ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk, appYears, superOnOT, fundingTotal, fundingMethod, fundingPct, study, ppe, JSON.stringify(penalties)]);

  // Allowance CRUD
  const addAllowance = () => setAllowances([...allowances, { id: nid(), name: "New Allowance", type: "perHour", amount: 0, superApplicable: false, enabled: true }]);
  const updateAllowance = (id, field, val) => setAllowances(allowances.map(a => a.id === id ? { ...a, [field]: val } : a));
  const removeAllowance = (id) => setAllowances(allowances.filter(a => a.id !== id));

  // Milestone CRUD
  const addMilestone = () => setMilestones([...milestones, { id: nid(), name: "Milestone", amount: 0, month: 12 }]);
  const updateMilestone = (id, field, val) => setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: val } : m));
  const removeMilestone = (id) => setMilestones(milestones.filter(m => m.id !== id));

  // Penalty CRUD
  const addPenalty = () => setPenalties([...penalties, { id: `pen${nid()}`, label: "New Rate", mult: 1.0, cat: "penalty" }]);
  const updatePenalty = (id, field, val) => setPenalties(penalties.map(p => p.id === id ? { ...p, [field]: val } : p));
  const removePenalty = (id) => setPenalties(penalties.filter(p => p.id !== id));

  return (
    <div className="min-h-screen" style={{ background: V.bg, color: V.txt, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        input[type=number]::-webkit-inner-spin-button{opacity:0.4}
        .font-mono{font-family:'JetBrains Mono',monospace!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${V.bg}}::-webkit-scrollbar-thumb{background:${V.brd};border-radius:3px}
        select{appearance:auto}
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-20 backdrop-blur-md border-b" style={{ background: "rgba(8,12,20,0.9)", borderColor: V.brd }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold" style={{ background: V.acc, color: V.bg }}>CC</div>
            <div>
              <h1 className="text-sm font-semibold">GTO Charge Rate Calculator</h1>
              <p className="text-xs" style={{ color: V.tm }}>Apprentice & Trainee Host Employer Charges</p>
            </div>
          </div>
          <button onClick={() => setCompare(!compare)}
            className="px-3 py-1.5 rounded text-xs font-medium border transition-all"
            style={{ background: compare ? "rgba(59,130,246,0.1)" : "transparent", borderColor: compare ? "rgba(59,130,246,0.3)" : V.brd, color: compare ? V.acc2 : V.tm }}>
            {compare ? "✓ Comparing" : "Compare Models"}
          </button>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ═══ LEFT CONFIG COLUMN ═══ */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">

            {/* WAGE & HOURS */}
            <Panel title="Wage & Hours">
              <div className="grid grid-cols-2 gap-2.5">
                <Inp label="Base Wage Rate" value={wage} onChange={setWage} suffix="/hr" wide />
                <Inp label="Hours / Week" value={hpw} onChange={setHpw} />
                <Inp label="Hours / Day" value={hpd} onChange={setHpd} />
                <Inp label="Days / Week" value={dpw} onChange={setDpw} step="1" />
                <Inp label="Apprenticeship" value={appYears} onChange={setAppYears} suffix="years" step="1" />
              </div>
            </Panel>

            {/* BILLING MODEL */}
            <Panel title="Billing Model" accent="blue">
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <Inp label="Billable Weeks" value={billableWk} onChange={setBillableWk} suffix="/yr" step="1" />
                <Inp label="Training Weeks" value={trainWk} onChange={setTrainWk} suffix="/yr" step="1" />
              </div>
              <div className="flex gap-1.5 mb-3">
                {[{ l: "Standard (39w)", v: 39 }, { l: "ALEX (48w)", v: 48 }, { l: "52 Week", v: 52 }].map(p => (
                  <button key={p.v} onClick={() => setBillableWk(p.v)}
                    className="flex-1 py-1.5 rounded text-xs font-medium border transition-all"
                    style={{ background: billableWk === p.v ? "rgba(59,130,246,0.1)" : "transparent", borderColor: billableWk === p.v ? "rgba(59,130,246,0.3)" : V.brd, color: billableWk === p.v ? "#93c5fd" : V.tm }}>
                    {p.l}
                  </button>
                ))}
              </div>
              {/* Week allocation visual */}
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>52-Week Allocation</div>
              <div className="space-y-1.5">
                <WeekBar label="Billable" weeks={billableWk} color={V.acc} />
                <WeekBar label="Training" weeks={trainWk} color={V.acc2} />
                <WeekBar label="Annual Leave" weeks={res.alWk} color="#8b5cf6" />
                <WeekBar label="Public Hols" weeks={res.phWk} color="#06b6d4" />
                <WeekBar label="Sick Leave" weeks={res.sickWk} color="#f97316" />
                <div className="pt-1 border-t flex justify-between text-xs" style={{ borderColor: V.brd, color: V.tm }}>
                  <span>Accounted: {f(billableWk + trainWk + res.alWk + res.phWk + res.sickWk, 1)}w</span>
                  <span>of 52w</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t grid grid-cols-3 gap-2 text-center" style={{ borderColor: V.brd }}>
                <div><div className="text-xs" style={{ color: V.tm }}>Billable Hrs</div><div className="font-mono text-sm font-medium">{f(res.bHrs, 0)}</div></div>
                <div><div className="text-xs" style={{ color: V.tm }}>Training Hrs</div><div className="font-mono text-sm font-medium">{f(res.trainHrs, 0)}</div></div>
                <div><div className="text-xs" style={{ color: V.tm }}>Non-Bill Hrs</div><div className="font-mono text-sm font-medium">{f(res.nonBillHrs, 0)}</div></div>
              </div>
            </Panel>

            {/* LEAVE */}
            <Panel title="Leave Entitlements" collapsible defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2.5">
                <Inp label="Annual Leave" value={alDays} onChange={setAlDays} suffix="days" step="1" />
                <Inp label="Public Holidays" value={phDays} onChange={setPhDays} suffix="days" step="1" />
                <Inp label="Sick / Personal" value={sickDays} onChange={setSickDays} suffix="days" step="1" />
                <Inp label="Leave Loading" value={leaveLoad} onChange={setLeaveLoad} suffix="%" />
              </div>
            </Panel>

            {/* ALLOWANCES */}
            <Panel title="Allowances" collapsible>
              <div className="space-y-2">
                {allowances.map(a => (
                  <div key={a.id} className="rounded-lg p-2.5 border" style={{ background: V.cd, borderColor: a.enabled ? V.brd : "rgba(28,40,64,0.4)", opacity: a.enabled ? 1 : 0.5 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="text" value={a.name} onChange={e => updateAllowance(a.id, "name", e.target.value)}
                        className="flex-1 rounded px-2 py-1 text-xs border focus:outline-none"
                        style={{ background: V.inp, borderColor: V.brd, color: V.txt }} />
                      <button onClick={() => updateAllowance(a.id, "enabled", !a.enabled)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: a.enabled ? V.grn : V.tm }}>
                        {a.enabled ? "ON" : "OFF"}
                      </button>
                      <button onClick={() => removeAllowance(a.id)} className="text-xs" style={{ color: V.red }}>✕</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <select value={a.type} onChange={e => updateAllowance(a.id, "type", e.target.value)}
                        className="rounded px-1.5 py-1 text-xs border focus:outline-none"
                        style={{ background: V.inp, borderColor: V.brd, color: V.txt }}>
                        <option value="perHour">$/hr</option>
                        <option value="perDay">$/day</option>
                        <option value="perWeek">$/week</option>
                        <option value="percent">% of wage</option>
                        <option value="perKm">$/km (as $/hr)</option>
                      </select>
                      <input type="number" value={a.amount} onChange={e => updateAllowance(a.id, "amount", parseFloat(e.target.value) || 0)}
                        className="rounded px-1.5 py-1 text-xs font-mono border focus:outline-none"
                        style={{ background: V.inp, borderColor: V.brd, color: V.txt }} step="0.01" />
                      <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: V.ts }}>
                        <input type="checkbox" checked={a.superApplicable} onChange={e => updateAllowance(a.id, "superApplicable", e.target.checked)} />
                        Super
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addAllowance} className="mt-2 text-xs font-medium px-2.5 py-1 rounded border transition-colors" style={{ borderColor: V.brd, color: V.acc }}>+ Add Allowance</button>
            </Panel>

            {/* ONCOSTS & MARGIN */}
            <Panel title="Oncosts & Margin" accent="green" collapsible>
              <div className="grid grid-cols-2 gap-2.5">
                <Inp label="Super Rate" value={superRate} onChange={setSuperRate} suffix="%" />
                <Inp label="WC Rate" value={wcRate} onChange={setWcRate} suffix="%" />
                <Inp label="Study / TAFE" value={study} onChange={setStudy} suffix="/yr" step="50" />
                <Inp label="PPE" value={ppe} onChange={setPpe} suffix="/yr" step="50" />
                <Select label="Overhead Type" value={ohType} onChange={setOhType}
                  options={[{ value: "percent", label: "Percentage" }, { value: "flat", label: "Flat $/yr" }]} />
                <Inp label={ohType === "percent" ? "Overhead %" : "Overhead $"} value={ohVal} onChange={setOhVal} suffix={ohType === "percent" ? "%" : "/yr"} />
                <Select label="Margin Type" value={marginType} onChange={setMarginType}
                  options={[{ value: "flat", label: "Flat $/hr" }, { value: "percent", label: "Percentage" }]} />
                <Inp label={marginType === "flat" ? "Margin $" : "Margin %"} value={marginVal} onChange={setMarginVal} suffix={marginType === "flat" ? "/hr" : "%"} />
              </div>
              <div className="mt-3"><Toggle label="Include Super on Overtime" value={superOnOT} onChange={setSuperOnOT} /></div>
            </Panel>

            {/* FUNDING */}
            <Panel title="Funding / Incentives" accent="green" collapsible>
              <Toggle label="Funding Enabled" value={fundingEnabled} onChange={setFundingEnabled} />
              {fundingEnabled && (
                <>
                  <div className="mt-3">
                    <Select label="Application Method" value={fundingMethod} onChange={setFundingMethod}
                      options={[
                        { value: "reduce", label: "Reduce hourly charge rate" },
                        { value: "passThrough", label: "Pass through to host (no rate impact)" },
                        { value: "passPercent", label: "Pass % to host as rate reduction" },
                      ]} />
                    {fundingMethod === "passPercent" && (
                      <div className="mt-2"><Inp label="% to pass on" value={fundingPct} onChange={setFundingPct} suffix="%" /></div>
                    )}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>Milestones</div>
                  <div className="space-y-2">
                    {milestones.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5">
                        <input type="text" value={m.name} onChange={e => updateMilestone(m.id, "name", e.target.value)}
                          className="flex-1 rounded px-2 py-1 text-xs border focus:outline-none"
                          style={{ background: V.inp, borderColor: V.brd, color: V.txt }} />
                        <input type="number" value={m.amount} onChange={e => updateMilestone(m.id, "amount", parseFloat(e.target.value) || 0)}
                          className="w-20 rounded px-2 py-1 text-xs font-mono border focus:outline-none"
                          style={{ background: V.inp, borderColor: V.brd, color: V.txt }} step="100" />
                        <span className="text-xs" style={{ color: V.tm }}>$</span>
                        <input type="number" value={m.month} onChange={e => updateMilestone(m.id, "month", parseInt(e.target.value) || 0)}
                          className="w-12 rounded px-1.5 py-1 text-xs font-mono border focus:outline-none"
                          style={{ background: V.inp, borderColor: V.brd, color: V.txt }} step="1" />
                        <span className="text-xs" style={{ color: V.tm }}>mo</span>
                        <button onClick={() => removeMilestone(m.id)} className="text-xs" style={{ color: V.red }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addMilestone} className="mt-2 text-xs font-medium px-2.5 py-1 rounded border" style={{ borderColor: V.brd, color: V.acc }}>+ Add Milestone</button>

                  {/* Funding summary */}
                  <div className="mt-3 p-2.5 rounded-lg" style={{ background: V.cd }}>
                    <div className="flex justify-between text-xs mb-1"><span style={{ color: V.ts }}>Total Funding</span><span className="font-mono" style={{ color: V.grn }}>{fd(fundingTotal, 0)}</span></div>
                    <div className="flex justify-between text-xs mb-1"><span style={{ color: V.ts }}>Over {appYears} years × {billableWk}w × {hpw}hrs</span><span className="font-mono">{f(res.totalBillableHrsApp, 0)} hrs</span></div>
                    {fundingMethod !== "passThrough" && (
                      <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: V.brd }}>
                        <span style={{ color: V.ts }}>Discount per hour</span>
                        <span className="font-mono font-semibold" style={{ color: V.grn }}>−{fd(res.fundingPH)}</span>
                      </div>
                    )}
                    {fundingMethod === "passThrough" && (
                      <div className="text-xs pt-1 border-t" style={{ borderColor: V.brd, color: V.tm }}>
                        No charge rate impact — passed through to host employer
                      </div>
                    )}
                  </div>
                </>
              )}
            </Panel>

            {/* PENALTY CONFIG */}
            <Panel title="Penalty / OT Rates" collapsible defaultOpen={false}>
              <div className="space-y-1.5">
                {penalties.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <input type="text" value={p.label} onChange={e => updatePenalty(p.id, "label", e.target.value)}
                      className="flex-1 rounded px-2 py-1 text-xs border focus:outline-none"
                      style={{ background: V.inp, borderColor: V.brd, color: V.txt }} />
                    <input type="number" value={p.mult} onChange={e => updatePenalty(p.id, "mult", parseFloat(e.target.value) || 1)}
                      className="w-14 rounded px-1.5 py-1 text-xs font-mono border focus:outline-none"
                      style={{ background: V.inp, borderColor: V.brd, color: V.txt }} step="0.1" />
                    <span className="text-xs" style={{ color: V.tm }}>×</span>
                    <select value={p.cat} onChange={e => updatePenalty(p.id, "cat", e.target.value)}
                      className="rounded px-1 py-1 text-xs border focus:outline-none"
                      style={{ background: V.inp, borderColor: V.brd, color: V.txt }}>
                      <option value="overtime">Overtime</option>
                      <option value="penalty">Penalty (Ord)</option>
                    </select>
                    <button onClick={() => removePenalty(p.id)} className="text-xs" style={{ color: V.red }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addPenalty} className="mt-2 text-xs font-medium px-2.5 py-1 rounded border" style={{ borderColor: V.brd, color: V.acc }}>+ Add Rate</button>
            </Panel>
          </div>

          {/* ═══ RIGHT RESULTS COLUMN ═══ */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">

            {compare && cmpRes ? (
              /* COMPARE VIEW */
              <div className="rounded-xl p-4 border" style={{ background: V.sf, borderColor: V.brd }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: V.tm }}>
                  Model Comparison — ${f(wage)}/hr base + {fd(res.allowPerHour)} allowances{fundingTotal > 0 ? ` • ${fd(fundingTotal, 0)} funding over ${appYears}yr` : ""}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${V.brd}` }}>
                        <th className="text-left py-2 text-xs font-medium uppercase" style={{ color: V.tm }}>Rate</th>
                        {cmpModels.map(m => (
                          <th key={m.key} className="text-right py-2 text-xs font-medium uppercase" style={{ color: m.bw === billableWk ? V.acc2 : V.tm }}>{m.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "◆ Ordinary Time", key: "ord", bold: true, isFunded: true },
                        { label: "Billed Cost (ex. margin)", val: r => r.ordCost },
                        { label: "Total Annual Cost", val: r => r.totCost, fmt: 0 },
                        { label: "Billable Hours / Year", val: r => r.bHrs, fmt: 0, nd: true },
                        { label: "Oncost / Hour", val: r => r.totOnc },
                        { label: "Funding Discount", val: r => r.fundingPH, color: V.grn, prefix: "−" },
                      ].map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${row.bold ? V.brd : "rgba(28,40,64,0.5)"}` }}>
                          <td className={`py-1.5 text-sm ${row.bold ? "font-semibold" : ""}`} style={{ color: row.bold ? V.acc : V.ts }}>{row.label}</td>
                          {cmpModels.map(m => {
                            const r = cmpRes[m.key];
                            let v;
                            if (row.key === "ord") v = r.rates.ord.funded;
                            else v = row.val(r);
                            return (
                              <td key={m.key} className={`py-1.5 text-right font-mono text-sm ${row.bold ? "font-bold" : ""}`}
                                style={{ color: row.color || (row.bold ? V.acc : V.txt) }}>
                                {row.prefix || ""}{row.nd ? f(v, row.fmt ?? 2) : fd(v, row.fmt ?? 2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr><td colSpan={4} className="py-1" /></tr>
                      {penalties.map(pr => (
                        <tr key={pr.id} style={{ borderBottom: `1px solid rgba(28,40,64,0.3)` }}>
                          <td className="py-1 text-xs" style={{ color: V.tm }}>{pr.label} ({pr.mult}× {pr.cat})</td>
                          {cmpModels.map(m => {
                            const r = cmpRes[m.key];
                            const rate = r.rates[pr.id];
                            return (
                              <td key={m.key} className="py-1 text-right font-mono text-xs" style={{ color: V.ts }}>
                                {rate ? fd(rate.funded) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* HERO */}
                <div className="rounded-xl p-4 border" style={{ background: V.sf, borderColor: V.brd }}>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest" style={{ color: V.tm }}>Ordinary Time Charge{res.fundingPH > 0 ? " (after funding)" : ""}</div>
                      <div className="font-mono font-bold mt-1" style={{ fontSize: "2.2rem", lineHeight: 1, color: V.acc }}>
                        {fd(res.rates.ord.funded)}
                        <span className="text-sm font-normal ml-1" style={{ color: V.tm }}>/hr</span>
                      </div>
                      {res.fundingPH > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-mono line-through" style={{ color: V.tm }}>{fd(res.rates.ord.charge)}</span>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.1)", color: V.grn }}>
                            −{fd(res.fundingPH)} funding
                          </span>
                        </div>
                      )}
                      <div className="text-xs mt-1.5" style={{ color: V.tm }}>
                        {billableWk}w billable × {hpw}hrs = {f(res.bHrs, 0)} hrs/yr • {appYears} year apprenticeship
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: V.tm }}>Base Wage</div>
                      <div className="text-lg font-mono">{fd(wage)}</div>
                      <div className="text-xs mt-1" style={{ color: V.tm }}>
                        + {fd(res.allowPerHour)} allow. = {fd(res.recv)} recv
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t" style={{ borderColor: V.brd }}>
                    {[
                      { l: "Annual Cost", v: fd(res.totCost, 0) },
                      { l: "Oncost /hr", v: fd(res.totOnc) },
                      { l: "Margin /hr", v: fd(res.marginPH), c: V.grn },
                      { l: "OT Base (1×)", v: fd(res.ot1x) },
                      { l: "Funding /hr", v: res.fundingPH > 0 ? `−${fd(res.fundingPH)}` : "—", c: res.fundingPH > 0 ? V.grn : V.tm },
                    ].map(s => (
                      <div key={s.l}><div className="text-xs" style={{ color: V.tm }}>{s.l}</div><div className="font-mono text-sm font-medium" style={{ color: s.c || V.txt }}>{s.v}</div></div>
                    ))}
                  </div>
                </div>

                {/* TABS */}
                <div className="flex rounded-lg overflow-hidden border" style={{ background: V.sf, borderColor: V.brd }}>
                  {[{ id: "rates", l: "Charge Rates" }, { id: "cost", l: "Cost Breakdown" }, { id: "onc", l: "Oncost Detail" }].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex-1 py-2 text-xs font-medium transition-all"
                      style={{ color: tab === t.id ? V.txt : V.tm, background: tab === t.id ? V.cd : "transparent", borderBottom: `2px solid ${tab === t.id ? V.acc : "transparent"}` }}>
                      {t.l}
                    </button>
                  ))}
                </div>

                {/* RATES TAB */}
                {tab === "rates" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <RateCard label="Ordinary Time" {...res.rates.ord} big glow />
                      {penalties.filter(p => p.cat === "overtime").slice(0, 2).map(pr => (
                        <RateCard key={pr.id} label={`${pr.label} (${pr.mult}×)`} {...(res.rates[pr.id] || { charge: 0, funded: 0, funding: 0 })} />
                      ))}
                    </div>

                    {penalties.filter(p => p.cat === "overtime").length > 2 && (
                      <div className="rounded-xl p-3 border" style={{ background: V.sf, borderColor: V.brd }}>
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>Additional Overtime</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {penalties.filter(p => p.cat === "overtime").slice(2).map(pr => (
                            <RateCard key={pr.id} label={`${pr.label} (${pr.mult}×)`} {...(res.rates[pr.id] || { charge: 0, funded: 0, funding: 0 })} />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl p-3 border" style={{ background: V.sf, borderColor: V.brd }}>
                      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>
                        Penalty Rates (Ordinary Hours){res.fundingPH > 0 ? " — funding discount applied" : ""}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                        {penalties.filter(p => p.cat === "penalty").map(pr => (
                          <RateCard key={pr.id} label={`${pr.label} (${pr.mult}×)`} {...(res.rates[pr.id] || { charge: 0, funded: 0, funding: 0 })} />
                        ))}
                      </div>
                      {res.fundingPH > 0 && (
                        <div className="mt-2 text-xs p-2 rounded" style={{ background: "rgba(52,211,153,0.05)", color: V.grn, border: `1px solid rgba(52,211,153,0.15)` }}>
                          Funding discount of {fd(res.fundingPH)}/hr applied flat after penalty calculation — not multiplied by penalty rate
                        </div>
                      )}
                    </div>

                    {/* Summary table */}
                    <div className="rounded-xl p-3 border" style={{ background: V.sf, borderColor: V.brd }}>
                      <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>Rate Summary Table</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${V.brd}` }}>
                              <th className="text-left py-1.5 font-medium" style={{ color: V.tm }}>Rate Type</th>
                              <th className="text-right py-1.5 font-medium" style={{ color: V.tm }}>Mult</th>
                              <th className="text-right py-1.5 font-medium" style={{ color: V.tm }}>Category</th>
                              <th className="text-right py-1.5 font-medium" style={{ color: V.tm }}>Charge</th>
                              {res.fundingPH > 0 && <th className="text-right py-1.5 font-medium" style={{ color: V.grn }}>After Funding</th>}
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: `1px solid ${V.brd}` }}>
                              <td className="py-1.5 font-medium" style={{ color: V.acc }}>Ordinary Time</td>
                              <td className="py-1.5 text-right font-mono">1.0×</td>
                              <td className="py-1.5 text-right" style={{ color: V.ts }}>Base</td>
                              <td className="py-1.5 text-right font-mono">{fd(res.rates.ord.charge)}</td>
                              {res.fundingPH > 0 && <td className="py-1.5 text-right font-mono font-semibold" style={{ color: V.grn }}>{fd(res.rates.ord.funded)}</td>}
                            </tr>
                            {penalties.map(pr => {
                              const r = res.rates[pr.id];
                              if (!r) return null;
                              return (
                                <tr key={pr.id} style={{ borderBottom: `1px solid rgba(28,40,64,0.4)` }}>
                                  <td className="py-1" style={{ color: V.ts }}>{pr.label}</td>
                                  <td className="py-1 text-right font-mono">{pr.mult}×</td>
                                  <td className="py-1 text-right" style={{ color: V.tm }}>{pr.cat === "overtime" ? "OT" : "Penalty"}</td>
                                  <td className="py-1 text-right font-mono">{fd(r.charge)}</td>
                                  {res.fundingPH > 0 && <td className="py-1 text-right font-mono" style={{ color: r.funding > 0 ? V.grn : V.ts }}>{fd(r.funded)}</td>}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* COST TAB */}
                {tab === "cost" && (
                  <div className="rounded-xl p-4 border" style={{ background: V.sf, borderColor: V.brd }}>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: V.tm }}>Annual Cost Build-Up</div>
                    <CostRow label="Worked Pay (billable weeks)" val={res.worked} total={res.totCost} />
                    <CostRow label="Training / TAFE Pay" val={res.tafePay} total={res.totCost} />
                    <CostRow label="Annual Leave (inc. loading)" val={res.alPay} total={res.totCost} />
                    <CostRow label="Personal / Sick Leave" val={res.persLeave} total={res.totCost} />
                    <CostRow label="Public Holidays" val={res.phPay} total={res.totCost} />
                    <div className="my-1.5 border-t" style={{ borderColor: V.brd }} />
                    <CostRow label="Superannuation" val={res.superAmt} total={res.totCost} />
                    <CostRow label="Workers Compensation" val={res.wc} total={res.totCost} />
                    <CostRow label="Study / TAFE Fees" val={res.study} total={res.totCost} />
                    <CostRow label="PPE Costs" val={res.ppe} total={res.totCost} />
                    <CostRow label={`Overheads (${ohType === "percent" ? ohVal + "%" : "flat"})`} val={res.oh} total={res.totCost} />
                    <div className="my-1.5 border-t" style={{ borderColor: V.ts }} />
                    <CostRow label="TOTAL ANNUAL COST" val={res.totCost} total={res.totCost} bold />

                    <div className="mt-4 pt-3 border-t" style={{ borderColor: V.brd }}>
                      <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: V.tm }}>Hourly Rate Build-Up</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          {[["Base wage", fd(wage)], [`+ Allowances (${(allowances || []).filter(a => a.enabled).length})`, fd(res.allowPerHour)]].map(([l, v]) => (
                            <div key={l} className="flex justify-between text-sm"><span style={{ color: V.tm }}>{l}</span><span className="font-mono">{v}</span></div>
                          ))}
                          <div className="flex justify-between text-sm pt-1 border-t" style={{ borderColor: V.brd }}>
                            <span style={{ color: V.ts }}>Received pay</span><span className="font-mono font-medium">{fd(res.recv)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {[
                            ["Billed wage /hr", fd(res.billedWage)],
                            ["+ Billed oncost /hr", fd(res.billedOnc)],
                            [`+ Margin (${marginType === "flat" ? "$" : "%"})`, fd(res.marginPH), V.grn],
                          ].map(([l, v, c]) => (
                            <div key={l} className="flex justify-between text-sm"><span style={{ color: V.tm }}>{l}</span><span className="font-mono" style={{ color: c }}>{v}</span></div>
                          ))}
                          {res.fundingPH > 0 && (
                            <div className="flex justify-between text-sm"><span style={{ color: V.tm }}>− Funding discount</span><span className="font-mono" style={{ color: V.grn }}>−{fd(res.fundingPH)}</span></div>
                          )}
                          <div className="flex justify-between text-sm pt-1 border-t" style={{ borderColor: V.brd }}>
                            <span className="font-medium" style={{ color: V.acc }}>Final charge</span>
                            <span className="font-mono font-bold" style={{ color: V.acc }}>{fd(res.rates.ord.funded)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ONCOST TAB */}
                {tab === "onc" && (
                  <div className="rounded-xl p-4 border" style={{ background: V.sf, borderColor: V.brd }}>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: V.tm }}>Per-Hour Oncost Breakdown</div>
                    <CostRow label="Annual Leave" val={res.oncAL} total={res.totOnc} />
                    <CostRow label="Public Holidays" val={res.oncPH} total={res.totOnc} />
                    <CostRow label="Sick / Personal Leave" val={res.oncSick} total={res.totOnc} />
                    <CostRow label="Off-the-Job Training" val={res.oncTafe} total={res.totOnc} />
                    <CostRow label="Study / TAFE Fees" val={res.oncStudy} total={res.totOnc} />
                    <CostRow label="PPE Costs" val={res.oncPPE} total={res.totOnc} />
                    <CostRow label="Superannuation" val={res.oncSuper} total={res.totOnc} />
                    <CostRow label="Workers Compensation" val={res.oncWC} total={res.totOnc} />
                    <CostRow label="Overheads" val={res.oncOH} total={res.totOnc} />
                    <div className="my-1.5 border-t" style={{ borderColor: V.ts }} />
                    <CostRow label="TOTAL ONCOST /HR" val={res.totOnc} total={res.totOnc} bold />

                    <div className="mt-4 p-3 rounded-lg" style={{ background: V.cd }}>
                      <div className={`grid ${res.fundingPH > 0 ? "grid-cols-4" : "grid-cols-3"} gap-2 text-center`}>
                        {[
                          { l: "Wage", v: fd(wage) },
                          { l: "+ Oncost+Allow", v: fd(res.totOnc + res.allowPerHour) },
                          res.fundingPH > 0 ? { l: "− Funding", v: `−${fd(res.fundingPH)}`, c: V.grn } : null,
                          { l: "= Charge /hr", v: fd(res.rates.ord.funded), c: V.acc },
                        ].filter(Boolean).map(s => (
                          <div key={s.l}><div className="text-xs" style={{ color: V.tm }}>{s.l}</div><div className="font-mono font-bold" style={{ color: s.c || V.txt }}>{s.v}</div></div>
                        ))}
                      </div>
                    </div>

                    {/* Allowance detail */}
                    {(allowances || []).filter(a => a.enabled).length > 0 && (
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: V.brd }}>
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>Allowance Detail</div>
                        {(allowances || []).filter(a => a.enabled).map(a => {
                          let ph = 0;
                          if (a.type === "perHour") ph = a.amount;
                          else if (a.type === "perDay") ph = a.amount / (hpw / dpw);
                          else if (a.type === "perWeek") ph = a.amount / hpw;
                          else if (a.type === "percent") ph = wage * (a.amount / 100);
                          else ph = a.amount;
                          return (
                            <div key={a.id} className="flex justify-between text-sm py-0.5">
                              <span style={{ color: V.ts }}>{a.name} <span className="text-xs" style={{ color: V.tm }}>({a.type}{a.superApplicable ? " + super" : ""})</span></span>
                              <span className="font-mono">{fd(ph)}/hr</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 pt-2 border-t text-center" style={{ borderColor: V.brd }}>
          <p className="text-xs" style={{ color: "rgba(87,104,128,0.5)" }}>GTO Charge Rate Calculator • All rates configurable • Super {superRate}% • Apprenticeship {appYears}yr</p>
        </div>
      </div>
    </div>
  );
}
