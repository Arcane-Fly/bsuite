import type {
  BOOTResult,
  BOOTVerdict,
  BOOTWarning,
  EATerms,
  ScenarioType,
  TermComparison,
  NonMonetaryDifference,
} from './types.js';

// ─── F17 Interfaces ───

export interface F17Header {
  agreementName: string;
  lodgementDate: string;
  assessedBy: string;
  assessedAt: string;
  engineVersion: string;
  disclaimer: string;
}

export interface F17ClassificationSheet {
  classificationName: string;
  eaClassificationId: string;
  awardClassificationId: number;
  verdict: BOOTVerdict;
  scenarios: Array<{
    scenarioType: ScenarioType;
    scenarioLabel: string;
    awardAnnualValue: number;
    eaAnnualValue: number;
    difference: number;
    percentDiff: number;
    verdict: BOOTVerdict;
    termBreakdown: TermComparison[];
  }>;
  nonMonetaryDifferences: NonMonetaryDifference[];
}

export interface F17ScenarioMatrix {
  /** Row per classification, column per scenario */
  rows: Array<{
    classificationName: string;
    scenarios: Array<{
      scenarioType: ScenarioType;
      verdict: BOOTVerdict;
      difference: number;
      percentDiff: number;
    }>;
  }>;
}

export interface F17Summary {
  overallVerdict: BOOTVerdict;
  totalClasses: number;
  passCount: number;
  failCount: number;
  marginalCount: number;
  totalDelta: number;
  warnings: BOOTWarning[];
}

export interface F17Data {
  header: F17Header;
  classifications: F17ClassificationSheet[];
  scenarioMatrix: F17ScenarioMatrix;
  summary: F17Summary;
  qualitativeAssessment: {
    terms: string[];
    notes: string[];
  };
}

/** Mandatory disclaimer text for all F17 exports (red-team L-5) */
export const F17_DISCLAIMER =
  'This assessment is a decision-support tool only. It does not constitute legal advice. ' +
  'The Better Off Overall Test (BOOT) under ss.193 and 193A of the Fair Work Act 2009 ' +
  'requires a holistic, qualitative assessment that cannot be fully automated. ' +
  'Human review by a qualified industrial relations professional is required before ' +
  'any reliance is placed on this assessment. Engine outputs should be independently ' +
  'verified against the applicable modern award and enterprise agreement.';

/**
 * Generate structured JSON data for FWC Form F17 comparison spreadsheets.
 *
 * This produces structured data only — it does NOT render PDF or XLSX.
 * The output is designed to be consumed by a presentation layer.
 *
 * @param bootResult - The BOOT comparison result
 * @param ea - The enterprise agreement terms
 * @param assessedBy - Who performed the assessment (defaults to 'System')
 */
export function generateF17Data(
  bootResult: BOOTResult,
  ea: EATerms,
  assessedBy?: string,
): F17Data {
  // 1. Build header
  const header = buildHeader(bootResult, ea, assessedBy);

  // 2. Map classResults to F17ClassificationSheet
  const classifications = buildClassificationSheets(bootResult);

  // 3. Build scenario matrix
  const scenarioMatrix = buildScenarioMatrix(bootResult);

  // 4. Build summary
  const summary = buildSummary(bootResult);

  // 5. Build qualitative assessment from non-monetary differences
  const qualitativeAssessment = buildQualitativeAssessment(bootResult);

  return {
    header,
    classifications,
    scenarioMatrix,
    summary,
    qualitativeAssessment,
  };
}

// ─── Internal Builders ───

function buildHeader(
  bootResult: BOOTResult,
  ea: EATerms,
  assessedBy?: string,
): F17Header {
  return {
    agreementName: ea.agreementName,
    lodgementDate: ea.lodgementDate,
    assessedBy: assessedBy ?? 'System',
    assessedAt: bootResult.assessedAt,
    engineVersion: bootResult.engineVersion,
    disclaimer: F17_DISCLAIMER,
  };
}

function buildClassificationSheets(bootResult: BOOTResult): F17ClassificationSheet[] {
  return bootResult.classResults.map((cls) => ({
    classificationName: cls.classificationName,
    eaClassificationId: cls.eaClassificationId,
    awardClassificationId: cls.awardClassificationId,
    verdict: cls.overallVerdict,
    scenarios: cls.scenarios.map((s) => ({
      scenarioType: s.scenarioType,
      scenarioLabel: s.scenarioLabel,
      awardAnnualValue: s.awardAnnualValue,
      eaAnnualValue: s.eaAnnualValue,
      difference: s.difference,
      percentDiff: s.percentDiff,
      verdict: s.verdict,
      termBreakdown: s.termBreakdown,
    })),
    nonMonetaryDifferences: cls.nonMonetaryDifferences,
  }));
}

function buildScenarioMatrix(bootResult: BOOTResult): F17ScenarioMatrix {
  return {
    rows: bootResult.classResults.map((cls) => ({
      classificationName: cls.classificationName,
      scenarios: cls.scenarios.map((s) => ({
        scenarioType: s.scenarioType,
        verdict: s.verdict,
        difference: s.difference,
        percentDiff: s.percentDiff,
      })),
    })),
  };
}

function buildSummary(bootResult: BOOTResult): F17Summary {
  return {
    overallVerdict: bootResult.overallVerdict,
    totalClasses: bootResult.summary.totalClasses,
    passCount: bootResult.summary.passCount,
    failCount: bootResult.summary.failCount,
    marginalCount: bootResult.summary.marginalCount,
    totalDelta: bootResult.summary.totalDelta,
    warnings: bootResult.warnings,
  };
}

function buildQualitativeAssessment(bootResult: BOOTResult): {
  terms: string[];
  notes: string[];
} {
  const termSet = new Set<string>();
  const noteSet = new Set<string>();

  for (const cls of bootResult.classResults) {
    for (const diff of cls.nonMonetaryDifferences) {
      termSet.add(diff.term);
      if (diff.notes != null) {
        noteSet.add(diff.notes);
      }
    }
  }

  return {
    terms: [...termSet],
    notes: [...noteSet],
  };
}
