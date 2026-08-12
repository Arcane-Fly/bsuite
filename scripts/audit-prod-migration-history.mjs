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
 * Usage:
 *   node scripts/audit-prod-migration-history.mjs
 *   node scripts/audit-prod-migration-history.mjs --self-test
 *
 * Inputs (env):
 *   HISTORY_JSON_PATH     ledger rows: [{version, name}]
 *   CATALOG_JSON_PATH     live catalogue: {tables:[], functions:[], columns:["t.c"]}
 *   MIGRATION_FLOOR       versions below this are the reconciliation lane's
 *   MIGRATION_SCOPE_DIRS  comma-separated migration directories
 *
 * Exit 0 clean, 1 drift, 2 usage or internal error.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const HISTORY_JSON_PATH = process.env.HISTORY_JSON_PATH || 'migration-history.json'
const CATALOG_JSON_PATH = process.env.CATALOG_JSON_PATH || 'live-catalog.json'
const MIGRATION_FLOOR = process.env.MIGRATION_FLOOR || ''
const SCOPE_DIRS = (process.env.MIGRATION_SCOPE_DIRS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

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

function collectLocalMigrations(dirs, ledgerVersions) {
  const migrations = new Map()
  const divergentCollisions = []
  const acc = newAccumulator()
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

      const assertable =
        (!MIGRATION_FLOOR || version >= MIGRATION_FLOOR) && ledgerVersions.has(version)
      extractObjects(source, assertable, acc)

      const existing = migrations.get(version)
      if (existing && existing.scope !== dirRel) {
        if (existing.source === source) {
          console.warn(
            `WARNING: duplicate migration ${version} in both ${existing.scope}/${existing.name} ` +
              `and ${dirRel}/${entry.name} — content is byte-identical (currently harmless) but ` +
              'the shared ledger cannot tell the scopes apart. Consolidate to one scope.',
          )
        } else if (!MIGRATION_FLOOR || version < MIGRATION_FLOOR) {
          console.warn(
            `WARNING (pre-floor, not failing): version collision ${version} — ` +
              `${existing.scope}/${existing.name} vs. ${dirRel}/${entry.name} — ` +
              'divergent content, but below MIGRATION_FLOOR; owned by the ' +
              'history-reconciliation lane.',
          )
        } else {
          divergentCollisions.push({
            version,
            a: { scope: existing.scope, name: existing.name },
            b: { scope: dirRel, name: entry.name },
          })
        }
        continue
      }
      migrations.set(version, {
        path,
        name: entry.name,
        scope: dirRel,
        source,
        nonEmpty: isNonEmptySql(source),
      })
    }
  }
  return { migrations, divergentCollisions, objects: netObjects(acc) }
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

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

function main() {
  if (process.argv.includes('--self-test')) selfTest()

  if (SCOPE_DIRS.length === 0) {
    throw new Error('MIGRATION_SCOPE_DIRS is empty — refusing to audit with zero scope coverage')
  }
  const rows = loadRows(HISTORY_JSON_PATH)
  const catalog = loadCatalog(CATALOG_JSON_PATH)
  const ledgerVersions = new Set(rows.map((r) => r.version).filter(Boolean))
  const { migrations: localMigrations, divergentCollisions, objects } = collectLocalMigrations(
    SCOPE_DIRS,
    ledgerVersions,
  )
  const result = audit({ rows, localMigrations, objects, catalog })

  console.log(`Migration history rows (remote): ${result.totalRemoteRows}`)
  console.log(
    `Local migration files scanned across ${SCOPE_DIRS.length} scope(s): ${result.localFilesScanned}`,
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
      '\nDrift class C — the same migration version exists in two scopes with DIFFERENT SQL. ' +
        'schema_migrations keys on version alone across all scopes, so whichever applier runs ' +
        'first silently wins the row and the other migration is skipped forever:',
    )
    for (const c of divergentCollisions.slice(0, 50)) {
      console.error(`  - ${c.version}: ${c.a.scope}/${c.a.name}  vs.  ${c.b.scope}/${c.b.name}`)
    }
    if (divergentCollisions.length > 50) {
      console.error(`  ... ${divergentCollisions.length - 50} more omitted`)
    }
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
