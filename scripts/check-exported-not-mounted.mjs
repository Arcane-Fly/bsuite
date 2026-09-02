#!/usr/bin/env node
/**
 * check-exported-not-mounted.mjs — a package must not export a component that
 * every consumer forgets to render.
 *
 * ---------------------------------------------------------------------------
 * THE CLASS THIS EXISTS TO STOP
 * ---------------------------------------------------------------------------
 * On 2026-09-02 the operator opened the workflow builder and reported it "1/3
 * baked": no way to add a node, rename one, delete one, or publish, and nothing
 * showing whether changes had saved.
 *
 * Every one of those controls had been BUILT, PUBLISHED TO NPM, AND EXPORTED.
 * `@bsuite/workflow-canvas` exports `WorkflowPalette`, `WorkflowToolbar` and
 * `WorkflowInspector` as public API. crm7 rendered `<WorkflowCanvas>` with no
 * children.
 *
 *     grep -rn "WorkflowPalette|WorkflowToolbar|WorkflowInspector" crm7/src  ->  0
 *
 * Everything was green. Types compiled — an unused import is not a type error.
 * Lint passed — the components were never imported, so there was nothing unused
 * to flag. Tests passed — they asserted the canvas got the right props and never
 * that the chrome existed, and the package mock did not even declare those three
 * exports. The estate had no instrument that could see it.
 *
 * The operator's ruling: "The built not mounted is a persistent issue that needs
 * to be addressed in full from your end so it doesnt ever happen again."
 *
 * ---------------------------------------------------------------------------
 * THE RULE
 * ---------------------------------------------------------------------------
 * For each shared package that has AT LEAST ONE consumer already rendering
 * something from it, a public component export is a FINDING when:
 *
 *   (a) no consumer app renders it, AND
 *   (b) the package does not render it itself.
 *
 * (a) alone is not enough. Node components like `StepNode` are mounted by the
 * canvas through the node-type registry, never by a consumer — flagging those
 * would make the gate noise and it would be ignored inside a week.
 *
 * The "at least one consumer" precondition is what makes this precise. A package
 * nobody has adopted yet is a ROADMAP item, not a defect. A package whose canvas
 * is mounted while its palette is not is the exact shape of the 2026-09-02 bug.
 *
 * ---------------------------------------------------------------------------
 * WHAT COUNTS AS EVIDENCE
 * ---------------------------------------------------------------------------
 * A JSX RENDER — `<Name`, `<Name>`, `<Name/>`, or `<Name` at end of line for the
 * multi-line form. Not an import: importing a component and never rendering it
 * is the defect, not the cure. The first draft of this checker matched
 * `<Name[ />]` and MISSED the multi-line form, which is how every real mount in
 * this estate is written.
 *
 * Tests and stories do NOT count as a consumer mount. A test that renders a
 * component proves the component works; it does not put it on anybody's screen,
 * and treating it as proof is how this class hides.
 *
 * ---------------------------------------------------------------------------
 * A RATCHET, NOT A BAN
 * ---------------------------------------------------------------------------
 * Findings are banked. A NEW one fails immediately; and if the count DROPS
 * without the bank being lowered, that fails too — a ratchet nobody tightens is
 * a permanent exemption wearing a gate's name.
 *
 * USAGE
 *   node scripts/check-exported-not-mounted.mjs [--self-test] [--banked=N] [--list]
 *
 * EXIT
 *   0  no new finding, bank exact
 *   1  a new finding, or a stale bank
 *   2  refused: no packages or no consumer apps found (an ABSENT result, not clean)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'

/** The apps that consume shared packages. Submodules of this superproject. */
export const CONSUMERS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4']

/**
 * Banked findings. Lower it in the SAME commit that mounts one.
 *
 * 3 today, and all three are THE original defect: `@bsuite/workflow-canvas`
 * exports WorkflowPalette, WorkflowToolbar and WorkflowInspector, and the crm7
 * commit that mounts them (crm7#2337) is not yet carried by this superproject's
 * gitlink. **This must go to 0 in the same commit that advances that pointer**,
 * and the ratchet below fails if it does not — a bank nobody lowers is a
 * permanent exemption wearing a gate's name.
 */
export const BANKED = 3

const TEST_MARKERS = ['__tests__', '.test.', '.spec.', '.stories.', '/test/', '/tests/']

function isTestPath(p) {
  return TEST_MARKERS.some((m) => p.includes(m))
}

/**
 * Does `source` RENDER `name` as JSX?
 *
 * A character walk, not a pattern (precedent__bsuite__20260812, Tier 2, binding).
 * After `<` we must see the exact name, then a character that cannot continue an
 * identifier — whitespace, `/`, `>`, or end of line. That last case is the
 * multi-line JSX form, and missing it is how the first draft of this checker
 * reported a mounted component as unmounted.
 */
export function rendersJsx(source, name) {
  let i = 0
  while (true) {
    i = source.indexOf('<' + name, i)
    if (i < 0) return false
    const after = source[i + 1 + name.length]
    // end of file counts: `<Name` as the very last thing is still a render
    if (after === undefined) return true
    const continues = (after >= 'a' && after <= 'z') || (after >= 'A' && after <= 'Z') ||
                      (after >= '0' && after <= '9') || after === '_' || after === '$'
    if (!continues) return true
    i += 1
  }
}

/**
 * Does `source` reference `name` as a whole word ANYWHERE?
 *
 * Scans every occurrence. A single `indexOf` finds the FIRST match and stops —
 * and `indexOf('StepNode')` lands inside `StepNodeDataSchema`, whose next
 * character continues the identifier, so the real reference three lines later is
 * never seen. That is the same bug as matching `<Name[ />]` and missing the
 * multi-line form: checking one occurrence and calling it the answer.
 */
export function referencesWholeWord(source, name) {
  let i = 0
  while (true) {
    i = source.indexOf(name, i)
    if (i < 0) return false
    const before = source[i - 1]
    const after = source[i + name.length]
    const part = (c) => c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_' || c === '$')
    if (!part(before) && !part(after)) return true
    i += 1
  }
}

/**
 * A SCREAMING_SNAKE_CASE name is a constant, not a component — `FLOW_IN`,
 * `ROW_HEIGHTS`, `CANVAS_GRID_COLUMNS`. They are declared in .tsx files beside
 * the components that use them, so a declaration scan picks them up; consumers
 * never RENDER them, and flagging them is how a gate becomes noise and gets
 * ignored inside a week.
 */
export function looksLikeConstant(name) {
  let hasUnderscore = false
  for (const ch of name) {
    if (ch === '_') { hasUnderscore = true; continue }
    if (ch >= 'a' && ch <= 'z') return false
  }
  return hasUnderscore || name === name.toUpperCase()
}

/**
 * Every import STATEMENT in a source file, joined onto one line each.
 *
 * Line-oriented import detection is wrong, and this is the THIRD time that shape
 * has bitten this one checker. An import in this estate is routinely written
 *
 *     import {
 *       SwimlaneNode,
 *     } from './SwimlaneNode.js';
 *
 * and `line.startsWith('import')` sees only the first line, so `SwimlaneNode` —
 * which registry.ts imports and mounts at `component: SwimlaneNode` — read as
 * never imported at all. The earlier two were matching `<Name[ />]` (missing
 * multi-line JSX) and a single `indexOf` (stopping inside a longer identifier).
 *
 * The lesson generalises: parse the CONSTRUCT, never the line it starts on.
 */
export function importStatements(source) {
  const out = []
  let i = 0
  while (true) {
    i = source.indexOf('import', i)
    if (i < 0) return out
    const before = source[i - 1]
    if (before !== undefined && !'\n\r\t ;}'.includes(before)) { i += 6; continue }
    // a statement ends at the first `;` or newline that follows a quote-closed source
    let j = i
    let depth = 0
    let quote = null
    while (j < source.length) {
      const c = source[j]
      if (quote) { if (c === quote && source[j - 1] !== '\\') quote = null }
      else if (c === "'" || c === '"' || c === '`') quote = c
      else if (c === '{') depth += 1
      else if (c === '}') depth -= 1
      else if (c === ';' && depth <= 0) { j += 1; break }
      else if (c === '\n' && depth <= 0 && j > i + 6 && source.slice(i, j).includes('from')) { break }
      j += 1
    }
    out.push(source.slice(i, j).replace(/\s+/g, ' '))
    i = j
  }
}

/** Walk a directory for source files, skipping build output and dependencies. */
function sourceFiles(dir, out = []) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo'].includes(e.name)) continue
      sourceFiles(full, out)
    } else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts') || e.name.endsWith('.jsx')) {
      out.push(full)
    }
  }
  return out
}

/**
 * The component exports of a package: a name that is (1) declared in a .tsx file
 * as `export function Name(` or `export const Name =`, and (2) re-exported from
 * the package's public entry point.
 *
 * Both halves matter. A component not in index.ts is internal and its absence
 * from a consumer is not a defect. A name in index.ts that is not declared in a
 * .tsx file is a hook, a type or a constant, and consumers do not RENDER those.
 */
export function componentExports(pkgDir) {
  const idx = path.join(pkgDir, 'src', 'index.ts')
  if (!existsSync(idx)) return []
  const indexSrc = readFileSync(idx, 'utf8')

  // Public names: everything in the index, minus `export type { ... }` blocks —
  // a type export is not a component even when it is capitalised.
  const publicNames = new Set()
  {
    const lines = indexSrc.split('\n')
    let inTypeBlock = false
    let inValueBlock = false
    for (const raw of lines) {
      const line = raw.trim()
      if (line.startsWith('export type {')) { inTypeBlock = !line.includes('}'); continue }
      if (inTypeBlock) { if (line.includes('}')) inTypeBlock = false; continue }
      if (line.startsWith('export {')) { inValueBlock = !line.includes('}'); if (line.includes('}')) {
        for (const n of line.slice(line.indexOf('{') + 1, line.indexOf('}')).split(',')) {
          const t = n.trim().split(' as ').pop().trim()
          if (t && t[0] >= 'A' && t[0] <= 'Z') publicNames.add(t)
        }
      } continue }
      if (inValueBlock) {
        if (line.includes('}')) { inValueBlock = false }
        for (const n of line.replace('}', '').split(',')) {
          const t = n.trim().split(' as ').pop().trim()
          if (t && t[0] >= 'A' && t[0] <= 'Z' && !t.includes('from')) publicNames.add(t)
        }
        continue
      }
    }
  }

  // Declared-as-a-component: `export function Name(` / `export const Name =` in a .tsx
  const declared = new Set()
  for (const f of sourceFiles(path.join(pkgDir, 'src'))) {
    if (!f.endsWith('.tsx') || isTestPath(f)) continue
    const src = readFileSync(f, 'utf8')
    for (const line of src.split('\n')) {
      const t = line.trim()
      for (const kw of ['export function ', 'export const ']) {
        if (!t.startsWith(kw)) continue
        const rest = t.slice(kw.length)
        let n = ''
        for (const ch of rest) {
          const ok = (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch === '_'
          if (!ok) break
          n += ch
        }
        if (n && n[0] >= 'A' && n[0] <= 'Z') declared.add(n)
      }
    }
  }
  return [...publicNames].filter((n) => declared.has(n) && !looksLikeConstant(n)).sort()
}

/** Names this package renders itself — registry-mounted nodes, internal composition. */
export function renderedInsidePackage(pkgDir, names) {
  const rendered = new Set()
  const files = sourceFiles(path.join(pkgDir, 'src')).filter((f) => !isTestPath(f))
  const sources = files.map((f) => readFileSync(f, 'utf8'))
  // (files and sources stay index-aligned — the mount scan below reads both)
  for (const n of names) {
    for (const src of sources) {
      if (rendersJsx(src, n)) { rendered.add(n); break }
    }
  }
  // MOUNTED WITHOUT JSX. A package wires its own components in at least three
  // ways that never write `<Name>`:
  //
  //   xyflow type map      SchemaCanvas.tsx:77   const nodeTypes = { entity: EntityNode }
  //   registry descriptor  registry.ts:196       component: StepNode,
  //   resolver function    DataGrid.tsx:66       return NumberEditor as unknown as ...
  //
  // Enumerating those three forms is a losing game — the fourth will be invented
  // next week and the gate will report five live cell editors as dead, which is
  // exactly what happened on the first run of this checker.
  //
  // So the rule is general: the package mounts it if any OTHER file in the
  // package IMPORTS it and then uses it. The import is what makes this precise
  // rather than broad — a name in prose or a comment has no import beside it, and
  // a file that imports a component and never mentions it again is dead code
  // rather than a mount.
  for (const [n] of names.map((n) => [n])) {
    if (rendered.has(n)) continue
    for (let k = 0; k < files.length; k += 1) {
      const f = files[k]
      if (f.endsWith(`${n}.tsx`) || f.endsWith(`${n}.ts`)) continue          // its own declaration
      if (f.endsWith(`${path.sep}index.ts`)) continue                        // re-export plumbing
      const src = sources[k]
      if (!src.includes('import')) continue
      // STATEMENT-level, not line-level — see importStatements().
      const importsIt = importStatements(src).some((stmt) => referencesWholeWord(stmt, n))
      if (!importsIt) continue
      // used beyond the import line?
      const uses = src.split('\n').filter((l) => !l.trim().startsWith('import') && referencesWholeWord(l, n)).length
      if (uses > 0) { rendered.add(n); break }
    }
  }
  return rendered
}

/** Names any consumer app RENDERS (tests and stories excluded). */
export function renderedByConsumers(root, names) {
  const rendered = new Map()
  for (const app of CONSUMERS) {
    const dir = path.join(root, app, 'src')
    if (!existsSync(dir)) continue
    const files = sourceFiles(dir).filter((f) => !isTestPath(f))
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const n of names) {
        if (rendered.has(n)) continue
        if (rendersJsx(src, n)) rendered.set(n, `${app}:${path.relative(root, f)}`)
      }
    }
  }
  return rendered
}

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want })

  t('a simple render is found', rendersJsx('<Foo />', 'Foo'), true)
  t('a self-closing render is found', rendersJsx('<Foo/>', 'Foo'), true)
  t('a render with a child is found', rendersJsx('<Foo>bar</Foo>', 'Foo'), true)

  // THE CASE THE FIRST DRAFT GOT WRONG: multi-line JSX, which is how every real
  // mount in this estate is written.
  t('a MULTI-LINE render is found', rendersJsx('<Foo\n  bar={1}\n/>', 'Foo'), true)

  // A longer name starting with the same letters must NOT count as a render.
  t('a longer name is not a match', rendersJsx('<FooBar />', 'Foo'), false)
  t('a prefix name still matches itself', rendersJsx('<FooBar />', 'FooBar'), true)

  // An IMPORT is not a render — importing and never rendering IS the defect.
  t('an import alone is not a render', rendersJsx("import { Foo } from 'x'", 'Foo'), false)

  // Mentioning it in a comment or a string is not a render.
  t('a bare mention is not a render', rendersJsx('// Foo is nice', 'Foo'), false)

  // THE BUG THAT MADE THE FIRST LIVE RUN WRONG: a single indexOf lands inside a
  // longer identifier and stops, so the real reference below is never seen.
  t('a whole-word reference AFTER a longer lookalike is found',
    referencesWholeWord('import { StepNodeDataSchema } from "x"\nimport { StepNode } from "y"', 'StepNode'), true)
  t('a lookalike ALONE is not a reference',
    referencesWholeWord('import { StepNodeDataSchema } from "x"', 'StepNode'), false)
  t('a registry descriptor field is a reference',
    referencesWholeWord('  component: StepNode,', 'StepNode'), true)
  t('a nodeTypes map entry is a reference',
    referencesWholeWord('const nodeTypes = { entity: EntityNode };', 'EntityNode'), true)
  t('a RESOLVER RETURN is a reference — the form that caused 5 false positives',
    referencesWholeWord('      return NumberEditor as unknown as Foo;', 'NumberEditor'), true)

  // THE MULTI-LINE IMPORT — the third line-oriented bug in this one checker.
  t('a MULTI-LINE import is captured as one statement',
    importStatements("import {\n  SwimlaneNode,\n} from './SwimlaneNode.js';").some((st) => referencesWholeWord(st, 'SwimlaneNode')), true)
  t('a single-line import is captured',
    importStatements("import { Foo } from 'x';").some((st) => referencesWholeWord(st, 'Foo')), true)
  t('a name NOT imported is not captured',
    importStatements("import { Foo } from 'x';").some((st) => referencesWholeWord(st, 'Bar')), false)

  t('SCREAMING_CASE is a constant', looksLikeConstant('FLOW_IN'), true)
  t('SCREAMING_CASE without underscore is a constant', looksLikeConstant('ROWHEIGHTS'), true)
  t('a PascalCase component is not a constant', looksLikeConstant('WorkflowPalette'), false)
  t('a single capital word component is not a constant', looksLikeConstant('DataGrid'), false)

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-exported-not-mounted: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length ? 1 : 0
}

function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())
  const root = process.cwd()
  const bankArg = argv.find((a) => a.startsWith('--banked='))
  const banked = bankArg ? Number(bankArg.split('=')[1]) : BANKED
  const list = argv.includes('--list')

  const pkgRoot = path.join(root, 'packages')
  if (!existsSync(pkgRoot)) {
    console.error('::error::no packages/ directory — that is an ABSENT result, not a clean one.')
    process.exit(2)
  }
  const presentConsumers = CONSUMERS.filter((a) => existsSync(path.join(root, a, 'src')))
  if (presentConsumers.length === 0) {
    console.error('::error::no consumer app source found — submodules are probably not checked out. ABSENT, not clean.')
    process.exit(2)
  }

  const findings = []
  let pkgsChecked = 0
  let pkgsSkipped = 0
  for (const name of readdirSync(pkgRoot)) {
    const pkgDir = path.join(pkgRoot, name)
    if (!statSync(pkgDir).isDirectory()) continue
    const comps = componentExports(pkgDir)
    if (comps.length === 0) continue
    const byConsumer = renderedByConsumers(root, comps)
    // THE PRECONDITION: a package nobody has adopted is a roadmap item, not a bug.
    if (byConsumer.size === 0) { pkgsSkipped += 1; continue }
    pkgsChecked += 1
    const inside = renderedInsidePackage(pkgDir, comps)
    for (const c of comps) {
      if (byConsumer.has(c) || inside.has(c)) continue
      findings.push({ pkg: `@bsuite/${name}`, component: c, mountedSibling: [...byConsumer.keys()][0] })
    }
    if (list) {
      console.log(`  @bsuite/${name}: ${comps.length} component export(s), ${byConsumer.size} mounted by a consumer, ${inside.size} mounted internally`)
    }
  }

  console.log(`check-exported-not-mounted: ${pkgsChecked} adopted package(s) checked, ${pkgsSkipped} not yet adopted (skipped), ${presentConsumers.length} consumer app(s)`)
  console.log(`  exported-but-never-mounted: ${findings.length}   banked: ${banked}`)

  if (findings.length > banked) {
    console.error('')
    console.error(`::error::${findings.length - banked} component(s) are EXPORTED by an adopted package and rendered NOWHERE.`)
    console.error('  A consumer already mounts a sibling from the same package, so this is not "not adopted yet" —')
    console.error('  it is a control that was built, published, and left off the screen. That shipped once as a')
    console.error('  workflow builder with no way to add, rename, delete or publish a node, and every gate was green.')
    console.error('')
    for (const f of findings) {
      console.error(`    ${f.pkg} exports ${f.component} — nothing renders it (a sibling IS mounted at ${f.mountedSibling})`)
    }
    console.error('')
    console.error('  Mount it, or stop exporting it. There is no third state.')
    process.exit(1)
  }
  if (findings.length < banked) {
    console.error('')
    console.error(`::error::the bank is STALE: ${findings.length} finding(s) remain but BANKED is ${banked}.`)
    console.error(`  Lower BANKED to ${findings.length} in the same commit that mounted one.`)
    process.exit(1)
  }
  console.log('  every exported component of every adopted package is rendered somewhere.')
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
