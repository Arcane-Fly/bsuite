import { describe, it, expect } from 'vitest';
import {
  calculate,
  DEFAULT_CONFIG,
  DEFAULT_PENALTIES,
  getSuperRate,
  BILLING_MODEL_WEEKS,
  PAYROLL_TAX_RATES,
  getPayrollTaxRate,
  calculateBillableWeeks,
  DEFAULT_TRAINING_WEEKS_PER_YEAR,
} from '../index';

describe('Integration: full pipeline smoke test', () => {
  it('calculates with DEFAULT_CONFIG', () => {
    const res = calculate(DEFAULT_CONFIG);
    expect(res.quotedChargeRate).toBeGreaterThan(0);
    expect(res.billableHours).toBeGreaterThan(0);
    expect(res.rates['ord']).toBeDefined();
    expect(res.ordinaryRateKey).toBe('ord');
    expect(res.ratesByPayItemGroupId).toEqual({});
  });

  it('all billing models with fixed weeks produce valid results', () => {
    for (const [_model, weeks] of Object.entries(BILLING_MODEL_WEEKS)) {
      if (weeks === null) continue; // Custom has no fixed weeks
      const res = calculate({ ...DEFAULT_CONFIG, billableWeeks: weeks });
      expect(res.quotedChargeRate).toBeGreaterThan(0);
      expect(res.billableHours).toBe(weeks * DEFAULT_CONFIG.hoursPerWeek);
    }
  });

  it('date-aware super returns correct rate for today', () => {
    const rate = getSuperRate();
    expect(rate).toBeGreaterThanOrEqual(0.115);
    expect(rate).toBeLessThanOrEqual(0.15); // Sanity upper bound
  });

  it('calculateBillableWeeks output feeds into calculate()', () => {
    const weeks = calculateBillableWeeks({
      billingModel: 'Standard',
      annualLeaveDays: 20,
      publicHolidayDays: 10,
      sickLeaveDays: 10,
      trainingWeeks: 5,
      daysPerWeek: 5,
    });
    expect(weeks).toBe(39);
    const res = calculate({ ...DEFAULT_CONFIG, billableWeeks: weeks });
    expect(res.quotedChargeRate).toBeGreaterThan(0);
    expect(res.billableHours).toBe(weeks * DEFAULT_CONFIG.hoursPerWeek);
  });

  it('exports all expected symbols', () => {
    expect(calculate).toBeDefined();
    expect(DEFAULT_CONFIG).toBeDefined();
    expect(DEFAULT_PENALTIES).toBeDefined();
    expect(getSuperRate).toBeDefined();
    expect(BILLING_MODEL_WEEKS).toBeDefined();
    expect(PAYROLL_TAX_RATES).toBeDefined();
    expect(getPayrollTaxRate).toBeDefined();
    expect(calculateBillableWeeks).toBeDefined();
    expect(DEFAULT_TRAINING_WEEKS_PER_YEAR).toBeDefined();
  });
});
