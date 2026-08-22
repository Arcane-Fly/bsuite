# Theme, UI and UX — what is still outstanding

**Date:** 2026-08-10 · **Status:** 1.00W (working) · **Compiled by:** claude-code session `ffb1aa80`

**Sources reconciled:** 7 Claude Code session transcripts for this repo (2026-08-03 → 2026-08-10,

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

~370 MB), git history across the parent and all six submodules on every local and remote branch,
open issues and pull requests in all seven GitHub repositories, the `bsuite_` memory corpus, and
**live re-runs of the theme gates today** rather than a reading of what they said last time.

Glossary, because these codes appear throughout: **gate** = a script that exits non-zero when
something is wrong, so "done" is a command result rather than an opinion. **token** = a named colour
in the theme package (`--bg-shell-elevated`) that pages refer to instead of writing a colour
directly. **utility** = the Tailwind class that binds a token (`bg-shell-elevated`). **E2E** =
end-to-end, a robot that drives the real site in a real browser. **CanvasCard / DraggableCardPage** =
the card-grid system that lets you drag and resize cards on a page. **service worker** = a script a
website installs into your browser that can serve pages even when offline.

---

## The one-paragraph version

The theme work that ran 2026-08-03 to 2026-08-07 genuinely landed: eight automated gates exist, six
pass today, and the two that fail are small. But **the gates only ever look at logged-out pages.**
The browser gate walks six public routes per app; crm7 alone has 375 page files. Every page behind a
login — which is every page you actually use — has never been measured by the instrument that
certifies the theme. That is why gates were green on pages you could see were wrong. Underneath it,
about **400 inline colour styles across five apps cannot be converted because roughly fifteen
utilities do not exist in the theme package** — the same defect shape recorded in the precedent book
as "a banned value with no replacement gets retyped". Separately, the card-drag-and-resize system you
ruled non-negotiable is live in crm7 and effectively absent from the other five apps, and R80.4 has a
production defect that shows a blank page to anyone who used r8.crm7.app while R80.3 was there.

---

## A. Theme conformance — gate status as at today

Run: `bash scripts/theme-gates.sh --quick` plus `scripts/verify-esm-imports.sh` separately.

| Gate | What it proves | Result today |
|---|---|---|
| G1 | No new pure white/black in any role | ✅ pass |
| G2 | Only contract colours inside `packages/` | ✅ pass |
| **G3** | **No palette bypass in app source** | **❌ 2 in crm7** |
| G4 | No app redeclares a package-owned token | ✅ pass |
| G9 | Shared packages import under Node | ✅ pass — 39 packages |
| G10 | No silently-dropped utilities | ✅ pass |
| **G11** | **No new convertible inline colour styles** | **❌ 1 in crm7** |
| O1 | No new cross-app entity writes | ✅ pass |
| C4 | Destructive colour matches the contract | ✅ pass |

**G3** — the audit's file list names `crm7/src/index.css`,
`crm7/src/components/admin/InterpretationRulesTab.tsx`,
`crm7/src/components/admin/GrantsConsole.tsx` and `packages/theme/src/react/components/StatusBadge.tsx`.
Both admin files landed in the last two days with the `/admin/data` work — the gate caught a
regression, which is the gate working.

**G11** — one binding, in `crm7/src/pages/people/onboard.tsx`: `style={{ color: 'var(--color-warning)' }}`
should be `text-warning-text`. One-line fix.

**Resolved since the theme lane's last handoff** (recorded here so nobody re-opens them): the
`@bsuite/page-builder` / `@bsuite/schema-builder` Node-import failure was settled as *browser-only*
and the ESM gate now skips them deliberately, not accidentally.

**Still an operator call, unresolved since 2026-08-02:** braden.com.au's Corporate error colour. The
theme contract requires the error hue to be separable from the primary under colour-blindness — and
braden's primary *is* red. There is no answer an agent can invent here.

---

## B. The 400 retyped colours — one fix, fifteen tokens

`node scripts/codemod-inline-colour-styles.mjs <app>` converts inline colour styles into theme
utilities automatically. It converted **1** binding today and left **665** alone. Of those, 256 are
computed at runtime and genuinely cannot be converted. **The remaining ~409 are blocked on a
missing utility** — the token exists conceptually, nothing in the theme package binds it, so every
developer who needed it typed the raw variable instead.

| App | Left unconverted | Runtime (unfixable) | **Blocked on a missing utility** |
|---|---|---|---|
| crm7 | 449 | 123 | **~326** |
| business-suite-unified | 143 | 83 | **60** |
| conduit | 34 | 16 | **18** |
| throughput | 11 | 8 | **3** |
| braden | 27 | 26 | **1** |
| R80.4 | 1 | 0 | **1** |

The whole backlog is roughly fifteen names:

| Missing utility | Sites | Missing utility | Sites |
|---|---|---|---|
| `--bg-shell-elevated` | **177** | `--color-success` | 14 |
| `--bg-shell-accent` | 46 | `--bg-shell-chrome` | 8 |
| `--border-shell` | 33 | `--bg-shell` | 5 |
| `--accent-primary` | 29 | `--bg-footer` | 3 |
| `--accent-secondary` | 27 | `--color-muted-foreground`, `--destructive` | 2 each |
| `--color-warning` | 19 | `--primary`, `--role-primary`, `--braden-gold` | 1 each |

**Recommendation:** add these utilities to `@bsuite/theme`, publish, then re-run the codemod with
`--apply` across all six apps. This is a package change plus a mechanical sweep, not 400 hand edits,
and it converts the largest remaining body of theme drift in one pass. `--bg-shell-elevated` alone is
177 sites and is what every card surface in crm7 is painted with.

---

## C. The measurement gap — the finding that matters most

**Every gate above reads source files. The one gate that opens a real browser
(`scripts/theme-gates-browser.sh`) walks six routes per app, all of them logged out.**

```
crm7                     /  /login  /404  /unauthorized  /privacy  /terms
conduit                  /  /login
business-suite-unified   /  /login  /auth/callback
R80.4                    /  /login
throughput               /  /login
```

Against: **375** page files in crm7, **99** in business-suite-unified, **36** routes in conduit. The
script says so itself at line 28 — authenticated routes are excluded by design because "they cannot
be reached without a session and would only ever report SKIPPED."

So the contrast checks, the heading-ramp check, the "nothing is invisible" check and the focus-ring
check have **never run on a single page you use.** When you said a page looked wrong and the gates
were green, both were true.

**The same shape, one layer down:** every authenticated end-to-end test in crm7 skips itself when the
login credential is absent, and the workflow then reports green. There are **32 such skip sites** in
`crm7/tests/e2e/` alone. A skip is coverage you do not have; it has been reading as a pass all week.

**This is a gap of one script, not a program.** `scripts/audit-applied-tokens.mjs` has accepted a
`--storage` flag (a saved logged-in session) the entire time — nothing has ever produced the input.
The recipe for making that session is already written up and proven in `bsuite_open_work_register`
(W2): create the user, complete onboarding through the app's own form, seed a subscription row,
dismiss the first-run wizard, clean up afterwards. Each of those steps is there because skipping it
silently measures the wrong page.

**Recommendation: do this before any further theme work.** Until it exists, no claim about the theme
covers the product.

---

## D. Card drag-and-resize — your standing ruling holds in one app out of six

You ruled card resize non-negotiable. Files using `DraggableCardPage` / `CanvasCard` / `@bsuite/page-builder`:

| crm7 | business-suite-unified | conduit | throughput | braden | R80.4 |
|---|---|---|---|---|---|
| **382** | 4 | 11 (plumbing only, no page uses it) | 2 | 2 | **0** |

conduit has the package installed and an adapter written; no conduit page is built on it. This is
tracked as **bsuite#479** (filed 2026-07-28, untouched since) and it is the mechanical cause of your
2026-08-03 note that "conduit looks ok, but very basic — no expanding navigation, borders and heading
levels unstyled, no dnd-kit page editor at all."

---

## E. Your own UI reports, still open

### From 2026-08-03 (the walk-through of d.crm.crm7.app and d.conduit.crm7.app)

| Item | App | State |
|---|---|---|
| Cards above the Canvas Editor cannot be moved or resized | crm7 | open — listed as out-of-scope in the theme DoD, never re-homed |
| Columns slider ignored; cards always go full width | crm7 | open |
| No dnd-kit page editor at all | conduit | open — see §D |
| Navigation absent on some pages | conduit | open |
| Field Officer Portal opens a candidate with no way out | conduit | open |
| No filters on Field Officer Portal (region, job) | conduit | open |
| Logo is not the one uploaded in BSU branding | crm7 | crm7 landing page fixed `2fb338f6`; conduit's portal branding fixed `155358d`. Worth a re-look on the pages you saw it. |

### From the operator UX bug register (`docs/20260728-operator-ux-bug-register-v1.00W.md`)

Its own closing line lists what was never implemented: **#1** emails cannot be opened or read (the
Sent/SMS/Internal/All tabs have no row-click and no detail view — a new component is required),
**#6** dashboard edit-in-place, **#7/#20** portal delivery, **#21** client→host one-shot, **#22**
pipeline from conduit, **#15** documentation screenshots, **#3/#3b/#3c** platform card invariant,
**#11** charge-rates advanced config (still a read-only list of package defaults; the award you pick
is discarded by `const [, setSelectedAward]`).

### R80.4 — from today's carry-over register

**P0, and it should go first: r8.crm7.app is blank for anyone who used it while R80.3 was live.**
R80.3 installed a service worker into every visitor's browser; it is still serving R80.3's cached
page, whose twenty files were deleted. It cannot self-heal, because the browser looks for `/sw.js` to
update itself and R80.4 does not ship one. **Confirmed today: `R80.4/public/` does not exist, so the
kill-switch has not been written.** The fix is a small self-destroying `sw.js` that clears the cache,
unregisters itself and reloads. Until it ships, an unknown number of browsers — possibly yours —
cannot see any R80.4 work at all, so none of the UI items below can even be reviewed.

Then: the trade/occupation selector is invisible rather than disabled when no award is chosen (this
complaint is now three-for-three: 05 Aug, 06 Aug, 10 Aug — a one-line fix); cards cannot be dragged up
into blank space; Employment & Hours still does not default beside the Fair Work MAPD card; large
screens waste width; billing models want named saveable presets instead of the fixed
Standard/ALEX/52-week trio.

---

## F. Live defect visible in the screenshot you sent — crm7 `/people/onboarding`

Two things, both real, both in `crm7/src/pages/people/onboarding.tsx`.

**1. The numbers contradict each other.** "Total Onboarding 15" sits beside "In Progress 25" and
"Cannot Be Paid 25". They are counted over two different populations: `total` is
`recentlyCreated.length` — people created in the last 90 days (line 155) — while every other tile
counts `onboardingPeople`, which has no date filter (line 135). A row of tiles that reads as a
breakdown of a total is not one. Either scope them all to 90 days, or drop the "Started in last 90
days" subtitle and label the total honestly.

Separately: "Cannot Be Paid 25" equals "In Progress 25" exactly. Every person in progress is flagged
as missing bank, tax or super details. That may be true, but it is the signature of a check that
returns the same answer for everyone and is worth confirming against the database before anyone
trusts the tile.

**2. Each card sits in a cell about twice its own height.** `CanvasCard` defaults to `h = 6`
(192 pixels) with `autoHeight` on, so the row is supposed to shrink to the content. It is not
shrinking. `DraggableCardPage.tsx` carries a `LAYOUT_EPOCH = 101` specifically to reset saved layouts
that predate the auto-height default; this page passes no `layoutVersion` of its own. Needs a
signed-in check with the saved layout inspected — this is exactly the class of thing §C's missing
gate would have caught.

---

## G. Styling issues filed and never touched

All filed 2026-07-28; none has moved since.

| Issue | Title | Note |
|---|---|---|
| crm7#1271 | `grid-cols-2` without responsive breakpoints — "109 occurrences, systemic" | **Re-measured today: 470 occurrences across 240 files.** It has more than quadrupled since filing. Every one is a two-column grid that stays two columns on a phone. |
| crm7#1272 | Remaining MEDIUM/LOW — tokens, borders, sticky bars, truncate | |
| business-suite-unified#622 | `min-h-screen` + responsive grids | |
| conduit#394 | Dialog/form grid breakpoints + dialog overflow | |
| braden#358 | `h-screen`/`100vh` → `svh`, kanban column width | `100vh` on a phone is taller than the visible screen; `svh` is the fix |
| crm7#1263 | Decompose host-employer portal into individual CanvasCards | |
| crm7#619 | Scroll regression on multi-section forms outside `/people/new` | |
| crm7#377 | `@bsuite/page-builder` mobile reflow — single-breakpoint layouts squash on a phone | Root cause already diagnosed in memory (`bsuite_pagebuilder_mobile_reflow_upstream`) |
| bsuite#479 | PageGridLayout rollout — 41 crm7 pages plus conduit, throughput, braden | §D |
| bsuite#635 | BSuite Unified Design Language rollout — 9-wave tracker | |
| crm7#1281 | Undo/redo for in-page canvas editing | |
| bsuite#547, #548 | Snap modifier + alignment guides; multi-select on canvas | |
| bsuite#937–939 **and** #554–556 | Breakpoint switcher, global symbols, AI prompt-to-section | **These are duplicates — six issues, three pieces of work.** Close one set. |

---

## H. Two UX programs that are scoped and stalled

**1. The reporting / bulk-import / developer-console program.** A 409-line analysis exists at
`docs/plans/https-crm-crm7-app-reports-custom-create-distributed-origami.md` — and it is **untracked
in git**, so it is one `git clean` away from gone, and it carries a machine-generated filename that
breaks the documentation naming convention. It answers your 2026-08-06 brief (make
`/reports/custom/create` real, make `/developer/tables` useful, give every tier a safe bulk import and
bulk update). Its headline finding: *"billable hours per month" is not a configuration, it is a
migration* — the report engine can query one table with no joins and no grouping, or call one of 16
hand-written functions. Seven decisions (D1–D7) sit unanswered, D1 being which grid technology to
build on. **Recommendation: commit it under a conforming name today, then answer D1–D7.**

**2. The document and template authoring program** (`bsuite_task_document_authoring_program`,
queued 2026-08-07, unstarted). Your bar: a GTO admin who has never written code uploads their Word
handbook, sees it editable with formatting intact, picks "Apprentice first name" from a list and gets
an inline chip, previews it filled with real data, publishes, assigns, tracks acknowledgement.
Today: **nothing in any of the six apps can read a `.docx` file**, and merge fields are hand-typed
`{{variable_name}}` into a plain textarea with no field list and no validation — type `{{frist_name}}`
and nothing tells you. The pieces are largely installed and unwired (Plate.js is there with no
toolbar; `@platejs/mention`, which is exactly the chip mechanism, is installed and never used). The
trap: roughly 30 tables in this space, five parallel "document" concepts and three "template"
concepts, nearly all at zero rows. Which ones survive has to be decided before anyone builds.

---

## What I would do, in order

1. **Ship the R80.4 service-worker kill switch.** Small, safe, and until it lands you may be looking
   at a blank page while being told the work is deployed.
2. **Build the signed-in theme audit** (§C). One script, one proven fixture recipe. Every theme claim
   made to date is a claim about the logged-out surface, and this is what converts it into a claim
   about the product.
3. **Add the fifteen missing utilities to `@bsuite/theme`, publish, run the codemod with `--apply`**
   (§B). One package change clears roughly 400 sites of drift mechanically.
4. **Fix the two failing gates** (§A) — three files, one of them a one-line class swap.
5. **Answer the braden error-hue question** (§A) and **D1–D7** on the reporting program (§H). These
   are the only items on this page that genuinely need you rather than an agent.
6. **Then the layout work:** conduit onto the card grid (§D), your 2026-08-03 list (§E), and the
   onboarding page (§F).

Items 1 and 4 are same-day. Item 2 is the one that changes what "done" means.
