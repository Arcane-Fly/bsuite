#!/usr/bin/env node
/**
 * check-schema-lag — how far is `development`'s schema AHEAD of the database?
 *
 * WHY THIS EXISTS
 * ───────────────
 * bsuite#1892: there is ONE Supabase project. `d.crm.crm7.app` serves
 * `development` CODE against a `main`-STATE database. A merged, correct,
 * migration-dependent feature therefore renders as broken on dev until the next
 * promotion — and nothing anywhere says which.
 *
 * `supabase-migration-rehearsal.yml` already proves a pending migration APPLIES
 * (disposable Supabase container, production baseline, catalog assertions,
 * positive-controlled). This is the other half: it says WHAT IS PENDING, and
 * for how long. Those are different questions and only the first had an answer.
 *
 * On 2026-08-17 the honest way to answer "what is pending?" was to hand-assemble
 * a 699-element ledger from a SQL query, list 802 migration files across eight
 * scopes, and diff them in a scratch directory. The answer turned out to be ONE
 * migration. The lag was never the problem; the absence of a number was.
 *
 * WHAT COUNTS AS PENDING, AND WHAT DOES NOT
 * ─────────────────────────────────────────
 * NOT everything missing from the ledger. Measured the same day: 123 versions on
 * `development` are absent from `supabase_migrations.schema_migrations`, and
 * 122 of them sit BELOW the migration floor (20260611000000). A migration below
 * the floor can never apply — the floor-gated applier skips it by design, and it
 * is historical residue, not work in flight. Reporting 123 would be true and
 * useless; the actionable number is 1.
 *
 * WHAT THIS FAILS ON
 * ──────────────────
 * NOT `pending > 0`. A pending migration is the NORMAL state between a merge to
 * development and the next promotion — failing on it would make the guard red
 * for ordinary work, which is how a check gets ignored.
 *
 * It fails on a migration that has been pending TOO LONG (default 7 days), which
 * is the actual pathology: a promotion that stalled, or a migration everyone
 * forgot. And it fails if it scanned nothing — a guard that examines zero files
 * reports success, and this estate has shipped that exact shape more than once.
 *
 * Ledger versions with no file behind them are REPORTED but do not fail here:
 * `audit-prod-migration-history.mjs` owns that direction and has a curated
 * class-A allowlist for it. Duplicating the verdict would mean two guards
 * disagreeing about the same rows.
 */

import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const SCOPES_JSON = process.env.MIGRATION_SCOPES_JSON || 'supabase/migration-scopes.json'
const HISTORY_JSON = process.env.HISTORY_JSON_PATH || 'migration-history.json'
const MIGRATION_FLOOR = process.env.MIGRATION_FLOOR || '20260611000000'
const MAX_PENDING_AGE_DAYS = Number(process.env.MAX_PENDING_AGE_DAYS || '7')
const VERSION_RE = /^(\d{14})/

/** A 14-digit version is also a UTC timestamp. Parse it as one. */
function versionToDate(version) {
  const y = version.slice(0, 4)
  const mo = version.slice(4, 6)
  const d = version.slice(6, 8)
  const h = version.slice(8, 10)
  const mi = version.slice(10, 12)
  const s = version.slice(12, 14)
  const t = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`)
  return Number.isNaN(t) ? null : t
}

/**
 * Age is measured from the FILE'S FIRST COMMIT, not from its version string.
 * The version is author-chosen and routinely back- or forward-dated: the
 * estate's own reconciliation re-stamped 41 files to 20260610410000-414000 to
 * preserve ordering. Using the version as an age would report a re-stamped file
 * as months overdue on the day it was written. Falls back to the version
 * timestamp only when git cannot answer.
 */
function firstCommitTime(root, relPath) {
  // SEVEN OF THE EIGHT SCOPES ARE SUBMODULES. The parent tracks a gitlink, not
  // the files inside, so `git -C <parent> log -- crm7/supabase/migrations/x.sql`
  // returns NOTHING and this silently fell back to the version timestamp for
  // every scope except root. That produced "-3.5d" for a legitimately
  // forward-stamped migration — a negative age, which would never trip the
  // overdue threshold no matter how long it actually sat. The guard would have
  // been blind to exactly the pathology it exists to catch.
  //
  // Run git INSIDE the owning repository, against the path relative to it.
  const segments = relPath.split('/')
  const idx = segments.indexOf('supabase')
  const repoDir = idx > 0 ? join(root, ...segments.slice(0, idx)) : root
  const pathInRepo = idx > 0 ? segments.slice(idx).join('/') : relPath

  try {
    const out = execFileSync(
      'git',
      ['-C', repoDir, 'log', '--diff-filter=A', '--format=%cI', '--follow', '--', pathInRepo],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
    const oldest = out[out.length - 1]
    return oldest ? Date.parse(oldest) : null
  } catch {
    return null
  }
}

function loadScopes(rootDir) {
  const p = join(rootDir, SCOPES_JSON)
  if (!existsSync(p)) throw new Error(`scope manifest not found: ${p}`)
  const parsed = JSON.parse(readFileSync(p, 'utf8'))
  const scopes = parsed?.scopes
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error(`${SCOPES_JSON} declares no scopes`)
  }
  return scopes
}

/**
 * A COLLISION IS TWO DIFFERENT FILES AT ONE VERSION, NOT TWO COPIES OF ONE FILE.
 *
 * The ledger is keyed on the version alone, so the hazard is real: the applier
 * records the first file it reaches and SKIPS the second, whose DDL then never
 * runs while the pipeline reports success. But that hazard needs the two files to
 * DISAGREE. Where they are the same SQL, whichever one runs produces the same
 * database and the skip costs nothing.
 *
 * Measured 2026-08-28: this gate reported NINE collisions and not one was
 * actionable.
 *   - 5 were `packages/schema-builder/supabase/migrations/*` — DEV-FIXTURE copies
 *     of BSU migrations, which that directory's README declares in a shouted rule
 *     and which `schema-builder-migration-parity.yml` exists to keep byte-identical.
 *     A gate flagging the copies another gate is enforcing is pure noise.
 *   - 1 was `20260728120000_enterprise_licence_events.sql` in root and in BSU,
 *     byte-identical — the DELIBERATE shared-database copy the ship skill
 *     prescribes ("copy the migration into every app tree that shares the DB").
 *   - 3 are genuinely distinct files sharing a version, and all three are BELOW
 *     the floor, so they are history that can never apply.
 *
 * Nine findings, zero actions. That is how a list stops being read — and this one
 * has real teeth for the case it was built for. So: compare CONTENT, and let a
 * scope declare itself a fixture.
 */
function sqlIdentity(path) {
  // The `@sync-boundary-below` marker is the estate's existing convention for
  // "the header above differs on purpose, the SQL below must not" — the parity
  // workflow already enforces it. Honour the same boundary here rather than
  // inventing a second rule that can disagree with it.
  let text
  try { text = readFileSync(path, 'utf8') } catch { return null }
  const marker = text.indexOf('@sync-boundary-below')
  if (marker !== -1) text = text.slice(text.indexOf('\n', marker) + 1)
  return createHash('sha256').update(text.trim()).digest('hex')
}

function collectOnDisk(rootDir, scopes) {
  const byVersion = new Map() // version -> {scope, file, relPath}
  const missingScopeDirs = []
  let filesSeen = 0

  for (const scope of scopes) {
    const dir = join(rootDir, scope.migrations_dir)
    // An UNINITIALISED SUBMODULE IS AN EMPTY DIRECTORY AND PASSES existsSync.
    // Require an actual migration file, or the scope is silently unexamined and
    // the guard reports a clean tree it never looked at.
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      missingScopeDirs.push({ scope: scope.id, dir: scope.migrations_dir, reason: 'absent' })
      continue
    }
    const entries = readdirSync(dir).filter((f) => VERSION_RE.test(f))
    if (entries.length === 0) {
      missingScopeDirs.push({ scope: scope.id, dir: scope.migrations_dir, reason: 'empty' })
      continue
    }
    for (const file of entries) {
      filesSeen++
      const version = file.match(VERSION_RE)[1]
      // The ledger is keyed on the version ALONE across every scope, so two
      // scopes sharing a version collide there. Keep the first and record the
      // collision rather than letting one silently mask the other.
      if (!byVersion.has(version)) {
        byVersion.set(version, {
          scope: scope.id,
          file,
          relPath: join(scope.migrations_dir, file),
          sha: sqlIdentity(join(dir, file)),
          collidesWith: [],
          deliberateCopies: [],
        })
      } else {
        const held = byVersion.get(version)
        const sha = sqlIdentity(join(dir, file))
        const identical = sha !== null && held.sha !== null && sha === held.sha
        // A declared fixture scope is never a competing claim on a version: the
        // applier does not run it, and a parity gate already guarantees it matches.
        if (scope.dev_fixture || identical) {
          held.deliberateCopies.push(`${scope.id}/${file}${identical ? '' : ' (fixture)'}`)
        } else {
          held.collidesWith.push(`${scope.id}/${file}`)
        }
      }
    }
  }
  return { byVersion, missingScopeDirs, filesSeen }
}

function loadApplied(rootDir) {
  const p = join(rootDir, HISTORY_JSON)
  if (!existsSync(p)) {
    throw new Error(
      `applied-history file not found: ${p}\n` +
        `Produce it first, e.g.\n` +
        `  psql "$SUPABASE_DB_URL" -tA -c "SELECT COALESCE(json_agg(row_to_json(r)),'[]'::json) ` +
        `FROM (SELECT version FROM supabase_migrations.schema_migrations ORDER BY version) r" > ${HISTORY_JSON}`,
    )
  }
  const raw = JSON.parse(readFileSync(p, 'utf8'))
  const rows = Array.isArray(raw) ? raw : []
  const versions = new Set()
  for (const r of rows) {
    const v = typeof r === 'string' ? r : r?.version
    if (typeof v === 'string' && v.length > 0) versions.add(v)
  }
  if (versions.size === 0) {
    // FAIL CLOSED. An empty ledger makes every on-disk migration look pending,
    // which would either spam a false alarm or — worse, if someone later
    // "fixed" that by ignoring an empty ledger — make the guard blind.
    throw new Error(
      `${HISTORY_JSON} yielded zero applied versions. Refusing to report a lag against an empty ledger.`,
    )
  }
  return versions
}

function analyse(rootDir, { now = Date.now() } = {}) {
  const scopes = loadScopes(rootDir)
  const { byVersion, missingScopeDirs, filesSeen } = collectOnDisk(rootDir, scopes)
  const applied = loadApplied(rootDir)

  if (filesSeen === 0) {
    throw new Error('scanned zero migration files across every scope — refusing to report a pass')
  }

  const pending = []
  const belowFloor = []
  for (const [version, info] of byVersion) {
    if (applied.has(version)) continue
    if (version < MIGRATION_FLOOR) {
      belowFloor.push({ version, ...info })
      continue
    }
    const committed = firstCommitTime(rootDir, info.relPath)
    const stamped = versionToDate(version)
    const basis = committed != null ? 'first-commit' : 'version-timestamp'
    const at = committed ?? stamped
    const ageDays = at == null ? null : (now - at) / 86_400_000
    pending.push({ version, ...info, ageDays, ageBasis: basis })
  }

  pending.sort((a, b) => a.version.localeCompare(b.version))
  const ledgerOnly = [...applied].filter((v) => !byVersion.has(v))

  return {
    floor: MIGRATION_FLOOR,
    scopesDeclared: scopes.length,
    scopesScanned: scopes.length - missingScopeDirs.length,
    missingScopeDirs,
    filesSeen,
    versionsOnDisk: byVersion.size,
    versionsApplied: applied.size,
    pending,
    belowFloor,
    ledgerOnly,
    collisions: [...byVersion.values()].filter((v) => v.collidesWith.length > 0),
    deliberateCopies: [...byVersion.values()].filter((v) => v.deliberateCopies.length > 0),
  }
}

function report(a) {
  const L = []
  L.push(`check-schema-lag — floor ${a.floor}, max pending age ${MAX_PENDING_AGE_DAYS}d`)
  L.push('')
  L.push(
    `  scopes ${a.scopesScanned}/${a.scopesDeclared} · files ${a.filesSeen} · ` +
      `versions on disk ${a.versionsOnDisk} · applied ${a.versionsApplied}`,
  )
  L.push('')

  if (a.pending.length === 0) {
    L.push('  PENDING: none — every at-or-above-floor migration on this ref is applied.')
  } else {
    L.push(`  PENDING (${a.pending.length}) — merged here, NOT yet in the database:`)
    for (const p of a.pending) {
      const age = p.ageDays == null ? 'age unknown' : `${p.ageDays.toFixed(1)}d (${p.ageBasis})`
      const over = p.ageDays != null && p.ageDays > MAX_PENDING_AGE_DAYS ? '  <<< OVERDUE' : ''
      L.push(`    ${p.version}  ${p.scope}/${p.file}  ${age}${over}`)
    }
    L.push('')
    L.push(
      '  A surface that depends on one of these renders EMPTY on d.* today. That is',
    )
    L.push('  correct code awaiting schema, not a defect — it clears on promotion to main.')
  }

  if (a.belowFloor.length > 0) {
    L.push('')
    L.push(
      `  below floor (${a.belowFloor.length}) — historical, can never apply, NOT counted as pending.`,
    )
  }
  if (a.ledgerOnly.length > 0) {
    L.push('')
    L.push(
      `  ledger-only (${a.ledgerOnly.length}) — recorded with no file on this ref. Informational here;` +
        ` audit-prod-migration-history.mjs owns that direction.`,
    )
  }
  if (a.collisions.length > 0) {
    L.push('')
    L.push(`  VERSION COLLISIONS (${a.collisions.length}) — the ledger is keyed on version alone:`)
    for (const c of a.collisions) L.push(`    ${c.scope}/${c.file} vs ${c.collidesWith.join(', ')}`)
  }
  // REPORTED, NOT HIDDEN. A suppression nobody can see is the same defect as the
  // noise it replaces — you cannot tell "found nothing" from "chose not to look".
  const copies = a.deliberateCopies ?? []
  if (copies.length > 0) {
    L.push('')
    L.push(
      `  deliberate copies (${copies.length}) — same version, SAME SQL or a declared dev fixture, so`,
    )
    L.push('  whichever the applier reaches produces the same database. Not a collision:')
    for (const c of copies) L.push(`    ${c.scope}/${c.file} = ${c.deliberateCopies.join(', ')}`)
  }
  if (a.missingScopeDirs.length > 0) {
    L.push('')
    L.push('  SCOPES NOT SCANNED (an uninitialised submodule is an empty dir that passes -d):')
    for (const m of a.missingScopeDirs) L.push(`    ${m.scope} (${m.dir}) — ${m.reason}`)
  }
  return L.join('\n')
}

function verdict(a) {
  const overdue = a.pending.filter(
    (p) => p.ageDays != null && p.ageDays > MAX_PENDING_AGE_DAYS,
  )
  const failures = []
  if (overdue.length > 0) {
    failures.push(
      `${overdue.length} migration(s) pending longer than ${MAX_PENDING_AGE_DAYS}d: ` +
        overdue.map((o) => `${o.version} (${o.scope})`).join(', '),
    )
  }
  // A scope declared in the manifest and not scanned is a coverage hole, and a
  // coverage hole reports clean. Treat it as a failure, not a note.
  if (a.missingScopeDirs.length > 0) {
    failures.push(
      `${a.missingScopeDirs.length} declared scope(s) contributed no migrations — ` +
        `run \`git submodule update --init --recursive\``,
    )
  }
  // Version collisions are DELIBERATELY not a failure here. They are a real and
  // serious class — the ledger is keyed on the 14-digit version alone, so two
  // scopes sharing one can only ever record a single row — but that class is
  // already OWNED by scripts/check-migration-version-collisions.mjs, which
  // carries a 134-line curated allowlist and reports "23 known collision(s), all
  // 23 allowlisted" today.
  //
  // The first version of this file failed on them, which would have made this
  // guard permanently red over rows a sibling guard had already reviewed and
  // accepted. Two guards disagreeing about the same rows is worse than one
  // guard: whichever is louder gets muted, and it is usually the newer one.
  // They stay in the report so the reader sees them; the verdict belongs to the
  // guard that owns the allowlist.
  return failures
}

// ── self-test ────────────────────────────────────────────────────────────────
// A guard never observed failing is not known to work.
function selfTest() {
  const results = []
  const check = (name, fn) => {
    try {
      fn()
      results.push(['PASS', name])
    } catch (e) {
      results.push(['FAIL', `${name} — ${e.message}`])
    }
  }
  // COLLISION CLASSIFICATION — three cases and a POSITIVE CONTROL.
  //
  // Added 2026-08-28 with the change that stopped reporting deliberate copies. The
  // positive control is the point: the reason to distrust a suppression is that it
  // can suppress the real thing, so the first case must go on FAILING.
  const twoScopes = (aBody, bBody, bScopeExtra = {}) => {
    const root = mkdtempSync(join(tmpdir(), 'schema-lag-coll-'))
    mkdirSync(join(root, 'a/migrations'), { recursive: true })
    mkdirSync(join(root, 'b/migrations'), { recursive: true })
    mkdirSync(join(root, dirname(SCOPES_JSON)), { recursive: true })
    writeFileSync(join(root, SCOPES_JSON), JSON.stringify({ scopes: [
      { id: 'a', migrations_dir: 'a/migrations' },
      { id: 'b', migrations_dir: 'b/migrations', ...bScopeExtra },
    ] }))
    writeFileSync(join(root, 'a/migrations/20260701000000_x.sql'), aBody)
    writeFileSync(join(root, 'b/migrations/20260701000000_x.sql'), bBody)
    return collectOnDisk(root, loadScopes(root))
  }
  check('POSITIVE CONTROL — two DIFFERENT files at one version still collide', () => {
    const r = twoScopes('-- one\nSELECT 1;\n', '-- two\nSELECT 2;\n')
    const v = r.byVersion.get('20260701000000')
    if (v.collidesWith.length !== 1) throw new Error(`expected a collision, got ${v.collidesWith.length}`)
  })
  check('byte-identical files at one version are a deliberate copy, not a collision', () => {
    const same = '-- same\nSELECT 1;\n'
    const v = twoScopes(same, same).byVersion.get('20260701000000')
    if (v.collidesWith.length !== 0) throw new Error('identical content reported as a collision')
    if (v.deliberateCopies.length !== 1) throw new Error('identical content not recorded as a copy')
  })
  check('a dev_fixture scope never collides, even when its SQL differs', () => {
    const v = twoScopes('-- one\nSELECT 1;\n', '-- two\nSELECT 2;\n', { dev_fixture: true })
      .byVersion.get('20260701000000')
    if (v.collidesWith.length !== 0) throw new Error('a declared fixture reported as a collision')
    if (v.deliberateCopies.length !== 1) throw new Error('fixture not recorded as a copy')
  })
  check('the @sync-boundary-below marker scopes the comparison to the SQL below it', () => {
    const body = '\n-- @sync-boundary-below\nSELECT 1;\n'
    const v = twoScopes('-- canonical header' + body, '-- FIXTURE header, different on purpose' + body)
      .byVersion.get('20260701000000')
    if (v.collidesWith.length !== 0) throw new Error('differing headers read as differing SQL')
  })
  const fixture = (files, appliedVersions) => {
    const root = mkdtempSync(join(tmpdir(), 'schema-lag-'))
    mkdirSync(join(root, 'supabase/migrations'), { recursive: true })
    writeFileSync(
      join(root, SCOPES_JSON),
      JSON.stringify({ scopes: [{ id: 'root', migrations_dir: 'supabase/migrations' }] }),
    )
    for (const f of files) writeFileSync(join(root, 'supabase/migrations', f), '-- x')
    writeFileSync(
      join(root, HISTORY_JSON),
      JSON.stringify(appliedVersions.map((v) => ({ version: v }))),
    )
    return root
  }
  const NOW = Date.parse('2026-08-17T00:00:00Z')

  check('a fresh pending migration is reported but does NOT fail', () => {
    const root = fixture(['20260816010000_x.sql'], ['20260101000000_seed'])
    const a = analyse(root, { now: NOW })
    if (a.pending.length !== 1) throw new Error(`expected 1 pending, got ${a.pending.length}`)
    if (verdict(a).length !== 0) throw new Error('a 1-day-old pending migration must not fail')
    rmSync(root, { recursive: true, force: true })
  })

  check('an OVERDUE pending migration FAILS', () => {
    const root = fixture(['20260701010000_stale.sql'], ['20260101000000_seed'])
    const a = analyse(root, { now: NOW })
    const v = verdict(a)
    if (v.length === 0) throw new Error('a 47-day-old pending migration must fail')
    rmSync(root, { recursive: true, force: true })
  })

  check('a below-floor unapplied migration is NOT pending', () => {
    const root = fixture(['20250101010000_ancient.sql'], ['20260101000000_seed'])
    const a = analyse(root, { now: NOW })
    if (a.pending.length !== 0) throw new Error('below-floor must never count as pending')
    if (a.belowFloor.length !== 1) throw new Error('below-floor must still be reported')
    rmSync(root, { recursive: true, force: true })
  })

  check('an applied migration is not pending', () => {
    const root = fixture(['20260816010000_x.sql'], ['20260816010000'])
    const a = analyse(root, { now: NOW })
    if (a.pending.length !== 0) throw new Error('applied must not be pending')
    rmSync(root, { recursive: true, force: true })
  })

  check('an EMPTY ledger is refused, not treated as "everything pending"', () => {
    const root = fixture(['20260816010000_x.sql'], [])
    let threw = false
    try {
      analyse(root, { now: NOW })
    } catch {
      threw = true
    }
    if (!threw) throw new Error('an empty ledger must be refused')
    rmSync(root, { recursive: true, force: true })
  })

  check('scanning zero migration files is refused, not a pass', () => {
    const root = fixture([], ['20260101000000_seed'])
    let threw = false
    try {
      analyse(root, { now: NOW })
    } catch {
      threw = true
    }
    if (!threw) throw new Error('zero files scanned must be refused')
    rmSync(root, { recursive: true, force: true })
  })

  // The count goes FIRST. LANE-WATCHER classifies from the HEAD of a guard's
  // output — a summary printed only at the end is truncated away and the guard
  // reads as "never stated a non-zero count of anything examined", which is
  // exactly what happened here before this line existed.
  console.log(
    `check-schema-lag --self-test: ${results.length} cases exercised across both ` +
      `directions (pending-not-failing, overdue-failing, below-floor-excluded, ` +
      `applied-excluded, empty-ledger-refused, zero-files-refused).`,
  )
  for (const [state, name] of results) console.log(`  ${state}  ${name}`)
  const failed = results.filter(([s]) => s === 'FAIL').length
  // STATE WHAT WAS EXAMINED, with a non-zero count. LANE-WATCHER
  // (check-guard-self-reporting.mjs) fails any registered guard that "exited 0
  // but never stated a non-zero count of anything examined", and it is right to:
  // a guard that prints PASS lines without a denominator is indistinguishable
  // from one that ran no fixtures at all. "6/6 passed" is a ratio, not a count
  // of things examined, and the watcher correctly refused it.
  console.log(
    `\ncheck-schema-lag --self-test: ${results.length} cases exercised — ` +
      `${results.length - failed} passed, ${failed} failed.`,
  )
  return failed === 0 ? 0 : 1
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest()
  const a = analyse(REPO_ROOT)
  const text = report(a)
  console.log(text)
  if (argv.includes('--json')) {
    console.log('\n---JSON---')
    console.log(JSON.stringify(a, null, 2))
  }
  const failures = verdict(a)
  if (failures.length > 0) {
    console.log('')
    for (const f of failures) console.log(`::error::${f}`)
    return 1
  }
  // Same self-reporting contract as the self-test path: name a non-zero count of
  // what was examined, so a run over an empty or half-checked-out tree can never
  // read as a clean pass.
  console.log(
    `\ncheck-schema-lag: ${a.scopesScanned}/${a.scopesDeclared} scope(s), ${a.filesSeen} ` +
      `migration file(s) examined across ${a.versionsOnDisk} distinct version(s) against ` +
      `${a.versionsApplied} applied — ${a.pending.length} pending, ${a.belowFloor.length} ` +
      `below floor, ${a.ledgerOnly.length} ledger-only, ${a.collisions.length} collision(s).`,
  )
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)))
}

export { analyse, verdict, report }
