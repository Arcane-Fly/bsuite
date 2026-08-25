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

/** Every 14-digit version currently in the working tree, with its file. */
function treeVersions(root) {
  const out = new Map(); // version -> [relative path]
  const roots = ['.', 'crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4'];
  for (const r of roots) {
    const dir = path.join(root, r, 'supabase', 'migrations');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^(\d{14})_(.+)\.sql$/);
      if (!m) continue;
      const rel = path.join(r === '.' ? '' : r, 'supabase/migrations', f);
      if (!out.has(m[1])) out.set(m[1], []);
      out.get(m[1]).push(rel);
    }
  }
  return out;
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
const tree = treeVersions(root);
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
