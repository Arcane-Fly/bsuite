#!/usr/bin/env node
/**
 * bsuite#1606 — dated docs must match practical pattern:
 *   YYYYMMDD-kebab-vMAJOR.MINOR[STATUS].md
 *
 * Scans docs folders excluding archive and node_modules.
 * Only files that START with 8 digits are enforced.
 *
 * Usage: node scripts/check-doc-naming.mjs [--warn-only]
 */
import fs from 'node:fs'
import path from 'node:path'

const warnOnly = process.argv.includes('--warn-only')
const root = '.'

const PRACTICAL = /^\d{8}-[a-z0-9][a-z0-9.-]*-v\d+\.\d+[A-Za-z]?\.md$/i

const SKIP_DIR = new Set(['archive', 'node_modules', 'dist', '.git', 'dashboard'])
const SKIP_FILE = new Set([
  'readme.md',
  'status.md',
  'contributing.md',
  'index.md',
  'parent-docs.md',
])

const bad = []
let scanned = 0

function walk(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (SKIP_DIR.has(ent.name.toLowerCase())) continue
      walk(p)
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      if (SKIP_FILE.has(ent.name.toLowerCase())) continue
      if (!/^\d{8}-/.test(ent.name)) continue
      scanned += 1
      if (!PRACTICAL.test(ent.name)) bad.push(p)
    }
  }
}

for (const d of [
  'docs',
  'crm7/docs',
  'conduit/docs',
  'business-suite-unified/docs',
  'R80.3/docs',
  'braden/docs',
  'throughput/docs',
]) {
  if (fs.existsSync(path.join(root, d))) walk(path.join(root, d))
}

console.log(`check-doc-naming: scanned ${scanned} dated markdown files`)
if (bad.length) {
  console.error(`Violations (${bad.length}):`)
  for (const f of bad.slice(0, 40)) console.error('  -', f)
  if (bad.length > 40) console.error(`  ... +${bad.length - 40} more`)
  process.exit(warnOnly ? 0 : 1)
}
console.log('check-doc-naming: OK')
process.exit(0)
