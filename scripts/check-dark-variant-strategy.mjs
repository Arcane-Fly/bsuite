#!/usr/bin/env node
/**
 * check-dark-variant-strategy.mjs — an app that toggles a `.dark` CLASS must
 * configure Tailwind's dark variant to match, or every `dark:` utility it can
 * reach is compiled against a media query the app never triggers.
 *
 * WHY THIS EXISTS
 *
 * Tailwind v4's DEFAULT dark variant is `@media (prefers-color-scheme: dark)`.
 * Every BSuite app instead toggles a `.dark` class on `<html>` from its own
 * theme provider, because the estate has an in-app theme switcher and a stored
 * preference. Those two facts only agree if the app declares
 * `darkMode: 'class'` and points Tailwind at that config with `@config`.
 *
 * When it does not, nothing errors. The utilities are generated, just behind
 * the wrong selector — so they apply when the OPERATING SYSTEM is dark and
 * never when the user picks dark in the app. Tokens defined as literal
 * `.dark { --x }` custom properties keep working, which is why the page looks
 * *nearly* right and the failure reads as "the borders look hard" rather than
 * as a broken build.
 *
 * MEASURED 2026-08-20 on live production, served stylesheets:
 *
 *   conduit   @media prefers-color-scheme:dark = 1     .dark-scoped rules = 35
 *   crm7      @media prefers-color-scheme:dark = 0     .dark-scoped rules = 99
 *
 * conduit shipped with NO `tailwind.config.*` and no `@config` at all. It
 * consumes `@bsuite/page-builder` (which carries the single
 * `dark:shadow-[var(--glow-card,none)]` utility that paints the dark-mode card
 * glow) and `@bsuite/schema-builder` (28 more `dark:` utilities). All 29 were
 * dead, plus 19 in conduit's own source. The operator reported it as "on
 * conduit the borders look hard without shadow or glow".
 *
 * R80.4 has the same missing config and is currently UNAFFECTED — it consumes
 * neither dark-shipping package and has zero `dark:` utilities of its own. That
 * is a fact about today's dependency graph, not a property of the app, which is
 * exactly why this is a gate and not a note: the day R80.4 adds one `dark:`
 * class, or picks up a package that has one, it breaks silently.
 *
 * WHAT IT CHECKS
 *
 * For each app that toggles a `.dark` class in its source: assert it declares a
 * class-based dark strategy — either `darkMode: 'class'` in a Tailwind config
 * that its CSS entrypoint references with `@config`, or a `@custom-variant dark`
 * declaration reachable from that entrypoint (the Tailwind v4 CSS-first idiom).
 * Either satisfies it; neither is a failure.
 *
 * Exits non-zero on any app that toggles the class without configuring it.
 *
 * Usage:
 *   node scripts/check-dark-variant-strategy.mjs
 *   node scripts/check-dark-variant-strategy.mjs --self-test
 *   node scripts/check-dark-variant-strategy.mjs --require-apps=5
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** App -> the CSS entrypoint that carries its Tailwind directives. */
const APPS = {
  crm7: 'src/index.css',
  'business-suite-unified': 'src/index.css',
  throughput: 'src/index.css',
  braden: 'src/index.css',
  conduit: 'src/app/globals.css',
  'R80.4': 'src/index.css',
}

/** Does the app toggle a `.dark` class anywhere in its own source? */
const TOGGLES_DARK_CLASS = [
  /classList\.(?:toggle|add)\(\s*['"`]dark['"`]/,
  /\bclasses\.(?:toggle|add)\(\s*['"`]dark['"`]/,
  /setAttribute\(\s*['"`]class['"`]\s*,\s*['"`]dark['"`]/,
  /document\.documentElement\.className\s*=\s*['"`]dark['"`]/,
]

/** `darkMode: 'class'` or `darkMode: ['class', ...]`, single or double quoted. */
const DARK_MODE_CLASS = /darkMode\s*:\s*\[?\s*['"]class['"]/

/** Tailwind v4's CSS-first equivalent. */
const CUSTOM_VARIANT_DARK = /@custom-variant\s+dark\b/

function walk(dir, out = [], depth = 0) {
  if (depth > 8) return out
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'dist' || e === '.next' || e === 'build') continue
    const p = join(dir, e)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(p, out, depth + 1)
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|html)$/.test(e)) out.push(p)
  }
  return out
}

function togglesDarkClass(appDir) {
  for (const f of walk(join(appDir, 'src'))) {
    let src
    try {
      src = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    if (TOGGLES_DARK_CLASS.some((re) => re.test(src))) return f.slice(appDir.length + 1)
  }
  // The pre-render block often lives in index.html rather than src/.
  const indexHtml = join(appDir, 'index.html')
  if (existsSync(indexHtml)) {
    const src = readFileSync(indexHtml, 'utf8')
    if (TOGGLES_DARK_CLASS.some((re) => re.test(src))) return 'index.html'
  }
  return null
}

/** Class-based dark configured? Returns a reason string, or null if not. */
function darkStrategy(appDir, cssRel) {
  const cssPath = join(appDir, cssRel)
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : ''

  if (CUSTOM_VARIANT_DARK.test(css)) return `@custom-variant dark in ${cssRel}`

  // A @config DIRECTIVE plus darkMode:'class' in the file it names.
  //
  // ANCHORED TO THE START OF A LINE, and that is not fussiness. The first
  // version of this used a bare /@config\s+["']([^"']+)["']/ and matched the
  // FIRST occurrence anywhere in the file — which, in conduit's globals.css,
  // is inside a COMMENT two lines above the real directive:
  //
  //     line 30:  `@config "../tailwind.config.js";` — throughput's src/index.css
  //     line 32:  @config "../../tailwind.config.js";
  //
  // The comment quotes a SIBLING app's relative path, so the checker resolved
  // conduit/src/tailwind.config.js, found nothing, and reported a correctly
  // configured app as broken. Exactly the prose-vs-code confusion this estate
  // keeps hitting — and this file's own toggle detector already had a case for
  // it while the config extraction did not.
  //
  // EVERY match is considered, not just the first: a file may legitimately
  // discuss @config before using it, and taking the first hit is what caused
  // the bug.
  for (const m of css.matchAll(/^[ \t]*@config\s+["']([^"']+)["']/gm)) {
    const cfgPath = resolve(dirname(cssPath), m[1])
    if (existsSync(cfgPath) && DARK_MODE_CLASS.test(readFileSync(cfgPath, 'utf8'))) {
      return `@config -> ${m[1]} with darkMode:'class'`
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Self-test — a gate whose pass and no-op states are indistinguishable hides
// defects, so prove the detectors can still fail before trusting a pass.
// ---------------------------------------------------------------------------
if (process.argv.includes('--self-test')) {
  const cases = [
    ['toggle detected, double quotes', `classList.toggle("dark", x)`, TOGGLES_DARK_CLASS, true],
    ['toggle detected, single quotes', `classList.toggle('dark', x)`, TOGGLES_DARK_CLASS, true],
    ['toggle via a local alias', `classes.toggle('dark', resolved === 'dark')`, TOGGLES_DARK_CLASS, true],
    ['classList.add', `document.documentElement.classList.add('dark')`, TOGGLES_DARK_CLASS, true],
    // A MENTION is not a toggle — same anti-prose rule the sibling gates use.
    ['a comment mentioning dark is not a toggle', `// we toggle the dark class elsewhere`, TOGGLES_DARK_CLASS, false],
    ['toggling some other class', `classList.toggle('compact', x)`, TOGGLES_DARK_CLASS, false],
    ['darkMode class, single quotes', `darkMode: 'class',`, [DARK_MODE_CLASS], true],
    ['darkMode class, array form', `darkMode: ["class", '[data-theme="dark"]'],`, [DARK_MODE_CLASS], true],
    ['darkMode media is NOT class', `darkMode: 'media',`, [DARK_MODE_CLASS], false],
    ['custom-variant dark', `@custom-variant dark (&:where(.dark, .dark *));`, [CUSTOM_VARIANT_DARK], true],
  ]
  let bad = 0
  for (const [name, src, res, expected] of cases) {
    const got = res.some((re) => re.test(src))
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${name} — expected ${expected}, got ${got}`)
      bad++
    }
  }

  // THE @config EXTRACTION, which had the bug this case now pins.
  //
  // conduit's globals.css quotes a sibling app's `@config "../tailwind.config.js"`
  // inside a comment two lines above its own real `@config "../../tailwind.config.js"`.
  // An unanchored match took the comment, resolved the wrong path, and reported a
  // correctly configured app as broken. Line-anchored, and every match considered.
  const CONFIG_DIRECTIVE = /^[ \t]*@config\s+["']([^"']+)["']/gm
  const configCases = [
    ['a real directive is found', `@config "../tailwind.config.js";`, ['../tailwind.config.js']],
    ['an indented directive is found', `  @config '../../tw.js';`, ['../../tw.js']],
    [
      'a directive QUOTED IN PROSE is skipped, the real one below is taken',
      "/* mirrors `@config \"../tailwind.config.js\";` in throughput */\n@config \"../../tailwind.config.js\";",
      ['../../tailwind.config.js'],
    ],
    ['a comment-only mention yields nothing', '/* see @config "../x.js" */', []],
  ]
  for (const [name, src, expected] of configCases) {
    const got = [...src.matchAll(CONFIG_DIRECTIVE)].map((m) => m[1])
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      console.error(`SELF-TEST FAIL: ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`)
      bad++
    }
  }
  if (bad) {
    console.error(`\n${bad} self-test failure(s) — the checker itself is broken; its verdicts mean nothing.`)
    process.exit(1)
  }
  console.log(`check-dark-variant-strategy --self-test: OK (${cases.length + configCases.length} cases)`)
  process.exit(0)
}

const requireArg = process.argv.find((a) => a.startsWith('--require-apps='))
const REQUIRE_APPS = requireArg ? Number(requireArg.split('=')[1]) : 0

let failures = 0
let inspected = 0
const rows = []

for (const [app, cssRel] of Object.entries(APPS)) {
  const appDir = join(ROOT, app)
  if (!existsSync(join(appDir, 'package.json'))) {
    rows.push([app, 'not initialised', '-', 'skipped'])
    continue
  }
  const toggleSite = togglesDarkClass(appDir)
  if (!toggleSite) {
    rows.push([app, 'does not toggle .dark', '-', 'n/a'])
    continue
  }
  inspected++
  const strategy = darkStrategy(appDir, cssRel)
  rows.push([app, toggleSite, strategy ?? 'NONE', strategy ? 'ok' : 'FAIL'])
  if (!strategy) {
    console.error(
      `FAIL ${app}: toggles a .dark class (${toggleSite}) but declares no class-based dark variant.\n` +
        `       Every \`dark:\` utility it can reach compiles behind @media (prefers-color-scheme: dark),\n` +
        `       which the in-app theme switcher never triggers. Nothing errors; the page just looks wrong.\n` +
        `       Fix EITHER by adding \`darkMode: 'class'\` to a Tailwind config and \`@config\` in ${cssRel},\n` +
        `       OR by adding \`@custom-variant dark (&:where(.dark, .dark *));\` to ${cssRel}.`,
    )
    failures++
  }
}

if (inspected < REQUIRE_APPS) {
  console.error(
    `FAIL positive control: only ${inspected} app(s) were found to toggle a .dark class, expected at ` +
      `least ${REQUIRE_APPS}. A clean result on a tree that was not scanned is meaningless, not clean.`,
  )
  process.exit(1)
}

if (process.env.VERBOSE) {
  console.log('app                       toggles .dark at                strategy')
  for (const [a, t, s, v] of rows) console.log(`${a.padEnd(25)} ${String(t).padEnd(30)} ${s}  [${v}]`)
}

if (failures > 0) {
  console.error(
    `\n${failures} app(s) toggle a .dark class without configuring Tailwind's dark variant to match. ` +
      `This never surfaces as a build error — see this file's header.`,
  )
  process.exit(1)
}

console.log(
  `check-dark-variant-strategy: OK — ${inspected} app(s) toggle a .dark class and all declare a ` +
    `matching class-based dark variant`,
)
