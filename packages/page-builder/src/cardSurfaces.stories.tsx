import type { ReactNode } from 'react'
import { PageGridLayout } from './PageGridLayout.js'
import type { GridLayouts } from './types.js'

/**
 * The card-surface defect classes, made VISIBLE and DIFFABLE.
 *
 * `@bsuite/page-builder` 1.0.4, 1.0.5 and 1.0.6 each shipped GREEN AND BROKEN.
 * Types, lint, unit tests and CI cannot see a 28px card sitting inside a 24px
 * frame; only a rendered surface can. These stories exist so the chrome
 * inversion has something to be checked against that is not a number.
 *
 * Read them in pairs: the story named "…(the defect)" is what shipped up to
 * 1.0.7, and the one beside it is what 2.0.0 renders.
 */
/**
 * Plain CSF, no `Meta`/`StoryObj` type imports.
 *
 * `@storybook/react-vite` is a devDependency of `@bsuite/ui`, which owns the
 * Storybook config; this package does not depend on Storybook and must not
 * start to, or `pnpm typecheck` here fails on a type-only import for a tool
 * that is not installed. CSF is a plain-object format — the indexer reads the
 * default export and the named exports, and the types are optional sugar.
 */
type Story = { name?: string; render: () => ReactNode }

export default {
  title: 'Page Builder/Card surfaces',
  parameters: { layout: 'fullscreen' },
}

/** What an app renders inside a slot: its own card. Border, radius, background. */
function AppCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="h-full rounded-[var(--radius-card,1.5rem)] border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-(--role-text-heading)">{title}</h3>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

/** Bare content: no surface of its own. This is the 10% that NEEDS the chrome. */
function BareContent({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h3 className="mb-2 text-lg font-semibold text-(--role-text-heading)">{title}</h3>
      <p className="text-sm text-muted-foreground">
        No surface of its own — this slot is the one that should opt IN to chrome.
      </p>
    </div>
  )
}

const oneSlot: GridLayouts = { lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 6 }] }

/**
 * THE DEFECT, exactly as it shipped. A card inside the grid item's card:
 * two radii, two 1px borders, two backgrounds. 316+ files render this.
 */
export const NestedCardDoubleFrame: Story = {
  name: 'Nested card — DOUBLE FRAME (the defect)',
  render: () => (
    <div className="p-8">
      <PageGridLayout
        pageKey="sb/nested-defect"
        defaultLayouts={oneSlot}
        itemChrome
        widgets={{ a: <AppCard title="Quick Actions">Grid item chrome ON + app card.</AppCard> }}
      />
    </div>
  ),
}

/** The same content on 2.0.0 defaults: ONE border, ONE radius. */
export const NestedCardSingleFrame: Story = {
  name: 'Nested card — ONE frame (2.0.0 default)',
  render: () => (
    <div className="p-8">
      <PageGridLayout
        pageKey="sb/nested-fixed"
        defaultLayouts={oneSlot}
        widgets={{ a: <AppCard title="Quick Actions">Grid item chrome OFF; the app card is the only surface.</AppCard> }}
      />
    </div>
  ),
}

/** Bare content with chrome OFF — the regression the inversion could cause. */
export const BareContentNoChrome: Story = {
  name: 'Bare content, chrome OFF — the regression to watch for',
  render: () => (
    <div className="p-8">
      <PageGridLayout
        pageKey="sb/bare-off"
        defaultLayouts={oneSlot}
        widgets={{ a: <BareContent title="Pipeline Overview" /> }}
      />
    </div>
  ),
}

/** The same bare content opting IN per item. This is the migration for the 10%. */
export const BareContentOptsIn: Story = {
  name: 'Bare content, per-item chrome ON — the migration',
  render: () => (
    <div className="p-8">
      <PageGridLayout
        pageKey="sb/bare-on"
        defaultLayouts={{ lg: [{ i: 'a', x: 0, y: 0, w: 6, h: 6, chrome: true }] }}
        widgets={{ a: <BareContent title="Pipeline Overview" /> }}
      />
    </div>
  ),
}

/**
 * Every card width side by side. `w` defaulted to 12, so 1,068 of 1,729 usages
 * rendered like the last row here — one card per row, the rest of the screen
 * empty. That is the "cards don't use the available space" report.
 */
export const WidthLadder: Story = {
  name: 'Width ladder — w = 2 / 3 / 4 / 6 / 12',
  render: () => (
    <div className="p-8">
      <PageGridLayout
        pageKey="sb/widths"
        defaultLayouts={{
          lg: [
            { i: 'w2', x: 0, y: 0, w: 2, h: 4 },
            { i: 'w3', x: 2, y: 0, w: 3, h: 4 },
            { i: 'w4', x: 5, y: 0, w: 4, h: 4 },
            { i: 'w6', x: 0, y: 4, w: 6, h: 4 },
            { i: 'w12', x: 0, y: 8, w: 12, h: 4 },
          ],
        }}
        widgets={{
          w2: <AppCard title="w=2" />,
          w3: <AppCard title="w=3" />,
          w4: <AppCard title="w=4" />,
          w6: <AppCard title="w=6 — the new default" />,
          w12: <AppCard title="w=12 — the old default, one card per row" />,
        }}
      />
    </div>
  ),
}

/**
 * Card headings. `text-gradient-accent` is on 183 of 235 crm7 h1 page titles
 * and 0 of 310 crm7 h2/h3 CARD headings — the element the operator keeps
 * asking about. The pairing matters: the solid `text-(--role-text-heading)`
 * sits UNDER the gradient as the fallback layer.
 *
 * `width: fit-content` inside the utility is load-bearing. Anything that
 * overrides width makes a short heading sample only the first ~15% of the
 * gradient and render flat — indistinguishable from having no gradient at all,
 * which is why "is the class present" is not a check.
 */
export const CardHeadingGradient: Story = {
  name: 'Card headings — with and without the gradient',
  render: () => (
    <div className="grid gap-8 p-8 md:grid-cols-2">
      <div className="rounded-[var(--radius-card,1.5rem)] border border-border bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold text-(--role-text-heading)">
          Quick Actions — flat (today, 0 of 310)
        </h3>
        <p className="text-sm text-muted-foreground">No gradient.</p>
      </div>
      <div className="rounded-[var(--radius-card,1.5rem)] border border-border bg-card p-6">
        <h3 className="text-gradient-accent mb-2 text-lg font-semibold text-(--role-text-heading)">
          Quick Actions — gradient (G2 target)
        </h3>
        <p className="text-sm text-muted-foreground">
          `text-gradient-accent` over the solid heading token.
        </p>
      </div>
    </div>
  ),
}
