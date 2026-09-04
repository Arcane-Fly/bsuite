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
 * carries at least one interaction or component-state variant — `hover:`,
 * `focus-visible:`, `group-hover:`, `data-[state=open]:`, `aria-expanded:`,
 * `disabled:` — because that is a reveal-on-interaction accent whose RESTING
 * state carries no visible border to begin with. See RESTING_VARIANT_RE.
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
const BASELINE_FILE = join('scripts', 'control-boundary-contrast-baseline.json')

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
 * query, a direction, a container query or a structural position. A
 * `border-border` behind one of these is as bare as one with no variant at
 * all (bsuite FOLLOW 68: `dark:border-border` is the resting dark-mode
 * boundary, and it had been walking through the `:` exemption). Any other
 * variant (`hover:`, `focus-visible:`, `group-hover:`, `data-[state=open]:`,
 * `aria-expanded:`, `disabled:` …) is an interaction or component state and
 * stays exempt — the resting boundary must be drawn by a different token.
 */
const RESTING_VARIANT_RE =
  /^(dark|light|sm|md|lg|xl|2xl|max-[\w-]+|min-[\w-]+|print|screen|portrait|landscape|motion-safe|motion-reduce|rtl|ltr|contrast-more|contrast-less|forced-colors|supports-.+|@.+|first|last|only|odd|even|first-of-type|last-of-type|empty|\*|\*\*)$/

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
 * paints the control's default boundary. An arbitrary variant (`[&:hover]`)
 * counts as interaction when it names hover/focus/active, resting otherwise.
 */
function variantsAreAllResting(chain) {
  const parts = splitVariants(chain.replace(/^!/, ''))
  if (parts.length === 0) return true
  return parts.every((v) => {
    // word-bounded: `[data-inactive]` must not read as `active`
    if (v.startsWith('[')) return !/\b(hover|focus|active)\b/i.test(v)
    return RESTING_VARIANT_RE.test(v)
  })
}

/**
 * Bare `border-border` hits inside a tag's text: no variant, or only resting
 * variants (see RESTING_VARIANT_RE). A following `-` means a longer,
 * already-registered token (`border-border-interactive`,
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
      if (!variantsAreAllResting(chain)) continue
    }
    hits.push(at)
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
  let seen = 0
  const tagRe = /<([A-Z][\w$]*)(?=[\s/>])/g
  let m
  while ((m = tagRe.exec(stripped))) {
    const tag = m[1]
    if (!CONTROL_COMPONENTS.has(tag) && !aliases.has(tag)) continue
    seen++
    const tagText = extractOpeningTag(stripped, m.index)
    if (bareBorderBorderHits(tagText).length > 0) hits.push({ tag })
    tagRe.lastIndex = m.index + tagText.length
  }
  return { hits, seen, aliases }
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
    'allows group-hover:border-border and data-[state=open]:border-border',
    offendingUses(
      '<button className="group-hover:border-border data-[state=open]:border-border">Go</button>',
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
  let nativeTagsSeen = 0
  let componentTagsSeen = 0
  let aliasesResolved = 0
  for (const f of files) {
    const source = readFileSync(f, 'utf8')
    for (const { tag } of offendingUses(source)) {
      problems.push(`${relative(ROOT, f)} has a <${tag}> whose only boundary is border-border`)
    }
    nativeTagsSeen += nativeControlTagCount(source)

    const component = offendingComponentUses(source)
    componentTagsSeen += component.seen
    aliasesResolved += component.aliases.size
    for (const { tag } of component.hits) {
      problems.push(`${relative(ROOT, f)} has a <${tag}> component whose only boundary is border-border`)
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
    `${aliasesResolved} control-import alias(es) resolved; ${problems.length} violation(s).`

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
