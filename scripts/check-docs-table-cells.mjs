#!/usr/bin/env node
/**
 * check-docs-table-cells — a table row wider than its header DELETES its own text.
 *
 * A markdown table declares its column count in the header. Every renderer,
 * GitHub included, drops whatever follows the last declared column. So a row
 * with an extra cell is not untidy — it is INVISIBLE TEXT: present in the file,
 * absent from the page, and absent in a way that reads as "there was nothing
 * more to say".
 *
 * Measured 2026-08-19, before the sweep that this guard now holds in place: 88
 * rows across the parent's live docs were hiding their own content, 29 of them
 * in `docs/20260817-estate-completion-ledger-v1.00W.md` — the one document whose
 * entire purpose is to carry evidence — and 31 in the rate-calculation
 * reference, which is domain content. Nothing lints docs/, so it had persisted
 * indefinitely without anything noticing.
 *
 * ONLY THE CONTENT-DESTROYING DIRECTION GATES. A row with too FEW cells renders
 * an empty cell and loses nothing; there are 54 of those and they are reported,
 * not failed. Gating on them would add 54 lines of noise to a check whose whole
 * value is that its findings are always real — and a check that cries about
 * cosmetics is a check that gets muted.
 *
 * Exit 0 clean, 1 on findings, 2 when it could not look.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set(['node_modules', '.git', '.claude', 'dist', 'build', 'coverage', 'archive'])
const SEP = /^\s*:?-{2,}:?\s*$/

/**
 * Split a table line into its cells, or null when the line is not a table row.
 *
 * `\\|` IS AN ESCAPED PIPE AND DOES NOT SPLIT A CELL. A naive `split('|')` reads
 * `tester\\ | platform_admin` as two cells when markdown renders it as one
 * containing a literal pipe — and this repo's docs use that escape freely, in
 * role unions and in prose quoting shell pipelines. The first version of this
 * guard split naively and reported 20 content-dropping rows where markdownlint
 * reported none. Every one of those was the instrument being wrong, not the
 * tree. A guard that cannot read the syntax it polices manufactures findings,
 * which is worse than missing them: it teaches the reader to disbelieve it.
 */
export function cells(line) {
  const raw = line.trimEnd()
  if (!raw.startsWith('|')) return null
  const body = raw.endsWith('|') && raw.length > 1 ? raw.slice(1, -1) : raw.slice(1)
  const out = []
  let cur = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '\\' && body[i + 1] === '|') { cur += '\\|'; i++; continue }
    if (ch === '|') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

/**
 * Rows whose cell count EXCEEDS the header's. Returns {line, declared, actual, dropped}.
 * The `dropped` string is the text a reader never sees — quoting it in the
 * failure is the point, because "row 12 is malformed" does not tell anyone what
 * went missing.
 */
export function overWideRows(text) {
  const lines = text.split('\n')
  const found = []
  for (let i = 0; i < lines.length - 1; i++) {
    const hdr = cells(lines[i])
    const sep = cells(lines[i + 1])
    if (!hdr || !sep || sep.length !== hdr.length || !sep.every((c) => SEP.test(c))) continue
    const declared = hdr.length
    for (let j = i + 2; j < lines.length; j++) {
      const c = cells(lines[j])
      if (!c) break
      if (c.length > declared) {
        found.push({
          line: j + 1,
          declared,
          actual: c.length,
          dropped: c.slice(declared).join(' | ').trim(),
        })
      }
      i = j
    }
  }
  return found
}

export function markdownFiles(root) {
  const out = []
  const walk = (dir) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (SKIP.has(e.name)) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.md')) out.push(p)
    }
  }
  const docs = join(root, 'docs')
  if (existsSync(docs) && statSync(docs).isDirectory()) walk(docs)
  return out.sort()
}

function main(argv) {
  if (argv.includes('--self-test')) return selfTest()

  const files = markdownFiles(REPO_ROOT)
  if (files.length === 0) {
    console.log('::error::Scanned zero markdown files under docs/. A check that examined nothing must not report a pass.')
    return 2
  }
  let rows = 0, tooFew = 0
  const findings = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const line of text.split('\n')) if (cells(line)) rows++
    for (const r of overWideRows(text)) findings.push({ file: relative(REPO_ROOT, f), ...r })
    // reported, never gated — an empty cell loses nothing
    const lines = text.split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      const hdr = cells(lines[i]); const sep = cells(lines[i + 1])
      if (!hdr || !sep || sep.length !== hdr.length || !sep.every((c) => SEP.test(c))) continue
      for (let j = i + 2; j < lines.length; j++) {
        const c = cells(lines[j]); if (!c) { i = j; break }
        if (c.length < hdr.length) tooFew++
      }
    }
  }

  if (findings.length > 0) {
    for (const f of findings) {
      console.log(
        `::error::${f.file}:${f.line} declares ${f.declared} columns but the row has ${f.actual}. ` +
          `A renderer DROPS the overflow, so this text is invisible on the page: "${f.dropped.slice(0, 160)}"`,
      )
    }
    console.log('')
    console.log('Fix by folding the overflow into the widest declared column — usually the prose/evidence one — rather than deleting it.')
    console.log(
      `check-docs-table-cells: ${files.length} markdown file(s) under docs/ examined, ` +
        `${rows} table row(s) read — ${findings.length} row(s) dropping content, ${tooFew} with a harmless empty cell.`,
    )
    return 1
  }
  console.log(
    `check-docs-table-cells: ${files.length} markdown file(s) under docs/ examined, ${rows} ` +
      `table row(s) read — 0 dropping content, ${tooFew} with a harmless empty cell (reported, not gated).`,
  )
  return 0
}

// ── self-test ────────────────────────────────────────────────────────────────
// A guard never observed failing is not known to work.
function selfTest() {
  const results = []
  const check = (name, fn) => {
    try { fn(); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', `${name} — ${e.message}`]) }
  }
  const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: expected ${b}, got ${a}`) }
  const T = (rows) => rows.join('\n')

  const good = T(['| a | b |', '|---|---|', '| 1 | 2 |'])
  const wide = T(['| a | b |', '|---|---|', '| 1 | 2 | 3 |'])
  const narrow = T(['| a | b |', '|---|---|', '| 1 |'])

  check('a well-formed table yields nothing', () => eq(overWideRows(good).length, 0, 'good'))
  check('an over-wide row is caught', () => eq(overWideRows(wide).length, 1, 'wide'))
  check('the DROPPED TEXT is reported, not just the line', () =>
    eq(overWideRows(wide)[0].dropped, '3', 'dropped text'))
  check('a too-narrow row is NOT a finding — it loses nothing', () =>
    eq(overWideRows(narrow).length, 0, 'narrow'))
  check('prose containing a pipe is not read as a table', () =>
    eq(overWideRows('a | b is not a table\n').length, 0, 'prose'))
  check('a table with no separator row is not a table', () =>
    eq(overWideRows(T(['| a | b |', '| 1 | 2 | 3 |'])).length, 0, 'no separator'))
  check('an aligned separator (:---:) still counts as a separator', () =>
    eq(overWideRows(T(['| a | b |', '|:---:|---:|', '| 1 | 2 | 3 |'])).length, 1, 'aligned'))
  check('two tables in one file are both read', () =>
    eq(overWideRows(T([...wide.split('\n'), '', ...wide.split('\n')])).length, 2, 'two tables'))
  check('a row without a trailing pipe is still parsed', () =>
    eq(overWideRows(T(['| a | b |', '|---|---|', '| 1 | 2 | 3'])).length, 1, 'no trailing pipe'))
  check('an ESCAPED pipe does not split a cell', () =>
    eq(cells('| a \\| b | c |').length, 2, 'escaped pipe'))
  check('an escaped pipe does not manufacture a finding', () =>
    eq(overWideRows(T(['| a | b |', '|---|---|', '| x \\| y | z |'])).length, 0, 'escaped in a row'))
  check('a REAL extra pipe is still caught alongside an escaped one', () =>
    eq(overWideRows(T(['| a | b |', '|---|---|', '| x \\| y | z | w |'])).length, 1, 'mixed'))
  check('the live repo has zero content-dropping rows', () => {
    const files = markdownFiles(REPO_ROOT)
    if (files.length === 0) throw new Error('scanned no files')
    let n = 0
    for (const f of files) n += overWideRows(readFileSync(f, 'utf8')).length
    eq(n, 0, 'live tree')
  })

  for (const [s, n] of results) console.log(`  ${s}  ${n}`)
  const failed = results.filter(([s]) => s === 'FAIL').length
  console.log(
    `check-docs-table-cells --self-test: ${results.length} cases exercised in BOTH directions ` +
      `(well-formed passes, over-wide caught with its dropped text quoted, too-narrow deliberately ` +
      `not a finding, prose-with-a-pipe rejected) — ${results.length - failed} passed, ${failed} failed.`,
  )
  return failed === 0 ? 0 : 1
}

const invokedDirectly = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) process.exit(main(process.argv.slice(2)))
