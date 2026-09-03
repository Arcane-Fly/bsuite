#!/usr/bin/env node
/**
 * audit-prod-migration-history.mjs — drift between the shared Supabase ledger
 * (supabase_migrations.schema_migrations) and the migration files that claim to
 * have written it.
 *
 * Extracted from the heredoc that used to live inside
 * .github/workflows/prod-migration-history-audit.yml. A checker embedded in a
 * workflow cannot be run, tested or reviewed outside CI, which is how the
 * defect below survived six consecutive scheduled failures.
 *
 * ---------------------------------------------------------------------------
 * WHY CLASS A WAS REWRITTEN (bsuite#1898)
 * ---------------------------------------------------------------------------
 * Class A used to be: "the ledger row has statement_count = 0 but the local
 * migration file is non-empty, so the SQL may never have run".
 *
 * That test could never go green, because it was not measuring what it claimed.
 * `statements` records the migration BODY, and only the Management-API / MCP
 * `apply_migration` path populates it. The file applier this estate actually
 * runs writes the row with `statements` NULL. Measured live against
 * tuybltdrdefjblnplpqo on 2026-08-12:
 *
 *   total_rows 665 | statements NULL 403 | statements EMPTY 79 | POPULATED 183
 *   max(version)                             = 20260813240000
 *   max(version) WHERE statements IS NULL    = 20260813240000
 *
 * The newest row in the ledger has NULL statements, so this is how the CURRENT
 * applier behaves — not an old-CLI artefact that has since been fixed. The
 * check was therefore comparing PROVENANCE METADATA (which tool wrote the row)
 * against FILE CONTENT, and flagging the normal case: 294 violations on the
 * 2026-08-12T00:38 run, every one of them a migration that had applied
 * perfectly well.
 *
 * A check that cannot go green is a check nobody reads. Six scheduled runs had
 * already failed on this, and the estate had learned to ignore scheduled runs.
 *
 * Class A now asserts what the old test only pretended to: THE OBJECTS EXIST.
 * For every migration at/above the floor that HAS a ledger row, the objects it
 * creates must be present in the live catalogue. If the ledger says a migration
 * ran and its table/function/column is not there, that is real, actionable
 * drift — and no longer inferable from a metadata column.
 *
 * Scoping that matters: only migrations WITH a ledger row are asserted. A file
 * with no ledger row is class B, and asserting its objects too would report the
 * same defect twice under two names. Verified: the only two absent tables in
 * the tree (report_catalog_derived_measures, financial_period_annotations) come
 * from crm7 migrations that have no ledger row — class B, correctly, not A.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT CANNOT SEE, stated rather than left to be discovered
 * ---------------------------------------------------------------------------
 * Object extraction is textual. It deliberately covers only the four shapes it
 * can read unambiguously — CREATE TABLE, CREATE [OR REPLACE] FUNCTION, ALTER
 * TABLE ... ADD COLUMN, and the DROP/RENAME forms that retire them — in the
 * `public` schema. It does NOT understand DDL built inside DO blocks or
 * EXECUTE'd strings, and it does not check policies, indexes, constraints,
 * triggers or types. Those are silently not covered; this check is a floor, not
 * a proof of full application. It is still strictly more than the previous
 * test, which proved nothing at all.
 *
 * A DROP or RENAME anywhere in the tree — at ANY version, including below the
 * floor — retires the object for assertion purposes. Otherwise a legitimate
 * "add column, backfill, rename over the old one" migration reads as drift:
 * exactly what training_plans.qualification_id_uuid did on the first live run
 * (crm7 20260708000001 renames it to qualification_id three lines later).
 *
 * ---------------------------------------------------------------------------
 * CLASS C — CROSS-SCOPE VERSION COLLISION (bsuite J7, 2026-09-03 rewrite)
 * ---------------------------------------------------------------------------
 * The same version existing in more than one scope. Before this rewrite,
 * collectLocalMigrations() compared colliding files with RAW byte equality
 * and never consulted scripts/migration-collision-allowlist.txt — the only
 * one of the four migration-collision checkers in scripts/ that neither
 * normalized content nor honoured the allowlist. That false-failed on four
 * comment-only, already-reviewed, already-pinned pairs (20261103000000,
 * 20261105000000 root vs crm7; 20261009000000, 20261009000100 BSU vs
 * packages/schema-builder).
 *
 * The comparison now runs through scripts/lib/migration-collision-
 * compare.mjs's compareForCollision(), shared with check-migration-version-
 * collisions.mjs and check-migration-collisions-at-branch-tips.mjs: byte
 * equality, plus two — and only two — normalizations: whole-line `--`
 * comments and blank lines are dropped, and content below an existing
 * `-- @sync-boundary-below` marker (schema-builder-migration-parity.yml's own
 * convention) is compared on its own, with a marker present in only ONE copy
 * treated as a hard mismatch. A `--` inside a string literal, or an inline
 * trailing comment, is never touched — see that module for the full rule and
 * its self-tests.
 *
 * THE ALLOWLIST CAN NEVER TURN A DIVERGENT PAIR GREEN HERE. If two files at
 * one version still differ after normalization, that is real drift — the
 * applier will silently skip one file's DDL — and no allowlist entry
 * changes that outcome, regardless of its stated reason. An allowlist entry
 * only makes the failure MESSAGE name the specific stale/missing entry (and
 * its line number in migration-collision-allowlist.txt) instead of reporting
 * a bare, unexplained collision.
 *
 * Harmless (normalize-equal) duplicate groups are counted and checked
 * against a {findings, scanned} ceiling in
 * scripts/migration-harmless-duplicates-baseline.json — `scanned` must never
 * fall below the bank (a scope failed to check out) and `findings` must
 * never exceed it (a new, un-reviewed harmless duplicate appeared) without an
 * explicit `--write-baseline` re-bank.
 *
 * Usage:
 *   node scripts/audit-prod-migration-history.mjs
 *   node scripts/audit-prod-migration-history.mjs --self-test
 *   node scripts/audit-prod-migration-history.mjs --file-only
 *     Class C + the harmless-duplicate ceiling only — no database required,
 *     safe for a pull_request trigger. Classes A and B still need the live
 *     ledger/catalogue and stay on the scheduled/dispatch job.
 *   node scripts/audit-prod-migration-history.mjs --file-only --write-baseline
 *     Re-bank scripts/migration-harmless-duplicates-baseline.json after a
 *     human has reviewed a new harmless-duplicate group. Still fails if a
 *     genuine (non-harmless) Class C collision exists.
 *
 * Inputs (env):
 *   HISTORY_JSON_PATH     ledger rows: [{version, name}] — unused in --file-only
 *   CATALOG_JSON_PATH     live catalogue: {tables:[], functions:[], columns:["t.c"]} — unused in --file-only
 *   MIGRATION_FLOOR       versions below this are the reconciliation lane's
 *   MIGRATION_SCOPE_DIRS  comma-separated migration directories
 *
 * Exit 0 clean, 1 drift, 2 usage or internal error.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from 'node:fs'
import { basename, join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  compareForCollision,
  parseAllowlist,
  ALLOWLIST_RELATIVE_PATH,
} from './lib/migration-collision-compare.mjs'

const HISTORY_JSON_PATH = process.env.HISTORY_JSON_PATH || 'migration-history.json'
const CATALOG_JSON_PATH = process.env.CATALOG_JSON_PATH || 'live-catalog.json'
const MIGRATION_FLOOR = process.env.MIGRATION_FLOOR || ''
const SCOPE_DIRS = (process.env.MIGRATION_SCOPE_DIRS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HARMLESS_DUPLICATES_BASELINE_PATH = join(REPO_ROOT, 'scripts/migration-harmless-duplicates-baseline.json')

function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

function isNonEmptySql(source) {
  return stripSqlComments(source).trim().length > 0
}

// --------------------------------------------------------------------------
// Object extraction
// --------------------------------------------------------------------------

const RE_CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi
const RE_DROP_TABLE = /drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi
const RE_RENAME_TABLE = /alter\s+table\s+[^;]*?\brename\s+to\s+"?([a-z0-9_]+)"?/gi
const RE_CREATE_FUNCTION =
  /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z0-9_]+)"?\s*\(/gi
const RE_DROP_FUNCTION = /drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi
const RE_ADD_COLUMN =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z0-9_]+)"?/gi
const RE_DROP_COLUMN =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s+drop\s+column\s+(?:if\s+exists\s+)?"?([a-z0-9_]+)"?/gi
// `ALTER TABLE t RENAME COLUMN old TO new` retires `old`. Without this, the
// swap-column idiom (add _uuid, backfill, drop original, rename _uuid over it)
// reports the scaffolding column as missing forever.
const RE_RENAME_COLUMN =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?\s+rename\s+column\s+"?([a-z0-9_]+)"?\s+to\s+"?([a-z0-9_]+)"?/gi

function matchAll(re, text, fn) {
  re.lastIndex = 0
  let m
  while ((m = re.exec(text)) !== null) fn(m)
}

/**
 * Objects an assertable migration creates, and objects ANY migration retires.
 *
 * `assertable` is decided by the caller: at/above floor AND present in the
 * ledger. Retirements are collected from every file regardless, because a
 * pre-floor or unrecorded migration can still legitimately have dropped
 * something an assertable one created.
 */
function extractObjects(source, assertable, acc) {
  const sql = stripSqlComments(source)
  if (assertable) {
    matchAll(RE_CREATE_TABLE, sql, (m) => acc.created.tables.add(m[1]))
    matchAll(RE_CREATE_FUNCTION, sql, (m) => acc.created.functions.add(m[1]))
    matchAll(RE_ADD_COLUMN, sql, (m) => acc.created.columns.add(`${m[1]}.${m[2]}`))
  }
  matchAll(RE_DROP_TABLE, sql, (m) => acc.retired.tables.add(m[1]))
  matchAll(RE_RENAME_TABLE, sql, (m) => acc.retired.tables.add(m[1]))
  matchAll(RE_DROP_FUNCTION, sql, (m) => acc.retired.functions.add(m[1]))
  matchAll(RE_DROP_COLUMN, sql, (m) => acc.retired.columns.add(`${m[1]}.${m[2]}`))
  matchAll(RE_RENAME_COLUMN, sql, (m) => acc.retired.columns.add(`${m[1]}.${m[2]}`))
}

function newAccumulator() {
  return {
    created: { tables: new Set(), functions: new Set(), columns: new Set() },
    retired: { tables: new Set(), functions: new Set(), columns: new Set() },
  }
}

/** Objects that are created, never retired, and therefore must exist live. */
function netObjects(acc) {
  const tables = [...acc.created.tables].filter((t) => !acc.retired.tables.has(t))
  const functions = [...acc.created.functions].filter((f) => !acc.retired.functions.has(f))
  const columns = [...acc.created.columns].filter(
    (c) => !acc.retired.columns.has(c) && !acc.retired.tables.has(c.split('.')[0]),
  )
  return { tables, functions, columns }
}

/**
 * Class A: recorded migrations whose objects are absent from the live catalogue.
 *
 * A column on a table that is itself missing is NOT reported separately — the
 * missing table is the finding, and listing every one of its columns beside it
 * buries the signal in its own consequences.
 */
function missingObjects(net, catalog) {
  const liveTables = new Set(catalog.tables || [])
  const liveFunctions = new Set(catalog.functions || [])
  const liveColumns = new Set(catalog.columns || [])
  const missingTables = net.tables.filter((t) => !liveTables.has(t))
  const missingTableSet = new Set(missingTables)
  return {
    tables: missingTables,
    functions: net.functions.filter((f) => !liveFunctions.has(f)),
    columns: net.columns.filter(
      (c) => !liveColumns.has(c) && !missingTableSet.has(c.split('.')[0]),
    ),
  }
}

// --------------------------------------------------------------------------
// Loading
// --------------------------------------------------------------------------

function loadRows(historyJsonPath) {
  const parsed = JSON.parse(readFileSync(historyJsonPath, 'utf8'))
  const rows = Array.isArray(parsed) ? parsed : parsed.rows
  if (!Array.isArray(rows)) {
    throw new Error('History JSON must be an array or an object with a rows array')
  }
  return rows.map((row) => ({
    version: String(row.version ?? ''),
    name: row.name == null ? null : String(row.name),
  }))
}

function loadCatalog(catalogJsonPath) {
  const parsed = JSON.parse(readFileSync(catalogJsonPath, 'utf8'))
  for (const key of ['tables', 'functions', 'columns']) {
    if (!Array.isArray(parsed[key])) {
      throw new Error(`Catalog JSON is missing the "${key}" array`)
    }
  }
  // A catalogue that came back empty means the export failed, not that the
  // database is empty. Reporting "no drift" off an empty instrument is the
  // exact failure this whole workstream keeps finding.
  if (parsed.tables.length === 0) {
    throw new Error(
      'Catalog JSON lists ZERO tables — the export query must have failed. ' +
        'Refusing to report "no drift" against an empty catalogue.',
    )
  }
  return parsed
}

/**
 * Class C: the same migration VERSION exists in more than one scope. Two
 * phases — first gather every file at every version across all scopes
 * (needed regardless, to feed object extraction), then classify each
 * multi-file version group exactly once, against its FULL group rather than
 * pair-by-pair, so an allowlist `n=<count>` pin is checked against the real
 * group size instead of whatever partial count had been seen when an earlier
 * single-pass implementation reached it.
 *
 * THE COMPARISON RULE (bsuite J7, 2026-09-03; see scripts/lib/migration-
 * collision-compare.mjs for the full rationale). Two files at one version
 * are compared with compareForCollision(), which is BYTE equality plus
 * exactly two normalizations: whole-line `--` comments and blank lines are
 * dropped, and content below an `-- @sync-boundary-below` marker is compared
 * on its own (honouring the existing schema-builder-migration-parity.yml
 * convention rather than inventing a second one). Nothing else is touched —
 * a `--` inside a string literal, or an inline trailing comment, can never
 * cause two genuinely different DEFAULTs to compare equal.
 *
 * THE ALLOWLIST CAN NEVER TURN A DIVERGENT GROUP GREEN. If
 * compareForCollision says a group is NOT equal, that is Class C's whole
 * subject — the applier will silently skip one of these files' DDL — and no
 * allowlist entry can waive it, regardless of whether the entry's reason
 * says "intentional-duplicate" (content that still diverges beyond comments
 * means the entry no longer describes what is on disk: it is STALE, not a
 * waiver) or "coincidental-timestamp" (two genuinely different migrations
 * sharing a timestamp is exactly the loss this class exists to catch). The
 * allowlist is consulted only to make the failure MESSAGE name the specific
 * stale/missing entry and its line number in migration-collision-
 * allowlist.txt, never to change the pass/fail outcome.
 */
function collectLocalMigrations(dirs, ledgerVersions, allowlist, floor = MIGRATION_FLOOR) {
  const filesByVersion = new Map()
  const acc = newAccumulator()
  const scanOrder = []

  for (const dirRel of dirs) {
    const dir = resolve(dirRel)
    if (!existsSync(dir)) {
      console.log(`(scope skipped — no migrations dir present: ${dirRel})`)
      continue
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.sql')) continue
      const match = entry.name.match(/^(\d{8,14})_/)
      if (!match) continue
      const version = match[1]
      const path = join(dir, entry.name)
      const source = readFileSync(path, 'utf8')

      const assertable = (!floor || version >= floor) && ledgerVersions.has(version)
      extractObjects(source, assertable, acc)

      const record = { path, name: entry.name, scope: dirRel, source, nonEmpty: isNonEmptySql(source) }
      scanOrder.push(record)
      if (!filesByVersion.has(version)) filesByVersion.set(version, [])
      filesByVersion.get(version).push(record)
    }
  }

  const migrations = new Map()
  const divergentCollisions = []
  const harmlessDuplicates = []

  for (const [version, group] of filesByVersion) {
    // First file in scan order wins the slot other classes read from — same
    // "first scope processed wins" semantics the applier itself has (it
    // records whichever file it reaches first for a version).
    migrations.set(version, group[0])
    if (group.length < 2) continue

    const anchor = group[0]
    const comparisons = group.slice(1).map((other) => ({ other, cmp: compareForCollision(anchor.source, other.source) }))
    const allEqual = comparisons.every((c) => c.cmp.equal)

    if (allEqual) {
      const reasons = new Set(comparisons.map((c) => c.cmp.reason))
      const reason = reasons.size === 1 ? [...reasons][0] : 'comment-only-difference'
      harmlessDuplicates.push({ version, group, reason })
      console.warn(
        `WARNING: duplicate migration ${version} across ${group.map((g) => `${g.scope}/${g.name}`).join(', ')} ` +
          `— ${reason} (currently harmless) but the shared ledger cannot tell the scopes apart. ` +
          'Consolidate to one scope, or confirm the intentional-duplicate allowlist entry is current.',
      )
      continue
    }

    if (!floor || version < floor) {
      console.warn(
        `WARNING (pre-floor, not failing): version collision ${version} across ` +
          `${group.map((g) => `${g.scope}/${g.name}`).join(', ')} — divergent content, but below ` +
          'MIGRATION_FLOOR; owned by the history-reconciliation lane.',
      )
      continue
    }

    const entry = allowlist.get(version)
    const divergentPairs = comparisons.filter((c) => !c.cmp.equal)
    divergentCollisions.push({
      version,
      a: { scope: anchor.scope, name: anchor.name },
      b: { scope: divergentPairs[0].other.scope, name: divergentPairs[0].other.name },
      cmpReason: divergentPairs[0].cmp.reason,
      allowlistEntry: entry || null,
      groupSize: group.length,
    })
  }

  return {
    migrations,
    divergentCollisions,
    harmlessDuplicates,
    filesScanned: scanOrder.length,
    objects: netObjects(acc),
  }
}

// --------------------------------------------------------------------------
// Audit
// --------------------------------------------------------------------------

function audit({ rows, localMigrations, objects, catalog }) {
  const remoteVersions = new Set()
  let localBacked = 0
  let missingLocal = 0
  for (const row of rows) {
    if (!row.version) continue
    remoteVersions.add(row.version)
    if (localMigrations.has(row.version)) localBacked += 1
    else missingLocal += 1
  }

  const absentObjects = missingObjects(objects, catalog)

  const unrecordedViolations = []
  if (MIGRATION_FLOOR) {
    for (const [version, local] of localMigrations) {
      if (version < MIGRATION_FLOOR) continue
      if (!remoteVersions.has(version)) unrecordedViolations.push({ version, local })
    }
  }

  return {
    totalRemoteRows: rows.length,
    localFilesScanned: localMigrations.size,
    localBacked,
    missingLocal,
    assertedObjects: objects.tables.length + objects.functions.length + objects.columns.length,
    absentObjects,
    unrecordedViolations,
  }
}

function absentCount(a) {
  return a.tables.length + a.functions.length + a.columns.length
}

// --------------------------------------------------------------------------
// Self-test
// --------------------------------------------------------------------------

function selfTest() {
  const cases = []
  const catalog = { tables: ['kept'], functions: ['fn_kept'], columns: ['kept.col_kept'] }

  cases.push([
    'a created-and-live table is not reported',
    () => {
      const acc = newAccumulator()
      extractObjects('CREATE TABLE public.kept (id int);', true, acc)
      return absentCount(missingObjects(netObjects(acc), catalog)) === 0
    },
  ])

  // THE REGRESSION TEST FOR THE DEFECT THIS FILE EXISTS FOR: a recorded
  // migration whose table is absent live is real drift and must be reported.
  cases.push([
    'a recorded migration whose table is ABSENT is reported',
    () => {
      const acc = newAccumulator()
      extractObjects('CREATE TABLE public.vanished (id int);', true, acc)
      const missing = missingObjects(netObjects(acc), catalog)
      return missing.tables.length === 1 && missing.tables[0] === 'vanished'
    },
  ])

  cases.push([
    'an UNRECORDED migration contributes no class-A assertion (it is class B)',
    () => {
      const acc = newAccumulator()
      extractObjects('CREATE TABLE public.vanished (id int);', false, acc)
      return absentCount(missingObjects(netObjects(acc), catalog)) === 0
    },
  ])

  cases.push([
    'a dropped table is not asserted',
    () => {
      const acc = newAccumulator()
      extractObjects('CREATE TABLE public.tmp_thing (id int);', true, acc)
      extractObjects('DROP TABLE IF EXISTS public.tmp_thing;', false, acc)
      return absentCount(missingObjects(netObjects(acc), catalog)) === 0
    },
  ])

  // The live first-run false positive: add a scaffold column, backfill, then
  // rename it over the original. crm7 20260708000001 does exactly this.
  cases.push([
    'a column renamed away is not asserted (the swap-column idiom)',
    () => {
      const acc = newAccumulator()
      extractObjects(
        'ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS qualification_id_uuid uuid;\n' +
          'ALTER TABLE training_plans RENAME COLUMN qualification_id_uuid TO qualification_id;',
        true,
        acc,
      )
      return absentCount(missingObjects(netObjects(acc), catalog)) === 0
    },
  ])

  cases.push([
    'a dropped column is not asserted',
    () => {
      const acc = newAccumulator()
      extractObjects('ALTER TABLE kept ADD COLUMN gone text;', true, acc)
      extractObjects('ALTER TABLE kept DROP COLUMN IF EXISTS gone;', false, acc)
      return absentCount(missingObjects(netObjects(acc), catalog)) === 0
    },
  ])

  cases.push([
    'columns of a missing table are not listed separately',
    () => {
      const acc = newAccumulator()
      extractObjects(
        'CREATE TABLE public.vanished (id int);\nALTER TABLE vanished ADD COLUMN a text;',
        true,
        acc,
      )
      const missing = missingObjects(netObjects(acc), catalog)
      return missing.tables.length === 1 && missing.columns.length === 0
    },
  ])

  cases.push([
    'CREATE OR REPLACE FUNCTION is extracted and checked',
    () => {
      const acc = newAccumulator()
      extractObjects('CREATE OR REPLACE FUNCTION public.fn_gone(a uuid) RETURNS void AS $$', true, acc)
      const missing = missingObjects(netObjects(acc), catalog)
      return missing.functions.length === 1 && missing.functions[0] === 'fn_gone'
    },
  ])

  // The old class A keyed off the ledger's `statements` column, which records
  // WHICH TOOL wrote the row, not whether the SQL ran. Assert behaviourally
  // that it is ignored — an earlier version of this case grepped the source for
  // "statement_count" and failed on this file's own explanation of the bug,
  // which is a test of the documentation, not of the code.
  cases.push([
    'the ledger statements column is ignored when loading rows',
    () => {
      const tmp = join(process.env.TMPDIR || '/tmp', `history-selftest-${process.pid}.json`)
      writeFileSync(tmp, JSON.stringify([{ version: '20260101000000', name: 'x', statement_count: 0 }]))
      const [row] = loadRows(tmp)
      return (
        row.version === '20260101000000' &&
        !Object.prototype.hasOwnProperty.call(row, 'statementCount') &&
        !Object.prototype.hasOwnProperty.call(row, 'statement_count')
      )
    },
  ])

  cases.push([
    'an empty catalogue is a hard error, never "no drift"',
    () => {
      try {
        // Simulate the export having produced nothing.
        const bad = JSON.stringify({ tables: [], functions: [], columns: [] })
        const tmp = join(process.env.TMPDIR || '/tmp', `catalog-selftest-${process.pid}.json`)
        writeFileSync(tmp, bad)
        loadCatalog(tmp)
        return false
      } catch (e) {
        return String(e.message).includes('ZERO tables')
      }
    },
  ])

  // --------------------------------------------------------------------
  // Class C — collectLocalMigrations, exercised through THIS real entry
  // point, over temporary scope directories (same withTempScopes/
  // writeScopeFile shape as check-migration-version-collisions.mjs, so a
  // reader who knows one sibling gate's self-test recognizes this one).
  // These are the six cases BRIEF_COMMON_PHASE1 requires of J7: comment-only
  // passes, real DDL fails, a `--` inside a string literal is not stripped,
  // a missing sync-boundary marker fails, a stale allowlist entry fails
  // naming the line, and the harmless-duplicate ceiling is enforced.
  // --------------------------------------------------------------------

  function withTempScopes(fn) {
    const root = mkdtempSync(join(tmpdir(), 'audit-prod-migration-history-selftest-'))
    try {
      return fn(root)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  function writeScopeFile(root, scopeDir, filename, content) {
    const dir = join(root, scopeDir)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, filename), content)
  }

  // Class C needs no ledger (it never asserts objects), so every case below
  // passes an empty ledgerVersions set — matching --file-only mode.
  const EMPTY_LEDGER = new Set()

  cases.push([
    'THE REGRESSION TEST: a comment-only cross-scope pair produces ZERO Class C violations',
    () =>
      withTempScopes((root) => {
        const body = 'CREATE TABLE public.workflow_definitions (id uuid primary key);\n'
        writeScopeFile(root, 'a', '20261103000000_x.sql', `-- canonical header\n${body}`)
        writeScopeFile(root, 'b', '20261103000000_x.sql', `-- DIFFERENT header, rationale only\n-- and a second comment line\n${body}`)
        const savedCwd = process.cwd()
        process.chdir(root)
        try {
          const { divergentCollisions, harmlessDuplicates } = collectLocalMigrations(
            ['a', 'b'],
            EMPTY_LEDGER,
            new Map(),
          )
          return divergentCollisions.length === 0 && harmlessDuplicates.length === 1
        } finally {
          process.chdir(savedCwd)
        }
      }),
  ])

  cases.push([
    'a real DDL difference beyond comments, above the floor, with NO allowlist entry FAILS',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'a', '20270101000000_x.sql', 'ALTER TABLE t ADD COLUMN a text;\n')
        writeScopeFile(root, 'b', '20270101000000_x.sql', 'ALTER TABLE t ADD COLUMN b text;\n')
        const savedCwd = process.cwd()
        process.chdir(root)
        try {
          const { divergentCollisions } = collectLocalMigrations(
            ['a', 'b'],
            EMPTY_LEDGER,
            new Map(),
            '20260101000000',
          )
          return (
            divergentCollisions.length === 1 &&
            divergentCollisions[0].version === '20270101000000' &&
            divergentCollisions[0].allowlistEntry === null
          )
        } finally {
          process.chdir(savedCwd)
        }
      }),
  ])

  // `--` INSIDE A STRING LITERAL IS NEVER STRIPPED. Two DEFAULTs differing
  // only inside a quoted literal (which itself contains `--`) must NOT be
  // equated — proving the comparator does not treat a mid-literal `--` as a
  // comment opener.
  cases.push([
    '`--` inside a DEFAULT string literal is not stripped — two different DEFAULTs are NOT equated',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'a', '20270102000000_x.sql', "ALTER TABLE t ADD COLUMN x text DEFAULT 'a--b';\n")
        writeScopeFile(root, 'b', '20270102000000_x.sql', "ALTER TABLE t ADD COLUMN x text DEFAULT 'a--c';\n")
        const savedCwd = process.cwd()
        process.chdir(root)
        try {
          const { divergentCollisions } = collectLocalMigrations(
            ['a', 'b'],
            EMPTY_LEDGER,
            new Map(),
            '20260101000000',
          )
          return divergentCollisions.length === 1 && divergentCollisions[0].cmpReason === 'content-differs'
        } finally {
          process.chdir(savedCwd)
        }
      }),
  ])

  cases.push([
    'one copy missing the sync-boundary marker the other carries FAILS as a marker mismatch',
    () =>
      withTempScopes((root) => {
        const body = '\n-- @sync-boundary-below\nSELECT 1;\n'
        writeScopeFile(root, 'a', '20270103000000_x.sql', '-- CANONICAL location' + body)
        writeScopeFile(root, 'b', '20270103000000_x.sql', '-- no marker at all, different shape entirely\nSELECT 1;\n')
        const savedCwd = process.cwd()
        process.chdir(root)
        try {
          const { divergentCollisions } = collectLocalMigrations(
            ['a', 'b'],
            EMPTY_LEDGER,
            new Map(),
            '20260101000000',
          )
          return (
            divergentCollisions.length === 1 &&
            divergentCollisions[0].cmpReason === 'sync-boundary-marker-mismatch'
          )
        } finally {
          process.chdir(savedCwd)
        }
      }),
  ])

  // A STALE ALLOWLIST ENTRY FAILS, NAMING THE LINE. An entry claiming
  // "intentional-duplicate" with a matching `n=` pin does NOT silence content
  // that still differs beyond comments — the failure message must name the
  // allowlist's own line number so a human can go fix it.
  cases.push([
    'an allowlisted version whose content still differs beyond comments FAILS, naming the entry line',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'a', '20270104000000_x.sql', 'ALTER TABLE t ADD COLUMN a text;\n')
        writeScopeFile(root, 'b', '20270104000000_x.sql', 'ALTER TABLE t ADD COLUMN b text;\n')
        const allowlistText = '20270104000000  n=2  intentional-duplicate, CROSS-SCOPE — stale, was never re-verified\n'
        const allowlist = parseAllowlist(allowlistText)
        const savedCwd = process.cwd()
        process.chdir(root)
        try {
          const { divergentCollisions } = collectLocalMigrations(
            ['a', 'b'],
            EMPTY_LEDGER,
            allowlist,
            '20260101000000',
          )
          if (divergentCollisions.length !== 1) return false
          const msg = describeDivergentCollision(divergentCollisions[0])
          return (
            msg.includes(`${ALLOWLIST_RELATIVE_PATH}:1`) &&
            msg.toLowerCase().includes('stale')
          )
        } finally {
          process.chdir(savedCwd)
        }
      }),
  ])

  cases.push([
    'an allowlisted version whose group GREW beyond the pinned count FAILS, naming the mismatch',
    () =>
      withTempScopes((root) => {
        writeScopeFile(root, 'a', '20270105000000_x.sql', 'ALTER TABLE t ADD COLUMN a text;\n')
        writeScopeFile(root, 'b', '20270105000000_x.sql', 'ALTER TABLE t ADD COLUMN b text;\n')
        writeScopeFile(root, 'c', '20270105000000_x.sql', 'ALTER TABLE t ADD COLUMN c text;\n')
        const allowlist = parseAllowlist('20270105000000  n=2  intentional-duplicate — verified against a pair\n')
        const savedCwd = process.cwd()
        process.chdir(root)
        try {
          const { divergentCollisions } = collectLocalMigrations(
            ['a', 'b', 'c'],
            EMPTY_LEDGER,
            allowlist,
            '20260101000000',
          )
          return (
            divergentCollisions.length === 1 &&
            divergentCollisions[0].groupSize === 3 &&
            divergentCollisions[0].allowlistEntry.expectedFiles === 2
          )
        } finally {
          process.chdir(savedCwd)
        }
      }),
  ])

  // THE HARMLESS-DUPLICATE CEILING. A baseline of {findings: N, scanned: M}
  // fails when scanned drops below M (a scope failed to check out) and when
  // findings exceeds N (a new, un-reviewed harmless duplicate appeared).
  cases.push([
    'the harmless-duplicate baseline fails closed when scanned is LESS than banked',
    () => {
      const tmp = join(process.env.TMPDIR || '/tmp', `harmless-dup-baseline-selftest-${process.pid}-a.json`)
      writeFileSync(tmp, JSON.stringify({ findings: 12, scanned: 279 }))
      try {
        const problems = checkHarmlessDuplicatesBaseline({ findings: 12, scanned: 200 }, tmp)
        return problems.length === 1 && problems[0].includes('LESS than banked')
      } finally {
        rmSync(tmp, { force: true })
      }
    },
  ])

  cases.push([
    'the harmless-duplicate baseline fails closed when findings EXCEEDS the banked ceiling',
    () => {
      const tmp = join(process.env.TMPDIR || '/tmp', `harmless-dup-baseline-selftest-${process.pid}-b.json`)
      writeFileSync(tmp, JSON.stringify({ findings: 12, scanned: 279 }))
      try {
        const problems = checkHarmlessDuplicatesBaseline({ findings: 13, scanned: 300 }, tmp)
        return problems.length === 1 && problems[0].includes('banked ceiling')
      } finally {
        rmSync(tmp, { force: true })
      }
    },
  ])

  cases.push([
    'a matching scan (same findings, more scanned) passes the baseline check cleanly',
    () => {
      const tmp = join(process.env.TMPDIR || '/tmp', `harmless-dup-baseline-selftest-${process.pid}-c.json`)
      writeFileSync(tmp, JSON.stringify({ findings: 12, scanned: 279 }))
      try {
        const problems = checkHarmlessDuplicatesBaseline({ findings: 12, scanned: 279 }, tmp)
        return problems.length === 0
      } finally {
        rmSync(tmp, { force: true })
      }
    },
  ])

  cases.push([
    'the SHIPPED harmless-duplicate baseline matches a real Class C run over the 8 shipped scopes',
    () => {
      const shippedScopeDirs = [
        'supabase/migrations',
        'crm7/supabase/migrations',
        'R80.4/supabase/migrations',
        'braden/supabase/migrations',
        'business-suite-unified/supabase/migrations',
        'conduit/supabase/migrations',
        'throughput/supabase/migrations',
        'packages/schema-builder/supabase/migrations',
      ]
      const allowlistPath = join(REPO_ROOT, ALLOWLIST_RELATIVE_PATH)
      const allowlistText = existsSync(allowlistPath) ? readFileSync(allowlistPath, 'utf8') : ''
      const allowlist = parseAllowlist(allowlistText)
      const savedCwd = process.cwd()
      process.chdir(REPO_ROOT)
      try {
        const { divergentCollisions, harmlessDuplicates, filesScanned } = collectLocalMigrations(
          shippedScopeDirs,
          EMPTY_LEDGER,
          allowlist,
          '20260611000000',
        )
        if (divergentCollisions.length !== 0) return false
        const problems = checkHarmlessDuplicatesBaseline({ findings: harmlessDuplicates.length, scanned: filesScanned })
        return problems.length === 0
      } finally {
        process.chdir(savedCwd)
      }
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
    console.error(`audit-prod-migration-history: ${fail}/${cases.length} self-test failure(s)`)
    process.exit(1)
  }
  console.log(`audit-prod-migration-history: self-test OK (${cases.length} cases)`)
  process.exit(0)
}

function describeDivergentCollision(c) {
  const base = `${c.version} [${c.cmpReason}]: ${c.a.scope}/${c.a.name}  vs.  ${c.b.scope}/${c.b.name}`
  if (!c.allowlistEntry) {
    return `${base}\n      no allowlist entry — unreviewed divergent collision. Renumber the newer ` +
      `file, or add a reviewed entry to ${ALLOWLIST_RELATIVE_PATH}.`
  }
  if (c.allowlistEntry.expectedFiles !== null && c.allowlistEntry.expectedFiles !== c.groupSize) {
    return (
      `${base}\n      ${ALLOWLIST_RELATIVE_PATH}:${c.allowlistEntry.lineNumber} is pinned for ` +
      `${c.allowlistEntry.expectedFiles} file(s) but this version now has ${c.groupSize} — the ` +
      'group changed since the entry was verified. Re-verify and update the `n=` count.'
    )
  }
  return (
    `${base}\n      ${ALLOWLIST_RELATIVE_PATH}:${c.allowlistEntry.lineNumber} claims ` +
    `"${c.allowlistEntry.reason.slice(0, 60)}${c.allowlistEntry.reason.length > 60 ? '…' : ''}" but ` +
    'content still differs beyond whole-line comments and blank lines — the entry is STALE. ' +
    'An allowlist entry never silences genuine content divergence; re-verify the pair by hand ' +
    'and correct the entry (or renumber the newer file) before this can pass.'
  )
}

/**
 * {findings, scanned} ceiling for the harmless-duplicate class — the standing
 * denominator discipline (BRIEF_COMMON_PHASE1 rule 2): a baseline must be able
 * to tell "checked nothing" from "found nothing". `scanned` falling below the
 * bank means fewer files were read than last time (a submodule failed to
 * check out) and is ALWAYS a hard failure, independent of `findings`.
 * `findings` is a CEILING, not a ratchet: growing past the bank means an
 * un-reviewed harmless-duplicate collision has appeared and must be reviewed
 * and re-banked with `--write-baseline`; shrinking is fine (a pair was
 * cleaned up) and is reported, not failed.
 */
function checkHarmlessDuplicatesBaseline(current, path = HARMLESS_DUPLICATES_BASELINE_PATH) {
  if (!existsSync(path)) {
    throw new Error(`${path} is missing — run with --write-baseline once to bank it.`)
  }
  const banked = JSON.parse(readFileSync(path, 'utf8'))
  if (typeof banked.findings !== 'number' || typeof banked.scanned !== 'number') {
    throw new Error(`${path} is malformed — expected {findings, scanned}, got ${JSON.stringify(banked)}`)
  }
  const problems = []
  if (current.scanned < banked.scanned) {
    problems.push(
      `scanned ${current.scanned} file(s), banked baseline expects at least ${banked.scanned} — ` +
        'scanned LESS than banked. A scope probably failed to check out; refusing to report a ' +
        'clean sweep over a tree that was not fully scanned.',
    )
  }
  if (current.findings > banked.findings) {
    problems.push(
      `${current.findings} harmless-duplicate version group(s) found, banked ceiling is ` +
        `${banked.findings}. A new one appeared without being reviewed and re-banked — run with ` +
        '--write-baseline once it has been checked by hand.',
    )
  }
  if (current.findings < banked.findings) {
    console.log(
      `(harmless-duplicate count ${current.findings} is BELOW the banked ceiling of ` +
        `${banked.findings} — a pair was cleaned up; the ceiling could be lowered with --write-baseline)`,
    )
  }
  return problems
}

function writeHarmlessDuplicatesBaseline(current) {
  writeFileSync(
    HARMLESS_DUPLICATES_BASELINE_PATH,
    JSON.stringify(
      {
        _comment: [
          'Ceiling for scripts/audit-prod-migration-history.mjs Class C harmless-duplicate ',
          'groups (same version, comment-only or byte-identical across scopes). `scanned` is the ',
          'total local *.sql migration file count across MIGRATION_SCOPE_DIRS and must never go ',
          'DOWN on a healthy run — a drop means a scope failed to check out. `findings` is a ',
          'CEILING on how many harmless-duplicate version groups may exist without being reviewed ',
          'and re-banked; it may shrink for free but growing it requires --write-baseline after a ',
          'human has checked the new group.',
        ],
        generated_by: 'node scripts/audit-prod-migration-history.mjs --write-baseline',
        findings: current.findings,
        scanned: current.scanned,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    `Wrote ${HARMLESS_DUPLICATES_BASELINE_PATH}: findings=${current.findings}, scanned=${current.scanned}`,
  )
}

/** Class C only — no DB access, safe to run on every PR. Returns {failed, divergentCollisions}. */
function runClassC({ writeBaseline }) {
  if (SCOPE_DIRS.length === 0) {
    throw new Error('MIGRATION_SCOPE_DIRS is empty — refusing to audit with zero scope coverage')
  }
  const allowlistPath = join(REPO_ROOT, ALLOWLIST_RELATIVE_PATH)
  const allowlistText = existsSync(allowlistPath) ? readFileSync(allowlistPath, 'utf8') : ''
  const allowlist = parseAllowlist(allowlistText)
  // Class C needs no ledger — it compares LOCAL files against each other, not
  // against production — so every file is "assertable" for object-extraction
  // purposes is irrelevant here; pass an empty ledger set (unused by Class C).
  const { divergentCollisions, harmlessDuplicates, filesScanned } = collectLocalMigrations(
    SCOPE_DIRS,
    new Set(),
    allowlist,
  )

  console.log(
    `Local migration files scanned across ${SCOPE_DIRS.length} scope(s): ${filesScanned}`,
  )
  console.log(`Harmless duplicate version group(s) (comment-only or byte-identical): ${harmlessDuplicates.length}`)
  console.log(`Class C (cross-scope version collision, divergent content) violations: ${divergentCollisions.length}`)

  let failed = false

  if (divergentCollisions.length > 0) {
    failed = true
    console.error(
      '\nDrift class C — the same migration version exists in more than one scope with ' +
        'DIFFERENT SQL beyond whole-line comments and blank lines. schema_migrations keys on ' +
        'version alone across all scopes, so whichever applier runs first silently wins the row ' +
        'and the other migration is skipped forever:',
    )
    for (const c of divergentCollisions.slice(0, 50)) {
      console.error(`  - ${describeDivergentCollision(c)}`)
    }
    if (divergentCollisions.length > 50) {
      console.error(`  ... ${divergentCollisions.length - 50} more omitted`)
    }
  }

  // Writing the baseline only re-banks the harmless-duplicate ceiling — it
  // never launders an ACTUAL Class C failure. A genuine divergent collision
  // above still fails even in --write-baseline mode.
  if (writeBaseline) {
    writeHarmlessDuplicatesBaseline({ findings: harmlessDuplicates.length, scanned: filesScanned })
    return { failed, divergentCollisions }
  }

  const baselineProblems = checkHarmlessDuplicatesBaseline({
    findings: harmlessDuplicates.length,
    scanned: filesScanned,
  })
  if (baselineProblems.length) {
    failed = true
    console.error(`\n${HARMLESS_DUPLICATES_BASELINE_PATH} ceiling violated:`)
    for (const p of baselineProblems) console.error(`  - ${p}`)
  }

  return { failed, divergentCollisions }
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  if (process.argv.includes('--self-test')) selfTest()

  // File-only mode: Class C needs no database and is safe to run on every PR
  // (see .github/workflows/prod-migration-history-audit.yml's pull_request
  // trigger). Classes A and B assert against the live catalogue/ledger and
  // stay on the scheduled/dispatch-only job.
  if (process.argv.includes('--file-only')) {
    const { failed } = runClassC({ writeBaseline: process.argv.includes('--write-baseline') })
    if (!failed) console.log('\nNo Class C drift detected.')
    process.exit(failed ? 1 : 0)
  }

  if (SCOPE_DIRS.length === 0) {
    throw new Error('MIGRATION_SCOPE_DIRS is empty — refusing to audit with zero scope coverage')
  }
  const rows = loadRows(HISTORY_JSON_PATH)
  const catalog = loadCatalog(CATALOG_JSON_PATH)
  const ledgerVersions = new Set(rows.map((r) => r.version).filter(Boolean))

  const allowlistPath = join(REPO_ROOT, ALLOWLIST_RELATIVE_PATH)
  const allowlistText = existsSync(allowlistPath) ? readFileSync(allowlistPath, 'utf8') : ''
  const allowlist = parseAllowlist(allowlistText)

  const {
    migrations: localMigrations,
    divergentCollisions,
    harmlessDuplicates,
    filesScanned,
    objects,
  } = collectLocalMigrations(SCOPE_DIRS, ledgerVersions, allowlist)
  const result = audit({ rows, localMigrations, objects, catalog })

  console.log(`Migration history rows (remote): ${result.totalRemoteRows}`)
  console.log(
    `Local migration files scanned across ${SCOPE_DIRS.length} scope(s): ${filesScanned}`,
  )
  console.log(`Remote rows with a matching local file: ${result.localBacked}`)
  console.log(
    `Remote rows without a local file (ignored — cannot verify from source): ${result.missingLocal}`,
  )
  console.log(
    `Live catalogue: ${catalog.tables.length} tables, ${catalog.functions.length} functions, ${catalog.columns.length} columns`,
  )
  console.log(
    `Class A — objects asserted from RECORDED migrations >= floor ${MIGRATION_FLOOR}: ${result.assertedObjects}; absent: ${absentCount(result.absentObjects)}`,
  )
  console.log(
    `Class B (unrecorded-but-local, >= floor ${MIGRATION_FLOOR || 'unset'}) violations: ${result.unrecordedViolations.length}`,
  )
  console.log(`Harmless duplicate version group(s) (comment-only or byte-identical): ${harmlessDuplicates.length}`)
  console.log(
    `Class C (cross-scope version collision, divergent content) violations: ${divergentCollisions.length}`,
  )

  let failed = false

  if (absentCount(result.absentObjects) > 0) {
    failed = true
    console.error(
      '\nDrift class A — the ledger says these migrations applied, but the objects they ' +
        'create are NOT in the live catalogue. Recorded is not applied:',
    )
    for (const t of result.absentObjects.tables) console.error(`  - missing TABLE     public.${t}`)
    for (const f of result.absentObjects.functions) console.error(`  - missing FUNCTION  public.${f}`)
    for (const c of result.absentObjects.columns) console.error(`  - missing COLUMN    public.${c}`)
    console.error(
      '\nInvestigate before assuming a reporting fault: this check compares the live ' +
        'catalogue, not migration metadata. Do not hand-insert or hand-delete ledger rows.',
    )
  }

  if (divergentCollisions.length > 0) {
    failed = true
    console.error(
      '\nDrift class C — the same migration version exists in more than one scope with ' +
        'DIFFERENT SQL beyond whole-line comments and blank lines. schema_migrations keys on ' +
        'version alone across all scopes, so whichever applier runs first silently wins the row ' +
        'and the other migration is skipped forever:',
    )
    for (const c of divergentCollisions.slice(0, 50)) {
      console.error(`  - ${describeDivergentCollision(c)}`)
    }
    if (divergentCollisions.length > 50) {
      console.error(`  ... ${divergentCollisions.length - 50} more omitted`)
    }
  }

  const baselineProblems = checkHarmlessDuplicatesBaseline({
    findings: harmlessDuplicates.length,
    scanned: filesScanned,
  })
  if (baselineProblems.length) {
    failed = true
    console.error(`\n${HARMLESS_DUPLICATES_BASELINE_PATH} ceiling violated:`)
    for (const p of baselineProblems) console.error(`  - ${p}`)
  }

  if (result.unrecordedViolations.length > 0) {
    failed = true
    console.error(
      `\nDrift class B — local migration file at/above the floor (${MIGRATION_FLOOR}) has NO row ` +
        'in supabase_migrations.schema_migrations at all (applied out-of-band, or never applied):',
    )
    for (const v of result.unrecordedViolations.slice(0, 50)) {
      console.error(`  - ${v.version} (${basename(v.local.path)}) [${v.local.scope}]`)
    }
    if (result.unrecordedViolations.length > 50) {
      console.error(`  ... ${result.unrecordedViolations.length - 50} more omitted`)
    }
    console.error(
      '\nVerify these objects live before assuming this is safe, then close via the floor-gated ' +
        'applier once each migration is confirmed idempotent — do not hand-insert ledger rows ' +
        'and do not run the applier from this workflow.',
    )
  }

  if (!failed) console.log('\nNo drift detected.')
  process.exit(failed ? 1 : 0)
}

try {
  main()
} catch (error) {
  console.error(`audit-prod-migration-history: ${error.message}`)
  process.exit(2)
}
