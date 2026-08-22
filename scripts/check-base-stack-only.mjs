#!/usr/bin/env node
/**
 * check-base-stack-only.mjs — no new RUNTIME dependency without a decision.
 *
 * THE RULE, from docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md §5 item 7,
 * itself from the operator's v1.01W direction ("we have these skills already and the
 * base. we've just diverted recently"): no new runtime dependency may be added to any
 * app or shared package without updating the plan's §2.5 + §6 tables in the same PR.
 *
 * WHY THIS EXISTS NOW, TWO AND A HALF MONTHS LATE
 *
 * That plan said the lint was "delivered in Phase 6". It never was — not under this
 * name and not under any other. Six of the seven obligations on that list HAD shipped
 * under different filenames, which is exactly what made the seventh invisible: a
 * reader checking the list finds most items real and stops checking.
 *
 * A rule written down and unenforced is the weakest of the three possible states.
 * Weaker than having no rule, because a rule on paper reads as a control, and nobody
 * looks for a control they believe they already have.
 *
 * WHY AN ALLOW-LIST SEEDED FROM REALITY, NOT FROM THE PLAN'S TABLE
 *
 * §2.5 lists the base stack as designed. The estate installed 170 distinct runtime
 * deps as built. Gating against the designed list would fail every PR on day one and
 * be switched off within a week — the classic way a gate becomes a skipped step. So
 * the allow-list is SEEDED from what is present, and the gate's job is the delta: it
 * answers "is this dependency new?", which is the question the rule actually asks.
 *
 * Seeding is not endorsement. Nothing here says the 170 are all justified.
 *
 * EQUALITY, NOT A CEILING — the estate's ratchet convention (bsuite D-87)
 *
 * A stale entry is also a failure. An allow-list still naming a dependency that was
 * removed lets it come back silently, which is the same hole as a colour baseline
 * committed higher than the measured count. `--bank` rewrites the file so satisfying
 * the removal side costs one command, not an argument.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ALLOWLIST = '.github/base-stack-allowlist.txt';

/** Deps we publish ourselves are not third-party surface. */
export const isOurs = (name) => /^@bsuite\//.test(name);

/**
 * A workspace protocol specifier is an internal link, never a registry install.
 * `workspace:^` reaching npm literally is a separate known hazard; it is not this
 * gate's job, and conflating them would make both harder to read.
 */
export const isWorkspaceLink = (spec) =>
  typeof spec === 'string' && (spec.startsWith('workspace:') || spec.startsWith('file:') || spec.startsWith('link:'));

/**
 * RUNTIME dependencies only. devDependencies are build-time and explicitly out of
 * scope: the rule is about what ships to a user's browser or a server process.
 * `optionalDependencies` DO ship, so they count.
 */
export function runtimeDeps(pkgJson) {
  const out = new Set();
  for (const field of ['dependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(pkgJson[field] || {})) {
      if (isOurs(name) || isWorkspaceLink(spec)) continue;
      out.add(name);
    }
  }
  return out;
}

export function diff(present, allowed) {
  const added = [...present].filter((d) => !allowed.has(d)).sort();
  const stale = [...allowed].filter((d) => !present.has(d)).sort();
  return { added, stale };
}

// ── self-tests ──────────────────────────────────────────────────────────────
const SELF_TESTS = [
  { name: 'a plain runtime dependency is in scope',
    run: () => runtimeDeps({ dependencies: { lodash: '^4' } }).has('lodash') },
  { name: 'devDependencies are NOT in scope — the rule is about what ships',
    run: () => runtimeDeps({ devDependencies: { vitest: '^3' } }).size === 0 },
  { name: 'optionalDependencies ARE in scope — they still ship',
    run: () => runtimeDeps({ optionalDependencies: { fsevents: '*' } }).has('fsevents') },
  { name: 'our own @bsuite packages are not third-party surface',
    run: () => runtimeDeps({ dependencies: { '@bsuite/theme': '^1' } }).size === 0 },
  { name: 'a workspace: link is an internal link, not a registry install',
    run: () => runtimeDeps({ dependencies: { thing: 'workspace:^' } }).size === 0 },
  { name: 'POSITIVE CONTROL: a dep outside the allow-list is reported ADDED',
    run: () => diff(new Set(['react', 'left-pad']), new Set(['react'])).added.join() === 'left-pad' },
  { name: 'POSITIVE CONTROL: an allow-list entry nobody installs is reported STALE',
    run: () => diff(new Set(['react']), new Set(['react', 'gone'])).stale.join() === 'gone' },
  { name: 'a tree matching its allow-list exactly is clean in both directions',
    run: () => { const d = diff(new Set(['react']), new Set(['react'])); return !d.added.length && !d.stale.length; } },
];

if (process.argv.includes('--self-test')) {
  let failed = 0;
  for (const t of SELF_TESTS) {
    let ok = false;
    try { ok = t.run() === true; } catch (e) { ok = false; }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${t.name}`);
    if (!ok) failed++;
  }
  console.log(`\n  ${SELF_TESTS.length - failed}/${SELF_TESTS.length} self-tests pass`);
  process.exit(failed ? 1 : 0);
}

// ── scan ────────────────────────────────────────────────────────────────────
// EXCLUDE BY INTENT, NOT BY DEPTH. The first version capped at -maxdepth 4 and
// happened to skip exactly the eight build artifacts that should be skipped
// (`.next/`, `.vercel/output/`, a stray worktree) — the right answer for the wrong
// reason. A depth cap is silent in both directions: a real source manifest nested one
// level deeper would have been skipped just as quietly, and a build artifact shallow
// enough to clear the cap would have been scanned as source.
const EXCLUDE = ['node_modules', '.git', '.next', '.vercel', '.turbo', 'dist', 'build', '.claude', 'coverage'];
const files = execFileSync('bash', ['-c',
  `find . -name package.json ${EXCLUDE.map((d) => `-not -path '*/${d}/*'`).join(' ')} 2>/dev/null | sort`,
]).toString().trim().split('\n').filter(Boolean);

// AN EMPTY SCAN MUST NEVER READ AS CLEAN. Uninitialised submodules are empty
// directories that pass every existence check, and a gate that cannot tell
// "scanned nothing" from "found nothing" is not a gate (bsuite D-92).
const MIN_MANIFESTS = 20;
if (files.length < MIN_MANIFESTS) {
  console.error(`  POSITIVE CONTROL FAILED: found only ${files.length} package.json (expected >= ${MIN_MANIFESTS}).`);
  console.error('  The submodules almost certainly did not check out. A clean result here would');
  console.error('  mean "nothing was scanned", which reads identically to "nothing was wrong".');
  process.exit(3);
}

const present = new Set();
const where = new Map();
for (const f of files) {
  let j;
  try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  for (const d of runtimeDeps(j)) {
    present.add(d);
    if (!where.has(d)) where.set(d, []);
    where.get(d).push(f);
  }
}

if (process.argv.includes('--bank') || !existsSync(ALLOWLIST)) {
  const header = [
    '# base-stack-allowlist.txt — every RUNTIME dependency the estate is known to install.',
    '#',
    '# Enforced by scripts/check-base-stack-only.mjs. Adding a line here is the decision',
    '# the rule asks for: a new runtime dependency needs a reason, recorded in the PR that',
    '# adds it, alongside the §2.5 + §6 tables in',
    '# docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md.',
    '#',
    '# SEEDED FROM REALITY, NOT FROM THE PLAN. Presence on this list means "already',
    '# installed when the gate was built", never "reviewed and approved".',
    '#',
    '# Regenerate after a legitimate change: node scripts/check-base-stack-only.mjs --bank',
    '',
  ].join('\n');
  writeFileSync(ALLOWLIST, header + [...present].sort().join('\n') + '\n');
  console.log(`  banked ${present.size} runtime dependencies to ${ALLOWLIST}`);
  process.exit(0);
}

const allowed = new Set(
  readFileSync(ALLOWLIST, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
);
const { added, stale } = diff(present, allowed);

console.log(`  ${files.length} manifest(s); ${present.size} runtime dep(s); ${allowed.size} allow-listed`);

if (added.length) {
  console.error(`\n  NEW RUNTIME DEPENDENCY — ${added.length} not on the allow-list:\n`);
  for (const d of added) console.error(`    ${d}\n        ${where.get(d).slice(0, 3).join(', ')}`);
  console.error('\n  The base-stack-only rule: a new runtime dependency needs a decision, not a');
  console.error('  default. Prefer something already installed. If the dependency is genuinely');
  console.error('  right, say why in the PR, update §2.5 + §6 of');
  console.error('  docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md, then run:');
  console.error('      node scripts/check-base-stack-only.mjs --bank');
}
if (stale.length) {
  console.error(`\n  STALE ALLOW-LIST ENTRIES — ${stale.length} allow-listed but installed nowhere:\n`);
  console.error(`    ${stale.join(', ')}`);
  console.error('\n  Equality, not a ceiling. A list still naming a removed dependency lets it');
  console.error('  return unnoticed. Bank the removal:');
  console.error('      node scripts/check-base-stack-only.mjs --bank');
}
process.exit(added.length || stale.length ? 1 : 0);
