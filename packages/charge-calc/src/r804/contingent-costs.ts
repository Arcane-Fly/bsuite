/**
 * Costs that are NOT a per-hour on-cost: accident pay, redundancy, and the
 * school-based apprentice variation.
 *
 * PORTED VERBATIM from R80.4 src/awards/contingent-costs.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * The distinction that matters commercially: an on-cost is spread across every
 * billable hour, a CONTINGENT cost is calculated when it becomes applicable and
 * billed then. Loading a contingent cost into the hourly rate over-charges every
 * host who never triggers it, and under-charges the one who does.
 *
 * OPERATOR RULING 2026-08-03 on redundancy: "workers for labour hire full time
 * and part time employed may be entitled. calculated when it comes applicable,
 * billed then." Accident pay is modelled the same way, with an optional
 * provision for GTOs that would rather smooth it.
 *
 * VERIFIED against awards/MA000020.md, FY26/27. RE-VERIFY EVERY 1 JULY.
 */

import { money, round2 } from "./round.js";

/* ── ACCIDENT PAY — cl.27 ─────────────────────────────────────────────────── */

/**
 * cl.2 definition, verbatim in substance: accident pay is "the difference
 * between the amount of workers' compensation received by the employee and
 * their ordinary hourly rate for 38 hours work, and any RDO accrued
 * entitlements". It expressly does NOT include over-award payments, shift rates
 * or overtime.
 *
 * So it is a TOP-UP to the ordinary wage, not a payment in its own right, and
 * the base is the ORDINARY hourly rate — the same base as everything else.
 */
export const ACCIDENT_PAY = {
  /** cl.27.3 — 26 weeks in total per injury, continuous or not. */
  maxWeeks: 26,
  /** cl.2 — the top-up is measured against 38 ordinary hours. */
  ordinaryHours: 38,
  clause: "27",
} as const;

export interface AccidentPayResult {
  weeklyTopUp: number;
  maxLiability: number;
  weeksClaimed: number;
  liability: number;
  entitled: boolean;
  reason: string;
}

/**
 * Weekly accident pay top-up and the total exposure.
 *
 * `workersCompWeekly` is what the scheme actually pays. `reducedDutiesWeekly`
 * is anything paid for work performed on reduced hours or modified duties,
 * which cl.27.8 deducts.
 */
export function accidentPay({
  ordinaryHourlyRate,
  workersCompWeekly,
  weeksClaimed = ACCIDENT_PAY.maxWeeks,
  reducedDutiesWeekly = 0,
  rdoAccruedWeekly = 0,
  claimAccepted = true,
}: {
  ordinaryHourlyRate: number;
  workersCompWeekly: number;
  weeksClaimed?: number;
  reducedDutiesWeekly?: number;
  rdoAccruedWeekly?: number;
  claimAccepted?: boolean;
}): AccidentPayResult {
  const ordinaryWeekly = ordinaryHourlyRate * ACCIDENT_PAY.ordinaryHours + rdoAccruedWeekly;
  const weeks = Math.max(0, Math.min(weeksClaimed, ACCIDENT_PAY.maxWeeks));

  // cl.27.3 — the entitlement is "subject to the relevant workers' compensation
  // claim being accepted". No accepted claim, no accident pay.
  if (!claimAccepted) {
    return { weeklyTopUp: 0, maxLiability: 0, weeksClaimed: weeks, liability: 0, entitled: false,
      reason: "cl.27.3: accident pay is payable only where the workers compensation claim has been ACCEPTED." };
  }

  // cl.27.9 — no entitlement where the statutory payment EXCEEDS what they would
  // have received for ordinary time. The top-up floors at zero, never negative.
  const rawTopUp = ordinaryWeekly - workersCompWeekly - reducedDutiesWeekly;
  const weeklyTopUp = round2(Math.max(0, rawTopUp));

  if (weeklyTopUp === 0) {
    return { weeklyTopUp: 0, maxLiability: 0, weeksClaimed: weeks, liability: 0, entitled: false,
      reason: `cl.27.9: the workers compensation payment (${money(workersCompWeekly)}/wk) already meets or exceeds the ordinary-time amount (${money(ordinaryWeekly)}/wk), so no accident pay is due.` };
  }

  return {
    weeklyTopUp,
    maxLiability: round2(weeklyTopUp * ACCIDENT_PAY.maxWeeks),
    weeksClaimed: weeks,
    liability: round2(weeklyTopUp * weeks),
    entitled: true,
    reason: `Top-up of $${weeklyTopUp}/wk — the gap between workers compensation (${money(workersCompWeekly)}) and ${ACCIDENT_PAY.ordinaryHours} ordinary hours (${money(ordinaryWeekly)}). Capped at ${ACCIDENT_PAY.maxWeeks} weeks per injury (cl.27.3)${reducedDutiesWeekly > 0 ? `, less ${money(reducedDutiesWeekly)} paid for modified duties (cl.27.8)` : ""}.`,
  };
}

/* ── REDUNDANCY — cl.41, industry specific ────────────────────────────────── */

/**
 * cl.41.1 — this scheme REPLACES the NES: "the provisions of Subdivision B —
 * Redundancy pay of Division 11 of the NES do not apply". So do not also apply
 * the NES scale.
 *
 * Each band is a base number of weeks PLUS an accrual per completed week of
 * service beyond the band's start, capped at the next band's base.
 */
export const REDUNDANCY_BANDS = [
  { fromYears: 0, toYears: 1, baseWeeks: 0, hoursPerWeekService: 1.75, capWeeks: Infinity,
    note: "cl.41.3(b): under 12 months, 1.75 hours per week of service." },
  { fromYears: 1, toYears: 2, baseWeeks: 2.4, hoursPerWeekService: 1.75, capWeeks: 4.8 },
  { fromYears: 2, toYears: 3, baseWeeks: 4.8, hoursPerWeekService: 1.6, capWeeks: 7 },
  { fromYears: 3, toYears: 4, baseWeeks: 7, hoursPerWeekService: 0.73, capWeeks: 8 },
  { fromYears: 4, toYears: Infinity, baseWeeks: 8, hoursPerWeekService: 0, capWeeks: 8 },
] as const;

export interface RedundancyResult {
  weeks: number;
  weeksPay: number;
  amount: number;
  offsetApplied: number;
  payable: number;
  band: string;
  reason: string;
}

/**
 * cl.41.3(c): "Week's pay means the ORDINARY HOURLY RATE at the time of
 * termination multiplied by 38. Hour's pay means the ordinary hourly rate."
 *
 * `schemeContributions` is cl.41.4 — an employer may offset in whole or part by
 * contributions to a redundancy pay scheme (Incolink, CBUS and the like). The
 * employee receives only the difference.
 */
export function redundancyPay({
  ordinaryHourlyRate,
  completedWeeksService,
  schemeContributions = 0,
  isCasual = false,
  isApprentice = false,
  continuedAfterApprenticeship = false,
  weeksEmployedAfterCompletion = 0,
  reEngagedWithinSixMonths = false,
}: {
  ordinaryHourlyRate: number;
  completedWeeksService: number;
  schemeContributions?: number;
  isCasual?: boolean;
  isApprentice?: boolean;
  continuedAfterApprenticeship?: boolean;
  /**
   * cl.41.3(e): apprenticeship service accumulates redundancy credits only where
   * the employee completes the apprenticeship AND "remains in employment with
   * that employer for a FURTHER 12 MONTHS". Continuation alone is not enough.
   */
  weeksEmployedAfterCompletion?: number;
  /**
   * cl.14.2(e), second limb: where an apprentice is terminated at the end of the
   * apprenticeship and RE-ENGAGED by the same employer within 6 months, the
   * apprenticeship period counts as service for future termination entitlements.
   */
  reEngagedWithinSixMonths?: boolean;
}): RedundancyResult {
  const weeksPay = round2(ordinaryHourlyRate * 38);
  const nil = (band: string, reason: string): RedundancyResult =>
    ({ weeks: 0, weeksPay, amount: 0, offsetApplied: 0, payable: 0, band, reason });

  // cl.41.3(d): casual service does not accrue.
  if (isCasual) return nil("casual", "cl.41.3(d): service as a casual does not accrue toward redundancy.");

  /* cl.14.2(e): "Redundancy provisions do not apply to apprentices." Two express
     paths bring the apprenticeship period back in as SERVICE, and both have
     conditions that were previously unmodelled — treating mere continuation as
     sufficient over-states the entitlement, and ignoring re-engagement
     under-states it. */
  if (isApprentice) {
    const QUALIFYING_WEEKS = 52;   // cl.41.3(e): "a further 12 months"

    if (!continuedAfterApprenticeship && !reEngagedWithinSixMonths) {
      return nil("apprentice",
        "cl.14.2(e): redundancy provisions do not apply to apprentices, and the apprentice was neither " +
        "retained after completion nor re-engaged within 6 months. Record the service anyway — either " +
        "condition can still be met later.");
    }

    if (continuedAfterApprenticeship && weeksEmployedAfterCompletion < QUALIFYING_WEEKS) {
      return nil("apprentice_within_12_months",
        `cl.41.3(e): apprenticeship service accumulates redundancy credits only where the employee ` +
        `completes the apprenticeship AND "remains in employment with that employer for a further 12 months". ` +
        `Only ${round2(weeksEmployedAfterCompletion)} of the required ${QUALIFYING_WEEKS} weeks have been served, ` +
        `so no entitlement has crystallised yet. It will at ${QUALIFYING_WEEKS} weeks — track it rather than discarding it.`);
    }
  }

  const years = completedWeeksService / 52;
  const band = REDUNDANCY_BANDS.find((b) => years >= b.fromYears && years < b.toYears)
    ?? REDUNDANCY_BANDS[REDUNDANCY_BANDS.length - 1];

  const excessWeeks = Math.max(0, completedWeeksService - band.fromYears * 52);
  const accruedWeeks = (excessWeeks * band.hoursPerWeekService) / 38;   // hours -> weeks
  const weeks = Math.min(band.baseWeeks + accruedWeeks, band.capWeeks);

  const amount = round2(weeks * weeksPay);
  const offsetApplied = round2(Math.min(schemeContributions, amount));
  const label = band.toYears === Infinity ? "4 years or more" : `${band.fromYears}–${band.toYears} years`;

  return {
    weeks: round2(weeks), weeksPay, amount, offsetApplied,
    payable: round2(amount - offsetApplied),
    band: label,
    reason: `${label}: ${round2(weeks)} weeks' pay at $${weeksPay}/wk (ordinary hourly rate x 38, cl.41.3(c)) = $${amount}` +
      (offsetApplied > 0 ? `, less $${offsetApplied} of redundancy-scheme contributions (cl.41.4) = ${money(amount - offsetApplied)}.` : ".") +
      " cl.41.1: this industry scheme REPLACES the NES redundancy provisions — do not apply both.",
  };
}

/* ── SCHOOL-BASED APPRENTICES — Schedule C ────────────────────────────────── */

export const SCHOOL_BASED = {
  /** C.4 — paid training time is 25% of the actual hours worked on-the-job. */
  paidTrainingProportion: 0.25,
  /**
   * C.8 — "progress through the relevant wage scale at the rate of 12 months
   * progression for each 2 years of employment". Half the pace of a full-time
   * apprentice, so a school-based apprentice sits on a LOWER percentage for
   * twice as long. This is the single largest costing difference.
   */
  progressionYearsPerStage: 2,
  /** C.7 — the apprenticeship must not exceed 6 years. */
  maxDurationYears: 6,
  /** C.11 — entitled PRO RATA to all other award conditions. */
  proRataOtherConditions: true,
  schedule: "C",
} as const;

/**
 * Wage stage for a school-based apprentice at a given point in the contract.
 *
 * C.3 applies the ordinary full-time apprentice minimum wages "calculated
 * hourly", and C.8 halves the progression. So the RATE table is the same one —
 * what changes is WHICH stage they are on.
 */
export function schoolBasedStage(yearsEmployed: number, nominalTermYears = 4): number {
  const stage = Math.floor(yearsEmployed / SCHOOL_BASED.progressionYearsPerStage) + 1;
  return Math.min(Math.max(stage, 1), nominalTermYears);
}

/** Paid off-the-job training hours for a school-based apprentice (C.4). */
export function schoolBasedPaidTrainingHours(hoursWorkedOnJob: number): number {
  return round2(hoursWorkedOnJob * SCHOOL_BASED.paidTrainingProportion);
}

/**
 * The comparison that matters when quoting a school-based apprentice: at the
 * same elapsed time they are on a LOWER wage stage than a full-time apprentice.
 */
export function schoolBasedVsFullTime(yearsEmployed: number, nominalTermYears = 4) {
  const sb = schoolBasedStage(yearsEmployed, nominalTermYears);
  const ft = Math.min(Math.floor(yearsEmployed) + 1, nominalTermYears);
  return {
    yearsEmployed, schoolBasedStage: sb, fullTimeStage: ft, stagesBehind: ft - sb,
    note: sb < ft
      ? `At ${yearsEmployed} years a school-based apprentice is on stage ${sb} where a full-time apprentice is on stage ${ft} (Schedule C.8: 12 months' progression per 2 years). Quoting them at the full-time stage over-states the wage.`
      : `At ${yearsEmployed} years both are on stage ${sb}.`,
  };
}


/* ── CASUAL — cl.12 ───────────────────────────────────────────────────────── */

/**
 * cl.12.4: "A casual employee must be paid a casual loading of 25% for ordinary
 * hours... The casual loading is paid as compensation for annual leave,
 * personal/carer's leave, community service leave, notice of termination and
 * redundancy benefits AND PUBLIC HOLIDAYS NOT WORKED."
 *
 * That list is why the loading cannot simply be added on top of a permanent cost
 * model: everything it compensates for must come OUT, or the host is charged
 * twice for the same entitlements.
 *
 * AWARD-SPECIFIC. DO NOT REUSE THIS RULE FOR ANOTHER AWARD.
 * MA000020 cl.12.5/12.6 state the additive figures expressly, and this award has
 * NO penalty data on the FWC API, so the rule has to live in code. MA000025 is
 * different in the same breath: its API cohorts give a casual public holiday at
 * 312.5% (250 x 1.25, MULTIPLICATIVE) while its afternoon/night shift is 140%
 * (115 + 25, ADDITIVE). Neither convention generalises — not across awards, and
 * not even across penalty types within one award. Where an award publishes
 * casual cohorts, ingest them (mapd-penalties.ts) instead of computing.
 * See precedent__bsuite__20260803__casual_loading_never_computed.
 *
 * THE PART THAT IS EASY TO GET WRONG — cl.12.5/12.6 make the casual penalty
 * rates ADDITIVE, not multiplicative. Where the standard rate is 150% the casual
 * gets 175%, not 150% x 1.25 = 187.5%. Where it is 200% the casual gets 225%.
 * A public holiday is 275%, not 250% x 1.25 = 312.5%. The loading adds 25
 * PERCENTAGE POINTS to the penalty; it does not compound with it.
 *
 * APPRENTICES AND TRAINEES CANNOT BE CASUAL.
 *
 * Clause numbers corrected 2026-08-03: the loading is cl.12.4 (was cited 12.3)
 * and the 4-hour minimum is cl.12.3 (was cited 12.2). Zero dollars, but a wrong
 * citation poisons the audit trail, which is the thing a host or the FWO checks.
 */
export const CASUAL = {
  loading: 0.25,
  loadingClause: "12.4",
  minimumEngagementHours: 4,
  minimumEngagementClause: "12.3",
  /** cl.12.5/12.6 — ADDITIVE, in percentage points. */
  penaltyPointsAdded: 0.25,
  publicHolidayMultiplier: 2.75,
  publicHolidayClause: "12.6",
  /** cl.12.1 + cl.12.4 — what the loading is compensation FOR. Do not also cost these. */
  compensatesFor: [
    "annual_leave", "personal_carers_leave", "community_service_leave",
    "notice_of_termination", "redundancy", "public_holidays_not_worked",
  ] as const,
  /** cl.41.3(d): casual service does not accrue toward redundancy. */
  accruesRedundancy: false,
  clause: "12",
} as const;

export function casualOrdinaryRate(ordinaryHourlyRate: number): {
  rate: number; loading: number; reason: string;
} {
  const rate = round2(ordinaryHourlyRate * (1 + CASUAL.loading));
  return {
    rate, loading: round2(ordinaryHourlyRate * CASUAL.loading),
    reason:
      `cl.12.4: ${money(ordinaryHourlyRate)}/hr + 25% casual loading = $${rate}/hr. The loading is ` +
      `COMPENSATION FOR annual leave, personal/carer's leave, community service leave, notice of ` +
      `termination, redundancy and public holidays not worked — those must NOT also be costed as ` +
      `on-costs, or the host is charged twice for the same entitlements. ` +
      `cl.12.3: minimum ${CASUAL.minimumEngagementHours} hour engagement, plus fares and travel on ` +
      `each occasion. Apprentices and trainees cannot be engaged as casuals.`,
  };
}

/**
 * The casual multiplier for a penalty whose standard multiplier is `standard`.
 *
 * cl.12.5: 150% -> 175%, 200% -> 225%. cl.12.6: a public holiday is 275%.
 * Everything else takes the loading as 25 additional percentage points.
 */
export function casualPenaltyMultiplier(standard: number, isPublicHoliday = false): {
  multiplier: number; reason: string;
} {
  if (isPublicHoliday) {
    return { multiplier: CASUAL.publicHolidayMultiplier,
      reason: `cl.12.6: a casual working a public holiday is paid 275% of the ordinary hourly rate — NOT 250% x 1.25 (312.5%). The loading is additive.` };
  }
  const m = round2(standard + CASUAL.penaltyPointsAdded);
  return { multiplier: m,
    reason: `cl.12.5: where the standard penalty is ${round2(standard * 100)}%, a casual is paid ${round2(m * 100)}% of the ordinary hourly rate. The 25% loading is added as PERCENTAGE POINTS, not compounded — ${round2(standard * 100)}% x 1.25 would be ${round2(standard * 125)}%, which the award does not provide.` };
}

/** cl.12.1: what a casual is NOT entitled to, so it is never double-costed. */
export function casualExcludedOnCosts(): readonly string[] {
  return CASUAL.compensatesFor;
}
