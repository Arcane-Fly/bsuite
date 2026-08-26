#!/usr/bin/env node
/**
 * check-migration-version-collisions.mjs
 *
 * bsuite#1707: all six submodules (crm7, conduit, R80.4,
 * business-suite-unified, braden, throughput) — plus the parent repo's own
 * `supabase/migrations/` — deploy to the SAME shared Supabase project, so
 * `supabase_migrations.schema_migrations` is ONE table keyed on the version
 * string ALONE (the leading 14 digits of the migration filename).
 *
 * .github/workflows/supabase-migrate.yml applies each scope independently
 * and skips any file whose version already appears in the GLOBAL applied-
 * versions list:
 *
 *   if echo "$APPLIED" | grep -qxF "$VERSION"; then
 *     SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
 *     continue
 *   fi
 *
 * When two scopes carry a migration file with the same 14-digit version,
 * whichever scope the applier reaches SECOND is silently skipped — its DDL
 * never runs, but the version reads as applied. Which one wins depends on
 * matrix job scheduling order, which is not a stable contract.
 *
 * SAME-SCOPE duplicates are the higher-risk shape and are NOT a theoretical
 * corner case: crm7's own 20260512230000 has two different files
 * (people_add_middle_name_and_school_completion.sql and
 * tenant_locations_and_state_ir_config.sql) sharing a version, and it is
 * CONFIRMED (live-catalog check, bsuite#1707 follow-up) that the people
 * file's three columns never made it to production — its DDL was silently
 * skipped, deterministically, not depending on cross-repo scheduling order,
 * because within a single scope's own migration loop the first file at a
 * version is applied-and-recorded and the second is skipped by the same
 * `$APPLIED` check before the run even reaches another scope. Repair:
 * 20260730310000_repair_people_school_completion_columns.sql.
 *
 * This script finds every version that appears in more than one file across
 * all scopes (including two files colliding within the SAME scope) and
 * fails unless the version is on the committed allowlist
 * (scripts/migration-collision-allowlist.txt). The reported message always
 * distinguishes the two shapes:
 *   - same-scope duplicate  (one file in this exact scope is DEFINITELY
 *     skipped, regardless of any other scope or job ordering)
 *   - cross-scope duplicate (one file is skipped depending on which scope
 *     the applier's matrix job processes second)
 *
 * Implementation note: version extraction is a small anchored check
 * (`^\d{14}_`), not a general-purpose regex parser, per the repo's
 * No-Regex-by-Default discipline (CLAUDE.md > Code Quality).
 *
 * Usage:
 *   node scripts/check-migration-version-collisions.mjs [--root=<path>]
 *   node scripts/check-migration-version-collisions.mjs --self-test
 *
 * Exit 0 clean, 1 violations, 2 usage error.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

/**
 * Every migration scope that writes into the shared schema_migrations table.
 * Matches the 8-entry matrix in .github/workflows/supabase-migrate.yml
 * exactly ("root", the 6 submodules, and "schema-builder") — a collision in
 * ANY of these scopes is applied against the same shared Supabase project,
 * so all 8 must be scanned, not just the 6 submodules.
 */
const SCOPES = [
  { name: 'root', dir: 'supabase/migrations' },
  { name: 'crm7', dir: 'crm7/supabase/migrations' },
  { name: 'conduit', dir: 'conduit/supabase/migrations' },
  // R80.4 was `optional: true` because it had no `supabase/` directory at all —
  // a Vite charge-calculator app whose data lived in `awards/` and whose only
  // backend was `api/`. A presence guard counting scopes could never be
  // satisfied while it was listed, and CI ran this checker with
  // `--require-scopes=8` failing every time with "expected migrations in at
  // least 8 scope(s) but found 7" — RED BY CONSTRUCTION from the day it was
  // written (run 31091770857, 2026-08-06).
  //
  // 2026-08-14: R80.4 now HAS migrations, and the checker said so itself —
  // it emits a ::notice:: when an optional scope stops being empty, precisely
  // so this flag cannot rot unnoticed. Dropping `optional` now makes its
  // absence a failure again, which is the correct state for a scope that
  // really does contribute migrations to the shared project.
  { name: 'R80.4', dir: 'R80.4/supabase/migrations' },
  { name: 'business-suite-unified', dir: 'business-suite-unified/supabase/migrations' },
  { name: 'braden', dir: 'braden/supabase/migrations' },
  { name: 'throughput', dir: 'throughput/supabase/migrations' },
  { name: 'schema-builder', dir: 'packages/schema-builder/supabase/migrations' },
]

const ALLOWLIST_RELATIVE_PATH = 'scripts/migration-collision-allowlist.txt'

/** Leading 14-digit version from a filename, or null if it doesn't start with one. */
function versionOf(filename) {
  const base = path.basename(filename)
  const digits = []
  let i = 0
  while (i < base.length && digits.length < 14) {
    const ch = base[i]
    if (ch < '0' || ch > '9') break
    digits.push(ch)
    i++
  }
  if (digits.length !== 14) return null
  // Must be followed by an underscore boundary (the repo's own convention),
  // otherwise a 15+-digit numeric prefix would be silently truncated.
  if (base[i] !== '_') return null
  return digits.join('')
}

/** List every *.sql file across the given scopes, resolved under `root`. */
function scanScopes(scopes, root) {
  const files = []
  for (const scope of scopes) {
    const dirPath = path.join(root, scope.dir)
    if (!fs.existsSync(dirPath)) continue
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.sql')) continue
      files.push({ scope: scope.name, file: path.join(dirPath, entry.name) })
    }
  }
  return files
}

/** Group files by version; only versions with 2+ files are collisions. */
function findCollisions(files) {
  const groups = new Map()
  for (const f of files) {
    const v = versionOf(f.file)
    if (!v) continue
    if (!groups.has(v)) groups.set(v, [])
    groups.get(v).push(f)
  }
  const collisions = []
  for (const [version, entries] of groups) {
    if (entries.length > 1) collisions.push({ version, entries })
  }
  collisions.sort((a, b) => a.version.localeCompare(b.version))
  return collisions
}

/**
 * Parse `VERSION<ws>n=<count><ws>reason` lines; blanks and `#` comments ignored.
 *
 * THE `n=` PIN, AND WHY IT IS REQUIRED
 *
 * The allowlist is keyed on the VERSION alone, which means an entry written to
 * waive one known-benign pair silently waived every future file at that version
 * too. Proven by mutation, 2026-08-12: 20260701090000 is allowlisted for a
 * crm7/business-suite-unified pair, and planting a THIRD file at that version in
 * conduit — a brand-new, unrelated, genuinely-losing migration — still exited 0.
 * A new colliding migration could therefore merge unnoticed simply by landing on
 * a timestamp somebody had already excused, which is the exact bsuite#1913 shape
 * the gate exists to stop.
 *
 * `n=<count>` records how many colliding files the entry was VERIFIED against.
 * If the group later grows, the entry no longer describes it and the check
 * fails until a human re-verifies and updates the count.
 *
 * KNOWN RESIDUAL GAP, stated rather than hidden: a same-count REPLACEMENT (one
 * colliding file deleted and a different one added at the same version, in the
 * same scope) keeps the count intact and is not caught. Pinning exact filenames
 * would close it; that was judged not worth the line-length cost here because
 * the dominant real-world shape — and the one that has actually cost this estate
 * a security control — is a NEW migration landing on an existing version.
 */
function parseAllowlist(text) {
  const allowed = new Map()
  const lines = text.split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    let i = 0
    while (i < line.length && line[i] >= '0' && line[i] <= '9') i++
    const version = line.slice(0, i)
    let rest = line.slice(i).trim()
    if (version.length !== 14 || !rest) continue

    let expectedFiles = null
    if (rest.startsWith('n=')) {
      let j = 2
      while (j < rest.length && rest[j] >= '0' && rest[j] <= '9') j++
      const digits = rest.slice(2, j)
      const atBoundary = j === rest.length || rest[j] === ' ' || rest[j] === '\t'
      if (digits.length && atBoundary) {
        expectedFiles = Number(digits)
        rest = rest.slice(j).trim()
      }
    }
    if (!rest) continue
    allowed.set(version, { reason: rest, expectedFiles })
  }
  return allowed
}

/**
 * Names of every non-optional scope that yielded no migration files.
 *
 * Pure so the self-test can exercise it directly — the guard it backs was
 * previously an inline `if` in the CLI section, which is exactly why nobody
 * noticed it could never be satisfied.
 */
function missingRequiredScopes(scopes, scopesFound) {
  return scopes.filter((s) => !s.optional && !scopesFound.has(s.name)).map((s) => s.name)
}

/** True when every colliding file for this version sits in the SAME scope. */
function isSameScopeCollision(entries) {
  const scopes = new Set(entries.map((e) => e.scope))
  return scopes.size === 1
}

function describeCollision({ version, entries, unpinned, pinMismatch }) {
  const files = entries.map((e) => `${e.scope}:${e.file}`).join(' and ')
  if (pinMismatch) {
    // SAY WHICH DIRECTION. The count can move both ways and the two mean
    // opposite things, but this message used to assert "a new migration has
    // landed" for both — so a group that SHRANK sent the reader hunting a new
    // file that did not exist. Measured 2026-08-26: crm7 moved 656 historical
    // migrations into supabase/migrations/archive/ for the Supabase Branching
    // baseline, two allowlisted groups went three-way to two-way, and the
    // message named the wrong cause for both.
    const grew = pinMismatch.actual > pinMismatch.expected
    const cause = grew
      ? `a new migration has LANDED on an already-excused version`
      : `a file has LEFT the group — moved, archived or renamed. Nothing new landed. ` +
        `Check for an archive/ or baseline/ restructure before assuming a deletion, ` +
        `and confirm the tree's total file count did not drop`
    return (
      `${version} is ALLOWLISTED for ${pinMismatch.expected} colliding file(s) but now has ` +
      `${pinMismatch.actual}. The entry was verified against a different set, so it does not ` +
      `excuse what is there now — ${cause}. ` +
      `Re-verify the group, then update the \`n=\` count on this entry in ` +
      `${ALLOWLIST_RELATIVE_PATH}: ${files}`
    )
  }
  if (unpinned) {
    return (
      `${version} has an allowlist entry with no \`n=<count>\` pin. Every entry must record how ` +
      `many colliding files it was verified against, otherwise it silently waives files nobody ` +
      `has looked at. Add \`n=${entries.length}\` after the version in ` +
      `${ALLOWLIST_RELATIVE_PATH}: ${files}`
    )
  }
  if (isSameScopeCollision(entries)) {
    const [{ scope }] = entries
    return (
      `${version} is a SAME-SCOPE duplicate within "${scope}" (higher risk: one of these ` +
      `files is DEFINITELY skipped by this scope's own migration loop, independent of any ` +
      `other scope or job ordering): ${files}`
    )
  }
  return (
    `${version} is a CROSS-SCOPE duplicate across more than one scope (which file is ` +
    `skipped depends on matrix job processing order, not a stable contract): ${files}`
  )
}

function runCheck({ files, allowlistText }) {
  const collisions = findCollisions(files)
  const allowlist = parseAllowlist(allowlistText)
  const violations = []
  const allowlisted = []
  for (const c of collisions) {
    const entry = allowlist.get(c.version)
    if (!entry) {
      violations.push(c)
      continue
    }
    if (entry.expectedFiles === null) {
      violations.push({ ...c, unpinned: true })
      continue
    }
    if (c.entries.length !== entry.expectedFiles) {
      violations.push({ ...c, pinMismatch: { expected: entry.expectedFiles, actual: c.entries.length } })
      continue
    }
    allowlisted.push(c)
  }
  return { collisions, violations, allowlisted, allowlist }
}

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------

function withTempScopes(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migcollision-selftest-'))
  try {
    return fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function writeScopeFile(root, scopeDir, filename, content = '-- test\n') {
  const dir = path.join(root, scopeDir)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), content)
}

function selfTest() {
  const cases = []

  // 1. No collisions: distinct versions across distinct scopes.
  cases.push([
    'no collisions',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260101000000_a.sql')
        writeScopeFile(root, 'conduit/supabase/migrations', '20260102000000_b.sql')
        const files = scanScopes(SCOPES, root)
        const { violations } = runCheck({ files, allowlistText: '' })
        return violations.length === 0
      }),
  ])

  // 2. A new collision across two scopes, no allowlist entry: must fail.
  cases.push([
    'new cross-scope collision fails',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260201000000_a.sql')
        writeScopeFile(root, 'conduit/supabase/migrations', '20260201000000_b.sql')
        const files = scanScopes(SCOPES, root)
        const { violations } = runCheck({ files, allowlistText: '' })
        return (
          violations.length === 1 &&
          violations[0].version === '20260201000000' &&
          violations[0].entries.length === 2
        )
      }),
  ])

  // 3. Same collision, but allowlisted: must pass.
  cases.push([
    'allowlisted cross-scope collision passes',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260201000000_a.sql')
        writeScopeFile(root, 'conduit/supabase/migrations', '20260201000000_b.sql')
        const files = scanScopes(SCOPES, root)
        const { violations, allowlisted } = runCheck({
          files,
          allowlistText:
            '20260201000000  n=2  coincidental timestamp, distinct migrations (test fixture)\n',
        })
        return violations.length === 0 && allowlisted.length === 1
      }),
  ])

  // 4. A version appearing twice WITHIN one scope. This is not "impossible
  // via filenames" in practice — the live tree has real examples (crm7's
  // 20260512230000 pair, root's 20260512161000 pair) — but it must still be
  // handled without crashing, and still reported as a collision since it
  // hits the identical `$APPLIED` skip logic in the CI applier.
  cases.push([
    'same-scope duplicate version handled gracefully',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260301000000_first.sql')
        writeScopeFile(root, 'crm7/supabase/migrations', '20260301000000_second.sql')
        const files = scanScopes(SCOPES, root)
        const { violations } = runCheck({ files, allowlistText: '' })
        return (
          violations.length === 1 &&
          violations[0].entries.length === 2 &&
          violations[0].entries.every((e) => e.scope === 'crm7')
        )
      }),
  ])

  // 5. A filename that does not start with 14 digits: skipped gracefully,
  // never crashes, never counted as a version, never falsely collides.
  cases.push([
    'non-numeric-prefixed filename skipped gracefully',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', 'README.sql')
        writeScopeFile(root, 'crm7/supabase/migrations', 'not-a-timestamp_x.sql')
        writeScopeFile(root, 'conduit/supabase/migrations', '20260401000000_ok.sql')
        const files = scanScopes(SCOPES, root)
        const { violations, collisions } = runCheck({ files, allowlistText: '' })
        return violations.length === 0 && collisions.length === 0
      }),
  ])

  // Extra: the reported message for a SAME-SCOPE collision must say so, and
  // must NOT read as a generic cross-scope collision.
  cases.push([
    'same-scope collision message says "SAME-SCOPE"',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260302000000_first.sql')
        writeScopeFile(root, 'crm7/supabase/migrations', '20260302000000_second.sql')
        const files = scanScopes(SCOPES, root)
        const { violations } = runCheck({ files, allowlistText: '' })
        if (violations.length !== 1) return false
        const msg = describeCollision(violations[0])
        return msg.includes('SAME-SCOPE') && msg.includes('crm7') && !msg.includes('CROSS-SCOPE')
      }),
  ])

  // Extra: the reported message for a CROSS-SCOPE collision must say so, and
  // must NOT read as a same-scope collision.
  cases.push([
    'cross-scope collision message says "CROSS-SCOPE"',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260202000000_a.sql')
        writeScopeFile(root, 'conduit/supabase/migrations', '20260202000000_b.sql')
        const files = scanScopes(SCOPES, root)
        const { violations } = runCheck({ files, allowlistText: '' })
        if (violations.length !== 1) return false
        const msg = describeCollision(violations[0])
        return msg.includes('CROSS-SCOPE') && !msg.includes('SAME-SCOPE')
      }),
  ])

  // Extra: a 15+-digit numeric prefix must not be silently truncated to a
  // false 14-digit version.
  cases.push([
    '15-digit numeric prefix is not treated as a 14-digit version',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '202601010000001_extra_digit.sql')
        const files = scanScopes(SCOPES, root)
        if (files.length !== 1) return false
        return versionOf(files[0].file) === null
      }),
  ])

  // Extra: allowlist parsing ignores blanks/comments and trims the reason.
  cases.push([
    'allowlist parser ignores comments and blank lines',
    () => {
      const text = [
        '# comment line',
        '',
        '20260101000000  n=2  reason one',
        '  # indented comment',
        '20260102000000   n=3   reason two with   spaces',
      ].join('\n')
      const allowed = parseAllowlist(text)
      return (
        allowed.size === 2 &&
        allowed.get('20260101000000').reason === 'reason one' &&
        allowed.get('20260101000000').expectedFiles === 2 &&
        allowed.get('20260102000000').reason === 'reason two with   spaces' &&
        allowed.get('20260102000000').expectedFiles === 3
      )
    },
  ])

  // ---- the `n=` pin -------------------------------------------------------
  //
  // REGRESSION TEST FOR THE MUTATION-FOUND DEFECT. Before the pin, an entry
  // written for a two-file collision waived a third file added later at the
  // same version. Reproduced against the live tree on 2026-08-12 and now
  // locked down here.
  cases.push([
    'a THIRD file at an allowlisted version is NOT waived by the existing entry',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260601000000_a.sql')
        writeScopeFile(root, 'business-suite-unified/supabase/migrations', '20260601000000_b.sql')
        const clean = runCheck({
          files: scanScopes(SCOPES, root),
          allowlistText: '20260601000000  n=2  verified pair\n',
        })
        if (clean.violations.length !== 0) return false
        // A new, unrelated migration lands on the same excused version.
        writeScopeFile(root, 'conduit/supabase/migrations', '20260601000000_c.sql')
        const grown = runCheck({
          files: scanScopes(SCOPES, root),
          allowlistText: '20260601000000  n=2  verified pair\n',
        })
        return (
          grown.violations.length === 1 &&
          grown.violations[0].pinMismatch?.expected === 2 &&
          grown.violations[0].pinMismatch?.actual === 3 &&
          describeCollision(grown.violations[0]).includes('ALLOWLISTED for 2')
        )
      }),
  ])

  cases.push([
    'an allowlist entry with no n= pin is rejected',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'crm7/supabase/migrations', '20260602000000_a.sql')
        writeScopeFile(root, 'conduit/supabase/migrations', '20260602000000_b.sql')
        const { violations } = runCheck({
          files: scanScopes(SCOPES, root),
          allowlistText: '20260602000000  no count given here\n',
        })
        return (
          violations.length === 1 &&
          violations[0].unpinned === true &&
          describeCollision(violations[0]).includes('n=<count>')
        )
      }),
  ])

  cases.push([
    'the SHIPPED allowlist has an n= pin on every active entry',
    () => {
      const text = fs.readFileSync(
        path.join(path.dirname(process.argv[1]), '..', ALLOWLIST_RELATIVE_PATH),
        'utf8',
      )
      const active = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
      if (active.length === 0) return false
      return active.every((l) => {
        const afterVersion = l.slice(14).trim()
        return afterVersion.startsWith('n=')
      })
    },
  ])

  // ---- presence guard -----------------------------------------------------
  //
  // THE REGRESSION TEST FOR THE DEFECT THIS SECTION EXISTS FOR. The shipped
  // SCOPES list must be satisfiable by a tree where every submodule is present:
  // R80.4 has no supabase/ directory anywhere in its repo, so a guard that
  // demanded migrations from all 8 declared scopes could never pass, and the
  // gate failed every run from the day it was authored. If a future edit drops
  // `optional: true` from a scope that genuinely has no migrations, this case
  // fails immediately rather than after the next promotion goes red.
  cases.push([
    'shipped SCOPES list is satisfiable — every non-optional scope can be present',
    () => {
      // Simulate the ideal tree: every scope that is not marked optional has
      // migrations. missingRequiredScopes must then be empty.
      const found = new Set(SCOPES.filter((s) => !s.optional).map((s) => s.name))
      return missingRequiredScopes(SCOPES, found).length === 0
    },
  ])

  cases.push([
    'R80.4 is REQUIRED — it gained migrations on 2026-08-14',
    () => {
      const r80 = SCOPES.find((s) => s.name === 'R80.4')
      return Boolean(r80 && !r80.optional)
    },
  ])

  cases.push([
    'a missing REQUIRED scope is named, not counted',
    () => {
      const found = new Set(SCOPES.filter((s) => !s.optional && s.name !== 'crm7').map((s) => s.name))
      const missing = missingRequiredScopes(SCOPES, found)
      return missing.length === 1 && missing[0] === 'crm7'
    },
  ])

  cases.push([
    'an absent OPTIONAL scope does not trip the guard',
    () => {
      // Synthetic scope list, NOT the shipped SCOPES.
      //
      // This case previously asserted against the live config on the
      // assumption that R80.4 would always be the optional one. When R80.4
      // legitimately gained migrations and stopped being optional, this test
      // failed — reporting a defect in the CONFIG as a defect in the CHECKER.
      // A self-test must verify BEHAVIOUR; coupling it to whichever scope
      // happens to be optional today makes a correct config change look like
      // a regression.
      const synthetic = [
        { name: 'req-a', dir: 'a' },
        { name: 'req-b', dir: 'b' },
        { name: 'opt-c', dir: 'c', optional: true },
      ]
      const found = new Set(['req-a', 'req-b'])
      return (
        !found.has('opt-c') && missingRequiredScopes(synthetic, found).length === 0
      )
    },
  ])

  // A count-based guard cannot distinguish "the right 7 scopes" from "the wrong
  // 7 scopes". This is the failure mode --require-all-scopes replaces: the old
  // `scopesFound.size < 8` test passes for ANY seven names, including a tree
  // where crm7 — 584 of the 801 migration files — failed to clone.
  cases.push([
    'named guard catches a wrong-scope set that a bare count would pass',
    () => {
      // Synthetic, for the same reason as the case above: this previously
      // swapped crm7 for R80.4 to build a same-cardinality wrong set, which
      // only worked while R80.4 was optional. Now that R80.4 is required it is
      // already in the set, the cardinality no longer matches, and the case
      // failed for a reason unrelated to what it is testing.
      const synthetic = [
        { name: 'req-a', dir: 'a' },
        { name: 'req-b', dir: 'b' },
        { name: 'req-c', dir: 'c' },
        { name: 'opt-d', dir: 'd', optional: true },
      ]
      const required = synthetic.filter((s) => !s.optional).map((s) => s.name)
      // Same CARDINALITY as a healthy tree, but req-a swapped for opt-d.
      const wrong = new Set(required.filter((n) => n !== 'req-a').concat(['opt-d']))
      const countWouldPass = wrong.size >= required.length
      const named = missingRequiredScopes(synthetic, wrong)
      return countWouldPass && named.length === 1 && named[0] === 'req-a'
    },
  ])

  let fail = 0
  cases.forEach(([name, run], n) => {
    let ok = false
    let err = null
    try {
      ok = run()
    } catch (e) {
      err = e
    }
    if (!ok) {
      fail++
      console.error(`self-test ${n} (${name}) FAILED${err ? `: ${err.stack || err}` : ''}`)
    }
  })
  if (fail) {
    console.error(`check-migration-version-collisions: ${fail}/${cases.length} self-test failure(s)`)
    process.exit(1)
  }
  console.log(`check-migration-version-collisions: self-test OK (${cases.length} cases)`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usageError(msg) {
  console.error(`check-migration-version-collisions: ${msg}`)
  console.error(
    'Usage: node scripts/check-migration-version-collisions.mjs ' +
      '[--root=<path>] [--require-all-scopes] [--require-scopes=<n>] | --self-test',
  )
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) selfTest()

let rootArg = '.'
let requireScopes = 0
let requireAllScopes = false
for (const a of args) {
  if (a.startsWith('--root=')) {
    rootArg = a.slice('--root='.length)
  } else if (a === '--require-all-scopes') {
    requireAllScopes = true
  } else if (a.startsWith('--require-scopes=')) {
    requireScopes = Number(a.slice('--require-scopes='.length))
    if (!Number.isInteger(requireScopes) || requireScopes < 0) {
      usageError(`--require-scopes must be a non-negative integer, got "${a}"`)
    }
  } else if (a.startsWith('-')) {
    usageError(`unknown flag "${a}"`)
  } else {
    usageError(`unexpected positional argument "${a}"`)
  }
}

const root = path.resolve(rootArg)
if (!fs.existsSync(root)) usageError(`--root path does not exist: ${root}`)

const files = scanScopes(SCOPES, root)

// A gate that reports OK when it scanned nothing is not a gate.
//
// In CI this runs after `actions/checkout` with `submodules: recursive`. If the
// token cannot clone the private sibling repos, checkout can leave the
// submodule directories EMPTY — and without this guard the scan would find zero
// files, print "OK", and disarm itself silently. That is the exact
// green-run-that-checked-nothing failure this whole workstream keeps finding.
//
// `--require-scopes=N` makes the expectation explicit and load-bearing: CI
// passes the number of scopes that must actually contain migrations, and a
// short count is a hard error, not a pass.
const scopesFound = new Set(files.map((f) => f.scope))

// `--require-all-scopes` is the preferred form and the one CI uses. It NAMES
// the scope that came up empty instead of comparing two integers.
//
// The count form it replaces was unsatisfiable: `--require-scopes=8` against a
// SCOPES list whose 8th entry (R80.4) has no supabase/ directory at all. A
// count also cannot tell "crm7 failed to clone" from "R80.4 has no migrations"
// — both just read as 7 — so the one number that was supposed to prove the tree
// was scanned could be satisfied by the wrong seven scopes. Naming the missing
// scope removes both failure modes.
if (requireAllScopes) {
  const missing = missingRequiredScopes(SCOPES, scopesFound)
  if (missing.length) {
    console.error(
      `check-migration-version-collisions: these required scope(s) contain NO migration ` +
        `files: ${missing.join(', ')}.\n` +
        `Found migrations in: ${[...scopesFound].join(', ') || 'none'}.\n` +
        `The submodules are probably not checked out — verify the checkout token can ` +
        `clone the private sibling repos. Refusing to report OK on an unscanned tree.`,
    )
    process.exit(1)
  }
  // Self-healing: if an optional scope has GAINED migrations, it is no longer
  // optional and the list should say so. Silence here is how a scope drops out
  // of a presence guard and nobody notices for a year.
  for (const s of SCOPES) {
    if (s.optional && scopesFound.has(s.name)) {
      console.log(
        `::notice::scope "${s.name}" is marked optional but now contains migrations — ` +
          `remove \`optional: true\` from SCOPES in ${path.basename(process.argv[1])}.`,
      )
    }
  }
}

if (requireScopes > 0 && scopesFound.size < requireScopes) {
  console.error(
    `check-migration-version-collisions: expected migrations in at least ` +
      `${requireScopes} scope(s) but found ${scopesFound.size} ` +
      `(${[...scopesFound].join(', ') || 'none'}).\n` +
      `Submodules are probably not checked out — verify the checkout token can ` +
      `clone the private sibling repos. Refusing to report OK on an unscanned tree.`,
  )
  process.exit(1)
}

if (files.length === 0) {
  if (requireScopes > 0 || requireAllScopes) {
    console.error(
      'check-migration-version-collisions: no migration files found at all, but ' +
        `${requireAllScopes ? '--require-all-scopes' : `--require-scopes=${requireScopes}`} ` +
        'was requested. Refusing to pass.',
    )
    process.exit(1)
  }
  console.log('check-migration-version-collisions: no migration files found — OK')
  process.exit(0)
}

const allowlistPath = path.join(root, ALLOWLIST_RELATIVE_PATH)
const allowlistText = fs.existsSync(allowlistPath) ? fs.readFileSync(allowlistPath, 'utf8') : ''

const { collisions, violations, allowlisted } = runCheck({ files, allowlistText })

if (violations.length) {
  console.error('Migration version collision check FAILED:\n' + violations.map((c) => `  - ${describeCollision(c)}`).join('\n'))
  console.error(
    '\nAll six submodules + the parent repo share ONE Supabase project, so ' +
      'supabase_migrations.schema_migrations is keyed on the version string ' +
      'alone. Whichever scope the CI applier reaches SECOND for a duplicated ' +
      'version is silently skipped (bsuite#1707).\n' +
      'Fix by renaming the newer migration to an unused timestamp, OR — if ' +
      'this collision is a known, deliberately-identical duplicate or a ' +
      'verified-harmless coincidence — add it to ' +
      `${ALLOWLIST_RELATIVE_PATH} with a short reason.`,
  )
  process.exit(1)
}

// Report the number of scopes that ACTUALLY yielded files, not SCOPES.length.
// The old message said "across 8 scope(s)" unconditionally — including on a run
// where only 7 had migrations, and equally on a run where six submodules failed
// to check out and just two scopes were read. A denominator that is a constant
// is not a denominator; it is decoration that makes an unscanned tree read like
// a full sweep.
console.log(
  `check-migration-version-collisions: OK (${files.length} file(s) scanned across ` +
    `${scopesFound.size} of ${SCOPES.length} declared scope(s): ${[...scopesFound].join(', ')}; ` +
    `${collisions.length} known collision(s), all ${allowlisted.length} allowlisted)`,
)
process.exit(0)
