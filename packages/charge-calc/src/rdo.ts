/**
 * RDO (Rostered Day Off) accrual — worked-vs-paid hour conversion.
 *
 * Source of truth: docs/references/20260730-rdo-flexibility-v1.00W.md (bsuite parent
 * repo). MA000020 (Building and Construction General On-site Award 2020)
 * cl.16.2: "Ordinary working hours will be 8 hours in duration each day, of
 * which 0.4 of one hour of each day worked will accrue towards an RDO and 7.6
 * hours will be paid." Super and wages are computed on PAID ordinary hours —
 * feeding a worked figure into a paid-hours field over-computes super by
 * roughly the accrual fraction (~5% for the standard 0.4h/8h pattern) and,
 * in the other direction, under-bills the host for attendance.
 *
 * RDOs are NOT universal (cl.16.8 alternate arrangement; many awards never
 * had them; part-time opt-out under cl.16.9(b)). Every helper here treats
 * `RdoAccrualConfig.enabled === false` as a first-class, fully-supported
 * state in which worked hours and paid hours are simply identical — not as
 * an edge case to special-case around.
 */
import type { RdoAccrualConfig } from './types.js';
import { DEFAULT_RDO_CONFIG } from './types.js';

/**
 * Derives WORKED hours/day from PAID hours/day.
 *
 * Under an RDO arrangement, the worker attends for longer than they are paid
 * for that day — the difference accrues to the RDO bank (`accrualHoursPerDay`).
 * When no RDO arrangement applies, worked === paid.
 *
 * @example
 * // MA000020 cl.16.2 standard pattern: 7.6h paid -> 8h worked
 * workedHoursPerDayFromPaid(7.6, { enabled: true, accrualHoursPerDay: 0.4, cycleDays: 19 })
 * // => 8
 */
export function workedHoursPerDayFromPaid(
  paidHoursPerDay: number,
  rdo: RdoAccrualConfig = DEFAULT_RDO_CONFIG,
): number {
  if (!rdo.enabled) return paidHoursPerDay;
  return paidHoursPerDay + rdo.accrualHoursPerDay;
}

/**
 * Derives PAID hours/day from WORKED hours/day.
 *
 * The inverse of `workedHoursPerDayFromPaid()`. When no RDO arrangement
 * applies, worked === paid. Throws if `accrualHoursPerDay` exceeds the
 * worked hours given — that would imply negative paid hours, which is not a
 * legitimate RDO arrangement under any award pattern in the reference doc.
 *
 * @example
 * // MA000020 cl.16.2 standard pattern: 8h worked -> 7.6h paid
 * paidHoursPerDayFromWorked(8, { enabled: true, accrualHoursPerDay: 0.4, cycleDays: 19 })
 * // => 7.6
 */
export function paidHoursPerDayFromWorked(
  workedHoursPerDay: number,
  rdo: RdoAccrualConfig = DEFAULT_RDO_CONFIG,
): number {
  if (!rdo.enabled) return workedHoursPerDay;
  const paid = workedHoursPerDay - rdo.accrualHoursPerDay;
  if (paid < 0) {
    throw new Error(
      `RdoAccrualConfig.accrualHoursPerDay (${rdo.accrualHoursPerDay}) exceeds ` +
        `workedHoursPerDay (${workedHoursPerDay}) — paid hours cannot be negative.`,
    );
  }
  return paid;
}

/** Worked hours/week derived from paid hours/day and a day count. */
export function workedHoursPerWeekFromPaid(
  paidHoursPerDay: number,
  daysPerWeek: number,
  rdo: RdoAccrualConfig = DEFAULT_RDO_CONFIG,
): number {
  return workedHoursPerDayFromPaid(paidHoursPerDay, rdo) * daysPerWeek;
}

/** Paid hours/week derived from worked hours/day and a day count. */
export function paidHoursPerWeekFromWorked(
  workedHoursPerDay: number,
  daysPerWeek: number,
  rdo: RdoAccrualConfig = DEFAULT_RDO_CONFIG,
): number {
  return paidHoursPerDayFromWorked(workedHoursPerDay, rdo) * daysPerWeek;
}

/** Result of accruing RDO hours over a run of ordinary days worked. */
export interface RdoAccrualResult {
  /** Total hours banked toward the RDO account over `daysWorked`. */
  bankedHours: number;
  /** Number of full RDO cycles (`rdo.cycleDays` each) completed. */
  cyclesCompleted: number;
  /**
   * Whether at least one full cycle completed. False for engagements too
   * short to complete a single cycle — MA000020 cl.16.8 lists exactly this
   * ("project duration too short for RDO cycles to complete") as a reason
   * RDOs may be impractical, so a short engagement reporting
   * `cycleCompleted: false` is expected behaviour, not a bug.
   */
  cycleCompleted: boolean;
}

/**
 * Computes RDO accrual over a run of `daysWorked` ordinary days.
 *
 * Hours bank continuously per day worked regardless of cycle boundaries —
 * `bankedHours` is exact for any `daysWorked`, including a partial cycle.
 * `cyclesCompleted`/`cycleCompleted` report progress toward the point at
 * which the bank has accrued a full RDO day, for callers that need to know
 * whether an RDO has actually become available to take.
 *
 * Returns all-zero / not-completed when `rdo.enabled` is false or
 * `daysWorked <= 0` — no arrangement, nothing accrues.
 */
export function deriveRdoAccrual(
  daysWorked: number,
  rdo: RdoAccrualConfig = DEFAULT_RDO_CONFIG,
): RdoAccrualResult {
  if (!rdo.enabled || daysWorked <= 0) {
    return { bankedHours: 0, cyclesCompleted: 0, cycleCompleted: false };
  }
  const bankedHours = daysWorked * rdo.accrualHoursPerDay;
  const cyclesCompleted = Math.floor(daysWorked / rdo.cycleDays);
  return {
    bankedHours,
    cyclesCompleted,
    cycleCompleted: cyclesCompleted >= 1,
  };
}

/**
 * Billable hours for a single RDO day taken.
 *
 * RDOs ARE billable when taken (docs/references/20260730-rdo-flexibility-v1.00W.md):
 * the host is billed for the worker's normal roster, RDO days included, so
 * an RDO day taken bills at the worker's normal WORKED hours for that day —
 * not the (lower) paid figure, and not zero.
 */
export function billableHoursForRdoDayTaken(workedHoursPerDay: number): number {
  return workedHoursPerDay;
}
