import { z } from 'zod';

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
  id: string;
  label: string;
  /** Multiplier applied to base rate (e.g. 1.5 for time-and-a-half) */
  mult: number;
  cat: PenaltyCategoryType;
}

// ─── Billing model ───
export type BillingModel = 'Standard' | 'ALEX48' | 'W52';
export const BILLING_MODEL_WEEKS: Record<BillingModel, number> = {
  Standard: 39,
  ALEX48: 48,
  W52: 52,
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
  apprenticeshipYears: number;

  // Leave (in days)
  annualLeaveDays: number;
  publicHolidayDays: number;
  sickLeaveDays: number;
  leaveLoadingPercent: number;

  // On-costs (as decimals, e.g. 0.12 for 12%)
  superRate: number;
  superOnOT: boolean;
  wcRate: number;
  payrollTaxRate: number;

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
  penalties: PenaltyRate[];

  // Funding
  funding: FundingConfig;
}

// ─── Per-rate result ───
export interface RateResult {
  charge: number;
  funded: number;
  funding: number;
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
  total: number;
}

// ─── Full calculation result ───
export interface CalcResult {
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
