import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { AwardSchema } from '../../awards/schema.js';
import type { MAPDDataSource } from '../../awards/mapd-client.js';
import {
  registerAward,
  getAward,
  listAwards,
  clearAwardCache,
  validateAward,
  loadAwardFromMAPD,
} from '../../awards/registry.js';

// ═══════════════════════════════════════════════════════════════════════
// Fixtures — valid AwardSchema objects
// ═══════════════════════════════════════════════════════════════════════

const buildingAward: AwardSchema = {
  code: 'MA000003',
  name: 'Building and Construction General On-site Award 2020',
  awardFixedId: 3,
  publishedYear: '2024-25',
  lastModified: '2024-08-15T10:30:00',
  operativeFrom: '2024-07-01',
  operativeTo: null,
  classifications: [
    {
      classificationFixedId: 42001,
      name: 'CW/ECW 3 (CW3)',
      parentClassification: 'Construction Worker / Engineering Construction Worker',
      level: 3,
      employeeRateTypeCode: 'AD',
      baseRate: 1100.2,
      baseRateType: 'Weekly',
      calculatedHourlyRate: 28.95,
      operativeFrom: '2024-07-01',
      operativeTo: null,
      clauseRef: '15.2',
    },
  ],
  penalties: [
    {
      penaltyFixedId: 8801,
      description: 'Saturday - first 2 hours',
      rate: 1.5,
      calculatedValue: 43.43,
      employeeRateTypeCode: 'AD',
      clauseRef: '21.2(a)',
      clauseDescription: 'Overtime rates for Saturday work',
      classificationLevel: 3,
    },
  ],
  wageAllowances: [
    {
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
    },
  ],
  expenseAllowances: [
    {
      fixedId: 6601,
      name: 'Meal allowance - overtime',
      amount: 18.83,
      rate: null,
      rateUnit: null,
      paymentFrequency: 'per day',
      isAllPurpose: false,
      parentAllowance: null,
      clauseRef: '19.3(b)',
      type: 'expense',
    },
  ],
  supplement: {
    hoursProvisions: {
      ordinaryHoursPerWeek: 38,
      ordinaryHoursPerDay: 7.6,
      ordinaryDaysPerWeek: 5,
      dailyMaxOrdinary: null,
      weeklyMaxOrdinary: null,
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
};

const hospitalityAward: AwardSchema = {
  code: 'MA000009',
  name: 'Hospitality Industry (General) Award 2020',
  awardFixedId: 9,
  publishedYear: '2024-25',
  lastModified: '2024-08-20T09:00:00',
  operativeFrom: '2024-07-01',
  operativeTo: null,
  classifications: [],
  penalties: [],
  wageAllowances: [],
  expenseAllowances: [],
  supplement: {
    hoursProvisions: {
      ordinaryHoursPerWeek: 38,
      ordinaryHoursPerDay: 7.6,
      ordinaryDaysPerWeek: 5,
      dailyMaxOrdinary: null,
      weeklyMaxOrdinary: null,
      spanOfHours: { start: '07:00', end: '21:00' },
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
};

// ═══════════════════════════════════════════════════════════════════════
// Mock MAPDDataSource for loadAwardFromMAPD tests
// ═══════════════════════════════════════════════════════════════════════

function createMockDataSource(awards: Map<string, AwardSchema>): MAPDDataSource {
  return {
    fetchAward: vi.fn(async (code: string) => {
      const award = awards.get(code);
      if (!award) return null;
      return {
        award_fixed_id: award.awardFixedId,
        award_id: award.awardFixedId * 100,
        code: award.code,
        name: award.name,
        award_operative_from: award.operativeFrom,
        award_operative_to: award.operativeTo,
        published_year: award.publishedYear,
        version_number: 1,
        last_modified_datetime: award.lastModified,
      };
    }),
    fetchClassifications: vi.fn(async (code: string) => {
      const award = awards.get(code);
      if (!award) return [];
      return award.classifications.map((c) => ({
        classification_fixed_id: c.classificationFixedId,
        award_fixed_id: award.awardFixedId,
        classification: c.name,
        parent_classification_name: c.parentClassification,
        classification_level: c.level,
        employee_rate_type_code: c.employeeRateTypeCode,
        base_rate: c.baseRate,
        base_rate_type: c.baseRateType,
        calculated_rate: c.calculatedHourlyRate,
        calculated_rate_type: 'Hourly',
        operative_from: c.operativeFrom,
        operative_to: c.operativeTo,
        published_year: 2025,
        clauses: c.clauseRef,
      }));
    }),
    fetchPenalties: vi.fn(async (code: string) => {
      const award = awards.get(code);
      if (!award) return [];
      return award.penalties.map((p) => ({
        penalty_fixed_id: p.penaltyFixedId,
        award_fixed_id: award.awardFixedId,
        penalty_description: p.description,
        rate: p.rate != null ? p.rate * 100 : null,
        penalty_calculated_value: p.calculatedValue,
        employee_rate_type_code: p.employeeRateTypeCode,
        operative_from: award.operativeFrom,
        operative_to: award.operativeTo,
        clauses: p.clauseRef,
        clause_description: p.clauseDescription,
        classification_level: p.classificationLevel,
        published_year: 2025,
      }));
    }),
    fetchWageAllowances: vi.fn(async (code: string) => {
      const award = awards.get(code);
      if (!award) return [];
      return award.wageAllowances.map((a) => ({
        wage_allowance_fixed_id: a.fixedId,
        award_fixed_id: award.awardFixedId,
        allowance: a.name,
        allowance_amount: a.amount,
        rate: a.rate,
        rate_unit: a.rateUnit,
        payment_frequency: a.paymentFrequency,
        is_all_purpose: a.isAllPurpose ? 1 : 2,
        parent_allowance: a.parentAllowance,
        operative_from: award.operativeFrom,
        operative_to: award.operativeTo,
        clauses: a.clauseRef,
        published_year: 2025,
      }));
    }),
    fetchExpenseAllowances: vi.fn(async (code: string) => {
      const award = awards.get(code);
      if (!award) return [];
      return award.expenseAllowances.map((a) => ({
        expense_allowance_fixed_id: a.fixedId,
        award_fixed_id: award.awardFixedId,
        allowance: a.name,
        allowance_amount: a.amount,
        payment_frequency: a.paymentFrequency,
        is_all_purpose: a.isAllPurpose ? 1 : 2,
        parent_allowance: a.parentAllowance,
        operative_from: award.operativeFrom,
        operative_to: award.operativeTo,
        clauses: a.clauseRef,
        published_year: 2025,
      }));
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

describe('Award Registry', () => {
  beforeEach(() => {
    clearAwardCache();
  });

  // ─── registerAward + getAward ──────────────────────────────────────

  describe('registerAward() + getAward()', () => {
    it('registers an award and retrieves it by code', () => {
      registerAward(buildingAward);
      const result = getAward('MA000003');
      expect(result).toBeDefined();
      expect(result?.code).toBe('MA000003');
      expect(result?.name).toBe('Building and Construction General On-site Award 2020');
      expect(result?.awardFixedId).toBe(3);
    });

    it('overwrites an existing award with the same code', () => {
      registerAward(buildingAward);
      const updated: AwardSchema = {
        ...buildingAward,
        name: 'Updated Building Award',
      };
      registerAward(updated);
      const result = getAward('MA000003');
      expect(result?.name).toBe('Updated Building Award');
    });

    it('registers multiple awards independently', () => {
      registerAward(buildingAward);
      registerAward(hospitalityAward);
      expect(getAward('MA000003')?.name).toBe(
        'Building and Construction General On-site Award 2020',
      );
      expect(getAward('MA000009')?.name).toBe('Hospitality Industry (General) Award 2020');
    });
  });

  // ─── getAward — unknown code ───────────────────────────────────────

  describe('getAward()', () => {
    it('returns undefined for an unknown code', () => {
      expect(getAward('MA999999')).toBeUndefined();
    });

    it('returns undefined when cache is empty', () => {
      expect(getAward('MA000003')).toBeUndefined();
    });
  });

  // ─── listAwards ───────────────────────────────────────────────────

  describe('listAwards()', () => {
    it('returns empty array when cache is empty', () => {
      expect(listAwards()).toEqual([]);
    });

    it('returns registered award codes', () => {
      registerAward(buildingAward);
      registerAward(hospitalityAward);
      const codes = listAwards();
      expect(codes).toHaveLength(2);
      expect(codes).toContain('MA000003');
      expect(codes).toContain('MA000009');
    });

    it('does not return duplicates after re-registering same award', () => {
      registerAward(buildingAward);
      registerAward(buildingAward);
      expect(listAwards()).toHaveLength(1);
    });
  });

  // ─── clearAwardCache ──────────────────────────────────────────────

  describe('clearAwardCache()', () => {
    it('empties the cache', () => {
      registerAward(buildingAward);
      registerAward(hospitalityAward);
      expect(listAwards()).toHaveLength(2);
      clearAwardCache();
      expect(listAwards()).toEqual([]);
      expect(getAward('MA000003')).toBeUndefined();
      expect(getAward('MA000009')).toBeUndefined();
    });

    it('is safe to call on empty cache', () => {
      expect(() => clearAwardCache()).not.toThrow();
      expect(listAwards()).toEqual([]);
    });
  });

  // ─── validateAward ────────────────────────────────────────────────

  describe('validateAward()', () => {
    it('returns success for valid award data', () => {
      const result = validateAward(buildingAward);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('returns success for minimal valid award data (empty arrays, default supplement)', () => {
      const minimal = {
        code: 'MA000099',
        name: 'Minimal Award',
        awardFixedId: 99,
        publishedYear: '2024-25',
        lastModified: '2024-01-01T00:00:00',
        operativeFrom: '2024-01-01',
        operativeTo: null,
        classifications: [],
        penalties: [],
        wageAllowances: [],
        expenseAllowances: [],
        supplement: {},
      };
      const result = validateAward(minimal);
      expect(result.success).toBe(true);
    });

    it('returns errors for invalid data — missing required fields', () => {
      const invalid = { code: 'MA000003' };
      const result = validateAward(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('returns errors for invalid data — wrong field types', () => {
      const invalid = {
        ...buildingAward,
        awardFixedId: 'not-a-number',
      };
      const result = validateAward(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('returns errors for invalid nested classification data', () => {
      const invalid = {
        ...buildingAward,
        classifications: [{ classificationFixedId: 'bad' }],
      };
      const result = validateAward(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  // ─── loadAwardFromMAPD ────────────────────────────────────────────

  describe('loadAwardFromMAPD()', () => {
    it('loads, caches, and returns an award from a mock data source', async () => {
      const source = createMockDataSource(
        new Map([['MA000003', buildingAward]]),
      );

      const result = await loadAwardFromMAPD(source, 'MA000003');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('MA000003');
      expect(result?.name).toBe('Building and Construction General On-site Award 2020');

      // Should be cached
      const cached = getAward('MA000003');
      expect(cached).toBeDefined();
      expect(cached?.code).toBe('MA000003');
    });

    it('returns null and does not cache for unknown award code', async () => {
      const source = createMockDataSource(new Map());

      const result = await loadAwardFromMAPD(source, 'MA999999');
      expect(result).toBeNull();
      expect(getAward('MA999999')).toBeUndefined();
      expect(listAwards()).toEqual([]);
    });

    it('passes supplement to fetchCompleteAward', async () => {
      const source = createMockDataSource(
        new Map([['MA000003', buildingAward]]),
      );
      const supplement = {
        hoursProvisions: {
          ordinaryHoursPerWeek: 36,
          ordinaryHoursPerDay: 7.2,
          ordinaryDaysPerWeek: 5,
          dailyMaxOrdinary: null,
          weeklyMaxOrdinary: null,
          spanOfHours: { start: '07:00', end: '17:00' },
        },
      };

      const result = await loadAwardFromMAPD(source, 'MA000003', supplement);
      expect(result).not.toBeNull();
      // The supplement should be passed through to the assembled award
      expect(result?.supplement).toBeDefined();
    });

    it('calls all data source methods for a known award', async () => {
      const source = createMockDataSource(
        new Map([['MA000003', buildingAward]]),
      );

      await loadAwardFromMAPD(source, 'MA000003');

      expect(source.fetchAward).toHaveBeenCalledWith('MA000003');
      expect(source.fetchClassifications).toHaveBeenCalledWith('MA000003');
      expect(source.fetchPenalties).toHaveBeenCalledWith('MA000003');
      expect(source.fetchWageAllowances).toHaveBeenCalledWith('MA000003');
      expect(source.fetchExpenseAllowances).toHaveBeenCalledWith('MA000003');
    });

    it('only calls fetchAward for an unknown award (short-circuits)', async () => {
      const source = createMockDataSource(new Map());

      await loadAwardFromMAPD(source, 'MA999999');

      expect(source.fetchAward).toHaveBeenCalledWith('MA999999');
      expect(source.fetchClassifications).not.toHaveBeenCalled();
      expect(source.fetchPenalties).not.toHaveBeenCalled();
      expect(source.fetchWageAllowances).not.toHaveBeenCalled();
      expect(source.fetchExpenseAllowances).not.toHaveBeenCalled();
    });
  });

  // ─── Shared state ─────────────────────────────────────────────────

  describe('Registry is shared state', () => {
    it('award registered in one call is retrievable in another', () => {
      // Simulate one module registering
      registerAward(buildingAward);

      // Simulate another module retrieving
      const retrieved = getAward('MA000003');
      expect(retrieved).toBeDefined();
      expect(retrieved?.code).toBe('MA000003');
      expect(retrieved?.classifications).toHaveLength(1);
      expect(retrieved?.penalties).toHaveLength(1);
    });

    it('multiple modules can register and retrieve independently', () => {
      registerAward(buildingAward);
      registerAward(hospitalityAward);

      // Each award is independently retrievable
      const building = getAward('MA000003');
      const hospitality = getAward('MA000009');
      expect(building?.awardFixedId).toBe(3);
      expect(hospitality?.awardFixedId).toBe(9);
      expect(listAwards()).toHaveLength(2);
    });
  });
});
