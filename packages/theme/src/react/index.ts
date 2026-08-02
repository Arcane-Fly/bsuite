export { ThemeProvider } from './ThemeProvider.js'
export type { ThemeProviderProps } from './ThemeProvider.js'
export { useTheme } from './useTheme.js'
export type { ThemeContextValue, ThemeMode, ResolvedTheme } from '../index.js'
export { THEME_STORAGE_KEY } from '../index.js'
export {
  BrandingProvider,
  BrandingContext,
  BRANDING_STORAGE_KEY,
  BRANDING_OVERRIDE_FLAG,
} from './BrandingProvider.js'
export type { TenantBranding, BrandingContextValue } from './BrandingProvider.js'
export { useBranding } from './useBranding.js'
export { resolvePlatformLogo, usePlatformLogo } from './usePlatformLogo.js'
export type {
  PlatformLogoHookResult,
  PlatformLogoOptions,
  PlatformLogoScheme,
  PlatformLogoSlot,
  PlatformLogoSource,
  ResolvedPlatformLogo,
} from './usePlatformLogo.js'

// Components — see ./components/<Name>.tsx
export {
  StatusBadge,
  AutoStatusBadge,
  getStatusVariant,
  formatStatusLabel,
} from './components/StatusBadge.js'
export type {
  BadgeVariant,
  StatusBadgeProps,
  AutoStatusBadgeProps,
} from './components/StatusBadge.js'
