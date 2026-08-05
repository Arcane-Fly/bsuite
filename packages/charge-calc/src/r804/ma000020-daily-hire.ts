/**
 * MA000020 cl.19.3 — DAILY HIRE, and who it does NOT reach.
 *
 * PORTED VERBATIM from R80.4 src/awards/ma000020-daily-hire.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * This is a hard runtime dependency of calculate.ts (the reference engine),
 * not deferred "award-specific data" — calculate() imports
 * dailyHireOrdinaryHourly directly.
 *
 * OPERATOR RULING 2026-08-03: "daily hire does not apply to apprentices or
 * trainees. only workers."
 *
 * This exists because a red-team pass flagged the absent 52/50.4 multiplier as a
 * defect across the board. It is not a defect for the apprentice path — it is a
 * correct exclusion. But R8 also prices ADULT LABOUR HIRE workers, and for them
 * the multiplier is real money, so the rule is recorded rather than dismissed.
 *
 * Writing the exclusion down beats leaving it out: an absence cannot be told
 * apart from an oversight, and the next reviewer flags it again.
 */

import { round2 } from "./round.js";

/**
 * cl.19.3(a): daily hire employees are paid an ordinary hourly rate calculated
 * as the weekly rate x 52 / 50.4 / 38. The 52/50.4 factor compensates for the
 * annual leave and public holidays a daily hire employee does not accrue in the
 * ordinary way.
 */
export const DAILY_HIRE = {
  weeksPerYear: 52,
  divisorWeeks: 50.4,
  ordinaryHours: 38,
  /** = 52 / 50.4 ≈ 1.031746 */
  get factor() { return this.weeksPerYear / this.divisorWeeks; },
  clause: "19.3(a)",
} as const;

export type EngagementClass = "apprentice" | "trainee" | "worker";

/**
 * OPERATOR RULING: daily hire reaches WORKERS only. An apprentice or trainee is
 * engaged under a training contract, is not a daily hire employee, and does not
 * get the multiplier — applying it would over-charge every apprentice placement
 * by ~3.2%.
 */
export function dailyHireApplies(engagement: EngagementClass, engagedAsDailyHire: boolean): boolean {
  if (engagement === "apprentice" || engagement === "trainee") return false;
  return engagedAsDailyHire;
}

export interface DailyHireResult {
  ordinaryHourly: number;
  applied: boolean;
  reason: string;
}

/**
 * The daily-hire ordinary hourly rate, or the unmodified rate where the
 * multiplier does not reach the engagement.
 *
 * `weeklyRate` is the ORDINARY weekly wage — base plus all-purpose allowances —
 * not the base alone, on the same principle as everything else in this engine.
 */
export function dailyHireOrdinaryHourly({
  weeklyRate,
  engagement,
  engagedAsDailyHire = false,
}: {
  weeklyRate: number;
  engagement: EngagementClass;
  engagedAsDailyHire?: boolean;
}): DailyHireResult {
  const plain = round2(weeklyRate / DAILY_HIRE.ordinaryHours);

  if (engagement === "apprentice" || engagement === "trainee") {
    return { ordinaryHourly: plain, applied: false,
      reason: `cl.19.3 daily hire does NOT apply to ${engagement}s — they are engaged under a training contract, not as daily hire. The ordinary hourly rate is the weekly rate / ${DAILY_HIRE.ordinaryHours} with no 52/50.4 factor. Applying it would over-charge by ${round2((DAILY_HIRE.factor - 1) * 100)}%.` };
  }

  if (!engagedAsDailyHire) {
    return { ordinaryHourly: plain, applied: false,
      reason: "Weekly hire — cl.19.3(a) applies only where the employee is engaged as a DAILY HIRE employee. Elect it explicitly; it is not the default." };
  }

  return {
    ordinaryHourly: round2((weeklyRate * DAILY_HIRE.weeksPerYear) / DAILY_HIRE.divisorWeeks / DAILY_HIRE.ordinaryHours),
    applied: true,
    reason: `cl.19.3(a): weekly rate x ${DAILY_HIRE.weeksPerYear}/${DAILY_HIRE.divisorWeeks} / ${DAILY_HIRE.ordinaryHours}. The factor compensates for annual leave and public holidays a daily hire employee does not accrue in the ordinary way.`,
  };
}
