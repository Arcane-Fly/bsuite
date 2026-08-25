#!/usr/bin/env node
/**
 * Every migration-shaped SQL file lives in a scope the applier can READ.
 *
 * WHY THIS EXISTS. On 2026-08-24 a reconciliation concluded that every migration in
 * the estate was accounted for — 877 files, 748 ledger rows, exactly one pending. It
 * was right about the pending count and wrong about completeness, because it derived
 * its scope list from `.gitmodules` and the applier declares its own.
 *
 * Two directories hold git-tracked, migration-shaped DDL that NO declared scope
 * covers:
 *
 *     business-suite-unified/database/migrations
 *     business-suite-unified/packages/db/{migrations,sql,repeatable}
 *
 * Between them they CREATE 53 tables. Eleven of those are LIVE in production —
 * `email_integrations`, `engagements`, `whs_records`, `content_pages`,
 * `email_messages`, `email_templates`, `email_audit_log`, `bi_metrics`,
 * `charge_calculations`, `content_blocks`, `host_contracts`. Nothing is broken
 * today, but no replayable path builds them: `crm7/supabase/migrations/baseline/`
 * holds a dump that also creates several, and the applier globs with `-maxdepth 1`
 * so it never descends into it.
 *
 * The accurate class is "rebuildable only from a snapshot nothing replays".
 *
 * WHAT THIS GUARD DOES. It fails when a migration-shaped SQL file appears OUTSIDE
 * the applier's declared scopes and is not allowlisted. It does not move anything —
 * the two directories above are recorded as known exceptions with their reason, so
 * the gap is visible in CI rather than rediscovered by someone auditing the ledger.
 * A NEW one is a failure, because that is the moment it is cheap to fix.
 *
 * Usage: node scripts/check-migration-scope-coverage.mjs
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const WORKFLOW = path.join(ROOT, '.github/workflows/supabase-migrate.yml')

/**
 * Known, deliberate exceptions. Each needs a reason — an allowlist that absorbs
 * whatever the scan reports stops being an allowlist.
 */
const ALLOWED = [
  {
    prefix: 'business-suite-unified/database/migrations/',
    reason:
      'Superseded consolidated-schema attempt (V0001..V0007, CONSOLIDATED_*). 21 of its ' +
      'tables are ABSENT from production; the rest are covered by the scanned BSU scope. ' +
      'Retained as the only record of how the early schema was built.',
  },
  {
    prefix: 'braden/MANUAL_FIX_ADMIN_ACCESS.sql',
    reason:
      'A 414-line RUNBOOK, not a migration — "run this in the Supabase SQL Editor to fix ' +
      'the 403 Forbidden errors". It drops and recreates 18 policies on admin_users. It is ' +
      'not in a scope because it is not meant to apply automatically, and it should not be.',
  },
  {
    prefix: 'business-suite-unified/database/schema.sql',
    reason:
      'DESTRUCTIVE SETUP SCRIPT, kept only as history. It DROPs ... CASCADE three tables ' +
      'that are LIVE with data: business_suite_plans (4 rows), business_suite_subscriptions ' +
      '(1 row), user_profiles (14 rows). Running it would destroy subscription and profile ' +
      'data plus everything depending on them. It must never enter a declared scope.',
  },
  {
    prefix: 'business-suite-unified/packages/db/',
    reason:
      'Holds the ONLY CREATE for 11 tables that are live in production, including ' +
      'email_integrations. Not deleted — deleting it would leave those tables with no ' +
      'recorded origin at all. Needs a decision: promote to a real scanned scope, or ' +
      'convert to a documented baseline.',
  },
]

/** Directories that are not migrations even though they hold .sql. */
const NOT_MIGRATIONS = [
  /(^|\/)supabase\/tests\//,
  /(^|\/)supabase\/seed\//,
  /(^|\/)scripts\//,
  /(^|\/)\.claude\/worktrees\//,
  /(^|\/)node_modules\//,
]

function declaredScopes() {
  if (!existsSync(WORKFLOW)) {
    console.error(`check-migration-scope-coverage: cannot read ${WORKFLOW}`)
    process.exit(2)
  }
  const yml = readFileSync(WORKFLOW, 'utf8')
  // The applier's own path filters ARE the declaration. Reading them here rather
  // than restating the list keeps this guard honest when a scope is added.
  const scopes = new Set()
  for (const m of yml.matchAll(/^\s*-\s*'([^']*supabase\/migrations\/\*\*)'/gm)) {
    scopes.add(m[1].replace(/\*\*$/, ''))
  }
  return [...scopes]
}

function trackedSqlFiles() {
  const out = execFileSync('git', ['ls-files', '--recurse-submodules', '*.sql'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return out.split('\n').filter(Boolean)
}

/** A file is migration-shaped if it creates or alters schema objects. */
function isMigrationShaped(rel) {
  const abs = path.join(ROOT, rel)
  if (!existsSync(abs)) return false
  let sql
  try {
    sql = readFileSync(abs, 'utf8')
  } catch {
    return false
  }
  return /\b(create\s+(table|type|function|policy|index|schema)|alter\s+table)\b/i.test(sql)
}

const scopes = declaredScopes()
if (scopes.length === 0) {
  console.error('check-migration-scope-coverage: parsed 0 declared scopes — refusing to pass')
  process.exit(2)
}

const files = trackedSqlFiles()
const offenders = []
let inScope = 0
let skipped = 0
let allowed = 0

for (const rel of files) {
  if (NOT_MIGRATIONS.some((re) => re.test(rel))) {
    skipped++
    continue
  }
  if (scopes.some((s) => rel.startsWith(s))) {
    inScope++
    continue
  }
  if (!isMigrationShaped(rel)) {
    skipped++
    continue
  }
  const hit = ALLOWED.find((a) => rel.startsWith(a.prefix))
  if (hit) {
    allowed++
    continue
  }
  offenders.push(rel)
}

console.log(
  `check-migration-scope-coverage: ${files.length} tracked .sql file(s); ` +
    `${inScope} inside the ${scopes.length} declared scope(s); ` +
    `${allowed} allowlisted outside them; ${skipped} not migration-shaped.`,
)

if (offenders.length > 0) {
  console.error('')
  console.error('MIGRATION-SHAPED SQL THE APPLIER CANNOT READ:')
  for (const f of offenders) console.error(`  ✗ ${f}`)
  console.error('')
  console.error('The applier only reads these scopes:')
  for (const s of scopes) console.error(`    ${s}`)
  console.error('')
  console.error('A file outside them never applies, and nothing reports that it did not.')
  console.error('Move it into a declared scope, or add it to ALLOWED in this script WITH A')
  console.error('REASON. Do not add it without one — an allowlist that absorbs whatever the')
  console.error('scan reports stops being an allowlist.')
  process.exit(1)
}

if (allowed > 0) {
  console.log('')
  console.log('Known exceptions, carried deliberately:')
  for (const a of ALLOWED) console.log(`  · ${a.prefix}\n      ${a.reason}`)
}

/*
 * A file kept OUT of a scope for safety is more dangerous than one merely stale:
 * nothing stops a person opening it and running it by hand. Name the destructive
 * ones every run, so "we allowlisted it" never quietly becomes "we forgot it bites".
 */
const destructive = []
for (const rel of files) {
  if (!ALLOWED.some((a) => rel.startsWith(a.prefix))) continue
  const abs = path.join(ROOT, rel)
  if (!existsSync(abs)) continue
  let sql
  try {
    sql = readFileSync(abs, 'utf8')
  } catch {
    continue
  }
  const targets = [...sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([a-z0-9_."]+)/gi)].map(
    (m) => m[1].replace(/"/g, ''),
  )
  const truncates = [...sql.matchAll(/truncate\s+(?:table\s+)?([a-z0-9_."]+)/gi)].map((m) => m[1])
  if (targets.length || truncates.length) {
    destructive.push({ rel, targets: [...new Set([...targets, ...truncates])] })
  }
}

if (destructive.length > 0) {
  console.log('')
  console.log('⚠  ALLOWLISTED FILES THAT DESTROY DATA IF RUN BY HAND:')
  for (const d of destructive) {
    console.log(`   ${d.rel}`)
    console.log(`     drops/truncates: ${d.targets.join(', ')}`)
  }
  console.log('   These are outside every applier scope ON PURPOSE. Nothing runs them')
  console.log('   automatically — and nothing stops a person pasting one into a SQL editor.')
}

process.exit(0)
