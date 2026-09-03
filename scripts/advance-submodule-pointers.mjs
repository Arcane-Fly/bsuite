#!/usr/bin/env node
/**
 * advance-submodule-pointers — keep the parent's gitlinks level with each app's
 * MAIN tip, so guards stop reporting the pointer as an app defect.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The parent records one commit per app (a "gitlink"). SIX workflows read those
 * gitlinks — own-package-freshness, supabase-migrate, supabase-migration-rehearsal,
 * route-inventory, migration-collision-branch-tips, supabase-advisor-sweep — and
 * NOTHING wrote them. They moved only when a human remembered.
 *
 * On 2026-08-18 that produced three separate "findings" in one night, every one
 * of which was the stale pointer wearing an app's name:
 *
 *   own-package-freshness   "schema-builder ^1.3.0 is stale"  — the apps were on 1.3.1
 *   migration rehearsal     "FATAL: cannot diff R80.4 …78a574e6 DOES NOT EXIST"
 *   shared-package-reach    "braden LOCKED OUT of theme 0.14.0" — braden declared ^0.14.0
 *
 * Each guard was correct about what it read. None of them was reading the app
 * that actually ships. Hours went into chasing app defects that did not exist.
 *
 * THE TARGET IS EACH APP'S MAIN, NOT ITS DEVELOPMENT (2026-09-03).
 * The parent's gitlinks track each app's MAIN tip — precedent
 * precedent__bsuite__20260824__parent-gitlinks-track-submodule-main-not-development.
 * This script originally compared the recorded gitlink against each app's
 * `origin/development` head. That predicate refused every app whose own
 * development→main promotion is a normal merge commit, BY CONSTRUCTION: a
 * promotion merge leaves the app's development and main branches diverged from
 * each other (development gains its own next round of work; main gains only
 * the merge), so "is the gitlink an ancestor of development" goes NO the moment
 * an app promotes, even though the gitlink is still exactly where it should be
 * — sitting at the app's main. conduit, R80.4 and throughput were refused for
 * exactly this reason on 2026-09-03, none of them for a real defect. The fix is
 * not a workaround for those three apps; it is comparing against the ref this
 * script was always supposed to track.
 *
 * SAFETY: FORWARD ONLY.
 * A pointer that moves BACKWARD silently reverts an app — the parent would then
 * ship, test and deploy an older tree while the app's own branch says otherwise.
 * This refuses any move where the new commit is not a descendant of the recorded
 * one, and says so, rather than "helpfully" resetting it.
 *
 * It does NOT push. The parent's `development` is protected (enforce_admins is
 * on), so the workflow opens or updates a pull request instead. That is the
 * point, not a limitation: a pointer bump is a real change to what the estate
 * ships and belongs in a reviewable diff.
 *
 * USAGE
 *   node scripts/advance-submodule-pointers.mjs            # report only
 *   node scripts/advance-submodule-pointers.mjs --write    # stage the gitlinks
 *   node scripts/advance-submodule-pointers.mjs --self-test
 */

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const APPS = ['crm7', 'business-suite-unified', 'conduit', 'R80.4', 'braden', 'throughput']

/** Pure, so --self-test exercises the real decision rather than a paraphrase. */
export function evaluate(entries) {
  const advance = []
  const refuse = []
  const already = []

  for (const e of entries) {
    // A submodule that is not its own git repo here is the single most important
    // case to name accurately, because git does NOT error on it — it walks UP and
    // answers from the PARENT repo. See collect() for what that cost.
    if (e.notARepo) {
      refuse.push({
        app: e.app,
        why:
          `${e.app}/ is not an initialised git repository in this checkout, so its ` +
          `main tip cannot be read. This is a CHECKOUT failure, not history ` +
          `divergence: git resolves refs from the parent repo when a submodule ` +
          `directory has no .git, which silently yields the PARENT's own head for ` +
          `every submodule. Check that the checkout passed a cross-repo token.`,
      })
      continue
    }
    if (!e.head) {
      refuse.push({ app: e.app, why: `could not read its main tip` })
      continue
    }
    if (e.recorded === e.head) {
      already.push(e.app)
      continue
    }
    if (!e.headIsDescendantOfRecorded) {
      // Either a force-push rewrote history, or someone is asking us to move a
      // pointer backwards. Both need a human — a backward move silently reverts
      // the app for everything that reads the gitlink.
      refuse.push({
        app: e.app,
        why:
          `${e.head.slice(0, 8)} is NOT a descendant of the recorded ${e.recorded.slice(0, 8)}. ` +
          `Moving the pointer would revert the app for every workflow that reads it. ` +
          `Resolve by hand — this is history divergence, not staleness.`,
      })
      continue
    }
    advance.push({ app: e.app, from: e.recorded, to: e.head, behind: e.behind })
  }

  return { advance, refuse, already, ok: refuse.length === 0 }
}

function selfTest() {
  const cases = [
    ['a pointer already at the head is left alone',
      [{ app: 'a', recorded: 'aaa', head: 'aaa', headIsDescendantOfRecorded: true }],
      { advance: 0, refuse: 0, already: 1 }],
    ['a pointer behind its head advances',
      [{ app: 'a', recorded: 'aaa', head: 'bbb', headIsDescendantOfRecorded: true, behind: 3 }],
      { advance: 1, refuse: 0, already: 0 }],
    ['a BACKWARD move is refused, never silently applied',
      [{ app: 'a', recorded: 'bbb', head: 'aaa', headIsDescendantOfRecorded: false }],
      { advance: 0, refuse: 1, already: 0 }],
    ['a rewritten history is refused rather than guessed at',
      [{ app: 'a', recorded: 'old', head: 'rewritten', headIsDescendantOfRecorded: false }],
      { advance: 0, refuse: 1, already: 0 }],
    ['an unreadable head is refused, not treated as "no change"',
      [{ app: 'a', recorded: 'aaa', head: null }],
      { advance: 0, refuse: 1, already: 0 }],
    ['a mixed batch advances only the safe ones',
      [{ app: 'a', recorded: 'a1', head: 'a2', headIsDescendantOfRecorded: true, behind: 1 },
       { app: 'b', recorded: 'b2', head: 'b1', headIsDescendantOfRecorded: false },
       { app: 'c', recorded: 'c1', head: 'c1', headIsDescendantOfRecorded: true }],
      { advance: 1, refuse: 1, already: 1 }],
  ]
  let bad = 0
  for (const [name, entries, want] of cases) {
    const r = evaluate(entries)
    const got = { advance: r.advance.length, refuse: r.refuse.length, already: r.already.length }
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      console.error(`  FAIL ${name}: wanted ${JSON.stringify(want)}, got ${JSON.stringify(got)}`)
      bad++
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THE CASE THAT WAS NEVER TESTED, AND THE ONE THAT WAS ACTUALLY BROKEN.
  //
  // Everything above exercises evaluate() — a pure function over entries someone
  // else assembled. It passed 141 consecutive runs while this script had not
  // written a single pointer, because the defect was in collect(): with an
  // uncloned submodule, `git -C crm7 rev-parse origin/development` does not fail,
  // it answers from the PARENT repo. All six submodules came back with the same
  // sha and evaluate() dutifully refused all six as "history divergence".
  //
  // A self-test that cannot reach the broken half is a green light wired to
  // nothing. These cases drive collect() with a fake git that reproduces the
  // escape-to-parent exactly.
  // ─────────────────────────────────────────────────────────────────────────
  const PARENT_HEAD = 'parenthead0000000000000000000000000000000'
  const collectCases = [
    [
      'an UNCLONED submodule is refused as a checkout failure, NOT as history divergence',
      // rev-parse --show-toplevel answers with the PARENT path — the real escape.
      (args) => {
        if (args[0] === 'ls-tree') return `160000 commit recorded123\tcrm7`
        if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return process.cwd()
        if (args[0] === 'rev-parse') return PARENT_HEAD
        return ''
      },
      { refuse: 1, advance: 0, notARepo: true },
    ],
    [
      'a properly cloned submodule behind its head still advances',
      (args, cwd) => {
        if (args[0] === 'ls-tree') return `160000 commit recorded123\tcrm7`
        if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return path.resolve(process.cwd(), 'crm7')
        if (args[0] === 'rev-parse') return 'realhead456'
        if (args[0] === 'merge-base') return ''            // ancestor -> no throw
        if (args[0] === 'rev-list') return '3'
        return ''
      },
      { refuse: 0, advance: 1, notARepo: false },
    ],
    [
      'a cloned submodule whose head diverged is still refused as divergence',
      (args) => {
        if (args[0] === 'ls-tree') return `160000 commit recorded123\tcrm7`
        if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return path.resolve(process.cwd(), 'crm7')
        if (args[0] === 'rev-parse') return 'rewritten789'
        if (args[0] === 'merge-base') throw new Error('not an ancestor')
        if (args[0] === 'rev-list') return '0'
        return ''
      },
      { refuse: 1, advance: 0, notARepo: false },
    ],
    [
      // THE PROMOTION-MERGE-COMMIT SHAPE (2026-09-03). A development→main
      // promotion merge leaves an app's development and main diverged from
      // each other by construction — development keeps moving, main gains
      // only the merge commit. conduit, R80.4 and throughput were refused by
      // the OLD (development-targeting) predicate on exactly this shape, for
      // no real defect. This case fails loudly if collect() ever asks for
      // origin/development again instead of origin/main.
      'a promotion-merge-commit shape: development has diverged from main, but the gitlink still advances cleanly against MAIN',
      (args) => {
        if (args[0] === 'ls-tree') return `160000 commit recorded123\tcrm7`
        if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return path.resolve(process.cwd(), 'crm7')
        if (args[0] === 'fetch') {
          if (args[3] !== 'main') {
            throw new Error(`collect() must fetch origin/main, not origin/${args[3]} — a promotion merge diverges development from main by construction`)
          }
          return ''
        }
        if (args[0] === 'rev-parse') {
          if (args[1] !== 'origin/main') {
            throw new Error(`collect() must read origin/main as the target head, not ${args[1]}`)
          }
          return 'mainpromoted999'
        }
        if (args[0] === 'merge-base') return '' // recorded IS an ancestor of the new main tip -> advances
        if (args[0] === 'rev-list') return '2'
        return ''
      },
      { refuse: 0, advance: 1, notARepo: false },
    ],
  ]

  for (const [name, fakeGit, want] of collectCases) {
    const entries = collect(fakeGit, ['crm7'])
    const r = evaluate(entries)
    const gotNotARepo = Boolean(entries[0]?.notARepo)
    if (r.refuse.length !== want.refuse || r.advance.length !== want.advance || gotNotARepo !== want.notARepo) {
      console.error(
        `  FAIL ${name}: wanted refuse=${want.refuse} advance=${want.advance} notARepo=${want.notARepo}, ` +
          `got refuse=${r.refuse.length} advance=${r.advance.length} notARepo=${gotNotARepo}`,
      )
      bad++
    }
  }

  // POSITIVE CONTROL on the exact production symptom: six submodules, none cloned,
  // every one of them handed the parent's own head. The old code called that six
  // history divergences. It must now be six checkout failures, and the word
  // "descendant" must appear nowhere in the reasons.
  const sixUncloned = collect((args) => {
    if (args[0] === 'ls-tree') return `160000 commit recorded123\t${args[3]}`
    if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return process.cwd()
    if (args[0] === 'rev-parse') return PARENT_HEAD
    return ''
  }, APPS)
  const sixResult = evaluate(sixUncloned)
  // ---- the refusal allowlist, both directions and the ways it must NOT fire ----
  {
    const NOW = new Date('2026-09-03T00:00:00Z')
    const entry = (app, extra = {}) => ({
      app, reason: 'standing divergence', first_seen: '2026-09-01', review_condition: 'when reconciled', ...extra,
    })
    const A = loadAllowedRefusals(JSON.stringify({ refusals: [entry('R80.4')] }), NOW)
    let ok = true
    const chk = (name, got, want) => { if (got !== want) { ok = false; console.error(`  FAIL allowlist: ${name} got ${got}, want ${want}`) } }
    chk('a listed app is allowed', A.has('R80.4'), true)
    // NEGATIVE CONTROL: an app NOT listed must still fail, or the allowlist is a waiver.
    chk('an unlisted app is not allowed', A.has('crm7'), false)
    // An entry with no reason is not an entry — a waiver with no stated reason is a
    // waiver nobody can review.
    chk('a reasonless entry is ignored',
      loadAllowedRefusals(JSON.stringify({ refusals: [entry('crm7', { reason: '  ' })] }), NOW).has('crm7'), false)
    chk('a missing reason field is ignored',
      loadAllowedRefusals(JSON.stringify({ refusals: [{ app: 'crm7', first_seen: '2026-09-01', review_condition: 'x' }] }), NOW).has('crm7'), false)
    // THE RATCHET: an entry missing first_seen or review_condition is not an entry
    // either — a waiver with no age and no exit condition can never expire.
    chk('a missing first_seen field is ignored',
      loadAllowedRefusals(JSON.stringify({ refusals: [{ app: 'crm7', reason: 'x', review_condition: 'x' }] }), NOW).has('crm7'), false)
    chk('a missing review_condition field is ignored',
      loadAllowedRefusals(JSON.stringify({ refusals: [{ app: 'crm7', reason: 'x', first_seen: '2026-09-01' }] }), NOW).has('crm7'), false)
    chk('a malformed first_seen is ignored',
      loadAllowedRefusals(JSON.stringify({ refusals: [entry('crm7', { first_seen: '3 Sept 2026' })] }), NOW).has('crm7'), false)
    // THE RATCHET, THE PART THAT ACTUALLY BITES: an entry younger than the limit
    // is honoured; the SAME entry, seen 8 days ago instead of 2, is not — it must
    // stop suppressing the failure entirely on its own, with no human action.
    chk('an entry within the age limit is still allowed',
      loadAllowedRefusals(JSON.stringify({ refusals: [entry('crm7', { first_seen: '2026-08-27' }) ] }), NOW).has('crm7'), true) // exactly 7d
    chk('an entry past the age limit is EXPIRED, not allowed',
      loadAllowedRefusals(JSON.stringify({ refusals: [entry('crm7', { first_seen: '2026-08-25' }) ] }), NOW).has('crm7'), false) // 9d
    // An unreadable allowlist must allow NOTHING — refusals then fail, the safe direction.
    chk('unparseable json allows nothing', loadAllowedRefusals('{not json', NOW).size, 0)
    chk('an empty doc allows nothing', loadAllowedRefusals('{}', NOW).size, 0)
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} refusal-allowlist cases (incl. the 7-day ratchet)`)
    if (!ok) return 1
  }

  if (sixResult.refuse.length !== APPS.length) {
    console.error(`  FAIL positive control: wanted ${APPS.length} refusals, got ${sixResult.refuse.length}`)
    bad++
  }
  if (sixResult.refuse.some((r) => /descendant/i.test(r.why))) {
    console.error(
      '  FAIL positive control: an uncloned submodule was still reported as history ' +
        'divergence. That is the 141-failure message and it must not survive.',
    )
    bad++
  }

  console.log(
    `advance-submodule-pointers --self-test: ${cases.length} evaluate() cases (already-current, ` +
      `forward advance, BACKWARD refusal, rewritten-history refusal, unreadable-head refusal, ` +
      `mixed batch) + ${collectCases.length} collect() cases driving a fake git ` +
      `(UNCLONED submodule escaping to the parent, a healthy clone advancing, a genuine ` +
      `divergence, a promotion-merge-commit shape proving collect() reads origin/main ` +
      `and never origin/development) + a ${APPS.length}-submodule positive control ` +
      `asserting the escape-to-parent is never again reported as history divergence.`,
  )
  return bad
}

const realGit = (args, cwd = process.cwd()) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

/**
 * IS THIS DIRECTORY ITS OWN GIT REPOSITORY?
 *
 * This question is the whole bug. `git rev-parse origin/main` run with cwd
 * set to an EMPTY `crm7/` does not fail — git walks up the tree, finds the parent's
 * .git, and answers from the PARENT. So every submodule returned the parent's own
 * main tip, all six came back identical, and the descendant check correctly
 * refused all six with "NOT a descendant … this is history divergence".
 *
 * The message was wrong in the most expensive possible way: it named an app-history
 * problem that did not exist and told a human to resolve it by hand, when the real
 * cause was that `git submodule update` had failed to clone anything (private repos,
 * no cross-repo credential) and `|| true` had swallowed it. 141 consecutive runs.
 *
 * Comparing the resolved toplevel against the expected path is the check git will
 * not do for you.
 */
function isOwnRepo(git, app) {
  let top
  try {
    top = git(['rev-parse', '--show-toplevel'], app)
  } catch {
    return false // no repo reachable at all
  }
  try {
    return path.resolve(top) === path.resolve(process.cwd(), app)
  } catch {
    return false
  }
}

export function collect(git = realGit, apps = APPS) {
  const entries = []
  for (const app of apps) {
    let recorded = null
    try {
      const line = git(['ls-tree', 'HEAD', '--', app])
      recorded = line.split(/\s+/)[2] ?? null
    } catch { /* not a submodule here */ }
    if (!recorded) continue

    // BEFORE reading anything from inside the submodule. Every read below is
    // meaningless — and actively misleading — if the directory is not its own repo.
    if (!isOwnRepo(git, app)) {
      entries.push({ app, recorded, head: null, headIsDescendantOfRecorded: false, behind: 0, notARepo: true })
      continue
    }

    let head = null
    let headIsDescendantOfRecorded = false
    let behind = 0
    try {
      // MAIN, not development — see the file header (2026-09-03). A promotion
      // merge commit leaves an app's development and main diverged from each
      // other by construction, so comparing against development refuses every
      // app the moment it promotes, for no real defect.
      git(['fetch', '-q', 'origin', 'main'], app)
      head = git(['rev-parse', 'origin/main'], app)
      try {
        git(['merge-base', '--is-ancestor', recorded, head], app)
        headIsDescendantOfRecorded = true
      } catch { headIsDescendantOfRecorded = false }
      behind = Number(git(['rev-list', '--count', `${recorded}..${head}`], app)) || 0
    } catch { /* head stays null -> refused, not silently skipped */ }

    entries.push({ app, recorded, head, headIsDescendantOfRecorded, behind })
  }
  return entries
}

// A STANDING REFUSAL IS NOT PERMANENT (2026-09-03 ratchet).
//
// A reason-only entry never expires, and an allowlist that never expires is how
// a "resolved by hand next week" waiver quietly becomes forever. Every entry
// now carries `first_seen` (YYYY-MM-DD, the date the refusal was first observed)
// and `review_condition` (the human-readable condition under which it should be
// removed). An entry older than REFUSAL_MAX_AGE_DAYS stops suppressing the
// failure — it is EXPIRED, not honoured — so the workflow goes red again on its
// own schedule instead of staying quiet until someone remembers to look.
const REFUSAL_MAX_AGE_DAYS = 7

/** Standing refusals that are the CORRECT answer, keyed app -> {reason, first_seen, review_condition}. */
export function loadAllowedRefusals(raw, now = new Date()) {
  const m = new Map()
  try {
    const doc = typeof raw === 'string' ? JSON.parse(raw) : raw
    for (const r of doc?.refusals || []) {
      if (!r || typeof r.app !== 'string') continue
      if (typeof r.reason !== 'string' || !r.reason.trim()) continue
      if (typeof r.first_seen !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.first_seen)) continue
      if (typeof r.review_condition !== 'string' || !r.review_condition.trim()) continue
      const firstSeen = new Date(`${r.first_seen}T00:00:00Z`)
      if (Number.isNaN(firstSeen.getTime())) continue
      const ageDays = (now.getTime() - firstSeen.getTime()) / 86_400_000
      if (ageDays > REFUSAL_MAX_AGE_DAYS) continue // EXPIRED — see the block comment above
      m.set(r.app, { reason: r.reason, first_seen: r.first_seen, review_condition: r.review_condition })
    }
  } catch { /* an unreadable allowlist allows nothing — refusals then fail, which is the safe direction */ }
  return m
}

const ALLOWED_REFUSALS = (() => {
  try {
    return loadAllowedRefusals(readFileSync(new URL('./gitlink-refusal-allowlist.json', import.meta.url), 'utf8'))
  } catch { return new Map() }
})()

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
  const write = process.argv.includes('--write')

  const entries = collect()
  const { advance, refuse, already, ok } = evaluate(entries)

  // LANE-WATCHER: the denominator goes at the HEAD, before any verdict.
  console.log(
    `advance-submodule-pointers: ${entries.length} submodule(s) examined; ` +
      `${already.length} already current; ${advance.length} to advance; ${refuse.length} refused.`,
  )
  for (const a of advance) {
    console.log(`    ADVANCE  ${a.app.padEnd(24)} ${a.from.slice(0, 8)} -> ${a.to.slice(0, 8)}  (${a.behind} commit(s))`)
  }
  for (const a of already) console.log(`    current  ${a}`)
  for (const r of refuse) {
    // An allowlisted refusal must not emit ::error::. GitHub renders that as an error
    // annotation even on a passing job, and an annotation nobody can act on is the
    // same noise as a red check nobody reads.
    if (ALLOWED_REFUSALS.has(r.app)) console.log(`    REFUSED ${r.app} — ${r.why}`)
    else console.error(`::error::REFUSED ${r.app} — ${r.why}`)
  }

  if (write) {
    for (const a of advance) {
      execFileSync('git', ['update-index', '--cacheinfo', `160000,${a.to},${a.app}`], { stdio: 'inherit' })
    }
    console.log(`  staged ${advance.length} gitlink(s)`)
  }

  // A refusal is a real finding and must fail — UNLESS it is a standing one that
  // cannot be resolved from here (e.g. an app whose own main has genuinely
  // diverged from the recorded gitlink and needs a human reconciliation). A
  // correct refusal that fails the whole job leaves this workflow permanently
  // red, and a workflow that has been red for weeks is one nobody reads —
  // which is precisely how a genuinely NEW refusal arrives looking exactly
  // like an old, already-understood one. See scripts/gitlink-refusal-allowlist.json.
  //
  // Allowlisted refusals are REPORTED and do not fail. Everything else still fails
  // (though as of 2026-09-03 that failure no longer blocks the safe advances —
  // see the workflow's own "Advance the pointers" step for why).
  const unexpected = refuse.filter((r) => !ALLOWED_REFUSALS.has(r.app))
  const expected = refuse.filter((r) => ALLOWED_REFUSALS.has(r.app))
  for (const r of expected) {
    const entry = ALLOWED_REFUSALS.get(r.app)
    console.log(
      `    (allowlisted refusal, first seen ${entry.first_seen}, expires after ` +
        `${REFUSAL_MAX_AGE_DAYS}d) ${r.app} — ${entry.reason} — remove when: ${entry.review_condition}`,
    )
  }
  // A DEAD ENTRY IS NOT HARMLESS. An app that has stopped being refused but is still
  // listed here silently pre-authorises the next divergence in that app, which is how
  // a per-item allowlist rots into a blanket waiver.
  const refusedApps = new Set(refuse.map((r) => r.app))
  const dead = [...ALLOWED_REFUSALS.keys()].filter((a) => !refusedApps.has(a))
  if (dead.length) {
    console.error(`::error::allowlisted refusal(s) no longer refused: ${dead.join(', ')} — remove them from scripts/gitlink-refusal-allowlist.json`)
  }

  process.exit(unexpected.length || dead.length ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
