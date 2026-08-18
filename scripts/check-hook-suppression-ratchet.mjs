#!/usr/bin/env node
/**
 * check-hook-suppression-ratchet.mjs — a two-way ratchet on React-hook lint
 * SUPPRESSIONS across the estate.
 *
 * Tracked rules: `react-hooks/exhaustive-deps` and
 * `react-hooks/set-state-in-effect`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS: NO EXISTING BASELINE CAN SEE A SUPPRESSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The estate already runs lint ratchets. None of them can count this class,
 * and one of them is STRUCTURALLY INCAPABLE of ever counting it. That is the
 * reusable lesson and it is worth stating precisely, because it generalises
 * to every rule anyone ever suppresses:
 *
 *   A LINT BASELINE THAT RECORDS *ERRORS* CANNOT SEE A RULE THAT WAS
 *   SUPPRESSED AT THE CALL SITE.
 *
 * The concrete instance is R80.4/eslint-baseline.json, written by
 * R80.4/scripts/lint-ratchet.mjs. That script builds its numbers like this:
 *
 *     for (const file of report)
 *       for (const m of file.messages)
 *         counts[m.ruleId] = (counts[m.ruleId] ?? 0) + 1
 *
 * `report` is `eslint --format json`. A violation covered by an
 * `// eslint-disable-next-line <rule>` directive produces NO ENTRY in
 * `file.messages` at all — ESLint applies directive comments while building
 * the message list, not afterwards. So the suppressed violation contributes
 * zero to `counts`, the rule never acquires a key.
 *
 * That paragraph was MEASURED, not recalled. Two fixtures identical except
 * for one comment line, linted through the estate's own installed
 * eslint 10.8.1 + eslint-plugin-react-hooks 7.1.1, with the counting loop
 * above reproduced verbatim:
 *
 *   without the comment -> {"react-hooks/set-state-in-effect":1,
 *                           "react-hooks/exhaustive-deps":1}
 *   with    the comment -> {}
 *
 * The positive control is the first line: the fixture really does trip both
 * rules, so the empty second line is a suppression and not a probe that
 * never worked. (A broken probe and a genuine absence render identically;
 * this estate has shipped both.)
 *
 * The baseline that counting loop produces therefore holds:
 *
 *     { "counts": { "no-useless-assignment": 10,
 *                   "@typescript-eslint/no-unused-vars": 21,
 *                   "no-useless-escape": 1,
 *                   "@typescript-eslint/no-explicit-any": 3 } }
 *
 * — four rules, none of them a react-hooks rule, on a repo that ships 11
 * .tsx files. That is not evidence R80.4 is clean of hook debt. It is a
 * measurement instrument that cannot register the quantity being asked
 * about. Adding the two rules to that baseline would not help either: the
 * number it would record is the count of UNSUPPRESSED violations, which
 * goes DOWN every time somebody suppresses one. An error-count baseline
 * does not merely miss suppressions — it rewards them.
 *
 * The same blindness applies, for the same structural reason, to every
 * count-the-findings baseline in the estate: scripts/semgrep-baseline.json
 * cannot see a `nosemgrep`, and scripts/edge-function-typecheck-baseline.json
 * cannot see a `@ts-expect-error`. The suppression class needs its own
 * counter, pointed at the suppressions themselves rather than at what
 * survives them. That is this file.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE THREE FORMS A SUPPRESSION TAKES — AND WHY COUNTING ONLY THE FIRST LIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The filed number for this debt (90, re-measured here as 97) counted only
 * inline `eslint-disable*` comments. That undercounts, badly, because a rule
 * can be turned off three different ways and only one of them is a comment:
 *
 *   1. INLINE — `// eslint-disable-next-line react-hooks/exhaustive-deps`,
 *      block-comment `eslint-disable <rule>` and `eslint-disable-line <rule>`.
 *      97 of these across the six apps + packages/ at the gitlinks this
 *      guard was written against.
 *
 *   2. CONFIG-SCOPED — a flat-config object with a `files:` list and
 *      `rules: { '<rule>': 'off' }`. crm7/eslint.config.js does exactly this
 *      for 88 files of `set-state-in-effect` and 4 of `exhaustive-deps`: 92
 *      file-level suppressions, zero comments, invisible to any grep for
 *      `eslint-disable`.
 *
 *      Those two numbers are counted from the arrays. crm7's own header
 *      comment above them says "`set-state-in-effect` (80 files)" — the
 *      array holds 88. The prose register drifted eight behind the thing it
 *      describes, which is the entire argument for counting the array
 *      instead of believing the comment, and a small live demonstration that
 *      a hand-maintained debt register decays the moment anyone stops
 *      maintaining it.
 *
 *   3. CONFIG-GLOBAL — the same `rules: { '<rule>': 'off' }` in a config
 *      object with NO `files:` restriction, which turns the rule off for the
 *      whole repository. conduit/eslint.config.mjs does this to
 *      `set-state-in-effect`. This one has no natural count: it is not "N
 *      suppressions", it is an UNBOUNDED licence, and conduit's four inline
 *      comments for the other rule are a rounding error beside it.
 *
 * Counting only form 1 would have reported conduit as carrying 4 and crm7 as
 * carrying 51. It also leaves an obvious evasion route — move an inline
 * comment into the config file's `files:` array and the "debt" falls.
 * Form 3 is therefore not counted at all; it is ENUMERATED, and any new
 * (scope, rule) pair acquiring one is a hard failure regardless of what
 * happens to the totals, because an unbounded disable can absorb any amount
 * of future debt without moving a number.
 *
 * A FOURTH form is tracked for the same evasion reason: a BLANKET directive
 * (an `eslint-disable` comment carrying no rule list at all) disables every
 * rule, these two included. Swapping a named suppression for a blanket one
 * would otherwise read as an improvement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THE RATCHET FAILS IN BOTH DIRECTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Same shape as scripts/semgrep-sast.mjs and the near-pure colour gate: a
 * committed baseline, a hard failure on an increase. This one ALSO hard-fails
 * on a decrease, which semgrep-sast.mjs only prints a ::notice:: for.
 *
 * The reason is specific to this debt class rather than a general preference.
 * An unbanked gain here can be given back silently and for free: removing a
 * suppression is a one-line diff, and re-adding it is the same one-line diff
 * in reverse. If the baseline still said 51 while the tree said 49, two
 * suppressions could reappear and the gate would hold. The gain has to be
 * banked in the same commit that earns it, or it is not a gain, it is a
 * loan. `--update` re-banks; it refuses to raise anything (see below).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT THIS GUARD DELIBERATELY DOES NOT DO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * It does not judge whether a suppression is CORRECT. Many are: an
 * `exhaustive-deps` disable on a deliberate fetch-once-on-mount effect is a
 * legitimate, documented exemption, and stripping it to make this number
 * smaller would introduce a real bug in exchange for a cosmetic win. The
 * guard's whole job is to make the class VISIBLE and stop it growing without
 * anyone noticing. Reducing it is separate work, done one call site at a
 * time, by someone who has read the effect.
 *
 * It does not run ESLint. Deliberately — a guard that needs `node_modules`
 * in six submodules is a guard that gets registered as `skip` and never
 * actually runs (see guard-registry.mjs, where four entries are skipped for
 * exactly that reason). This is a source scan over `git ls-files`, so it
 * runs anywhere the tree is checked out. The consequence, stated plainly: it
 * counts DECLARED suppression sites, not ESLint's final resolved effective
 * config. A `files:`-scoped `off` that a later config object re-enables would
 * still be counted here. That is the conservative direction — it over-counts
 * declarations rather than under-counting debt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NO REGEX (Tier-2 doctrine)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hand-written tokeniser, per the estate rule that retired the colour gate's
 * regex after it silently matched `#ffffff00` as safe, and per
 * check-guard-self-reporting.mjs's own token walk. It matters more than usual
 * here: `eslint-disable` appears in prose comments ABOUT suppressions all
 * over this estate (crm7/eslint.config.js's header discusses the rules at
 * length), inside string literals in codemods, and inside this very file. A
 * line-grep counts those. A tokeniser knows a comment from a string from
 * code, and knows that a directive is only a directive when it is the first
 * thing in the comment.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SELF-REPORTING + REFUSALS (bsuite LANE-WATCHER)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The FIRST line of output states a non-zero count of source files scanned.
 * At the head, not in a trailing summary — check-guard-self-reporting.mjs
 * classifies from the head and a tail summary is truncated before it is read.
 * The count is derived from the scan, never a literal.
 *
 * Every zero is positive-controlled. Three things are hard failures, never a
 * pass, because each produces output identical to a clean tree:
 *
 *   - a scope directory that is absent or empty (an uninitialised submodule
 *     is an empty directory, and an empty directory scans flawlessly);
 *   - a scope with zero source files;
 *   - a config `files:` value this scanner cannot resolve to a count — it
 *     refuses rather than recording 0, because "I could not read it" and
 *     "there is nothing there" must never render the same.
 *
 * A scope that has React source but configures NO react-hooks rules at all
 * is reported as UNENFORCED rather than clean. R80.4 is that scope today:
 * 0 suppressions, because nothing is switched on to suppress.
 *
 * Usage:
 *   node scripts/check-hook-suppression-ratchet.mjs
 *   node scripts/check-hook-suppression-ratchet.mjs --update
 *   node scripts/check-hook-suppression-ratchet.mjs --self-test
 *   node scripts/check-hook-suppression-ratchet.mjs --list <scope>
 *
 * Exit codes:
 *   0 — every scope matches its banked baseline exactly.
 *   1 — a count rose, a count fell without a re-bank, a new global `off`
 *       appeared, or a refusal fired (empty scope / unresolvable config).
 *   2 — the baseline file is missing or unparseable.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(REPO_ROOT, 'scripts', 'hook-suppression-baseline.json')

/** The rules this ratchet tracks. Both are eslint-plugin-react-hooks v7. */
const TRACKED_RULES = ['react-hooks/exhaustive-deps', 'react-hooks/set-state-in-effect']

/**
 * Scope = one deploy unit. `.` is the parent monorepo, whose own React source
 * lives in packages/; `git ls-files` at the parent returns parent-tracked
 * files only, so submodule contents are not double-counted here.
 */
const SCOPES = ['.', 'crm7', 'conduit', 'business-suite-unified', 'braden', 'throughput', 'R80.4']

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

/** Paths never worth scanning even when tracked (checked-in vendor/build output). */
const EXCLUDED_SEGMENTS = ['node_modules/', 'dist/', 'build/', '.next/', 'coverage/', '.turbo/']

const CONFIG_BASENAMES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
]

// ═══════════════════════════════════════════════════════════════════════════
// Tokeniser — hand-written, no regex.
// ═══════════════════════════════════════════════════════════════════════════

const PUNCT = new Set(['{', '}', '[', ']', '(', ')', ':', ',', ';', '='])

/** Chars that can legally precede a REGEX literal rather than a division. */
const REGEX_PRECEDERS = new Set([
  '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<',
  '>', '\n',
])
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'do', 'else', 'yield', 'await', 'new', 'delete',
  'void', 'throw', 'case',
])

function isIdentChar(ch) {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_' ||
    ch === '$'
  )
}

function isSpace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v'
}

/**
 * Tokenise JS/TS source into comments, strings, words and structural punctuation.
 *
 * Returns { comments, tokens }. `comments` carries each comment's inner text
 * and whether it was a block comment. `tokens` is the structural stream the
 * config analysis walks — strings appear with their DECODED-enough value
 * (escape sequences are passed through, which is fine: rule ids and file globs
 * contain none).
 *
 * Template literals are followed through `${ }` interpolation by depth, so a
 * brace inside a template string never disturbs the object nesting.
 */
export function tokenise(source) {
  const comments = []
  const tokens = []
  let i = 0
  const n = source.length
  // Stack of template-literal frames; each entry is the brace depth at which
  // the interpolation started, so the matching `}` returns to template mode.
  const templateStack = []
  let braceDepth = 0
  let lastMeaningful = '\n' // for the regex-vs-division decision
  let lastWord = ''

  // Line numbers come from ONE precomputed prefix table plus a binary search.
  // The obvious "count the newlines before this offset" helper is O(n) per
  // call and made the estate-wide sweep quadratic — 4,000 files went from
  // seconds to minutes. Measured, not guessed: that is why this is a table.
  const lineStarts = [0]
  for (let k = 0; k < n; k += 1) if (source[k] === '\n') lineStarts.push(k + 1)
  function lineOf(offset) {
    let lo = 0
    let hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }

  while (i < n) {
    const ch = source[i]

    if (isSpace(ch)) {
      if (ch === '\n') lastMeaningful = '\n'
      i += 1
      continue
    }

    // ── comments ──────────────────────────────────────────────────────────
    if (ch === '/' && i + 1 < n && source[i + 1] === '/') {
      const start = i
      i += 2
      const textStart = i
      while (i < n && source[i] !== '\n') i += 1
      comments.push({ text: source.slice(textStart, i), block: false, start, line: lineOf(start) })
      continue
    }
    if (ch === '/' && i + 1 < n && source[i + 1] === '*') {
      const start = i
      i += 2
      const textStart = i
      while (i + 1 < n && !(source[i] === '*' && source[i + 1] === '/')) i += 1
      const textEnd = Math.min(i, n)
      i = Math.min(i + 2, n)
      comments.push({ text: source.slice(textStart, textEnd), block: true, start, line: lineOf(start) })
      continue
    }

    // ── regex literal (must be distinguished from division) ───────────────
    if (ch === '/') {
      const isRegex =
        REGEX_PRECEDERS.has(lastMeaningful) || REGEX_PRECEDING_KEYWORDS.has(lastWord)
      if (isRegex) {
        i += 1
        let inClass = false
        while (i < n) {
          const c = source[i]
          if (c === '\\') {
            i += 2
            continue
          }
          if (c === '[') inClass = true
          else if (c === ']') inClass = false
          else if (c === '/' && !inClass) {
            i += 1
            break
          } else if (c === '\n') break
          i += 1
        }
        while (i < n && isIdentChar(source[i])) i += 1 // flags
        lastMeaningful = '/'
        lastWord = ''
        continue
      }
      i += 1
      lastMeaningful = '/'
      lastWord = ''
      continue
    }

    // ── string literals ───────────────────────────────────────────────────
    if (ch === "'" || ch === '"') {
      const quote = ch
      const start = i
      i += 1
      let value = ''
      while (i < n) {
        const c = source[i]
        if (c === '\\') {
          value += source[i + 1] ?? ''
          i += 2
          continue
        }
        if (c === quote) {
          i += 1
          break
        }
        if (c === '\n') break // unterminated; bail rather than run away
        value += c
        i += 1
      }
      tokens.push({ kind: 'string', value, start, line: lineOf(start) })
      lastMeaningful = quote
      lastWord = ''
      continue
    }

    if (ch === '`') {
      const start = i
      i += 1
      let value = ''
      let closed = false
      while (i < n) {
        const c = source[i]
        if (c === '\\') {
          value += source[i + 1] ?? ''
          i += 2
          continue
        }
        if (c === '`') {
          i += 1
          closed = true
          break
        }
        if (c === '$' && source[i + 1] === '{') {
          // Enter interpolation: hand control back to the main loop, and
          // remember the brace depth to restore template mode at its close.
          templateStack.push(braceDepth)
          braceDepth += 1
          tokens.push({ kind: 'punct', value: '{', start: i + 1, line: lineOf(i + 1) })
          i += 2
          break
        }
        value += c
        i += 1
      }
      tokens.push({ kind: 'string', value, start, line: lineOf(start) })
      if (closed) {
        lastMeaningful = '`'
        lastWord = ''
      }
      continue
    }

    // ── structural punctuation ────────────────────────────────────────────
    if (PUNCT.has(ch)) {
      if (ch === '{') braceDepth += 1
      if (ch === '}') {
        braceDepth -= 1
        if (templateStack.length > 0 && templateStack[templateStack.length - 1] === braceDepth) {
          // Closing an interpolation: resume the enclosing template literal.
          templateStack.pop()
          tokens.push({ kind: 'punct', value: '}', start: i, line: lineOf(i) })
          i += 1
          let value = ''
          while (i < n) {
            const c = source[i]
            if (c === '\\') {
              value += source[i + 1] ?? ''
              i += 2
              continue
            }
            if (c === '`') {
              i += 1
              break
            }
            if (c === '$' && source[i + 1] === '{') {
              templateStack.push(braceDepth)
              braceDepth += 1
              tokens.push({ kind: 'punct', value: '{', start: i + 1, line: lineOf(i + 1) })
              i += 2
              break
            }
            value += c
            i += 1
          }
          tokens.push({ kind: 'string', value, start: i, line: lineOf(i) })
          continue
        }
      }
      tokens.push({ kind: 'punct', value: ch, start: i, line: lineOf(i) })
      lastMeaningful = ch
      lastWord = ''
      i += 1
      continue
    }

    // ── identifiers / keywords / numbers ──────────────────────────────────
    if (isIdentChar(ch)) {
      const start = i
      while (i < n && isIdentChar(source[i])) i += 1
      const word = source.slice(start, i)
      tokens.push({ kind: 'word', value: word, start, line: lineOf(start) })
      lastMeaningful = 'w'
      lastWord = word
      continue
    }

    lastMeaningful = ch
    lastWord = ''
    i += 1
  }

  return { comments, tokens }
}

// ═══════════════════════════════════════════════════════════════════════════
// Inline directive parsing
// ═══════════════════════════════════════════════════════════════════════════

// Longest first: `eslint-disable-next-line` must not be read as `eslint-disable`
// followed by the word `-next-line`.
const DIRECTIVE_KEYWORDS = ['eslint-disable-next-line', 'eslint-disable-line', 'eslint-disable']

/**
 * Parse one comment as a possible ESLint disable directive.
 *
 * Returns null when the comment is prose. A directive is only a directive when
 * the keyword is the FIRST token of the comment — which is what separates
 * `// eslint-disable-next-line react-hooks/exhaustive-deps` (a suppression)
 * from `// the eslint-disable-next-line below is deliberate` (prose about one).
 * This estate is full of the latter.
 */
export function parseDirective(commentText) {
  const trimmed = commentText.trim()
  let keyword = null
  for (const kw of DIRECTIVE_KEYWORDS) {
    if (trimmed.startsWith(kw)) {
      const after = trimmed.slice(kw.length)
      // Must be followed by whitespace or end-of-comment; otherwise this is a
      // longer word that merely starts the same way.
      if (after === '' || isSpace(after[0])) {
        keyword = kw
        break
      }
    }
  }
  if (keyword === null) return null

  let rest = trimmed.slice(keyword.length).trim()
  // ESLint's description separator: everything after ` -- ` is a human note.
  const dashAt = rest.indexOf('--')
  if (dashAt !== -1) rest = rest.slice(0, dashAt)
  rest = rest.trim()

  if (rest === '') return { keyword, rules: [], blanket: true }

  const rules = rest
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r !== '')
  return { keyword, rules, blanket: false }
}

/** Count tracked-rule and blanket suppressions in one source file. */
export function scanSource(source) {
  const { comments } = tokenise(source)
  const perRule = Object.fromEntries(TRACKED_RULES.map((r) => [r, 0]))
  let blanket = 0
  const sites = []
  for (const c of comments) {
    const directive = parseDirective(c.text)
    if (directive === null) continue
    if (directive.blanket) {
      blanket += 1
      sites.push({ line: c.line, rule: '(blanket — all rules)' })
      continue
    }
    for (const rule of directive.rules) {
      if (Object.hasOwn(perRule, rule)) {
        perRule[rule] += 1
        sites.push({ line: c.line, rule })
      }
    }
  }
  return { perRule, blanket, sites }
}

// ═══════════════════════════════════════════════════════════════════════════
// Flat-config analysis
// ═══════════════════════════════════════════════════════════════════════════

/** Match `{`/`[`/`(` to their closers over the token stream. */
function matchBrackets(tokens) {
  const open = { '{': '}', '[': ']', '(': ')' }
  const close = { '}': '{', ']': '[', ')': '(' }
  const partner = new Map()
  const stack = []
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const t = tokens[idx]
    if (t.kind !== 'punct') continue
    if (Object.hasOwn(open, t.value)) {
      stack.push(idx)
      continue
    }
    if (Object.hasOwn(close, t.value)) {
      // Tolerate an unbalanced closer rather than throwing: an unparseable
      // config is reported as a refusal by the caller, not as a crash.
      const openIdx = stack.pop()
      if (openIdx === undefined) continue
      partner.set(openIdx, idx)
      partner.set(idx, openIdx)
    }
  }
  return partner
}

/** Count string elements in the array literal whose `[` is at `openIdx`. */
function countArrayStrings(tokens, partner, openIdx) {
  const closeIdx = partner.get(openIdx)
  if (closeIdx === undefined) return null
  let count = 0
  for (let idx = openIdx + 1; idx < closeIdx; idx += 1) {
    if (tokens[idx].kind === 'string') count += 1
  }
  return count
}

/** Module-level `const IDENT = [ ... ]` → number of string elements. */
function collectArrayConstants(tokens, partner) {
  const out = new Map()
  for (let idx = 0; idx + 3 < tokens.length; idx += 1) {
    const t = tokens[idx]
    if (t.kind !== 'word') continue
    if (t.value !== 'const' && t.value !== 'let' && t.value !== 'var') continue
    const name = tokens[idx + 1]
    const eq = tokens[idx + 2]
    const open = tokens[idx + 3]
    if (name?.kind !== 'word') continue
    if (eq?.kind !== 'punct' || eq.value !== '=') continue
    if (open?.kind !== 'punct' || open.value !== '[') continue
    const count = countArrayStrings(tokens, partner, idx + 3)
    if (count !== null) out.set(name.value, count)
  }
  return out
}

/**
 * Find every `'<tracked rule>': 'off'` in an ESLint flat config and work out
 * how many files each one covers.
 *
 * Returns { scoped: {rule: fileCount}, global: [{rule, line}], unresolved: [...] }.
 *
 * `unresolved` is never silently dropped — the caller turns it into a refusal.
 * A `files:` list this scanner cannot resolve is exactly the case where
 * "I could not read it" and "there is nothing there" would otherwise render
 * identically, which is the failure mode this whole programme exists to retire.
 */
export function scanConfig(source) {
  const { tokens } = tokenise(source)
  const partner = matchBrackets(tokens)
  const constants = collectArrayConstants(tokens, partner)

  const scoped = Object.fromEntries(TRACKED_RULES.map((r) => [r, 0]))
  const global = []
  const unresolved = []

  // Depth map: for each token index, the stack of enclosing `{` indices.
  const enclosing = new Array(tokens.length)
  const stack = []
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const t = tokens[idx]
    if (t.kind === 'punct' && t.value === '{') {
      enclosing[idx] = stack.slice()
      stack.push(idx)
      continue
    }
    if (t.kind === 'punct' && t.value === '}') {
      stack.pop()
      enclosing[idx] = stack.slice()
      continue
    }
    enclosing[idx] = stack.slice()
  }

  for (let idx = 0; idx < tokens.length; idx += 1) {
    const t = tokens[idx]
    if (t.kind !== 'string') continue
    if (!TRACKED_RULES.includes(t.value)) continue
    const colon = tokens[idx + 1]
    if (colon?.kind !== 'punct' || colon.value !== ':') continue
    const value = tokens[idx + 2]
    const isOff =
      (value?.kind === 'string' && value.value === 'off') ||
      (value?.kind === 'word' && value.value === '0')
    if (!isOff) continue // 'error' / 'warn' — enforcement, not suppression

    const chain = enclosing[idx] ?? []
    // chain top is the `rules: { … }` object; its parent is the config object.
    const configObjIdx = chain[chain.length - 2]
    if (configObjIdx === undefined) {
      // `rules` at the top level of the module with no enclosing config object
      // — treat as global rather than guessing.
      global.push({ rule: t.value, line: t.line })
      continue
    }

    const filesInfo = findFilesKey(tokens, partner, enclosing, configObjIdx, constants)
    if (filesInfo.kind === 'none') {
      global.push({ rule: t.value, line: t.line })
    } else if (filesInfo.kind === 'count') {
      scoped[t.value] += filesInfo.count
    } else {
      unresolved.push({ rule: t.value, line: t.line, detail: filesInfo.detail })
    }
  }

  return { scoped, global, unresolved }
}

/** Locate a DIRECT `files:` property of the object opening at `objIdx`. */
function findFilesKey(tokens, partner, enclosing, objIdx, constants) {
  const closeIdx = partner.get(objIdx)
  if (closeIdx === undefined) return { kind: 'unresolved', detail: 'unbalanced config object' }
  for (let idx = objIdx + 1; idx < closeIdx; idx += 1) {
    const t = tokens[idx]
    const isFilesKey =
      (t.kind === 'word' && t.value === 'files') || (t.kind === 'string' && t.value === 'files')
    if (!isFilesKey) continue
    // Must be a DIRECT property: its enclosing-brace stack must end at objIdx.
    const chain = enclosing[idx] ?? []
    if (chain[chain.length - 1] !== objIdx) continue
    const colon = tokens[idx + 1]
    if (colon?.kind !== 'punct' || colon.value !== ':') continue
    const value = tokens[idx + 2]
    if (value?.kind === 'punct' && value.value === '[') {
      const count = countArrayStrings(tokens, partner, idx + 2)
      if (count === null) return { kind: 'unresolved', detail: 'unbalanced files array' }
      return { kind: 'count', count }
    }
    if (value?.kind === 'word') {
      const count = constants.get(value.value)
      if (count === undefined) {
        return {
          kind: 'unresolved',
          detail: `files: ${value.value} — identifier is not a module-level array literal in this file`,
        }
      }
      return { kind: 'count', count }
    }
    if (value?.kind === 'string') return { kind: 'count', count: 1 }
    return { kind: 'unresolved', detail: 'files: value is not an array, identifier or string' }
  }
  return { kind: 'none' }
}

// ═══════════════════════════════════════════════════════════════════════════
// Scope scanning
// ═══════════════════════════════════════════════════════════════════════════

function gitLsFiles(dir) {
  const out = execFileSync('git', ['ls-files', '-z'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  })
  return out.split('\0').filter((p) => p !== '')
}

function isSourcePath(p) {
  for (const seg of EXCLUDED_SEGMENTS) {
    if (p.startsWith(seg) || p.includes(`/${seg}`)) return false
  }
  for (const ext of SOURCE_EXTENSIONS) {
    if (p.endsWith(ext)) return true
  }
  return false
}

function scanScope(scope) {
  const dir = scope === '.' ? REPO_ROOT : join(REPO_ROOT, scope)

  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return { scope, ok: false, reason: `directory ${dir} does not exist` }
  }

  let tracked
  try {
    tracked = gitLsFiles(dir)
  } catch (err) {
    return { scope, ok: false, reason: `git ls-files failed: ${String(err.message).slice(0, 200)}` }
  }

  if (tracked.length === 0) {
    return {
      scope,
      ok: false,
      reason:
        'git ls-files returned NOTHING. An uninitialised submodule is an empty directory ' +
        'that scans flawlessly — run `git submodule update --init` before trusting any zero here.',
    }
  }

  const sourceFiles = tracked.filter(isSourcePath)
  if (sourceFiles.length === 0) {
    return { scope, ok: false, reason: `0 source files among ${tracked.length} tracked file(s)` }
  }

  const perRule = Object.fromEntries(TRACKED_RULES.map((r) => [r, 0]))
  let blanket = 0
  const sites = []
  for (const rel of sourceFiles) {
    let source
    try {
      source = readFileSync(join(dir, rel), 'utf8')
    } catch {
      continue // tracked but absent from the worktree (sparse checkout)
    }
    const found = scanSource(source)
    for (const rule of TRACKED_RULES) perRule[rule] += found.perRule[rule]
    blanket += found.blanket
    for (const s of found.sites) sites.push({ file: rel, ...s })
  }

  // ── config-declared suppressions ────────────────────────────────────────
  const configScoped = Object.fromEntries(TRACKED_RULES.map((r) => [r, 0]))
  const configGlobal = []
  const configUnresolved = []
  const configFiles = []
  let configuresReactHooks = false

  for (const base of CONFIG_BASENAMES) {
    const path = join(dir, base)
    if (!existsSync(path)) continue
    configFiles.push(base)
    const source = readFileSync(path, 'utf8')
    if (source.includes('react-hooks')) configuresReactHooks = true
    const found = scanConfig(source)
    for (const rule of TRACKED_RULES) configScoped[rule] += found.scoped[rule]
    for (const g of found.global) configGlobal.push({ ...g, file: base })
    for (const u of found.unresolved) configUnresolved.push({ ...u, file: base })
  }

  return {
    scope,
    ok: true,
    trackedFiles: tracked.length,
    sourceFiles: sourceFiles.length,
    configFiles,
    configuresReactHooks,
    inline: perRule,
    blanket,
    configScoped,
    configGlobal: configGlobal.map((g) => g.rule).sort(),
    configGlobalDetail: configGlobal,
    configUnresolved,
    sites,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Self-test — the positive control. Proves the scanner can still FIND things,
// and, just as importantly, that it does NOT find things it should not.
// ═══════════════════════════════════════════════════════════════════════════

function selfTest() {
  const cases = []
  const add = (name, actual, expected) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected)
    cases.push({ name, pass, actual, expected })
  }

  const inline = (src) => {
    const r = scanSource(src)
    return [r.perRule['react-hooks/exhaustive-deps'], r.perRule['react-hooks/set-state-in-effect'], r.blanket]
  }

  // --- POSITIVE: each real suppression form is counted -------------------
  add('line-comment next-line directive',
    inline('// eslint-disable-next-line react-hooks/exhaustive-deps\nuseEffect(fn, [])\n'), [1, 0, 0])
  add('block-comment disable directive',
    inline('/* eslint-disable react-hooks/set-state-in-effect */\nconst a = 1\n'), [0, 1, 0])
  add('disable-line directive',
    inline('useEffect(fn, []) /* eslint-disable-line react-hooks/exhaustive-deps */\n'), [1, 0, 0])
  add('two rules in one directive',
    inline('// eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect\n'), [1, 1, 0])
  add('directive with -- description suffix',
    inline('// eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount\n'), [1, 0, 0])
  add('bare blanket directive counts as blanket',
    inline('/* eslint-disable */\nconst a = 1\n'), [0, 0, 1])
  add('mixed with an untracked rule',
    inline('// eslint-disable-next-line no-console, react-hooks/exhaustive-deps\n'), [1, 0, 0])

  // --- NEGATIVE: the false positives a line-grep would produce -----------
  add('prose ABOUT a directive is not a directive',
    inline('// the eslint-disable-next-line react-hooks/exhaustive-deps below is deliberate\n'), [0, 0, 0])
  add('rule named in prose without the keyword',
    inline('// react-hooks/exhaustive-deps rule is configured in this repo\n'), [0, 0, 0])
  add('directive text inside a string literal',
    inline('const s = "// eslint-disable-next-line react-hooks/exhaustive-deps"\n'), [0, 0, 0])
  add('directive text inside a template literal',
    inline('const s = `// eslint-disable-next-line react-hooks/exhaustive-deps`\n'), [0, 0, 0])
  add('eslint-enable is not a suppression',
    inline('/* eslint-enable react-hooks/set-state-in-effect */\n'), [0, 0, 0])
  add('untracked react-hooks rule is not counted',
    inline('// eslint-disable-next-line react-hooks/purity\n'), [0, 0, 0])
  add('keyword as a prefix of a longer word',
    inline('// eslint-disableXnext-line react-hooks/exhaustive-deps\n'), [0, 0, 0])

  // --- LEXER: the cases that break a naive scanner -----------------------
  add('regex literal containing a comment opener',
    inline('const r = /[/*]/\n// eslint-disable-next-line react-hooks/exhaustive-deps\n'), [1, 0, 0])
  add('division is not a regex',
    inline('const q = a / b\n// eslint-disable-next-line react-hooks/exhaustive-deps\n'), [1, 0, 0])
  add('template interpolation with braces does not lose the directive',
    inline('const s = `x${ {a:1} }y`\n// eslint-disable-next-line react-hooks/set-state-in-effect\n'), [0, 1, 0])

  // --- CONFIG: scoped, global, and unresolvable --------------------------
  const cfg = (src) => {
    const r = scanConfig(src)
    return [
      r.scoped['react-hooks/exhaustive-deps'],
      r.scoped['react-hooks/set-state-in-effect'],
      r.global.length,
      r.unresolved.length,
    ]
  }
  add('config: files array literal counts its entries',
    cfg("export default [{ files: ['a.tsx','b.tsx','c.tsx'], rules: { 'react-hooks/exhaustive-deps': 'off' } }]"),
    [3, 0, 0, 0])
  add('config: files identifier resolves to its const array',
    cfg("const F = ['a.tsx','b.tsx']\nexport default [{ files: F, rules: { 'react-hooks/set-state-in-effect': 'off' } }]"),
    [0, 2, 0, 0])
  add('config: no files key is a GLOBAL off',
    cfg("export default [{ rules: { 'react-hooks/set-state-in-effect': 'off' } }]"), [0, 0, 1, 0])
  add("config: 'error' is enforcement, not suppression",
    cfg("export default [{ rules: { 'react-hooks/exhaustive-deps': 'error' } }]"), [0, 0, 0, 0])
  add('config: unresolvable files identifier REFUSES rather than counting 0',
    cfg("import F from './x.js'\nexport default [{ files: F, rules: { 'react-hooks/exhaustive-deps': 'off' } }]"),
    [0, 0, 0, 1])
  add('config: rule named only in a header comment is not a setting',
    cfg("// 'react-hooks/exhaustive-deps': 'off' was considered and rejected\nexport default []"),
    [0, 0, 0, 0])
  add('config: a nested files key does not capture an outer rule',
    cfg("export default [{ rules: { 'react-hooks/exhaustive-deps': 'off' }, languageOptions: { parserOptions: { files: ['x.tsx'] } } }]"),
    [0, 0, 1, 0])

  const failed = cases.filter((c) => !c.pass)
  const negatives = cases.filter((c) => c.name.includes('not') || c.name.includes('prose') || c.name.includes('REFUSES'))

  console.log(
    `check-hook-suppression-ratchet --self-test: ${cases.length} cases exercised ` +
      `(${negatives.length} of them asserting the scanner does NOT fire, including the ` +
      `three false positives a line-grep produces on this estate's own source).`,
  )
  for (const c of failed) {
    console.error(
      `  FAIL  ${c.name}\n        expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}`,
    )
  }
  if (failed.length > 0) {
    console.error(`\nself-test: ${failed.length} of ${cases.length} cases FAILED.`)
    process.exit(1)
  }
  console.log('self-test: PASS')
  process.exit(0)
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

const argv = process.argv.slice(2)
if (argv.includes('--self-test')) selfTest()

const update = argv.includes('--update')
const listIdx = argv.indexOf('--list')
const listScope = listIdx === -1 ? null : argv[listIdx + 1]

const results = SCOPES.map(scanScope)
const okResults = results.filter((r) => r.ok)

// ── HEAD LINE: a derived, non-zero count of what was examined. ────────────
// LANE-WATCHER classifies from the head of the output; a summary printed only
// at the end is truncated away before it is read.
const totalSource = okResults.reduce((sum, r) => sum + r.sourceFiles, 0)
const totalConfigs = okResults.reduce((sum, r) => sum + r.configFiles.length, 0)
console.log(
  `check-hook-suppression-ratchet: ${totalSource.toLocaleString('en-US')} source file(s) and ` +
    `${totalConfigs} eslint config file(s) scanned across ${okResults.length} of ${SCOPES.length} ` +
    `scope(s) for ${TRACKED_RULES.length} tracked rule(s).`,
)

if (listScope !== null) {
  const r = results.find((x) => x.scope === listScope)
  if (!r || !r.ok) {
    console.error(`--list: scope '${listScope}' not scannable.`)
    process.exit(1)
  }
  console.log(`\n${r.sites.length} suppression site(s) in ${listScope}:`)
  for (const s of r.sites) console.log(`  ${s.file}:${s.line}  ${s.rule}`)
  process.exit(0)
}

let baseline
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
} catch (err) {
  if (!update) {
    console.error(
      `::error::baseline ${BASELINE_PATH} missing or unparseable (${err.message}). ` +
        'Create it with --update.',
    )
    process.exit(2)
  }
  baseline = { scopes: {} }
}

let failures = 0
const failMsgs = []
function fail(msg) {
  failures += 1
  failMsgs.push(msg)
  console.error(`::error::${msg}`)
}

// ── Refusals first: an unreadable scope is never a pass. ──────────────────
for (const r of results) {
  if (!r.ok) fail(`${r.scope}: REFUSING to report a count — ${r.reason}`)
}

const rows = []
for (const r of okResults) {
  const banked = baseline.scopes?.[r.scope] ?? {
    inline: Object.fromEntries(TRACKED_RULES.map((x) => [x, 0])),
    blanket: 0,
    configScoped: Object.fromEntries(TRACKED_RULES.map((x) => [x, 0])),
    configGlobal: [],
  }

  for (const u of r.configUnresolved) {
    fail(
      `${r.scope}/${u.file}:${u.line}: cannot resolve the \`files:\` list guarding ` +
        `'${u.rule}': 'off' (${u.detail}). REFUSING rather than recording 0 — ` +
        `"I could not read it" must not render the same as "there is nothing there". ` +
        `Inline the array, or extend collectArrayConstants() in this guard.`,
    )
  }

  const compare = (label, now, was) => {
    if (now > was) {
      fail(
        `${r.scope}: ${label} ROSE ${was} -> ${now}. A hook-lint suppression was added. ` +
          `Remove it, or — if it is genuinely correct — bank it with ` +
          `\`node scripts/check-hook-suppression-ratchet.mjs --update\` in the SAME commit, ` +
          `and say in the PR body which effect it covers and why the dependency is safe to omit.`,
      )
    } else if (now < was) {
      fail(
        `${r.scope}: ${label} FELL ${was} -> ${now} but the baseline was not re-banked. ` +
          `Run \`node scripts/check-hook-suppression-ratchet.mjs --update\` and commit the ` +
          `baseline: an unbanked gain can be silently given back by the same one-line diff ` +
          `that earned it.`,
      )
    }
  }

  for (const rule of TRACKED_RULES) {
    compare(`inline ${rule}`, r.inline[rule], banked.inline?.[rule] ?? 0)
    compare(`config-scoped ${rule}`, r.configScoped[rule], banked.configScoped?.[rule] ?? 0)
  }
  compare('blanket eslint-disable', r.blanket, banked.blanket ?? 0)

  // Global `off` is enumerated, never counted: it is an unbounded licence, so
  // a new one is a failure no matter what the totals did.
  const bankedGlobal = new Set(banked.configGlobal ?? [])
  for (const rule of r.configGlobal) {
    if (!bankedGlobal.has(rule)) {
      fail(
        `${r.scope}: NEW repository-wide \`'${rule}': 'off'\` with no \`files:\` restriction. ` +
          `This is not N suppressions, it is an unbounded licence — it absorbs any amount of ` +
          `future debt without moving any number on this report. Scope it to a \`files:\` list.`,
      )
    }
  }
  for (const rule of bankedGlobal) {
    if (!r.configGlobal.includes(rule)) {
      fail(
        `${r.scope}: the banked repository-wide \`'${rule}': 'off'\` is GONE — good, but ` +
          `re-bank it with --update so the win cannot be silently handed back.`,
      )
    }
  }

  const inlineTotal = TRACKED_RULES.reduce((s, x) => s + r.inline[x], 0)
  const configTotal = TRACKED_RULES.reduce((s, x) => s + r.configScoped[x], 0)
  rows.push({
    scope: r.scope,
    sourceFiles: r.sourceFiles,
    inlineTotal,
    configTotal,
    blanket: r.blanket,
    global: r.configGlobal,
    unenforced: !r.configuresReactHooks,
  })
}

// ── Report ────────────────────────────────────────────────────────────────
console.log('')
console.log(
  `${'scope'.padEnd(24)}${'src'.padStart(6)}${'inline'.padStart(8)}${'cfg-files'.padStart(11)}${'blanket'.padStart(9)}  global-off`,
)
for (const row of rows) {
  console.log(
    `${row.scope.padEnd(24)}${String(row.sourceFiles).padStart(6)}` +
      `${String(row.inlineTotal).padStart(8)}${String(row.configTotal).padStart(11)}` +
      `${String(row.blanket).padStart(9)}  ${row.global.length === 0 ? '-' : row.global.join(', ')}` +
      `${row.unenforced ? '   [UNENFORCED: no react-hooks rules configured]' : ''}`,
  )
}

const grandInline = rows.reduce((s, r) => s + r.inlineTotal, 0)
const grandConfig = rows.reduce((s, r) => s + r.configTotal, 0)
const grandGlobal = rows.reduce((s, r) => s + r.global.length, 0)
console.log(
  `\nTotals: ${grandInline} inline suppression(s), ${grandConfig} config-scoped file-level ` +
    `suppression(s), ${grandGlobal} repository-wide \`off\` declaration(s).`,
)
for (const row of rows) {
  if (row.unenforced) {
    console.log(
      `NOTE  ${row.scope} configures no react-hooks rules at all, so its 0 is an UNENFORCED ` +
        `zero, not a clean one. Nothing is switched on there to suppress.`,
    )
  }
}

if (update) {
  if (failures > 0 && failMsgs.some((m) => m.includes('REFUSING') || m.includes('cannot resolve'))) {
    console.error('\n--update REFUSED: a scope could not be read. Fix the refusal first.')
    process.exit(1)
  }
  const next = { ...(baseline.scopes ?? {}) }
  for (const r of okResults) {
    next[r.scope] = {
      _note: baseline.scopes?.[r.scope]?._note ?? 'TODO: describe what this scope\'s suppressions are.',
      inline: r.inline,
      configScoped: r.configScoped,
      configGlobal: r.configGlobal,
      blanket: r.blanket,
    }
  }
  const out = {
    _doc:
      'Banked counts of react-hooks/exhaustive-deps and react-hooks/set-state-in-effect ' +
      'SUPPRESSIONS. Written by scripts/check-hook-suppression-ratchet.mjs --update. ' +
      'The ratchet fails on any rise AND on any unbanked fall — see that script\'s header ' +
      'for why an error-count lint baseline is structurally unable to record this class.',
    rules: TRACKED_RULES,
    scopes: next,
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`\nBaseline re-banked for ${Object.keys(next).length} scope(s) at ${BASELINE_PATH}.`)
  process.exit(0)
}

if (failures > 0) {
  console.error(`\ncheck-hook-suppression-ratchet: FAIL — ${failures} problem(s) above.`)
  process.exit(1)
}

console.log('\ncheck-hook-suppression-ratchet: PASS — every scope matches its banked baseline.')
process.exit(0)
