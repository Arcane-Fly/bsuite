import { useMemo } from 'react'
import type { TenantBranding } from './BrandingProvider'
import { useBranding } from './useBranding'

export type PlatformLogoSlot = 'header' | 'sidebar' | 'auth' | 'favicon' | 'mark'
export type PlatformLogoScheme = 'light' | 'dark'
export type PlatformLogoSource = 'branding' | 'fallback' | 'none'

export interface PlatformLogoOptions {
  slot?: PlatformLogoSlot
  scheme?: PlatformLogoScheme
  fallback?: string | null
  fallbackBySlot?: Partial<Record<PlatformLogoSlot, string | null>>
  alt?: string
}

export interface ResolvedPlatformLogo {
  src: string | null
  alt: string
  slot: PlatformLogoSlot
  scheme: PlatformLogoScheme
  source: PlatformLogoSource
  isTenantLogo: boolean
  cssVariable: string
}

export interface PlatformLogoHookResult extends ResolvedPlatformLogo {
  branding: TenantBranding | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

function cleanUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getSlotFallback(options: PlatformLogoOptions, slot: PlatformLogoSlot): string | null {
  if (options.fallbackBySlot && Object.prototype.hasOwnProperty.call(options.fallbackBySlot, slot)) {
    return cleanUrl(options.fallbackBySlot[slot] ?? null)
  }
  return cleanUrl(options.fallback ?? null)
}

function getCssVariable(slot: PlatformLogoSlot, scheme: PlatformLogoScheme): string {
  if (slot === 'favicon') return '--favicon-url'
  if (slot === 'mark') return '--mark-url'
  return scheme === 'dark' ? '--logo-dark-url' : '--logo-light-url'
}

function getCompanyName(branding: TenantBranding | null | undefined): string | null {
  const name = branding?.company_name?.trim()
  return name ? name : null
}

function getLogoCandidates(
  branding: TenantBranding | null | undefined,
  slot: PlatformLogoSlot,
  scheme: PlatformLogoScheme,
): Array<string | null | undefined> {
  if (!branding) return []

  if (slot === 'favicon') {
    return [branding.favicon_url, branding.mark_url, branding.logo_url, branding.logo_light_url, branding.logo_dark_url]
  }

  if (slot === 'mark') {
    return [branding.mark_url, branding.logo_url, branding.logo_light_url, branding.logo_dark_url]
  }

  if (scheme === 'dark') {
    return [branding.logo_dark_url, branding.logo_light_url, branding.logo_url, branding.mark_url]
  }

  return [branding.logo_light_url, branding.logo_url, branding.logo_dark_url, branding.mark_url]
}

export function resolvePlatformLogo(
  branding: TenantBranding | null | undefined,
  options: PlatformLogoOptions = {},
): ResolvedPlatformLogo {
  const slot = options.slot ?? 'header'
  const scheme = options.scheme ?? 'light'
  const brandingLogo = getLogoCandidates(branding, slot, scheme).map(cleanUrl).find(Boolean) ?? null
  const fallbackLogo = brandingLogo ? null : getSlotFallback(options, slot)
  const source: PlatformLogoSource = brandingLogo ? 'branding' : fallbackLogo ? 'fallback' : 'none'
  const companyName = getCompanyName(branding)

  return {
    src: brandingLogo ?? fallbackLogo,
    alt: options.alt ?? (slot === 'favicon' ? '' : companyName ? `${companyName} logo` : 'Platform logo'),
    slot,
    scheme,
    source,
    isTenantLogo: source === 'branding',
    cssVariable: getCssVariable(slot, scheme),
  }
}

export function usePlatformLogo(options: PlatformLogoOptions = {}): PlatformLogoHookResult {
  const { branding, isLoading, error, refresh } = useBranding()
  const resolved = useMemo(
    () => resolvePlatformLogo(branding, options),
    [branding, options.alt, options.fallback, options.fallbackBySlot, options.scheme, options.slot],
  )

  return {
    ...resolved,
    branding,
    isLoading,
    error,
    refresh,
  }
}

