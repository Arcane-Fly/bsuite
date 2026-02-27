import { describe, it, expect, vi } from 'vitest';

import {
  mapClassification,
  mapPenalty,
  mapIsAllPurpose,
  mapPaymentFrequency,
  mapWageAllowance,
  mapExpenseAllowance,
  filterApprenticeClassifications,
} from '../../awards/mapd-mapper';

import { fetchCompleteAward } from '../../awards/mapd-client';
import type { MAPDDataSource } from '../../awards/mapd-client';

import type {
  MAPDAward,
  MAPDClassification,
  MAPDPenalty,
  MAPDWageAllowance,
  MAPDExpenseAllowance,
} from '../../awards/mapd-types';

import {
  AwardClassificationZ,
  AwardPenaltyZ,
  AwardAllowanceZ,
  AwardSchemaZ,
} from '../../awards/schema';

// ═══════════════════════════════════════════════════════════════════════
// Realistic MAPD fixture data — Building Award (MA000003)
// ═══════════════════════════════════════════════════════════════════════

const mapdAwardFixture: MAPDAward = {
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

const mapdClassificationFixture: MAPDClassification = {
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

const mapdApprenticeClassification: MAPDClassification = {
  classification_fixed_id: 42200,
  award_fixed_id: 3,
  classification: 'CW/ECW 1 (CW1) - 1st year apprentice',
  parent_classification_name: 'Construction Worker / Engineering Construction Worker',
  classification_level: 1,
  employee_rate_type_code: 'AP',
  base_rate: 484.3,
  base_rate_type: 'Weekly',
  calculated_rate: 12.74,
  calculated_rate_type: 'Hourly',
  operative_from: '2024-07-01',
  operative_to: null,
  published_year: 2025,
  clauses: '15.3',
};

const mapdAdultApprenticeClassification: MAPDClassification = {
  classification_fixed_id: 42300,
  award_fixed_id: 3,
  classification: 'CW/ECW 1 (CW1) - Adult apprentice',
  parent_classification_name: 'Construction Worker / Engineering Construction Worker',
  classification_level: 1,
  employee_rate_type_code: 'AA',
  base_rate: 580.0,
  base_rate_type: 'Weekly',
  calculated_rate: 15.26,
  calculated_rate_type: 'Hourly',
  operative_from: '2024-07-01',
  operative_to: null,
  published_year: 2025,
  clauses: '15.4',
};

const mapdJuniorClassification: MAPDClassification = {
  classification_fixed_id: 42100,
  award_fixed_id: 3,
  classification: 'CW/ECW 1 (CW1) - Under 18 years',
  parent_classification_name: 'Construction Worker / Engineering Construction Worker',
  classification_level: 1,
  employee_rate_type_code: 'JN',
  base_rate: 462.0,
  base_rate_type: 'Weekly',
  calculated_rate: 12.16,
  calculated_rate_type: 'Hourly',
  operative_from: '2024-07-01',
  operative_to: null,
  published_year: 2025,
  clauses: '15.2',
};

const mapdTraineeClassification: MAPDClassification = {
  classification_fixed_id: 42400,
  award_fixed_id: 3,
  classification: 'CW/ECW 1 (CW1) - Trainee',
  parent_classification_name: 'Construction Worker / Engineering Construction Worker',
  classification_level: 1,
  employee_rate_type_code: 'TN',
  base_rate: 500.0,
  base_rate_type: 'Weekly',
  calculated_rate: 13.16,
  calculated_rate_type: 'Hourly',
  operative_from: '2024-07-01',
  operative_to: null,
  published_year: 2025,
  clauses: '15.5',
};

const mapdPenaltyFixture: MAPDPenalty = {
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

const mapdWageAllowanceFixture: MAPDWageAllowance = {
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

const mapdExpenseAllowanceFixture: MAPDExpenseAllowance = {
  expense_allowance_fixed_id: 6601,
  award_fixed_id: 3,
  allowance: 'Meal allowance - overtime',
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
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('mapClassification', () => {
  it('maps all fields from MAPD to internal format', () => {
    const result = mapClassification(mapdClassificationFixture);

    expect(result.classificationFixedId).toBe(42001);
    expect(result.name).toBe('CW/ECW 3 (CW3)');
    expect(result.parentClassification).toBe(
      'Construction Worker / Engineering Construction Worker',
    );
    expect(result.level).toBe(3);
    expect(result.employeeRateTypeCode).toBe('AD');
    expect(result.baseRate).toBe(1100.2);
    expect(result.baseRateType).toBe('Weekly');
    expect(result.calculatedHourlyRate).toBe(28.95);
    expect(result.operativeFrom).toBe('2024-07-01');
    expect(result.operativeTo).toBeNull();
    expect(result.clauseRef).toBe('15.2');
  });

  it('handles nullable fields (null parent, level, rates)', () => {
    const withNulls: MAPDClassification = {
      ...mapdClassificationFixture,
      parent_classification_name: null,
      classification_level: null,
      employee_rate_type_code: null,
      base_rate: null,
      base_rate_type: null,
      calculated_rate: null,
      operative_to: null,
    };
    const result = mapClassification(withNulls);

    expect(result.parentClassification).toBeNull();
    expect(result.level).toBeNull();
    expect(result.employeeRateTypeCode).toBeNull();
    expect(result.baseRate).toBeNull();
    expect(result.baseRateType).toBeNull();
    expect(result.calculatedHourlyRate).toBeNull();
    expect(result.operativeTo).toBeNull();
  });

  it('preserves employee_rate_type_code for all valid types', () => {
    const codes = ['AD', 'JN', 'AP', 'AA', 'TN', 'XT', 'CA'] as const;
    for (const code of codes) {
      const raw: MAPDClassification = {
        ...mapdClassificationFixture,
        employee_rate_type_code: code,
      };
      const result = mapClassification(raw);
      expect(result.employeeRateTypeCode).toBe(code);
    }
  });

  it('result passes AwardClassificationZ validation', () => {
    const result = mapClassification(mapdClassificationFixture);
    expect(() => AwardClassificationZ.parse(result)).not.toThrow();
  });

  it('nullable-field result passes AwardClassificationZ validation', () => {
    const withNulls: MAPDClassification = {
      ...mapdClassificationFixture,
      parent_classification_name: null,
      classification_level: null,
      employee_rate_type_code: null,
      base_rate: null,
      base_rate_type: null,
      calculated_rate: null,
      operative_to: null,
    };
    const result = mapClassification(withNulls);
    expect(() => AwardClassificationZ.parse(result)).not.toThrow();
  });
});

describe('mapPenalty', () => {
  it('converts rate 150 to 1.5 (percentage to decimal multiplier)', () => {
    const result = mapPenalty(mapdPenaltyFixture);
    expect(result.rate).toBe(1.5);
  });

  it('converts rate 200 to 2.0', () => {
    const sundayPenalty: MAPDPenalty = {
      ...mapdPenaltyFixture,
      penalty_fixed_id: 8802,
      rate: 200,
      penalty_calculated_value: 57.9,
    };
    const result = mapPenalty(sundayPenalty);
    expect(result.rate).toBe(2.0);
  });

  it('converts rate 250 to 2.5', () => {
    const phPenalty: MAPDPenalty = {
      ...mapdPenaltyFixture,
      rate: 250,
    };
    const result = mapPenalty(phPenalty);
    expect(result.rate).toBe(2.5);
  });

  it('handles null rate', () => {
    const nullRatePenalty: MAPDPenalty = {
      ...mapdPenaltyFixture,
      rate: null,
      penalty_calculated_value: null,
    };
    const result = mapPenalty(nullRatePenalty);
    expect(result.rate).toBeNull();
    expect(result.calculatedValue).toBeNull();
  });

  it('maps all fields correctly', () => {
    const result = mapPenalty(mapdPenaltyFixture);

    expect(result.penaltyFixedId).toBe(8801);
    expect(result.description).toBe('Saturday - first 2 hours');
    expect(result.calculatedValue).toBe(43.43);
    expect(result.employeeRateTypeCode).toBe('AD');
    expect(result.clauseRef).toBe('21.2(a)');
    expect(result.clauseDescription).toBe('Overtime rates for Saturday work');
    expect(result.classificationLevel).toBe(3);
  });

  it('result passes AwardPenaltyZ validation', () => {
    const result = mapPenalty(mapdPenaltyFixture);
    expect(() => AwardPenaltyZ.parse(result)).not.toThrow();
  });

  it('null-rate result passes AwardPenaltyZ validation', () => {
    const nullRatePenalty: MAPDPenalty = {
      ...mapdPenaltyFixture,
      rate: null,
      penalty_calculated_value: null,
      employee_rate_type_code: null,
      clause_description: null,
      classification_level: null,
    };
    const result = mapPenalty(nullRatePenalty);
    expect(() => AwardPenaltyZ.parse(result)).not.toThrow();
  });
});

describe('mapIsAllPurpose', () => {
  it('returns true for boolean true', () => {
    expect(mapIsAllPurpose(true)).toBe(true);
  });

  it('returns false for boolean false', () => {
    expect(mapIsAllPurpose(false)).toBe(false);
  });

  it('returns true for number 1', () => {
    expect(mapIsAllPurpose(1)).toBe(true);
  });

  it('returns false for number 2', () => {
    expect(mapIsAllPurpose(2)).toBe(false);
  });

  it('returns false for number 0', () => {
    expect(mapIsAllPurpose(0)).toBe(false);
  });
});

describe('mapPaymentFrequency', () => {
  it('maps "per hour" to perHour', () => {
    expect(mapPaymentFrequency('per hour')).toBe('perHour');
  });

  it('maps "per week" to perWeek', () => {
    expect(mapPaymentFrequency('per week')).toBe('perWeek');
  });

  it('maps "per day" to perDay', () => {
    expect(mapPaymentFrequency('per day')).toBe('perDay');
  });

  it('maps "per annum" to perWeek (annualised)', () => {
    expect(mapPaymentFrequency('per annum')).toBe('perWeek');
  });

  it('maps "per year" to perWeek (annualised)', () => {
    expect(mapPaymentFrequency('per year')).toBe('perWeek');
  });

  it('returns perHour for null', () => {
    expect(mapPaymentFrequency(null)).toBe('perHour');
  });

  it('handles case-insensitive input: "Per Hour"', () => {
    expect(mapPaymentFrequency('Per Hour')).toBe('perHour');
  });

  it('handles case-insensitive input: "PER WEEK"', () => {
    expect(mapPaymentFrequency('PER WEEK')).toBe('perWeek');
  });

  it('handles leading/trailing whitespace', () => {
    expect(mapPaymentFrequency('  per hour  ')).toBe('perHour');
  });

  it('falls back to perHour for unknown frequency', () => {
    expect(mapPaymentFrequency('per shift')).toBe('perHour');
  });
});

describe('mapWageAllowance', () => {
  it('maps all fields correctly with type=wage', () => {
    const result = mapWageAllowance(mapdWageAllowanceFixture);

    expect(result.fixedId).toBe(5501);
    expect(result.name).toBe('Industry allowance');
    expect(result.amount).toBe(32.59);
    expect(result.rate).toBeNull();
    expect(result.rateUnit).toBeNull();
    expect(result.paymentFrequency).toBe('per week');
    expect(result.isAllPurpose).toBe(true);
    expect(result.parentAllowance).toBeNull();
    expect(result.clauseRef).toBe('19.2(a)');
    expect(result.type).toBe('wage');
  });

  it('normalises is_all_purpose from number 1 to true', () => {
    const result = mapWageAllowance(mapdWageAllowanceFixture);
    expect(result.isAllPurpose).toBe(true);
  });

  it('normalises is_all_purpose from number 2 to false', () => {
    const notAllPurpose: MAPDWageAllowance = {
      ...mapdWageAllowanceFixture,
      is_all_purpose: 2,
    };
    const result = mapWageAllowance(notAllPurpose);
    expect(result.isAllPurpose).toBe(false);
  });

  it('normalises is_all_purpose from boolean true', () => {
    const boolAllowance: MAPDWageAllowance = {
      ...mapdWageAllowanceFixture,
      is_all_purpose: true,
    };
    const result = mapWageAllowance(boolAllowance);
    expect(result.isAllPurpose).toBe(true);
  });

  it('maps rate-based allowance (tool allowance)', () => {
    const toolAllowance: MAPDWageAllowance = {
      ...mapdWageAllowanceFixture,
      wage_allowance_fixed_id: 5502,
      allowance: 'Tool and employee protection allowance',
      allowance_amount: null,
      rate: 0.61,
      rate_unit: 'per hour',
      payment_frequency: 'per hour',
      is_all_purpose: 2,
    };
    const result = mapWageAllowance(toolAllowance);
    expect(result.rate).toBe(0.61);
    expect(result.rateUnit).toBe('per hour');
    expect(result.isAllPurpose).toBe(false);
    expect(result.amount).toBeNull();
  });

  it('result passes AwardAllowanceZ validation', () => {
    const result = mapWageAllowance(mapdWageAllowanceFixture);
    expect(() => AwardAllowanceZ.parse(result)).not.toThrow();
  });
});

describe('mapExpenseAllowance', () => {
  it('maps all fields correctly with type=expense', () => {
    const result = mapExpenseAllowance(mapdExpenseAllowanceFixture);

    expect(result.fixedId).toBe(6601);
    expect(result.name).toBe('Meal allowance - overtime');
    expect(result.amount).toBe(18.83);
    expect(result.rate).toBeNull();
    expect(result.rateUnit).toBeNull();
    expect(result.paymentFrequency).toBe('per day');
    expect(result.isAllPurpose).toBe(false);
    expect(result.parentAllowance).toBeNull();
    expect(result.clauseRef).toBe('19.3(b)');
    expect(result.type).toBe('expense');
  });

  it('always sets rate and rateUnit to null for expense allowances', () => {
    const result = mapExpenseAllowance(mapdExpenseAllowanceFixture);
    expect(result.rate).toBeNull();
    expect(result.rateUnit).toBeNull();
  });

  it('normalises is_all_purpose from number 2 to false', () => {
    const withNumber: MAPDExpenseAllowance = {
      ...mapdExpenseAllowanceFixture,
      is_all_purpose: 2,
    };
    const result = mapExpenseAllowance(withNumber);
    expect(result.isAllPurpose).toBe(false);
  });

  it('normalises is_all_purpose from number 1 to true', () => {
    const withNumber: MAPDExpenseAllowance = {
      ...mapdExpenseAllowanceFixture,
      is_all_purpose: 1,
    };
    const result = mapExpenseAllowance(withNumber);
    expect(result.isAllPurpose).toBe(true);
  });

  it('result passes AwardAllowanceZ validation', () => {
    const result = mapExpenseAllowance(mapdExpenseAllowanceFixture);
    expect(() => AwardAllowanceZ.parse(result)).not.toThrow();
  });
});

describe('filterApprenticeClassifications', () => {
  const allClassifications = [
    mapdClassificationFixture,                // AD
    mapdApprenticeClassification,             // AP
    mapdAdultApprenticeClassification,        // AA
    mapdJuniorClassification,                 // JN
    mapdTraineeClassification,                // TN
  ].map(mapClassification);

  it('returns only AP and AA classifications', () => {
    const result = filterApprenticeClassifications(allClassifications);
    expect(result).toHaveLength(2);
    expect(result[0].employeeRateTypeCode).toBe('AP');
    expect(result[1].employeeRateTypeCode).toBe('AA');
  });

  it('excludes AD (Adult) classifications', () => {
    const result = filterApprenticeClassifications(allClassifications);
    const codes = result.map((c) => c.employeeRateTypeCode);
    expect(codes).not.toContain('AD');
  });

  it('excludes JN (Junior) classifications', () => {
    const result = filterApprenticeClassifications(allClassifications);
    const codes = result.map((c) => c.employeeRateTypeCode);
    expect(codes).not.toContain('JN');
  });

  it('excludes TN (Trainee) classifications', () => {
    const result = filterApprenticeClassifications(allClassifications);
    const codes = result.map((c) => c.employeeRateTypeCode);
    expect(codes).not.toContain('TN');
  });

  it('returns empty array when no apprentice classifications exist', () => {
    const adultOnly = [mapClassification(mapdClassificationFixture)];
    const result = filterApprenticeClassifications(adultOnly);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterApprenticeClassifications([])).toEqual([]);
  });
});

describe('fetchCompleteAward', () => {
  function createMockDataSource(
    overrides: Partial<MAPDDataSource> = {},
  ): MAPDDataSource {
    return {
      fetchAward: vi.fn().mockResolvedValue(mapdAwardFixture),
      fetchClassifications: vi.fn().mockResolvedValue([mapdClassificationFixture]),
      fetchPenalties: vi.fn().mockResolvedValue([mapdPenaltyFixture]),
      fetchWageAllowances: vi.fn().mockResolvedValue([mapdWageAllowanceFixture]),
      fetchExpenseAllowances: vi.fn().mockResolvedValue([mapdExpenseAllowanceFixture]),
      ...overrides,
    };
  }

  it('assembles a complete AwardSchema from MAPD data', async () => {
    const source = createMockDataSource();
    const result = await fetchCompleteAward(source, 'MA000003');

    expect(result).not.toBeNull();
    expect(result!.code).toBe('MA000003');
    expect(result!.name).toBe('Building and Construction General On-site Award 2020');
    expect(result!.awardFixedId).toBe(3);
    expect(result!.publishedYear).toBe('2024-25');
    expect(result!.lastModified).toBe('2024-08-15T10:30:00');
    expect(result!.operativeFrom).toBe('2024-07-01');
    expect(result!.operativeTo).toBeNull();
    expect(result!.classifications).toHaveLength(1);
    expect(result!.penalties).toHaveLength(1);
    expect(result!.wageAllowances).toHaveLength(1);
    expect(result!.expenseAllowances).toHaveLength(1);
  });

  it('returns null for unknown award', async () => {
    const source = createMockDataSource({
      fetchAward: vi.fn().mockResolvedValue(null),
    });
    const result = await fetchCompleteAward(source, 'MA999999');
    expect(result).toBeNull();
  });

  it('does not fetch sub-resources when award is null', async () => {
    const fetchClassifications = vi.fn();
    const fetchPenalties = vi.fn();
    const fetchWageAllowances = vi.fn();
    const fetchExpenseAllowances = vi.fn();

    const source = createMockDataSource({
      fetchAward: vi.fn().mockResolvedValue(null),
      fetchClassifications,
      fetchPenalties,
      fetchWageAllowances,
      fetchExpenseAllowances,
    });

    await fetchCompleteAward(source, 'MA999999');

    expect(fetchClassifications).not.toHaveBeenCalled();
    expect(fetchPenalties).not.toHaveBeenCalled();
    expect(fetchWageAllowances).not.toHaveBeenCalled();
    expect(fetchExpenseAllowances).not.toHaveBeenCalled();
  });

  it('calls all data source methods with the award code', async () => {
    const source = createMockDataSource();
    await fetchCompleteAward(source, 'MA000003');

    expect(source.fetchAward).toHaveBeenCalledWith('MA000003');
    expect(source.fetchClassifications).toHaveBeenCalledWith('MA000003');
    expect(source.fetchPenalties).toHaveBeenCalledWith('MA000003');
    expect(source.fetchWageAllowances).toHaveBeenCalledWith('MA000003');
    expect(source.fetchExpenseAllowances).toHaveBeenCalledWith('MA000003');
  });

  it('applies default supplement when none provided', async () => {
    const source = createMockDataSource();
    const result = await fetchCompleteAward(source, 'MA000003');

    expect(result).not.toBeNull();
    // AwardSupplementZ.parse({}) fills in all defaults
    expect(result!.supplement.hoursProvisions.ordinaryHoursPerWeek).toBe(38);
    expect(result!.supplement.leaveProvisions.annualLeaveDays).toBe(20);
    expect(result!.supplement.shiftLoadings).toEqual([]);
  });

  it('merges provided supplement', async () => {
    const source = createMockDataSource();
    const supplement = {
      hoursProvisions: {
        ordinaryHoursPerWeek: 36,
        ordinaryHoursPerDay: 7.2,
        ordinaryDaysPerWeek: 5,
      },
    };
    const result = await fetchCompleteAward(source, 'MA000003', supplement);

    expect(result).not.toBeNull();
    expect(result!.supplement.hoursProvisions).toEqual({
      ordinaryHoursPerWeek: 36,
      ordinaryHoursPerDay: 7.2,
      ordinaryDaysPerWeek: 5,
      dailyMaxOrdinary: null,
      weeklyMaxOrdinary: null,
      spanOfHours: { start: '06:00', end: '18:00' },
    });
  });

  it('assembled result passes AwardSchemaZ validation', async () => {
    const source = createMockDataSource();
    const result = await fetchCompleteAward(source, 'MA000003');

    expect(result).not.toBeNull();
    expect(() => AwardSchemaZ.parse(result)).not.toThrow();
  });

  it('maps penalty rates correctly (150 -> 1.5)', async () => {
    const source = createMockDataSource();
    const result = await fetchCompleteAward(source, 'MA000003');

    expect(result).not.toBeNull();
    expect(result!.penalties[0].rate).toBe(1.5);
  });

  it('normalises wage allowance isAllPurpose correctly', async () => {
    const source = createMockDataSource();
    const result = await fetchCompleteAward(source, 'MA000003');

    expect(result).not.toBeNull();
    expect(result!.wageAllowances[0].isAllPurpose).toBe(true);
  });

  it('handles award with empty sub-resource arrays', async () => {
    const source = createMockDataSource({
      fetchClassifications: vi.fn().mockResolvedValue([]),
      fetchPenalties: vi.fn().mockResolvedValue([]),
      fetchWageAllowances: vi.fn().mockResolvedValue([]),
      fetchExpenseAllowances: vi.fn().mockResolvedValue([]),
    });
    const result = await fetchCompleteAward(source, 'MA000003');

    expect(result).not.toBeNull();
    expect(result!.classifications).toEqual([]);
    expect(result!.penalties).toEqual([]);
    expect(result!.wageAllowances).toEqual([]);
    expect(result!.expenseAllowances).toEqual([]);
    // Still validates
    expect(() => AwardSchemaZ.parse(result)).not.toThrow();
  });
});
