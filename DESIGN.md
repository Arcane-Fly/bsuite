# DESIGN.md — the judgment layer

**Read this before you change anything a person looks at.** It is one of three layers, and it
is the only one that holds *taste, priority and the reason a rule exists*. It deliberately
contains no token values, no per-app exceptions and no pixel measurements — those belong to
the other two layers, which are named below and which you must go and read when you need a
number.

Until 2026-09-03 this layer existed only as the `bsuite-brand-system` skill, which only Claude
Code loads. Every hermes and OpenRouter lane designed blind. That is what this file fixes: it
lives in the repository, so every lane can read it.

## The three layers, and the routing rule

The model is Vercel's `design.md` (31 Aug 2026), recorded in
`docs/audits/20260903-week-in-review-estate-audit-and-remediation-v1.00W.md` §9, verbatim:

> Guidance for agents is managed like software with a lifecycle. Vercel's design.md
> (31 Aug 2026) is three layers: a prose file for judgment, a stylesheet for reusable
> mechanics, and deterministic checks for anything a machine can test. **Every correction is
> routed to exactly one layer**; the same seven eval scenarios are rerun after every change;
> each kind of complaint is counted over time and a fix whose complaint does not become rarer
> is refined; final changes stay human-reviewed.

Measured by Vercel across six pages: 39 known failures with the file against 91 without —
57% fewer — and none of the six shippable without correction after 200+ runs. The file is not
a substitute for review. It is what stops the same correction being given a fourth time.

| Layer | What it is here | You go there for |
|---|---|---|
| 1 — prose, judgment | **this file** | why a rule exists, what wins when two rules collide, what we already decided |
| 2 — stylesheet, mechanics | `packages/theme` (`@bsuite/theme`) and the `--role-*` tokens it exports | every colour, font, shadow, radius and elevation **value** |
| 3 — deterministic checks | the theme gate scripts below | whether the code actually obeys |

### Layer 3 by name

`scripts/theme-gates.sh` is the terminal verifier — one command, binary. It runs G1–G4,
G10–G13, R1, O1 and C4 statically, then per-app builds and tests, and it prints the two gates
it did **not** run rather than staying silent about them. Everything it drives, plus the
siblings CI drives directly (`.github/workflows/theme-conformance.yml`):

| Script | Role |
|---|---|
| `scripts/theme-gates.sh` | the entry point; runs the static gates, then builds and tests |
| `scripts/audit-d2c-theme.sh` | the C1–C4 scan (pure endpoints, non-oklch, palette bypass, destructive) |
| `scripts/theme_audit_lib.py` | shared scan library — not a gate |
| `scripts/audit-palette-whitelist.py` | G2: only contract colours in `packages/` |
| `scripts/audit-oklch-lightness.py` | near-pure lightness sweep |
| `scripts/audit-token-ownership.sh` | G4: no app redeclares a package token |
| `scripts/audit-invalid-utilities.sh` | G10: no silently-dropped utility classes |
| `scripts/check-dimmed-text-tokens.sh` | G12: no AA-tuned text token carries an opacity modifier |
| `scripts/check-fill-token-as-text.sh` | G13: fill-token-as-text does not grow |
| `scripts/check-colour-ban-reaches-converters.mjs` | the ban reaches the export/convert paths |
| `scripts/codemod-inline-colour-styles.mjs` | G11 in dry mode: no new inline colour styles |
| `scripts/audit-one-shot.mjs` | O1: no new cross-app entity writes |
| `scripts/verify-esm-imports.sh` | G9: packages import under Node ESM |
| `scripts/audit-routes.sh` | R1 inventory, R2 the signed-in per-page sweep |
| `scripts/theme-session.sh` | mints the signed-in session R2 needs |
| `scripts/theme-gates-browser.sh` | G5/G6 in a real browser, all six apps |
| `scripts/audit-applied-tokens.mjs` | G5/G6: the ramp and the font reach the DOM |
| `scripts/audit-ui-pages.mjs` | per-page UI sweep |
| `scripts/audit-hittable-actions.mjs` | every action is reachable and hittable |
| `scripts/audit-legibility.mjs` | measured legibility on rendered pages |
| `scripts/check-theme-gate-app-lists.mjs` | the visual gate installs every app it then drives |
| `scripts/test-theme-audit-gates.sh` | the self-test: proves the scanners can fail |

Twenty-two files; twenty-one gates and one library. (§7 C11 says "fifteen siblings" and §9
says "sixteen theme scripts". Both undercount — measured 2026-09-03 by resolving every
`scripts/*.{sh,mjs,py}` reference out of `theme-gates.sh`, `theme-gates-browser.sh`,
`audit-d2c-theme.sh`, `test-theme-audit-gates.sh` and `theme-conformance.yml`.)

**Only G5/G6 and R2 measure what a user sees.** Every other gate can be satisfied by a token
nothing consumes — which is exactly how a six-level heading ramp shipped, passed everything,
and rendered as one flat colour. A green static sweep is not evidence that anything reached a
screen.

## The two brands

| Brand | Apps | Stylesheet | Identity |
|---|---|---|---|
| D2C Neon Electric | crm7, conduit, business-suite-unified, R80.4, throughput | `@bsuite/theme/css` + `@bsuite/theme/preset-v4.css` | electric blue primary, cyan accent |
| Corporate Braden | braden (braden.com.au) | `@bsuite/theme/braden-css` | Braden red primary, gold accent, Montserrat headings |

Never mix them. D2C glow, neon gradients and the electric palette never appear on
braden.com.au; corporate red/gold never appears in a webapp as anything but data. Each D2C app
additionally sets one `--app-accent` (`vars.css`) — that divergence is intended and is the
only per-app colour freedom there is. Both brands ship the same role names, so a component
written against roles works on either without a branch.

## Priorities, in order

When two of the rules below collide, the higher number loses.

1. **Legibility and non-colour signalling.** Colour is never the only signifier — shape, icon
   or label always carries the meaning too. This is why a Braden destructive button must say
   "Delete": since 2026-08-10 its primary and its destructive are both red, separated by
   lightness, and under deuteranopia lightness is nearly all that survives.
2. **Separation of semantic roles under colour-blind simulation.** The invariant is
   *separation*, not a fixed hue. Never put two cool hues in opposition.
3. **The token contract.** Bind to roles. A value typed into a component is a second source of
   truth and it will drift — that is not a prediction, it is what happened to this package's
   own README three times.
4. **The operator's standing asks** — everything on the page editable in place; anything
   tabular in the Airtable style; one visual language across the six apps.
5. **Brand identity.** Which is *fourth*: a recognisable red that nobody can read is worse
   than a legible one that is slightly off-brand.
6. **Density and polish.** Real, and last.

## Known answers

Each was decided once, at a cost. Do not re-derive them and do not re-litigate them.

### Error is red. Never purple. 2026-08-02

**Why:** under protanopia, Electric Purple measured ΔE **0.006** against primary blue — the
destructive colour and the primary action colour were the same swatch. The invariant is
maximal separation from `--role-primary`, and D2C's primary is blue, so error is red. Purple
and indigo are quarantined from semantics entirely; warning separates from error by
*lightness*, not hue, because under deuteranopia everything warm collapses to yellow.
**Where:** the value in `packages/theme/src/css/vars.css` (Layer 2, and tenant override is
blocked on it); enforced by C4 in `audit-d2c-theme.sh`. Braden inherits the *same* error red
by operator ruling 2026-08-10 — recognition beats palette separation.
**History:** the rule survived in three places after it was overturned — an sRGB fallback
block (deleted), this package's README (corrected 2026-09-03), and the C4 comment in
`audit-d2c-theme.sh` (corrected 2026-09-03).

### No pure white, no pure black. In any role, alpha included. 2026-08-02

**Why:** eye strain over long sessions. The rule was originally scoped to text only, and that
scoping is what let `--light-bg-accent` ship as `oklch(1 0 0.5)` and render every shadcn card
and popover pure white. "White" here means the lightest surface token, not `#fff`.
**Where:** the values in `vars.css`; enforced by G1 in `theme-gates.sh` as a **ratchet**
against `.github/theme-c1-baseline.txt`, plus `packages/eslint-config/rules/no-text-white.js`
(check that your app's own `eslint.config.*` actually loads it — the shared config is not
universally consumed). A deliberate
exception (a `prefers-contrast: high` block, a mask gradient where the channel is opacity)
carries an inline `theme-audit-ok` marker — that is the only way to keep one.

### Bind to roles, never to palette names or literals. Standing

**Why:** a palette-bound component is invisible to tenant white-labelling — `bg-red-500`
cannot be re-themed, `bg-role-error` can. Palette names are presentational; roles are the
contract.
**Where:** enforced by C3 in `audit-d2c-theme.sh` (hard zero) and G11 for inline `style`
attributes. An arbitrary value wrapping `var(--token)` is a token *reference* and is correct;
a literal inside the brackets is a bypass.

### A utility whose token is not registered emits nothing. Standing

**Why:** Tailwind v4 generates a rule only for a token declared in `@theme`. `bg-bg-shell-elevated`
and `border-border-shell` are not, so the built CSS contains no such rule, the element renders
unstyled, and typecheck, lint and tests are all blind to it — the class name is a valid string.
170 sites in business-suite-unified alone, introduced by a class sweep in May 2026 that
replaced working arbitrary-property syntax. Registered as D-149; the same class had already
been raised as D-100, D-101 and D-136.
**Where:** `scripts/audit-invalid-utilities.sh` (G10). The check is the answer here; this entry
exists because the *symptom* — an element that looks unstyled — reads as a build or deploy
problem and gets diagnosed as one.

### A correct token in the repo is not a correct computed value. 2026-09-01

**Why:** `suite.crm7.app/login` rendered in Times. The served stylesheet was already correct,
every font file returned 200, and the build was current. `BrandingProvider` was writing
`--font-body: Geist` **inline on `<html>`** at runtime, which beats every stylesheet, and bare
`Geist` matches no registered face (the family is `"Geist Variable"`). A `font-family` naming
an unknown family with no fallback lands on the browser default, which is Times. Removing one
inline property took the heading from 242px to 274px.
**Where:** prose only, because it is a method: before blaming a build, a version, a lockfile
or a deploy, fetch the live stylesheet and check `element.style` on `<html>`. And **look at
the page** — a screenshot showed instantly that every element was serif, not just the heading
being measured.

### Never emit a bare font family name. 2026-09-01

**Why:** the same incident. Any code that writes a `font-family` must append the fallback
chain, and must resolve an alias to the family actually registered. An unknown family degrades
to Times, not to system sans.
**Where:** the `--font-*` tokens in `vars.css` all carry their stacks; the runtime writer is
`useBranding`'s sanitiser. G5/G6 (`audit-applied-tokens.mjs`) is the only check that can catch
a regression here, because it reads the DOM rather than the source.

### A cell shows one line. A field that does not fit becomes its own column. 2026-09-02

**Why:** `@bsuite/data-grid`'s `GridCell` renders inside `truncate` (`white-space: nowrap`) in
a box of exactly `rowHeight` (32px) with `overflow-hidden`. Anything taller is clipped
mid-glyph, which on screen reads as *text overlapping the row below* — which is how the
operator reported it. Three cells on `/reports` shipped that way with every gate green.
**Never** fix it by raising `rowHeight`: four lines do not fit 48px either, and a taller row
costs every other column. A new column is also the Airtable behaviour that was asked for, and
it is sortable and hideable, which a second line is not.
**Where:** prose only. It is a layout constraint of one component, expressed nowhere in its
types; a caller writing `renderCell` gets no signal that block content is illegal. Countable
by hand: scan `renderCell` bodies for `space-y-`, two sibling `<p>`, or `flex-wrap`.

### No trailing margin inside an autoHeight measure wrapper. 2026-08-28

**Why:** `PageGridLayout` sizes an autoHeight card from `contentRect.height` on the measure
wrapper. That wrapper had no padding, border or formatting context, and under autoHeight its
parent is `overflow-visible` — so a last child's `margin-bottom` collapses through both and
never reaches the measurement. The grid then allocates too few pixels and the card's bottom
border sits outside its slot. On production `/payroll/timesheets` a single `mb-8` put the
surface exactly 32px past its own border; `mb-8` is 2rem.
**Where:** fixed in the mechanic — `flow-root` on the measure wrapper, `@bsuite/page-builder`
2.5.0. It is here because the *diagnosis* is the reusable part: when a card overflows its
slot, measure the delta and compare it to the trailing margin of the last child before
touching any arithmetic. 70 `CanvasCard` call sites across 45 files in crm7 begin with a
margin-bearing child, so it is a class.

### The card grid is `react-grid-layout`, not `@dnd-kit`. Standing

**Why:** an agent handed "cards aren't individually draggable" greps for `useSortable`,
`SortableContext` or `DndContext`, finds none on the page in the ticket, concludes the
draggable-card surface does not exist there, fixes that one page and stops. This is the single
most likely reason previous fixes only ever touched one page. `@dnd-kit` is real in this estate
but only for kanban boards, sortable lists and form-layout builders.
**Where:** prose only. Grep for `PageGridLayout`, `DraggableCardPage`, `CanvasCard` and
`react-grid-layout`, and read the consumer's own `package.json` for the version — the shared-
package table in `AGENTS.md` is not maintained for this package. Corner-resize and persisted
per-card layout are **required behaviour**, not a nice-to-have; never simplify them away.

### Reuse the surface that already exists. Standing

**Why:** the operator's standing ask — "anything presented in a table should be in the Airtable
style" — does not need a new component. `@bsuite/data-grid` already is one: virtualised, cell
range selection, keyboard navigation, TSV clipboard round-trip, fill handle, undo/redo, and
`editable: false` per column makes a read-only listing expressible. It had **1** render site
against **215** hand-rolled tables. Same for drag-and-drop canvases (React Flow, 35 import
sites) and the card canvas. A second mechanism beside any of these is the documented failure
this project keeps repeating.
**Where:** ratcheted by `scripts/check-airtable-grid-adoption.mjs` against
`scripts/airtable-grid-adoption-baseline.json` — it fails on a rise *and* on an unbanked fall.
It counts hand-rolled tables, not non-Airtable *surfaces*: 40 pages sharing one
`EnhancedDataTable` are invisible to it.

### Everything on the page is editable, in place. 2026-09-02

**Why, in the operator's words:** *"I'm sick of seeing buttons that go the full width of cards
and not being able to modify it visually. Same with almost every aspect of the on-page
customization features. Half baked. Shows the intent but stopped short of being good let alone
world class."* **"Shows the intent" is the failure signature** — a surface that is recognisable
but not operable is not partially done, it is the defect. The test is on the real thing:
changing how something looks must not mean leaving the page for a settings form and navigating
back to look. Scope must be visible on screen — this element / this page / everywhere — because
a model that cannot express scope produces tenant-wide changes made by accident.
**Where:** prose only, and it is a priority (§4 above), not a check. Do not expose all eight of
width/height/alignment/spacing/size/colour/order/visibility because they are on a list. Decide,
and say what lost.

## What this file does not do

- **No token values.** Not one hex, not one `oklch()`. If you want the number, open
  `packages/theme/src/css/vars.css` or `braden.css`. Every literal ever copied out of those
  files into a document has since disagreed with them.
- **No per-app exceptions.** An app's accent lives in `vars.css`; an app's deliberate opt-out
  carries a `theme-audit-ok` marker at the line it applies to. A file of exceptions is a file
  nobody reads.
- **No pixel measurements, spacing scales or breakpoints.** Those are Tailwind v4 `@theme`
  entries in `packages/theme/src/preset-v4.css`.
- **It does not replace a check.** Where a rule above says "enforced by", the script is
  authoritative and this text is the explanation. If they disagree, the script is right and
  this file is stale — fix it here and say so in the commit.
- **It is not the shadcn/ui or Tailwind manual.** Both are stack doctrine: shadcn primitives
  over raw elements, Tailwind v4 CSS-first configuration, no v3 patterns.

## How a correction is routed and counted

The routing rule, applied here (audit §7 J12):

1. **Can a machine test it? It becomes a check.** First choice, always. A new gate must prove
   it can fail (`--self-test` over a fixture with a planted violation, asserting non-zero, then
   a clean fixture asserting zero) and must be able to tell "checked nothing" from "found
   nothing" — a baseline carries a denominator, and a scan whose denominator falls below the
   banked one fails as *scanned less than banked*. A gate that cannot fail is not a gate, and a
   count taken over rows that cannot match is not a pass.
2. **Otherwise, can it be a shared mechanic? It goes in `packages/theme` or the shared
   component.** Fix the class, not the page. The trailing-margin bug was one `flow-root` in the
   measure wrapper against 70 call sites.
3. **Only what is left — taste, priority, the reason — comes here.** Prose is the layer of last
   resort, because prose is the layer nothing enforces.

**Name the layer in the commit message.** A correction that lands in two layers has a second
source of truth by construction; a correction that lands in none was a conversation.

**Count recurrence, not fixes.** Each class of complaint is counted over time. A fix whose
complaint does not become rarer is not a fix — the class re-opens and the remedy is refined.
D-149 is the worked example: the same defect was raised as D-100, D-101 and D-136 before
anyone measured that it was one class of 170 sites.

**This file is reviewed by a human.** It is guidance for agents; it is not written by agents
unsupervised, and a rule added here without an incident behind it is an opinion wearing a
citation.
