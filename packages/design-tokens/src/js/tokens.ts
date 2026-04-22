/**
 * @bsuite/design-tokens — JS/TS token constants
 *
 * These mirror the CSS custom properties in src/css/base.css and are useful
 * for runtime values: canvas drawing, chart configs, SVG generation, or
 * anywhere you need a JS-accessible colour/size value.
 *
 * Import selectively — do NOT import the whole module if you only need one
 * category, as tree-shaking handles the rest.
 */

// ── Neon Electric Palette ─────────────────────────────────────────────────

export const neonElectric = {
  blue:     'oklch(0.546 0.215 262.9)',
  cyan:     'oklch(0.769 0.132 191.7)',
  indigo:   'oklch(0.511 0.23 277)',
  purple:   'oklch(0.568 0.202 283.1)',
  magenta:  'oklch(0.742 0.167 359.5)',
  pink:     'oklch(0.656 0.212 354.3)',
  coral:    'oklch(0.669 0.219 20.9)',
  orange:   'oklch(0.728 0.168 22.5)',
  yellow:   'oklch(0.868 0.125 81.4)',
  green:    'oklch(0.723 0.192 149.6)',
  lavender: 'oklch(0.736 0.141 285.6)',
} as const;

export type NeonElectricColor = keyof typeof neonElectric;

/** @deprecated Use `neonElectric` oklch values in CSS contexts. Keep for canvas/chart runtime use only. */
export const neonElectricRgb = {
  blue:     [37,  99,  235] as const,
  cyan:     [0,   206, 201] as const,
  indigo:   [79,  70,  229] as const,
  purple:   [108, 92,  231] as const,
  magenta:  [253, 121, 168] as const,
  pink:     [236, 72,  153] as const,
  coral:    [255, 71,  87]  as const,
  orange:   [255, 118, 117] as const,
  yellow:   [253, 203, 110] as const,
  green:    [34,  197, 94]  as const,
  lavender: [162, 155, 254] as const,
} as const;

/** @deprecated For canvas/SVG use only. In CSS, use oklch(from var(--neon-electric-*) l c h / alpha) instead. */
export function neonRgba(color: NeonElectricColor, alpha: number): string {
  const [r, g, b] = neonElectricRgb[color];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


// ── Spacing Scale ─────────────────────────────────────────────────────────

/** 8px-base spacing scale in rem */
export const space = {
  0:    '0',
  px:   '1px',
  0.5:  '0.125rem',
  1:    '0.25rem',
  1.5:  '0.375rem',
  2:    '0.5rem',
  2.5:  '0.625rem',
  3:    '0.75rem',
  3.5:  '0.875rem',
  4:    '1rem',
  5:    '1.25rem',
  6:    '1.5rem',
  7:    '1.75rem',
  8:    '2rem',
  9:    '2.25rem',
  10:   '2.5rem',
  12:   '3rem',
  14:   '3.5rem',
  16:   '4rem',
  20:   '5rem',
  24:   '6rem',
  32:   '8rem',
} as const;

export type SpaceKey = keyof typeof space;


// ── Border Radius ─────────────────────────────────────────────────────────

export const radius = {
  none: '0',
  xs:   '0.125rem',
  sm:   '0.25rem',
  md:   '0.375rem',
  base: '0.5rem',
  lg:   '0.75rem',
  xl:   '1rem',
  '2xl':'1.25rem',
  '3xl':'1.5rem',
  '4xl':'1.75rem',
  full: '9999px',
} as const;

export type RadiusKey = keyof typeof radius;


// ── Typography ────────────────────────────────────────────────────────────

export const fontSize = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  md:   '1.0625rem',
  lg:   '1.125rem',
  xl:   '1.25rem',
  '2xl':'1.5rem',
  '3xl':'1.875rem',
  '4xl':'2.25rem',
} as const;

export const fontWeight = {
  normal:   400,
  medium:   500,
  semibold: 600,
  bold:     700,
} as const;

export const lineHeight = {
  none:    1,
  tight:   1.25,
  snug:    1.375,
  normal:  1.5,
  relaxed: 1.625,
  loose:   2,
} as const;

export const letterSpacing = {
  tight:  '-0.025em',
  normal: '0em',
  wide:   '0.025em',
  wider:  '0.05em',
  caps:   '0.12em',
} as const;


// ── Motion / Animation ───────────────────────────────────────────────────

export const duration = {
  instant:  0,
  fast:     100,
  base:     150,
  moderate: 200,
  slow:     300,
  slower:   500,
  lazy:     700,
} as const;

export const easing = {
  linear:     'linear',
  in:         'cubic-bezier(0.4, 0, 1, 1)',
  out:        'cubic-bezier(0, 0, 0.2, 1)',
  inOut:      'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:     'cubic-bezier(0.34, 1.56, 0.64, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;


// ── Status Colors ─────────────────────────────────────────────────────────

/** Light-mode status colors — WCAG 2.1 AA on white */
export const statusLight = {
  success: 'oklch(0.509 0.118 165.612)',  /* emerald-700 */
  warning: 'oklch(0.555 0.163 48.998)',   /* amber-700 */
  error:   'oklch(0.505 0.213 27.518)',   /* red-700 */
  info:    'oklch(0.588 0.158 241.966)',  /* sky-600 */
} as const;

/** Dark-mode status colors — brightened for dark backgrounds */
export const statusDark = {
  success: 'oklch(0.723 0.192 149.6)',    /* emerald-500 */
  warning: 'oklch(0.769 0.188 70.08)',    /* amber-500 */
  error:   'oklch(0.637 0.237 25.331)',   /* red-500 */
  info:    'oklch(0.746 0.16 232.661)',   /* sky-400 */
} as const;


// ── App Accent Presets ────────────────────────────────────────────────────

/**
 * Per-app accent overrides. Use these as the value for --app-primary and
 * --app-accent CSS variables in each app's root CSS.
 *
 * These are the ONLY things that should differ between apps visually.
 * Everything else (spacing, radius, shadow, motion) is shared.
 */
export const appAccents = {
  crm7: {
    primary:      'oklch(0.546 0.215 262.9)',          /* electric blue */
    accent:       'oklch(0.769 0.132 191.7)',           /* electric cyan */
    primaryGlow:  'oklch(0.546 0.215 262.9 / 0.15)',
    accentGlow:   'oklch(0.769 0.132 191.7 / 0.12)',
  },
  conduit: {
    primary:      'oklch(0.596 0.145 163.225)',         /* emerald-600 */
    accent:       'oklch(0.765 0.177 163.223)',          /* emerald-400 */
    primaryGlow:  'oklch(0.596 0.145 163.225 / 0.15)',
    accentGlow:   'oklch(0.765 0.177 163.223 / 0.12)',
  },
  bsu: {
    primary:      'oklch(0.541 0.247 293.0)',           /* electric purple */
    accent:       'oklch(0.709 0.159 293.5)',            /* light purple */
    primaryGlow:  'oklch(0.541 0.247 293.0 / 0.15)',
    accentGlow:   'oklch(0.709 0.159 293.5 / 0.12)',
  },
  r8: {
    primary:      'oklch(0.525 0.223 3.958)',           /* pink-600 */
    accent:       'oklch(0.718 0.202 349.761)',          /* pink-400 */
    primaryGlow:  'oklch(0.525 0.223 3.958 / 0.15)',
    accentGlow:   'oklch(0.718 0.202 349.761 / 0.12)',
  },
  braden: {
    primary:      'oklch(0.588 0.158 241.966)',         /* sky-600 */
    accent:       'oklch(0.746 0.16 232.661)',           /* sky-400 */
    primaryGlow:  'oklch(0.588 0.158 241.966 / 0.15)',
    accentGlow:   'oklch(0.746 0.16 232.661 / 0.12)',
  },
} as const;

export type AppName = keyof typeof appAccents;
