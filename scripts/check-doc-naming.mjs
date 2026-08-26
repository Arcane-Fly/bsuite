#!/usr/bin/env node
/**
 * bsuite#1606 — documentation filename conventions.
 *
 * WHAT CHANGED, AND WHY IT MATTERED
 * The original gate opened with `if (!/^\d{8}-/.test(name)) continue`, so a file
 * that did not begin with eight digits was skipped in silence. That is not a
 * narrow scope, it is a blind spot: the gate could only ever police files that
 * had already adopted the convention, and reported "OK" over 65 files that had
 * not. Two consequences were measured on 2026-08-25:
 *
 *   1. Four files named `2026-05-04-<slug>.md` — the SAME date, one hyphen
 *      format away from the convention — were invisible. A near-miss reads to a
 *      human as conformant and to the gate as absent, which is the worst pair.
 *   2. Files carrying a completion word in the name (`QUEUE-COMPLETE.md`) were
 *      never classified at all, in a corpus whose whole problem is unearned
 *      completion claims.
 *
 * A gate that cannot see a file cannot fail on it, and "scanned 350, OK" reads
 * as coverage. So this now classifies EVERY markdown file under every docs root
 * into exactly one family, and anything it cannot place is a violation.
 *
 * WHAT IS DELIBERATELY *NOT* CHECKED
 * Completion words in filenames are not banned. `20260809-shipped-to-production`
 * is a document ABOUT shipping, not a document claiming to be finished, and no
 * regex separates those two. The status letter — the `F` of the W/D/R/A/F
 * vocabulary — is the completion marker, and it lives in the version suffix
 * where this gate already validates it. Banning the word would condemn correct
 * filenames while leaving `-v1.00F` unchecked, which is precisely backwards.
 *
 * Usage:
 *   node scripts/check-doc-naming.mjs [--warn-only] [--all]
 *   node scripts/check-doc-naming.mjs --self-test
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { NAVIGATIONAL_FILES as SKIP_FILE } from './lib/doc-conventions.mjs'

const argv = process.argv.slice(2)
const warnOnly = argv.includes('--warn-only')
const showAll = argv.includes('--all')
const selfTest = argv.includes('--self-test')
const root = '.'

/* ---------------- families ---------------- */

/** The convention: 20260810-plan-dashboard-retirement-v1.00F.md */
const DATED = /^\d{8}-[a-z0-9][a-z0-9.-]*-v\d+\.\d+[A-Za-z]?\.md$/i
/** Looks dated to a human, invisible to a `^\d{8}` scanner. */
const NEAR_MISS_DATE = /^\d{4}[-.]\d{2}[-.]\d{2}[-.]/
/** Architecture decision records keep their own numbering. */
const ADR = /^(ADR-)?\d{4}-[a-z0-9][a-z0-9.-]*\.md$/i
/** Standing documents, regenerated in place, deliberately undated. */
const STANDING = /^[A-Z][A-Z0-9_]*(-[A-Z0-9_]+)*\.md$/

const SKIP_DIR = new Set(['archive', 'node_modules', 'dist', '.git', 'dashboard'])
/* The navigational-file set is shared with check-doc-classification — one definition,
   so the two gates cannot disagree about what counts as an authored document. */
/** Directories whose contents are external or verbatim material, not authored docs. */
const FREEFORM_DIR = new Set(['references', 'reference', 'recovered', 'nav'])
/** A directory that carries the date itself: docs/20260428-operator-verification/03-x.md.
 *  The convention's purpose — knowing when a document was written without opening it —
 *  is served by the directory, so requiring it again on every part is noise. */
const DATED_DIR = /^\d{8}-/
const NUMBERED_PART = /^\d{2,3}-[a-z0-9][a-z0-9.-]*\.md$/i

/**
 * Classify one file. Returns a family name, or a violation code prefixed `!`.
 * `segs` is the path split into directory segments, nearest-first.
 */
export function classify(name, segs = []) {
  const lower = name.toLowerCase()
  if (SKIP_FILE.has(lower)) return 'skip'
  if (segs.some((s) => FREEFORM_DIR.has(s.toLowerCase()))) return 'freeform'
  if (NEAR_MISS_DATE.test(name)) return '!near-miss-date'
  if (/^\d{8}-/.test(name)) return DATED.test(name) ? 'dated' : '!dated-malformed'
  if (segs.some((s) => s.toLowerCase() === 'adr') && ADR.test(name)) return 'adr'
  if (DATED_DIR.test(segs[0] || '') && NUMBERED_PART.test(name)) return 'dated-dir-part'
  if (STANDING.test(name)) return 'standing'
  return '!unclassified'
}

/* ---------------- roots, derived not typed ---------------- */

function docRoots() {
  const roots = ['docs']
  try {
    const out = execFileSync('git', ['config', '--file', '.gitmodules', '--get-regexp', 'path'], {
      encoding: 'utf8',
    })
    for (const line of out.split('\n')) {
      const p = line.trim().split(/\s+/)[1]
      if (p) roots.push(path.join(p, 'docs'))
    }
  } catch {
    /* not a checkout with submodules — the parent's own docs still apply */
  }
  return roots
}

/* ---------------- self-tests ---------------- */

if (selfTest) {
  const cases = [
    /* the convention */
    ['20260810-plan-dashboard-retirement-v1.00F.md', [], 'dated'],
    ['20260227-dry-one-shot-architecture-v1.04A.md', [], 'dated'],
    ['20260812-x-v1.0.md', [], 'dated'],
    /* malformed but visible to the old gate */
    ['20260810-no-version.md', [], '!dated-malformed'],
    ['20260810-Bad_Case-v1.00W.md', [], '!dated-malformed'],
    /* THE BLIND SPOT: dated to a human, invisible to `^\d{8}` */
    ['2026-05-04-adopt-dnd-dashboard.md', ['plans'], '!near-miss-date'],
    ['2026-05-04-shadcn-init.md', ['plans'], '!near-miss-date'],
    ['2026.05.04-thing.md', ['plans'], '!near-miss-date'],
    /* a near-miss inside a freeform dir is still freeform — dir wins */
    ['2026-05-04-thing.md', ['references'], 'freeform'],
    /* ADR numbering, only inside an adr/ directory */
    ['ADR-0001-page-builder-ownership.md', ['adr'], 'adr'],
    ['0004-stp-xero-passthrough.md', ['adr'], 'adr'],
    ['ADR-0001-page-builder-ownership.md', ['plans'], '!unclassified'],
    /* standing regenerated documents */
    ['CONSISTENCY-REPORT.md', [], 'standing'],
    ['QUEUE-COMPLETE.md', [], 'standing'],
    ['NEW_ISSUES_FOUND.md', [], 'standing'],
    ['FEATURE-SURFACE.md', [], 'standing'],
    /* freeform directories */
    ['Evidence Guide for GTOs.md', ['references'], 'freeform'],
    ['gleaming-fluttering-coral.md', ['recovered'], 'freeform'],
    ['mapd-api-integration-best-practices-guide.md', ['reference'], 'freeform'],
    /* skipped by name, in any directory */
    ['README.md', [], 'skip'],
    ['index.md', ['plans'], 'skip'],
    /* the genuine gap the old gate could not see */
    ['agent-compliance-enforcement-refined.md', ['plans'], '!unclassified'],
    /* SCREAMING case must be fully screaming — a mixed name is not standing */
    ['Consistency-Report.md', [], '!unclassified'],
    /* numbered parts of a dated bundle — the DIRECTORY carries the date */
    ['03-oauth-state-secret.md', ['20260428-operator-verification'], 'dated-dir-part'],
    ['05-tga-sync-enabled.md', ['20260428-operator-verification'], 'dated-dir-part'],
    /* ...but only when the directory is dated, and only for numbered parts */
    ['03-oauth-state-secret.md', ['plans'], '!unclassified'],
    ['oauth-state-secret.md', ['20260428-operator-verification'], '!unclassified'],
    /* generated nav output */
    ['findings.md', ['nav'], 'freeform'],
    /* a completion word in a name is NOT a violation on its own */
    ['20260809-shipped-to-production-v1.00W.md', [], 'dated'],
    ['20260227-feature-map-complete-v1.00W.md', ['features'], 'dated'],
  ]
  let pass = 0
  const fails = []
  for (const [name, segs, want] of cases) {
    const got = classify(name, segs)
    if (got === want) pass++
    else fails.push(`  ${name} in [${segs}] -> ${got}, wanted ${want}`)
  }
  /* the roots must be derived, never a typed list that rots */
  const roots = docRoots()
  if (!roots.includes('docs')) fails.push('  docRoots() lost the parent docs root')
  if (roots.length < 2) fails.push('  docRoots() found no submodule roots — derivation is broken')
  console.log(`check-doc-naming self-test: ${pass}/${cases.length} classification cases pass`)
  if (fails.length) {
    console.error('FAILED:')
    for (const f of fails) console.error(f)
    process.exit(1)
  }
  console.log(`check-doc-naming self-test: roots derived = ${roots.join(' ')}`)
  console.log('check-doc-naming self-test: OK')
  process.exit(0)
}

/* ---------------- scan ---------------- */

const counts = {}
const violations = []
const adrs = []   /* { dir, num, file } — for the collision + index checks below */
let scanned = 0

function walk(dir, segs) {
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
      walk(p, [ent.name, ...segs])
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      const fam = classify(ent.name, segs)
      if (fam === 'adr') {
        const m = ent.name.match(/^(?:ADR-)?(\d{4})-/i)
        if (m) adrs.push({ dir, num: m[1], file: ent.name })
      }
      counts[fam] = (counts[fam] || 0) + 1
      if (fam === 'skip') continue
      scanned += 1
      if (fam.startsWith('!')) violations.push({ p, fam })
    }
  }
}

const roots = docRoots()
/* Per-root accounting. A whole submodule can be an EMPTY DIRECTORY — that is what
 * an uninitialised submodule is — and `fs.existsSync` says yes to it. Counting
 * only the total hides that: the parent alone supplies enough files to clear any
 * global floor, so six missing roots still read as a clean estate. Each root is
 * therefore checked on its own. */
const perRoot = []
for (const d of roots) {
  const before = scanned
  const full = path.join(root, d)
  const exists = fs.existsSync(full)
  if (exists) walk(full, [])
  perRoot.push({ root: d, exists, files: scanned - before })
}

const empty = perRoot.filter((r) => r.files === 0)
if (empty.length) {
  console.error('check-doc-naming: REFUSING to report — these docs roots contributed no files:')
  for (const r of empty) {
    console.error(`  ${r.root.padEnd(34)} ${r.exists ? 'directory exists but holds no .md — submodule not initialised' : 'directory absent'}`)
  }
  console.error('\n  Run `git submodule update --init` (CI: checkout with submodules: recursive).')
  console.error('  A root that contributes nothing is unmeasured, not clean.')
  process.exit(2)
}

if (scanned < 50) {
  console.error(`check-doc-naming: REFUSING to report — only ${scanned} files seen across ${roots.length} roots.`)
  process.exit(2)
}

console.log(`check-doc-naming: classified ${scanned} markdown file(s) across ${roots.length} docs root(s)`)
for (const r of perRoot) console.log(`    ${r.root.padEnd(34)} ${String(r.files).padStart(4)}`)
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(20)} ${String(v).padStart(4)}`)
}

const byFam = {}
for (const v of violations) (byFam[v.fam] = byFam[v.fam] || []).push(v.p)

/* ---------------- ADR numbering and index integrity ----------------
 * ADR-0008 was ratified under the number 0004, collided with the real ADR-0004,
 * LOST ITS INDEX ROW, and was unreachable for three months. Two invariants would
 * have caught it on the day, and neither was enforced anywhere. Numbers are scoped
 * PER DIRECTORY, because crm7 keeps its own adr/ with its own sequence. */
const adrProblems = []
const byDir = {}
for (const a of adrs) (byDir[a.dir] = byDir[a.dir] || []).push(a)

for (const [dir, list] of Object.entries(byDir)) {
  const seen = {}
  for (const a of list) (seen[a.num] = seen[a.num] || []).push(a.file)
  for (const [num, files] of Object.entries(seen)) {
    if (files.length > 1) adrProblems.push(`${dir}: number ${num} used by ${files.length} files — ${files.join(', ')}`)
  }
  const indexFile = ['README.md', 'index.md', 'INDEX.md'].map((n) => path.join(dir, n)).find((p2) => fs.existsSync(p2))
  if (!indexFile) {
    adrProblems.push(`${dir}: no README.md / index.md — an ADR nobody can find is an ADR nobody reads`)
    continue
  }
  const index = fs.readFileSync(indexFile, 'utf8')
  for (const a of list) {
    const stem = a.file.replace(/\.md$/, '')
    if (!index.includes(stem)) adrProblems.push(`${indexFile}: no row for ${a.file}`)
  }
}

if (adrProblems.length) {
  console.error(`\nADR integrity (${adrProblems.length}):`)
  for (const p2 of adrProblems) console.error(`  - ${p2}`)
  console.error('\n  ADR-0008 was ratified as "ADR-0004", collided, lost its index row and was')
  console.error('  unreachable for three months. These two invariants are what would have caught it.')
} else if (adrs.length) {
  console.log(`  ADR integrity: ${adrs.length} record(s) across ${Object.keys(byDir).length} directory(ies) — no number collisions, every one indexed`)
}

if (violations.length || adrProblems.length) {
  /* No baseline, no ratchet, no allowance. The estate measured ZERO violations
   * across 415 files on 2026-08-25, and a floor of zero needs no bookkeeping —
   * a ratchet file here would only be a place for the number to drift upward.
   * If this fires, a filename was added that no declared family accepts. */
  process.exit(warnOnly ? 0 : 1)
}
console.log('check-doc-naming: OK')
process.exit(0)
