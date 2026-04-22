# @bsuite/theme v0.2.0 — Migration Guide

**Status:** A (Approved 2026-04-22)

## What changed

v0.2.0 is **additive and backwards-compatible**. Existing consumers on v0.1.x keep working. New consumers get the full semantic token set.

### New CSS files

| File | Purpose |
|---|---|
| `tokens-light.css` | Full light-theme semantic token set (text, bg, border, status, shadcn bridge) |
| `tokens-dark.css` | Full dark-theme semantic token set |
| `tokens-high-contrast.css` | AAA overrides for `prefers-contrast: more` |
| `tokens-brand-corporate-braden.css` | Braden corporate Red/Gold deviation (opt-in only) |
| `runtime-branding.css` | Placeholder — BrandingProvider injects vars at runtime |

All are included when you `@import '@bsuite/theme/css'`.

### New React exports (`@bsuite/theme/react`)

- `BrandingProvider` — runtime enterprise white-labelling component
- `useBranding()` — hook to access current tenant branding values
- `TenantBranding` type

### New shadcn bridge token values

All shadcn `--primary`, `--background`, `--foreground`, etc. tokens are now **OKLCH** values (not HSL triplets). If your code calls `hsl(var(--primary))`, update it to `var(--primary)` — the value now resolves directly.

## Upgrading

### Step 1 — Update package reference

```bash
pnpm add @bsuite/theme@0.2.0
```

### Step 2 — Add import

In your app's global stylesheet (index.css or globals.css), ensure this is the first non-font import:

```css
@import '@bsuite/theme/css';
```

### Step 3 — Remove duplicated token declarations

Delete any local re-declarations of:
- `--neon-electric-*` (all 11)
- shadcn bridge HSL triplets (`--primary: 217 91% 60%` etc.)
- Any token listed in `TOKEN-MAPPING.md §3`

### Step 4 — Fix hsl(var()) call sites

Search for `hsl(var(--` and replace with `var(--`:

```bash
grep -rn 'hsl(var(--' src/
```

### Step 5 — Run the codemod (optional — flags remaining hardcoded classes)

```bash
cd packages/theme-codemod
node migrate.mjs --app=<your-app> --dry-run   # preview
node migrate.mjs --app=<your-app>             # apply
```

Review all `THEME-REVIEW` and `THEME-MANUAL` flagged lines after running.

### Step 6 — Wire BrandingProvider (optional — for runtime white-labelling)

```tsx
import { ThemeProvider } from '@bsuite/theme/react'
import { BrandingProvider } from '@bsuite/theme/react'
import { supabase } from '@/lib/supabase'

function App() {
  return (
    <ThemeProvider>
      <BrandingProvider supabaseClient={supabase}>
        {/* your app */}
      </BrandingProvider>
    </ThemeProvider>
  )
}
```

Requires the `branding_json_for_tenant` RPC to be deployed (see Supabase migration `20260422160000_tenants_branding_jsonb.sql`).

Set `VITE_ENABLE_BRANDING_OVERRIDE=false` to disable the runtime override without code changes.

## Breaking changes

None. v0.2.0 is fully additive. The only behaviour change is that shadcn bridge tokens (`--primary` etc.) now resolve to OKLCH values instead of undefined, which fixes previously invisible buttons/backgrounds.
