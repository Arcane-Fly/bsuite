/**
 * THE ENGINE, END TO END, AGAINST PUBLISHED DOLLARS.
 *
 * PORTED from R80.4 src/awards/engine-payguide.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. THIS IS THE PORT'S OUTPUT-
 * EQUIVALENCE PROOF: every assertion goes through the ported calculate(), and
 * every dollar figure below is unchanged from upstream. If this file passes,
 * the ported engine reproduces R80.4's published-dollar reconciliation
 * unchanged.
 *
 * ADAPTED ONLY AT THE HARNESS and two type-only details in `cfg()` — see
 * casual.test.ts in this directory for why `ohType`/`fundYearSel` needed
 * adjusting for the destination's stricter test-file type-checking. No
 * dollar figure, multiplier, or assertion body changed.
 *
 * This is the test that could not exist before 2026-08-03, because calculate()
 * lived inside a .tsx and no plain `node --test` run could import it. Its
 * absence is exactly why a rounding defect mispriced 21 of 27 sampled
 * classifications while the suite stayed green: the reconciliation tests
 * re-derived the arithmetic instead of calling the engine.
 *
 * Every assertion here goes through the REAL calculate(). Nothing is
 * re-implemented locally. If that rule is ever relaxed, this file stops being
 * evidence of anything.
 *
 * Figures: FWC Pay Guide MA000020, 1 July 2026, and PACT.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import { calculate } from "../../r804/calculate.js";
import { money, round2 } from "../../r804/round.js";
import type { CalcConfig, AllowanceRow, PenaltyRow } from "../../r804/calc-types.js";

const t = (n: string, f: () => void) => it(n, f);

const STD_WEEKLY = 1119.10;
const STD_HOURLY = STD_WEEKLY / 38;          // 29.45

const PENALTIES: PenaltyRow[] = [
  { id: "ot15", label: "OT first 2h", mult: 1.5, cat: "overtime" },
  { id: "ot20", label: "OT after 2h", mult: 2.0, cat: "overtime" },
  { id: "ph", label: "Public Holiday", mult: 2.5, cat: "penalty" },
];

const allowance = (o: Partial<AllowanceRow>): AllowanceRow => ({
  id: o.id ?? "a", name: o.name ?? "allowance", enabled: true,
  type: "perWeek", amount: 0, basis: "allPurpose", superApplicable: true,
  ...o,
} as AllowanceRow);

/** A config with every commercial variable neutralised, so only the AWARD shows. */
const cfg = (over: Partial<CalcConfig> = {}): CalcConfig => ({
  wage: STD_HOURLY * 0.50,
  allowances: [],
  superRate: 0, wcRate: 0, leaveLoad: 0.175,
  profitType: "markup", profitVal: 0,
  ohType: "flat", ohVal: 0,
  dpw: 5, alDays: 20, phDays: 10, sickDays: 10, trainWk: 5,
  autoWeeks: true, manualBw: 0, appYears: 4, superOnOT: false,
  empType: "fullTime", workedPW: 38, rdoIncluded: false, rdoAccrual: 0, ptHours: 20,
  funding: { totalFunding: 0 } as never,
  fundYearSel: "avg",
  study: 0, ppe: 0, penalties: PENALTIES,
  ...over,
});

const IND = allowance({ id: "ind", name: "Industry allowance", amount: 67.15 });
const TOOL_CARP = allowance({ id: "tool", name: "Tool allowance (carpenter)", amount: 41.22 });

/* ── 1. The ordinary wage the engine actually produces ──────────────────────── */

const ROWS = [
  { label: "stage 1, no Y12, industry only", pct: 0.50, allow: [IND], hourly: 16.49 },
  { label: "stage 1, Y12, industry only",    pct: 0.55, allow: [IND], hourly: 17.96 },
  { label: "stage 2, no Y12, industry only", pct: 0.60, allow: [IND], hourly: 19.44 },
  { label: "stage 4, industry only",         pct: 0.90, allow: [IND], hourly: 28.27 },
  { label: "civil carpenter stage 1 Y12 (PACT)", pct: 0.55, allow: [IND, TOOL_CARP], hourly: 19.05 },
];

for (const r of ROWS) {
  t(`ENGINE ordinary wage — ${r.label} = $${r.hourly}`, () => {
    const res = calculate(cfg({ wage: STD_HOURLY * r.pct, allowances: r.allow }));
    assert.equal(res.recv, r.hourly,
      `engine gave $${res.recv}, FWC publishes $${r.hourly}`);
  });
  t(`ENGINE penalty rates — ${r.label}`, () => {
    const res = calculate(cfg({ wage: STD_HOURLY * r.pct, allowances: r.allow }));
    for (const p of PENALTIES) {
      assert.equal(round2(r.hourly * p.mult), round2(res.recv * p.mult));
    }
  });
}

t("REGRESSION: the engine does not reproduce the pre-fix $16.50", () => {
  const res = calculate(cfg({ wage: STD_HOURLY * 0.50, allowances: [IND] }));
  assert.notEqual(res.recv, 16.50, "the premature-rounding defect has returned");
  assert.equal(res.recv, 16.49);
});

/* ── 2. Part-time uses the AWARD's ordinary hours, not the contracted week ──── */

t("PART-TIME: a 20h part-timer is on the SAME ordinary hourly rate (cl.11.2)", () => {
  const ft = calculate(cfg({ wage: STD_HOURLY * 0.50, allowances: [IND] }));
  const pt = calculate(cfg({ wage: STD_HOURLY * 0.50, allowances: [IND],
    empType: "partTime", ptHours: 20 }));
  assert.equal(pt.recv, ft.recv,
    `part-timer $${pt.recv} vs full-timer $${ft.recv} — cl.11.2 gives them the same ordinary hourly rate`);
  assert.equal(pt.recv, 16.49);
});

t("PART-TIME: the pre-fix divisor would have inflated the rate to ~$18.08", () => {
  // 14.725 + 67.15/20 = 18.0825 -> 18.08. Asserted so the defect cannot return.
  assert.equal(round2(STD_HOURLY * 0.50 + 67.15 / 20), 18.08);
  const pt = calculate(cfg({ wage: STD_HOURLY * 0.50, allowances: [IND],
    empType: "partTime", ptHours: 20 }));
  assert.notEqual(pt.recv, 18.08);
});

/* ── 3. Workers comp follows superannuation ────────────────────────────────── */

const MEAL = allowance({ id: "meal", name: "Meal allowance", type: "perDay",
  amount: 19.74, basis: "workedOnly", superApplicable: false });

t("WC follows super: an allowance with no super attracts no WC premium", () => {
  const res = calculate(cfg({ allowances: [IND, MEAL], superRate: 0.12, wcRate: 0.047 }));
  const noMeal = calculate(cfg({ allowances: [IND], superRate: 0.12, wcRate: 0.047 }));
  assert.equal(round2(res.wc), round2(noMeal.wc),
    "the meal allowance attracts no super, so it must attract no WC");
});

t("WC on all wages is available as an ELECTION and does change the figure", () => {
  const base = calculate(cfg({ allowances: [IND, MEAL], superRate: 0.12, wcRate: 0.047 }));
  const broad = calculate(cfg({ allowances: [IND, MEAL], superRate: 0.12, wcRate: 0.047,
    wcOnAllWages: true }));
  assert.ok(broad.wc > base.wc,
    "electing the broader wages base must increase the WC premium, or the toggle is decoration");
});

/* ── 4. Penalties multiply the ordinary wage, not the cost stack ────────────── */

t("Overhead and PPE flow into a penalty hour ONCE, never multiplied", () => {
  /* A penalty hour IS an ordinary billable hour worked at a higher rate, so it
     legitimately carries the per-hour cost stack — once. The defect this guards
     against was `ordCost x mult`, which charged 2.5x the admin overhead and PPE
     for a public holiday and over-charged the hour by 11%.

     So the invariant is not that PPE leaves the penalty rate untouched — it is
     that PPE moves the penalty rate by EXACTLY its per-hour amount, x1. */
  const lean = calculate(cfg({ allowances: [IND] }));
  const heavy = calculate(cfg({ allowances: [IND], ppe: 5000, study: 5000 }));

  const stackDelta = heavy.ordCost - lean.ordCost;
  const phDelta = heavy.rates.ph.cost - lean.rates.ph.cost;

  assert.ok(stackDelta > 0, "test is inert — $10,000 of PPE/study must move the ordinary cost");
  assert.equal(round2(phDelta), round2(stackDelta),
    `PPE moved the public-holiday cost by ${money(phDelta)} but the stack only rose ${money(stackDelta)} — the multiplier is hitting the cost stack again`);
  assert.notEqual(round2(phDelta), round2(stackDelta * 2.5),
    "the cost stack is being multiplied by the penalty rate");
});

t("A penalty hour = ordinary cost + the multiplied WAGE uplift only", () => {
  const r = calculate(cfg({ allowances: [IND], superRate: 0.12, wcRate: 0.047 }));
  const extraWage = r.recv * (2.5 - 1);
  const expected = r.ordCost + extraWage + extraWage * (0.12 + 0.047);
  assert.equal(round2(r.rates.ph.cost), round2(expected));
});

/* ── 5. Leading hand and daily hire reach the ORDINARY WAGE ────────────────── */

t("LEADING HAND is inside the ordinary wage, so penalties calculate on it", () => {
  const plain = calculate(cfg({ allowances: [IND] }));
  const lh = calculate(cfg({ allowances: [IND],
    leadingHand: { personsInCharge: 3 } }));
  assert.ok(lh.recv > plain.recv, "cl.19.2 is ALL PURPOSE — it must lift the ordinary wage");
  assert.equal(lh.leadingHand!.pct, 5.3);
  // and the uplift flows into every multiplier
  assert.ok(lh.rates.ph.cost > plain.rates.ph.cost);
});

t("LEADING HAND uses the HIGHEST CLASSIFICATION SUPERVISED where higher", () => {
  const own = calculate(cfg({ allowances: [IND], leadingHand: { personsInCharge: 3 } }));
  const sup = calculate(cfg({ allowances: [IND],
    leadingHand: { personsInCharge: 3, highestSupervisedWeekly: 2000 } }));
  assert.ok(sup.recv > own.recv, "supervising a higher classification must raise the allowance");
});

t("DAILY HIRE does NOT reach an apprentice, whatever the flag says", () => {
  const a = calculate(cfg({ allowances: [IND], engagement: "apprentice", engagedAsDailyHire: true }));
  assert.equal(a.dailyHire!.applied, false);
  assert.equal(a.ordinaryHourlyRate, a.recv, "an apprentice must not get the 52/50.4 factor");
  assert.ok(textContains(a.dailyHire!.reason, "does NOT apply to apprentices"));
});

t("DAILY HIRE DOES reach a worker who is engaged as one", () => {
  const w = calculate(cfg({ allowances: [IND], engagement: "worker", engagedAsDailyHire: true }));
  assert.equal(w.dailyHire!.applied, true);
  assert.ok(w.ordinaryHourlyRate! > w.recv);
  // 52/50.4 is ~3.17%
  assert.ok(Math.abs(w.ordinaryHourlyRate! / w.recv - 52 / 50.4) < 0.001);
});

t("a worker NOT engaged as daily hire gets no factor — it is an election", () => {
  const w = calculate(cfg({ allowances: [IND], engagement: "worker" }));
  assert.equal(w.dailyHire!.applied, false);
  assert.equal(w.ordinaryHourlyRate, w.recv);
});

t("MINIMUM ENGAGEMENTS ride on the rate rows", () => {
  const r = calculate(cfg({ allowances: [IND] }));
  assert.equal(r.rates.ph.minimumHours, 4);
  assert.equal(r.rates.ph.minimumClause, "30.2(d)");
});
