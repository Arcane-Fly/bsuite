#!/usr/bin/env node
/**
 * check-worktree-hazards — a worktree can destroy other lanes' work silently
 *
 * WHY THIS EXISTS
 * ───────────────
 * On 2026-08-17 a worktree named `bsuite-wage-audit` sat on the `development`
 * branch holding TWELVE STAGED DELETIONS of live artefacts:
 *
 *     4x packages/theme/src/css/fonts/*.woff2      the fonts every app renders in
 *     packages/theme/src/non-text-contrast.test.ts  22-assertion contrast suite
 *     scripts/check-placement-rate-provenance.mjs   the money-chain guard
 *     scripts/check-hook-suppression-ratchet.mjs    + its baseline json
 *     .github/workflows/cron-job-health-audit.yml   + hook-suppression-ratchet.yml
 *     scripts/audit-routes.sh, scripts/theme-session.sh
 *
 * All twelve existed on `origin/development`. Any commit in that worktree would
 * have removed four separate lanes' deliverables in a single commit, on the shared
 * branch, with nothing to catch it — the repo would still build, no test would
 * fail, and the capabilities would simply stop existing.
 *
 * It had no unpushed commits and no stash and had been idle 45 minutes: residue
 * from an abandoned reset, not intentional work.
 *
 * THE PAIRS ARE WHAT MAKE IT EXPENSIVE. Ratchet + baseline. Fonts + contrast test.
 * Health workflow + the guard it runs. Deleting ONE of a pair leaves a visible
 * break someone chases. Deleting BOTH leaves no trace the capability ever existed.
 *
 * THE SECOND HAZARD, which caused the first to go unnoticed for hours
 * ───────────────────────────────────────────────────────────────────
 * Git REFUSES to check out a branch another worktree already holds:
 *
 *     fatal: 'development' is already used by worktree at '…/bsuite-wage-audit'
 *
 * A failed checkout is NOT neutral — it leaves you on the previous branch. So
 * `git checkout -q development && …work… && git commit` commits onto whatever
 * branch was there before, silently. Three commits landed on the wrong branch this
 * way before anyone read past the first line of the error.
 *
 * So a worktree parked on `development` or `main` is a hazard even when clean: it
 * takes that branch hostage from every other tree in the repo.
 *
 * WHAT IT CHECKS
 *   H1  a worktree with STAGED DELETIONS of files that still exist upstream
 *   H2  a worktree (other than the primary checkout) sitting on a SHARED branch
 *   H3  a worktree outside the sanctioned root — operator ruling: dev work lives
 *       under ~/Desktop/Dev only, never in $HOME
 *   H4  scanned nothing — a guard that examined no worktrees proves nothing
 *
 * It does NOT fail on ordinary dirt: modified files, untracked files, unpushed
 * commits. Those are what a worktree is FOR. Only deletion-of-live-work and
 * branch-hostage are hazards.
 *
 * USAGE
 *   node scripts/check-worktree-hazards.mjs
 *   node scripts/check-worktree-hazards.mjs --self-test
 */

import { execFileSync } from 'node:child_process'

const SHARED_BRANCHES = ['development', 'main', 'master']
const SANCTIONED_ROOT = '/home/braden/Desktop/Dev'

/** Pure, so --self-test exercises the real decision rather than a paraphrase. */
export function evaluate(worktrees, { primary } = {}) {
  const failures = []

  if (worktrees.length === 0) {
    return {
      ok: false,
      failures: [{ code: 'H4', message: 'scanned 0 worktrees — this guard proved nothing' }],
    }
  }

  for (const w of worktrees) {
    if (w.stagedDeletionsStillUpstream?.length > 0) {
      failures.push({
        code: 'H1',
        message:
          `${w.name} has ${w.stagedDeletionsStillUpstream.length} STAGED DELETION(S) of files ` +
          `that still exist upstream on ${w.branch}: ` +
          `${w.stagedDeletionsStillUpstream.slice(0, 4).join(', ')}` +
          `${w.stagedDeletionsStillUpstream.length > 4 ? ' …' : ''}. ` +
          `Committing there removes live work from a branch other lanes depend on, ` +
          `and nothing downstream would fail.`,
      })
    }

    if (w.path !== primary && SHARED_BRANCHES.includes(w.branch)) {
      failures.push({
        code: 'H2',
        message:
          `${w.name} is sitting on the shared branch '${w.branch}'. It holds that branch ` +
          `HOSTAGE — every other tree's \`git checkout ${w.branch}\` now fails, and a ` +
          `failed checkout leaves the caller on its previous branch, so their next commit ` +
          `lands somewhere unintended and silently.`,
      })
    }

    if (!w.path.startsWith(SANCTIONED_ROOT)) {
      failures.push({
        code: 'H3',
        message:
          `${w.name} is at ${w.path}, outside ${SANCTIONED_ROOT}. Operator ruling: ` +
          `development work lives under Dev/ only — never in $HOME.`,
      })
    }
  }

  return { ok: failures.length === 0, failures }
}

function selfTest() {
  const P = '/home/braden/Desktop/Dev/bsuite'
  const cases = [
    ['a clean worktree passes',
      [{ name: 'a', path: `${SANCTIONED_ROOT}/worktrees/a`, branch: 'fix/x', stagedDeletionsStillUpstream: [] }], true],
    ['the PRIMARY checkout on development is fine',
      [{ name: 'bsuite', path: P, branch: 'development', stagedDeletionsStillUpstream: [] }], true],
    // ISOLATED ON PURPOSE. The first draft of this fixture used branch
    // 'development', so H2 (branch hostage) fired on it too — and the case still
    // failed with H1 disabled, meaning the mutation test detected nothing. A
    // fixture that fails for a reason other than the one it names proves nothing
    // about the rule it claims to cover. Feature branch here, so ONLY H1 can fire.
    ['H1 staged deletions of live files fail',
      [{ name: 'a', path: `${SANCTIONED_ROOT}/w/a`, branch: 'fix/some-branch',
         stagedDeletionsStillUpstream: ['scripts/guard.mjs'] }], false],
    ['H2 a NON-primary worktree on development fails',
      [{ name: 'b', path: `${SANCTIONED_ROOT}/w/b`, branch: 'development', stagedDeletionsStillUpstream: [] }], false],
    ['H3 a worktree in $HOME fails',
      [{ name: 'c', path: '/home/braden/wt-c', branch: 'fix/y', stagedDeletionsStillUpstream: [] }], false],
    ['H4 scanning nothing fails', [], false],
    ['modified + untracked + unpushed alone is NOT a hazard',
      [{ name: 'd', path: `${SANCTIONED_ROOT}/w/d`, branch: 'fix/z', stagedDeletionsStillUpstream: [],
         modified: 30, untracked: 5, unpushed: 3 }], true],
  ]
  let bad = 0
  for (const [name, wts, wantOk] of cases) {
    const got = evaluate(wts, { primary: P }).ok
    if (got !== wantOk) { console.error(`  FAIL ${name}: expected ok=${wantOk}, got ${got}`); bad++ }
  }
  console.log(
    `check-worktree-hazards --self-test: ${cases.length} cases exercised across both ` +
      `directions (clean, primary-on-shared-is-fine, H1 staged deletions, H2 branch hostage, ` +
      `H3 outside Dev/, H4 scanned-nothing, and ordinary-dirt-is-not-a-hazard).`,
  )
  return bad
}

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

function collect(root) {
  const out = []
  let primary = null
  const blocks = git(['worktree', 'list', '--porcelain'], root).split('\n\n')
  for (const b of blocks) {
    const path = b.match(/^worktree (.+)$/m)?.[1]
    if (!path) continue
    if (primary === null) primary = path
    let branch = 'DETACHED'
    try { branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], path) } catch { /* keep DETACHED */ }

    const stagedDeletionsStillUpstream = []
    try {
      const status = git(['status', '--porcelain'], path)
      const deletions = status.split('\n').filter((l) => /^D/.test(l)).map((l) => l.slice(3).trim())
      for (const f of deletions) {
        // Present upstream = deleting it removes live work. Absent upstream = the
        // deletion IS the work, which is legitimate and must not be flagged.
        try {
          git(['cat-file', '-e', `origin/${branch}:${f}`], path)
          stagedDeletionsStillUpstream.push(f)
        } catch { /* already gone upstream — not a hazard */ }
      }
    } catch { /* unreadable worktree; H1 cannot be assessed */ }

    out.push({ name: path.split('/').pop(), path, branch, stagedDeletionsStillUpstream })
  }
  return { worktrees: out, primary }
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)

  const root = process.cwd()
  const { worktrees, primary } = collect(root)
  const { ok, failures } = evaluate(worktrees, { primary })

  // LANE-WATCHER: the denominator goes at the HEAD, before any verdict.
  console.log(
    `check-worktree-hazards: ${worktrees.length} worktree(s) examined; ` +
      `${worktrees.filter((w) => w.stagedDeletionsStillUpstream.length > 0).length} with staged ` +
      `deletions of live files; ` +
      `${worktrees.filter((w) => w.path !== primary && SHARED_BRANCHES.includes(w.branch)).length} ` +
      `holding a shared branch hostage.`,
  )

  if (!ok) {
    for (const f of failures) console.error(`::error::[${f.code}] ${f.message}`)
    process.exit(1)
  }
  console.log('  no worktree is deleting live work or holding a shared branch.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
