#!/usr/bin/env node
/**
 * check-migration-fk-indexes.mjs
 *
 * Fails when a migration SQL file adds a column with REFERENCES (FK) but
 * does not also create a leading btree index on that column in the same
 * file (or an obvious IF NOT EXISTS index for it).
 *
 * Recurring class R1 / pgTAP A1 — caught 3× in 2026-07 (org_documents,
 * email_message_links, …).
 *
 * Usage:
 *   node scripts/check-migration-fk-indexes.mjs [path/to.sql ...]
 *   node scripts/check-migration-fk-indexes.mjs --changed-files=a.sql,b.sql
 *
 * Exit 0 clean, 1 violations, 2 usage error.
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
let files = []
for (const a of args) {
  if (a.startsWith('--changed-files=')) {
    const raw = a.slice('--changed-files='.length)
    if (raw) files.push(...raw.split(',').map((s) => s.trim()).filter(Boolean))
  } else if (!a.startsWith('-')) {
    files.push(a)
  }
}

if (files.length === 0) {
  console.log('check-migration-fk-indexes: no files — OK')
  process.exit(0)
}

/** @type {string[]} */
const violations = []

for (const file of files) {
  if (!file.endsWith('.sql')) continue
  if (!fs.existsSync(file)) {
    console.warn(`skip missing: ${file}`)
    continue
  }
  const sql = fs.readFileSync(file, 'utf8')
  const upper = sql // keep original for line context

  // Match REFERENCES on a column definition. Capture preceding column name.
  // Examples:
  //   created_by uuid REFERENCES auth.users(id)
  //   email_id uuid not null refs email_messages(id)  -- skip non-REFERENCES keyword
  //   FOREIGN KEY (foo_id) REFERENCES bar(id)
  const colFk =
    /(?:^|,|\()\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+[\w\s\[\]]*?REFERENCES\s+/gim
  const tableFk = /FOREIGN\s+KEY\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*REFERENCES/gim

  /** @type {Set<string>} */
  const fkCols = new Set()
  let m
  while ((m = colFk.exec(upper)) !== null) {
    const col = m[1]
    // skip constraint names mistaken as cols
    if (col.toLowerCase() === 'constraint') continue
    fkCols.add(col)
  }
  while ((m = tableFk.exec(upper)) !== null) {
    fkCols.add(m[1])
  }

  if (fkCols.size === 0) continue

  for (const col of fkCols) {
    // Index present if CREATE INDEX ... (col or col first in list)
    const idxRe = new RegExp(
      String.raw`CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w."]+\s+ON\s+[\w."]+(?:\s*\([^)]*\b${col}\b|\s*\(\s*${col}\b)`,
      'i',
    )
    // Also accept PRIMARY KEY (col) as covering
    const pkRe = new RegExp(
      String.raw`PRIMARY\s+KEY\s*\(\s*${col}\s*\)|${col}\s+[\w\s]*PRIMARY\s+KEY`,
      'i',
    )
    if (!idxRe.test(sql) && !pkRe.test(sql)) {
      violations.push(
        `${file}: FK column "${col}" has REFERENCES but no CREATE INDEX on "${col}" in the same file (pgTAP A1 / R1)`,
      )
    }
  }
}

if (violations.length) {
  console.error('FK index check FAILED:\n' + violations.map((v) => `  - ${v}`).join('\n'))
  process.exit(1)
}
console.log(`check-migration-fk-indexes: OK (${files.length} file(s))`)
process.exit(0)
