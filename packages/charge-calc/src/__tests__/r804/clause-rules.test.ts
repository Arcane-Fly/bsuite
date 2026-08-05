/**
 * Tests for the clause-keyed apprentice modifier engine.
 *
 * PORTED from R80.4 src/awards/clause-rules.test.ts, commit
 * 93b8643951cab759dff8428b63a29629975bb294.
 *
 * ADAPTATIONS (beyond the harness — see round.test.ts in this directory):
 *  DROPPED the final block ("MA000020 registered trace (the data the
 *  calculator actually runs on)"), which asserts against `ruleSetFor("MA000020")`
 *  — i.e. against the contents of `analysis/allowance_trace_MA000020.json`.
 *  That trace file is AWARD-SPECIFIC DATA, deliberately deferred by this
 *  port's scope discipline ("award-specific data modules come next" — see
 *  src/r804/registry.ts's module note, which ships an EMPTY TRACES map for
 *  exactly this reason). Every assertion that exercises the GENERIC clause
 *  engine — matching, coverage audit, replacement/proportion, elections,
 *  cross-award incorporation, allowance interactions with a hand-rolled rule
 *  set — is kept unchanged; only the block that needs the real MA000020 trace
 *  data is excluded, to be restored when that data lands.
 *
 * These guard the specific mistakes that have already been made once:
 *   - a wage percentage used as an allowance share
 *   - dollars read as percentages
 *   - a clause prefix swallowing a longer clause (26.1 matching 26.10)
 *   - an unmatched clause silently reverting to full rate
 */
import { it } from 'vitest';
import { strict as assert } from "node:assert";
import { textContains } from "../../r804/text-normalise.js";

import {
  applyElection,
  applyRuleToAllowance,
  APPRENTICE_RULE,
  auditClauseCoverage,
  clauseMatchesPrefix,
  detectAllowanceConflicts,
  diffClauseSets,
  ELECTION,
  pendingElections,
  REFERENCE_KIND,
  resolveAllowanceRule,
  resolveExternalReference,
  shareFactorForStage,
  TRAVEL_CONCEPT,
  UNIT,
} from "../../r804/clause-rules.js";

const t = (name: string, fn: () => void) => it(name, fn);

/* ── prefix matching ── */
t("26.1(a) matches 26.1", () => assert.equal(clauseMatchesPrefix("26.1(a)", "26.1"), true));
t("26.10(b) does NOT match 26.1 (the swallow trap)", () =>
  assert.equal(clauseMatchesPrefix("26.10(b)", "26.1"), false));
t("23.10(c) does NOT match 23.1", () => assert.equal(clauseMatchesPrefix("23.10(c)", "23.1"), false));
t("exact clause matches itself", () => assert.equal(clauseMatchesPrefix("42.2", "42.2"), true));
t("nested numbering 26.1.3 matches 26.1", () => assert.equal(clauseMatchesPrefix("26.1.3", "26.1"), true));
t("empty inputs never match", () => {
  assert.equal(clauseMatchesPrefix("", "26.1"), false);
  assert.equal(clauseMatchesPrefix("26.1", ""), false);
});

/* ── MA000020 reference rule set ── */
const MA20 = {
  defaultRule: { clause: "14.2", text: "terms apply except where otherwise stated", effect: APPRENTICE_RULE.FULL },
  clauseRules: [
    {
      modifyingClause: "26.5(a)", appliesToClausePrefixes: ["26.1", "26.4"],
      rule: APPRENTICE_RULE.PROPORTION, scale: { 1: 75, 2: 85, 3: 90, 4: 95 },
      unit: UNIT.PCT_OF_FULL_ALLOWANCE, quotedText: "proportion of the allowances in 26.1 and 26.4",
      confidence: "verified"
    },
    {
      modifyingClause: "42.2", appliesToClausePrefixes: ["42.2"],
      rule: APPRENTICE_RULE.UNRESOLVED, confidence: "unresolved"
    },
  ],
};

t("cl.26.1 resolves to the 75/85/90/95 apprentice SHARE, not the wage table", () => {
  const r = resolveAllowanceRule("26.1(a)", MA20);
  assert.equal(r.rule, APPRENTICE_RULE.PROPORTION);
  assert.deepEqual(r.scale, { 1: 75, 2: 85, 3: 90, 4: 95 });
  assert.equal(r.unit, UNIT.PCT_OF_FULL_ALLOWANCE);
  // the wage table for this award is 50/60/75/90 — must never appear here
  assert.notDeepEqual(r.scale, { 1: 50, 2: 60, 3: 75, 4: 90 });
});
t("an unnamed clause falls to the award default and says so", () => {
  const r = resolveAllowanceRule("23.7", MA20);
  assert.equal(r.rule, APPRENTICE_RULE.FULL);
  assert.equal(r.isDefault, true);
  assert.ok(textContains(r.why!, "14.2"));
});
t("no rule set at all is reported as assumed, not verified", () => {
  const r = resolveAllowanceRule("26.1(a)", null);
  assert.equal(r.confidence, "assumed");
});

/* ── cohort / stream specificity ── */
const MA25 = {
  defaultRule: { clause: "12.1(a)", text: "terms apply except where stated", effect: APPRENTICE_RULE.FULL },
  clauseRules: [
    {
      modifyingClause: "16.4(a)(iii)", appliesToClausePrefixes: ["18.3"], rule: APPRENTICE_RULE.PROPORTION,
      scale: { 1: 50, 2: 60, 3: 70, 4: 82 }, appliesToCohorts: ["junior"], confidence: "verified"
    },
    {
      modifyingClause: "16.4(b)(vi)", appliesToClausePrefixes: ["18.3"], rule: APPRENTICE_RULE.PROPORTION,
      scale: { 1: 80, 2: 87, 3: 87, 4: 87 }, appliesToCohorts: ["adult"], appliesToStreams: ["post2014"],
      confidence: "verified"
    },
  ],
};
t("junior cohort gets the junior scale on a shared clause", () => {
  const r = resolveAllowanceRule("18.3(b)", MA25, { cohort: "junior" });
  assert.deepEqual(r.scale, { 1: 50, 2: 60, 3: 70, 4: 82 });
});
t("adult cohort gets the adult scale on the SAME clause", () => {
  const r = resolveAllowanceRule("18.3(b)", MA25, { cohort: "adult", stream: "post2014" });
  assert.deepEqual(r.scale, { 1: 80, 2: 87, 3: 87, 4: 87 });
});

/* ── coverage audit ── */
t("audit buckets every clause and never silently drops one", () => {
  const operative = ["19.5", "21.1(a)", "23.7", "26.1(a)", "26.2(b)(ii)", "26.4(b)(ii)", "42.2(a)"];
  const a = auditClauseCoverage(operative, MA20);
  assert.equal(a.total, 7);
  assert.equal(a.matched.length + a.fellToDefault.length + a.unresolved.length, 7);
  assert.equal(a.matched.length, 2);      // 26.1 + 26.4 via 26.5(a)
  assert.equal(a.unresolved.length, 1);   // 42.2
  assert.equal(a.ok, false);              // unresolved present -> not ok
});
t("missing award default is a HARD FAIL, not a silent pass", () => {
  const a = auditClauseCoverage(["23.7"], { clauseRules: [] } as never);
  assert.equal(a.hardFail, true);
});

/* ── replacement vs proportion ── */
t("replaced substitutes a $/week schedule and disables proportioning", () => {
  const treat = {
    rule: APPRENTICE_RULE.REPLACED, unit: UNIT.DOLLARS_PER_WEEK,
    replacementDollars: { 1: 7.58, 2: 9.81, 3: 13.48, 4: 15.83 }
  };
  const out = applyRuleToAllowance({ amount: 17.9, type: "perWeek", apprenticeProp: true } as never, treat, 3);
  assert.equal(out.amount, 13.48);
  assert.equal(out.type, "perWeek");
  assert.equal(out.apprenticeProp, false, "a replaced allowance must not also be proportioned");
});
t("share factor is the stage percentage, clamped to the table", () => {
  const treat = { rule: APPRENTICE_RULE.PROPORTION, scale: { 1: 75, 2: 85, 3: 90, 4: 95 } };
  assert.equal(shareFactorForStage(treat, 1), 0.75);
  assert.equal(shareFactorForStage(treat, 4), 0.95);
  assert.equal(shareFactorForStage(treat, 9), 0.95, "stage beyond the table clamps to the last");
});
t("full_rate never scales the allowance", () => {
  assert.equal(shareFactorForStage({ rule: APPRENTICE_RULE.FULL }, 1), 1);
  assert.equal(shareFactorForStage(null, 1), 1);
});
t("excluded disables the allowance", () => {
  const out = applyRuleToAllowance({ enabled: true } as never, { rule: APPRENTICE_RULE.EXCLUDED }, 1);
  assert.equal(out.enabled, false);
});

/* ── version diffing ── */
t("clause diff names exactly what changed between award versions", () => {
  const d = diffClauseSets(["26.1(a)", "23.7", "42.2(a)"], ["26.1(a)", "23.7", "27.1(a)"]);
  assert.deepEqual(d.added, ["27.1(a)"]);
  assert.deepEqual(d.removed, ["42.2(a)"]);
  assert.equal(d.unchanged.length, 2);
});


/* ── pre-2014 deprioritisation (operator ruling) ── */
{
  const MA25_streams = {
    defaultRule: { clause: "12.1(a)", text: "terms apply except where stated", effect: APPRENTICE_RULE.FULL },
    clauseRules: [
      {
        modifyingClause: "16.4(b)(iii)", appliesToClausePrefixes: ["18.3"], rule: APPRENTICE_RULE.PROPORTION,
        scale: { 1: 40, 2: 52, 3: 70, 4: 82 }, appliesToStreams: ["pre2014"], confidence: "verified"
      },
      {
        modifyingClause: "16.4(a)(iii)", appliesToClausePrefixes: ["18.3"], rule: APPRENTICE_RULE.PROPORTION,
        scale: { 1: 50, 2: 60, 3: 70, 4: 82 }, appliesToStreams: ["post2014"], confidence: "verified"
      },
    ],
  };
  t("with no stream chosen, post-2014 wins over pre-2014", () => {
    const r = resolveAllowanceRule("18.3(b)", MA25_streams);
    assert.deepEqual(r.scale, { 1: 50, 2: 60, 3: 70, 4: 82 });
  });
  t("pre-2014 is still reachable when explicitly selected", () => {
    const r = resolveAllowanceRule("18.3(b)", MA25_streams, { stream: "pre2014" });
    assert.deepEqual(r.scale, { 1: 40, 2: 52, 3: 70, 4: 82 });
  });
}

/* ── cross-award incorporation by reference ── */
{
  const selfContained = {
    externalReferences: [
      {
        concept: "national_training_wage", kind: REFERENCE_KIND.SELF_CONTAINED,
        targetSchedule: "Schedule G", clause: "Schedule G", quotedText: "Schedule G—National Training Wage"
      }]
  } as never;
  const incorporated = {
    externalReferences: [
      {
        concept: "national_training_wage", kind: REFERENCE_KIND.INCORPORATED,
        targetAward: "MA000104", targetSchedule: "Schedule E", clause: "19.x",
        quotedText: "This award incorporates the terms of Schedule E to the Miscellaneous Award 2020"
      }]
  } as never;

  t("self-contained schedule resolves without leaving the award", () => {
    const r = resolveExternalReference(selfContained);
    assert.equal(r.resolved, true);
    assert.equal(r.requiresOtherAward, false, "self-contained must not demand another award");
  });
  t("incorporated reference REFUSES to resolve and names the target award", () => {
    const r = resolveExternalReference(incorporated);
    assert.equal(r.resolved, false);
    assert.equal(r.requiresOtherAward, true);
    assert.equal(r.targetAward, "MA000104");
  });
  t("absent reference is reported, not assumed", () => {
    const r = resolveExternalReference({} as never, "national_training_wage");
    assert.equal(r.resolved, false);
    assert.equal(r.kind, null);
  });
}

/* ── unresolved requires a GTO election; it never self-resolves ── */
{
  const unresolved = { rule: APPRENTICE_RULE.UNRESOLVED, clause: "18.2(c)(v)", why: "silent on sprinkler allowances" };

  t("unresolved with no election demands one rather than defaulting", () => {
    const r = applyElection(unresolved, {});
    assert.equal(r.electionRequired, true);
    assert.equal(r.election, ELECTION.PENDING);
    assert.equal(r.rule, APPRENTICE_RULE.UNRESOLVED, "must NOT quietly become full_rate");
  });
  t("GTO electing full rate resolves it and records the election", () => {
    const r = applyElection(unresolved, { "18.2(c)(v)": { choice: ELECTION.FULL, note: "18.2(a) default" } });
    assert.equal(r.rule, APPRENTICE_RULE.FULL);
    assert.equal(r.election, ELECTION.FULL);
    assert.equal(r.electionRequired, undefined);
  });
  t("GTO electing excluded resolves the other way", () => {
    const r = applyElection(unresolved, { "18.2(c)(v)": { choice: ELECTION.EXCLUDED } });
    assert.equal(r.rule, APPRENTICE_RULE.EXCLUDED);
  });
  t("GTO electing a custom scale is honoured", () => {
    const r = applyElection(unresolved, { "18.2(c)(v)": { choice: ELECTION.CUSTOM, scale: { 1: 50, 2: 60, 3: 75, 4: 90 } } });
    assert.equal(r.rule, APPRENTICE_RULE.PROPORTION);
    assert.deepEqual(r.scale, { 1: 50, 2: 60, 3: 75, 4: 90 });
  });
  t("a resolved treatment is never touched by elections", () => {
    const full = { rule: APPRENTICE_RULE.FULL, clause: "14.2" };
    assert.deepEqual(applyElection(full, { "14.2": { choice: ELECTION.EXCLUDED } }), full);
  });
  t("pendingElections lists only what still needs a decision", () => {
    const treatments = { a: unresolved, b: { rule: APPRENTICE_RULE.FULL, clause: "14.2" } };
    const p = pendingElections(treatments, {});
    assert.equal(p.length, 1);
    assert.equal(p[0].id, "a");
  });
}

/* ── allowance interactions: replacement must not be summed ── */
{
  // MA000020 cl.26.4 replaces cl.26.1 once the 50km test is met
  const RULES = [{
    clause: "26.4(a)", kind: "replaces" as const,
    whenPresentPrefixes: ["26.4"], displacesPrefixes: ["26.1"],
    condition: "50km / non-metropolitan test met",
    quotedText: "Replaces (not additional to) clause 26.1 fares allowance once the 50km test is met",
  }];

  t("distant work + fares together is flagged as a replacement conflict", () => {
    const enabled = [
      { id: "a", name: "Fares and travel pattern", clause: "26.1(a)" },
      { id: "b", name: "Distant work", clause: "26.4(b)(ii)" },
    ] as never;
    const c = detectAllowanceConflicts(enabled, RULES);
    assert.equal(c.length, 1);
    assert.equal(c[0].kind, "replaces");
    assert.equal(c[0].displaced[0].id, "a");
    assert.equal(c[0].present[0].id, "b");
  });
  t("fares alone raises no conflict", () => {
    const c = detectAllowanceConflicts([{ id: "a", name: "Fares", clause: "26.1(a)" }] as never, RULES);
    assert.equal(c.length, 0);
  });
  t("distant work alone raises no conflict", () => {
    const c = detectAllowanceConflicts([{ id: "b", name: "Distant work", clause: "26.4(b)(ii)" }] as never, RULES);
    assert.equal(c.length, 0);
  });
  t("conflict detection does not disable anything itself", () => {
    const enabled = [
      { id: "a", name: "Fares", clause: "26.1(a)", enabled: true },
      { id: "b", name: "Distant work", clause: "26.4(b)(ii)", enabled: true },
    ];
    detectAllowanceConflicts(enabled as never, RULES);
    assert.equal(enabled[0].enabled, true, "the GTO decides which applies, not the engine");
    assert.equal(enabled[1].enabled, true);
  });
  t("a conflict names the clause and quotes the award", () => {
    const c = detectAllowanceConflicts([
      { id: "a", clause: "26.1(a)" }, { id: "b", clause: "26.4(b)(ii)" }] as never, RULES);
    assert.equal(c[0].because, "26.4(a)");
    assert.ok(textContains(c[0].quotedText!, "not additional to"));
  });
  t("travel concepts are distinct so cross-award name matching is never relied on", () => {
    assert.notEqual(TRAVEL_CONCEPT.TRAVEL_TIME, TRAVEL_CONCEPT.DAILY_FARES);
    assert.notEqual(TRAVEL_CONCEPT.BEYOND_RADIUS, TRAVEL_CONCEPT.DISTANT_WORK);
  });
}
