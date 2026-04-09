/**
 * D2C Neon Electric theme colors for BSuite mobile.
 * Keep in sync with tailwind.config.js and the web apps.
 */
export const Colors = {
  primary: '#2563eb',
  primaryLight: '#60a5fa',
  primaryDark: '#1e40af',
  accent: '#00cec9',
  accentLight: '#67e8f9',
  background: '#0a0e1a',
  surface: '#141828',
  surfaceElevated: '#1c2137',
  foreground: '#f2f2f2',
  muted: '#6b7280',
  mutedForeground: '#9ca3af',
  destructive: '#ff4757',
  success: '#22c55e',
  warning: '#fdcb6e',
  border: '#1e2436',
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
  high: '#ff6348',
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
