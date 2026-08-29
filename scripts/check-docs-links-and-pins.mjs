#!/usr/bin/env node
/**
 * Estate-wide documentation-vs-code sweep.
 *
 * Applies the machine-checkable half of check-docs-vs-code's detection
 * catalogue to every markdown file in the parent and all six submodules, and
 * emits one verdict per file with the evidence that produced it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: judge prose. A claim like "this module is
 * a stub" needs a human or a model to verify. Those files come back UNMEASURED,
 * which is a verdict — not a pass.
 *
 * CORRECTION BANNERS ARE NOT FINDINGS. Four separate times today a document
 * looked stale because the phrase being searched for survives inside the
 * blockquote that records why it WAS wrong. Any hit inside a `>` blockquote, or
 * within 3 lines of NO LONGER TRUE / SUPERSEDED / Corrected / re-measured, is
 * discarded.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const APPS = ['crm7', 'conduit', 'business-suite-unified', 'R80.4', 'braden', 'throughput']
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'archive'])

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else if (e.endsWith('.md')) out.push(p)
  }
  return out
}

const CORRECTION = /(NO LONGER TRUE|SUPERSEDED|POPULATION SUPERSEDED|Corrected \d|re-measured|RETIRED|previously rendered|used to |DO NOT FABRICATE|Deleted outright)/i

/** True when the hit sits inside a retraction rather than being a live claim. */
function isRetracted(lines, idx) {
  if (lines[idx].trimStart().startsWith('>')) return true
  for (let i = Math.max(0, idx - 3); i <= Math.min(lines.length - 1, idx + 3); i++) {
    if (CORRECTION.test(lines[i])) return true
  }
  return false
}

const npmCache = new Map()
function npmLatest(pkg) {
  if (npmCache.has(pkg)) return npmCache.get(pkg)
  let v = null
  try { v = execSync(`npm view ${pkg} version 2>/dev/null`, { encoding: 'utf8' }).trim() || null } catch { v = null }
  npmCache.set(pkg, v)
  return v
}


/**
 * REFUSE TO RUN WITHOUT SUBMODULES, and this is not defensive padding.
 *
 * Every cross-submodule link — `../crm7/docs/README.md` and its 13 siblings in
 * the hub — resolves only when the submodule is checked out. Run this in a bare
 * `git worktree` and all of them report as dangling. On 2026-08-18 that is
 * exactly what happened, and the "fix" would have been to rewrite fourteen
 * links that were already correct.
 *
 * A checker that invents findings when its inputs are absent is worse than one
 * that does not run, because someone acts on the output.
 */
const SUBMODULE_PROBE = ['crm7/docs', 'business-suite-unified/docs', 'throughput/docs']
const missingSubs = SUBMODULE_PROBE.filter((p) => !existsSync(join(ROOT, p)))
if (missingSubs.length) {
  console.error('REFUSING TO RUN: submodules are not checked out — ' + missingSubs.join(', '))
  console.error('Every cross-submodule link would report as dangling and every one of those')
  console.error('findings would be false. Run from a checkout with submodules populated.')
  process.exit(2)
}


/**
 * A document that already declares itself historical is not a document with
 * stale content — the stale content IS the record. The companion source-path
 * checker learned this first; without it, dated audits and verdict-bannered
 * `recovered/` files drown the findings that are actually actionable.
 */
function isHistorical(text) {
  for (const l of text.split('\n').slice(0, 14)) {
    const t = l.trim()
    if (!t.startsWith('>')) continue
    const inner = t.replace(/^>\s*/, '')
    const heading = inner.replace(/^#+\s*/, '')
    if (/^#+/.test(inner) && /VERDICT|SUPERSEDED|NO LONGER TRUE|NO LONGER EXISTS|DEAD|re-measured/i.test(heading)) return true
    if (/^⚠/.test(heading)) return true
  }
  return false
}

const files = [...walk(join(ROOT, 'docs')), ...APPS.flatMap(a => walk(join(ROOT, a, 'docs')))]
const results = []
let historical = 0
let recordPins = 0

for (const file of files) {
  const rel = relative(ROOT, file)
  let text
  try { text = readFileSync(file, 'utf8') } catch { continue }
  if (isHistorical(text)) { historical++; continue }
  const lines = text.split('\n')
  const findings = []

  // 1. dangling markdown links to .md files
  //
  // isRetracted() is deliberately NOT consulted here, and that is the whole
  // point of this comment.
  //
  // It exists to stop a PROSE claim being flagged when the phrase only
  // survives inside the blockquote that records why the claim was wrong.
  // Sound for prose. Wrong for links: whether a file exists on disk is not a
  // claim that can be retracted. A dangling link inside a correction banner
  // is still a dangling link.
  //
  // Measured 2026-08-29: this gate printed CHECKS-FAILED: 0 while 49 relative
  // .md links were dangling — every one of them inside a `>` block, because
  // that is where nearly every document keeps its "**Sibling docs:**" header.
  // 31 pointed at R80.3, archived and de-registered from .gitmodules months
  // earlier. A gate reporting zero was blind, not clean.
  lines.forEach((ln, i) => {
    for (const m of ln.matchAll(/\]\(([^)#\s]+\.md)\)/g)) {
      const target = m[1]
      if (/^https?:/.test(target)) continue
      const abs = resolve(dirname(file), target)
      if (!existsSync(abs)) findings.push(`dangling link -> ${target} (line ${i + 1})`)
    }
  })

  // 2. stale @bsuite/<pkg>@<version> pins — INVERTED: flag only AUTHORITY claims.
  //
  // The first design excluded records and kept everything else, and it was
  // wrong in a way that took four passes to see. 78 findings became 15 by
  // filename, then 7 by reading the line, and reading those 7 showed every one
  // was ALSO a record:
  //
  //   "createSchemaBuilderService first ships in @bsuite/schema-registry@1.0.0"
  //   "@bsuite/ui@1.0.3 while 1.1.0 is published"
  //   "STALE: targets @bsuite/schema-builder@1.0.1; live is 1.0.3"
  //
  // A version in prose is almost always HISTORY: which release introduced a
  // symbol, what was observed on a date, what another document claims. Chasing
  // that with an ever-longer exclusion list is over-fitting — the next phrasing
  // always slips through, and each near-miss teaches the reader to ignore this
  // check.
  //
  // So flag the narrow case that is genuinely a defect: a pin sitting in a line
  // that asserts AUTHORITY — "source of truth", "canonical", "authoritative",
  // "use X@1.2.3". There the version competes with the package for the reader's
  // trust, and it is the one that never gets updated. That is exactly the shape
  // found and fixed in the documentation hub and in PARENT-DOCS.md across all
  // six submodules.
  const AUTHORITY = /(source of truth|canonical|authoritative|must use|required version|pin(?:ned)? (?:at|to)|consult these)/i
  lines.forEach((ln, i) => {
    if (isRetracted(lines, i)) return
    // `@bsuite/theme@0.3.3+` is a FLOOR, not a pin — 1.0.0 satisfies it, so it
    // is not stale. And "New package: … → @bsuite/dates@0.1.0" in a plan names
    // the version a package was PROPOSED to launch at. Both looked like
    // authority claims and neither is; they were the last two survivors.
    for (const m of ln.matchAll(/@bsuite\/([a-z-]+)@(\d+\.\d+\.\d+)(\+?)/g)) {
      if (m[3] === '+') continue
      if (/new package|→\s*`?@bsuite|first ship|lands in/i.test(ln)) { recordPins++; continue }
      const latest = npmLatest(`@bsuite/${m[1]}`)
      if (!latest || latest === m[2]) continue
      if (AUTHORITY.test(ln)) findings.push(`AUTHORITY pin @bsuite/${m[1]}@${m[2]} (published ${latest}, line ${i + 1})`)
      else recordPins++
    }
  })

  // 3. filename version vs the version the header DECLARES FOR ITSELF.
  //
  // The first version of this check took the first `vN.NN` anywhere in the
  // opening lines, which is routinely a CROSS-REFERENCE to another document.
  // It reported `20260227-contributing-standards-guide-v1.01W.md` as a
  // mismatch when that file's header says `**Version:** 1.01W` — an exact
  // match — and reported a template with no version line at all. Every one of
  // the 12 findings it produced was false.
  //
  // Only an explicit self-declaration counts: `**Version:** X`, `Version: X`
  // or front-matter `version: X`.
  const fnVer = rel.match(/-v(\d+\.\d+)[A-Z]?\.md$/)
  if (fnVer) {
    const head = lines.slice(0, 12).join('\n')
    const decl = head.match(/(?:^|\n)[^\n]*?\*{0,2}Version:?\*{0,2}\s*:?\s*v?(\d+\.\d+)[A-Z]?\b/i)
    // `1.0` and `1.00` are the same version written two ways — comparing the
    // strings makes that a finding, which is how the last false positive of
    // twelve survived the first tightening.
    const norm = (v) => v.split('.').map((n) => String(parseInt(n, 10))).join('.')
    if (decl && norm(decl[1]) !== norm(fnVer[1])) {
      findings.push(`filename says v${fnVer[1]}, header declares v${decl[1]}`)
    }
  }

  // 4. unfilled template placeholders
  // A TEMPLATE IS SUPPOSED TO CONTAIN PLACEHOLDERS. Flagging the template
  // itself, or an audit quoting its placeholder text as a finding, is the same
  // error as reporting an audit's ❌ rows as that audit's defects.
  const isTemplate = /template/i.test(rel)
  lines.forEach((ln, i) => {
    if (isTemplate || isRetracted(lines, i)) return
    // A placeholder QUOTED IN BACKTICKS is a document citing the defect as
    // evidence, not carrying it. Every survivor of this limb was that shape:
    // `[Describe what the component does…]` verbatim.
    const stripped = ln.replace(/`[^`]*`/g, '')
    if (/\[(Describe what|Category: |Stability: |Team\/Person responsible|1-2 sentence description|YYYY-MM-DD)/.test(stripped))
      findings.push(`unfilled template placeholder (line ${i + 1})`)
  })

  // 5. Tailwind v3 claim — but NOT a rule that FORBIDS Tailwind v3.
  //
  // Both findings this limb produced were sentences banning it outright:
  // "Tailwind v3 is not permitted in package manifests, resolved lockfile
  // entries, docs, or new implementation paths". A doctrine document naming the
  // thing it prohibits is the opposite of a stale claim, and every app resolves
  // ^4.3.0 today. Mentioning a version is not asserting it.
  // Also excludes UPGRADE INSTRUCTIONS. `Tailwind 3.4 → 4` in a remediation
  // table is telling someone to leave v3, not asserting it is in use — the
  // last surviving false positive of this limb.
  const FORBIDS = /(not permitted|must be v?4|is not allowed|banned|forbidden|no longer|prohibit|v4 or later|migrat|→\s*4|->\s*4|to v?4\b)/i
  lines.forEach((ln, i) => {
    if (isRetracted(lines, i)) return
    if (FORBIDS.test(ln)) return
    if (/Tailwind( CSS)? v?3(\.\d+)*\b/.test(ln)) findings.push(`claims Tailwind v3 (line ${i + 1})`)
  })

  results.push({ file: rel, findings })
}

const clean = results.filter(r => !r.findings.length)
const dirty = results.filter(r => r.findings.length)
console.log(`# Estate documentation sweep\n`)
console.log(`Files scanned: ${results.length}  (parent ${walk(join(ROOT,'docs')).length}, six apps ${results.length - walk(join(ROOT,'docs')).length})`)
console.log(`HISTORICAL (verdict-bannered / dated-audit, skipped): ${historical}`)
console.log(`RECORD pins (a version in prose is history — not rewritten): ${recordPins}`)
console.log(`CHECKS-CLEAN: ${clean.length}    CHECKS-FAILED: ${dirty.length}\n`)
console.log(`## Files with findings\n`)
for (const r of dirty.sort((a, b) => b.findings.length - a.findings.length)) {
  console.log(`### ${r.file}  (${r.findings.length})`)
  for (const f of r.findings.slice(0, 6)) console.log(`  - ${f}`)
  if (r.findings.length > 6) console.log(`  - …${r.findings.length - 6} more`)
}
const total = dirty.reduce((n, r) => n + r.findings.length, 0)
console.log(`\nTOTAL FINDINGS: ${total}`)
