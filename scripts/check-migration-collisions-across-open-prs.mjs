#!/usr/bin/env node
/**
 * Two OPEN pull requests can claim the same migration version, and nothing sees it.
 *
 * `check-migration-collisions-at-branch-tips.mjs` says so itself, in its own
 * "WHAT THIS GATE CANNOT SEE" block:
 *
 *   "OPEN PR BRANCHES in the submodules. Two migrations authored on two unmerged
 *    feature branches collide with each other invisibly here. The gate only sees
 *    them once the first one merges to its `development` — at which point the
 *    second one's own parent PR fails. That is a real narrowing of the window
 *    (hours instead of never), NOT closure of it."
 *
 * IT HAPPENED. 2026-08-27: business-suite-unified#935 (email signatures) and #940
 * (an RLS privilege-escalation fix) both claimed `20260928000000`, both open at the
 * same time, with the PROMOTION PR already raised carrying both. All scopes share
 * ONE `supabase_migrations.schema_migrations` keyed on the version string alone, so
 * whichever file the applier reached second would have been recorded as applied and
 * silently SKIPPED — its DDL never running while the pipeline reported success.
 *
 * The coin-flip was between an email feature and the migration that closes a live
 * privilege-escalation chain. It was caught by hand, after both had merged.
 *
 * WHY A SCHEDULE AND NOT AN EVENT
 * -------------------------------
 * The colliding state is created when someone opens a PR in a SUBMODULE. The parent
 * repository has no event for that. Per
 * precedent__bsuite__20260802__a_gate_must_prove_it_executed (fifth shape):
 * "a state created in another repository can only be observed on a clock."
 *
 * This does NOT replace the branch-tip gate. That one answers "does this parent PR
 * collide with the siblings' development tips" at merge time, cheaply, on the right
 * event. This one answers a question no event in this repo can pose.
 *
 *   node scripts/check-migration-collisions-across-open-prs.mjs
 *   node scripts/check-migration-collisions-across-open-prs.mjs --self-test
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'

export const SCOPES = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

/** A migration filename's version: a character walk, never a regex.
 *  (precedent__bsuite__20260812__regex_is_forbidden_parse_instead, Tier 2, binding.) */
export function versionOf(filename) {
  const base = filename.slice(filename.lastIndexOf('/') + 1)
  let i = 0
  while (i < base.length && base[i] >= '0' && base[i] <= '9') i++
  if (i !== 14) return null                 // the estate's versions are exactly 14 digits
  if (i < base.length && base[i] !== '_') return null
  return base.slice(0, 14)
}

/**
 * Group entries by version and keep only versions claimed by MORE THAN ONE
 * distinct source. Two entries from the SAME pr+scope are one file listed twice,
 * not a collision.
 */
export function collisions(entries) {
  const byVersion = new Map()
  for (const e of entries) {
    if (!byVersion.has(e.version)) byVersion.set(e.version, [])
    byVersion.get(e.version).push(e)
  }
  const out = []
  for (const [version, group] of byVersion) {
    const sources = new Set(group.map((g) => `${g.scope}#${g.pr}`))
    if (sources.size <= 1) continue
    // CONTENT, not just the version string. The hazard is the applier recording a
    // version, reaching a SECOND, DIFFERENT file at it, and silently skipping that
    // DDL. Two PRs carrying the byte-identical file lose nothing: whichever merges
    // first applies it, the other merges to a no-op.
    //
    // Measured 2026-09-02: crm7#2333 (reconcile main->development) and crm7#2331
    // (cut from main) shared 20261102000000, 20261103000000 and 20261105000000 as
    // IDENTICAL blobs. All three were reported as collisions demanding a renumber,
    // which would have been wrong — one file seen on two branches. A merge-blocking
    // gate with three false positives teaches everyone to merge through it, which is
    // exactly when it stops catching the real thing.
    //
    // FAILS CLOSED: an unreadable blob is its own identity, never equal to another,
    // so "could not compare" can never read as "identical".
    const contents = new Set(
      group.map((g, n) => (g.blob ? `blob:${g.blob}` : `unreadable:${g.scope}#${g.pr}:${g.file}:${n}`)),
    )
    if (contents.size > 1) out.push({ version, entries: group })
  }
  return out.sort((a, b) => a.version.localeCompare(b.version))
}

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
}

function openPrHeads(scope, root) {
  const dir = path.join(root, scope)
  try {
    const raw = sh('gh', ['pr', 'list', '--state', 'open', '--json', 'number,headRefName', '--limit', '100'], dir)
    return JSON.parse(raw || '[]')
  } catch {
    return null                              // UNREADABLE, which is not "no PRs"
  }
}

function migrationsOnBranch(scope, root, branch) {
  const dir = path.join(root, scope)
  try {
    sh('git', ['fetch', 'origin', branch, '--quiet'], dir)
    // NOT --name-only: the blob sha is what lets collisions() tell ONE file on two
    // branches from TWO DIFFERENT files claiming one version.
    const listing = sh('git', ['ls-tree', '-r', 'FETCH_HEAD', 'supabase/migrations/'], dir)
    // `archive/` IS NOT A MIGRATION SET. This gate asks what the applier will RUN,
    // and `supabase db push` reads only the top level of supabase/migrations —
    // subdirectories are history, filed away, already applied.
    //
    // Without this, crm7's 658 archived files each look like a live claim on their
    // version. Measured 2026-08-28: two unrelated PRs, one in crm7 and one in BSU,
    // were reported as colliding on 20260728120000 because crm7 carries an ARCHIVED
    // copy of a migration BSU still has at the top level. Neither PR added a
    // migration at all. A collision gate that fires on history teaches everyone to
    // merge through it, which is exactly when it stops catching the real thing.
    //
    // (lint-migrations-revoke-anon.mjs is the opposite case and must KEEP reading
    // archive/: a REVOKE that ran in June is still in force, so its question —
    // what privileges does the database hold — is answered by the whole history.)
    if (!listing) return []
    const out = []
    for (const line of listing.split('\n')) {
      if (!line) continue
      // `<mode> <type> <sha>\t<path>` — split on the tab, then walk the left side.
      const tab = line.indexOf('\t')
      if (tab < 0) continue
      const file = line.slice(tab + 1)
      if (file.includes('/archive/')) continue
      const meta = line.slice(0, tab).split(' ').filter(Boolean)
      out.push({ file, blob: meta.length === 3 ? meta[2] : null })
    }
    return out
  } catch {
    return []
  }
}

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want })

  t('a 14-digit version parses', versionOf('supabase/migrations/20260928000000_email_signatures.sql'), '20260928000000')
  t('a short prefix is not a version', versionOf('20260928_thing.sql'), null)
  t('a long prefix is not a version', versionOf('202609280000000_thing.sql'), null)
  t('digits must be followed by _', versionOf('20260928000000-thing.sql'), null)
  t('a non-numeric name is not a version', versionOf('README.md'), null)

  // THE REAL CASE, from 2026-08-27: two open PRs in ONE app claiming one version.
  const real = [
    { scope: 'business-suite-unified', pr: 935, version: '20260928000000', file: 'a_email_signatures.sql', blob: 'aaaaaaaa' },
    { scope: 'business-suite-unified', pr: 940, version: '20260928000000', file: 'b_close_escalation.sql', blob: 'bbbbbbbb' },
  ]
  t('two open PRs claiming one version with DIFFERENT content collide', collisions(real).length, 1)

  // NEGATIVE CONTROL: the same PR listing a file twice is NOT a collision, or the
  // gate cries wolf on every run and gets ignored.
  t('one PR, one version, listed twice is not a collision',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql' },
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql' },
    ]).length, 0)

  // NEGATIVE CONTROL: distinct versions never collide.
  t('distinct versions do not collide',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql' },
      { scope: 'conduit', pr: 2, version: '20260102000000', file: 'y.sql' },
    ]).length, 0)

  // CROSS-SCOPE is the estate's actual risk: one shared ledger, keyed on the string.
  t('two apps claiming one version collide',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql' },
      { scope: 'conduit', pr: 2, version: '20260101000000', file: 'y.sql' },
    ]).length, 1)


  // THE 2026-09-02 FALSE POSITIVE, as a permanent case: one file, two branches,
  // identical blob. Merging both is a no-op on the second — no DDL is lost.
  t('two open PRs carrying the IDENTICAL blob do not collide',
    collisions([
      { scope: 'crm7', pr: 2333, version: '20261103000000', file: 'w.sql', blob: 'd5abd847' },
      { scope: 'crm7', pr: 2331, version: '20261103000000', file: 'w.sql', blob: 'd5abd847' },
    ]).length, 0)

  // ...and identical content across two APPS is still one DDL, so still not a loss.
  t('the identical blob across two apps does not collide',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql', blob: 'cafe1234' },
      { scope: 'conduit', pr: 2, version: '20260101000000', file: 'x.sql', blob: 'cafe1234' },
    ]).length, 0)

  // FAIL CLOSED. An unreadable blob is never equal to anything, including another
  // unreadable one — otherwise a tree that could not be read reports as clean.
  t('an UNREADABLE blob still collides',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql', blob: null },
      { scope: 'conduit', pr: 2, version: '20260101000000', file: 'y.sql', blob: null },
    ]).length, 1)

  // ...and one readable, one not, is still a collision.
  t('a readable blob against an unreadable one collides',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql', blob: 'cafe1234' },
      { scope: 'conduit', pr: 2, version: '20260101000000', file: 'y.sql', blob: null },
    ]).length, 1)
  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-migration-collisions-across-open-prs: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length ? 1 : 0
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest())
  const root = process.cwd()

  const entries = []
  const unreadable = []
  let prCount = 0
  for (const scope of SCOPES) {
    const prs = openPrHeads(scope, root)
    if (prs === null) { unreadable.push(scope); continue }
    for (const pr of prs) {
      prCount++
      for (const { file, blob } of migrationsOnBranch(scope, root, pr.headRefName)) {
        const version = versionOf(file)
        if (version) entries.push({ scope, pr: pr.number, branch: pr.headRefName, version, file, blob })
      }
    }
  }

  // An UNREADABLE scope is not an empty one. Say so and fail, rather than report a
  // clean scan over a set that was never whole.
  if (unreadable.length) {
    console.error(`::error::could not list open PRs for: ${unreadable.join(', ')} — that is an ABSENT result, not a clean one.`)
    process.exit(2)
  }

  console.log(`check-migration-collisions-across-open-prs: ${SCOPES.length} scope(s), ${prCount} open PR(s), ${entries.length} migration file(s) on their branches`)

  const found = collisions(entries)
  for (const c of found) {
    console.error(`::error::VERSION ${c.version} is claimed by ${new Set(c.entries.map((e) => `${e.scope}#${e.pr}`)).size} different open PRs:`)
    for (const e of c.entries) {
      const b = e.blob ? e.blob.slice(0, 8) : 'UNREADABLE'
      console.error(`    ${e.scope}#${e.pr} (${e.branch})  ${e.file}  blob=${b}`)
    }
  }
  if (found.length) {
    console.error('')
    console.error('  All scopes share ONE supabase_migrations.schema_migrations, keyed on the version')
    console.error('  string alone. Whichever file the applier reaches SECOND is recorded as applied and')
    console.error('  silently SKIPPED — its DDL never runs and the pipeline reports success.')
    console.error('  Renumber the newer migration to an unused timestamp BEFORE either PR merges.')
  } else {
    console.log('  no version is claimed by more than one open PR')
  }
  process.exit(found.length ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
