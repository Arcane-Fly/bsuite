import { describe, it, expect } from 'vitest';
import { calculate } from '../calculate';
import type { CalcConfig } from '../types';

/**
 * Golden output tests.
 *
 * These values are hand-verified against the charge-calculator.jsx
 * reference implementation (extracted from professional Excel spreadsheets).
 *
 * DO NOT modify these expected values without re-verifying against
 * the gold standard. Wage calculations are legally compliance-critical.
 */
describe('Golden output: Standard GTO scenario', () => {
  const cfg: CalcConfig = {
    wage: 29.50,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 39,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.12,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    otOncostFactor: 0.12,
    penaltyOncostAdder: 0.15,
    overheadType: 'percent',
    overheadValue: 6.5,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'flat',
    marginValue: 2.10,
    allowances: [
      { id: 1, name: 'Site Allowance', type: 'perHour', amount: 2.50, superApplicable: false, enabled: true },
    ],
    penalties: [
      { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
      { id: 'ot20', label: 'Double Time', mult: 2.0, cat: 'overtime' },
      { id: 'ot25', label: 'Double Time & a Half', mult: 2.5, cat: 'overtime' },
      { id: 'ph', label: 'Public Holiday Worked', mult: 2.5, cat: 'penalty' },
      { id: 'night12', label: 'Night Shift (≤4 nights)', mult: 1.2, cat: 'penalty' },
      { id: 'night13', label: 'Night Shift (4+ weeks)', mult: 1.3, cat: 'penalty' },
    ],
    funding: {
      enabled: true,
      milestones: [
        { id: 1, name: '6 Month Commencement', amount: 3500, month: 6 },
        { id: 2, name: 'Halfway', amount: 3000, month: 24 },
        { id: 3, name: 'Completion', amount: 3500, month: 48 },
      ],
      method: 'reduce',
      passPercentage: 100,
      apprenticeshipYears: 4,
    },
  };

  const res = calculate(cfg);

  // Core values
  it('received wage per hour', () => expect(res.receivedWagePerHour).toBeCloseTo(32.00, 2));
  it('weekly pay', () => expect(res.weeklyPay).toBeCloseTo(1216.00, 2));

  // Hours
  it('billable hours', () => expect(res.billableHours).toBe(1482));
  it('total hours', () => expect(res.totalHours).toBe(1976));
  it('training hours', () => expect(res.trainingHours).toBe(190));

  // Cost structure
  it('worked pay', () => expect(res.workedPay).toBeCloseTo(47424, 0));
  it('training pay', () => expect(res.trainingPay).toBeCloseTo(6080, 0));
  it('AL pay (with loading)', () => expect(res.annualLeavePay).toBeCloseTo(5715.20, 0));

  // Final charge rate is in a reasonable range
  it('ordinary charge rate is between $50 and $60/hr', () => {
    expect(res.quotedChargeRate).toBeGreaterThan(50);
    expect(res.quotedChargeRate).toBeLessThan(60);
  });

  // Funding discount
  it('funding per hour ≈ $1.69', () => {
    expect(res.fundingPerHour).toBeCloseTo(10000 / (1482 * 4), 2);
  });

  // OT rates are higher than ordinary
  it('OT 1.5x > ordinary', () => {
    expect(res.rates['ot15'].charge).toBeGreaterThan(res.quotedChargeRate);
  });

  // OT has no funding
  it('OT has zero funding', () => {
    expect(res.rates['ot15'].funding).toBe(0);
    expect(res.rates['ot20'].funding).toBe(0);
  });

  // Penalties have funding
  it('penalty rates include funding discount', () => {
    expect(res.rates['ph'].funding).toBeCloseTo(res.fundingPerHour, 2);
  });
});

describe('Golden output: ALEX 48-week model', () => {
  const cfg48: CalcConfig = {
    wage: 29.50,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 48,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.12,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    otOncostFactor: 0.12,
    penaltyOncostAdder: 0.15,
    overheadType: 'percent',
    overheadValue: 6.5,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'flat',
    marginValue: 2.10,
    allowances: [],
    penalties: [],
    funding: { enabled: false, milestones: [], method: 'reduce', passPercentage: 100, apprenticeshipYears: 4 },
  };

  const res48 = calculate(cfg48);

  it('has more billable hours than Standard', () => {
    expect(res48.billableHours).toBe(48 * 38); // 1824
  });

  it('has lower per-hour charge than 39w', () => {
    const cfg39 = { ...cfg48, billableWeeks: 39 };
    const res39 = calculate(cfg39);
    expect(res48.quotedChargeRate).toBeLessThan(res39.quotedChargeRate);
  });

  it('has same total annual cost as 39w (within 1%)', () => {
    const cfg39 = { ...cfg48, billableWeeks: 39 };
    const res39 = calculate(cfg39);
    // WC is applied to worked + training pay, so different billableWeeks
    // changes the worked pay which changes the WC amount slightly.
    // Use percentage-based comparison rather than exact match.
    const pctDiff = Math.abs(res48.totalAnnualCost - res39.totalAnnualCost) / res39.totalAnnualCost;
    expect(pctDiff).toBeLessThan(0.01);
  });
});

describe('Golden output: No allowances, no funding', () => {
  const bare: CalcConfig = {
    wage: 25.00,
    hoursPerWeek: 38,
    hoursPerDay: 7.6,
    daysPerWeek: 5,
    billableWeeks: 39,
    trainingWeeks: 5,
    apprenticeshipYears: 4,
    annualLeaveDays: 20,
    publicHolidayDays: 10,
    sickLeaveDays: 10,
    leaveLoadingPercent: 17.5,
    superRate: 0.115,
    superOnOT: false,
    wcRate: 0.047,
    payrollTaxRate: 0.0485,
    otOncostFactor: 0.12,
    penaltyOncostAdder: 0.15,
    overheadType: 'flat',
    overheadValue: 2500,
    studyCost: 850,
    ppeCost: 350,
    trainingFeesAnnual: 0,
    marginType: 'percent',
    marginValue: 15,
    allowances: [],
    penalties: [],
    funding: { enabled: false, milestones: [], method: 'reduce', passPercentage: 100, apprenticeshipYears: 4 },
  };

  const res = calculate(bare);

  it('received wage equals base wage (no allowances)', () => {
    expect(res.receivedWagePerHour).toBe(25.00);
  });

  it('no funding discount', () => {
    expect(res.fundingPerHour).toBe(0);
    expect(res.rates['ord'].charge).toBe(res.rates['ord'].funded);
  });

  it('percentage margin applied correctly', () => {
    expect(res.marginPerHour).toBeCloseTo(res.costPerHour * 0.15, 2);
  });

  it('flat overhead passes through as-is', () => {
    expect(res.overheadAmount).toBe(2500);
  });
});
