import type { BillingModel } from './types.js';

/**
 * WHAT IS BILLED, AND WHAT IS ROLLED INTO THE ON-COSTS OF WHAT IS BILLED.
 *
 * Operator ruling, 2026-08-06, relayed from the R80.4 lane and marked immediate:
 *
 *   "all variations of what is billed vs rolled into oncosts should be elective
 *    by toggles or checkboxs ... consider them presets rather than in need of
 *    there own thing."
 *
 *   "TBH the Standard, ALEX and 52w might be confusing, just election with
 *    option to save presets by name. so someone could create an Alex preset. or
 *    their own name."
 *
 * ── THE DEFECT THIS REPLACES, and it was live in 0.11.0 ───────────────────
 *
 * `case 'ALEX48': return 48` — a CONSTANT. This function is handed
 * annualLeaveDays, daysPerWeek, publicHolidayDays, sickLeaveDays and
 * trainingWeeks, and that branch discarded every one of them. The identifier
 * baked the number in, so the model could not be renamed without renaming the
 * figure.
 *
 * 48 is correct for exactly one case: full-time, five days a week, four weeks of
 * annual leave. Measured against the correct 52 - (annualLeaveDays /
 * daysPerWeek):
 *
 *   full-time, 4 weeks leave          48.00w   ALEX48 said 48    0.0% out
 *   continuous shiftworker, 5 weeks   47.00w   ALEX48 said 48    2.1% out
 *   part-time 4 days/week             47.00w   ALEX48 said 48    2.1% out
 *   part-time 3 days/week             45.33w   ALEX48 said 48    5.9% out
 *
 * And it erred in the expensive direction. Too many billable hours spreads the
 * same annual cost thinner, so the hourly rate comes out LOW — then the GTO
 * bills fewer weeks than the divisor assumed and UNDER-RECOVERS. A part-time
 * apprentice on three days was 5.9% light on every hour, silently.
 *
 * Nothing caught it because 48 is right for the default full-time case, which is
 * what every fixture used. Correct on the happy path, wrong the moment the inputs
 * move, and plausible either way.
 *
 * ── THE CONSERVATION RULE ─────────────────────────────────────────────────
 *
 * A category is EITHER billed OR recovered through on-costs. Never both, never
 * neither. Billed: the hours stay in the divisor and the host pays the charge
 * rate for them, so the category contributes NO on-cost line. Not billed: the
 * hours leave the divisor and the cost spreads over what remains.
 *
 * Bill the hours AND charge the on-cost and the host pays twice; do neither and
 * the GTO absorbs it silently. This module owns the DIVISOR half only — the
 * on-cost half belongs to the caller, and it is stated here so it cannot be
 * forgotten on the way past.
 *
 * ── TWO THINGS THAT ARE NOT ELECTIONS ─────────────────────────────────────
 *
 * ANNUAL LEAVE LOADING is recovered through on-costs under every arrangement,
 * including all-billed. Billing is done in HOURS: billing a leave hour recovers
 * the ordinary rate for that hour, and the 17.5% is paid ON TOP with no billable
 * quantity of its own to attach to.
 *
 * PUBLIC HOLIDAY WORKED is not public holiday TAKEN. Worked is an hour on site
 * and bills at its penalty rate whatever the toggles say. The election below
 * governs the day TAKEN, which behaves like annual leave.
 */

/** One flag per category that can be billed rather than costed. */
export interface BillingElections {
  billAnnualLeave: boolean;
  /** Public holiday TAKEN. A public holiday WORKED is always billable. */
  billPublicHoliday: boolean;
  billPersonalLeave: boolean;
  /** Off-the-job training attendance. */
  billTraining: boolean;
}

/**
 * The starting position: worked hours on site billed, everything else recovered
 * through the on-costs of those hours.
 *
 * Deliberately unnamed. It is the most conservative arrangement — it bills the
 * host for the least and recovers the most through the rate — and it is what
 * Standard already did, so an existing caller is unaffected. An operator who
 * calls it "Standard" can save it under that name; nothing here ships one.
 */
export function defaultBillingElections(): BillingElections {
  return {
    billAnnualLeave: false,
    billPublicHoliday: false,
    billPersonalLeave: false,
    billTraining: false,
  };
}

export interface BillableWeeksInput {
  annualLeaveDays: number;
  publicHolidayDays: number;
  sickLeaveDays: number;
  trainingWeeks: number;
  daysPerWeek: number;
  /** Omit for the default arrangement — worked hours only. */
  elections?: BillingElections;
  /**
   * An explicit weeks figure from the operator. Wins over everything else,
   * because a number they typed is a decision they made.
   */
  customWeeks?: number;
  /**
   * @deprecated Pass `elections`. Mapped for compatibility while call sites
   * migrate; removed at 1.0.0. 'ALEX48' no longer returns a constant.
   */
  billingModel?: BillingModel;
}

/** Billable weeks: 52 less every category that is NOT billed. */
export function calculateBillableWeeks(input: BillableWeeksInput): number {
  if (input.customWeeks != null) return input.customWeeks;

  const e = input.elections ?? electionsForLegacyModel(input.billingModel);
  /* A zero days-per-week would divide by nothing and return Infinity, which
     reads downstream as an absurdly low rate rather than as an error. */
  const perWeek = (days: number) => (input.daysPerWeek > 0 ? days / input.daysPerWeek : 0);

  return 52
    - (e.billAnnualLeave ? 0 : perWeek(input.annualLeaveDays))
    - (e.billPublicHoliday ? 0 : perWeek(input.publicHolidayDays))
    - (e.billPersonalLeave ? 0 : perWeek(input.sickLeaveDays))
    - (e.billTraining ? 0 : input.trainingWeeks);
}

/**
 * Map a legacy model name onto elections.
 *
 * @deprecated The names are the operator's to choose, not ours to ship. This
 * exists so 0.11.x call sites keep compiling while they migrate to `elections`,
 * and it is removed at 1.0.0.
 *
 * ALEX48 maps to "annual leave excluded and nothing else" and is now COMPUTED
 * from the inputs — the name survives the transition, the constant does not.
 */
export function electionsForLegacyModel(model?: BillingModel): BillingElections {
  switch (model) {
    case 'W52':
      return {
        billAnnualLeave: true,
        billPublicHoliday: true,
        billPersonalLeave: true,
        billTraining: true,
      };
    case 'ALEX48':
      return {
        billAnnualLeave: false,
        billPublicHoliday: true,
        billPersonalLeave: true,
        billTraining: true,
      };
    case 'Custom':
    case 'Standard':
    default:
      return defaultBillingElections();
  }
}
