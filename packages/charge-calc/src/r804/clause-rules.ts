/**
 * Clause-keyed apprentice modifier engine.
 *
 * PORTED VERBATIM from R80.4 src/awards/clause-rules.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294. Read-only source; faithful copy —
 * do not "fix" anything here without going back to R80.4 first.
 *
 * Awards modify SPECIFIC allowances via SPECIFIC clauses; everything else falls
 * to an award-level default. A single global "apprentice allowance %" per award
 * is structurally wrong — it produced 55/65/75/90 (a WAGE table) where MA000020
 * cl.26.5(a) actually says 75/85/90/95.
 *
 * Rules are keyed by CLAUSE NUMBER and matched by prefix against the `clauses`
 * field the MAPD API returns on every allowance. That is what makes this
 * survivable across financial years and award versions:
 *   - amounts re-pull from the API and update themselves
 *   - a new allowance added under a covered clause inherits the rule for free
 *   - a renumbered or deleted clause STOPS MATCHING and surfaces in the coverage
 *     audit as UNMATCHED, rather than silently reverting to full rate
 *
 * Pure functions only — no React, no network. Everything here is unit-tested by
 * src/__tests__/r804/clause-rules.test.ts (ported from R80.4's
 * src/awards/clause-rules.test.ts).
 */

import { isNum } from "./round.js";
import type { ClauseRule, RuleSet } from "./registry.js";
import type { InteractionRule } from "./interactions.js";
import type { ExternalReference } from "./registry.js";

/**
 * An allowance as the calculator holds it. Re-exported from calc-types rather
 * than declared again here — two definitions of "an allowance" is precisely the
 * drift this engine exists to prevent.
 */
export type { AllowanceRow as Allowance } from "./calc-types.js";
import type { AllowanceRow as Allowance } from "./calc-types.js";

/** How an allowance is treated for an apprentice, with its provenance. */
export interface AllowanceTreatment {
  rule: string;
  clause?: string | null;
  scale?: Record<number, number>;
  unit?: string;
  replacementDollars?: Record<number, number>;
  modifyingClause?: string;
  quotedText?: string;
  sourceLine?: number;
  confidence?: string;
  label?: string;
  why?: string;
  exclusions?: string;
  isDefault?: boolean;
  electionRequired?: boolean;
  election?: string;
  [k: string]: unknown;
}

export interface ClauseContext { cohort?: string; stream?: string; [k: string]: unknown }

/** A GTO's decision on an unresolved clause. */
export interface Election { choice: string; note?: string; scale?: Record<number, number>; unit?: string }

/** Units are explicit at every boundary; conflating them is how this went wrong. */
export const UNIT = {
  /** How much the ALLOWANCE ITSELF pays (e.g. an allowance set at 7.9% of the standard rate). */
  PCT_OF_STANDARD_RATE: "percent_of_standard_rate",
  /** The APPRENTICE'S SHARE of that allowance (e.g. MA000020 cl.26.5(a) 75/85/90/95). */
  PCT_OF_FULL_ALLOWANCE: "percent_of_full_allowance",
  /** A flat replacement schedule. NOT a percentage. */
  DOLLARS_PER_WEEK: "dollars_per_week",
};

export const APPRENTICE_RULE = {
  FULL: "full_rate",
  PROPORTION: "proportion",
  REPLACED: "replaced",
  EXCLUDED: "excluded",
  UNRESOLVED: "unresolved",
};

/**
 * Clause "26.1(a)" matches prefix "26.1"; "26.10(b)" must NOT.
 * Compare on a segment boundary so 26.1 never swallows 26.10.
 */
export function clauseMatchesPrefix(clause?: string | null, prefix?: string | null): boolean {
  if (!clause || !prefix) return false;
  if (clause === prefix) return true;
  if (!clause.startsWith(prefix)) return false;
  const next = clause.charAt(prefix.length);
  return next === "." || next === "(" || next === "";
}

/**
 * Resolve one allowance against an award's rule set.
 * Always returns WHY, so the UI can name the clause that decided it rather than
 * showing an unexplained number.
 */
export function resolveAllowanceRule(
  clause: string | undefined,
  awardRules: RuleSet | null | undefined,
  context: ClauseContext = {},
): AllowanceTreatment {
  if (!awardRules) {
    return {
      rule: APPRENTICE_RULE.FULL,
      why: "No rule set loaded for this award",
      clause: null,
      confidence: "assumed",
    };
  }
  const { cohort = "junior", stream = null } = context;

  // A clause match alone is not enough: MA000025 carries THREE variants of the
  // same allowance clause (junior / adult pre-2014 / adult post-2014), and
  // MA000036 splits general vs trainee apprentices. A rule tagged for a cohort
  // or stream only applies to that one; untagged rules apply to all.
  const applies = (r: ClauseRule) => {
    if (!(r.appliesToClausePrefixes || []).some((p) => clauseMatchesPrefix(clause, p))) return false;
    if (r.appliesToCohorts?.length && !r.appliesToCohorts.includes(cohort)) return false;
    if (r.appliesToStreams?.length && stream && !r.appliesToStreams.includes(stream)) return false;
    return true;
  };

  // Prefer the most specific match — a cohort/stream-tagged rule beats a generic
  // one for the same clause, so ordering in the data file cannot silently decide.
  //
  // PRE-2014 IS DELIBERATELY DEPRIORITISED. A contract of training commenced
  // before 1 Jan 2014 would have completed years ago on any normal term, and the
  // training packages behind those qualifications have been superseded several
  // times over — an apprentice would have to start afresh rather than resume.
  // The schedules stay available for the rare continuing case, but where two
  // rules conflict and no commencement stream was chosen, post-2014 wins.
  const candidates = (awardRules.clauseRules || []).filter(applies);
  const specificity = (r: ClauseRule) => {
    let s = 0;
    if (r.appliesToCohorts?.length) s += 4;
    if (r.appliesToStreams?.length) s += 2;
    if (!stream && r.appliesToStreams?.includes("pre2014")) s -= 3;   // demote legacy
    if (!stream && r.appliesToStreams?.includes("post2014")) s += 1;  // promote current
    return s;
  };
  const hit = candidates.sort((a, b) => specificity(b) - specificity(a))[0];
  if (hit) {
    return {
      rule: hit.rule ?? APPRENTICE_RULE.FULL,
      scale: hit.scale,
      unit: hit.unit,
      replacementDollars: hit.replacementDollars,
      why: `${hit.modifyingClause}: ${hit.quotedText || ""}`.trim(),
      clause: hit.modifyingClause,
      confidence: hit.confidence || "verified",
      exclusions: hit.exclusions,
    };
  }
  const d = awardRules.defaultRule;
  return {
    rule: d?.effect || APPRENTICE_RULE.FULL,
    why: d ? `${d.clause}: ${d.text}` : "No award default recorded — assuming full rate",
    clause: d?.clause || null,
    confidence: d ? "verified" : "assumed",
    isDefault: true,
  };
}

/**
 * Coverage audit. Every operative allowance lands in exactly one bucket, and an
 * unmatched clause with no recorded default is a HARD FAIL rather than a silent
 * pass — that is the check that makes the model trustworthy year to year.
 */
export function auditClauseCoverage(
  operativeClauses: Array<{ clause?: string; label?: string } | string>,
  awardRules: RuleSet | null | undefined,
) {
  const byRule: Record<string, number> = {};
  const unresolved: Array<{ clause: string; label?: string; why?: string }> = [];
  const matched: Array<{ clause: string; label?: string; via?: string | null }> = [];
  const fellToDefault: string[] = [];

  for (const entry of operativeClauses) {
    // Callers pass either a bare clause string or a {clause,label} row.
    const clause = typeof entry === "string" ? entry : (entry?.clause ?? "");
    /* Carry the LABEL through. Two allowances can cite the same clause — a
       report that lists clause numbers alone then reads as a duplicated entry
       rather than as two distinct things needing a ruling, which is exactly
       the confusion this field removes. */
    const label = typeof entry === "string" ? undefined : entry?.label;
    const res = resolveAllowanceRule(clause, awardRules);
    byRule[res.rule] = (byRule[res.rule] || 0) + 1;
    if (res.rule === APPRENTICE_RULE.UNRESOLVED || res.confidence === "unresolved") {
      unresolved.push({ clause, label, why: res.why });
    } else if (res.isDefault) {
      fellToDefault.push(clause);
    } else {
      matched.push({ clause, label, via: res.clause });
    }
  }

  return {
    total: operativeClauses.length,
    matched,
    fellToDefault,
    unresolved,
    byRule,
    hardFail: !awardRules?.defaultRule && operativeClauses.length > 0,
    ok: unresolved.length === 0 && !!awardRules?.defaultRule,
  };
}

/**
 * Apply a resolved rule to one allowance for a given apprenticeship stage.
 * Returns the allowance unchanged when the award pays it in full.
 *
 * `replaced` substitutes a flat weekly dollar schedule for the adult amount
 * (MA000010 cl.54.1(b), MA000089 cl.19.6(b)). The two are not mathematically
 * related, so it is a substitution and NOT a proportion.
 */
export function applyRuleToAllowance(
  allowance: Allowance,
  treatment: AllowanceTreatment | null | undefined,
  stage: number,
): Allowance {
  if (!treatment) return allowance;
  const s = Math.min(Math.max(stage, 1), 4);

  if (treatment.rule === APPRENTICE_RULE.REPLACED) {
    const dollars = treatment.replacementDollars?.[s];
    if (!isNum(dollars)) return allowance;
    return { ...allowance, type: "perWeek", amount: dollars, apprenticeProp: false, _replaced: true };
  }
  if (treatment.rule === APPRENTICE_RULE.EXCLUDED) {
    return { ...allowance, enabled: false, _excluded: true };
  }
  return allowance;
}

/** The apprentice's share for a stage, as a 0-1 factor. 1 = paid in full. */
export function shareFactorForStage(treatment: AllowanceTreatment | null | undefined, stage: number): number {
  if (!treatment || treatment.rule !== APPRENTICE_RULE.PROPORTION) return 1;
  const s = Math.min(Math.max(stage, 1), 4);
  const pct = treatment.scale?.[s];
  return isNum(pct) ? pct / 100 : 1;
}

/**
 * ALLOWANCE INTERACTIONS — the thing a naive "sum the enabled allowances"
 * calculator gets wrong.
 *
 * Awards routinely make one allowance REPLACE another rather than stack with it:
 *   MA000020 cl.26.4 — distant work replaces the cl.26.1 fares allowance once
 *     the 50km / non-metropolitan test is met ("replaces, not additional to")
 *   MA000036 cl.21.10(c)(i) — an employee on a qualifying distant job is NOT
 *     entitled to the cl.21.9 fares/travelling-time allowances for that period
 *   MA000020 25.6(e)(ii) / MA000025 18.7(b)(ii) / MA000036 21.10(d)(iv) — the
 *     weekend-return-home benefit is withheld from anyone on the CASH living-away
 *     allowance (it is only for those on in-kind board and lodging)
 *
 * Summing both sides of any of those overstates the charge rate. The engine
 * detects the conflict and reports it; it does NOT silently disable one, because
 * which one applies is a question about the placement, not about the data.
 */
/** One detected replacement/exclusion pair, with the words that create it. */
export interface AllowanceConflict {
  kind: string;
  /** The clause that creates the interaction. */
  because?: string;
  quotedText?: string;
  condition?: string;
  /** The allowance(s) whose presence triggers the rule. */
  present: Array<{ id?: string | number; name?: string; clause?: string }>;
  /** The allowance(s) it displaces. Never auto-disabled — only reported. */
  displaced: Array<{ id?: string | number; name?: string; clause?: string }>;
}

export function detectAllowanceConflicts(
  enabledAllowances: Allowance[] = [],
  interactionRules: InteractionRule[] = [],
): AllowanceConflict[] {
  const conflicts: AllowanceConflict[] = [];
  const clauseOf = (a: Allowance) => a.clause || "";

  for (const rule of interactionRules) {
    const winner = enabledAllowances.filter((a) =>
      (rule.whenPresentPrefixes || []).some((p) => clauseMatchesPrefix(clauseOf(a), p)));
    if (!winner.length) continue;
    const displaced = enabledAllowances.filter((a) =>
      (rule.displacesPrefixes || []).some((p) => clauseMatchesPrefix(clauseOf(a), p)));
    if (!displaced.length) continue;

    conflicts.push({
      kind: rule.kind || "replaces",
      because: rule.clause,
      quotedText: rule.quotedText,
      condition: rule.condition,
      present: winner.map((a) => ({ id: a.id, name: a.name, clause: a.clause })),
      displaced: displaced.map((a) => ({ id: a.id, name: a.name, clause: a.clause })),
    });
  }
  return conflicts;
}

/**
 * Concept typing. The SAME allowance name means different calculations across
 * awards — "travel time allowance" is a flat $8.69/day in MA000025, a percentage
 * of the employee's own classification rate in MA000036 (25% plumbing vs 75%
 * sprinkler — a 3x spread for an identical commute), and genuinely
 * hours-travelled x ordinary rate in MA000020.
 *
 * Matching on NAME across awards is therefore unsafe. Concept is what carries
 * meaning; the name is just a label the award happened to use.
 */
export const TRAVEL_CONCEPT = {
  DAILY_FARES: "daily_fares",
  TRAVEL_TIME: "travel_time",
  BEYOND_RADIUS: "beyond_radius",
  DISTANT_WORK: "distant_work",
  LIVING_AWAY: "living_away",
  PER_KM_VEHICLE: "per_km_vehicle",
  OTHER: "other",
};

/**
 * An UNRESOLVED clause must not silently resolve to anything — including full
 * rate. The system calculates; it does not interpret. Responsibility for reading
 * the award and any other industrial instrument sits with the GTO.
 *
 * So an unresolved item becomes a REQUIRED ELECTION: the GTO picks a treatment,
 * and until they do, the figure is withheld rather than guessed. A number that
 * appears without an election is indistinguishable from a derived one, and that
 * is precisely the failure mode this whole model exists to prevent.
 */
export const ELECTION = {
  PENDING: "pending",
  FULL: "full_rate",
  EXCLUDED: "excluded",
  CUSTOM: "custom",
};

/**
 * Apply a GTO election over an unresolved treatment.
 * `elections` is a map of modifyingClause -> { choice, scale?, note?, decidedBy?, decidedAt? }.
 */
export function applyElection(
  treatment: AllowanceTreatment,
  elections: Record<string, Election> = {},
): AllowanceTreatment {
  if (!treatment || treatment.rule !== APPRENTICE_RULE.UNRESOLVED) return treatment;
  const e = treatment.clause ? elections[treatment.clause] : undefined;
  if (!e || e.choice === ELECTION.PENDING) {
    return { ...treatment, electionRequired: true, election: ELECTION.PENDING };
  }
  if (e.choice === ELECTION.EXCLUDED) {
    return { ...treatment, rule: APPRENTICE_RULE.EXCLUDED, election: e.choice, electedNote: e.note };
  }
  if (e.choice === ELECTION.CUSTOM && e.scale) {
    return { ...treatment, rule: APPRENTICE_RULE.PROPORTION, scale: e.scale,
             unit: UNIT.PCT_OF_FULL_ALLOWANCE, election: e.choice, electedNote: e.note };
  }
  return { ...treatment, rule: APPRENTICE_RULE.FULL, election: ELECTION.FULL, electedNote: e.note };
}

/** Unresolved treatments still awaiting a GTO election. */
export function pendingElections(
  treatments: Record<string, AllowanceTreatment> = {},
  elections: Record<string, Election> = {},
) {
  return Object.entries(treatments)
    .map(([id, t]) => ({ id, ...applyElection(t, elections) }))
    .filter((t) => t.electionRequired);
}

/**
 * Awards frequently do not define a thing themselves — they INCORPORATE another
 * instrument by reference. The commonest is the National Training Wage: 115 of
 * 141 awards reference it, and 91 name the Miscellaneous Award (MA000104),
 * whose Schedule E many adopt verbatim ("This award incorporates the terms of
 * Schedule E to the Miscellaneous Award 2020").
 *
 * Two distinct shapes, and they must not be conflated:
 *   SELF_CONTAINED  — the award carries its own schedule (MA000010 Schedule G)
 *   INCORPORATED    — the award points at another award's schedule (MA000009)
 *
 * Resolving an INCORPORATED reference means reading the OTHER award. A rate
 * resolved without following the pointer is not the rate that applies.
 */
export const REFERENCE_KIND = {
  SELF_CONTAINED: "self_contained",
  INCORPORATED: "incorporated_by_reference",
};

/**
 * Report whether a wage/allowance concept for an award is defined in-award or
 * lives in another instrument, so a caller never silently resolves against the
 * wrong document.
 */
export function resolveExternalReference(
  awardRules: RuleSet | null | undefined,
  concept = "national_training_wage",
) {
  const refs = awardRules?.externalReferences || [];
  const hit = refs.find((r: ExternalReference) => r.concept === concept);
  if (!hit) return { kind: null, resolved: false, why: `No ${concept} reference recorded for this award` };
  return {
    kind: hit.kind,
    targetAward: hit.targetAward || null,
    targetSchedule: hit.targetSchedule || null,
    resolved: hit.kind === REFERENCE_KIND.SELF_CONTAINED,
    requiresOtherAward: hit.kind === REFERENCE_KIND.INCORPORATED,
    why: hit.quotedText || "",
    clause: hit.clause,
  };
}

/**
 * Compare two award versions' operative clause sets. Makes an annual review
 * mechanical: anything added/removed is exactly what needs re-reading.
 */
export function diffClauseSets(previousClauses: string[], currentClauses: string[]) {
  const prev = new Set(previousClauses || []);
  const cur = new Set(currentClauses || []);
  return {
    added: [...cur].filter((c) => !prev.has(c)).sort(),
    removed: [...prev].filter((c) => !cur.has(c)).sort(),
    unchanged: [...cur].filter((c) => prev.has(c)).sort(),
  };
}
