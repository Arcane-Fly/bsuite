/**
 * D2C Neon Electric theme colors for BSuite mobile.
 * Keep in sync with tailwind.config.js and the web apps.
 */
export const Colors = {
  primary: 'oklch(0.546 0.215 262.9)',
  primaryLight: 'oklch(0.707 0.165 254.6)',
  primaryDark: 'oklch(0.424 0.199 265.6)',
  accent: 'oklch(0.769 0.132 191.7)',
  accentLight: 'oklch(0.86 0.099 196)',
  background: 'oklch(0.13 0.02 260)',
  surface: 'oklch(0.17 0.025 260)',
  surfaceElevated: 'oklch(0.21 0.03 260)',
  foreground: 'oklch(0.955 0 0)',
  muted: 'oklch(0.551 0.027 264.4)',
  mutedForeground: 'oklch(0.713 0.019 261.3)',
  destructive: 'oklch(0.568 0.202 283.1)',
  success: 'oklch(0.723 0.192 149.6)',
  warning: 'oklch(0.868 0.125 81.4)',
  border: 'oklch(0.21 0.03 260)',
} as const;

/** Tab bar icon size (Lucide) */
export const TAB_ICON_SIZE = 22;

/** Standard metric card icon size */
export const METRIC_ICON_SIZE = 24;

/** Avatar sizes */
export const AvatarSize = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
} as const;

/** Incident type labels for display */
export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  near_miss: 'Near Miss',
  injury: 'Injury',
  hazard: 'Hazard',
  property_damage: 'Property Damage',
  environmental: 'Environmental',
} as const;

/** Severity color mapping */
export const SEVERITY_COLORS: Record<string, string> = {
  low: Colors.success,
  medium: Colors.warning,
  high: Colors.warning,
  critical: Colors.destructive,
} as const;

/** Status badge color mapping */
export const STATUS_COLORS: Record<string, string> = {
  active: Colors.success,
  inactive: Colors.muted,
  suspended: Colors.warning,
  completed: Colors.accent,
  pending: Colors.warning,
  approved: Colors.success,
  rejected: Colors.destructive,
  reported: Colors.warning,
  investigating: Colors.primary,
  resolved: Colors.success,
  closed: Colors.muted,
  current: Colors.success,
  expiring_soon: Colors.warning,
  expired: Colors.destructive,
} as const;

/** Note category labels */
export const NOTE_CATEGORY_LABELS: Record<string, string> = {
  visit: 'Visit',
  observation: 'Observation',
  follow_up: 'Follow-up',
} as const;

/** Note category colors */
export const NOTE_CATEGORY_COLORS: Record<string, string> = {
  visit: Colors.primary,
  observation: Colors.accent,
  follow_up: Colors.warning,
} as const;

/** App metadata */
export const APP_NAME = 'BSuite';
export const APP_VERSION = '1.0.0';
export const APP_BUNDLE_ID = 'au.com.bsuite.mobile';
