#!/usr/bin/env node
/**
 * scripts/parse-closing-keywords.mjs
 *
 * Extract GitHub closing directives ("Closes #12") from a pull-request body,
 * deliberately, so scripts/close-merged-development-issues.mjs can act on them.
 *
 * WHY THIS EXISTS (bsuite register V-10)
 * ---------------------------------------------------------------------------
 * GitHub auto-closes a referenced issue only when the pull request merges into
 * the repository's DEFAULT branch. Every repository in this estate defaults to
 * `main`, and every pull request targets `development`. So every `Closes #N`
 * ever written here has done nothing, while its author believed otherwise.
 * Fifteen fixed-and-open issues were closed by hand on 2026-08-17; nothing
 * about the mechanism changed, so the backlog would have rebuilt at exactly
 * the same rate.
 *
 * WHY A PARSER AND NOT A REGEX OVER THE BODY
 * ---------------------------------------------------------------------------
 * A closing directive is an INSTRUCTION. The same eight characters appearing
 * inside a quoted review comment, a checklist item, a pasted log, a code
 * fence, or an HTML comment in a PR template is a MENTION, and acting on a
 * mention closes somebody else's open work. `grep -o 'closes #[0-9]*'` cannot
 * tell those apart, and this estate has already shipped one colour rule whose
 * regex silently accepted `#ffffff00` as safe (see
 * scripts/check-guard-self-reporting.mjs). Regex is banned in guards here for
 * that reason; this file contains no `RegExp` at all. It is a two-stage
 * hand-written scanner:
 *
 *   Stage 1  BLOCK CLASSIFICATION (line walk, stateful)
 *            Each line is marked live or non-directive, with the reason:
 *            fenced-code, indented-code, blockquote (including CommonMark lazy
 *            continuation), html-comment, checklist-item.
 *
 *   Stage 2  DIRECTIVE EXTRACTION (token walk, per live line)
 *            Inline code spans are blanked first. A directive is a bare
 *            keyword token IMMEDIATELY followed by an issue reference — the
 *            same rule GitHub itself applies, so "Closes the loop on #12" is
 *            not a directive here either — with a negation guard so "this does
 *            not close #12" is left alone.
 *
 * ASYMMETRIC ERROR COST
 * ---------------------------------------------------------------------------
 * A missed directive leaves an issue open, which a human notices and fixes in
 * seconds. A wrongly-honoured mention closes live work silently. Every
 * ambiguity below is therefore resolved toward NOT closing. The known
 * conservative cases are listed at the bottom of this file.
 *
 * CROSS-REPOSITORY REFERENCES ARE PARSED BUT NEVER CLOSED HERE. They are
 * returned separately so the caller can report them for manual action: closing
 * them needs a token with write access to a repository the merge did not
 * happen in, and quietly reaching across that boundary is not something a
 * merge event should authorise.
 *
 * Usage:
 *   node scripts/parse-closing-keywords.mjs --self-test        # the guard
 *   node scripts/parse-closing-keywords.mjs --body-file=X.md \
 *        --repo=owner/name                                     # parse one body
 *
 * Exit codes: 0 ok · 1 self-test failure · 2 harness error.
 */

import fs from 'node:fs'

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** The nine keywords GitHub documents. Lower-cased; matching is case-insensitive. */
export const CLOSING_KEYWORDS = new Set([
  'close', 'closes', 'closed',
  'fix', 'fixes', 'fixed',
  'resolve', 'resolves', 'resolved',
])

/**
 * A keyword preceded by one of these is a statement that the issue is NOT
 * closed. GitHub honours "this does not close #12" and closes the issue; we
 * deliberately do not, because in this estate a PR body is also the place
 * people explain what they left undone.
 */
const NEGATORS = new Set([
  'not', 'no', 'never', 'none', 'nor', 'neither', 'without', 'cannot',
  "doesn't", "does'nt", "don't", "won't", "wont", "didn't", "isn't",
  "aren't", "shouldn't", "can't", 'dont', 'cant',
])

/** Tokens permitted between two references in a run: "Fixes #3, #4 and #5". */
const REFERENCE_SEPARATORS = new Set([',', 'and', '&', '+', ';'])

const SKIP_FENCED = 'fenced-code'
const SKIP_INDENTED = 'indented-code'
const SKIP_QUOTE = 'blockquote'
const SKIP_COMMENT = 'html-comment'
const SKIP_CHECKLIST = 'checklist-item'
const LIVE = 'live'

// ---------------------------------------------------------------------------
// Character helpers — hand-written, no character classes from a regex engine.
// ---------------------------------------------------------------------------

const isDigit = (c) => c >= '0' && c <= '9'
const isSpace = (c) => c === ' ' || c === '\t'
const isAlpha = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')

/** Owner/repo name characters GitHub permits. */
const isNameChar = (c) => isAlpha(c) || isDigit(c) || c === '-' || c === '_' || c === '.'

/** Split on any of \r\n, \n, \r without a regex, preserving line order. */
export function splitLines(text) {
  const out = []
  let start = 0
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '\n') {
      out.push(text.slice(start, i))
      i += 1
      start = i
    } else if (c === '\r') {
      out.push(text.slice(start, i))
      i += text[i + 1] === '\n' ? 2 : 1
      start = i
    } else {
      i += 1
    }
  }
  out.push(text.slice(start))
  return out
}

/** Leading-space count, tabs counted as 4 (CommonMark's indented-code rule). */
function leadingIndent(line) {
  let n = 0
  for (const ch of line) {
    if (ch === ' ') n += 1
    else if (ch === '\t') n += 4
    else break
  }
  return n
}

/**
 * If `line` opens or closes a code fence, describe it. CommonMark: a fence is
 * three or more backticks or tildes, indented at most three spaces; the
 * closing fence uses the same character and is at least as long.
 */
function fenceAt(line) {
  const indent = leadingIndent(line)
  if (indent > 3) return null
  let i = 0
  while (i < line.length && isSpace(line[i])) i += 1
  const ch = line[i]
  if (ch !== '`' && ch !== '~') return null
  let len = 0
  while (i + len < line.length && line[i + len] === ch) len += 1
  if (len < 3) return null
  // An info string may not contain a backtick on a backtick fence.
  const info = line.slice(i + len)
  if (ch === '`' && info.includes('`')) return null
  return { char: ch, len, info: info.trim() }
}

/**
 * Is this line a task-list item — `- [ ] ...`, `* [x] ...`, `1. [ ] ...`?
 * A checklist entry is a plan, not an instruction: "- [ ] Closes #77" means
 * somebody INTENDS to close 77, and half the time the box is still unticked.
 */
function isChecklistItem(line) {
  let i = 0
  while (i < line.length && isSpace(line[i])) i += 1
  // Bullet marker, or an ordered marker like "1." / "2)".
  if (line[i] === '-' || line[i] === '*' || line[i] === '+') {
    i += 1
  } else if (isDigit(line[i])) {
    while (i < line.length && isDigit(line[i])) i += 1
    if (line[i] !== '.' && line[i] !== ')') return false
    i += 1
  } else {
    return false
  }
  if (!isSpace(line[i])) return false
  while (i < line.length && isSpace(line[i])) i += 1
  if (line[i] !== '[') return false
  const mark = line[i + 1]
  if (mark !== ' ' && mark !== 'x' && mark !== 'X') return false
  return line[i + 2] === ']'
}

/** Blockquote marker: up to three spaces then `>`. */
function isBlockquote(line) {
  if (leadingIndent(line) > 3) return false
  let i = 0
  while (i < line.length && isSpace(line[i])) i += 1
  return line[i] === '>'
}

function isBlank(line) {
  for (const ch of line) if (!isSpace(ch)) return false
  return true
}

/**
 * Replace inline code-span contents with spaces, preserving length so column
 * offsets stay meaningful. Backtick runs must match in length, per CommonMark,
 * so ``a `b` c`` behaves the way GitHub renders it.
 */
function blankInlineCode(line) {
  const out = [...line]
  let i = 0
  while (i < out.length) {
    if (out[i] !== '`') { i += 1; continue }
    let openLen = 0
    while (i + openLen < out.length && out[i + openLen] === '`') openLen += 1
    // Find a closing run of exactly openLen.
    let j = i + openLen
    let closeAt = -1
    while (j < out.length) {
      if (out[j] === '`') {
        let runLen = 0
        while (j + runLen < out.length && out[j + runLen] === '`') runLen += 1
        if (runLen === openLen) { closeAt = j; break }
        j += runLen
      } else {
        j += 1
      }
    }
    if (closeAt === -1) { i += openLen; continue } // unmatched run: literal text
    for (let k = i; k < closeAt + openLen; k += 1) out[k] = ' '
    i = closeAt + openLen
  }
  return out.join('')
}

// ---------------------------------------------------------------------------
// Stage 1 — block classification
// ---------------------------------------------------------------------------

/**
 * Classify every line of a PR body as `live` or as a named non-directive
 * block. Returns `{ number, text, status }` per line, 1-indexed.
 *
 * HTML comments are tracked across lines because PR TEMPLATES ARE FULL OF
 * THEM. The template this change ships alongside explains the closing-keyword
 * rule inside `<!-- ... -->`; if that prose were parsed, every PR opened from
 * the template would try to close whatever example issue number it named.
 */
export function classifyLines(body) {
  const lines = splitLines(body ?? '')
  const result = []
  let fence = null
  let inComment = false
  let quoteLazy = false

  for (let n = 0; n < lines.length; n += 1) {
    const raw = lines[n]
    const push = (status, text = raw) => result.push({ number: n + 1, text, status })

    // --- fenced code (checked first: a fence is opaque to everything else) ---
    if (fence) {
      const f = fenceAt(raw)
      if (f && f.char === fence.char && f.len >= fence.len && f.info === '') fence = null
      push(SKIP_FENCED)
      continue
    }
    const opening = fenceAt(raw)
    if (opening && !inComment) {
      fence = opening
      push(SKIP_FENCED)
      continue
    }

    // --- HTML comments (may open and close mid-line) ---
    let text = raw
    if (inComment) {
      const end = text.indexOf('-->')
      if (end === -1) { push(SKIP_COMMENT); continue }
      text = ' '.repeat(end + 3) + text.slice(end + 3)
      inComment = false
    }
    for (;;) {
      const open = text.indexOf('<!--')
      if (open === -1) break
      const end = text.indexOf('-->', open + 4)
      if (end === -1) {
        // Comment runs past end of line: keep the prefix, swallow the rest.
        const kept = text.slice(0, open)
        inComment = true
        text = kept
        break
      }
      text = text.slice(0, open) + ' '.repeat(end + 3 - open) + text.slice(end + 3)
    }
    if (isBlank(text) && !isBlank(raw)) { push(SKIP_COMMENT); continue }

    // --- blockquote, including CommonMark lazy continuation ---
    if (isBlockquote(text)) { quoteLazy = true; push(SKIP_QUOTE, text); continue }
    if (isBlank(text)) { quoteLazy = false; push(LIVE, text); continue }
    if (quoteLazy) { push(SKIP_QUOTE, text); continue }

    // --- indented code ---
    if (leadingIndent(text) >= 4) { push(SKIP_INDENTED, text); continue }

    // --- task list ---
    if (isChecklistItem(text)) { push(SKIP_CHECKLIST, text); continue }

    push(LIVE, text)
  }
  return result
}

// ---------------------------------------------------------------------------
// Stage 2 — reference and directive extraction
// ---------------------------------------------------------------------------

/** Whitespace-delimited tokens with their column offsets. */
function tokenize(line) {
  const out = []
  let i = 0
  while (i < line.length) {
    while (i < line.length && isSpace(line[i])) i += 1
    if (i >= line.length) break
    const start = i
    while (i < line.length && !isSpace(line[i])) i += 1
    out.push({ text: line.slice(start, i), index: start })
  }
  return out
}

/** Strip punctuation a sentence attaches around a token: "(#12)," -> "#12". */
function trimPunctuation(token) {
  let s = token
  while (s.length > 0 && '([{"\'<'.includes(s[0])) s = s.slice(1)
  while (s.length > 0 && ')]}"\'>.,;:!?'.includes(s[s.length - 1])) s = s.slice(0, -1)
  return s
}

/** Parse a run of digits at `i`; returns the number or null (no leading zero). */
function readNumber(s, i) {
  if (!isDigit(s[i]) || s[i] === '0') return null
  let j = i
  while (j < s.length && isDigit(s[j])) j += 1
  if (j !== s.length) return null // trailing junk: not a clean reference
  return Number.parseInt(s.slice(i, j), 10)
}

function readName(s, i) {
  let j = i
  while (j < s.length && isNameChar(s[j])) j += 1
  return j === i ? null : { value: s.slice(i, j), next: j }
}

/**
 * Parse one token as an issue reference. Returns
 * `{ owner, repo, number, form }` with owner/repo null when same-repo, or null
 * when the token is not a reference at all.
 *
 * Forms: `#12` · `GH-12` · `owner/repo#12` ·
 *        `https://github.com/owner/repo/issues/12`
 *
 * A `/pull/` URL is deliberately NOT a reference — a PR is not an issue this
 * mechanism should close.
 */
export function parseReference(rawToken) {
  const s = trimPunctuation(rawToken)
  if (s.length === 0) return null

  // #12
  if (s[0] === '#') {
    const n = readNumber(s, 1)
    return n === null ? null : { owner: null, repo: null, number: n, form: 'hash' }
  }

  // GH-12
  if ((s[0] === 'G' || s[0] === 'g') && (s[1] === 'H' || s[1] === 'h') && s[2] === '-') {
    const n = readNumber(s, 3)
    return n === null ? null : { owner: null, repo: null, number: n, form: 'gh-dash' }
  }

  // https://github.com/owner/repo/issues/12
  const lower = s.toLowerCase()
  const marker = 'github.com/'
  const at = lower.indexOf(marker)
  if (at !== -1 && (at === 0 || lower.startsWith('http'))) {
    let i = at + marker.length
    const owner = readName(s, i)
    if (!owner || s[owner.next] !== '/') return null
    const repo = readName(s, owner.next + 1)
    if (!repo || s[repo.next] !== '/') return null
    const rest = s.slice(repo.next + 1)
    if (!rest.startsWith('issues/')) return null
    const n = readNumber(rest, 'issues/'.length)
    return n === null
      ? null
      : { owner: owner.value, repo: repo.value, number: n, form: 'url' }
  }

  // owner/repo#12
  const owner = readName(s, 0)
  if (owner && s[owner.next] === '/') {
    const repo = readName(s, owner.next + 1)
    if (repo && s[repo.next] === '#') {
      const n = readNumber(s, repo.next + 1)
      if (n !== null) {
        return { owner: owner.value, repo: repo.value, number: n, form: 'qualified' }
      }
    }
  }
  return null
}

/** A bare keyword token, tolerating a trailing colon ("Closes: #12"). */
function keywordOf(token) {
  let s = token
  if (s.endsWith(':')) s = s.slice(0, -1)
  const lower = s.toLowerCase()
  return CLOSING_KEYWORDS.has(lower) ? lower : null
}

/**
 * Scan one already-cleaned line for directives.
 * Returns `[{ keyword, references, column }]`.
 */
function directivesInLine(line) {
  const tokens = tokenize(blankInlineCode(line))
  const found = []
  for (let i = 0; i < tokens.length; i += 1) {
    const keyword = keywordOf(tokens[i].text)
    if (!keyword) continue

    // Negation guard: look back one token.
    if (i > 0) {
      const prev = trimPunctuation(tokens[i - 1].text).toLowerCase()
      if (NEGATORS.has(prev)) continue
    }

    // The reference must come IMMEDIATELY next — GitHub's own rule.
    const references = []
    let j = i + 1
    let expectReference = true
    while (j < tokens.length) {
      const ref = parseReference(tokens[j].text)
      if (ref) {
        references.push(ref)
        expectReference = false
        j += 1
        continue
      }
      if (expectReference) break
      const sep = trimPunctuation(tokens[j].text).toLowerCase()
      // A bare "," attached to the previous token is already trimmed off.
      if (sep === '' || REFERENCE_SEPARATORS.has(sep)) {
        expectReference = true
        j += 1
        continue
      }
      break
    }
    if (references.length > 0) {
      found.push({ keyword, references, column: tokens[i].index + 1 })
      i = j - 1
    }
  }
  return found
}

/**
 * Parse a pull-request body.
 *
 * @param {string} body
 * @param {{owner: string, repo: string}} self - the repository the PR merged in
 * @returns {{
 *   sameRepo: number[],
 *   crossRepo: Array<{owner,repo,number,line,text}>,
 *   directives: Array<{keyword,line,column,text,references}>,
 *   ignored: Array<{reason,line,text,keyword,references}>,
 *   liveLines: number,
 *   totalLines: number,
 * }}
 */
export function parseClosingKeywords(body, self) {
  const owner = self?.owner ?? null
  const repo = self?.repo ?? null
  const lines = classifyLines(body ?? '')

  const sameRepo = []
  const seen = new Set()
  const crossRepo = []
  const directives = []
  const ignored = []
  let liveLines = 0

  for (const line of lines) {
    const hits = directivesInLine(line.text)
    if (line.status === LIVE) liveLines += 1
    if (hits.length === 0) continue

    for (const hit of hits) {
      if (line.status !== LIVE) {
        ignored.push({
          reason: line.status,
          line: line.number,
          text: line.text.trim(),
          keyword: hit.keyword,
          references: hit.references,
        })
        continue
      }
      directives.push({
        keyword: hit.keyword,
        line: line.number,
        column: hit.column,
        text: line.text.trim(),
        references: hit.references,
      })
      for (const ref of hit.references) {
        const isSelf =
          ref.owner === null ||
          (owner !== null &&
            ref.owner.toLowerCase() === owner.toLowerCase() &&
            ref.repo.toLowerCase() === repo.toLowerCase())
        if (isSelf) {
          if (!seen.has(ref.number)) { seen.add(ref.number); sameRepo.push(ref.number) }
        } else {
          crossRepo.push({
            owner: ref.owner,
            repo: ref.repo,
            number: ref.number,
            line: line.number,
            text: line.text.trim(),
          })
        }
      }
    }
  }

  return {
    sameRepo,
    crossRepo,
    directives,
    ignored,
    liveLines,
    totalLines: lines.length,
  }
}

// ---------------------------------------------------------------------------
// Self-test — the registered guard (scripts/guard-registry.mjs)
// ---------------------------------------------------------------------------

const SELF = { owner: 'GaryOcean428', repo: 'bsuite' }

/**
 * Every case names the body, the issue numbers that MUST be closed, and the
 * cross-repo references that must be reported-not-closed.
 *
 * The cases asserting `[]` are the ones that matter: this parser's dangerous
 * failure is closing somebody's live issue because the number appeared in a
 * pasted review comment. A scanner that matched nothing at all would also
 * satisfy every one of those, which is why `runSelfTest` additionally asserts
 * that the positive cases really did produce closes — a guard nobody has
 * watched succeed AND fail is not known to work.
 */
export const SELF_TEST_CASES = [
  { label: 'plain directive', body: 'Closes #12', closes: [12] },
  { label: 'lower case, mid-sentence', body: 'This one fixes #13 at last.', closes: [13] },
  { label: 'upper case keyword', body: 'CLOSES #65', closes: [65] },
  { label: 'colon variant', body: 'Closes: #14', closes: [14] },
  { label: 'trailing full stop', body: 'Closed #68.', closes: [68] },
  { label: 'run of references', body: 'Fixes #3, #4 and #5', closes: [3, 4, 5] },
  { label: 'GH-dash form', body: 'Resolves GH-63', closes: [63] },
  {
    label: 'self-repo URL form',
    body: 'Resolves https://github.com/GaryOcean428/bsuite/issues/62',
    closes: [62],
  },
  {
    label: 'duplicate references collapse',
    body: 'Closes #21\nAlso closes #21',
    closes: [21],
  },
  {
    label: 'directive survives later quoted noise',
    body: 'Closes #70\n\n> Reviewer said: closes #71',
    closes: [70],
  },
  {
    label: 'blank line ends lazy quote continuation',
    body: '> quoted context\n\nCloses #70',
    closes: [70],
  },

  // --- must NOT close ---------------------------------------------------
  { label: 'blockquote', body: '> Closes #99', closes: [] },
  {
    label: 'blockquote lazy continuation',
    body: '> quoting the previous PR\nCloses #64',
    closes: [],
  },
  { label: 'unchecked task item', body: '- [ ] Closes #77', closes: [] },
  { label: 'checked task item', body: '- [x] Fixes #78', closes: [] },
  { label: 'ordered task item', body: '1. [ ] Resolves #79', closes: [] },
  {
    label: 'fenced code block',
    body: 'Body text\n```\nCloses #55\n```\nmore text',
    closes: [],
  },
  {
    label: 'tilde fence',
    body: '~~~text\nCloses #56\n~~~',
    closes: [],
  },
  {
    label: 'unterminated fence swallows the rest',
    body: '```log\nsomething\nCloses #57',
    closes: [],
  },
  { label: 'inline code span', body: 'Write `Closes #58` in the body.', closes: [] },
  { label: 'double-backtick span', body: 'Use ``Closes #59`` verbatim.', closes: [] },
  { label: 'html comment, one line', body: '<!-- Closes #60 -->', closes: [] },
  {
    label: 'html comment across lines',
    body: '<!--\nTemplate help: write Closes #61 here\n-->\nReal body.',
    closes: [],
  },
  { label: 'indented code block', body: 'Log:\n\n    Closes #62', closes: [] },
  { label: 'negated directive', body: 'This does not close #63.', closes: [] },
  { label: 'negated with never', body: 'It never fixes #64 fully.', closes: [] },
  { label: 'keyword not followed by a reference', body: 'Closes the loop on #66', closes: [] },
  { label: 'keyword inside a longer word', body: 'Precloses #67 subsystem', closes: [] },
  { label: 'bare issue reference, no keyword', body: 'Related to #69', closes: [] },
  {
    label: 'pull-request URL is not an issue',
    body: 'Closes https://github.com/GaryOcean428/bsuite/pull/67',
    closes: [],
  },
  { label: 'empty body', body: '', closes: [] },
  { label: 'null body', body: null, closes: [] },

  // --- cross-repo: parsed, reported, never closed here -------------------
  {
    label: 'cross-repo qualified reference',
    body: 'Closes GaryOcean428/crm7#61',
    closes: [],
    cross: [{ owner: 'GaryOcean428', repo: 'crm7', number: 61 }],
  },
  {
    label: 'cross-repo URL reference',
    body: 'Fixes https://github.com/GaryOcean428/conduit/issues/8',
    closes: [],
    cross: [{ owner: 'GaryOcean428', repo: 'conduit', number: 8 }],
  },
  {
    label: 'mixed same-repo and cross-repo in one run',
    body: 'Closes #30 and GaryOcean428/crm7#31',
    closes: [30],
    cross: [{ owner: 'GaryOcean428', repo: 'crm7', number: 31 }],
  },
]

function sameNumbers(a, b) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort((x, y) => x - y)
  const sortedB = [...b].sort((x, y) => x - y)
  for (let i = 0; i < sortedA.length; i += 1) if (sortedA[i] !== sortedB[i]) return false
  return true
}

function sameCross(actual, expected) {
  if (actual.length !== expected.length) return false
  const key = (r) => `${r.owner}/${r.repo}#${r.number}`
  const a = actual.map(key).sort()
  const b = expected.map(key).sort()
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

export function runSelfTest() {
  // THE COUNTS ARE DERIVED FROM THE CASE TABLE, NEVER WRITTEN DOWN.
  // A literal is correct once and then rots the next time a case is added,
  // and LANE-WATCHER (scripts/check-guard-self-reporting.mjs) reads the HEAD
  // of this output to decide whether this guard examined anything at all.
  const total = SELF_TEST_CASES.length
  const negative = SELF_TEST_CASES.filter((c) => c.closes.length === 0).length
  const positive = total - negative

  const failures = []
  let closedTotal = 0
  const detail = []

  for (const c of SELF_TEST_CASES) {
    const got = parseClosingKeywords(c.body, SELF)
    closedTotal += got.sameRepo.length
    const okCloses = sameNumbers(got.sameRepo, c.closes)
    const okCross = sameCross(got.crossRepo, c.cross ?? [])
    if (okCloses && okCross) {
      detail.push(`  ok    ${c.label} (closes=[${got.sameRepo.join(',')}])`)
    } else {
      detail.push(
        `  FAIL  ${c.label} — expected closes=[${c.closes.join(',')}] ` +
          `cross=${(c.cross ?? []).length}, got closes=[${got.sameRepo.join(',')}] ` +
          `cross=${got.crossRepo.length}`,
      )
      failures.push(c.label)
    }
  }

  // POSITIVE CONTROL. Every "must not close" case is satisfied by a parser
  // that returns nothing for every input, so a silent breakage would pass
  // 21 of the cases below and look healthy. Assert the parser really closes
  // something before believing any of its refusals.
  if (closedTotal === 0) {
    failures.push(
      'POSITIVE CONTROL: the parser closed nothing across the entire case ' +
        'table — it is not discriminating, it is inert',
    )
  }

  return { total, positive, negative, failures, detail, closedTotal }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(name) {
  const prefix = `--${name}=`
  for (const a of process.argv.slice(2)) if (a.startsWith(prefix)) return a.slice(prefix.length)
  return null
}

function main() {
  const argv = process.argv.slice(2)

  if (argv.includes('--self-test')) {
    const r = runSelfTest()
    // HEAD LINE FIRST — LANE-WATCHER classifies from the head of the output
    // and truncates before any trailing summary is reached.
    if (r.failures.length === 0) {
      console.log(
        `parse-closing-keywords: self-test OK (${r.total} cases executed, ` +
          `${r.negative} of them asserting NO issue is closed, ` +
          `${r.closedTotal} issue references legitimately extracted).`,
      )
    } else {
      console.log(
        `parse-closing-keywords: self-test FAILED (${r.total} cases executed, ` +
          `${r.failures.length} failing).`,
      )
    }
    for (const d of r.detail) console.log(d)
    if (r.failures.length > 0) {
      console.error('\nFailing cases:')
      for (const f of r.failures) console.error(`  - ${f}`)
      console.error(
        '\nA change here alters WHICH ISSUES GET CLOSED AUTOMATICALLY. Do not ' +
          'relax a case to make the suite green.',
      )
      process.exit(1)
    }
    console.log(
      `\n${r.positive} case(s) assert a close, ${r.negative} assert none; ` +
        'positive control satisfied.',
    )
    return
  }

  const file = argValue('body-file')
  const repoArg = argValue('repo')
  if (!file) {
    console.error('usage: parse-closing-keywords.mjs --self-test')
    console.error('       parse-closing-keywords.mjs --body-file=PATH --repo=owner/name')
    process.exit(2)
  }
  const slash = (repoArg ?? '').indexOf('/')
  if (slash <= 0) {
    console.error('--repo=owner/name is required with --body-file')
    process.exit(2)
  }
  const self = { owner: repoArg.slice(0, slash), repo: repoArg.slice(slash + 1) }
  const body = fs.readFileSync(file, 'utf8')
  console.log(JSON.stringify(parseClosingKeywords(body, self), null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) main()

// ---------------------------------------------------------------------------
// KNOWN CONSERVATIVE CASES — deliberate false negatives, all of them safe
// ---------------------------------------------------------------------------
// 1. A directive inside a `<details>` block is honoured. Collapsed sections in
//    this estate hold pasted logs, and pasted logs are fenced, which is already
//    covered; adding <details> handling would mostly punish authors who put a
//    real directive in one.
// 2. A directive indented four or more spaces is ignored, even when it is a
//    deeply nested list item rather than an indented code block. Telling those
//    apart needs full list-context tracking; leaving an issue open is cheaper.
// 3. The PR TITLE is never parsed. GitHub does not honour keywords there
//    either, so honouring them here would be a private dialect.
// 4. Commit messages are never parsed. GitHub honours them on a default-branch
//    push; on `development` they are inert, and squash-merge bodies already
//    carry the PR body through to the merge commit anyway.
