#!/usr/bin/env node
/**
 * Every relative import in a published package must carry its file extension.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The @bsuite/* packages ship as ESM ("type": "module"). Node's ESM resolver is
 * STRICT: `import './tableFeatures'` is a resolution error, while
 * `import './tableFeatures.js'` resolves. Bundlers (Vite, webpack) are LENIENT and
 * silently fix it up, so the mistake is invisible in every place we normally look:
 *
 *   - `tsc --noEmit`      passes (TypeScript resolves by its own rules)
 *   - `pnpm build`        passes (the bundler tolerates it)
 *   - the app's dev server passes (Vite again)
 *   - the app's production build passes (Vite again)
 *
 * It fails only where a real Node resolver is used — a consumer's Vitest run, or
 * anything importing the published tarball under Node. Measured 2026-08-31:
 * @bsuite/data-grid@3.0.0 shipped `import './tableFeatures'` and broke 17 test
 * suites in crm7, which were then worked around with `server.deps.inline` rather
 * than fixed at source. A workaround in every consumer is the shape this gate
 * exists to stop — the fix belongs in the one package, not in N consumers.
 *
 * WHY A SCRIPT AND NOT AN ESLINT RULE
 * ───────────────────────────────────
 * `packages/eslint-config` is consumed by NO app in this estate (measured: five
 * standalone configs, zero importers), so a rule added there would be dead code
 * that reports zero and looks clean. A standalone script is reachable.
 *
 * TYPE-ONLY IMPORTS COUNT. `import type { X } from './y'` is erased at build, so
 * it cannot break at runtime — but it is the same keystroke, it teaches the wrong
 * pattern in review, and a later edit that drops `type` turns it into a live bug
 * with no diff to blame. Both are reported.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo'])
const CODE = ['.ts', '.tsx', '.mts', '.cts']
/** Extensions that are legitimate on a relative specifier. */
const OK_EXT = ['.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.svg', '.png', '.wasm']

/** True when a relative specifier already ends in an extension we accept. */
export function hasAllowedExtension(spec) {
  for (const e of OK_EXT) if (spec.endsWith(e)) return true
  return false
}

/** True when the specifier is relative (./ or ../) — bare and absolute are out of scope. */
export function isRelative(spec) {
  return spec.startsWith('./') || spec.startsWith('../')
}

/**
 * Extract every relative specifier from `from '...'` / `import('...')` /
 * `export ... from '...'`. Deliberately NOT a regex over the whole file: a
 * character scan cannot be fooled by a specifier that appears inside a comment
 * describing this very rule, which is exactly what this file contains.
 */
export function relativeSpecifiers(source) {
  const out = []
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()
    // Skip comment lines — this file documents the bad pattern in prose.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
    let j = 0
    while (j < line.length) {
      const q = line[j]
      if (q !== "'" && q !== '"') { j += 1; continue }
      const end = line.indexOf(q, j + 1)
      if (end === -1) break
      const spec = line.slice(j + 1, end)
      const before = line.slice(0, j)
      const isImportish =
        before.includes('from ') || before.includes('import(') || before.trimEnd().endsWith('import')
      if (isImportish && isRelative(spec) && !hasAllowedExtension(spec)) {
        out.push({ line: i + 1, spec })
      }
      j = end + 1
    }
  }
  return out
}

function walk(dir, acc) {
  let entries
  try { entries = readdirSync(dir) } catch { return acc }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) walk(full, acc)
    else if (CODE.some((e) => name.endsWith(e))) acc.push(full)
  }
  return acc
}

function selfTest() {
  const cases = []
  const t = (name, got, want) => cases.push({ name, ok: JSON.stringify(got) === JSON.stringify(want), got, want })

  t('extensionless relative import is reported',
    relativeSpecifiers("import { a } from './tableFeatures'").map((r) => r.spec), ['./tableFeatures'])
  t('the same import WITH .js is clean',
    relativeSpecifiers("import { a } from './tableFeatures.js'").map((r) => r.spec), [])
  t('parent-relative is reported too',
    relativeSpecifiers("import type { G } from '../tableFeatures'").map((r) => r.spec), ['../tableFeatures'])
  // NEGATIVE CONTROL: a bare package specifier is not our business.
  t('bare package specifier is not reported',
    relativeSpecifiers("import React from 'react'").map((r) => r.spec), [])
  // NEGATIVE CONTROL: a non-import string that merely looks like a path.
  t('a plain string that looks like a path is not an import',
    relativeSpecifiers("const p = './tableFeatures'").map((r) => r.spec), [])
  // NEGATIVE CONTROL: the prose in THIS file must not report itself.
  t('a commented-out bad import is not reported',
    relativeSpecifiers("// import { a } from './tableFeatures'").map((r) => r.spec), [])
  t('a jsdoc line mentioning the bad form is not reported',
    relativeSpecifiers(" * `import './tableFeatures'` is a resolution error").map((r) => r.spec), [])
  t('dynamic import is reported',
    relativeSpecifiers("const m = await import('./lazy')").map((r) => r.spec), ['./lazy'])
  t('re-export is reported',
    relativeSpecifiers("export { a } from './x'").map((r) => r.spec), ['./x'])
  t('css and json specifiers are allowed',
    relativeSpecifiers("import './a.css'\nimport d from './b.json'").map((r) => r.spec), [])
  t('hasAllowedExtension: .js yes', hasAllowedExtension('./a.js'), true)
  t('hasAllowedExtension: none no', hasAllowedExtension('./a'), false)
  t('isRelative: bare is not relative', isRelative('react'), false)

  const bad = cases.filter((c) => !c.ok)
  for (const c of cases) {
    console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.ok ? '' : ` — got ${JSON.stringify(c.got)}, want ${JSON.stringify(c.want)}`}`)
  }
  console.log(`\ncheck-esm-relative-extensions: ${cases.length - bad.length}/${cases.length} self-test(s) passed`)
  return bad.length ? 1 : 0
}

function main() {
  if (process.argv.includes('--self-test')) process.exit(selfTest())

  const roots = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const scan = roots.length ? roots : ['packages']
  const files = []
  for (const r of scan) walk(r, files)

  // A gate that examined nothing is not a clean gate.
  if (files.length === 0) {
    console.error(`::error::check-esm-relative-extensions examined 0 files under ${scan.join(', ')} — that is an ABSENT result, not a clean one.`)
    process.exit(2)
  }

  let violations = 0
  for (const f of files) {
    let src
    try { src = readFileSync(f, 'utf8') } catch { continue }
    for (const { line, spec } of relativeSpecifiers(src)) {
      violations += 1
      console.error(`::error file=${f},line=${line}::relative import '${spec}' has no file extension. Node's ESM resolver requires one; bundlers do not, so this passes typecheck AND build and fails only in a consumer's Node/Vitest run. Write '${spec}.js' (the .js extension is correct even though the source is .ts).`)
    }
  }

  console.log(`check-esm-relative-extensions: ${files.length} file(s) under ${scan.join(', ')}, ${violations} violation(s)`)
  process.exit(violations ? 1 : 0)
}

main()
