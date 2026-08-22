/**
 * Do the SOURCE PATHS cited in documentation still exist?
 *
 * A doc saying "see `src/services/foo.ts`" that is wrong sends the reader off to
 * re-derive the thing the doc was written to tell them. Distinct from a dangling
 * markdown LINK — these are inline code references, which no link checker sees.
 *
 * FOUR CORRECTIONS ARE BAKED IN, each because the first version was confidently
 * wrong in a different direction. They are the whole value of this file:
 *
 *  1. A doc REPORTING a file's absence is not a doc with a broken reference.
 *     Run one, and an audit's own findings table — every row marked ❌ GONE —
 *     comes back as that audit's defects.
 *
 *  2. A BASENAME MATCH IS NOT A MOVE. `[id].tsx`, `types.ts` and `index.ts`
 *     occur dozens of times here; matching one to another yields a confident,
 *     wrong "the file moved here". Only a basename UNIQUE estate-wide counts,
 *     and generic names are excluded outright.
 *
 *  3. A document that already declares itself HISTORICAL is not stale — the
 *     stale reference IS the record. Skipping verdict-bannered and dated-audit
 *     files removed 52 documents and made the remainder actionable.
 *
 *  4. It REFUSES to run without submodules. In a bare worktree every app-owned
 *     path resolves nowhere: 240 "unresolved" against 102 in a real checkout.
 *     More than half the findings were an artefact of where it ran.
 *
 * Measured 2026-08-18: 666 references checked, 102 unresolved —
 * 10 MOVED, 4 AMBIGUOUS, 88 GONE.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
const ROOT = process.cwd()
const APPS = ['crm7','conduit','business-suite-unified','R80.4','braden','throughput']
const SKIP = new Set(['node_modules','.git','dist','build','coverage','.next','archive'])
function walk(d, out=[]) { let e; try { e = readdirSync(d) } catch { return out }
  for (const x of e) { if (SKIP.has(x)) continue; const p = join(d,x); let s; try { s = statSync(p) } catch { continue }
    s.isDirectory() ? walk(p,out) : x.endsWith('.md') && out.push(p) } return out }

const CORRECTION = /(NO LONGER TRUE|SUPERSEDED|Corrected \d|re-measured|RETIRED|used to |previously|Deleted outright|does not exist|absent)/i
// A doc REPORTING a file's absence is not a doc with a broken reference.
// Audit tables mark them ❌ GONE / MISSING; plans mark proposals (NEW).
const REPORTS_ABSENCE = /(❌|\bGONE\b|\bMISSING\b|Not standalone|\(NEW\)|never created|does not exist|no such file)/
// A path inside backticks, rooted at a known source dir, with a real extension.
const PATH_RE = /`((?:src|supabase|scripts|packages|api)\/[A-Za-z0-9_./\[\]-]+\.(?:ts|tsx|js|jsx|mjs|sql|css|json))`/g


// SAME GUARD AS THE LINK CHECKER, AND FOR THE SAME REASON. Without submodules
// every `src/...` path owned by an app resolves nowhere, and the run reports
// hundreds of false absences. This checker produced 240 "unresolved" in a bare
// worktree against 102 in a real checkout — the difference is entirely fiction.
const SUBMODULE_PROBE = ['crm7/src', 'conduit/src', 'business-suite-unified/src']
const missingSubs = SUBMODULE_PROBE.filter((d) => !existsSync(join(ROOT, d)))
if (missingSubs.length) {
  console.error('REFUSING TO RUN: submodules are not checked out — ' + missingSubs.join(', '))
  console.error('Every app-owned source path would report as absent. Those findings would be false.')
  process.exit(2)
}

const baseCache = new Map()
function findAll(dir, base) {
  const key = dir + '||' + base
  if (allCache.has(key)) return allCache.get(key)
  const out = []
  const stack = [dir]
  while (stack.length) {
    const d = stack.pop()
    let entries; try { entries = readdirSync(d) } catch { continue }
    for (const e of entries) {
      if (SKIP.has(e) || e === '.claude') continue
      const q = join(d, e)
      let st; try { st = statSync(q) } catch { continue }
      if (st.isDirectory()) stack.push(q)
      else if (e === base) out.push(q)
    }
  }
  allCache.set(key, out)
  return out
}
const allCache = new Map()

function findBase(dir, base) {
  const key = dir + '|' + base
  if (baseCache.has(key)) return baseCache.get(key)
  let found = null
  const stack = [dir]
  while (stack.length && !found) {
    const d = stack.pop()
    let entries; try { entries = readdirSync(d) } catch { continue }
    for (const e of entries) {
      if (SKIP.has(e)) continue
      const q = join(d, e)
      let st; try { st = statSync(q) } catch { continue }
      if (st.isDirectory()) stack.push(q)
      else if (e === base) { found = q; break }
    }
  }
  baseCache.set(key, found)
  return found
}

const files = [...walk(join(ROOT,'docs')), ...APPS.flatMap(a=>walk(join(ROOT,a,'docs')))]
const miss = new Map()
let checked = 0
/**
 * A document that already declares itself historical is not a document with
 * stale references — the stale reference IS the record. Every citation the
 * first run flagged sat in exactly such a file: verdict-bannered `recovered/`
 * docs and dated audits. Counting them buries the citations that ARE
 * actionable, which is the only reason to run this at all.
 */
/**
 * A SPECIFICATION NAMES FILES IT PROPOSES TO CREATE. Those are not citations.
 *
 * `docs/20260507-admin-parity-spec-v1.00W.md` declares itself in its own header:
 * "research-lane specification, NOT YET IMPLEMENTED". Its eight unresolved paths are the
 * destinations it proposes — `src/pages/settings/citb.tsx` and the rest — and reporting
 * them as broken references says the spec is stale when what it actually is, is unbuilt.
 *
 * The distinction matters because the two want opposite responses. A stale citation should
 * be repointed or removed; a proposed path should be left exactly as written until someone
 * builds the thing or drops the plan. Editing a spec's file list to match a tree that does
 * not contain it yet would destroy the only record of what was intended.
 *
 * NOT SUPPRESSED — counted and reported in its own line. A guard that quietly drops a
 * category is the laundered waiver this estate broadcast about on 2026-08-22.
 */
const DECLARES_UNBUILT =
  /\b(not yet implemented|not implemented|yet to be (?:built|implemented)|to be (?:built|created)|proposed (?:design|schema|structure)|research-lane specification)\b/i;

export function isProposal(text) {
  return DECLARES_UNBUILT.test(text.split('\n').slice(0, 12).join('\n'));
}

function isHistorical(text) {
  const head = text.split('\n').slice(0, 14)
  for (const l of head) {
    const t = l.trim()
    if (!t.startsWith('>')) continue
    const inner = t.replace(/^>\s*/, '')
    // Match the heading TEXT regardless of how many #'s precede it, and treat
    // a ⚠ heading as a banner too — the first version required the ⚠ to start
    // the line, so `> ## ⚠ …` (the shape actually used) slipped straight past.
    const headingText = inner.replace(/^#+\s*/, '')
    if (/^#+/.test(inner) && /VERDICT|SUPERSEDED|NO LONGER TRUE|NO LONGER EXISTS|DEAD|POPULATION SUPERSEDED|re-measured/i.test(headingText)) return true
    if (/^⚠/.test(headingText)) return true
  }
  return false
}

let skippedHistorical = 0
for (const f of files) {
  const relf = relative(ROOT, f)
  const owner = APPS.find(a => relf.startsWith(a + '/')) || ''
  const raw = readFileSync(f,'utf8')
  if (isHistorical(raw)) { skippedHistorical++; continue }
  const proposal = isProposal(raw)
  const lines = raw.split('\n')
  lines.forEach((ln,i) => {
    if (ln.trimStart().startsWith('>')) return
    if (CORRECTION.test(lines.slice(Math.max(0,i-2), i+3).join('\n'))) return
    if (REPORTS_ABSENCE.test(ln)) return
    for (const m of ln.matchAll(PATH_RE)) {
      const p = m[1]; checked++
      // try: owning app, then parent, then every app (docs often cite a sibling)
      const cands = [owner && join(ROOT, owner, p), join(ROOT, p), ...APPS.map(a => join(ROOT, a, p))].filter(Boolean)
      if (cands.some(existsSync)) continue
      const base = p.split('/').pop()
      // A BASENAME MATCH IS NOT A MOVE. `[id].tsx`, `types.ts`, `index.ts` and
      // `README.md` occur dozens of times across this estate; matching one to
      // another produces a confident, wrong "the file moved here" claim. Only
      // a basename that is UNIQUE estate-wide, and not generic, is evidence.
      let moved = null
      const GENERIC = /^(index|types|utils|constants|helpers|config|schema|client|README|\[id\]|\[\.\.\.[a-z]+\])\.(ts|tsx|js|jsx|mjs|sql|css|json|md)$/i
      if (GENERIC.test(base)) { const key0 = `${relf}|${p}`; if (!miss.has(key0)) miss.set(key0, { line: i+1, moved: null, generic: true, proposal }); continue }
      const hits = findAll(ROOT, base)
      if (hits.length === 1) moved = relative(ROOT, hits[0])   // unique => a real move
      else if (hits.length > 1) moved = null                    // ambiguous => not evidence
      const key = `${relf}|${p}`
      if (!miss.has(key)) miss.set(key, { line: i+1, moved, proposal })
    }
  })
}
console.log(`documents skipped as HISTORICAL (verdict-bannered / dated-audit): ${skippedHistorical}`)
console.log(`source-path references checked: ${checked}`)
console.log(`UNRESOLVED: ${miss.size}\n`)
const byFile = new Map()
let movedN = 0, goneN = 0, genericN = 0, proposedN = 0
for (const [k,v] of miss) { const [f,p] = k.split('|'); if(!byFile.has(f)) byFile.set(f,[])
  if (v.proposal) { proposedN++; byFile.get(f).push(`PROPOSED ${p} — a spec naming a file it proposes to CREATE (line ${v.line})`) }
  else if (v.moved) { movedN++; byFile.get(f).push(`MOVED  ${p} -> ${v.moved} (line ${v.line})`) }
  else if (v.generic) { genericN++; byFile.get(f).push(`AMBIG  ${p} — generic basename, not resolvable (line ${v.line})`) }
  else { goneN++; byFile.get(f).push(`GONE   ${p} (line ${v.line})`) } }
console.log(`  of those: MOVED (unique basename, real move) ${movedN}, AMBIGUOUS (generic name) ${genericN}, GONE ${goneN}, PROPOSED (unbuilt spec) ${proposedN}\n`)
// PROPOSED is COUNTED, not dropped. A guard that quietly removes a category is the
// laundered waiver the R80.4 lane broadcast about on 2026-08-22 — the aggregate is the
// line anyone quotes, so the absent measurement has to be louder than the pass count.
if (proposedN) {
  console.log(`  ${proposedN} of the ${miss.size} are PROPOSED paths in specs that declare themselves unbuilt.`)
  console.log('  Those are destinations, not citations. They resolve when the thing is built or')
  console.log('  the plan is dropped — never by editing the spec to match a tree without it.\n')
}
// `--all` prints every doc and every reference. The default truncates to 14 docs and 4
// references each, which is right for a terminal and wrong for anything that PARSES this
// output: a fixer reading the report applied 10 of 15 MOVED references and then reported
// "0 applied" on every subsequent pass, because the remaining 5 were behind "…N more" and
// had never been printed at all. A truncated measurement reads as a complete one.
const ALL = process.argv.includes('--all')
for (const [f,ps] of [...byFile].sort((a,b)=>b[1].length-a[1].length).slice(0, ALL ? Infinity : 14)) {
  console.log(`### ${f}  (${ps.length})`)
  ps.slice(0, ALL ? Infinity : 4).forEach(p=>console.log(`  - ${p}`))
  if (!ALL && ps.length>4) console.log(`  - …${ps.length-4} more (run with --all)`)
}
