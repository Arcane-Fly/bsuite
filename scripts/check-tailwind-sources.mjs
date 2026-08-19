#!/usr/bin/env node
/**
 * check-tailwind-sources.mjs — every @bsuite package that ships class names must
 * be registered as a Tailwind `@source` in every app that depends on it.
 *
 * WHY THIS EXISTS
 *
 * Tailwind v4 does not scan node_modules. A shared package's `className` strings
 * are therefore invisible to the consumer's build unless the consumer names the
 * package's dist/ in an `@source` directive. When it does not, the utilities are
 * never generated — and that failure is SILENT BY CONSTRUCTION: a missing utility
 * is not an error, it is an element rendered with one less class than the author
 * wrote. Nothing throws, nothing warns, the build is green, and the page is wrong.
 *
 * Measured 2026-08-19. Every app registered `@bsuite/ui` and `@bsuite/nav-core`
 * and nothing else, while depending on four more packages that ship classes:
 *
 *   schema-builder     749 Tailwind-looking class occurrences   registered nowhere
 *   page-builder       272                                      registered nowhere
 *   schema-registry     94                                      registered nowhere
 *   data-grid           39                                      registered nowhere
 *
 * braden had no `@source` directives at all, while importing three of them.
 *
 * The visible symptom that led here: the served stylesheet on d.suite.crm7.app,
 * d.crm.crm7.app and d.ideas.crm7.app each DECLARED `--glow-card` as a real
 * chromatic value and contained no rule that read it, because the utility that
 * reads it — `dark:shadow-[var(--glow-card,none)]` — exists only inside
 * @bsuite/page-builder's PageGridLayout. Every dark-mode card in three apps drew a
 * flat achromatic shadow instead of the accent glow. business-suite-unified's own
 * stylesheet comment had already named this exact bug class, "producing
 * transparent dropdowns and invisible text", for the two packages someone did
 * remember to register.
 *
 * WHERE IT COUNTS FROM, AND WHY
 *
 * Class literals are counted from the PARENT's `packages/<name>/src`, not from an
 * app's installed `node_modules/<dep>/dist`. CI checks out submodules but does not
 * install them, so a dist-based count would find nothing and the gate would report
 * a clean tree it never scanned — the exact "skip reads as pass" failure the
 * sibling slug-collision gate exists to prevent. `--require-packages=N` is the
 * positive control against that.
 *
 * `@bsuite/theme` ships CSS, not components, so it needs no `@source`. That is
 * reported rather than silently skipped, because "not required" and "not checked"
 * must not look the same.
 *
 * Usage:
 *   node scripts/check-tailwind-sources.mjs
 *   node scripts/check-tailwind-sources.mjs --self-test
 *   node scripts/check-tailwind-sources.mjs --require-packages=4
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** App -> the CSS entrypoint that carries its @source directives. */
const APPS = {
  crm7: 'src/index.css',
  'business-suite-unified': 'src/index.css',
  throughput: 'src/index.css',
  braden: 'src/index.css',
  conduit: 'src/app/globals.css',
  'R80.4': 'src/index.css',
}

/** Minimum class literals before a package is considered to ship classes. */
const SHIPS_CLASSES_THRESHOLD = 5

/** Compiled JSX emits `className: "..."`; source JSX emits `className="..."`. */
const CLASS_LITERAL = /className\s*[=:]\s*["'`]/g

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '__tests__' || e === '.turbo') continue
    const p = join(dir, e)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(p, out)
    else if (/\.(jsx|tsx|js|mjs|cjs|ts)$/.test(e) && !/\.(test|spec|d)\.[a-z]+$/.test(e)) out.push(p)
  }
  return out
}

function countClassLiterals(dir) {
  let n = 0
  for (const f of walk(dir)) {
    let src
    try {
      src = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    n += (src.match(CLASS_LITERAL) || []).length
  }
  return n
}

/** Does this CSS text register `dep`'s dist as a Tailwind source? */
function isRegistered(css, dep) {
  const escaped = dep.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(`@source\\s+["'][^"']*${escaped}\\/dist["']`).test(css)
}

// ---------------------------------------------------------------------------
// Self-test — a gate whose pass and no-op states are indistinguishable hides
// defects, so prove the detector can still fail before trusting a pass.
// ---------------------------------------------------------------------------
if (process.argv.includes('--self-test')) {
  const cases = [
    ['registers the dep', '@source "../node_modules/@bsuite/ui/dist";', '@bsuite/ui', true],
    ['registers with ../../', '@source "../../node_modules/@bsuite/ui/dist";', '@bsuite/ui', true],
    ['single quotes', "@source '../node_modules/@bsuite/ui/dist';", '@bsuite/ui', true],
    ['different dep does not count', '@source "../node_modules/@bsuite/ui/dist";', '@bsuite/page-builder', false],
    // A package NAMED in prose must not satisfy the gate. Same anti-prose case
    // as the slug-collision checker: a grep cannot tell a mention from a rule.
    ['a mention in a comment is not a registration', '/* see @bsuite/page-builder/dist */', '@bsuite/page-builder', false],
    ['an @import is not an @source', '@import "@bsuite/page-builder/dist/x.css";', '@bsuite/page-builder', false],
    ['empty css', '', '@bsuite/ui', false],
  ]
  let bad = 0
  for (const [name, css, dep, expected] of cases) {
    const got = isRegistered(css, dep)
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${name} — expected ${expected}, got ${got}`)
      bad++
    }
  }
  // The counter must count, and must not count a bare mention of the word.
  const counterCases = [
    ['counts compiled jsx', 'className: "flex gap-2"', 1],
    ['counts source jsx', '<div className="flex" />', 1],
    ['does not count the bare word', 'the className prop is documented here', 0],
  ]
  for (const [name, src, expected] of counterCases) {
    const got = (src.match(CLASS_LITERAL) || []).length
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${name} — expected ${expected}, got ${got}`)
      bad++
    }
  }
  if (bad) {
    console.error(`\n${bad} self-test failure(s) — the checker itself is broken; its verdicts mean nothing.`)
    process.exit(1)
  }
  console.log(`check-tailwind-sources --self-test: OK (${cases.length + counterCases.length} cases)`)
  process.exit(0)
}

const requireArg = process.argv.find((a) => a.startsWith('--require-packages='))
const REQUIRE_PACKAGES = requireArg ? Number(requireArg.split('=')[1]) : 0

// ---------------------------------------------------------------------------
// Which packages ship classes? Counted from the parent's own sources.
// ---------------------------------------------------------------------------
const shipsClasses = new Map()
const noClasses = []
const packagesDir = join(ROOT, 'packages')
for (const name of existsSync(packagesDir) ? readdirSync(packagesDir).sort() : []) {
  const src = join(packagesDir, name, 'src')
  if (!existsSync(src)) continue
  const n = countClassLiterals(src)
  if (n >= SHIPS_CLASSES_THRESHOLD) shipsClasses.set(`@bsuite/${name}`, n)
  else noClasses.push(`@bsuite/${name} (${n})`)
}

if (shipsClasses.size < REQUIRE_PACKAGES) {
  console.error(
    `FAIL positive control: only ${shipsClasses.size} class-shipping package(s) found under packages/, ` +
      `expected at least ${REQUIRE_PACKAGES}. A clean result on a tree that was not scanned is ` +
      `meaningless, not clean.`,
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Every app must register every class-shipping package it depends on.
// ---------------------------------------------------------------------------
let failures = 0
let checked = 0
const notes = []

for (const [app, cssRel] of Object.entries(APPS)) {
  const appDir = join(ROOT, app)
  const pkgPath = join(appDir, 'package.json')
  const cssPath = join(appDir, cssRel)
  if (!existsSync(pkgPath)) {
    notes.push(`${app}: no package.json — submodule not initialised, skipped`)
    continue
  }
  if (!existsSync(cssPath)) {
    console.error(`FAIL ${app}: CSS entrypoint ${cssRel} does not exist`)
    failures++
    continue
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
  const css = readFileSync(cssPath, 'utf8')
  const prefix = cssRel.includes('/app/') ? '../../' : '../'

  for (const dep of deps) {
    if (!shipsClasses.has(dep)) {
      if (dep.startsWith('@bsuite/')) notes.push(`${app} -> ${dep}: ships no classes, @source not required`)
      continue
    }
    checked++
    if (!isRegistered(css, dep)) {
      console.error(
        `FAIL ${app}: ${dep} ships ${shipsClasses.get(dep)} class-name literals but is not an @source in ${cssRel}\n` +
          `       add:  @source "${prefix}node_modules/${dep}/dist";`,
      )
      failures++
    }
  }
}

if (process.env.VERBOSE) {
  notes.forEach((n) => console.log(`note  ${n}`))
  console.log(`note  packages shipping no classes (no @source needed): ${noClasses.join(', ')}`)
}

if (failures > 0) {
  console.error(
    `\n${failures} unregistered package/app pair(s). Tailwind does not scan node_modules, so every ` +
      `class those packages ship is missing from the generated CSS and their components render ` +
      `unstyled. This never surfaces as a build error — see this file's header.`,
  )
  process.exit(1)
}

console.log(
  `check-tailwind-sources: OK — ${checked} class-shipping package/app pair(s) registered, ` +
    `across ${shipsClasses.size} package(s) that ship classes`,
)
