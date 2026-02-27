import { describe, it, expect } from 'vitest';
import { compareBOOT } from '../../boot/compare';
import { detectFailurePatterns } from '../../boot/failure-detector';
import { generateRecommendations } from '../../boot/recommender';
import type { EATerms, RosterScenario } from '../../boot/types';
import { BUILDING_AWARD } from './fixtures/building-award';
import { PASSING_EA } from './fixtures/sample-ea-pass';
import { FAILING_EA } from './fixtures/sample-ea-fail';
import { MARGINAL_EA } from './fixtures/sample-ea-marginal';

// ─── Standard Roster Scenarios ───

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

const CASUAL_SCENARIO: RosterScenario = {
  scenarioType: 'casualMinimum',
  label: 'Casual Minimum Engagement',
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
  weeksPerYear: 48,
};

// ─── Helper ───

function hasPatternCode(
  patterns: ReturnType<typeof detectFailurePatterns>,
  code: string,
): boolean {
  return patterns.some((p) => p.code === code);
}

// ─── Golden Scenarios ───

describe('BOOT Golden File Tests', () => {
  // 1. Simple pass: PASSING_EA vs BUILDING_AWARD
  describe('1. Simple pass', () => {
    it('PASSING_EA passes the BOOT across typical and worst-case scenarios', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        PASSING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(result.overallVerdict).toBe('pass');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.engineVersion).toBe('2.0.0');

      // All 3 classifications should pass
      for (const cr of result.classResults) {
        expect(cr.overallVerdict).toBe('pass');
        for (const s of cr.scenarios) {
          expect(s.verdict).toBe('pass');
          expect(s.difference).toBeGreaterThan(0);
          expect(s.percentDiff).toBeGreaterThanOrEqual(5);
        }
      }

      expect(result.summary.passCount).toBe(3);
      expect(result.summary.failCount).toBe(0);
      expect(result.summary.marginalCount).toBe(0);
    });
  });

  // 2. Simple fail: FAILING_EA vs BUILDING_AWARD (higher base but no penalties)
  describe('2. Simple fail', () => {
    it('FAILING_EA fails the BOOT when worst-case scenario is included', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        FAILING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(result.overallVerdict).toBe('fail');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.engineVersion).toBe('2.0.0');

      // Each classification should fail overall due to worst-case
      for (const cr of result.classResults) {
        expect(cr.overallVerdict).toBe('fail');

        // Typical scenario should not fail (higher base compensates for Mon-Fri)
        const typical = cr.scenarios.find((s) => s.scenarioType === 'typical');
        expect(typical).toBeDefined();
        expect(typical!.verdict).not.toBe('fail');

        // Worst case should fail (removed penalties are devastating)
        const worstCase = cr.scenarios.find((s) => s.scenarioType === 'worstCase');
        expect(worstCase).toBeDefined();
        expect(worstCase!.verdict).toBe('fail');
        expect(worstCase!.difference).toBeLessThan(0);
      }

      expect(result.summary.failCount).toBe(3);
    });
  });

  // 3. Marginal pass: MARGINAL_EA vs BUILDING_AWARD
  describe('3. Marginal pass', () => {
    it('MARGINAL_EA produces a marginal verdict across typical and worst-case', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        MARGINAL_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(result.overallVerdict).toBe('marginal');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.engineVersion).toBe('2.0.0');

      // All classifications should be marginal
      for (const cr of result.classResults) {
        expect(cr.overallVerdict).toBe('marginal');

        // Both scenarios should be positive (not fail)
        for (const s of cr.scenarios) {
          expect(s.difference).toBeGreaterThan(0);
          // At least one scenario should be under 5% (marginal threshold)
          expect(s.percentDiff).toBeLessThan(5);
        }
      }

      expect(result.summary.marginalCount).toBe(3);
      expect(result.summary.failCount).toBe(0);
    });
  });

  // 4. Loaded rate pass
  describe('4. Loaded rate pass', () => {
    it('EA with loadedRate of $45/hr passes the typical scenario', () => {
      const loadedPassEA: EATerms = {
        agreementName: 'Loaded Rate Pass EA 2026',
        lodgementDate: '2026-01-15',
        classifications: [
          {
            id: 'loaded-pass-1',
            name: 'Level 1 Loaded',
            awardClassificationId: 201,
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
          },
        ],
        nonMonetary: {
          ordinaryHoursPerWeek: 38,
          maxDailyOrdinaryHours: 7.6,
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

      const result = compareBOOT(
        [BUILDING_AWARD],
        loadedPassEA,
        [TYPICAL_SCENARIO],
      );

      expect(result.overallVerdict).toBe('pass');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.classResults[0].overallVerdict).toBe('pass');
      expect(result.classResults[0].scenarios[0].eaAnnualValue).toBeGreaterThan(
        result.classResults[0].scenarios[0].awardAnnualValue,
      );
    });
  });

  // 5. Loaded rate fail
  describe('5. Loaded rate fail', () => {
    it('EA with loadedRate of $30/hr fails the worst-case scenario', () => {
      const loadedFailEA: EATerms = {
        agreementName: 'Loaded Rate Fail EA 2026',
        lodgementDate: '2026-01-15',
        classifications: [
          {
            id: 'loaded-fail-1',
            name: 'Level 1 Loaded',
            awardClassificationId: 201,
            terms: {
              baseHourlyRate: 30,
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
            loadedRate: 30,
          },
        ],
        nonMonetary: {
          ordinaryHoursPerWeek: 38,
          maxDailyOrdinaryHours: 7.6,
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

      const result = compareBOOT(
        [BUILDING_AWARD],
        loadedFailEA,
        [WORST_CASE_SCENARIO],
      );

      expect(result.overallVerdict).toBe('fail');
      expect(result.humanReviewRequired).toBe(true);
      expect(result.classResults[0].overallVerdict).toBe('fail');
      expect(result.classResults[0].scenarios[0].verdict).toBe('fail');
      expect(result.classResults[0].scenarios[0].difference).toBeLessThan(0);
    });
  });

  // 6. Casual oversight detection
  describe('6. Casual oversight', () => {
    it('detects casual_overlooked when no casual scenarios provided', () => {
      // Use PASSING_EA with only the typical (full-time) scenario
      const result = compareBOOT(
        [BUILDING_AWARD],
        PASSING_EA,
        [TYPICAL_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        PASSING_EA,
        [TYPICAL_SCENARIO],
      );

      expect(hasPatternCode(patterns, 'casual_overlooked')).toBe(true);
    });
  });

  // 7. Higher base no penalties pattern detection
  describe('7. Higher base no penalties pattern', () => {
    it('detects higher_base_no_penalties for FAILING_EA', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        FAILING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        FAILING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(hasPatternCode(patterns, 'higher_base_no_penalties')).toBe(true);

      const pattern = patterns.find((p) => p.code === 'higher_base_no_penalties');
      expect(pattern).toBeDefined();
      expect(pattern!.severity).toBe('critical');
      expect(pattern!.affectedClasses.length).toBeGreaterThan(0);
    });
  });

  // 8. Allowance absorption detection
  describe('8. Allowance absorption', () => {
    it('detects allowances_absorbed_unproven when EA omits award allowances', () => {
      // Create EA with no allowances where award has Industry Allowance
      const noAllowanceEA: EATerms = {
        agreementName: 'No Allowance EA 2026',
        lodgementDate: '2026-01-15',
        classifications: [
          {
            id: 'no-allow-1',
            name: 'Level 1 Worker',
            awardClassificationId: 201,
            terms: {
              baseHourlyRate: 35.00,
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
            },
            loadedRate: null,
          },
        ],
        nonMonetary: {
          ordinaryHoursPerWeek: 38,
          maxDailyOrdinaryHours: 7.6,
          spanOfHours: { start: '06:00', end: '18:00' },
          rosteringNotice: '7 days',
          minimumEngagementHours: 4,
          mealBreakAfterHours: 5,
          restBreakMinutes: 10,
          consultationObligations: 'As per NES',
          disputeResolution: 'Internal then FWC',
          noticeOfTermination: '1-4 weeks based on service',
        },
      };

      const result = compareBOOT(
        [BUILDING_AWARD],
        noAllowanceEA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        noAllowanceEA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(hasPatternCode(patterns, 'allowances_absorbed_unproven')).toBe(true);

      const pattern = patterns.find((p) => p.code === 'allowances_absorbed_unproven');
      expect(pattern).toBeDefined();
      expect(pattern!.severity).toBe('warning');
    });
  });

  // 9. Stale modelling detection
  describe('9. Stale modelling detection', () => {
    it('detects stale_modelling for EA lodged in April-June', () => {
      const staleEA: EATerms = {
        ...PASSING_EA,
        lodgementDate: '2026-05-15',
      };

      const result = compareBOOT(
        [BUILDING_AWARD],
        staleEA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        staleEA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(hasPatternCode(patterns, 'stale_modelling')).toBe(true);

      const pattern = patterns.find((p) => p.code === 'stale_modelling');
      expect(pattern).toBeDefined();
      expect(pattern!.severity).toBe('info');
    });
  });

  // 10. Multiple classifications: each gets independent verdict
  describe('10. Multiple classifications', () => {
    it('each of 3 levels gets an independent verdict', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        PASSING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      // All 3 classifications should be present
      expect(result.classResults).toHaveLength(3);
      expect(result.summary.totalClasses).toBe(3);

      // Verify each classification maps to the correct award ID
      const lvl1 = result.classResults.find(
        (cr) => cr.awardClassificationId === 201,
      );
      const lvl2 = result.classResults.find(
        (cr) => cr.awardClassificationId === 202,
      );
      const lvl3 = result.classResults.find(
        (cr) => cr.awardClassificationId === 203,
      );

      expect(lvl1).toBeDefined();
      expect(lvl2).toBeDefined();
      expect(lvl3).toBeDefined();

      // Each has its own scenarios and verdict
      for (const cr of [lvl1!, lvl2!, lvl3!]) {
        expect(cr.scenarios).toHaveLength(2);
        expect(cr.overallVerdict).toBe('pass');
        expect(cr.bestDelta).toBeGreaterThan(0);
        expect(cr.worstDelta).toBeGreaterThan(0);
        expect(cr.worstDelta).toBeLessThanOrEqual(cr.bestDelta);
      }

      // Verify independent verdicts: use FAILING_EA where typical passes but worst case fails
      const failResult = compareBOOT(
        [BUILDING_AWARD],
        FAILING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      expect(failResult.classResults).toHaveLength(3);

      // Each classification should independently fail
      for (const cr of failResult.classResults) {
        expect(cr.overallVerdict).toBe('fail');
        expect(cr.scenarios).toHaveLength(2);

        // Typical does not fail, worst case fails -- independently assessed
        const typicalScenario = cr.scenarios.find(
          (s) => s.scenarioType === 'typical',
        );
        const worstCaseScenario = cr.scenarios.find(
          (s) => s.scenarioType === 'worstCase',
        );
        expect(typicalScenario!.verdict).not.toBe('fail');
        expect(worstCaseScenario!.verdict).toBe('fail');
      }
    });
  });

  // ─── Cross-cutting structural checks ───

  describe('Cross-cutting structural checks', () => {
    it('recommendations are generated for failing EAs', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        FAILING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        FAILING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const recs = generateRecommendations(result, patterns);

      expect(recs.length).toBeGreaterThan(0);
      // Should have critical recommendations for failing classifications
      const criticalRecs = recs.filter((r) => r.priority === 'critical');
      expect(criticalRecs.length).toBeGreaterThan(0);
    });

    it('recommendations include reconciliation clause for marginal EAs', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        MARGINAL_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        MARGINAL_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO],
      );

      const recs = generateRecommendations(result, patterns);

      // Should include reconciliation clause recommendation
      const reconciliationRec = recs.find((r) =>
        r.action.toLowerCase().includes('reconciliation'),
      );
      expect(reconciliationRec).toBeDefined();
    });

    it('clean pass with adequate modelling produces no recommendations', () => {
      const result = compareBOOT(
        [BUILDING_AWARD],
        PASSING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO, CASUAL_SCENARIO],
      );

      const patterns = detectFailurePatterns(
        result,
        [BUILDING_AWARD],
        PASSING_EA,
        [TYPICAL_SCENARIO, WORST_CASE_SCENARIO, CASUAL_SCENARIO],
      );

      const recs = generateRecommendations(result, patterns);

      // No patterns, clean pass -- no recommendations
      expect(recs).toHaveLength(0);
    });
  });
});
