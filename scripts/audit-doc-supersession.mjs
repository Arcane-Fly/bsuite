#!/usr/bin/env node
/**
 * Which documents are SUPERSEDED — limb (a) of the operator's completion bar.
 *
 * The completion auditor answers limb (b): does the doc cite a gate that exists
 * and passes. It says outright that it cannot answer limb (a), because that is a
 * judgement about CONTENT. This finds the cases where the corpus states the
 * judgement itself, so they can be adjudicated instead of read one at a time.
 *
 * FOUR SIGNALS, strongest first. Each is a claim made BY A DOCUMENT, not by me.
 *
 *   declared    a newer doc's frontmatter `supersedes:` names this path
 *   stated      a newer doc's prose says it supersedes this one
 *   same-slug   a newer doc shares this one's slug (date/version differ)
 *   self        this doc's own banner says it is superseded/demoted/retired
 *
 * Deliberately NOT a verdict. Supersession is limb (a) alone; a superseded doc
 * still needs limb (b) — the thing it describes proven in production — before it
 * can carry `F`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { compareRatchet, writeBaseline } from './lib/ratchet.mjs'

const SELF = fileURLToPath(import.meta.url)
const BASELINE_FILE = 'docs/.supersession-baseline.json'

if (process.argv.includes('--self-test')) {
  const PROSE = /[Ss]upersedes?\s+(?:it|this)?[^\n]{0,120}?([0-9]{8}-[A-Za-z0-9.-]+\.md)/
  const checks = [
    ['lowercase filename matches', PROSE.test('supersedes 20260817-a-b-v1.00.md')],
    // These three FAIL against the shipped `[a-z0-9.-]+` class. Every real
    // estate document is one of these shapes.
    ['UPPERCASE W marker matches', PROSE.test('supersedes 20260817-a-b-v1.00W.md')],
    ['UPPERCASE F marker matches', PROSE.test('supersedes 20260814-a-b-v2.00F.md')],
    ['UPPERCASE D marker matches', PROSE.test('supersedes 20260822-a-b-v1.00D.md')],
    // still bounded: a claim and a filename on DIFFERENT lines is not a claim
    ['newline still separates', !PROSE.test('supersedes the register\n20260817-a-b-v1.00W.md')],
  ]
  let bad = 0
  for (const [n, ok] of checks) if (!ok) { console.error(`  SELF-TEST FAIL: ${n}`); bad++ }
  console.log(`  self-test: ${bad ? `${bad} FAILED` : `${checks.length}/${checks.length} pass`}`)

  // ── fixture ratchet self-test — proves the RATCHET, not just the regex ──
  //
  // The checks above pin what the PROSE detector matches. They never proved the
  // gate can actually FAIL a build — before 2026-09-03 this script had exactly
  // one process.exit, guarded by --self-test itself, so wiring it into a
  // workflow unchanged would have produced an always-green check regardless of
  // findings. This invokes THIS SAME FILE as a subprocess over a fixture tree:
  // first to bank a clean baseline, then to prove a planted `supersedes:`
  // declaration breaks the equality ratchet, then that a clean fixture (with a
  // matching bank) passes again.
  const fixtureChecks = []
  const fcheck = (name, ok) => fixtureChecks.push([name, ok])
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'doc-supersession-selftest-'))
  try {
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true })
    // DELIBERATELY DIFFERENT SLUGS — same-slug is its OWN supersession signal
    // (tested separately in the estate), and if these shared one the fixture's
    // "clean" baseline would already carry a finding before anything is planted.
    const older = path.join(dir, 'docs', '20260101-topic-a-v1.00F.md')
    const newer = path.join(dir, 'docs', '20260102-topic-b-v1.00F.md')
    fs.writeFileSync(older, '# Topic A\n\nIndependent content.\n')
    fs.writeFileSync(newer, '# Topic B\n\nA plain doc, not yet declaring supersession.\n')

    const run = () => {
      try { execFileSync('node', [SELF], { cwd: dir, encoding: 'utf8', stdio: 'pipe' }); return 0 }
      catch (e) { return e.status ?? 1 }
    }
    const bank = () => {
      try { execFileSync('node', [SELF, '--update-baseline'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' }); return 0 }
      catch (e) { return e.status ?? 1 }
    }

    fcheck('unarmed ratchet does not pass', run() !== 0)
    fcheck('--update-baseline exits 0', bank() === 0)
    fcheck('--update-baseline wrote the baseline file', fs.existsSync(path.join(dir, BASELINE_FILE)))
    fcheck('clean fixture passes once banked', run() === 0)

    // PLANT A VIOLATION: the newer doc declares it supersedes the older one.
    fs.writeFileSync(newer, '---\nsupersedes:\n  - 20260101-topic-a-v1.00F.md\n---\n\n# Topic B\n')
    fcheck('planted supersession declaration fails the equality ratchet', run() !== 0)

    // Remove the violation -> back to the banked count -> passes.
    fs.writeFileSync(newer, '# Topic B\n\nA plain doc, not yet declaring supersession.\n')
    fcheck('restored-clean fixture passes again', run() === 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  let fbad = 0
  for (const [name, ok] of fixtureChecks) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`)
    if (!ok) fbad++
  }
  console.log(`\n  ${fixtureChecks.length - fbad}/${fixtureChecks.length} fixture ratchet self-tests pass`)

  process.exit(bad || fbad ? 1 : 0)
}


const roots = ['docs']
try {
  const out = execFileSync('git', ['config', '--file', '.gitmodules', '--get-regexp', 'path'], { encoding: 'utf8' })
  for (const l of out.split('\n')) { const p = l.trim().split(/\s+/)[1]; if (p) roots.push(path.join(p, 'docs')) }
} catch {}

const SKIP_DIR = new Set(['archive', 'node_modules', 'dist', '.git', 'dashboard', 'recovered'])
const docs = []
function walk(dir) {
  let e; try { e = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const x of e) {
    const p = path.join(dir, x.name)
    if (x.isDirectory()) { if (!SKIP_DIR.has(x.name.toLowerCase())) walk(p) }
    else if (x.name.endsWith('.md')) docs.push(p)
  }
}
// Tracked PER ROOT so the presence guard can require a minimum document count
// per app — the same split this scan already computes, not a second walk that
// could disagree with it.
const perRoot = {}
for (const r of roots) {
  if (!fs.existsSync(r)) { perRoot[r] = 0; continue }
  const before = docs.length
  walk(r)
  perRoot[r] = docs.length - before
}

const dateOf = (p) => { const m = path.basename(p).match(/^(\d{8})-/); return m ? m[1] : null }
const slugOf = (p) => {
  const m = path.basename(p).match(/^\d{8}-(.+?)-v\d+\.\d+[A-Za-z]?\.md$/i)
  return m ? m[1].toLowerCase() : null
}
const statusOf = (p) => { const m = path.basename(p).match(/-v\d+\.\d+([A-Za-z])\.md$/i); return m ? m[1].toUpperCase() : null }

const body = new Map()
for (const d of docs) { try { body.set(d, fs.readFileSync(d, 'utf8')) } catch { body.set(d, '') } }

const findings = new Map()  // path -> [{signal, by, detail}]
const add = (p, f) => { if (!findings.has(p)) findings.set(p, []); findings.get(p).push(f) }

for (const d of docs) {
  const s = body.get(d)
  const base = path.basename(d)

  /* declared: frontmatter supersedes: */
  const fm = s.startsWith('---') ? s.slice(0, s.indexOf('\n---', 3) + 4) : ''
  const supBlock = fm.match(/supersedes:\s*\n((?:\s*-\s*\S+\n)+)/)
  if (supBlock) for (const m of supBlock[1].matchAll(/-\s*(\S+)/g)) {
    const t = docs.find((x) => x.endsWith(m[1].replace(/^\.?\//, '')) || path.basename(x) === path.basename(m[1]))
    if (t && t !== d) add(t, { signal: 'declared', by: d })
  }
  const supInline = fm.match(/supersedes:\s*(\S+\.md)/)
  if (supInline) {
    const t = docs.find((x) => path.basename(x) === path.basename(supInline[1]))
    if (t && t !== d) add(t, { signal: 'declared', by: d })
  }

  /* stated: prose naming another doc as superseded */
  /*
   * The filename class MUST accept uppercase. Every estate doc carries its
   * completion marker as an UPPERCASE letter in the filename — `-v1.00W.md`,
   * `-v2.00F.md`, `-v1.00D.md` — and the class here was `[a-z0-9.-]+`, so this
   * matcher could not match a single real document name.
   *
   * Measured 2026-08-30 across all six docs roots: the shipped pattern found
   * ZERO prose supersession claims; case-insensitive finds TWENTY-EIGHT. The
   * gate was not reporting "nothing supersedes anything" — it was structurally
   * incapable of reporting anything at all, and 403 estate docs carry such a
   * marker. A gate reporting zero can be blind rather than clean.
   */
  for (const m of s.matchAll(/[Ss]upersedes?\s+(?:it|this)?[^\n]{0,120}?([0-9]{8}-[A-Za-z0-9.-]+\.md)/g)) {
    const t = docs.find((x) => path.basename(x) === m[1])
    if (t && t !== d) add(t, { signal: 'stated', by: d })
  }
  for (const m of s.matchAll(/This document supersedes it/gi)) {
    const sup = fm.match(/supersedes:\s*(\S+)/)
    if (sup) { const t = docs.find((x) => path.basename(x) === path.basename(sup[1])); if (t) add(t, { signal: 'stated', by: d }) }
  }

  /* self: the doc's own banner.
   *
   * CASE-SENSITIVE, and in a HEADING. Both constraints were bought with false
   * positives on the first two runs of this detector:
   *
   *   - `CORRECTED` is not supersession. dry-one-shot-architecture opens
   *     "Filename corrected ... v1.02A -> v1.04A" — a document correcting its own
   *     NAME while remaining Active and authoritative.
   *   - lowercase prose is not a banner. The same document contains the line
   *     "> retired directory as if it still existed" — the word `retired`
   *     describing a DIRECTORY, wrapped so it happens to start a line inside a
   *     blockquote. A case-insensitive match read that as the document retiring
   *     itself.
   *
   * That is the estate's signature failure — a gate matching the token in prose
   * ABOUT the token — and this detector committed it twice before the constraint
   * was tight enough. A banner shouts and sits in a heading; prose does neither.
   */
  const head = s.slice(0, 2000)
  const BANNER = /^\s*>?\s*#{1,3}\s*(?:⚠\s*)?(SUPERSEDED|DEMOTED|RETIRED|WITHDRAWN|OBSOLETE)\b/m
  const hit = head.match(BANNER)
  if (hit) add(d, { signal: 'self', by: d, detail: hit[0].replace(/\s+/g, ' ').trim() })
}

/* same-slug — but ONLY WITHIN ONE REPO.
 *
 * Across repos it means the opposite. `csp-policy-reference` exists in five
 * submodules and `elements-of-rate-calculation` in two: those are per-repo COPIES
 * of one reference, not successive versions of one document, and calling the older
 * date "superseded" would retire a live file in another repo on the strength of a
 * filename. First version of this detector did exactly that for nine documents. */
const repoOf = (p) => (p.startsWith('docs/') ? '.' : p.split('/')[0])
const bySlug = new Map()
for (const d of docs) {
  const sl = slugOf(d); if (!sl) continue
  const k = `${repoOf(d)}::${sl}`
  if (!bySlug.has(k)) bySlug.set(k, []); bySlug.get(k).push(d)
}
for (const [k, list] of bySlug) {
  if (list.length < 2) continue
  const sorted = [...list].sort((a, b) => (dateOf(a) || '').localeCompare(dateOf(b) || ''))
  const newest = sorted[sorted.length - 1]
  for (const older of sorted.slice(0, -1)) add(older, { signal: 'same-slug', by: newest, detail: k.split('::')[1] })
}

/* The cross-repo case, reported SEPARATELY because it is a different finding:
 * one reference duplicated into N repos, where a correction to one leaves N-1
 * stale and nothing says so. */
const crossRepo = new Map()
for (const d of docs) {
  const sl = slugOf(d); if (!sl) continue
  if (!crossRepo.has(sl)) crossRepo.set(sl, new Set())
  crossRepo.get(sl).add(repoOf(d))
}
const duplicated = [...crossRepo.entries()].filter(([, r]) => r.size > 1)

const rows = [...findings.entries()].sort((a, b) => b[1].length - a[1].length)
const counts = {}
for (const [, fs2] of rows) for (const f of fs2) counts[f.signal] = (counts[f.signal] || 0) + 1

console.log(`  ${docs.length} document(s) examined across ${roots.length} root(s)\n`)
console.log(`  SUPERSEDED by at least one signal: ${rows.length}`)
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`    ${k.padEnd(11)} ${v}`)
console.log('')
if (duplicated.length) {
  console.log(`  SAME DOCUMENT DUPLICATED ACROSS REPOS — not supersession, a separate hazard: ${duplicated.length}`)
  console.log('  A correction to one copy leaves the others stale, and nothing says so.')
  for (const [slug, repos] of duplicated.sort((a, b) => b[1].size - a[1].size))
    console.log(`    ${String(repos.size).padStart(2)} copies  ${slug}   [${[...repos].join(', ')}]`)
  console.log('')
}

for (const [p, fs2] of rows) {
  const st = statusOf(p)
  const sigs = [...new Set(fs2.map((f) => f.signal))].join('+')
  console.log(`  [${st ?? '-'}] ${sigs.padEnd(20)} ${p}`)
  for (const f of fs2.slice(0, 2)) if (f.by !== p) console.log(`         by ${f.by}`)
}

// ── THE SUPERSESSION RATCHET — EQUALITY, both directions. ──────────────────
//
// Unlike the dangling-link count next door, this is not a submodule-content
// artefact a routine gitlink bump should be exempt from re-banking — it is a
// direct count of DOCUMENTS this repo's own docs/ trees carry, and slack
// between the committed number and the measured one lets it drift back
// unnoticed (bsuite D-87). A fall must be re-banked, not merely tolerated.
if (process.argv.includes('--update-baseline')) {
  writeBaseline(BASELINE_FILE, { findings: rows.length, scanned: docs.length, perRoot, banked: new Date().toISOString().slice(0, 10) })
  console.log(`\n  banked ${rows.length} findings / ${docs.length} scanned to ${BASELINE_FILE}`)
  process.exit(0)
}

const ratchet = compareRatchet({
  file: BASELINE_FILE,
  findings: rows.length,
  scanned: docs.length,
  mode: 'equality',
  label: 'supersession',
  scriptPath: 'scripts/audit-doc-supersession.mjs',
})
console.log(`\n${ratchet.message}`)
if (!ratchet.ok) process.exit(1)
