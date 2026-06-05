import React, { useId } from 'react'
import { cn } from './utils.js'

/**
 * DotPattern Component Props
 *
 * @param width  Horizontal spacing between dots (default 16)
 * @param height Vertical spacing between dots (default 16)
 * @param x      X-offset of the entire pattern (default 0)
 * @param y      Y-offset of the entire pattern (default 0)
 * @param cx     X-offset of individual dots within a tile (default 1)
 * @param cy     Y-offset of individual dots within a tile (default 1)
 * @param cr     Radius of each dot (default 1)
 * @param glow   When true, the whole pattern receives an `animate-dot-glow`
 *               class. Consumer app is responsible for defining that
 *               @keyframes rule in its CSS (kept out of this package so
 *               apps can theme the glow to their brand).
 * @param className Additional classes merged via `tailwind-merge` so
 *               consumers can override the default `text-muted-foreground/80`
 *               colour (dots use `fill="currentColor"` so overriding
 *               `text-*` is the supported way to set colour).
 */
export interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  x?: number
  y?: number
  cx?: number
  cy?: number
  cr?: number
  className?: string
  glow?: boolean
}

/**
 * Full-viewport dot pattern background.
 *
 * Implementation note: uses a single SVG `<pattern>` for browser-native
 * tiling (~1 DOM node) rather than one `<motion.circle>` per dot
 * (~1,800 nodes on a typical viewport). This is a ~100× difference in
 * layout/paint cost on first render — measurable on lower-end Android
 * devices and during theme transitions.
 *
 * Promoted from `crm7/src/components/magicui/dot-pattern.tsx` to this
 * shared package so all four D2C apps (BSU, CRM7, R80.3, Throughput)
 * render an identical background without copy-paste drift. The Braden
 * corporate app deliberately does NOT use this — its brand is photo-
 * forward, not a tech-grid aesthetic.
 */
export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full text-muted-foreground/80',
        glow && 'animate-dot-glow',
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={`${id}-pattern`}
          x={x}
          y={y}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={cx} cy={cy} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-pattern)`} />
    </svg>
  )
}
