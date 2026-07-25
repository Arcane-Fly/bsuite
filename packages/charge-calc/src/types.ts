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

// ─── Core Calculation Config ───
export interface CalcConfig {
  // Base wage
  wage: number;

  // Hours & days
  hoursPerWeek: number;
  hoursPerDay: number;
  daysPerWeek: number;

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
