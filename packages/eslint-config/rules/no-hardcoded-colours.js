/**
 * ESLint rule: no-hardcoded-colours — SOURCE OF TRUTH.
 *
 * Forbids hardcoded Tailwind palette utilities (text-amber-600, bg-gray-100, etc.)
 * and raw hex/rgb/hsl colour literals in className strings, style objects, and any
 * string returned or assigned as a colour value. Pure white and pure black are
 * banned outright, in every notation and every role.
 *
 * Exemptions:
 *  - Files with /* BRADEN-EXEMPT *\/ comment anywhere in the source
 *  - Files under braden/ directory (path-based check)
 *  - @react-pdf/renderer files (pdfkit accepts hex only) — /* REACT-PDF-EXEMPT *\/
 *  - HTML delivered to a mail client — /* EMAIL-HTML-EXEMPT *\/
 *  - node_modules, dist, .next, out — skipped via ESLint ignorePatterns / ignores
 *
 * The last two license a FORMAT, never a VALUE: the pure white / pure black ban
 * survives both.
 *
 * Fix: replace with a semantic token from @bsuite/theme/docs/TOKEN-MAPPING.md
 *
 * ===========================================================================
 * NO REGEX. THIS RULE IS A TOKENISER.  (standing operator ruling, 2026-08-12)
 * ===========================================================================
 *
 * Every detection defect this rule has shipped was the same defect wearing a
 * different pattern. A regex encodes an assumption about SURFACE FORM; when the
 * assumption is wrong at an edge, the match simply does not happen, and a
 * non-match is indistinguishable from a clean file. The failure is silent and
 * reads as a pass. The four that were paid for:
 *
 *   1. `#ffffff00` — the pure-white alternation spelled the alpha nibbles as
 *      more literal `f`s (`ffffff|fff`). On `#ffffff00` the `ffffff` branch
 *      matched, then `\b` was asked to hold between `f` and `0` — both word
 *      characters — so it failed, and the alternation gave up rather than
 *      reconsidering the length. Alpha-suffixed pure white PASSED.
 *
 *   2. `rgb(255 255 255)` — the separator was written `\s*,\s*`, so the
 *      space-separated CSS Color 4 form PASSED. A later attempt at `\s*[,\s]\s*`
 *      failed differently: the leading `\s*` swallowed the space, leaving the
 *      required separator nothing to match.
 *
 *   3. `no-text-white` — a `\b`-anchored `(prefix)-white` pattern matched inside
 *      the sibling rule's own NAME, because `-` is a non-word character and `\b`
 *      therefore holds in front of `text`. Three repos each answered with a local
 *      `eslint-disable`: one fix, applied three times, as a workaround.
 *
 *   4. A 600-character cap in an extraction pattern returned a confident ZERO
 *      against a 2.7 KB object.
 *
 * A tokeniser cannot fail in that shape, because it asks a different question.
 * The regexes asked "does this text LOOK LIKE a banned value?" — which every
 * pattern must independently answer for every surface form anyone might write.
 * The scanner below asks two questions in sequence:
 *
 *      (a) what COLOUR is this token, if it is a colour at all?
 *      (b) is that colour banned?
 *
 * Surface form is handled exactly once, in (a). The ban in (b) is a predicate on
 * NUMBERS — `r === 255 && g === 255 && b === 255` — which has no opinion about
 * commas, spaces, percentages, alpha nibbles or letter case, and so cannot be
 * evaded by changing any of them. `#ffffff00`, `#FFFF`, `rgb(255 255 255)`,
 * `rgb(100%,100%,100%)`, `hsl(0 0% 100%)`, `oklch(1 0 0)` and `hwb(0 100% 0%)`
 * all reduce to the same three numbers, through one code path.
 *
 * Three structural consequences worth naming, because they are the whole point:
 *
 *   - Token boundaries are established by SCANNING, not asserted by `\b`. The
 *     hex reader consumes the entire hex-digit run and then decides what it has;
 *     it can never match a prefix of a longer run and strand the rest, which is
 *     defect 1. Class names are split on whitespace and then decomposed by
 *     segment, so `no-text-white` has first segment `no`, which is not a utility
 *     prefix — defect 3 is structurally unreachable, and the three
 *     `eslint-disable` workarounds it caused can come out.
 *
 *   - Separators are a SET the component splitter knows about (space, comma,
 *     solidus), not a shape one pattern had to guess — defect 2.
 *
 *   - Unparseable input is VISIBLE. A colour function whose components do not
 *     resolve is still reported as a literal when it is shaped like one, rather
 *     than falling through to a silent non-match. Fail-closed, not fail-quiet.
 *
 * Adding a notation is one branch in `classifyFunctional`, not an edit to N
 * patterns that must each be got right independently.
 *
 * POSITIONS, NOT JUST VALUES (bsuite#1962). Answering (a) and (b) correctly is
 * worth nothing in a position the scanner never visits. A string handed to a
 * function — `pdfOklch('oklch(1 0 0)')` — was such a position until 2026-08-13,
 * and because that wrapper is crm7's *correct* convention for keeping PDF
 * colours token-shaped, the blind spot sat exactly where the colours were.
 * Call arguments are now walked, with the verdict narrowed to the absolute
 * pure-white/pure-black ban; see the CallExpression case for the reasoning.
 * A widening that fires the FORMAT rule there would report every legitimate
 * adapter call in the estate, which is how a gate gets switched off.
 *
 * DISTRIBUTION: each submodule carries a byte-identical inline copy at
 * `<submodule>/eslint-rules/no-hardcoded-colours.js` so standalone CI can resolve
 * the rule without the monorepo. `scripts/sync-inline-eslint-rules.mjs --check`
 * fails CI if a copy drifts. Before that check existed, this file — the nominal
 * source of truth — was itself the STALEST copy (crm7#1579), and it happened
 * again on 2026-08-12 when crm7's copy was 69 lines ahead of it.
 */

import { isBradenSubmoduleFile } from './_shared.js'

// ---------------------------------------------------------------------------
// CHARACTER CLASSES
//
// Explicit code-point tests rather than character-class patterns. They are the
// scanner's alphabet, and every one of them is total: `undefined` (past the end
// of the string) answers false everywhere, so no caller needs a bounds check.
// ---------------------------------------------------------------------------

function isDigit(ch) {
  if (ch === undefined) return false
  const c = ch.charCodeAt(0)
  return c >= 48 && c <= 57
}

function isAlpha(ch) {
  if (ch === undefined) return false
  const c = ch.charCodeAt(0)
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122)
}

function isWordChar(ch) {
  return isAlpha(ch) || isDigit(ch) || ch === '_'
}

function isHexDigit(ch) {
  if (ch === undefined) return false
  const c = ch.charCodeAt(0)
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102)
}

function isSpace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v'
}

function isAllDigits(s) {
  if (s.length === 0) return false
  for (let i = 0; i < s.length; i++) if (!isDigit(s[i])) return false
  return true
}

// ---------------------------------------------------------------------------
// VOCABULARY
// ---------------------------------------------------------------------------

// Every Tailwind palette hue, not just the neutrals.
//
// crm7#1579: this list read `slate|gray|zinc|neutral` for as long as the rule had
// existed, so EVERY chromatic class passed the gate. `text-amber-600` shipped to
// production twice (GrantsConsole.tsx:453, InterpretationRulesTab.tsx:764) with a
// green lint. The rule was not enforcing "use tokens"; it was enforcing "don't use
// grey", which is the one case a designer is least likely to get wrong.
const HUES = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
])

// Every Tailwind utility prefix that takes a colour — the old list stopped at
// `text|bg|border|divide`, so `ring-red-500`, `fill-green-600` and gradient stops
// (`from-`/`via-`/`to-`) were all invisible to the gate.
const PREFIXES = new Set([
  'text',
  'bg',
  'border',
  'divide',
  'ring',
  'outline',
  'shadow',
  'from',
  'via',
  'to',
  'accent',
  'caret',
  'decoration',
  'fill',
  'stroke',
  'placeholder',
])

/**
 * Functions the ABSOLUTE ban inspects. Wider than the format rule below on
 * purpose: `oklch()` is the estate's MANDATED notation, so writing one is not a
 * defect — writing pure white in one is.
 */
const PURE_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'oklch',
  'oklab',
  'lch',
  'lab',
  'hwb',
  'color',
])

/**
 * Functions the FORMAT rule ("prefer a token over a literal") inspects.
 *
 * Deliberately the exact set the previous regexes covered — `rgba?(` and
 * `hsla?(` with a numeric leading component. Widening this to every entry in
 * PURE_FUNCTIONS would report every legitimate `oklch()` in @bsuite/theme as a
 * violation, which is how a gate gets switched off.
 */
const LITERAL_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla'])

/**
 * Recursion bound for the value-expression walk.
 *
 * Was 6, which was ample while the walk only followed ternaries and receiver
 * chains. Walking CALL ARGUMENTS (bsuite#1962) spends depth faster — a wrapped
 * colour inside a `cn([...])` inside a ternary is already four — and a cap that
 * silently stops descending is the same failure mode the tokeniser exists to
 * remove: a non-visit is indistinguishable from a clean file. 24 is far past any
 * real nesting while still bounding the walk, which is all the cap was ever for.
 * The walk is a tree traversal, so depth costs nothing but stack.
 */
const MAX_WALK_DEPTH = 24

// ---------------------------------------------------------------------------
// STAGE 1 — SCAN.  Find the tokens that could be colours.
// ---------------------------------------------------------------------------

/**
 * Read a hex colour beginning at `i`, where `text[i]` is `#`.
 * Returns `{ end, digits }`, or null when this `#` does not begin one.
 *
 * THE PRECEDING-CHARACTER GUARD is a real read of `text[i - 1]`, not a
 * lookbehind, and it excludes three things for three separately-paid reasons:
 *
 *   word char  `bsuite#1871` — an ISSUE REFERENCE. `#1871` is valid CSS #RGBA,
 *              so no length check could ever save it. It failed a build for a
 *              comment citing the very issue the change implemented.
 *   `#`        `##fff` and doubled anchors.
 *   `&`        `&#129514;` — an HTML NUMERIC CHARACTER ENTITY (an emoji in an
 *              email template) reads as the 6-digit hex `#129514`. Found in the
 *              business-suite-unified sweep, 2026-08-11. Hex entities
 *              (`&#x1F600;`) were already safe: `x` is not a hex digit.
 *
 * `color:#fff`, `"#fff"` and ` #fff` all still read as colours — punctuation and
 * whitespace are none of the three.   theme-audit-ok: naming the forbidden value is this rule's job
 *
 * The run is consumed WHOLE and judged afterwards. That is the fix for defect 1
 * in the header: a pattern that matches a fixed-length prefix and then asks `\b`
 * to hold can be defeated by appending a hex digit, and it fails silently.
 */
function readHex(text, i) {
  const prev = i > 0 ? text[i - 1] : undefined
  if (isWordChar(prev) || prev === '#' || prev === '&') return null

  let j = i + 1
  while (isHexDigit(text[j])) j++
  const digits = text.slice(i + 1, j)

  // A hex run that continues into non-hex word characters (`#fffz`, `#deadbeef_`)
  // is an identifier, not a colour. This is what `\b` was for; here it is a read.
  if (isWordChar(text[j])) return null

  // 3..8 preserves the previous rule's breadth exactly, including the CSS-invalid
  // 5- and 7-digit lengths. Those cannot be resolved to channels, so they are
  // reported as literals but never classified pure — narrowing the reported set
  // is not this change's job.
  if (digits.length < 3 || digits.length > 8) return null
  return { end: j, digits }
}

/**
 * Split a colour function's argument list into components.
 *
 * The separator is a SET — whitespace, comma, solidus — and nesting depth is
 * tracked so `var(--x)` survives as one component. This is defect 2's fix: the
 * splitter does not have to guess which separator the author chose, because it
 * accepts all of them, and `rgb(255,255,255)`, `rgb(255 255 255)` and
 * `rgba(255 255 255 / 50%)` therefore produce the same first three components.
 */
function splitComponents(text) {
  const parts = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '(') {
      depth++
      cur += ch
      continue
    }
    if (ch === ')') {
      depth--
      cur += ch
      continue
    }
    if (depth === 0 && (isSpace(ch) || ch === ',' || ch === '/')) {
      if (cur.length > 0) {
        parts.push(cur)
        cur = ''
      }
      continue
    }
    cur += ch
  }
  if (cur.length > 0) parts.push(cur)
  return parts
}

/**
 * A component as a number, plus whether it was written as a percentage.
 * Returns null for anything that is not a plain numeric token — `var(--x)`,
 * `none`, a colour-space keyword. Null is how the caller learns the value is
 * token-driven and therefore not a hardcoded colour at all.
 */
function parseNumeric(part) {
  if (part === undefined || part.length === 0) return null
  let s = part
  let isPercent = false
  if (s[s.length - 1] === '%') {
    isPercent = true
    s = s.slice(0, -1)
  } else if (s.length > 3 && s.slice(-3).toLowerCase() === 'deg') {
    s = s.slice(0, -3)
  }
  if (s.length === 0) return null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (isDigit(ch) || ch === '.' || ch === '+' || ch === '-' || ch === 'e' || ch === 'E') continue
    return null
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return { n, isPercent }
}

// ---------------------------------------------------------------------------
// STAGE 2 — CLASSIFY.  Reduce a token to a colour, then judge the colour.
// ---------------------------------------------------------------------------

/** Pure white and pure black in channel space. Alpha is deliberately ignored. */
function pureFromChannels(r, g, b) {
  if (r === 255 && g === 255 && b === 255) return 'white'
  if (r === 0 && g === 0 && b === 0) return 'black'
  return 'other'
}

/**
 * Expand a hex digit run to 8-bit channels. Returns null for the CSS-invalid
 * lengths (5, 7), which are literals but not classifiable.
 *
 * `#ffffff00` lands here as an 8-digit run and resolves to (255,255,255) with
 * alpha 0 — white at zero opacity is still white. The ruling covers alpha forms,
 * so the alpha nibbles are read as "two more hex digits", never as more `f`s.
 * That distinction is the entire content of defect 1.
 */
function hexChannels(digits) {
  const d = digits.toLowerCase()
  const pair = (s) => Number.parseInt(s, 16)
  const dbl = (c) => Number.parseInt(c + c, 16)
  if (d.length === 3) return { r: dbl(d[0]), g: dbl(d[1]), b: dbl(d[2]) }
  if (d.length === 4) return { r: dbl(d[0]), g: dbl(d[1]), b: dbl(d[2]) }
  if (d.length === 6) return { r: pair(d.slice(0, 2)), g: pair(d.slice(2, 4)), b: pair(d.slice(4, 6)) }
  if (d.length === 8) return { r: pair(d.slice(0, 2)), g: pair(d.slice(2, 4)), b: pair(d.slice(4, 6)) }
  return null
}

/**
 * 'white' | 'black' | 'other' | null, where null means "not a hardcoded colour"
 * — the components are token-driven or otherwise unreadable as numbers.
 */
function classifyFunctional(name, parts) {
  const num = (i) => parseNumeric(parts[i])

  if (name === 'rgb' || name === 'rgba') {
    const a = num(0)
    const b = num(1)
    const c = num(2)
    if (a === null || b === null || c === null) return null
    const to255 = (p) => (p.isPercent ? (p.n * 255) / 100 : p.n)
    const verdict = pureFromChannels(to255(a), to255(b), to255(c))
    if (verdict !== 'other') return verdict
    // pdf-lib and react-pdf normalise channels to 0..1, where `rgb(1,1,1)` IS
    // pure white — the e-signature certificate title was pure black in exactly
    // this form. Read as CSS it is 1/255, which is not a token either, so the
    // ambiguity does not need resolving: the value is banned under both
    // readings. crm7's copy dropped this case when it split the single PURE_RE
    // into four; the forward-port is a UNION of the copies, not a copy of the
    // longest one.
    if (!a.isPercent && !b.isPercent && !c.isPercent && a.n === 1 && b.n === 1 && c.n === 1) {
      return 'white'
    }
    return 'other'
  }

  if (name === 'hsl' || name === 'hsla') {
    // Lightness is the THIRD component. Saturation 0% alone is a legitimate
    // grey, so `hsl(0 0% 50%)` must not be pure.
    const h = num(0)
    const s = num(1)
    const l = num(2)
    if (h === null || s === null || l === null) return null
    if (l.n === 100) return 'white'
    if (l.n === 0) return 'black'
    return 'other'
  }

  if (name === 'oklch' || name === 'oklab') {
    // Lightness is the FIRST component, 0..1 or a percentage.
    const l = num(0)
    if (l === null) return null
    const v = l.isPercent ? l.n / 100 : l.n
    if (v === 1) return 'white'
    if (v === 0) return 'black'
    return 'other'
  }

  if (name === 'lch' || name === 'lab') {
    // CIE lightness is 0..100 whether or not a percent sign is written.
    const l = num(0)
    if (l === null) return null
    if (l.n === 100) return 'white'
    if (l.n === 0) return 'black'
    return 'other'
  }

  if (name === 'hwb') {
    const h = num(0)
    const w = num(1)
    const b = num(2)
    if (h === null || w === null || b === null) return null
    if (w.n === 100 && b.n === 0) return 'white'
    if (w.n === 0 && b.n === 100) return 'black'
    return 'other'
  }

  if (name === 'color') {
    // color(<colorspace> c1 c2 c3 [/ a]) — the first component is a keyword.
    const space = parts[0]
    if (space === undefined || parseNumeric(space) !== null) return null
    const c1 = num(1)
    const c2 = num(2)
    const c3 = num(3)
    if (c1 === null || c2 === null || c3 === null) return null
    const v = (p) => (p.isPercent ? p.n / 100 : p.n)
    if (v(c1) === 1 && v(c2) === 1 && v(c3) === 1) return 'white'
    if (v(c1) === 0 && v(c2) === 0 && v(c3) === 0) return 'black'
    return 'other'
  }

  return null
}

/**
 * Scan free text for hex literals and colour functions.
 * Yields `{ value, kind }` with kind 'pure' or 'literal'.
 */
function scanColourValues(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]

    if (ch === '#') {
      const hex = readHex(text, i)
      if (hex === null) {
        i++
        continue
      }
      const raw = text.slice(i, hex.end)
      const channels = hexChannels(hex.digits)
      const verdict = channels === null ? 'other' : pureFromChannels(channels.r, channels.g, channels.b)
      out.push({ value: raw, kind: verdict === 'other' ? 'literal' : 'pure' })
      i = hex.end
      continue
    }

    if (isAlpha(ch)) {
      const prev = i > 0 ? text[i - 1] : undefined
      let j = i
      while (isAlpha(text[j]) || isDigit(text[j])) j++
      const name = text.slice(i, j).toLowerCase()
      // `-` guards `--my-rgb(`; a word char guards `xrgb(`. Neither is a colour.
      const standalone = !isWordChar(prev) && prev !== '-'
      if (standalone && text[j] === '(' && PURE_FUNCTIONS.has(name)) {
        let depth = 0
        let k = j
        let closed = false
        for (; k < text.length; k++) {
          if (text[k] === '(') depth++
          else if (text[k] === ')') {
            depth--
            if (depth === 0) {
              k++
              closed = true
              break
            }
          }
        }
        const inner = text.slice(j + 1, closed ? k - 1 : text.length)
        const raw = text.slice(i, closed ? k : text.length)
        const parts = splitComponents(inner)
        const verdict = classifyFunctional(name, parts)
        if (verdict === 'white' || verdict === 'black') {
          out.push({ value: raw, kind: 'pure' })
        } else if (LITERAL_FUNCTIONS.has(name) && parseNumeric(parts[0]) !== null) {
          // A numeric leading component means the channels were written out by
          // hand. Reached whether or not the parentheses balanced — a truncated
          // `rgb(255 255` in a template is still a hardcoded colour, and going
          // quiet on malformed input is the failure mode this file exists to
          // remove.
          out.push({ value: raw, kind: 'literal' })
        }
        i = closed ? k : text.length
        continue
      }
      // Skip the whole identifier. Restarting inside it would let `background`
      // be rescanned from `ackground`, which is how interior matches happen.
      i = j
      continue
    }

    i++
  }
  return out
}

/** Split on ASCII whitespace. Class lists are whitespace-delimited by definition. */
function splitWhitespace(text) {
  const out = []
  let cur = ''
  for (let i = 0; i < text.length; i++) {
    if (isSpace(text[i])) {
      if (cur.length > 0) {
        out.push(cur)
        cur = ''
      }
      continue
    }
    cur += text[i]
  }
  if (cur.length > 0) out.push(cur)
  return out
}

const EDGE_PUNCTUATION = new Set(['"', "'", '`', ',', ';', '(', ')', '{', '}', '<', '>'])

function trimEdgePunctuation(token) {
  let start = 0
  let end = token.length
  while (start < end && EDGE_PUNCTUATION.has(token[start])) start++
  while (end > start && EDGE_PUNCTUATION.has(token[end - 1])) end--
  return token.slice(start, end)
}

/**
 * Scan free text for Tailwind colour utilities.
 *
 * DECOMPOSITION, NOT MATCHING. Each whitespace-delimited token is reduced to its
 * utility part — variants (`dark:`, `group-hover:`, `[&>*]:`) stripped to the
 * last colon segment, `!` and negation stripped, the `/opacity` suffix dropped —
 * and only then split into `-` segments. A utility is recognised only when its
 * FIRST segment is a colour prefix.
 *
 * That is what makes defect 3 unreachable. `no-text-white` is one token whose
 * first segment is `no`, which is not a prefix, so it is not a utility — where
 * the `\b(prefix)-white\b` pattern matched inside it, because `-` is a non-word
 * character and the boundary therefore holds in front of `text`. Three repos
 * each carried an `eslint-disable` for that; they can come out.
 */
function scanClassUtilities(text) {
  const out = []
  for (const rawToken of splitWhitespace(text)) {
    let token = trimEdgePunctuation(rawToken)
    if (token.length === 0) continue

    // Variants: `dark:hover:bg-white` -> `bg-white`.
    const lastColon = token.lastIndexOf(':')
    if (lastColon !== -1) token = token.slice(lastColon + 1)

    // `!bg-white` (important), `-mt-2` (negation — never a colour, but harmless).
    while (token.length > 0 && (token[0] === '!' || token[0] === '-')) token = token.slice(1)

    // Opacity modifier: `bg-white/50`, `text-amber-600/75`.
    const slash = token.indexOf('/')
    if (slash !== -1) token = token.slice(0, slash)
    if (token.length === 0) continue

    const segments = token.split('-')
    if (segments.length < 2) continue
    if (!PREFIXES.has(segments[0])) continue

    const rest = segments.slice(1)
    if (rest.length === 1 && (rest[0] === 'white' || rest[0] === 'black')) {
      out.push({ value: token, kind: 'pure' })
      continue
    }
    if (rest.length === 2 && HUES.has(rest[0]) && isAllDigits(rest[1])) {
      const shade = rest[1]
      if (shade.length >= 2 && shade.length <= 3) out.push({ value: token, kind: 'palette' })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// MESSAGES
// ---------------------------------------------------------------------------

const PALETTE_MESSAGE =
  'Hardcoded Tailwind palette class "{{value}}" is forbidden. ' +
  'Use a semantic token (text-foreground, bg-card, text-warning-text, etc.) from @bsuite/theme. ' +
  'See packages/theme/docs/TOKEN-MAPPING.md §1.'

const HEX_MESSAGE =
  'Hardcoded colour literal "{{value}}" is forbidden. ' +
  'Use var(--token) from @bsuite/theme, or color-mix() over two tokens. ' +
  'See packages/theme/docs/TOKEN-MAPPING.md §2.'

const PURE_MESSAGE =
  'Pure white / pure black "{{value}}" is banned in EVERY role, alpha forms included ' +
  '(standing operator ruling). This ban is NOT lifted by the react-pdf or ' +
  'EMAIL-HTML-EXEMPT carve-outs — those license the hex FORMAT, never this VALUE. ' +
  'Use the estate near-white #f8f9fa or near-black #0a0e1a, or a role token.' // theme-audit-ok: naming the replacement values is this rule's job

const REACT_PDF_SPECIFIER = '@react-pdf/renderer'

/**
 * True only when the file genuinely pulls in @react-pdf/renderer as a MODULE:
 * a static import, a re-export, a dynamic `import()`, or a `require()`.
 *
 * Walks the AST rather than the text so that a mention in a comment, in prose,
 * or in a `vi.mock()` stub does not grant the exemption. Comment nodes carry no
 * `.source`, and `vi.mock` is a MemberExpression callee rather than `require`,
 * so neither can reach any of the branches below.
 */
function referencesReactPdfModule(ast) {
  const isSpecifier = (v) =>
    typeof v === 'string' && (v === REACT_PDF_SPECIFIER || v.startsWith(`${REACT_PDF_SPECIFIER}/`))

  const stack = [ast]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    if (Array.isArray(node)) {
      for (const child of node) stack.push(child)
      continue
    }

    switch (node.type) {
      case 'ImportDeclaration':
      case 'ImportExpression':
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
        if (isSpecifier(node.source?.value)) return true
        break
      case 'CallExpression':
        if (
          node.callee?.type === 'Identifier' &&
          node.callee.name === 'require' &&
          isSpecifier(node.arguments?.[0]?.value)
        ) {
          return true
        }
        break
      default:
        break
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue
      const value = node[key]
      if (value && typeof value === 'object') stack.push(value)
    }
  }
  return false
}

export const noHardcodedColours = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded Tailwind palette utilities and hex/rgb/hsl colour literals',
      recommended: true,
    },
    schema: [],
    messages: {
      forbiddenPalette: PALETTE_MESSAGE,
      forbiddenHex: HEX_MESSAGE,
      forbiddenPure: PURE_MESSAGE,
    },
  },
  create(context) {
    // See eslint-rules/_shared.js — 2026-07-17 (W1 session) fix for a
    // naive absolute-path substring exemption that also matched any
    // contributor whose home directory contains "braden".
    if (isBradenSubmoduleFile(context.filename, context.cwd ?? process.cwd())) return {}
    const sourceCode = context.sourceCode
    const fullText = sourceCode.getText()
    if (fullText.includes('BRADEN-EXEMPT')) return {}

    // React-PDF / pdfkit renderer files: the pdfkit engine only accepts hex/rgb
    // literals — it does not support Tailwind, CSS vars, or oklch. Hex is the
    // documented format. Per bsuite-brand-system: "Hex/rgb only acceptable for
    // third-party component defaults or legacy compatibility tokens."
    //
    // KEYED ON A REAL IMPORT, not on `fullText.includes('@react-pdf/renderer')`.
    // The substring form matched ANY mention — a header comment, prose, even a
    // note saying the file does NOT use the library. Measured in crm7 on
    // 2026-08-12: the substring exempted 12 files, of which 9 genuinely
    // reference the module and 3 did not. All 3 matched on comments alone, and
    // one of those comments reads "Deno edge runtime cannot bundle
    // @react-pdf/renderer via esm.sh" — a file exempted by the sentence
    // explaining that it cannot use the thing granting the exemption.
    //
    // A `vi.mock('@react-pdf/renderer', …)` is deliberately NOT an import: a
    // test that stubs the renderer out has no engine constraining its colours.
    const reactPdfExempt =
      referencesReactPdfModule(sourceCode.ast) || fullText.includes('REACT-PDF-EXEMPT')

    // EMAIL-HTML-EXEMPT: HTML delivered to a MAIL CLIENT, a standalone
    // printable document opened outside the app, or a SCRIPT EMBEDDED ON A
    // THIRD-PARTY PAGE (business-suite-unified/public/embed/widget.js). None of
    // them has the D2C stylesheet loaded, so `var(--token)` resolves to nothing
    // and `oklch()` is unsupported by most mail clients — a literal is the only
    // thing that renders. Same reasoning as the react-pdf carve-out: the engine
    // dictates the format. The embed case was added 2026-08-13 by naming it
    // here rather than letting a file quietly widen the marker's meaning.
    //
    // A FILE-level marker rather than an `ignores:` entry, deliberately. The
    // 24-entry ignore list retired in crm7#1579 was correct the day it was
    // written and wrong every day after, because the reason lived in a config
    // file nobody opens while editing a template. Put the marker at the top of
    // the file with the reason, where the next editor will see it.
    const emailExempt = fullText.includes('EMAIL-HTML-EXEMPT')

    // Both carve-outs license a FORMAT, never a VALUE. Pure white and pure
    // black stay banned inside them — the email comment always claimed this,
    // and now the rule enforces it instead of merely asserting it.
    const formatExempt = reactPdfExempt || emailExempt

    const reported = new Set()
    const lines = sourceCode.getLines()

    /**
     * `theme-audit-ok` — the in-repo, line-local escape hatch, honoured on the
     * node's own lines or the line immediately above it.
     *
     * This exists for CSS MASK stops. In a mask, `#000`/`#fff` are not paint —  theme-audit-ok: prose about mask stops, not a colour
     * the channel is alpha, so `#fff` means "fully opaque". Swapping them for a  theme-audit-ok: prose about mask stops, not a colour
     * theme token silently breaks the mask, which is why the magicui borders
     * (border-beam.tsx, shine-border.tsx) carry the annotation already. The
     * widened rule reaches those template literals for the first time, so it has
     * to understand the convention the codebase was already using.
     *
     * Preferred over an `ignores:` entry because the justification stays next to
     * the code, where the next person editing the line will see it — the 24-entry
     * ignore list retired in crm7#1579 is what happens when it does not.
     */
    function isAnnotatedOk(node) {
      const loc = node.loc
      if (!loc) return false
      // The node's own lines — covers a trailing `// theme-audit-ok` on the value's
      // line (shine-border.tsx) and an annotation nested inside a multi-line
      // declarator (border-beam.tsx, where the comment sits between `=` and the
      // string).
      for (let n = loc.start.line; n <= loc.end.line; n++) {
        if (lines[n - 1]?.includes('theme-audit-ok')) return true
      }
      // The line immediately above, but ONLY when it is comment-only. Accepting any
      // preceding line that merely CONTAINS the marker let a trailing annotation
      // licence the next statement — `const s = '#fff' // theme-audit-ok` silently
      // exempted the `const brand = '#ab233a'` beneath it. Caught by the rule's own
      // test; an escape hatch that leaks one line down is how ignore lists start.
      const above = lines[loc.start.line - 2]
      if (above !== undefined) {
        const trimmed = above.trim()
        const commentOnly =
          trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
        if (commentOnly && trimmed.includes('theme-audit-ok')) return true
      }
      return false
    }

    function report(node, messageId, value) {
      // One literal can be reached by two visitors (a Property whose value is also
      // a ConditionalExpression branch). Dedupe so it is reported once.
      //
      // The key deliberately omits messageId: pure white is BOTH a banned value
      // and a hardcoded literal, and reporting the same token twice on the same
      // line is noise. Pure is emitted first, so the more specific message wins.
      const key = `${node.range?.[0] ?? '?'}:${value}`
      if (reported.has(key)) return
      reported.add(key)
      if (isAnnotatedOk(node)) return
      context.report({ node, messageId, data: { value } })
    }

    const MESSAGE_FOR_KIND = {
      pure: 'forbiddenPure',
      literal: 'forbiddenHex',
      palette: 'forbiddenPalette',
    }

    /**
     * `pureOnly` narrows the verdict set to the ABSOLUTE ban, discarding the
     * format ("prefer a token over a literal") and palette findings. It is set
     * for one position only: inside a CALL ARGUMENT. See the CallExpression
     * case in checkValueExpression for why that position is different.
     */
    function checkString(node, value, pureOnly = false) {
      const findings = [...scanColourValues(value), ...scanClassUtilities(value)]
      // PURE first, and always — see PURE_MESSAGE. Sorting by kind rather than
      // by position is what makes the dedupe above resolve in favour of the
      // absolute ban when one token is both.
      findings.sort((a, b) => (a.kind === 'pure' ? -1 : 0) - (b.kind === 'pure' ? -1 : 0))
      for (const finding of findings) {
        if (pureOnly && finding.kind !== 'pure') continue
        // The format carve-outs relax "prefer a token over a literal". They do
        // not, and never did, relax the pure white / pure black ban.
        if (formatExempt && finding.kind !== 'pure') continue
        report(node, MESSAGE_FOR_KIND[finding.kind], finding.value)
      }
    }

    /**
     * Walk an expression in VALUE position and check every string literal that
     * could end up being the colour.
     *
     * crm7#1579 finding 2: the rule only visited `className` attributes and object
     * properties, so a colour returned from a plain function escaped entirely —
     * `return 'rgb(249 115 22)'` (DealHealthPanel.tsx:42) and the same literal
     * behind a ternary (forecast.tsx:323) both linted clean while feeding an inline
     * style. Ternary / `??` / `||` branches are walked because a colour ramp is
     * actually written in that shape.
     */
    function checkValueExpression(expr, depth = 0, pureOnly = false) {
      if (!expr || depth > MAX_WALK_DEPTH) return
      switch (expr.type) {
        case 'Literal':
          if (typeof expr.value === 'string') checkString(expr, expr.value, pureOnly)
          break
        case 'TemplateLiteral':
          expr.quasis.forEach((q) => checkString(expr, q.value.raw, pureOnly))
          break
        case 'ConditionalExpression':
          checkValueExpression(expr.consequent, depth + 1, pureOnly)
          checkValueExpression(expr.alternate, depth + 1, pureOnly)
          break
        case 'LogicalExpression':
          checkValueExpression(expr.left, depth + 1, pureOnly)
          checkValueExpression(expr.right, depth + 1, pureOnly)
          break
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
          checkValueExpression(expr.expression, depth + 1, pureOnly)
          break
        case 'ArrayExpression':
          // An array is a VALUE CONTAINER, so it inherits the current mode —
          // the same treatment ConditionalExpression and LogicalExpression get.
          // It is not a call and must not be narrowed like one.
          //
          // This was written gated on `pureOnly` first, on the theory that only
          // `cn(['bg-white', x])` needed reaching. Measuring the estate killed
          // that: business-suite-unified/public/embed/widget.js builds inline
          // style with
          //
          //     btn.style.cssText = ['background:#2563eb', …, 'color:#fff'].join(';')  theme-audit-ok: prose quoting the defect
          //
          // The receiver-chain descent that already existed for `.trim()` walks
          // straight into that array and stopped dead, so PURE WHITE and (in the
          // modal backdrop) PURE BLACK sat in a widget served to third-party
          // customer sites. A gate justified as "avoiding over-reach" was
          // hiding the exact value class this rule exists for.
          for (const el of expr.elements ?? []) checkValueExpression(el, depth + 1, pureOnly)
          break
        case 'NewExpression':
        case 'CallExpression':
          // `` return `<p style="color:#333">`.trim() `` — the ReturnStatement's
          // argument is the CALL, not the template, so the walker stopped here
          // and the literal escaped. Found by the business-suite-unified sweep
          // 2026-08-11: ONE file had ~12 hex literals in sibling templates and
          // only the 2 without a trailing `.trim()` were ever reported, which
          // read as "this file is nearly clean" rather than "the walker cannot
          // see it". Descend through the receiver so `.trim()` / `.replace()`
          // chains do not launder a colour.
          //
          // ARGUMENTS ARE WALKED, PURE-ONLY (bsuite#1962).
          //
          // Until 2026-08-13 this comment read "arguments are deliberately NOT
          // walked: a string passed to an arbitrary function is not necessarily
          // a colour, and flagging it would trade this false negative for a
          // worse false positive." The reasoning was sound and the conclusion
          // was wrong, because it weighed the two errors as if they were the
          // same size. They are not:
          //
          //   { backgroundColor: 'oklch(1 0 0)' }            // reported
          //   { backgroundColor: pdfOklch('oklch(1 0 0)') }  // NOT reported
          //
          // Same value, same property, same file. The wrapper was the entire
          // difference. crm7 adapts OKLCH at render time through
          // `src/lib/pdf/pdfColor.ts` because @react-pdf/renderer drops CSS
          // Color 4 OKLCH when pdfkit normalises fill colours — so the app's
          // CORRECT convention for staying token-shaped put every colour in
          // every PDF document into the one position the rule could not see.
          // The convention and the blind spot were the same line. 17 pure
          // whites sat behind it across seven files, including
          // ChargeRatePdfDocument.tsx — the PDF the quote signing page renders
          // for a client to sign.
          //
          // The false-positive worry is answered by NARROWING THE VERDICT, not
          // by declining to look. Inside an argument only the ABSOLUTE ban
          // fires: pure white and pure black, which are banned in every role by
          // standing operator ruling and are therefore wrong no matter what the
          // callee does with them. The format rule ("prefer a token over a
          // literal") stays out, because a colour handed to an adapter like
          // `pdfOklch` is already tokenised — firing there would be exactly the
          // second wave of noise that switches a gate off.
          //
          // So `t('checkout.total')`, `parseInt('255')` and `describe('bg')` are
          // all silent, while `pdfOklch('oklch(1 0 0)')` and `cn('bg-white')`
          // report. Nesting is walked to MAX_WALK_DEPTH, so an argument that is
          // itself a call (`outer(inner('#fff'))`) is reached too.
          if (expr.callee?.type === 'MemberExpression') {
            checkValueExpression(expr.callee.object, depth + 1, pureOnly)
          }
          for (const arg of expr.arguments ?? []) {
            checkValueExpression(arg, depth + 1, true)
          }
          break
        default:
          break
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        const val = node.value
        if (!val) return
        if (val.type === 'Literal' && typeof val.value === 'string') {
          // Hex-checked now too: `text-[#fff]` arbitrary values used to slip past,  theme-audit-ok: names the value the rule catches
          // because className was palette-checked only and hex was Property-only.
          checkString(node, val.value)
        } else if (val.type === 'JSXExpressionContainer') {
          checkValueExpression(val.expression)
        }
      },
      Property(node) {
        // Palette-checked now too — a variant map (`{ warn: 'text-amber-600' }`)
        // is an object property, and was previously hex-checked only.
        checkValueExpression(node.value)
      },
      ReturnStatement(node) {
        checkValueExpression(node.argument)
      },
      ArrowFunctionExpression(node) {
        // Concise body: `const c = () => 'rgb(...)'` has no ReturnStatement.
        if (node.body && node.body.type !== 'BlockStatement') checkValueExpression(node.body)
      },
      VariableDeclarator(node) {
        checkValueExpression(node.init)
      },
      AssignmentExpression(node) {
        // `ctx.fillStyle = '#ffffff'` — SILENT until 2026-08-13, directly, with
        // no wrapper involved at all. This file's own header has claimed since
        // it was written that it checks "any string returned or ASSIGNED as a
        // colour value"; there was no AssignmentExpression visitor, so the
        // claim was false and nothing measured it. Found while negative-
        // controlling bsuite#1962: the issue's own table lists a canvas
        // `fillStyle` in guardian-consents/index.tsx, and the call-argument
        // widening alone would NOT have reached it — assignment is where canvas
        // and imperative DOM code put every colour they own.
        checkValueExpression(node.right)
      },
      ExpressionStatement(node) {
        // A call used for effect rather than value — `ctx.setFillColor('#fff')`,  theme-audit-ok: prose naming the shape
        // `applyTheme('oklch(1 0 0)')`. The CallExpression case below it walks
        // arguments, but nothing ever reached the call, so the arguments were
        // unreachable in this position no matter how the walk was widened.
        checkValueExpression(node.expression)
      },
    }
  },
}
