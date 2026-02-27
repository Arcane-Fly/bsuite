import { describe, it, expect } from 'vitest';
import { compareBOOT } from '../../boot/compare';
import type {
  AwardSchedule,
  EATerms,
  RosterScenario,
  MonetaryTerms,
  NonMonetaryTerms,
  BOOTResult,
} from '../../boot/types';
import { BUILDING_AWARD } from './fixtures/building-award';

// ─── Helper: Convert AwardSchedule to EATerms with identical terms ───

/**
 * Creates an EATerms object with terms identical to the award schedule.
 * Used for self-comparison invariant: comparing an award against itself
 * should produce exact zero differences.
 */
function awardToIdenticalEA(award: AwardSchedule): EATerms {
  return {
    agreementName: `${award.awardName} (mirror EA)`,
    lodgementDate: '2026-01-15',
    classifications: award.classifications.map((cls, idx) => ({
      id: `mirror-${cls.classificationFixedId}`,
      name: cls.name,
      awardClassificationId: cls.classificationFixedId,
      terms: { ...cls.terms },
      loadedRate: null,
    })),
    nonMonetary: { ...award.nonMonetary },
  };
}

/**
 * Create an EA from an award with all monetary terms scaled up by a factor.
 * Used to test the "better EA always passes" invariant.
 */
function awardToScaledEA(
  award: AwardSchedule,
  baseFactor: number,
): EATerms {
  return {
    agreementName: `${award.awardName} (scaled EA)`,
    lodgementDate: '2026-01-15',
    classifications: award.classifications.map((cls) => ({
      id: `scaled-${cls.classificationFixedId}`,
      name: cls.name,
      awardClassificationId: cls.classificationFixedId,
      terms: {
        ...cls.terms,
        baseHourlyRate: cls.terms.baseHourlyRate * baseFactor,
        // Penalty multipliers stay the same or higher -- so scaled EA is always better
      },
      loadedRate: null,
    })),
    nonMonetary: { ...award.nonMonetary },
  };
}

/**
 * Create an EA from an award with an extra allowance added.
 */
function awardToEAWithExtraAllowance(
  award: AwardSchedule,
  extraAllowance: MonetaryTerms['allowances'][number],
): EATerms {
  return {
    agreementName: `${award.awardName} (extra allowance EA)`,
    lodgementDate: '2026-01-15',
    classifications: award.classifications.map((cls) => ({
      id: `allow-${cls.classificationFixedId}`,
      name: cls.name,
      awardClassificationId: cls.classificationFixedId,
      terms: {
        ...cls.terms,
        allowances: [...cls.terms.allowances, extraAllowance],
      },
      loadedRate: null,
    })),
    nonMonetary: { ...award.nonMonetary },
  };
}

// ─── Standard Scenarios for invariant tests ───

const TYPICAL_SCENARIO: RosterScenario = {
  scenarioType: 'typical',
  label: 'Standard Mon-Fri',
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
};

const WORST_CASE_SCENARIO: RosterScenario = {
  scenarioType: 'worstCase',
  label: 'Max Penalty Exposure',
  employmentType: 'fullTime',
  ordinaryHoursPerWeek: 38,
  weeklyBreakdown: {
    ordinaryDay: 24,
    saturdayOrdinary: 6,
    sundayOrdinary: 4,
    publicHoliday: 4,
    overtime15x: 3,
    overtime2x: 2,
    nightShift: 4,
    afternoonShift: 4,
    casualLoading: 0,
  },
  weeksPerYear: 48,
};

const ALL_SCENARIOS: RosterScenario[] = [TYPICAL_SCENARIO, WORST_CASE_SCENARIO];

// ─── Invariant Tests ───

describe('BOOT Property-Based Invariants', () => {
  // 1. Self-comparison: Award compared against itself
  describe('Invariant 1: Self-comparison', () => {
    it('award compared against itself produces exact pass with all differences = 0', () => {
      const mirrorEA = awardToIdenticalEA(BUILDING_AWARD);
      const result = compareBOOT([BUILDING_AWARD], mirrorEA, ALL_SCENARIOS);

      // Overall verdict should be marginal (0% difference is within 0-5% marginal band)
      // or pass. Since difference is exactly 0 and 0 >= 0 and 0 < 5, it's 'marginal'.
      expect(['pass', 'marginal']).toContain(result.overallVerdict);

      for (const cr of result.classResults) {
        expect(['pass', 'marginal']).toContain(cr.overallVerdict);

        for (const s of cr.scenarios) {
          // Difference should be exactly 0
          expect(s.difference).toBe(0);
          expect(s.percentDiff).toBe(0);
          expect(s.awardAnnualValue).toBe(s.eaAnnualValue);

          // Each term in the breakdown should have 0 difference
          for (const term of s.termBreakdown) {
            expect(term.difference).toBe(0);
            expect(term.awardValue).toBe(term.eaValue);
          }
        }

        // Best and worst delta should both be 0
        expect(cr.bestDelta).toBe(0);
        expect(cr.worstDelta).toBe(0);
      }
    });
  });

  // 2. Better EA always passes
  describe('Invariant 2: Better EA always passes', () => {
    it.each([1.05, 1.10, 1.20, 1.50, 2.0])(
      'EA with base rate scaled by %sx never fails',
      (factor) => {
        const betterEA = awardToScaledEA(BUILDING_AWARD, factor);
        const result = compareBOOT([BUILDING_AWARD], betterEA, ALL_SCENARIOS);

        // Should never fail -- either pass or marginal (for tiny factors)
        expect(result.overallVerdict).not.toBe('fail');

        for (const cr of result.classResults) {
          expect(cr.overallVerdict).not.toBe('fail');

          for (const s of cr.scenarios) {
            expect(s.verdict).not.toBe('fail');
            expect(s.difference).toBeGreaterThanOrEqual(0);
          }
        }
      },
    );
  });

  // 3. Adding allowance improves position
  describe('Invariant 3: Adding allowance improves position', () => {
    it('EA with extra allowance scores higher than EA without', () => {
      const baseEA = awardToIdenticalEA(BUILDING_AWARD);
      const extraAllowanceEA = awardToEAWithExtraAllowance(BUILDING_AWARD, {
        name: 'Site Productivity Bonus',
        amount: 1.50,
        frequency: 'perHour',
        isAllPurpose: false,
      });

      const baseResult = compareBOOT([BUILDING_AWARD], baseEA, ALL_SCENARIOS);
      const bonusResult = compareBOOT(
        [BUILDING_AWARD],
        extraAllowanceEA,
        ALL_SCENARIOS,
      );

      // For each classification and scenario, the bonus EA should have a higher (or equal) delta
      for (let i = 0; i < baseResult.classResults.length; i++) {
        const baseCR = baseResult.classResults[i];
        const bonusCR = bonusResult.classResults[i];

        for (let j = 0; j < baseCR.scenarios.length; j++) {
          const baseSR = baseCR.scenarios[j];
          const bonusSR = bonusCR.scenarios[j];

          expect(bonusSR.difference).toBeGreaterThan(baseSR.difference);
          expect(bonusSR.eaAnnualValue).toBeGreaterThan(baseSR.eaAnnualValue);
        }

        // Best and worst deltas should also be higher
        expect(bonusCR.bestDelta).toBeGreaterThan(baseCR.bestDelta);
        expect(bonusCR.worstDelta).toBeGreaterThan(baseCR.worstDelta);
      }
    });
  });

  // 4. humanReviewRequired always true
  describe('Invariant 4: humanReviewRequired always true', () => {
    it('is true regardless of verdict', () => {
      // Test with multiple different EAs producing different verdicts
      const passingEA = awardToScaledEA(BUILDING_AWARD, 1.20);
      const identicalEA = awardToIdenticalEA(BUILDING_AWARD);

      const passResult = compareBOOT(
        [BUILDING_AWARD],
        passingEA,
        ALL_SCENARIOS,
      );
      const marginalResult = compareBOOT(
        [BUILDING_AWARD],
        identicalEA,
        ALL_SCENARIOS,
      );

      // Create a failing EA (low base, no penalties)
      const failingEA: EATerms = {
        agreementName: 'Invariant Fail EA',
        lodgementDate: '2026-01-15',
        classifications: [
          {
            id: 'inv-fail-1',
            name: 'Level 1',
            awardClassificationId: 201,
            terms: {
              baseHourlyRate: 25.00,
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
      };

      const failResult = compareBOOT(
        [BUILDING_AWARD],
        failingEA,
        ALL_SCENARIOS,
      );

      expect(passResult.humanReviewRequired).toBe(true);
      expect(marginalResult.humanReviewRequired).toBe(true);
      expect(failResult.humanReviewRequired).toBe(true);
    });
  });

  // 5. Summary counts consistent
  describe('Invariant 5: Summary counts consistent', () => {
    it('pass + fail + marginal + indeterminate = totalClasses', () => {
      // Test with various EA configs that produce different mixes of verdicts
      const testCases: Array<{
        label: string;
        ea: EATerms;
        scenarios: RosterScenario[];
      }> = [
        {
          label: 'all pass',
          ea: awardToScaledEA(BUILDING_AWARD, 1.20),
          scenarios: ALL_SCENARIOS,
        },
        {
          label: 'all marginal',
          ea: awardToIdenticalEA(BUILDING_AWARD),
          scenarios: ALL_SCENARIOS,
        },
        {
          label: 'mixed (with unmatched)',
          ea: {
            agreementName: 'Mixed EA',
            lodgementDate: '2026-01-15',
            classifications: [
              {
                id: 'mix-1',
                name: 'Level 1',
                awardClassificationId: 201,
                terms: {
                  ...BUILDING_AWARD.classifications[0].terms,
                  baseHourlyRate: 40.00,
                },
                loadedRate: null,
              },
              {
                // This one maps to a non-existent award classification
                id: 'mix-unknown',
                name: 'Unknown Level',
                awardClassificationId: 999,
                terms: {
                  ...BUILDING_AWARD.classifications[0].terms,
                  baseHourlyRate: 50.00,
                },
                loadedRate: null,
              },
            ],
            nonMonetary: { ...BUILDING_AWARD.nonMonetary },
          },
          scenarios: ALL_SCENARIOS,
        },
      ];

      for (const tc of testCases) {
        const result = compareBOOT([BUILDING_AWARD], tc.ea, tc.scenarios);

        const { totalClasses, passCount, failCount, marginalCount } =
          result.summary;

        // Count indeterminate from classResults since summary doesn't track it separately
        const indeterminateCount = result.classResults.filter(
          (cr) => cr.overallVerdict === 'indeterminate',
        ).length;

        expect(
          passCount + failCount + marginalCount + indeterminateCount,
        ).toBe(totalClasses);

        // Also verify counts match actual classResults
        expect(
          result.classResults.filter((cr) => cr.overallVerdict === 'pass')
            .length,
        ).toBe(passCount);
        expect(
          result.classResults.filter((cr) => cr.overallVerdict === 'fail')
            .length,
        ).toBe(failCount);
        expect(
          result.classResults.filter((cr) => cr.overallVerdict === 'marginal')
            .length,
        ).toBe(marginalCount);
      }
    });
  });

  // 6. Worst delta <= best delta
  describe('Invariant 6: worstDelta <= bestDelta', () => {
    it('holds for every class result across various scenarios', () => {
      const testEAs: Array<{ label: string; ea: EATerms }> = [
        { label: 'passing', ea: awardToScaledEA(BUILDING_AWARD, 1.20) },
        { label: 'identical', ea: awardToIdenticalEA(BUILDING_AWARD) },
        {
          label: 'failing (no penalties)',
          ea: {
            agreementName: 'No Penalty EA',
            lodgementDate: '2026-01-15',
            classifications: BUILDING_AWARD.classifications.map((cls) => ({
              id: `nopen-${cls.classificationFixedId}`,
              name: cls.name,
              awardClassificationId: cls.classificationFixedId,
              terms: {
                ...cls.terms,
                baseHourlyRate: cls.terms.baseHourlyRate + 2,
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
              loadedRate: null,
            })),
            nonMonetary: { ...BUILDING_AWARD.nonMonetary },
          },
        },
      ];

      for (const { label, ea } of testEAs) {
        const result = compareBOOT([BUILDING_AWARD], ea, ALL_SCENARIOS);

        for (const cr of result.classResults) {
          expect(cr.worstDelta).toBeLessThanOrEqual(cr.bestDelta);
        }
      }
    });

    it('holds for single-scenario results where worst = best', () => {
      const ea = awardToScaledEA(BUILDING_AWARD, 1.10);
      const result = compareBOOT([BUILDING_AWARD], ea, [TYPICAL_SCENARIO]);

      for (const cr of result.classResults) {
        // With only one scenario, worst and best delta should be equal
        expect(cr.worstDelta).toBe(cr.bestDelta);
      }
    });
  });
});
