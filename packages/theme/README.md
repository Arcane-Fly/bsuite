# @bsuite/theme

Universal D2C Neon Electric theme for the BSuite monorepo. Ships the canonical palette, Tailwind tokens, CSS variables, React ThemeProvider, and a framework-agnostic FOUC-prevention script.

## What's inside

- **CSS variables** — 11 neon electric colours + light/dark surface tokens + WCAG AA-compliant text tokens
- **Tailwind v3 preset** — drop-in `presets: [require('@bsuite/theme/tailwind-preset')]`
- **Tailwind v4 `@theme` block** — `@import '@bsuite/theme/preset-v4.css'`
- **`<ThemeProvider>`** + **`useTheme()`** with localStorage persistence + system preference
- **`getThemeInitScript()`** — stringified JS for inline `<script>` tags to prevent FOUC

## Install

```bash
pnpm add @bsuite/theme
```

## Consumer setup

### Vite (v4 Tailwind) — BSU / CRM7 / R80.3

**1.** `src/index.css` or equivalent global stylesheet:

```css
@import 'tailwindcss';
@import '@bsuite/theme/preset-v4.css';
@import '@bsuite/theme/css';

/* your app-specific @theme {} overrides below */
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

### Next.js 16 (v4 Tailwind) — conduit

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

### Vite (v3 Tailwind) — throughput

**1.** `tailwind.config.js`:

```js
module.exports = {
  presets: [require('@bsuite/theme/tailwind-preset')],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
}
```

**2.** Global stylesheet:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import '@bsuite/theme/css';
```

**3.** `src/main.tsx` + `index.html` — same as the v4 Vite setup above.

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

## Palette

All 11 canonical electric colours are available via Tailwind classes:

| Token | Hex | Use |
|---|---|---|
| `neon-electric-blue` | `#2563eb` | Primary, highlights |
| `neon-electric-cyan` | `#00cec9` | Accents, borders |
| `neon-electric-indigo` | `#4f46e5` | Secondary actions |
| `neon-electric-purple` | `#6c5ce7` | Gradients, effects |
| `neon-electric-magenta` | `#fd79a8` | Interactive |
| `neon-electric-pink` | `#ec4899` | Hover states |
| `neon-electric-coral` | `#ff4757` | Alerts, destructive |
| `neon-electric-orange` | `#ff7675` | Warnings |
| `neon-electric-yellow` | `#fdcb6e` | Info |
| `neon-electric-green` | `#22c55e` | Success |
| `neon-electric-lavender` | `#a29bfe` | Subtle accents |

WCAG AA compliance: use `text-color-accent-text` and `text-color-primary-text` for text on light backgrounds. These are the accessible equivalents of cyan and blue — same visual identity, 5:1+ contrast on `#f2f2f2`.

## License

UNLICENSED — internal BSuite use only.
