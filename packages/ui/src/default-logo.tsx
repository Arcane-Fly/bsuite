/**
 * Built-in D2C Neon Electric default mark.
 *
 * Inlined as a React SVG component so the package ships zero asset
 * dependencies — no /public/ path required at the consumer site, no
 * CDN, no broken `<img src>` if the consumer forgets to copy the asset.
 *
 * Source values are the canonical role tokens from @bsuite/theme:
 *   Electric Blue  oklch(0.546 0.215 262.9)
 *   Electric Cyan  oklch(0.769 0.132 191.7)
 *
 * The same shape is also available as a static SVG file at
 * `assets/d2c-default-logo.svg` for non-React consumers (favicons,
 * email templates, marketing surfaces).
 */
import type { SVGProps } from 'react'

export interface D2CDefaultLogoProps extends SVGProps<SVGSVGElement> {
  /** Title for screen readers — defaults to "BSuite". */
  title?: string
}

export function D2CDefaultLogo({
  title = 'BSuite',
  width = 64,
  height = 64,
  role = 'img',
  'aria-label': ariaLabel,
  ...rest
}: D2CDefaultLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={width}
      height={height}
      role={role}
      aria-label={ariaLabel ?? title}
      {...rest}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="bsuite-d2c-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.546 0.215 262.9)" />
          <stop offset="100%" stopColor="oklch(0.769 0.132 191.7)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="none" stroke="url(#bsuite-d2c-ring)" strokeWidth="5" />
      <circle cx="32" cy="32" r="11" fill="oklch(0.769 0.132 191.7)" />
    </svg>
  )
}
