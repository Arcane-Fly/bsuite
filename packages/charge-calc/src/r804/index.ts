/**
 * @bsuite/charge-calc/r804 — the R80.4 reference calculation engine, ported.
 *
 * PROVENANCE: ported from `~/Desktop/Dev/R80.4` (`r80-4-charge-calculator`,
 * v9.2.0, private) src/awards/*, commit
 * 93b8643951cab759dff8428b63a29629975bb294 (2026-08-05T21:06:19+08:00, branch
 * development). R80.4 is READ-ONLY source to this port — a separate lane is
 * still actively refining it. Re-sync by diffing this directory's files
 * against R80.4's src/awards/ under the same filenames; they are kept
 * recognisably 1:1 on purpose.
 *
 * BINDING PRECEDENT: precedent__bsuite__20260802__r804_is_the_reference_engine
 * (tier 1) — R80.4's calculations replace R80.3's; where they disagree, R80.4
 * wins. precedent__bsuite__20260731__rate_calculation_owned_by_r8 (tier 2) and
 * precedent__bsuite__20260803__r8_is_a_calculator — this module is PURE
 * calculation: no data fetching, no Supabase, no persistence, no UI. Inputs
 * in, numbers out. A caller (crm7, R80.3, BSU) owns fetching the inputs and
 * persisting the outputs.
 *
 * WHAT'S HERE (the calc core, ported completely, per the port's scope
 * discipline):
 *   - calc-types.ts   the CalcConfig / CalcResult contract
 *   - calculate.ts     THE ENGINE — one pure function, config in, result out
 *   - round.ts          the one money-rounding implementation (+ the award
 *                        rounding variants R80.4 has needed so far)
 *   - ordinary-wage-breakdown.ts   one itemised derivation for quote/invoice/payslip
 *   - contingent-costs.ts          accident pay, redundancy, school-based
 *                                   apprentices, and the cl.12 casual rules
 *   - clause-rules.ts   the clause-keyed apprentice modifier engine
 *   - registry.ts        clause-rule TYPES + generic machinery (TRACES is
 *                         EMPTY — see the file's own note)
 *   - interactions.ts    allowance-conflict TYPES (catalogue EMPTY — see the
 *                         file's own note)
 *   - funding.ts          the milestone funding model (NOT a scheme catalogue —
 *                          operator directive 2026-08-05: never pre-populate
 *                          funding/schemes, the caller supplies milestones)
 *   - ma000020-minimum-engagement.ts / ma000020-daily-hire.ts /
 *     ma000020-supervision.ts   hard runtime dependencies of calculate() —
 *     MA000020 is the award the reference engine is written against, so these
 *     are calc-core, not "award-specific data modules ... next"
 *   - text-normalise.ts   no-regex text comparison helpers the tests depend on
 *
 * WHAT'S NOT HERE YET (deferred per scope discipline — "award-specific data
 * modules come next"):
 *   - The five allowance_trace_*.json files (MA000010/20/25/36/89) that
 *     populate registry.ts's TRACES.
 *   - interactions.ts's INTERACTION_RULES / NTW_REFERENCES catalogue.
 *   - Every ma0000NN-*.ts award-data module beyond the three MA000020 files
 *     calculate() hard-imports (minimum-engagement, daily-hire, supervision).
 *   - funding-programs.ts, the seeded named-scheme catalogue (operator
 *     directive: do not pre-populate funding schemes at all).
 */

export * from "./calc-types.js";
export { calculate } from "./calculate.js";
export {
  round2, round4, isNum, money,
  roundToTenCents, roundToFiveCentsLowerTie, roundToNearestFiveCents,
} from "./round.js";
export {
  ordinaryWage, ordinaryWageBreakdown, documentFraming, renderBreakdown,
  ALL_PURPOSE_DEFINITION,
} from "./ordinary-wage-breakdown.js";
export type { OrdinaryWageLine, OrdinaryWageBreakdown, WageLineKind, RateDocument } from "./ordinary-wage-breakdown.js";
export {
  accidentPay, ACCIDENT_PAY,
  redundancyPay, REDUNDANCY_BANDS,
  schoolBasedStage, schoolBasedPaidTrainingHours, schoolBasedVsFullTime, SCHOOL_BASED,
  casualOrdinaryRate, casualPenaltyMultiplier, casualExcludedOnCosts, CASUAL,
} from "./contingent-costs.js";
export type { AccidentPayResult, RedundancyResult } from "./contingent-costs.js";
export {
  MINIMUM_ENGAGEMENTS, minimumEngagementFor, applyMinimumEngagement, partDayPublicHolidayHours,
} from "./ma000020-minimum-engagement.js";
export type { MinimumEngagement, EngagementResult } from "./ma000020-minimum-engagement.js";
export { DAILY_HIRE, dailyHireApplies, dailyHireOrdinaryHourly } from "./ma000020-daily-hire.js";
export type { EngagementClass, DailyHireResult } from "./ma000020-daily-hire.js";
export {
  LEADING_HAND_BANDS, LEADING_HAND, leadingHandAmount,
  FOREPERSON, FOREPERSON_RATES, forepersonRate, FOREPERSON_CONDITIONS,
} from "./ma000020-supervision.js";
export type { LeadingHandResult, ForepersonResult } from "./ma000020-supervision.js";
export {
  UNIT, APPRENTICE_RULE, clauseMatchesPrefix, resolveAllowanceRule, auditClauseCoverage,
  applyRuleToAllowance, shareFactorForStage, detectAllowanceConflicts, TRAVEL_CONCEPT,
  ELECTION, applyElection, pendingElections, REFERENCE_KIND, resolveExternalReference,
  diffClauseSets,
} from "./clause-rules.js";
export type {
  Allowance, AllowanceTreatment, ClauseContext, Election, AllowanceConflict,
} from "./clause-rules.js";
export {
  traceToRuleSet, ruleSetFor, tracedAwards, registryHealth,
} from "./registry.js";
export type {
  ClauseRule, RuleSet, ExternalReference, TraceAllowanceRule, AwardTrace,
} from "./registry.js";
export {
  interactionRulesFor, ntwReferenceFor, awardsWithInteractionRules,
  INTERACTION_RULES, NTW_REFERENCES,
} from "./interactions.js";
export type { InteractionRule, NtwReference } from "./interactions.js";
export {
  PASS_THROUGH, FUNDING_MODE, EXAMPLE_MILESTONES,
  buildFundingSchedule, auditFundingSchedule, passThroughFactor,
  resolveFundingRate, combineFundingSchemes, fundingAppliesToRateCategory,
} from "./funding.js";
export type { Milestone, FundingScheme, FundingAuditNote, CombinedFunding, FundingRateResult } from "./funding.js";
export {
  normaliseAwardText, awardContains, awardContainsAmount, digitsOnly, firstNumber,
  textContains, isClauseReference, countBefore, sumCountsBefore, occurrences,
  parseAwardTocLine, envValue, extractQuotedAfter, extractClauseRefs,
  extractNameAmountPairs, hasWord, isAwardFileName, ownsAwardModule,
} from "./text-normalise.js";
