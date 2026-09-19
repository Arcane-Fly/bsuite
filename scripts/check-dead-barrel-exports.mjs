#!/usr/bin/env node
/**
 * DEAD BARREL EXPORTS — a two-way ratchet.
 *
 * A barrel (`index.ts`) that re-exports a symbol nothing imports makes dead code
 * look like public API. Measured 2026-08-29: 816 such exports across five apps,
 * including throughput's ENTIRE enhanced-navigation suite — MegaMenu,
 * TenantSwitcher, GlobalSearch, MobileBottomNav, EnhancedBreadcrumbs and the
 * EnhancedNavigation composite that renders them, 1,080 lines with zero real
 * import or JSX sites outside their own directory, while MainContent renders the
 * plain 390-line <Navigation /> instead.
 *
 * WHAT THIS GATE DOES NOT DO. It does not say "delete these". Some are
 * deliberate public API (`cardVariants`), some are a package boundary someone
 * intends to consume later, and deleting pre-existing work is the operator's
 * call. It holds the LINE: the count may fall, and it may not rise.
 *
 * COMMENTS ARE STRIPPED BEFORE COUNTING, and that is not a nicety. Counting a
 * comment as a use is how this exact measurement first came back wrong three
 * times in one session: `EnhancedNavigation` read as "imported by 2 files" when
 * both were comments ABOUT it — one of them a comment explaining that nothing
 * mounts it. Prose about a symbol is not a use of it.
 *
 * THE METHOD, so a later reader can challenge the number rather than trust it:
 *   1. a barrel is a file named index.ts/index.tsx containing `export { … }`
 *   2. its exported NAMES are collected (aliases resolve to the exported name)
 *   3. a name is USED if any .ts/.tsx file OUTSIDE the barrel's own directory,
 *      with comments stripped, contains an import/from mentioning it or a
 *      `<Name` JSX opener
 *   4. `export *` is not counted — it names nothing, so nothing can be judged
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.DEAD_BARREL_SCAN_ROOT ? resolve(process.env.DEAD_BARREL_SCAN_ROOT) : resolve(HERE, '..')
const BASELINE = join(HERE, 'dead-barrel-exports-baseline.json')
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput']
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__tests__', 'coverage', '.turbo'])

/** Remove block and line comments. A symbol named in prose is not a use of it. */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/** Exported names from `export { a, b as c }`. `export *` names nothing. */
export function barrelExportNames(src) {
  const names = []
  for (const m of stripComments(src).matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.push(name)
    }
  }
  return [...new Set(names)]
}

/**
 * Collapse `import { ... } from '...'` blocks onto one line.
 *
 * WHY THIS EXISTS. `importRe` below is deliberately line-bounded (`[^\\n]*`) so
 * that a bare mention of a name on some unrelated line cannot read as an import.
 * But that also means a MULTI-LINE import block hides every symbol inside it:
 *
 *     import {
 *       EmptyState,          <- no `import` and no `from` on this line
 *     } from '@/components/uplift'
 *
 * so `EmptyState` never matched, and the barrel export it came from counted as
 * DEAD. The gate's number was therefore a function of import FORMATTING, not of
 * deadness — and it moved when prettier reflowed a line nobody had touched.
 *
 * Found 2026-08-30: converting one page collapsed one such block and crm7's dead
 * count FELL by 1 while that edit had REMOVED two imports, which should only
 * ever raise it. An inverted move is what exposed it.
 *
 * Collapsing rather than widening the regex keeps the line-bounded guarantee:
 * the symbol still has to sit inside a real import statement.
 */
export function collapseMultilineImports(text) {
  return text.replace(/\bimport\s*(?:type\s+)?\{[^}]*\}\s*from/g, (m) => m.replace(/\s+/g, ' '))
}

export function isUsed(name, files, ownDir) {
  const importRe = new RegExp(`\\b(?:import|from|require)\\b[^\\n]*\\b${name}\\b`)
  const jsxRe = new RegExp(`<${name}[\\s/>]`)
  for (const [path, text] of files) {
    if (path.startsWith(ownDir)) continue
    if (importRe.test(collapseMultilineImports(text)) || jsxRe.test(text)) return true
  }
  return false
}

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue
    const p = join(dir, e)
    let st; try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e) && !/\.(test|spec)\./.test(e)) out.push(p)
  }
  return out
}

function measure(app) {
  const src = join(ROOT, app, 'src')
  if (!existsSync(src)) return null
  const files = walk(src).map((f) => [f, stripComments(readFileSync(f, 'utf8'))])
  let dead = 0, total = 0
  const worst = []
  for (const [path, text] of files) {
    if (!/[\\/]index\.tsx?$/.test(path)) continue
    const names = barrelExportNames(readFileSync(path, 'utf8'))
    if (!names.length) continue
    const ownDir = dirname(path) + sep
    const d = names.filter((n) => !isUsed(n, files, ownDir))
    total += names.length; dead += d.length
    if (d.length) worst.push({ barrel: path.slice(ROOT.length + app.length + 2), dead: d.length, of: names.length })
  }
  worst.sort((a, b) => b.dead - a.dead)
  return { dead, total, worst: worst.slice(0, 3) }
}

function selfTest() {
  const checks = [
    ['comment is not a use', isUsed('Foo', [['/x/a.ts', stripComments('// import Foo from "y"')]], '/b') === false],
    ['real import is a use', isUsed('Foo', [['/x/a.ts', 'import { Foo } from "y"']], '/b') === true],
    ['jsx opener is a use', isUsed('Foo', [['/x/a.ts', 'const a = <Foo />']], '/b') === true],
    ['own dir does not count', isUsed('Foo', [['/b/a.ts', 'import { Foo } from "y"']], '/b') === false],
    ['alias resolves to exported name', barrelExportNames('export { a as B }').join() === 'B'],
    ['type export counted', barrelExportNames('export type { T }').join() === 'T'],
    ['export * names nothing', barrelExportNames("export * from './x'").length === 0],
    // The multi-line blind spot. Both FAIL without collapseMultilineImports.
    ['multi-line import is a use',
      isUsed('Foo', [['/x/a.ts', 'import {\n  Foo,\n  Bar,\n} from "y"']], '/b') === true],
    ['multi-line TYPE import is a use — types never appear in JSX, so nothing else catches them',
      isUsed('T', [['/x/a.ts', 'import {\n  type T,\n} from "y"']], '/b') === true],
    ['a bare mention on its own line is still NOT a use',
      isUsed('Foo', [['/x/a.ts', 'const s = 1\nFoo\n']], '/b') === false],
  ]
  let bad = 0
  for (const [name, ok] of checks) { if (!ok) { console.error(`  SELF-TEST FAIL: ${name}`); bad++ } }
  console.log(bad ? `\n  self-test: ${bad} FAILED` : `  self-test: ${checks.length}/${checks.length} pass`)
  return bad === 0
}

const args = process.argv.slice(2)
if (args.includes('--self-test')) process.exit(selfTest() ? 0 : 1)
if (!selfTest()) { console.error('  refusing to measure with a broken self-test'); process.exit(1) }

const now = {}
for (const app of APPS) { const m = measure(app); if (m) now[app] = m }

const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null
console.log('')
let rose = false, fell = false
for (const app of APPS) {
  const n = now[app]
  if (!n) { console.log(`  ${app.padEnd(24)} TREE ABSENT — not measured (an absent app is not a clean one)`); continue }
  const b = base?.[app]?.dead
  let verdict = b == null ? 'no baseline' : n.dead > b ? `ROSE ${b} -> ${n.dead}` : n.dead < b ? `fell ${b} -> ${n.dead} (bank it)` : `holds at ${b}`
  if (b != null && n.dead > b) rose = true
  if (b != null && n.dead < b) fell = true
  console.log(`  ${app.padEnd(24)} ${String(n.dead).padStart(4)} dead of ${String(n.total).padStart(4)} barrel export(s)   ${verdict}`)
  for (const w of n.worst) console.log(`       ${w.barrel} — ${w.dead}/${w.of}`)
}

if (args.includes('--update')) {
  writeFileSync(BASELINE, `${JSON.stringify(now, null, 2)}\n`)
  console.log(`\n  banked: ${Object.entries(now).map(([a, v]) => `${a}=${v.dead}`).join(' ')}`)
  process.exit(0)
}
if (!base) { console.log(`\n  no baseline yet — run --update to arm the ratchet`); process.exit(0) }
if (rose) { console.error(`\n  DEAD-BARREL RATCHET BROKEN — a barrel gained an export nothing imports.\n  Either wire it, or do not export it from the barrel.`); process.exit(1) }
if (fell) { console.error(`\n  Dead barrel exports FELL without being banked. Run --update.\n  An unbanked fall is as consistent with a blinded matcher as with progress.`); process.exit(1) }
console.log('\ncheck-dead-barrel-exports: OK — ratchet holds.')
