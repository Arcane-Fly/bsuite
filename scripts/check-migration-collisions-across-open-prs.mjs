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
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { compareForCollision } from './lib/migration-collision-compare.mjs'

export const SCOPES = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

// The same authority check-migration-collisions-at-branch-tips.mjs reads —
// duplicated here rather than imported, because that file runs its own
// main() as TOP-LEVEL module code with no `import.meta.url` guard (it
// resolves a root path and calls `process.exit(0)` unconditionally at load
// time), so importing anything from it would execute its whole CLI as a side
// effect of loading this one function.
export const APPLIER_WORKFLOW_RELATIVE_PATH = '.github/workflows/supabase-migrate.yml'

/**
 * Read MIGRATION_FLOOR from the applier workflow. An anchored key/value scan,
 * not a YAML parse and not a regex
 * (precedent__bsuite__20260812__regex_is_forbidden_parse_instead, Tier 2).
 * Identical logic to check-migration-collisions-at-branch-tips.mjs's own
 * extractFloor — see this file's header for why it is copied, not imported.
 */
export function extractFloor(workflowText) {
  for (const raw of workflowText.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('MIGRATION_FLOOR:')) continue
    let value = line.slice('MIGRATION_FLOOR:'.length).trim()
    const hash = value.indexOf('#')
    if (hash !== -1) value = value.slice(0, hash).trim()
    if (
      (value.startsWith("'") && value.endsWith("'") && value.length > 1) ||
      (value.startsWith('"') && value.endsWith('"') && value.length > 1)
    ) {
      value = value.slice(1, -1)
    }
    if (!value) continue
    let allDigits = true
    for (const ch of value) if (ch < '0' || ch > '9') allDigits = false
    if (!allDigits) continue
    return value
  }
  return null
}

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
    if (contents.size <= 1) continue

    // BLOBS DIFFER — that is not automatically a real collision (bsuite J7,
    // 2026-09-03). A comment-only difference (a header noting which copy is
    // canonical, or the `-- rehearsal: already-enforced` marker
    // scripts/supabase/rehearse-migrations.mjs reads) gives every copy a
    // DIFFERENT blob despite carrying the same DDL. `.content`, when the
    // caller has fetched it (main() only does this for groups that reach
    // here — every file on every open PR would be too expensive to read
    // unconditionally), is compared with the SAME rule every other
    // migration-collision gate in this estate uses. Missing content on any
    // entry means the tie-break is skipped and the group is reported as a
    // real collision — the same fail-closed direction as an unreadable blob.
    const allHaveContent = group.every((g) => typeof g.content === 'string')
    if (allHaveContent) {
      const anchor = group[0].content
      const allCommentOnly = group.slice(1).every((g) => compareForCollision(anchor, g.content).equal)
      if (allCommentOnly) continue
    }

    out.push({ version, entries: group })
  }
  return out.sort((a, b) => a.version.localeCompare(b.version))
}

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()
}

function openPrHeads(scope, root) {
  const dir = path.join(root, scope)
  try {
    const raw = sh('gh', ['pr', 'list', '--state', 'open', '--json', 'number,headRefName,headRefOid,baseRefName', '--limit', '100'], dir)
    return JSON.parse(raw || '[]')
  } catch {
    return null                              // UNREADABLE, which is not "no PRs"
  }
}

function listMigrationTree(dir, ref) {
  // NOT --name-only: the blob sha is what lets collisions() tell ONE file on two
  // branches from TWO DIFFERENT files claiming one version.
  const listing = sh('git', ['ls-tree', '-r', ref, 'supabase/migrations/'], dir)
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
  const byPath = new Map()
  if (!listing) return byPath
  for (const line of listing.split('\n')) {
    if (!line) continue
    // `<mode> <type> <sha>\t<path>` — split on the tab, then walk the left side.
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const file = line.slice(tab + 1)
    if (file.includes('/archive/')) continue
    const meta = line.slice(0, tab).split(' ').filter(Boolean)
    byPath.set(file, meta.length === 3 ? meta[2] : null)
  }
  return byPath
}

/**
 * Migrations this PR itself ADDS — files present at the branch tip that are
 * NOT present at its merge-base with its own base branch. Not the whole tree
 * at the tip.
 *
 * FOLLOW (2026-09-04): the prior version of this function listed the ENTIRE
 * `supabase/migrations/` tree at HEAD, which for every scope includes every
 * migration ever merged, including ones from months before this PR existed.
 * Measured: `20260504010000` — a May migration inherited from `development`
 * by every open PR in every scope — was reported as a cross-scope collision
 * on braden#594, conduit#679 and crm7#2384, none of which touch migrations
 * at all. The applier only cares about a version TWO PRs would each try to
 * introduce for the first time; a version both already inherited from the
 * same shared history is not at risk, no matter how many scopes carry it.
 *
 * `baseBranch` is the PR's own declared base (almost always `development`,
 * occasionally `main` for a hotfix) — read from the PR itself via
 * `gh pr list`'s `baseRefName`, never assumed.
 *
 * THROWS if `baseBranch` is missing, rather than folding into the
 * catch-all below and returning `[]`. This file's whole posture is
 * fail-closed (an unreadable scope is not an empty one, see `openPrHeads`);
 * a PR with no resolvable base would otherwise report "adds nothing" and a
 * real added migration on it goes unseen — the FOLLOW (2026-09-04) fix
 * trading a false positive for a false negative rather than a loud failure.
 */
function migrationsAddedByBranch(scope, root, branch, baseBranch, prNumber) {
  if (!baseBranch) {
    throw new Error(`${scope}#${prNumber} (${branch}): no baseRefName from gh pr list — cannot resolve a merge-base, refusing to report an empty added-set`)
  }
  const dir = path.join(root, scope)
  try {
    sh('git', ['fetch', 'origin', branch, baseBranch, '--quiet'], dir)
    const atHead = listMigrationTree(dir, `refs/remotes/origin/${branch}`)
    const mergeBase = sh('git', ['merge-base', `origin/${baseBranch}`, `refs/remotes/origin/${branch}`], dir)
    const atBase = listMigrationTree(dir, mergeBase)
    const out = []
    for (const [file, blob] of atHead) {
      // Present at the merge-base under the SAME PATH means this PR did not
      // introduce it — whether or not the content matches is irrelevant here;
      // a PR that edits a pre-existing migration file in place is a different
      // (and separately gated) risk, not a NEW version claim.
      if (atBase.has(file)) continue
      out.push({ file, blob })
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

  // bsuite J7, 2026-09-03: DIFFERENT blobs (a comment-only edit always gets a
  // different content-addressed blob) but content that normalizes equal via
  // scripts/lib/migration-collision-compare.mjs — reproduces the exact
  // 20261103000000 root-vs-crm7 shape (rationale block ending in the
  // `-- rehearsal: already-enforced` marker). Not a collision when `.content`
  // is supplied for every entry in the group.
  {
    const body = 'CREATE TABLE public.workflow_definitions (id uuid primary key);\n'
    t('different blobs but comment-only-different CONTENT do not collide when content is supplied',
      collisions([
        { scope: 'crm7', pr: 1, version: '20261103000000', file: 'x.sql', blob: 'aaaa', content: `-- canonical header\n${body}` },
        { scope: 'business-suite-unified', pr: 2, version: '20261103000000', file: 'x.sql', blob: 'bbbb', content: `-- DIFFERENT header, rationale only\n${body}` },
      ]).length, 0)
  }

  // ...but a GENUINE content difference beyond comments still collides even
  // with content supplied — the tie-break can only ever narrow false
  // positives, never launder a real divergence.
  t('different blobs AND genuinely different content still collide',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql', blob: 'aaaa', content: 'ALTER TABLE t ADD COLUMN a text;\n' },
      { scope: 'conduit', pr: 2, version: '20260101000000', file: 'y.sql', blob: 'bbbb', content: 'ALTER TABLE t ADD COLUMN b text;\n' },
    ]).length, 1)

  // ...and without content on EVERY entry, the tie-break is skipped entirely
  // (fail-safe: partial content is treated the same as no content).
  t('different blobs with content missing on only ONE entry still collide (tie-break skipped)',
    collisions([
      { scope: 'crm7', pr: 1, version: '20260101000000', file: 'x.sql', blob: 'aaaa', content: 'SELECT 1;\n' },
      { scope: 'conduit', pr: 2, version: '20260101000000', file: 'y.sql', blob: 'bbbb' },
    ]).length, 1)

  // extractFloor — same cases check-migration-collisions-at-branch-tips.mjs's
  // own self-test uses, since this is a deliberate duplicate of that function.
  t('extractFloor reads a quoted YAML value', extractFloor("env:\n  MIGRATION_FLOOR: '20260611000000'\n"), '20260611000000')
  t('extractFloor strips a trailing comment', extractFloor('  MIGRATION_FLOOR: "20260611000000"  # raised 2026-06-10\n'), '20260611000000')
  t('extractFloor returns null when the key is absent', extractFloor('env:\n  SOMETHING_ELSE: 1\n'), null)
  t('extractFloor rejects a non-numeric value', extractFloor('  MIGRATION_FLOOR: latest\n'), null)

  // FAIL CLOSED on a missing baseRefName: this must THROW, naming the PR, not
  // return [] — a silent [] reads as "this PR adds nothing", which is a false
  // negative on exactly the kind of PR this scan cannot properly evaluate.
  {
    let threw = null
    try {
      migrationsAddedByBranch('crm7', '/nonexistent', 'some-branch', undefined, 4242)
    } catch (err) {
      threw = err
    }
    t('a missing baseBranch throws rather than silently returning []', threw !== null, true)
    t('the thrown error names the scope and PR number',
      threw ? threw.message.includes('crm7#4242') : false, true)
  }

  // ---------------------------------------------------------------------
  // migrationsAddedByBranch — THE ACTUAL BUG. A real disposable repo and the
  // real function, not a hand-built entries array: the earlier tests above
  // exercise collisions() on entries that already assume "added-only"
  // semantics, which is exactly what let the whole-tree bug ship unnoticed —
  // nothing tested the DIFF computation itself.
  //
  // SHAPE: a bare repo as `origin`, a working clone with `development` and a
  // `feature` branch, mirroring real CI (each scope dir is a clone with an
  // `origin` remote `migrationsAddedByBranch`'s `git fetch origin` expects).
  //
  //   development: X (shared floor migration, inherited by everything below)
  //        \
  //         feature: Y (a genuinely NEW migration this branch adds)
  //   development: Z (an unrelated later commit, "another open PR")
  // ---------------------------------------------------------------------
  {
    const work = mkdtempSync(path.join(tmpdir(), 'mig-added-test-'))
    const bareOrigin = path.join(work, 'origin.git')
    const root = path.join(work, 'root')
    const scope = 'testscope'
    const clonePath = path.join(root, scope)
    try {
      mkdirSync(root, { recursive: true })
      sh('git', ['init', '-q', '--bare', bareOrigin], work)
      sh('git', ['clone', '-q', bareOrigin, clonePath], work)
      sh('git', ['config', 'user.email', 'test@test.local'], clonePath)
      sh('git', ['config', 'user.name', 'test'], clonePath)
      sh('git', ['checkout', '-q', '-b', 'development'], clonePath)

      mkdirSync(path.join(clonePath, 'supabase', 'migrations'), { recursive: true })
      writeFileSync(path.join(clonePath, 'supabase/migrations/20260504010000_shared_floor.sql'), 'select 1;\n')
      sh('git', ['add', '.'], clonePath)
      sh('git', ['commit', '-q', '-m', 'X: shared floor migration, inherited by everything'], clonePath)
      sh('git', ['push', '-q', 'origin', 'development'], clonePath)

      sh('git', ['checkout', '-q', '-b', 'feature'], clonePath)
      writeFileSync(path.join(clonePath, 'supabase/migrations/20261120000000_new_thing.sql'), 'create table t();\n')
      sh('git', ['add', '.'], clonePath)
      sh('git', ['commit', '-q', '-m', 'Y: a genuinely new migration'], clonePath)
      sh('git', ['push', '-q', 'origin', 'feature'], clonePath)

      sh('git', ['checkout', '-q', 'development'], clonePath)
      writeFileSync(path.join(clonePath, 'README.md'), 'unrelated\n')
      sh('git', ['add', '.'], clonePath)
      sh('git', ['commit', '-q', '-m', 'Z: unrelated later commit on development'], clonePath)
      sh('git', ['push', '-q', 'origin', 'development'], clonePath)

      const added = migrationsAddedByBranch(scope, root, 'feature', 'development')
      t('a feature branch reports ONLY the migration it added, not the shared floor it inherited',
        added.map((e) => e.file).sort(),
        ['supabase/migrations/20261120000000_new_thing.sql'])

      // THE ACTUAL REGRESSION: two branches that each only INHERIT the shared
      // floor migration (neither adds anything new) must report ZERO added
      // migrations each — this is what the whole-tree version got wrong,
      // reporting the shared floor migration as "added" by both and colliding
      // them. `development` itself, diffed against its own tip, obviously adds
      // nothing; the meaningful case is a SECOND feature branch that also only
      // carries the inherited floor migration.
      sh('git', ['checkout', '-q', '-b', 'feature-b', 'development'], clonePath)
      sh('git', ['push', '-q', 'origin', 'feature-b'], clonePath)
      const addedB = migrationsAddedByBranch(scope, root, 'feature-b', 'development')
      t('a branch that only inherits the shared floor migration adds NOTHING — the exact regression', addedB.length, 0)
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  }

  // END-TO-END POSITIVE CONTROL: two DIFFERENT scopes, each genuinely adding a
  // NEW migration at the SAME version with DIFFERENT content — the real risk
  // this whole gate exists for. Runs the FULL pipeline (migrationsAddedByBranch
  // -> versionOf -> collisions()), not the pure collisions() function alone,
  // so a fix that accidentally suppresses genuine collisions while fixing the
  // false-positive bug would be caught here.
  {
    const work = mkdtempSync(path.join(tmpdir(), 'mig-added-cross-scope-'))
    const root = path.join(work, 'root')
    try {
      mkdirSync(root, { recursive: true })
      const entries = []
      for (const [scope, content] of [['crm7', 'create table a();\n'], ['conduit', 'create table b();\n']]) {
        const bareOrigin = path.join(work, `${scope}.git`)
        const clonePath = path.join(root, scope)
        sh('git', ['init', '-q', '--bare', bareOrigin], work)
        sh('git', ['clone', '-q', bareOrigin, clonePath], work)
        sh('git', ['config', 'user.email', 'test@test.local'], clonePath)
        sh('git', ['config', 'user.name', 'test'], clonePath)
        sh('git', ['checkout', '-q', '-b', 'development'], clonePath)
        mkdirSync(path.join(clonePath, 'supabase', 'migrations'), { recursive: true })
        writeFileSync(path.join(clonePath, 'supabase/migrations/20260101000000_base.sql'), 'select 1;\n')
        sh('git', ['add', '.'], clonePath)
        sh('git', ['commit', '-q', '-m', 'base'], clonePath)
        sh('git', ['push', '-q', 'origin', 'development'], clonePath)

        sh('git', ['checkout', '-q', '-b', 'feature'], clonePath)
        writeFileSync(path.join(clonePath, 'supabase/migrations/20261120000000_colliding.sql'), content)
        sh('git', ['add', '.'], clonePath)
        sh('git', ['commit', '-q', '-m', 'colliding migration'], clonePath)
        sh('git', ['push', '-q', 'origin', 'feature'], clonePath)

        for (const { file, blob } of migrationsAddedByBranch(scope, root, 'feature', 'development')) {
          const version = versionOf(file)
          if (version) entries.push({ scope, pr: 1, branch: 'feature', version, file, blob })
        }
      }
      const found = collisions(entries)
      t('two scopes each genuinely ADDING the same new version collide', found.length, 1)
      t('the collision names both scopes',
        found.length === 1 ? [...new Set(found[0].entries.map((e) => e.scope))].sort() : [],
        ['conduit', 'crm7'])
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  }

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-migration-collisions-across-open-prs: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length ? 1 : 0
}

/**
 * Fetch `.content` for entries that belong to a MULTI-SOURCE, blob-differing
 * version group only. Reading every file on every open PR branch would be
 * needless work for the overwhelming majority of runs (zero collisions); this
 * only pays the cost for the rare groups where collisions() actually needs a
 * tie-break. The blob was already pulled into the scope's local object store
 * by migrationsOnBranch()'s own `git fetch`, so `git cat-file -p` reads it
 * without a second network round trip.
 */
function attachContentForDivergentGroups(entries, root) {
  const byVersion = new Map()
  for (const e of entries) {
    if (!byVersion.has(e.version)) byVersion.set(e.version, [])
    byVersion.get(e.version).push(e)
  }
  for (const group of byVersion.values()) {
    const sources = new Set(group.map((g) => `${g.scope}#${g.pr}`))
    if (sources.size <= 1) continue
    const blobs = new Set(group.map((g) => g.blob).filter(Boolean))
    if (blobs.size <= 1 && group.every((g) => g.blob)) continue // already identical, no tie-break needed
    for (const e of group) {
      if (!e.blob) continue
      const dir = path.join(root, e.scope)
      const out = shOrNull('git', ['cat-file', '-p', e.blob], dir)
      if (out !== null) e.content = out
    }
  }
  return entries
}

function shOrNull(cmd, args, cwd) {
  try {
    return sh(cmd, args, cwd)
  } catch {
    return null
  }
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest())
  const root = process.cwd()

  const applierPath = path.join(root, APPLIER_WORKFLOW_RELATIVE_PATH)
  let floor
  try {
    floor = extractFloor(readFileSync(applierPath, 'utf8'))
  } catch {
    floor = null
  }
  if (!floor) {
    console.error(`::error::could not read MIGRATION_FLOOR from ${APPLIER_WORKFLOW_RELATIVE_PATH} — refusing to scan with an unknown floor.`)
    process.exit(2)
  }

  const entries = []
  const unreadable = []
  const allOpenPrs = []
  let prCount = 0
  for (const scope of SCOPES) {
    const prs = openPrHeads(scope, root)
    if (prs === null) { unreadable.push(scope); continue }
    for (const pr of prs) {
      prCount++
      // EVERY open PR, whether or not it touches a migration — the poster
      // needs this full set to know which PRs it must actively CLEAR a stale
      // status from, not just which ones it has a fresh verdict for.
      allOpenPrs.push({ scope, pr: pr.number, sha: pr.headRefOid })
      let added
      try {
        added = migrationsAddedByBranch(scope, root, pr.headRefName, pr.baseRefName, pr.number)
      } catch (err) {
        // FAIL CLOSED, same posture as an unreadable scope above: a PR this
        // scan could not properly evaluate is an ABSENT result, not a clean
        // one — reporting nothing for it would be a false negative, not a
        // false positive, and this scan has already shipped one of those.
        console.error(`::error::${(err && err.message) || err}`)
        unreadable.push(`${scope}#${pr.number}`)
        continue
      }
      for (const { file, blob } of added) {
        const version = versionOf(file)
        if (!version) continue
        // Sub-floor versions were applied long before either PR existed — the
        // same rule check-migration-collisions-at-branch-tips.mjs's classify()
        // uses, applied here to a PR's OWN added set rather than its full tree.
        if (version < floor) continue
        entries.push({ scope, pr: pr.number, branch: pr.headRefName, sha: pr.headRefOid, version, file, blob })
      }
    }
  }

  // An UNREADABLE scope is not an empty one. Say so and fail, rather than report a
  // clean scan over a set that was never whole.
  if (unreadable.length) {
    console.error(`::error::could not list open PRs for: ${unreadable.join(', ')} — that is an ABSENT result, not a clean one.`)
    process.exit(2)
  }

  // In --json mode stdout carries ONLY the JSON document; the human summary goes to
  // stderr so a consumer can parse stdout without stripping a preamble first.
  const say = process.argv.includes('--json') ? console.error : console.log
  say(`check-migration-collisions-across-open-prs: ${SCOPES.length} scope(s), ${prCount} open PR(s), ${entries.length} migration file(s) on their branches`)

  attachContentForDivergentGroups(entries, root)
  const found = collisions(entries)

  // --json makes the result ACTIONABLE by something other than a human reading a log.
  // This gate has been correct and unheeded: on 2026-09-03 at 12:32Z it named crm7#2377
  // and business-suite-unified#1121 as both claiming 20261119000000, and #2377 merged at
  // 12:53Z regardless — because a scheduled run's failure appears on no PR, blocks no
  // merge, and notifies nobody. The workflow consumes this to post a commit status onto
  // each PR head, in its OWN repo, where the merge button is.
  if (process.argv.includes('--json')) {
    const colliding = new Set()
    for (const c of found) for (const e of c.entries) colliding.add(`${e.scope}#${e.pr}`)
    const seen = new Map()
    for (const e of entries) {
      const key = `${e.scope}#${e.pr}`
      if (!seen.has(key)) {
        seen.set(key, { scope: e.scope, pr: e.pr, sha: e.sha, colliding: colliding.has(key), versions: [] })
      }
      seen.get(key).versions.push(e.version)
    }
    process.stdout.write(
      JSON.stringify({
        prs: [...seen.values()],
        // Every open PR the scan actually saw, migration or not — see FOLLOW
        // (2026-09-04) on migrationsAddedByBranch's own header for why `prs`
        // above no longer includes a PR that adds nothing: the poster diffs
        // this list against `prs` to find PRs that need a STALE status
        // cleared (one this scan's earlier, whole-tree bug wrongly failed),
        // not just ones it has a fresh verdict for.
        allOpenPrs,
        collisions: found.map((c) => ({
          version: c.version,
          claimants: c.entries.map((e) => ({ scope: e.scope, pr: e.pr, file: e.file })),
        })),
      }) + '\n',
    )
    process.exit(found.length ? 1 : 0)
  }

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
    say('  no version is claimed by more than one open PR')
  }
  process.exit(found.length ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
