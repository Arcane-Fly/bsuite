import type { BOOTResult } from './types';
import { DEFAULT_RECONCILIATION } from './types';
import type { FailurePattern } from './failure-detector';

// ─── Recommendation Types ───

export interface BOOTRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  details: string;
  /** Dollar amount if applicable */
  estimatedCost?: number;
}

// ─── Priority order for sorting ───

const PRIORITY_ORDER: Record<BOOTRecommendation['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ─── Main recommendation function ───

/**
 * Generate prioritized recommendations based on BOOT result and detected failure patterns.
 *
 * Returns recommendations sorted by priority (critical first, then high, medium, low).
 * Returns an empty array for clean passes with no failure patterns.
 */
export function generateRecommendations(
  result: BOOTResult,
  patterns: FailurePattern[],
): BOOTRecommendation[] {
  const recs: BOOTRecommendation[] = [];

  // Clean pass with no patterns -- no recommendations needed
  if (result.overallVerdict === 'pass' && patterns.length === 0) {
    return [];
  }

  // Marginal result -- recommend reconciliation clause
  if (result.overallVerdict === 'marginal') {
    recs.push(buildReconciliationRecommendation());
  }

  // Failing classes -- recommend rate adjustments
  for (const classResult of result.classResults) {
    if (classResult.overallVerdict === 'fail') {
      const deficit = Math.abs(classResult.worstDelta);
      recs.push({
        priority: 'critical',
        action: `Increase EA rates for ${classResult.classificationName} to close the annual deficit`,
        details:
          `Classification "${classResult.classificationName}" fails the BOOT by ` +
          `$${deficit.toFixed(2)} per annum in the worst-case scenario. Adjust base rate ` +
          `and/or penalty rates to close this gap. Consider modelling the corrected rates ` +
          `before re-lodgement.`,
        estimatedCost: deficit,
      });
    }
  }

  // Pattern-specific recommendations
  for (const pattern of patterns) {
    const rec = buildPatternRecommendation(pattern, result);
    if (rec) {
      recs.push(rec);
    }
  }

  // Sort by priority
  recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return recs;
}

// ─── Individual recommendation builders ───

function buildReconciliationRecommendation(): BOOTRecommendation {
  const r = DEFAULT_RECONCILIATION;
  return {
    priority: 'high',
    action: 'Include a reconciliation clause with Full Bench terms',
    details:
      `The EA marginally passes the BOOT. Include a reconciliation clause requiring ` +
      `${r.reviewFrequencyMonths}-monthly review of employee remuneration against the award, ` +
      `with any shortfall to be paid within ${r.topUpDeadlineDays} days. ` +
      `A ${((r.penaltyMultiplier - 1) * 100).toFixed(0)}% penalty multiplier should apply ` +
      `to any shortfall as a safeguard. This is consistent with Full Bench requirements ` +
      `for marginal BOOT results.`,
  };
}

function buildPatternRecommendation(
  pattern: FailurePattern,
  result: BOOTResult,
): BOOTRecommendation | null {
  switch (pattern.code) {
    case 'higher_base_no_penalties':
      return {
        priority: 'critical',
        action: 'Restore penalty rates or increase base rate to cover penalty exposure',
        details:
          `The EA has a higher base rate than the award but has removed or reduced penalty ` +
          `rates. Either restore award-equivalent penalty rates or mathematically prove that ` +
          `the higher base rate compensates for all penalty scenarios. ` +
          `Affected: ${pattern.affectedClasses.join(', ')}.`,
      };

    case 'loaded_rate_insufficient':
      return buildLoadedRateRecommendation(pattern, result);

    case 'casual_overlooked':
      return {
        priority: 'medium',
        action: 'Add casual employment scenarios to the BOOT assessment',
        details:
          `The award provides for casual employment but no casual scenarios were modelled. ` +
          `Add at least one casual scenario (e.g., casualMinimum) to verify the EA does not ` +
          `disadvantage casual employees.`,
      };

    case 'allowances_absorbed_unproven':
      return {
        priority: 'high',
        action: 'Add explicit allowance provisions or prove absorption mathematically',
        details:
          `${pattern.details}. Either include matching allowance provisions in the EA ` +
          `or provide mathematical proof that the higher base rate absorbs all award ` +
          `allowances across every foreseeable scenario.`,
      };

    case 'award_entitlements_omitted':
      return {
        priority: 'medium',
        action: 'Model additional roster scenarios (typical + worst-case minimum)',
        details:
          `${pattern.details}. Add a worst-case penalty exposure scenario to ensure ` +
          `the EA passes the BOOT under all foreseeable working patterns.`,
      };

    case 'stale_modelling':
      return {
        priority: 'low',
        action: 'Re-run BOOT assessment with updated FY award rates when available',
        details:
          `${pattern.details}. Once the Annual Wage Review outcome is published (typically ` +
          `June), re-run the BOOT with the new rates to ensure the EA still passes.`,
      };

    case 'vague_all_inclusive':
      return {
        priority: 'critical',
        action: 'Model penalty scenarios to prove loaded rate covers all shift patterns',
        details:
          `The EA uses an all-inclusive (loaded) rate but no penalty scenarios have been ` +
          `modelled. Add scenarios with Saturday, Sunday, public holiday, and shift work ` +
          `hours to mathematically prove the loaded rate is sufficient. ` +
          `Affected: ${pattern.affectedClasses.join(', ')}.`,
      };

    case 'non_monetary_offset_claimed':
      return {
        priority: 'critical',
        action: 'Address monetary shortfall directly -- non-monetary offsets are not accepted',
        details:
          `The FWC has consistently rejected attempts to offset monetary shortfalls with ` +
          `non-monetary benefits. The EA must pass the monetary BOOT on its own terms. ` +
          `Increase rates or allowances to close the gap. ` +
          `Affected: ${pattern.affectedClasses.join(', ')}.`,
      };
  }
}

function buildLoadedRateRecommendation(
  pattern: FailurePattern,
  result: BOOTResult,
): BOOTRecommendation {
  // Calculate the worst deficit across all failing classes
  let worstDeficit = 0;
  for (const classResult of result.classResults) {
    if (classResult.overallVerdict === 'fail' && classResult.worstDelta < 0) {
      worstDeficit = Math.max(worstDeficit, Math.abs(classResult.worstDelta));
    }
  }

  return {
    priority: 'critical',
    action: 'Increase loaded rate to cover all shift patterns',
    details:
      `The loaded (all-inclusive) rate fails to compensate for all foreseeable shift ` +
      `patterns. Increase the loaded rate to close the worst-case annual deficit ` +
      `of $${worstDeficit.toFixed(2)}. ` +
      `Affected: ${pattern.affectedClasses.join(', ')}.`,
    estimatedCost: worstDeficit > 0 ? worstDeficit : undefined,
  };
}
