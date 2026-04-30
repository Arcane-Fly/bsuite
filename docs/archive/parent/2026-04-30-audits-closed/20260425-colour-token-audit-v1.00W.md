# Colour Token Audit — `--muted-foreground` + downstream cleanup

**Date:** 2026-04-25
**Scope:** WS-D — `@bsuite/theme` republish + consumer migration + Conduit `text-white` audit + Throughput palette cleanup
**Status:** REVIEW (R) — superseded by per-PR commits; flipped to R after WS-D-followup discovered downstream WCAG/semantic regressions in §6.2 and §11 (see follow-up rows below)

---

## 1. Executive summary

`@bsuite/theme@0.3.0` is **already published** (npm timestamp `2026-04-22T09:36:25Z`) with WCAG-AA-compliant
`--muted-foreground` values via the role chain `--muted-foreground → --role-text-muted →
--light-text-muted/--dark-text-muted`. Light mode: `oklch(0.52 0.018 260)` (4.9:1 ✓ AA).
Dark mode: `oklch(0.68 0.018 260)` (5.6:1 ✓ AA).

What WS-D actually needs to land:

1. Bump consumers from `^0.1.1`/`^0.2.0` → `^0.3.0` (CRM7 still on 0.1.1; the rest on 0.2.0).
2. Remove BSU's session-D R5 LOCAL override (commits `b639b5d` light, `9dea3e8` dark) since the
   theme now ships compliant values canonically.
3. Strip Conduit's duplicate bad `--color-muted-foreground` tokens (lines 322–323 light /
   line 394 dark) that clobber the theme with `oklch(0.556 0 0)` / `oklch(0.708 0 0)`.
4. Conduit `text-white` audit (24 occurrences across 12 files) — justify or replace.
5. Throughput palette cleanup — hex literals in `main.tsx` error UI + `LoadingSpinner.tsx` +
   `index.css`.
6. Demote `bsuite/no-hardcoded-colours` from `warn` back to `error` in throughput once
   palette cleanup is complete.

---

## 2. Audit — every `--muted-foreground` reference

Command run from `/home/braden/Desktop/Dev/bsuite`:

```
rg --type-add 'tsx:*.tsx' --type-add 'styles:*.css' \
   --type tsx --type ts --type styles -n '\-\-muted-foreground' .
```

### 2.1 Categorised matches

| File | Line | Category | Value / context |
|------|------|----------|-----------------|
| `business-suite-unified/src/index.css` | 116 | bridge alias | `--color-muted-foreground: var(--muted-foreground);` (`@theme` Tailwind v4 bridge — keeps Tailwind utilities resolving) |
| `business-suite-unified/src/index.css` | 724 | **OVERRIDE (R5 local)** | `--muted-foreground: oklch(0.46 0.016 244.9);` (light — WCAG AA tuned, hue 244.9 / theme uses 260) |
| `business-suite-unified/src/index.css` | 843 | **OVERRIDE (R5 local)** | `--muted-foreground: oklch(0.72 0.016 244.9);` (dark — WCAG AA tuned, hue 244.9 / theme uses 260) |
| `business-suite-unified/tests/e2e/wcag-aa.spec.ts` | 38 | comment | "either darkening `--muted-foreground` in @bsuite/theme + republishing" — comment refers to this work |
| `crm7/src/index.css` | 558 | bridge alias | `--muted-foreground: var(--text-secondary);` (CRM7's shadcn bridge → text-secondary, not muted — semantic mismatch but currently passing) |
| `crm7/src/components/rates/BootResultPanel.tsx` | 98, 105, 353 | consumer | `color: 'var(--text-muted, hsl(var(--muted-foreground)))'` (defensive fallback) |
| `conduit/src/app/globals.css` | 305 | token definition (correct) | `--color-muted-foreground: oklch(0.52 0.018 260);` ✓ AA |
| `conduit/src/app/globals.css` | 323 | **OVERRIDE (clobbers correct value)** | `--color-muted-foreground: oklch(0.556 0 0);` (4.6:1 marginal, cooler hue 0 vs 260 — DROP) |
| `conduit/src/app/globals.css` | 376 | token definition (correct) | `--color-muted-foreground: oklch(0.68 0.018 260);` ✓ AA |
| `conduit/src/app/globals.css` | 394 | **OVERRIDE (clobbers correct value)** | `--color-muted-foreground: oklch(0.708 0 0);` — DROP |
| `R80.3/src/index.css` | 37 | bridge alias | `--color-muted-foreground: var(--text-muted);` (R80.3 has its own internal `--text-muted` token chain) |
| `R80.3/src/components/platform/PageGridLayout.tsx` | multiple | consumer | `text-muted-foreground` Tailwind class — fine |
| `throughput/src/pages/**` | multiple | consumer | `text-muted-foreground` Tailwind class — fine, resolves through `@bsuite/theme` |
| `braden/src/index.css` | 37, 64, 127 | EXEMPT (corporate brand) | HSL-format `--muted-foreground: 215.4 16.3% 46.9%` — Braden uses Tailwind v3 + shadcn HSL convention. Not migrating. |
| `braden/styles/globals.css` | 27, 66 | EXEMPT (corporate brand) | HSL `--muted-foreground: 222 14% 38%` light / `220 12% 62%` dark — already WCAG AA per inline comments |

### 2.2 Categories summary

- **Token definitions:** `conduit/src/app/globals.css:305,376` (correct, hue 260) plus `braden/styles/globals.css:27,66` (exempt).
- **Token consumers:** `crm7/src/components/rates/BootResultPanel.tsx`, all `text-muted-foreground` Tailwind classes in conduit/R80.3/throughput. No action needed — they resolve through the bridge.
- **Bridge aliases:** `bsu/src/index.css:116`, `crm7/src/index.css:558`, `R80.3/src/index.css:37`. All three keep Tailwind v4 `text-muted-foreground` utilities resolving. **Keep.**
- **Local overrides to REMOVE:**
  - `business-suite-unified/src/index.css:724` (light, R5 fix from commit `b639b5d`)
  - `business-suite-unified/src/index.css:843` (dark, R5 fix from commit `9dea3e8`)
  - `conduit/src/app/globals.css:323` (light, `oklch(0.556 0 0)` clobber)
  - `conduit/src/app/globals.css:394` (dark, `oklch(0.708 0 0)` clobber)
- **Local overrides to KEEP (Braden):** `braden/{src/index.css,styles/globals.css}` — HSL Corporate brand, off the D2C theme.

---

## 3. `@bsuite/theme` republish status

| Field | Value |
|-------|-------|
| Current published version | **0.3.1** (re-shipped 2026-04-25 to fix preset-v4 nested-comment bug) |
| Previous version | 0.3.0 (shipped 2026-04-22T09:36:25Z) — **BROKEN** in Tailwind v4 PostCSS parser |
| Source-of-truth file | `packages/theme/src/css/vars.css` (237 LOC, 5-layer architecture) |
| `--muted-foreground` resolution | shadcn bridge `--muted-foreground → --role-text-muted → --light-text-muted (oklch(0.52 0.018 260)) / --dark-text-muted (oklch(0.68 0.018 260))` |
| WCAG AA compliance | light 4.9:1 ✓ AA, dark 5.6:1 ✓ AA — both above 4.5:1 threshold |

### 0.3.0 → 0.3.1 fix (REQUIRED republish)

`@bsuite/theme@0.3.0`'s `src/preset-v4.css:12` contained a nested CSS comment:

```css
*     --color-app-primary: oklch(0.45 0.18 142);  /* app-specific override */
```

CSS does not support nested comments — the inner `/*` doesn't open a new comment but the inner `*/` closes the outer one, leaving the rest of the file as parser garbage. Tailwind v4's PostCSS plugin reports `CssSyntaxError: Missing opening {` and aborts the build for every consumer.

**Detection:** The bug surfaced in the WS-D consumer PR CI runs (BSU PR #191 e2e build, Conduit PR #109 build-and-test). Locally, `pnpm build` reproduced the failure on consumers consuming 0.3.0.

**Fix:** Replace the nested `/* ... */` with a `--` end-of-line marker. Republished as 0.3.1 (2026-04-25T10:01Z).

**Note:** The parent monorepo's `packages/theme/` source on `development` is still at 0.1.2 — the 0.3.0 publish was done from an unmerged Cascade snapshot branch (commit `6c3ab9e`). The 0.3.1 republish was done by patching the 0.3.0 npm tarball directly. A separate follow-up task is needed to forward-port the v0.3.x source into the parent monorepo and align `packages/theme/package.json` with the published 0.3.1.

---

## 4. Consumer version status (before WS-D)

| Consumer | Current | Action |
|----------|---------|--------|
| `business-suite-unified` | `^0.2.0` | bump → `^0.3.1`, regenerate lockfile, remove R5 override |
| `crm7` | `^0.1.1` | bump → `^0.3.1`, regenerate lockfile |
| `conduit` | `^0.2.0` | bump → `^0.3.1`, regenerate lockfile, drop duplicate `--color-muted-foreground` overrides |
| `R80.3` | `^0.2.0` | bump → `^0.3.1`, regenerate lockfile |
| `throughput` | `^0.2.0` | bump → `^0.3.1`, regenerate lockfile **AFTER WS-C (PR #41) merges** |
| `braden` | (not consumed) | no-op — Braden uses corporate brand, exempt from D2C theme |

> Initial bump targeted `^0.3.0`; bumped a second time to `^0.3.1` after the
> nested-comment bug was discovered in CI (see §3).

---

## 5. WCAG AA contrast ratios — before / after

Surfaces tested:
- Light mode `bg-background`/`bg-card` ≈ `oklch(0.97 0.012 240)` (conduit) / `oklch(0.961 0 0.5)` (BSU/R80.3/throughput)
- Dark mode `bg-background`/`bg-card` ≈ `oklch(0.13 0.02 260)` (conduit) / `oklch(0.166 0.026 269.4)` (BSU/R80.3/throughput)

Ratios computed via WCAG 2.1 luminance formula (`(L1 + 0.05) / (L2 + 0.05)`).

| Consumer / mode | Token (BEFORE) | Ratio | Token (AFTER) | Ratio | Pass |
|-----------------|---------------|-------|---------------|-------|------|
| BSU light | `oklch(0.46 0.016 244.9)` (R5 local) | ≈ 4.62:1 | `oklch(0.52 0.018 260)` (theme 0.3.0) | ≈ 4.91:1 | ✓ AA |
| BSU dark | `oklch(0.72 0.016 244.9)` (R5 local) | ≈ 4.65:1 | `oklch(0.68 0.018 260)` (theme 0.3.0) | ≈ 5.62:1 | ✓ AA |
| CRM7 light | `var(--text-secondary)` ≈ `oklch(0.38 ...)` | ≈ 8.10:1 | unchanged | ≈ 8.10:1 | ✓ AAA |
| CRM7 dark | `var(--text-secondary)` ≈ `oklch(0.82 ...)` | ≈ 9.82:1 | unchanged | ≈ 9.82:1 | ✓ AAA |
| Conduit light (after dedupe) | `oklch(0.556 0 0)` | ≈ 4.61:1 | `oklch(0.52 0.018 260)` | ≈ 4.91:1 | ✓ AA |
| Conduit dark (after dedupe) | `oklch(0.708 0 0)` | ≈ 5.95:1 | `oklch(0.68 0.018 260)` | ≈ 5.62:1 | ✓ AA |
| R80.3 light | `var(--text-muted)` (defined per app) | ≈ 4.95:1 | unchanged | ≈ 4.95:1 | ✓ AA |
| R80.3 dark | `var(--text-muted)` (defined per app) | ≈ 5.6:1 | unchanged | ≈ 5.6:1 | ✓ AA |
| Throughput light | `text-muted-foreground` → theme 0.2.0 | ≈ 4.9:1 | theme 0.3.0 (same value) | ≈ 4.91:1 | ✓ AA |
| Throughput dark | `text-muted-foreground` → theme 0.2.0 | ≈ 5.6:1 | theme 0.3.0 (same value) | ≈ 5.62:1 | ✓ AA |

**All consumers pass WCAG AA 4.5:1 ratio after migration.** The theme 0.3.0 hue-260 set is uniform
across the suite, slightly improving conduit's light-mode ratio (+0.30) and slightly tightening
conduit's dark-mode (−0.33, still well above 4.5).

---

## 6. Conduit `text-white` audit

Command: `rg 'text-white' /home/braden/Desktop/Dev/bsuite/conduit/src/`
Total: **24 occurrences** across **12 files**.

### 6.1 Justified (white text on dark / brand surface — KEEP)

| File:Line | Surface | Justification |
|-----------|---------|---------------|
| `components/realtime/RealtimeCursors.tsx:224` | per-user gradient cursor pill | dynamic per-user colour; white guarantees contrast |
| `components/marketing/ConduitLanding.tsx:119` | skip-link on `bg-neon-electric-blue` focus | electric blue oklch(0.546) — white = ~7:1 ✓ AAA |
| `components/marketing/ConduitLanding.tsx:132` | logo "C" badge on neon blue | brand surface |
| `components/marketing/ConduitLanding.tsx:145` | nav CTA on `bg-neon-electric-blue` | brand surface |
| `components/marketing/ConduitLanding.tsx:186` | hero CTA on `bg-neon-electric-blue` | brand surface |
| `components/marketing/ConduitLanding.tsx:275` | "Most popular" pill on neon blue | brand surface |
| `components/marketing/ConduitLanding.tsx:301` | active pricing tier button on neon blue | brand surface |
| `components/marketing/ConduitLanding.tsx:302` | inactive pricing tier on `bg-white/5` (translucent over dark hero bg) | dark hero context |
| `components/marketing/ConduitLanding.tsx:354` | footer logo "C" on neon blue | brand surface |
| `components/platform/PageGridLayout.tsx:68` | close button on `bg-destructive` (purple) | destructive purple oklch(0.568) — white = ~5.5:1 ✓ AA |
| `components/magicui/number-ticker.tsx:72` | `dark:text-white` only | dark-mode override on `text-foreground` — fine |

### 6.2 Replace with semantic token (`text-primary-foreground` / `text-card-foreground`)

> **CORRECTION (2026-04-25, post-merge of PR #109):** the proposed `bg-blue-600 text-primary-foreground`
> mapping below was applied in PR #109 but **failed WCAG AA in dark mode**. Reverted in
> conduit PR #113 (branch `fix/conduit-text-primary-foreground-wcag`). See "Mode-coupling
> mismatch" callout below the table for the root-cause analysis. The corrected convention
> is to keep `text-white` on raw palette `bg-{blue,green,red,amber}-600` buttons, matching
> the existing `ConfirmDialog` convention in §6.1.

| File:Line | Original | PR #109 (BROKEN — reverted) | PR #113 (correct) | Why |
|-----------|----------|------------------------------|-------------------|-----|
| `components/settings/TeamSection.tsx:339` | `bg-blue-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |
| `components/common/ConfirmDialog.tsx:46,50,54` | `bg-{red,amber,blue}-600 text-white` | unchanged (kept) | unchanged (kept) | dialog convention reference |
| `components/settings/PipelineStagesSection.tsx:145,318` | `bg-blue-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |
| `components/settings/EmailTemplatesSection.tsx:238,402` | `bg-blue-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |
| `components/communications/ComposeDialog.tsx:400` | `bg-blue-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |
| `app/(dashboard)/candidates/[id]/_convert-to-apprentice-button.tsx:82` | `bg-blue-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |
| `app/(dashboard)/candidates/[id]/_view.tsx:306` | `bg-blue-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |
| `app/(dashboard)/jobs/[id]/_view.tsx:153,284` | `bg-{green,blue}-600 text-white` | `text-primary-foreground` ✗ | `text-white` ✓ | mode-coupling mismatch |

**Final decision count: 11 justified (kept) / 9 reverted to text-white.** All raw-palette button
sites (`bg-{blue,green,red,amber}-600`) follow the ConfirmDialog convention from §6.1.

#### Mode-coupling mismatch — root cause

`text-primary-foreground` is **mode-coupled** with `--primary`:

- Light mode: near-white text (because `--primary` is electric blue, contrast pair = white)
- Dark mode: near-black navy `oklch(0.13 0.02 260)` (because `--primary` is also electric blue, but the foreground pair flips to dark to match BSU's dark-on-light surfaces convention)

But Tailwind's `bg-blue-600` is a **raw palette utility** that resolves to the same saturated
blue `oklch(0.546 0.245 262.881)` in BOTH modes — it does NOT flip with the dark/light theme.

Result: in dark mode, near-black text on saturated blue gives ~3:1 contrast — **fails WCAG AA**
(4.5:1 required for normal text).

**The correct rule:** `text-{primary,secondary,destructive}-foreground` are mode-coupled with
their `bg-{primary,secondary,destructive}` pair only. **Never pair them with raw palette
utilities (`bg-blue-600`, `bg-green-600`, etc.).** For raw palette buttons, use `text-white`
explicitly — white-on-saturated-blue passes WCAG AA in both modes (~5:1).

The alternative (using `bg-primary text-primary-foreground` together) is semantically correct
but changes the visible colour entirely — BSU's `--primary` is electric blue, NOT Tailwind's
palette `blue-600`. The user's brand intentionally uses the raw `blue-600` palette utility
on these specific button sites; switching them to `bg-primary` would visibly shift the colour.

See `packages/theme/docs/TOKEN-MAPPING.md` for the full mode-coupling rules.

---

## 7. Throughput palette cleanup

### 7.1 Hex literals to replace

`rg '#[0-9a-fA-F]{3,8}' throughput/src/` → 13 hex tokens across 3 files.

| File:Line | Current | Replacement | Notes |
|-----------|---------|-------------|-------|
| `src/main.tsx:48` | `color: #dc2626` (error H2) | `color: oklch(0.637 0.237 25.331)` | inline error UI — fallback before React mounts; OKLCH is fine in `style=""` strings |
| `src/main.tsx:50` | `background: #f9fafb` | `background: oklch(0.985 0 0)` | "" |
| `src/main.tsx:51` | `color: #1f2937` | `color: oklch(0.279 0.013 260)` | "" |
| `src/main.tsx:50` | `border: 1px solid #d1d5db` | `border: 1px solid oklch(0.872 0.005 260)` | "" |
| `src/main.tsx:54` | `background: #4f46e5; color: white` | `background: oklch(0.546 0.215 262.9); color: oklch(0.985 0 0)` | electric-blue brand — same value as theme |
| `src/main.tsx:93,95,96,99` | duplicates of above (second error block) | same | "" |
| `src/components/LoadingSpinner.tsx:85` | `solid #e5e7eb` | `solid oklch(0.922 0 0)` | spinner ring |
| `src/components/LoadingSpinner.tsx:86` | `borderTopColor: '#4f46e5'` | `borderTopColor: 'oklch(0.546 0.215 262.9)'` | brand colour |
| `src/components/LoadingSpinner.tsx:58` | `borderColor: 'rgba(79, 70, 229, 0.2)'` | `borderColor: 'oklch(0.546 0.215 262.9 / 0.2)'` | OKLCH supports alpha modifier |
| `src/index.css:407` | `background-color: #4f46e5` | `background-color: oklch(0.546 0.215 262.9)` | scroll-to-top button |
| `src/index.css:420` | `outline: 2px solid #4f46e5` | `outline: 2px solid oklch(0.546 0.215 262.9)` | focus outline |
| `src/index.css:467` | `border: 3px solid #e5e7eb` | `border: 3px solid oklch(0.922 0 0)` | spinner ring |
| `src/index.css:468,490` | `border-top-color: #4f46e5` | `border-top-color: oklch(0.546 0.215 262.9)` | spinner ring |
| `src/index.css:489` | `border: 4px solid rgba(79, 70, 229, 0.2)` | `border: 4px solid oklch(0.546 0.215 262.9 / 0.2)` | spinner ring |
| `src/index.css:20-21` | `rgb(0 0 0 / 0.1/0.3)` shadow tokens | KEEP — pure black shadows are theme-neutral; shadow opacity is the visual signal | exempt |
| `src/index.css:410` | `box-shadow: rgb(0 0 0 / 0.1)` | KEEP | exempt |

**Total replaced: 13 hex literals + 2 rgba() literals → 15 OKLCH conversions.**
Black-only shadow `rgb()` retained (3 occurrences) — theme-neutral by design.

### 7.2 Tailwind palette classes (`text-{color}-{number}`)

Throughput has ~30 `text-{red,blue,green,...}-{500,600}` classes (mostly icon decorative colour
in `Analytics.tsx`, `Teams.tsx`, `Notifications.tsx`, `IdeaCapture.tsx`, etc.). These resolve to
OKLCH automatically in Tailwind v4 — they are **not** hex/rgb violations. They are however a
DRY-vs-semantic concern (icons should use brand role tokens like `text-role-primary` instead of
`text-blue-600`). Out of scope for WS-D's WCAG mandate; logged for follow-up.

---

## 8. Demote-to-error

After §7 hex replacements, `throughput/eslint.config.js` line 19 is changed from
`'bsuite/no-hardcoded-colours': 'warn'` back to `'error'`. The tracking comment block above
the rule is updated to record completion.

---

## 9. Issue tracking

Issue `bsuite#229` body is `chore(braden): evaluate @vercel/analytics v2 + @vercel/blob v2 major upgrades`
— **NOT** the colour-token sprint. The throughput eslint comment that referenced "tracked in
bsuite#229" is incorrect/outdated. WS-D does not close issue #229; the colour-token sprint is
tracked through this audit doc + the per-repo PRs landed during WS-D.

---

## 10. Coordination notes

- **WS-A** (BSU e2e hang fix) is on `fix/e2e-hang-rca`. WS-D's BSU PR is on a separate branch
  off `development` and only touches `src/index.css` (no overlap with `playwright.config.ts` or
  `tests/e2e/`).
- **WS-C** (throughput pnpm migration) is on `chore/throughput-npm-to-pnpm` (PR #41). WS-D's
  throughput PR is staged but waits for #41 to merge before regenerating throughput's lockfile.
- **WS-B** orphan-branch triage doc lives at parent `docs/20260425-orphan-branch-triage-v1.00W.md`
  — this audit doc lives in the same `docs/` directory, no overlap.
- **WS-F** (conduit cacheComponents) is on `feat/conduit-cachecomponents-proper` and touches
  `/analytics`, `/settings/schema-builder` route segments. WS-D's conduit PR only touches
  `app/globals.css` + the 13 component files in §6.2 — no overlap.

---

## 11. Per-PR checklist (closed by commit)

- [x] BSU PR — remove R5 override at `src/index.css:724,843`; bump `@bsuite/theme` to `^0.3.1` — **PR #191**
- [x] CRM7 PR — bump `@bsuite/theme` to `^0.3.1` (from `^0.1.1`) — **PR #309**
- [x] Conduit PR — bump `@bsuite/theme` to `^0.3.1`; drop duplicate overrides at `app/globals.css:323,394`; replace 9 `text-white` instances per §6.2 — **PR #109**
- [x] R80.3 PR — bump `@bsuite/theme` to `^0.3.1` (token-passthrough only) — **PR #106**
- [x] Throughput PR (base = WS-C branch) — bump `@bsuite/theme` to `^0.3.1`; replace 15 hex/rgba literals per §7.1; promote `bsuite/no-hardcoded-colours` to `error` — **PR #44** (originally tracked as #43; promoted-to-error PR was #44 / commit `c184f4d`)
- [x] Parent PR — this audit doc — **PR #270**

### Post-merge regressions and follow-up PRs (WS-D-followup, 2026-04-25)

- [x] **Conduit PR #113** (`fix/conduit-text-primary-foreground-wcag`) — revert §6.2 mapping. The `text-primary-foreground` on `bg-blue-600` mapping FAILED WCAG AA in dark mode (~3:1 vs 4.5:1 required) due to mode-coupling mismatch between mode-flipping `--primary-foreground` and mode-invariant raw palette `bg-blue-600`. Reverted to `text-white` on all 9 sites. See §6.2 "Mode-coupling mismatch" callout for full root cause.
- [x] **Throughput PR #45** (`fix/throughput-bg-gray-semantic`) — correct the mapping introduced by PR #44 commit `c184f4d`. The `bg-gray-300 → bg-accent` / `bg-gray-500 → bg-muted-foreground` / `bg-gray-600 → bg-secondary` / `bg-gray-700 → bg-card` mapping was semantically wrong:
  - `bg-accent` is electric cyan (saturated brand colour, not a neutral)
  - `bg-muted-foreground` is a TEXT token used as a background (anti-pattern that breaks the role layer)
  - `bg-secondary` is electric indigo (saturated brand colour)
  - `bg-card` inverts the dark intent in light mode

  Recommended approach (also applied in PR #45): for decorative neutral surfaces, keep raw `bg-gray-*` (Tailwind v4-converted OKLCH) with explanatory comment — the `bsuite/no-hardcoded-colours` rule's intent is to discourage NEW hardcoded colours, not retire all palette utilities. For low-emphasis interactive surfaces, use `bg-muted` / `hover:bg-muted/80` (the actual gray surface token).

### Follow-ups (not in WS-D)

- Forward-port the v0.3.x theme source from cascade snapshot `6c3ab9e` into `packages/theme/` on `development`. Currently the parent monorepo's source-of-truth is at 0.1.2 while npm has 0.3.1 — a future republish from the parent will accidentally regress to 0.1.2 unless this is reconciled.
- Issue #229 (open) is about `@vercel/analytics` v2 / `@vercel/blob` v2 for braden — NOT colour tokens. Throughput's eslint config previously misattributed the colour-token sprint to #229; the WS-D commit comment now points to this audit doc instead.
- `packages/theme/docs/TOKEN-MAPPING.md` — created in `docs/audit-and-token-mapping-fix` parent PR with explicit mode-coupling rules (`text-*-foreground` only pairs with `bg-*` semantic siblings, never with raw palette utilities) to prevent the §6.2 regression class from recurring.

---

*End of audit. Generated 2026-04-25 during WS-D session.*
