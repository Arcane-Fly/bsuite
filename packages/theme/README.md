# @bsuite/theme

Universal theme package for the BSuite monorepo. Ships the D2C Neon Electric baseline, the Braden Corporate baseline, Tailwind tokens, CSS variables, React `ThemeProvider`, runtime `BrandingProvider`, and a framework-agnostic FOUC-prevention script.

## What's inside

- **CSS variables** — OKLCH source palettes, role aliases, light/dark surfaces, shadcn bridge variables, and WCAG AA-compliant anti-glare text tokens
- **Dual brand baselines** — D2C via `@bsuite/theme/css`; Braden via `@bsuite/theme/braden-css`
- **Tailwind v4+ `@theme` block** — `@import '@bsuite/theme/preset-v4.css'`
- **`<ThemeProvider>`** + **`useTheme()`** with localStorage persistence + system preference
- **`<BrandingProvider>`** — enterprise runtime white-labelling for D2C apps; Braden short-circuits to static corporate tokens
- **`getThemeInitScript()`** — stringified JS for inline `<script>` tags to prevent FOUC

## Install

```bash
pnpm add @bsuite/theme
```

## Consumer setup

### Vite (Tailwind v4+) — BSU / CRM7 / R80.3 / Throughput

**1.** `src/index.css` or equivalent global stylesheet:

```css
@import 'tailwindcss';
@import '@bsuite/theme/preset-v4.css';
@import '@bsuite/theme/css';

/* your app-specific @theme {} overrides below */
```

Braden uses the same Tailwind bridge shape but imports the corporate baseline:

```css
@import 'tailwindcss';
@import '@bsuite/theme/braden-css';
```

**2.** `src/main.tsx`:

```tsx
import { ThemeProvider } from '@bsuite/theme/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)
```

**3.** `index.html` — FOUC prevention:

Paste the result of `getThemeInitScript()` into `<head>` before stylesheets.

### Next.js 16 (Tailwind v4+) — conduit

**1.** `src/app/globals.css`:

```css
@import 'tailwindcss';
@import '@bsuite/theme/preset-v4.css';
@import '@bsuite/theme/css';
```

**2.** `src/app/layout.tsx` — inline theme-init script in `<head>`:

```tsx
import Script from 'next/script'
import { getThemeInitScript } from '@bsuite/theme/ssr'
import { ThemeProvider } from '@bsuite/theme/react'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="bsuite-theme-init" strategy="beforeInteractive">
          {getThemeInitScript()}
        </Script>
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

### Tailwind floor

All consumers must use Tailwind CSS v4 or later. The legacy `./tailwind-preset`
export remains only so older published package metadata does not break import
resolution; it is not a supported BSuite consumption path.

## Using the hook

```tsx
import { useTheme } from '@bsuite/theme/react'

export function ThemeToggleButton() {
  const { theme, resolvedTheme, isDark, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
```

The `resolvedTheme` always returns `'light'` or `'dark'` — use this when you need the _effective_ theme (it resolves `'system'` for you).

## Palette And Roles

All 11 canonical electric colours are available as palette tokens, but consumer UI should bind to role/shadcn tokens. Palette names are presentational; roles are the stable contract for white-labelling.

| Role / token | OKLCH source | Notes |
|---|---|---|
| `--role-primary` / Electric Blue | `oklch(0.546 0.215 262.9)` | Primary actions and focus affordances |
| `--role-accent` / Electric Cyan | `oklch(0.769 0.132 191.7)` | Accents, highlights, visible focus in dark mode |
| `--role-success` | `oklch(0.723 0.192 149.6)` | Success; never rely on colour alone |
| `--role-warning` | `oklch(0.728 0.168 22.5)` | Warning; pair with icon/text |
| `--role-error` / `--role-destructive` | `oklch(0.568 0.202 283.1)` | Purple by platform policy; coral/red must not be semantic error/destructive |

Braden keeps separate corporate identity tokens in `@bsuite/theme/braden-css`: Braden Red `oklch(0.51 0.17 19)`, Braden Gold `oklch(0.77 0.10 82)`, and Braden Navy `oklch(0.34 0.04 250)`. Red is identity only; Braden error/destructive roles still map to purple.

WCAG AA compliance: use semantic text tokens (`text-foreground`, `text-muted-foreground`, `text-text-on-primary`, `text-text-on-accent`) rather than raw `text-white`/`text-black`. Dark-surface text is capped at L=0.94 for extended-session comfort.

## Text-role contract (v0.6.0)

Six measured tiers — `--role-text-heading`, `--role-text-body`, `--role-text-secondary`, `--role-text-muted`, `--role-text-subtle`, `--role-text-disabled` — each with documented WCAG contrast in both modes. Full numbers + methodology: `docs/TOKEN-MAPPING.md` §8.1.

## Canonical gradient (v0.6.0)

Exactly one decorative accent gradient exists suite-wide — `--gradient-accent` / `.bsuite-accent-gradient` (`--role-primary` → `--role-accent`). Marketing heroes only, never functional text. `docs/TOKEN-MAPPING.md` §8.2.

## Grid/dot doctrine (v0.6.0)

`<HeroGrid>` (public/pre-auth hero bands) and `<DotPattern>` (authenticated shells, `@bsuite/ui`) are mutually exclusive per context and enforced by `@bsuite/dry-lint`'s `no-grid-dot-doctrine-violation` rule. `docs/TOKEN-MAPPING.md` §8.3.

## License

UNLICENSED — internal BSuite use only.
