#!/usr/bin/env node
/**
 * check-migration-owns-no-transaction.mjs — a migration must not carry its own
 * BEGIN; / COMMIT;, because the applier already wraps it in a transaction.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `.github/workflows/supabase-migrate.yml:455` applies every transactional
 * migration as:
 *
 *     psql "$DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
 *
 * `--single-transaction` opens ONE transaction around the whole file. A `COMMIT;`
 * inside that file ENDS it early. Everything before the COMMIT is then permanent,
 * everything after runs outside any transaction, and the ledger row — written by
 * the workflow AFTER psql returns — is only written if the whole file succeeded.
 *
 * So a migration that fails after its own COMMIT leaves the database HALF
 * MIGRATED and the ledger saying it never ran. The next applier run replays the
 * file from the top, onto a database that already has half of it.
 *
 * This is not hypothetical. On 2026-09-02 the same mechanism fired locally: a
 * rehearsal that wrapped `\i <migration>` in `BEGIN; … ROLLBACK;` to inspect and
 * discard the result instead COMMITTED it, because the migration carried its own
 * COMMIT. The rollback had nothing left to undo and said so, in a WARNING that
 * reads like noise. The DDL reached production.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A RATCHET AND NOT A BAN
 * ---------------------------------------------------------------------------
 * Measured 2026-09-02: 48 of 282 top-level migrations across 8 scopes already do
 * this. Every one of them is APPLIED, and the estate forbids rewriting an applied
 * migration (docs/20260227-dry-one-shot-architecture-v1.04A.md:609). They cannot
 * be fixed, so banning outright would fail forever and teach everyone to skip the
 * gate.
 *
 * Instead the count is BANKED. A NEW offender fails immediately. And if the count
 * DROPS without the bank being lowered, that fails too — a ratchet nobody
 * tightens is a permanent exemption wearing a gate's name.
 *
 * ---------------------------------------------------------------------------
 * PARSING, NOT MATCHING
 * ---------------------------------------------------------------------------
 * precedent__bsuite__20260812__regex_is_forbidden_parse_instead (Tier 2, binding).
 * The hard part is that PL/pgSQL uses `BEGIN` too:
 *
 *     DO $guard$
 *     BEGIN                     <-- NOT a transaction control statement
 *       IF … THEN RETURN; END IF;
 *     END
 *     $guard$;
 *
 * The distinguishing features are that a transaction-control statement is
 * `BEGIN` or `COMMIT` followed by `;`, and that it is not inside a dollar-quoted
 * body. Both are decided here by walking the characters and tracking the
 * dollar-quote tag, never by a pattern that would also match the PL/pgSQL form.
 *
 * USAGE
 *   node scripts/check-migration-owns-no-transaction.mjs [--self-test] [--banked N]
 *
 * EXIT
 *   0  no new offender, and the bank matches
 *   1  a NEW offender, or the bank is stale
 *   2  refused: no migration directory found
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

export const SCOPES = [
  'supabase/migrations',
  'crm7/supabase/migrations',
  'business-suite-unified/supabase/migrations',
  'conduit/supabase/migrations',
  'braden/supabase/migrations',
  'throughput/supabase/migrations',
  'R80.4/supabase/migrations',
  'packages/schema-builder/supabase/migrations',
]

/**
 * The banked count. Lower it in the SAME commit that removes an offender.
 *
 * 48, not the 45 a first grep reported. `grep -lE '^(BEGIN|COMMIT);'` anchors at
 * column 0 and silently misses an INDENTED `  BEGIN;` — three of them, all in
 * packages/schema-builder. A grep count is a hypothesis; the parser is the
 * measurement.
 */
export const BANKED = 48

/**
 * Strip dollar-quoted bodies, line comments and block comments, then report the
 * transaction-control statements that remain. A character walk: `BEGIN` inside a
 * `$tag$ … $tag$` body is PL/pgSQL and is not a transaction.
 */
export function transactionStatements(sql) {
  const out = []
  let i = 0
  let line = 1
  const n = sql.length
  const kept = []            // (line, text) pairs outside any quote or comment
  let cur = ''
  while (i < n) {
    const c = sql[i]
    if (c === '\n') { kept.push([line, cur]); cur = ''; line += 1; i += 1; continue }
    // line comment
    if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i += 1
      continue
    }
    // block comment, nestable in postgres
    if (c === '/' && sql[i + 1] === '*') {
      let depth = 1
      i += 2
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth += 1; i += 2; continue }
        if (sql[i] === '*' && sql[i + 1] === '/') { depth -= 1; i += 2; continue }
        if (sql[i] === '\n') { kept.push([line, cur]); cur = ''; line += 1 }
        i += 1
      }
      continue
    }
    // single-quoted literal
    if (c === "'") {
      i += 1
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue }
        if (sql[i] === "'") { i += 1; break }
        if (sql[i] === '\n') { kept.push([line, cur]); cur = ''; line += 1 }
        i += 1
      }
      continue
    }
    // dollar quote: $tag$ … $tag$
    if (c === '$') {
      let j = i + 1
      while (j < n && sql[j] !== '$' && (sql[j] === '_' || (sql[j] >= 'a' && sql[j] <= 'z') || (sql[j] >= 'A' && sql[j] <= 'Z') || (sql[j] >= '0' && sql[j] <= '9'))) j += 1
      if (j < n && sql[j] === '$') {
        const tag = sql.slice(i, j + 1)
        let k = sql.indexOf(tag, j + 1)
        if (k < 0) k = n
        for (let p = i; p < Math.min(k + tag.length, n); p += 1) {
          if (sql[p] === '\n') { kept.push([line, cur]); cur = ''; line += 1 }
        }
        i = Math.min(k + tag.length, n)
        continue
      }
    }
    cur += c
    i += 1
  }
  kept.push([line, cur])

  for (const [ln, text] of kept) {
    const t = text.trim().toUpperCase()
    // A transaction-control statement is the WHOLE statement: `BEGIN;` / `COMMIT;`
    // (optionally `BEGIN TRANSACTION;` / `END;`). PL/pgSQL's `BEGIN` carries no `;`.
    if (t === 'BEGIN;' || t === 'COMMIT;' || t === 'BEGIN TRANSACTION;' || t === 'END TRANSACTION;' || t === 'START TRANSACTION;') {
      out.push({ line: ln, statement: text.trim() })
    }
  }
  return out
}

function migrationFiles(root) {
  const files = []
  for (const scope of SCOPES) {
    const dir = path.join(root, scope)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.sql')) continue
      files.push({ scope, file: f, full: path.join(dir, f) })
    }
  }
  return files
}

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want })

  t('a bare BEGIN; is a transaction statement',
    transactionStatements('BEGIN;\nALTER TABLE x ADD COLUMN y int;\nCOMMIT;\n').map((s) => s.statement),
    ['BEGIN;', 'COMMIT;'])

  // THE CASE THAT MAKES A REGEX WRONG: PL/pgSQL BEGIN inside a dollar-quoted body.
  t('PL/pgSQL BEGIN inside $tag$ is NOT a transaction',
    transactionStatements('DO $g$\nBEGIN\n  RAISE NOTICE %;\nEND\n$g$;\n'), [])

  t('PL/pgSQL BEGIN inside $$ is NOT a transaction',
    transactionStatements('DO $$\nBEGIN\n  NULL;\nEND\n$$;\n'), [])

  t('a nested EXCEPTION block is still not a transaction',
    transactionStatements('DO $g$\nBEGIN\n  BEGIN\n    NULL;\n  EXCEPTION WHEN others THEN NULL;\n  END;\nEND\n$g$;\n'), [])

  t('BEGIN; in a line comment is ignored',
    transactionStatements('-- BEGIN;\nSELECT 1;\n'), [])

  t('BEGIN; in a block comment is ignored',
    transactionStatements('/* BEGIN;\n   COMMIT; */\nSELECT 1;\n'), [])

  t('BEGIN; in a string literal is ignored',
    transactionStatements("SELECT 'BEGIN;';\n"), [])

  t('a real BEGIN; AFTER a DO block is still caught',
    transactionStatements('DO $g$\nBEGIN\n  NULL;\nEND\n$g$;\nBEGIN;\nSELECT 1;\n').map((s) => s.statement),
    ['BEGIN;'])

  t('START TRANSACTION; counts too',
    transactionStatements('START TRANSACTION;\nSELECT 1;\n').map((s) => s.statement), ['START TRANSACTION;'])

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-migration-owns-no-transaction: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length ? 1 : 0
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())
  const root = process.cwd()
  const bankArg = argv.find((a) => a.startsWith('--banked='))
  const banked = bankArg ? Number(bankArg.split('=')[1]) : BANKED

  const files = migrationFiles(root)
  if (files.length === 0) {
    console.error('::error::no migration directory found — submodules are probably not checked out. That is an ABSENT result, not a clean one.')
    process.exit(2)
  }

  const offenders = []
  for (const f of files) {
    const stmts = transactionStatements(readFileSync(f.full, 'utf8'))
    if (stmts.length) offenders.push({ ...f, stmts })
  }

  console.log(`check-migration-owns-no-transaction: ${files.length} migration(s) across ${SCOPES.filter((s) => existsSync(path.join(root, s))).length} scope(s)`)
  console.log(`  carrying their own transaction control: ${offenders.length}   banked: ${banked}`)

  if (offenders.length > banked) {
    console.error('')
    console.error(`::error::${offenders.length - banked} NEW migration(s) carry their own BEGIN;/COMMIT;.`)
    console.error('  The applier already wraps each migration: psql --single-transaction (supabase-migrate.yml:455).')
    console.error('  A COMMIT; inside the file ENDS that transaction early, so a later failure leaves the')
    console.error('  database half-migrated while the ledger row — written after psql returns — says it')
    console.error('  never ran. Remove the BEGIN;/COMMIT; pair; the applier provides atomicity.')
    console.error('')
    for (const o of offenders.slice(-(offenders.length - banked))) {
      console.error(`    ${o.scope}/${o.file}`)
      for (const s of o.stmts) console.error(`      line ${s.line}: ${s.statement}`)
    }
    process.exit(1)
  }

  if (offenders.length < banked) {
    console.error('')
    console.error(`::error::the bank is STALE: ${offenders.length} offender(s) remain but BANKED is ${banked}.`)
    console.error('  Lower BANKED to ' + offenders.length + ' in the same commit that removed one.')
    console.error('  A ratchet nobody tightens is a permanent exemption wearing a gate\'s name.')
    process.exit(1)
  }

  console.log('  no new offender, and the bank is exact.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
