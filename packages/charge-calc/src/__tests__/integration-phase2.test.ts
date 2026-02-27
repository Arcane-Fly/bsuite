import { describe, it, expect } from 'vitest';
import {
  // Awards pipeline
  fetchCompleteAward,
  awardToCalcConfig,
  registerAward,
  getAward,
  clearAwardCache,
  // Core
  calculate,
  // Boot
  compareBOOT,
  generateF17Data,
  detectFailurePatterns,
  generateRecommendations,
  // Types
  type MAPDDataSource,
  type MAPDClassification,
  type MAPDPenalty,
  type MAPDWageAllowance,
  type MAPDExpenseAllowance,
  type MAPDAward,
} from '../index';

// ─── Mock MAPD data source ───

const mockDataSource: MAPDDataSource = {
  async fetchAward(code: string): Promise<MAPDAward | null> {
    return {
      award_fixed_id: 1234,
      award_id: 5678,
      code,
      name: 'Test Award',
      award_operative_from: '2024-07-01',
      award_operative_to: null,
      published_year: '2024',
      version_number: 1,
      last_modified_datetime: '2024-07-01T00:00:00Z',
    };
  },
  async fetchClassifications(): Promise<MAPDClassification[]> {
    return [{
      classification_fixed_id: 100,
      award_fixed_id: 1234,
      classification: 'Level 1',
      parent_classification_name: null,
      classification_level: 1,
      employee_rate_type_code: 'AD',
      base_rate: 29.28,
      base_rate_type: 'Hourly',
      calculated_rate: 29.28,
      calculated_rate_type: 'Hourly',
      operative_from: '2024-07-01',
      operative_to: null,
      published_year: 2024,
      clauses: 'cl.15',
    }];
  },
  async fetchPenalties(): Promise<MAPDPenalty[]> {
    return [{
      penalty_fixed_id: 200,
      award_fixed_id: 1234,
      penalty_description: 'Saturday',
      rate: 150,
      penalty_calculated_value: 43.92,
      employee_rate_type_code: 'AD',
      operative_from: '2024-07-01',
      operative_to: null,
      clauses: 'cl.20',
      clause_description: 'Saturday penalty',
      classification_level: null,
      published_year: 2024,
    }];
  },
  async fetchWageAllowances(): Promise<MAPDWageAllowance[]> {
    return [{
      wage_allowance_fixed_id: 300,
      award_fixed_id: 1234,
      allowance: 'Industry Allowance',
      allowance_amount: 0.71,
      rate: null,
      rate_unit: null,
      payment_frequency: 'per hour',
      is_all_purpose: 1,
      parent_allowance: null,
      operative_from: '2024-07-01',
      operative_to: null,
      clauses: 'cl.25',
      published_year: 2024,
    }];
  },
  async fetchExpenseAllowances(): Promise<MAPDExpenseAllowance[]> {
    return [];
  },
};

// ─── Pipeline 1: MAPD -> AwardSchema -> CalcConfig -> calculate() ───

describe('Integration Phase 2: Full Pipelines', () => {
  it('full awards pipeline: MAPD -> AwardSchema -> CalcConfig -> calculate()', async () => {
    clearAwardCache();

    // Fetch and register award (with supplement defaults for converter)
    const award = await fetchCompleteAward(mockDataSource, 'MA000020', {
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
    });
    expect(award).toBeDefined();
    expect(award!.code).toBe('MA000020');
    expect(award!.classifications.length).toBeGreaterThan(0);

    // Register in cache
    registerAward(award!);
    expect(getAward('MA000020')).toBeDefined();

    // Convert to CalcConfig
    const calcConfig = awardToCalcConfig(award!, {
      awardCode: 'MA000020',
      classificationFixedId: 100,
      currentYear: 1,
    });
    expect(calcConfig.wage).toBe(29.28);

    // Run calculation
    const result = calculate(calcConfig);
    expect(result.quotedChargeRate).toBeGreaterThan(0);
    expect(result.totalAnnualCost).toBeGreaterThan(0);
  });

  // ─── Pipeline 2: Award + EA -> compareBOOT -> F17Data ───

  it('full BOOT pipeline: Award + EA -> compareBOOT -> F17Data', () => {
    // Use inline fixtures matching AwardSchedule type
    const award = {
      awardCode: 'MA000020',
      awardName: 'Test Award',
      classifications: [{
        classificationFixedId: 1,
        name: 'Level 1',
        terms: {
          baseHourlyRate: 29.28,
          casualLoading: 0.25,
          penaltyRates: {
            saturday: 1.5,
            sunday: 2.0,
            publicHoliday: 2.5,
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
        },
      }],
      nonMonetary: {
        ordinaryHoursPerWeek: 38,
        maxDailyOrdinaryHours: null,
        spanOfHours: { start: '06:00', end: '18:00' },
        rosteringNotice: null,
        minimumEngagementHours: null,
        mealBreakAfterHours: null,
        restBreakMinutes: null,
        consultationObligations: null,
        disputeResolution: null,
        noticeOfTermination: null,
      },
    };

    const ea = {
      agreementName: 'Test EA',
      lodgementDate: '2024-09-15',
      classifications: [{
        id: 'ea-1',
        name: 'EA Level 1',
        awardClassificationId: 1,
        terms: {
          baseHourlyRate: 33.00,
          casualLoading: 0.25,
          penaltyRates: {
            saturday: 1.5,
            sunday: 2.0,
            publicHoliday: 2.5,
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
        },
        loadedRate: null,
      }],
      nonMonetary: {
        ordinaryHoursPerWeek: 38,
        maxDailyOrdinaryHours: null,
        spanOfHours: { start: '06:00', end: '18:00' },
        rosteringNotice: null,
        minimumEngagementHours: null,
        mealBreakAfterHours: null,
        restBreakMinutes: null,
        consultationObligations: null,
        disputeResolution: null,
        noticeOfTermination: null,
      },
    };

    const scenarios = [{
      scenarioType: 'typical' as const,
      label: 'Standard Mon-Fri',
      employmentType: 'fullTime' as const,
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
    }];

    // Run BOOT comparison
    const bootResult = compareBOOT([award], ea, scenarios);
    expect(bootResult.overallVerdict).toBe('pass');
    expect(bootResult.humanReviewRequired).toBe(true);

    // Generate F17 data
    const f17 = generateF17Data(bootResult, ea);
    expect(f17.header.disclaimer).toContain('decision-support tool only');
    expect(f17.classifications.length).toBe(1);

    // Detect failure patterns (should be none for a pass)
    const patterns = detectFailurePatterns(bootResult, [award], ea, scenarios);

    // Generate recommendations
    const recommendations = generateRecommendations(bootResult, patterns);
    expect(recommendations).toBeDefined();
  });

  // ─── Test 3: All key exports accessible from package root ───

  it('all key exports are accessible from package root', () => {
    // Core
    expect(typeof calculate).toBe('function');
    expect(typeof awardToCalcConfig).toBe('function');

    // Awards
    expect(typeof fetchCompleteAward).toBe('function');
    expect(typeof registerAward).toBe('function');
    expect(typeof getAward).toBe('function');
    expect(typeof clearAwardCache).toBe('function');

    // BOOT
    expect(typeof compareBOOT).toBe('function');
    expect(typeof generateF17Data).toBe('function');
    expect(typeof detectFailurePatterns).toBe('function');
    expect(typeof generateRecommendations).toBe('function');
  });
});
