/**
 * MA000020 cl.19.3 — DAILY HIRE.
 *
 * PORTED from R80.4 src/awards/ma000020-daily-hire.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. ADAPTED ONLY AT THE HARNESS (see
 * round.test.ts in this directory) — every assertion body is byte-for-byte
 * identical to upstream.
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import {
  DAILY_HIRE, dailyHireApplies, dailyHireOrdinaryHourly,
} from "../../r804/ma000020-daily-hire.js";
import { textContains } from "../../r804/text-normalise.js";

const t = (n: string, f: () => void) => it(n, f);

const ORD_WEEKLY = 1119.10;

t("the 52/50.4 factor is the award's, and is about 3.17%", () => {
  assert.equal(DAILY_HIRE.weeksPerYear, 52);
  assert.equal(DAILY_HIRE.divisorWeeks, 50.4);
  assert.ok(Math.abs(DAILY_HIRE.factor - 1.031746) < 0.000001);
});

t("OPERATOR RULING: daily hire does NOT reach an apprentice or trainee", () => {
  assert.equal(dailyHireApplies("apprentice", true), false);
  assert.equal(dailyHireApplies("trainee", true), false);
  assert.equal(dailyHireApplies("worker", true), true);
});

t("...and it is an ELECTION for a worker, not a default", () => {
  assert.equal(dailyHireApplies("worker", false), false);
});

t("an apprentice keeps the plain rate even with the flag set", () => {
  const r = dailyHireOrdinaryHourly({ weeklyRate: ORD_WEEKLY, engagement: "apprentice", engagedAsDailyHire: true });
  assert.equal(r.applied, false);
  assert.equal(r.ordinaryHourly, Math.round((ORD_WEEKLY / 38) * 100 + 1e-9) / 100);
  assert.ok(textContains(r.reason, "does NOT apply to apprentices"));
});

t("a worker engaged as daily hire gets the factor", () => {
  const plain = dailyHireOrdinaryHourly({ weeklyRate: ORD_WEEKLY, engagement: "worker" });
  const dh = dailyHireOrdinaryHourly({ weeklyRate: ORD_WEEKLY, engagement: "worker", engagedAsDailyHire: true });
  assert.equal(dh.applied, true);
  assert.ok(dh.ordinaryHourly > plain.ordinaryHourly);
  assert.equal(dh.ordinaryHourly,
    Math.round(((ORD_WEEKLY * 52) / 50.4 / 38) * 100 + 1e-9) / 100);
});

t("the weekly rate passed in is the ORDINARY one, allowances included", () => {
  // Base alone vs base + industry allowance must give different answers.
  const bare = dailyHireOrdinaryHourly({ weeklyRate: ORD_WEEKLY, engagement: "worker", engagedAsDailyHire: true });
  const withAllow = dailyHireOrdinaryHourly({ weeklyRate: ORD_WEEKLY + 67.15, engagement: "worker", engagedAsDailyHire: true });
  assert.ok(withAllow.ordinaryHourly > bare.ordinaryHourly);
});

t("every result explains itself with the clause", () => {
  for (const e of ["apprentice", "trainee", "worker"] as const) {
    const r = dailyHireOrdinaryHourly({ weeklyRate: ORD_WEEKLY, engagement: e });
    assert.ok(r.reason.length > 40, `${e} gave no reason`);
  }
  assert.equal(DAILY_HIRE.clause, "19.3(a)");
});
