# @bsuite/theme

Universal theme package for the BSuite monorepo. Ships the D2C Neon Electric baseline, the Braden Corporate baseline, Tailwind tokens, CSS variables, React `ThemeProvider`, runtime `BrandingProvider`, and a framework-agnostic FOUC-prevention script.

## What's inside

- **CSS variables** — OKLCH source palettes, role aliases, light/dark surfaces, shadcn bridge variables, and WCAG AA-compliant anti-glare text tokens
- **Dual brand baselines** — D2C via `@bsuite/theme/css`; Braden via `@bsuite/theme/braden-css`
- **Native scrollbars** — both baselines use semantic thumb/track colours and follow the resolved root `.dark` class. Coarse pointers keep the platform width; forced-colour mode keeps platform colours and width. Consumers should not duplicate these rules locally.
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

**The values live in `src/css/vars.css` and `src/css/braden.css`, and only there.**
This table gives each role's _binding_ and the line that owns it, deliberately not
the literal. Until 2026-09-03 it carried literals, and three of its five rows were
the pre-0.7.0 contract: it advertised error as purple `oklch(0.568 0.202 283.1)`
with "coral/red must not be semantic error/destructive" — the exact rule the
2026-08-02 rewrite overturned — plus green-as-success and orange-as-warning, both
also superseded. `AGENTS.md` names this file as canonical for "theme tokens, both
brands", so an agent that trusted it painted the overturned palette. A second copy
of a value is a second source of truth; this table now points instead.

| Role / token | Binds to | Owner | Notes |
|---|---|---|---|
| `--role-primary` | `--neon-electric-blue` | `vars.css:152` | Primary actions and focus affordances |
| `--role-accent` | `--neon-electric-cyan` | `vars.css:154` | Accents, highlights, visible focus in dark mode |
| `--role-secondary` | `--neon-electric-deep` | `vars.css:153` | Secondary action; was indigo — 0.037 from primary |
| `--role-success` | `--neon-electric-teal` | `vars.css:168` | Success; never rely on colour alone |
| `--role-warning` | `--neon-electric-amber` | `vars.css:167` | Warning; pair with icon/text. Separates from error by LIGHTNESS |
| `--role-error` / `--role-destructive` | `--neon-electric-red` | `vars.css:165-166` | **RED.** Tenant override blocked. Purple measured ΔE 0.006 against primary blue under protanopia — the destructive colour and the primary action colour were the same swatch |

Purple, indigo, coral, orange, yellow and green remain in the palette as
**decorative** entries. None of them may be bound to a semantic role.

Braden keeps separate corporate identity tokens in `@bsuite/theme/braden-css`
(`--braden-red`, `--braden-gold`, `--braden-navy`, `braden.css:62-68`). Red is
identity only. **Braden's error/destructive roles map to `--error-red`
(`braden.css:81,187-188`) — the same error red the D2C brand uses, by operator
ruling 2026-08-10: recognition beats palette separation, a person reads red as
"danger" before they read it as "Braden".** The cost is measured in that file's
header — ΔE 0.113 between error red and Braden red is now the Corporate palette's
tightest pair — so a destructive action on Braden must carry an icon or an
explicit verb, never colour alone.

WCAG AA compliance: use semantic text tokens (`text-foreground`, `text-muted-foreground`, `text-text-on-primary`, `text-text-on-accent`) rather than raw `text-white`/`text-black`. Dark-surface text is capped at L=0.94 for extended-session comfort.

## Elevation (v0.11.0)

`shadow-elev-0` … `shadow-elev-4` — the suite's card-elevation ramp, and the
first release in which those classes exist at all. 25 call sites across crm7
and business-suite-unified, four `CLAUDE.md` files and the canonical
`bsuite-brand-system` skill had instructed `shadow-elev-*` while no rule
matched it anywhere; every one computed `box-shadow: none`.

- `shadow-elev-0` is a real reset (`0 0 0 0 transparent`), not the absence of
  a rule. It is deliberately not `none`, which invalidates Tailwind v4's
  composite `box-shadow` declaration and takes the focus ring with it.
- Geometry follows Tailwind's `xs`/`md`/`lg`/`xl`; colour comes from
  `--shadow-ink-*`, an OKLCH ladder derived from `--shadow-color` and scaled
  by `--shadow-strength`, rebinding under `.dark`.
- The same release rebinds Tailwind's own `--shadow-*`, `--inset-shadow-*`,
  `--drop-shadow-*` and `--text-shadow-*` onto that ink. They ship from
  Tailwind as `rgb(0 0 0 / a)` — pure black, banned in every role, and
  invisible to the colour audit because the literal lives in `node_modules`.
  292 `shadow-sm|md|lg|xl|2xl` call sites across the estate were painting it,
  and in dark mode painting it invisibly.

Geometry is unchanged, so nothing moves; light mode shifts by a hue-tint only.
Dark mode changes materially, because dark shadows previously did not render.

## Text-role contract (v0.6.0)

Six measured tiers — `--role-text-heading`, `--role-text-body`, `--role-text-secondary`, `--role-text-muted`, `--role-text-subtle`, `--role-text-disabled` — each with documented WCAG contrast in both modes. Full numbers + methodology: `docs/TOKEN-MAPPING.md` §8.1.

## Canonical gradient (v0.6.0)

Exactly one decorative accent gradient exists suite-wide — `--gradient-accent` / `.bsuite-accent-gradient` (`--role-primary` → `--role-accent`). Marketing heroes only, never functional text. `docs/TOKEN-MAPPING.md` §8.2.

## Grid/dot doctrine (v0.6.0)

`<HeroGrid>` (public/pre-auth hero bands) and `<DotPattern>` (authenticated shells, `@bsuite/ui`) are mutually exclusive per context and enforced by `@bsuite/dry-lint`'s `no-grid-dot-doctrine-violation` rule. `docs/TOKEN-MAPPING.md` §8.3.

## License

UNLICENSED — internal BSuite use only.
