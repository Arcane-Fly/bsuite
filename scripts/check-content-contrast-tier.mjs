#!/usr/bin/env node
/**
 * check-content-contrast-tier — no CONTENT text in any shared package may be
 * painted in a colour tier @bsuite/theme documents as failing WCAG AA at normal
 * size.
 *
 * THE MEASURED TABLE THIS ENFORCES
 * ───────────────────────────────────────────────────────────────────────────
 * From `packages/theme/src/css/vars.css`, re-measured 2026-07-17 against the
 * conservative bg-body floor (W3 §3.1), OKLCH -> linear-sRGB -> WCAG relative
 * luminance:
 *
 *     subtle     3.52:1 light / 4.14:1 dark   AA large only (3:1)  — BANNED for content
 *     disabled   2.21:1 light / 2.48:1 dark   fails at any size    — BANNED for content
 *     muted      4.92:1 light / 6.69:1 dark   AA normal            — allowed
 *     secondary  8.94:1 light / 11.04:1 dark  AAA                  — allowed
 *
 * WCAG 1.4.3 puts the 4.5:1 floor on text below 18.66px/24px. Every package
 * surface that uses these utilities renders at `text-xs` or `text-sm`, i.e.
 * normal size, so the large-text 3:1 allowance never applies to them.
 *
 * WHY IT IS A PARENT-LEVEL GUARD AND NOT A PACKAGE TEST
 * ───────────────────────────────────────────────────────────────────────────
 * It was a package test first, inside @bsuite/data-grid. Two things were wrong
 * with that, and the second is the one that matters:
 *
 *  1. It broke that package's `tsc --noEmit`, because a test that reads the
 *     filesystem needs `node:` types the package does not declare — and adding
 *     them to satisfy one test widens a published package's type surface for a
 *     reason that has nothing to do with the package.
 *
 *  2. It only ever looked at ONE package. The rule is about a shared theme's
 *     tiers, so it applies to every package that consumes them. A rule scoped
 *     to the file that happened to violate it is the fix-the-page-not-the-class
 *     defect (D-62) wearing a test's clothes.
 *
 * WHAT IS EXEMPT, AND WHY
 * ───────────────────────────────────────────────────────────────────────────
 * `placeholder:` and `disabled:` variants. The subtle tier's DECLARED purpose is
 * placeholders — the dark scale annotates that token with the word "placeholders"
 * inline, in its own source — and
 * WCAG 1.4.3 explicitly exempts inactive controls. Whether placeholder text
 * ought to clear 4.5:1 anyway is a brand decision about the token, not a defect
 * in a consumer of it, and this guard does not make that decision.
 *
 * Exemption is by VARIANT PREFIX, never by filename. A path allowlist dies
 * loudly on a rename and silently on a delete; a prefix rule stays armed on
 * every new file without anyone remembering to add it.
 *
 * IT SCANS STRING LITERALS ONLY, AND THAT IS LOAD-BEARING
 * ───────────────────────────────────────────────────────────────────────────
 * The first version scanned raw source and immediately flagged the component it
 * had just been written to fix, because the doc comment explaining the change
 * named the banned utility in prose. A gate that cannot tell code from a comment
 * ABOUT the code punishes documentation, and this estate keeps tripping that
 * wire: a colour literal in a comment moved a theme ratchet; a security gate
 * failed on prose describing the token it guards; an Actions comment containing
 * an empty expression took a whole workflow down at parse time.
 *
 * A Tailwind class is always inside a string or template literal, and a comment
 * never is. So the scanner walks each file once as a small state machine —
 * code / line comment / block comment / '…' / "…" / `…`, with escapes — and only
 * string CONTENTS are examined. Prose is then free to name the banned utility,
 * which this very file does, repeatedly.
 *
 * Hand-written walk rather than a regex, per the Tier 2 doctrine already applied
 * in check-guard-self-reporting.mjs: the cases that decide correctness here — a
 * `//` inside a string, an apostrophe inside a comment — are exactly the ones a
 * regex gets wrong.
 *
 * USAGE
 *   node scripts/check-content-contrast-tier.mjs
 *   node scripts/check-content-contrast-tier.mjs --self-test
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const BANNED_TIERS = ['text-text-subtle', 'text-text-disabled']
const EXEMPT_VARIANTS = ['placeholder:', 'disabled:']

/**
 * Floor for the real tree. A guard that scans zero files passes forever, and
 * "no violations" and "no files" print the same way unless one of them is a
 * hard failure. Raise this when packages are added; never lower it silently.
 */
const FILE_FLOOR = 100

export function stringLiterals(source) {
  const out = []
  let i = 0
  const n = source.length

  while (i < n) {
    const c = source[i]
    const next = source[i + 1]

    if (c === '/' && next === '/') {
      i += 2
      while (i < n && source[i] !== '\n') i++
      continue
    }
    if (c === '/' && next === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i++
      let buf = ''
      while (i < n) {
        if (source[i] === '\\') {
          buf += source[i + 1] ?? ''
          i += 2
          continue
        }
        if (source[i] === quote) {
          i++
          break
        }
        buf += source[i]
        i++
      }
      out.push(buf)
      continue
    }
    i++
  }
  return out
}

export function offendingUses(source) {
  const hits = []
  for (const literal of stringLiterals(source)) {
    for (const tier of BANNED_TIERS) {
      let from = 0
      for (;;) {
        const at = literal.indexOf(tier, from)
        if (at === -1) break
        from = at + tier.length
        const before = literal.slice(Math.max(0, at - 24), at)
        if (EXEMPT_VARIANTS.some((v) => before.endsWith(v))) continue
        hits.push(tier)
      }
    }
  }
  return hits
}

function sourceFiles(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p))
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p)
  }
  return out
}

function selfTest() {
  const cases = []
  const check = (label, a, e) =>
    cases.push([label, JSON.stringify(a) === JSON.stringify(e), JSON.stringify(a), JSON.stringify(e)])

  check('flags a banned tier in a className', offendingUses('className="text-xs text-text-subtle"').length, 1)
  check('flags the disabled tier too', offendingUses('className="text-text-disabled"').length, 1)
  check('flags it inside a template literal', offendingUses('const c = `text-text-subtle ${x}`').length, 1)
  check('allows the muted tier', offendingUses('className="text-text-muted"'), [])
  check('allows the secondary tier', offendingUses('className="text-text-secondary"'), [])

  check('exempts the placeholder variant', offendingUses('className="placeholder:text-text-subtle"'), [])
  check('exempts the disabled variant', offendingUses('className="disabled:text-text-disabled"'), [])

  // The trap this guard fell into in its first form.
  check('does NOT flag a line comment naming the tier', offendingUses('// it was text-text-subtle, which fails AA'), [])
  check('does NOT flag a block comment naming it', offendingUses('/* text-text-subtle is AA-large-only */'), [])
  check("does NOT flag a comment with an apostrophe", offendingUses("// don't use text-text-subtle"), [])

  // The two that decide whether the state machine is actually correct.
  check(
    'a // inside a STRING does not start a comment',
    offendingUses('const u = "https://x/y"; const c = "text-text-subtle"').length,
    1,
  )
  check(
    'an apostrophe inside a COMMENT does not open a literal',
    offendingUses("// don't do this\nconst c = 'text-text-subtle'").length,
    1,
  )
  check('an escaped quote does not end the literal early', offendingUses('const c = "a\\"b text-text-subtle"').length, 1)

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  if (failed.length) {
    console.error(`\ncheck-content-contrast-tier --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `check-content-contrast-tier --self-test: ${cases.length} assertions — each banned tier proven ` +
      `to FAIL, each allowed tier and exempt variant proven to PASS, and the comment/string state ` +
      `machine proven on the four cases that decide it (prose naming the tier, an apostrophe in a ` +
      `comment, a // inside a string, and an escaped quote).`,
  )
  return 0
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest()

  const files = sourceFiles(join(ROOT, 'packages'))
  if (files.length < FILE_FLOOR) {
    console.error(
      `::error::scanned ${files.length} source file(s) under packages/, below the floor of ${FILE_FLOOR}. ` +
        `That is a broken read, not a clean tree. Refusing to report a pass.`,
    )
    return 2
  }

  const problems = []
  for (const f of files) {
    for (const tier of offendingUses(readFileSync(f, 'utf8'))) {
      problems.push(`${relative(ROOT, f)} paints content text with '${tier}'`)
    }
  }

  const summary =
    `check-content-contrast-tier: ${files.length} source files under packages/ examined; ` +
    `${problems.length} violation(s).`

  if (problems.length) {
    console.error('CONTENT TEXT BELOW WCAG AA:')
    for (const p of problems) console.error(`  ✗ ${p}`)
    console.error('')
    console.error(
      "Use 'text-text-muted' (4.92:1 light / 6.69:1 dark) or a higher tier. If the text is genuinely " +
        'a placeholder or a disabled control, write it with the placeholder: or disabled: variant, ' +
        'which is exempt and is also what it should have been either way.',
    )
    console.error('')
    console.error(summary)
    return 1
  }

  console.log(summary)
  return 0
}

process.exit(main())
