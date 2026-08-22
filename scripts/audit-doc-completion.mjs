#!/usr/bin/env node
/**
 * audit-doc-completion.mjs — which docs have EARNED a completion marker.
 *
 * THE BAR, set by the operator 2026-08-21: a doc may carry a completion word in
 * its FILENAME only if BOTH (a) it is superseded, or it documented something
 * that was not best practice and best practice has since been implemented; AND
 * (b) the thing it describes is 100% proven production code — theme, UX,
 * one-shot/DRY, cross-cutting, routes, lints, types, barrels, indexes, security.
 *
 * WHY THIS IS BUILT TO UNDER-CLAIM
 *
 * The asymmetry decides everything. A MISSED completion costs a re-review. A
 * FALSE completion costs the truth of the whole corpus, permanently, in a
 * filename every future reader trusts at a glance.
 *
 * CITATION BINDING, NOT KEYWORD BINDING — the correction that matters
 *
 * The first version of this tool matched keywords, so a doc mentioning "policy"
 * or "route" counted as bound. It reported 437 of 463 docs bindable. That is
 * not a finding; it is the word "route" being common. Bindable-by-keyword is
 * not provable, and shipping it as eligibility would have produced exactly the
 * false completion the tool exists to prevent.
 *
 * A doc now binds ONLY if it NAMES the artifact that proves it — a gate script
 * or a workflow file. Naming a thing is a checkable claim; mentioning a topic
 * is not.
 *
 * AND A CITATION ONLY COUNTS IF THE ARTIFACT STILL EXISTS. A doc naming a gate
 * that has since been deleted is citing a ghost, which is worse than citing
 * nothing — it reads as evidence. Those are reported separately.
 *
 * This tool RENAMES NOTHING. A filename is a claim to every future reader; it
 * refuses to make that claim on its own authority.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// A completion word inside a HYPHENATED PHRASE is not a completion marker.
// `20260805-portal-persona-jobs-to-be-done-v1.00W.md` was counted as "already marked
// complete" because "done" sits between two hyphens — but "jobs-to-be-done" is a
// compound noun, not a status. It inflated the very count used to judge whether the
// estate marks docs honestly.
//
// Same shape as a colour literal in prose tripping a colour gate: the token matches,
// the meaning does not.
const COMPLETION_WORDS = /(^|[-_.])(complete|completed|done|final|superseded|closed|obsolete|retired|archived)([-_.]|$)/i;
/** Words that, immediately before a completion word, make it part of a phrase. */
const PHRASE_PREFIX = /(to-be|to_be|not|never|well|half|nearly|almost)-?$/i;

export function isCompletionMarked(filename) {
  const m = filename.match(COMPLETION_WORDS);
  if (!m) return false;
  const before = filename.slice(0, m.index + (m[1] ? m[1].length : 0));
  return !PHRASE_PREFIX.test(before);
}

/** Artifacts a doc explicitly names. Naming is checkable; mentioning is not. */
export function citedArtifacts(text) {
  const out = { gates: [], workflows: [], migrations: [], prs: [] };
  for (const m of text.matchAll(/\b((?:check|audit|codemod|verify|lint)-[a-z0-9-]+\.(?:mjs|sh|py))\b/g)) out.gates.push(m[1]);
  // Workflow citations only. A bare `.ya?ml` pattern also matches
  // pnpm-lock.yaml and pnpm-workspace.yaml, which are real files that simply do
  // not live in .github/workflows -- so they reported as DEAD gates, i.e. as
  // ghosts, i.e. as a finding. They are neither. Exclude the known non-workflow
  // YAML by name rather than by guessing at shape.
  const NOT_A_WORKFLOW = /^(pnpm-lock|pnpm-workspace|package-lock|docker-compose|vercel|supabase|tsconfig|\.?eslintrc|renovate)\b/i;
  for (const m of text.matchAll(/\b([a-z0-9][a-z0-9-]*\.ya?ml)\b/g)) {
    if (!NOT_A_WORKFLOW.test(m[1])) out.workflows.push(m[1]);
  }
  for (const m of text.matchAll(/\b(\d{14})\b/g)) out.migrations.push(m[1]);
  for (const m of text.matchAll(/\b((?:bsuite|crm7|conduit|braden|throughput)#\d+)/g)) out.prs.push(m[1]);
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
  return out;
}

export function classify(text, filename, artifactsPresent) {
  const cited = citedArtifacts(text);
  const liveGates = cited.gates.filter((g) => artifactsPresent.has(g));
  const liveWorkflows = cited.workflows.filter((w) => artifactsPresent.has(w));
  const dead = [
    ...cited.gates.filter((g) => !artifactsPresent.has(g)),
    ...cited.workflows.filter((w) => !artifactsPresent.has(w)),
  ];
  return {
    alreadyMarked: isCompletionMarked(filename),
    cited,
    liveGates,
    liveWorkflows,
    deadCitations: dead,
    bindable: liveGates.length > 0 || liveWorkflows.length > 0,
  };
}

const SELF_TESTS = [
  { name: 'a filename already claiming completion is detected',
    f: 'x-COMPLETE.md', t: '', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'the word "final" mid-word does not count (finalise)',
    f: 'finalise-plan.md', t: '', g: [],
    expect: (r) => r.alreadyMarked === false },
  { name: 'MENTIONING a topic does NOT bind — this is the whole correction',
    f: 'x.md', t: 'we fixed the routes and the RLS policies and the theme tokens', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === false },
  { name: 'NAMING a gate that exists DOES bind',
    f: 'x.md', t: 'verified by check-phantom-migrations.mjs', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === true && r.liveGates.length === 1 },
  { name: 'naming a gate that does NOT exist is a DEAD citation, never a binding',
    f: 'x.md', t: 'verified by check-deleted-thing.mjs', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === false && r.deadCitations.includes('check-deleted-thing.mjs') },
  { name: 'a workflow citation binds when the workflow exists',
    f: 'x.md', t: 'enforced by phantom-migrations.yml', g: ['phantom-migrations.yml'],
    expect: (r) => r.bindable === true },
  { name: 'pnpm-lock.yaml is NOT a workflow citation — it is a real file elsewhere',
    f: 'x.md', t: 'we refreshed pnpm-lock.yaml and pnpm-workspace.yaml', g: [],
    expect: (r) => r.deadCitations.length === 0 && r.cited.workflows.length === 0 },
  { name: 'VACUITY: a doc citing NOTHING is never eligible — an empty citation list has no failing gate',
    f: 'x.md', t: 'a doc with no citations at all', g: ['check-phantom-migrations.mjs'],
    expect: (r) => r.bindable === false && r.liveGates.length === 0 && r.liveWorkflows.length === 0 },
  { name: 'a completion word inside a hyphenated PHRASE is not a marker',
    t: 'x', f: '20260805-portal-persona-jobs-to-be-done-v1.00W.md', g: [],
    expect: (r) => r.alreadyMarked === false },
  { name: 'but a real completion suffix still counts',
    t: 'x', f: '20260227-feature-map-complete-v1.00W.md', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'and an ALL-CAPS marker still counts',
    t: 'x', f: 'QUEUE-COMPLETE.md', g: [],
    expect: (r) => r.alreadyMarked === true },
  { name: 'a gate living in a SUBMODULE counts as live — the evidence layer is the estate',
    t: 'Verified by `db-lint.yml`.', f: 'x.md', g: ['db-lint.yml'],
    expect: (r) => r.bindable === true && r.deadCitations.length === 0 },
  { name: 'a gate in NO root is still dead — the widening must not swallow real misses',
    t: 'Verified by `quality.yml`.', f: 'x.md', g: ['db-lint.yml'],
    expect: (r) => r.bindable === false && r.deadCitations.includes('quality.yml') },
  { name: 'migration versions and PRs are captured as corroboration',
    f: 'x.md', t: 'applied 20260831000000 via crm7#1894', g: [],
    expect: (r) => r.cited.migrations.includes('20260831000000') && r.cited.prs.includes('crm7#1894') },
];

if (process.argv.includes('--self-test')) {
  let failed = 0;
  for (const t of SELF_TESTS) {
    const r = classify(t.t, t.f, new Set(t.g));
    const ok = t.expect(r);
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) { failed++; console.log(`        got: ${JSON.stringify(r)}`); }
  }
  console.log(`\n  ${SELF_TESTS.length - failed}/${SELF_TESTS.length} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

const roots = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!roots.length) { console.error('usage: audit-doc-completion.mjs <repo-root...> [--self-test]'); process.exit(2); }

// THE EVIDENCE LAYER IS THE WHOLE ESTATE, NOT THE PARENT.
//
// This used to read only the parent's `scripts/` and `.github/workflows/`, while the
// `roots` argument above was used to find DOCS in every submodule. So a doc citing
// `db-lint.yml` or `ci.yml` or `e2e.yml` was reported as CITING A DELETED GATE —
// every one of those lives in business-suite-unified/.github/workflows/ and always
// has. 23 docs were listed as pointing at ghosts; most of them point at real gates in
// a sibling repo.
//
// It also put this tool in direct disagreement with
// scripts/check-doc-citations-resolve.mjs, which resolves into submodules and passes
// clean on the same corpus. Two tools answering one question differently is worse than
// either answer, because whichever you read last wins.
const artifactsPresent = new Set();
for (const root of roots) {
  for (const d of ['scripts', '.github/workflows']) {
    const dir = root === '.' ? d : join(root, d);
    if (existsSync(dir)) for (const f of readdirSync(dir)) artifactsPresent.add(f);
  }
}
if (artifactsPresent.size < 20) {
  console.error(`  POSITIVE CONTROL FAILED: only ${artifactsPresent.size} artifact(s) found.`);
  console.error('  Without the evidence layer every doc reports UNBINDABLE, which reads as a');
  console.error('  careful answer and is a broken one. Run from the parent repo root.');
  process.exit(3);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const rows = [];
for (const root of roots) {
  for (const p of walk(join(root, 'docs'))) {
    rows.push({ path: p, ...classify(readFileSync(p, 'utf8'), p.split('/').pop(), artifactsPresent) });
  }
}

const marked = rows.filter((r) => r.alreadyMarked);
const bindable = rows.filter((r) => r.bindable);
const dead = rows.filter((r) => r.deadCitations.length > 0);
const markedUnbindable = marked.filter((r) => !r.bindable);

console.log(`\n  ${rows.length} doc(s); ${artifactsPresent.size} gate/workflow file(s) form the evidence layer\n`);
console.log(`  already marked complete in the filename        ${marked.length}`);
console.log(`    ...of those, citing NO live gate             ${markedUnbindable.length}   <-- the claim rests on nothing`);
console.log(`  CITE a gate or workflow that EXISTS            ${bindable.length}   <-- the only docs that can ever be marked`);
console.log(`  cite a gate that NO LONGER EXISTS              ${dead.length}   <-- citing a ghost; reads as evidence`);
console.log(`  cite nothing checkable                         ${rows.length - bindable.length - dead.length}`);

if (dead.length) {
  console.log('\n  DEAD CITATIONS — a doc pointing at a gate that was deleted:');
  for (const r of dead.slice(0, 15)) console.log(`    ${r.path}\n        ${r.deadCitations.slice(0, 4).join(', ')}`);
}
if (bindable.length) {
  console.log('\n  BINDABLE — these name a gate that exists, so their claim is checkable:');
  for (const r of bindable.slice(0, 25)) {
    console.log(`    ${r.path}`);
    console.log(`        ${[...r.liveGates, ...r.liveWorkflows].slice(0, 5).join(', ')}`);
  }
}
console.log('\n  NOTHING WAS RENAMED. Eligibility is not a verdict — the cited gates must be RUN.');
console.log('  AND: eligibility is only LIMB (b) of the operator bar. Limb (a) — that a doc is');
console.log('  SUPERSEDED, or described a non-best-practice since corrected — is a judgement about');
console.log('  the document CONTENT. Nothing here reads that, and no marker may be applied without it.');
console.log('  VACUITY: a doc citing zero gates has zero FAILING gates. That is not a pass. Scoring');
console.log('  code downstream of this tool MUST require at least one PASSING citation, not merely');
console.log('  the absence of a failing one.');
