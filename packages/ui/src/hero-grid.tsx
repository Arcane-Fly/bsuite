import React from 'react'
import { cn } from './utils.js'

export interface HeroGridProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Marketing / pre-auth hero-band grid background.
 *
 * Grid/dot doctrine (packages/theme/docs/TOKEN-MAPPING.md §8, W3 §3.3):
 *
 *   GRID — public/pre-auth marketing surfaces ONLY. Localised to the hero
 *          band (place inside a `position: relative` wrapper), behind the
 *          hero text/image content. Never full-viewport, never behind
 *          authenticated content.
 *   DOT  — authenticated app pages ONLY (see `<DotPattern>` in this same
 *          package). Rendered once, full-page, behind all cards.
 *
 * GRID and DOT are mutually exclusive within a single context — a page is
 * either a public marketing surface (grid) or an authenticated shell
 * (dot), never both. The `@bsuite/dry-lint` rule
 * `no-grid-dot-doctrine-violation` flags cross-context usage and hand-rolled
 * duplicates of either pattern.
 *
 * CSS lifted verbatim from braden's `.platform-hero-grid`
 * (braden/src/index.css) via the shared `.bsuite-hero-grid` utility class
 * (packages/theme/src/css/utilities.css) — 1px grid lines at 32px x 32px,
 * theme-audit-ok: prose describing the grid wash.
 * `oklch(0 0 0 / 0.03)` light / `oklch(1 0 0 / 0.03)` dark. Requires the
 * consumer app to import `@bsuite/theme/css` (or `utilities.css`
 * directly) so `.bsuite-hero-grid` and the `.dark` override resolve.
 *
 * Usage:
 * ```tsx
 * <div className="relative overflow-hidden">
 *   <HeroGrid />
 *   <div className="relative z-10">... hero text/image ...</div>
 * </div>
 * ```
 */
export function HeroGrid({ className, ...props }: HeroGridProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none bsuite-hero-grid', className)}
      {...props}
    />
  )
}
