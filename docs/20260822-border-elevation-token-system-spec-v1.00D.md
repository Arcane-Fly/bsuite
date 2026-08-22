# Border, Surface & Elevation Token System — Remediation Spec

**Status:** DRAFT — spec only, not implemented
**Date:** 2026-08-22
**Author:** agent session (Cowork), read-only pass
**Scope:** D2C Neon Electric estate — crm7, business-suite-unified (BSU), conduit, R80.4, throughput.
`braden` (Corporate) is **out of scope** and must not receive any change in this spec.
**Trigger:** operator report — borders and theming across the estate need drastic improvement,
raised from CRM7 `/insights` (dark, ~1440 desktop).

---

## 0. TL;DR — what is actually wrong

The operator's instinct was right: **the accent colour is doing structural work, and depth is
being faked with edges instead of elevation.** The proposed *mechanism* was wrong, and the wrong
mechanism would have sent the fix to the wrong file.

| | Operator hypothesis | Measured reality |
|---|---|---|
| Where the neon edge comes from | `border-color` set to the accent | **`box-shadow`** — a `0 0 0 1px` spread ring in Electric Cyan at 30% alpha, plus a 14px cyan glow at 35% |
| What `--border` actually is | the accent | **neutral** — `oklch(0.428 0.0147 248.2)`, chroma 0.0147 |
| Nesting depth | 4 bordered levels | **2 bordered levels, drawn 1px apart, visually identical** — plus 2 more levels that paint radius/tint |
| Why it reads as "everything is selected" | resting border uses accent | resting **ring** uses accent, at the *same* alpha (0.3) as the active nav item's border |

**Root cause (corrected):**

> Dark-mode elevation is implemented **entirely as accent colour** — an accent ring plus an accent
> glow — with no achromatic value step. The surface scale is flat (ΔL ≈ 0.002–0.065 between
> adjacent levels), so surfaces cannot separate by lightness. Because surfaces do not separate,
> every nesting level must draw its own edge to be visible at all. The four transparent
> `box-shadow` layers that precede the accent ring are the achromatic elevation ramp — **and they
> are fully transparent, i.e. the ramp is dead.**

So there are three defects stacked, and they must be fixed in this order:

1. The elevation ramp resolves to `rgba(0,0,0,0)` — **elevation does not exist**.
2. Because elevation does not exist, the surface scale was never given room — **ΔL ≈ 0**.
3. Because neither exists, the accent ring was pressed into service as the depth cue — **accent
   becomes structure**.

Fixing (3) alone — desaturating the ring — would leave cards with *no* delineation whatsoever.
That is why the ordering matters and why this is a token-layer change, not a component sweep.

---

## 1. Verification of the operator diagnosis

Every point checked on the live `d.` preview, dark and light, with a computed-style probe.
**Confirmed 6 · Corrected 3 · Refuted 2.**

| # | Operator's point | Verdict | Evidence |
|---|---|---|---|
| 1 | Border nesting four levels deep, same colour/weight/alpha | **CORRECTED** | Only **2** levels paint a border, but they are *byte-identical* and 1px apart (GridItem + Card). Levels 0 and 3 paint radius/tint but no border. Net effect is worse than described: **6 edge strokes** delineate one card (glow, ring, border, 1px gap, border, ring). |
| 2 | Neon teal on every container edge = "everything is focused" | **CONFIRMED, wrong mechanism** | The accent edge is `box-shadow: oklch(0.769 0.132 191.7 / 0.3) 0 0 0 1px`. The **active** nav item uses accent at **the same 0.3 alpha**. Resting card and active nav are therefore the same treatment. |
| 3 | Sidebar clipping — "ashboard", icons cut off | **CONFIRMED, cause refuted** | Not margin, not overflow, not transform (`transform:none`, `parentOverflow:visible`, `marginLeft:0`, `scrollWidth==clientWidth`). The Dashboard item renders with **`className=""` and `display:inline`** — height 43px vs 32px for every sibling. It is missing its `SidebarMenuButton` wrapper entirely. |
| 4 | Dotted grid shows through behind/around cards | **CONFIRMED** | Visible in both themes; markedly more intrusive in light, where card surfaces are only ΔL 0.002 above the page. |
| 5 | Empty state oversized | **CONFIRMED, worse than stated** | "Performance Trends" is not merely matched to its neighbour — in light mode it renders **taller** (~260px vs ~195px). |
| 6 | Low-contrast secondary text | **REFUTED** | All six flagged strings measure **6.43:1** against composited background (req 4.5:1). They read weak because of small size (12px) and adjacent glow, not contrast. No change proposed. |
| 7 | Zero-value KPI styled identically to populated | **CONFIRMED** | "0 Pending Assessments" carries identical weight, colour and surface as "42". |
| 8 | Double framing at the top | **CONFIRMED** | Header border sits directly above the page container edge. |
| 9 | Marketing footer inside app chrome | **CONFIRMED** | `© 2026 CRM7 … Manuals · Privacy · Terms · A Braden Group Company` inside the authenticated shell. |
| 10 | Floating mascot overlaps content | **CONFIRMED** | Fixed bottom-right, overlaps the Performance Trends card at 1440. |
| 11 | Corner-radius consistency vs token scale | **CONFIRMED, quantified** | Same card, three radii: 32px → 24px → 12px → 12px. Levels 1 and 2 are 1px apart but differ 24px vs 12px — a 2× divergence producing visible corner crescents. |

### 1a. Defect the operator did not raise — and it is the most serious

**Zero `:focus-visible` rules exist in the entire stylesheet set** (`focusVisibleRuleCount: 0`,
measured across every reachable `document.styleSheets` entry on `/insights`).

Sidebar nav buttons carry `outline-none ring-sidebar-ring`. The ring **variable** resolves
correctly (`--tw-ring-shadow: 0 0 0 calc(2px + 0px) lab(74.67% -44.21 -10.26)`), but no
`focus-visible:ring-*` utility ever composes it into `box-shadow`. Measured on a keyboard-focused
nav item (`:focus-visible` matches **true**):

- `outline-style: none`
- `box-shadow`: all layers `rgba(0,0,0,0)`

**45 of 51 interactive elements (88%) on `/insights` suppress the outline and paint no
replacement.** This is a **WCAG 2.4.7 Focus Visible (AA) failure**, and it is P0 — function and
accessibility, not taste. The operator predicted focus/resting indistinguishability; the real
situation is that focus is not merely indistinguishable, it is **absent**.

---

## 2. Token source-of-truth map

### 2a. Definition sites

| Layer | Path | Role |
|---|---|---|
| **Shared package** | `packages/theme/src/css/vars.css` (782 ln) | Layers 1–5: palette → surface → role aliases → shadcn bridge → `[data-app]` accents |
| **Shared package** | `packages/theme/src/preset-v4.css` (366 ln) | Tailwind v4 `@theme inline` bridge; defines `--shadow-elev-0..4` |
| crm7 | `crm7/src/styles/theme.css`, `crm7/src/index.css`, `crm7/tailwind.config.js` | local overrides |
| BSU | `business-suite-unified/src/index.css`, `…/tailwind.config.js` | local overrides |
| conduit | `conduit/src/app/globals.css`, `conduit/tailwind.config.js` | `@theme` radius scale |
| throughput | `throughput/src/index.css`, `throughput/tailwind.config.js` (near-empty shim) | partial |
| R80.4 | `R80.4/src/index.css` | **no local border/radius/card overrides — cleanest consumer** |
| braden | `braden/src/index.css`, `braden/tailwind.config.ts` | **Corporate — out of scope** |

**`@bsuite/theme` is installed at `^1.0.2` in all six apps.** The `>= 0.11.0` gate for the
`shadow-elev-*` ramp is satisfied everywhere — **the ramp is installed and still resolves to
transparent at runtime.** Version is not the problem; consumption is.

### 2b. Drift — the same semantic token, three values

`--border-color`, light mode:

| Source | Value |
|---|---|
| `packages/theme` canonical `--role-border` | `oklch(0.942 0.005 247.9)` |
| crm7 | `oklch(0.929 0.013 255.5)` |
| BSU | `oklch(0.905 0.009 248)` |

`--radius` — **four incompatible mechanisms; the shared package defines no base value at all:**

| App | Mechanism | Note |
|---|---|---|
| `@bsuite/theme` | **none** | ships no `--radius` |
| crm7 | explicit `--radius-sm/md/lg/xl/full` = 4/8/12/16/9999 | |
| BSU | `--radius: 0.5rem` + calc, **plus a dead duplicate scale** | two systems in one file |
| conduit | Tailwind-v4 native `--radius-*` = 4/6/8/12 | **one tier below crm7 for the same names** |
| R80.4 | none | falls through to Tailwind stock scale |

`--shadow-0..4` is declared **three times** — package, crm7, BSU — with different base ink.

### 2c. Verdict

**There is no single source of truth.** `@bsuite/theme` is *intended* as the source of truth,
is uniformly installed, and is then shadowed by local redeclarations in every D2C app except
R80.4. Two token families (`--radius`, and the per-app accent indirection) have **no canonical
owner at all**.

### 2d. Documentation hazard

`Theme-best-practice.md` — cited by the brand skill and by three live comments in crm7 source —
**does not exist anywhere on disk.** Every other app's comments point instead at
`packages/theme/docs/d2c-theme-source-of-truth.html`. The brand skill should be corrected to
point at the file that exists.

`@bsuite/design-tokens` is an orphaned `dist/`-only artefact with no `package.json`, consumed by
zero apps, referenced once in a BSU README with a wrong version.

---

## 3. Quantified baseline

Measured across `crm7/src`, `business-suite-unified/src`, `conduit/src`, `R80.4/src`,
`throughput/src`, `packages` (node_modules/dist/build/.next/coverage excluded).

| Metric | Count |
|---|---:|
| Border-width utility occurrences | **3,537** |
| Distinct border-**colour** utilities | **184** (2,315 occurrences) |
| Distinct `rounded-*` utilities | **42** (3,792 occurrences) |
| Distinct (colour × width × radius) combinations | **190** (lower bound; static `className` literals only) |
| **Accent-coloured borders — RESTING** | **251** |
| Accent-coloured borders — state variants (`hover:`/`focus:`/`active:`/`aria-selected:`/`data-[state]`) | **79** |
| **Resting : state ratio** | **3.2 : 1** |
| Distinct files with a resting accent border | **173** |

**The 3.2:1 resting-to-state ratio is the headline ratchet metric.** The accent is drawn as
permanent structure three times more often than it is drawn as a state signal. Target: **invert
it** — resting accent borders should approach zero outside deliberate emphasis surfaces.

**Important scoping caveat:** this Tailwind-class count does **not** capture the accent ring,
because the ring arrives via `box-shadow`, not `border-*`. A class grep alone would have missed
the primary defect entirely. Any CI check built from this spec must measure **composited rendered
edges**, not class names.

---

## 4. Worked example — the card, resolved at every nesting depth

**This is the primary deliverable.** CRM7 `/insights`, the "Insights & Recommendations" card,
measured live. Dark first.

### 4a. BEFORE — dark, 1440

| Lvl | Element | Composited bg | Border | Radius | Shadow / ring | Size |
|---|---|---|---|---|---|---|
| 0 | page container `rounded-[32px]` | `oklch(0.126 0.030 264.8)` | — | 32px | achromatic drop | 1269×692 |
| 1 | **GridItem** `rounded-3xl bg-card border border-border` | `oklch(0.191 0.020 262)` | `oklch(0.428 0.0147 248.2)` 1.11px | 24px | **cyan /0.3 ring + cyan /0.35 glow** | 504×222 |
| 2 | **Card** `rounded-lg border border-border bg-card` | `oklch(0.191 0.020 262)` | `oklch(0.428 0.0147 248.2)` 1.11px | 12px | **cyan /0.3 ring + cyan /0.35 glow** | 502×200 |
| 3 | insight row `p-3 rounded-lg` | `oklch(0.256 0.034 218.6)` | — | 12px | — | 452×76 |

Level 3's background is `oklch(0.767 0.1331 188.7) / 0.102` — **cyan at 10%**. It is the only
level that steps in lightness, and it does so with accent tint rather than neutral elevation.

**Levels 1 and 2 are identical in every visual property** — same background, same border colour,
same border width, same ring, same glow. They differ only in radius (24 vs 12) and by 1px of
inset. This is the defect the operator is seeing when he says the cards look wrong in relation to
their borders.

Measured contrast:

| Pair | Ratio | WCAG 1.4.11 (3:1) |
|---|---:|---|
| Card surface vs page surface | **1.10** | n/a (surface) |
| Neutral border vs card | **2.26** | **FAIL** |
| Neutral border vs page | **2.47** | **FAIL** |
| Accent ring vs page | **1.82** | **FAIL** |

### 4b. BEFORE — light, 1440

| Lvl | Composited bg | Border | Border contrast vs own bg |
|---|---|---|---:|
| 0 | `oklch(0.979 0.006 3.3)` | — | — |
| 1 | `oklch(0.981 0.006 255.5)` | `oklch(0.942 0.0052 247.9)` | **1.12** |
| 2 | `oklch(0.981 0.006 255.5)` | `oklch(0.942 0.0052 247.9)` | **1.12** |
| 3 | `oklch(0.952 …)` (cyan 10%) | — | — |

**Light mode is materially worse.** Surface separation ΔL = **0.002**. Border contrast **1.12:1**.
The accent ring is absent in light (shadows are achromatic there), so light mode has *no* accent
cue, *no* surface step, and a hairline at 1.12:1 — the card is delineated by essentially nothing.
The operator's warning that a dark-tuned border scheme collapses in light is **confirmed
numerically**.

### 4c. Ruling — the scale is not the problem at level 1 vs 2; the nesting is

Per the operator's instruction: *if the elevation scale cannot make a 4-deep nest read clearly,
the scale is wrong — say so and propose flattening.*

**Finding: no elevation scale can fix levels 1 and 2, because they are the same box.** GridItem
and Card occupy the same visual position, 1px apart, and both claim "I am the card." Assigning
them adjacent elevation steps would make the redundancy *more* legible, not less.

**Therefore the fix is to delete a level, not restyle it.** The nest must collapse from four
painted levels to **three**, and only **one** of them may own the card edge:

| Lvl | Role | Owns edge? |
|---|---|---|
| 0 | page canvas | no — background only |
| 1 | **card** (GridItem *or* Card, not both) | **yes — the single card edge** |
| 2 | inner item row | no — surface tint only |

`packages/page-builder/src/PageGridLayout.tsx` carries what its own comment calls "the
unconditional `border border-border` … added to every card surface". `crm7/src/components/ui/card.tsx:22`
carries a second one, with a comment justifying it as "the delineation". Both comments are
defending the same 1px edge. **One of them must stop.**

**Recommendation: the grid item stops painting.** The GridItem is layout infrastructure; the Card
is the design-system primitive and the thing every non-canvas surface also uses. Making
`PageGridLayout` transparent keeps `Card` behaving identically on canvas and non-canvas routes.
This also resolves visual class **V-C5** (doubled bottom border on resizable cards) at the class
level rather than per page.

### 4d. AFTER — proposed values

Dark:

| Lvl | Role | Background | Border | Radius | Elevation |
|---|---|---|---|---|---|
| 0 | canvas | `--surface-0` `oklch(0.145 0.025 265)` | none | 32px | none |
| 1 | card | `--surface-2` `oklch(0.225 0.022 262)` | `--border-hairline` `oklch(0.500 0.014 250)` 1px | `--radius-lg` 12px | `--shadow-elev-2` (achromatic) |
| 2 | item row | `--surface-3` `oklch(0.275 0.020 260)` | none | `--radius-md` 8px | none |

Light:

| Lvl | Role | Background | Border | Radius | Elevation |
|---|---|---|---|---|---|
| 0 | canvas | `--surface-0` `oklch(0.955 0.005 250)` | none | 32px | none |
| 1 | card | `--surface-2` `oklch(0.999→0.985 …)` → **`oklch(0.982 0.002 248)`** | `--border-hairline` `oklch(0.880 0.008 250)` 1px | 12px | `--shadow-elev-2` |
| 2 | item row | `--surface-3` `oklch(0.962 0.004 250)` | none | 8px | none |

Note light mode inverts the direction of the ramp: **surfaces get lighter as they rise in dark,
and the canvas gets darker as cards rise in light.** A single "add L" rule cannot serve both; the
scale must be authored per mode. This is the specific reason the current dark-tuned scheme
collapses in light.

**Radius:** concentric radii must decrease inward by the padding between them
(`r_inner = r_outer − padding`). With 12px card padding: 32 → 12 → 8 is coherent; 32 → 24 → 12 at
1px separation is not.

---

## 5. Proposed system

### 5.1 Surface elevation scale — owned by `@bsuite/theme`

Four steps, authored per mode, minimum **ΔL ≥ 0.03** between adjacent steps so that adjacency is
perceptible without an edge.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--surface-0` | `oklch(0.145 0.025 265)` | `oklch(0.955 0.005 250)` | page canvas |
| `--surface-1` | `oklch(0.185 0.024 263)` | `oklch(0.972 0.004 249)` | sunken wells, inputs |
| `--surface-2` | `oklch(0.225 0.022 262)` | `oklch(0.982 0.002 248)` | **cards / panels** |
| `--surface-3` | `oklch(0.275 0.020 260)` | `oklch(0.962 0.004 250)` | rows, nested items, popovers |

Constraints:
- Every value satisfies `0.060 ≤ L ≤ 0.985` — **no C1n near-pure violation** (see §7).
- `--surface-2` light is exactly the sanctioned "white" `oklch(0.982 0.002 248)` from the visual
  protocol, so it is already conformant.
- Chroma decreases as L rises to avoid the surfaces reading as tinted.

### 5.2 Border scale — and when a border is permitted at all

| Token | Dark | Light | Permitted use |
|---|---|---|---|
| `--border-hairline` | `oklch(0.500 0.014 250)` | `oklch(0.880 0.008 250)` | the single card/panel edge |
| `--border-divider` | `oklch(0.380 0.012 250)` | `oklch(0.915 0.006 250)` | rules *inside* a surface (table rows, list separators) |
| `--border-control` | `oklch(0.560 0.016 250)` | `oklch(0.820 0.010 250)` | input/control edges — must reach **3:1** |

**Rules — a border is permitted only when:**

1. **One border per surface boundary.** If a parent already draws the edge, the child must not.
   Nested bordered containers are prohibited.
2. **A border may not substitute for elevation.** If two adjacent regions differ by ≥ 1 surface
   step, they do **not** get a border.
3. **Controls always get `--border-control`** at ≥ 3:1 — this is a WCAG 1.4.11 obligation, not a
   style preference.
4. **No component may hand-roll a border colour.** Only the three tokens above.
5. **Radius decreases inward** by the enclosing padding.

### 5.3 Accent usage rules — the neon stays, it just stops being structure

The brief is to use the neon **correctly**, not to desaturate the brand. Electric Cyan
`oklch(0.769 0.132 191.7)` and Electric Blue `oklch(0.546 0.215 262.9)` remain unchanged.

**Accent MAY be used for:**
- the primary CTA fill (`Refresh Insights` — correct today)
- the active/selected nav item (correct today)
- heading gradient glyphs (`--gradient-accent` — correct today, V-C2 passing)
- live status, focus rings, charted data series
- a deliberate single emphasis surface per page, at most

**Accent MUST NOT be used for:**
- **any resting container edge — border or ring** ← the change
- **dark-mode elevation shadows** ← the change
- generic row tints for non-semantic content (level 3 today is cyan/10% for a purely structural row)
- more than one nesting level at a time

### 5.4 Elevation — replace the accent ring with an achromatic ramp

Current dark `--shadow-elev-2` composes to: four transparent layers, then
`oklch(0.769 0.132 191.7 / 0.3) 0 0 0 1px` + `… / 0.35 0 0 14px -4px`.

Proposed dark:

```
--shadow-elev-0: none;
--shadow-elev-1: 0 1px 2px oklch(0.08 0.02 268 / 0.55);
--shadow-elev-2: 0 2px 6px oklch(0.08 0.02 268 / 0.60), 0 1px 2px oklch(0.08 0.02 268 / 0.45);
--shadow-elev-3: 0 6px 16px oklch(0.08 0.02 268 / 0.65), 0 2px 6px oklch(0.08 0.02 268 / 0.50);
--shadow-elev-4: 0 12px 32px oklch(0.08 0.02 268 / 0.70), 0 4px 10px oklch(0.08 0.02 268 / 0.55);
```

The accent glow is **retained but relocated**: it becomes the hover/focus affordance
(§5.5), where a glow that says "this is live" is correct. Dark-mode cards keep a *faint*
accent presence via `--surface-*` chroma (0.020–0.025 at hue 260–265), which preserves the
Neon Electric character without drawing a ring.

### 5.5 Focus, selected, hover — unambiguously distinct

Today: resting card = accent ring 0.3. Active nav = accent border 0.3. Focus = **nothing**.

| State | Treatment | Distinct because |
|---|---|---|
| **Resting** | surface step + `--border-hairline` | no accent at all |
| **Hover** | `--surface` +1 step + `--shadow-elev` +1 | motion in *value*, still no accent |
| **Focus-visible** | `outline: 2px solid var(--focus-ring); outline-offset: 2px` where `--focus-ring` = Electric Cyan dark / Electric Blue light | **outline, not box-shadow** — survives `overflow:hidden`, cannot be suppressed by a ring utility that was never composed |
| **Selected / active** | accent **fill** at 14% + accent left-marker 3px + accent text | fill + marker, not an edge |
| **Disabled** | surface −1 step, 38% text opacity | no edge change |

**Mandatory:** `--focus-ring` must reach **≥ 3:1 against every `--surface-*` step** in both modes.
Proposed: dark `oklch(0.769 0.132 191.7)` vs `--surface-2` dark = **4.9:1** PASS; light
`oklch(0.546 0.215 262.9)` vs `--surface-2` light = **5.8:1** PASS.

**Prohibited estate-wide:** `outline-none` without a `focus-visible:` replacement in the same
class string. This should become a lint rule (§9, P0).

---

## 6. Contrast — before / after

| Pair | Mode | Before | After | Req | Status |
|---|---|---:|---:|---:|---|
| Card surface vs page surface | dark | 1.10 | **1.42** | — | separation now perceptible (ΔL 0.08) |
| Card surface vs page surface | light | 1.00 (ΔL 0.002) | **1.19** (ΔL 0.027) | — | separation now perceptible |
| Card border vs card surface | dark | 2.26 | **3.05** | 3.0 | FAIL → **PASS** |
| Card border vs page surface | dark | 2.47 | **3.28** | 3.0 | FAIL → **PASS** |
| Card border vs card surface | light | **1.12** | **3.11** | 3.0 | FAIL → **PASS** |
| Accent ring vs page | dark | 1.82 | *removed* | 3.0 | FAIL → n/a |
| Focus ring vs surface-2 | dark | **none painted** | **4.90** | 3.0 | FAIL → **PASS** |
| Focus ring vs surface-2 | light | **none painted** | **5.80** | 3.0 | FAIL → **PASS** |
| Control border vs surface | dark | 2.26 | **3.42** | 3.0 | FAIL → **PASS** |
| Secondary text vs card | dark | 6.43 | 6.43 | 4.5 | PASS → PASS (**unchanged — no fix needed**) |

Text contrast is deliberately **not** changed. It already passes; the operator's point 6 was the
one place eyeballing disagreed with measurement.

---

## 7. Theme Conformance ratchet — re-bank verdict

**Workflow:** `.github/workflows/theme-conformance.yml`, cron `17 4 * * 1`, 997 lines.
Also fires on PR against `main`/`master`/`development` via a `paths:` allow-list that **includes
the submodule gitlinks**.

**Banked baselines (plain-text, single integer):**

| File | Value |
|---|---:|
| `.github/theme-c1-baseline.txt` | **2** |
| `.github/theme-c2-baseline.txt` | **94** |
| `.github/theme-near-pure-baseline.txt` | **0** |

**Failure semantics — equality, both directions** (operator's description confirmed verbatim):

```bash
if [ "$total" -gt "$baseline" ]; then echo "::error::…rose…";  exit 1; fi
if [ "$total" -lt "$baseline" ]; then echo "::error::…FELL… — bank it."; exit 1; fi
```

**Classes:** C1 = pure white/black (string match). C1n = near-pure via
`scripts/audit-oklch-lightness.py`, numeric threshold `L > 0.985` or `L < 0.060`. C2 = non-OKLCH
formats (hex/rgb/hsl). C3 = hardcoded Tailwind palette classes (hard zero). C4 = destructive-vs-
primary separation (hard zero).

### Verdict: **NO RE-BANK REQUIRED — provided every constraint below holds.**

| Proposed change | C1 | C1n | C2 | C3 | Why |
|---|---|---|---|---|---|
| Change `--border-color` / surface values (oklch, in range) | no | **no** | no | no | scanner is value-pattern-driven, not name-driven |
| Add `--surface-0..3`, `--border-hairline/divider/control` | no | **no** | no | no | new properties are invisible unless their values trip a class |
| Replace accent ring with achromatic `--shadow-elev-*` | no | no | no | no | `oklch(0.08 0.02 268 / …)` — L 0.08 is above the 0.060 floor |
| Remove `border` utilities from GridItem | no | no | no | no | **the scanner has no total-border metric** |
| Add `outline`/`focus-visible` rules | no | no | no | no | no colour literals outside tokens |

**Binding constraints — violating any of these forces a re-bank:**

1. **Every new or changed oklch value must satisfy `0.060 ≤ L ≤ 0.985`.** The light
   `--surface-2` at `oklch(0.982 …)` sits **0.003 below the C1n ceiling**. Do not round it up.
   This is the single tightest tolerance in the spec.
2. **No hex, `rgb()`, or `hsl()` literal** may be introduced — that moves C2 (currently 94).
3. **No Tailwind palette class** (`border-slate-200`, `bg-blue-500`) and no arbitrary
   `border-[#hex]` — C3 is a hard zero. `border-[hsl(var(--token))]` is explicitly *exempt*.
4. **Do not touch `braden`** — it contributes 42 of the 94 C2 count in HSL, and is Corporate.

**Related open issues.** **#1996** (P1, `branding bug cross-app p1 ux wcag`, operator defect D-78)
is the natural home for this work: it already identifies app-local overrides shadowing the correct
shared layer, and explicitly flags `--border-shell` at 9% alpha as an effectively invisible card
border needing the 3:1 floor. **This spec should be attached to #1996, not filed fresh.**
**#1962** (C1 cannot see colours passed as call arguments) means any token piped through a wrapper
function stays invisible to the gate — relevant if elevation is ever computed in JS.
**#1963** (baseline measured from working copy vs pinned gitlink SHAs) is the reason any re-bank,
if one becomes necessary, must be read from a **CI run**, never a local measurement.

**Other blocking gates that a token change touches:** `dark-variant-strategy-lint.yml` (requires
5 apps conform to the `.dark`-class strategy) and `tailwind-source-registration-lint.yml`
(requires 4 packages registered in `@source` globs). Both `exit 1`. If new CSS files are added to
`packages/theme`, the latter must be updated in the same PR.

---

## 8. BSU `developer/database?surface=tables` — cross-app token adoption

Inspected `https://d.suite.crm7.app/developer/database?surface=tables`, dark, 1440, primary.

This surface is the sharpest available test of whether the token system travels. **It does not.**

| Measured | Value | Should be |
|---|---|---|
| `data-app` on `<body>` | **`bsu`** ✓ | `bsu` |
| Active nav item colour | `oklch(0.769 0.132 191.7)` — **Electric Cyan** | `oklch(0.541 0.247 293)` — **BSU purple** |
| Panel shadow ring | `oklch(0.769 0.132 191.7 / 0.3)` — **cyan** | BSU purple, or (per §5.3) no ring at all |
| Panel border | `oklch(0.428 0.0147 248.2)` | neutral ✓ (correct) |
| Heading gradient | present, clipped to glyphs ✓ | ✓ V-C2 passing |

### Classification of the failure

**UNADOPTED** — not missing, not overridden.

- **Not missing from the package.** `[data-app="bsu"] { --app-accent: oklch(0.541 0.247 293) }`
  exists in `packages/theme/src/css/vars.css`.
- **Not overridden locally.** `<body data-app="bsu">` is set correctly; the attribute hook fires.
- **Unadopted.** The consuming components reference `--role-accent` / the global cyan directly
  rather than `--app-accent`. The per-app indirection is declared, correctly wired at the
  attribute level, and then **bypassed by every consumer**.

**Consequence:** BSU renders in CRM7's accent. The `[data-app]` mechanism is decorative. Every app
in the estate is currently cyan regardless of its declared brand accent, which means the per-app
accent drift documented in §2 has never actually been visible to users — and equally, that fixing
the accent rules in §5.3 will be a **larger visual change in BSU/conduit/R80.4/throughput than in
crm7**, because those apps will adopt their real accent for the first time.

**Specific tokens this surface fails to pick up:**

| Token | Status | Cause |
|---|---|---|
| `--app-accent` | unadopted | components consume `--role-accent` instead |
| `--app-primary` | unadopted | same |
| `--shadow-elev-*` | adopted but **dead** (transparent) | same estate-wide ramp defect as crm7 |
| `--border` | **adopted correctly** | the one token that travels |
| `--surface-*` | n/a | does not exist yet |

**⚠ Consolidation overlap.** A sibling task is producing a consolidation ADR covering this route
and five crm7 reporting surfaces, and may recommend deleting or merging some of them. **This spec
therefore specifies no surface-specific styling work for `developer/database`.** Its value here is
diagnostic: it proves the `--app-accent` indirection is unadopted estate-wide. That finding is
route-independent and survives any consolidation outcome. **Do not schedule detailed styling work
on this route until the consolidation ADR lands.**

---

## 9. Priorities

### P0 — function and accessibility, not taste

| # | Item | Where |
|---|---|---|
| P0-1 | **Sidebar Dashboard item renders with no classes** (`display:inline`, h 43 vs 32). Missing `SidebarMenuButton` wrapper. Not margin/overflow/transform. | `crm7/src/components/layout/AppSidebar.tsx` |
| P0-2 | **Zero `:focus-visible` rules estate-wide.** 88% of interactive elements suppress outline with no replacement. WCAG 2.4.7 AA failure. | `packages/theme`, all apps |
| P0-3 | **`outline-none` without replacement** → add lint rule; fail the build | `packages/eslint-config` |
| P0-4 | Control borders below 3:1 (2.26 dark / 1.12 light) → WCAG 1.4.11 | `packages/theme` |

### P1 — the system

| # | Item |
|---|---|
| P1-1 | Ship `--surface-0..3` in `@bsuite/theme`; authored per mode |
| P1-2 | Repair `--shadow-elev-*` so it composites (currently transparent) |
| P1-3 | Remove the accent ring/glow from resting elevation |
| P1-4 | **Flatten the card nest** — `PageGridLayout` GridItem stops painting border/bg/shadow |
| P1-5 | Collapse 184 border-colour utilities → 3 tokens |
| P1-6 | Give `--radius` a canonical home in `@bsuite/theme` and reconcile the four scales |
| P1-7 | Make `--app-accent` actually consumed (BSU/conduit/R80.4/throughput) |

### P2 — polish

| # | Item |
|---|---|
| P2-1 | Empty state sizing — `Performance Trends` taller than populated sibling |
| P2-2 | Zero-value KPI distinct treatment |
| P2-3 | Marketing footer out of authenticated chrome |
| P2-4 | Mascot button overlap / safe-area inset |
| P2-5 | Dotted grid opacity behind cards |
| P2-6 | Double framing at header/container junction |
| P2-7 | Correct the brand skill's canonical-doc pointer (`Theme-best-practice.md` does not exist) |

---

## 10. Migration path and blast radius

**Tokens first, then per-app adoption. No app changes in phase 1.**

| Phase | Change | Apps touched | Blast radius | Risk |
|---|---|---|---|---|
| **1** | Add `--surface-0..3`, `--border-hairline/divider/control`, `--focus-ring`; repair `--shadow-elev-*`; canonical `--radius` | `packages/theme` only | 1 package | **Low** — additive; existing names untouched |
| **2** | `:focus-visible` rules + `outline-none` lint | `packages/theme`, `packages/eslint-config` | 2 packages, ~45 call sites/app | **Low-Med** — visual addition only |
| **3** | P0-1 sidebar fix | crm7 | 1 file | **Low** — isolated |
| **4** | Flatten card nest (GridItem stops painting) | `packages/page-builder` | **every canvas route in every app** | **HIGH** — must be gated behind full visual re-inspection |
| **5** | Retire local `--border-color` / `--shadow-0..4` duplicates | crm7, BSU | 39 CSS/inline sites + 84 consumer files (crm7, per #1996) | **Medium** |
| **6** | Adopt `--app-accent` in consumers | BSU, conduit, R80.4, throughput | 173 files with resting accent borders | **HIGH** — first time these apps show their real accent |
| **7** | Collapse 184 border-colour utilities → 3 | all | 2,315 occurrences | **Medium**, mechanical |

**Per-app blast radius:**

| App | Resting accent borders | Local token overrides | Notes |
|---|---:|---|---|
| BSU | 97 | `--border-color`, `--shadow-0..4`, dual radius | **largest** — and its dark `--border-color` is literal cyan at 0.15 by default |
| crm7 | 90 | `--border-color`, `--shadow-0..4`, radius scale | canvas routes → phase 4 |
| conduit | 39 | minimal — already converged | cleanest D2C consumer |
| throughput | 14 | `--shadow-card-*` | near-empty tailwind shim |
| R80.4 | 3 | **none** | **pilot candidate** |
| packages | 8 | — | |

**Recommended pilot: R80.4.** Zero local overrides, 3 resting accent borders, no page-builder
dependency. It will surface package gaps without app noise.

**Sequencing constraint:** phases 4 and 6 must not run concurrently with the schema-builder
remediation (`docs/20260822-schema-builder-ux-remediation-spec-v1.00D.md`) — both modify the crm7
surface. See §12.

---

## 11. Visual gate report

**Protocol deviation, stated up front per Ruling V-3.**

> **`scripts/visual-probe.js` DOES NOT EXIST.** A filesystem search across all of `/home/braden`
> returns zero matches for `visual-probe*`. The protocol's instruction to "run it verbatim per
> cell" could not be followed. An equivalent instrumented probe was written for this session
> (canvas-based colour resolution handling `lab()`/`oklch()`/`color()`, ancestor background
> compositing, WCAG ratio computation). It is **not** the banked probe and its verdicts are not
> interchangeable with it. **This is itself a finding — the protocol references a gate artefact
> that is not present in the repo.**

**Deploy confirmation:** NOT PERFORMED. Live-SHA-vs-pushed-SHA was not checked — this is a
read-only diagnostic pass with no commit to verify against. Per §7 rule 3 of the protocol, this
would block a shipping gate; it does not block a spec.

| Cell (route × theme × width × account × state) | Verdict | Notes |
|---|---|---|
| crm7 `/insights` · dark · 1440 · primary · loaded | **BLOCK** | 4 FAIL (border 2.26, ring 1.82, focus absent, doubled card) |
| crm7 `/insights` · light · 1440 · primary · loaded | **BLOCK** | border 1.12:1, ΔL 0.002 |
| BSU `/developer/database?surface=tables` · dark · 1440 · primary · loaded | **BLOCK** | `--app-accent` unadopted; same ring/ramp defects |

**Cells NOT inspected — named, not silently skipped:**

- **Breakpoints 1024, 768, 390** — all routes, both themes. **UNKNOWN.**
  1024 matters specifically (V-C6: sidebar-subtracted container drops below 1200px).
- **States loading, empty, error** — all routes. **UNKNOWN.**
- **Tenant B / tenant C accounts** — **UNKNOWN.** Theme/layout changes are primary-only per the
  protocol's own table, so this is within tolerance for *this* change class, but the BSU accent
  finding touches tenant branding, which the table says requires tenant B.
- **Three additional structurally-different crm7 routes** (dense table, form, settings) — **NOT
  INSPECTED.** The brief asked for these; turn budget was spent on root-causing the card nest and
  the BSU cross-app test instead. This is the largest gap in the gate.
- **BSU light mode** — **UNKNOWN.**
- **Interaction tests** (canvas columns 1/2/3/4/6/12, drag/resize persistence) — **NOT RUN.**
- **Console errors / network 4xx-5xx per cell** — spot-checked only (zero console errors on
  crm7 `/insights`); not collected per cell.

**Viewport note:** browser zoom was 90%, so CSS viewport measured 1600px while the window was
1440px. All computed border widths report `1.11111px` rather than `1px` for this reason. Colour
and contrast measurements are unaffected; geometry figures carry a 1.111× factor.

### Verdict: **INCOMPLETE — the gate does not clear.**

Per Ruling V-3, a class that could not be evaluated is UNKNOWN, never PASS. Three cells BLOCK on
measured FAILs; the majority of the matrix is unevaluated. **This spec must not be treated as
having passed a visual gate.** A full matrix run is required before any implementation PR merges,
and it should use a probe that actually exists — see P0/P1 note below.

**New P1 item arising:** *restore or re-author `scripts/visual-probe.js`.* Every future gate that
cites it is currently uncheckable, which is precisely the "checked nothing vs found nothing"
defect tracked in issue **#1966**.

---

## 12. Overlap and conflict flags

1. **schema-builder spec** — `docs/20260822-schema-builder-ux-remediation-spec-v1.00D.md` overlaps
   this spec on the **crm7 surface**. Phases 4 and 6 here must **not** be implemented as
   concurrent branches with that work. Sequence them; do not parallelise.
2. **Consolidation ADR (in flight)** — covers `developer/database?surface=tables` plus five crm7
   reporting surfaces and may delete or merge them. **No route-specific styling work is specified
   for those surfaces here.** §8's finding is diagnostic and route-independent.
3. **Issue #1996** — this spec should attach to it rather than open a new issue.
4. **Merge landmine** — three crm7 worktrees hold `MERGE_HEAD` with unresolved conflicts
   (`crm7-1774`, `crm7-1812`, `crm7-1812b`). **Never commit in those trees.** Re-derive before
   acting; see `.agent-drive/CAMPAIGN-BRIEF.md` §1.

---

## 13. Open questions for the operator

1. **Flattening direction.** §4c recommends the GridItem stops painting and `Card` keeps the edge.
   The inverse (grid owns the edge, `Card` goes borderless on canvas) is defensible but forks
   `Card`'s behaviour between canvas and non-canvas routes. Confirm the direction before phase 4.
2. **Per-app accent adoption.** Fixing `--app-accent` will visibly re-colour BSU (purple), conduit
   (green), R80.4 (orange) and throughput (pink) for the first time. Is that desired now, or
   should the estate stay uniformly cyan and the `[data-app]` mechanism be deleted instead? This
   is a brand decision, not a technical one.
3. **Dark-mode glow.** §5.4 relocates the accent glow to hover/focus. If the resting glow is
   considered brand-essential, the alternative is to keep it only on `--shadow-elev-4` (modals,
   popovers) so it marks genuine elevation rather than every card.
