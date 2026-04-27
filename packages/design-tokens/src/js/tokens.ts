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
  blue:     '#2563eb',
  cyan:     '#00cec9',
  indigo:   '#4f46e5',
  purple:   '#6c5ce7',
  magenta:  '#fd79a8',
  pink:     '#ec4899',
  coral:    '#ff4757',
  orange:   '#ff7675',
  yellow:   '#fdcb6e',
  green:    '#22c55e',
  lavender: '#a29bfe',
} as const;

export type NeonElectricColor = keyof typeof neonElectric;

/** RGB triplet arrays for use in rgba() or canvas contexts */
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

/** Returns an rgba() string from a neon electric colour at a given opacity */
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
  success: '#047857',
  warning: '#b45309',
  error:   '#b91c1c',
  info:    '#0284c7',
} as const;

/** Dark-mode status colors — brightened for dark backgrounds */
export const statusDark = {
  success: '#10b981',
  warning: '#f59e0b',
  error:   '#ef4444',
  info:    '#38bdf8',
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
    primary:      '#2563eb',  /* electric blue */
    accent:       '#00cec9',  /* electric cyan */
    primaryGlow:  'rgba(37,  99,  235, 0.15)',
    accentGlow:   'rgba(0,   206, 201, 0.12)',
  },
  conduit: {
    primary:      '#059669',  /* emerald-600 */
    accent:       '#34d399',  /* emerald-400 */
    primaryGlow:  'rgba(5,   150, 105, 0.15)',
    accentGlow:   'rgba(52,  211, 153, 0.12)',
  },
  bsu: {
    primary:      '#7c3aed',  /* violet-600 */
    accent:       '#a78bfa',  /* violet-400 */
    primaryGlow:  'rgba(124, 58,  237, 0.15)',
    accentGlow:   'rgba(167, 139, 250, 0.12)',
  },
  r8: {
    primary:      '#db2777',  /* pink-600 */
    accent:       '#f472b6',  /* pink-400 */
    primaryGlow:  'rgba(219, 39,  119, 0.15)',
    accentGlow:   'rgba(244, 114, 182, 0.12)',
  },
  braden: {
    primary:      '#0284c7',  /* sky-600 */
    accent:       '#38bdf8',  /* sky-400 */
    primaryGlow:  'rgba(2,   132, 199, 0.15)',
    accentGlow:   'rgba(56,  189, 248, 0.12)',
  },
} as const;

export type AppName = keyof typeof appAccents;
