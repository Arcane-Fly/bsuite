# `@bsuite/theme` — Token Mapping Reference

**Version:** 0.3.1+
**Last updated:** 2026-04-25
**Audience:** Engineers writing or reviewing JSX/TSX with Tailwind classes in BSuite apps. D2C apps use the Neon Electric baseline; Braden uses a separate Corporate baseline with the same OKLCH role-token architecture.

---

## 1. The two layers — and why this matters

`@bsuite/theme` ships **two distinct kinds** of colour tokens. Mixing them is the single most common source of WCAG-AA contrast regressions. Understand the distinction before reaching for `text-*-foreground`.

### Layer A: semantic role tokens (mode-coupled pairs)

These are the canonical brand-aware tokens. Every semantic background has a partnered foreground text token, and **the pair flips together** between light and dark mode.

| Surface (bg) | Partnered text | Light-mode value | Dark-mode value |
|--------------|----------------|------------------|-----------------|
| `bg-primary` | `text-primary-foreground` | electric blue / near-white | electric blue / near-black navy `oklch(0.13 0.02 260)` |
| `bg-secondary` | `text-secondary-foreground` | electric indigo / white | electric indigo / dark navy |
| `bg-accent` | `text-accent-foreground` | electric cyan / dark | electric cyan / dark |
| `bg-destructive` | `text-destructive-foreground` | purple / near-white | purple / near-white |
| `bg-card` | `text-card-foreground` | white / foreground | navy / foreground |
| `bg-muted` | `text-muted-foreground` | light gray / mid-gray | dark gray / light gray |
| `bg-background` | `text-foreground` | off-white / near-black | navy / near-white |

**Rule A1:** `text-{role}-foreground` is **only** safe when paired with the matching `bg-{role}` semantic class. The pair was designed and tested as a unit.

**Rule A2:** If you change the background to a different token (or a raw palette utility), you **must** change the foreground to match.

### Layer B: raw Tailwind palette utilities (mode-invariant)

`bg-blue-600`, `bg-green-600`, `bg-red-500`, etc. These resolve to fixed OKLCH values that **do NOT flip between light and dark mode**. Tailwind v4 converts them at build time but they remain semantically a "raw" colour, not a brand token.

**Rule B1:** Prefer role tokens over raw palette utilities. If a raw palette utility is genuinely required, pair it with an explicit inverse token such as `text-text-on-primary`, `text-text-on-accent`, or `text-foreground` after checking contrast — never with `text-*-foreground`.

**Rule B2:** Do not add new `text-white` or `text-black` in consumer code. White/black only belong in theme-layer inverse tokens and legacy fallback comments.

---

## 2. The mode-coupling mismatch — why `bg-blue-600 text-primary-foreground` fails

This is the regression class that triggered the 2026-04-25 audit follow-up (conduit PR #113).

```
Light mode:
  bg-blue-600           = oklch(0.546 0.245 262.881)   [saturated blue, fixed]
  text-primary-foreground = oklch(1 0 0)               [near-white, light-mode value]
  Contrast ratio        ≈ 5.1 : 1  ✓ AA pass

Dark mode:
  bg-blue-600           = oklch(0.546 0.245 262.881)   [saturated blue, SAME — palette is mode-invariant]
  text-primary-foreground = oklch(0.13 0.02 260)       [near-black navy, dark-mode value]
  Contrast ratio        ≈ 3.0 : 1  ✗ FAIL AA  (4.5:1 required)
```

The bug: `text-primary-foreground` flips with the theme, but `bg-blue-600` does not. In dark mode, a near-black foreground over a saturated mid-blue background gives ~3:1 — the text is barely legible.

**The fix:** switch the whole pair to semantic tokens whenever the intent is a brand action.

```diff
- className="bg-blue-600 text-primary-foreground hover:bg-blue-700"
+ className="bg-primary text-primary-foreground hover:bg-primary/90"
```

If the raw palette colour is deliberately required, use an explicit inverse text token and document the contrast check:

```diff
- className="bg-blue-600 text-primary-foreground hover:bg-blue-700"
+ className="bg-blue-600 text-text-on-primary hover:bg-blue-700"
```

But understand this **changes the visible colour**. BSU's `--primary` is electric blue `oklch(0.546 0.215 262.9)`, very close to but not identical to Tailwind's `blue-600` `oklch(0.546 0.245 262.881)`. If a designer chose `bg-blue-600` deliberately, keep it only with an explicit inverse token and a recorded contrast check.

---

## 3. The `bg-gray-*` pitfall — why `bg-gray-300 → bg-accent` is wrong

This is the regression class that triggered throughput PR #45.

`bg-gray-300`, `bg-gray-500`, `bg-gray-600`, `bg-gray-700` are **neutral grays**. Mapping them naively to semantic role tokens introduces saturated brand colours where neutral was intended:

| Original (neutral gray) | Wrong mapping | What you actually get |
|-------------------------|---------------|------------------------|
| `bg-gray-300` | `bg-accent` | electric cyan (saturated brand colour) |
| `bg-gray-500` | `bg-muted-foreground` | text token used as background — anti-pattern that breaks the role layer |
| `bg-gray-600` | `bg-secondary` | electric indigo (saturated brand colour) |
| `bg-gray-700` | `bg-card` | white in light mode (inverts the dark intent) |

**The correct mapping:**

| Original | Use | When |
|----------|-----|------|
| `bg-gray-{100,200}` | `bg-muted` | low-emphasis surface (cards, hover states) |
| `bg-gray-{300,400,500}` | keep raw `bg-gray-*` with explanatory comment | decorative neutral elements (status dots, avatar fallbacks) — the rule's intent is to discourage NEW hardcoded colours, not retire all palette utilities |
| `bg-gray-{600,700,800}` | keep raw `bg-gray-*` for `dark:` only, or use `bg-card` if both modes share a card surface | dark-mode-specific surfaces |
| `bg-gray-900` | `bg-background` | full-page dark background |

The `bsuite/no-hardcoded-colours` ESLint rule's regex `\b(text|bg|border|divide)-(slate|gray|zinc|neutral)-(\d{2,3})\b` does fire on these patterns in principle, but its current AST visitor in @typescript-eslint may not catch every JSX form. Add an `eslint-disable-next-line` comment **only** when the lint actually flags an intentional decorative use.

---

## 4. Quick reference — when to use which token

### Buttons

| Intent | Recommended | Notes |
|--------|-------------|-------|
| Primary brand action | `bg-primary text-primary-foreground hover:bg-primary/90` | mode-coupled pair, will track tenant white-labelling via `BrandingProvider` |
| Raw blue confirmation button | `bg-blue-600 text-text-on-primary hover:bg-blue-700` | legacy/raw palette exception; document the contrast check |
| Destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | purple by platform policy; red/coral is not the semantic error role |
| Secondary / low-emphasis | `bg-muted text-foreground hover:bg-muted/80` | uses neutral surface, foreground text |
| Outline / ghost | `border border-border bg-background text-foreground hover:bg-muted` | minimal, semantic |

### Surfaces

| Intent | Recommended |
|--------|-------------|
| Page background | `bg-background` |
| Card / panel | `bg-card text-card-foreground` |
| Low-emphasis surface | `bg-muted text-muted-foreground` |
| Hover state on muted surface | `hover:bg-muted/80` (light) or `hover:bg-muted` (dark) |
| Modal / dialog | `bg-background border border-border` |

### Text

| Intent | Recommended |
|--------|-------------|
| Default body text | `text-foreground` |
| De-emphasised body text | `text-muted-foreground` |
| Text on `bg-primary` | `text-primary-foreground` |
| Text on raw `bg-{blue,green,red,amber}-{500,600}` | explicit inverse token after contrast check; prefer semantic role pairs |
| Text on `bg-card` | `text-card-foreground` (or `text-foreground`, equivalent) |

---

## 5. ESLint rule (`bsuite/no-hardcoded-colours`)

The rule lives at:
- `packages/eslint-config/rules/no-hardcoded-colours.js` (canonical)
- Per-app inlined copies in `{conduit,throughput,...}/eslint-rules/no-hardcoded-colours.js`

**What it forbids:**
- Tailwind palette utilities matching `\b(text|bg|border|divide)-(slate|gray|zinc|neutral)-(\d{2,3})\b` in JSX `className` strings
- Hex literals (`#3b82f6`) in object/property string values
- `rgb()` / `rgba()` literals in object/property string values

**What it does NOT catch:**
- `bg-gray-*` inside template literals (only checks `quasis[].value.raw` → still catches static fragments)
- Coloured palette utilities outside the `gray|slate|zinc|neutral` set (`bg-blue-600`, `bg-red-500` are intentional brand-ish accents and not flagged)
- Inline `style={{ color: '#abc' }}` (use `style` prop sparingly; flagged via `Property` visitor only when the literal is a plain hex string)

**Disabling correctly:**

```tsx
// GOOD — inline disable with reason
{/* eslint-disable-next-line bsuite/no-hardcoded-colours -- decorative neutral status dot, no semantic equivalent */}
<span className="bg-gray-300" />

// GOOD — disable on the JSX opening tag for multi-line JSX
<div
  /* eslint-disable-next-line bsuite/no-hardcoded-colours -- decorative overflow avatar, mid-gray neutral by design */
  className="bg-gray-500 ..."
>
```

```tsx
// BAD — comment is dropped by parser, attached to nothing
{/* eslint-disable-next-line ... */}
{condition && <div className="bg-gray-500" />}
```

Always test with `pnpm lint` after adding disables — eslint reports unused-disable directives as warnings, which signals the rule didn't actually fire and the disable can be removed.

---

## 6. Migration checklist when adding a new component

Before you commit any new JSX with colour classes:

1. **Default to semantic tokens.** `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground` cover ~80% of UI surfaces.
2. **For brand-coloured actions, use `bg-primary text-primary-foreground`** (mode-coupled pair).
3. **For raw Tailwind palette buttons (`bg-blue-600` etc.), use an explicit inverse token after contrast verification.** Never `text-primary-foreground`, `text-white`, or `text-black` in consumer code.
4. **For decorative neutral grays, prefer `bg-muted`.** Only fall back to raw `bg-gray-*` for genuinely decorative elements where `bg-muted` resolves to the wrong tone.
5. **Run `pnpm lint`** — the rule catches the most common mistakes at build time.
6. **Test in light AND dark mode.** Mode-coupling regressions only surface in one mode.

---

## 7. References

- Parent monorepo audit: `docs/20260425-colour-token-audit-v1.00W.md` — full WCAG AA contrast table + per-PR migration log + WS-D-followup regressions
- D2C theme spec: `docs/20260228-d2c-theme-specification-v1.00A.md`
- WCAG contrast audit: `docs/20260407-d2c-wcag-contrast-audit-v1.00A.md`
- Conduit PR #113 — revert of incorrect §6.2 mapping (mode-coupling mismatch)
- Throughput PR #45 — correction of `bg-gray-*` semantic mapping

---

## 8. Six-tier text-role contract, canonical gradient, grid/dot doctrine, sRGB fallbacks (v0.6.0, W3 "A1")

Ships as `@bsuite/theme` **0.6.0**. Contract-before-component: this release ships tokens + contract + primitives + lint; `<AppShell>` is deferred to 0.7.0 as a thin consumer of this contract.

### 8.1 The six text-role tiers

Every D2C surface binds text to exactly one of six roles — never to a raw palette utility or an ad-hoc oklch literal. All six existed prior to this release (`vars.css` Layer 3); this release re-measures and documents their contrast precisely, and fixes the inline comments (some of which understated the real ratio — see §8.4 methodology).

| Role token | Intent | Light L | Dark L | Light vs `--role-bg-body` | Dark vs `--role-bg-body` | WCAG |
|---|---|---|---|---|---|---|
| `--role-text-heading` | Page/section headings | 0.20 | 0.92 | 16.17:1 | 15.21:1 | AAA |
| `--role-text-body` | Default body copy | 0.22 | 0.94 | 15.46:1 | 16.16:1 | AAA |
| `--role-text-secondary` | Labels, sub-headings | 0.38 | 0.82 | 8.94:1 | 11.04:1 | AAA |
| `--role-text-muted` | Metadata, captions | 0.52 | 0.68 | 4.92:1 | 6.69:1 | AA (normal text, 4.5:1 floor) |
| `--role-text-subtle` | Placeholders, decorative labels | 0.60 | 0.56 | 3.52:1 | 4.14:1 | AA **large text only** (3:1 floor) — fails 4.5:1 normal-text AA |
| `--role-text-disabled` | Disabled controls | 0.72 | 0.44 | 2.21:1 | 2.48:1 | **Fails AA at any size** — MUST pair with a non-colour cue (icon, `cursor-not-allowed`, `aria-disabled`) |

Every ratio is the **conservative floor** — each tier scores strictly higher against `--role-bg-panel`/`--role-bg-surface` than against `--role-bg-body` (measured; see §8.4). `--role-text-subtle` and `--role-text-disabled` are intentionally sub-4.5:1 by design (placeholder/disabled semantics), not a defect — both are documented above with their required non-colour pairing.

Dark-mode text is capped at `L=0.94` (`--role-text-body`); no tier ever reaches pure white (`L=1.0`), per the anti-glare eye-strain policy.

### 8.2 The one canonical gradient

Exactly **one** decorative accent gradient exists suite-wide:

```css
--gradient-accent: linear-gradient(135deg, var(--role-primary), var(--role-accent));
```

Electric Blue → Cyan by default; automatically re-colours for white-labelled tenants because it references `--role-primary`/`--role-accent` via `var()`, not a hardcoded pair. Exposed as the `.bsuite-accent-gradient` utility class (`utilities.css`).

**Scope — marketing heroes only.** Apply to decorative elements (a hero background swatch, a badge, a thin underline) or to text via `background-clip: text` at the call site. **Never** apply to functional text — labels, body copy, buttons, form fields.

**App-local gradients are quarantined.** crm7's `.crm7-gradient` (`crm7/src/index.css:1108-1120`) terminates on `var(--accent-secondary)` → `--brand-green: oklch(0.871 0.286 141.5)`, with an accessible fallback and a `forced-colors` guard — token-based, not a raw hex. It still measures 1.36:1 contrast on white, so it is banned from any new text or thin-line usage and must not be treated as a second canonical gradient. New decorative-gradient work anywhere in the suite uses `--gradient-accent` / `.bsuite-accent-gradient`.

### 8.3 Grid/dot doctrine

Two decorative background devices exist and are **mutually exclusive per context**:

| Device | Context | Primitive | Placement |
|---|---|---|---|
| **GRID** | Public / pre-auth marketing surfaces ONLY | `<HeroGrid>` (`@bsuite/ui`) | Localised to the hero band (`position: relative` wrapper), behind hero text/image. Never full-viewport, never behind authenticated content. |
| **DOT** | Authenticated app shells ONLY | `<DotPattern>` (`@bsuite/ui`, pre-existing) | Full-page, `z-0`, behind all cards, rendered once by the shell. |

A page is either a public marketing surface (grid) or an authenticated shell (dot) — never both, never neither's opposite. `<HeroGrid>`'s CSS (`.bsuite-hero-grid` in `utilities.css`) is lifted verbatim from braden's `.platform-hero-grid` (`braden/src/index.css`): 1px grid lines at 32px × 32px, `oklch(0 0 0 / 0.03)` light / `oklch(1 0 0 / 0.03)` dark.

Enforced by `@bsuite/dry-lint`'s `no-grid-dot-doctrine-violation` rule (shipped `dry-lint` 0.6.0, `warn` in the recommended config pending a cross-app audit): flags `<HeroGrid>` in an authenticated-shell-looking path, `<DotPattern>` in a public-hero-looking path, and hand-rolled `radial-gradient(circle`/two-axis `linear-gradient(90deg,` CSS duplicating either primitive outside the primitives' own source.

### 8.4 sRGB fallback correction (`@supports not (color: oklch(...))`)

The pre-0.6.0 fallback block used nearby Tailwind-palette hexes (chosen for visual similarity, not derived from the actual tokens) — ΔE(OKLab) 0.03–0.10 off the real oklch values. 0.6.0 replaces every fallback with the hex re-derived **directly** from its oklch token via OKLCH → OKLab → linear-sRGB → gamma-encoded sRGB, verified round-trip-accurate against 6 independent hex references (`#3b82f6`, `#ff0000`, `#00ff00`, `#0000ff`, `#ab233a`, `#2563eb` all round-tripped hex → oklch → hex to an exact match) before being applied to the palette.

| Token | oklch source | Old fallback | Old ΔE | New fallback | New ΔE |
|---|---|---|---|---|---|
| `--neon-electric-blue` | `oklch(0.546 0.215 262.9)` | `#3b82f6` | 0.0824 | `#2563eb` | 0.0003 |
| `--neon-electric-cyan` | `oklch(0.769 0.132 191.7)` | `#06b6d4` | 0.0757 | `#00cec9` | 0.0002 |
| `--neon-electric-indigo` | `oklch(0.511 0.230 277.0)` | `#6366f1` | 0.0788 | `#4f46e5` | 0.0005 |
| `--neon-electric-purple` | `oklch(0.568 0.202 283.1)` | `#a855f7` | 0.1026 | `#6c5ce7` | 0.0004 |
| `--neon-electric-magenta` | `oklch(0.742 0.167 359.5)` | `#f472b6` | 0.0345 | `#fd79a8` | 0.0002 |
| `--neon-electric-pink` | `oklch(0.656 0.212 354.3)` | `#ec4899` (already accurate) | n/a | `#ec4899` (unchanged) | 0.0002 |
| `--neon-electric-coral` | `oklch(0.669 0.219 20.9)` | `#f87171` | 0.0674 | `#ff4757` | 0.0001 |
| `--neon-electric-orange` | `oklch(0.728 0.168 22.5)` | `#f97316` | 0.0825 | `#ff7675` | 0.0003 |
| `--neon-electric-yellow` | `oklch(0.868 0.125 81.4)` | `#fbbf24` | 0.0508 | `#fdcb6e` | 0.0004 |
| `--neon-electric-green` | `oklch(0.723 0.192 149.6)` | `#22c55e` (already accurate) | 0.0003 | `#22c55e` (unchanged) | 0.0003 |
| `--neon-electric-lavender` | `oklch(0.736 0.141 285.6)` | `#c084fc` | 0.0667 | `#a29bfe` | 0.0002 |
| `--role-error` / `--role-destructive` | `oklch(0.568 0.202 283.1)` | `#a855f7` | 0.1026 | `#6c5ce7` | 0.0004 |
| `--light-text-primary` (fallback-block only) | `oklch(0.22 0.015 260)` | `#1e1f2e` | 0.0298 (fails < 0.02) | `#171b22` | 0.0013 |

Every new value passes the ΔE < 0.02 acceptance bar by roughly two orders of magnitude. `--dark-text-primary`'s fallback (`#e8eaf6`, ΔE 0.0063) was already within tolerance and is unchanged.

**Methodology (§8.1 and §8.4):** OKLCH → OKLab is the standard `L,a,b = L, C·cos(h), C·sin(h)` polar-to-Cartesian transform; OKLab → linear sRGB uses Björn Ottosson's published matrices; WCAG relative luminance is `0.2126·R + 0.7152·G + 0.0722·B` over the linear (non-gamma-encoded) channel values, per the WCAG 2.x spec — not the perceptual `L` channel directly (a common approximation error, which is why several pre-0.6.0 inline comments understated the true ratio). Contrast ratio is `(L_lighter + 0.05) / (L_darker + 0.05)`. The full conversion pipeline was round-trip-verified against 6 independent hex references before use.

### 8.5 `@bsuite/design-tokens` retired

The `packages/design-tokens` package (a second, unused token source) has been deleted. Zero consumers were found across all 7 repos (parent + 6 submodules) — verified by exhaustive grep for `@bsuite/design-tokens` / `design-tokens` across every file type in every repo; the only two references were a stale prose line in `business-suite-unified/README.md` (not a code import) and mentions in historical `docs/archive/`/`docs/plans/` records (left untouched per the project's historical-doc policy). `@bsuite/theme` remains the single source of truth for design tokens.

### 8.6 Five orphaned v0.2.0-era token CSS files removed

`tokens-light.css`, `tokens-dark.css`, `tokens-high-contrast.css`, `tokens-brand-corporate-braden.css`, and `runtime-branding.css` (`packages/theme/src/css/`) have been deleted in 0.6.0. `MIGRATION-v0.2.0.md` originally documented these as shipping "included when you `@import '@bsuite/theme/css'`", but that was never true — `index.css` has only ever imported `vars.css` + `utilities.css` (confirmed by the 2026-07-09 styling-consistency audit, `docs/archive/2026-07/20260709-styling-consistency-audit-resolved.md`). The files were not in the package's `exports` map, had zero `@import`/deep-import consumers anywhere across all 7 repos (parent + 6 submodules — exhaustive grep by filename), and every token they defined already has a live equivalent in `vars.css` Layers 2–4. See `MIGRATION-v0.6.0.md` for the consumer-facing removal note.
