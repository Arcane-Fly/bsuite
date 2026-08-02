import { describe, expect, it } from 'vitest';
import { calculate } from '../calculate.js';
import type { CalcConfig } from '../types.js';

/** Same shape as calculate.test.ts BASE_CONFIG */
const BASE: CalcConfig = {
  wage: 29.5,
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
  marginValue: 2.1,
  allowances: [],
  penalties: [
    { id: 'ot15', label: 'Time & a Half', mult: 1.5, cat: 'overtime' },
  ],
  funding: {
    enabled: false,
    milestones: [],
    method: 'reduce',
    passPercentage: 100,
    apprenticeshipYears: 4,
  },
};

describe('trainingFeesAnnual in calculate()', () => {
  it('increases costPerHour when trainingFeesAnnual > 0', () => {
    const without = calculate({ ...BASE, trainingFeesAnnual: 0 });
    const withFees = calculate({ ...BASE, trainingFeesAnnual: 500 });
    expect(withFees.costPerHour).toBeGreaterThan(without.costPerHour);
    const bHrs = BASE.billableWeeks * BASE.hoursPerWeek;
    const delta = withFees.costPerHour - without.costPerHour;
    expect(delta).toBeCloseTo(500 / bHrs, 4);
  });
});
