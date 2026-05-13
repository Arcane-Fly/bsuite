export { ThemeProvider } from './ThemeProvider'
export type { ThemeProviderProps } from './ThemeProvider'
export { useTheme } from './useTheme'
export type { ThemeContextValue, ThemeMode, ResolvedTheme } from '../index'
export { THEME_STORAGE_KEY } from '../index'
export {
  BrandingProvider,
  BrandingContext,
  BRANDING_STORAGE_KEY,
  BRANDING_OVERRIDE_FLAG,
} from './BrandingProvider'
export type { TenantBranding, BrandingContextValue } from './BrandingProvider'
export { useBranding } from './useBranding'
export { resolvePlatformLogo, usePlatformLogo } from './usePlatformLogo'
export type {
  PlatformLogoHookResult,
  PlatformLogoOptions,
  PlatformLogoScheme,
  PlatformLogoSlot,
  PlatformLogoSource,
  ResolvedPlatformLogo,
} from './usePlatformLogo'

// Components — see ./components/<Name>.tsx
export {
  StatusBadge,
  AutoStatusBadge,
  getStatusVariant,
  formatStatusLabel,
} from './components/StatusBadge'
export type {
  BadgeVariant,
  StatusBadgeProps,
  AutoStatusBadgeProps,
} from './components/StatusBadge'
