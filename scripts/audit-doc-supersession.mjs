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
for (const r of roots) if (fs.existsSync(r)) walk(r)

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
  for (const m of s.matchAll(/[Ss]upersedes?\s+(?:it|this)?[^\n]{0,120}?([0-9]{8}-[a-z0-9.-]+\.md)/g)) {
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
