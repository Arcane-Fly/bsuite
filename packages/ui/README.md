# @bsuite/ui

Shared UI primitives for the BSuite apps (D2C Neon Electric + Corporate brands).

Ships as an npm package because Vercel deploys each BSuite app from its own
GitHub repo — the parent monorepo's `packages/` directory does NOT exist in
the Vercel build context. Consumers install from npm with a pinned semver.

## Components

### Core primitives (v0.4.0+)

The package now owns the shared Tier 1 UI primitives apps should converge on:

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorBoundary,
  LoadingSpinner,
  StatusBadge,
} from '@bsuite/ui'
```

These primitives use BSuite/shadcn semantic token classes only (`bg-primary`,
`text-muted-foreground`, `border-border`, `text-status-success`, etc.) so D2C apps can
skin them through `@bsuite/theme` and Braden can map the same roles to the
corporate palette.

### Storybook

Run the shared primitive gallery from this package:

```bash
pnpm -C packages/ui storybook
pnpm -C packages/ui build-storybook
```

### `DotPattern`

Full-viewport dot-pattern background. SVG `<pattern>` tiling — ~1 DOM node
(vs ~1,800 motion.circle nodes on a typical viewport).

```tsx
import { DotPattern } from '@bsuite/ui'

<div className="relative">
  <DotPattern
    width={28}
    height={28}
    cr={1.5}
    className="opacity-[0.35] text-muted-foreground"
  />
  {/* page content */}
</div>
```

Colour control via semantic Tailwind `text-*` utilities (dots use
`fill="currentColor"`).

### `Logo`

Slot-aware, theme-aware, branding-aware logo component for all BSuite apps.

```tsx
import { Logo } from '@bsuite/ui'

<Logo slot="header" colorScheme="auto" />
```

### `D2CDefaultLogo`

Inline D2C Neon Electric SVG logo (no asset dependency).

```tsx
import { D2CDefaultLogo } from '@bsuite/ui'

<D2CDefaultLogo className="h-8 w-auto" />
```

## Branding Components (v0.3.0+)

### `OklchColorPicker`

A color input component for OKLCH color format (BSuite standard).

```tsx
import { OklchColorPicker } from '@bsuite/ui'

<OklchColorPicker
  value="oklch(0.546 0.215 262.9)"
  onChange={(value) => console.log(value)}
  label="Primary Color"
  description="Your brand's primary color in OKLCH format"
/>
```

**Features:**
- Live color preview
- Input fields for L (lightness), C (chroma), H (hue)
- Slider controls for easy adjustment
- Validation of OKLCH format
- Accessible labels and error messages

### `ColorEditorSheet`

A sheet/dialog for editing branding colors with a slot-based color editor.

```tsx
import { ColorEditorSheet, OklchColorPicker } from '@bsuite/ui'

<ColorEditorSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Edit Primary Color"
  description="Adjust the OKLCH color values"
  value="oklch(0.546 0.215 262.9)"
  onSave={(value) => updateBranding('primary', value)}
  renderEditor={(props) => <OklchColorPicker {...props} />}
/>
```

**Features:**
- Slide-out sheet interface
- Slot-based color editor (inject your own picker)
- Save/Cancel actions
- Responsive design
- Accessible dialog implementation

### `BrandingCard`

A card component for displaying and editing tenant branding configuration.

```tsx
import { BrandingCard, OklchColorPicker } from '@bsuite/ui'

<BrandingCard
  branding={{
    primary: "oklch(0.546 0.215 262.9)",
    accent: "oklch(0.769 0.132 191.7)",
    logo_url: "https://example.com/logo.svg",
    company_name: "Acme Corp"
  }}
  onUpdate={async (key, value) => {
    await updateTenantBranding(key, value)
  }}
  renderColorEditor={(props) => <OklchColorPicker {...props} />}
/>
```

**Features:**
- Display current branding values (colors, logos, company name)
- Edit buttons for each branding property
- Integrated color editing with ColorEditorSheet
- Image preview for logos
- Accessible and responsive design
- Support for light/dark mode logo variants

**Branding Properties:**
- `primary` - Primary action color (OKLCH)
- `accent` - Accent/secondary color (OKLCH)
- `logo_url` - Main logo URL
- `logo_light_url` - Light mode logo variant (optional)
- `logo_dark_url` - Dark mode logo variant (optional)
- `favicon_url` - Favicon URL (16x16 or 32x32)
- `company_name` - Company name for alt text

## `EntitySelector` (v1.2.0+)

Generic, schema-agnostic searchable combobox for picking a row out of any
Supabase table. Extracted from crm7 (AD-5, 2026-08-17) — crm7 had 65 files of
adoption and two other apps had each started hand-porting their own copy at
the identical path. This is now the sole implementation.

Data access is dependency-injected — the package does not own a Supabase
client, since every app's client is shaped differently (Vite-SPA singleton,
per-request `createClient()` factory, distinct `storageKey`, …):

```tsx
import { EntitySelector } from '@bsuite/ui'
import { supabase } from '@/lib/supabase' // your app's own client

<EntitySelector<Employer>
  supabaseClient={supabase}
  table="employers"
  value={form.employer_id}
  onSelect={(emp) => setValue('employer_id', emp?.id ?? null)}
  displayField={(r) => r.business_name}
  secondaryField={(r) => r.abn ?? r.industry}
  searchColumns={['business_name', 'trading_name', 'abn']}
/>
```

**Recommended per-app pattern:** wrap the import once in a thin local file
that binds your app's client, so the rest of the app's ~dozens of call sites
never repeat `supabaseClient={supabase}`:

```tsx
// src/components/entity/EntitySelector.tsx
import { EntitySelector as BaseEntitySelector, type EntitySelectorProps as BaseProps } from '@bsuite/ui'
import { supabase } from '@/lib/supabase'

export type EntitySelectorProps<T extends Record<string, unknown>> = Omit<BaseProps<T>, 'supabaseClient'>

export function EntitySelector<T extends Record<string, unknown>>(props: EntitySelectorProps<T>) {
  return <BaseEntitySelector<T> supabaseClient={supabase} {...props} />
}
```

**Features:** debounced typeahead (`ilike` across configured columns),
optional cross-schema reads (`schema` prop), a `filterFn` escape hatch for
arbitrary PostgREST filter chains, "one-shot" suggested options (rows already
linked on an earlier screen, shown before any typing), an async-safe
`onSelect` (no optimistic UI when the caller's select routes through an
import/RPC step), and a distinct error state (not the same "no results" copy
a genuine empty search shows).

Also exported for building custom pickers on the same visual language:
`Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`,
`CommandEmpty`, `Popover`, `PopoverTrigger`, `PopoverContent`.

## Utils

### `cn(...classes)`

shadcn-style className merger — `clsx` + `tailwind-merge`. Available for
consumers that want to compose `@bsuite/ui` components with local overrides
without pulling shadcn again.

## Module Exports

The package provides subpath exports for better tree-shaking:

```tsx
// Main exports
import { Logo, BrandingCard, Button, StatusBadge } from '@bsuite/ui'

// Dot pattern only
import { DotPattern } from '@bsuite/ui/dot-pattern'

// Utils only
import { cn } from '@bsuite/ui/utils'

// Branding components only
import { BrandingCard, ColorEditorSheet, OklchColorPicker } from '@bsuite/ui/branding'

// Primitive subpaths
import { Button } from '@bsuite/ui/button'
import { DialogContent } from '@bsuite/ui/dialog'
import { EmptyState } from '@bsuite/ui/empty-state'
import { EntitySelector } from '@bsuite/ui/entity-selector'
import { Command, CommandInput } from '@bsuite/ui/command'
import { Popover, PopoverContent } from '@bsuite/ui/popover'

// SVG asset
import logoSvg from '@bsuite/ui/assets/d2c-default-logo.svg'
```

## Releases

1. Edit source under `src/`.
2. `pnpm -C packages/ui test` — all cases must pass.
3. `pnpm -C packages/ui build` — emits `dist/`.
4. Bump version in `package.json` (semver).
5. Merge the package release PR to `main`; `.github/workflows/publish-ui.yml`
   publishes via npm Trusted Publishers (GitHub Actions OIDC, no `NPM_TOKEN`).
6. Update consumer `package.json` to the new version, regenerate lockfile
   **outside** the bsuite tree (see root `CLAUDE.md` rule 7), commit the
   lockfile + a consumer-side bump PR.

**NEVER** use `workspace:*` or `file:../packages/ui` for this package in a
consumer — Vercel builds can't resolve those.
