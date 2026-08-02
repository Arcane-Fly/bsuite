import { describe, it, expect } from 'vitest';
import {
  computeAnnualEmployeeValue,
  computeLoadedRateAnnualValue,
  type AnnualValueBreakdown,
} from '../../boot/annual-value.js';
import type { MonetaryTerms, RosterScenario } from '../../boot/types.js';

// ─── Helper: create MonetaryTerms with sensible defaults ───
function makeTerms(overrides: Partial<MonetaryTerms> = {}): MonetaryTerms {
  return {
    baseHourlyRate: 29.5,
    casualLoading: 0.25,
    penaltyRates: {
      saturday: null,
      sunday: null,
      publicHoliday: null,
      overtime15x: 1.5,
      overtime2x: 2.0,
      nightShift: null,
      afternoonShift: null,
    },
    allowances: [],
    superRate: 0.12,
    leaveLoadingPercent: 17.5,
    annualLeaveDays: 20,
    personalLeaveDays: 10,
    redundancyWeeks: null,
    ...overrides,
  };
}

// ─── Helper: create RosterScenario with sensible defaults ───
function makeScenario(overrides: Partial<RosterScenario> = {}): RosterScenario {
  return {
    scenarioType: 'typical',
    label: 'Test scenario',
    employmentType: 'fullTime',
    ordinaryHoursPerWeek: 38,
    weeklyBreakdown: {
      ordinaryDay: 38,
      saturdayOrdinary: 0,
      sundayOrdinary: 0,
      publicHoliday: 0,
      overtime15x: 0,
      overtime2x: 0,
      nightShift: 0,
      afternoonShift: 0,
      casualLoading: 0,
    },
    weeksPerYear: 48,
    ...overrides,
  };
}

// ─── computeAnnualEmployeeValue ───
describe('computeAnnualEmployeeValue', () => {
  describe('Ordinary-only scenario (Building Award Year 2, $29.50/hr)', () => {
    // Hand calculation:
    // basePay = 29.50 * 38 * 48 = 53,808.00
    // allOrdinaryEarnings = 53,808.00
    // weeklyOrdinaryPay = 53,808 / 48 = 1,121.00
    // leaveLoading = 1,121 * 4 * 0.175 = 784.70
    // OTE = 53,808 + 0 (allowances) + 784.70 = 54,592.70
    // super = 54,592.70 * 0.12 = 6,551.124 -> 6,551.12
    // total = 53,808 + 784.70 + 6,551.124 = 61,143.824 -> 61,143.82

    let result: AnnualValueBreakdown;

    it('computes correctly', () => {
      const terms = makeTerms({ baseHourlyRate: 29.50 });
      const scenario = makeScenario();
      result = computeAnnualEmployeeValue(terms, scenario);
    });

    it('basePay = 29.50 * 38 * 48 = 53,808.00', () => {
      expect(result.basePay).toBe(53808.00);
    });

    it('all penalty components are zero', () => {
      expect(result.saturdayPenalty).toBe(0);
      expect(result.sundayPenalty).toBe(0);
      expect(result.publicHolidayPenalty).toBe(0);
      expect(result.overtime15x).toBe(0);
      expect(result.overtime2x).toBe(0);
      expect(result.nightShiftLoading).toBe(0);
      expect(result.afternoonShiftLoading).toBe(0);
      expect(result.casualLoading).toBe(0);
      expect(result.allowances).toBe(0);
    });

    it('leaveLoading = (53808/48) * 4 * 0.175 = 784.70', () => {
      expect(result.leaveLoading).toBe(784.70);
    });

    it('super = (53808 + 784.70) * 0.12 = 6,551.12', () => {
      expect(result.superannuation).toBe(6551.12);
    });

    it('total = 53808 + 784.70 + 6551.12 = 61,143.82', () => {
      expect(result.total).toBe(61143.82);
    });
  });

  describe('Saturday penalty scenario (1.5x, 4hrs/wk)', () => {
    // basePay = 29.50 * 38 * 48 = 53,808.00
    // satPen = 29.50 * 1.5 * 4 * 48 = 8,496.00
    // allOrdinaryEarnings = 53,808 + 8,496 = 62,304.00
    // weeklyOrdinary = 62,304 / 48 = 1,298.00
    // leaveLoading = 1,298 * 4 * 0.175 = 908.60
    // OTE = 62,304 + 0 + 908.60 = 63,212.60
    // super = 63,212.60 * 0.12 = 7,585.512 -> 7,585.51
    // total = 62,304 + 908.60 + 7,585.512 = 70,798.112 -> 70,798.11

    let result: AnnualValueBreakdown;

    it('computes correctly with Saturday penalty', () => {
      const terms = makeTerms({
        baseHourlyRate: 29.50,
        penaltyRates: {
          saturday: 1.5,
          sunday: null,
          publicHoliday: null,
          overtime15x: 1.5,
          overtime2x: 2.0,
          nightShift: null,
          afternoonShift: null,
        },
      });
      const scenario = makeScenario({
        weeklyBreakdown: {
          ordinaryDay: 38,
          saturdayOrdinary: 4,
          sundayOrdinary: 0,
          publicHoliday: 0,
          overtime15x: 0,
          overtime2x: 0,
          nightShift: 0,
          afternoonShift: 0,
          casualLoading: 0,
        },
      });
      result = computeAnnualEmployeeValue(terms, scenario);
    });

    it('basePay = 29.50 * 38 * 48 = 53,808.00', () => {
      expect(result.basePay).toBe(53808.00);
    });

    it('saturdayPenalty = 29.50 * 1.5 * 4 * 48 = 8,496.00', () => {
      expect(result.saturdayPenalty).toBe(8496.00);
    });

    it('leaveLoading = (62304/48) * 4 * 0.175 = 908.60', () => {
      expect(result.leaveLoading).toBe(908.60);
    });

    it('super on OTE = (62304 + 908.60) * 0.12 = 7,585.51', () => {
      expect(result.superannuation).toBe(7585.51);
    });

    it('total = 62304 + 908.60 + 7585.51 = 70,798.11', () => {
      expect(result.total).toBe(70798.11);
    });
  });

  describe('Overtime excluded from OTE', () => {
    // basePay = 29.50 * 38 * 48 = 53,808.00
    // ot15 = 29.50 * 1.5 * 4 * 48 = 8,496.00
    // allOrdinaryEarnings = 53,808 (OT not included)
    // leaveLoading = (53,808/48) * 4 * 0.175 = 784.70
    // OTE = 53,808 + 784.70 = 54,592.70
    // super = 54,592.70 * 0.12 = 6,551.124 -> 6,551.12
    // total = 53,808 + 8,496 + 784.70 + 6,551.12 = 69,639.82
    // Key: OT is in total but NOT in OTE for super calculation

    let result: AnnualValueBreakdown;

    it('computes correctly with overtime', () => {
      const terms = makeTerms({ baseHourlyRate: 29.50 });
      const scenario = makeScenario({
        weeklyBreakdown: {
          ordinaryDay: 38,
          saturdayOrdinary: 0,
          sundayOrdinary: 0,
          publicHoliday: 0,
          overtime15x: 4,
          overtime2x: 0,
          nightShift: 0,
          afternoonShift: 0,
          casualLoading: 0,
        },
      });
      result = computeAnnualEmployeeValue(terms, scenario);
    });

    it('overtime15x = 29.50 * 1.5 * 4 * 48 = 8,496.00', () => {
      expect(result.overtime15x).toBe(8496.00);
    });

    it('super is calculated on OTE (excludes OT)', () => {
      // Super should be same as ordinary-only scenario
      expect(result.superannuation).toBe(6551.12);
    });

    it('total includes OT but super does not', () => {
      // total = 53,808 + 8,496 + 784.70 + 6,551.12 = 69,639.82
      expect(result.total).toBe(69639.82);
    });
  });

  describe('Casual scenario with 25% loading', () => {
    // base = 25.00, ordinaryDay = 20, casualLoading = 20, 48 weeks
    // basePay = 25 * 20 * 48 = 24,000
    // casualPay = 20 * 25 * 0.25 * 48 = 6,000
    // allOrdinaryEarnings = 24,000 + 6,000 = 30,000
    // weeklyOrdinary = 30,000 / 48 = 625
    // leaveLoading = 625 * 4 * 0.175 = 437.50
    // OTE = 30,000 + 437.50 = 30,437.50
    // super = 30,437.50 * 0.12 = 3,652.50
    // total = 30,000 + 437.50 + 3,652.50 = 34,090.00

    let result: AnnualValueBreakdown;

    it('computes correctly for casual', () => {
      const terms = makeTerms({ baseHourlyRate: 25.00 });
      const scenario = makeScenario({
        employmentType: 'casual',
        ordinaryHoursPerWeek: 20,
        weeklyBreakdown: {
          ordinaryDay: 20,
          saturdayOrdinary: 0,
          sundayOrdinary: 0,
          publicHoliday: 0,
          overtime15x: 0,
          overtime2x: 0,
          nightShift: 0,
          afternoonShift: 0,
          casualLoading: 20,
        },
      });
      result = computeAnnualEmployeeValue(terms, scenario);
    });

    it('basePay = 25 * 20 * 48 = 24,000', () => {
      expect(result.basePay).toBe(24000.00);
    });

    it('casualLoading = 20 * 25 * 0.25 * 48 = 6,000', () => {
      expect(result.casualLoading).toBe(6000.00);
    });

    it('leaveLoading = (30000/48) * 4 * 0.175 = 437.50', () => {
      expect(result.leaveLoading).toBe(437.50);
    });

    it('super = (30000 + 437.50) * 0.12 = 3,652.50', () => {
      expect(result.superannuation).toBe(3652.50);
    });

    it('total = 30000 + 437.50 + 3652.50 = 34,090.00', () => {
      expect(result.total).toBe(34090.00);
    });
  });

  describe('Allowance calculations', () => {
    // base = 30.00, ordinaryDay = 38, 48 weeks
    // perHour: $1.50/hr * 38hrs * 48wks = 2,736.00
    // perWeek: $20/wk * 48wks = 960.00
    // perAnnum: $500.00
    // totalAllowances = 2,736 + 960 + 500 = 4,196.00
    // basePay = 30 * 38 * 48 = 54,720.00
    // allOrdinaryEarnings = 54,720.00
    // weeklyOrdinary = 54,720 / 48 = 1,140.00
    // leaveLoading = 1,140 * 4 * 0.175 = 798.00
    // OTE = 54,720 + 4,196 + 798 = 59,714.00
    // super = 59,714 * 0.12 = 7,165.68
    // total = 54,720 + 4,196 + 798 + 7,165.68 = 66,879.68

    let result: AnnualValueBreakdown;

    it('computes correctly with multiple allowance types', () => {
      const terms = makeTerms({
        baseHourlyRate: 30.00,
        allowances: [
          { name: 'Tool', amount: 1.50, frequency: 'perHour', isAllPurpose: true },
          { name: 'Laundry', amount: 20.00, frequency: 'perWeek', isAllPurpose: false },
          { name: 'First Aid', amount: 500.00, frequency: 'perAnnum', isAllPurpose: false },
        ],
      });
      const scenario = makeScenario({ ordinaryHoursPerWeek: 38 });
      result = computeAnnualEmployeeValue(terms, scenario);
    });

    it('basePay = 30 * 38 * 48 = 54,720.00', () => {
      expect(result.basePay).toBe(54720.00);
    });

    it('allowances = 2736 + 960 + 500 = 4,196.00', () => {
      expect(result.allowances).toBe(4196.00);
    });

    it('leaveLoading = (54720/48) * 4 * 0.175 = 798.00', () => {
      expect(result.leaveLoading).toBe(798.00);
    });

    it('super includes allowances in OTE', () => {
      // OTE = 54720 + 4196 + 798 = 59,714
      // super = 59714 * 0.12 = 7,165.68
      expect(result.superannuation).toBe(7165.68);
    });

    it('total = 54720 + 4196 + 798 + 7165.68 = 66,879.68', () => {
      expect(result.total).toBe(66879.68);
    });
  });

  describe('perDay allowance calculation', () => {
    // base = 30, ordinaryDay = 38, 48 weeks
    // perDay: $10/day * 5 days * 48 weeks = 2,400
    // basePay = 30 * 38 * 48 = 54,720
    // allOrdinaryEarnings = 54,720
    // weeklyOrdinary = 54,720 / 48 = 1,140
    // leaveLoading = 1,140 * 4 * 0.175 = 798
    // OTE = 54,720 + 2,400 + 798 = 57,918
    // super = 57,918 * 0.12 = 6,950.16
    // total = 54,720 + 2,400 + 798 + 6,950.16 = 64,868.16

    it('computes perDay allowance as amount * 5 * weeksPerYear', () => {
      const terms = makeTerms({
        baseHourlyRate: 30.00,
        allowances: [
          { name: 'Meal', amount: 10.00, frequency: 'perDay', isAllPurpose: false },
        ],
      });
      const scenario = makeScenario();
      const result = computeAnnualEmployeeValue(terms, scenario);

      expect(result.allowances).toBe(2400.00);
      expect(result.total).toBe(64868.16);
    });
  });

  describe('Zero-hour scenario', () => {
    it('returns all zeros when all hours are zero', () => {
      const terms = makeTerms({ baseHourlyRate: 30.00 });
      const scenario = makeScenario({
        ordinaryHoursPerWeek: 0,
        weeklyBreakdown: {
          ordinaryDay: 0,
          saturdayOrdinary: 0,
          sundayOrdinary: 0,
          publicHoliday: 0,
          overtime15x: 0,
          overtime2x: 0,
          nightShift: 0,
          afternoonShift: 0,
          casualLoading: 0,
        },
      });
      const result = computeAnnualEmployeeValue(terms, scenario);

      expect(result.basePay).toBe(0);
      expect(result.saturdayPenalty).toBe(0);
      expect(result.sundayPenalty).toBe(0);
      expect(result.publicHolidayPenalty).toBe(0);
      expect(result.overtime15x).toBe(0);
      expect(result.overtime2x).toBe(0);
      expect(result.nightShiftLoading).toBe(0);
      expect(result.afternoonShiftLoading).toBe(0);
      expect(result.casualLoading).toBe(0);
      expect(result.allowances).toBe(0);
      expect(result.leaveLoading).toBe(0);
      expect(result.superannuation).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Full penalty exposure scenario', () => {
    // base = 29.50, 48 weeks
    // ordinaryDay = 30, sat = 4 @ 1.5x, sun = 4 @ 2.0x, PH = 0.5 @ 2.5x
    // ot15 = 3, ot2 = 1, nightShift = 2 @ 1.3x, afternoon = 2 @ 1.15x
    //
    // basePay = 29.50 * 30 * 48 = 42,480.00
    // satPen = 29.50 * 1.5 * 4 * 48 = 8,496.00
    // sunPen = 29.50 * 2.0 * 4 * 48 = 11,328.00
    // phPen = 29.50 * 2.5 * 0.5 * 48 = 1,770.00
    // ot15 = 29.50 * 1.5 * 3 * 48 = 6,372.00
    // ot2 = 29.50 * 2.0 * 1 * 48 = 2,832.00
    // nightShift = 29.50 * 1.3 * 2 * 48 = 3,681.60
    // afternoon = 29.50 * 1.15 * 2 * 48 = 3,254.40
    //
    // afternoon = 29.50 * 1.15 = 33.925, * 2 * 48 = 3,256.80
    //
    // allOrdinaryEarnings = 42480 + 8496 + 11328 + 1770 + 3681.60 + 3256.80 = 71,012.40
    // weeklyOrdinary = 71,012.40 / 48 = 1,479.425
    // leaveLoading = 1,479.425 * 4 * 0.175 = 1,035.5975 -> 1,035.60
    // OTE = 71,012.40 + 0 + 1,035.5975 = 72,047.9975
    // super = 72,047.9975 * 0.12 = 8,645.7597 -> 8,645.76
    // total = 71,012.40 + 6,372 + 2,832 + 0 + 1,035.5975 + 8,645.7597 = 89,897.7572 -> 89,897.76

    it('computes correctly with all penalty types', () => {
      const terms = makeTerms({
        baseHourlyRate: 29.50,
        penaltyRates: {
          saturday: 1.5,
          sunday: 2.0,
          publicHoliday: 2.5,
          overtime15x: 1.5,
          overtime2x: 2.0,
          nightShift: 1.3,
          afternoonShift: 1.15,
        },
      });
      const scenario = makeScenario({
        scenarioType: 'worstCase',
        ordinaryHoursPerWeek: 38,
        weeklyBreakdown: {
          ordinaryDay: 30,
          saturdayOrdinary: 4,
          sundayOrdinary: 4,
          publicHoliday: 0.5,
          overtime15x: 3,
          overtime2x: 1,
          nightShift: 2,
          afternoonShift: 2,
          casualLoading: 0,
        },
      });
      const result = computeAnnualEmployeeValue(terms, scenario);

      expect(result.basePay).toBe(42480.00);
      expect(result.saturdayPenalty).toBe(8496.00);
      expect(result.sundayPenalty).toBe(11328.00);
      expect(result.publicHolidayPenalty).toBe(1770.00);
      expect(result.overtime15x).toBe(6372.00);
      expect(result.overtime2x).toBe(2832.00);
      expect(result.nightShiftLoading).toBe(3681.60);
      expect(result.afternoonShiftLoading).toBe(3256.80);
      expect(result.leaveLoading).toBe(1035.60);
      expect(result.superannuation).toBe(8645.76);
      expect(result.total).toBe(89897.76);
    });
  });

  describe('Custom annual leave days affects leave loading', () => {
    // base = 30, ordinaryDay = 38, 48 weeks, 25 AL days (5 weeks)
    // basePay = 30 * 38 * 48 = 54,720
    // allOrdinaryEarnings = 54,720
    // weeklyOrdinary = 54,720 / 48 = 1,140
    // annualLeaveWeeks = 25 / 5 = 5
    // leaveLoading = 1,140 * 5 * 0.175 = 997.50
    // OTE = 54,720 + 997.50 = 55,717.50
    // super = 55,717.50 * 0.12 = 6,686.10
    // total = 54,720 + 997.50 + 6,686.10 = 62,403.60

    it('uses annualLeaveDays to compute leave loading weeks', () => {
      const terms = makeTerms({
        baseHourlyRate: 30.00,
        annualLeaveDays: 25,
      });
      const scenario = makeScenario();
      const result = computeAnnualEmployeeValue(terms, scenario);

      expect(result.leaveLoading).toBe(997.50);
      expect(result.total).toBe(62403.60);
    });
  });
});

// ─── computeLoadedRateAnnualValue ───
describe('computeLoadedRateAnnualValue', () => {
  describe('Standard loaded rate scenario', () => {
    // loadedRate = 45.00, totalHours = 38/wk (all in ordinaryDay), 48 weeks
    // basePay = 45 * 38 * 48 = 82,080.00
    // weeklyPay = 45 * 38 = 1,710
    // annualLeaveWeeks = 20 / 5 = 4
    // leaveLoading = 1,710 * 4 * 0.175 = 1,197.00
    // OTE = 82,080 + 1,197 = 83,277.00
    // super = 83,277 * 0.12 = 9,993.24
    // total = 82,080 + 1,197 + 9,993.24 = 93,270.24

    let result: AnnualValueBreakdown;

    it('computes correctly', () => {
      const scenario = makeScenario();
      result = computeLoadedRateAnnualValue(45.00, scenario, {
        superRate: 0.12,
        leaveLoadingPercent: 17.5,
        annualLeaveDays: 20,
      });
    });

    it('basePay = 45 * 38 * 48 = 82,080.00', () => {
      expect(result.basePay).toBe(82080.00);
    });

    it('all penalty/loading components are zero', () => {
      expect(result.saturdayPenalty).toBe(0);
      expect(result.sundayPenalty).toBe(0);
      expect(result.publicHolidayPenalty).toBe(0);
      expect(result.overtime15x).toBe(0);
      expect(result.overtime2x).toBe(0);
      expect(result.nightShiftLoading).toBe(0);
      expect(result.afternoonShiftLoading).toBe(0);
      expect(result.casualLoading).toBe(0);
      expect(result.allowances).toBe(0);
    });

    it('leaveLoading = 1710 * 4 * 0.175 = 1,197.00', () => {
      expect(result.leaveLoading).toBe(1197.00);
    });

    it('super = (82080 + 1197) * 0.12 = 9,993.24', () => {
      expect(result.superannuation).toBe(9993.24);
    });

    it('total = 82080 + 1197 + 9993.24 = 93,270.24', () => {
      expect(result.total).toBe(93270.24);
    });
  });

  describe('Loaded rate with mixed hours', () => {
    // loadedRate = 50.00
    // totalHours = 30 ordinaryDay + 4 sat + 4 sun = 38
    // basePay = 50 * 38 * 48 = 91,200
    // weeklyPay = 50 * 38 = 1,900
    // leaveLoading = 1,900 * 4 * 0.175 = 1,330.00
    // OTE = 91,200 + 1,330 = 92,530.00
    // super = 92,530 * 0.12 = 11,103.60
    // total = 91,200 + 1,330 + 11,103.60 = 103,633.60

    it('sums all hour types for total hours', () => {
      const scenario = makeScenario({
        weeklyBreakdown: {
          ordinaryDay: 30,
          saturdayOrdinary: 4,
          sundayOrdinary: 4,
          publicHoliday: 0,
          overtime15x: 0,
          overtime2x: 0,
          nightShift: 0,
          afternoonShift: 0,
          casualLoading: 0,
        },
      });
      const result = computeLoadedRateAnnualValue(50.00, scenario, {
        superRate: 0.12,
        leaveLoadingPercent: 17.5,
        annualLeaveDays: 20,
      });

      expect(result.basePay).toBe(91200.00);
      expect(result.leaveLoading).toBe(1330.00);
      expect(result.superannuation).toBe(11103.60);
      expect(result.total).toBe(103633.60);
    });
  });

  describe('Zero-hour loaded rate', () => {
    it('returns all zeros', () => {
      const scenario = makeScenario({
        weeklyBreakdown: {
          ordinaryDay: 0,
          saturdayOrdinary: 0,
          sundayOrdinary: 0,
          publicHoliday: 0,
          overtime15x: 0,
          overtime2x: 0,
          nightShift: 0,
          afternoonShift: 0,
          casualLoading: 0,
        },
      });
      const result = computeLoadedRateAnnualValue(45.00, scenario, {
        superRate: 0.12,
        leaveLoadingPercent: 17.5,
        annualLeaveDays: 20,
      });

      expect(result.basePay).toBe(0);
      expect(result.leaveLoading).toBe(0);
      expect(result.superannuation).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
