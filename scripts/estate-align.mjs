#!/usr/bin/env node
/*
 * ONE ROW, ONE TRUTH — reconcile the estate's registers against each other and against disk.
 *
 * WHY THIS EXISTS. On 2026-08-27 the four artifacts that are supposed to be this estate's
 * source of truth — bsuite-feature-index.json, BSUITE-FEATURE-INDEX.md, journey-gap-register.json,
 * DOD-ENFORCEMENT-PROMPT.md — were UNTRACKED. They existed on exactly one laptop. No CI could
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

/** The declared state of a row, whether dod_status is a bare string or an object. */
export function dodState(s) { return typeof s === 'string' ? s : (s && s.state) }

/* ADR-0010 — FIX THE CLASS, NOT THE PAGE — MECHANISED.
 *
 * The ADR was ratified 2026-08-26 by operator ruling and its own header claimed
 * "enforcement mechanism exists (D8.1 + bsuite_feature_index.sibling_class)".
 * `sibling_class` is present on all 659 rows across 111 classes — and on
 * 2026-08-27 NOTHING under scripts/ or .github/workflows/ read the field. It was
 * carried, indexed, and inert: the exact "built but nothing invokes it" shape the
 * ADR exists to name, sitting inside the ADR's own enforcement claim.
 *
 * The rule, stated as the ADR states it: a platform-wide defect is closed
 * platform-wide or not at all. So the moment ANY row in a sibling class is
 * `approved`, no row in that class may still read `not-evaluated`. Approving one
 * page of a class and leaving its siblings unlooked-at is precisely the thing the
 * operator raised 26 repeat findings about.
 *
 * A class of one has no siblings and cannot violate this — 55 of the 111 classes
 * are singletons and they are silent here by construction, not by exemption.
 *
 * Today every row is `not-evaluated`, so this passes VACUOUSLY. That is expected
 * and is not a reason to weaken it: it binds on the first APPROVE anyone writes,
 * which is the moment it needs to.
 */
export function siblingClassViolations(index) {
  const byClass = new Map()
  for (const f of index || []) {
    const c = f && f.sibling_class
    if (!c) continue
    if (!byClass.has(c)) byClass.set(c, [])
    byClass.get(c).push(f)
  }
  const out = []
  for (const [cls, rows] of byClass) {
    if (rows.length < 2) continue
    const approved = rows.filter((r) => dodState(r.dod_status) === 'approved')
    if (approved.length === 0) continue
    const unevaluated = rows.filter((r) => dodState(r.dod_status) === 'not-evaluated')
    for (const r of unevaluated) {
      out.push({
        check: 'E-sibling-class',
        feature: r.id,
        detail: `sibling class "${cls}" has ${approved.length} approved row(s) (e.g. ${approved[0].id}) `
          + `but this one is still not-evaluated — ADR-0010: a class is closed class-wide or not at all `
          + `(${rows.length} rows in this class)`,
      })
    }
  }
  return out
}

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

  // ---- E. ADR-0010: a sibling class is closed class-wide, or not at all ----
  violations.push(...siblingClassViolations(index))

  // ---- B/D. register <-> index, both directions ----
  const byRoute = new Map()
  for (const f of index) {
    const r = normaliseRoute(f.route)
    if (!r) continue
    if (!byRoute.has(r)) byRoute.set(r, [])
    byRoute.get(r).push(f)
  }
  /*
   * MATCHING ON ROUTES ALONE WAS THE WRONG SHAPE, and it made the index look far emptier than it is.
   *
   * The first version reported 65 of 139 operator asks as unmapped and I read that as 65 holes in
   * the index. It was not. 62 of those 65 carry a surface that is NOT A ROUTE — "r8 root",
   * "licence/grace", "suite root", "estate", "auth". The operator names the AREA he is standing in,
   * because that is how a person describes where they were. A route matcher can never match that,
   * so it reported absence where there was only a vocabulary mismatch.
   *
   * The index already carries `module` and `capability_area`. Matching those as well is not a
   * loosening of the check — it is the check finally reading the field the ask was written against.
   * A genuine hole is an ask that matches NO route, NO module and NO capability area, and that is a
   * much smaller and much more useful number.
   */
  const byModule = new Map()
  const byArea = new Map()
  for (const f of index) {
    const m = String(f.module || '').toLowerCase()
    if (m) { if (!byModule.has(m)) byModule.set(m, []); byModule.get(m).push(f) }
    const a = String(f.capability_area || '').toLowerCase()
    if (a) { if (!byArea.has(a)) byArea.set(a, []); byArea.get(a).push(f) }
  }
  // The operator's words for an app, mapped to the index's module names.
  const APP_WORDS = {
    r8: 'r80.4', 'r8.04': 'r80.4', r804: 'r80.4', 'r80.3': 'r80.4',
    suite: 'business-suite-unified', bsu: 'business-suite-unified', bsuite: 'business-suite-unified',
    crm7: 'crm7', conduit: 'conduit', braden: 'braden', throughput: 'throughput',
  }

  const gapText = JSON.stringify(gaps).toLowerCase()
  const unmapped = []
  const crossCuttingAsks = []
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
      // No route matched. Try the AREA the ask was actually written against.
      const hay = `${it.surface} ${it.app}`.toLowerCase()
      for (const [word, mod] of Object.entries(APP_WORDS)) {
        if (new RegExp(`\\b${word}\\b`).test(hay) && byModule.has(mod)) { hit = true; break }
      }
      if (!hit) {
        for (const area of byArea.keys()) {
          // Match on a distinctive word from the area name, not the whole label — the operator
          // writes "auth", the index writes "Authentication & access".
          const words = area.split(/[^a-z0-9]+/).filter((w) => w.length > 3)
          if (words.some((w) => hay.includes(w))) { hit = true; break }
        }
      }
    }
    if (!hit) {
      // A journey gap is a legitimate reason for an ask to have no index row.
      const asJourneyGap = gapText.includes(String(it.id).toLowerCase())
      /*
       * A THIRD LEGITIMATE CATEGORY, and leaving it out manufactured four fake holes.
       *
       * "all headers", "all apps", "all card surfaces", "all list surfaces" — these are
       * CROSS-CUTTING asks. They do not fail to name a feature; they name EVERY feature. Filing
       * them as unmapped invites someone to close the gap by inventing a row for something that
       * is deliberately estate-wide, and these are the operator's most-repeated class of ask, so
       * getting the category wrong here is expensive.
       *
       * They are still counted and printed — a cross-cutting ask is real work — but under their
       * own heading, so "no index row" keeps meaning "nobody has indexed this".
       */
      const crossCutting = /\b(all|every|estate[- ]wide|platform[- ]wide|everywhere)\b/i.test(it.surface)
      if (!asJourneyGap && !crossCutting) unmapped.push(it)
      else if (crossCutting) crossCuttingAsks.push(it)
    }
  }
  if (unmapped.length) {
    notes.push(`${unmapped.length} of ${register.length} operator asks map to NO index row and are not recorded as journey gaps`)
  }

  const report = {
    index: { features: index.length, anchorsChecked },
    register: {
      path: registerPath,
      items: register.length,
      unmappedToIndex: unmapped.length,
      crossCutting: crossCuttingAsks.length,
    },
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
    if (crossCuttingAsks.length) {
      console.log(`\n  CROSS-CUTTING ASKS (${crossCuttingAsks.length}) — these name EVERY feature, not a missing one:`)
      for (const c of crossCuttingAsks) console.log(`    ${c.id}  [${c.surface}]  ${c.asks.slice(0, 72)}`)
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
  // ---- E. sibling-class closure, both directions ----
  const cls = (id, sibling_class, state) => ({ id, sibling_class, dod_status: state })
  t('sibling: an approved row with an unevaluated sibling is a violation',
    siblingClassViolations([cls('a', 'entity-crud', 'approved'), cls('b', 'entity-crud', 'not-evaluated')]).length, 1)
  t('sibling: a fully evaluated class is clean',
    siblingClassViolations([cls('a', 'entity-crud', 'approved'), cls('b', 'entity-crud', 'send-back')]).length, 0)
  t('sibling: nothing approved yet means nothing to enforce',
    siblingClassViolations([cls('a', 'entity-crud', 'not-evaluated'), cls('b', 'entity-crud', 'not-evaluated')]).length, 0)
  t('sibling: a class of one has no siblings and cannot violate',
    siblingClassViolations([cls('a', 'lonely', 'approved')]).length, 0)
  t('sibling: TWO unevaluated siblings report TWICE, one per page left behind',
    siblingClassViolations([cls('a', 'x', 'approved'), cls('b', 'x', 'not-evaluated'), cls('c', 'x', 'not-evaluated')]).length, 2)
  t('sibling: classes do not leak into each other',
    siblingClassViolations([cls('a', 'x', 'approved'), cls('b', 'y', 'not-evaluated')]).length, 0)
  t('sibling: object-form dod_status is read the same as the string form',
    siblingClassViolations([cls('a', 'x', { state: 'approved', evidence: 'e' }), cls('b', 'x', 'not-evaluated')]).length, 1)

  const bad = cases.filter((c) => !c.ok)
  for (const b of bad) console.error(`FAIL ${b.n}: expected ${JSON.stringify(b.e)}, got ${JSON.stringify(b.a)}`)
  if (bad.length) process.exit(1)
  console.log(`estate-align --self-test: OK (${cases.length} cases)`)
  process.exit(0)
}

main()
