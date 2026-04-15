# @bsuite/design-tokens

Shared design tokens for all 5 BSuite apps — spacing, typography, shadows, border radius, motion, status colours, and the D2C Neon Electric palette.

These tokens are the single source of truth that keeps every app visually consistent without forcing them to look identical. Each app still has its own accent colour via `--app-primary` / `--app-accent`.

---

## Installation

This package lives in the bsuite monorepo. Consumer apps already have access via the pnpm workspace. For npm version refs (non-workspace consumers):

```bash
# not yet published externally — monorepo use only
```

---

## Usage

### CSS (recommended for Vite/Next.js apps)

```css
/* In your global CSS file, before Tailwind */
@import "@bsuite/design-tokens/css/all";

/* Then your per-app accent override */
:root {
  --app-primary: #2563eb;
  --app-accent:  #00cec9;
}

/* Then Tailwind */
@import "tailwindcss";
```

Or import layers individually:

```css
@import "@bsuite/design-tokens/css/base";     /* palette, spacing, radius, shadows */
@import "@bsuite/design-tokens/css/dark";     /* dark-mode overrides */
@import "@bsuite/design-tokens/css/motion";   /* duration, easing, prefers-reduced-motion */
@import "@bsuite/design-tokens/css/typography"; /* utility classes (optional) */
```

### JS/TS (for charts, canvas, runtime styles)

```ts
import { neonElectric, neonRgba, space, radius, appAccents } from '@bsuite/design-tokens';

// Neon palette
const primary = neonElectric.blue;           // '#2563eb'
const glassy  = neonRgba('cyan', 0.18);      // 'rgba(0, 206, 201, 0.18)'

// Spacing
const padding = space[4];                    // '1rem'

// Per-app accents (for cross-app UI components)
const { primary: crm7Primary } = appAccents.crm7;
```

---

## Token Layers

| Layer | File | What it covers |
|-------|------|----------------|
| Base | `css/base.css` | Neon electric palette, spacing scale, radius, shadows, glow effects, light-mode semantic colours, z-index, component size vars |
| Dark | `css/dark.css` | Dark-mode overrides for backgrounds, text, borders, status colours, shadows |
| Motion | `css/motion.css` | Duration scale, easing curves, `prefers-reduced-motion` guard |
| Typography | `css/typography.css` | Type scale utility classes — `text-h1`, `text-body`, `text-label`, `text-stat` |
| All | `css/all.css` | Convenience barrel — imports base + dark + motion |

---

## Per-App Accent Colours

The only thing that changes between apps is `--app-primary` and `--app-accent`. Everything else is shared.

| App | Primary | Accent |
|-----|---------|--------|
| crm7 | `#2563eb` electric blue | `#00cec9` electric cyan |
| conduit | `#059669` emerald | `#34d399` emerald light |
| business-suite-unified | `#7c3aed` violet | `#a78bfa` violet light |
| R80.3 | `#db2777` pink | `#f472b6` pink light |
| braden | `#0284c7` sky | `#38bdf8` sky light |

---

## Adding a Token

1. Add the CSS variable to the appropriate `src/css/*.css` file
2. If it has a JS equivalent, add it to `src/js/tokens.ts` and re-export from `src/js/index.ts`
3. Update the minor version in `package.json`
4. Consumer apps pick up the new variable automatically (CSS) or after re-installing (JS)

---

## WCAG Compliance Notes

- All light-mode text colours in `base.css` are ≥ 4.5:1 contrast on white
- Status colours in light mode use darkened variants (e.g., `#047857` not `#10b981`)
- Dark-mode status colours use their brightened counterparts
- Motion tokens respect `prefers-reduced-motion` — never skip this import
