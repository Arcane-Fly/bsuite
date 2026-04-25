# `@bsuite/theme` — Token Mapping Reference

**Version:** 0.3.1+
**Last updated:** 2026-04-25
**Audience:** Engineers writing or reviewing JSX/TSX with Tailwind classes in BSuite D2C apps (BSU, CRM7, Conduit, R80.3, Throughput). Braden is brand-exempt from this guide.

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
| `bg-destructive` | `text-destructive-foreground` | red / white | red / white |
| `bg-card` | `text-card-foreground` | white / foreground | navy / foreground |
| `bg-muted` | `text-muted-foreground` | light gray / mid-gray | dark gray / light gray |
| `bg-background` | `text-foreground` | off-white / near-black | navy / near-white |

**Rule A1:** `text-{role}-foreground` is **only** safe when paired with the matching `bg-{role}` semantic class. The pair was designed and tested as a unit.

**Rule A2:** If you change the background to a different token (or a raw palette utility), you **must** change the foreground to match.

### Layer B: raw Tailwind palette utilities (mode-invariant)

`bg-blue-600`, `bg-green-600`, `bg-red-500`, etc. These resolve to fixed OKLCH values that **do NOT flip between light and dark mode**. Tailwind v4 converts them at build time but they remain semantically a "raw" colour, not a brand token.

**Rule B1:** Pair raw palette utilities with **explicit white/black/foreground tokens** — never with `text-*-foreground`.

**Rule B2:** White-on-saturated-blue (`bg-blue-600 text-white`) passes WCAG AA in both modes (~5:1). This is the established convention for action buttons that intentionally use raw palette colours (see `conduit/src/components/common/ConfirmDialog.tsx`).

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

**The fix:** use `text-white` on raw palette buttons. White stays white in both modes, and white-on-`blue-600` stays at ~5:1 in both modes.

```diff
- className="bg-blue-600 text-primary-foreground hover:bg-blue-700"
+ className="bg-blue-600 text-white hover:bg-blue-700"
```

If the brand intent was actually "primary brand surface", switch the background too:

```diff
- className="bg-blue-600 text-primary-foreground hover:bg-blue-700"
+ className="bg-primary text-primary-foreground hover:bg-primary/90"
```

But understand this **changes the visible colour**. BSU's `--primary` is electric blue `oklch(0.546 0.215 262.9)`, very close to but not identical to Tailwind's `blue-600` `oklch(0.546 0.245 262.881)`. If a designer chose `bg-blue-600` deliberately (e.g. for the precise saturated blue), keep it and use `text-white`.

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
| Raw blue confirmation button | `bg-blue-600 text-white hover:bg-blue-700` | matches `ConfirmDialog` convention; mode-invariant |
| Destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | mode-coupled |
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
| Text on raw `bg-{blue,green,red,amber}-{500,600}` | `text-white` |
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
3. **For raw Tailwind palette buttons (`bg-blue-600` etc.), pair with `text-white` explicitly.** Never `text-primary-foreground`.
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

*This document is the source of truth for colour-token decisions across all D2C BSuite apps. When in doubt, check here before reaching for a `text-*-foreground` or a raw palette utility.*
