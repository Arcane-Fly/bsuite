> **ARCHIVED 2026-07-09** — Hermes cross-app styling audit, all 14 findings RESOLVED (conduit 7fc6c66, crm7 1d820548, R80.3 61a3f4a, BSU e13548c; sole intentional exception: conduit safety-alert.ts email hex — email clients lack oklch support).

# Cross-App Styling Consistency Audit

**Date:** 2026-07-08  
**Scope:** crm7, conduit, business-suite-unified (BSU), R80.3  
**Theme package:** @bsuite/theme v0.4.2

---

## 1. @bsuite/theme Import Verification

| App | `@bsuite/theme` dep | `@import` in CSS | `preset-v4.css` | ThemeProvider |
|-----|---------------------|------------------|-----------------|---------------|
| crm7 | ✅ ^0.4.2 | ✅ `@bsuite/theme/css` in `index.css` + `theme.css` | ❌ Missing | ✅ `@bsuite/theme/react` |
| conduit | ✅ ^0.4.2 | ✅ `@bsuite/theme/css` + `preset-v4.css` in `globals.css` | ✅ | ⚠️ Local `next-themes` wrapper (not `@bsuite/theme/react`) |
| BSU | ✅ ^0.4.2 | ✅ `@bsuite/theme/css` + `preset-v4.css` in `index.css` | ✅ | ✅ `@bsuite/theme/react` |
| R80.3 | ✅ ^0.4.2 | ✅ `@bsuite/theme/css` in `theme.css` | ❌ Missing | ⚠️ Local `ThemeContext` (not `@bsuite/theme/react`) |

### Findings

- **crm7 & R80.3 do NOT import `preset-v4.css`** — they manually duplicate all 11 `--color-neon-electric-*` oklch values in their own `@theme` blocks. This risks palette drift if the theme package updates values.
- **conduit & R80.3 do NOT use `@bsuite/theme/react` ThemeProvider** — conduit wraps `next-themes` locally; R80.3 has a bespoke `ThemeContext`. This means different localStorage keys (`bsuite_theme` vs `r8-theme` vs `next-themes` default) and different SSR fallback behavior.

---

## 2. Hardcoded Colors (Hex Instead of Theme Tokens)

### BSU — `business-suite-unified/src/index.css` (MOST VIOLATIONS)

**Light mode `:root` (lines 515–547):**
```css
--bg-body: #edf2fb;        /* should be: var(--role-bg-body) or oklch */
--stat-value-color: #0F172A;
--bg-surface: #F8FAFC;
--bg-panel: #f2f2f2;
--bg-header: #F1F5F9;
--bg-footer: #F8FAFC;
--bg-input: #F1F5F9;
--bg-tertiary: #F3F5F7;
--bg-interactive: #EAF0F6;
--bg-shell: #edf2fb;
--border-color: #E2E8F0;
--border-color-strong: #CBD5E1;
```

**Dark mode `.dark` (lines 755–766):**
```css
--bg-body: #0a0e1a;
--stat-value-color: #00BFFF;
--bg-surface: #1a1f2e;
--bg-footer: #1a1f2e;
--bg-tertiary: #2c3447;
--bg-interactive: #3c4558;
--bg-shell: #0a0e1a;
```

**Status colors (lines 591–600, 820–829) — hex in both light & dark:**
```css
/* Light: */
--color-success: #047857;
--color-warning: #b45309;
--color-error: #b91c1c;        /* ❌ RED — violates colourblind policy */
--color-info: #0284C7;
/* Dark: */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;        /* ❌ RED — violates colourblind policy */
--color-info: #00BCD4;
```

> **Note:** BSU's shadcn `--destructive` IS correctly purple (oklch 0.568 0.202 283.1). But the app-level `--color-error` is red, creating an inconsistency within the same app.

### R80.3 — `R80.3/src/index.css`

```css
--color-destructive-foreground: #f2f2f2;           /* line 39 — should be oklch */
background-color: var(--color-error-hover, #DC2626); /* line 521 — red hex fallback */
background-color: var(--color-success-hover, #059669); /* line 533 — hex fallback */
```

R80.3's `--color-error` in `theme.css` is also red oklch (`oklch(0.505 0.19 27.5)` and `oklch(0.637 0.208 25.3)`) — **violates colourblind policy** (should be purple/neon-electric-purple).

### conduit — `conduit/src/`

```tsx
// stores/settingsStore.ts:102
color: stage.color ?? '#3b82f6',

// components/settings/PipelineStagesSection.tsx:21-28
'#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#6366f1',

// lib/whs/safety-alert.ts:272
`<p style="color:#6b7280;font-size:12px;">`
```

### crm7 — `crm7/src/`

```tsx
// components/ui/bento-grid.tsx:46
'dark:[box-shadow:0_-20px_80px_-20px_#f2f2f21f_inset]'

// pages/leave/calendar.tsx:120
backgroundColor: req.leave_types?.color || '#3b82f6',
```

---

## 3. Dark/Light Mode Support

| App | `.dark` selector | Theme toggle | Default theme | SSR/FOUC prevention |
|-----|-----------------|-------------|---------------|---------------------|
| crm7 | ✅ 20 uses | ✅ via `@bsuite/theme/react` | system | ✅ inline script |
| conduit | ✅ 3 uses | ✅ via `next-themes` | **dark** | ✅ inline script (`#dark-mode-init`) |
| BSU | ✅ 16 uses | ✅ via `@bsuite/theme/react` | system | ✅ inline script |
| R80.3 | ✅ 11 uses | ✅ via local `ThemeContext` | **light** (falls back to dark via `matchMedia`) | ❌ No FOUC script |

### Findings

- **R80.3 has no FOUC prevention** — it reads `localStorage.getItem('r8-theme')` in `getInitialTheme()` which runs during render, causing a flash if the stored theme differs from the default.
- **conduit defaults to `dark`** while crm7 and BSU default to `system`. This is a user-experience inconsistency.
- **R80.3 defaults to `light`** — the only app that does so.

---

## 4. Background Patterns (Dot/Grid)

| App | DotPattern source | Implementation | Grid pattern |
|-----|-------------------|----------------|--------------|
| crm7 | Local `magicui/dot-pattern.tsx` | SVG `<pattern>` tiling (optimized) | ❌ None |
| conduit | Local `magicui/dot-pattern.tsx` | SVG `<pattern>` tiling (optimized) | ❌ None |
| BSU | `@bsuite/ui` DotPattern | Shared package (SVG) | ✅ `.hero-grid` CSS class (32px grid, light/dark variants) |
| R80.3 | Local `magicui/dot-pattern.tsx` | **Framer Motion animated** (per-dot `motion.circle`) | ❌ None |

### Findings

- **R80.3's DotPattern uses Framer Motion with individual `motion.circle` nodes** — a performance regression vs the optimized SVG `<pattern>` tiling used by crm7/conduit. ~1,800 DOM nodes on a typical viewport.
- **Only BSU has a grid pattern** (`.hero-grid` with `background-size: 32px 32px`). Other apps have no equivalent.
- **BSU sources DotPattern from `@bsuite/ui`** (shared package) while crm7, conduit, and R80.3 maintain local copies — drift risk.

---

## 5. Semantic Token Usage Consistency

### Token layer confusion

The theme package defines a 5-layer system:
1. **Palette** → `--neon-electric-*` (frozen, do not bind directly)
2. **Surface** → `--light-*`, `--dark-*` (primitives)
3. **Role** → `--role-text-body`, `--role-bg-panel`, `--role-border` (semantic, **intended consumer API**)
4. **Shadcn** → `--background`, `--foreground`, `--card` (bridge)
5. **App** → `--text-primary`, `--bg-panel` (legacy app-level aliases)

| App | Uses `--role-*` tokens | Uses `--text-*`/`--bg-*` (app-level) | Uses shadcn `--background` etc. |
|-----|----------------------|-------------------------------------|---------------------------------|
| crm7 | ❌ 0 | ✅ 155 | ✅ (sidebar bridge) |
| conduit | ❌ 0 | ✅ 2 | ✅ |
| BSU | ⚠️ 2 | ✅ 167 | ✅ |
| R80.3 | ❌ 0 | ✅ 34 | ✅ |

### Findings

- **No app uses `--role-*` tokens** — the theme's intended semantic API (Layer 3) is effectively dead. All apps bind to Layer 5 app-level aliases (`--text-primary`, `--bg-panel`, etc.) which are defined locally in each app's CSS, not inherited from the theme package.
- **The theme package provides `--text-primary`, `--bg-body`, etc. in `tokens-light.css`/`tokens-dark.css`**, but these files are NOT imported by `index.css` (which only loads `vars.css` + `utilities.css`). Apps redefine these tokens locally instead.
- **`--color-error` is red in BSU and R80.3** but the theme's `--role-error`/`--destructive` is purple. This means the colourblind-safety policy is enforced for shadcn components but bypassed for app-level status colors.

---

## Summary of Issues

### Critical (policy violation)

1. **BSU & R80.3 `--color-error` is red, not purple** — violates the theme's colourblind policy (`--role-error` = purple). BSU has both red `--color-error` and purple `--destructive` in the same app.
2. **BSU has 19 hardcoded hex colors** in `index.css` for backgrounds, borders, and status colors that should use oklch or theme tokens.

### High (consistency / drift risk)

3. **crm7 & R80.3 duplicate the 11-color neon-electric palette** in local `@theme` blocks instead of importing `preset-v4.css`. Any palette change in `@bsuite/theme` won't propagate.
4. **conduit & R80.3 use custom ThemeProviders** instead of `@bsuite/theme/react`, with different localStorage keys and default themes.
5. **R80.3's DotPattern uses Framer Motion per-dot animation** — performance regression vs the SVG `<pattern>` tiling in crm7/conduit.

### Medium (inconsistency)

6. **No app uses `--role-*` tokens** (the theme's intended semantic API). All bind to app-level `--text-*`/`--bg-*` aliases defined locally.
7. **conduit defaults to dark theme**; R80.3 defaults to light; crm7 & BSU default to system.
8. **R80.3 has no FOUC prevention script** for theme initialization.
9. **Only BSU has a grid background pattern** (`.hero-grid`); other apps have no equivalent.
10. **BSU sources DotPattern from `@bsuite/ui`** while crm7, conduit, R80.3 maintain local copies.

### Low (minor hardcoded colors)

11. **conduit `PipelineStagesSection.tsx`** has 8 hardcoded hex colors for stage color picker presets.
12. **conduit `safety-alert.ts`** has `color:#6b7280` in an HTML email template.
13. **crm7 `calendar.tsx`** has `'#3b82f6'` as a fallback for leave type colors.
14. **R80.3 `index.css`** has `#f2f2f2` for `--color-destructive-foreground` and `#DC2626`/`#059669` as CSS fallback values.