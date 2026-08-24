import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * No CONTENT text in this package may be painted in a tier @bsuite/theme
 * documents as failing AA at normal size.
 *
 * WHY THIS SHAPE, AND NOT `expect(className).toBe('… text-text-muted …')`
 * ─────────────────────────────────────────────────────────────────────────
 * A test that asserts the exact class locks in whatever string is there the day
 * it is written. If someone later moves the handle to a HIGHER tier — a strictly
 * better answer — the test goes red and the correct fix looks like a regression.
 * This estate has already been bitten several times by a test asserting a
 * constant and thereby defending the bug it was named to prevent.
 *
 * So assert the PROPERTY instead: whatever tier is chosen, it may not be one of
 * the two the theme measures below 4.5:1. That admits every correct answer and
 * refuses every incorrect one, which is what the requirement actually says.
 *
 * Measured ratios, from @bsuite/theme `src/css/vars.css` (re-measured 2026-07-17,
 * W3 §3.1, against the conservative bg-body floor):
 *
 *     subtle     3.52:1 light / 4.14:1 dark   AA large only     — BANNED for content
 *     disabled   2.21:1 light / 2.48:1 dark   fails at any size — BANNED for content
 *     muted      4.92:1 light / 6.69:1 dark   AA normal         — allowed
 *     secondary  8.94:1 light / 11.04:1 dark  AAA               — allowed
 *
 * `placeholder:` and `disabled:` variants are exempt. A placeholder is what the
 * subtle tier is FOR (the dark scale says so inline), and disabled text is
 * required to look disabled — WCAG 1.4.3 exempts inactive controls. Exempting by
 * VARIANT PREFIX rather than by filename keeps the rule armed on every new file
 * without anyone remembering to add it here.
 *
 * IT SCANS STRING LITERALS ONLY, AND THAT IS THE LOAD-BEARING PART
 * ─────────────────────────────────────────────────────────────────────────
 * The first version of this rule scanned raw source, and immediately flagged the
 * component it had just been written to fix — because the doc comment explaining
 * the change NAMED the banned utility in prose. A gate that cannot tell code from
 * a comment about the code is a gate that punishes documentation, and this repo
 * has tripped that same wire repeatedly: a `rgb()` inside a comment moved a
 * theme ratchet, and a security gate failed on prose describing the token it
 * guards.
 *
 * A Tailwind class is always inside a string or template literal, and a comment
 * never is. So the scanner walks the source once as a small state machine —
 * code / line comment / block comment / '…' / "…" / `…`, with escapes — and only
 * the string contents are examined. Prose is then free to say whatever it needs
 * to, including quoting the banned utility, which this very file does.
 */

const BANNED_TIERS = ['text-text-subtle', 'text-text-disabled']
const EXEMPT_VARIANTS = ['placeholder:', 'disabled:']

const SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..')

/**
 * Every string/template literal in `source`, contents only.
 *
 * Hand-written walk rather than a regex, per the estate's Tier 2 doctrine: the
 * cases that matter here — an apostrophe inside a comment, a `//` inside a URL
 * inside a string — are exactly the ones a regex gets wrong.
 */
export function stringLiterals(source: string): string[] {
  const out: string[] = []
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

/** Banned tiers used as content colour — i.e. not behind an exempt variant. */
export function offendingUses(source: string): string[] {
  const hits: string[] = []
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

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      out.push(...sourceFiles(p))
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

describe('content text clears WCAG AA at normal size', () => {
  const files = sourceFiles(SRC)

  it('scans a non-zero number of source files', () => {
    // A rule that silently scans nothing passes forever. State the denominator.
    expect(files.length).toBeGreaterThan(0)
  })

  it('flags a banned tier in a className (positive control)', () => {
    expect(offendingUses('className="text-xs text-text-subtle"')).toHaveLength(1)
    expect(offendingUses('className="text-text-disabled"')).toHaveLength(1)
    expect(offendingUses('const c = `text-text-subtle ${x}`')).toHaveLength(1)
  })

  it('does not flag the exempt variants (negative control)', () => {
    expect(offendingUses('className="placeholder:text-text-subtle"')).toHaveLength(0)
    expect(offendingUses('className="disabled:text-text-disabled"')).toHaveLength(0)
  })

  it('does not flag PROSE naming the tier — the trap this rule fell into first', () => {
    expect(offendingUses('// it used to be text-text-subtle, which fails AA')).toHaveLength(0)
    expect(offendingUses('/* text-text-subtle is AA-large-only */')).toHaveLength(0)
    expect(offendingUses("// don't use text-text-subtle here")).toHaveLength(0)
  })

  it('is not fooled by a comment marker inside a string, or a quote inside a comment', () => {
    // `//` inside a string must NOT start a comment, or everything after it on
    // the line stops being scanned and the rule silently covers less than it says.
    expect(offendingUses('const u = "https://x/y"; const c = "text-text-subtle"')).toHaveLength(1)
    // An apostrophe inside a comment must not open a string literal that then
    // swallows real code up to the next quote.
    expect(offendingUses("// don't do this\nconst c = 'text-text-subtle'")).toHaveLength(1)
  })

  it.each(files)('%s uses no AA-failing tier for content text', (file) => {
    const hits = offendingUses(readFileSync(file, 'utf8'))
    expect(
      hits,
      `${file} paints content text in a tier @bsuite/theme measures below 4.5:1. ` +
        `Use the muted tier (4.92:1 light / 6.69:1 dark) or higher, or add the ` +
        `placeholder:/disabled: variant if that is genuinely what this is.`,
    ).toEqual([])
  })
})
