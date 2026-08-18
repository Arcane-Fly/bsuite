# D2C Theme Compliance Audit

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Status: A (assessment) · Date: 2026-08-02 · Scanner: `scripts/audit-d2c-theme.sh`

**Authority: [`packages/theme/docs/d2c-theme-source-of-truth.html`](../packages/theme/docs/d2c-theme-source-of-truth.html)**
— the proposed `@bsuite/theme` 0.7.0 contract (5 layers: palette · surface · role · shadcn · app).
Operator ruling 2026-08-02: it applies **everywhere except the braden Corporate site**.
Versioned into the repo this date; it previously existed only in `~/Downloads`, which is not a
durable home for an authoritative contract. It passes its own rule — zero pure endpoints.

Scope: `crm7`, `conduit`, `business-suite-unified`, `R80.3`, `throughput`, `packages/`, `braden`.
Out of scope: build output only.

**Operator ruling 2026-08-02 (confirmed): pure white AND pure black are banned, platform-wide.**
Every role — text, surface, border, ring, shadow — not just text. This overrides the narrower
text-only wording in `packages/theme/src/css/vars.css:20,244`.

`braden` is exempt from the D2C **palette** (red/gold/navy is its corporate identity, and
red-as-corporate-primary is legitimate — the banned thing is red as the *sole signifier of
error*). It is **not** exempt from the pure white/black ban, and needs the same anti-glare
text scale as D2C.

## Headline

The apps are not the root of the problem. **The token source ships the value it forbids
downstream**, and the shared design-system component that every app imports is built from
raw Tailwind palette classes. Fix those two and a large share of the app-level drift
disappears without touching the apps.

## Counts

Real = authored source outside a legitimate-exception path. Exempt = email HTML, PDF/canvas
renderers, branding pickers, tests, manifest/PWA metadata — literal colour is correct there.

| Submodule | C1 pure white/black | C2 non-OKLCH | C3 token bypass | C4 destructive |
|---|---|---|---|---|
| crm7 | 83 / 19 | 20 / 28 | 17 / 0 | 1 / 2 |
| conduit | 55 / 0 | 58 / 0 | 251 / 0 | 6 / 0 |
| business-suite-unified | 147 / 40 | 74 / 139 | 537 / 22 | 7 / 0 |
| R80.3 | 60 / 0 | 1 / 2 | 7 / 0 | 1 / 0 |
| throughput | 12 / 0 | 7 / 0 | 2 / 0 | 0 / 0 |
| packages | 72 / 2 | 15 / 3 | 492 / 0 | 2 / 0 |
| braden | 200 / 10 | 67 / 15 | 376 / 47 | 2 / 0 |

`braden` carries the **largest single C1 count** (200) — expected for a marketing site, and
newly in scope as of the confirmed ruling. Its C3 figure is informational only: `braden` is
allowed its own palette, so those are not D2C bypasses; they matter only if corporate hex has
leaked outside `packages/theme/src/css/braden.css`.

### Pure black, isolated

| File | Hits |
|---|---|
| `business-suite-unified/src/index.css` | 21 |
| `crm7/src/styles/theme.css` | 16 |
| `R80.3/src/styles/theme.css` | 15 |
| `braden/src/index.css` | 14 |
| `crm7/src/index.css` | 9 |
| `throughput/src/index.css` | 3 |
| `packages/theme/src/css/braden.css` | 3 |
| `packages/theme/src/css/utilities.css` | 2 |
| `packages/page-builder/src/styles/react-grid-layout-overrides.css` | 2 |

Overwhelmingly `oklch(0 0 0 / α)` used to build shadows. That is the single most common
pure-black idiom in the tree and it needs one replacement decision (a near-black shadow tint,
probably hue-matched to the surface) applied across all of these files at once.

Re-run: `DUMP=/tmp/d.txt scripts/audit-d2c-theme.sh`. Every count traces to `$DUMP`.

> **Two scanner defects were found and fixed before these numbers were trusted.** The first
> run reported 1725 "hex colours" in crm7 — sampling showed almost all were GitHub issue
> refs (`crm7#217`, `bsuite#714`) matching `#[0-9a-f]{3}`. The second reported 593 palette
> bypasses in crm7 — `.vercel/output/static/assets/` (compiled monaco-editor and bundled
> CSS) was not excluded. True figure: 17. Do not trust a colour count that has not been
> dumped and sampled.

## P0 — the token source ships pure white

`packages/theme/src/preset-v4.css`:

| Line | Token | Value |
|---|---|---|
| 100 | `--color-card` | `oklch(1 0 0.5)` |
| 102 | `--color-popover` | `oklch(1 0 0.5)` |
| 48 | `--color-light-bg-accent` | `oklch(1 0 0.5)` |

Also `packages/theme/src/css/vars.css:52` (`--light-bg-accent`).

`--color-card` and `--color-popover` are the shadcn bridge variables. **Every card, dialog,
dropdown and popover across all five D2C apps renders pure white in light mode**, from one
file. This is the highest-leverage fix in the audit.

`packages/theme/src/css/utilities.css:81-88` uses `oklch(0 0 0 / 0.03)` and
`oklch(1 0 0 / 0.03)` for grid overlays — low alpha, but still pure endpoints.

**Decision needed:** `packages/theme/src/css/braden.css:81` sets
`--braden-light-bg-panel: oklch(1.000 0 0)  /* white */`, and lines 164-166 build shadows
from `oklch(0 0 0 / …)`. `braden` is the Corporate brand and is otherwise exempt from D2C
rules. Does "full stop" reach the Corporate brand too, or is it D2C-only? I have left
braden untouched pending your call.

> ## ⚠️ Superseded finding — error colour
>
> **Operator ruling 2026-08-02: red IS correct for errors.** Braden's confusable pair is
> **blue↔purple**, not red. Since `--role-primary` is Electric Blue and error UI sits beside it
> constantly, purple was the single worst choice — it blends into the primary.
>
> Everything below that treats a red error as a defect (the C4 column, the `StatusBadge`
> `error` finding, doc contradiction #1) is **wrong and reversed**. `StatusBadge`'s
> `bg-red-*` for `error` was correct all along; only its palette-class *form* is a defect.
>
> The skill reference `d2c-neon-electric-theme.md` had Electric Coral as destructive from the
> start. I filed that as the contradiction. It was right; `AGENTS.md` tripwire #10 was wrong.
>
> **Resolved the same day in contract 0.7.0** — the whole semantic set was rebuilt rather than
> one hue swapped, and the invariant restated: *error must be maximally separated from primary
> under deuteranopia and protanopia*, not "error is purple". D2C primary is blue → error is red.
>
> | Role | Was | Now |
> |---|---|---|
> | error / destructive | purple `0.568 0.202 283.1` | `--neon-red` `oklch(0.580 0.230 25)` |
> | warning | orange `22.5` | `--neon-amber` `oklch(0.800 0.150 75)` |
> | success | green `149.6` | `--neon-teal` `oklch(0.600 0.130 195)` |
> | secondary | indigo `277` | `--neon-deep` `oklch(0.380 0.140 270)` |
>
> Purple and indigo are quarantined from semantics: under protanopia they collapse onto primary
> blue (purple vs primary measured **ΔE 0.006** — the destructive colour and the primary action
> colour were the same swatch).

## P0 — the shared StatusBadge is doubly non-compliant

`packages/theme/src/react/components/StatusBadge.tsx:52-59` — the design-system component
the brand skill tells every app to use — is written entirely in raw Tailwind palette classes:

```
success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 …'
error:   'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 …'
info:    'bg-sky-50 text-sky-700 border-sky-200 …'
```

**One violation, not two.** The token bypass (C3) is real: raw palette classes make the
component invisible to tenant white-labelling, because branding mutates the role layer and this
binds below it. The `error` **hue** is fine — see the superseded-finding note above.

So the fix is form, not colour: `bg-red-50 text-red-700` → `bg-error/10 text-error-text`,
keeping red as the resolved value.

## P1 — concentrated token bypass

| Location | Palette classes | Note |
|---|---|---|
| `packages/schema-builder/src/components/` | ~490 | Whole package built without tokens. `FieldEditDialog.tsx` 117, `EntityPropertiesPanel.tsx` 93, `FieldCreateDialog.tsx` 58, `CommandPalette.tsx` 44, `EntityNode.tsx` 41, `RelationshipConfigDialog.tsx` 37, `SchemaToolbar.tsx` 31, `SchemaCanvas.tsx` 22 |
| `business-suite-unified/src/pages/Admin/` | ~214 | `UserManagement.tsx` 80, `TenantManagement.tsx` 63, `LicenseManager.tsx` 50, `AuditLog.tsx` 21 |
| `business-suite-unified/src/pages/Billing.tsx` | 36 | |
| `conduit/src/app/(dashboard)/*/_view.tsx` | ~136 | `interviews` 44, `candidates/[id]` 44, `candidates` 29, `analytics` 19 |

`packages/schema-builder` alone is ~40% of the entire C3 total.

## P1 — app-level CSS redefines pure white

| File | C1 hits |
|---|---|
| `business-suite-unified/src/index.css` | 38 |
| `R80.3/src/styles/theme.css` | 29 |
| `crm7/src/styles/theme.css` | 27 |
| `crm7/src/index.css` | 15 |
| `throughput/src/index.css` | 11 |
| `conduit/src/app/globals.css` | 7 |

Each app re-declares surface tokens locally rather than inheriting the package. That is both
the drift mechanism and the reason a single package-level fix will not fully propagate —
these local redefinitions must be removed in the same change, or they will keep overriding it.

`conduit`/`business-suite-unified` `src/components/magicui/shine-border.tsx` (8 each) is
vendored third-party UI using white — replace or token-ise.

## Enforcement: the gate runs, but it does not cover the doctrine

My initial reading — that `@bsuite/eslint-config` is consumed by nobody and the rule is dead
— was **wrong**, and a subagent refuted it. Each submodule vendors a local fork at
`<submodule>/eslint-rules/no-hardcoded-colours.js`, wired at `error`, running under husky
pre-commit and in CI in all six apps.

What is genuinely broken:

1. **`text-white`/`text-black` is not covered by the error rule.** `TAILWIND_PALETTE_RE` is
   `\b(text|bg|border|divide)-(slate|gray|zinc|neutral)-(\d{2,3})\b` — it requires a numeric
   shade, so it structurally cannot match `text-white`. That ban lives in a separate
   `no-text-white.js` set to **`warn`**, and that rule file **does not exist at all in
   `throughput` or `braden`**.
2. **Only 4 of ~22 palette families are checked.** `red-*`, `emerald-*`, `amber-*`, `sky-*`,
   `purple-*` are invisible — which is exactly why StatusBadge passes CI.
3. **Hex/RGB are never checked in `className`.** `checkStringForHex` is wired only to the
   `Property` visitor (object literals), never to `JSXAttribute`. `className="bg-[#ff0000]"`
   passes.
4. **No `hsl()` check exists anywhere.** Tripwire #10's HSL ban has zero enforcement.
5. **`@bsuite/eslint-config` was never published** — 4/4 `publish-eslint-config.yml` runs
   failed with npm `E404`. The six local forks have already diverged from it and each other.
6. **Nothing checks CSS files.** ESLint does not parse `.css`, so every P0/P1 CSS finding
   above is structurally invisible to the current gate.

## Doc contradictions to resolve

1. ~~The skill reference assigns Electric Coral to destructive, contradicting AGENTS.md~~ —
   **reversed by the 2026-08-02 ruling.** The skill reference was correct. The files that now
   need changing are `AGENTS.md` tripwire #10 and the contract's L3 semantic block plus its
   two "Contract rules" restatements. A contradiction is only resolvable once you know which
   side is right; I assumed the more forceful file was.
2. The same skill cites `/home/braden/Desktop/Dev/bsuite/Theme-best-practice.md` as the
   canonical source — **that file does not exist**. A canonical pointer to nothing.
3. `packages/theme/src/css/vars.css:20` and `:244` state the pure-white ban applies to *text*
   tokens. Stale as of the 2026-08-02 ruling, and it is the comment that licensed
   `--color-card`.

## Independent verification of the 0.7.0 colour-vision table

Re-implemented Viénot–Brettel from scratch (`/tmp/cvd.py`, method: OKLCH → linear sRGB → LMS →
dichromat projection → OKLab, ΔE = Euclidean in OKLab) and re-derived the contract's table.

**The method matches.** Every simulated hex in the contract reproduces exactly —
`#2563eb→#5656eb`, `#01cec9→#b0b0cb`, `#e31029→#83830f`, `#22c55e→#aaaa63`, `#f5ae39→#c6c631` —
and most ΔE rows agree to three decimals, including the load-bearing `primary vs error purple`
= 0.077 / 0.031 / **0.006** and `primary vs error red` = 0.391 / 0.344 / 0.294.

**One disagreement, on the tightest pair.** Worst case across all fifteen shipped semantic pairs:

| Pair | Contract | My run | |
|---|---|---|---|
| info cyan vs success teal | 0.169 | **0.156** (deut) | below the stated 0.162 floor |
| error red vs success teal | 0.169 | **0.163** (deut) | at the floor |
| primary blue vs secondary deep | 0.182 | 0.182 | agrees |
| every other pair | — | ≥ 0.189 | clear |

Both marginal pairs involve **teal**. Whether the floor is 0.156 or 0.169, `--neon-teal` is the
weak link in an otherwise comfortable set — the next-tightest pair is 0.189, so teal sits alone
at the bottom by a clear margin. The gap between our numbers is ~4%, consistent with a
Viénot-1999 vs Brettel-1997 variant or a linear-vs-gamma detail in where the projection is
applied, so I would not call the contract wrong — but the claim *"every pair clears 0.162"* does
not survive an independent run, and it is the one claim the semantic set rests on.

**Hardening is available but the ceiling is low.** Dropping teal's lightness fixes cyan↔teal
(0.156 → 0.193 at `L=0.560`) but teal↔red stays pinned at ≈0.161 regardless of lightness, so
the system floor barely moves. Searching L×C×H for teal against all five other semantic roles:

| Teal | Floor | Binding pair |
|---|---|---|
| shipped `oklch(0.600 0.130 195)` | 0.156 | vs cyan |
| `oklch(0.57 0.09 205)` | **0.172** | vs red |
| `oklch(0.60 0.09 205)` | 0.169 | vs cyan |

Best available is ~0.172 — a real but modest gain, bought with lower chroma (0.09 reads
noticeably greyer). The honest reading is that **a six-role semantic set is near the capacity of
the dichromat-safe space**: five of six roles sit comfortably above 0.19, and success/teal is
the one that has to squeeze in. The contract's ≈0.162 floor is therefore approximately right —
just achieved at a different pair than its table names, and with less headroom than "clears
0.162" implies. Shape and label carrying state independently is doing more work here than the
colour separation is, which is an argument for keeping that rule strict rather than for
re-tuning teal.

## Contract deltas — repo vs the 0.7.0 source of truth

The contract supplies exact target values, so the P0s stop being open design questions.

| Concern | Contract value | Repo today |
|---|---|---|
| Light panel (`--card`, `--popover`) | `--role-bg-panel: oklch(0.994 0.002 260)` | `oklch(1 0 0.5)` — **pure white** |
| Light surface | `--role-bg-surface: oklch(0.982 0.002 248)` (`#f8f9fa`) | present |
| Light body | `--role-bg-body: oklch(0.961 0 0.5)` | present |
| Deepest dark surface | `--role-bg-sunken: oklch(0.145 0.022 268)` | — |
| Inverse text on fills | `oklch(0.98 0.006 260)` | `text-white` in places |
| Error / destructive | `var(--neon-purple)` = `oklch(0.568 0.202 283.1)`, **not tenant-overridable** | `bg-red-*` in `StatusBadge` |
| Warning | `var(--neon-orange)` = `oklch(0.728 0.168 22.5)` | mixed `amber-*` |

Beyond the audit's original four classes, the contract adds requirements nothing in the repo
currently enforces or implements:

1. **Six-level heading ramp** (`--role-h1`…`h6`), hue walking toward the accent as depth
   increases, every level with a measured ratio. No app has this.
2. **Inline text roles** — `link` / `link-hover` / `link-visited`, `code`, `quote`, `mark`,
   `kbd`, `del`, `strong`, `em` each get their own token. The contract's rule: *no modifier
   inherits body colour*. Currently they do.
3. **Per-app accent via `[data-app]`** — crm7 cyan, bsu purple, conduit green, r80 orange,
   throughput pink, each with separate light/dark *text* variants so the accent is never used
   below AA. The repo sets app brand colour ad hoc.
4. **Pattern doctrine** — 16px dot field = authenticated shell; 32px grid = pre-auth marketing
   hero only; never both in one context.
5. **Glow is dark-mode only.** Light mode is tinted shadows and hairlines.
6. **Tabular figures** — money, hours, rates, award codes and IDs use the mono face with
   `font-variant-numeric: tabular-nums`.

### Two findings from checking whether the contract's building blocks exist

**The `<DotPattern>` the contract mandates already ships** — `packages/ui/src/dot-pattern.tsx`,
with a test, plus `packages/ui/src/hero-grid.tsx` for the marketing grid. Both are exported.

> **Correction (2026-08-02).** I originally wrote that crm7's `Dashboard.tsx` renders a
> hand-rolled `animated-grid-pattern`. **It does not** — `Dashboard.tsx:4` imports `DotPattern`
> from `@bsuite/ui` and always has. I inferred the usage from a `grep -l` that matched the file
> for the string `DotPattern` and read it as evidence of the wrong component. Verified directly
> and corrected.
>
> What was actually true: `crm7/src/components/magicui/animated-grid-pattern.tsx` existed with
> **zero JSX consumers** — dead code, now deleted along with its two barrel exports. Two further
> unused hand-rolled patterns remain and are follow-up, not defects in use:
> `crm7/src/components/magicui/grid-pattern.tsx` (dead), and a `.hero-grid` CSS class in
> `crm7/src/index.css` used only by `MarketingHome.tsx` — correctly scoped to pre-auth, but
> duplicating `@bsuite/ui`'s `HeroGrid`.

**Geist is installed in exactly the wrong app.** The contract chose
`@fontsource-variable/geist` + `geist-mono` 5.3.0 (OFL-1.1) as the D2C face on 2026-08-02.
Measured: `geist@^1.7.2` appears **only in `braden/package.json`** — the Corporate site the
contract explicitly excludes — and in none of the five D2C apps or `packages/theme`. It is also
a *different package* (`geist` is Vercel's next-font wrapper, not the fontsource distribution
the contract names). So the font is both misplaced and the wrong distribution.

This also settles the typography question I had flagged as open: the answer is **Geist**, not
Inter and not the system stack.

## Recommended order

1. `preset-v4.css` card/popover/bg-accent + `vars.css:52` → a near-white surface token.
2. `StatusBadge.tsx` → semantic tokens; `error` → Electric Purple.
3. Strip the local pure-white redeclarations from the six app CSS files so #1 propagates.
4. `packages/schema-builder` token-isation (largest single bypass concentration).
5. Fix the gate: add `white|black` and the full palette-family list to the error rule, wire
   the hex check into `className`, add an `hsl()` check, add a CSS-file check (ESLint cannot
   do this — `scripts/audit-d2c-theme.sh` can, and should run in CI), ship `no-text-white.js`
   to throughput at `error`.
6. Resolve the three doc contradictions.
7. Decide the braden question above.

**Wiring note:** `scripts/audit-d2c-theme.sh` is currently manual-only — nothing invokes it.
It should be added to the parent CI workflow as a non-blocking report first, then promoted to
blocking once the P0/P1 backlog is down. Until that happens it is a tool, not a gate.
