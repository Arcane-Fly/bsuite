import type { Meta, StoryObj } from '@storybook/react-vite'
import { DotPattern } from './dot-pattern.js'
import { HeroGrid } from './hero-grid.js'

/**
 * ---------------------------------------------------------------------------
 * GRID / DOT DOCTRINE — they are MUTUALLY EXCLUSIVE, and the rule is context,
 * not taste.
 *
 *   DOT  — authenticated app pages ONLY. Rendered once, full-page, behind all
 *          cards.
 *   GRID — public / pre-auth marketing surfaces ONLY. Localised to the hero
 *          band, inside a `position: relative` wrapper. Never full-viewport,
 *          never behind authenticated content.
 *
 * A page is either a marketing surface or an authenticated shell, never both.
 * `@bsuite/dry-lint`'s `no-grid-dot-doctrine-violation` flags cross-context
 * use and hand-rolled duplicates of either.
 *
 * WHY THESE STORIES MATTER MORE THAN THEY LOOK. The dot pattern has been
 * "missing" four separate times across the estate, and every time the cause
 * was an OPAQUE ancestor painting over the `z-0` fixed layer, not the pattern
 * itself: the shell root, then an inner content wrapper, then PageGridLayout's
 * `bg-card` grid item, then a Fragment→div remount that trapped the grid at
 * containerWidth 0. Each was found only by looking at a rendered page.
 *
 * The occlusion is also THEME-DEPENDENT — the dots have shipped visible in
 * light and fully covered in dark, because dark surfaces are the more opaque
 * of the pair. Check BOTH themes on every story here; a pass in one carries
 * nothing to the other.
 * ---------------------------------------------------------------------------
 */
const meta = {
  title: 'Backgrounds/Dot & Grid',
  component: DotPattern,
  parameters: { layout: 'fullscreen' },
  args: {
    width: 16,
    height: 16,
    cx: 1,
    cy: 1,
    cr: 1,
    glow: false,
  },
  argTypes: {
    width: {
      control: { type: 'range', min: 4, max: 64, step: 1 },
      description: 'Horizontal tile spacing.',
    },
    height: {
      control: { type: 'range', min: 4, max: 64, step: 1 },
      description: 'Vertical tile spacing.',
    },
    cr: {
      control: { type: 'range', min: 0.25, max: 6, step: 0.25 },
      description: 'Dot radius. Above ~3 the field reads as a texture, not a pattern.',
    },
    cx: { control: { type: 'range', min: 0, max: 16, step: 1 }, description: 'Dot x within tile.' },
    cy: { control: { type: 'range', min: 0, max: 16, step: 1 }, description: 'Dot y within tile.' },
    glow: {
      control: 'boolean',
      description:
        'Adds `animate-dot-glow`. The consumer app owns that @keyframes rule — the class is inert here.',
    },
    className: {
      control: 'text',
      description:
        'Dots use fill="currentColor", so colour is set by a `text-*` class. Default is text-muted-foreground/80.',
    },
  },
} satisfies Meta<typeof DotPattern>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Editable dot field over a body-toned ground. Drag `width` / `cr` and watch
 * the density change live. This is the authenticated-app background.
 */
export const DotPatternPlayground: Story = {
  render: (args) => (
    <div className="relative h-[520px] w-full overflow-hidden bg-bg-body">
      <DotPattern {...args} />
      <div className="relative z-10 p-8">
        <h2 className="text-xl font-semibold text-foreground">Authenticated shell</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The dot layer sits at z-0 behind this content.
        </p>
      </div>
    </div>
  ),
}

/**
 * THE OCCLUSION REGRESSION, side by side. Left: a transparent content wrapper
 * — dots visible in the gaps. Right: a full-bleed OPAQUE wrapper — dots gone,
 * with no error anywhere.
 *
 * This is the exact defect that shipped four times. A card keeping its own
 * solid background is correct; a full-bleed opaque page wrapper is always the
 * bug. Check this story in dark as well as light — dark is where it hides.
 */
export const DotOcclusionRegression: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div className="grid h-[520px] grid-cols-2">
      <div className="relative overflow-hidden border-r border-border bg-bg-body">
        <DotPattern {...args} />
        <div className="relative z-10 p-6">
          <p className="text-sm font-semibold text-foreground">Transparent wrapper</p>
          <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            A card with its own background. Correct — dots show in the gaps.
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden bg-bg-body">
        <DotPattern {...args} />
        {/* The bug: a full-bleed opaque ancestor between the z-0 layer and the viewport. */}
        <div className="absolute inset-0 z-[1] bg-bg-body p-6">
          <p className="text-sm font-semibold text-foreground">Opaque full-bleed wrapper</p>
          <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Same markup, same dots — and no dots anywhere. No console error.
          </div>
        </div>
      </div>
    </div>
  ),
}

/**
 * The marketing hero grid, correctly SCOPED to a hero band inside a relative
 * wrapper. It is not full-viewport, and it never appears behind authenticated
 * content.
 *
 * `.bsuite-hero-grid` lives in `@bsuite/theme`'s utilities.css and needs the
 * consumer to import `@bsuite/theme/css`. If this story renders a flat band
 * with no grid lines, that import has gone missing — which is precisely the
 * failure mode this harness caught in its own preview.css.
 */
export const HeroGridBand: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="p-8">
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg-surface">
        <HeroGrid className="absolute inset-0" />
        <div className="relative z-10 px-8 py-16">
          <h1 className="text-3xl font-semibold text-foreground">Pre-auth marketing hero</h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Grid, not dots. Localised to the band, behind the hero copy.
          </p>
        </div>
      </div>
      <p className="mt-6 max-w-lg text-sm text-muted-foreground">
        Below the band there is no background pattern at all — that is the doctrine,
        not an omission.
      </p>
    </div>
  ),
}
