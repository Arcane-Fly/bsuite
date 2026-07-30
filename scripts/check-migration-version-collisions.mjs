#!/usr/bin/env node
/**
 * check-migration-version-collisions.mjs
 *
 * bsuite#1707: all six submodules (crm7, conduit, R80.3,
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
 * This script finds every version that appears in more than one file across
 * all scopes (including two files colliding within the SAME scope, which
 * hits the exact same "$APPLIED already has this version" skip logic) and
 * fails unless the version is on the committed allowlist
 * (scripts/migration-collision-allowlist.txt).
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

/** Every migration scope that writes into the shared schema_migrations table. */
const SCOPES = [
  { name: 'root', dir: 'supabase/migrations' },
  { name: 'crm7', dir: 'crm7/supabase/migrations' },
  { name: 'conduit', dir: 'conduit/supabase/migrations' },
  { name: 'R80.3', dir: 'R80.3/supabase/migrations' },
  { name: 'business-suite-unified', dir: 'business-suite-unified/supabase/migrations' },
  { name: 'braden', dir: 'braden/supabase/migrations' },
  { name: 'throughput', dir: 'throughput/supabase/migrations' },
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

/** Parse `VERSION<whitespace>reason` lines; blank lines and `#` comments ignored. */
function parseAllowlist(text) {
  const allowed = new Map()
  const lines = text.split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    let i = 0
    while (i < line.length && line[i] >= '0' && line[i] <= '9') i++
    const version = line.slice(0, i)
    const rest = line.slice(i).trim()
    if (version.length !== 14 || !rest) continue
    allowed.set(version, rest)
  }
  return allowed
}

function describeCollision({ version, entries }) {
  const files = entries.map((e) => `${e.scope}:${e.file}`).join(' and ')
  return `${version} appears in more than one scope: ${files}`
}

function runCheck({ files, allowlistText }) {
  const collisions = findCollisions(files)
  const allowlist = parseAllowlist(allowlistText)
  const violations = []
  const allowlisted = []
  for (const c of collisions) {
    if (allowlist.has(c.version)) {
      allowlisted.push(c)
    } else {
      violations.push(c)
    }
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
          allowlistText: '20260201000000  coincidental timestamp, distinct migrations (test fixture)\n',
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
        '20260101000000  reason one',
        '  # indented comment',
        '20260102000000   reason two with   spaces',
      ].join('\n')
      const allowed = parseAllowlist(text)
      return (
        allowed.size === 2 &&
        allowed.get('20260101000000') === 'reason one' &&
        allowed.get('20260102000000') === 'reason two with   spaces'
      )
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
    'Usage: node scripts/check-migration-version-collisions.mjs [--root=<path>] | --self-test',
  )
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) selfTest()

let rootArg = '.'
for (const a of args) {
  if (a.startsWith('--root=')) {
    rootArg = a.slice('--root='.length)
  } else if (a.startsWith('-')) {
    usageError(`unknown flag "${a}"`)
  } else {
    usageError(`unexpected positional argument "${a}"`)
  }
}

const root = path.resolve(rootArg)
if (!fs.existsSync(root)) usageError(`--root path does not exist: ${root}`)

const files = scanScopes(SCOPES, root)
if (files.length === 0) {
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

console.log(
  `check-migration-version-collisions: OK (${files.length} file(s) scanned across ${SCOPES.length} scope(s), ` +
    `${collisions.length} known collision(s), all ${allowlisted.length} allowlisted)`,
)
process.exit(0)
