#!/usr/bin/env node
/**
 * check-control-boundary-contrast — no native form control in any shared
 * package may draw its ENTIRE visible boundary with `border-border`, the
 * DIVIDER token.
 *
 * WHY THIS EXISTS
 * ───────────────────────────────────────────────────────────────────────────
 * bsuite#3009 fixed 17 controls that drew their whole boundary with
 * `border-border` while sitting on a fill that matched their surroundings —
 * `--role-border` measures 1.06:1 light / 2.36:1 dark against the page, and
 * WCAG 2.1 SC 1.4.11 requires 3:1 for the visual information that identifies
 * a control. Its own completion-enforcer gate (PI scratch
 * `lanes/dod/enforcer-3009-gate.json`) sent that PR back: the body claimed
 * "the remaining border-border uses are dividers", and that claim was false
 * for at least 24 more control elements across packages/schema-builder,
 * packages/schema-registry and packages/ui — the same defect, unmeasured.
 *
 * A hand count is exactly the thing that produced the false claim. This gate
 * makes the count structural: it enumerates the class (a native control
 * element whose className carries the bare divider token) rather than trusting
 * a PR body's prose about which lines are dividers and which are controls.
 *
 * THE RULE
 * ───────────────────────────────────────────────────────────────────────────
 * A `<input>`, `<select>`, `<textarea>` or `<button>` element's opening tag
 * may never carry a RESTING `border-border` class. Resting means: no variant
 * at all, or only variants that describe how the control sits before the
 * user touches it — `dark:`, `md:`, `print:`, `rtl:`, `first:`, `@lg:` and
 * their kin. Those are banned exactly like the bare token.
 *
 * Exempt: `border-border-interactive` and `border-border-strong` (different,
 * already-registered tokens), and any `border-border` whose variant chain
 * carries at least one variant that actually names hover, focus, or active
 * (bare, prefixed like `group-hover:`/`peer-focus:`, or an arbitrary bracket
 * like `[&:hover]:`) — because that is a reveal-on-TRANSIENT-interaction
 * accent whose RESTING state carries no visible border to begin with.
 * `aria-expanded:`, `data-[state=open]:`, `disabled:` and the like do NOT
 * qualify: none of them name hover/focus/active, and all of them can persist
 * indefinitely (FOLLOW 105). See isTransientInteraction.
 *
 * This is deliberately simpler than "matches its container's fill" — that
 * requires tracking ancestor background tokens, which is a moving target as
 * layouts change and was not actually decisive in the audit: two controls
 * found during the bsuite#3009 rework (PageGridLayout's column-count and
 * add-widget chips) sat on `bg-muted` distinguishable from their container,
 * and got fixed anyway, because the border itself is still the low-contrast
 * divider token regardless of what sits behind it. "Never use the divider
 * token on a control" is the invariant that is actually enforceable forever;
 * "unless the fill happens to differ enough" is a judgment call this script
 * cannot make and a future author should not have to re-litigate.
 *
 * `<dialog>` is deliberately NOT in the element list. A dialog's own edge is
 * a container border (the same role as a card edge), not the boundary of a
 * form control, and bsuite#3009 explicitly left every `<dialog>` border
 * untouched on that basis — confirmed by re-reading every dialog site during
 * the rework and finding none reclassified.
 *
 * SCOPE
 * Scans `packages/*›/src` in THIS repo only — the shared component packages,
 * not the six consumer apps (each a separate submodule with its own gate).
 *
 * IT SCANS STRING LITERALS INSIDE TAGS, NOT COMMENTS
 * ───────────────────────────────────────────────────────────────────────────
 * Reuses the comment/string state-machine convention already established by
 * check-content-contrast-tier.mjs in this same scripts/ directory: comments
 * are blanked before scanning, so prose that names `border-border` (this file
 * does so repeatedly, and so does the fix commit's own source comments) can
 * never trip the gate. Only text inside an actual opening tag's attributes is
 * examined, and only the TAG TEXT for the four listed element names.
 *
 * COMPONENT MATCHING (FOLLOW 101)
 * ───────────────────────────────────────────────────────────────────────────
 * The native scan above only ever sees `<input>`, `<select>`, `<textarea>`,
 * `<button>` — lowercase tags. A React wrapper around a native control
 * (`<Button className="border border-border">`, `crm7/src/components/ai/
 * AIHeader.tsx`) renders a `<button>` at runtime but is a capitalised
 * identifier in the SOURCE this gate reads, so it sailed straight past. Three
 * confirmed live sites (AIHeader.tsx:67/79, user-nav.tsx:38,
 * AIRetryButton.tsx:50) carried the exact bare/low-contrast `border-border`
 * boundary this gate exists to catch, unseen, because the matcher was built
 * as `new RegExp('<(' + CONTROL_TAGS.join('|') + ')...')` over four lowercase
 * names only.
 *
 * Two sources of component control names, UNIONED:
 *   1. CONTROL_COMPONENTS — a curated list of the shared design-system
 *      control names (Button, Input, Select, Checkbox, …).
 *   2. resolveControlAliases() — parses the file's OWN import statements and
 *      treats any local identifier imported from a module path matching
 *      `/components/ui/(button|input|select|textarea|toggle|checkbox|radio|
 *      switch|slider)` as a control, including a renamed import
 *      (`import { Button as Btn }` -> `Btn` counts). A curated list alone
 *      always lags the repo as names get renamed or re-exported; the alias
 *      map is what keeps this structural rather than a list someone forgets
 *      to update. No word-boundary is enforced after the stem on purpose —
 *      real shadcn file names are hyphenated compounds of it
 *      (`radio-group.tsx`, `toggle-group.tsx`, `input-otp.tsx` both exist in
 *      this estate), so anchoring after the bare stem would silently miss
 *      exactly the two controls (RadioGroupItem, ToggleGroupItem) already in
 *      the curated list above.
 *
 * Reuses stripComments / extractOpeningTag / bareBorderBorderHits verbatim —
 * the resting-variant logic that decides bare-vs-exempt does not change
 * because the tag is capitalised.
 *
 * RATCHET, not zero-tolerance
 * ───────────────────────────────────────────────────────────────────────────
 * Component matching finds real, PRE-EXISTING violations this gate was blind
 * to before today — fixing all of them is a separate, larger piece of work.
 * A JSON baseline committed beside this script (control-boundary-contrast-
 * baseline.json) banks the current finding/scanned pair; `compareRatchet`
 * (scripts/lib/ratchet.mjs) fails the build on a RISE or an unbanked FALL,
 * never on the pre-existing count alone. `--update-baseline` re-banks; never
 * hand-edit the JSON file.
 *
 * USAGE
 *   node scripts/check-control-boundary-contrast.mjs
 *   node scripts/check-control-boundary-contrast.mjs --update-baseline
 *   node scripts/check-control-boundary-contrast.mjs --self-test
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareRatchet, writeBaseline } from './lib/ratchet.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_FILE = join(ROOT, 'scripts', 'control-boundary-contrast-baseline.json')

const CONTROL_TAGS = ['input', 'select', 'textarea', 'button']

/**
 * Curated component control names — the first of the two UNIONED sources
 * described in the COMPONENT MATCHING header comment. Kept in sync with the
 * shared design system's actual control set; the alias map below is what
 * catches everything this list has not (yet) been told about.
 */
const CONTROL_COMPONENTS = new Set([
  'Button', 'IconButton', 'Input', 'Textarea', 'Select', 'SelectTrigger',
  'Combobox', 'Toggle', 'ToggleGroupItem', 'Checkbox', 'RadioGroupItem',
  'Switch', 'Slider',
])

/**
 * A control's own module lives under a `components/ui/<stem>` path. Any
 * local identifier a file imports from a specifier containing this is
 * treated as a control regardless of its local name — the second UNIONED
 * source, and the one that keeps the curated list above from silently going
 * stale. No trailing boundary after the stem: see the COMPONENT MATCHING
 * header comment for why (`radio-group.tsx`, `toggle-group.tsx`,
 * `input-otp.tsx` are real file names in this estate and must still match).
 */
const CONTROL_IMPORT_PATH_RE =
  /\/components\/ui\/(button|input|select|textarea|toggle|checkbox|radio|switch|slider)/

/**
 * Floor for the real tree. A guard that scans zero files passes forever, and
 * "no violations" and "no files" print the same way unless one of them is a
 * hard failure. Raise this when packages are added; never lower it silently.
 * 459 .ts/.tsx files existed under packages/ at the time this was written;
 * 100 leaves generous room to shrink without ever masking a broken checkout.
 */
const FILE_FLOOR = 100

/**
 * Floor for component control tags SEEN (matched, not necessarily
 * offending) across the scanned tree — the same "checked nothing 'no
 * violations' and 'no files' print the same way" hazard, but for the new
 * component-matching pass specifically: a regression in the capitalised-tag
 * regex, or the curated list going empty, would report a clean scan having
 * looked at zero component controls. 15 <Button>/<Input>/… tags existed
 * under packages/ at the time this was written; 5 leaves room to shrink
 * without masking a broken matcher.
 */
const COMPONENT_TAG_FLOOR = 5

/**
 * Floor for control-import ALIASES resolved (scripts/check-control-boundary-
 * contrast.mjs's own alias mechanism, see resolveControlAliases below).
 * Measured 2026-09-04: packages/*›/src in THIS repo imports its own control
 * primitives by relative path within packages/ui (`./button`, not
 * `components/ui/button`) rather than through the `components/ui/<stem>`
 * shape the consumer apps use, so this repo's OWN alias count is genuinely
 * 0 — set to 0 here rather than a fabricated non-zero floor that would fail
 * a clean tree. A consumer app's copy of this script (crm7,
 * business-suite-unified) DOES see that import shape throughout and carries
 * its own non-zero floor — see that copy's own comment for its measured
 * count. Do not raise this repo's floor above 0 without first confirming
 * packages/ has actually started using that import shape.
 */
const ALIAS_FLOOR = 0

/** Blank out `//` and `/* *‍/` comments (preserving length), leaving every
 * string/template literal untouched so tag text inside them still scans. */
export function stripComments(source) {
  let out = ''
  let i = 0
  const n = source.length
  while (i < n) {
    const c = source[i]
    const next = source[i + 1]

    if (c === '/' && next === '/') {
      const start = i
      i += 2
      while (i < n && source[i] !== '\n') i++
      out += ' '.repeat(i - start)
      continue
    }
    if (c === '/' && next === '*') {
      const start = i
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++
      i = Math.min(i + 2, n)
      out += source.slice(start, i).replace(/[^\n]/g, ' ')
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      const start = i
      i++
      while (i < n) {
        if (source[i] === '\\') {
          i += 2
          continue
        }
        if (source[i] === quote) {
          i++
          break
        }
        i++
      }
      out += source.slice(start, i)
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * From `startIdx` (the `<` of a control tag), return the full opening-tag
 * text up to its closing `>`, honouring quote and `{expr}` nesting so a
 * `>` inside a ternary or a template literal never ends the tag early.
 */
function extractOpeningTag(source, startIdx) {
  let i = startIdx
  const n = source.length
  let braceDepth = 0
  let inQuote = null
  while (i < n) {
    const c = source[i]
    if (inQuote) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === inQuote) inQuote = null
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      inQuote = c
      i++
      continue
    }
    if (c === '{') {
      braceDepth++
      i++
      continue
    }
    if (c === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      i++
      continue
    }
    if (c === '>' && braceDepth === 0) {
      i++
      break
    }
    i++
  }
  return source.slice(startIdx, i)
}

/**
 * Tailwind variants that describe a RESTING state — the control looks like
 * this without the user doing anything: a theme, a breakpoint, a media
 * query, a direction, a container query, a structural position, OR a
 * persistent component/ARIA state. A `border-border` behind one of these is
 * as bare as one with no variant at all.
 *
 * FOLLOW 68 found `dark:border-border` walking through a blanket `:`
 * exemption — fixed by requiring the variant to actually be listed here.
 * FOLLOW 105 (crm7#2409 enforcer, one layer further down the same bug) found
 * the fix itself still exempted `aria-expanded:`, `disabled:`,
 * `data-[state=open]:`, `group-data-*:`, `peer-checked:` as "interaction or
 * component state" — but every one of those PERSISTS for as long as the
 * underlying condition holds (a field stays invalid, a control stays
 * disabled, a panel stays open) exactly like `dark:` persists for as long as
 * the theme is dark. None of them are momentary.
 *
 * So there is exactly one question, asked uniformly of every variant
 * regardless of prefix or bracket form: is the variant's own FINAL segment
 * actually the word hover, focus, focus-visible or active — never a
 * substring match anywhere inside a longer token? `group-hover`/
 * `peer-focus`/`group-active` still exempt correctly (a group/peer's HOVER,
 * FOCUS or ACTIVE pseudo-class genuinely is transient). Everything that
 * does not END in one of the four (`dark`, `sm`, `aria-expanded`,
 * `data-[state=open]`, `disabled`, `group-data-[state=open]`,
 * `peer-checked`, …) is resting.
 *
 * A same-shape bug one level down (crm7#2409's own enforcer, again):
 * `data-[state=active]`, `data-[active]` and `group-data-[state=active]`
 * all contain the SUBSTRING "active" too, but as an attribute VALUE naming
 * a persistent data-state, not the CSS `:active` pseudo-class — a control
 * stuck in that state is exactly as resting as `data-[state=open]` is. A
 * naive `\bactive\b` test (this file's own previous version) matched all
 * three, because "active" is a whole word inside `[state=active]` too.
 * None of these three strings actually END in the bare word `active` —
 * they end in `]` — so anchoring the match to the variant's own tail
 * (`(?:^|-)active$`) closes the hole without reopening the original one
 * `\b` was written to close (`inactive` still correctly never matches,
 * since it ends in `inactive`, not `-active` or `active`).
 *
 * An arbitrary bracket variant (`[&:hover]`, `[&[data-inactive]:hover]`) is
 * classified differently: it must contain an actual colon-prefixed
 * pseudo-class reference (`:hover`, `:focus`, `:focus-visible`, `:active`),
 * never a bare word match — `[data-inactive]` and `[data-state=active]`
 * both correctly fail this too, for the same value-vs-pseudo-class reason.
 */
function isTransientInteraction(variant) {
  if (variant.startsWith('[') && variant.endsWith(']')) {
    return /:(?:hover|focus-visible|focus|active)\b/i.test(variant)
  }
  return /(?:^|-)(?:hover|focus-visible|focus|active)$/i.test(variant)
}

/** Split a variant chain on `:` while keeping `[…]` arbitrary variants whole. */
function splitVariants(chain) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of chain) {
    if (ch === '[') depth++
    if (ch === ']') depth--
    if (ch === ':' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.filter(Boolean)
}

/**
 * True when every variant on the class is a resting one, i.e. the class still
 * paints the control's default boundary. A chain with at least one variant
 * that names hover/focus/active (bare, prefixed, or arbitrary-bracket) is
 * interaction-gated and stays exempt; everything else is resting.
 */
function variantsAreAllResting(chain) {
  const parts = splitVariants(chain.replace(/^!/, ''))
  if (parts.length === 0) return true
  return parts.every((v) => !isTransientInteraction(v))
}

/**
 * Bare `border-border` hits inside a tag's text: no variant, or only resting
 * variants (see variantsAreAllResting / isTransientInteraction). A following
 * `-` means a longer, already-registered token (`border-border-interactive`,
 * `border-border-strong`) — exempt.
 */
function bareBorderBorderHits(tagText) {
  const hits = []
  const needle = 'border-border'
  let from = 0
  for (;;) {
    const at = tagText.indexOf(needle, from)
    if (at === -1) break
    from = at + needle.length
    const after = tagText[at + needle.length]
    if (after === '-') continue
    // `variant:!border-border` — Tailwind's important marker sits between the
    // chain and the utility; step over it so the chain is still classified.
    let prev = at - 1
    if (tagText[prev] === '!') prev--
    if (tagText[prev] === ':') {
      // walk back over the variant chain to the class boundary
      let b = prev
      while (b > 0 && !/[\s'"`{(,]/.test(tagText[b - 1])) b--
      const chain = tagText.slice(b, prev)
      if (!variantsAreAllResting(chain)) {
        /*
         * AN INTERACTION VARIANT MAY ADD A BOUNDARY. IT MAY NOT TAKE ONE AWAY.
         *
         * The exemption above is right for `border-transparent hover:border-border`
         * — nothing was there, hover adds a faint edge, and the resting state is
         * what this gate is about. It is WRONG for
         * `border-border-interactive hover:border-border`, where the control has
         * a compliant 3:1 boundary at rest and loses it the moment a pointer
         * arrives. Pointing at a control is when its edge matters most.
         *
         * Two on crm7's OrganizationStep did exactly that in light mode while the
         * dark branch correctly used `hover:border-border-strong` — so the same
         * file held the right answer next to the wrong one, and the gate exempted
         * both. Caught by Copilot on the crm7#2398 promotion; ported here from
         * crm7#2422 because this copy carries the identical exemption.
         *
         * The test is the same tag: if a COMPLIANT resting token is present, an
         * interaction variant dropping to the bare divider is a downgrade, not
         * decoration.
         */
        const compliantAtRest = /\bborder-border-(?:interactive|strong)\b/.test(tagText)
        /*
         * DIRECT interaction only — `hover:`, `focus:`, `focus-visible:`,
         * `active:` on the element itself, never `peer-` or `group-` mediated.
         *
         * The distinction is real: a direct variant fires when the person is
         * interacting with THIS control, which is precisely when its boundary
         * matters most. A peer- or group- variant fires because something ELSE
         * was interacted with, and the self-test fixtures deliberately assert
         * those stay exempt.
         *
         * The same argument probably reaches them — a control losing its 3:1
         * edge because a sibling took focus is still a control without an edge —
         * but that is someone else's stated call, and overturning it silently
         * while porting a hover fix would be the wrong way to make it. Left as
         * an open question rather than folded in (crm7#2422 left it the same).
         */
        const direct = splitVariants(chain.replace(/^!/, '')).some((v) =>
          /^(?:hover|focus-visible|focus|active)$/i.test(v),
        )
        if (!compliantAtRest || !direct) continue
        // falls through to hits.push — a downgrade is reported
      }
    }
    hits.push(at)
  }
  return hits
}

/**
 * THIS GATE READS A TAG'S OWN LITERAL SOURCE TEXT. IT DOES NOT EVALUATE
 * ANYTHING. A `className` computed by a helper function is invisible to
 * `bareBorderBorderHits` no matter how correct that function's variant
 * logic becomes — the offending string lives dozens of lines away, in a
 * `return` statement this file never reads.
 *
 * Found live (crm7#2423): `TrainingYearCalendar.tsx` renders
 * `className={cn(dayCellClasses(cell), 'cursor-pointer hover:border-border')}`
 * on a real `<button>`; `dayCellClasses()`'s `'non-scheduled'` branch
 * returns a bare `border-border`. The tag's own text contains neither
 * "border-border" as a bare token nor any hint that `dayCellClasses`
 * might produce one — a hand-rolled substring scan cannot know, and must
 * not guess.
 *
 * bsuite's own doctrine already answers what to do with a claim this gate
 * cannot verify: a class it could not evaluate is UNKNOWN, never a silent
 * pass. This does not attempt to resolve `dayCellClasses(cell)` — general
 * JSX/TS evaluation is a different, much larger tool — it flags that a
 * `className` expression contains content whose string value is not
 * visible in the tag's own text, so the gap becomes something a human (or
 * a future, smarter tool) can go look at, instead of a silent hole nobody
 * knows is there. UNKNOWN NEVER FAILS THE RATCHET: this reports a
 * scanning gap, not a new violation class, and conflating the two would
 * make the ratchet unpassable the day this ships, over pre-existing code
 * nobody has looked at yet.
 *
 * A `className` written entirely as string/template literals is safe by
 * construction — `bareBorderBorderHits` already reads every character of
 * it, ternary branches and logical fallbacks included, because a ternary's
 * un-taken branch is still sitting right there in the source. What is NOT
 * safe is a call to anything other than a known class-merging helper, or a
 * bare identifier standing in for the class value itself — the merge
 * helper's OWN argument list is still literal text this file can read;
 * what it wraps is the part that might not be.
 */
const CLASSNAME_MERGE_HELPERS = new Set(['cn', 'clsx', 'classNames', 'cx'])

/**
 * Given `expr[start]` is an opening quote character (`'`, `"`, or `` ` ``),
 * returns the index just PAST its matching closing quote.
 *
 * A single/double-quoted string is a flat scan for the same character,
 * skipping `\x` escapes. A template literal is NOT flat: `${...}` can
 * contain absolutely anything an expression can, including another nested
 * template literal (`` `a ${`x`} b` ``) or a plain string containing a
 * literal `}` (`` `a ${cond ? '}' : 'y'}` ``) — either one, scanned
 * character-by-character for the next bare backtick or brace, closes the
 * OUTER template early and hands every caller a truncated, wrong string.
 * So a `${` is followed by a genuine recursive skip: walk forward, and any
 * quote character encountered — including another backtick — is skipped
 * via this SAME function before resuming the brace-depth count, so a
 * nested quote's own contents can never be mistaken for the interpolation
 * boundary.
 *
 * Caught by Copilot on crm7#2426 (the FIRST version of this file used a
 * naive `c === '`' && expr[i+1]==='$' && expr[i+2]==='{'` check — which
 * checks whether the CURRENT character is a backtick, when a template
 * interpolation starts with `$`, not `` ` `` — so that branch could only
 * ever fire on a template literal that begins with an interpolation and
 * nothing else, never on the overwhelmingly common `` `text ${x} more` ``
 * shape. A misclassification in THIS direction — treating a non-literal
 * expression as literal — is the worse one: it is exactly the "silent
 * pass on something not actually safe" failure this whole PR exists to
 * end for `className`, so it earns the same rigour applied here.
 */
function skipQuoted(expr, start) {
  const quote = expr[start]
  let i = start + 1
  if (quote !== '`') {
    while (i < expr.length) {
      if (expr[i] === '\\') { i += 2; continue }
      if (expr[i] === quote) return i + 1
      i++
    }
    return i
  }
  while (i < expr.length) {
    const c = expr[i]
    if (c === '\\') { i += 2; continue }
    if (c === '`') return i + 1
    if (c === '$' && expr[i + 1] === '{') {
      i += 2
      let depth = 1
      while (i < expr.length && depth > 0) {
        const ic = expr[i]
        if (ic === '\\') { i += 2; continue }
        if (ic === '"' || ic === "'" || ic === '`') { i = skipQuoted(expr, i); continue }
        if (ic === '{') depth++
        else if (ic === '}') depth--
        i++
      }
      continue
    }
    i++
  }
  return i
}

/** Depth-aware (paren/bracket/brace/quote) index of the first top-level
 * occurrence of any character in `chars`, or -1. A separator inside a
 * nested call, array, object, template `${}`, or string — however deeply
 * nested, via `skipQuoted` — is never mistaken for a top-level one. */
function indexOfTopLevel(expr, chars, from = 0) {
  let depth = 0
  for (let i = from; i < expr.length; i++) {
    const c = expr[i]
    if (c === '"' || c === "'" || c === '`') { i = skipQuoted(expr, i) - 1; continue }
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) depth--
    else if (depth === 0 && chars.includes(c)) return i
  }
  return -1
}

/** Splits a ternary `cond ? whenTrue : whenFalse` at top level, honouring
 * nested ternaries (each nested `?` must consume its own `:` first). Not a
 * ternary (no top-level `?`) returns null. */
function splitTernary(expr) {
  const q = indexOfTopLevel(expr, '?')
  if (q === -1) return null
  // Walk forward from just after `?`, tracking nested ternary `?`s so the
  // matching `:` — not an inner ternary's own `:` — is the one found.
  let nesting = 1
  let i = q + 1
  while (i < expr.length && nesting > 0) {
    const rel = indexOfTopLevel(expr, '?:', i)
    if (rel === -1) return null // malformed — not confidently a ternary
    if (expr[rel] === '?') nesting++
    else nesting--
    i = rel + 1
    if (nesting === 0) {
      return { whenTrue: expr.slice(q + 1, rel), whenFalse: expr.slice(rel + 1) }
    }
  }
  return null
}

/** Parses a top-level function call `name(args)` spanning the WHOLE
 * expression (after trimming) — not a call embedded in a larger
 * expression. Returns `{ name, args }` (args split on top-level commas) or
 * null. */
function splitCall(expr) {
  const m = /^([A-Za-z_$][\w$]*)\(/.exec(expr)
  if (!m) return null
  if (!expr.endsWith(')')) return null
  const argsText = expr.slice(m[0].length, -1)
  const args = []
  let start = 0
  for (;;) {
    const comma = indexOfTopLevel(argsText, ',', start)
    if (comma === -1) {
      if (start < argsText.length || args.length > 0) args.push(argsText.slice(start))
      break
    }
    args.push(argsText.slice(start, comma))
    start = comma + 1
  }
  return { name: m[1], args }
}

/**
 * True when `expr` is provably composed only of string/template literal
 * text that is fully visible right here — see the header comment above
 * `CLASSNAME_MERGE_HELPERS` for what "provably" excludes and why.
 */
function isProvablyLiteralClassExpr(expr) {
  const s = expr.trim()
  if (!s) return true // an empty ternary/logical branch hides nothing

  if (s[0] === '(' && s[s.length - 1] === ')' && indexOfTopLevel(s.slice(1, -1), ')') === -1) {
    return isProvablyLiteralClassExpr(s.slice(1, -1))
  }

  // A plain string literal, start to finish — no top-level content of the
  // SAME quote character outside the opening/closing pair (a lone escaped
  // quote inside doesn't end it, exactly like extractOpeningTag's walk).
  /*
   * A plain string or template literal, START TO END — checked with
   * `skipQuoted`, never by eyeballing the first/last character. Checking
   * only `s[0]` and `s[s.length-1]` was a second bug of exactly the same
   * shape as the one Copilot caught in `indexOfTopLevel` (below): it let
   * `'a' + 'b'` — a plain, safe concatenation of two literals — reach this
   * branch (starts AND ends with `'`), scan forward, hit the FIRST
   * string's own closing quote before reaching the real end, and return
   * `false` outright, never giving the `+` check further down a chance to
   * see it for what it actually is. `skipQuoted` finds where `s[0]`'s
   * matching quote ACTUALLY closes; only when that is the end of the
   * whole expression is this genuinely one literal. When it closes
   * earlier, this simply is not that shape — falling through (not
   * returning `false`) is what lets `'a' + 'b'` reach the `+` case below
   * and be correctly recognised as literal.
   */
  if (s[0] === "'" || s[0] === '"' || s[0] === '`') {
    const closesAt = skipQuoted(s, 0)
    if (closesAt === s.length) {
      if (s[0] !== '`') return true // a plain string: every character in it is already visible here
      // A template literal: every `${...}` interior must itself be
      // provably literal — the literal TEXT segments between them are,
      // by definition, visible right here. `skipQuoted`'s own template
      // branch is reused for the walk (nested quotes/templates included)
      // so this cannot re-open the bug it was written to close.
      let i = 1
      while (i < s.length - 1) {
        if (s[i] === '\\') { i += 2; continue }
        if (s[i] === '"' || s[i] === "'" || s[i] === '`') { i = skipQuoted(s, i); continue }
        if (s[i] === '$' && s[i + 1] === '{') {
          const exprStart = i + 2
          i += 2
          let depth = 1
          while (i < s.length - 1 && depth > 0) {
            const ic = s[i]
            if (ic === '\\') { i += 2; continue }
            if (ic === '"' || ic === "'" || ic === '`') { i = skipQuoted(s, i); continue }
            if (ic === '{') depth++
            else if (ic === '}') { depth--; if (depth === 0) break }
            i++
          }
          if (!isProvablyLiteralClassExpr(s.slice(exprStart, i))) return false
          i++
          continue
        }
        i++
      }
      return true
    }
    // Falls through: not one literal spanning the whole expression (e.g.
    // `'a' + 'b'`, or `` `a` + `${x}` `` ) — the +/ternary/&&/|| cases
    // below are what actually classify it.
  }

  const ternary = splitTernary(s)
  if (ternary) {
    return (
      isProvablyLiteralClassExpr(ternary.whenTrue) && isProvablyLiteralClassExpr(ternary.whenFalse)
    )
  }

  // `a || b`: either side can be the yielded value. `a && b`: only the
  // RIGHT side is ever a value — the left is a condition that, if falsy,
  // yields itself (a non-string cn()/clsx() silently drops), never text
  // this scanner would need to have read.
  const or = indexOfTopLevel(s, '|', 0)
  if (or !== -1 && s[or + 1] === '|') {
    return (
      isProvablyLiteralClassExpr(s.slice(0, or)) && isProvablyLiteralClassExpr(s.slice(or + 2))
    )
  }
  const and = indexOfTopLevel(s, '&', 0)
  if (and !== -1 && s[and + 1] === '&') {
    return isProvablyLiteralClassExpr(s.slice(and + 2))
  }

  // String concatenation (`'a ' + (cond ? 'b' : 'c')`) — a real pattern in
  // this codebase (ComposeForm.tsx, TimeCreditCard.tsx), not a hypothetical
  // one. Every top-level `+`-separated piece must itself be provably
  // literal; `+` doubles as numeric addition but a class-string context
  // never legitimately needs one, so treating it as concatenation-only
  // costs nothing real.
  const plus = indexOfTopLevel(s, '+', 0)
  if (plus !== -1) {
    const pieces = []
    let start = 0
    let at = plus
    for (;;) {
      pieces.push(s.slice(start, at))
      start = at + 1
      at = indexOfTopLevel(s, '+', start)
      if (at === -1) {
        pieces.push(s.slice(start))
        break
      }
    }
    return pieces.every(isProvablyLiteralClassExpr)
  }

  const call = splitCall(s)
  if (call && CLASSNAME_MERGE_HELPERS.has(call.name)) {
    return call.args.every(isProvablyLiteralClassExpr)
  }

  // A bare identifier, a member expression, a call to anything other than
  // a known merge helper, a spread, a numeric/boolean literal standing in
  // for a class list — the actual string content is not visible here.
  return false
}

/**
 * Every `className={...}` attribute in `tagText` whose expression is NOT
 * provably composed of literal text — reported as `{ expr }` for each one
 * (there is at most one `className` per tag, but this stays a list for
 * symmetry with the other `*Hits` finders and in case a spread duplicates
 * it). See the header comment above `CLASSNAME_MERGE_HELPERS`.
 */
function unresolvableClassNameHits(tagText) {
  const hits = []
  const attrRe = /\bclassName\s*=\s*\{/g
  let m
  while ((m = attrRe.exec(tagText))) {
    const braceStart = m.index + m[0].length - 1
    let depth = 0
    let inQuote = null
    let i = braceStart
    for (; i < tagText.length; i++) {
      const c = tagText[i]
      if (inQuote) {
        if (c === '\\') { i++; continue }
        if (c === inQuote) inQuote = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') { inQuote = c; continue }
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) break
      }
    }
    const expr = tagText.slice(braceStart + 1, i)
    if (!isProvablyLiteralClassExpr(expr)) {
      hits.push({ expr: expr.trim().replace(/\s+/g, ' ').slice(0, 90) })
    }
    attrRe.lastIndex = i + 1
  }
  return hits
}

/**
 * Every control-tag violation in `source`: `{ tag }` for each `<input>`,
 * `<select>`, `<textarea>` or `<button>` opening tag whose attribute text
 * carries a bare `border-border`.
 */
export function offendingUses(source) {
  const stripped = stripComments(source)
  const hits = []
  const tagRe = new RegExp(`<(${CONTROL_TAGS.join('|')})(?=[\\s/>])`, 'g')
  let m
  while ((m = tagRe.exec(stripped))) {
    const tagText = extractOpeningTag(stripped, m.index)
    if (bareBorderBorderHits(tagText).length > 0) {
      hits.push({ tag: m[1] })
    }
    tagRe.lastIndex = m.index + tagText.length
  }
  return hits
}

/**
 * Every NATIVE control tag whose `className` is not provably literal —
 * `{ tag, expr }` for each. A separate function, not a change to
 * `offendingUses`'s return shape: dozens of self-test assertions already
 * depend on that function returning a bare array of confirmed violations,
 * and this is a different, non-blocking category (see the header comment
 * above `CLASSNAME_MERGE_HELPERS`) that must never be mistaken for one by
 * a caller that only checked `.length`.
 */
export function unresolvableClassNameUses(source) {
  const stripped = stripComments(source)
  const hits = []
  const tagRe = new RegExp(`<(${CONTROL_TAGS.join('|')})(?=[\\s/>])`, 'g')
  let m
  while ((m = tagRe.exec(stripped))) {
    const tagText = extractOpeningTag(stripped, m.index)
    for (const { expr } of unresolvableClassNameHits(tagText)) {
      hits.push({ tag: m[1], expr })
    }
    tagRe.lastIndex = m.index + tagText.length
  }
  return hits
}


/**
 * Every LOCAL identifier `source`'s own import statements bind to a control
 * module (see CONTROL_IMPORT_PATH_RE) — the alias side of component control
 * matching. Handles a default import, named imports, and a renamed named
 * import (`{ Button as Btn }` -> `Btn`). Does NOT resolve a namespace import
 * (`import * as UI from …`) — a JSX member-expression tag (`<UI.Button>`) is
 * a different matching problem this gate does not attempt.
 */
export function resolveControlAliases(source) {
  const aliases = new Set()
  const stmtRe = /import\s+([^'"]*?)\s+from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = stmtRe.exec(source))) {
    const [, rawClause, specifier] = m
    if (!CONTROL_IMPORT_PATH_RE.test(specifier)) continue
    const clause = rawClause.replace(/^type\s+/, '').trim()

    const braceMatch = clause.match(/\{([^}]*)\}/)
    if (braceMatch) {
      for (let piece of braceMatch[1].split(',')) {
        piece = piece.replace(/^type\s+/, '').trim()
        if (!piece) continue
        const asMatch = piece.match(/^([\w$]+)\s+as\s+([\w$]+)$/)
        aliases.add(asMatch ? asMatch[2] : piece)
      }
    }

    // Default import: whatever sits before a `{` or `*`, if anything.
    const before = clause.split(/[{*]/)[0].replace(/,\s*$/, '').trim()
    if (before && /^[\w$]+$/.test(before)) aliases.add(before)
  }
  return aliases
}

/**
 * Every control-COMPONENT-tag violation in `source`, mirroring offendingUses
 * above but over capitalised JSX tags matched against the union of
 * CONTROL_COMPONENTS and this file's own resolved import aliases. Also
 * returns `seen` — every matched control-component tag, offending or not —
 * so the caller can report a non-zero "examined" denominator even on a
 * clean-pass run (see the RATCHET / COMPONENT MATCHING header comment and
 * LANE-WATCHER's "states what it examined" requirement).
 */
export function offendingComponentUses(source) {
  const stripped = stripComments(source)
  const aliases = resolveControlAliases(stripped)
  const hits = []
  const unresolvable = []
  let seen = 0
  const tagRe = /<([A-Z][\w$]*)(?=[\s/>])/g
  let m
  while ((m = tagRe.exec(stripped))) {
    const tag = m[1]
    if (!CONTROL_COMPONENTS.has(tag) && !aliases.has(tag)) continue
    seen++
    const tagText = extractOpeningTag(stripped, m.index)
    if (bareBorderBorderHits(tagText).length > 0) hits.push({ tag })
    // See unresolvableClassNameUses's header comment (above
    // CLASSNAME_MERGE_HELPERS) — a non-blocking, separate category.
    for (const { expr } of unresolvableClassNameHits(tagText)) unresolvable.push({ tag, expr })
    tagRe.lastIndex = m.index + tagText.length
  }
  return { hits, seen, aliases, unresolvable }
}

/**
 * Every native-control opening tag in `source`, matched regardless of
 * whether it carries a violation — used only to report the "native control
 * tag(s) seen" denominator. Reuses the exact CONTROL_TAGS alternation
 * offendingUses builds its own matcher from, so the two can never disagree
 * about what counts as a native control tag.
 */
export function nativeControlTagCount(source) {
  const stripped = stripComments(source)
  const tagRe = new RegExp(`<(${CONTROL_TAGS.join('|')})(?=[\\s/>])`, 'g')
  let n = 0
  while (tagRe.exec(stripped)) n++
  return n
}

function sourceFiles(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p))
    else if (/\.tsx?$/.test(name)) out.push(p)
  }
  return out
}

function selfTest() {
  const cases = []
  const check = (label, a, e) =>
    cases.push([label, JSON.stringify(a) === JSON.stringify(e), JSON.stringify(a), JSON.stringify(e)])

  check(
    'flags a bare border-border on <input>',
    offendingUses('<input className="border border-border bg-card" />').length,
    1,
  )
  check(
    'flags a bare border-border on <select>',
    offendingUses('<select className="border border-border bg-card"></select>').length,
    1,
  )
  check(
    'flags a bare border-border on <textarea>',
    offendingUses('<textarea className="border border-border bg-card" />').length,
    1,
  )
  check(
    'flags a bare border-border on <button>',
    offendingUses('<button type="button" className="border border-border bg-card">Go</button>').length,
    1,
  )
  check(
    'flags it inside a ternary template literal (the bsuite#3009 shape)',
    offendingUses(
      "<input className={`border bg-card ${nameError ? 'border-role-error' : 'border-border'}`} />",
    ).length,
    1,
  )
  check(
    'flags it inside a cn() call across multiple string args',
    offendingUses(
      "<button className={cn('rounded border', 'bg-muted border-border')}>Go</button>",
    ).length,
    1,
  )
  check(
    'flags it when the tag spans multiple lines',
    offendingUses('<input\n  type="text"\n  className="border border-border bg-card"\n/>').length,
    1,
  )

  check(
    'allows border-border-interactive',
    offendingUses('<input className="border border-border-interactive bg-card" />'),
    [],
  )
  check(
    'allows border-border-strong',
    offendingUses('<input className="h-4 w-4 rounded border-border-strong bg-muted" />'),
    [],
  )
  check(
    'allows hover:border-border (resting state carries no border)',
    offendingUses(
      '<button className="border border-transparent hover:border-border">Go</button>',
    ),
    [],
  )
  check(
    'flags dark:border-border — dark mode is a resting state (FOLLOW 68)',
    offendingUses('<input className="border border-border-interactive dark:border-border" />').length,
    1,
  )
  check(
    'flags md:border-border — a breakpoint is a resting state',
    offendingUses('<select className="border md:border-border"></select>').length,
    1,
  )
  check(
    'flags dark:md:border-border — a chain of resting variants is still resting',
    offendingUses('<button className="dark:md:border-border">Go</button>').length,
    1,
  )
  check(
    'allows focus-visible:border-border',
    offendingUses('<input className="border border-transparent focus-visible:border-border" />'),
    [],
  )
  check(
    'allows dark:hover:border-border — one interaction variant in the chain clears it',
    offendingUses('<input className="border border-transparent dark:hover:border-border" />'),
    [],
  )
  check(
    'allows group-hover:border-border — a group ancestor\'s HOVER genuinely is transient',
    offendingUses('<button className="group-hover:border-border">Go</button>'),
    [],
  )
  check(
    'FLAGS data-[state=open]:border-border — an open component state persists at rest too (FOLLOW 105)',
    offendingUses('<button className="border border-border-interactive data-[state=open]:border-border">Go</button>')
      .length,
    1,
  )
  check(
    'FLAGS group-data-[state=open]:border-border — a group ancestor\'s data-state is not momentary either',
    offendingUses(
      '<button className="border border-border-interactive group-data-[state=open]:border-border">Go</button>',
    ).length,
    1,
  )
  check(
    'FLAGS peer-checked:border-border — a checked custom checkbox stays checked at rest',
    offendingUses(
      '<button className="border border-border-interactive peer-checked:border-border">Go</button>',
    ).length,
    1,
  )
  check(
    'FLAGS aria-expanded:border-border — an expanded panel stays expanded, not just while clicked',
    offendingUses(
      '<button className="border border-border-interactive aria-expanded:border-border">Go</button>',
    ).length,
    1,
  )
  check(
    'FLAGS disabled:border-border — a disabled control can be disabled indefinitely',
    offendingUses('<button className="border border-transparent disabled:border-border">Go</button>')
      .length,
    1,
  )
  check(
    'allows peer-focus:border-border — a peer\'s FOCUS genuinely is transient',
    offendingUses(
      '<button className="border border-border-interactive peer-focus:border-border">Go</button>',
    ),
    [],
  )
  check(
    'FLAGS data-[state=active]:border-border — the VALUE "active" names a persistent data-state, not :active',
    offendingUses(
      '<button className="border border-border-interactive data-[state=active]:border-border">Go</button>',
    ).length,
    1,
  )
  check(
    'FLAGS data-[active]:border-border — same shape, shorthand boolean data attribute',
    offendingUses(
      '<button className="border border-border-interactive data-[active]:border-border">Go</button>',
    ).length,
    1,
  )
  check(
    'FLAGS group-data-[state=active]:border-border — a group ancestor\'s data-state VALUE, not its :active',
    offendingUses(
      '<button className="border border-border-interactive group-data-[state=active]:border-border">Go</button>',
    ).length,
    1,
  )
  check(
    'allows group-active:border-border — a group ancestor\'s CSS :active pseudo-class genuinely is transient',
    offendingUses(
      '<button className="border border-border-interactive group-active:border-border">Go</button>',
    ),
    [],
  )
  check(
    'allows peer-active:border-border — same, for a peer\'s :active',
    offendingUses(
      '<button className="border border-border-interactive peer-active:border-border">Go</button>',
    ),
    [],
  )
  check(
    'allows an arbitrary variant naming hover, flags one that does not',
    [
      offendingUses('<input className="[&:hover]:border-border" />').length,
      offendingUses('<input className="[&>svg]:border-border" />').length,
    ],
    [0, 1],
  )
  check(
    'allows hover:!border-border — the important marker sits after the chain',
    offendingUses(
      '<input className="border-transparent hover:!border-border dark:hover:!border-border" />',
    ),
    [],
  )
  check(
    'flags dark:!border-border — important does not change a resting variant',
    offendingUses('<input className="dark:!border-border" />').length,
    1,
  )
  check(
    'flags [data-inactive]:border-border — "active" inside "inactive" is not an interaction',
    offendingUses('<button className="[data-inactive]:border-border">Go</button>').length,
    1,
  )
  check(
    'allows [&:active]:border-border and [&[data-inactive]:hover]:border-border',
    offendingUses(
      '<button className="[&:active]:border-border [&[data-inactive]:hover]:border-border">Go</button>',
    ),
    [],
  )
  check(
    'flags dark:border-border inside a template literal expression',
    offendingUses("<input className={`border ${dark ? 'dark:border-border' : ''}`} />").length,
    1,
  )
  check(
    'does NOT flag a non-control element (<div>) — container edges are dividers',
    offendingUses('<div className="rounded-lg border border-border bg-card p-6" />'),
    [],
  )
  check(
    'does NOT flag <dialog> — a modal edge is a container border, not a control boundary',
    offendingUses('<dialog className="rounded-lg border border-border bg-card p-0" />'),
    [],
  )
  check(
    'does NOT flag border-border named in a line comment',
    offendingUses('// <input className="border-border" /> is the old, wrong shape'),
    [],
  )
  check(
    'does NOT flag border-border named in a block comment',
    offendingUses('/* <button className="border-border"> was the bsuite#3009 defect */'),
    [],
  )
  check(
    'a `>` inside a ternary does not end the tag early and hide a real hit',
    offendingUses(
      "<input aria-invalid={x > 1} className={x ? 'border-border-interactive' : 'border-border'} />",
    ).length,
    1,
  )

  // ── component matching (FOLLOW 101) ─────────────────────────────────────
  check(
    'flags a bare border-border on <Button> (curated list, bsuite#3009-shape defect)',
    offendingComponentUses('<Button className="border border-border">Go</Button>').hits.length,
    1,
  )
  check(
    'flags border-border/60 on <Button> — an opacity modifier is not a variant (AIRetryButton.tsx:50 shape)',
    offendingComponentUses(
      "<Button className={cn('gap-1.5 border-border/60 text-xs', other)}>Retry</Button>",
    ).hits.length,
    1,
  )
  check(
    'flags a renamed alias <Btn> when imported from a components/ui/button path',
    offendingComponentUses(
      "import { Button as Btn } from '@/components/ui/button'\n" +
        '<Btn className="border border-border">Go</Btn>',
    ).hits.length,
    1,
  )
  check(
    'flags a default-imported alias when imported from a components/ui/button path',
    offendingComponentUses(
      "import Btn from '@/components/ui/button'\n<Btn className=\"border-border\">Go</Btn>",
    ).hits.length,
    1,
  )
  check(
    'flags the alias even from a hyphenated file (radio-group.tsx is a real file name)',
    offendingComponentUses(
      "import { RadioGroupItem as Radio } from '@/components/ui/radio-group'\n" +
        '<Radio className="border border-border" />',
    ).hits.length,
    1,
  )
  check(
    'does NOT resolve an identifier imported from an unrelated path as a control alias',
    [...resolveControlAliases("import { Btn } from '@/components/icons/star'")],
    [],
  )
  check(
    'does NOT flag a capitalised NON-control (<Card>) — not in the curated list, no alias',
    offendingComponentUses('<Card className="border border-border">Hi</Card>').hits.length,
    0,
  )
  check(
    'does NOT flag hover:border-border alone on a component — resting-variant logic still applies',
    offendingComponentUses(
      '<Button className="border border-transparent hover:border-border">Go</Button>',
    ).hits.length,
    0,
  )
  check(
    'does NOT flag an aliased identifier the file never actually imported from a control path',
    offendingComponentUses('<Btn className="border border-border">Go</Btn>').hits.length,
    0,
  )
  check(
    'counts every native control tag SEEN, not just violations',
    nativeControlTagCount('<input className="border border-border-interactive" /><button>Go</button>'),
    2,
  )
  check(
    'counts every matched component control tag SEEN, not just violations',
    offendingComponentUses('<Button>Go</Button><Card>Hi</Card>').seen,
    1,
  )

  // ── hover may ADD a boundary, never take one away (crm7#2422) ──────────
  check(
    'FLAGS border-border-interactive hover:border-border — a control that loses its 3:1 edge while pointed at',
    offendingUses(
      '<button className="border-2 border-border-interactive hover:border-border">x</button>',
    ).length,
    1,
  )
  check(
    'FLAGS it in the DARK branch too — dark:hover: is still a direct interaction',
    offendingUses(
      '<button className="border-2 border-border-interactive dark:hover:border-border">x</button>',
    ).length,
    1,
  )
  check(
    'FLAGS focus-visible dropping to the divider — keyboard users lose the edge exactly when they need it',
    offendingUses(
      '<button className="border-2 border-border-strong focus-visible:border-border">x</button>',
    ).length,
    1,
  )
  check(
    'ALLOWS border-transparent hover:border-border — nothing was there, so hover ADDS an edge',
    offendingUses(
      '<button className="border-2 border-transparent hover:border-border">x</button>',
    ).length,
    0,
  )
  check(
    'ALLOWS hover:border-border-strong beside a compliant resting token — not a downgrade at all',
    offendingUses(
      '<button className="border-2 border-border-interactive hover:border-border-strong">x</button>',
    ).length,
    0,
  )
  check(
    'ALLOWS peer-focus:border-border even WITH a compliant resting token — the downgrade rule is direct-interaction only, deliberately',
    offendingUses(
      '<button className="border-2 border-border-interactive peer-focus:border-border">x</button>',
    ).length,
    0,
  )

  // ── UNKNOWN: a className this scan cannot prove safe or unsafe (crm7#2424) ──
  check(
    'does NOT flag plain string literal className — the whole value is visible right here',
    unresolvableClassNameUses('<button className="border border-border-interactive">Go</button>')
      .length,
    0,
  )
  check(
    'does NOT flag className="..." (no braces at all)',
    unresolvableClassNameUses('<input className="border" />').length,
    0,
  )
  check(
    "does NOT flag cn('a', 'b') — a merge helper over two literal arguments",
    unresolvableClassNameUses("<button className={cn('a', 'b')}>Go</button>").length,
    0,
  )
  check(
    'does NOT flag a ternary between two literal branches — both are visible right here',
    unresolvableClassNameUses(
      "<button className={active ? 'border-border-interactive' : 'border-transparent'}>Go</button>",
    ).length,
    0,
  )
  check(
    'does NOT flag `cond && \'literal\'` inside cn() — the condition is never a value',
    unresolvableClassNameUses(
      "<button className={cn('border', isOpen && 'border-border-interactive')}>Go</button>",
    ).length,
    0,
  )
  check(
    'does NOT flag a template literal whose ${} interpolation is a literal-only ternary',
    unresolvableClassNameUses(
      "<button className={`pl-10 ${hasError ? 'border-destructive' : ''}`}>Go</button>",
    ).length,
    0,
  )
  check(
    'FLAGS a bare identifier standing in for the whole className — its value is not here',
    unresolvableClassNameUses('<button className={dayCellClasses}>Go</button>').length,
    1,
  )
  check(
    'FLAGS a call to a helper OTHER than cn/clsx/classNames/cx — crm7#2423 shape, exactly',
    unresolvableClassNameUses(
      "<button className={cn(dayCellClasses(cell), 'cursor-pointer hover:border-border')}>Go</button>",
    ).length,
    1,
  )
  check(
    'FLAGS a bare identifier passed as one argument to cn(), the rest of the call still literal',
    unresolvableClassNameUses("<button className={cn('border', someClassVar)}>Go</button>").length,
    1,
  )
  check(
    'FLAGS it on a component tag too, not just a native one',
    offendingComponentUses(
      "<Button className={cn(dayCellClasses(cell), 'x')}>Go</Button>",
    ).unresolvable.length,
    1,
  )
  check(
    'the reported expr is truncated/whitespace-collapsed, not the raw multi-line source',
    unresolvableClassNameUses(
      "<button\n  className={cn(\n    dayCellClasses(cell),\n    'x'\n  )}\n>Go</button>",
    )[0]?.expr.includes('\n'),
    false,
  )
  check(
    "does NOT flag 'literal ' + (cond ? 'literal2' : 'literal3') — concatenation of literal pieces",
    unresolvableClassNameUses(
      "<button className={'flex gap-1.5 ' + (active ? 'bg-primary' : 'text-muted-foreground')}>Go</button>",
    ).length,
    0,
  )
  check(
    "FLAGS 'literal ' + someVariable — concatenation does not save a non-literal piece",
    unresolvableClassNameUses("<button className={'flex gap-1.5 ' + extraClass}>Go</button>").length,
    1,
  )
  check(
    "does NOT flag 'a' + 'b' — two adjacent quote-delimited literals, not one string skipQuoted " +
      'must not stop at the first one\'s own closing quote',
    unresolvableClassNameUses("<button className={'a' + 'b'}>Go</button>").length,
    0,
  )
  check(
    'does NOT flag a template literal whose ${} interpolation is ANOTHER template literal with no ' +
      'interpolation of its own — Copilot crm7#2426: the naive scan could only detect an interpolation ' +
      'starting at the very first character, never mid-string',
    unresolvableClassNameUses(
      "<button className={`a ${active ? `hover-on` : `hover-off`} b`}>Go</button>",
    ).length,
    0,
  )
  check(
    'FLAGS a template literal whose nested ${} (inside a NESTED template) is non-literal — the outer ' +
      'skip must not stop at the nested template\'s own closing backtick',
    unresolvableClassNameUses(
      "<button className={`a ${active ? `on-${extraClass}` : `off`} b`}>Go</button>",
    ).length,
    1,
  )
  check(
    "does NOT flag a template literal containing a plain string with a literal '}' inside an " +
      'interpolation — brace-depth counting must skip nested quotes, not just count braces blindly',
    unresolvableClassNameUses(
      "<button className={`a ${active ? '}' : 'x'} b`}>Go</button>",
    ).length,
    0,
  )

  const failed = cases.filter(([, ok]) => !ok)
  for (const [label, ok, a, e] of cases) if (!ok) console.error(`  ✗ ${label}\n      expected ${e}\n      actual   ${a}`)
  if (failed.length) {
    console.error(`\ncheck-control-boundary-contrast --self-test: ${failed.length} of ${cases.length} FAILED`)
    return 1
  }
  console.log(
    `check-control-boundary-contrast --self-test: ${cases.length} assertions — every native control tag ` +
      '(input/select/textarea/button) and component control tag (curated list + resolved import ' +
      'aliases) with a bare resting border-border proven to FAIL; border-border-interactive, ' +
      'border-border-strong, variant-prefixed uses, non-control elements, <dialog>, unresolved ' +
      'aliases, and comments proven to PASS.',
  )
  return 0
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest()

  const updateBaseline = process.argv.includes('--update-baseline')

  const files = sourceFiles(join(ROOT, 'packages'))
  if (files.length < FILE_FLOOR) {
    console.error(
      `::error::scanned ${files.length} source file(s) under packages/, below the floor of ${FILE_FLOOR}. ` +
        'That is a broken read, not a clean tree. Refusing to report a pass.',
    )
    return 2
  }

  const problems = []
  const unresolvable = []
  let nativeTagsSeen = 0
  let componentTagsSeen = 0
  let aliasesResolved = 0
  for (const f of files) {
    const source = readFileSync(f, 'utf8')
    for (const { tag } of offendingUses(source)) {
      problems.push(`${relative(ROOT, f)} has a <${tag}> whose only boundary is border-border`)
    }
    for (const { tag, expr } of unresolvableClassNameUses(source)) {
      unresolvable.push(`${relative(ROOT, f)} has a <${tag}> whose className is not provably literal: ${expr}`)
    }
    nativeTagsSeen += nativeControlTagCount(source)

    const component = offendingComponentUses(source)
    componentTagsSeen += component.seen
    aliasesResolved += component.aliases.size
    for (const { tag } of component.hits) {
      problems.push(`${relative(ROOT, f)} has a <${tag}> component whose only boundary is border-border`)
    }
    for (const { tag, expr } of component.unresolvable) {
      unresolvable.push(
        `${relative(ROOT, f)} has a <${tag}> component whose className is not provably literal: ${expr}`,
      )
    }
  }

  if (componentTagsSeen < COMPONENT_TAG_FLOOR) {
    console.error(
      `::error::matched ${componentTagsSeen} component control tag(s) under packages/, below the floor of ` +
        `${COMPONENT_TAG_FLOOR}. That is a broken component-tag read, not a clean tree. Refusing to report a pass.`,
    )
    return 2
  }
  if (aliasesResolved < ALIAS_FLOOR) {
    console.error(
      `::error::resolved ${aliasesResolved} control-import alias(es) under packages/, below the floor of ` +
        `${ALIAS_FLOOR}. That is a broken alias read, not a clean tree. Refusing to report a pass.`,
    )
    return 2
  }

  const summary =
    `check-control-boundary-contrast: ${files.length} source file(s) under packages/ examined; ` +
    `${nativeTagsSeen} native control tag(s) seen, ${componentTagsSeen} component control tag(s) seen, ` +
    `${aliasesResolved} control-import alias(es) resolved; ${problems.length} violation(s), ` +
    `${unresolvable.length} unresolvable className(s) not counted either way (see below).`

  if (updateBaseline) {
    writeBaseline(BASELINE_FILE, {
      _doc:
        'Banked native + component control-boundary-contrast violation count for THIS repo (packages/). ' +
        'Written by scripts/check-control-boundary-contrast.mjs --update-baseline. Fails on any RISE and ' +
        'on any UNBANKED FALL (equality ratchet — bsuite D-87). Never hand-edit; state WHY a number moved ' +
        'in the commit that re-banks it.',
      findings: problems.length,
      scanned: files.length,
      nativeTagsSeen,
      componentTagsSeen,
      aliasesResolved,
      banked: new Date().toISOString().slice(0, 10),
    })
    console.log(summary)
    console.log(`\nbanked ${problems.length} finding(s) / ${files.length} scanned to ${BASELINE_FILE}`)
    return 0
  }

  if (problems.length) {
    console.error('CONTROL BOUNDARY BELOW 3:1 (WCAG 2.1 SC 1.4.11):')
    for (const p of problems) console.error(`  ✗ ${p}`)
    console.error('')
    console.error(
      "Use 'border-border-interactive' (4.15:1 light / 6.20:1 dark) instead of the bare divider " +
        "token 'border-border' on native input/select/textarea/button elements, OR on a component " +
        'wrapping one (Button, Input, Select, Checkbox, … — see CONTROL_COMPONENTS and the resolved ' +
        'import aliases). If the element is a container edge rather than a form control, this gate does ' +
        'not apply to it. New violations here are NOT tolerated — only the count already banked in ' +
        `${BASELINE_FILE} is (a ratchet, not a free pass); see that file's own violations for the ` +
        'pre-existing set this PR deliberately does not fix.',
    )
    console.error('')
  }
  if (unresolvable.length) {
    console.warn(
      'UNRESOLVABLE className(s) — NOT counted as a violation OR a pass (crm7#2424):',
    )
    for (const u of unresolvable) console.warn(`  ?  ${u}`)
    console.warn('')
    console.warn(
      'This gate reads a tag\'s own literal source text; it cannot see a className computed by a ' +
        "helper function, a bare variable, or any call other than cn()/clsx()/classNames()/cx(). Each " +
        'line above is a control whose real className this scan could not prove safe OR prove unsafe — ' +
        'go read it by eye (see crm7#2423 for a confirmed real instance of this exact shape). This list ' +
        'NEVER fails the build and is NOT part of the banked ratchet: it reports a scanning gap, not a ' +
        'violation count, and the true violation total is >= the number above, never exactly it.',
    )
    console.warn('')
  }
  console.log(summary)

  const ratchet = compareRatchet({
    file: BASELINE_FILE,
    findings: problems.length,
    scanned: files.length,
    mode: 'equality',
    label: 'control-boundary-contrast',
    scriptPath: 'scripts/check-control-boundary-contrast.mjs',
  })
  console.log(`\n${ratchet.message}`)
  return ratchet.ok ? 0 : 1
}

process.exit(main())
