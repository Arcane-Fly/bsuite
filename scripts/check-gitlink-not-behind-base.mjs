#!/usr/bin/env node
/**
 * check-gitlink-not-behind-base — a promotion may not move a submodule pointer BACKWARDS.
 *
 * WHY THIS EXISTS
 * ───────────────
 * On 2026-08-27 every one of the six gitlinks on `development` was DIVERGED from what
 * `main` already pinned, and behind it as well as ahead:
 *
 *     crm7                    main=37259523 dev=91c1951b  ahead=6 BEHIND=1
 *     business-suite-unified  main=627b9e55 dev=6293555d  ahead=5 BEHIND=1
 *     conduit                 main=ee48c312 dev=0d551f97  ahead=3 BEHIND=1
 *     braden                  main=734e5183 dev=0eaa3706  ahead=2 BEHIND=2
 *     throughput              main=bd1ee20c dev=dd7aeba2  ahead=3 BEHIND=6
 *     R80.4                   main=1a9e32af dev=abbe701e  ahead=1 BEHIND=49
 *
 * Promoting would have moved production's R80.4 pointer back FORTY-NINE commits, and
 * every gitlink-reading workflow — supabase-migrate, supabase-functions-deploy,
 * route-inventory, own-package-freshness, migration-collision-branch-tips, the advisor
 * sweep — would then have been reading a tree from before those commits landed.
 *
 * TWO CONVENTIONS, BOTH CORRECT, WITH NO STEP BETWEEN THEM
 * ────────────────────────────────────────────────────────
 * `advance-submodule-pointers.mjs` targets each app's origin/DEVELOPMENT. That is right
 * for parent `development`. But the deploy and the applier read the gitlinks OF THE REF
 * THEY RUN ON, so on `main` those must be app MAIN SHAs. bsuite#2556 and #2562 re-pointed
 * to mains before promoting; neither wrote the step down as a rule, and it drifted back
 * within the hour.
 *
 * This gate is that step, enforced instead of remembered. It does not care WHICH
 * convention produced the pointer. It asks one question:
 *
 *     is what `main` already pins an ANCESTOR of what this PR would pin?
 *
 * Equal is fine. Ahead is fine. BEHIND or DIVERGED is a refusal, because both mean
 * production loses commits it currently has.
 *
 * RESOLVE BY DESCENDANCY, NEVER BY SIDE. `--ours` on a gitlink conflict reverted every
 * app on a same-day reconcile once already.
 *
 * Usage:
 *   node scripts/check-gitlink-not-behind-base.mjs <base-ref> [head-ref]
 *   node scripts/check-gitlink-not-behind-base.mjs <base-ref> :staged   # the INDEX, before committing
 *   node scripts/check-gitlink-not-behind-base.mjs --self-test
 */
import { execFileSync } from 'node:child_process';

import { gitlinkAt, gitlinkParserCases } from './lib/gitlink-at.mjs';

export { gitlinkAt };

export const SUBMODULES = [
  'crm7',
  'business-suite-unified',
  'conduit',
  'braden',
  'throughput',
  'R80.4',
];

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}


/**
 * Classify one pointer move. PURE, so the self-test can exercise every branch without
 * a repository.
 *
 * `isAncestor(a, b)` answers "is a an ancestor of b" — injected so the tests do not
 * need real commits.
 */
export function classifyMove(base, head, isAncestor) {
  if (base === null && head === null) return { verdict: 'absent' };
  if (base === null) return { verdict: 'added' };
  if (head === null) return { verdict: 'removed' };
  if (base === head) return { verdict: 'unchanged' };
  if (isAncestor(base, head)) return { verdict: 'advanced' };
  // Not an ancestor. Either head is strictly behind base, or the two have diverged.
  // Both lose commits main currently has, so both refuse — but name which, because
  // the remedies differ: behind is a stale pointer, diverged is a wrong branch.
  return { verdict: isAncestor(head, base) ? 'behind' : 'diverged' };
}

const REFUSE = new Set(['behind', 'diverged', 'removed']);

function selfTest() {
  const cases = [];
  const t = (n, got, want) => cases.push({ n, ok: got === want, got, want });

  // A fake ancestry: a -> b -> c on one line, x on another.
  const anc = { 'a|b': true, 'a|c': true, 'b|c': true };
  const isAncestor = (p, q) => Boolean(anc[`${p}|${q}`]);

  t('equal pointers are unchanged', classifyMove('b', 'b', isAncestor).verdict, 'unchanged');
  t('a fast-forward is advanced', classifyMove('a', 'c', isAncestor).verdict, 'advanced');
  t('one step forward is advanced', classifyMove('b', 'c', isAncestor).verdict, 'advanced');
  t('moving BACK along the line is behind', classifyMove('c', 'a', isAncestor).verdict, 'behind');
  t('an unrelated commit is diverged', classifyMove('b', 'x', isAncestor).verdict, 'diverged');
  t('a submodule added by the PR is added', classifyMove(null, 'b', isAncestor).verdict, 'added');
  t('a submodule REMOVED by the PR is removed', classifyMove('b', null, isAncestor).verdict, 'removed');
  t('absent on both sides is absent', classifyMove(null, null, isAncestor).verdict, 'absent');

  // The refusal set is the point of the gate, so assert it rather than trusting the name.
  t('behind refuses', REFUSE.has('behind'), true);
  t('diverged refuses', REFUSE.has('diverged'), true);
  t('removed refuses', REFUSE.has('removed'), true);
  t('advanced does NOT refuse', REFUSE.has('advanced'), false);
  t('unchanged does NOT refuse', REFUSE.has('unchanged'), false);
  t('added does NOT refuse', REFUSE.has('added'), false);

  cases.push(...gitlinkParserCases());

  const bad = cases.filter((c) => !c.ok);
  for (const b of bad) console.error(`FAIL ${b.n}: expected ${JSON.stringify(b.want)}, got ${JSON.stringify(b.got)}`);
  console.log(`\ncheck-gitlink-not-behind-base self-test: ${cases.length - bad.length}/${cases.length} pass`);
  return bad.length ? 1 : 0;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

const baseRef = process.argv[2];
const headRef = process.argv[3] || 'HEAD';
if (!baseRef) {
  console.error('usage: check-gitlink-not-behind-base.mjs <base-ref> [head-ref]');
  process.exit(2);
}

const rows = [];
let unreadable = 0;
for (const sub of SUBMODULES) {
  const base = gitlinkAt(baseRef, sub);
  const head = gitlinkAt(headRef, sub);

  // A submodule whose objects are not present cannot be classified. REFUSING to
  // classify is not the same as passing it — a gate that silently skips what it
  // cannot read reports coverage it does not have.
  const isAncestor = (a, b) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: sub, stdio: 'ignore' });
      return true;
    } catch (e) {
      if (e.status === 1) return false;
      throw e;
    }
  };

  let row;
  try {
    row = { sub, base, head, ...classifyMove(base, head, isAncestor) };
  } catch {
    row = { sub, base, head, verdict: 'UNREADABLE' };
    unreadable++;
  }
  rows.push(row);
}

console.log(`check-gitlink-not-behind-base: ${headRef} against ${baseRef}\n`);
for (const r of rows) {
  const b = r.base ? r.base.slice(0, 8) : '—';
  const h = r.head ? r.head.slice(0, 8) : '—';
  console.log(`  ${r.sub.padEnd(24)} base=${b}  head=${h}  ${r.verdict}`);
}

if (unreadable > 0) {
  console.error(`\n  REFUSING to report — ${unreadable} submodule(s) could not be read.`);
  console.error('  Their objects are not present, so the pointer cannot be classified. A gate');
  console.error('  that skips what it cannot read reports coverage it does not have.');
  console.error('  In CI, check out with submodules: recursive and the cross-repo PAT.');
  process.exit(2);
}

const bad = rows.filter((r) => REFUSE.has(r.verdict));
if (bad.length > 0) {
  console.error(`\n  REFUSED — ${bad.length} submodule pointer(s) would move production BACKWARDS.\n`);
  for (const r of bad) {
    console.error(`    ${r.sub}: ${r.verdict}`);
    console.error(`      ${baseRef} pins ${r.base ? r.base.slice(0, 12) : '—'}`);
    console.error(`      this PR pins ${r.head ? r.head.slice(0, 12) : '(removed)'}`);
  }
  console.error('\n  What main already pins must be an ANCESTOR of what this PR pins.');
  console.error('  Equal is fine. Ahead is fine. Behind or diverged means production loses');
  console.error('  commits it currently has, and every gitlink-reading workflow — the migration');
  console.error('  applier, the edge-function deploy, the route inventory, the reach check —');
  console.error('  starts reading a tree from before they landed.');
  console.error('\n  FIX: re-point each pointer at the app\'s own main head, which is what a');
  console.error('  promotion is supposed to ship. `advance-submodule-pointers.mjs` targets each');
  console.error('  app\'s DEVELOPMENT, which is correct for parent development and wrong for a');
  console.error('  promotion — re-pointing to main is the last step before promoting.');
  console.error('\n  Resolve by DESCENDANCY, never by side.');
  process.exit(1);
}

console.log('\ncheck-gitlink-not-behind-base: OK — no pointer moves production backwards.');
