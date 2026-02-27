import type {
  EATerms,
  BOOTVerdict,
  BOOTWarning,
  MarginalConfig,
  GTOPlacementSchedule,
  GTOPlacementResult,
  GTOBOOTResult,
} from './types';
import { ENGINE_VERSION, DEFAULT_MARGINAL_CONFIG } from './types';
import { compareBOOT } from './compare';
import { roundMoney } from '../utils';

/**
 * GTO Multi-Placement BOOT Comparison
 *
 * Runs BOOT comparison for each host employer placement of a GTO apprentice,
 * then aggregates results. Per s.193, every placement must individually pass
 * for the overall result to pass.
 *
 * Algorithm:
 * 1. Validate timeAllocations sum to ~1.0 (warn if >5% off)
 * 2. Run compareBOOT() per placement
 * 3. Aggregate:
 *    - Overall verdict: fails if ANY placement fails
 *    - Weighted aggregate delta: sum of (totalDelta * timeAllocation)
 *    - Weakest placement: one with worst totalDelta
 * 4. Collect warnings from all placements + GTO-specific warnings
 */
export function compareGTOBOOT(
  schedule: GTOPlacementSchedule,
  ea: EATerms,
  config?: Partial<MarginalConfig>,
): GTOBOOTResult {
  const cfg: MarginalConfig = {
    ...DEFAULT_MARGINAL_CONFIG,
    ...config,
  };

  const warnings: BOOTWarning[] = [];

  // Handle empty placements
  if (schedule.placements.length === 0) {
    warnings.push({
      code: 'NO_PLACEMENTS',
      message: 'GTO schedule has no placements — cannot assess BOOT compliance',
      severity: 'critical',
    });

    return {
      apprenticeId: schedule.apprenticeId,
      currentYear: schedule.currentYear,
      placements: [],
      overallVerdict: 'indeterminate',
      weakestPlacement: null,
      weightedAggregateDelta: 0,
      warnings,
      humanReviewRequired: true,
      assessedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
    };
  }

  // Step 1: Validate time allocations sum to ~1.0
  const totalAllocation = schedule.placements.reduce(
    (sum, p) => sum + p.timeAllocation,
    0,
  );
  if (Math.abs(totalAllocation - 1.0) > 0.05) {
    warnings.push({
      code: 'TIME_ALLOCATION_MISMATCH',
      message: `Time allocations sum to ${roundMoney(totalAllocation, 4)} — expected approximately 1.0 (${roundMoney(Math.abs(totalAllocation - 1.0) * 100, 1)}% off)`,
      severity: 'warning',
    });
  }

  // Step 2: Run compareBOOT per placement
  const placementResults: GTOPlacementResult[] = [];

  for (const placement of schedule.placements) {
    const bootResult = compareBOOT(
      placement.applicableAwards,
      ea,
      placement.scenarios,
      cfg,
    );

    placementResults.push({
      hostEmployerId: placement.hostEmployerId,
      hostEmployerName: placement.hostEmployerName,
      timeAllocation: placement.timeAllocation,
      bootResult,
    });
  }

  // Step 3: Aggregate results

  // Collect all warnings from individual BOOT results
  for (const pr of placementResults) {
    for (const w of pr.bootResult.warnings) {
      warnings.push(w);
    }
  }

  // Add GTO-specific warnings for failing placements
  for (const pr of placementResults) {
    if (pr.bootResult.overallVerdict === 'fail') {
      warnings.push({
        code: 'GTO_PLACEMENT_FAIL',
        message: `Placement at "${pr.hostEmployerName}" (${pr.hostEmployerId}) fails BOOT — per s.193, every placement must individually pass`,
        severity: 'critical',
      });
    }
  }

  // Overall verdict: fails if ANY placement fails (per s.193)
  const overallVerdict = determineGTOOverallVerdict(placementResults);

  // Weighted aggregate delta: sum of (totalDelta * timeAllocation)
  const weightedAggregateDelta = roundMoney(
    placementResults.reduce(
      (sum, pr) => sum + pr.bootResult.summary.totalDelta * pr.timeAllocation,
      0,
    ),
    2,
  );

  // Weakest placement: the one with the worst totalDelta
  const weakestPlacement = findWeakestPlacement(placementResults);

  return {
    apprenticeId: schedule.apprenticeId,
    currentYear: schedule.currentYear,
    placements: placementResults,
    overallVerdict,
    weakestPlacement,
    weightedAggregateDelta,
    warnings,
    humanReviewRequired: true,
    assessedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

// ─── Internal Helpers ───

/** Determine overall GTO verdict across all placements */
function determineGTOOverallVerdict(
  placements: GTOPlacementResult[],
): BOOTVerdict {
  if (placements.length === 0) return 'indeterminate';

  const hasAnyFail = placements.some(
    (p) => p.bootResult.overallVerdict === 'fail',
  );
  if (hasAnyFail) return 'fail';

  const hasAnyIndeterminate = placements.some(
    (p) => p.bootResult.overallVerdict === 'indeterminate',
  );
  if (hasAnyIndeterminate) return 'indeterminate';

  const hasAnyMarginal = placements.some(
    (p) => p.bootResult.overallVerdict === 'marginal',
  );
  if (hasAnyMarginal) return 'marginal';

  return 'pass';
}

/** Find the placement with the worst (most negative) totalDelta */
function findWeakestPlacement(
  placements: GTOPlacementResult[],
): GTOPlacementResult | null {
  if (placements.length === 0) return null;

  return placements.reduce<GTOPlacementResult>((worst, current) => {
    return current.bootResult.summary.totalDelta < worst.bootResult.summary.totalDelta
      ? current
      : worst;
  }, placements[0]);
}
