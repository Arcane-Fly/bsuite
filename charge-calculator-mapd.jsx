import { useState, useMemo, useEffect, useCallback } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   GTO CHARGE RATE CALCULATOR — FWC MAPD API INTEGRATED
   ════════════════════════════════════════════════════════════════════════════

   DATA-SOURCE ANNOTATION LEGEND (used throughout this file):

   [API]       Pulled live from the Fair Work Commission Modern Awards Pay
               Database (MAPD). Award list, classifications, apprentice pay
               rates, wage allowances, expense allowances, penalty rates.

   [API→CALC]  Derived from API data. e.g. weekly award rate ÷ 38 → hourly;
               junior apprentice % applied to a reference classification rate
               (see e.g. MA000020 clause 19.7); penalty rate % → multiplier.

   [USER]      Selected/entered by the user in the UI. Award, classification,
               apprentice year, age (under/over 21 at commencement), which
               allowances apply to THIS job, rate model (Standard/ALEX/52W/
               Custom), manual wage override.

   [CONFIG]    GTO business configuration — NEVER available from MAPD:
               superannuation % (legislated SG, not award data), workers comp
               % (insurer/state specific), overheads, margin, study/TAFE fees,
               PPE budget, funding milestones, billable weeks model.

   [CALC]      Output of the charge-rate engine (oncosts, charge rates).

   ── FWC MAPD API ─────────────────────────────────────────────────────────
   Auth header:  Ocp-Apim-Subscription-Key: <key>
   Envelope:     { data: [...], _meta: { page, page_size, ... }, _links }
   Endpoints used (award-scoped forms accept award code e.g. "MA000020"
   or award_fixed_id):
     GET /awards?name=&year=&page=&limit=
     GET /awards/{code}
     GET /awards/{code}/classifications        → wage rates incl. apprentices
     GET /awards/{code}/wage-allowances        → industry/all-purpose allowances
     GET /awards/{code}/expense-allowances     → meal, travel, tool etc.
     GET /awards/{code}/penalties              → OT & penalty rates (% of ord.)

   employee_rate_type_code values (per MAPD data dictionary):
     AD = Adult, JN = Junior, AP = Apprentice, AA = Adult apprentice,
     TN = Trainee, XT = Exited traineeship (not adult), CA = Cadet.

   ── JUNIOR APPRENTICE PERCENTAGES ───────────────────────────────────────
   Apprentices who commence under 21 are paid a percentage of the relevant
   full (tradesperson/reference) rate — e.g. MA000020 cl 19.7. Two paths:

   1. PREFERRED [API]: MAPD publishes apprentice classification rows
      (employee_rate_type_code === "AP") with the percentage ALREADY applied
      in `calculated_rate` per year/stage. Select the row → done.
   2. FALLBACK [API→CALC]: select a reference classification (e.g. CW/ECW 3)
      and apply an editable junior % per apprenticeship year. The default
      table below is a PLACEHOLDER — verify against the award clause or the
      MAPD AP rows before relying on it.

   Adult apprentices (21+ at commencement) use "AA" rows / adult apprentice
   minimums — the junior percentage does NOT apply.
   ════════════════════════════════════════════════════════════════════════ */

/* ─── [CONFIG] FWC MAPD API CONNECTION ─────────────────────────────────── */
const FWC_CONFIG = {
  // ★ ADD YOUR KEY HERE (from the FWC developer portal subscription).
  //   In production move this server-side — do NOT ship a real key in
  //   client bundles. Use the proxy option below instead.
  subscriptionKey: "YOUR_FAIRWORK_API_KEY_HERE",

  // Production MAPD base. UAT: "https://uatdata.fwc.gov.au/api/v1".
  // Confirm the host your subscription is provisioned against.
  baseUrl: "https://data.fwc.gov.au/api/v1",

  // OPTIONAL server-side proxy (recommended — avoids CORS + hides the key).
  // e.g. your Supabase edge function: "https://<ref>.functions.supabase.co/auth-fairwork"
  // When set, requests go to `${proxyUrl}?path=<encoded MAPD path>` and the
  // proxy attaches Ocp-Apim-Subscription-Key server-side.
  proxyUrl: "", // "" = call MAPD directly with the key above

  // Retry ladder for the flaky annual-rollover window (1 July):
  // 3 attempts, exponential backoff 1s → 2s → 4s, 15s timeout per attempt.
  maxRetries: 3,
  baseRetryDelayMs: 1000,
  requestTimeoutMs: 15000,

  // In-memory cache TTL (per session). Award data changes at most annually.
  cacheTtlMs: 24 * 60 * 60 * 1000,
};

/* ─── [API→CALC] JUNIOR APPRENTICE % FALLBACK TABLE ─────────────────────
   Used ONLY in "percentOfReference" mode when the award expresses apprentice
   wages as a % of a reference rate (e.g. MA000020 cl 19.7) and you prefer to
   drive from the reference classification rather than the pre-calculated
   MAPD "AP" rows. Editable in the UI.
   ⚠ PLACEHOLDER VALUES — VERIFY against the specific award clause / MAPD
   AP rows before production use. Percentages differ by award and can differ
   by year-12 completion, competency progression, etc.                      */
const JUNIOR_APPRENTICE_PERCENT_DEFAULTS = {
  1: 50, // Year/Stage 1 — % of reference full-time rate
  2: 60, // Year/Stage 2
  3: 75, // Year/Stage 3
  4: 90, // Year/Stage 4
};

/* ─── [CONFIG] RATE MODELS ───────────────────────────────────────────────
   Billing models determine billable weeks (drives oncost recovery per hour).
   "Standard" = 39 billable weeks; "ALEX" = 48; "52W" bills every week;
   "Custom" unlocks the billable-weeks input.                                */
const RATE_MODELS = [
  { key: "standard", label: "Standard (39w)", billableWeeks: 39 },
  { key: "alex",     label: "ALEX (48w)",     billableWeeks: 48 },
  { key: "52w",      label: "52 Week",        billableWeeks: 52 },
  { key: "custom",   label: "Custom",         billableWeeks: null }, // [USER]
];

/* ─── [CONFIG] SEED DATA (used until API data is loaded / offline) ─────── */
const DEFAULT_ALLOWANCES = [
  // [USER]/[CONFIG] manual allowance example — replaced/augmented by
  // "Load from Award" which pulls [API] wage + expense allowances.
  { id: 1, name: "Site Allowance", type: "perHour", amount: 2.50, superApplicable: false, enabled: true, source: "manual", clause: null, allPurpose: false },
];

const DEFAULT_MILESTONES = [
  // [CONFIG] Government incentive/funding milestones — NOT in MAPD.
  { id: 1, name: "6 Month Commencement", amount: 3500, month: 6 },
  { id: 2, name: "Halfway", amount: 3000, month: 24 },
  { id: 3, name: "Completion", amount: 3500, month: 48 },
];

const DEFAULT_PENALTIES = [
  // [CONFIG] seed penalty set — replace via "Load Penalties from Award",
  // which maps [API] penalty `rate` (% of ordinary hourly) → mult = rate/100.
  { id: "ot15", label: "Time & a Half", mult: 1.5, cat: "overtime", source: "manual", clause: null },
  { id: "ot20", label: "Double Time", mult: 2.0, cat: "overtime", source: "manual", clause: null },
  { id: "ot25", label: "Double Time & a Half", mult: 2.5, cat: "overtime", source: "manual", clause: null },
  { id: "ph", label: "Public Holiday Worked", mult: 2.5, cat: "penalty", source: "manual", clause: null },
  { id: "night12", label: "Night Shift (≤4 nights)", mult: 1.2, cat: "penalty", source: "manual", clause: null },
  { id: "night13", label: "Night Shift (4+ weeks)", mult: 1.3, cat: "penalty", source: "manual", clause: null },
  { id: "satnight", label: "Saturday Night Shift", mult: 1.5, cat: "penalty", source: "manual", clause: null },
  { id: "sunnight", label: "Sunday Night Shift", mult: 2.0, cat: "penalty", source: "manual", clause: null },
];

/* ════════════════════════════════════════════════════════════════════════
   FWC MAPD API CLIENT  [API]
   In-memory cache → live API (retry ×3) → empty result.
   (Mirror of the fairworkApi.ts ladder; add your Supabase award_rate_cache
   as Layer 3 when embedding in R80.3.)
   ════════════════════════════════════════════════════════════════════════ */
const memoryCache = new Map(); // key → { expiresAt, value }

function cacheGet(cacheKey) {
  const entry = memoryCache.get(cacheKey);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  memoryCache.delete(cacheKey);
  return null;
}
function cacheSet(cacheKey, value) {
  memoryCache.set(cacheKey, { expiresAt: Date.now() + FWC_CONFIG.cacheTtlMs, value });
}

/** Low-level fetch with subscription key / proxy, timeout, retry + backoff. */
async function fwcFetch(path, queryParams = {}) {
  const query = new URLSearchParams(
    Object.entries(queryParams).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const mapdPath = `${path}${query ? `?${query}` : ""}`;

  // Direct vs proxied request construction.
  const requestUrl = FWC_CONFIG.proxyUrl
    ? `${FWC_CONFIG.proxyUrl}?path=${encodeURIComponent(mapdPath)}`
    : `${FWC_CONFIG.baseUrl}${mapdPath}`;
  const requestHeaders = FWC_CONFIG.proxyUrl
    ? { "Content-Type": "application/json" } // proxy attaches the key server-side
    : { "Ocp-Apim-Subscription-Key": FWC_CONFIG.subscriptionKey };

  let lastError = null;
  for (let attempt = 1; attempt <= FWC_CONFIG.maxRetries; attempt++) {
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), FWC_CONFIG.requestTimeoutMs);
    try {
      const response = await fetch(requestUrl, { headers: requestHeaders, signal: abortController.signal });
      clearTimeout(timeoutHandle);
      if (!response.ok) throw new Error(`FWC API ${response.status} on ${mapdPath}`);
      const json = await response.json();
      // MAPD envelope is { data, _meta, _links }; be defensive about shape.
      return Array.isArray(json) ? json : (json.data ?? json);
    } catch (err) {
      clearTimeout(timeoutHandle);
      lastError = err;
      if (attempt < FWC_CONFIG.maxRetries) {
        // Exponential backoff: 1s, 2s (then fail after 3rd attempt).
        await new Promise(r => setTimeout(r, FWC_CONFIG.baseRetryDelayMs * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

/** [API] All modern awards (paginated; searchable by name). */
async function fetchAwards(searchName = "", year = "") {
  const cacheKey = `awards_${searchName}_${year}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const awards = await fwcFetch("/awards", { name: searchName, year, limit: 100 });
  cacheSet(cacheKey, awards);
  return awards;
}

/** [API] All classifications for an award (wage rates live here). */
async function fetchClassifications(awardCode, year = "") {
  const cacheKey = `classifications_${awardCode}_${year}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  // Paginate defensively — big awards exceed one page.
  let all = [], page = 1, batch;
  do {
    batch = await fwcFetch(`/awards/${awardCode}/classifications`, { year, limit: 200, page });
    all = all.concat(batch || []);
    page++;
  } while (Array.isArray(batch) && batch.length === 200 && page <= 10);
  cacheSet(cacheKey, all);
  return all;
}

/** [API] Wage-related allowances (often all-purpose → part of ordinary rate). */
async function fetchWageAllowances(awardCode, year = "") {
  const cacheKey = `wage_allow_${awardCode}_${year}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const rows = await fwcFetch(`/awards/${awardCode}/wage-allowances`, { year, limit: 200 });
  cacheSet(cacheKey, rows);
  return rows;
}

/** [API] Expense allowances (meals, travel, tools — CPI adjusted). */
async function fetchExpenseAllowances(awardCode, year = "") {
  const cacheKey = `exp_allow_${awardCode}_${year}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const rows = await fwcFetch(`/awards/${awardCode}/expense-allowances`, { year, limit: 200 });
  cacheSet(cacheKey, rows);
  return rows;
}

/** [API] Penalty & overtime rates as % of the ordinary hourly rate. */
async function fetchAwardPenalties(awardCode, year = "") {
  const cacheKey = `penalties_${awardCode}_${year}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const rows = await fwcFetch(`/awards/${awardCode}/penalties`, { year, limit: 200 });
  cacheSet(cacheKey, rows);
  return rows;
}

/* ════════════════════════════════════════════════════════════════════════
   API → APP TRANSFORMS  [API→CALC]
   ════════════════════════════════════════════════════════════════════════ */

/** Award weekly rates assume 38 ordinary hours (standard full-time week).
    Hourly = weekly ÷ 38 — NOT ÷ the roster hpw, which may include RDO
    accrual patterns (see rdo-flexibility-guide).                          */
const AWARD_ORDINARY_WEEKLY_HOURS = 38;

/** Convert a classification row's rate to an hourly figure. [API→CALC] */
function classificationToHourly(row) {
  if (row == null) return null;
  const rate = row.calculated_rate ?? row.base_rate;
  const rateType = (row.calculated_rate_type ?? row.base_rate_type ?? "").toLowerCase();
  if (rate == null) return null;
  if (rateType.includes("hour")) return rate;
  if (rateType.includes("week")) return rate / AWARD_ORDINARY_WEEKLY_HOURS;
  if (rateType.includes("annual")) return rate / (52 * AWARD_ORDINARY_WEEKLY_HOURS);
  if (rateType.includes("fortnight")) return rate / (2 * AWARD_ORDINARY_WEEKLY_HOURS);
  return rate; // assume hourly if unit unknown — flagged in UI as needing review
}

/** Split classifications into groups the UI cares about. [API→CALC] */
function groupClassifications(rows) {
  const apprentice = [], adultApprentice = [], reference = [];
  (rows || []).forEach(row => {
    // Skip rows no longer operative.
    if (row.operative_to && new Date(row.operative_to) < new Date()) return;
    const code = row.employee_rate_type_code;
    if (code === "AP") apprentice.push(row);            // junior apprentice — % already applied by FWC
    else if (code === "AA") adultApprentice.push(row);  // adult apprentice (21+ at commencement)
    else if (code === "AD" || code == null) reference.push(row); // full adult rates → junior % base
  });
  const byLevel = (a, b) => (a.classification_level ?? 0) - (b.classification_level ?? 0);
  return { apprentice: apprentice.sort(byLevel), adultApprentice: adultApprentice.sort(byLevel), reference: reference.sort(byLevel) };
}

/** Map a MAPD allowance row (wage or expense) into the app's allowance
    shape. Amounts are [API]; the enabled flag is [USER] — which allowances
    apply depends on the specific job, so everything loads DISABLED.       */
function mapdAllowanceToAppAllowance(row, idGenerator) {
  const frequency = (row.payment_frequency || "").toLowerCase();
  let type = "perWeek", needsReview = false;

  if ((row.rate_unit || "").toLowerCase() === "percent" && row.rate != null) {
    // Percentage-of-standard-rate allowance (e.g. industry allowance %).
    type = "percent";
  } else if (frequency.includes("hour")) type = "perHour";
  else if (frequency.includes("day")) type = "perDay";
  else if (frequency.includes("week")) type = "perWeek";
  else if (frequency.includes("km") || frequency.includes("kilometre")) type = "perKm";
  else needsReview = true; // per-meal / per-occasion etc. — user must convert

  const amount = type === "percent" ? (row.rate ?? 0) : (row.allowance_amount ?? 0);
  // is_all_purpose === 1 → forms part of the ordinary hourly rate → attracts
  // super and flows into penalty/OT bases. Flagged, super defaulted ON.
  const isAllPurpose = row.is_all_purpose === 1 || row.is_all_purpose === true;

  return {
    id: idGenerator(),
    name: row.allowance || "Unnamed allowance",
    type,
    amount,
    superApplicable: isAllPurpose,     // [API→CALC] default; user can adjust
    enabled: false,                    // [USER] opt-in per job
    source: "api",                     // provenance badge in UI
    clause: row.clauses || null,       // [API] traceability to the award text
    allPurpose: isAllPurpose,
    needsReview,
  };
}

/** Map a MAPD penalty row into the app's penalty shape. `rate` is a % of
    the ordinary hourly rate (150 → 1.5×). Overtime vs ordinary-hours
    penalty is inferred from the clause description keywords.             */
function mapdPenaltyToAppPenalty(row, idGenerator) {
  const description = row.penalty_description || row.clause_description || "Penalty";
  const isOvertime = /overtime|time and a half|double time/i.test(description) && !/shift|holiday|weekend|saturday|sunday/i.test(description);
  return {
    id: `api${idGenerator()}`,
    label: description.length > 48 ? `${description.slice(0, 45)}…` : description,
    mult: row.rate != null ? row.rate / 100 : 1, // [API→CALC] % → multiplier
    cat: isOvertime ? "overtime" : "penalty",
    source: "api",
    clause: row.clauses || null,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   CALCULATION ENGINE  [CALC]
   Unchanged charge-rate mathematics; wage now arrives from the award
   resolution layer (API rate, junior % of reference, or manual override).
   ════════════════════════════════════════════════════════════════════════ */
function calculate(cfg) {
  const {
    wage, allowances, superRate, wcRate, leaveLoad, marginType, marginVal,
    ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk,
    billableWk, appYears, superOnOT, fundingTotal, fundingMethod, fundingPct,
    penalties
  } = cfg;

  // [CALC] Allowance aggregation → effective $/hr on top of base wage.
  let allowPerHour = 0, allowPerHourSuper = 0;
  (allowances || []).filter(a => a.enabled).forEach(a => {
    let perHourValue = 0;
    if (a.type === "perHour") perHourValue = a.amount;
    else if (a.type === "perDay") perHourValue = a.amount / (hpw / dpw);
    else if (a.type === "perWeek") perHourValue = a.amount / hpw;
    else if (a.type === "percent") perHourValue = wage * (a.amount / 100); // % of base wage ([API] rate for all-purpose %)
    else if (a.type === "perKm") perHourValue = a.amount; // user enters effective $/hr
    allowPerHour += perHourValue;
    if (a.superApplicable) allowPerHourSuper += perHourValue;
  });

  const recv = wage + allowPerHour;                    // received hourly pay
  const superBearingRate = wage + allowPerHourSuper;   // base for super calc
  const wkPay = recv * hpw;
  const wkWage = wage * hpw;
  const wkSuperBearing = superBearingRate * hpw;

  // [CALC] Week allocation across the 52-week year.
  const alWk = alDays / dpw;
  const phWk = phDays / dpw;
  const sickWk = sickDays / dpw;
  const totalNonBillable = alWk + phWk + sickWk + trainWk;
  const impliedBillable = 52 - totalNonBillable;

  // [CALC] Annual pay components.
  const worked = wkPay * billableWk;
  const tafePay = wkPay * trainWk;
  const alPay = (wkPay * alWk) * (1 + leaveLoad);       // leave loading [CONFIG] (award clause, e.g. 17.5% — not exposed by MAPD)
  const persLeave = wkPay * sickWk;
  const phPay = wkPay * phWk;

  // Total annual pay (48 productive weeks + AL).
  const totAnnPay = (wkPay * 48) + alPay;

  // [CALC] Super on total annual pay (super-bearing portion only).
  // superRate is [CONFIG] — legislated SG %, not award data.
  const totAnnPaySuper = (wkSuperBearing * 48) + ((wkWage * alWk) * (1 + leaveLoad));
  const superAmt = totAnnPaySuper * superRate;

  const annPkg = totAnnPay + superAmt;
  const wc = (worked + tafePay) * wcRate;               // wcRate [CONFIG] insurer/state specific

  // [CONFIG] Overheads: flat $/yr or % of annual pay.
  const oh = ohType === "percent" ? totAnnPay * (ohVal / 100) : ohVal;

  const totCost = annPkg + cfg.study + cfg.ppe + wc + oh;

  // [CALC] Hourly conversions.
  const bHrs = billableWk * hpw;
  const tHrs = 52 * hpw;
  const trainHrs = trainWk * hpw;
  const nonBillHrs = tHrs - bHrs - trainHrs;

  const billedWage = (recv * tHrs) / bHrs;
  const ordCost = totCost / bHrs;
  const billedOnc = ordCost - billedWage;

  // [CONFIG] Margin: flat $/hr or % of cost.
  const marginPH = marginType === "percent" ? ordCost * (marginVal / 100) : marginVal;
  const quoted = ordCost + marginPH;

  // [CALC] Overtime base — reduced oncosts (WC-style loading only).
  const otOncFactor = 0.12;
  const otOnc = (totAnnPay * otOncFactor) / bHrs;
  const otSuperPH = superOnOT ? (superBearingRate * superRate) : 0;
  const ot1x = recv + marginPH + otOnc;

  // Penalty oncosts for ordinary-hours penalty categories.
  const penOnc = (cfg.study + cfg.ppe + wc) / bHrs + 0.15;

  // [CONFIG]/[CALC] Funding spread over the apprenticeship's billable hours.
  const totalBillableHrsApp = bHrs * appYears;
  let fundingPH = 0;
  if (fundingMethod === "reduce" && totalBillableHrsApp > 0) {
    fundingPH = fundingTotal / totalBillableHrsApp;
  } else if (fundingMethod === "passPercent" && totalBillableHrsApp > 0) {
    fundingPH = (fundingTotal * (fundingPct / 100)) / totalBillableHrsApp;
  }
  // "passThrough" = no charge-rate impact.

  // [CALC] Per-hour oncost breakdown.
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

  // [CALC] Charge-rate table.
  const rates = {};
  rates.ord = { charge: quoted, funded: quoted - fundingPH, funding: fundingPH };

  penalties.forEach(pr => {
    if (pr.cat === "overtime") {
      // OT: no funding discount.
      const otCharge = ot1x * pr.mult + (superOnOT ? otSuperPH * (pr.mult - 1) : 0);
      rates[pr.id] = { charge: otCharge, funded: otCharge, funding: 0 };
    } else if (pr.cat === "penalty") {
      // Penalty on ordinary hours: funding discount applies FLAT (not multiplied).
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
    alWk, phWk, sickWk, trainWk, impliedBillable,
  };
}

/* ─── HELPERS ─── */
const f = (v, d = 2) => v == null || isNaN(v) ? "—" : v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });
const fd = (v, d = 2) => `$${f(v, d)}`;
let _id = 100;
const nid = () => ++_id;

/* ─── UI THEME ───────────────────────────────────────────────────────────
   Colourblind-safe palette: purple = positive/funding, blue = info/model,
   amber = accent + warnings/destructive. No red/green pairing.            */
const V = {
  bg: "#080c14", sf: "#0f1520", cd: "#161f2e", inp: "#131a28", brd: "#1c2840",
  acc: "#e5a526",    // amber — primary accent
  acc2: "#3b82f6",   // blue — billing model / info
  txt: "#e8edf5", ts: "#8896ab", tm: "#576880",
  pos: "#a78bfa",    // purple — funding / positive deltas (was green)
  warn: "#fbbf24",   // amber — destructive / needs-review (was red)
};

function Inp({ label, value, onChange, suffix, step = "0.01", min = "0", wide, disabled }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="block text-xs mb-1" style={{ color: V.tm, letterSpacing: "0.04em" }}>{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="number" value={value} disabled={disabled} onChange={e => onChange(parseFloat(e.target.value) || 0)} step={step} min={min}
          className="w-full rounded px-2 py-1.5 text-sm font-mono border focus:outline-none focus:ring-1"
          style={{ background: V.inp, borderColor: V.brd, color: disabled ? V.tm : V.txt, opacity: disabled ? 0.6 : 1, "--tw-ring-color": V.acc }} />
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

function Panel({ title, children, accent, collapsible, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColor = accent === "blue" ? V.acc2 : accent === "purple" ? V.pos : V.acc;
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: V.sf, borderColor: V.brd }}>
      <div className="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none"
        onClick={() => collapsible && setOpen(!open)}
        style={{ borderBottom: open ? `1px solid ${V.brd}` : "none" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: V.tm }}>{title}</span>
          {badge && <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd" }}>{badge}</span>}
        </div>
        {collapsible && <span className="text-xs transition-transform" style={{ color: V.tm, transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>}
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

/** Small provenance tag: API vs manual vs derived. */
function SourceBadge({ source }) {
  const map = {
    api:     { label: "API",    bg: "rgba(59,130,246,0.14)",  color: "#93c5fd" },
    derived: { label: "CALC",   bg: "rgba(167,139,250,0.14)", color: V.pos },
    manual:  { label: "MANUAL", bg: "rgba(87,104,128,0.2)",   color: V.ts },
  };
  const s = map[source] || map.manual;
  return <span className="text-xs px-1 py-0.5 rounded font-mono" style={{ background: s.bg, color: s.color, fontSize: "9px" }}>{s.label}</span>;
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
            <span className="text-xs font-mono" style={{ color: V.pos }}>−{fd(funding)}</span>
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

/* ════════════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════════════ */
export default function App() {

  /* ── [API]/[USER] AWARD DATA STATE ─────────────────────────────────── */
  const [apiStatus, setApiStatus] = useState({ state: "idle", message: "" }); // idle | loading | ok | error
  const [publishedYear, setPublishedYear] = useState(String(new Date().getFullYear())); // [USER] annual wage review year
  const [awardSearch, setAwardSearch] = useState("");         // [USER] search text
  const [awardList, setAwardList] = useState([]);             // [API] /awards
  const [selectedAwardCode, setSelectedAwardCode] = useState(""); // [USER] e.g. "MA000020"
  const [classificationGroups, setClassificationGroups] = useState({ apprentice: [], adultApprentice: [], reference: [] }); // [API]

  // [USER] Wage resolution mode:
  //   "apiRate"            → pick an AP/AA classification row directly (preferred)
  //   "percentOfReference" → pick reference classification, apply junior % (e.g. MA000020 cl 19.7)
  //   "manual"             → type the wage yourself (Custom)
  const [wageMode, setWageMode] = useState("manual");
  const [selectedClassificationId, setSelectedClassificationId] = useState(""); // [USER] AP/AA row
  const [selectedReferenceId, setSelectedReferenceId] = useState("");           // [USER] reference row for % mode
  const [isAdultApprentice, setIsAdultApprentice] = useState(false);            // [USER] 21+ at commencement → junior % does NOT apply
  const [apprenticeYear, setApprenticeYear] = useState(1);                      // [USER] current year/stage of apprenticeship
  const [juniorPercents, setJuniorPercents] = useState({ ...JUNIOR_APPRENTICE_PERCENT_DEFAULTS }); // [API→CALC] editable, VERIFY vs award
  const [manualWage, setManualWage] = useState(29.50);                          // [USER] fallback / Custom

  /* ── [CONFIG]/[USER] CORE INPUTS ───────────────────────────────────── */
  const [rateModel, setRateModel] = useState("standard"); // [USER] Standard | ALEX | 52W | Custom
  const [hpw, setHpw] = useState(38);   // [CONFIG] roster hours/week (award ordinary hours basis = 38)
  const [hpd, setHpd] = useState(7.6);
  const [dpw, setDpw] = useState(5);
  const [billableWk, setBillableWk] = useState(39); // driven by rateModel unless Custom
  const [trainWk, setTrainWk] = useState(5);        // [CONFIG] off-the-job training weeks
  const [appYears, setAppYears] = useState(4);      // [USER] apprenticeship duration

  // [CONFIG] Leave — NES/award entitlements. MAPD does NOT expose leave data;
  // 20 AL / 10 PH / 10 sick / 17.5% loading are the standard clauses. Verify
  // leave loading against the specific award (e.g. MA000020 cl 38.2).
  const [alDays, setAlDays] = useState(20);
  const [phDays, setPhDays] = useState(10);
  const [sickDays, setSickDays] = useState(10);
  const [leaveLoad, setLeaveLoad] = useState(17.5);

  // [CONFIG] Oncosts — none of these come from MAPD.
  const [superRate, setSuperRate] = useState(12.0);  // legislated SG % — update on 1 July changes
  const [superOnOT, setSuperOnOT] = useState(false);
  const [wcRate, setWcRate] = useState(4.7);         // insurer/state/industry specific
  const [ohType, setOhType] = useState("percent");
  const [ohVal, setOhVal] = useState(6.5);
  const [study, setStudy] = useState(850);           // TAFE fees $/yr
  const [ppe, setPpe] = useState(350);               // protective clothing $/yr

  // [CONFIG] Margin.
  const [marginType, setMarginType] = useState("flat");
  const [marginVal, setMarginVal] = useState(2.10);

  // [API]+[USER] Allowances — loaded from award, user enables per job.
  const [allowances, setAllowances] = useState(DEFAULT_ALLOWANCES);

  // [CONFIG] Funding.
  const [fundingEnabled, setFundingEnabled] = useState(true);
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [fundingMethod, setFundingMethod] = useState("reduce");
  const [fundingPct, setFundingPct] = useState(100);

  // [API]+[CONFIG] Penalties.
  const [penalties, setPenalties] = useState(DEFAULT_PENALTIES);

  // UI
  const [tab, setTab] = useState("rates");
  const [compare, setCompare] = useState(false);

  /* ── RATE MODEL → BILLABLE WEEKS SYNC ──────────────────────────────── */
  const selectRateModel = (modelKey) => {
    setRateModel(modelKey);
    const model = RATE_MODELS.find(m => m.key === modelKey);
    if (model?.billableWeeks != null) setBillableWk(model.billableWeeks); // Custom leaves the input free
  };

  /* ── [API] LOADERS ─────────────────────────────────────────────────── */
  const loadAwards = useCallback(async () => {
    setApiStatus({ state: "loading", message: "Fetching awards…" });
    try {
      const awards = await fetchAwards(awardSearch, publishedYear);
      setAwardList(awards || []);
      setApiStatus({ state: "ok", message: `${(awards || []).length} awards loaded` });
    } catch (err) {
      setApiStatus({ state: "error", message: `Awards fetch failed: ${err.message}. Check API key / proxy / CORS.` });
    }
  }, [awardSearch, publishedYear]);

  const loadClassifications = useCallback(async (awardCode) => {
    if (!awardCode) return;
    setApiStatus({ state: "loading", message: `Fetching ${awardCode} classifications…` });
    try {
      const rows = await fetchClassifications(awardCode, publishedYear);
      const groups = groupClassifications(rows);
      setClassificationGroups(groups);
      // Auto-switch to API mode when apprentice rows exist.
      if (groups.apprentice.length || groups.adultApprentice.length) setWageMode("apiRate");
      setApiStatus({ state: "ok", message: `${rows.length} classifications (${groups.apprentice.length} apprentice, ${groups.adultApprentice.length} adult apprentice)` });
    } catch (err) {
      setApiStatus({ state: "error", message: `Classifications fetch failed: ${err.message}` });
    }
  }, [publishedYear]);

  const loadAllowancesFromAward = useCallback(async () => {
    if (!selectedAwardCode) return;
    setApiStatus({ state: "loading", message: "Fetching allowances…" });
    try {
      const [wageRows, expenseRows] = await Promise.all([
        fetchWageAllowances(selectedAwardCode, publishedYear),
        fetchExpenseAllowances(selectedAwardCode, publishedYear),
      ]);
      const apiAllowances = [...(wageRows || []), ...(expenseRows || [])]
        .filter(row => !row.operative_to || new Date(row.operative_to) >= new Date())
        .map(row => mapdAllowanceToAppAllowance(row, nid));
      // Keep manual allowances; replace previous API-sourced ones.
      setAllowances(prev => [...prev.filter(a => a.source !== "api"), ...apiAllowances]);
      setApiStatus({ state: "ok", message: `${apiAllowances.length} allowances loaded — enable the ones that apply to this job` });
    } catch (err) {
      setApiStatus({ state: "error", message: `Allowance fetch failed: ${err.message}` });
    }
  }, [selectedAwardCode, publishedYear]);

  const loadPenaltiesFromAward = useCallback(async () => {
    if (!selectedAwardCode) return;
    setApiStatus({ state: "loading", message: "Fetching penalties…" });
    try {
      const rows = await fetchAwardPenalties(selectedAwardCode, publishedYear);
      const apiPenalties = (rows || [])
        .filter(row => !row.operative_to || new Date(row.operative_to) >= new Date())
        // Apprentice-relevant rows only (or unclassified, which usually apply generally).
        .filter(row => ["AP", "AA", null, undefined].includes(row.employee_rate_type_code))
        .map(row => mapdPenaltyToAppPenalty(row, nid));
      setPenalties(prev => [...prev.filter(p => p.source !== "api"), ...apiPenalties]);
      setApiStatus({ state: "ok", message: `${apiPenalties.length} penalty rates loaded — review categories (OT vs penalty)` });
    } catch (err) {
      setApiStatus({ state: "error", message: `Penalty fetch failed: ${err.message}` });
    }
  }, [selectedAwardCode, publishedYear]);

  // Reload classifications when the award changes.
  useEffect(() => {
    if (selectedAwardCode) {
      setSelectedClassificationId("");
      setSelectedReferenceId("");
      loadClassifications(selectedAwardCode);
    }
  }, [selectedAwardCode, loadClassifications]);

  /* ── [API→CALC] WAGE RESOLUTION ────────────────────────────────────────
     Priority ladder:
       apiRate            → hourly from the chosen AP/AA classification row
       percentOfReference → reference hourly × junior % (skipped for adult
                            apprentices, who take the reference/AA rate)
       manual             → user-typed wage (Custom rate)                  */
  const wageResolution = useMemo(() => {
    if (wageMode === "apiRate") {
      const pool = isAdultApprentice
        ? [...classificationGroups.adultApprentice, ...classificationGroups.apprentice]
        : classificationGroups.apprentice;
      const row = pool.find(r => String(r.classification_fixed_id) === String(selectedClassificationId));
      const hourly = classificationToHourly(row);
      if (hourly != null) {
        return {
          wage: hourly, source: "api",
          detail: `${row.classification} — ${row.calculated_rate_type || row.base_rate_type || "assumed hourly"} (cl ${row.clauses || "?"})`,
        };
      }
      return { wage: manualWage, source: "manual", detail: "No API classification selected — manual wage in use" };
    }
    if (wageMode === "percentOfReference") {
      const refRow = classificationGroups.reference.find(r => String(r.classification_fixed_id) === String(selectedReferenceId));
      const refHourly = classificationToHourly(refRow);
      if (refHourly != null) {
        if (isAdultApprentice) {
          // Adult apprentice: junior % does NOT apply — award adult apprentice
          // minimums do. Use the AA rows (apiRate mode) or verify the clause.
          return { wage: refHourly, source: "derived", detail: `Adult apprentice — reference rate used directly (verify award adult-apprentice minimum)` };
        }
        const pct = juniorPercents[apprenticeYear] ?? 100;
        return {
          wage: refHourly * (pct / 100), source: "derived",
          detail: `${pct}% of ${refRow.classification} ${fd(refHourly)}/hr (junior apprentice %, cf. MA000020 cl 19.7 — verify %)`,
        };
      }
      return { wage: manualWage, source: "manual", detail: "No reference classification selected — manual wage in use" };
    }
    return { wage: manualWage, source: "manual", detail: "Manual / Custom wage" };
  }, [wageMode, selectedClassificationId, selectedReferenceId, isAdultApprentice, apprenticeYear, juniorPercents, manualWage, classificationGroups]);

  const wage = wageResolution.wage; // effective base hourly wage feeding the engine

  /* ── ENGINE INPUT ASSEMBLY ─────────────────────────────────────────── */
  const fundingTotal = fundingEnabled ? milestones.reduce((s, m) => s + m.amount, 0) : 0;

  const cfg = {
    wage, allowances, superRate: superRate / 100, wcRate: wcRate / 100, leaveLoad: leaveLoad / 100,
    marginType, marginVal,
    ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk, billableWk,
    appYears, superOnOT, fundingTotal, fundingMethod, fundingPct, study, ppe, penalties,
  };

  const res = useMemo(() => calculate(cfg), [wage, JSON.stringify(allowances), superRate, wcRate, leaveLoad, marginType, marginVal, ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk, billableWk, appYears, superOnOT, fundingTotal, fundingMethod, fundingPct, study, ppe, JSON.stringify(penalties)]);

  // Compare across the three standard models (Custom compares as-entered).
  const cmpModels = [
    { key: "s39", label: "Standard (39w)", bw: 39 },
    { key: "a48", label: "ALEX (48w)", bw: 48 },
    { key: "w52", label: "52 Week", bw: 52 },
  ];
  const cmpRes = useMemo(() => {
    if (!compare) return null;
    return Object.fromEntries(cmpModels.map(m => [m.key, calculate({ ...cfg, billableWk: m.bw })]));
  }, [compare, wage, JSON.stringify(allowances), superRate, wcRate, leaveLoad, marginType, marginVal, ohType, ohVal, hpw, hpd, dpw, alDays, phDays, sickDays, trainWk, appYears, superOnOT, fundingTotal, fundingMethod, fundingPct, study, ppe, JSON.stringify(penalties)]);

  /* ── CRUD helpers ──────────────────────────────────────────────────── */
  const addAllowance = () => setAllowances([...allowances, { id: nid(), name: "New Allowance", type: "perHour", amount: 0, superApplicable: false, enabled: true, source: "manual", clause: null, allPurpose: false }]);
  const updateAllowance = (id, field, val) => setAllowances(allowances.map(a => a.id === id ? { ...a, [field]: val } : a));
  const removeAllowance = (id) => setAllowances(allowances.filter(a => a.id !== id));

  const addMilestone = () => setMilestones([...milestones, { id: nid(), name: "Milestone", amount: 0, month: 12 }]);
  const updateMilestone = (id, field, val) => setMilestones(milestones.map(m => m.id === id ? { ...m, [field]: val } : m));
  const removeMilestone = (id) => setMilestones(milestones.filter(m => m.id !== id));

  const addPenalty = () => setPenalties([...penalties, { id: `pen${nid()}`, label: "New Rate", mult: 1.0, cat: "penalty", source: "manual", clause: null }]);
  const updatePenalty = (id, field, val) => setPenalties(penalties.map(p => p.id === id ? { ...p, [field]: val } : p));
  const removePenalty = (id) => setPenalties(penalties.filter(p => p.id !== id));

  const apprenticePool = isAdultApprentice
    ? [...classificationGroups.adultApprentice, ...classificationGroups.apprentice]
    : classificationGroups.apprentice;

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
              <h1 className="text-sm font-semibold">GTO Charge Rate Calculator <span style={{ color: V.acc2 }}>· FWC MAPD</span></h1>
              <p className="text-xs" style={{ color: V.tm }}>Award-driven apprentice & trainee host employer charges</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* API status pill */}
            <span className="text-xs px-2 py-1 rounded font-mono hidden sm:inline" style={{
              background: apiStatus.state === "error" ? "rgba(251,191,36,0.12)" : apiStatus.state === "ok" ? "rgba(167,139,250,0.12)" : "rgba(87,104,128,0.15)",
              color: apiStatus.state === "error" ? V.warn : apiStatus.state === "ok" ? V.pos : V.tm,
            }}>
              {apiStatus.state === "loading" ? "⟳ " : apiStatus.state === "error" ? "⚠ " : apiStatus.state === "ok" ? "● " : "○ "}
              {apiStatus.message || "API idle"}
            </span>
            <button onClick={() => setCompare(!compare)}
              className="px-3 py-1.5 rounded text-xs font-medium border transition-all"
              style={{ background: compare ? "rgba(59,130,246,0.1)" : "transparent", borderColor: compare ? "rgba(59,130,246,0.3)" : V.brd, color: compare ? V.acc2 : V.tm }}>
              {compare ? "✓ Comparing" : "Compare Models"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ═══ LEFT CONFIG COLUMN ═══ */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">

            {/* ── AWARD DATA [API] ── */}
            <Panel title="Award Data" accent="blue" badge="FWC MAPD">
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <Inp label="Published Year" value={parseInt(publishedYear) || 0} onChange={v => setPublishedYear(String(v))} step="1" />
                <div>
                  <label className="block text-xs mb-1" style={{ color: V.tm }}>Search Awards</label>
                  <input type="text" value={awardSearch} onChange={e => setAwardSearch(e.target.value)} placeholder="e.g. building"
                    className="w-full rounded px-2 py-1.5 text-sm border focus:outline-none"
                    style={{ background: V.inp, borderColor: V.brd, color: V.txt }} />
                </div>
              </div>
              <button onClick={loadAwards} className="w-full py-1.5 rounded text-xs font-medium border transition-all mb-2.5"
                style={{ borderColor: "rgba(59,130,246,0.3)", color: "#93c5fd", background: "rgba(59,130,246,0.06)" }}>
                {apiStatus.state === "loading" ? "Loading…" : "↓ Load Awards from FWC"}
              </button>

              {/* [USER] Award selection — e.g. MA000020 */}
              <Select label="Award" value={selectedAwardCode} onChange={setSelectedAwardCode}
                options={[{ value: "", label: awardList.length ? "— select award —" : "— load awards first —" },
                  ...awardList.map(a => ({ value: a.code, label: `${a.code} · ${a.name}` }))]} />

              {selectedAwardCode && (
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <button onClick={loadAllowancesFromAward} className="py-1.5 rounded text-xs font-medium border"
                    style={{ borderColor: V.brd, color: V.acc }}>↓ Allowances</button>
                  <button onClick={loadPenaltiesFromAward} className="py-1.5 rounded text-xs font-medium border"
                    style={{ borderColor: V.brd, color: V.acc }}>↓ Penalties</button>
                </div>
              )}
            </Panel>

            {/* ── APPRENTICE WAGE [API]/[API→CALC]/[USER] ── */}
            <Panel title="Apprentice Wage" badge={wageResolution.source.toUpperCase()}>
              {/* Wage-mode selector: how the base wage is resolved */}
              <div className="flex gap-1.5 mb-3">
                {[
                  { v: "apiRate", l: "Award Rate" },        // [API] AP/AA row
                  { v: "percentOfReference", l: "% of Ref" }, // [API→CALC] cl 19.7 style
                  { v: "manual", l: "Custom" },              // [USER]
                ].map(m => (
                  <button key={m.v} onClick={() => setWageMode(m.v)}
                    className="flex-1 py-1.5 rounded text-xs font-medium border transition-all"
                    style={{ background: wageMode === m.v ? "rgba(229,165,38,0.1)" : "transparent", borderColor: wageMode === m.v ? "rgba(229,165,38,0.35)" : V.brd, color: wageMode === m.v ? V.acc : V.tm }}>
                    {m.l}
                  </button>
                ))}
              </div>

              {/* [USER] Age at commencement — drives junior % applicability */}
              <div className="mb-3">
                <Toggle label="Adult apprentice (21+ at commencement — junior % does not apply)" value={isAdultApprentice} onChange={setIsAdultApprentice} />
              </div>

              {wageMode === "apiRate" && (
                <>
                  {/* [API] Apprentice classification rows (AP = junior % pre-applied by FWC; AA = adult apprentice) */}
                  <Select label={`Apprentice Classification (${apprenticePool.length} rows)`} value={selectedClassificationId} onChange={setSelectedClassificationId}
                    options={[{ value: "", label: apprenticePool.length ? "— select classification —" : "— select an award first —" },
                      ...apprenticePool.map(r => ({
                        value: String(r.classification_fixed_id),
                        label: `${r.classification} · ${classificationToHourly(r) != null ? fd(classificationToHourly(r)) + "/hr" : "no rate"}${r.employee_rate_type_code === "AA" ? " (AA)" : ""}`,
                      }))]} />
                  <p className="text-xs mt-2" style={{ color: V.tm }}>
                    FWC pre-calculates apprentice rates per year/stage — junior percentages are already applied in these rows.
                  </p>
                </>
              )}

              {wageMode === "percentOfReference" && (
                <>
                  {/* [API] Reference (full adult) classification */}
                  <Select label={`Reference Classification (${classificationGroups.reference.length} rows)`} value={selectedReferenceId} onChange={setSelectedReferenceId}
                    options={[{ value: "", label: classificationGroups.reference.length ? "— select reference rate —" : "— select an award first —" },
                      ...classificationGroups.reference.map(r => ({
                        value: String(r.classification_fixed_id),
                        label: `${r.classification} · ${classificationToHourly(r) != null ? fd(classificationToHourly(r)) + "/hr" : "no rate"}`,
                      }))]} />

                  {/* [USER] Year of apprenticeship + [API→CALC] junior % table */}
                  <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                    <Inp label="Apprentice Year" value={apprenticeYear} onChange={v => setApprenticeYear(Math.max(1, Math.min(4, Math.round(v))))} step="1" min="1" />
                    <Inp label={`Junior % (Yr ${apprenticeYear})`} value={juniorPercents[apprenticeYear] ?? 0}
                      onChange={v => setJuniorPercents({ ...juniorPercents, [apprenticeYear]: v })} suffix="%" disabled={isAdultApprentice} />
                  </div>
                  <div className="mt-2 p-2 rounded text-xs" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", color: V.warn }}>
                    ⚠ Junior apprentice % of the full-time reference rate (e.g. MA000020 cl 19.7).
                    Defaults are placeholders — verify against the award clause or use Award Rate mode.
                  </div>
                </>
              )}

              {wageMode === "manual" && (
                <Inp label="Base Wage Rate (manual)" value={manualWage} onChange={setManualWage} suffix="/hr" wide />
              )}

              {/* Resolved wage readout with provenance */}
              <div className="mt-3 p-2.5 rounded-lg flex items-center justify-between" style={{ background: V.cd }}>
                <div>
                  <div className="text-xs" style={{ color: V.tm }}>Effective Base Wage <SourceBadge source={wageResolution.source} /></div>
                  <div className="text-xs mt-0.5" style={{ color: V.ts }}>{wageResolution.detail}</div>
                </div>
                <div className="font-mono font-bold text-lg" style={{ color: V.acc }}>{fd(wage)}</div>
              </div>
            </Panel>

            {/* ── HOURS [CONFIG] ── */}
            <Panel title="Hours & Duration">
              <div className="grid grid-cols-2 gap-2.5">
                <Inp label="Hours / Week" value={hpw} onChange={setHpw} />
                <Inp label="Hours / Day" value={hpd} onChange={setHpd} />
                <Inp label="Days / Week" value={dpw} onChange={setDpw} step="1" />
                <Inp label="Apprenticeship" value={appYears} onChange={setAppYears} suffix="years" step="1" />
              </div>
              <p className="text-xs mt-2" style={{ color: V.tm }}>
                Award weekly rates convert to hourly at ÷{AWARD_ORDINARY_WEEKLY_HOURS} (award ordinary hours), independent of roster hours above.
              </p>
            </Panel>

            {/* ── BILLING MODEL [USER]/[CONFIG] ── */}
            <Panel title="Billing Model" accent="blue">
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {RATE_MODELS.map(m => (
                  <button key={m.key} onClick={() => selectRateModel(m.key)}
                    className="flex-1 min-w-[70px] py-1.5 rounded text-xs font-medium border transition-all"
                    style={{ background: rateModel === m.key ? "rgba(59,130,246,0.1)" : "transparent", borderColor: rateModel === m.key ? "rgba(59,130,246,0.3)" : V.brd, color: rateModel === m.key ? "#93c5fd" : V.tm }}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <Inp label="Billable Weeks" value={billableWk} onChange={v => { setBillableWk(v); setRateModel("custom"); }} suffix="/yr" step="1" disabled={rateModel !== "custom"} />
                <Inp label="Training Weeks" value={trainWk} onChange={setTrainWk} suffix="/yr" step="1" />
              </div>
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

            {/* ── LEAVE [CONFIG] — NES/award clause; not exposed by MAPD ── */}
            <Panel title="Leave Entitlements" collapsible defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2.5">
                <Inp label="Annual Leave" value={alDays} onChange={setAlDays} suffix="days" step="1" />
                <Inp label="Public Holidays" value={phDays} onChange={setPhDays} suffix="days" step="1" />
                <Inp label="Sick / Personal" value={sickDays} onChange={setSickDays} suffix="days" step="1" />
                <Inp label="Leave Loading" value={leaveLoad} onChange={setLeaveLoad} suffix="%" />
              </div>
              <p className="text-xs mt-2" style={{ color: V.tm }}>
                NES + award entitlements. MAPD does not publish leave data — verify loading against the award clause (commonly 17.5%).
              </p>
            </Panel>

            {/* ── ALLOWANCES [API]+[USER] ── */}
            <Panel title="Allowances" collapsible badge={allowances.some(a => a.source === "api") ? "AWARD-LOADED" : undefined}>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {allowances.map(a => (
                  <div key={a.id} className="rounded-lg p-2.5 border" style={{ background: V.cd, borderColor: a.enabled ? V.brd : "rgba(28,40,64,0.4)", opacity: a.enabled ? 1 : 0.55 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="text" value={a.name} onChange={e => updateAllowance(a.id, "name", e.target.value)}
                        className="flex-1 rounded px-2 py-1 text-xs border focus:outline-none"
                        style={{ background: V.inp, borderColor: V.brd, color: V.txt }} />
                      <SourceBadge source={a.source} />
                      <button onClick={() => updateAllowance(a.id, "enabled", !a.enabled)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: a.enabled ? V.pos : V.tm }}>
                        {a.enabled ? "ON" : "OFF"}
                      </button>
                      <button onClick={() => removeAllowance(a.id)} className="text-xs" style={{ color: V.warn }}>✕</button>
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
                    {/* [API] traceability + review flags */}
                    {(a.clause || a.allPurpose || a.needsReview) && (
                      <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: V.tm }}>
                        {a.clause && <span>cl {a.clause}</span>}
                        {a.allPurpose && <span className="px-1 rounded" style={{ background: "rgba(167,139,250,0.12)", color: V.pos }}>ALL-PURPOSE</span>}
                        {a.needsReview && <span className="px-1 rounded" style={{ background: "rgba(251,191,36,0.12)", color: V.warn }}>REVIEW FREQ.</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addAllowance} className="mt-2 text-xs font-medium px-2.5 py-1 rounded border transition-colors" style={{ borderColor: V.brd, color: V.acc }}>+ Add Manual Allowance</button>
              <p className="text-xs mt-2" style={{ color: V.tm }}>
                Award-loaded allowances arrive DISABLED — enable only those applicable to this job. ALL-PURPOSE allowances form part of the ordinary rate (super defaulted on).
              </p>
            </Panel>

            {/* ── ONCOSTS & MARGIN [CONFIG] — never from MAPD ── */}
            <Panel title="Oncosts & Margin" accent="purple" collapsible>
              <div className="grid grid-cols-2 gap-2.5">
                <Inp label="Super Rate (SG)" value={superRate} onChange={setSuperRate} suffix="%" />
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
              <p className="text-xs mt-2" style={{ color: V.tm }}>
                Business configuration — SG is legislated (not award data), WC is insurer/state specific. None of these exist in MAPD.
              </p>
            </Panel>

            {/* ── FUNDING [CONFIG] ── */}
            <Panel title="Funding / Incentives" accent="purple" collapsible>
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
                        <button onClick={() => removeMilestone(m.id)} className="text-xs" style={{ color: V.warn }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addMilestone} className="mt-2 text-xs font-medium px-2.5 py-1 rounded border" style={{ borderColor: V.brd, color: V.acc }}>+ Add Milestone</button>

                  <div className="mt-3 p-2.5 rounded-lg" style={{ background: V.cd }}>
                    <div className="flex justify-between text-xs mb-1"><span style={{ color: V.ts }}>Total Funding</span><span className="font-mono" style={{ color: V.pos }}>{fd(fundingTotal, 0)}</span></div>
                    <div className="flex justify-between text-xs mb-1"><span style={{ color: V.ts }}>Over {appYears} years × {billableWk}w × {hpw}hrs</span><span className="font-mono">{f(res.totalBillableHrsApp, 0)} hrs</span></div>
                    {fundingMethod !== "passThrough" && (
                      <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: V.brd }}>
                        <span style={{ color: V.ts }}>Discount per hour</span>
                        <span className="font-mono font-semibold" style={{ color: V.pos }}>−{fd(res.fundingPH)}</span>
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

            {/* ── PENALTY CONFIG [API]+[CONFIG] ── */}
            <Panel title="Penalty / OT Rates" collapsible defaultOpen={false} badge={penalties.some(p => p.source === "api") ? "AWARD-LOADED" : undefined}>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {penalties.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <input type="text" value={p.label} onChange={e => updatePenalty(p.id, "label", e.target.value)}
                      className="flex-1 rounded px-2 py-1 text-xs border focus:outline-none"
                      style={{ background: V.inp, borderColor: V.brd, color: V.txt }} />
                    {p.source === "api" && <SourceBadge source="api" />}
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
                    <button onClick={() => removePenalty(p.id)} className="text-xs" style={{ color: V.warn }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addPenalty} className="mt-2 text-xs font-medium px-2.5 py-1 rounded border" style={{ borderColor: V.brd, color: V.acc }}>+ Add Rate</button>
              <p className="text-xs mt-2" style={{ color: V.tm }}>
                Award-loaded penalties map rate % → multiplier (150% → 1.5×). Review the OT vs Penalty category — it's inferred from clause text.
              </p>
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
                        { label: "◆ Ordinary Time", key: "ord", bold: true },
                        { label: "Billed Cost (ex. margin)", val: r => r.ordCost },
                        { label: "Total Annual Cost", val: r => r.totCost, fmt: 0 },
                        { label: "Billable Hours / Year", val: r => r.bHrs, fmt: 0, nd: true },
                        { label: "Oncost / Hour", val: r => r.totOnc },
                        { label: "Funding Discount", val: r => r.fundingPH, color: V.pos, prefix: "−" },
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
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.1)", color: V.pos }}>
                            −{fd(res.fundingPH)} funding
                          </span>
                        </div>
                      )}
                      <div className="text-xs mt-1.5" style={{ color: V.tm }}>
                        {RATE_MODELS.find(m => m.key === rateModel)?.label} • {billableWk}w billable × {hpw}hrs = {f(res.bHrs, 0)} hrs/yr • {appYears} year apprenticeship
                        {selectedAwardCode ? ` • ${selectedAwardCode}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs flex items-center gap-1 justify-end" style={{ color: V.tm }}>Base Wage <SourceBadge source={wageResolution.source} /></div>
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
                      { l: "Margin /hr", v: fd(res.marginPH), c: V.pos },
                      { l: "OT Base (1×)", v: fd(res.ot1x) },
                      { l: "Funding /hr", v: res.fundingPH > 0 ? `−${fd(res.fundingPH)}` : "—", c: res.fundingPH > 0 ? V.pos : V.tm },
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
                        <div className="mt-2 text-xs p-2 rounded" style={{ background: "rgba(167,139,250,0.05)", color: V.pos, border: `1px solid rgba(167,139,250,0.15)` }}>
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
                              {res.fundingPH > 0 && <th className="text-right py-1.5 font-medium" style={{ color: V.pos }}>After Funding</th>}
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: `1px solid ${V.brd}` }}>
                              <td className="py-1.5 font-medium" style={{ color: V.acc }}>Ordinary Time</td>
                              <td className="py-1.5 text-right font-mono">1.0×</td>
                              <td className="py-1.5 text-right" style={{ color: V.ts }}>Base</td>
                              <td className="py-1.5 text-right font-mono">{fd(res.rates.ord.charge)}</td>
                              {res.fundingPH > 0 && <td className="py-1.5 text-right font-mono font-semibold" style={{ color: V.pos }}>{fd(res.rates.ord.funded)}</td>}
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
                                  {res.fundingPH > 0 && <td className="py-1 text-right font-mono" style={{ color: r.funding > 0 ? V.pos : V.ts }}>{fd(r.funded)}</td>}
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
                    <CostRow label="Study / TAFE Fees" val={res.study ?? study} total={res.totCost} />
                    <CostRow label="PPE Costs" val={res.ppe ?? ppe} total={res.totCost} />
                    <CostRow label={`Overheads (${ohType === "percent" ? ohVal + "%" : "flat"})`} val={res.oh} total={res.totCost} />
                    <div className="my-1.5 border-t" style={{ borderColor: V.ts }} />
                    <CostRow label="TOTAL ANNUAL COST" val={res.totCost} total={res.totCost} bold />

                    <div className="mt-4 pt-3 border-t" style={{ borderColor: V.brd }}>
                      <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: V.tm }}>Hourly Rate Build-Up</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          {[[`Base wage (${wageResolution.source})`, fd(wage)], [`+ Allowances (${(allowances || []).filter(a => a.enabled).length})`, fd(res.allowPerHour)]].map(([l, v]) => (
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
                            [`+ Margin (${marginType === "flat" ? "$" : "%"})`, fd(res.marginPH), V.pos],
                          ].map(([l, v, c]) => (
                            <div key={l} className="flex justify-between text-sm"><span style={{ color: V.tm }}>{l}</span><span className="font-mono" style={{ color: c }}>{v}</span></div>
                          ))}
                          {res.fundingPH > 0 && (
                            <div className="flex justify-between text-sm"><span style={{ color: V.tm }}>− Funding discount</span><span className="font-mono" style={{ color: V.pos }}>−{fd(res.fundingPH)}</span></div>
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
                          res.fundingPH > 0 ? { l: "− Funding", v: `−${fd(res.fundingPH)}`, c: V.pos } : null,
                          { l: "= Charge /hr", v: fd(res.rates.ord.funded), c: V.acc },
                        ].filter(Boolean).map(s => (
                          <div key={s.l}><div className="text-xs" style={{ color: V.tm }}>{s.l}</div><div className="font-mono font-bold" style={{ color: s.c || V.txt }}>{s.v}</div></div>
                        ))}
                      </div>
                    </div>

                    {/* Allowance detail with clause traceability */}
                    {(allowances || []).filter(a => a.enabled).length > 0 && (
                      <div className="mt-4 pt-3 border-t" style={{ borderColor: V.brd }}>
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: V.tm }}>Allowance Detail</div>
                        {(allowances || []).filter(a => a.enabled).map(a => {
                          let perHourValue = 0;
                          if (a.type === "perHour") perHourValue = a.amount;
                          else if (a.type === "perDay") perHourValue = a.amount / (hpw / dpw);
                          else if (a.type === "perWeek") perHourValue = a.amount / hpw;
                          else if (a.type === "percent") perHourValue = wage * (a.amount / 100);
                          else perHourValue = a.amount;
                          return (
                            <div key={a.id} className="flex justify-between text-sm py-0.5">
                              <span style={{ color: V.ts }}>{a.name} <span className="text-xs" style={{ color: V.tm }}>({a.type}{a.superApplicable ? " + super" : ""}{a.clause ? ` · cl ${a.clause}` : ""})</span> <SourceBadge source={a.source} /></span>
                              <span className="font-mono">{fd(perHourValue)}/hr</span>
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
          <p className="text-xs" style={{ color: "rgba(87,104,128,0.5)" }}>
            GTO Charge Rate Calculator · FWC MAPD integrated · {selectedAwardCode || "no award selected"} · Super {superRate}% (SG) · Apprenticeship {appYears}yr · {RATE_MODELS.find(m => m.key === rateModel)?.label}
          </p>
        </div>
      </div>
    </div>
  );
}
