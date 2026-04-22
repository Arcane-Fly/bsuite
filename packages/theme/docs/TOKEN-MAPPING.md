# @bsuite/theme — Token Mapping Reference

**Version:** 0.2.0  
**Status:** A (Approved 2026-04-22)  
**Purpose:** Definitive hardcoded-colour → semantic-token mapping table consumed by the `packages/theme-codemod/` migration script and used as the human-review reference for Phase 2–3 consumer migrations.

> **Rule:** All colour values outside `packages/theme/` and `braden/src/**` MUST resolve to one of the semantic tokens below. No hex, no `rgba()`, no `text-slate-N`, no `text-gray-N`, no `text-white` / `bg-white` unless that element is explicitly colourblind-safe and intentional.

---

## 1 · Tailwind Utility Class Mapping

### Text colour utilities → semantic tokens

| Hardcoded class | Replace with | Notes |
|---|---|---|
| `text-slate-900` | `text-foreground` | Primary body text |
| `text-slate-800` | `text-foreground` | Primary body text |
| `text-slate-700` | `text-foreground` | Primary body text |
| `text-slate-600` | `text-muted-foreground` | Secondary / label text |
| `text-slate-500` | `text-muted-foreground` | Secondary / label text |
| `text-slate-400` | `text-muted-foreground` | Muted / helper text |
| `text-slate-300` | `text-muted-foreground` | Muted / helper text |
| `text-slate-200` | `text-muted-foreground` | Low-emphasis text |
| `text-slate-100` | `text-muted-foreground` | Low-emphasis text on dark |
| `text-gray-900` | `text-foreground` | |
| `text-gray-800` | `text-foreground` | |
| `text-gray-700` | `text-foreground` | |
| `text-gray-600` | `text-muted-foreground` | |
| `text-gray-500` | `text-muted-foreground` | |
| `text-gray-400` | `text-muted-foreground` | |
| `text-gray-300` | `text-muted-foreground` | |
| `text-gray-200` | `text-muted-foreground` | |
| `text-gray-100` | `text-muted-foreground` | |
| `text-zinc-*` | `text-foreground` or `text-muted-foreground` | map by shade like slate |
| `text-neutral-*` | `text-foreground` or `text-muted-foreground` | map by shade like slate |
| `text-white` | ⚠️ **FLAG** — context-dependent | On dark bg → `text-primary-foreground`; decorative → `text-white` (document intent); over coloured bg → `text-(--text-on-primary)` |
| `text-black` | ⚠️ **FLAG** — context-dependent | Usually `text-foreground` |

### Background utilities → semantic tokens

| Hardcoded class | Replace with | Notes |
|---|---|---|
| `bg-white` | ⚠️ **FLAG** — context-dependent | Page bg → `bg-background`; card → `bg-card`; input → `bg-input` |
| `bg-black` | `bg-background` (dark) or **FLAG** | |
| `bg-slate-50` | `bg-background` | Page-level background |
| `bg-slate-100` | `bg-muted` | Muted / subtle panel |
| `bg-slate-200` | `bg-muted` | |
| `bg-slate-800` | `bg-card` | Dark card surface |
| `bg-slate-900` | `bg-background` | Dark page surface |
| `bg-slate-950` | `bg-background` | Deep dark background |
| `bg-gray-50` | `bg-background` | |
| `bg-gray-100` | `bg-muted` | |
| `bg-gray-200` | `bg-muted` | |
| `bg-gray-800` | `bg-card` | |
| `bg-gray-900` | `bg-background` | |
| `bg-gray-950` | `bg-background` | |
| `bg-zinc-*` | map same as slate/gray | |
| `bg-neutral-*` | map same as slate/gray | |

### Border utilities → semantic tokens

| Hardcoded class | Replace with | Notes |
|---|---|---|
| `border-slate-100` | `border-border` | |
| `border-slate-200` | `border-border` | |
| `border-slate-300` | `border-border` | |
| `border-slate-600` | `border-border-strong` | Only if not dark-mode specific |
| `border-slate-700` | `border-border-strong` | |
| `border-gray-*` | map same as slate | |
| `divide-slate-*` | map same as border | |

---

## 2 · CSS Custom Property Mapping

### Hex / rgba() → OKLCH token

| Hardcoded value | CSS var / OKLCH | Notes |
|---|---|---|
| `#7c3aed` | `var(--app-primary)` with value `oklch(0.492 0.226 292)` | BSU wrong purple — fix to D2C Blue `oklch(0.541 0.247 293)` |
| `#2563eb` | `var(--accent-primary)` → `oklch(0.546 0.215 262.9)` | Electric Blue |
| `#00cec9` | `var(--neon-electric-cyan)` → `oklch(0.769 0.132 191.7)` | Electric Cyan |
| `#0a47e5` | `var(--color-primary-text)` | WCAG AA text token |
| `#0a0e1a` | `var(--bg-body)` (dark) | Deep navy |
| `#E2E8F0` | `var(--border-color)` (light) | Light border |
| `#CBD5E1` | `var(--border-color-strong)` (light) | Stronger light border |
| `#f2f2f2` | `var(--text-primary)` (dark) | Near-white on dark bg |
| `#000000` | `var(--border-color)` (high-contrast, needs manual review) | |
| `rgba(0, 206, 201, *)` | `oklch(0.769 0.132 191.7 / <alpha>)` | Cyan with alpha |
| `rgba(37, 99, 235, *)` | `oklch(0.546 0.215 262.9 / <alpha>)` | Blue with alpha |

### HSL triplets → `@bsuite/theme` semantic tokens (shadcn pattern)

These are the raw channel values used in `hsl(var(--x))` patterns. After v0.2.0 all consumers switch to `var(--color-*)` directly (no hsl() wrapper needed since @theme values are OKLCH).

| Old HSL var | New semantic CSS var (v0.2.0) | OKLCH value |
|---|---|---|
| `--primary: 217 91% 60%` | `--primary` → `oklch(0.546 0.215 262.9)` | Electric Blue |
| `--accent: 187 95% 46%` | `--accent` → `oklch(0.769 0.132 191.7)` | Electric Cyan |
| `--secondary: 210 40% 96.1%` | `--secondary` → surface token | `oklch(0.961 0 0.5)` |
| `--muted: 210 40% 96.1%` | `--muted` → `oklch(0.961 0 0.5)` | Light muted bg |
| `--background: 0 0% 100%` | `--background` → `oklch(1 0 0)` | White |
| `--foreground: 222.2 84% 4.9%` | `--foreground` → `oklch(0.156 0.012 261)` | Near-black |
| `--card: 0 0% 100%` | `--card` → `oklch(1 0 0)` | White card |
| `--border: 214.3 31.8% 91.4%` | `--border` → `oklch(0.916 0.006 248)` | Light border |
| `--ring: 222.2 84% 4.9%` | `--ring` → `oklch(0.546 0.215 262.9)` | Electric Blue ring |

---

## 3 · Semantic Token Full Set (v0.2.0)

These are the canonical token names. Every consumer app's CSS must map to these names; local definitions of the same concept are duplicates and must be deleted.

### Text

| Token | Light value | Dark value | Purpose |
|---|---|---|---|
| `--text-primary` | `oklch(0.319 0.01 216.8)` | `oklch(0.982 0.002 248)` | Body text, headings |
| `--text-secondary` | `oklch(0.53 0.015 221.6)` | `oklch(0.769 0.015 248)` | Labels, captions |
| `--text-muted` | `oklch(0.558 0.016 244.9)` | `oklch(0.558 0.016 244.9)` | Placeholder, helper |
| `--text-disabled` | `oklch(0.748 0.017 239.2)` | `oklch(0.428 0.015 248.2)` | Disabled state |
| `--text-on-primary` | `oklch(1 0 0)` | `oklch(1 0 0)` | Text on primary-coloured bg |
| `--text-on-surface` | `oklch(0.319 0.01 216.8)` | `oklch(0.982 0.002 248)` | Text on card/panel |
| `--color-primary-text` | `oklch(0.485 0.243 263.6)` | `oklch(0.623 0.188 259.8)` | WCAG AA blue text |
| `--color-accent-text` | `oklch(0.486 0.084 191.5)` | `oklch(0.769 0.132 191.7)` | WCAG AA cyan text |

### Background

| Token | Light value | Dark value | Purpose |
|---|---|---|---|
| `--bg-body` | `oklch(0.961 0 0.5)` | `oklch(0.166 0.026 269.4)` | Page / body background |
| `--bg-surface` | `oklch(0.982 0.002 248)` | `oklch(0.19 0.02 260)` | Elevated surface, card base |
| `--bg-panel` | `oklch(1 0 0)` | `oklch(0.242 0.03 269.9)` | Card, dialog, popover |
| `--bg-tertiary` | `oklch(0.963 0.003 228.9)` | `oklch(0.326 0.036 266.7)` | Subtle containers |
| `--bg-elevated` | `oklch(1 0 0)` | `oklch(0.292 0.034 270)` | Highest elevation surface |
| `--bg-input` | `oklch(0.982 0.002 248)` | `oklch(0.242 0.03 269.9 / 0.6)` | Input field background |
| `--bg-hover` | `oklch(0.963 0.003 228.9)` | `oklch(0.39 0.035 265)` | Hover state overlay |
| `--bg-selected` | `oklch(0.546 0.215 262.9 / 0.08)` | `oklch(0.546 0.215 262.9 / 0.15)` | Selected row / item |

### Border

| Token | Light value | Dark value | Purpose |
|---|---|---|---|
| `--border-color` | `oklch(0.916 0.006 248)` | `oklch(0.769 0.132 191.7 / 0.15)` | Default border |
| `--border-color-strong` | `oklch(0.741 0.022 250 / 0.5)` | `oklch(0.769 0.132 191.7 / 0.3)` | Emphasis border |
| `--border-shell` | `oklch(0.741 0.022 250 / 0.2)` | `oklch(0.769 0.132 191.7 / 0.18)` | Shell / sidebar border |

### Accent / brand

| Token | Light value | Dark value | Purpose |
|---|---|---|---|
| `--accent-primary` | `oklch(0.546 0.215 262.9)` | `oklch(0.546 0.215 262.9)` | Electric Blue — primary action |
| `--accent-secondary` | `oklch(0.769 0.132 191.7)` | `oklch(0.769 0.132 191.7)` | Electric Cyan — secondary / accent |

### Status / semantic

| Token | Value (both themes) | Purpose |
|---|---|---|
| `--color-success` | `oklch(0.697 0.135 172.1)` | Success state |
| `--color-warning` | `oklch(0.868 0.125 81.4)` | Warning state |
| `--color-error` | `oklch(0.669 0.219 20.9)` | Error / destructive |
| `--color-info` | `oklch(0.769 0.132 191.7)` | Informational |

### shadcn/ui bridge tokens (Tailwind @theme — used as `var(--color-*)`)

These appear in the `@theme` block to drive Tailwind utility generation **and** as CSS vars on `:root`. After v0.2.0 these point to the semantic tokens above — no raw hex or HSL triplets.

| `@theme` variable | Resolves to |
|---|---|
| `--color-background` | `var(--bg-body)` |
| `--color-foreground` | `var(--text-primary)` |
| `--color-primary` | `var(--accent-primary)` |
| `--color-primary-foreground` | `var(--text-on-primary)` |
| `--color-secondary` | `var(--bg-surface)` |
| `--color-secondary-foreground` | `var(--text-primary)` |
| `--color-muted` | `var(--bg-tertiary)` |
| `--color-muted-foreground` | `var(--text-muted)` |
| `--color-accent` | `var(--accent-secondary)` |
| `--color-accent-foreground` | `var(--text-on-primary)` |
| `--color-card` | `var(--bg-panel)` |
| `--color-card-foreground` | `var(--text-primary)` |
| `--color-popover` | `var(--bg-elevated)` |
| `--color-popover-foreground` | `var(--text-primary)` |
| `--color-border` | `var(--border-color)` |
| `--color-input` | `var(--border-color)` |
| `--color-ring` | `var(--accent-primary)` |
| `--color-destructive` | `var(--color-error)` |
| `--color-destructive-foreground` | `oklch(0.982 0.002 248)` |
| `--color-success` | `var(--color-success)` |
| `--color-warning` | `var(--color-warning)` |
| `--color-info` | `var(--color-info)` |

---

## 4 · Per-App `--app-primary` / `--app-accent` Correct Values

| App | `--app-primary` | `--app-accent` | Status |
|---|---|---|---|
| BSU | `oklch(0.541 0.247 293.0)` | `oklch(0.709 0.159 293.5)` | ⚠️ **Fix** — currently hex `#7c3aed` |
| CRM7 | `oklch(0.546 0.215 262.9)` | `oklch(0.769 0.132 191.7)` | ✅ Correct |
| R80.3 | `oklch(0.666 0.157 58.3)` | `oklch(0.837 0.164 84.4)` | Check theme.css |
| conduit | `oklch(0.596 0.127 163.3)` | `oklch(0.773 0.153 163.3)` | Check globals.css |
| throughput | `oklch(0.546 0.215 262.9)` | `oklch(0.769 0.132 191.7)` | v3 — no `@theme` block |
| braden | `oklch(0.488 0.170 17.6)` | `oklch(0.769 0.096 90.9)` | ✅ Corporate — exempt |

---

## 5 · Codemod Confidence Levels

| Level | Meaning | Action |
|---|---|---|
| **AUTO** | Safe to replace automatically — unique semantic match | Codemod replaces |
| **REVIEW** | Ambiguous — depends on context (e.g. `text-white` on coloured bg) | Codemod flags with `/* THEME-REVIEW: reason */` comment |
| **MANUAL** | Can only be resolved with visual inspection | Codemod flags; no substitution |

| Source pattern | Level |
|---|---|
| `text-slate-{600-900}` → `text-foreground` | AUTO |
| `text-slate-{100-500}` → `text-muted-foreground` | AUTO |
| `bg-slate-{50-100}` → `bg-muted` | AUTO |
| `bg-slate-{800-950}` → `bg-background` | AUTO |
| `border-slate-{100-300}` → `border-border` | AUTO |
| `text-white` | REVIEW |
| `bg-white` | REVIEW |
| `text-black` | REVIEW |
| Inline `style={{ color: '#xxx' }}` | MANUAL |
| `className="bg-[#xxx]"` | MANUAL |

---

## 6 · Braden Corporate Exemptions

The following tokens and usages are **intentionally exempt** from the D2C oklch-only rule. The codemod must skip these:

- All files under `braden/src/**` and `braden/styles/**`
- The `packages/theme/src/css/tokens-brand-corporate-braden.css` file
- Any class with `braden` in a comment: `/* BRADEN-EXEMPT */`
