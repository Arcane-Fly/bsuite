/**
 * PORTED from R80.4 src/awards/ma000020-supervision.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS (see
 * round.test.ts in this directory) and import paths — every assertion body is
 * byte-for-byte identical to upstream, including the top-level-await block
 * near the foot of the file.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import {
  LEADING_HAND_BANDS, forepersonRate,
  leadingHandAmount,
} from "../../r804/ma000020-supervision.js";
import type { CalcConfig } from "../../r804/calc-types.js";

const t = (n: string, f: () => void) => it(n, f);

const CW3 = 1119.10;

t("all four cl.19.2(a) bands", () => {
  const cases: Array<[number, number]> = [[1, 2.4], [2, 5.3], [5, 5.3], [6, 6.7], [10, 6.7], [11, 9.0], [50, 9.0]];
  for (const [persons, pct] of cases) {
    const r = leadingHandAmount({ personsInCharge: persons, highestSupervisedWeekly: CW3, ownWeekly: CW3 });
    assert.equal(r.pct, pct, `${persons} persons should be ${pct}%, got ${r.pct}%`);
  }
});

t("2.4% of CW3 = $26.86/wk = $0.71/hr", () => {
  const r = leadingHandAmount({ personsInCharge: 1, highestSupervisedWeekly: CW3, ownWeekly: CW3 });
  assert.equal(r.perWeek, 26.86);
  assert.equal(r.perHour, 0.71);
});

t("THE TRAP: it is the HIGHEST CLASSIFICATION SUPERVISED where that is higher", () => {
  // A leading hand on a lower classification than someone in their charge.
  const r = leadingHandAmount({ personsInCharge: 3, highestSupervisedWeekly: 1300, ownWeekly: 1119.10 });
  assert.equal(r.baseWeeklyUsed, 1300, "must use the supervised rate, which is higher");
  assert.equal(r.perWeek, 68.90);   // 1300 x 5.3%
  assert.ok(textContains(r.reason, "HIGHEST CLASSIFICATION SUPERVISED"));
});

t("...but the employee's OWN rate wins where it is the greater", () => {
  const r = leadingHandAmount({ personsInCharge: 3, highestSupervisedWeekly: 900, ownWeekly: CW3 });
  assert.equal(r.baseWeeklyUsed, CW3);
  assert.ok(textContains(r.reason, "own rate, which is the higher"));
});

t("no appointment, no allowance", () => {
  const r = leadingHandAmount({ personsInCharge: 0, highestSupervisedWeekly: CW3, ownWeekly: CW3 });
  assert.equal(r.perWeek, 0);
  assert.ok(textContains(r.reason, "SPECIFICALLY APPOINTED"));
});

t("cl.19.2(b): daily hire applies 52/50.4 and lifts the hourly figure", () => {
  const plain = leadingHandAmount({ personsInCharge: 1, highestSupervisedWeekly: CW3, ownWeekly: CW3 });
  const dh = leadingHandAmount({ personsInCharge: 1, highestSupervisedWeekly: CW3, ownWeekly: CW3, dailyHire: true });
  assert.ok(dh.perHour > plain.perHour);
  assert.equal(dh.perHour, Math.round((26.86 * (52 / 50.4)) / 38 * 100 + 1e-9) / 100);
});

t("cl.19.2(b): a carpenter-diver divides by 31, not 38", () => {
  const r = leadingHandAmount({ personsInCharge: 1, highestSupervisedWeekly: CW3, ownWeekly: CW3, carpenterDiver: true });
  assert.equal(r.perHour, Math.round(26.86 / 31 * 100 + 1e-9) / 100);
  assert.ok(textContains(r.reason, "divisor is 31"));
});

/* ── cl.43 gates ─────────────────────────────────────────────────────────── */

t("cl.43 PRICES a foreperson — it does not decide whether the clause applies", () => {
  /* OPERATOR RULING 2026-08-03: cost IF applied, not whether it applies. */
  const r = forepersonRate({
    classification: "Foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: true
  });
  assert.equal(r.applies, true);
  assert.equal(r.verified, true);
  assert.equal(r.perWeek, 1202.00);
  assert.equal(r.perHour, Math.round((1202 / 38) * 100 + 1e-9) / 100);
});

t("...but it STATES the conditions, so a quote is not a trap", () => {
  const r = forepersonRate({
    classification: "Foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: true
  });
  assert.ok(r.conditions.length >= 2);
  assert.ok(r.conditions.some((c) => c.includes("METAL AND ENGINEERING")));
  assert.ok(r.conditions.some((c) => c.includes("30 OR MORE employees")));
});

t("MAPD-verified rates price without allowUnverified — the 'transposition' was wrong", () => {
  /* Live MAPD 2026-07-01 matches the award table; the inverted shape is real. */
  const r = forepersonRate({
    classification: "Foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: true
  });
  assert.equal(r.perWeek, 1202.00);
  assert.equal(r.verified, true);
  assert.ok(!textContains(r.reason, "UNVERIFIED"));
});

t("the supervision-count column changes the figure — 3+ is LOWER (published fact)", () => {
  const many = forepersonRate({
    classification: "Foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: true
  });
  const few = forepersonRate({
    classification: "Foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: false
  });
  assert.equal(many.perWeek, 1202.00);
  assert.equal(few.perWeek, 1303.00);
  assert.ok(many.perWeek! < few.perWeek!, "3+ tradespersons cohort is the lower published rate");
});

t("General foreperson rates are MAPD-verified (lower than Foreperson — also published)", () => {
  const g = forepersonRate({
    classification: "General foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: true
  });
  assert.equal(g.perWeek, 1169.50);
  assert.equal(g.verified, true);
  const f = forepersonRate({
    classification: "Foreperson/supervisor",
    supervisesThreeOrMoreTradespersons: true
  });
  assert.ok(g.perWeek! < f.perWeek!);
});

t("the band table is contiguous — no gap can drop a leading hand to zero", () => {
  for (let n = 1; n <= 60; n++) {
    const b = LEADING_HAND_BANDS.find((x) => n >= x.minPersons && n <= x.maxPersons);
    assert.ok(b, `no band covers ${n} persons`);
  }
});


/* ── Added 2026-08-03: the two 52/50.4 conversions must not stack ─────────── */
{
  const { calculate } = await import("../../r804/calculate.js");
  const base: CalcConfig = {
    wage: 29.45, allowances: [], superRate: 0, wcRate: 0, leaveLoad: 0.175,
    profitType: "markup", profitVal: 0, ohType: "flat", ohVal: 0, dpw: 5,
    alDays: 20, phDays: 10, sickDays: 10, trainWk: 0, autoWeeks: true, manualBw: 0,
    appYears: 4, superOnOT: false, empType: "fullTime", workedPW: 38,
    rdoIncluded: false, rdoAccrual: 0, ptHours: 20, funding: { totalFunding: 0 } as CalcConfig["funding"],
    fundYearSel: "avg", study: 0, ppe: 0, penalties: [],
    engagement: "worker", engagedAsDailyHire: true,
  };

  t("cl.19.2(b) and cl.19.3(a) do NOT both convert the leading hand", () => {
    const withLH = calculate({ ...base, leadingHand: { personsInCharge: 1 } });
    const noLH = calculate(base);
    const F = 52 / 50.4;

    // The leading hand adds 2.4% of the weekly rate, divided by 38, and the
    // WHOLE resulting ordinary rate is then converted once by cl.19.3(a).
    const lhPerHour = withLH.leadingHand!.perHour;
    const expected = Math.round(((noLH.recv + lhPerHour) * F) * 100 + 1e-9) / 100;

    assert.equal(withLH.ordinaryHourlyRate, expected,
      "the leading hand allowance is being converted twice by 52/50.4");
    // And prove the double conversion is genuinely different, so this can fail.
    const doubled = Math.round(((noLH.recv + lhPerHour * F) * F) * 100 + 1e-9) / 100;
    assert.notEqual(withLH.ordinaryHourlyRate, doubled);
  });

  t("a weekly-hire leading hand gets no daily-hire factor at all", () => {
    const r = calculate({ ...base, engagedAsDailyHire: false, leadingHand: { personsInCharge: 1 } });
    assert.equal(r.dailyHire!.applied, false);
    assert.equal(r.ordinaryHourlyRate, r.recv);
  });
}
