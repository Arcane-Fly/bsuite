#!/usr/bin/env node
/**
 * check-css-classes-emitted.mjs — C10: a used class token that Tailwind never
 * REGISTERS is silent by construction. bg-<x>, text-<x>, border-<x>, ring-<x>,
 * fill-<x>, stroke-<x>, shadow-<x> and outline-<x> only bind a colour, border,
 * fill or shadow when the design-token custom property they name is declared
 * inside an `@theme` block SOMEWHERE the app's build sees. Get that wrong and
 * the class still parses, the build still goes green, and the element renders
 * with one less rule than the author wrote — the exact failure class
 * check-tailwind-sources.mjs exists for on the `@source` side of the same
 * problem, one layer downstream.
 *
 * MEASURED CASE (F-58 / D-149). business-suite-unified declares
 * --bg-shell-elevated / --bg-shell-accent / --bg-shell / --border-shell as
 * plain :root/.dark custom properties (src/index.css:221-224, 253, 517-520,
 * 539) but never inside its `@theme inline { … }` block (:82-142). 170
 * occurrences across 30 files reference bg-bg-shell-accent, bg-bg-shell,
 * bg-bg-shell-elevated and border-border-shell. Tailwind v4 only emits a
 * utility for a custom property that is REGISTERED inside `@theme` — a plain
 * `:root` declaration of the same name is invisible to the utility generator,
 * so all four utilities have compiled to NOTHING since the sweep that
 * introduced them (b391c82, PR #366).
 *
 * 170 IS THE GREP, 540 IS THE GATE — measured 2026-09-03 on the same tree.
 * The scout's `git grep -o -P '\bCLASS\b(?!-)'` counted the four shell
 * tokens only (139+12+18+1 = 170). This gate is NOT that grep: it compares
 * EVERY candidate utility against the real emitted CSS, and the same
 * missing-@theme mechanism turns out to swallow more than the shell family
 * in BSU — text-text-primary (139 + variants; preset-v4.css registers
 * --color-text-body/-secondary/-muted but no --color-text-primary),
 * border-border-subtle (160) and border-border-default (15) (no
 * --color-border-subtle/-default anywhere in @theme; only
 * --color-border-strong/-interactive), and bare bg-warning / border-warning /
 * text-success / bg-success (preset ships --color-warning-text and
 * --color-success-text, not the bare names; BSU's own --color-warning /
 * --color-success at src/index.css:318-321 sit in a plain :root block, the
 * exact non-registering position this header describes).
 *
 * 170 IS THE GREP AND, SINCE THE TEMPLATE-LITERAL FIX, ALSO THE GATE'S SHELL
 * COUNT. The first cut saw 163 of the grep's 170: not because of any "nested
 * ternary" but because `className={`…`}` — a brace before the backtick — was
 * not matched at all, so EVERY token in such an attribute went unscanned,
 * static or not (UnifiedDashboard.tsx:233, Admin/AuditLog.tsx:196,
 * Admin/LicenseManager.tsx:255/287/391). findOccurrencesInFile now tokenises
 * the static parts (quasis) of a template-literal className, and of template
 * literals inside cn()/clsx()/cva(), and the quoted arms of any `${a ? 'x' :
 * 'y'}` inside it; only the dynamic expression itself is excluded. On the tree
 * the first cut measured (BSU bfe2702) that moves BSU from 540 to 551 (shell
 * family 163 -> 170, i.e. exactly the grep). The banked BSU number is the
 * gate's own on the CURRENT tree, which has since taken business-suite-unified
 * #1106 (the four shell tokens registered in @theme): 381 / 432 files.
 *
 * The same run found 8 in crm7 (text-text-primary ×2, a dead `text-md` size
 * utility ×5, border-shell ×1; 10 once the crm7 gitlink moved to main d5499128
 * — crm7#2354's mail client added `bg-error-bg` ×2, a token no @theme block
 * registers, the exact class this gate exists to catch) and 227 in throughput (249 once template-literal
 * classNames were scanned — the +22 are the same border-light-border /
 * dark-accent-* family in `className={`…`}` attributes) — a stale
 * border-light-border / dark:border-dark-border / dark-accent-* family with
 * NO declaration anywhere in that app, not even a plain :root. The other
 * three apps (braden, conduit, R80.4) are clean.
 *
 * TWO SIDES, ONE COMPARISON
 *   emitted  = every class selector `@tailwindcss/cli` actually writes for
 *              this app's real CSS entry, using the app's OWN installed
 *              tailwindcss (its real node_modules, its real @theme blocks).
 *   used     = every candidate design-token utility referenced in the app's
 *              own source (className literals, plus cn()/clsx()/cva() string
 *              arguments).
 *   finding  = a used candidate absent from the emitted set.
 *
 * WAIVERS CARRY A REASON OR THEY ARE NOT WAIVERS. Two exemption forms exist
 * and both are enforced to the same shape:
 *   - inline: `theme-audit-ok: <reason of at least 12 characters>` on the hit
 *     line or the line above exempts that hit. A bare `theme-audit-ok` (no
 *     colon / no reason / reason under 12 chars) does NOT exempt — it is
 *     reported as a finding tagged MARKER WITHOUT REASON, so a waiver whose
 *     justification was never written (or was edited away) is visible in the
 *     count instead of silently holding.
 *   - file: scripts/css-class-dynamic-allowlist.txt, one `<class-token> #
 *     <reason of at least 12 characters>` per line. Any other non-comment line
 *     aborts the run BEFORE any app is scanned, exit 1, "ALLOWLIST LINE
 *     WITHOUT REASON: <line>". An unexplained waiver never takes effect for
 *     even one run.
 *
 * WHY A HAND PARSER, NOT postcss. postcss is not resolvable from the PARENT
 * package tree (`node -e "require.resolve('postcss')"` throws MODULE_NOT_FOUND
 * here — it is a transitive dependency of each APP's tailwindcss install, not
 * of the parent). Adding it as a parent devDependency means a lockfile regen
 * outside the workspace tree for a single-purpose selector walk. The emitted
 * side of a Tailwind v4 build is regular enough (one rule per exact selector,
 * Tailwind's own backslash-escaping) that a small brace-depth scanner over
 * `.selector { … }` heads is sufficient — see extractEmittedClasses below.
 *
 * WHAT THIS GATE DOES NOT ASSERT
 *   - Runtime-computed class names (`` `bg-${shade}` ``, a variable holding a
 *     full class list) are invisible by construction — the token containing
 *     `${` is excluded rather than guessed at. scripts/css-class-dynamic-allowlist.txt
 *     exists for the rare case an author wants to name one explicitly.
 *   - Arbitrary-value and arbitrary-property forms (`bg-[#fff]`,
 *     `bg-(--custom)`) are excluded outright — they carry their own value and
 *     need no `@theme` registration, so they are not this defect class.
 *   - A `${…}` interpolation inside a template-literal className contributes
 *     only what is LITERAL inside it: the quoted arms of a ternary are read,
 *     an identifier, call or member expression (`${color}`, `${styles.x}`) is
 *     not. A token fused to an interpolation on either side
 *     (`bg-primary-${shade}`) is a fragment and is excluded, never guessed at.
 *   - It does not run against a deployed page or a browser — it proves the
 *     RULE exists in the compiled CSS, not that a specific element receives
 *     it. audit-applied-tokens.mjs is the gate that measures the DOM.
 *   - CSS files are not scanned for direct class-name references (unlike the
 *     scout re-measurement's `git grep`, which also matched inside *.css).
 *     className/cn()/clsx()/cva() do not occur in stylesheets; a literal class
 *     selector written directly in CSS is a different defect (dead selector,
 *     not a missing rule) and is out of scope here.
 *
 * BASELINE. .github/theme-css-classes-baseline.json carries a bare
 * app -> finding-count map, ratcheted like theme-gates.sh G1/O1: a rise
 * fails, a fall fails until re-banked (equality both ways — an un-banked
 * improvement is exactly as invisible to the next regression as an
 * un-banked regression is). .github/theme-css-classes-scanned-baseline.json
 * carries the companion denominator, app -> files-scanned count: a run that
 * scans FEWER files than the bank failed, full stop, regardless of what its
 * finding count says — "scanned less than banked" is not a pass with a
 * smaller number, it is a run that measured less of the tree than last time.
 *
 * Usage:
 *   node scripts/check-css-classes-emitted.mjs                 # run the gate
 *   node scripts/check-css-classes-emitted.mjs --app=crm7      # one app only
 *   node scripts/check-css-classes-emitted.mjs --self-test
 *   node scripts/check-css-classes-emitted.mjs --fixture=<dir>  # self-test's entry-point probe
 *   node scripts/check-css-classes-emitted.mjs --update-baseline
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import os from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** App -> the CSS entrypoint that carries its build. Same map as check-tailwind-sources.mjs. */
const APPS = {
  crm7: 'src/index.css',
  'business-suite-unified': 'src/index.css',
  throughput: 'src/index.css',
  braden: 'src/index.css',
  conduit: 'src/app/globals.css',
  'R80.4': 'src/index.css',
}

/** Prefer a non-BSU host for the self-test's real-build fixture — BSU is a
 * different lane's active edit target this run, and any other installed app
 * proves the same mechanism just as well. Falls back through the rest. */
const SELF_TEST_HOST_ORDER = ['crm7', 'conduit', 'throughput', 'braden', 'R80.4', 'business-suite-unified']

const BASELINE_PATH = join(ROOT, '.github/theme-css-classes-baseline.json')
const SCANNED_BASELINE_PATH = join(ROOT, '.github/theme-css-classes-scanned-baseline.json')
const DYNAMIC_ALLOWLIST_PATH = join(ROOT, 'scripts/css-class-dynamic-allowlist.txt')

const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.vercel', '.turbo', '.git',
  '.claude', 'worktrees', 'coverage', 'public', '__snapshots__', '.superpowers',
])

const PREFIXES = '(bg|text|border|ring|fill|stroke|shadow|outline)'
// After variant-stripping: prefix-name, optionally /NN opacity. The character
// class already excludes arbitrary forms (`[`, `(` fail `[a-z]`) and any `${`
// interpolation; the explicit checks in isCandidateToken are stated anyway,
// per the design note, as a belt-and-suspenders reading of the same rule.
const CANDIDATE_RE = new RegExp(`^${PREFIXES}-[a-z][a-z0-9-]*(\\/[0-9]+)?$`)

// ---------------------------------------------------------------------------
// EMITTED SIDE — hand parser over `.selector { … }` heads.
// ---------------------------------------------------------------------------

/** Walk the emitted CSS text and return the set of un-escaped class names any
 * rule's selector carries — including rules nested inside @media/@layer/
 * @supports. An at-rule PRELUDE (the text before `@media (...) {`) is skipped
 * because it never starts with `.`, never mind starting with `@`; the
 * `!prelude.startsWith('@')` guard exists only for readability. */
export function extractEmittedClasses(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const emitted = new Set()
  let buf = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      const prelude = buf.trim()
      if (prelude && !prelude.startsWith('@')) {
        for (const cls of extractClassesFromSelector(prelude)) emitted.add(cls)
      }
      buf = ''
    } else if (ch === '}') {
      buf = ''
    } else {
      buf += ch
    }
  }
  return emitted
}

/** Pull every `.class` token out of one selector (or comma-joined selector
 * list — comma is just another delimiter here, so no special-casing is
 * needed to "split" on it). Handles Tailwind's backslash-escaped selector
 * chars (`\/`, `\:`, `\.`, `\[`, `\]`, `\(`, `\)`, `\,`) by treating a
 * backslash as "the next char is literal, keep scanning the class name",
 * then un-escaping the whole captured run at the end. */
export function extractClassesFromSelector(selector) {
  const out = []
  let i = 0
  const n = selector.length
  while (i < n) {
    if (selector[i] === '.') {
      let j = i + 1
      let raw = ''
      while (j < n) {
        const c = selector[j]
        if (c === '\\') {
          raw += c + (selector[j + 1] ?? '')
          j += 2
          continue
        }
        if (/[\s.:#[\]>+~,()]/.test(c)) break
        raw += c
        j++
      }
      if (raw) out.push(unescapeSelector(raw))
      i = j
    } else {
      i++
    }
  }
  return out
}

export function unescapeSelector(raw) {
  return raw.replace(/\\(.)/g, '$1')
}

// ---------------------------------------------------------------------------
// USED SIDE — className literals + cn()/clsx()/cva() argument scan.
// ---------------------------------------------------------------------------

/** Strip Tailwind variant prefixes (`dark:hover:bg-primary` -> `bg-primary`)
 * by splitting on the LAST colon that sits outside any `[...]`/`(...)` —
 * an arbitrary-variant colon like `[&:hover]:bg-primary` must not split
 * inside the bracket. */
export function stripVariantPrefix(token) {
  let depth = 0
  let lastSplit = -1
  for (let i = 0; i < token.length; i++) {
    const c = token[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
    else if (c === ':' && depth === 0) lastSplit = i
  }
  return lastSplit === -1 ? token : token.slice(lastSplit + 1)
}

export function isCandidateToken(token) {
  if (!token || token.includes('${')) return false
  const base = stripVariantPrefix(token)
  if (base.includes('[') || base.includes('(')) return false
  return CANDIDATE_RE.test(base)
}

function makeLineLookup(text) {
  const offsets = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') offsets.push(i + 1)
  return (index) => {
    let lo = 0
    let hi = offsets.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (offsets[mid] <= index) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

function splitTokens(str) {
  const out = []
  const re = /\S+/g
  let m
  while ((m = re.exec(str))) out.push({ token: m[0], offset: m.index })
  return out
}

/** Replace every `//…` and `/* … *​/` comment that sits OUTSIDE a string with
 * spaces, character-for-character (newlines inside block comments are kept AS
 * newlines) — so the result is the same LENGTH as the input and every offset
 * still points at the same line. A real defect this catches: an apostrophe
 * inside an ORDINARY JS COMMENT reads, to a regex that does not know what a
 * comment is, as the opening quote of a string. Measured live in this repo —
 * crm7/src/components/ui/alert.tsx:16 carries the comment "...crm7#1157's
 * config-error masking bug was fixed. text-error-" inside a `cva()` call; the
 * apostrophe in "1157's" opened a fake string that swallowed everything up to
 * the NEXT real quote, and "text-error-" fell out of it as a bogus finding
 * when this mask did not exist yet. String CONTENTS are left untouched
 * (including any `//` inside one), so a real class list is never altered. */
export function maskCommentsOutsideStrings(text) {
  let out = ''
  let i = 0
  const n = text.length
  let inString = null
  while (i < n) {
    const c = text[i]
    if (inString) {
      if (c === '\\' && i + 1 < n) {
        out += c + text[i + 1]
        i += 2
        continue
      }
      out += c
      if (c === inString) inString = null
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c
      out += c
      i++
      continue
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') {
        out += ' '
        i++
      }
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      out += '  '
      i += 2
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
        out += text[i] === '\n' ? '\n' : ' '
        i++
      }
      if (i < n) {
        out += '  '
        i += 2
      }
      continue
    }
    out += c
    i++
  }
  return out
}

/** Read one string literal starting at `text[start]` (a `"`, `'` or backtick)
 * and push its STATIC parts onto `parts` as {value, offset, abutsLeft,
 * abutsRight}: one part for a plain string; for a template literal one part
 * per quasi, with every `${…}` EXPRESSION skipped — except that a quoted
 * string literal found INSIDE an expression (the arms of
 * `${on ? 'bg-a' : 'bg-b'}`, the args of `${cn('bg-a')}`) is itself a static
 * literal and is read recursively, quasis and all. Identifiers, calls and
 * operators inside the expression are never guessed at. Returns the index
 * just past the closing quote. Handles backslash escapes and nested braces/
 * strings/templates inside expressions. An unterminated literal consumes the
 * rest of the text (the masked source is the input, so this is a parse
 * oddity, not a crash). */
export function readStringLiteral(text, start, parts = []) {
  const q = text[start]
  let i = start + 1
  let segStart = i
  let abutsLeft = false
  while (i < text.length) {
    const c = text[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === q) {
      parts.push({ value: text.slice(segStart, i), offset: segStart, abutsLeft, abutsRight: false })
      return { end: i + 1, parts }
    }
    if (q === '`' && c === '$' && text[i + 1] === '{') {
      parts.push({ value: text.slice(segStart, i), offset: segStart, abutsLeft, abutsRight: true })
      i = readTemplateExpression(text, i + 2, parts)
      segStart = i
      abutsLeft = true
      continue
    }
    i++
  }
  parts.push({ value: text.slice(segStart), offset: segStart, abutsLeft, abutsRight: false })
  return { end: text.length, parts }
}

/** `i` sits just after `${`. Walk to the matching `}` (brace depth, with any
 * nested string or template literal read via readStringLiteral so a brace
 * inside a string does not count and its static parts ARE collected). Returns
 * the index just past the closing brace. */
function readTemplateExpression(text, i, parts) {
  let depth = 1
  while (i < text.length) {
    const c = text[i]
    if (c === '"' || c === "'" || c === '`') {
      i = readStringLiteral(text, i, parts).end
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i + 1
    }
    i++
  }
  return i
}

/** Whitespace-split one static part into {token, offset}. A token that runs
 * straight into an interpolation on either side (`bg-primary-${shade}`,
 * `${p}-primary`) is a FRAGMENT, not a class: it is returned with the `${`
 * marker re-attached on that side so isCandidateToken excludes it under the
 * existing "contains `${`" rule — the fragment is never mistaken for a
 * candidate, and the self-test's `bg-primary-${shade}` case keeps meaning
 * what it says end to end. */
function tokensOfPart({ value, offset, abutsLeft, abutsRight }) {
  const toks = splitTokens(value)
  if (!toks.length) return toks
  if (abutsLeft && /^\S/.test(value)) toks[0] = { ...toks[0], token: '${' + toks[0].token }
  if (abutsRight && /\S$/.test(value)) {
    const last = toks.length - 1
    toks[last] = { ...toks[last], token: toks[last].token + '${' }
  }
  return toks.map((t) => ({ token: t.token, offset: offset + t.offset }))
}

/** className="…" / className={"…"} / className={`…`} / className: "…" (the
 * compiled-JSX form check-tailwind-sources.mjs also matches), plus a
 * paren-balanced scan of cn(/clsx(/cva( calls for every string or template
 * literal argument at any nesting depth inside the call. Returns {token, line}
 * occurrences — one per whitespace-separated class in each static part,
 * matching how the estate's own re-measurement grep counts (each occurrence
 * is its own finding, not deduplicated to one per distinct token).
 *
 * Template literals contribute their quasis and any quoted literal nested in
 * their `${…}` expressions (see readStringLiteral); the expressions' dynamic
 * parts are excluded. Before this, `className={`…`}` contributed NOTHING —
 * the brace before the backtick defeated the quote-only match, so even the
 * fully static classes in such an attribute went unscanned (review finding,
 * rule 8; BSU's UnifiedDashboard.tsx:233, Admin/AuditLog.tsx:196,
 * Admin/LicenseManager.tsx:255/287/391 were the measured misses).
 *
 * The two passes can reach the same literal (`className={`${cn('bg-a')}`}`),
 * so occurrences are deduplicated on (offset, token) — the same character in
 * the file is one occurrence however many ways the scanner arrived at it.
 *
 * Scans the COMMENT-MASKED text (see maskCommentsOutsideStrings), never the
 * raw source — masking is length- and newline-preserving, so every match
 * offset still resolves to the correct line in the original file via lineOf. */
export function findOccurrencesInFile(rawText) {
  const text = maskCommentsOutsideStrings(rawText)
  const lineOf = makeLineLookup(text)
  const seen = new Set()
  const occurrences = []
  const add = ({ token, offset }) => {
    const key = `${offset}:${token}`
    if (seen.has(key)) return
    seen.add(key)
    occurrences.push({ token, line: lineOf(offset), offset })
  }

  const classNameRe = /className\s*[=:]\s*\{?\s*(["'`])/g
  let m
  while ((m = classNameRe.exec(text))) {
    const quoteIdx = m.index + m[0].length - 1
    const { end, parts } = readStringLiteral(text, quoteIdx)
    for (const part of parts) for (const t of tokensOfPart(part)) add(t)
    classNameRe.lastIndex = end
  }

  const callRe = /(?<!\.)\b(?:cn|clsx|cva)\(/g
  while ((m = callRe.exec(text))) {
    const openParenIdx = m.index + m[0].length - 1
    let depth = 1
    let i = openParenIdx + 1
    while (i < text.length && depth > 0) {
      if (text[i] === '(') depth++
      else if (text[i] === ')') depth--
      i++
    }
    const argsEnd = i - 1
    let k = openParenIdx + 1
    while (k < argsEnd) {
      const c = text[k]
      if (c === '"' || c === "'" || c === '`') {
        const { end, parts } = readStringLiteral(text, k)
        for (const part of parts) for (const t of tokensOfPart(part)) add(t)
        k = end
        continue
      }
      k++
    }
    callRe.lastIndex = i // resume after this call — its nested literals are already captured above
  }

  return occurrences
}

function walkSourceFiles(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e) || e === '__tests__') continue
    const p = join(dir, e)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walkSourceFiles(p, out)
    else if (/\.(tsx|ts|jsx|js|mjs|cjs)$/.test(e) && !/\.(test|spec|d)\.[a-z]+$/.test(e)) out.push(p)
  }
  return out
}

/** A waiver that carries no reason is a hole nobody can audit. Both waiver
 * forms this gate honours (the allowlist file and the inline marker) require
 * `<something> # reason` / `theme-audit-ok: reason` with a reason of at least
 * this many characters — long enough that "ok", "todo" or "fixme" do not
 * qualify, short enough that a real sentence always does. */
export const MIN_REASON_LENGTH = 12

/** Parse the allowlist TEXT (pure, so the self-test can feed it strings):
 * returns { allow: Set<token>, invalid: string[] }. A non-comment line is
 * valid ONLY as `<class-token> # <reason>` with the reason at least
 * MIN_REASON_LENGTH characters; anything else — a bare token, a token with an
 * empty or too-short reason, two tokens on one line — lands in `invalid` so
 * the caller can refuse the whole file rather than silently waiving. */
export function parseDynamicAllowlist(text) {
  const allow = new Set()
  const invalid = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^(\S+)\s+#\s*(.*)$/.exec(line)
    if (!m || m[2].trim().length < MIN_REASON_LENGTH) {
      invalid.push(line)
      continue
    }
    allow.add(m[1])
  }
  return { allow, invalid }
}

/** Load and VALIDATE an allowlist file. An invalid line is fatal before any
 * app is scanned: exit 1 naming the line — an unexplained waiver must never
 * take effect for even one run (review finding, rule 7). Called ONCE from
 * main(), ahead of every build, so the refusal lands before the first scan. */
function loadDynamicAllowlist(path = DYNAMIC_ALLOWLIST_PATH) {
  if (!existsSync(path)) return new Set()
  const { allow, invalid } = parseDynamicAllowlist(readFileSync(path, 'utf8'))
  if (invalid.length) {
    for (const line of invalid) console.error(`ALLOWLIST LINE WITHOUT REASON: ${line}`)
    console.error(
      `FAIL ${relative(ROOT, path)}: ${invalid.length} line(s) are not of the form ` +
        `\`<class-token> # <reason of at least ${MIN_REASON_LENGTH} characters>\`. A waiver without a ` +
        `reason is a hole the gate cannot see through; nothing was scanned.`,
    )
    process.exit(1)
  }
  return allow
}

// ---------------------------------------------------------------------------
// The real build.
// ---------------------------------------------------------------------------

/** Walk UP from `searchDir` (the way Node's own module resolution would) to
 * find an installed tailwindcss and report its exact version. The self-test
 * fixture lives in a fresh temp directory NESTED inside a host app — it has
 * no node_modules of its own, and is not meant to; `@tailwindcss/cli` resolves
 * `@import "tailwindcss"` the same way, by walking up from the CSS file. */
function resolveTailwindVersion(searchDir) {
  let dir = searchDir
  for (;;) {
    const p = join(dir, 'node_modules/tailwindcss/package.json')
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')).version
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** Build `cssEntryPath` with the tailwindcss major.minor.patch actually
 * installed at or above `cwd`, via `npx --yes @tailwindcss/cli@<ver>` (the
 * package is installed NOWHERE in the estate as a devDependency — measured
 * 2026-09-03 — so npx is the only way to reach it without a lockfile regen
 * for a build-only tool). Returns the emitted CSS text; the temp output file
 * is always deleted, success or failure. */
function buildCss(cwd, cssEntryPath) {
  const twVersion = resolveTailwindVersion(cwd)
  if (!twVersion) {
    throw new Error(`tailwindcss not installed at or above ${cwd} — run pnpm install first`)
  }
  const outPath = join(os.tmpdir(), `c10-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2)}.css`)
  try {
    execFileSync('npx', ['--yes', `@tailwindcss/cli@${twVersion}`, '-i', cssEntryPath, '-o', outPath], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
    return readFileSync(outPath, 'utf8')
  } finally {
    rmSync(outPath, { force: true })
  }
}

/** The estate's standard exemption convention (audit-invalid-utilities.sh,
 * audit-palette-whitelist.py, audit-oklch-lightness.py, audit-legibility.mjs,
 * check-colour-ban-reaches-converters.mjs): a `theme-audit-ok` marker is
 * honoured on the hit's own line OR the line immediately above it, so a long
 * line can carry its exemption on its own line rather than being reformatted.
 *
 * THIS gate tightens the convention (review finding, rule 7): only
 * `theme-audit-ok: <reason of at least MIN_REASON_LENGTH characters>` exempts.
 * A bare `theme-audit-ok` — no colon, or a reason too short to mean anything —
 * does NOT exempt and is reported as its own finding kind, MARKER WITHOUT
 * REASON, so a waiver that lost its justification cannot rot silently.
 *
 * `data-theme-audit-ok="…"` is audit-legibility.mjs's DOM-attribute form; it
 * is not this gate's marker and is neither honoured nor reported here (the
 * negative lookbehind excludes it).
 *
 * Returns 'reasoned' | 'bare' | null for the pair (hit line, line above):
 * a reasoned marker on either line wins; otherwise a bare marker on either
 * line is 'bare'; otherwise null. */
const MARKER_RE = /(?<![\w-])theme-audit-ok(?![\w-])/
const REASONED_MARKER_RE = /(?<![\w-])theme-audit-ok\s*:\s*(.*)$/

export function classifyThemeAuditOkMarker(lines, lineNo) {
  const candidates = [lines[lineNo - 1] || '', lineNo > 1 ? lines[lineNo - 2] || '' : '']
  let sawBare = false
  for (const l of candidates) {
    if (!MARKER_RE.test(l)) continue
    const m = REASONED_MARKER_RE.exec(l)
    const reason = m ? m[1].replace(/\s*(\*\/|-->|\}|["'`])+\s*$/, '').trim() : ''
    if (reason.length >= MIN_REASON_LENGTH) return 'reasoned'
    sawBare = true
  }
  return sawBare ? 'bare' : null
}

/** Kept for the logic self-test and any external caller: true ONLY for a
 * reasoned marker. A bare marker is not an exemption any more. */
export function hasThemeAuditOkMarker(lines, lineNo) {
  return classifyThemeAuditOkMarker(lines, lineNo) === 'reasoned'
}

function scanApp(appDir, cssRel, allowlist = new Set()) {
  const cssPath = join(appDir, cssRel)
  if (!existsSync(cssPath)) throw new Error(`CSS entrypoint ${cssRel} does not exist under ${appDir}`)

  const emittedCss = buildCss(appDir, cssPath)
  const emitted = extractEmittedClasses(emittedCss)

  const files = walkSourceFiles(appDir)
  const findings = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    const lines = text.split('\n')
    for (const { token, line } of findOccurrencesInFile(text)) {
      if (!isCandidateToken(token)) continue
      if (emitted.has(token)) continue
      if (allowlist.has(token)) continue
      const marker = classifyThemeAuditOkMarker(lines, line)
      if (marker === 'reasoned') continue
      findings.push({
        file: relative(ROOT, f),
        line,
        token,
        ...(marker === 'bare' ? { kind: 'MARKER WITHOUT REASON' } : {}),
      })
    }
  }
  findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1))
  return { findings, filesScanned: files.length, emittedCount: emitted.size }
}

function formatFinding(f) {
  return `  ${f.file}:${f.line}  ${f.token}${f.kind ? `  [${f.kind}]` : ''}`
}

// ---------------------------------------------------------------------------
// Self-test — a gate whose pass and no-op states are indistinguishable hides
// defects, so prove the detector can still fail before trusting a pass.
// ---------------------------------------------------------------------------

function findSelfTestHost() {
  for (const app of SELF_TEST_HOST_ORDER) {
    if (existsSync(join(ROOT, app, 'node_modules/tailwindcss/package.json'))) return app
  }
  return null
}

function runRealBuildSelfTestCase() {
  const host = findSelfTestHost()
  if (!host) {
    console.error(
      'SELF-TEST FAIL: real-build case — no app has tailwindcss installed under node_modules/. ' +
        'Run pnpm install in at least one of ' + Object.keys(APPS).join(', ') + ' first.',
    )
    return 1
  }
  const hostDir = join(ROOT, host)
  const fixtureDir = mkdtempSync(join(hostDir, '.c10-selftest-'))
  let failures = 0
  try {
    const cssPath = join(fixtureDir, 'fixture.css')
    // The 3-line @theme fixture: registers exactly one token.
    writeFileSync(
      cssPath,
      '@import "tailwindcss";\n@theme {\n  --color-known: oklch(0.6 0.1 250);\n}\n',
    )
    writeFileSync(
      join(fixtureDir, 'fixture.tsx'),
      "export const X = () => <div className=\"bg-known bg-unregistered\" />;\n",
    )
    const emitted = extractEmittedClasses(buildCss(fixtureDir, cssPath))
    if (!emitted.has('bg-known')) {
      console.error('SELF-TEST FAIL: real-build case — bg-known (registered via @theme) was NOT emitted')
      failures++
    }
    if (emitted.has('bg-unregistered')) {
      console.error('SELF-TEST FAIL: real-build case — bg-unregistered (never registered) WAS emitted')
      failures++
    }
    if (!failures) console.log(`  real-build case: OK (host app ${host}) — bg-known passes, bg-unregistered fails`)

    // ---- the SAME entry point, end to end, as a child process ----
    // The three checks above prove the pieces; these prove main() itself
    // wired together over the same fixture: a planted violation MUST exit 1
    // and name the token, a clean fixture MUST exit 0, and the inline
    // theme-audit-ok marker MUST turn the planted violation back into 0.
    // A self-test that only exercises exported helpers cannot tell "the
    // detector works" from "main() forgot to call it".
    const runFixture = () => {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--fixture=${fixtureDir}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return { status: r.status, out: `${r.stdout}${r.stderr}` }
    }
    let r = runFixture()
    if (r.status !== 1 || !r.out.includes('bg-unregistered')) {
      console.error(`SELF-TEST FAIL: entry-point case — planted violation should exit 1 naming bg-unregistered; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — planted bg-unregistered exits 1 and is named')
    }
    writeFileSync(join(fixtureDir, 'fixture.tsx'), 'export const X = () => <div className="bg-known" />;\n')
    r = runFixture()
    if (r.status !== 0) {
      console.error(`SELF-TEST FAIL: entry-point case — clean fixture should exit 0; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — clean fixture exits 0')
    }
    writeFileSync(
      join(fixtureDir, 'fixture.tsx'),
      '// theme-audit-ok: self-test — the marker on the line above must exempt the hit below\nexport const X = () => <div className="bg-known bg-unregistered" />;\n',
    )
    r = runFixture()
    if (r.status !== 0) {
      console.error(`SELF-TEST FAIL: entry-point case — theme-audit-ok marker WITH a reason should exempt the hit and exit 0; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — theme-audit-ok: <reason> exempts the planted hit, exits 0')
    }

    // A BARE marker (no colon, no reason) must NOT exempt: exit 1, and the
    // finding is labelled so a waiver that lost its justification is visible.
    writeFileSync(
      join(fixtureDir, 'fixture.tsx'),
      '// theme-audit-ok\nexport const X = () => <div className="bg-known bg-unregistered" />;\n',
    )
    r = runFixture()
    if (r.status !== 1 || !r.out.includes('MARKER WITHOUT REASON') || !r.out.includes('bg-unregistered')) {
      console.error(`SELF-TEST FAIL: entry-point case — bare theme-audit-ok should NOT exempt; expected exit 1 reporting MARKER WITHOUT REASON for bg-unregistered; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — bare theme-audit-ok does not exempt; exit 1, MARKER WITHOUT REASON named')
    }

    // The planted violation written as a template-literal className — the form
    // the first cut dropped entirely — must still be found through main().
    writeFileSync(
      join(fixtureDir, 'fixture.tsx'),
      'export const X = ({ on }) => <div className={`bg-known ${on ? "p-1" : "p-2"} bg-unregistered`} />;\n',
    )
    r = runFixture()
    if (r.status !== 1 || !r.out.includes('bg-unregistered')) {
      console.error(`SELF-TEST FAIL: entry-point case — planted violation inside className={\`…\`} should exit 1 naming bg-unregistered; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — planted bg-unregistered inside a template-literal className exits 1 and is named')
    }

    // Allowlist through the entry point: a bare line refuses the run before
    // any scan (exit 1, the line named); a reasoned line waives (exit 0).
    writeFileSync(join(fixtureDir, 'fixture.tsx'), 'export const X = () => <div className="bg-known bg-unregistered" />;\n')
    writeFileSync(join(fixtureDir, 'allowlist.txt'), '# fixture allowlist\nbg-unregistered\n')
    r = runFixture()
    if (r.status !== 1 || !r.out.includes('ALLOWLIST LINE WITHOUT REASON: bg-unregistered') || r.out.includes('finding(s)')) {
      console.error(`SELF-TEST FAIL: entry-point case — bare allowlist line should exit 1 naming it BEFORE any scan; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — bare allowlist line exits 1, named, nothing scanned')
    }
    writeFileSync(join(fixtureDir, 'allowlist.txt'), '# fixture allowlist\nbg-unregistered # self-test: this token is assembled at runtime\n')
    r = runFixture()
    if (r.status !== 0) {
      console.error(`SELF-TEST FAIL: entry-point case — allowlist line WITH a reason should waive the hit and exit 0; got exit ${r.status}:\n${r.out}`)
      failures++
    } else {
      console.log('  entry-point case: OK — allowlist line with a reason waives the planted hit, exits 0')
    }
    rmSync(join(fixtureDir, 'allowlist.txt'), { force: true })
  } catch (e) {
    console.error(`SELF-TEST FAIL: real-build case — ${e.message}`)
    failures++
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true })
  }
  return failures
}

function runSelfTest() {
  let failures = 0
  let total = 0
  const check = (name, got, expected) => {
    total++
    const g = JSON.stringify(got)
    const e = JSON.stringify(expected)
    if (g !== e) {
      console.error(`SELF-TEST FAIL: ${name} — expected ${e}, got ${g}`)
      failures++
    }
  }

  // ---- candidate-filter logic ----
  const candidateCases = [
    ['plain utility', 'bg-primary', true],
    ['opacity modifier', 'bg-primary/60', true],
    ['single variant stripped', 'hover:bg-primary', true],
    ['multi-variant stripped', 'dark:hover:bg-primary/60', true],
    ['ring utility', 'ring-focus', true],
    ['fill utility', 'fill-icon', true],
    ['arbitrary bracket form excluded', 'bg-[#fff]', false],
    ['arbitrary property form excluded', 'bg-(--custom)', false],
    ['arbitrary variant, clean base still candidate', '[&:hover]:bg-primary', true],
    ['template interpolation excluded', 'bg-primary-${shade}', false],
    ['interpolated variable alone excluded', '${dynamicClass}', false],
    ['non-covered prefix excluded', 'flex', false],
    ['non-covered prefix with dash excluded', 'gap-4', false],
  ]
  for (const [name, token, expected] of candidateCases) check(`candidate: ${name}`, isCandidateToken(token), expected)

  // ---- emitted-side selector parsing ----
  check(
    'parses an opacity-modifier selector',
    [...extractEmittedClasses('.bg-primary\\/60 {\n  color: red;\n}\n')],
    ['bg-primary/60'],
  )
  check(
    'parses a variant + arbitrary-property selector',
    [...extractEmittedClasses('.hover\\:bg-\\(--bg-panel\\):hover {\n  color: red;\n}\n')],
    ['hover:bg-(--bg-panel)'],
  )
  check(
    'finds a class nested inside an at-rule without matching the prelude',
    [...extractEmittedClasses('@media (width >= 40rem) {\n  .bg-shell {\n    background: red;\n  }\n}\n')],
    ['bg-shell'],
  )
  check(
    // Also finds the bare `.dark` inside `:is(.dark *)` — correctly: that IS a
    // second real class selector in this rule (the ancestor marker class dark
    // mode scoping reads), not a parsing artefact.
    'unescapes a comma inside an arbitrary value under a dark variant',
    [...extractEmittedClasses(
      '@layer utilities {\n  .dark\\:shadow-\\[var\\(--glow-card\\,none\\)\\]:is(.dark *) {\n    box-shadow: red;\n  }\n}\n',
    )].sort(),
    ['dark', 'dark:shadow-[var(--glow-card,none)]'],
  )

  // ---- diff logic: mocked emitted set vs candidates ----
  const emitted = new Set(['bg-known'])
  const candidates = ['bg-known', 'bg-unregistered']
  check('diff: exactly one finding for one unregistered candidate', candidates.filter((c) => !emitted.has(c)), ['bg-unregistered'])

  // ---- occurrence scan finds real className usage, with line numbers ----
  const classNameSrc = '<div className="bg-known bg-unregistered" />\n'
  const classNameOcc = findOccurrencesInFile(classNameSrc).map((o) => `${o.token}@${o.line}`)
  check('className scan finds both tokens on their line', classNameOcc.sort(), ['bg-known@1', 'bg-unregistered@1'])

  // ---- theme-audit-ok marker: ONLY `theme-audit-ok: <reason ≥ 12 chars>` exempts ----
  const markerLines = [
    'const a = "bg-unregistered"; // theme-audit-ok: intentional demo class',
    '// theme-audit-ok: next line is a deliberate demo',
    'const b = "bg-unregistered-2";',
    'const c = "bg-unregistered-3";',
    'const d = "bg-unregistered-4"; // theme-audit-ok',
    'const e = "bg-unregistered-5"; // theme-audit-ok: short',
    'const plain = 1',
    'const f = "bg-unregistered-6"; data-theme-audit-ok="the DOM-attribute form audit-legibility reads"',
  ]
  check('reasoned marker on the hit line itself exempts it', hasThemeAuditOkMarker(markerLines, 1), true)
  check('reasoned marker on the line above exempts it', hasThemeAuditOkMarker(markerLines, 3), true)
  check('no marker on either line does not exempt it', hasThemeAuditOkMarker(markerLines, 4), false)
  check('bare marker (no colon, no reason) does NOT exempt', hasThemeAuditOkMarker(markerLines, 5), false)
  check('bare marker is classified as bare, not silently ignored', classifyThemeAuditOkMarker(markerLines, 5), 'bare')
  check('marker with a reason shorter than 12 chars is bare', classifyThemeAuditOkMarker(markerLines, 6), 'bare')
  check('data-theme-audit-ok attribute is not this marker', classifyThemeAuditOkMarker(markerLines, 8), null)
  check('no marker classifies as null', classifyThemeAuditOkMarker(markerLines, 4), null)

  // ---- dynamic allowlist: a line is valid ONLY as `<token> # <reason ≥ 12 chars>` ----
  const allowlistText = [
    '# a comment line is fine',
    'bg-bare-token',
    'bg-short-reason # tiny',
    'bg-waived # assembled at runtime from a shared constants module',
    'bg-two tokens # two tokens on one line is not one entry',
    '',
  ].join('\n')
  const parsed = parseDynamicAllowlist(allowlistText)
  check('allowlist: only the reasoned line waives', [...parsed.allow], ['bg-waived'])
  check(
    'allowlist: every bare / short / malformed line is invalid',
    parsed.invalid,
    ['bg-bare-token', 'bg-short-reason # tiny', 'bg-two tokens # two tokens on one line is not one entry'],
  )

  // ---- template-literal className: quasis ARE scanned, `${…}` expressions are not ----
  const tplSrc = [
    '<div className={`rounded-3xl border p-8 relative ${',
    "  isCurrent ? 'ring-2 ring-primary' : 'border-border-shell bg-bg-shell-elevated'",
    '}`} />',
  ].join('\n')
  check(
    'template className: static quasi tokens and the quoted ternary arms are found, on their lines',
    findOccurrencesInFile(tplSrc).map((o) => `${o.token}@${o.line}`),
    ['rounded-3xl@1', 'border@1', 'p-8@1', 'relative@1', 'ring-2@2', 'ring-primary@2', 'border-border-shell@2', 'bg-bg-shell-elevated@2'],
  )
  check(
    'template className: `${color}` is skipped, the static tokens beside it are kept',
    findOccurrencesInFile('<div className={`p-2 rounded-lg bg-bg-shell-accent ${color}`}>').map((o) => o.token),
    ['p-2', 'rounded-lg', 'bg-bg-shell-accent'],
  )
  check(
    'template className: a token fused to an interpolation is a fragment, not a candidate',
    findOccurrencesInFile('<div className={`bg-primary-${shade} ${p}-primary bg-real`}>')
      .map((o) => o.token)
      .filter(isCandidateToken),
    ['bg-real'],
  )
  check(
    'braced quoted className is scanned',
    findOccurrencesInFile("<div className={'bg-a bg-b'}>").map((o) => o.token),
    ['bg-a', 'bg-b'],
  )
  check(
    'cn(): template-literal argument contributes its quasis and nested quoted arms',
    findOccurrencesInFile("cn(`bg-a ${on ? 'bg-b' : \"bg-c\"} bg-d`, 'bg-e')").map((o) => o.token),
    ['bg-a', 'bg-b', 'bg-c', 'bg-d', 'bg-e'],
  )
  check(
    'a literal reached by both passes counts once',
    findOccurrencesInFile("<div className={`${cn('bg-a')}`}>").map((o) => o.token),
    ['bg-a'],
  )

  // ---- cn()/clsx()/cva() paren-balanced scan ----
  const callSrc = 'const x = cn("bg-a", isOn && clsx("bg-b", { "bg-c": on }), cva("bg-d")())'
  const callTokens = findOccurrencesInFile(callSrc).map((o) => o.token).sort()
  check('cn/clsx/cva scan finds every quoted literal at any nesting depth', callTokens, ['bg-a', 'bg-b', 'bg-c', 'bg-d'].sort())

  // Regression: crm7/src/components/ui/alert.tsx:16 — an apostrophe inside an
  // ORDINARY // COMMENT ("crm7#1157's config-error...") must not be read as
  // an opening string quote. Before maskCommentsOutsideStrings existed this
  // produced a bogus "text-error-" finding out of unrelated comment prose.
  const commentApostropheSrc = [
    "const v = cva('bg-a', {",
    "  variants: {",
    "    variant: {",
    "      // crm7#1157's note: text-should-not-appear as a class",
    "      destructive: 'text-real-token',",
    "    },",
    "  },",
    "})",
  ].join('\n')
  check(
    "an apostrophe inside a // comment does not open a fake string",
    findOccurrencesInFile(commentApostropheSrc).map((o) => o.token).sort(),
    ['bg-a', 'text-real-token'],
  )

  // ---- real build + entry point ----
  const ENTRY_POINT_CASES = 7 // planted, clean, reasoned marker, bare marker, template-literal planted, bare allowlist, reasoned allowlist
  failures += runRealBuildSelfTestCase()

  if (failures) {
    console.error(`\n${failures} self-test failure(s) — the checker itself is broken; its verdicts mean nothing.`)
    return 1
  }
  console.log(`check-css-classes-emitted --self-test: OK (${total} logic cases + 1 real-build case + ${ENTRY_POINT_CASES} entry-point cases)`)
  return 0
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--self-test')) process.exit(runSelfTest())

  // --fixture=<dir>: run the SAME scan/verdict path over one directory holding
  // fixture.css + source, with no baseline — exit 1 on any finding, 0 on none.
  // Exists so --self-test can drive this entry point as a child process (the
  // brief's rule: a self-test invokes the same entry point over a fixture with
  // a planted violation and asserts non-zero, then a clean one and asserts
  // zero). Not for use against a real app: the ratchet is the product here.
  const fixtureDir = args.find((a) => a.startsWith('--fixture='))?.slice('--fixture='.length)
  if (fixtureDir) {
    const dir = resolve(fixtureDir)
    // A fixture may carry its own allowlist.txt so the self-test can drive the
    // allowlist validation through THIS entry point (invalid line -> exit 1
    // before any scan; valid line -> waives). Absent file = empty allowlist.
    const allowlist = loadDynamicAllowlist(join(dir, 'allowlist.txt'))
    const { findings, filesScanned, emittedCount } = scanApp(dir, 'fixture.css', allowlist)
    console.log(`fixture ${dir}: ${findings.length} finding(s), ${filesScanned} file(s) scanned, ${emittedCount} class(es) emitted`)
    for (const f of findings) console.log(formatFinding(f))
    process.exit(findings.length ? 1 : 0)
  }

  const updateBaseline = args.includes('--update-baseline')
  const onlyApp = args.find((a) => a.startsWith('--app='))?.slice('--app='.length)

  // Validate the allowlist BEFORE the first build: an unexplained waiver
  // exits 1 here, named, and no app is scanned under it (not even for
  // --update-baseline — a bank taken under a silent waiver is a silent bank).
  const allowlist = loadDynamicAllowlist()

  const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : {}
  const scannedBaseline = existsSync(SCANNED_BASELINE_PATH) ? JSON.parse(readFileSync(SCANNED_BASELINE_PATH, 'utf8')) : {}

  const newBaseline = { ...baseline }
  const newScannedBaseline = { ...scannedBaseline }
  let anyFail = false
  let anyRan = false

  for (const [app, cssRel] of Object.entries(APPS)) {
    if (onlyApp && app !== onlyApp) continue
    const appDir = join(ROOT, app)
    if (!existsSync(join(appDir, 'package.json'))) {
      console.log(`note  ${app}: no package.json — submodule not initialised, skipped`)
      continue
    }

    let result
    try {
      result = scanApp(appDir, cssRel, allowlist)
    } catch (e) {
      console.error(`FAIL ${app}: ${e.message}`)
      anyFail = true
      continue
    }
    anyRan = true
    const { findings, filesScanned, emittedCount } = result
    const bareMarkers = findings.filter((f) => f.kind === 'MARKER WITHOUT REASON').length
    console.log(
      `\n${app}: ${findings.length} finding(s), ${filesScanned} file(s) scanned, ${emittedCount} class(es) emitted` +
        (bareMarkers ? ` — ${bareMarkers} of the findings are MARKER WITHOUT REASON (a bare theme-audit-ok no longer exempts)` : ''),
    )
    for (const f of findings) console.log(formatFinding(f))

    newBaseline[app] = findings.length
    newScannedBaseline[app] = filesScanned

    if (updateBaseline) continue

    const bankedFindings = baseline[app]
    const bankedScanned = scannedBaseline[app]

    if (bankedFindings === undefined) {
      console.error(`FAIL ${app}: no entry in ${relative(ROOT, BASELINE_PATH)} — add one (0 if clean) or run --update-baseline`)
      anyFail = true
      continue
    }
    if (bankedScanned !== undefined && filesScanned < bankedScanned) {
      console.error(
        `FAIL ${app}: scanned ${filesScanned} file(s) this run, banked denominator is ${bankedScanned} — ` +
          `scanned LESS than banked. A clean result over less tree than last time is not a clean result.`,
      )
      anyFail = true
      continue
    }
    if (findings.length > bankedFindings) {
      console.error(`FAIL ${app}: findings rose to ${findings.length} against baseline ${bankedFindings}.`)
      anyFail = true
    } else if (findings.length < bankedFindings) {
      console.error(`FAIL ${app}: findings FELL to ${findings.length} against baseline ${bankedFindings} — bank it.`)
      console.error(`  Fix: node scripts/check-css-classes-emitted.mjs --update-baseline`)
      anyFail = true
    } else {
      console.log(`OK ${app}: ${findings.length} == baseline ${bankedFindings} (scanned ${filesScanned} >= banked ${bankedScanned ?? 0})`)
    }
  }

  if (updateBaseline) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(newBaseline, null, 2)}\n`)
    writeFileSync(SCANNED_BASELINE_PATH, `${JSON.stringify(newScannedBaseline, null, 2)}\n`)
    console.log(`\nUpdated ${relative(ROOT, BASELINE_PATH)} and ${relative(ROOT, SCANNED_BASELINE_PATH)}`)
    process.exit(0)
  }

  if (!anyRan && !onlyApp) {
    console.error('FAIL: no app was scanned — every submodule missing or every build failed.')
    process.exit(1)
  }

  process.exit(anyFail ? 1 : 0)
}

// Guarded so importing this module's exports (unit tests, a future runner)
// never triggers a live build sweep as a side effect of `import`.
if (import.meta.url === `file://${process.argv[1]}`) main()
