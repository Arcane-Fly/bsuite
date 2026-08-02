import type { BillingModel } from './types.js';

export interface BillableWeeksInput {
  billingModel: BillingModel;
  annualLeaveDays: number;
  publicHolidayDays: number;
  sickLeaveDays: number;
  trainingWeeks: number;
  daysPerWeek: number;
  /** Only used for Custom billing model */
  customWeeks?: number;
}

/**
 * Calculate billable weeks based on billing model and leave/training entitlements.
 *
 * - Standard: 52 minus all leave and training weeks
 * - ALEX48: Fixed 48 weeks (leave absorbed)
 * - W52: Fixed 52 weeks (all-inclusive)
 * - Custom: User-provided value, falls back to Standard calculation
 */
export function calculateBillableWeeks(input: BillableWeeksInput): number {
  switch (input.billingModel) {
    case 'ALEX48':
      return 48;
    case 'W52':
      return 52;
    case 'Custom':
      if (input.customWeeks != null) {
        return input.customWeeks;
      }
      return standardBillableWeeks(input);
    case 'Standard':
    default:
      return standardBillableWeeks(input);
  }
}

function standardBillableWeeks(input: BillableWeeksInput): number {
  const alWeeks = input.annualLeaveDays / input.daysPerWeek;
  const phWeeks = input.publicHolidayDays / input.daysPerWeek;
  const sickWeeks = input.sickLeaveDays / input.daysPerWeek;
  return 52 - alWeeks - phWeeks - sickWeeks - input.trainingWeeks;
}
