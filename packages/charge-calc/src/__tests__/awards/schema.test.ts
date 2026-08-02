import { describe, it, expect } from 'vitest';

// ─── MAPD API response types ───
import {
  MAPDAwardZ,
  MAPDClassificationZ,
  MAPDPenaltyZ,
  MAPDWageAllowanceZ,
  MAPDExpenseAllowanceZ,
} from '../../awards/mapd-types.js';

// ─── Internal AwardSchema types ───
import {
  EmployeeRateTypeCodeZ,
  AwardClassificationZ,
  AwardPenaltyZ,
  AwardAllowanceZ,
  AwardSupplementZ,
  AwardSchemaZ,
} from '../../awards/schema.js';

// ═══════════════════════════════════════════════════════════════════════
// Realistic MAPD API response fixtures
// Based on MA000003 — Building and Construction General On-site Award
// ═══════════════════════════════════════════════════════════════════════

const mapdAwardFixture = {
  award_fixed_id: 3,
  award_id: 1128,
  code: 'MA000003',
  name: 'Building and Construction General On-site Award 2020',
  award_operative_from: '2024-07-01',
  award_operative_to: null,
  published_year: '2024-25',
  version_number: 21,
  last_modified_datetime: '2024-08-15T10:30:00',
};

const mapdClassificationFixture = {
  classification_fixed_id: 42001,
  award_fixed_id: 3,
  classification: 'CW/ECW 3 (CW3)',
  parent_classification_name: 'Construction Worker / Engineering Construction Worker',
  classification_level: 3,
  employee_rate_type_code: 'AD',
  base_rate: 1100.2,
  base_rate_type: 'Weekly',
  calculated_rate: 28.95,
  calculated_rate_type: 'Hourly',
  operative_from: '2024-07-01',
  operative_to: null,
  published_year: 2025,
  clauses: '15.2',
};

const mapdPenaltyFixture = {
  penalty_fixed_id: 8801,
  award_fixed_id: 3,
  penalty_description: 'Saturday - first 2 hours',
  rate: 150,
  penalty_calculated_value: 43.43,
  employee_rate_type_code: 'AD',
  operative_from: '2024-07-01',
  operative_to: null,
  clauses: '21.2(a)',
  clause_description: 'Overtime rates for Saturday work',
  classification_level: 3,
  published_year: 2025,
};

const mapdWageAllowanceFixture = {
  wage_allowance_fixed_id: 5501,
  award_fixed_id: 3,
  allowance: 'Industry allowance',
  allowance_amount: 32.59,
  rate: null,
  rate_unit: null,
  payment_frequency: 'per week',
  is_all_purpose: 1,
  parent_allowance: null,
  operative_from: '2024-07-01',
  operative_to: null,
  clauses: '19.2(a)',
  published_year: 2025,
};

const mapdExpenseAllowanceFixture = {
  expense_allowance_fixed_id: 6601,
  award_fixed_id: 3,
  allowance: 'Meal allowance — overtime',
  allowance_amount: 18.83,
  payment_frequency: 'per day',
  is_all_purpose: false,
  parent_allowance: null,
  operative_from: '2024-07-01',
  operative_to: null,
  clauses: '19.3(b)',
  published_year: 2025,
};

// ═══════════════════════════════════════════════════════════════════════
// Internal AwardSchema fixtures
// ═══════════════════════════════════════════════════════════════════════

const classificationFixture = {
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

const penaltyFixture = {
  penaltyFixedId: 8801,
  description: 'Saturday - first 2 hours',
  rate: 1.5,
  calculatedValue: 43.43,
  employeeRateTypeCode: 'AD',
  clauseRef: '21.2(a)',
  clauseDescription: 'Overtime rates for Saturday work',
  classificationLevel: 3,
};

const wageAllowanceFixture = {
  fixedId: 5501,
  name: 'Industry allowance',
  amount: 32.59,
  rate: null,
  rateUnit: null,
  paymentFrequency: 'per week',
  isAllPurpose: true,
  parentAllowance: null,
  clauseRef: '19.2(a)',
  type: 'wage' as const,
};

const expenseAllowanceFixture = {
  fixedId: 6601,
  name: 'Meal allowance — overtime',
  amount: 18.83,
  rate: null,
  rateUnit: null,
  paymentFrequency: 'per day',
  isAllPurpose: false,
  parentAllowance: null,
  clauseRef: '19.3(b)',
  type: 'expense' as const,
};

// ═══════════════════════════════════════════════════════════════════════
// Part A — MAPD API Response Zod schema tests
// ═══════════════════════════════════════════════════════════════════════

describe('MAPD API Response Types', () => {
  describe('MAPDAwardZ', () => {
    it('parses a valid award response', () => {
      const result = MAPDAwardZ.parse(mapdAwardFixture);
      expect(result.code).toBe('MA000003');
      expect(result.name).toBe('Building and Construction General On-site Award 2020');
      expect(result.award_fixed_id).toBe(3);
      expect(result.award_operative_to).toBeNull();
      expect(result.version_number).toBe(21);
    });

    it('rejects award missing required code field', () => {
      const invalid = { ...mapdAwardFixture, code: undefined };
      expect(() => MAPDAwardZ.parse(invalid)).toThrow();
    });

    it('rejects award with wrong type for award_fixed_id', () => {
      const invalid = { ...mapdAwardFixture, award_fixed_id: 'not-a-number' };
      expect(() => MAPDAwardZ.parse(invalid)).toThrow();
    });

    it('accepts award_operative_to as null', () => {
      const withNull = { ...mapdAwardFixture, award_operative_to: null };
      const result = MAPDAwardZ.parse(withNull);
      expect(result.award_operative_to).toBeNull();
    });

    it('accepts award_operative_to as a date string', () => {
      const withDate = { ...mapdAwardFixture, award_operative_to: '2025-06-30' };
      const result = MAPDAwardZ.parse(withDate);
      expect(result.award_operative_to).toBe('2025-06-30');
    });
  });

  describe('MAPDClassificationZ', () => {
    it('parses a valid classification response', () => {
      const result = MAPDClassificationZ.parse(mapdClassificationFixture);
      expect(result.classification).toBe('CW/ECW 3 (CW3)');
      expect(result.classification_level).toBe(3);
      expect(result.base_rate).toBe(1100.2);
      expect(result.calculated_rate).toBe(28.95);
      expect(result.employee_rate_type_code).toBe('AD');
    });

    it('accepts nullable fields as null', () => {
      const withNulls = {
        ...mapdClassificationFixture,
        parent_classification_name: null,
        classification_level: null,
        employee_rate_type_code: null,
        base_rate: null,
        base_rate_type: null,
        calculated_rate: null,
        calculated_rate_type: null,
        operative_to: null,
      };
      const result = MAPDClassificationZ.parse(withNulls);
      expect(result.parent_classification_name).toBeNull();
      expect(result.classification_level).toBeNull();
      expect(result.base_rate).toBeNull();
    });

    it('rejects classification missing required clauses field', () => {
      const { clauses: _unused, ...invalid } = mapdClassificationFixture;
      void _unused;
      expect(() => MAPDClassificationZ.parse(invalid)).toThrow();
    });

    it('rejects non-numeric published_year', () => {
      const invalid = { ...mapdClassificationFixture, published_year: '2025' };
      expect(() => MAPDClassificationZ.parse(invalid)).toThrow();
    });

    it('parses a junior classification', () => {
      const junior = {
        ...mapdClassificationFixture,
        classification_fixed_id: 42100,
        classification: 'CW/ECW 1 (CW1) - Under 18 years',
        employee_rate_type_code: 'JN',
        base_rate: 462.0,
        calculated_rate: 12.16,
      };
      const result = MAPDClassificationZ.parse(junior);
      expect(result.employee_rate_type_code).toBe('JN');
    });
  });

  describe('MAPDPenaltyZ', () => {
    it('parses a valid penalty response', () => {
      const result = MAPDPenaltyZ.parse(mapdPenaltyFixture);
      expect(result.penalty_description).toBe('Saturday - first 2 hours');
      expect(result.rate).toBe(150);
      expect(result.penalty_calculated_value).toBe(43.43);
      expect(result.clauses).toBe('21.2(a)');
    });

    it('accepts nullable rate and calculated value', () => {
      const withNulls = {
        ...mapdPenaltyFixture,
        rate: null,
        penalty_calculated_value: null,
        employee_rate_type_code: null,
        clause_description: null,
        classification_level: null,
      };
      const result = MAPDPenaltyZ.parse(withNulls);
      expect(result.rate).toBeNull();
      expect(result.penalty_calculated_value).toBeNull();
    });

    it('rejects penalty missing required penalty_fixed_id', () => {
      const { penalty_fixed_id: _unused, ...invalid } = mapdPenaltyFixture;
      void _unused;
      expect(() => MAPDPenaltyZ.parse(invalid)).toThrow();
    });

    it('parses a Sunday penalty at 200%', () => {
      const sundayPenalty = {
        ...mapdPenaltyFixture,
        penalty_fixed_id: 8802,
        penalty_description: 'Sunday - all hours',
        rate: 200,
        penalty_calculated_value: 57.9,
        clauses: '21.2(b)',
        clause_description: 'Overtime rates for Sunday work',
      };
      const result = MAPDPenaltyZ.parse(sundayPenalty);
      expect(result.rate).toBe(200);
    });
  });

  describe('MAPDWageAllowanceZ', () => {
    it('parses a valid wage allowance response', () => {
      const result = MAPDWageAllowanceZ.parse(mapdWageAllowanceFixture);
      expect(result.allowance).toBe('Industry allowance');
      expect(result.allowance_amount).toBe(32.59);
      expect(result.payment_frequency).toBe('per week');
      expect(result.is_all_purpose).toBe(1);
    });

    it('accepts is_all_purpose as boolean (API inconsistency)', () => {
      const withBool = { ...mapdWageAllowanceFixture, is_all_purpose: true };
      const result = MAPDWageAllowanceZ.parse(withBool);
      expect(result.is_all_purpose).toBe(true);
    });

    it('accepts is_all_purpose as number', () => {
      const withNum = { ...mapdWageAllowanceFixture, is_all_purpose: 2 };
      const result = MAPDWageAllowanceZ.parse(withNum);
      expect(result.is_all_purpose).toBe(2);
    });

    it('accepts nullable amount and rate fields', () => {
      const withNulls = {
        ...mapdWageAllowanceFixture,
        allowance_amount: null,
        rate: null,
        rate_unit: null,
        payment_frequency: null,
        parent_allowance: null,
      };
      const result = MAPDWageAllowanceZ.parse(withNulls);
      expect(result.allowance_amount).toBeNull();
      expect(result.rate).toBeNull();
    });

    it('rejects missing required allowance name', () => {
      const { allowance: _unused, ...invalid } = mapdWageAllowanceFixture;
      void _unused;
      expect(() => MAPDWageAllowanceZ.parse(invalid)).toThrow();
    });

    it('parses a rate-based allowance (tool allowance)', () => {
      const toolAllowance = {
        ...mapdWageAllowanceFixture,
        wage_allowance_fixed_id: 5502,
        allowance: 'Tool and employee protection allowance',
        allowance_amount: null,
        rate: 0.61,
        rate_unit: 'per hour',
        payment_frequency: 'per hour',
        is_all_purpose: 2,
      };
      const result = MAPDWageAllowanceZ.parse(toolAllowance);
      expect(result.rate).toBe(0.61);
      expect(result.is_all_purpose).toBe(2);
    });
  });

  describe('MAPDExpenseAllowanceZ', () => {
    it('parses a valid expense allowance response', () => {
      const result = MAPDExpenseAllowanceZ.parse(mapdExpenseAllowanceFixture);
      expect(result.allowance).toBe('Meal allowance — overtime');
      expect(result.allowance_amount).toBe(18.83);
      expect(result.payment_frequency).toBe('per day');
      expect(result.is_all_purpose).toBe(false);
    });

    it('accepts is_all_purpose as number (API inconsistency)', () => {
      const withNum = { ...mapdExpenseAllowanceFixture, is_all_purpose: 2 };
      const result = MAPDExpenseAllowanceZ.parse(withNum);
      expect(result.is_all_purpose).toBe(2);
    });

    it('rejects missing required operative_from', () => {
      const { operative_from: _unused, ...invalid } = mapdExpenseAllowanceFixture;
      void _unused;
      expect(() => MAPDExpenseAllowanceZ.parse(invalid)).toThrow();
    });

    it('parses a travel expense allowance', () => {
      const travelExpense = {
        ...mapdExpenseAllowanceFixture,
        expense_allowance_fixed_id: 6602,
        allowance: 'Travel — distant work',
        allowance_amount: 72.5,
        payment_frequency: 'per day',
        is_all_purpose: false,
        clauses: '24.3(a)',
      };
      const result = MAPDExpenseAllowanceZ.parse(travelExpense);
      expect(result.allowance).toBe('Travel — distant work');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Part B — Internal AwardSchema Zod type tests
// ═══════════════════════════════════════════════════════════════════════

describe('Internal AwardSchema Types', () => {
  describe('EmployeeRateTypeCodeZ', () => {
    const validCodes = ['AD', 'JN', 'AP', 'AA', 'TN', 'XT', 'CA'] as const;

    it.each(validCodes)('accepts valid code: %s', (code) => {
      expect(EmployeeRateTypeCodeZ.parse(code)).toBe(code);
    });

    it('rejects all 7 valid codes are accepted (exhaustive)', () => {
      // Ensure we cover every code in the enum
      const parsed = validCodes.map((c) => EmployeeRateTypeCodeZ.parse(c));
      expect(parsed).toHaveLength(7);
    });

    it('rejects invalid code "FT"', () => {
      expect(() => EmployeeRateTypeCodeZ.parse('FT')).toThrow();
    });

    it('rejects empty string', () => {
      expect(() => EmployeeRateTypeCodeZ.parse('')).toThrow();
    });

    it('rejects lowercase variant', () => {
      expect(() => EmployeeRateTypeCodeZ.parse('ad')).toThrow();
    });

    it('rejects numeric input', () => {
      expect(() => EmployeeRateTypeCodeZ.parse(1)).toThrow();
    });
  });

  describe('AwardClassificationZ', () => {
    it('parses a valid classification', () => {
      const result = AwardClassificationZ.parse(classificationFixture);
      expect(result.name).toBe('CW/ECW 3 (CW3)');
      expect(result.level).toBe(3);
      expect(result.employeeRateTypeCode).toBe('AD');
      expect(result.calculatedHourlyRate).toBe(28.95);
    });

    it('accepts nullable fields as null', () => {
      const withNulls = {
        ...classificationFixture,
        parentClassification: null,
        level: null,
        employeeRateTypeCode: null,
        baseRate: null,
        baseRateType: null,
        calculatedHourlyRate: null,
        operativeTo: null,
      };
      const result = AwardClassificationZ.parse(withNulls);
      expect(result.parentClassification).toBeNull();
      expect(result.level).toBeNull();
      expect(result.employeeRateTypeCode).toBeNull();
    });

    it('rejects classification with invalid employeeRateTypeCode', () => {
      const invalid = { ...classificationFixture, employeeRateTypeCode: 'ZZ' };
      expect(() => AwardClassificationZ.parse(invalid)).toThrow();
    });

    it('rejects missing classificationFixedId', () => {
      const { classificationFixedId: _unused, ...invalid } = classificationFixture;
      void _unused;
      expect(() => AwardClassificationZ.parse(invalid)).toThrow();
    });
  });

  describe('AwardPenaltyZ', () => {
    it('parses a valid penalty with decimal multiplier', () => {
      const result = AwardPenaltyZ.parse(penaltyFixture);
      expect(result.description).toBe('Saturday - first 2 hours');
      expect(result.rate).toBe(1.5);
      expect(result.calculatedValue).toBe(43.43);
    });

    it('accepts nullable rate and related fields', () => {
      const withNulls = {
        ...penaltyFixture,
        rate: null,
        calculatedValue: null,
        employeeRateTypeCode: null,
        clauseDescription: null,
        classificationLevel: null,
      };
      const result = AwardPenaltyZ.parse(withNulls);
      expect(result.rate).toBeNull();
      expect(result.calculatedValue).toBeNull();
    });

    it('parses a double-time penalty', () => {
      const doubleTime = {
        ...penaltyFixture,
        penaltyFixedId: 8803,
        description: 'Sunday - all hours',
        rate: 2.0,
        calculatedValue: 57.9,
      };
      const result = AwardPenaltyZ.parse(doubleTime);
      expect(result.rate).toBe(2.0);
    });

    it('rejects missing required penaltyFixedId', () => {
      const { penaltyFixedId: _unused, ...invalid } = penaltyFixture;
      void _unused;
      expect(() => AwardPenaltyZ.parse(invalid)).toThrow();
    });
  });

  describe('AwardAllowanceZ', () => {
    it('parses a valid wage allowance', () => {
      const result = AwardAllowanceZ.parse(wageAllowanceFixture);
      expect(result.name).toBe('Industry allowance');
      expect(result.type).toBe('wage');
      expect(result.isAllPurpose).toBe(true);
      expect(result.amount).toBe(32.59);
    });

    it('parses a valid expense allowance', () => {
      const result = AwardAllowanceZ.parse(expenseAllowanceFixture);
      expect(result.name).toBe('Meal allowance — overtime');
      expect(result.type).toBe('expense');
      expect(result.isAllPurpose).toBe(false);
    });

    it('differentiates wage vs expense types', () => {
      const wage = AwardAllowanceZ.parse(wageAllowanceFixture);
      const expense = AwardAllowanceZ.parse(expenseAllowanceFixture);
      expect(wage.type).toBe('wage');
      expect(expense.type).toBe('expense');
      expect(wage.type).not.toBe(expense.type);
    });

    it('rejects invalid type value', () => {
      const invalid = { ...wageAllowanceFixture, type: 'bonus' };
      expect(() => AwardAllowanceZ.parse(invalid)).toThrow();
    });

    it('requires isAllPurpose to be boolean (not number)', () => {
      const withNumber = { ...wageAllowanceFixture, isAllPurpose: 1 };
      expect(() => AwardAllowanceZ.parse(withNumber)).toThrow();
    });

    it('accepts nullable amount, rate, rateUnit, paymentFrequency, parentAllowance', () => {
      const withNulls = {
        ...wageAllowanceFixture,
        amount: null,
        rate: null,
        rateUnit: null,
        paymentFrequency: null,
        parentAllowance: null,
      };
      const result = AwardAllowanceZ.parse(withNulls);
      expect(result.amount).toBeNull();
      expect(result.rate).toBeNull();
    });
  });

  describe('AwardSupplementZ', () => {
    it('provides sensible defaults when parsed with empty object', () => {
      const result = AwardSupplementZ.parse({});
      expect(result.hoursProvisions.ordinaryHoursPerWeek).toBe(38);
      expect(result.hoursProvisions.ordinaryHoursPerDay).toBe(7.6);
      expect(result.hoursProvisions.ordinaryDaysPerWeek).toBe(5);
      expect(result.hoursProvisions.spanOfHours.start).toBe('06:00');
      expect(result.hoursProvisions.spanOfHours.end).toBe('18:00');
    });

    it('provides default leave provisions', () => {
      const result = AwardSupplementZ.parse({});
      expect(result.leaveProvisions.annualLeaveDays).toBe(20);
      expect(result.leaveProvisions.personalLeaveDays).toBe(10);
      expect(result.leaveProvisions.communityServiceLeave).toBe(true);
      expect(result.leaveProvisions.longServiceLeave).toBe(true);
      expect(result.leaveProvisions.leaveLoadingPercent).toBe(17.5);
    });

    it('provides empty shift loadings array by default', () => {
      const result = AwardSupplementZ.parse({});
      expect(result.shiftLoadings).toEqual([]);
    });

    it('accepts custom hours provisions while defaulting the rest', () => {
      const result = AwardSupplementZ.parse({
        hoursProvisions: {
          ordinaryHoursPerWeek: 36,
          ordinaryHoursPerDay: 7.2,
          ordinaryDaysPerWeek: 5,
        },
      });
      expect(result.hoursProvisions.ordinaryHoursPerWeek).toBe(36);
      // Nested defaults should still apply
      expect(result.hoursProvisions.spanOfHours.start).toBe('06:00');
      // Leave provisions should default
      expect(result.leaveProvisions.annualLeaveDays).toBe(20);
    });

    it('accepts shift loadings', () => {
      const result = AwardSupplementZ.parse({
        shiftLoadings: [
          {
            name: 'Afternoon shift',
            multiplier: 1.15,
            conditions: 'Mon-Fri, commencing at or after 14:00',
          },
          {
            name: 'Night shift',
            multiplier: 1.3,
            conditions: 'Mon-Fri, commencing at or after 22:00',
          },
        ],
      });
      expect(result.shiftLoadings).toHaveLength(2);
      expect(result.shiftLoadings[0].multiplier).toBe(1.15);
      expect(result.shiftLoadings[1].name).toBe('Night shift');
    });

    it('accepts full custom supplement for building and construction', () => {
      const buildingSupplement = {
        hoursProvisions: {
          ordinaryHoursPerWeek: 38,
          ordinaryHoursPerDay: 8,
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
        shiftLoadings: [
          {
            name: 'Afternoon shift',
            multiplier: 1.15,
            conditions: 'Mon-Fri finishing after 18:30',
          },
        ],
      };
      const result = AwardSupplementZ.parse(buildingSupplement);
      expect(result.hoursProvisions.dailyMaxOrdinary).toBe(10);
      expect(result.hoursProvisions.weeklyMaxOrdinary).toBe(48);
      expect(result.shiftLoadings[0].multiplier).toBe(1.15);
    });
  });

  describe('AwardSchemaZ', () => {
    const fullAwardFixture = {
      code: 'MA000003',
      name: 'Building and Construction General On-site Award 2020',
      awardFixedId: 3,
      publishedYear: '2024-25',
      lastModified: '2024-08-15T10:30:00',
      operativeFrom: '2024-07-01',
      operativeTo: null,
      classifications: [classificationFixture],
      penalties: [penaltyFixture],
      wageAllowances: [wageAllowanceFixture],
      expenseAllowances: [expenseAllowanceFixture],
      supplement: {},
    };

    it('parses a complete award schema', () => {
      const result = AwardSchemaZ.parse(fullAwardFixture);
      expect(result.code).toBe('MA000003');
      expect(result.awardFixedId).toBe(3);
      expect(result.classifications).toHaveLength(1);
      expect(result.penalties).toHaveLength(1);
      expect(result.wageAllowances).toHaveLength(1);
      expect(result.expenseAllowances).toHaveLength(1);
    });

    it('applies supplement defaults when supplement is empty object', () => {
      const result = AwardSchemaZ.parse(fullAwardFixture);
      expect(result.supplement.hoursProvisions.ordinaryHoursPerWeek).toBe(38);
      expect(result.supplement.leaveProvisions.annualLeaveDays).toBe(20);
    });

    it('accepts empty arrays for classifications, penalties, and allowances', () => {
      const minimal = {
        ...fullAwardFixture,
        classifications: [],
        penalties: [],
        wageAllowances: [],
        expenseAllowances: [],
      };
      const result = AwardSchemaZ.parse(minimal);
      expect(result.classifications).toEqual([]);
      expect(result.penalties).toEqual([]);
      expect(result.wageAllowances).toEqual([]);
    });

    it('rejects missing required code field', () => {
      const { code: _unused, ...invalid } = fullAwardFixture;
      void _unused;
      expect(() => AwardSchemaZ.parse(invalid)).toThrow();
    });

    it('rejects missing required awardFixedId', () => {
      const { awardFixedId: _unused, ...invalid } = fullAwardFixture;
      void _unused;
      expect(() => AwardSchemaZ.parse(invalid)).toThrow();
    });

    it('accepts operativeTo as null', () => {
      const result = AwardSchemaZ.parse(fullAwardFixture);
      expect(result.operativeTo).toBeNull();
    });

    it('accepts operativeTo as a date string', () => {
      const withDate = { ...fullAwardFixture, operativeTo: '2025-06-30' };
      const result = AwardSchemaZ.parse(withDate);
      expect(result.operativeTo).toBe('2025-06-30');
    });

    it('parses a multi-classification award', () => {
      const level1Classification = {
        ...classificationFixture,
        classificationFixedId: 42000,
        name: 'CW/ECW 1 (CW1)',
        level: 1,
        baseRate: 968.6,
        calculatedHourlyRate: 25.49,
      };
      const apprenticeClassification = {
        ...classificationFixture,
        classificationFixedId: 42200,
        name: 'CW/ECW 1 (CW1) — 1st year apprentice',
        level: 1,
        employeeRateTypeCode: 'AP' as const,
        baseRate: 484.3,
        calculatedHourlyRate: 12.74,
      };
      const multiClassAward = {
        ...fullAwardFixture,
        classifications: [classificationFixture, level1Classification, apprenticeClassification],
      };
      const result = AwardSchemaZ.parse(multiClassAward);
      expect(result.classifications).toHaveLength(3);
      expect(result.classifications[2].employeeRateTypeCode).toBe('AP');
    });

    it('validates nested classification array entries', () => {
      const invalidClassification = {
        ...classificationFixture,
        employeeRateTypeCode: 'INVALID',
      };
      const withBadClassification = {
        ...fullAwardFixture,
        classifications: [invalidClassification],
      };
      expect(() => AwardSchemaZ.parse(withBadClassification)).toThrow();
    });
  });
});
