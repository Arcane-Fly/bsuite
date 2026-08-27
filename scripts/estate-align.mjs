#!/usr/bin/env node
/*
 * ONE ROW, ONE TRUTH — reconcile the estate's registers against each other and against disk.
 *
 * WHY THIS EXISTS. On 2026-08-27 the four artifacts that are supposed to be this estate's
 * source of truth — bsuite-feature-index.{json,md}, journey-gap-register.json,
 * dod-enforcement-prompt.md — were UNTRACKED. They existed on exactly one laptop. No CI could
 * read them, no other lane could see them, and a disk failure would have taken 659 indexed
 * features with it. That is also why NO SKILL referenced them: they did not exist anywhere a
 * skill could point.
 *
 * The consequence was measurable. `dod_status` read `not-evaluated` on all 659 rows, and zero
 * features carried an APPROVE — while the operator's own notes register had grown to 139 items
 * with no status column at all. Two registers, neither pointing at the other, and a gate with
 * nothing to write its verdict into.
 *
 * THE INVARIANTS THIS ENFORCES
 *   A. Every index row's `code_anchors` resolve to something on disk. An anchor that does not
 *      resolve is how an index quietly describes a codebase that no longer exists.
 *   B. Every operator-notes item maps to at least one index row, OR is explicitly recorded as a
 *      journey gap (a step with no surface — those are real and must not be forced into the
 *      index, but they must not be silently absent either).
 *   C. `dod_status` only ever holds a value from the known set, and `approved` requires an
 *      evidence pointer. A status field that can hold anything records nothing.
 *   D. Both directions are reported. An index row nothing asked for is fine; an operator ask
 *      with no index row is a HOLE, and a hole is what "we fixed the page you named" is made of.
 *
 * A gate that cannot tell "checked nothing" from "found nothing" is not a gate, so this refuses
 * to pass on an empty denominator.
 *
 *   node scripts/estate-align.mjs            # report
 *   node scripts/estate-align.mjs --strict   # non-zero exit on any violation (CI)
 *   node scripts/estate-align.mjs --json
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INDEX_PATH = join(ROOT, 'docs/00-roadmap/bsuite-feature-index.json')
const GAPS_PATH = join(ROOT, 'docs/00-roadmap/journey-gap-register.json')

const DOD_STATES = new Set(['not-evaluated', 'in-progress', 'approved', 'send-back', 'waived'])

/** The operator-notes register is a dated doc; find the newest rather than pinning a filename. */
export function findRegister(docsDir) {
  if (!existsSync(docsDir)) return null
  const hits = readdirSync(docsDir).filter((f) => f.includes('operator-notes-register') && f.endsWith('.md'))
  if (hits.length === 0) return null
  hits.sort()
  return join(docsDir, hits[hits.length - 1])
}

/** Rows begin `| D-<n> |`. Deliberately a line scan, not a markdown parse — the table shape is
 *  the contract and a parser that tolerates a broken table hides a broken table. */
export function parseRegister(text) {
  const items = []
  const seen = new Set()
  for (const line of text.split('\n')) {
    if (!line.startsWith('| D-')) continue
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    if (cells.length < 6) continue
    const id = cells[0]
    if (seen.has(id)) continue
    seen.add(id)
    items.push({ id, verbatim: cells[1], asks: cells[2], surface: cells[3], app: cells[4], category: cells[5] })
  }
  return items
}

/** `/hosts/:id` and `/hosts/[id]` are the same surface; compare on a normal form. */
export function normaliseRoute(r) {
  if (!r) return ''
  return String(r).trim().replace(/\[([^\]]+)\]/g, ':$1').replace(/\/:[A-Za-z_][A-Za-z0-9_]*/g, '/*').replace(/\/+$/, '').toLowerCase()
}

/*
 * Resolve a code anchor the way its author meant it.
 *
 * THREE TOLERANCES, EACH ONE PAID FOR BY A FALSE FINDING:
 *
 * 1. The extension is often omitted (`crm7/src/pages/contacts/index`).
 * 2. The anchor may name a DIRECTORY whose entry point is index.*.
 * 3. THE ANCHOR MAY BE MODULE-RELATIVE RATHER THAN REPO-RELATIVE. Measured on this index:
 *    1178 anchors carry a top-level module prefix and 94 do not — `conduit.pipeline.*` anchors
 *    `supabase/functions/r7-automation-processor/index.ts`, which exists, but only under
 *    `conduit/`. A checker without this tolerance reported 99 broken anchors when the true
 *    number is far smaller, and a register full of false findings is worse than no register:
 *    it trains its readers to skim.
 *
 * The module is taken from the feature's own `module` field, so the fallback is targeted rather
 * than a search of every submodule — a blind search would let an anchor "resolve" against the
 * wrong app entirely, which is the same class of bug wearing a helpful face.
 */
export function anchorResolves(root, anchor, module) {
  const candidates = [anchor]
  if (module && anchor.split('/')[0] !== module) candidates.push(join(module, anchor))
  for (const rel of candidates) {
    const base = join(root, rel)
    if (existsSync(base)) return true
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql', '.md', '.json', '.yml', '.yaml']) {
      if (existsSync(base + ext)) return true
    }
    for (const idx of ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mjs']) {
      if (existsSync(join(base, idx))) return true
    }
  }
  return false
}

function main() {
  const strict = process.argv.includes('--strict')
  const asJson = process.argv.includes('--json')
  const violations = []
  const notes = []

  if (!existsSync(INDEX_PATH)) {
    console.error(`HARNESS-FAIL: no feature index at ${INDEX_PATH}. This is the estate's source of truth; its absence is the finding.`)
    process.exit(1)
  }
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
  if (!Array.isArray(index) || index.length === 0) {
    console.error('HARNESS-FAIL: feature index is empty — refusing to report alignment over nothing.')
    process.exit(1)
  }

  const registerPath = findRegister(join(ROOT, 'docs'))
  const register = registerPath ? parseRegister(readFileSync(registerPath, 'utf8')) : []
  if (registerPath && register.length === 0) {
    violations.push({ check: 'harness', detail: `register ${registerPath} parsed to ZERO rows — the table shape changed and this check went blind` })
  }

  const gaps = existsSync(GAPS_PATH) ? JSON.parse(readFileSync(GAPS_PATH, 'utf8')) : { journey_gaps: [] }

  // ---- A. code anchors resolve ----
  let anchorsChecked = 0
  for (const f of index) {
    for (const a of f.code_anchors || []) {
      anchorsChecked++
      if (!anchorResolves(ROOT, a, f.module)) {
        violations.push({ check: 'A-anchor', feature: f.id, detail: `code anchor does not resolve: ${a}` })
      }
    }
  }

  // ---- C. dod_status is from the known set, and `approved` carries evidence ----
  for (const f of index) {
    const s = f.dod_status
    if (!DOD_STATES.has(typeof s === 'string' ? s : (s && s.state))) {
      violations.push({ check: 'C-dod-state', feature: f.id, detail: `dod_status ${JSON.stringify(s)} is not one of ${[...DOD_STATES].join(', ')}` })
    }
    if (typeof s === 'object' && s && s.state === 'approved' && !s.evidence) {
      violations.push({ check: 'C-dod-evidence', feature: f.id, detail: 'dod_status approved with no evidence pointer — an APPROVE nobody can check is a claim, not a verdict' })
    }
  }

  // ---- B/D. register <-> index, both directions ----
  const byRoute = new Map()
  for (const f of index) {
    const r = normaliseRoute(f.route)
    if (!r) continue
    if (!byRoute.has(r)) byRoute.set(r, [])
    byRoute.get(r).push(f)
  }
  const gapText = JSON.stringify(gaps).toLowerCase()
  const unmapped = []
  for (const it of register) {
    const surfaces = String(it.surface).split(/[,;]| and /).map((s) => s.trim()).filter((s) => s.startsWith('/'))
    let hit = false
    for (const s of surfaces) {
      const n = normaliseRoute(s)
      if (byRoute.has(n)) { hit = true; break }
      const base = '/' + n.replace(/^\//, '').split('/')[0]
      if (byRoute.has(base)) { hit = true; break }
    }
    if (!hit) {
      // A journey gap is a legitimate reason for an ask to have no index row.
      const asJourneyGap = gapText.includes(String(it.id).toLowerCase())
      if (!asJourneyGap) unmapped.push(it)
    }
  }
  if (unmapped.length) {
    notes.push(`${unmapped.length} of ${register.length} operator asks map to NO index row and are not recorded as journey gaps`)
  }

  const report = {
    index: { features: index.length, anchorsChecked },
    register: { path: registerPath, items: register.length, unmappedToIndex: unmapped.length },
    dod: index.reduce((acc, f) => {
      const s = typeof f.dod_status === 'string' ? f.dod_status : (f.dod_status && f.dod_status.state) || 'malformed'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {}),
    violations: violations.length,
    notes,
  }

  if (asJson) {
    console.log(JSON.stringify({ report, violations, unmapped: unmapped.map((u) => ({ id: u.id, surface: u.surface, asks: u.asks })) }, null, 2))
  } else {
    console.log(`estate-align: ${index.length} indexed feature(s), ${anchorsChecked} code anchor(s), ${register.length} operator ask(s)`)
    console.log(`  register: ${registerPath || '(none found)'}`)
    console.log(`  dod_status: ${JSON.stringify(report.dod)}`)
    if (report.dod['not-evaluated'] === index.length) {
      console.log('  NOTE: every feature is not-evaluated. The gate has never been run against this index.')
    }
    for (const n of notes) console.log(`  NOTE: ${n}`)
    const byCheck = violations.reduce((a, v) => { (a[v.check] = a[v.check] || []).push(v); return a }, {})
    for (const [c, vs] of Object.entries(byCheck)) {
      console.log(`\n  ${c}: ${vs.length}`)
      for (const v of vs.slice(0, 12)) console.log(`    ${v.feature || ''} ${v.detail}`)
      if (vs.length > 12) console.log(`    … and ${vs.length - 12} more (use --json for all)`)
    }
    if (unmapped.length) {
      console.log(`\n  UNMAPPED OPERATOR ASKS (${unmapped.length}) — each is a hole in the index:`)
      for (const u of unmapped.slice(0, 15)) console.log(`    ${u.id}  [${u.surface}]  ${u.asks.slice(0, 76)}`)
      if (unmapped.length > 15) console.log(`    … and ${unmapped.length - 15} more`)
    }
    console.log(violations.length === 0 ? '\n  no invariant violations' : `\n  ${violations.length} invariant violation(s)`)
  }

  if (strict && (violations.length > 0 || unmapped.length > 0)) process.exit(1)
  process.exit(0)
}

if (process.argv.includes('--self-test')) {
  const cases = []
  const t = (n, a, e) => cases.push({ n, ok: JSON.stringify(a) === JSON.stringify(e), a, e })
  t('route: bracket form normalises to star', normaliseRoute('/hosts/[id]'), '/hosts/*')
  t('route: colon form normalises to star', normaliseRoute('/hosts/:id'), '/hosts/*')
  t('route: trailing slash dropped', normaliseRoute('/hosts/'), '/hosts')
  t('route: empty is empty', normaliseRoute(null), '')
  t('register: parses a row', parseRegister('| D-1 | "x" | do y | /a | CRM7 | ux |').length, 1)
  t('register: ignores non-rows', parseRegister('| ID | v | a | s | app | c |\n|---|---|---|---|---|---|').length, 0)
  t('register: dedupes a repeated id', parseRegister('| D-1 | a | b | c | d | e |\n| D-1 | a | b | c | d | e |').length, 1)
  // The module-relative tolerance, asserted against a path that really exists in this repo.
  t('anchor: repo-relative resolves', anchorResolves(ROOT, 'scripts/estate-align.mjs', 'scripts'), true)
  t('anchor: module-relative resolves via the module field', anchorResolves(ROOT, 'src', 'crm7'), true)
  t('anchor: a genuine miss still fails', anchorResolves(ROOT, 'src/definitely/not/here', 'crm7'), false)
  const bad = cases.filter((c) => !c.ok)
  for (const b of bad) console.error(`FAIL ${b.n}: expected ${JSON.stringify(b.e)}, got ${JSON.stringify(b.a)}`)
  if (bad.length) process.exit(1)
  console.log(`estate-align --self-test: OK (${cases.length} cases)`)
  process.exit(0)
}

main()
