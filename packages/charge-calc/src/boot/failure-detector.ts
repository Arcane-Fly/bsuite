import type {
  BOOTResult,
  AwardSchedule,
  EATerms,
  RosterScenario,
} from './types.js';

// ─── Failure Pattern Types ───

export type FailurePatternCode =
  | 'higher_base_no_penalties'
  | 'loaded_rate_insufficient'
  | 'casual_overlooked'
  | 'allowances_absorbed_unproven'
  | 'award_entitlements_omitted'
  | 'stale_modelling'
  | 'vague_all_inclusive'
  | 'non_monetary_offset_claimed';

export interface FailurePattern {
  code: FailurePatternCode;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  affectedClasses: string[];
  details: string;
}

// ─── Severity order for sorting ───

const SEVERITY_ORDER: Record<FailurePattern['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ─── Detection helpers ───

/**
 * Check if any scenario in a roster set has penalty hours > 0.
 */
function hasPenaltyHours(scenarios: RosterScenario[]): boolean {
  return scenarios.some((s) => {
    const wb = s.weeklyBreakdown;
    return (
      wb.saturdayOrdinary > 0 ||
      wb.sundayOrdinary > 0 ||
      wb.publicHoliday > 0 ||
      wb.nightShift > 0 ||
      wb.afternoonShift > 0
    );
  });
}

/**
 * Extract the month number (1-12) from an ISO date string (YYYY-MM-DD).
 */
function getMonth(isoDate: string): number {
  const parts = isoDate.split('-');
  return Number(parts[1]);
}

// ─── Main detection function ───

/**
 * Detect common BOOT failure patterns in a completed assessment.
 *
 * Patterns are based on Fair Work Commission research into common EA
 * failure modes under ss.193 and 193A of the Fair Work Act.
 *
 * Returns patterns sorted by severity (critical first, then warning, then info).
 */
export function detectFailurePatterns(
  result: BOOTResult,
  awards: AwardSchedule[],
  ea: EATerms,
  scenarios: RosterScenario[],
): FailurePattern[] {
  const patterns: FailurePattern[] = [];

  // Build a quick lookup: award classificationFixedId -> award classification
  const awardClassMap = new Map<number, AwardSchedule['classifications'][number]>();
  for (const award of awards) {
    for (const cls of award.classifications) {
      awardClassMap.set(cls.classificationFixedId, cls);
    }
  }

  // 1. higher_base_no_penalties
  // EA base rate > award base rate, but EA has no/reduced penalty rates and a penalty scenario fails
  detectHigherBaseNoPenalties(result, ea, awardClassMap, patterns);

  // 2. loaded_rate_insufficient
  // EA uses a loaded rate that doesn't cover all shift patterns
  detectLoadedRateInsufficient(result, ea, patterns);

  // 3. casual_overlooked
  // No casual scenarios provided but the award has casual provisions
  detectCasualOverlooked(awards, scenarios, patterns);

  // 4. allowances_absorbed_unproven
  // Award has allowances that the EA doesn't explicitly include
  detectAllowancesAbsorbedUnproven(ea, awardClassMap, patterns);

  // 5. award_entitlements_omitted
  // Fewer than 2 scenarios provided
  detectAwardEntitlementsOmitted(scenarios, patterns);

  // 6. stale_modelling
  // Lodgement date within 3 months of July 1 FY rollover (April-June)
  detectStaleModelling(ea, patterns);

  // 7. vague_all_inclusive
  // EA has loaded rate but no penalty scenarios modelled
  detectVagueAllInclusive(ea, scenarios, patterns);

  // 8. non_monetary_offset_claimed
  // Class fails monetarily but has "better" non-monetary differences
  detectNonMonetaryOffsetClaimed(result, patterns);

  // Sort by severity: critical > warning > info
  patterns.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return patterns;
}

// ─── Individual detectors ───

function detectHigherBaseNoPenalties(
  result: BOOTResult,
  ea: EATerms,
  awardClassMap: Map<number, AwardSchedule['classifications'][number]>,
  patterns: FailurePattern[],
): void {
  const affectedClasses: string[] = [];

  for (const eaCls of ea.classifications) {
    const awardCls = awardClassMap.get(eaCls.awardClassificationId);
    if (!awardCls) continue;

    const eaBase = eaCls.terms.baseHourlyRate;
    const awardBase = awardCls.terms.baseHourlyRate;

    // EA base must be higher than award base
    if (eaBase <= awardBase) continue;

    // Check if EA has null/reduced penalties where the award has them
    const eaPen = eaCls.terms.penaltyRates;
    const awardPen = awardCls.terms.penaltyRates;

    const hasReducedPenalties =
      (awardPen.saturday !== null && eaPen.saturday === null) ||
      (awardPen.sunday !== null && eaPen.sunday === null) ||
      (awardPen.publicHoliday !== null && eaPen.publicHoliday === null) ||
      (awardPen.nightShift !== null && eaPen.nightShift === null) ||
      (awardPen.afternoonShift !== null && eaPen.afternoonShift === null);

    if (!hasReducedPenalties) continue;

    // Check if any penalty scenario fails for this classification
    const classResult = result.classResults.find(
      (cr) => cr.eaClassificationId === eaCls.id,
    );
    if (!classResult) continue;

    const hasFailingPenaltyScenario = classResult.scenarios.some(
      (s) => s.verdict === 'fail',
    );

    if (hasFailingPenaltyScenario) {
      affectedClasses.push(eaCls.name);
    }
  }

  if (affectedClasses.length > 0) {
    patterns.push({
      code: 'higher_base_no_penalties',
      description: 'Higher base rate but no/reduced penalty rates',
      severity: 'critical',
      affectedClasses,
      details:
        `EA has a higher base rate than the award but removes or reduces penalty rates. ` +
        `This is the most common BOOT failure pattern. Affected: ${affectedClasses.join(', ')}.`,
    });
  }
}

function detectLoadedRateInsufficient(
  result: BOOTResult,
  ea: EATerms,
  patterns: FailurePattern[],
): void {
  const affectedClasses: string[] = [];

  for (const eaCls of ea.classifications) {
    if (eaCls.loadedRate === null) continue;

    // Find the class result
    const classResult = result.classResults.find(
      (cr) => cr.eaClassificationId === eaCls.id,
    );
    if (!classResult) continue;

    const hasFailingScenario = classResult.scenarios.some(
      (s) => s.verdict === 'fail',
    );

    if (hasFailingScenario) {
      affectedClasses.push(eaCls.name);
    }
  }

  if (affectedClasses.length > 0) {
    patterns.push({
      code: 'loaded_rate_insufficient',
      description: 'Loaded rate does not cover all shift patterns',
      severity: 'critical',
      affectedClasses,
      details:
        `EA uses a loaded (all-inclusive) rate that fails to compensate for all foreseeable ` +
        `shift patterns. The loaded rate must cover penalties for every realistic scenario. ` +
        `Affected: ${affectedClasses.join(', ')}.`,
    });
  }
}

function detectCasualOverlooked(
  awards: AwardSchedule[],
  scenarios: RosterScenario[],
  patterns: FailurePattern[],
): void {
  // Check if the award has casual provisions (casualLoading > 0 in any classification)
  const awardHasCasual = awards.some((a) =>
    a.classifications.some((cls) => cls.terms.casualLoading > 0),
  );

  if (!awardHasCasual) return;

  // Check if any scenario uses casual employment type
  const hasCasualScenario = scenarios.some(
    (s) => s.employmentType === 'casual',
  );

  if (!hasCasualScenario) {
    patterns.push({
      code: 'casual_overlooked',
      description: 'Casual employees not modelled in BOOT scenarios',
      severity: 'warning',
      affectedClasses: [],
      details:
        `The award provides for casual employment but no casual roster scenarios were included ` +
        `in the BOOT assessment. Casual employees should be modelled to ensure the EA does ` +
        `not disadvantage them.`,
    });
  }
}

function detectAllowancesAbsorbedUnproven(
  ea: EATerms,
  awardClassMap: Map<number, AwardSchedule['classifications'][number]>,
  patterns: FailurePattern[],
): void {
  const affectedClasses: string[] = [];
  let maxAwardAllowanceCount = 0;

  for (const eaCls of ea.classifications) {
    const awardCls = awardClassMap.get(eaCls.awardClassificationId);
    if (!awardCls) continue;

    const awardAllowanceCount = awardCls.terms.allowances.length;
    const eaAllowanceCount = eaCls.terms.allowances.length;

    if (awardAllowanceCount > 0 && eaAllowanceCount < awardAllowanceCount) {
      affectedClasses.push(eaCls.name);
      maxAwardAllowanceCount = Math.max(maxAwardAllowanceCount, awardAllowanceCount);
    }
  }

  if (affectedClasses.length > 0) {
    patterns.push({
      code: 'allowances_absorbed_unproven',
      description: 'Award allowances not explicitly included in EA',
      severity: 'warning',
      affectedClasses,
      details:
        `The award provides ${maxAwardAllowanceCount} allowance(s) that are not explicitly ` +
        `matched in the EA. If the EA claims to absorb allowances into a higher base rate, ` +
        `this must be mathematically proven. Affected: ${affectedClasses.join(', ')}.`,
    });
  }
}

function detectAwardEntitlementsOmitted(
  scenarios: RosterScenario[],
  patterns: FailurePattern[],
): void {
  if (scenarios.length < 2) {
    patterns.push({
      code: 'award_entitlements_omitted',
      description: 'Insufficient roster scenarios modelled',
      severity: 'warning',
      affectedClasses: [],
      details:
        `Only ${scenarios.length} roster scenario(s) provided. At least 2 scenarios ` +
        `(typical + worst-case) should be modelled to ensure foreseeable work patterns ` +
        `are covered under the BOOT.`,
    });
  }
}

function detectStaleModelling(
  ea: EATerms,
  patterns: FailurePattern[],
): void {
  const month = getMonth(ea.lodgementDate);

  // April (4) through June (6) is within 3 months of July 1 FY rollover
  if (month >= 4 && month <= 6) {
    patterns.push({
      code: 'stale_modelling',
      description: 'Lodgement near FY rollover -- rates may change',
      severity: 'info',
      affectedClasses: [],
      details:
        `The EA lodgement date (${ea.lodgementDate}) falls within 3 months of the ` +
        `July 1 financial year rollover. Award rates typically change on 1 July each year. ` +
        `Consider re-running the BOOT with updated rates once the new FY rates are published.`,
    });
  }
}

function detectVagueAllInclusive(
  ea: EATerms,
  scenarios: RosterScenario[],
  patterns: FailurePattern[],
): void {
  // Check if any EA classification has a loaded rate
  const hasLoadedRate = ea.classifications.some(
    (cls) => cls.loadedRate !== null,
  );

  if (!hasLoadedRate) return;

  // Check if any scenario has penalty hours > 0
  const hasPenalty = hasPenaltyHours(scenarios);

  if (!hasPenalty) {
    const affectedClasses = ea.classifications
      .filter((cls) => cls.loadedRate !== null)
      .map((cls) => cls.name);

    patterns.push({
      code: 'vague_all_inclusive',
      description: 'All-inclusive rate without penalty scenario proof',
      severity: 'critical',
      affectedClasses,
      details:
        `The EA uses an all-inclusive (loaded) rate but no penalty scenarios have been ` +
        `modelled. The FWC requires mathematical proof that a loaded rate covers all ` +
        `foreseeable penalty exposures. Affected: ${affectedClasses.join(', ')}.`,
    });
  }
}

function detectNonMonetaryOffsetClaimed(
  result: BOOTResult,
  patterns: FailurePattern[],
): void {
  const affectedClasses: string[] = [];

  for (const classResult of result.classResults) {
    // Class must fail monetarily
    const hasMonetaryFail = classResult.scenarios.some(
      (s) => s.verdict === 'fail',
    );

    if (!hasMonetaryFail) continue;

    // Check for "better" non-monetary differences
    const hasBetterNonMonetary = classResult.nonMonetaryDifferences.some(
      (d) => d.assessment === 'better',
    );

    if (hasBetterNonMonetary) {
      affectedClasses.push(classResult.classificationName);
    }
  }

  if (affectedClasses.length > 0) {
    patterns.push({
      code: 'non_monetary_offset_claimed',
      description: 'Non-monetary benefits cannot offset monetary shortfalls',
      severity: 'critical',
      affectedClasses,
      details:
        `Classification(s) fail the monetary BOOT but have "better" non-monetary terms. ` +
        `The FWC has consistently held that non-monetary benefits cannot be used to offset ` +
        `monetary shortfalls in the BOOT assessment. Affected: ${affectedClasses.join(', ')}.`,
    });
  }
}
