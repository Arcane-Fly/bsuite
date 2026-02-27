import type {
  AwardSchedule, EATerms, RosterScenario, BOOTResult,
  BOOTClassResult, BOOTScenarioResult, TermComparison,
  BOOTVerdict, MarginalConfig, BOOTWarning,
} from './types';
import { DEFAULT_MARGINAL_CONFIG, ENGINE_VERSION } from './types';
import { computeAnnualEmployeeValue, computeLoadedRateAnnualValue } from './annual-value';
import type { AnnualValueBreakdown } from './annual-value';
import { compareNonMonetary } from './non-monetary';
import { roundMoney } from '../utils';

/**
 * Run BOOT comparison: compare EA terms against award schedule(s)
 * across multiple roster scenarios.
 *
 * Algorithm (per s.193A):
 * 1. Match EA classifications to award classifications
 * 2. Per (classification, scenario): compute annual value for both award and EA
 * 3. Term-by-term breakdown
 * 4. Non-monetary comparison
 * 5. Holistic verdict per class
 * 6. Aggregate summary
 */
export function compareBOOT(
  awards: AwardSchedule[],
  ea: EATerms,
  scenarios: RosterScenario[],
  config?: Partial<MarginalConfig>,
): BOOTResult {
  const cfg: MarginalConfig = {
    ...DEFAULT_MARGINAL_CONFIG,
    ...config,
  };

  const warnings: BOOTWarning[] = [];
  const classResults: BOOTClassResult[] = [];

  // Flatten all award classifications across all awards for lookup
  const awardClassMap = new Map<number, {
    name: string;
    terms: AwardSchedule['classifications'][number]['terms'];
    awardNonMonetary: AwardSchedule['nonMonetary'];
  }>();

  for (const award of awards) {
    for (const cls of award.classifications) {
      awardClassMap.set(cls.classificationFixedId, {
        name: cls.name,
        terms: cls.terms,
        awardNonMonetary: award.nonMonetary,
      });
    }
  }

  // Process each EA classification
  for (const eaCls of ea.classifications) {
    const awardMatch = awardClassMap.get(eaCls.awardClassificationId);

    // Handle unmatched classification
    if (!awardMatch) {
      warnings.push({
        code: 'UNMATCHED_CLASSIFICATION',
        message: `EA classification "${eaCls.name}" (award ID ${eaCls.awardClassificationId}) has no matching award classification`,
        severity: 'critical',
      });

      classResults.push({
        classificationName: eaCls.name,
        awardClassificationId: eaCls.awardClassificationId,
        eaClassificationId: eaCls.id,
        scenarios: [],
        nonMonetaryDifferences: [],
        overallVerdict: 'indeterminate',
        worstScenario: null,
        bestDelta: 0,
        worstDelta: 0,
      });
      continue;
    }

    // Compare non-monetary terms
    const nonMonetaryDiffs = compareNonMonetary(awardMatch.awardNonMonetary, ea.nonMonetary);

    // Check for non-monetary detriments
    const hasDetriments = nonMonetaryDiffs.some(
      (d) => d.assessment === 'worse' || d.assessment === 'missing',
    );
    if (hasDetriments) {
      warnings.push({
        code: 'NON_MONETARY_DETRIMENT',
        message: `EA classification "${eaCls.name}" has non-monetary detriments compared to the award`,
        severity: 'warning',
      });
    }

    // Run each scenario
    const scenarioResults: BOOTScenarioResult[] = [];

    for (const scenario of scenarios) {
      // Compute award annual value
      const awardBreakdown = computeAnnualEmployeeValue(awardMatch.terms, scenario);

      // Compute EA annual value -- use loaded rate if present
      let eaBreakdown: AnnualValueBreakdown;
      if (eaCls.loadedRate != null) {
        eaBreakdown = computeLoadedRateAnnualValue(eaCls.loadedRate, scenario, {
          superRate: eaCls.terms.superRate,
          leaveLoadingPercent: eaCls.terms.leaveLoadingPercent,
          annualLeaveDays: eaCls.terms.annualLeaveDays,
        });
      } else {
        eaBreakdown = computeAnnualEmployeeValue(eaCls.terms, scenario);
      }

      // Term-by-term breakdown
      const termBreakdown = buildTermBreakdown(awardBreakdown, eaBreakdown);

      // Calculate difference
      const difference = roundMoney(eaBreakdown.total - awardBreakdown.total, 2);
      const percentDiff = awardBreakdown.total !== 0
        ? roundMoney((difference / awardBreakdown.total) * 100, 2)
        : 0;

      // Determine verdict for this scenario
      const verdict = determineScenarioVerdict(difference, percentDiff, cfg);

      scenarioResults.push({
        scenarioType: scenario.scenarioType,
        scenarioLabel: scenario.label,
        awardAnnualValue: awardBreakdown.total,
        eaAnnualValue: eaBreakdown.total,
        difference,
        percentDiff,
        verdict,
        termBreakdown,
      });
    }

    // Determine overall verdict for this classification
    const overallVerdict = determineClassVerdict(scenarioResults);

    // Find worst and best scenarios
    const deltas = scenarioResults.map((s) => s.difference);
    const bestDelta = deltas.length > 0 ? Math.max(...deltas) : 0;
    const worstDelta = deltas.length > 0 ? Math.min(...deltas) : 0;

    // Find worst scenario type
    const worstScenarioResult = scenarioResults.reduce<BOOTScenarioResult | null>(
      (worst, current) => {
        if (!worst) return current;
        return current.difference < worst.difference ? current : worst;
      },
      null,
    );

    classResults.push({
      classificationName: eaCls.name,
      awardClassificationId: eaCls.awardClassificationId,
      eaClassificationId: eaCls.id,
      scenarios: scenarioResults,
      nonMonetaryDifferences: nonMonetaryDiffs,
      overallVerdict,
      worstScenario: worstScenarioResult?.scenarioType ?? null,
      bestDelta,
      worstDelta,
    });

    // Generate warnings based on class result
    if (overallVerdict === 'fail') {
      warnings.push({
        code: 'BOOT_FAIL',
        message: `EA classification "${eaCls.name}" fails the BOOT — EA annual value is less than award`,
        severity: 'critical',
      });
    } else if (overallVerdict === 'marginal') {
      warnings.push({
        code: 'MARGINAL_PASS',
        message: `EA classification "${eaCls.name}" passes marginally (within ${cfg.marginalThreshold * 100}% threshold)`,
        severity: 'warning',
      });
    }
  }

  // Aggregate overall verdict
  const overallVerdict = determineOverallVerdict(classResults);

  // Summary counts
  const passCount = classResults.filter((c) => c.overallVerdict === 'pass').length;
  const failCount = classResults.filter((c) => c.overallVerdict === 'fail').length;
  const marginalCount = classResults.filter((c) => c.overallVerdict === 'marginal').length;
  const totalDelta = roundMoney(
    classResults.reduce((sum, c) => sum + c.worstDelta, 0),
    2,
  );

  return {
    overallVerdict,
    classResults,
    warnings,
    humanReviewRequired: true,
    assessedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    summary: {
      totalClasses: classResults.length,
      passCount,
      failCount,
      marginalCount,
      totalDelta,
    },
  };
}

// ─── Internal Helpers ───

/** Build term-by-term comparison from two AnnualValueBreakdown objects */
function buildTermBreakdown(
  award: AnnualValueBreakdown,
  ea: AnnualValueBreakdown,
): TermComparison[] {
  const termKeys: (keyof Omit<AnnualValueBreakdown, 'total'>)[] = [
    'basePay',
    'saturdayPenalty',
    'sundayPenalty',
    'publicHolidayPenalty',
    'overtime15x',
    'overtime2x',
    'nightShiftLoading',
    'afternoonShiftLoading',
    'casualLoading',
    'allowances',
    'leaveLoading',
    'superannuation',
  ];

  return termKeys.map((key) => {
    const awardValue = award[key];
    const eaValue = ea[key];
    const difference = roundMoney(eaValue - awardValue, 2);
    const percentDiff = awardValue !== 0
      ? roundMoney((difference / awardValue) * 100, 2)
      : (eaValue !== 0 ? 100 : 0);

    return {
      term: key,
      awardValue,
      eaValue,
      difference,
      percentDiff,
    };
  });
}

/** Determine verdict for a single scenario */
function determineScenarioVerdict(
  difference: number,
  percentDiff: number,
  config: MarginalConfig,
): BOOTVerdict {
  if (difference < 0) {
    return 'fail';
  }
  // Pass but within marginal threshold
  if (percentDiff >= 0 && percentDiff < config.marginalThreshold * 100) {
    return 'marginal';
  }
  return 'pass';
}

/** Determine overall verdict for a classification across all scenarios */
function determineClassVerdict(
  scenarios: BOOTScenarioResult[],
): BOOTVerdict {
  if (scenarios.length === 0) return 'indeterminate';

  const hasAnyFail = scenarios.some((s) => s.verdict === 'fail');
  if (hasAnyFail) return 'fail';

  const hasAnyMarginal = scenarios.some((s) => s.verdict === 'marginal');
  if (hasAnyMarginal) return 'marginal';

  const hasAnyIndeterminate = scenarios.some((s) => s.verdict === 'indeterminate');
  if (hasAnyIndeterminate) return 'indeterminate';

  return 'pass';
}

/** Determine overall BOOT verdict across all classifications */
function determineOverallVerdict(
  classResults: BOOTClassResult[],
): BOOTVerdict {
  if (classResults.length === 0) return 'indeterminate';

  const hasAnyFail = classResults.some((c) => c.overallVerdict === 'fail');
  if (hasAnyFail) return 'fail';

  const hasAnyIndeterminate = classResults.some((c) => c.overallVerdict === 'indeterminate');
  if (hasAnyIndeterminate) return 'indeterminate';

  const hasAnyMarginal = classResults.some((c) => c.overallVerdict === 'marginal');
  if (hasAnyMarginal) return 'marginal';

  return 'pass';
}
