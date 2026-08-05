/**
 * Accident pay, redundancy and school-based apprentices — the costs that are
 * NOT per-hour on-costs.
 *
 * PORTED from R80.4 src/awards/contingent-costs.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS (see
 * round.test.ts in this directory for what that means) — every assertion body
 * is byte-for-byte identical to upstream, including the top-level-await block
 * near the foot of the file (ESM top-level await is valid at vitest module
 * scope, exactly as it is under plain `node --test`).
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import { accidentPay, redundancyPay, ACCIDENT_PAY, SCHOOL_BASED,
         schoolBasedStage, schoolBasedPaidTrainingHours, schoolBasedVsFullTime } from "../../r804/contingent-costs.js";

const t = (n: string, f: () => void) => it(n, f);

const ORD = 18.73;   // civil bricklayer 1st yr Y12, reconciled to PACT

// ── ACCIDENT PAY, cl.27 ──────────────────────────────────────────────────────
t("top-up is the GAP between workers comp and 38 ordinary hours", () => {
  const r = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 500 });
  assert.equal(r.weeklyTopUp, Math.round((ORD * 38 - 500) * 100) / 100);
  assert.equal(r.entitled, true);
});

t("capped at 26 weeks per injury (cl.27.3)", () => {
  assert.equal(ACCIDENT_PAY.maxWeeks, 26);
  const r = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 500, weeksClaimed: 40 });
  assert.equal(r.weeksClaimed, 26, "cannot claim beyond the cap");
});

t("cl.27.9: no entitlement where workers comp already meets ordinary time", () => {
  const r = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 9999 });
  assert.equal(r.weeklyTopUp, 0);
  assert.equal(r.entitled, false);
  assert.ok(textContains(r.reason, "27.9"));
});

t("never goes negative — a top-up cannot claw money back", () => {
  const r = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 800 });
  assert.ok(r.weeklyTopUp >= 0);
});

t("cl.27.8: modified-duties earnings reduce the top-up", () => {
  const a = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 400 });
  const b = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 400, reducedDutiesWeekly: 100 });
  assert.equal(Math.round((a.weeklyTopUp - b.weeklyTopUp) * 100) / 100, 100);
});

t("cl.27.3: no accepted claim, no accident pay", () => {
  const r = accidentPay({ ordinaryHourlyRate: ORD, workersCompWeekly: 400, claimAccepted: false });
  assert.equal(r.entitled, false);
  assert.equal(r.liability, 0);
});

// ── REDUNDANCY, cl.41 ────────────────────────────────────────────────────────
t("4+ years is a flat 8 weeks' pay", () => {
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 * 5 });
  assert.equal(r.weeks, 8);
  assert.equal(r.weeksPay, Math.round(ORD * 38 * 100) / 100, "week's pay = ordinary hourly x 38");
});

t("bands accrue and CAP at the next band's base", () => {
  // 1-2 years: 2.4 weeks + 1.75 hrs per completed week, capped at 4.8 weeks.
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 + 51 });
  assert.ok(r.weeks <= 4.8, `capped at 4.8, got ${r.weeks}`);
  assert.ok(r.weeks > 2.4, "must have accrued above the band base");
});

t("under 12 months accrues at 1.75 hours per week of service", () => {
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 26 });
  assert.equal(r.weeks, Math.round((26 * 1.75 / 38) * 100) / 100);
});

t("cl.41.3(d): casual service does not accrue", () => {
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 * 5, isCasual: true });
  assert.equal(r.payable, 0);
  assert.ok(textContains(r.reason, "41.3(d)"));
});

t("cl.14.2(e): apprentices get no redundancy, but the SERVICE still counts", () => {
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 * 3, isApprentice: true });
  assert.equal(r.payable, 0);
  assert.ok(textContains(r.reason, "Record the service anyway"));
  /* Retained after completion AND a further 12 months served -> the accrued
     service pays out. This assertion previously omitted the 12 month condition
     and so encoded an entitlement cl.41.3(e) does not grant. Corrected
     2026-08-03 along with the rule itself. */
  const kept = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 * 3,
    isApprentice: true, continuedAfterApprenticeship: true, weeksEmployedAfterCompletion: 52 });
  assert.ok(kept.payable > 0);
});

t("cl.41.4: scheme contributions offset, and cannot go below zero", () => {
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 * 5, schemeContributions: 999999 });
  assert.equal(r.payable, 0, "offset cannot create a negative payment");
  assert.equal(r.amount > 0, true, "the entitlement still existed");
});

t("cl.41.1: this scheme REPLACES the NES — the reason says so", () => {
  const r = redundancyPay({ ordinaryHourlyRate: ORD, completedWeeksService: 52 * 5 });
  assert.ok(textContains(r.reason, "REPLACES the NES"));
});

// ── SCHOOL-BASED APPRENTICES, Schedule C ─────────────────────────────────────
t("C.8: progression is HALF pace — 12 months per 2 years", () => {
  assert.equal(SCHOOL_BASED.progressionYearsPerStage, 2);
  assert.equal(schoolBasedStage(0), 1);
  assert.equal(schoolBasedStage(2), 2);
  assert.equal(schoolBasedStage(4), 3);
  assert.equal(schoolBasedStage(6), 4);
});

t("at the same elapsed time they are BEHIND a full-time apprentice", () => {
  const c = schoolBasedVsFullTime(4);
  assert.equal(c.schoolBasedStage, 3);
  assert.equal(c.fullTimeStage, 4);
  assert.equal(c.stagesBehind, 1);
  assert.ok(textContains(c.note, "over-states the wage"));
});

t("C.4: paid training time is 25% of hours actually worked on the job", () => {
  assert.equal(SCHOOL_BASED.paidTrainingProportion, 0.25);
  assert.equal(schoolBasedPaidTrainingHours(20), 5);
});

t("C.7: the apprenticeship must not exceed 6 years", () => {
  assert.equal(SCHOOL_BASED.maxDurationYears, 6);
  assert.equal(schoolBasedStage(20, 4), 4, "stage still caps at the nominal term");
});


/* ── Added 2026-08-03: redundancy edge conditions + casual loading ────────── */
{
  const { casualOrdinaryRate, CASUAL } = await import("../../r804/contingent-costs.js");

  t("cl.41.3(e): continuation alone is NOT enough — a further 12 months is required", () => {
    const r = redundancyPay({ ordinaryHourlyRate: 30, completedWeeksService: 200,
      isApprentice: true, continuedAfterApprenticeship: true, weeksEmployedAfterCompletion: 20 });
    assert.equal(r.payable, 0);
    assert.ok(textContains(r.reason, "further 12 months"));
    assert.ok(textContains(r.reason, "20 of the required 52"));
  });

  t("...and at 52 weeks after completion the entitlement crystallises", () => {
    const r = redundancyPay({ ordinaryHourlyRate: 30, completedWeeksService: 200,
      isApprentice: true, continuedAfterApprenticeship: true, weeksEmployedAfterCompletion: 52 });
    assert.ok(r.payable > 0, "at a further 12 months the apprenticeship service counts");
  });

  t("cl.14.2(e): re-engagement within 6 months brings the service back", () => {
    const r = redundancyPay({ ordinaryHourlyRate: 30, completedWeeksService: 200,
      isApprentice: true, reEngagedWithinSixMonths: true });
    assert.ok(r.payable > 0);
  });

  t("an apprentice with neither path gets nothing, and is told both remain open", () => {
    const r = redundancyPay({ ordinaryHourlyRate: 30, completedWeeksService: 200, isApprentice: true });
    assert.equal(r.payable, 0);
    assert.ok(textContains(r.reason, "can still be met later"));
  });

  t("casual loading is 25% and says what it compensates for", () => {
    const c = casualOrdinaryRate(16.49);
    assert.equal(c.rate, 20.61);
    assert.equal(CASUAL.accruesRedundancy, false);
    assert.ok(textContains(c.reason, "must NOT also be costed as on-costs"));
    assert.ok(textContains(c.reason, "cannot be engaged as casuals"));
  });
}
