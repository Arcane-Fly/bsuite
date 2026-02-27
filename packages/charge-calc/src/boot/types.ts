import { z } from 'zod';

// ─── Employment Types ───
export const EmploymentTypeZ = z.enum(['fullTime', 'partTime', 'casual']);
export type EmploymentType = z.infer<typeof EmploymentTypeZ>;

// ─── Roster Scenario ───
export const ScenarioTypeZ = z.enum([
  'typical',       // Normal working pattern
  'worstCase',     // Maximum penalty exposure
  'casualMinimum', // Minimum engagement pattern
  'peakDemand',    // Busy period roster
]);
export type ScenarioType = z.infer<typeof ScenarioTypeZ>;

export const RosterScenarioZ = z.object({
  scenarioType: ScenarioTypeZ,
  label: z.string(),
  employmentType: EmploymentTypeZ,
  ordinaryHoursPerWeek: z.number(),
  // Weekly hours breakdown by category
  weeklyBreakdown: z.object({
    ordinaryDay: z.number().default(0),      // Mon-Fri day
    saturdayOrdinary: z.number().default(0),  // Saturday at ordinary
    sundayOrdinary: z.number().default(0),    // Sunday at ordinary
    publicHoliday: z.number().default(0),     // Public holiday
    overtime15x: z.number().default(0),       // OT at 1.5x
    overtime2x: z.number().default(0),        // OT at 2x
    nightShift: z.number().default(0),        // Night shift loading
    afternoonShift: z.number().default(0),    // Afternoon shift loading
    casualLoading: z.number().default(0),     // Hours attracting casual loading (25%)
  }),
  weeksPerYear: z.number().default(48), // Working weeks (excludes AL)
});
export type RosterScenario = z.infer<typeof RosterScenarioZ>;

// ─── Monetary Terms ───
export const MonetaryTermsZ = z.object({
  baseHourlyRate: z.number(),
  casualLoading: z.number().default(0.25),  // 25%
  penaltyRates: z.object({
    saturday: z.number().nullable().default(null),    // e.g. 1.5
    sunday: z.number().nullable().default(null),      // e.g. 2.0
    publicHoliday: z.number().nullable().default(null), // e.g. 2.5
    overtime15x: z.number().default(1.5),
    overtime2x: z.number().default(2.0),
    nightShift: z.number().nullable().default(null),
    afternoonShift: z.number().nullable().default(null),
  }),
  allowances: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    frequency: z.enum(['perHour', 'perDay', 'perWeek', 'perAnnum']),
    isAllPurpose: z.boolean(),
  })).default([]),
  superRate: z.number().default(0.12),
  leaveLoadingPercent: z.number().default(17.5),
  annualLeaveDays: z.number().default(20),
  personalLeaveDays: z.number().default(10),
  redundancyWeeks: z.number().nullable().default(null),
});
export type MonetaryTerms = z.infer<typeof MonetaryTermsZ>;

// ─── Non-Monetary Terms ───
export const NonMonetaryTermsZ = z.object({
  ordinaryHoursPerWeek: z.number().default(38),
  maxDailyOrdinaryHours: z.number().nullable().default(null),
  spanOfHours: z.object({
    start: z.string().default('06:00'),
    end: z.string().default('18:00'),
  }).default({ start: '06:00', end: '18:00' }),
  rosteringNotice: z.string().nullable().default(null),
  minimumEngagementHours: z.number().nullable().default(null),
  mealBreakAfterHours: z.number().nullable().default(null),
  restBreakMinutes: z.number().nullable().default(null),
  consultationObligations: z.string().nullable().default(null),
  disputeResolution: z.string().nullable().default(null),
  noticeOfTermination: z.string().nullable().default(null),
});
export type NonMonetaryTerms = z.infer<typeof NonMonetaryTermsZ>;

/** Full default for NonMonetaryTerms -- used in parent schema defaults (Zod v4 compat) */
const NON_MONETARY_DEFAULTS: NonMonetaryTerms = {
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

// ─── EA (Enterprise Agreement) Terms ───
export const EAClassificationZ = z.object({
  id: z.string(),
  name: z.string(),
  awardClassificationId: z.number(), // maps to award classification
  terms: MonetaryTermsZ,
  /** For loaded rate EAs: the all-inclusive hourly rate */
  loadedRate: z.number().nullable().default(null),
});
export type EAClassification = z.infer<typeof EAClassificationZ>;

export const EATermsZ = z.object({
  agreementName: z.string(),
  lodgementDate: z.string(), // ISO date
  classifications: z.array(EAClassificationZ),
  nonMonetary: NonMonetaryTermsZ.default(NON_MONETARY_DEFAULTS),
});
export type EATerms = z.infer<typeof EATermsZ>;

// ─── Award Schedule (for comparison) ───
export const AwardScheduleZ = z.object({
  awardCode: z.string(),
  awardName: z.string(),
  classifications: z.array(z.object({
    classificationFixedId: z.number(),
    name: z.string(),
    terms: MonetaryTermsZ,
  })),
  nonMonetary: NonMonetaryTermsZ.default(NON_MONETARY_DEFAULTS),
});
export type AwardSchedule = z.infer<typeof AwardScheduleZ>;

// ─── BOOT Results ───
export const BOOTVerdictZ = z.enum(['pass', 'fail', 'marginal', 'indeterminate']);
export type BOOTVerdict = z.infer<typeof BOOTVerdictZ>;

export const TermComparisonZ = z.object({
  term: z.string(),
  awardValue: z.number(),
  eaValue: z.number(),
  difference: z.number(),    // EA - Award (positive = EA better)
  percentDiff: z.number(),
});
export type TermComparison = z.infer<typeof TermComparisonZ>;

export const BOOTScenarioResultZ = z.object({
  scenarioType: ScenarioTypeZ,
  scenarioLabel: z.string(),
  awardAnnualValue: z.number(),
  eaAnnualValue: z.number(),
  difference: z.number(),
  percentDiff: z.number(),
  verdict: BOOTVerdictZ,
  termBreakdown: z.array(TermComparisonZ),
});
export type BOOTScenarioResult = z.infer<typeof BOOTScenarioResultZ>;

export const NonMonetaryDifferenceZ = z.object({
  term: z.string(),
  awardProvision: z.string(),
  eaProvision: z.string(),
  assessment: z.enum(['equivalent', 'better', 'worse', 'different', 'missing']),
  notes: z.string().nullable().default(null),
});
export type NonMonetaryDifference = z.infer<typeof NonMonetaryDifferenceZ>;

export const BOOTClassResultZ = z.object({
  classificationName: z.string(),
  awardClassificationId: z.number(),
  eaClassificationId: z.string(),
  scenarios: z.array(BOOTScenarioResultZ),
  nonMonetaryDifferences: z.array(NonMonetaryDifferenceZ),
  overallVerdict: BOOTVerdictZ,
  worstScenario: ScenarioTypeZ.nullable(),
  bestDelta: z.number(),   // Most positive difference
  worstDelta: z.number(),  // Most negative difference
});
export type BOOTClassResult = z.infer<typeof BOOTClassResultZ>;

export const BOOTWarningZ = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
});
export type BOOTWarning = z.infer<typeof BOOTWarningZ>;

export const BOOTResultZ = z.object({
  overallVerdict: BOOTVerdictZ,
  classResults: z.array(BOOTClassResultZ),
  warnings: z.array(BOOTWarningZ),
  /** ALWAYS true -- human review is required for all BOOT assessments (red-team L-1) */
  humanReviewRequired: z.literal(true),
  assessedAt: z.string(),
  engineVersion: z.string(),
  summary: z.object({
    totalClasses: z.number(),
    passCount: z.number(),
    failCount: z.number(),
    marginalCount: z.number(),
    totalDelta: z.number(),
  }),
});
export type BOOTResult = z.infer<typeof BOOTResultZ>;

// ─── Marginal Config ───
export const MarginalConfigZ = z.object({
  /** Percentage threshold below which a pass is considered marginal (default 5%) */
  marginalThreshold: z.number().default(0.05),
  /** Enable reconciliation clause recommendation for marginal results */
  recommendReconciliation: z.boolean().default(true),
});
export type MarginalConfig = z.infer<typeof MarginalConfigZ>;

export const DEFAULT_MARGINAL_CONFIG: MarginalConfig = {
  marginalThreshold: 0.05,
  recommendReconciliation: true,
};

// ─── Reconciliation Clause ───
export const ReconciliationClauseZ = z.object({
  reviewFrequencyMonths: z.number().default(6),
  topUpDeadlineDays: z.number().default(49),
  penaltyMultiplier: z.number().default(1.05),
});
export type ReconciliationClause = z.infer<typeof ReconciliationClauseZ>;

export const DEFAULT_RECONCILIATION: ReconciliationClause = {
  reviewFrequencyMonths: 6,
  topUpDeadlineDays: 49,
  penaltyMultiplier: 1.05,
};

// ─── GTO Multi-Placement Types ───

export const GTOPlacementZ = z.object({
  hostEmployerId: z.string(),
  hostEmployerName: z.string(),
  applicableAwards: z.array(AwardScheduleZ),
  scenarios: z.array(RosterScenarioZ),
  /** Fraction of time at this placement (0-1). All placements should sum to 1. */
  timeAllocation: z.number().min(0).max(1),
});
export type GTOPlacement = z.infer<typeof GTOPlacementZ>;

export const GTOPlacementScheduleZ = z.object({
  apprenticeId: z.string(),
  currentYear: z.number(),
  placements: z.array(GTOPlacementZ),
});
export type GTOPlacementSchedule = z.infer<typeof GTOPlacementScheduleZ>;

export const GTOPlacementResultZ = z.object({
  hostEmployerId: z.string(),
  hostEmployerName: z.string(),
  timeAllocation: z.number(),
  bootResult: BOOTResultZ,
});
export type GTOPlacementResult = z.infer<typeof GTOPlacementResultZ>;

export const GTOBOOTResultZ = z.object({
  apprenticeId: z.string(),
  currentYear: z.number(),
  placements: z.array(GTOPlacementResultZ),
  /** Overall verdict: fails if ANY placement fails (per s.193 — every employee must individually pass) */
  overallVerdict: BOOTVerdictZ,
  /** The placement that performs worst */
  weakestPlacement: GTOPlacementResultZ.nullable(),
  /** Weighted aggregate delta (sum of worstDelta * timeAllocation) */
  weightedAggregateDelta: z.number(),
  warnings: z.array(BOOTWarningZ),
  humanReviewRequired: z.literal(true),
  assessedAt: z.string(),
  engineVersion: z.string(),
});
export type GTOBOOTResult = z.infer<typeof GTOBOOTResultZ>;

export const ENGINE_VERSION = '2.0.0';
