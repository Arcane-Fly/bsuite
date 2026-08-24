#!/usr/bin/env node
/**
 * check-gitlink-migration-lag — a migration that exists in a submodule but not at
 * the gitlink the applier reads CAN NEVER APPLY, and nothing says so.
 *
 * THE FAILURE THIS EXISTS FOR, MEASURED 2026-08-24
 * ───────────────────────────────────────────────────────────────────────────
 * `R80.4/supabase/migrations/20260901010000_wic_rate_lookup_tenant_id_fk_index.sql`
 * was on R80.4's own branches. The parent's R80.4 gitlink was stale at 3f8b7d97,
 * which predates it. `actions/checkout` resolves submodules AT THE RECORDED
 * POINTER, so the applier checked out a tree the file was not in, and reported:
 *
 *     Apply migrations (R80.4)   Done: 0 applied, 4 already recorded.
 *
 * A green job. Zero applied. `idx_wic_rate_lookup_tenant_id` absent from
 * production for days while every gate in the estate was passing.
 *
 * THE JOB COULD NOT HAVE DONE BETTER. You cannot skip a file you cannot see, and
 * "0 applied" is the honest answer for the tree it was handed. The defect is one
 * level up — nothing compared the tree it was handed against the tree that exists.
 * That is what this checks.
 *
 * WHAT IT ASSERTS
 * ───────────────────────────────────────────────────────────────────────────
 * For every submodule in .gitmodules: the set of migration files at the RECORDED
 * GITLINK must not be missing any migration that exists at that submodule's own
 * default branch. A gitlink may be behind on code — that is ordinary and this
 * gate says nothing about it. It may not be behind on MIGRATIONS, because a
 * migration the applier cannot see is one that silently never runs.
 *
 * BELOW-FLOOR MIGRATIONS ARE EXEMPT. Versions under MIGRATION_FLOOR are never
 * applied by this pipeline by design — they belong to the history-reconciliation
 * lane — so a gitlink lagging on those changes nothing.
 *
 * IT REFUSES RATHER THAN GUESSES when a submodule is not an initialised git
 * repository. An uninitialised submodule is an EMPTY DIRECTORY, and an empty
 * directory yields an empty migration set, which reads as "nothing missing" —
 * a clean pass over a scope it never looked at. That is the exact shape the
 * estate keeps finding, so it exits 2.
 *
 * USAGE
 *   node scripts/check-gitlink-migration-lag.mjs
 *   node scripts/check-gitlink-migration-lag.mjs --self-test
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function git(args, cwd = ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
}

/** MIGRATION_FLOOR is owned by the applier; read it there rather than restating it. */
export function readFloor(workflowText) {
  const m = /MIGRATION_FLOOR:\s*'(\d+)'/.exec(workflowText)
  return m ? m[1] : null
}

/** `20260901010000_name.sql` -> `20260901010000`. Anything else -> null. */
export function versionOf(filename) {
  const m = /^(\d{14})_/.exec(filename)
  return m ? m[1] : null
}

/**
 * Pure, so --self-test exercises the real decision.
 * Returns the versions present at `branchSet` and absent from `gitlinkSet`,
 * restricted to at-or-above the floor.
 */
export function lagging({ gitlinkSet, branchSet, floor }) {
  const have = new Set(gitlinkSet)
  return [...branchSet]
    .filter((v) => !have.has(v))
    .filter((v) => v >= floor)
    .sort()
}

function migrationVersionsAt(repoPath, rev) {
  let out
  try {
    out = git(['ls-tree', '--name-only', rev, 'supabase/migrations/'], repoPath)
  } catch {
    return null // the rev is not readable in this repo
  }
  return out
    .split('\n')
    .map((p) => p.split('/').pop() || '')
    .map(versionOf)
    .filter(Boolean)
}

function selfTest() {
  const cases = []
  const check = (label, a, e) =>
    cases.push([label, JSON.stringify(a) === JSON.stringify(e), JSON.stringify(a), JSON.stringify(e)])

  const FLOOR = '20260611000000'
  check('a migration on the branch but not at the gitlink is LAGGING',
    lagging({ gitlinkSet: ['20260701000000'], branchSet: ['20260701000000', '20260901010000'], floor: FLOOR }),
    ['20260901010000'])
  check('a gitlink that has everything is clean',
    lagging({ gitlinkSet: ['20260701000000', '20260901010000'], branchSet: ['20260701000000'], floor: FLOOR }), [])
  check('a gitlink AHEAD of the branch is not a lag',
    lagging({ gitlinkSet: ['20260701000000', '20260901010000'], branchSet: ['20260701000000'], floor: FLOOR }), [])
  check('a BELOW-FLOOR migration missing at the gitlink is exempt',
    lagging({ gitlinkSet: [], branchSet: ['20260101000000'], floor: FLOOR }), [])
  check('the floor boundary is inclusive — exactly-at-floor counts',
    lagging({ gitlinkSet: [], branchSet: [FLOOR], floor: FLOOR }), [FLOOR])
  check('multiple lagging versions are all reported, sorted',
    lagging({ gitlinkSet: [], branchSet: ['20260902000000', '20260901010000'], floor: FLOOR }),
    ['20260901010000', '20260902000000'])
  check('an empty branch set cannot produce a lag', lagging({ gitlinkSet: [], branchSet: [], floor: FLOOR }), [])

  check('versionOf accepts a 14-digit prefix', versionOf('20260901010000_x.sql'), '20260901010000')
  check('versionOf rejects a short prefix', versionOf('20250601_x.sql'), null)
  check('versionOf rejects a non-versioned helper', versionOf('run_all_migrations.sql'), null)
  check('readFloor reads the applier value', readFloor("  MIGRATION_FLOOR: '20260611000000'\n"), '20260611000000')
  check('readFloor returns null when absent', readFloor('nothing here'), null)

  // POSITIVE CONTROL AGAINST THE REAL WORKFLOW, not only fixtures: the floor this
  // gate exempts by must be the one the applier actually uses.
  const wf = join(ROOT, '.github/workflows/supabase-migrate.yml')
  check('the real applier still declares a floor this gate can read',
    existsSync(wf) && readFloor(readFileSync(wf, 'utf8')) !== null, true)

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  if (failed.length) {
    console.error(`\ncheck-gitlink-migration-lag --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `check-gitlink-migration-lag --self-test: ${cases.length} assertions — lag detected, ` +
      `gitlink-ahead not mistaken for lag, below-floor exempted, floor boundary inclusive, ` +
      `version parsing, and a positive control that the real applier's floor is still readable.`,
  )
  return 0
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest()

  const wfPath = join(ROOT, '.github/workflows/supabase-migrate.yml')
  if (!existsSync(wfPath)) {
    console.error('::error::.github/workflows/supabase-migrate.yml not found — cannot read MIGRATION_FLOOR. Refusing to guess.')
    return 2
  }
  const floor = readFloor(readFileSync(wfPath, 'utf8'))
  if (!floor) {
    console.error('::error::MIGRATION_FLOOR not found in supabase-migrate.yml — refusing to run without the applier\'s own floor.')
    return 2
  }

  // Scopes from .gitmodules, never hardcoded.
  const submodules = git(['config', '-f', '.gitmodules', '--get-regexp', '^submodule\\..*\\.path$'])
    .split('\n')
    .map((l) => l.split(' ')[1])
    .filter(Boolean)

  if (submodules.length === 0) {
    console.error('::error::.gitmodules declares no submodules — that is a broken read, not a clean tree.')
    return 2
  }

  const problems = []
  const blind = []
  let scanned = 0

  for (const name of submodules) {
    const path = join(ROOT, name)
    // An uninitialised submodule is an EMPTY DIRECTORY and yields an empty
    // migration set — which reads as "nothing missing". Refuse instead.
    if (!existsSync(join(path, '.git'))) {
      blind.push(name)
      continue
    }
    const gitlink = git(['ls-tree', 'HEAD', name]).split(/\s+/)[2]
    if (!gitlink) {
      blind.push(`${name} (no gitlink in HEAD)`)
      continue
    }

    // Compare against the submodule's own default branch — the tree that exists.
    let branchRef = 'origin/main'
    try {
      git(['rev-parse', '--verify', branchRef], path)
    } catch {
      branchRef = 'origin/development'
      try {
        git(['rev-parse', '--verify', branchRef], path)
      } catch {
        blind.push(`${name} (neither origin/main nor origin/development is fetched)`)
        continue
      }
    }

    const atGitlink = migrationVersionsAt(path, gitlink)
    const atBranch = migrationVersionsAt(path, branchRef)
    if (atGitlink === null || atBranch === null) {
      blind.push(`${name} (a rev could not be read)`)
      continue
    }
    scanned++

    for (const v of lagging({ gitlinkSet: atGitlink, branchSet: atBranch, floor })) {
      problems.push(
        `${name}: migration ${v} exists at ${branchRef} but NOT at the recorded gitlink ` +
          `${gitlink.slice(0, 8)}. The applier checks out submodules at the gitlink, so this ` +
          `migration cannot apply and the job will report "0 applied" and pass.`,
      )
    }
  }

  if (blind.length) {
    console.error(`::error::could not read ${blind.length} scope(s): ${blind.join(', ')}`)
    console.error('::error::An unreadable scope yields an empty migration set, which reads as "nothing missing".')
    console.error('::error::UNVERIFIED, not clean. Check the checkout passed a cross-repo token.')
    return 2
  }

  const summary =
    `check-gitlink-migration-lag: ${scanned} submodule(s) compared against their own default ` +
    `branch, floor ${floor}; ${problems.length} migration(s) unreachable at the recorded gitlink.`

  if (problems.length) {
    console.error('MIGRATIONS THAT CAN NEVER APPLY:')
    for (const p of problems) console.error(`  ✗ ${p}`)
    console.error('')
    console.error('Advance the parent gitlink onto a commit that contains them, then dispatch the applier.')
    console.error('Set the pointer with `git update-index --cacheinfo`, never a pathspec commit.')
    console.error('')
    console.error(summary)
    return 1
  }

  console.log(summary)
  return 0
}

process.exit(main())
