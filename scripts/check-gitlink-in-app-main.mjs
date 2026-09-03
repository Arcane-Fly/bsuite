#!/usr/bin/env node
/**
 * check-gitlink-in-app-main — every gitlink a PR ships to `main` must actually sit
 * ON that app's own main branch, not merely be "ahead" of what main used to record.
 *
 * WHY THIS EXISTS
 * ────────────────
 * check-gitlink-not-behind-base.mjs proves a promotion never moves a gitlink
 * BACKWARD relative to what `main` already pinned. That is necessary and it is
 * not sufficient: a gitlink can be "ahead" of the OLD pointer by that check's own
 * definition while pointing at a commit that only ever existed on the app's
 * development branch (or a feature branch) and was never promoted through that
 * app's own process at all.
 *
 * bsuite#2939 does exactly this for crm7 (measured live, 2026-09-03): it
 * re-points the parent's crm7 gitlink to 70aef71fb520c60eee3ddf982322335cc0a50bbe
 * — a development-only crm7 commit (not on crm7 main), 24 commits AHEAD of crm7's actual main
 * (1fd4fd8297c67bfe23f9cceaf79b54ca9c481468) — while the PR's own body claims
 * "both at main". `git -C crm7 merge-base --is-ancestor 70aef71f origin/main`
 * answers NO: shipping that pointer would make bsuite `main` read a crm7 tree
 * crm7's own main branch has never seen tested, reviewed, or promoted.
 *
 * THE RULE
 * ────────
 *   git -C <app> merge-base --is-ancestor <gitlink-on-this-PR> origin/main
 *
 * must succeed for every one of the six submodules, where `origin/main` is that
 * APP's own live main branch — fetched fresh in this job from that app's own
 * remote, never assumed from whatever the parent's submodule checkout happens
 * to carry. Equal is fine (a ref is its own ancestor). Anything not reachable
 * from the app's main — a dev-only commit, a feature branch, a force-pushed
 * rewrite — fails.
 *
 * WHAT THIS DOES NOT ASSERT
 * ──────────────────────────
 *  - It does NOT assert the gitlink EQUALS the app's main tip. A gitlink several
 *    commits behind main is still an ancestor of main and PASSES here — staleness
 *    is advance-submodule-pointers.mjs's job, not this gate's.
 *  - It does NOT assert the move is forward relative to the PR's base ref — that
 *    is check-gitlink-not-behind-base.mjs's job. A gitlink can pass THIS check
 *    (it sits on the app's main) and still fail THAT one (it regressed from what
 *    main already had), or the reverse. Both gates run; either failing blocks
 *    the PR.
 *  - It does NOT trust the parent repo's own submodule checkout for the app's
 *    main tip. Each app's `origin/main` is fetched fresh from that app's own
 *    remote inside this job, specifically so a stale or unrelated local
 *    checkout of the submodule cannot produce a false pass.
 *  - It does NOT run against `development`. The parent's development gitlinks
 *    track each app's MAIN as well (precedent
 *    parent-gitlinks-track-submodule-main-not-development); this gate is scoped
 *    to main-bound PRs because that is where a development-only pointer becomes
 *    shipped, not because development gitlinks are expected off their app's main.
 *  - It does NOT resolve anything. A refusal names the app and the two SHAs; a
 *    human decides whether to re-point to the app's main or wait for that app's
 *    own promotion.
 *
 * Usage:
 *   node scripts/check-gitlink-in-app-main.mjs [head-ref]     # defaults to HEAD
 *   node scripts/check-gitlink-in-app-main.mjs --self-test
 */
import { execFileSync } from 'node:child_process'

export const SUBMODULES = [
  'crm7',
  'business-suite-unified',
  'conduit',
  'braden',
  'throughput',
  'R80.4',
]

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/** The gitlink a ref records for one submodule, or null when the path is absent. */
export function gitlinkAt(ref, path) {
  let out
  try {
    out = git(['ls-tree', ref, '--', path])
  } catch {
    return null
  }
  const m = out.match(/^160000 commit ([0-9a-f]{40})\t/)
  return m ? m[1] : null
}

/**
 * Classify one gitlink against the app's own live main tip. PURE — isAncestor is
 * injected so the self-test never needs a real repository or network access.
 */
export function classify(gitlink, appMain, isAncestor) {
  if (gitlink === null) return { verdict: 'absent' } // submodule not present at this ref
  if (appMain === null) return { verdict: 'unreadable-main' } // could not read the app's own main — refuse, don't pass silently
  if (gitlink === appMain) return { verdict: 'on-main' }
  if (isAncestor(gitlink, appMain)) return { verdict: 'on-main' }
  return { verdict: 'not-on-main' }
}

const REFUSE = new Set(['not-on-main', 'unreadable-main'])

function selfTest() {
  const cases = []
  const t = (n, got, want) => cases.push({ n, ok: got === want, got, want })

  const alwaysAncestor = () => true
  const neverAncestor = () => false

  t('equal gitlink and main is on-main', classify('a', 'a', alwaysAncestor).verdict, 'on-main')
  t('a real ancestor is on-main', classify('a', 'b', alwaysAncestor).verdict, 'on-main')

  // THE PLANTED DEVELOPMENT-ONLY SHA — the exact live bsuite#2939 crm7 shape,
  // measured 2026-09-03: a gitlink that IS a real, existing commit, but one that
  // only ever landed on crm7's development branch and never on crm7's main. This
  // must go red, not merely "look suspicious".
  const CRM7_DEV_ONLY_GITLINK = '70aef71fb520c60eee3ddf982322335cc0a50bbe' // crm7's own development tip
  const CRM7_MAIN = '1fd4fd8297c67bfe23f9cceaf79b54ca9c481468' // crm7's own main tip, measured live
  const plantedResult = classify(CRM7_DEV_ONLY_GITLINK, CRM7_MAIN, neverAncestor)
  t('a planted development-only SHA is refused as not-on-main', plantedResult.verdict, 'not-on-main')
  t('not-on-main is in the refusal set', REFUSE.has(plantedResult.verdict), true)

  t('an unreadable app main is refused, not treated as a pass',
    classify('a', null, alwaysAncestor).verdict, 'unreadable-main')
  t('an absent submodule at this ref is not a refusal', classify(null, 'a', alwaysAncestor).verdict, 'absent')
  t('unreadable-main is in the refusal set', REFUSE.has('unreadable-main'), true)
  t('absent is NOT in the refusal set', REFUSE.has('absent'), false)
  t('on-main is NOT in the refusal set', REFUSE.has('on-main'), false)

  // THE CLEAN CONTROL — a fixture with every app cleanly on its own main must
  // produce zero refusals, so this gate can be told "checked nothing" from
  // "found nothing" the same way its siblings can.
  const cleanRows = SUBMODULES.map((sub) => classify('same', 'same', alwaysAncestor))
  t('a fully clean batch refuses nothing', cleanRows.filter((r) => REFUSE.has(r.verdict)).length, 0)
  t('a fully clean batch scans all six', cleanRows.length, SUBMODULES.length)

  const bad = cases.filter((c) => !c.ok)
  for (const b of bad) console.error(`FAIL ${b.n}: expected ${JSON.stringify(b.want)}, got ${JSON.stringify(b.got)}`)
  console.log(`\ncheck-gitlink-in-app-main self-test: ${cases.length - bad.length}/${cases.length} pass`)
  return bad.length ? 1 : 0
}

if (process.argv.includes('--self-test')) process.exit(selfTest())

const headRef = process.argv[2] || 'HEAD'

const rows = []
let unreadable = 0
for (const sub of SUBMODULES) {
  const gitlink = gitlinkAt(headRef, sub)
  if (gitlink === null) {
    rows.push({ sub, gitlink, appMain: null, verdict: 'absent' })
    continue
  }

  let appMain = null
  try {
    // Fresh from the APP'S OWN remote, every run — never trusting whatever the
    // parent's submodule checkout happens to have on disk.
    git(['fetch', '-q', 'origin', 'main'], sub)
    appMain = git(['rev-parse', 'origin/main'], sub)
  } catch {
    appMain = null
  }

  const isAncestor = (a, b) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: sub, stdio: 'ignore' })
      return true
    } catch (e) {
      if (e.status === 1) return false
      throw e // a real error (e.g. object missing) — do not silently read it as "not an ancestor"
    }
  }

  let row
  try {
    row = { sub, gitlink, appMain, ...classify(gitlink, appMain, isAncestor) }
  } catch {
    row = { sub, gitlink, appMain, verdict: 'UNREADABLE' }
    unreadable++
  }
  rows.push(row)
}

// THE DENOMINATOR FIRST, before any verdict — {scanned, on-main, refused} so a
// short run reads as "checked nothing", never as "found nothing".
const onMain = rows.filter((r) => r.verdict === 'on-main').length
const absent = rows.filter((r) => r.verdict === 'absent').length
const refused = rows.filter((r) => REFUSE.has(r.verdict) || r.verdict === 'UNREADABLE')
console.log(
  `check-gitlink-in-app-main: ${rows.length} submodule(s) examined against ${headRef}; ` +
    `${onMain} on their app's main; ${absent} absent at this ref; ${refused.length} refused.`,
)
for (const r of rows) {
  const g = r.gitlink ? r.gitlink.slice(0, 8) : '—'
  const m = r.appMain ? r.appMain.slice(0, 8) : '—'
  console.log(`  ${r.sub.padEnd(24)} gitlink=${g}  app-main=${m}  ${r.verdict}`)
}

if (unreadable > 0) {
  console.error(`\n  REFUSING to report — ${unreadable} submodule(s) could not be classified.`)
  console.error('  Their objects, or the app\'s own origin/main, could not be read in this job.')
  console.error('  A gate that skips what it cannot read reports coverage it does not have.')
  console.error('  In CI, check out with submodules: recursive, the cross-repo PAT, and an')
  console.error('  unshallowed fetch so ancestry across the app\'s own remote is answerable.')
  process.exit(2)
}

const bad = rows.filter((r) => REFUSE.has(r.verdict))
if (bad.length > 0) {
  console.error(`\n  REFUSED — ${bad.length} gitlink(s) do not sit on the app's own main branch.\n`)
  for (const r of bad) {
    console.error(`    ${r.sub}: ${r.verdict}`)
    console.error(`      this PR's gitlink: ${r.gitlink ? r.gitlink.slice(0, 12) : '—'}`)
    console.error(`      ${r.sub}'s own origin/main: ${r.appMain ? r.appMain.slice(0, 12) : '(unreadable)'}`)
  }
  console.error("\n  Every gitlink main ships must be an ANCESTOR of that app's own main tip.")
  console.error('  A commit that only exists on an app\'s development or feature branch has')
  console.error("  never been promoted through that app's own process — shipping it on bsuite")
  console.error('  main ships an untested, unreviewed tree wearing that app\'s name.')
  console.error("\n  FIX: re-point the gitlink at the app's own main tip (or wait for that app's")
  console.error('  next development→main promotion, then re-point to the new tip).')
  process.exit(1)
}

console.log("\ncheck-gitlink-in-app-main: OK — every gitlink sits on its app's own main branch.")
