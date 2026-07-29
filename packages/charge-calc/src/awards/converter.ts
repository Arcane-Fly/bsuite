/**
 * Award-to-CalcConfig Converter
 *
 * Bridges the award engine (AwardSchema from MAPD API) into the
 * calculation engine (CalcConfig -> calculate()). Converts award
 * classifications, penalties, and allowances into the format
 * expected by the core charge rate calculator.
 */
import type {
  AwardSchema,
  AwardPenalty,
  AwardAllowance,
} from './schema';
import type {
  CalcConfig,
  Allowance,
  PenaltyRate,
  AllowanceType,
  PenaltyCategoryType,
} from '../types';

export interface EmployeeAwardContext {
  awardCode: string;
  /** Classification fixed ID to use for base rate lookup */
  classificationFixedId: number;
  /** Which apprentice year this calc is for (1-indexed, for training weeks resolution) */
  currentYear?: number;
  /** Specific allowance IDs to enable. null = all mandatory (all-purpose). */
  enabledAllowanceIds?: number[] | null;
}

export interface CalcOverrides {
  wage?: number;
  billableWeeks?: number;
  marginType?: 'flat' | 'percent';
  marginValue?: number;
  superRate?: number;
  wcRate?: number;
  payrollTaxRate?: number;
  overheadType?: 'flat' | 'percent';
  overheadValue?: number;
  studyCost?: number;
  ppeCost?: number;
}

/**
 * Convert an AwardSchema + context into a CalcConfig ready for calculate().
 * This bridges the award engine into the calculation engine.
 */
export function awardToCalcConfig(
  award: AwardSchema,
  ctx: EmployeeAwardContext,
  overrides?: CalcOverrides,
): CalcConfig {
  // 1. Find the classification by fixedId
  const classification = award.classifications.find(
    (c) => c.classificationFixedId === ctx.classificationFixedId,
  );
  if (!classification) {
    throw new Error(
      `Classification ${ctx.classificationFixedId} not found in award ${award.code}`,
    );
  }

  // 2. Resolve base wage from classification
  const wage =
    overrides?.wage ??
    classification.calculatedHourlyRate ??
    classification.baseRate ??
    0;

  // 3. Convert award penalties to CalcConfig PenaltyRate format
  const penalties = convertPenalties(award.penalties);

  // 4. Convert award allowances to CalcConfig Allowance format
  const allowances = convertAllowances(
    award.wageAllowances,
    ctx.enabledAllowanceIds,
  );

  // 5. Get hours/leave from supplement
  const hours = award.supplement.hoursProvisions;
  const leave = award.supplement.leaveProvisions;

  return {
    wage,
    hoursPerWeek: hours.ordinaryHoursPerWeek,
    hoursPerDay: hours.ordinaryHoursPerDay,
    daysPerWeek: hours.ordinaryDaysPerWeek,
    billableWeeks: overrides?.billableWeeks ?? 39, // fallback only — use calculateBillableWeeks() for leave-adjusted value
    trainingWeeks: 5, // default, overridden by currentYear + trainingWeeksPerYear
    currentYear: ctx.currentYear,
    apprenticeshipYears: 4, // default for standard apprenticeship
    annualLeaveDays: leave.annualLeaveDays,
    publicHolidayDays: 10, // NES standard
    sickLeaveDays: leave.personalLeaveDays,
    leaveLoadingPercent: leave.leaveLoadingPercent,
    superRate: overrides?.superRate ?? 0.12,
    superOnOT: false,
    wcRate: overrides?.wcRate ?? 0.047,
    payrollTaxRate: overrides?.payrollTaxRate ?? 0.0485,
    otOncostFactor: 0.12,
    penaltyOncostAdder: 0.15,
    overheadType: overrides?.overheadType ?? 'percent',
    overheadValue: overrides?.overheadValue ?? 6.5,
    studyCost: overrides?.studyCost ?? 850,
    ppeCost: overrides?.ppeCost ?? 350,
    trainingFeesAnnual: 0,
    marginType: overrides?.marginType ?? 'flat',
    marginValue: overrides?.marginValue ?? 2.10,
    allowances,
    penalties,
    funding: {
      enabled: false,
      milestones: [],
      method: 'reduce',
      passPercentage: 100,
      apprenticeshipYears: 4,
    },
  };
}

/** Convert AwardPenalty[] to CalcConfig PenaltyRate[] */
function convertPenalties(awardPenalties: AwardPenalty[]): PenaltyRate[] {
  return awardPenalties
    .filter((p): p is AwardPenalty & { rate: number } => p.rate !== null)
    .map((p) => ({
      id: `pen_${p.penaltyFixedId}`,
      label: p.description,
      mult: p.rate,
      cat: categorizePenalty(p),
    }));
}

/** Determine if a penalty is overtime or a standard penalty based on description */
function categorizePenalty(p: AwardPenalty): PenaltyCategoryType {
  const desc = p.description.toLowerCase();
  if (
    desc.includes('overtime') ||
    desc.includes('over time') ||
    desc.includes('o/t')
  ) {
    return 'overtime';
  }
  return 'penalty';
}

/** Map MAPD payment_frequency to AllowanceType */
function mapFrequencyToType(freq: string | null): AllowanceType {
  if (!freq) return 'perHour';
  const lower = freq.toLowerCase().trim();
  if (lower.includes('hour')) return 'perHour';
  if (lower.includes('day')) return 'perDay';
  if (lower.includes('week')) return 'perWeek';
  if (isAnnualFrequency(freq)) return 'perWeek';
  return 'perHour';
}

function isAnnualFrequency(freq: string | null): boolean {
  if (!freq) return false;
  const lower = freq.toLowerCase().trim();
  return lower.includes('annum') || lower.includes('year');
}

/**
 * `rate_unit` values where `rate` expresses a PERCENTAGE of some base the
 * allowance applies to (e.g. a percentage of the classification rate) —
 * as distinct from a dollar-denominated `rate` (e.g. `rateUnit: 'per hour'`,
 * the FWC "Tool and employee protection allowance" pattern, where `rate` is
 * a flat cents-per-hour figure standing in for a missing `amount`).
 * Confirmed real MAPD values include the literal `'percent'` (see
 * `crm7/src/pages/payroll/award-rates/allowanceFormat.ts`, which formats
 * this same raw FWC value for display, and `R80.3/src/utils/awardAllowances.ts`
 * / its tests, which already refuse to annualise a `rateUnit: 'percent'`
 * row rather than guess).
 */
function isPercentageRateUnit(rateUnit: string | null): boolean {
  if (!rateUnit) return false;
  const lower = rateUnit.toLowerCase().trim();
  return lower === '%' || lower.includes('percent');
}

/**
 * Resolve an allowance's flat dollar amount (normalising per-annum
 * frequencies to weekly), or `null` when it cannot be safely converted.
 *
 * bsuite#1689: `amount` (dollars) and `rate` (which can be EITHER a
 * dollar-per-unit figure OR a percentage, disambiguated by `rateUnit`) are
 * not interchangeable. The historical `a.amount ?? a.rate ?? 0` chain
 * silently treated every `rate` as dollars, so a genuine percentage
 * allowance (`rateUnit: 'percent'`, `rate: 0.5` meaning 0.5% of a base) was
 * consumed as $0.50 — a fabricated compliance figure amplified ~1.7× by
 * every downstream on-cost (see R80.3#378).
 *
 * This function never fabricates: a percentage-based `rate` has no base to
 * apply against here, so it is refused (`null`) rather than guessed — the
 * same "never fabricate a compliance figure" precedent as
 * `R80.3/src/utils/awardAllowances.ts`'s `annualizeAllowanceAmount()`. A
 * dollar-denominated `rate` (any other `rateUnit`, or `rateUnit: null`) is
 * still accepted as a stand-in for a missing `amount` — that path is
 * correct and regression-locked by the existing "Tool allowance" tests.
 */
function mapAllowanceAmount(a: AwardAllowance): number | null {
  if (a.amount !== null) {
    return isAnnualFrequency(a.paymentFrequency) ? a.amount / 52 : a.amount;
  }
  if (a.rate !== null && !isPercentageRateUnit(a.rateUnit)) {
    return isAnnualFrequency(a.paymentFrequency) ? a.rate / 52 : a.rate;
  }
  // Either no usable value at all, or a percentage rate with no base to
  // convert against — refuse rather than fabricate.
  return null;
}

/**
 * Convert AwardAllowance[] to CalcConfig Allowance[].
 *
 * Allowances that cannot be safely reduced to a flat dollar amount (see
 * `mapAllowanceAmount`) are excluded — silently, at this layer, mirroring
 * the pre-existing "filters out allowances with null amount and null rate"
 * behaviour this function already had. This is a low-level engine boundary
 * with no side channel for surfacing a reason to a user; callers that need
 * a visible "cannot auto-calculate" UI reason (e.g. R80.3's
 * `awardAllowances.ts` bridge) resolve amounts independently via
 * `annualizeAllowanceAmount()` before ever reaching this function.
 */
function convertAllowances(
  awardAllowances: AwardAllowance[],
  enabledIds?: number[] | null,
): Allowance[] {
  return awardAllowances
    .map((a) => ({ source: a, amount: mapAllowanceAmount(a) }))
    .filter(
      (x): x is { source: AwardAllowance; amount: number } => x.amount !== null,
    )
    .map(({ source: a, amount }) => ({
      id: a.fixedId,
      name: a.name,
      type: mapFrequencyToType(a.paymentFrequency),
      amount,
      superApplicable: a.isAllPurpose,
      enabled:
        enabledIds === null
          ? a.isAllPurpose // null = enable all-purpose only
          : enabledIds === undefined
            ? true // undefined = enable all
            : enabledIds.includes(a.fixedId),
    }));
}
