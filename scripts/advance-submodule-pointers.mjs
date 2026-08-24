#!/usr/bin/env node
/**
 * advance-submodule-pointers — keep the parent's gitlinks level with each app's
 * development head, so guards stop reporting the pointer as an app defect.
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
          `development head cannot be read. This is a CHECKOUT failure, not history ` +
          `divergence: git resolves refs from the parent repo when a submodule ` +
          `directory has no .git, which silently yields the PARENT's own head for ` +
          `every submodule. Check that the checkout passed a cross-repo token.`,
      })
      continue
    }
    if (!e.head) {
      refuse.push({ app: e.app, why: `could not read its development head` })
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
      `divergence) + a ${APPS.length}-submodule positive control asserting the ` +
      `escape-to-parent is never again reported as history divergence.`,
  )
  return bad
}

const realGit = (args, cwd = process.cwd()) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

/**
 * IS THIS DIRECTORY ITS OWN GIT REPOSITORY?
 *
 * This question is the whole bug. `git rev-parse origin/development` run with cwd
 * set to an EMPTY `crm7/` does not fail — git walks up the tree, finds the parent's
 * .git, and answers from the PARENT. So every submodule returned the parent's own
 * development head, all six came back identical, and the descendant check correctly
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
      git(['fetch', '-q', 'origin', 'development'], app)
      head = git(['rev-parse', 'origin/development'], app)
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
  for (const r of refuse) console.error(`::error::REFUSED ${r.app} — ${r.why}`)

  if (write) {
    for (const a of advance) {
      execFileSync('git', ['update-index', '--cacheinfo', `160000,${a.to},${a.app}`], { stdio: 'inherit' })
    }
    console.log(`  staged ${advance.length} gitlink(s)`)
  }

  // A refusal is a real finding and must fail. Nothing-to-do is success.
  process.exit(ok ? 0 : 1)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
