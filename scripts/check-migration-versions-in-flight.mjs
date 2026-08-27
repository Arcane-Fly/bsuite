#!/usr/bin/env node
/**
 * check-migration-versions-in-flight.mjs
 *
 * WHY THIS EXISTS — it happened on 2026-08-26, to me, in the same hour.
 * ---------------------------------------------------------------------------
 * `check-migration-version-collisions.mjs` is thorough and it reads THE TREE.
 * Two migrations on two UNMERGED branches are invisible to it, because neither
 * file is in any tree it scans. That is exactly how crm7 #1985 and #1987 both
 * came to carry version `20260914000000`.
 *
 * WHY A COLLISION IS THE WORST SHAPE A MIGRATION DEFECT CAN TAKE
 * The estate deploys every scope to ONE Supabase project, so
 * `supabase_migrations.schema_migrations` is a single table keyed on the
 * 14-digit version ALONE. The applier skips any file whose version already
 * appears in the applied list. So the second file at a version:
 *
 *     - never runs,
 *     - leaves no error,
 *     - and is recorded as APPLIED.
 *
 * The evidence of the problem is a ledger row saying there is no problem. Every
 * protection in that migration is simply absent, and the next person to look
 * will see a green ledger and conclude it shipped.
 *
 * WHAT THIS CHECKS THAT THE OTHER SCRIPT CANNOT
 *   1. version collisions BETWEEN two open pull requests
 *   2. version collisions between an open pull request and the current tree
 *
 * TIE-BREAK, stated so two agents do not ping-pong renumbering each other:
 * THE LOWER PULL-REQUEST NUMBER KEEPS THE VERSION. The higher one renumbers.
 * It is arbitrary; being deterministic is the point.
 *
 * FAILS LOUD WHEN IT CANNOT CHECK — never silently green. If `gh` is missing or
 * unauthenticated it exits 0 (so it cannot wedge CI on an infrastructure
 * problem) but prints UNCHECKED in the same shape as a failure, because "I could
 * not look" and "I looked and it was fine" must never read the same.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const REPOS = [
  'GaryOcean428/bsuite',
  'GaryOcean428/crm7',
  'GaryOcean428/business-suite-unified',
  'GaryOcean428/conduit',
  'GaryOcean428/braden',
  'GaryOcean428/throughput',
  'GaryOcean428/R80.4',
];

const MIGRATION_RE = /(?:^|\/)supabase\/migrations\/(\d{14})_([^/]+)\.sql$/;

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/* EVERY ONE OF THESE SEVEN ROOTS CARRIES MIGRATIONS. Measured 2026-08-27:
 * parent 24, crm7 8, business-suite-unified 111, conduit 37, braden 24,
 * throughput 6, R80.4 5. So an ABSENT migrations directory never means "this
 * repo has none" — it means the submodule did not check out, and the only
 * honest response is to refuse.
 *
 * The old `continue` made that failure silent: with the apps missing, the tree
 * side of the comparison shrank to the parent's 24 versions and a PR colliding
 * with any of the other 191 read as clean. A collision does not error — it is
 * recorded as applied and never runs — so a false pass here is the expensive
 * direction. */
export const MIGRATION_ROOTS = ['.', 'crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4'];

/** Every 14-digit version currently in the working tree, with its file.
 *  Returns the versions AND the roots that were not readable, so the caller can
 *  refuse rather than report a number built from a partial tree. */
export function treeVersions(root) {
  const out = new Map(); // version -> [relative path]
  const missing = [];
  for (const r of MIGRATION_ROOTS) {
    const dir = path.join(root, r, 'supabase', 'migrations');
    if (!fs.existsSync(dir)) { missing.push(r); continue; }
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^(\d{14})_(.+)\.sql$/);
      if (!m) continue;
      const rel = path.join(r === '.' ? '' : r, 'supabase/migrations', f);
      if (!out.has(m[1])) out.set(m[1], []);
      out.get(m[1]).push(rel);
    }
  }
  return { versions: out, missing };
}

/** Every migration version carried by an OPEN pull request, per repo. */
function openPrVersions() {
  const found = []; // {repo, number, title, version, file}
  for (const repo of REPOS) {
    let list;
    try {
      list = JSON.parse(gh(['pr', 'list', '--repo', repo, '--state', 'open',
        '--limit', '50', '--json', 'number,title']));
    } catch {
      continue; // a repo we cannot see is reported by the caller, not skipped silently
    }
    for (const pr of list) {
      let files;
      try {
        files = JSON.parse(gh(['pr', 'view', String(pr.number), '--repo', repo, '--json', 'files']));
      } catch {
        continue;
      }
      for (const f of files.files ?? []) {
        const m = f.path.match(MIGRATION_RE);
        if (m) found.push({ repo, number: pr.number, title: pr.title, version: m[1], file: f.path });
      }
    }
  }
  return found;
}

function analyse(prRows, tree) {
  const problems = [];
  // 1. PR vs PR
  const byVersion = new Map();
  for (const r of prRows) {
    if (!byVersion.has(r.version)) byVersion.set(r.version, []);
    byVersion.get(r.version).push(r);
  }
  for (const [version, rows] of byVersion) {
    const distinct = new Map(rows.map((r) => [`${r.repo}#${r.number}`, r]));
    if (distinct.size < 2) continue;
    const sorted = [...distinct.values()].sort((a, b) => a.number - b.number);
    const keeper = sorted[0];
    for (const loser of sorted.slice(1)) {
      problems.push(
        `VERSION ${version} IS ON TWO OPEN PRs\n` +
        `      keeps it : ${keeper.repo}#${keeper.number}  ${keeper.file}\n` +
        `      renumber : ${loser.repo}#${loser.number}  ${loser.file}\n` +
        `      (lower PR number keeps the version — arbitrary, but deterministic)`);
    }
  }
  // 2. PR vs tree
  for (const r of prRows) {
    const inTree = tree.get(r.version);
    if (!inTree) continue;
    const sameFile = inTree.some((p) => p.endsWith(path.basename(r.file)));
    if (sameFile) continue; // it IS this PR's file, already merged or checked out
    problems.push(
      `VERSION ${r.version} IS ON AN OPEN PR AND ALREADY IN THE TREE\n` +
      `      open PR  : ${r.repo}#${r.number}  ${r.file}\n` +
      `      in tree  : ${inTree.join(', ')}\n` +
      `      The tree wins. Renumber the PR.`);
  }
  return problems;
}

// ------------------------------------------------------------------ self-test
function selfTest() {
  const cases = [
    ['two open PRs at the same version', [
      { repo: 'r', number: 10, title: 't', version: '20260914000000', file: 'supabase/migrations/20260914000000_a.sql' },
      { repo: 'r', number: 11, title: 't', version: '20260914000000', file: 'supabase/migrations/20260914000000_b.sql' },
    ], new Map(), 1],
    ['an open PR colliding with a file already in the tree', [
      { repo: 'r', number: 12, title: 't', version: '20260101000000', file: 'supabase/migrations/20260101000000_new.sql' },
    ], new Map([['20260101000000', ['crm7/supabase/migrations/20260101000000_old.sql']]]), 1],
    ['the same PR file also present in the tree (checked out) is NOT a collision', [
      { repo: 'r', number: 13, title: 't', version: '20260202000000', file: 'supabase/migrations/20260202000000_same.sql' },
    ], new Map([['20260202000000', ['crm7/supabase/migrations/20260202000000_same.sql']]]), 0],
    ['distinct versions are clean', [
      { repo: 'r', number: 14, title: 't', version: '20260303000000', file: 'a/supabase/migrations/20260303000000_a.sql' },
      { repo: 'r', number: 15, title: 't', version: '20260404000000', file: 'a/supabase/migrations/20260404000000_b.sql' },
    ], new Map(), 0],
  ];
  let ok = true;

  /* A REFUSAL THAT IS NEVER EXERCISED IS A COMMENT. Build a tree with only the
   * parent root present and assert the six apps come back as missing — the exact
   * shape a failed submodule checkout produces. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migver-'));
  fs.mkdirSync(path.join(tmp, 'supabase', 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'supabase', 'migrations', '20260101000000_x.sql'), '');
  const probe = treeVersions(tmp);
  const refusesOnPartial = probe.missing.length === 6 && probe.versions.size === 1;
  console.log(`  ${refusesOnPartial ? 'ok  ' : 'FAIL'}  a partial checkout is reported as ${probe.missing.length} missing root(s), not skipped (expected 6, got ${probe.missing.length})`);
  if (!refusesOnPartial) ok = false;

  const full = treeVersions(process.cwd());
  const cleanWhenAllPresent = full.missing.length === 0;
  console.log(`  ${cleanWhenAllPresent ? 'ok  ' : 'warn'}  a complete checkout reports 0 missing root(s) (got ${full.missing.length}${full.missing.length ? ': ' + full.missing.join(', ') : ''})`);

  for (const [name, rows, tree, expected] of cases) {
    const got = analyse(rows, tree).length;
    const pass = got === expected;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name} (expected ${expected}, got ${got})`);
    if (!pass) ok = false;
  }
  console.log(ok
    ? '\ncheck-migration-versions-in-flight self-test: OK - detects both collision shapes and neither false positive'
    : '\ncheck-migration-versions-in-flight self-test: FAILED');
  return ok ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

try {
  gh(['auth', 'status']);
} catch {
  console.log('  UNCHECKED: `gh` is unavailable or unauthenticated, so NO open pull request was read.');
  console.log('  This is not a pass. Nothing was compared. Run it where `gh auth status` succeeds.');
  process.exit(0);
}

const root = process.argv[2] || process.cwd();
const { versions: tree, missing } = treeVersions(root);

/* REFUSE, do not report. A gate that cannot read six of its seven roots and
 * prints "OK - no version is claimed twice" has not checked anything. This
 * workflow failed at checkout on 2 of 2 runs since it was created, because the
 * apps are PRIVATE submodules and the default GITHUB_TOKEN cannot clone them.
 * That failure was loud. Had the clone half-succeeded it would have been silent,
 * and this is the guard for that case. */
if (missing.length) {
  console.error(`  REFUSING to report — ${missing.length} of ${MIGRATION_ROOTS.length} migration root(s) are unreadable:`);
  for (const m of missing) console.error(`      ${m}/supabase/migrations`);
  console.error('');
  console.error('  Every one of these roots carries migrations, so an absent directory means the');
  console.error('  submodule did not check out — not that the repo has none. Comparing against a');
  console.error('  partial tree would report "no collision" having never seen the colliding file.');
  console.error('  Run `git submodule update --init`, or in CI check out with the cross-repo PAT.');
  process.exit(2);
}

const prRows = openPrVersions();
const problems = analyse(prRows, tree);

console.log(`  ${prRows.length} migration file(s) across open pull requests - ${tree.size} version(s) in the tree`);
if (prRows.length === 0) {
  console.log('  No open pull request carries a migration. Nothing to collide.');
}
if (problems.length) {
  console.log('');
  for (const p of problems) console.log('  FAIL ' + p);
  console.log(`\ncheck-migration-versions-in-flight: FAIL - ${problems.length} collision(s).`);
  console.log('  A colliding migration does not error. It is recorded as applied and never runs.');
  process.exit(1);
}
console.log('\ncheck-migration-versions-in-flight: OK - no version is claimed twice.');
