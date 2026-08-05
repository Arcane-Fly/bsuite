/**
 * Award rule registry — TYPES AND GENERIC MACHINERY, pending the award-data port.
 *
 * PORTED, WITH ONE DELIBERATE OMISSION, from R80.4 src/awards/registry.ts,
 * commit 93b8643951cab759dff8428b63a29629975bb294. Read-only source.
 *
 * Upstream's `TRACES` map imports five `analysis/allowance_trace_*.json` files
 * (MA000010, MA000020, MA000025, MA000036, MA000089) — the SINGLE SOURCE OF
 * TRUTH for per-allowance apprentice treatment, produced against the award text
 * by a separate process. That is AWARD-SPECIFIC DATA, not calc-core machinery,
 * and this port's scope discipline defers award-specific data modules to a
 * later pass ("Award-specific data modules (ma000020, ma000025, …) come next").
 *
 * Hand-transcribing the trace JSON here would violate the port's own rule
 * against re-deriving anything from R80.4 rather than copying it verbatim, so
 * `TRACES` ships EMPTY below: every `ruleSetFor()` call returns null until the
 * award-data pass copies the trace files across unmodified. `clause-rules.ts`
 * and its generic tests do not depend on the traces being populated; only the
 * "MA000020 registered trace" block of upstream's clause-rules.test.ts does,
 * and that block is excluded from this port for exactly this reason (see
 * src/__tests__/r804/clause-rules.test.ts).
 *
 * Everything else below — types, traceToRuleSet, tracedAwards, registryHealth —
 * is copied verbatim; only the TRACES literal and its import list differ from
 * upstream.
 */

import { digitsOnly, hasWord } from "./text-normalise.js";
import { APPRENTICE_RULE } from "./clause-rules.js";

/** Shape of an entry in analysis/allowance_trace_*.json. */
export interface TraceAllowanceRule {
  allowance: string;
  allowance_clause?: string;
  apprentice_rule?: string;
  modifying_clause?: string;
  modifying_text?: string;
  line_ref?: number;
  exclusions?: string;
  confidence?: string;
  scale?: Record<string, number>;
  unit?: string;
  replacement_dollars?: Record<string, number>;
}

export interface AwardTrace {
  award_code?: string;
  award_name?: string;
  source_file?: string;
  verified_date?: string;
  default_rule?: { clause?: string; text?: string; effect?: string; note?: string } | null;
  allowance_rules?: TraceAllowanceRule[];
  unresolved?: Array<Record<string, unknown>>;
}

export interface ClauseRule {
  modifyingClause?: string;
  appliesToClausePrefixes: string[];
  rule?: string;
  scale?: Record<number, number>;
  unit?: string;
  replacementDollars?: Record<number, number>;
  quotedText?: string;
  sourceLine?: number;
  exclusions?: string;
  confidence: string;
  appliesToCohorts?: string[];
  appliesToStreams?: string[];
  /**
   * Display label. Set by traceToRuleSet from the trace's allowance name; a
   * hand-written inline rule has no such name, so it is OPTIONAL — nothing
   * about clause MATCHING depends on it.
   */
  label?: string;
}

/** An instrument this award incorporates by reference rather than defining itself. */
export interface ExternalReference {
  concept: string;
  kind?: string;
  targetAward?: string;
  targetSchedule?: string;
  clause?: string;
  quotedText?: string;
}

export interface RuleSet {
  defaultRule: { clause?: string; text?: string; effect: string; note?: string } | null;
  clauseRules: ClauseRule[];
  /** Absent means none recorded — the audit treats absent and empty alike. */
  unresolved?: Array<Record<string, unknown>>;
  externalReferences?: ExternalReference[];
  sourceFile?: string;
  verifiedDate?: string;
}

/**
 * NOT PORTED YET — see the module note. Upstream keys this on MA000010,
 * MA000020, MA000025, MA000036 and MA000089 via imported trace JSON. Empty
 * here until the award-data pass copies those files across.
 */
const TRACES: Record<string, AwardTrace> = {};

/** Infer cohort/stream tags from the trace's allowance label. */
function tagsFromLabel(label = ""): { cohorts: string[]; streams: string[] } {
  const l = label.toLowerCase();
  const cohorts: string[] = [];
  const streams: string[] = [];
  if (hasWord(l, "junior") && l.includes("junior apprentice")) cohorts.push("junior");
  if (hasWord(l, "adult") && l.includes("adult apprentice")) cohorts.push("adult");
  if (["pre2014", "pre-2014", "before 1 january 2014"].some((p) => l.includes(p))) streams.push("pre2014");
  if (["post2014", "post-2014", "on after 1 january 2014", "on/after 1 january 2014", "after 1 january 2014"].some((p) => l.includes(p))) streams.push("post2014");
  if (hasWord(l, "trainee") && l.includes("trainee apprentice")) streams.push("trainee");
  if (l.includes("general (non-trainee)")) streams.push("general");
  if (l.includes("sprinkler")) streams.push("sprinkler");
  if (hasWord(l, "plumbing")) streams.push("plumbing");
  return { cohorts, streams };
}

/** {year_1: 50, ...} -> {1: 50, ...} so the engine can index by stage number. */
function normaliseScale(scale?: Record<string, number> | null): Record<number, number> | undefined {
  if (!scale) return undefined;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(scale)) {
    const n = Number(digitsOnly(String(k)));   // no regex — BSuite house rule
    if (n) out[n] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Trace JSON -> the clause engine's rule-set shape. */
export function traceToRuleSet(trace: AwardTrace | null | undefined): RuleSet | null {
  if (!trace) return null;
  const clauseRules = (trace.allowance_rules || [])
    // full_rate entries are the default; carrying them adds noise without changing
    // behaviour, and the coverage audit reports them as "fell to default" anyway.
    .filter((r: TraceAllowanceRule) => r.apprentice_rule && r.apprentice_rule !== APPRENTICE_RULE.FULL)
    .map((r: TraceAllowanceRule) => {
      const { cohorts, streams } = tagsFromLabel(r.allowance);
      return {
        modifyingClause: r.modifying_clause,
        // A trace may name several clauses in one string ("21.3(f); 21.3(g)").
        appliesToClausePrefixes: String(r.allowance_clause || "")
          .split(/[;,]/)
          .map((c) => c.trim())
          .filter(Boolean),
        rule: r.apprentice_rule,
        scale: normaliseScale(r.scale),
        unit: r.unit,
        replacementDollars: normaliseScale(r.replacement_dollars),
        quotedText: r.modifying_text || r.allowance,
        sourceLine: r.line_ref,
        exclusions: r.exclusions,
        confidence: r.confidence || "verified",
        appliesToCohorts: cohorts.length ? cohorts : undefined,
        appliesToStreams: streams.length ? streams : undefined,
        label: r.allowance,
      };
    });

  return {
    defaultRule: trace.default_rule
      ? {
          clause: trace.default_rule.clause,
          text: trace.default_rule.text,
          effect: trace.default_rule.effect || APPRENTICE_RULE.FULL,
          note: trace.default_rule.note,
        }
      : null,
    clauseRules,
    unresolved: trace.unresolved || [],
    sourceFile: trace.source_file,
    verifiedDate: trace.verified_date,
  };
}

/** Rule set for an award code, or null if no trace is registered. */
export function ruleSetFor(awardCode: string): RuleSet | null {
  const t = TRACES[awardCode] as AwardTrace | undefined;
  return t ? traceToRuleSet(t) : null;
}

/** Award codes that have a clause trace loaded. */
export function tracedAwards(): string[] {
  return Object.keys(TRACES);
}

/**
 * Health check over every registered trace. Surfaces the things that quietly
 * rot: a trace with no default rule (so unmatched clauses are assumed, not
 * derived), and any unresolved items still awaiting a human ruling.
 */
export function registryHealth() {
  return tracedAwards().map((code) => {
    const rs = ruleSetFor(code);
    return {
      award: code,
      hasDefault: !!rs?.defaultRule,
      ruleCount: rs?.clauseRules?.length || 0,
      unresolvedCount: rs?.unresolved?.length || 0,
      verifiedDate: rs?.verifiedDate,
      ok: !!rs?.defaultRule,
    };
  });
}
