import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '../../boot/recommender.js';
import type {
  BOOTResult,
  BOOTClassResult,
  BOOTScenarioResult,
} from '../../boot/types.js';
import type { FailurePattern } from '../../boot/failure-detector.js';

// ─── Helpers ───

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

function makePattern(overrides: Partial<FailurePattern> = {}): FailurePattern {
  return {
    code: 'higher_base_no_penalties',
    description: 'Higher base rate but no/reduced penalty rates',
    severity: 'critical',
    affectedClasses: ['Level 1'],
    details: 'EA base > award base but no Saturday/Sunday penalties',
    ...overrides,
  };
}

// ─── Tests ───

describe('generateRecommendations', () => {
  describe('1. Marginal result → reconciliation clause recommendation', () => {
    it('recommends reconciliation clause for marginal verdict', () => {
      const result = makeBOOTResult({
        overallVerdict: 'marginal',
        classResults: [makeClassResult({
          overallVerdict: 'marginal',
          scenarios: [makeScenarioResult({
            verdict: 'marginal',
            difference: 500,
            percentDiff: 0.8,
          })],
          worstDelta: 500,
        })],
        summary: {
          totalClasses: 1,
          passCount: 0,
          failCount: 0,
          marginalCount: 1,
          totalDelta: 500,
        },
      });

      const patterns: FailurePattern[] = [];

      const recs = generateRecommendations(result, patterns);

      expect(recs.length).toBeGreaterThanOrEqual(1);

      const reconcRec = recs.find((r) => r.action.toLowerCase().includes('reconciliation'));
      expect(reconcRec).toBeDefined();
      expect(reconcRec?.priority).toBe('high');
      // Should mention 6-monthly review, 49 days, 5%
      expect(reconcRec?.details).toContain('6');
      expect(reconcRec?.details).toContain('49');
    });
  });

  describe('2. Failing result → rate adjustment recommendation', () => {
    it('recommends specific rate adjustments with dollar amounts for failing penalties', () => {
      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          overallVerdict: 'fail',
          scenarios: [
            makeScenarioResult({ verdict: 'pass', difference: 2000 }),
            makeScenarioResult({
              scenarioType: 'worstCase',
              scenarioLabel: 'Weekend penalty exposure',
              verdict: 'fail',
              difference: -3000,
              percentDiff: -4.5,
              awardAnnualValue: 67000,
              eaAnnualValue: 64000,
            }),
          ],
          worstDelta: -3000,
        })],
        summary: {
          totalClasses: 1,
          passCount: 0,
          failCount: 1,
          marginalCount: 0,
          totalDelta: -3000,
        },
      });

      const patterns: FailurePattern[] = [
        makePattern({
          code: 'higher_base_no_penalties',
          severity: 'critical',
        }),
      ];

      const recs = generateRecommendations(result, patterns);

      expect(recs.length).toBeGreaterThanOrEqual(1);

      // Should have a critical priority recommendation
      const criticalRec = recs.find((r) => r.priority === 'critical');
      expect(criticalRec).toBeDefined();

      // Should include an estimated cost (the deficit amount)
      const recWithCost = recs.find((r) => r.estimatedCost !== undefined && r.estimatedCost > 0);
      expect(recWithCost).toBeDefined();
    });

    it('recommends adding specific allowances for allowances_absorbed_unproven', () => {
      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({ overallVerdict: 'fail', worstDelta: -1500 })],
        summary: {
          totalClasses: 1,
          passCount: 0,
          failCount: 1,
          marginalCount: 0,
          totalDelta: -1500,
        },
      });

      const patterns: FailurePattern[] = [
        makePattern({
          code: 'allowances_absorbed_unproven',
          severity: 'warning',
          details: 'Award has 3 allowances but EA has 0',
        }),
      ];

      const recs = generateRecommendations(result, patterns);

      const allowanceRec = recs.find((r) =>
        r.action.toLowerCase().includes('allowance'),
      );
      expect(allowanceRec).toBeDefined();
      expect(allowanceRec?.priority).toBe('high');
    });

    it('recommends increasing loaded rate for loaded_rate_insufficient', () => {
      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          overallVerdict: 'fail',
          worstDelta: -2000,
          scenarios: [makeScenarioResult({
            verdict: 'fail',
            difference: -2000,
            awardAnnualValue: 65000,
            eaAnnualValue: 63000,
          })],
        })],
        summary: {
          totalClasses: 1,
          passCount: 0,
          failCount: 1,
          marginalCount: 0,
          totalDelta: -2000,
        },
      });

      const patterns: FailurePattern[] = [
        makePattern({
          code: 'loaded_rate_insufficient',
          severity: 'critical',
          details: 'Loaded rate does not cover all shift patterns',
        }),
      ];

      const recs = generateRecommendations(result, patterns);

      const loadedRateRec = recs.find((r) =>
        r.action.toLowerCase().includes('loaded rate'),
      );
      expect(loadedRateRec).toBeDefined();
      expect(loadedRateRec?.priority).toBe('critical');
    });

    it('recommends re-running with updated rates for stale_modelling', () => {
      const result = makeBOOTResult();

      const patterns: FailurePattern[] = [
        makePattern({
          code: 'stale_modelling',
          severity: 'info',
          details: 'Lodgement is within 3 months of July 1 FY rollover',
        }),
      ];

      const recs = generateRecommendations(result, patterns);

      const staleRec = recs.find((r) =>
        r.action.toLowerCase().includes('rate') || r.action.toLowerCase().includes('fy'),
      );
      expect(staleRec).toBeDefined();
      expect(staleRec?.priority).toBe('low');
    });
  });

  describe('3. Clean pass → no recommendations', () => {
    it('returns empty array when result passes and no patterns detected', () => {
      const result = makeBOOTResult({
        overallVerdict: 'pass',
        classResults: [makeClassResult({
          overallVerdict: 'pass',
          scenarios: [
            makeScenarioResult({ verdict: 'pass', difference: 5000, percentDiff: 8.0 }),
          ],
          worstDelta: 5000,
        })],
        summary: {
          totalClasses: 1,
          passCount: 1,
          failCount: 0,
          marginalCount: 0,
          totalDelta: 5000,
        },
      });

      const patterns: FailurePattern[] = [];

      const recs = generateRecommendations(result, patterns);

      expect(recs).toEqual([]);
    });
  });

  describe('4. Multiple patterns → prioritized list', () => {
    it('returns recommendations ordered: critical > high > medium > low', () => {
      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          overallVerdict: 'fail',
          worstDelta: -3000,
          scenarios: [makeScenarioResult({
            verdict: 'fail',
            difference: -3000,
            awardAnnualValue: 65000,
            eaAnnualValue: 62000,
          })],
        })],
        summary: {
          totalClasses: 1,
          passCount: 0,
          failCount: 1,
          marginalCount: 0,
          totalDelta: -3000,
        },
      });

      const patterns: FailurePattern[] = [
        makePattern({
          code: 'higher_base_no_penalties',
          severity: 'critical',
        }),
        makePattern({
          code: 'allowances_absorbed_unproven',
          severity: 'warning',
          details: 'Award has 2 allowances but EA has 0',
        }),
        makePattern({
          code: 'stale_modelling',
          severity: 'info',
          details: 'Lodgement near FY rollover',
        }),
      ];

      const recs = generateRecommendations(result, patterns);

      expect(recs.length).toBeGreaterThanOrEqual(3);

      // Verify ordering
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      for (let i = 1; i < recs.length; i++) {
        expect(priorityOrder[recs[i].priority]).toBeGreaterThanOrEqual(
          priorityOrder[recs[i - 1].priority],
        );
      }
    });
  });

  describe('Recommendation structure', () => {
    it('every recommendation has required fields', () => {
      const result = makeBOOTResult({
        overallVerdict: 'fail',
        classResults: [makeClassResult({
          overallVerdict: 'fail',
          worstDelta: -2000,
          scenarios: [makeScenarioResult({ verdict: 'fail', difference: -2000 })],
        })],
        summary: {
          totalClasses: 1,
          passCount: 0,
          failCount: 1,
          marginalCount: 0,
          totalDelta: -2000,
        },
      });

      const patterns: FailurePattern[] = [
        makePattern({ code: 'higher_base_no_penalties', severity: 'critical' }),
      ];

      const recs = generateRecommendations(result, patterns);

      for (const rec of recs) {
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('details');
        expect(['critical', 'high', 'medium', 'low']).toContain(rec.priority);
        expect(rec.action.length).toBeGreaterThan(0);
        expect(rec.details.length).toBeGreaterThan(0);
      }
    });
  });
});
