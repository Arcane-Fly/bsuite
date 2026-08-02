import { describe, it, expect } from 'vitest';
import { compareBOOT } from '../../boot/compare.js';
import { compareNonMonetary } from '../../boot/non-monetary.js';
import type {
  AwardSchedule,
  EATerms,
  RosterScenario,
  MonetaryTerms,
  NonMonetaryTerms,
} from '../../boot/types.js';

// ─── Shared Fixtures: Building Award MA000020 ───

/** Building Award CW/ECW Level 2 rates (realistic 2025/26) */
function makeAwardTerms(overrides: Partial<MonetaryTerms> = {}): MonetaryTerms {
  return {
    baseHourlyRate: 29.50,
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
    allowances: [],
    superRate: 0.12,
    leaveLoadingPercent: 17.5,
    annualLeaveDays: 20,
    personalLeaveDays: 10,
    redundancyWeeks: null,
    ...overrides,
  };
}

function makeAwardSchedule(
  classOverrides: Array<{
    classificationFixedId: number;
    name: string;
    terms?: Partial<MonetaryTerms>;
  }> = [{ classificationFixedId: 101, name: 'CW/ECW Level 2' }],
  nonMonetary?: Partial<NonMonetaryTerms>,
): AwardSchedule {
  return {
    awardCode: 'MA000020',
    awardName: 'Building and Construction General On-site Award',
    classifications: classOverrides.map((c) => ({
      classificationFixedId: c.classificationFixedId,
      name: c.name,
      terms: makeAwardTerms(c.terms),
    })),
    nonMonetary: {
      ordinaryHoursPerWeek: 38,
      maxDailyOrdinaryHours: 8,
      spanOfHours: { start: '06:00', end: '18:00' },
      rosteringNotice: '7 days',
      minimumEngagementHours: 4,
      mealBreakAfterHours: 5,
      restBreakMinutes: 10,
      consultationObligations: 'As per NES',
      disputeResolution: 'Internal then FWC',
      noticeOfTermination: '1-4 weeks based on service',
    },
    ...({} as Record<string, unknown>),
    ...(nonMonetary ? { nonMonetary: { ...makeAwardSchedule().nonMonetary, ...nonMonetary } } : {}),
  };
}

function makeEATerms(
  classifications: Array<{
    id: string;
    name: string;
    awardClassificationId: number;
    terms?: Partial<MonetaryTerms>;
    loadedRate?: number | null;
  }>,
  nonMonetary?: Partial<NonMonetaryTerms>,
): EATerms {
  return {
    agreementName: 'Test Construction EA 2025',
    lodgementDate: '2025-06-15',
    classifications: classifications.map((c) => ({
      id: c.id,
      name: c.name,
      awardClassificationId: c.awardClassificationId,
      terms: makeAwardTerms(c.terms),
      loadedRate: c.loadedRate ?? null,
    })),
    nonMonetary: {
      ordinaryHoursPerWeek: 38,
      maxDailyOrdinaryHours: 8,
      spanOfHours: { start: '06:00', end: '18:00' },
      rosteringNotice: '7 days',
      minimumEngagementHours: 4,
      mealBreakAfterHours: 5,
      restBreakMinutes: 10,
      consultationObligations: 'As per NES',
      disputeResolution: 'Internal then FWC',
      noticeOfTermination: '1-4 weeks based on service',
      ...(nonMonetary ?? {}),
    },
  };
}

function makeTypicalScenario(overrides: Partial<RosterScenario> = {}): RosterScenario {
  return {
    scenarioType: 'typical',
    label: 'Standard 38hr Mon-Fri',
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

function makeWorstCaseScenario(overrides: Partial<RosterScenario> = {}): RosterScenario {
  return {
    scenarioType: 'worstCase',
    label: 'Weekend + night shifts',
    employmentType: 'fullTime',
    ordinaryHoursPerWeek: 38,
    weeklyBreakdown: {
      ordinaryDay: 24,
      saturdayOrdinary: 6,
      sundayOrdinary: 4,
      publicHoliday: 0,
      overtime15x: 4,
      overtime2x: 0,
      nightShift: 4,
      afternoonShift: 0,
      casualLoading: 0,
    },
    weeksPerYear: 48,
    ...overrides,
  };
}

// ─── 1. Clear pass: EA rates clearly above award ───
describe('compareBOOT', () => {
  describe('1. Clear pass: EA rates clearly above award at all levels', () => {
    it('returns verdict = pass when EA base rate is significantly higher', () => {
      const award = makeAwardSchedule();
      // EA pays $35/hr vs award $29.50/hr (~18.6% above)
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 35.00 },
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.overallVerdict).toBe('pass');
      expect(result.classResults).toHaveLength(1);
      expect(result.classResults[0].overallVerdict).toBe('pass');
      expect(result.classResults[0].scenarios[0].verdict).toBe('pass');
      expect(result.classResults[0].scenarios[0].difference).toBeGreaterThan(0);
      expect(result.classResults[0].scenarios[0].percentDiff).toBeGreaterThan(5);
    });
  });

  // ─── 2. Clear fail: EA rates below award ───
  describe('2. Clear fail: EA rates below award', () => {
    it('returns verdict = fail when EA base rate is lower', () => {
      const award = makeAwardSchedule();
      // EA pays $27/hr vs award $29.50/hr
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 27.00 },
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.overallVerdict).toBe('fail');
      expect(result.classResults[0].overallVerdict).toBe('fail');
      expect(result.classResults[0].scenarios[0].verdict).toBe('fail');
      expect(result.classResults[0].scenarios[0].difference).toBeLessThan(0);
    });
  });

  // ─── 3. Marginal pass: EA is 3% better ───
  describe('3. Marginal pass: EA is within marginal threshold', () => {
    it('returns verdict = marginal when EA is only ~3% better', () => {
      const award = makeAwardSchedule();
      // EA pays $30.39/hr vs award $29.50/hr (~3.0% above)
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 30.39 },
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.overallVerdict).toBe('marginal');
      expect(result.classResults[0].overallVerdict).toBe('marginal');
      expect(result.classResults[0].scenarios[0].verdict).toBe('marginal');
      expect(result.classResults[0].scenarios[0].percentDiff).toBeGreaterThan(0);
      expect(result.classResults[0].scenarios[0].percentDiff).toBeLessThan(5);
    });
  });

  // ─── 4. Loaded rate pass: loaded rate covers all shift patterns ───
  describe('4. Loaded rate pass: loaded rate covers all penalties', () => {
    it('returns verdict = pass when loaded rate exceeds award total', () => {
      const award = makeAwardSchedule();
      // Loaded rate of $55/hr should easily cover $29.50 + penalties for typical scenario
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          loadedRate: 55.00,
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.overallVerdict).toBe('pass');
      expect(result.classResults[0].overallVerdict).toBe('pass');
      expect(result.classResults[0].scenarios[0].eaAnnualValue).toBeGreaterThan(
        result.classResults[0].scenarios[0].awardAnnualValue,
      );
    });
  });

  // ─── 5. Loaded rate fail: loaded rate insufficient for night shifts ───
  describe('5. Loaded rate fail: insufficient for penalty-heavy roster', () => {
    it('returns verdict = fail when loaded rate cannot cover penalties', () => {
      const award = makeAwardSchedule();
      // Loaded rate of $32/hr -- marginal, will fail on penalty-heavy scenarios
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          loadedRate: 32.00,
        },
      ]);
      const scenarios = [makeWorstCaseScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.overallVerdict).toBe('fail');
      expect(result.classResults[0].overallVerdict).toBe('fail');
      expect(result.classResults[0].scenarios[0].verdict).toBe('fail');
    });
  });

  // ─── 6. Multi-scenario: passes typical, fails worst-case ───
  describe('6. Multi-scenario: passes typical, fails worst-case => overall fail', () => {
    it('overall fails when any scenario fails', () => {
      const award = makeAwardSchedule();
      // EA pays $31/hr base but has NO penalty rates -- passes typical (Mon-Fri)
      // but fails worst-case because award penalties make award worth more
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 31.00,
            penaltyRates: {
              saturday: null,    // No Saturday penalty (award has 1.5x)
              sunday: null,      // No Sunday penalty (award has 2.0x)
              publicHoliday: null, // No PH penalty (award has 2.5x)
              overtime15x: 1.5,
              overtime2x: 2.0,
              nightShift: null,  // No night shift loading (award has 1.3x)
              afternoonShift: null,
            },
          },
        },
      ]);
      const scenarios = [makeTypicalScenario(), makeWorstCaseScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.overallVerdict).toBe('fail');
      expect(result.classResults[0].overallVerdict).toBe('fail');

      // Typical scenario should pass (same penalties, higher base)
      const typical = result.classResults[0].scenarios.find(
        (s) => s.scenarioType === 'typical',
      );
      expect(typical).toBeDefined();
      expect(typical!.verdict).not.toBe('fail');

      // Worst case should fail (penalties make award worth more)
      const worstCase = result.classResults[0].scenarios.find(
        (s) => s.scenarioType === 'worstCase',
      );
      expect(worstCase).toBeDefined();
      expect(worstCase!.verdict).toBe('fail');
    });
  });

  // ─── 7. Multi-award matching: correct award classification matching ───
  describe('7. Multi-award matching: EA classification matches correct award classification', () => {
    it('matches EA classification to award classification by ID', () => {
      const award = makeAwardSchedule([
        { classificationFixedId: 101, name: 'CW/ECW Level 1', terms: { baseHourlyRate: 27.50 } },
        { classificationFixedId: 102, name: 'CW/ECW Level 2', terms: { baseHourlyRate: 29.50 } },
        { classificationFixedId: 103, name: 'CW/ECW Level 3', terms: { baseHourlyRate: 31.00 } },
      ]);
      const ea = makeEATerms([
        {
          id: 'ea-lvl1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 30.00 }, // above 27.50
        },
        {
          id: 'ea-lvl3',
          name: 'Level 3',
          awardClassificationId: 103,
          terms: { baseHourlyRate: 34.00 }, // above 31.00
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.classResults).toHaveLength(2);

      // Level 1: EA $30 vs Award $27.50 => pass
      const lvl1 = result.classResults.find((c) => c.eaClassificationId === 'ea-lvl1');
      expect(lvl1).toBeDefined();
      expect(lvl1!.awardClassificationId).toBe(101);
      expect(lvl1!.overallVerdict).toBe('pass');

      // Level 3: EA $34 vs Award $31 => pass
      const lvl3 = result.classResults.find((c) => c.eaClassificationId === 'ea-lvl3');
      expect(lvl3).toBeDefined();
      expect(lvl3!.awardClassificationId).toBe(103);
      expect(lvl3!.overallVerdict).toBe('pass');

      expect(result.overallVerdict).toBe('pass');
    });

    it('produces indeterminate for unmatched EA classification', () => {
      const award = makeAwardSchedule([
        { classificationFixedId: 101, name: 'CW/ECW Level 1' },
      ]);
      // EA has classification ID 999 which doesn't exist in award
      const ea = makeEATerms([
        {
          id: 'ea-missing',
          name: 'Missing Level',
          awardClassificationId: 999,
          terms: { baseHourlyRate: 35.00 },
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.classResults).toHaveLength(1);
      expect(result.classResults[0].overallVerdict).toBe('indeterminate');
    });
  });

  // ─── 8. Non-monetary: detects worse provisions ───
  describe('8. Non-monetary: detects worse hours provisions, missing minimum engagement', () => {
    it('detects non-monetary detriments', () => {
      const awardNonMonetary: NonMonetaryTerms = {
        ordinaryHoursPerWeek: 38,
        maxDailyOrdinaryHours: 8,
        spanOfHours: { start: '06:00', end: '18:00' },
        rosteringNotice: '7 days',
        minimumEngagementHours: 4,
        mealBreakAfterHours: 5,
        restBreakMinutes: 10,
        consultationObligations: 'As per NES',
        disputeResolution: 'Internal then FWC',
        noticeOfTermination: '1-4 weeks based on service',
      };

      const eaNonMonetary: NonMonetaryTerms = {
        ordinaryHoursPerWeek: 40, // worse: more hours
        maxDailyOrdinaryHours: 12, // worse: longer days
        spanOfHours: { start: '05:00', end: '20:00' }, // worse: wider span
        rosteringNotice: '3 days', // worse: less notice
        minimumEngagementHours: null, // missing
        mealBreakAfterHours: 6, // worse: longer before break
        restBreakMinutes: 10, // equivalent
        consultationObligations: 'As per NES', // equivalent
        disputeResolution: 'Internal then FWC', // equivalent
        noticeOfTermination: '1-4 weeks based on service', // equivalent
      };

      const differences = compareNonMonetary(awardNonMonetary, eaNonMonetary);

      // Should detect worse ordinary hours
      const hoursComp = differences.find((d) => d.term === 'Ordinary hours per week');
      expect(hoursComp).toBeDefined();
      expect(hoursComp!.assessment).toBe('worse');

      // Should detect worse max daily hours
      const dailyComp = differences.find((d) => d.term === 'Max daily ordinary hours');
      expect(dailyComp).toBeDefined();
      expect(dailyComp!.assessment).toBe('worse');

      // Should detect wider span as worse
      const spanComp = differences.find((d) => d.term === 'Span of hours');
      expect(spanComp).toBeDefined();
      expect(spanComp!.assessment).toBe('worse');

      // Should detect missing minimum engagement
      const minEng = differences.find((d) => d.term === 'Minimum engagement hours');
      expect(minEng).toBeDefined();
      expect(minEng!.assessment).toBe('missing');

      // Rest breaks should be equivalent
      const restBreak = differences.find((d) => d.term === 'Rest break minutes');
      expect(restBreak).toBeDefined();
      expect(restBreak!.assessment).toBe('equivalent');
    });
  });

  // ─── 9. Warnings generated ───
  describe('9. Warnings generated: appropriate warnings for detected issues', () => {
    it('generates warning when a scenario is marginal', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 30.39 }, // ~3% above
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.warnings.length).toBeGreaterThan(0);
      const marginalWarning = result.warnings.find((w) => w.code === 'MARGINAL_PASS');
      expect(marginalWarning).toBeDefined();
      expect(marginalWarning!.severity).toBe('warning');
    });

    it('generates warning when classification is unmatched', () => {
      const award = makeAwardSchedule([
        { classificationFixedId: 101, name: 'CW/ECW Level 1' },
      ]);
      const ea = makeEATerms([
        {
          id: 'ea-missing',
          name: 'Missing Level',
          awardClassificationId: 999,
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      const unmatchedWarning = result.warnings.find((w) => w.code === 'UNMATCHED_CLASSIFICATION');
      expect(unmatchedWarning).toBeDefined();
      expect(unmatchedWarning!.severity).toBe('critical');
    });

    it('generates warning when any scenario fails', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 27.00 }, // below award
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      const failWarning = result.warnings.find((w) => w.code === 'BOOT_FAIL');
      expect(failWarning).toBeDefined();
      expect(failWarning!.severity).toBe('critical');
    });

    it('generates warning for non-monetary detriments', () => {
      const award = makeAwardSchedule(
        [{ classificationFixedId: 101, name: 'CW/ECW Level 2' }],
      );
      const ea = makeEATerms(
        [
          {
            id: 'ea-lvl2',
            name: 'Level 2',
            awardClassificationId: 101,
            terms: { baseHourlyRate: 35.00 },
          },
        ],
        {
          ordinaryHoursPerWeek: 42, // worse
          minimumEngagementHours: null, // missing when award has it
        },
      );
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      const nmWarning = result.warnings.find((w) => w.code === 'NON_MONETARY_DETRIMENT');
      expect(nmWarning).toBeDefined();
      expect(nmWarning!.severity).toBe('warning');
    });
  });

  // ─── 10. humanReviewRequired is always true ───
  describe('10. humanReviewRequired is always true', () => {
    it('is true for a pass result', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 40.00 },
        },
      ]);
      const result = compareBOOT([award], ea, [makeTypicalScenario()]);
      expect(result.humanReviewRequired).toBe(true);
    });

    it('is true for a fail result', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 25.00 },
        },
      ]);
      const result = compareBOOT([award], ea, [makeTypicalScenario()]);
      expect(result.humanReviewRequired).toBe(true);
    });

    it('is true for a marginal result', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 30.39 },
        },
      ]);
      const result = compareBOOT([award], ea, [makeTypicalScenario()]);
      expect(result.humanReviewRequired).toBe(true);
    });

    it('is true for an indeterminate result', () => {
      const award = makeAwardSchedule([
        { classificationFixedId: 101, name: 'CW/ECW Level 1' },
      ]);
      const ea = makeEATerms([
        {
          id: 'ea-missing',
          name: 'Missing',
          awardClassificationId: 999,
        },
      ]);
      const result = compareBOOT([award], ea, [makeTypicalScenario()]);
      expect(result.humanReviewRequired).toBe(true);
    });
  });

  // ─── Additional structural checks ───
  describe('Result structure', () => {
    it('includes summary with correct counts', () => {
      const award = makeAwardSchedule([
        { classificationFixedId: 101, name: 'CW/ECW Level 1', terms: { baseHourlyRate: 27.50 } },
        { classificationFixedId: 102, name: 'CW/ECW Level 2', terms: { baseHourlyRate: 29.50 } },
      ]);
      const ea = makeEATerms([
        {
          id: 'ea-lvl1',
          name: 'Level 1',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 35.00 }, // clear pass
        },
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 102,
          terms: { baseHourlyRate: 25.00 }, // clear fail
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const result = compareBOOT([award], ea, scenarios);

      expect(result.summary.totalClasses).toBe(2);
      expect(result.summary.passCount).toBe(1);
      expect(result.summary.failCount).toBe(1);
      expect(result.summary.marginalCount).toBe(0);
      expect(result.overallVerdict).toBe('fail');
    });

    it('includes engineVersion and assessedAt', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 35.00 },
        },
      ]);

      const result = compareBOOT([award], ea, [makeTypicalScenario()]);

      expect(result.engineVersion).toBe('2.0.0');
      expect(result.assessedAt).toBeTruthy();
    });

    it('term breakdown contains expected components', () => {
      const award = makeAwardSchedule();
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 35.00 },
        },
      ]);

      const result = compareBOOT([award], ea, [makeWorstCaseScenario()]);

      const breakdown = result.classResults[0].scenarios[0].termBreakdown;
      const termNames = breakdown.map((t) => t.term);

      expect(termNames).toContain('basePay');
      expect(termNames).toContain('saturdayPenalty');
      expect(termNames).toContain('sundayPenalty');
      expect(termNames).toContain('publicHolidayPenalty');
      expect(termNames).toContain('overtime15x');
      expect(termNames).toContain('overtime2x');
      expect(termNames).toContain('nightShiftLoading');
      expect(termNames).toContain('afternoonShiftLoading');
      expect(termNames).toContain('casualLoading');
      expect(termNames).toContain('allowances');
      expect(termNames).toContain('leaveLoading');
      expect(termNames).toContain('superannuation');
    });

    it('bestDelta and worstDelta are set correctly', () => {
      const award = makeAwardSchedule();
      // EA has higher base but NO penalty rates -- passes typical, fails worst-case
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: {
            baseHourlyRate: 31.00,
            penaltyRates: {
              saturday: null,
              sunday: null,
              publicHoliday: null,
              overtime15x: 1.5,
              overtime2x: 2.0,
              nightShift: null,
              afternoonShift: null,
            },
          },
        },
      ]);

      const result = compareBOOT([award], ea, [makeTypicalScenario(), makeWorstCaseScenario()]);

      const classResult = result.classResults[0];
      expect(classResult.bestDelta).toBeGreaterThan(classResult.worstDelta);
      // worstDelta should be the most negative (worst-case scenario)
      expect(classResult.worstDelta).toBeLessThan(0);
    });
  });

  // ─── Custom marginal config ───
  describe('Custom marginal config', () => {
    it('uses custom marginalThreshold', () => {
      const award = makeAwardSchedule();
      // EA pays ~3% above. Default 5% threshold => marginal. 2% threshold => pass.
      const ea = makeEATerms([
        {
          id: 'ea-lvl2',
          name: 'Level 2',
          awardClassificationId: 101,
          terms: { baseHourlyRate: 30.39 },
        },
      ]);
      const scenarios = [makeTypicalScenario()];

      const resultDefault = compareBOOT([award], ea, scenarios);
      expect(resultDefault.overallVerdict).toBe('marginal');

      const resultCustom = compareBOOT([award], ea, scenarios, { marginalThreshold: 0.02 });
      expect(resultCustom.overallVerdict).toBe('pass');
    });
  });
});

// ─── Non-monetary comparison standalone tests ───
describe('compareNonMonetary', () => {
  it('returns equivalent for identical terms', () => {
    const terms: NonMonetaryTerms = {
      ordinaryHoursPerWeek: 38,
      maxDailyOrdinaryHours: 8,
      spanOfHours: { start: '06:00', end: '18:00' },
      rosteringNotice: '7 days',
      minimumEngagementHours: 4,
      mealBreakAfterHours: 5,
      restBreakMinutes: 10,
      consultationObligations: 'As per NES',
      disputeResolution: 'Internal then FWC',
      noticeOfTermination: '4 weeks',
    };

    const diffs = compareNonMonetary(terms, terms);

    for (const d of diffs) {
      expect(d.assessment).toBe('equivalent');
    }
  });

  it('detects better EA provisions', () => {
    const award: NonMonetaryTerms = {
      ordinaryHoursPerWeek: 38,
      maxDailyOrdinaryHours: 10,
      spanOfHours: { start: '06:00', end: '18:00' },
      rosteringNotice: '3 days',
      minimumEngagementHours: 3,
      mealBreakAfterHours: 6,
      restBreakMinutes: 8,
      consultationObligations: null,
      disputeResolution: null,
      noticeOfTermination: null,
    };

    const ea: NonMonetaryTerms = {
      ordinaryHoursPerWeek: 36, // better: fewer hours
      maxDailyOrdinaryHours: 8, // better: shorter days
      spanOfHours: { start: '07:00', end: '17:00' }, // better: narrower span
      rosteringNotice: '7 days', // better: more notice
      minimumEngagementHours: 4, // better: higher minimum
      mealBreakAfterHours: 4, // better: sooner break
      restBreakMinutes: 15, // better: longer rest
      consultationObligations: 'Enhanced consultation', // better: present when absent
      disputeResolution: 'Multi-step resolution', // better: present when absent
      noticeOfTermination: '4 weeks', // better: present when absent
    };

    const diffs = compareNonMonetary(award, ea);

    const hoursComp = diffs.find((d) => d.term === 'Ordinary hours per week');
    expect(hoursComp!.assessment).toBe('better');

    const dailyComp = diffs.find((d) => d.term === 'Max daily ordinary hours');
    expect(dailyComp!.assessment).toBe('better');

    const spanComp = diffs.find((d) => d.term === 'Span of hours');
    expect(spanComp!.assessment).toBe('better');

    const rosterComp = diffs.find((d) => d.term === 'Rostering notice');
    expect(rosterComp!.assessment).toBe('better');

    const minEngComp = diffs.find((d) => d.term === 'Minimum engagement hours');
    expect(minEngComp!.assessment).toBe('better');

    const mealComp = diffs.find((d) => d.term === 'Meal break after hours');
    expect(mealComp!.assessment).toBe('better');

    const restComp = diffs.find((d) => d.term === 'Rest break minutes');
    expect(restComp!.assessment).toBe('better');
  });

  it('handles both null values as equivalent', () => {
    const terms: NonMonetaryTerms = {
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
    };

    const diffs = compareNonMonetary(terms, terms);

    for (const d of diffs) {
      expect(d.assessment).toBe('equivalent');
    }
  });

  it('detects missing EA provision when award has one', () => {
    const award: NonMonetaryTerms = {
      ordinaryHoursPerWeek: 38,
      maxDailyOrdinaryHours: 8,
      spanOfHours: { start: '06:00', end: '18:00' },
      rosteringNotice: '7 days',
      minimumEngagementHours: 4,
      mealBreakAfterHours: 5,
      restBreakMinutes: 10,
      consultationObligations: 'Must consult',
      disputeResolution: 'Internal then FWC',
      noticeOfTermination: '4 weeks',
    };

    const ea: NonMonetaryTerms = {
      ordinaryHoursPerWeek: 38,
      maxDailyOrdinaryHours: null, // missing
      spanOfHours: { start: '06:00', end: '18:00' },
      rosteringNotice: null, // missing
      minimumEngagementHours: null, // missing
      mealBreakAfterHours: null, // missing
      restBreakMinutes: null, // missing
      consultationObligations: null, // missing
      disputeResolution: null, // missing
      noticeOfTermination: null, // missing
    };

    const diffs = compareNonMonetary(award, ea);

    const maxDaily = diffs.find((d) => d.term === 'Max daily ordinary hours');
    expect(maxDaily!.assessment).toBe('missing');

    const roster = diffs.find((d) => d.term === 'Rostering notice');
    expect(roster!.assessment).toBe('missing');

    const minEng = diffs.find((d) => d.term === 'Minimum engagement hours');
    expect(minEng!.assessment).toBe('missing');
  });
});
