import { z } from 'zod';

// ─── Pay item groups ───
export const PayItemCategorySchema = z.enum([
  'ordinary_time',
  'overtime_1_5',
  'overtime_2_0',
  'annual_leave',
  'sick_leave',
  'rdo',
  'public_holiday',
  'shift_allowance',
  'tool_allowance',
  'meal_allowance',
  'salary_sacrifice',
  'child_support',
  'rdo_accrual',
  'back_pay',
  'reimbursement',
  'other',
]);
export type PayItemCategory = z.infer<typeof PayItemCategorySchema>;

export interface PayItemGroupRef {
  /** CRM7-owned pay_item_groups.id UUID. */
  id: string;
  name: string;
  code: string;
  category?: PayItemCategory;
  sortPriority?: number;
}

// ─── Australian States ───
export const AustralianStateSchema = z.enum([
  'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT',
]);
export type AustralianState = z.infer<typeof AustralianStateSchema>;

// ─── Allowances ───
export const AllowanceTypeSchema = z.enum([
  'perHour',
  'perDay',
  'perWeek',
  'percent',
  'perKm',
]);
export type AllowanceType = z.infer<typeof AllowanceTypeSchema>;

export interface Allowance {
  id: string | number;
  name: string;
  type: AllowanceType;
  amount: number;
  /** Whether this allowance attracts superannuation */
  superApplicable: boolean;
  enabled: boolean;
}

// ─── Penalty / OT rates ───
export const PenaltyCategory = {
  Overtime: 'overtime',
  Penalty: 'penalty',
} as const;
export type PenaltyCategoryType =
  (typeof PenaltyCategory)[keyof typeof PenaltyCategory];

export interface PenaltyRate {
  /**
   * Legacy rate key retained for backward compatibility. Prefer
   * payItemGroupId/payItemGroup for Codehouse named pay-item groups.
   */
  id: string;
  label: string;
  /** Multiplier applied to base rate (e.g. 1.5 for time-and-a-half) */
  mult: number;
  cat: PenaltyCategoryType;
  /** CRM7-owned pay_item_groups.id UUID for this rate. */
  payItemGroupId?: string;
  payItemGroup?: PayItemGroupRef;
}

// ─── Billing model ───
export type BillingModel = 'Standard' | 'ALEX48' | 'W52' | 'Custom';
export const BILLING_MODEL_WEEKS: Record<BillingModel, number | null> = {
  Standard: 39,  // fallback only — call calculateBillableWeeks() for leave-adjusted value
  ALEX48: 48,
  W52: 52,
  Custom: null,  // user-provided
};

// ─── Funding ───
export type FundingMethod = 'reduce' | 'passThrough' | 'passPercent';

export interface FundingMilestone {
  id: string | number;
  name: string;
  amount: number;
  month: number;
}

export interface FundingConfig {
  enabled: boolean;
  milestones: FundingMilestone[];
  method: FundingMethod;
  /** Only used when method = 'passPercent' */
  passPercentage: number;
  /** Apprenticeship duration in years (for per-hour spread) */
  apprenticeshipYears: number;
}

// ─── Margin ───
export type MarginType = 'flat' | 'percent';

// ─── Overhead ───
export type OverheadType = 'flat' | 'percent';

// ─── RDO (Rostered Day Off) accrual ───

/**
 * Configuration for an RDO (Rostered Day Off) accrual arrangement.
 *
 * RDOs are NOT universal. MA000020 (Building and Construction General
 * On-site Award 2020) cl.16.2 is the canonical pattern — "Ordinary working
 * hours will be 8 hours in duration each day, of which 0.4 of one hour of
 * each day worked will accrue towards an RDO and 7.6 hours will be paid" —
 * but cl.16.8 permits an employer + majority-of-employees agreement to opt
 * OUT of RDOs entirely (short projects where a 4-week cycle can't complete,
 * remote/FIFO rosters, continuous-coverage requirements), many awards never
 * had RDOs at all, and part-time employees may opt out under cl.16.9(b). A
 * model that assumes RDOs is exactly as wrong as one that ignores them —
 * see docs/references/20260730-rdo-flexibility.md.
 *
 * `enabled: false` (the default via `DEFAULT_RDO_CONFIG`) is a real, common,
 * fully-supported state — not an unfinished one. When disabled, worked hours
 * and paid hours are identical and `src/rdo.ts`'s helpers are no-ops.
 */
export interface RdoAccrualConfig {
  /** Whether an RDO accrual arrangement applies. Default: false (no RDO). */
  enabled: boolean;
  /**
   * Hours accrued toward the RDO bank per ordinary day worked (e.g. 0.4 for
   * the MA000020 cl.16.2 8h-worked/7.6h-paid pattern). Ignored when
   * `enabled` is false.
   */
  accrualHoursPerDay: number;
  /**
   * Number of ordinary days worked in one full RDO cycle before an RDO is
   * taken (MA000020 cl.16: 19 worked days per 4-week/20-day cycle → 1 RDO
   * day off). Default: 19. Short engagements may never complete a cycle —
   * see `deriveRdoAccrual()` in `src/rdo.ts`, which reports this explicitly
   * rather than silently rounding it away.
   */
  cycleDays: number;
}

/**
 * The default RDO posture: no RDO arrangement. Spread this into a config
 * rather than hand-rolling `{ enabled: false, accrualHoursPerDay: 0, cycleDays: 19 }`
 * everywhere, so the "no RDO" default has one canonical source.
 */
export const DEFAULT_RDO_CONFIG: RdoAccrualConfig = {
  enabled: false,
  accrualHoursPerDay: 0,
  cycleDays: 19,
};

// ─── Core Calculation Config ───
export interface CalcConfig {
  // Base wage
  wage: number;

  // Hours & days
  /**
   * PAID hours per week — the wage-bearing figure. `calculate()` multiplies
   * `wage x hoursPerWeek` for weekly pay and divides annual cost by
   * `billableWeeks x hoursPerWeek` (via `hoursPerDay`/`daysPerWeek`) for
   * cost-per-hour, so this MUST be the amount the worker is actually paid
   * for, not the amount they attend for.
   *
   * When an RDO accrual arrangement applies (see `rdo` below), WORKED hours
   * per week are higher than this value (e.g. 40 worked / 38 paid under the
   * MA000020 cl.16.2 pattern). Use `workedHoursPerDayFromPaid()` /
   * `paidHoursPerDayFromWorked()` (`src/rdo.ts`) to convert between the two
   * for timesheet/attendance and host-billing purposes — do not substitute
   * worked hours here, or wage cost and super are overstated by the
   * accrual fraction (~5% for the standard 0.4h/8h pattern).
   */
  hoursPerWeek: number;
  /** PAID hours per day — same worked-vs-paid caveat as `hoursPerWeek`. */
  hoursPerDay: number;
  daysPerWeek: number;

  /**
   * RDO accrual arrangement, if any. Optional and additive — `calculate()`
   * does not yet consume this field itself (bsuite CLAUDE.md §12.2: the
   * charge-calc consumer chain in crm7/R80.3 is a separate follow-up). It
   * exists so callers have one canonical, documented place to carry a
   * worked-vs-paid arrangement through the pipeline instead of inventing
   * their own shape, and so `hoursPerWeek` above can be unambiguously
   * documented as PAID. Defaults to `DEFAULT_RDO_CONFIG` (no RDO) when
   * omitted — see `src/rdo.ts` for the conversion helpers.
   */
  rdo?: RdoAccrualConfig;

  // Billing
  billableWeeks: number;
  trainingWeeks: number;
  /** Per-year training weeks override (e.g. [8, 6, 5, 4] for a 4-year apprenticeship).
   *  When provided with currentYear, overrides trainingWeeks. */
  trainingWeeksPerYear?: number[];
  /** Which apprentice year this calc is for (1-indexed). Used with trainingWeeksPerYear. */
  currentYear?: number;
  apprenticeshipYears: number;

  // Leave (in days)
  annualLeaveDays: number;
  publicHolidayDays: number;
  sickLeaveDays: number;
  leaveLoadingPercent: number;
  /** Casual loading rate as a decimal (e.g. 0.25 for 25%).
   *  Sourced from award/EA/user input — never hardcoded.
   *  When defined, treats this worker as casual: leave entitlements
   *  (annual leave, sick leave, public holidays) are zeroed and the
   *  loading is applied to the hourly wage base instead. */
  casualLoading?: number;
  /**
   * Modern award code (e.g. "MA000020") this `penalties` table was sourced
   * from — required to resolve how a CASUAL's penalty/overtime rows convert
   * (additive percentage points vs multiplicative on the loaded rate; see
   * `awards/casual-penalty-convention.ts`). Only consulted when
   * `casualLoading` is defined. Defaults to "MA000020" when a casual
   * calculation omits it, matching the sector this package was built for
   * (GTO/labour-hire, Building & Construction) — never silently assume a
   * DIFFERENT award's convention applies just because a code was supplied
   * that this module has not verified; see `CasualPenaltyConventionUnmodelled`.
   */
  awardCode?: string;

  // On-costs (as decimals, e.g. 0.12 for 12%)
  superRate: number;
  superOnOT: boolean;
  wcRate: number;
  payrollTaxRate: number;
  /** OT oncost factor (default 0.12) */
  otOncostFactor: number;
  /** Penalty oncost adder per hour (default 0.15) */
  penaltyOncostAdder: number;

  // Overheads
  overheadType: OverheadType;
  overheadValue: number;

  // Fixed annual costs
  studyCost: number;
  ppeCost: number;
  trainingFeesAnnual: number;

  // Margin
  marginType: MarginType;
  marginValue: number;

  // Allowances
  allowances: Allowance[];

  // Penalties & OT
  /** CRM7-owned pay_item_groups.id UUID for ordinary time. */
  ordinaryPayItemGroupId?: string;
  ordinaryPayItemGroup?: PayItemGroupRef;
  penalties: PenaltyRate[];

  /**
   * TAFE/college day cost amortised across net billable hours ($/hr).
   * Applied directly to costPerHour WITHOUT compounding through oncosts
   * (no super, WC, or payroll tax applied on top).
   * Source: awardRulesEngine.resolveRatePackage().tafeDayAmortizationPerHour
   */
  tafeDayAmortizationPerHour?: number;

  // Funding
  funding: FundingConfig;
}

// ─── Per-rate result ───
export interface RateResult {
  charge: number;
  funded: number;
  funding: number;
  /** Canonical pay_item_groups.id when this rate is linked to a named group. */
  payItemGroupId?: string;
  payItemGroup?: PayItemGroupRef;
  /** Legacy key used before named pay-item groups; retained for migration. */
  sourceRateId?: string;
  label?: string;
  category?: PayItemCategory;
}

// ─── Oncost breakdown (per-hour) ───
export interface OncostBreakdown {
  annualLeave: number;
  publicHolidays: number;
  sickLeave: number;
  training: number;
  study: number;
  ppe: number;
  superannuation: number;
  workersComp: number;
  overhead: number;
  payrollTax: number;
  /** TAFE day cost amortised per billable hour (no oncost compounding). */
  tafeAmortization: number;
  total: number;
}

// ─── Full calculation result ───
export interface CalcResult {
  /** Annual training fees included in total cost (amortised into costPerHour). */
  trainingFeesAnnual?: number;
  // Received wage
  receivedWagePerHour: number;
  weeklyPay: number;

  // Annual pay components
  workedPay: number;
  trainingPay: number;
  annualLeavePay: number;
  sickLeavePay: number;
  publicHolidayPay: number;
  totalAnnualPay: number;

  // On-costs
  superAmount: number;
  workersCompAmount: number;
  overheadAmount: number;

  // Totals
  totalAnnualCost: number;

  // Hours
  billableHours: number;
  totalHours: number;
  trainingHours: number;
  nonBillableHours: number;

  // Per-hour
  billedWagePerHour: number;
  billedOncostPerHour: number;
  costPerHour: number;
  marginPerHour: number;
  quotedChargeRate: number;

  // OT base
  otBase1x: number;
  otOncostPerHour: number;
  penaltyOncostPerHour: number;

  // Oncost breakdown
  oncosts: OncostBreakdown;

  // Funding
  fundingPerHour: number;
  fundingTotal: number;
  totalBillableHoursApprentice: number;

  // Week allocation
  annualLeaveWeeks: number;
  publicHolidayWeeks: number;
  sickLeaveWeeks: number;
  impliedBillableWeeks: number;

  // Allowance detail
  allowancePerHour: number;
  allowanceSuperPerHour: number;

  // All rates (ordinary + each penalty/OT)
  rates: Record<string, RateResult>;
  /**
   * Canonical named-group index. Populated only for rates with a
   * payItemGroupId/payItemGroup; legacy rates remain available in `rates`.
   */
  ratesByPayItemGroupId: Record<string, RateResult>;
  ordinaryRateKey: string;
  /**
   * One entry per casual penalty/overtime row that was REFUSED because no
   * verified casual-conversion convention exists for this (awardCode,
   * category) pair — see `CasualPenaltyConventionUnmodelled` in
   * `awards/casual-penalty-convention.ts`. A refused row has NO entry in
   * `rates`/`ratesByPayItemGroupId` — never a wrong, silently-compounded
   * number. Always empty for a non-casual calculation (`casualLoading`
   * undefined) or when every configured penalty row's award/category has
   * been verified.
   */
  casualPenaltyViolations: string[];
}

// ─── Superannuation schedule ───
export interface SuperScheduleEntry {
  effectiveFrom: Date;
  rate: number;
}

export const SUPER_SCHEDULE: SuperScheduleEntry[] = [
  { effectiveFrom: new Date('2024-07-01'), rate: 0.115 },
  { effectiveFrom: new Date('2025-07-01'), rate: 0.12 },
];

/**
 * Returns the correct super rate for a given date.
 * Defaults to latest known rate if date is in the future.
 */
export function getSuperRate(asOf: Date = new Date()): number {
  const sorted = [...SUPER_SCHEDULE].sort(
    (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime(),
  );
  for (const entry of sorted) {
    if (asOf >= entry.effectiveFrom) return entry.rate;
  }
  return sorted[sorted.length - 1].rate;
}
