import type { MonetaryTerms, RosterScenario } from './types.js';
import { roundMoney } from '../utils.js';

export interface AnnualValueBreakdown {
  basePay: number;
  saturdayPenalty: number;
  sundayPenalty: number;
  publicHolidayPenalty: number;
  overtime15x: number;
  overtime2x: number;
  nightShiftLoading: number;
  afternoonShiftLoading: number;
  casualLoading: number;
  allowances: number;
  leaveLoading: number;
  superannuation: number;
  total: number;
}

/**
 * Compute what an employee receives annually under given monetary terms and roster scenario.
 * This is the employee-side calculation for BOOT comparison (per s.193A).
 *
 * NOT the same as calculate() -- that produces employer cost (charge rate).
 * This produces employee remuneration only.
 *
 * Excludes: Workers comp, overhead, margin (employer costs)
 * Includes: Base pay, penalties, OT, shift loadings, allowances, leave loading, super
 */
export function computeAnnualEmployeeValue(
  terms: MonetaryTerms,
  scenario: RosterScenario,
): AnnualValueBreakdown {
  const base = terms.baseHourlyRate;
  const wb = scenario.weeklyBreakdown;
  const wpy = scenario.weeksPerYear;

  // Base pay for ordinary day hours
  const basePay = base * wb.ordinaryDay * wpy;

  // Penalty components (each is base * multiplier * hours * weeks)
  const satPen = wb.saturdayOrdinary * base * (terms.penaltyRates.saturday ?? 1) * wpy;
  const sunPen = wb.sundayOrdinary * base * (terms.penaltyRates.sunday ?? 1) * wpy;
  const phPen = wb.publicHoliday * base * (terms.penaltyRates.publicHoliday ?? 1) * wpy;
  const ot15 = wb.overtime15x * base * terms.penaltyRates.overtime15x * wpy;
  const ot2 = wb.overtime2x * base * terms.penaltyRates.overtime2x * wpy;
  const nightShift = wb.nightShift * base * (terms.penaltyRates.nightShift ?? 1) * wpy;
  const afterShift = wb.afternoonShift * base * (terms.penaltyRates.afternoonShift ?? 1) * wpy;

  // Casual loading (25% on all casual hours)
  const casualPay = wb.casualLoading * base * terms.casualLoading * wpy;

  // Allowances
  let allowanceTotal = 0;
  for (const a of terms.allowances) {
    switch (a.frequency) {
      case 'perHour':
        allowanceTotal += a.amount * scenario.ordinaryHoursPerWeek * wpy;
        break;
      case 'perDay':
        allowanceTotal += a.amount * 5 * wpy; // assume 5 days
        break;
      case 'perWeek':
        allowanceTotal += a.amount * wpy;
        break;
      case 'perAnnum':
        allowanceTotal += a.amount;
        break;
    }
  }

  // Pre-loading subtotal (for super and leave loading calculation)
  const allOrdinaryEarnings =
    basePay + satPen + sunPen + phPen + nightShift + afterShift + casualPay;

  // Annual leave loading (17.5% on 4 weeks of ordinary earnings)
  const annualLeaveWeeks = terms.annualLeaveDays / 5;
  const weeklyOrdinaryPay = allOrdinaryEarnings / wpy;
  const leaveLoading =
    weeklyOrdinaryPay * annualLeaveWeeks * (terms.leaveLoadingPercent / 100);

  // Superannuation (on OTE -- ordinary time earnings, excludes OT)
  const ote = allOrdinaryEarnings + allowanceTotal + leaveLoading;
  const superAmt = ote * terms.superRate;

  const total =
    allOrdinaryEarnings + ot15 + ot2 + allowanceTotal + leaveLoading + superAmt;

  return {
    basePay: roundMoney(basePay, 2),
    saturdayPenalty: roundMoney(satPen, 2),
    sundayPenalty: roundMoney(sunPen, 2),
    publicHolidayPenalty: roundMoney(phPen, 2),
    overtime15x: roundMoney(ot15, 2),
    overtime2x: roundMoney(ot2, 2),
    nightShiftLoading: roundMoney(nightShift, 2),
    afternoonShiftLoading: roundMoney(afterShift, 2),
    casualLoading: roundMoney(casualPay, 2),
    allowances: roundMoney(allowanceTotal, 2),
    leaveLoading: roundMoney(leaveLoading, 2),
    superannuation: roundMoney(superAmt, 2),
    total: roundMoney(total, 2),
  };
}

/**
 * Compute annual value using a loaded rate (all-inclusive hourly rate).
 * For loaded rate EAs, all penalty/allowance components are "absorbed" into the single rate.
 */
export function computeLoadedRateAnnualValue(
  loadedRate: number,
  scenario: RosterScenario,
  terms: Pick<MonetaryTerms, 'superRate' | 'leaveLoadingPercent' | 'annualLeaveDays'>,
): AnnualValueBreakdown {
  const totalHoursPerWeek =
    scenario.weeklyBreakdown.ordinaryDay +
    scenario.weeklyBreakdown.saturdayOrdinary +
    scenario.weeklyBreakdown.sundayOrdinary +
    scenario.weeklyBreakdown.publicHoliday +
    scenario.weeklyBreakdown.overtime15x +
    scenario.weeklyBreakdown.overtime2x +
    scenario.weeklyBreakdown.nightShift +
    scenario.weeklyBreakdown.afternoonShift;

  const basePay = loadedRate * totalHoursPerWeek * scenario.weeksPerYear;

  const annualLeaveWeeks = terms.annualLeaveDays / 5;
  const weeklyPay = loadedRate * totalHoursPerWeek;
  const leaveLoading =
    weeklyPay * annualLeaveWeeks * (terms.leaveLoadingPercent / 100);

  const ote = basePay + leaveLoading;
  const superAmt = ote * terms.superRate;

  const total = basePay + leaveLoading + superAmt;

  return {
    basePay: roundMoney(basePay, 2),
    saturdayPenalty: 0,
    sundayPenalty: 0,
    publicHolidayPenalty: 0,
    overtime15x: 0,
    overtime2x: 0,
    nightShiftLoading: 0,
    afternoonShiftLoading: 0,
    casualLoading: 0,
    allowances: 0,
    leaveLoading: roundMoney(leaveLoading, 2),
    superannuation: roundMoney(superAmt, 2),
    total: roundMoney(total, 2),
  };
}
