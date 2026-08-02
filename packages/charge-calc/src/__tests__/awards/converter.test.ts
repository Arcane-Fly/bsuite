import { describe, it, expect } from 'vitest';

import {
  awardToCalcConfig,
} from '../../awards/converter.js';
import type {
  EmployeeAwardContext,
  CalcOverrides,
} from '../../awards/converter.js';
import { calculate } from '../../calculate.js';
import { AwardSchemaZ } from '../../awards/schema.js';
import type { AwardSchema, AwardAllowance, AwardPenalty } from '../../awards/schema.js';

// ═══════════════════════════════════════════════════════════════════════
// Realistic Building Award (MA000003) fixture
// ═══════════════════════════════════════════════════════════════════════

const buildingClassificationCW3 = {
  classificationFixedId: 42001,
  name: 'CW/ECW 3 (CW3)',
  parentClassification: 'Construction Worker / Engineering Construction Worker',
  level: 3,
  employeeRateTypeCode: 'AD' as const,
  baseRate: 1100.2,
  baseRateType: 'Weekly',
  calculatedHourlyRate: 28.95,
  operativeFrom: '2024-07-01',
  operativeTo: null,
  clauseRef: '15.2',
};

const buildingClassificationCW1 = {
  classificationFixedId: 42000,
  name: 'CW/ECW 1 (CW1)',
  parentClassification: 'Construction Worker / Engineering Construction Worker',
  level: 1,
  employeeRateTypeCode: 'AD' as const,
  baseRate: 968.6,
  baseRateType: 'Weekly',
  calculatedHourlyRate: 25.49,
  operativeFrom: '2024-07-01',
  operativeTo: null,
  clauseRef: '15.2',
};

const apprenticeClassificationYear1 = {
  classificationFixedId: 42200,
  name: 'CW/ECW 1 (CW1) - 1st year apprentice',
  parentClassification: 'Construction Worker / Engineering Construction Worker',
  level: 1,
  employeeRateTypeCode: 'AP' as const,
  baseRate: 484.3,
  baseRateType: 'Weekly',
  calculatedHourlyRate: 12.74,
  operativeFrom: '2024-07-01',
  operativeTo: null,
  clauseRef: '15.3',
};

/** Classification with only baseRate, no calculatedHourlyRate */
const classificationBaseRateOnly = {
  classificationFixedId: 42500,
  name: 'Special Rate',
  parentClassification: null,
  level: 1,
  employeeRateTypeCode: 'AD' as const,
  baseRate: 22.50,
  baseRateType: 'Hourly',
  calculatedHourlyRate: null,
  operativeFrom: '2024-07-01',
  operativeTo: null,
  clauseRef: '15.2',
};

/** Classification with no rates at all */
const classificationNoRates = {
  classificationFixedId: 42600,
  name: 'Unpublished Rate',
  parentClassification: null,
  level: 1,
  employeeRateTypeCode: 'AD' as const,
  baseRate: null,
  baseRateType: null,
  calculatedHourlyRate: null,
  operativeFrom: '2024-07-01',
  operativeTo: null,
  clauseRef: '15.2',
};

const saturdayPenalty: AwardPenalty = {
  penaltyFixedId: 8801,
  description: 'Saturday - first 2 hours',
  rate: 1.5,
  calculatedValue: 43.43,
  employeeRateTypeCode: 'AD',
  clauseRef: '21.2(a)',
  clauseDescription: 'Overtime rates for Saturday work',
  classificationLevel: 3,
};

const sundayPenalty: AwardPenalty = {
  penaltyFixedId: 8802,
  description: 'Sunday - all hours',
  rate: 2.0,
  calculatedValue: 57.90,
  employeeRateTypeCode: 'AD',
  clauseRef: '21.2(b)',
  clauseDescription: 'Overtime rates for Sunday work',
  classificationLevel: 3,
};

const overtimePenalty: AwardPenalty = {
  penaltyFixedId: 8803,
  description: 'Overtime - first 2 hours',
  rate: 1.5,
  calculatedValue: 43.43,
  employeeRateTypeCode: 'AD',
  clauseRef: '21.1(a)',
  clauseDescription: 'Overtime rates',
  classificationLevel: 3,
};

const publicHolidayPenalty: AwardPenalty = {
  penaltyFixedId: 8804,
  description: 'Public holiday - all hours',
  rate: 2.5,
  calculatedValue: 72.38,
  employeeRateTypeCode: 'AD',
  clauseRef: '22.1',
  clauseDescription: 'Public holiday rates',
  classificationLevel: 3,
};

const nullRatePenalty: AwardPenalty = {
  penaltyFixedId: 8899,
  description: 'Penalty with null rate',
  rate: null,
  calculatedValue: null,
  employeeRateTypeCode: null,
  clauseRef: '99.1',
  clauseDescription: null,
  classificationLevel: null,
};

const industryAllowance: AwardAllowance = {
  fixedId: 5501,
  name: 'Industry allowance',
  amount: 32.59,
  rate: null,
  rateUnit: null,
  paymentFrequency: 'per week',
  isAllPurpose: true,
  parentAllowance: null,
  clauseRef: '19.2(a)',
  type: 'wage',
};

const toolAllowance: AwardAllowance = {
  fixedId: 5502,
  name: 'Tool and employee protection allowance',
  amount: null,
  rate: 0.61,
  rateUnit: 'per hour',
  paymentFrequency: 'per hour',
  isAllPurpose: false,
  parentAllowance: null,
  clauseRef: '19.2(b)',
  type: 'wage',
};

const dailyAllowance: AwardAllowance = {
  fixedId: 5503,
  name: 'Underground allowance',
  amount: 4.27,
  rate: null,
  rateUnit: null,
  paymentFrequency: 'per day',
  isAllPurpose: true,
  parentAllowance: null,
  clauseRef: '19.2(c)',
  type: 'wage',
};

const annualAllowance: AwardAllowance = {
  fixedId: 5504,
  name: 'Annual licence allowance',
  amount: 1040,
  rate: null,
  rateUnit: null,
  paymentFrequency: 'per annum',
  isAllPurpose: true,
  parentAllowance: null,
  clauseRef: '19.2(d)',
  type: 'wage',
};

const yearlyAllowance: AwardAllowance = {
  fixedId: 5505,
  name: 'Yearly equipment allowance',
  amount: 260,
  rate: null,
  rateUnit: null,
  paymentFrequency: 'yearly',
  isAllPurpose: false,
  parentAllowance: null,
  clauseRef: '19.2(e)',
  type: 'wage',
};

const nullAmountAllowance: AwardAllowance = {
  fixedId: 5599,
  name: 'Empty allowance',
  amount: null,
  rate: null,
  rateUnit: null,
  paymentFrequency: null,
  isAllPurpose: false,
  parentAllowance: null,
  clauseRef: '19.9',
  type: 'wage',
};

function buildAward(overrides: Partial<AwardSchema> = {}): AwardSchema {
  const raw = {
    code: 'MA000003',
    name: 'Building and Construction General On-site Award 2020',
    awardFixedId: 3,
    publishedYear: '2024-25',
    lastModified: '2024-08-15T10:30:00',
    operativeFrom: '2024-07-01',
    operativeTo: null,
    classifications: [buildingClassificationCW3, buildingClassificationCW1, apprenticeClassificationYear1],
    penalties: [saturdayPenalty, sundayPenalty, overtimePenalty, publicHolidayPenalty],
    wageAllowances: [industryAllowance, toolAllowance],
    expenseAllowances: [],
    supplement: {
      hoursProvisions: {
        ordinaryHoursPerWeek: 38,
        ordinaryHoursPerDay: 7.6,
        ordinaryDaysPerWeek: 5,
        dailyMaxOrdinary: 10,
        weeklyMaxOrdinary: 48,
        spanOfHours: { start: '06:00', end: '18:00' },
      },
      leaveProvisions: {
        annualLeaveDays: 20,
        personalLeaveDays: 10,
        communityServiceLeave: true,
        longServiceLeave: true,
        leaveLoadingPercent: 17.5,
      },
      shiftLoadings: [],
    },
    ...overrides,
  };
  return AwardSchemaZ.parse(raw);
}

const defaultCtx: EmployeeAwardContext = {
  awardCode: 'MA000003',
  classificationFixedId: 42001,
};

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('awardToCalcConfig', () => {
  describe('basic conversion', () => {
    it('produces a valid CalcConfig from a minimal AwardSchema', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result).toBeDefined();
      expect(result.wage).toBeDefined();
      expect(result.hoursPerWeek).toBeDefined();
      expect(result.billableWeeks).toBeDefined();
      expect(result.allowances).toBeDefined();
      expect(result.penalties).toBeDefined();
      expect(result.funding).toBeDefined();
    });

    it('produces a CalcConfig with all required fields populated', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      // All CalcConfig fields must be present and non-undefined
      expect(result.wage).toBeGreaterThan(0);
      expect(result.hoursPerWeek).toBe(38);
      expect(result.hoursPerDay).toBe(7.6);
      expect(result.daysPerWeek).toBe(5);
      expect(result.billableWeeks).toBe(39);
      expect(result.trainingWeeks).toBe(5);
      expect(result.apprenticeshipYears).toBe(4);
      expect(result.annualLeaveDays).toBe(20);
      expect(result.publicHolidayDays).toBe(10);
      expect(result.sickLeaveDays).toBe(10);
      expect(result.leaveLoadingPercent).toBe(17.5);
      expect(result.superRate).toBe(0.12);
      expect(result.superOnOT).toBe(false);
      expect(result.wcRate).toBe(0.047);
      expect(result.payrollTaxRate).toBe(0.0485);
      expect(result.otOncostFactor).toBe(0.12);
      expect(result.penaltyOncostAdder).toBe(0.15);
      expect(result.overheadType).toBe('percent');
      expect(result.overheadValue).toBe(6.5);
      expect(result.studyCost).toBe(850);
      expect(result.ppeCost).toBe(350);
      expect(result.trainingFeesAnnual).toBe(0);
      expect(result.marginType).toBe('flat');
      expect(result.marginValue).toBe(2.10);
    });
  });

  describe('classification lookup', () => {
    it('finds the correct classification by fixedId', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42001,
      });

      expect(result.wage).toBe(28.95); // CW3 calculatedHourlyRate
    });

    it('finds CW1 classification when requested', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42000,
      });

      expect(result.wage).toBe(25.49); // CW1 calculatedHourlyRate
    });

    it('finds apprentice classification when requested', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42200,
      });

      expect(result.wage).toBe(12.74); // Apprentice year 1 calculatedHourlyRate
    });
  });

  describe('classification not found', () => {
    it('throws an error when classificationFixedId is not in the award', () => {
      const award = buildAward();
      expect(() =>
        awardToCalcConfig(award, {
          ...defaultCtx,
          classificationFixedId: 99999,
        }),
      ).toThrow('Classification 99999 not found in award MA000003');
    });

    it('throws when award has no classifications', () => {
      const award = buildAward({ classifications: [] });
      expect(() =>
        awardToCalcConfig(award, defaultCtx),
      ).toThrow('Classification 42001 not found in award MA000003');
    });
  });

  describe('wage resolution', () => {
    it('uses calculatedHourlyRate as primary source', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42001,
      });

      expect(result.wage).toBe(28.95);
    });

    it('falls back to baseRate when calculatedHourlyRate is null', () => {
      const award = buildAward({
        classifications: [classificationBaseRateOnly],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42500,
      });

      expect(result.wage).toBe(22.50);
    });

    it('falls back to 0 when both calculatedHourlyRate and baseRate are null', () => {
      const award = buildAward({
        classifications: [classificationNoRates],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42600,
      });

      expect(result.wage).toBe(0);
    });
  });

  describe('wage override', () => {
    it('overrides.wage takes precedence over classification rates', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        wage: 35.00,
      });

      expect(result.wage).toBe(35.00);
    });

    it('overrides.wage takes precedence even when 0', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        wage: 0,
      });

      expect(result.wage).toBe(0);
    });
  });

  describe('penalty conversion', () => {
    it('converts AwardPenalty[] to PenaltyRate[]', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      // 4 penalties with non-null rates (nullRatePenalty is not in default fixture)
      expect(result.penalties).toHaveLength(4);
    });

    it('filters out penalties with null rates', () => {
      const award = buildAward({
        penalties: [saturdayPenalty, nullRatePenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties).toHaveLength(1);
      expect(result.penalties[0].label).toBe('Saturday - first 2 hours');
    });

    it('maps penalty fields correctly', () => {
      const award = buildAward({
        penalties: [saturdayPenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties[0]).toEqual({
        id: 'pen_8801',
        label: 'Saturday - first 2 hours',
        mult: 1.5,
        cat: 'penalty',
      });
    });

    it('categorizes "overtime" penalties as overtime', () => {
      const award = buildAward({
        penalties: [overtimePenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties[0].cat).toBe('overtime');
    });

    it('categorizes Saturday penalty as penalty (not overtime)', () => {
      const award = buildAward({
        penalties: [saturdayPenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties[0].cat).toBe('penalty');
    });

    it('categorizes Sunday penalty as penalty (not overtime)', () => {
      const award = buildAward({
        penalties: [sundayPenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties[0].cat).toBe('penalty');
    });

    it('categorizes public holiday penalty as penalty', () => {
      const award = buildAward({
        penalties: [publicHolidayPenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties[0].cat).toBe('penalty');
    });

    it('preserves the multiplier value from the award penalty', () => {
      const award = buildAward({
        penalties: [saturdayPenalty, sundayPenalty, overtimePenalty, publicHolidayPenalty],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      const mults = result.penalties.map(p => p.mult);
      expect(mults).toEqual([1.5, 2.0, 1.5, 2.5]);
    });

    it('handles empty penalties array', () => {
      const award = buildAward({ penalties: [] });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.penalties).toEqual([]);
    });
  });

  describe('allowance conversion', () => {
    it('converts wage allowances to CalcConfig Allowance format', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances.length).toBeGreaterThan(0);
    });

    it('maps industry allowance (per week) fields correctly', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0]).toEqual({
        id: 5501,
        name: 'Industry allowance',
        type: 'perWeek',
        amount: 32.59,
        superApplicable: true,
        enabled: true,
      });
    });

    it('maps tool allowance (per hour, rate-based) correctly', () => {
      const award = buildAward({
        wageAllowances: [toolAllowance],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0]).toEqual({
        id: 5502,
        name: 'Tool and employee protection allowance',
        type: 'perHour',
        amount: 0.61,
        superApplicable: false,
        enabled: true,
      });
    });

    it('maps daily allowance correctly', () => {
      const award = buildAward({
        wageAllowances: [dailyAllowance],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0].type).toBe('perDay');
      expect(result.allowances[0].amount).toBe(4.27);
    });

    it('filters out allowances with null amount and null rate', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance, nullAmountAllowance],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances).toHaveLength(1);
      expect(result.allowances[0].name).toBe('Industry allowance');
    });

    it('uses rate when amount is null', () => {
      const award = buildAward({
        wageAllowances: [toolAllowance],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0].amount).toBe(0.61);
    });

    it('uses amount over rate when both exist', () => {
      const bothValuesAllowance: AwardAllowance = {
        ...toolAllowance,
        fixedId: 5510,
        amount: 5.00,
        rate: 0.61,
      };
      const award = buildAward({
        wageAllowances: [bothValuesAllowance],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0].amount).toBe(5.00);
    });

    it('maps payment frequency "per week" to AllowanceType "perWeek"', () => {
      const award = buildAward({ wageAllowances: [industryAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0].type).toBe('perWeek');
    });

    it('maps payment frequency "per hour" to AllowanceType "perHour"', () => {
      const award = buildAward({ wageAllowances: [toolAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0].type).toBe('perHour');
    });

    it('maps payment frequency "per day" to AllowanceType "perDay"', () => {
      const award = buildAward({ wageAllowances: [dailyAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0].type).toBe('perDay');
    });

    it('maps annual payment frequency to weekly allowance amount', () => {
      const award = buildAward({ wageAllowances: [annualAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0]).toMatchObject({
        type: 'perWeek',
        amount: 20,
      });
    });

    it('maps yearly payment frequency to weekly allowance amount', () => {
      const award = buildAward({ wageAllowances: [yearlyAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.allowances[0]).toMatchObject({
        type: 'perWeek',
        amount: 5,
      });
    });

    // ─── BUG-1 regression: annual-allowance /52 normalisation ──────────────
    // These lock the /52 divide in `converter.mapAllowanceAmount` across
    // case variants, whitespace, expense allowances, and rate-based annual
    // allowances. Paired with the mapd-mapper.test.ts invariant suite that
    // locks the mapper boundary (no phantom divide there).

    it('BUG-1: case-variant "Per Annum" still triggers /52 divide', () => {
      const titleCase: AwardAllowance = {
        ...annualAllowance,
        fixedId: 5610,
        paymentFrequency: 'Per Annum',
      };
      const award = buildAward({ wageAllowances: [titleCase] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0]).toMatchObject({ type: 'perWeek', amount: 20 });
    });

    it('BUG-1: case-variant "PER YEAR" still triggers /52 divide', () => {
      const upper: AwardAllowance = {
        ...yearlyAllowance,
        fixedId: 5611,
        paymentFrequency: 'PER YEAR',
      };
      const award = buildAward({ wageAllowances: [upper] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0]).toMatchObject({ type: 'perWeek', amount: 5 });
    });

    it('BUG-1: leading/trailing whitespace does not defeat annum detection', () => {
      const padded: AwardAllowance = {
        ...annualAllowance,
        fixedId: 5612,
        paymentFrequency: '  per annum  ',
      };
      const award = buildAward({ wageAllowances: [padded] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0]).toMatchObject({ type: 'perWeek', amount: 20 });
    });

    it('BUG-1: AwardAllowance with type="expense" + annum frequency is divided by 52 (shared mapping contract)', () => {
      // NOTE: converter currently only emits `award.wageAllowances` into
      // CalcConfig; `expenseAllowances` are not yet wired in. This test
      // injects an allowance whose internal `type` is `'expense'` through
      // the `wageAllowances` slot to lock the shared `AwardAllowance`
      // conversion contract — so that if/when expenses are wired in, the
      // /52 divide behaviour is already regression-locked.
      const annualExpense: AwardAllowance = {
        fixedId: 6610,
        name: 'Annual tools reimbursement',
        amount: 2080,
        rate: null,
        rateUnit: null,
        paymentFrequency: 'per annum',
        isAllPurpose: false,
        parentAllowance: null,
        clauseRef: '19.3(z)',
        type: 'expense',
      };
      const award = buildAward({
        wageAllowances: [annualExpense],
      });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0]).toMatchObject({ type: 'perWeek', amount: 40 });
    });

    it('BUG-1: rate-based annual allowance (amount=null, rate=X) is divided by 52', () => {
      const rateBasedAnnual: AwardAllowance = {
        ...annualAllowance,
        fixedId: 5613,
        amount: null,
        rate: 520,
        rateUnit: 'per annum',
        paymentFrequency: 'per annum',
      };
      const award = buildAward({ wageAllowances: [rateBasedAnnual] });
      const result = awardToCalcConfig(award, defaultCtx);
      // rate falls through via `a.amount ?? a.rate ?? 0` then /52
      expect(result.allowances[0]).toMatchObject({ type: 'perWeek', amount: 10 });
    });

    it('BUG-1: weekly allowance is NOT divided by 52 (no phantom divide)', () => {
      // Guards against an over-eager "always divide" regression.
      const award = buildAward({ wageAllowances: [industryAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0].amount).toBe(32.59);
    });

    it('BUG-1: "per shift" falls back to perHour and is NOT divided by 52', () => {
      const shiftAllowance: AwardAllowance = {
        ...industryAllowance,
        fixedId: 5614,
        amount: 10,
        paymentFrequency: 'per shift',
      };
      const award = buildAward({ wageAllowances: [shiftAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0]).toMatchObject({ type: 'perHour', amount: 10 });
    });

    it('BUG-1 integration: annual $5200 allowance produces ~$100/week addition (calculate)', () => {
      // End-to-end lock: if /52 regresses to no-op (amount=5200 stays per week),
      // downstream calculate() will overstate the charge rate by a factor that
      // this assertion catches. Expected behaviour: 5200/52 = $100/week.
      const bigAnnual: AwardAllowance = {
        ...annualAllowance,
        fixedId: 5615,
        amount: 5200,
        isAllPurpose: true,
      };
      const awardWith = buildAward({ wageAllowances: [bigAnnual] });
      const awardWithout = buildAward({ wageAllowances: [] });

      const withAllowance = calculate(awardToCalcConfig(awardWith, defaultCtx));
      const withoutAllowance = calculate(awardToCalcConfig(awardWithout, defaultCtx));

      // The $100/week addition should land somewhere in a narrow band on the
      // charge rate. If /52 regresses, the delta would be ~52× larger.
      const delta = withAllowance.quotedChargeRate - withoutAllowance.quotedChargeRate;
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(10); // sanity: properly normalised annual → < $10/hr delta
    });

    it('maps null payment frequency to "perHour" default', () => {
      const nullFreqAllowance: AwardAllowance = {
        ...industryAllowance,
        fixedId: 5520,
        paymentFrequency: null,
      };
      const award = buildAward({ wageAllowances: [nullFreqAllowance] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances[0].type).toBe('perHour');
    });

    it('handles empty allowances array', () => {
      const award = buildAward({ wageAllowances: [] });
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.allowances).toEqual([]);
    });

    // ─── bsuite#1689: percentage `rate` must never become a dollar amount ──
    // `amount` (dollars) and `rate` (dollars-per-unit OR a percentage,
    // disambiguated by `rateUnit`) are not interchangeable. A genuine
    // percentage allowance (`rateUnit: 'percent'`) must be refused, not
    // coerced into a dollar figure — see `mapAllowanceAmount` doc comment.
    describe('bsuite#1689: rate-unit disambiguation', () => {
      const percentAllowance: AwardAllowance = {
        fixedId: 5701,
        name: 'Percentage tool allowance',
        amount: null,
        rate: 0.5, // 0.5% of a base this function has no access to
        rateUnit: 'percent',
        paymentFrequency: 'per week',
        isAllPurpose: false,
        parentAllowance: null,
        clauseRef: '19.4(a)',
        type: 'wage',
      };

      it('refuses (excludes) an allowance whose rate is a percentage (rateUnit: "percent")', () => {
        const award = buildAward({ wageAllowances: [percentAllowance] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances).toEqual([]);
      });

      it('refuses a percentage rate even when combined with an all-purpose flag (no silent OTE inflation)', () => {
        const allPurposePercent: AwardAllowance = { ...percentAllowance, isAllPurpose: true };
        const award = buildAward({ wageAllowances: [allPurposePercent] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances).toEqual([]);
      });

      it('is case/whitespace-insensitive when detecting a percentage rateUnit', () => {
        const messyPercent: AwardAllowance = {
          ...percentAllowance,
          fixedId: 5702,
          rateUnit: '  Percent  ',
        };
        const award = buildAward({ wageAllowances: [messyPercent] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances).toEqual([]);
      });

      it('detects a bare "%" rateUnit as a percentage too', () => {
        const bareSign: AwardAllowance = { ...percentAllowance, fixedId: 5703, rateUnit: '%' };
        const award = buildAward({ wageAllowances: [bareSign] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances).toEqual([]);
      });

      it('still accepts a dollar-denominated rate (rateUnit: "per hour") — no regression on the Tool allowance', () => {
        const award = buildAward({ wageAllowances: [toolAllowance] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances).toHaveLength(1);
        expect(result.allowances[0].amount).toBe(0.61);
      });

      it('still accepts a flat `amount` allowance when `amount` is set (no regression)', () => {
        const award = buildAward({ wageAllowances: [industryAllowance] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances).toHaveLength(1);
        expect(result.allowances[0].amount).toBe(32.59);
      });

      it('prefers `amount` over a percentage `rate` when both are present (amount always wins)', () => {
        const both: AwardAllowance = { ...percentAllowance, fixedId: 5704, amount: 12.5 };
        const award = buildAward({ wageAllowances: [both] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances[0].amount).toBe(12.5);
      });

      it('a null rateUnit with a rate present is still treated as dollar-denominated (backward compatible default)', () => {
        const nullUnit: AwardAllowance = { ...percentAllowance, fixedId: 5705, rateUnit: null };
        const award = buildAward({ wageAllowances: [nullUnit] });
        const result = awardToCalcConfig(award, defaultCtx);
        expect(result.allowances[0].amount).toBe(0.5);
      });
    });
  });

  describe('allowance enabling', () => {
    it('enabledIds = null enables only all-purpose allowances', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance, toolAllowance],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        enabledAllowanceIds: null,
      });

      const industry = result.allowances.find(a => a.id === 5501);
      const tool = result.allowances.find(a => a.id === 5502);

      expect(industry?.enabled).toBe(true);    // isAllPurpose = true
      expect(tool?.enabled).toBe(false);        // isAllPurpose = false
    });

    it('enabledIds = undefined enables all allowances', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance, toolAllowance],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        enabledAllowanceIds: undefined,
      });

      expect(result.allowances.every(a => a.enabled)).toBe(true);
    });

    it('enabledIds = [5501] enables only specified IDs', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance, toolAllowance],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        enabledAllowanceIds: [5501],
      });

      const industry = result.allowances.find(a => a.id === 5501);
      const tool = result.allowances.find(a => a.id === 5502);

      expect(industry?.enabled).toBe(true);
      expect(tool?.enabled).toBe(false);
    });

    it('enabledIds = [] disables all allowances', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance, toolAllowance],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        enabledAllowanceIds: [],
      });

      expect(result.allowances.every(a => a.enabled === false)).toBe(true);
    });

    it('enabledIds with multiple IDs enables the matching set', () => {
      const award = buildAward({
        wageAllowances: [industryAllowance, toolAllowance, dailyAllowance],
      });
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        enabledAllowanceIds: [5501, 5503],
      });

      const industry = result.allowances.find(a => a.id === 5501);
      const tool = result.allowances.find(a => a.id === 5502);
      const underground = result.allowances.find(a => a.id === 5503);

      expect(industry?.enabled).toBe(true);
      expect(tool?.enabled).toBe(false);
      expect(underground?.enabled).toBe(true);
    });
  });

  describe('supplement integration', () => {
    it('hours provisions flow through to CalcConfig', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.hoursPerWeek).toBe(38);
      expect(result.hoursPerDay).toBe(7.6);
      expect(result.daysPerWeek).toBe(5);
    });

    it('leave provisions flow through to CalcConfig', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.annualLeaveDays).toBe(20);
      expect(result.sickLeaveDays).toBe(10);
      expect(result.leaveLoadingPercent).toBe(17.5);
    });

    it('custom hours provisions are reflected in output', () => {
      const award = buildAward({
        supplement: {
          hoursProvisions: {
            ordinaryHoursPerWeek: 36,
            ordinaryHoursPerDay: 7.2,
            ordinaryDaysPerWeek: 5,
            dailyMaxOrdinary: null,
            weeklyMaxOrdinary: null,
            spanOfHours: { start: '07:00', end: '17:00' },
          },
          leaveProvisions: {
            annualLeaveDays: 25,
            personalLeaveDays: 12,
            communityServiceLeave: true,
            longServiceLeave: true,
            leaveLoadingPercent: 20,
          },
          shiftLoadings: [],
        },
      });
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.hoursPerWeek).toBe(36);
      expect(result.hoursPerDay).toBe(7.2);
      expect(result.annualLeaveDays).toBe(25);
      expect(result.sickLeaveDays).toBe(12);
      expect(result.leaveLoadingPercent).toBe(20);
    });

    it('uses supplement defaults when supplement is empty object', () => {
      const award = buildAward({
        supplement: {} as AwardSchema['supplement'],
      });
      const result = awardToCalcConfig(award, defaultCtx);

      // AwardSupplementZ defaults
      expect(result.hoursPerWeek).toBe(38);
      expect(result.hoursPerDay).toBe(7.6);
      expect(result.daysPerWeek).toBe(5);
      expect(result.annualLeaveDays).toBe(20);
      expect(result.sickLeaveDays).toBe(10);
      expect(result.leaveLoadingPercent).toBe(17.5);
    });
  });

  describe('overrides', () => {
    it('overrides billableWeeks', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        billableWeeks: 48,
      });
      expect(result.billableWeeks).toBe(48);
    });

    it('overrides marginType and marginValue', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        marginType: 'percent',
        marginValue: 15,
      });
      expect(result.marginType).toBe('percent');
      expect(result.marginValue).toBe(15);
    });

    it('overrides superRate', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        superRate: 0.115,
      });
      expect(result.superRate).toBe(0.115);
    });

    it('overrides wcRate', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        wcRate: 0.06,
      });
      expect(result.wcRate).toBe(0.06);
    });

    it('overrides payrollTaxRate', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        payrollTaxRate: 0.0545,
      });
      expect(result.payrollTaxRate).toBe(0.0545);
    });

    it('overrides overheadType and overheadValue', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        overheadType: 'flat',
        overheadValue: 5000,
      });
      expect(result.overheadType).toBe('flat');
      expect(result.overheadValue).toBe(5000);
    });

    it('overrides studyCost', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        studyCost: 1200,
      });
      expect(result.studyCost).toBe(1200);
    });

    it('overrides ppeCost', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx, {
        ppeCost: 500,
      });
      expect(result.ppeCost).toBe(500);
    });

    it('default values used when no overrides provided', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.billableWeeks).toBe(39);
      expect(result.superRate).toBe(0.12);
      expect(result.wcRate).toBe(0.047);
      expect(result.payrollTaxRate).toBe(0.0485);
      expect(result.overheadType).toBe('percent');
      expect(result.overheadValue).toBe(6.5);
      expect(result.studyCost).toBe(850);
      expect(result.ppeCost).toBe(350);
      expect(result.marginType).toBe('flat');
      expect(result.marginValue).toBe(2.10);
    });
  });

  describe('currentYear pass-through', () => {
    it('passes currentYear from context to CalcConfig', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, {
        ...defaultCtx,
        currentYear: 2,
      });
      expect(result.currentYear).toBe(2);
    });

    it('currentYear is undefined when not provided in context', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);
      expect(result.currentYear).toBeUndefined();
    });
  });

  describe('funding defaults', () => {
    it('sets funding to disabled with empty milestones', () => {
      const award = buildAward();
      const result = awardToCalcConfig(award, defaultCtx);

      expect(result.funding.enabled).toBe(false);
      expect(result.funding.milestones).toEqual([]);
      expect(result.funding.method).toBe('reduce');
      expect(result.funding.passPercentage).toBe(100);
      expect(result.funding.apprenticeshipYears).toBe(4);
    });
  });

  describe('smoke test: calculate() accepts the output', () => {
    it('runs calculate() on the converted config without errors', () => {
      const award = buildAward();
      const config = awardToCalcConfig(award, defaultCtx);
      const result = calculate(config);

      expect(result).toBeDefined();
      expect(result.quotedChargeRate).toBeGreaterThan(0);
      expect(result.receivedWagePerHour).toBeGreaterThan(0);
      expect(result.billableHours).toBeGreaterThan(0);
    });

    it('produces reasonable charge rates for Building Award CW3', () => {
      const award = buildAward();
      const config = awardToCalcConfig(award, defaultCtx);
      const result = calculate(config);

      // CW3 @ $28.95/hr should produce a charge rate roughly between $40-$80/hr
      expect(result.quotedChargeRate).toBeGreaterThan(40);
      expect(result.quotedChargeRate).toBeLessThan(80);
    });

    it('produces reasonable charge rates for apprentice classification', () => {
      const award = buildAward();
      const config = awardToCalcConfig(award, {
        ...defaultCtx,
        classificationFixedId: 42200,
        currentYear: 1,
      });
      const result = calculate(config);

      // Apprentice year 1 @ $12.74/hr should produce a lower charge rate
      expect(result.quotedChargeRate).toBeGreaterThan(15);
      expect(result.quotedChargeRate).toBeLessThan(50);
    });

    it('calculates penalty rates from the converted config', () => {
      const award = buildAward();
      const config = awardToCalcConfig(award, defaultCtx);
      const result = calculate(config);

      // Should have penalty rates for all 4 converted penalties
      const rateKeys = Object.keys(result.rates);
      expect(rateKeys).toContain('ord');
      expect(rateKeys.length).toBeGreaterThan(1); // ord + penalties
    });

    it('handles config with all overrides applied', () => {
      const award = buildAward();
      const overrides: CalcOverrides = {
        wage: 32.00,
        billableWeeks: 42,
        marginType: 'percent',
        marginValue: 12,
        superRate: 0.115,
        wcRate: 0.05,
        payrollTaxRate: 0.0545,
        overheadType: 'flat',
        overheadValue: 4000,
        studyCost: 1000,
        ppeCost: 400,
      };
      const config = awardToCalcConfig(award, defaultCtx, overrides);
      const result = calculate(config);

      expect(result).toBeDefined();
      expect(result.quotedChargeRate).toBeGreaterThan(0);
    });
  });
});
