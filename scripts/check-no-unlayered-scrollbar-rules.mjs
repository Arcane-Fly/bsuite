#!/usr/bin/env node
/**
 * check-no-unlayered-scrollbar-rules.mjs — an app's OWN scrollbar rules must not
 * sit outside a cascade layer, and nothing anywhere may HIDE a scrollbar.
 *
 * WHY THIS EXISTS
 *
 * `@bsuite/theme` ships the estate's one scrollbar pairing in
 * `packages/theme/src/css/scrollbars.css`, wholly inside `@layer base`, wired
 * into both brand entry points (`index.css`, `braden.css`).
 *
 * CSS Cascade Layers rank UNLAYERED styles ABOVE every layered one, regardless
 * of source order or specificity. So an app that declares its own scrollbar
 * rules at brace-depth 0 beats the shared file no matter what version it pins,
 * no matter which order the imports run in, and no matter how many times it
 * imports the package. Bumping the pin then LOOKS like it worked and changes
 * nothing on screen. That is the failure this gate exists to make impossible.
 *
 * MEASURED 2026-09-10 on each app's `origin/development`:
 *
 *   crm7   src/index.css:388-426   unlayered; first @layer opens at :429
 *          thumb from its own declared tokens at 20% alpha, composited:
 *          light 1.19:1, dark 2.59:1 — both FAIL WCAG 1.4.11 (needs >= 3:1)
 *   BSU    src/index.css:1077-1107 unlayered; the last @layer closed long before
 *   conduit / braden / R80.4 / throughput   no CSS scrollbar rules at all
 *
 * So the shared file reached ZERO of six apps in practice: four had nothing to
 * override it and were pinned to a range that cannot resolve the fix, and the
 * two that would have received it overrode it from outside the layer system.
 *
 * WHAT IT CHECKS
 *
 *   A1  no `::-webkit-scrollbar*` rule and no `scrollbar-width` /
 *       `scrollbar-color` / `scrollbar-gutter` declaration sits at cascade-layer
 *       depth 0 in any scanned CSS file. Being inside `@media`, `@supports` or a
 *       plain rule block does NOT lift you into a layer — only `@layer` does.
 *
 *   A2  nothing HIDES a scrollbar, at any layer depth: no `scrollbar-width:none`,
 *       no `display:none` / zero width or height on a `::-webkit-scrollbar`.
 *       bsuite#3241 forbids this explicitly — hiding the widget removes the
 *       symptom and the affordance together. Measured clean estate-wide on
 *       2026-09-10, so this is a ban and not a ratchet.
 *
 * `packages/**` is scanned too, and passing there is load-bearing evidence
 * rather than a formality: the shared file is the one place these declarations
 * are allowed, and it passes only because every one of them is inside
 * `@layer base`.
 *
 * A COMMENT MENTIONING a scrollbar property is not a declaration. Comments and
 * strings are stripped before parsing, so prose describing this gate — including
 * the block you are reading — cannot trip it.
 *
 * Usage:
 *   node scripts/check-no-unlayered-scrollbar-rules.mjs
 *   node scripts/check-no-unlayered-scrollbar-rules.mjs --self-test
 *   node scripts/check-no-unlayered-scrollbar-rules.mjs --root=/some/tree
 *   node scripts/check-no-unlayered-scrollbar-rules.mjs --require-apps=6
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argRoot = process.argv.find((a) => a.startsWith('--root='))
const ROOT = argRoot ? resolve(argRoot.slice('--root='.length)) : REPO_ROOT

const APPS = ['crm7', 'conduit', 'business-suite-unified', 'braden', 'R80.4', 'throughput']

/** Trees that are a SECOND COPY of the estate, or build output. Scanning them
 *  counts the past: a worktree holds another lane's tree, and `public/` and
 *  `dist/` hold compiled artefacts whose source is already scanned. */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
  'coverage',
  '.claude',
  '.superpowers',
  '.vercel',
  'public',
  'storybook-static',
])

/** Properties the shared file OWNS. `color-scheme` belongs here because it is
 *  what tells the UA which way to paint the native widget in the first place:
 *  scrollbars.css declares `:root{color-scheme:light}` / `:root.dark{...:dark}`
 *  so the widget follows the IN-APP theme toggle. BSU declared
 *  `color-scheme: light dark` unlayered at `src/index.css:231`, which outranks
 *  both and hands the choice back to the OPERATING SYSTEM — so a user who
 *  picked dark in the app, on a light OS, kept a bright native scrollbar. That
 *  is the reported symptom, surviving a correct pin and a correct shared file. */
const SCROLLBAR_PROPS = /^(scrollbar-width|scrollbar-color|scrollbar-gutter|color-scheme)$/i
const SCROLLBAR_PSEUDO = /::-webkit-scrollbar/i

// ---------------------------------------------------------------------------
// The parser. Comments and strings are removed FIRST, so no amount of prose
// about `scrollbar-color` can be mistaken for a declaration of it.
// ---------------------------------------------------------------------------

/** Replace comments and string bodies with spaces, preserving byte offsets so
 *  reported line numbers stay true to the original file. */
function blankCommentsAndStrings(css) {
  const out = css.split('')
  let i = 0
  while (i < out.length) {
    const c = css[i]
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      const stop = end === -1 ? css.length : end + 2
      for (let k = i; k < stop; k++) if (out[k] !== '\n') out[k] = ' '
      i = stop
      continue
    }
    if (c === '"' || c === "'") {
      let k = i + 1
      while (k < css.length && css[k] !== c) {
        if (css[k] === '\\') k++
        k++
      }
      const stop = Math.min(k + 1, css.length)
      for (let j = i; j < stop; j++) if (out[j] !== '\n') out[j] = ' '
      i = stop
      continue
    }
    i++
  }
  return out.join('')
}

function lineAt(css, index) {
  let line = 1
  for (let i = 0; i < index && i < css.length; i++) if (css[i] === '\n') line++
  return line
}

/**
 * Walk a stylesheet, returning every finding.
 * Each frame records whether it is an `@layer` block, so LAYER DEPTH is
 * independent of BRACE DEPTH — which is the whole point.
 */
export function findScrollbarFindings(rawCss) {
  const css = blankCommentsAndStrings(rawCss)
  const findings = []
  const stack = [] // { isLayer, prelude }
  const layerDepth = () => stack.reduce((n, f) => n + (f.isLayer ? 1 : 0), 0)
  const enclosingSelector = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (!stack[i].isLayer) return stack[i].prelude
    return ''
  }

  let prelude = ''
  let preludeStart = 0

  const checkDeclaration = (text, rawAt) => {
    const m = /^\s*(-{0,2}[a-zA-Z-]+)\s*:\s*([\s\S]*)$/.exec(text)
    if (!m) return
    const prop = m[1].trim()
    const value = m[2].trim().replace(/\s*!important$/i, '')
    const sel = enclosingSelector()
    // `rawAt` is the character after the previous `{` or `;` — usually a
    // newline, which lands the report on the SELECTOR's line rather than the
    // declaration's. Skip the leading whitespace so the number is the one you
    // would get from grep. An off-by-one in a gate's output is how people
    // learn to stop reading it.
    const at = rawAt + (text.length - text.trimStart().length)

    // A2 — hiding, banned at EVERY layer depth.
    if (/^scrollbar-width$/i.test(prop) && /^none$/i.test(value)) {
      findings.push({ kind: 'hidden', line: lineAt(rawCss, at), detail: 'scrollbar-width: none' })
      return
    }
    if (SCROLLBAR_PSEUDO.test(sel)) {
      if (/^display$/i.test(prop) && /^none$/i.test(value)) {
        findings.push({ kind: 'hidden', line: lineAt(rawCss, at), detail: `display: none on ${sel.trim()}` })
        return
      }
      if (/^(width|height)$/i.test(prop) && /^0(px|r?em|%)?$/i.test(value)) {
        findings.push({ kind: 'hidden', line: lineAt(rawCss, at), detail: `${prop}: ${value} on ${sel.trim()}` })
        return
      }
    }

    // A1 — a scrollbar property outside every cascade layer.
    if (SCROLLBAR_PROPS.test(prop) && layerDepth() === 0) {
      findings.push({
        kind: 'unlayered',
        line: lineAt(rawCss, at),
        detail: `${prop} in \`${sel.trim().replace(/\s+/g, ' ') || '(top level)'}\``,
      })
    }
  }

  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '{') {
      const p = prelude.trim()
      const isLayer = /^@layer\b/i.test(p)
      if (!isLayer && SCROLLBAR_PSEUDO.test(p) && layerDepth() === 0) {
        findings.push({
          kind: 'unlayered',
          line: lineAt(rawCss, preludeStart + (prelude.length - prelude.trimStart().length)),
          detail: `selector \`${p.replace(/\s+/g, ' ')}\``,
        })
      }
      stack.push({ isLayer, prelude: p })
      prelude = ''
      preludeStart = i + 1
    } else if (c === '}') {
      // A block's LAST declaration may carry no trailing semicolon.
      if (prelude.trim() && stack.length) checkDeclaration(prelude, preludeStart)
      stack.pop()
      prelude = ''
      preludeStart = i + 1
    } else if (c === ';') {
      // Inside a block this is a declaration; at top level it is an at-statement
      // such as `@import` or `@layer base, components;` — which declares layer
      // ORDER and opens no block, so it must not push a frame.
      if (stack.length) checkDeclaration(prelude, preludeStart)
      prelude = ''
      preludeStart = i + 1
    } else {
      if (!prelude) preludeStart = i
      prelude += c
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// Self-test — a gate that cannot be made to fail proves nothing when it passes.
// ---------------------------------------------------------------------------
if (process.argv.includes('--self-test')) {
  const cases = [
    [
      'unlayered firefox pairing IS flagged',
      '* { scrollbar-width: thin; scrollbar-color: red blue; }',
      ['unlayered', 'unlayered'],
    ],
    [
      'the same pairing inside @layer base is CLEAN',
      '@layer base { * { scrollbar-width: thin; scrollbar-color: red blue; } }',
      [],
    ],
    ['unlayered webkit pseudo-element IS flagged', '::-webkit-scrollbar-thumb { background: red; }', ['unlayered']],
    [
      'webkit pseudo-element inside @layer base is CLEAN',
      '@layer base { ::-webkit-scrollbar-thumb { background: red; } }',
      [],
    ],
    [
      '@media inside @layer does NOT lift it back out',
      '@layer base { @media (pointer: coarse) { * { scrollbar-width: auto; } } }',
      [],
    ],
    ['@media OUTSIDE a layer is still unlayered', '@media (pointer: coarse) { * { scrollbar-width: auto; } }', ['unlayered']],
    [
      '@supports nested inside @layer is CLEAN',
      '@layer base { @supports not (scrollbar-color: auto) { ::-webkit-scrollbar { width: 12px; } } }',
      [],
    ],
    [
      'a COMMENT mentioning the property is not a declaration',
      '/* we set scrollbar-color: red blue elsewhere */\n@layer base { * { scrollbar-width: thin; } }',
      [],
    ],
    ['a comment containing a webkit SELECTOR is not a rule', '/* ::-webkit-scrollbar-thumb { background: red; } */', []],
    ['a string containing the selector is not a rule', '@layer base { .x::after { content: "::-webkit-scrollbar {"; } }', []],
    [
      '@layer STATEMENT opens no block, so the rule after it is still unlayered',
      '@layer base, components;\n* { scrollbar-color: red blue; }',
      ['unlayered'],
    ],
    ['last declaration without a trailing semicolon is still seen', '* { scrollbar-color: red blue }', ['unlayered']],
    ['nested @layer keeps depth', '@layer base { @layer inner { * { scrollbar-width: thin; } } }', []],
    ['scrollbar-width:none is HIDING even inside a layer', '@layer base { * { scrollbar-width: none; } }', ['hidden']],
    [
      'display:none on the webkit widget is HIDING even inside a layer',
      '@layer base { ::-webkit-scrollbar { display: none; } }',
      ['hidden'],
    ],
    ['width:0 on the webkit widget is HIDING', '@layer base { ::-webkit-scrollbar { width: 0; } }', ['hidden']],
    ['a legitimate 12px webkit width inside a layer is CLEAN', '@layer base { ::-webkit-scrollbar { width: 12px; } }', []],
    ['unrelated CSS is CLEAN', '@layer base { .card { display: none; width: 0; } }', []],
    ['unlayered color-scheme IS flagged', ':root { color-scheme: light dark; }', ['unlayered']],
    ['color-scheme inside @layer base is CLEAN', '@layer base { :root { color-scheme: light; } }', []],
    [
      'a prefers-color-scheme MEDIA QUERY is not a color-scheme declaration',
      '@media (prefers-color-scheme: dark) { .x { background: red; } }',
      [],
    ],
  ]
  let bad = 0
  for (const [name, css, expected] of cases) {
    const got = findScrollbarFindings(css).map((f) => f.kind)
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      console.error(
        `SELF-TEST FAIL: ${name}\n    expected ${JSON.stringify(expected)}\n    got      ${JSON.stringify(got)}`,
      )
      bad++
    }
  }
  if (bad) {
    console.error(`\n${bad} self-test failure(s) — the checker itself is broken; its verdicts mean nothing.`)
    process.exit(1)
  }
  console.log(`check-no-unlayered-scrollbar-rules --self-test: OK (${cases.length} cases)`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// The scan.
// ---------------------------------------------------------------------------
function walkCss(dir, out = [], depth = 0) {
  if (depth > 10) return out
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue
    const p = join(dir, e)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walkCss(p, out, depth + 1)
    else if (e.endsWith('.css')) out.push(p)
  }
  return out
}

const requireAppsArg = process.argv.find((a) => a.startsWith('--require-apps='))
const requireApps = requireAppsArg ? Number(requireAppsArg.slice('--require-apps='.length)) : 0

const targets = []
for (const app of APPS) {
  const d = join(ROOT, app, 'src')
  if (existsSync(d)) targets.push([app, d])
}
const pkgDir = join(ROOT, 'packages')
if (existsSync(pkgDir)) targets.push(['packages', pkgDir])

const appCount = targets.filter(([n]) => n !== 'packages').length
if (requireApps && appCount < requireApps) {
  console.error(`REFUSING TO PASS: found ${appCount} app tree(s) under ${ROOT}, expected at least ${requireApps}.`)
  console.error('A static scan over an absent tree finds nothing and exits 0 — that is not a clean result.')
  process.exit(1)
}
if (targets.length === 0) {
  console.error(`REFUSING TO PASS: nothing to scan under ${ROOT}.`)
  process.exit(1)
}

let files = 0
let unparseable = 0
const findings = []
for (const [label, dir] of targets) {
  for (const f of walkCss(dir)) {
    let css
    try {
      css = readFileSync(f, 'utf8')
    } catch (err) {
      // FAILING OPEN on an unreadable file makes a green run meaningless.
      console.error(`UNREADABLE: ${relative(ROOT, f)} — ${err.message}`)
      unparseable++
      continue
    }
    files++
    for (const hit of findScrollbarFindings(css)) {
      findings.push({ ...hit, label, file: relative(ROOT, f) })
    }
  }
}

const unlayered = findings.filter((f) => f.kind === 'unlayered')
const hidden = findings.filter((f) => f.kind === 'hidden')

console.log(`scanned ${files} .css file(s) across ${targets.length} tree(s): ${targets.map(([n]) => n).join(', ')}`)

if (unlayered.length) {
  console.error(`\nA1 FAIL — ${unlayered.length} scrollbar declaration(s) outside every cascade layer:`)
  for (const f of unlayered) console.error(`  ${f.file}:${f.line}  ${f.detail}`)
  console.error(
    '\nUnlayered CSS outranks EVERY layered rule, so these beat @bsuite/theme\'s\n' +
      '@layer base scrollbars.css regardless of import order or pinned version.\n' +
      'Delete them and let the shared file apply, or move them inside a layer.',
  )
}
if (hidden.length) {
  console.error(`\nA2 FAIL — ${hidden.length} declaration(s) HIDE a scrollbar (bsuite#3241 forbids this):`)
  for (const f of hidden) console.error(`  ${f.file}:${f.line}  ${f.detail}`)
}
if (unparseable) console.error(`\n${unparseable} file(s) could not be read — treated as a failure, not a pass.`)

if (unlayered.length || hidden.length || unparseable) process.exit(1)

console.log('A1 OK — no scrollbar rule sits outside a cascade layer.')
console.log('A2 OK — nothing hides a scrollbar.')
