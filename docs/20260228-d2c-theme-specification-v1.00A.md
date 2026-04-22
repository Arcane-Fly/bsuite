# 🎨 Universal D2C Theme System

**Status:** A (Approved — v0.3.0 of `@bsuite/theme`)
**Scope:** D2C BSuite apps (`business-suite-unified`, `crm7`, `conduit`, `R80.3`, `throughput`) + `braden` corporate brand (separate baseline, same architecture).
**Source of truth:** `packages/theme/src/css/vars.css` (D2C) and `packages/theme/src/css/braden.css` (Braden). This document reflects the current shipped state.

---

## Scope and brand boundaries

Two brand baselines, one architecture:

| Baseline | File | Consumed by |
|---|---|---|
| **D2C Neon Electric** | `@bsuite/theme/css` | BSU, CRM7, Conduit, R80.3, Throughput |
| **Braden Corporate** | `@bsuite/theme/braden-css` | `braden` submodule only |

Rules:

- Apps in the D2C scope consume the D2C baseline exclusively. They do not cross-import Braden tokens.
- The `braden` submodule consumes the Braden baseline exclusively. It does not inherit Neon Electric colours or glow styling.
- Both baselines export an **identical role contract** (see §3). Consumers bind to role classes (`bg-primary`, `text-foreground`) and work interchangeably on either brand — only the underlying role values differ.

---

## Five-layer architecture

Every baseline (`vars.css`, `braden.css`) is structured as five layers. Consumers only bind to layer 3 upwards; layers 1–2 are implementation.

| Layer | Purpose | Visible to consumers? |
|---|---|---|
| 1. **Palette** | Presentational colour definitions in oklch (`--neon-electric-blue`, `--braden-red-500`, etc.). Frozen per brand spec. | No (decorative/identity only) |
| 2. **Surfaces + text** | Light/dark background and 5-tier text tokens. | No (bound via layer 4) |
| 3. **Role aliases** | `--role-primary`, `--role-accent`, `--role-info`, `--role-success`, `--role-warning`, `--role-error`, `--role-destructive`, `--role-neutral`. **The stable consumer contract.** | **Yes** |
| 4. **Shadcn bridge** | `--background`, `--foreground`, `--primary`, `--destructive`, `--ring`, etc. — shadcn primitives consume these unchanged. | **Yes** (via shadcn components) |
| 5. **Text-on-fill** | `--text-on-primary`, `--text-on-accent`, `--text-on-warning`, etc. — inverse scale for text rendered on top of a coloured fill. | **Yes** |

---

## Colour space: OKLCH

All colour tokens are declared in `oklch()`. sRGB fallback is provided under `@supports not (color: oklch(0 0 0))` for pre-2023 browsers. Hex/rgb is **banned** in new code — enforced by CI grep.

Why oklch:

1. Perceptually uniform — equal numerical steps produce equal perceived lightness steps.
2. Hue-stable interpolation — gradients and alpha variants don't muddy through grey.
3. Wider gamut on P3 displays without double-declaring.
4. `oklch(from var(--x) l c h / α)` composes alpha variants from a single source.

---

## 1. Palette (layer 1)

### D2C Neon Electric (11 colours, frozen)

| Name | oklch | Hex (legacy) | Use |
|---|---|---|---|
| Electric Blue | `oklch(0.546 0.215 262.9)` | `#2563eb` | Identity / corporate — bound to `--role-primary` |
| Electric Cyan | `oklch(0.769 0.132 191.7)` | `#00cec9` | Identity — bound to `--role-accent` / `--role-info` |
| Electric Indigo | `oklch(0.511 0.23 277)` | `#4f46e5` | Decorative |
| Electric Purple | `oklch(0.568 0.202 283.1)` | `#6c5ce7` | **Bound to `--role-error` / `--role-destructive`** |
| Electric Magenta | `oklch(0.742 0.167 359.5)` | `#fd79a8` | Decorative |
| Electric Pink | `oklch(0.656 0.212 354.3)` | `#ec4899` | Decorative |
| Electric Coral | `oklch(0.669 0.219 20.9)` | `#ff4757` | Decorative only — **never bound to any semantic role** |
| Electric Orange | `oklch(0.728 0.168 22.5)` | `#ff7675` | Decorative |
| Electric Yellow | `oklch(0.868 0.125 81.4)` | `#fdcb6e` | Bound to `--role-warning` |
| Electric Green | `oklch(0.723 0.192 149.6)` | `#22c55e` | Bound to `--role-success` |
| Electric Lavender | `oklch(0.736 0.141 285.6)` | `#a29bfe` | Decorative |

### Braden Corporate (3 anchors + 10-step scales)

| Anchor | oklch | Hex | Use |
|---|---|---|---|
| Braden Red | `oklch(0.51 0.17 19)` | `#ab233a` | Corporate primary — bound to `--role-primary` |
| Braden Gold | `oklch(0.77 0.10 82)` | `#cbb26a` | Corporate accent — bound to `--role-accent` |
| Braden Navy | `oklch(0.34 0.04 250)` | `#2c3e50` | Corporate deep — surface/text anchor |

Each anchor expands to a 50–900 scale using oklch perceptual uniformity (chroma held constant, lightness shifts). See `packages/theme/src/css/braden.css` for values.

---

## 2. Surfaces + text scale (layer 2)

### Text scale (eye-strain-safe, 5 tiers)

Replaced the previous 4-tier scale with 5 tiers + lowered the dark-mode primary from L=0.98 to L=0.94. Pure white on dark navy produces ~17:1 contrast, which is glare territory after 15+ minutes. L=0.94 with a faint hue match stays AAA while dropping visible strain.

**D2C dark mode** (anchored at hue 260):

| Tier | oklch | Ratio vs `--dark-bg-primary` | WCAG |
|---|---|---|---|
| `--dark-text-primary` | `oklch(0.94 0.012 260)` | ~13.9:1 | ✓ AAA |
| `--dark-text-secondary` | `oklch(0.82 0.015 260)` | ~9.8:1 | ✓ AAA |
| `--dark-text-muted` | `oklch(0.68 0.018 260)` | ~5.6:1 | ✓ AA |
| `--dark-text-subtle` | `oklch(0.56 0.015 260)` | ~3.6:1 | ✓ AA large only |
| `--dark-text-disabled` | `oklch(0.44 0.010 260)` | ~2.4:1 | Pair with icon cue |

**D2C light mode** (anchored at hue 260):

| Tier | oklch | Ratio vs `--light-bg-primary` | WCAG |
|---|---|---|---|
| `--light-text-primary` | `oklch(0.22 0.015 260)` | ~13.2:1 | ✓ AAA |
| `--light-text-secondary` | `oklch(0.38 0.018 260)` | ~8.1:1 | ✓ AAA |
| `--light-text-muted` | `oklch(0.52 0.018 260)` | ~4.9:1 | ✓ AA |
| `--light-text-subtle` | `oklch(0.60 0.012 260)` | ~3.8:1 | ✓ AA large |
| `--light-text-disabled` | `oklch(0.72 0.010 260)` | — | Pair with icon cue |

**Braden** uses the same structure hue-matched to navy 250. See `braden.css` for values.

---

## 3. Role aliases (layer 3 — the consumer contract)

These are what apps bind to. Roles are **stable**; palette values can be tuned without breaking consumers.

| Role | D2C binding | Braden binding | Notes |
|---|---|---|---|
| `--role-primary` | `--neon-electric-blue` | `--braden-red-500` | Primary actions, highlights |
| `--role-accent` | `--neon-electric-cyan` | `--braden-gold-500` | Secondary accents, borders |
| `--role-info` | `--neon-electric-cyan` | neutral blue (not red) | Info alerts |
| `--role-success` | `--neon-electric-green` | green | Success states |
| `--role-warning` | `--neon-electric-yellow` | `--braden-gold-700` | Warnings |
| `--role-error` | `--neon-electric-purple` | electric-purple (same) | **Purple, NOT red** |
| `--role-destructive` | `--neon-electric-purple` | electric-purple (same) | **Purple, NOT red** |
| `--role-neutral` | neutral slate | neutral slate | Disabled, placeholder surfaces |

### Colourblind policy (platform-wide, non-overridable)

- `--role-error` and `--role-destructive` are **bound to electric-purple on every brand**, including Braden where red is the corporate primary. Red is identity only; it is never bound to a semantic role.
- Enterprise white-label overrides **cannot** set `--role-error` or `--role-destructive`. `BrandingProvider` enforces this at apply-time by whitelisting overridable keys.
- Status indicators must pair colour with an icon or label. Colour alone is banned.

---

## 4. Shadcn bridge (layer 4)

Shadcn primitives reference variable names like `--background`, `--foreground`, `--primary`, `--destructive`. Our baselines wire these to roles so primitives work unchanged. Example mappings:

```css
--background:           var(--light-bg-primary);    /* dark: --dark-bg-primary */
--foreground:           var(--light-text-primary);  /* dark: --dark-text-primary */
--primary:              var(--role-primary);
--primary-foreground:   var(--text-on-primary);
--destructive:          var(--role-destructive);    /* purple, not red */
--destructive-foreground: var(--text-on-error);
--muted-foreground:     var(--light-text-muted);    /* dark: --dark-text-muted */
--ring:                 var(--role-primary);        /* dark mode: --role-accent (more visible) */
```

Existing shadcn primitives (buttons, dialogs, inputs) need no code changes — they inherit the new values through these bridge variables.

---

## 5. Text-on-fill (layer 5)

When text sits on top of a coloured fill, the fill's lightness determines whether text should be dark or light. Pre-computed so consumers don't guess. All values verified WCAG AA.

| Token | D2C value | Ratio vs fill | WCAG |
|---|---|---|---|
| `--text-on-primary` | white | 5.9:1 on blue | ✓ AA |
| `--text-on-accent` | dark | 6.1:1 on cyan | ✓ AA |
| `--text-on-error` | white | 5.4:1 on purple | ✓ AA |
| `--text-on-success` | dark | 5.8:1 on green | ✓ AA |
| `--text-on-warning` | dark | 9.2:1 on amber | ✓ AAA |
| `--text-on-info` | dark | 6.1:1 on cyan | ✓ AA |

Braden values differ — see `braden.css`. Notably `--text-on-accent` on Braden gold must be **navy-900** (8.2:1) because gold-on-white is 2.03:1 and fails AA.

---

## Enterprise white-labelling

Runtime CSS-variable injection via `@bsuite/theme/react → BrandingProvider`.

### Override hierarchy (first non-null wins)

1. Sub-organisation override (if user is scoped to a sub-org)
2. Enterprise tenant override
3. Platform-partner override (BSU-managed, for resellers)
4. Brand default (D2C from `vars.css` or Braden from `braden.css`)

### Overridable keys

```
primary  accent  info  success  warning  neutral
logo_url  logo_dark_url  mark_url  favicon_url
font_stack
```

### Non-overridable keys (hard locked)

```
error  destructive  — platform colourblind policy
```

Any payload attempting to set these is silently dropped (and logged in dev).

### Validation at the client boundary

All tenant-supplied colour values must match:

```
/^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*(\/\s*[\d.]+\s*)?\)$/i
```

Hex/rgb/hsl payloads are rejected. This is defense-in-depth on top of server-side RPC validation.

### Braden short-circuit

`<BrandingProvider brand="braden">` disables all RPC/Realtime/localStorage reads — the marketing site has no tenants. The prop defaults to `"d2c"`.

---

## Consumer usage

### Installation

Each D2C app's root stylesheet:

```css
@import 'tailwindcss';
@import '@bsuite/theme/css';           /* layers 1–5 as CSS vars */
@import '@bsuite/theme/preset-v4.css'; /* exposes vars to Tailwind v4 */
@import '@bsuite/theme/utilities.css'; /* glow + neon-text utilities */
```

Braden submodule:

```css
@import 'tailwindcss';
@import '@bsuite/theme/braden-css';    /* Braden corporate baseline */
@import '@bsuite/theme/preset-v4.css'; /* same preset — reads role vars */
@import '@bsuite/theme/utilities.css';
```

### Provider wiring

```tsx
// main.tsx (Vite apps) / layout.tsx (Next apps)
import { ThemeProvider, BrandingProvider } from '@bsuite/theme/react'
import { supabase } from './lib/supabase'

<ThemeProvider>
  <BrandingProvider supabaseClient={supabase} brand="d2c">
    {children}
  </BrandingProvider>
</ThemeProvider>
```

For Braden: `<BrandingProvider supabaseClient={supabase} brand="braden">`.

### FOUC prevention

First line of `main.tsx` (before React mounts):

```ts
;(() => {
  const t = localStorage.getItem('theme')
  if (t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.add('dark')
})()
```

### Consumer class patterns

Prefer role classes over palette classes. Roles white-label; palette does not.

```jsx
/* ✓ Role-based — white-label aware */
<h1 className="text-foreground">Page title</h1>
<p  className="text-muted-foreground">Metadata</p>
<button className="bg-primary text-text-on-primary">Save</button>
<div className="border border-border bg-card">Card</div>
<span className="bg-error/10 text-error">Error: invalid input</span>

/* ✓ Palette classes — decorative only, identity-locked */
<div className="bg-gradient-to-r from-neon-electric-blue to-neon-electric-cyan">

/* ✗ Banned — ESLint rule + CI grep block these */
<p className="text-white">          /* use text-foreground or text-text-on-primary */
<p className="text-slate-400">      /* use text-muted-foreground */
<p className="opacity-50">          /* use text-text-subtle / text-text-disabled */
<div style={{color:'#fff'}}>        /* no hex in consumer code */
```

---

## Animations + keyframes

Exposed via Tailwind v4 `--animate-*` vars. Keyframes defined outside `@theme` (v4 doesn't expose them inside).

```
--animate-pulse-soft  pulse-soft 3s cubic-bezier(0.4,0,0.6,1) infinite
--animate-glow        glow       2s ease-in-out infinite alternate
--animate-neon-pulse  neon-pulse 2s ease-in-out infinite
--animate-float       float      3s ease-in-out infinite
--animate-shimmer     shimmer    2s infinite
--animate-typing      typing     1.5s infinite
```

`prefers-reduced-motion` caps all animations at 0.01ms via a global rule in each baseline.

---

## Migration notes from pre-0.3.0

Consumer codemod (per app):

| Pre-0.3.0 usage | New usage |
|---|---|
| `text-white` on dark card | `text-foreground` |
| `text-white` on role fill | `text-text-on-primary` / `-accent` / `-error` |
| `text-slate-400`, `text-gray-400` | `text-muted-foreground` |
| `text-slate-500`, `text-gray-500` | `text-muted-foreground` |
| `text-slate-300`, `text-gray-300` | `text-text-secondary` |
| `opacity-50` on text | `text-text-subtle` |
| `bg-neon-electric-blue` for primary button | `bg-primary` |
| `bg-neon-electric-coral` for destructive | `bg-destructive` *(now renders purple)* |
| `bg-status-error` (legacy) | `bg-status-error` unchanged — *now resolves to purple* |

CI enforcement:

```
# block hex/rgb in consumer code
rg '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(' \
  -g '!packages/theme/**' \
  -g '!**/manifest.webmanifest' \
  -g '*.{ts,tsx,css}' \
  && exit 1 || exit 0

# block Braden corporate hex outside approved files
rg '(#ab233a|#cbb26a|#2c3e50)' \
  -g '!packages/theme/src/css/braden.css' \
  -g '!braden/**/manifest.webmanifest' \
  -g '*.{ts,tsx,css}' \
  && exit 1 || exit 0

# block text-white/text-black in consumer code
rg '\btext-white\b|\btext-black\b' \
  -g '!packages/theme/**' \
  -g '*.{ts,tsx}' \
  && exit 1 || exit 0
```

ESLint rule (`.eslintrc.cjs` root):

```js
'no-restricted-syntax': ['error',
  { selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-white\\b|\\btext-black\\b/]",
    message: 'Use text-foreground / text-text-on-primary / text-muted-foreground.' },
],
```

---

## Verification checklist

- [ ] `@bsuite/theme@0.3.0` builds cleanly (`pnpm -F @bsuite/theme build`).
- [ ] D2C apps import `@bsuite/theme/css`; Braden imports `@bsuite/theme/braden-css`.
- [ ] `--role-error` resolves to purple on every baseline in both light and dark.
- [ ] Dark-mode primary text at L=0.94 (not pure white); no glare in 20+ min reading test.
- [ ] Shadcn primitives render correctly without code changes.
- [ ] `<BrandingProvider>` applies tenant overrides within 1s of tenant row update.
- [ ] `<BrandingProvider>` silently drops any attempt to override `error` or `destructive`.
- [ ] Lighthouse Accessibility ≥ 95 on every migrated surface.
- [ ] Axe-core reports no WCAG AA contrast violations.
- [ ] CI grep guards pass on `main`.
- [ ] `prefers-reduced-motion` disables all animations.

---

## References

- `@bsuite/theme` source: `packages/theme/`
- D2C baseline: `packages/theme/src/css/vars.css`
- Braden baseline: `packages/theme/src/css/braden.css`
- Tailwind v4 preset: `packages/theme/src/preset-v4.css`
- Utilities (glow, neon-text): `packages/theme/src/css/utilities.css`
- Branding provider: `packages/theme/src/react/BrandingProvider.tsx`
- Theme provider: `packages/theme/src/react/ThemeProvider.tsx`
- WCAG AA contrast audit: `docs/20260407-d2c-wcag-contrast-audit-v1.00A.md`
