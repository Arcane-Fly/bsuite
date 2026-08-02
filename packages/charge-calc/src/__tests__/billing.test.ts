import { describe, it, expect } from 'vitest';
import { calculateBillableWeeks } from '../billing.js';
import type { BillableWeeksInput } from '../billing.js';

/** Default input matching standard apprentice leave/training */
const DEFAULT_INPUT: BillableWeeksInput = {
  billingModel: 'Standard',
  annualLeaveDays: 20,
  publicHolidayDays: 10,
  sickLeaveDays: 10,
  trainingWeeks: 5,
  daysPerWeek: 5,
};

describe('calculateBillableWeeks()', () => {
  describe('Standard billing model', () => {
    it('calculates ~39 weeks for default leave/training (20AL, 10PH, 10sick, 5 training, 5dpw)', () => {
      const result = calculateBillableWeeks(DEFAULT_INPUT);
      // 52 - (20/5) - (10/5) - (10/5) - 5 = 52 - 4 - 2 - 2 - 5 = 39
      expect(result).toBeCloseTo(39, 2);
    });

    it('returns fewer billable weeks with more annual leave', () => {
      const input: BillableWeeksInput = {
        ...DEFAULT_INPUT,
        annualLeaveDays: 30, // 6 weeks instead of 4
      };
      const result = calculateBillableWeeks(input);
      // 52 - 6 - 2 - 2 - 5 = 37
      expect(result).toBeCloseTo(37, 2);
    });

    it('returns more billable weeks with fewer sick days', () => {
      const input: BillableWeeksInput = {
        ...DEFAULT_INPUT,
        sickLeaveDays: 5, // 1 week instead of 2
      };
      const result = calculateBillableWeeks(input);
      // 52 - 4 - 2 - 1 - 5 = 40
      expect(result).toBeCloseTo(40, 2);
    });

    it('adjusts correctly for more training weeks', () => {
      const input: BillableWeeksInput = {
        ...DEFAULT_INPUT,
        trainingWeeks: 8,
      };
      const result = calculateBillableWeeks(input);
      // 52 - 4 - 2 - 2 - 8 = 36
      expect(result).toBeCloseTo(36, 2);
    });
  });

  describe('ALEX48 billing model', () => {
    it('always returns 48 regardless of leave inputs', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'ALEX48',
      });
      expect(result).toBe(48);
    });

    it('returns 48 even with extreme leave values', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'ALEX48',
        annualLeaveDays: 40,
        sickLeaveDays: 20,
        trainingWeeks: 10,
      });
      expect(result).toBe(48);
    });
  });

  describe('W52 billing model', () => {
    it('always returns 52 regardless of leave inputs', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'W52',
      });
      expect(result).toBe(52);
    });

    it('returns 52 even with extreme leave values', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'W52',
        annualLeaveDays: 40,
        sickLeaveDays: 20,
        trainingWeeks: 10,
      });
      expect(result).toBe(52);
    });
  });

  describe('Custom billing model', () => {
    it('returns customWeeks when provided', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'Custom',
        customWeeks: 42,
      });
      expect(result).toBe(42);
    });

    it('falls back to Standard calculation when customWeeks is not provided', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'Custom',
      });
      // Should match Standard: 52 - 4 - 2 - 2 - 5 = 39
      expect(result).toBeCloseTo(39, 2);
    });
  });

  describe('part-time workers', () => {
    it('adjusts correctly for 3 days per week', () => {
      const input: BillableWeeksInput = {
        billingModel: 'Standard',
        annualLeaveDays: 12, // 3/5 of 20
        publicHolidayDays: 6, // 3/5 of 10
        sickLeaveDays: 6, // 3/5 of 10
        trainingWeeks: 5,
        daysPerWeek: 3,
      };
      const result = calculateBillableWeeks(input);
      // 52 - (12/3) - (6/3) - (6/3) - 5 = 52 - 4 - 2 - 2 - 5 = 39
      expect(result).toBeCloseTo(39, 2);
    });

    it('adjusts correctly for 4 days per week with standard leave', () => {
      const input: BillableWeeksInput = {
        billingModel: 'Standard',
        annualLeaveDays: 20,
        publicHolidayDays: 10,
        sickLeaveDays: 10,
        trainingWeeks: 5,
        daysPerWeek: 4,
      };
      const result = calculateBillableWeeks(input);
      // 52 - (20/4) - (10/4) - (10/4) - 5 = 52 - 5 - 2.5 - 2.5 - 5 = 37
      expect(result).toBeCloseTo(37, 2);
    });
  });
});
