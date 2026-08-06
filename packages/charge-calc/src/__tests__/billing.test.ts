import { describe, it, expect } from 'vitest';
import { calculateBillableWeeks, defaultBillingElections } from '../billing.js';
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
    /* THESE TWO TESTS PINNED THE DEFECT. They asserted "always returns 48
       regardless of leave inputs" and "returns 48 even with extreme leave
       values" — which is exactly what was wrong: the branch discarded every
       input it was handed. A test that asserts a constant cannot notice that the
       constant is only right for one case.

       48 IS right for the default here (20 AL days / 5 dpw = 4 weeks), which is
       why the first of the two passed even after the fix and only the extreme
       one failed. Correct on the happy path, wrong the moment the inputs move. */

    it('is 48 for the full-time 4-week case — the one it was hardcoded for', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'ALEX48',
      });
      // 52 - (20/5) = 48. Only annual leave is excluded; everything else bills.
      expect(result).toBeCloseTo(48, 2);
    });

    it('COMPUTES from the inputs rather than returning a constant', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'ALEX48',
        annualLeaveDays: 40,
        sickLeaveDays: 20,
        trainingWeeks: 10,
      });
      // 52 - (40/5) = 44. Sick leave and training stay billed under ALEX.
      expect(result).toBeCloseTo(44, 2);
      expect(result).not.toBe(48);
    });

    it('a part-timer is not 48 — the case the constant was most wrong for', () => {
      /* 20 AL days over a 3-day week is 6.67 weeks, not 4. The constant said 48
         where 45.33 is correct: 5.9% too many billable hours, which spreads the
         same annual cost thinner and UNDER-RECOVERS on every hour. */
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'ALEX48',
        daysPerWeek: 3,
      });
      expect(result).toBeCloseTo(45.33, 1);
    });

    it('a continuous shiftworker on 5 weeks leave is 47, not 48', () => {
      // cl.31.1(b) gives a continuous shiftworker a fifth week.
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'ALEX48',
        annualLeaveDays: 25,
      });
      expect(result).toBeCloseTo(47, 2);
    });
  });

  describe('elections — the replacement for shipped model names', () => {
    /* Operator ruling 2026-08-06: "just election with option to save presets by
       name. so someone could create an Alex preset. or their own name." A name we
       ship is a name we have to be right about, in a vocabulary that is not ours
       — and a shipped ALEX has to encode what ALEX means, which is how 48 got
       hardcoded in the first place. */

    it('billing every category puts the whole year in the divisor', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        elections: {
          billAnnualLeave: true, billPublicHoliday: true,
          billPersonalLeave: true, billTraining: true,
        },
      });
      expect(result).toBeCloseTo(52, 2);
    });

    it('billing nothing extra bills worked hours only', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        elections: defaultBillingElections(),
      });
      // Identical to Standard — the default is unnamed but unchanged.
      expect(result).toBeCloseTo(39, 2);
    });

    it('each toggle moves the divisor by exactly its own category', () => {
      const base = calculateBillableWeeks({ ...DEFAULT_INPUT, elections: defaultBillingElections() });
      const cases: [keyof ReturnType<typeof defaultBillingElections>, number][] = [
        ['billAnnualLeave', 4],   // 20 days / 5
        ['billPublicHoliday', 2], // 10 days / 5
        ['billPersonalLeave', 2], // 10 days / 5
        ['billTraining', 5],      // 5 weeks
      ];
      for (const [flag, weeks] of cases) {
        const result = calculateBillableWeeks({
          ...DEFAULT_INPUT,
          elections: { ...defaultBillingElections(), [flag]: true },
        });
        expect(result).toBeCloseTo(base + weeks, 2);
      }
    });

    it('elections WIN over a legacy model name', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        billingModel: 'W52',
        elections: defaultBillingElections(),
      });
      expect(result).toBeCloseTo(39, 2);
    });

    it('an explicit customWeeks wins over everything — the operator typed it', () => {
      const result = calculateBillableWeeks({
        ...DEFAULT_INPUT,
        customWeeks: 41,
        elections: { billAnnualLeave: true, billPublicHoliday: true, billPersonalLeave: true, billTraining: true },
      });
      expect(result).toBe(41);
    });

    it('a zero days-per-week returns a real number rather than Infinity', () => {
      /* Dividing by nothing reads downstream as an absurdly low rate, not as an
         error, which is the worst way for this to fail. */
      const result = calculateBillableWeeks({ ...DEFAULT_INPUT, daysPerWeek: 0 });
      expect(Number.isFinite(result)).toBe(true);
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
