import { describe, it, expect } from 'vitest';
import { detectFailurePatterns, type FailurePattern, type FailurePatternCode } from '../../boot/failure-detector';
import type {
  BOOTResult,
  BOOTClassResult,
  BOOTScenarioResult,
  EATerms,
  AwardSchedule,
  RosterScenario,
  NonMonetaryDifference,
} from '../../boot/types';

// ─── Helpers: create minimal valid types with sensible defaults ───

function makeScenarioResult(overrides: Partial<BOOTScenarioResult> = {}): BOOTScenarioResult {
  return {
    scenarioType: 'typical',
    scenarioLabel: 'Standard 38hr week',
    awardAnnualValue: 61000,
    eaAnnualValue: 63000,
    difference: 2000,
    percentDiff: 3.28,
    verdict: 'pass',
    termBreakdown: [],
    ...overrides,
  };
}

function makeClassResult(overrides: Partial<BOOTClassResult> = {}): BOOTClassResult {
  return {
    classificationName: 'Level 1',
    awardClassificationId: 101,
    eaClassificationId: 'cls-1',
    scenarios: [makeScenarioResult()],
    nonMonetaryDifferences: [],
    overallVerdict: 'pass',
    worstScenario: null,
    bestDelta: 2000,
    worstDelta: 2000,
    ...overrides,
  };
}

function makeBOOTResult(overrides: Partial<BOOTResult> = {}): BOOTResult {
  return {
    overallVerdict: 'pass',
    classResults: [makeClassResult()],
    warnings: [],
    humanReviewRequired: true as const,
    assessedAt: '2026-02-27T10:00:00Z',
    engineVersion: '2.0.0',
    summary: {
      totalClasses: 1,
      passCount: 1,
      failCount: 0,
      marginalCount: 0,
      totalDelta: 2000,
    },
    ...overrides,
  };
}

function makeEATerms(overrides: Partial<EATerms> = {}): EATerms {
  return {
    agreementName: 'Test EA 2026',
    lodgementDate: '2026-01-15',
    classifications: [
      {
        id: 'cls-1',
        name: 'Level 1',
        awardClassificationId: 101,
        terms: {
          baseHourlyRate: 32,
          casualLoading: 0.25,
          penaltyRates: {
            saturday: 1.5,
            sunday: 2.0,
            publicHoliday: 2.5,
            overtime15x: 1.5,
            overtime2x: 2.0,
            nightShift: 1.3,
            afternoonShift: 1.15,
          },
          allowances: [
            { name: 'Tool', amount: 25, frequency: 'perWeek' as const, isAllPurpose: true },
          ],
          superRate: 0.12,
          leaveLoadingPercent: 17.5,
          annualLeaveDays: 20,
          personalLeaveDays: 10,
          redundancyWeeks: null,
        },
        loadedRate: null,
      },
    ],
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
    ...overrides,
  };
}

function makeAwardSchedule(overrides: Partial<AwardSchedule> = {}): AwardSchedule {
  return {
    awardCode: 'MA000020',
    awardName: 'Building Award',
    classifications: [
      {
        classificationFixedId: 101,
        name: 'CW/ECW Level 1',
        terms: {
          baseHourlyRate: 29.5,
          casualLoading: 0.25,
          penaltyRates: {
            saturday: 1.5,
            sunday: 2.0,
            publicHoliday: 2.5,
            overtime15x: 1.5,
            overtime2x: 2.0,
            nightShift: 1.3,
            afternoonShift: 1.15,
          },
          allowances: [
            { name: 'Tool', amount: 25, frequency: 'perWeek' as const, isAllPurpose: true },
          ],
          superRate: 0.12,
          leaveLoadingPercent: 17.5,
          annualLeaveDays: 20,
          personalLeaveDays: 10,
          redundancyWeeks: null,
        },
      },
    ],
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
    ...overrides,
  };
}

function makeRosterScenario(overrides: Partial<RosterScenario> = {}): RosterScenario {
  return {
    scenarioType: 'typical',
    label: 'Standard week',
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

function hasCode(patterns: FailurePattern[], code: FailurePatternCode): boolean {
  return patterns.some((p) => p.code === code);
}

function getPattern(patterns: FailurePattern[], code: FailurePatternCode): FailurePattern | undefined {
  return patterns.find((p) => p.code === code);
}

// ─── Tests ───

describe('detectFailurePatterns', () => {
  describe('1. higher_base_no_penalties', () => {
    it('detects when EA base > award base but penalty scenario fails', () => {
      // EA base = $35 > award base = $30, but penalty scenario fails
      const ea = makeEATerms({
        classifications: [{
          id: 'cls-1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 35,
            casualLoading: 0.25,
            penaltyRates: {
              saturday: null,    // No Saturday penalty -- this is the problem
              sunday: null,      // No Sunday penalty
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
          },
          loadedRate: null,
        }],
      });

      const award = makeAwardSchedule({
        classifications: [{
          classificationFixedId: 101,
          name: 'Level 1',
          terms: {
            baseHourlyRate: 30,
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
      });

      // A penalty scenario that fails
      const failingPenaltyScenario = makeScenarioResult({
        scenarioType: 'worstCase',
        scenarioLabel: 'Weekend penalty exposure',
        verdict: 'fail',
        difference: -2000,
        percentDiff: -3.1,
      });

      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          scenarios: [
            makeScenarioResult({ verdict: 'pass' }),
            failingPenaltyScenario,
          ],
          overallVerdict: 'fail',
        })],
      });

      const scenarios = [
        makeRosterScenario(),
        makeRosterScenario({
          scenarioType: 'worstCase',
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
        }),
      ];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'higher_base_no_penalties')).toBe(true);
      const pattern = getPattern(patterns, 'higher_base_no_penalties');
      expect(pattern?.severity).toBe('critical');
      expect(pattern?.affectedClasses).toContain('Level 1');
    });
  });

  describe('2. loaded_rate_insufficient', () => {
    it('detects when loaded rate does not cover all shift patterns', () => {
      // EA uses a loaded rate of $40, but night shift scenario fails
      const ea = makeEATerms({
        classifications: [{
          id: 'cls-1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 40,
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
          },
          loadedRate: 40,  // Has a loaded rate
        }],
      });

      const award = makeAwardSchedule();

      // Night shift scenario that fails
      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          scenarios: [
            makeScenarioResult({ verdict: 'pass' }),
            makeScenarioResult({
              scenarioType: 'worstCase',
              scenarioLabel: 'Night shift pattern',
              verdict: 'fail',
              difference: -1500,
              percentDiff: -2.3,
            }),
          ],
          overallVerdict: 'fail',
        })],
      });

      const scenarios = [makeRosterScenario()];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'loaded_rate_insufficient')).toBe(true);
      const pattern = getPattern(patterns, 'loaded_rate_insufficient');
      expect(pattern?.severity).toBe('critical');
    });
  });

  describe('3. casual_overlooked', () => {
    it('detects when no casual scenarios provided but award has casual provisions', () => {
      const ea = makeEATerms();

      // Award with casual loading (the default has casualLoading: 0.25)
      const award = makeAwardSchedule();

      const result = makeBOOTResult();

      // No casual scenario provided -- only fullTime
      const scenarios = [
        makeRosterScenario({ employmentType: 'fullTime' }),
        makeRosterScenario({ scenarioType: 'worstCase', employmentType: 'fullTime' }),
      ];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'casual_overlooked')).toBe(true);
      const pattern = getPattern(patterns, 'casual_overlooked');
      expect(pattern?.severity).toBe('warning');
    });
  });

  describe('4. allowances_absorbed_unproven', () => {
    it('detects when award has allowances that EA does not include', () => {
      // EA with no allowances
      const ea = makeEATerms({
        classifications: [{
          id: 'cls-1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 32,
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
            allowances: [],  // No allowances in EA
            superRate: 0.12,
            leaveLoadingPercent: 17.5,
            annualLeaveDays: 20,
            personalLeaveDays: 10,
            redundancyWeeks: null,
          },
          loadedRate: null,
        }],
      });

      // Award with 3 allowances
      const award = makeAwardSchedule({
        classifications: [{
          classificationFixedId: 101,
          name: 'Level 1',
          terms: {
            baseHourlyRate: 29.5,
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
            allowances: [
              { name: 'Tool', amount: 25, frequency: 'perWeek' as const, isAllPurpose: true },
              { name: 'Travel', amount: 0.95, frequency: 'perHour' as const, isAllPurpose: false },
              { name: 'First Aid', amount: 500, frequency: 'perAnnum' as const, isAllPurpose: false },
            ],
            superRate: 0.12,
            leaveLoadingPercent: 17.5,
            annualLeaveDays: 20,
            personalLeaveDays: 10,
            redundancyWeeks: null,
          },
        }],
      });

      const result = makeBOOTResult();
      const scenarios = [makeRosterScenario()];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'allowances_absorbed_unproven')).toBe(true);
      const pattern = getPattern(patterns, 'allowances_absorbed_unproven');
      expect(pattern?.severity).toBe('warning');
      expect(pattern?.details).toContain('3');
    });
  });

  describe('5. award_entitlements_omitted', () => {
    it('detects when fewer than 2 scenarios are provided', () => {
      const ea = makeEATerms();
      const award = makeAwardSchedule();
      const result = makeBOOTResult();

      // Only 1 scenario
      const scenarios = [makeRosterScenario()];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'award_entitlements_omitted')).toBe(true);
      const pattern = getPattern(patterns, 'award_entitlements_omitted');
      expect(pattern?.severity).toBe('warning');
    });
  });

  describe('6. stale_modelling', () => {
    it('detects when lodgement date is between April 1 and June 30', () => {
      const ea = makeEATerms({
        lodgementDate: '2026-04-15',
      });
      const award = makeAwardSchedule();
      const result = makeBOOTResult();
      const scenarios = [makeRosterScenario(), makeRosterScenario({ scenarioType: 'worstCase' })];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'stale_modelling')).toBe(true);
      const pattern = getPattern(patterns, 'stale_modelling');
      expect(pattern?.severity).toBe('info');
    });

    it('does not flag lodgement on July 1', () => {
      const ea = makeEATerms({ lodgementDate: '2026-07-01' });
      const award = makeAwardSchedule();
      const result = makeBOOTResult();
      const scenarios = [makeRosterScenario(), makeRosterScenario({ scenarioType: 'worstCase' })];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'stale_modelling')).toBe(false);
    });

    it('does not flag lodgement in January', () => {
      const ea = makeEATerms({ lodgementDate: '2026-01-15' });
      const award = makeAwardSchedule();
      const result = makeBOOTResult();
      const scenarios = [makeRosterScenario(), makeRosterScenario({ scenarioType: 'worstCase' })];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'stale_modelling')).toBe(false);
    });
  });

  describe('7. vague_all_inclusive', () => {
    it('detects when loaded rate set but no penalty scenarios modelled', () => {
      const ea = makeEATerms({
        classifications: [{
          id: 'cls-1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 45,
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
          },
          loadedRate: 45,
        }],
      });

      const award = makeAwardSchedule();
      const result = makeBOOTResult();

      // No penalty hours in any scenario
      const scenarios = [
        makeRosterScenario({
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
        }),
        makeRosterScenario({
          scenarioType: 'worstCase',
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
        }),
      ];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'vague_all_inclusive')).toBe(true);
      const pattern = getPattern(patterns, 'vague_all_inclusive');
      expect(pattern?.severity).toBe('critical');
    });
  });

  describe('8. non_monetary_offset_claimed', () => {
    it('detects when class fails monetarily but has "better" non-monetary differences', () => {
      const ea = makeEATerms();
      const award = makeAwardSchedule();

      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          overallVerdict: 'fail',
          scenarios: [makeScenarioResult({
            verdict: 'fail',
            difference: -3000,
            percentDiff: -4.5,
          })],
          nonMonetaryDifferences: [
            {
              term: 'Rostering flexibility',
              awardProvision: '7 days notice',
              eaProvision: '14 days notice',
              assessment: 'better',
              notes: null,
            },
            {
              term: 'RDOs',
              awardProvision: 'None',
              eaProvision: '1 per month',
              assessment: 'better',
              notes: null,
            },
          ] satisfies NonMonetaryDifference[],
          worstDelta: -3000,
        })],
      });

      const scenarios = [makeRosterScenario(), makeRosterScenario({ scenarioType: 'worstCase' })];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(hasCode(patterns, 'non_monetary_offset_claimed')).toBe(true);
      const pattern = getPattern(patterns, 'non_monetary_offset_claimed');
      expect(pattern?.severity).toBe('critical');
    });
  });

  describe('9. Clean result -- no patterns detected', () => {
    it('returns empty array when all pass with adequate modelling', () => {
      const ea = makeEATerms();
      const award = makeAwardSchedule();

      const result = makeBOOTResult({
        overallVerdict: 'pass',
        classResults: [makeClassResult({
          overallVerdict: 'pass',
          scenarios: [
            makeScenarioResult({ verdict: 'pass' }),
            makeScenarioResult({ scenarioType: 'worstCase', verdict: 'pass' }),
          ],
        })],
      });

      // Adequate scenarios: typical + worstCase + a casual one
      const scenarios = [
        makeRosterScenario({ employmentType: 'fullTime' }),
        makeRosterScenario({ scenarioType: 'worstCase', employmentType: 'fullTime' }),
        makeRosterScenario({ scenarioType: 'casualMinimum', employmentType: 'casual' }),
      ];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      expect(patterns).toEqual([]);
    });
  });

  describe('Pattern severity ordering', () => {
    it('returns critical patterns before warning patterns before info patterns', () => {
      // Create a scenario that triggers multiple patterns of different severities
      const ea = makeEATerms({
        lodgementDate: '2026-05-15', // stale_modelling (info)
        classifications: [{
          id: 'cls-1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 35,
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
          },
          loadedRate: null,
        }],
      });

      const award = makeAwardSchedule({
        classifications: [{
          classificationFixedId: 101,
          name: 'Level 1',
          terms: {
            baseHourlyRate: 30,
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
      });

      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          overallVerdict: 'fail',
          scenarios: [
            makeScenarioResult({ verdict: 'pass' }),
            makeScenarioResult({ scenarioType: 'worstCase', verdict: 'fail', difference: -2000 }),
          ],
        })],
      });

      // Only 1 scenario -- triggers award_entitlements_omitted (warning)
      const scenarios = [makeRosterScenario()];

      const patterns = detectFailurePatterns(result, [award], ea, scenarios);

      // At minimum we expect multiple patterns
      expect(patterns.length).toBeGreaterThanOrEqual(2);

      // Verify ordering: critical first, then warning, then info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      for (let i = 1; i < patterns.length; i++) {
        expect(severityOrder[patterns[i].severity]).toBeGreaterThanOrEqual(
          severityOrder[patterns[i - 1].severity],
        );
      }
    });
  });
});
