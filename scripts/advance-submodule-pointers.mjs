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

const APPS = ['crm7', 'business-suite-unified', 'conduit', 'R80.4', 'braden', 'throughput']

/** Pure, so --self-test exercises the real decision rather than a paraphrase. */
export function evaluate(entries) {
  const advance = []
  const refuse = []
  const already = []

  for (const e of entries) {
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
  console.log(
    `advance-submodule-pointers --self-test: ${cases.length} cases exercised across both ` +
      `directions (already-current, forward advance, BACKWARD refusal, rewritten-history ` +
      `refusal, unreadable-head refusal, and a mixed batch).`,
  )
  return bad
}

const git = (args, cwd = process.cwd()) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

function collect() {
  const entries = []
  for (const app of APPS) {
    let recorded = null
    try {
      const line = git(['ls-tree', 'HEAD', '--', app])
      recorded = line.split(/\s+/)[2] ?? null
    } catch { /* not a submodule here */ }
    if (!recorded) continue

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
