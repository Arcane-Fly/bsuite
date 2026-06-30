---
name: bsuite-brand-system
description: "Enforce correct brand styling across all BSuite projects. Two distinct brands exist: D2C Neon Electric (crm7, conduit, business-suite-unified, R80.3) and Corporate (braden.com.au). Use when writing UI components, reviewing styling, adding CSS, or touching any visual element. NEVER mix brands."
---

> **⚠️ OKLCH Color Enforcement**: All color values in this skill MUST use the
> `oklch()` color space. OKLCH provides perceptually uniform lightness, a wider
> P3 gamut (20–30% more vivid), and better gradient interpolation than hex/HSL/RGB.
> Never use hex (`#rrggbb`), `hsl()`, or `rgb()` for color definitions.
> Syntax: `oklch(L C H)` where L=lightness 0–1, C=chroma 0–0.4, H=hue 0–360.



# BSuite Brand System

## The Rule

BSuite has **two distinct brands**. Every UI change must use the correct one.

| Brand | Projects | Primary | Accent | Dark BG |
|-------|----------|---------|--------|---------|
| **D2C Neon Electric** | crm7, conduit, business-suite-unified, R80.3 | Electric Blue `oklch(0.546 0.215 262.9)` | Cyan `oklch(0.769 0.132 191.7)` | Deep Navy `oklch(0.13 0.02 260)` |
| **Corporate Braden** | braden (braden.com.au) | Braden Red `oklch(0.488 0.170 17.6)` | Braden Gold `oklch(0.769 0.096 90.9)` | Near Black `oklch(0.04 0 0)` |

<HARD-GATE>
NEVER apply D2C Neon Electric theme colors, gradients, or glow effects to braden.com.au.
NEVER apply Corporate Red/Gold branding to any webapp project.
If you are unsure which brand applies, STOP and ask.
</HARD-GATE>

---

## D2C Neon Electric Theme (Webapps)

### Canonical Source
`Theme-best-practice.md`

### Color Palette

**Color format rule: oklch mandatory.** Never add new hex/rgb color tokens. Hex/rgb only acceptable for third-party component defaults or legacy compatibility tokens.

```
Neon Spectrum (11 colors) — oklch primary, hex (legacy):
  Electric Blue:     oklch(0.546 0.215 262.9)   oklch(0.546 0.215 262.9)   → Primary actions, highlights
  Electric Cyan:     oklch(0.769 0.132 191.7)   oklch(0.769 0.132 191.7)   → Accents, borders
  Electric Indigo:   oklch(0.511 0.23 277)       oklch(0.511 0.230 277.0)   → Secondary actions
  Electric Purple:   oklch(0.568 0.202 283.1)    oklch(0.568 0.202 283.1)   → Gradients, effects
  Electric Magenta:  oklch(0.742 0.167 359.5)    oklch(0.742 0.167 359.5)   → Interactive elements
  Electric Pink:     oklch(0.656 0.212 354.3)    oklch(0.656 0.212 354.3)   → Hover states
  Electric Coral:    oklch(0.669 0.219 20.9)     oklch(0.669 0.219 20.9)   → Alerts, destructive
  Electric Orange:   oklch(0.728 0.168 22.5)     oklch(0.728 0.168 22.5)   → Warnings
  Electric Yellow:   oklch(0.868 0.125 81.4)     oklch(0.868 0.125 81.4)   → Info, secondary alerts
  Electric Green:    oklch(0.723 0.192 149.6)    oklch(0.723 0.192 149.6)   → Success states
  Electric Lavender: oklch(0.736 0.141 285.6)    oklch(0.736 0.141 285.6)   → Subtle accents

Brand Identity (per-project):
  CRM7:     --app-primary: oklch(0.546 0.215 262.9)  --app-accent: oklch(0.769 0.132 191.7)
  BSU:      --app-primary: oklch(0.541 0.247 293.0)  --app-accent: oklch(0.709 0.159 293.5)
  Conduit:  --app-primary: oklch(0.596 0.127 163.3)  --app-accent: oklch(0.773 0.153 163.3)
  R80.3:    --app-primary: oklch(0.666 0.157 58.3)  --app-accent: oklch(0.837 0.164 84.4)
```

### Semantic Tokens (Use These, Not Raw Colors)

```css
/* Tailwind classes → CSS variables → Theme values */
text-primary         → --primary           → --accent-primary / --brand-cyan
text-destructive     → --destructive       → oklch(0.637 0.208 25.3)
text-muted-foreground → --muted-foreground → --text-secondary
text-emerald-700     → Tailwind emerald    → Success states
text-amber-700       → Tailwind amber      → Warning states
text-sky-700         → Tailwind sky        → Info states
bg-background        → --background        → --bg-body
bg-card              → --card              → --bg-panel
bg-muted             → --muted             → --bg-input
shadow-elev-{0-4}    → --shadow-{0-4}      → Elevation shadows
```

### How to Style Components

```tsx
// CORRECT: Use semantic Tailwind tokens
<div className="bg-card text-foreground border-border shadow-elev-2">
  <p className="text-muted-foreground">Label</p>
  <p className="text-3xl font-bold">Value</p>
  <Icon className="h-5 w-5 text-primary" />
</div>

// CORRECT: Use design system components
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { formatters } from '@/lib/formatters';

// WRONG: Hardcoded colors
<div style={{ backgroundColor: 'oklch(0.755 0.153 231.7)' }}>   // FORBIDDEN
<div className="bg-[oklch(0.546 0.215 262.9)]">                  // FORBIDDEN
<div className="bg-blue-500">                   // AVOID (use semantic tokens)
```

### Background Hierarchy

```
Light Mode:                    Dark Mode:
  Body:    oklch(0.96 0 0)         Body:    oklch(0.13 0.02 260) (deep navy)
  Surface: oklch(0.984 0.003 248.2)               Surface: oklch(0.19 0.02 260)
  Panel:   oklch(1.000 0 0)               Panel:   oklch(0.19 0.02 260 / 0.8)
  Header:  oklch(0.968 0.007 248.1)               Header:  oklch(0.24 0.02 260 / 0.95)
  Input:   oklch(0.968 0.007 248.1)               Input:   oklch(0.24 0.02 260 / 0.6)
```

### Typography

```
Font Stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif
Mono:       ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace

DO NOT use Montserrat or Inter headings in webapps (those are Corporate brand)
```

### Dark Mode Glow Effects

```css
/* Neon glow on interactive elements (dark mode only) */
--button-shadow:       0 0 20px oklch(0.769 0.132 191.7 / 0.3);
--button-hover-shadow: 0 0 30px oklch(0.769 0.132 191.7 / 0.5);

/* Border glow */
--border-color:        oklch(0.769 0.132 191.7 / 0.15);
--border-color-strong: oklch(0.769 0.132 191.7 / 0.3);
```

### Brand Gradients

```css
--gradient-brand:    linear-gradient(135deg, oklch(0.669 0.219 20.9) 0%, oklch(0.728 0.168 22.5) 25%, oklch(0.868 0.125 81.4) 50%, oklch(0.769 0.132 191.7) 75%, oklch(0.736 0.141 285.6) 100%);
--gradient-electric: linear-gradient(135deg, oklch(0.546 0.215 262.9) 0%, oklch(0.769 0.132 191.7) 50%, oklch(0.656 0.212 354.3) 100%);
--gradient-neon:     linear-gradient(90deg, oklch(0.769 0.132 191.7) 0%, oklch(0.568 0.202 283.1) 50%, oklch(0.669 0.219 20.9) 100%);
```

---

## Corporate Braden Brand (braden.com.au)

### Canonical Source
`braden/tailwind.config.ts` and `braden/styles/globals.css`

### Color Palette

```
Primary Colors:
  Braden Red:       oklch(0.488 0.170 17.6)    → Main brand color
  Dark Red:         oklch(0.400 0.137 16.8)    → Darker shade
  Brand Primary:    oklch(0.502 0.189 27.5)    → Headers, CTAs

Accent Colors:
  Braden Gold:      oklch(0.769 0.096 90.9)    → Accent, decorative
  Light Gold:       oklch(0.829 0.073 91.8)    → Subtle gold variant
  Bronze:           oklch(0.711 0.115 89.5)    → Tertiary accent

Secondary Colors:
  Navy:             oklch(0.356 0.039 249.0)    → Professional blue
  Slate:            oklch(0.710 0.018 201.5)    → Neutral
  Sky:              oklch(0.653 0.135 242.7)    → Links
  Forest:           oklch(0.663 0.160 152.4)    → Success
  Lavender:         oklch(0.577 0.153 315.3)    → Highlights
```

### Typography

```
Headings: Montserrat, sans-serif    (DO NOT use in webapps)
Body:     Inter, sans-serif         (shared with webapps via system font stack)
```

### Shadow Style

```css
/* Corporate: subtle, professional shadows (no neon glow) */
.brand-shadow: 0 4px 6px -1px oklch(0.000 0 0 / 0.1), 0 2px 4px -1px oklch(0.000 0 0 / 0.06);
```

---

## Design System Components (Webapps Only)

All webapp projects share these canonical components. Import from `@/components/common/`.

### StatCard
```tsx
import { StatCard } from '@/components/common/StatCard';

<StatCard
  title="Total Revenue"
  value={695000}
  icon={DollarSign}          // LucideIcon reference, not JSX
  formatAs="compact"         // 'number' | 'currency' | 'percent' | 'compact'
  href="/financial"          // Makes clickable via Clickable wrapper
  change={{ value: 5.2, positive: true, text: "vs last month" }}
/>
```

### DataTable
```tsx
import { DataTable, type Column } from '@/components/common/DataTable';

const columns: Column<MyType>[] = useMemo(() => [
  { key: 'name', header: 'Name', render: (val, row) => <span>{val}</span> },
  { key: 'status', header: 'Status', render: (val) => (
    <StatusBadge variant={getStatusVariant(val)} label={val} />
  )},
], []);

<DataTable data={items} columns={columns} emptyMessage="No items found" />
```

### StatusBadge
```tsx
import { StatusBadge } from '@/components/common/StatusBadge';
import { getStatusVariant } from '@/lib/statusVariants';

// Variants: 'success' | 'warning' | 'error' | 'info' | 'neutral'
<StatusBadge variant="success" label="Approved" />
<StatusBadge variant={getStatusVariant(item.status)} label={item.status} />
```

### EmptyState
```tsx
import { EmptyState } from '@/components/common/EmptyState';

<EmptyState
  icon={Search}
  title="No results found"
  description="Try adjusting your filters"
  action={{ label: "Clear filters", onClick: clearFilters }}
/>
```

### Formatters
```tsx
import { formatters } from '@/lib/formatters';

formatters.number(1234)        // "1,234"
formatters.currency(5000)      // "$5,000.00"
formatters.percent(0.417, 1)   // "41.7%"
formatters.compact(695000)     // "$695K"
```

### Status Variants (Centralized)
```tsx
import {
  getStatusVariant,              // Generic: approved→success, pending→warning
  getOpportunityStageVariant,    // Sales stages
  getSeverityVariant,            // WHS incidents
  getExpenseStatusVariant,       // Financial
  getActionStatusVariant,        // Field officer actions
  formatStatusLabel,             // 'in_progress' → 'In Progress'
} from '@/lib/statusVariants';
```

### Entity Navigation
```tsx
import { entityNavigation } from '@/lib/entityNavigation';

// Type-safe route builders with ID validation
const href = entityNavigation.apprentice.toProfile(apprentice);
const href = entityNavigation.hostEmployer.toProfile(employer);
```

---

## Validation Checklist

When reviewing or writing UI code:

- [ ] **Correct brand?** Check which project directory you're in
- [ ] **Semantic tokens?** Using `text-primary`, `bg-card`, `shadow-elev-*` not raw hex
- [ ] **No hardcoded colors?** No `style={{ color: '#xxx' }}` or `bg-[#xxx]`
- [ ] **oklch format?** New color tokens use oklch, not hex/rgb (braden exempt)
- [ ] **Design system components?** Using StatCard/DataTable/StatusBadge/EmptyState
- [ ] **Formatters?** Using `formatters.*()` not manual `.toLocaleString()`
- [ ] **Centralized variants?** Using `@/lib/statusVariants` not local functions
- [ ] **Font correct?** System fonts for webapps, Montserrat for corporate
- [ ] **Dark mode?** Component works in both light and dark themes
- [ ] **Glow effects?** Only in webapp dark mode, never in corporate site
- [ ] **Icons?** Lucide icons only, imported as component references

## Quick Reference: Which Token For What

| Need | Tailwind Class | CSS Variable |
|------|---------------|--------------|
| Page background | `bg-background` | `--bg-body` |
| Card surface | `bg-card` | `--bg-panel` |
| Input field bg | `bg-muted` | `--bg-input` |
| Primary text | `text-foreground` | `--text-primary` |
| Secondary text | `text-muted-foreground` | `--text-secondary` |
| Primary action | `text-primary` / `bg-primary` | `--accent-primary` |
| Destructive | `text-destructive` | `--destructive` |
| Success state | `text-success` | `--color-success` |
| Warning state | `text-warning` | `--color-warning` |
| Info state | `text-info` | `--color-info` |
| Subtle border | `border-border` | `--border-color` |
| Light shadow | `shadow-elev-1` | `--shadow-1` |
| Medium shadow | `shadow-elev-2` | `--shadow-2` |
| Heavy shadow | `shadow-elev-3` | `--shadow-3` |

## Per-Project Config Files

| Project | Tailwind Config | Theme CSS | Global CSS |
|---------|----------------|-----------|------------|
| crm7 | `crm7/tailwind.config.js` | `crm7/src/styles/theme.css` | `crm7/src/index.css` |
| conduit | postcss + globals | — | `conduit/src/app/globals.css` |
| BSU | `business-suite-unified/tailwind.config.js` | — | `business-suite-unified/src/index.css` |
| R80.3 | `R80.3/tailwind.config.js` | `R80.3/src/styles/theme.css` | — |
| braden | `braden/tailwind.config.ts` | — | `braden/styles/globals.css` |
