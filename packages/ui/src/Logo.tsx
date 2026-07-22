/**
 * <Logo /> — slot-aware, theme-aware, branding-aware logo for all BSuite apps.
 *
 * Resolves the rendered image URL across **four tiers**, in order:
 *
 *   Tier 0  sub-org      — server-side walks parent_tenant_id chain via the
 *                          `branding_json_for_tenant()` SECURITY DEFINER RPC,
 *                          so by the time the value arrives client-side it has
 *                          already been resolved through the sub-org chain
 *                          and surfaces in the `app_*` / `logo_*` fields below.
 *   Tier 3  app override — `app_logo_url` / `app_logo_light_url` /
 *                          `app_logo_dark_url` from `tenant_app_branding`
 *                          (highest precedence when supplied).
 *   Tier 2  enterprise   — `logo_url` / `logo_light_url` / `logo_dark_url`
 *                          from `tenant_branding`.
 *   Tier 1  platform     — `platform_logo_url` / variants from
 *                          `platform_branding` (D2C defaults).
 *   Default              — Inline D2C Neon Electric SVG (no asset dependency).
 *
 * The resolver is a pure function (`resolveLogoUrl`) — unit-tested for 100%
 * branch coverage. The component is a thin shell that calls the resolver and
 * picks the SVG default when the URL is null.
 *
 * To keep `@bsuite/ui` portable (it must work in BSU, CRM7, conduit, R80.3,
 * throughput AND braden, which all have different branding hooks), the
 * component itself does NOT call any `useBranding` hook. It reads from props.
 * Each consumer wires its own hook in a thin wrapper (BSU's `BSULogo.tsx`).
 */
import { memo } from 'react'
import { D2CDefaultLogo } from './default-logo.js'
import { cn } from './utils.js'

export type LogoSlot = 'favicon' | 'sidebar' | 'auth' | 'marketing' | 'header'
export type LogoColorScheme = 'light' | 'dark' | 'auto'
export type AppSlug = 'crm7' | 'bsu' | 'conduit' | 'r8' | 'throughput' | 'braden'

/**
 * Shape consumed by the resolver. Each field corresponds to a branding tier;
 * `null` / `undefined` signals "not set at this tier — fall through".
 *
 * The Tier-0 sub-org walk happens server-side in
 * `branding_json_for_tenant()` so by the time the client sees these values
 * the parent_tenant_id chain has already collapsed into Tier 2/3 fields.
 * The dedicated `app_*` fields keep Tier 3 (per-app override) distinct from
 * Tier 2 (per-tenant) so the resolver can express the four-step precedence.
 */
export interface LogoBranding {
  // ── Tier 3: per-app override (`tenant_app_branding`) ──────────────────
  /** App-specific override logo URL (any scheme). */
  app_logo_url?: string | null
  /** App-specific override logo URL for light mode. */
  app_logo_light_url?: string | null
  /** App-specific override logo URL for dark mode. */
  app_logo_dark_url?: string | null

  // ── Tier 2: per-tenant (`tenant_branding`) ────────────────────────────
  /** Tenant-level logo URL (any scheme). */
  logo_url?: string | null
  /** Tenant-level logo URL for light mode. */
  logo_light_url?: string | null
  /** Tenant-level logo URL for dark mode. */
  logo_dark_url?: string | null
  /** Tenant-level favicon URL (square mark). */
  favicon_url?: string | null
  /** Tenant-level mark / icon (square). */
  mark_url?: string | null

  // ── Tier 1: platform (`platform_branding`) ────────────────────────────
  /** Platform default logo URL (any scheme). */
  platform_logo_url?: string | null
  /** Platform default light-mode logo URL. */
  platform_logo_light_url?: string | null
  /** Platform default dark-mode logo URL. */
  platform_logo_dark_url?: string | null
  /** Platform default mark/icon URL. */
  platform_mark_url?: string | null
  /** Platform default favicon URL. */
  platform_favicon_url?: string | null

  // ── Display metadata ──────────────────────────────────────────────────
  /** Display name used as alt-text fallback when no `alt` prop is supplied. */
  company_name?: string | null
}

export interface ResolvedLogo {
  /** Final URL, or `null` if every tier produced no candidate. */
  src: string | null
  /** Which tier produced the URL — `'default'` means the SVG fallback. */
  tier: 'app' | 'tenant' | 'platform' | 'default'
  /** Resolved colour scheme (`'auto'` collapsed to concrete value). */
  scheme: 'light' | 'dark'
}

export interface LogoProps {
  /** Layout slot. Drives default dimensions. */
  slot?: LogoSlot
  /** Colour scheme. `'auto'` reads `<html class="dark">` at render time. */
  colorScheme?: LogoColorScheme
  /** Optional className for the rendered element. */
  className?: string
  /** Image alt text. Defaults to `branding.company_name ?? 'BSuite'`. */
  alt?: string
  /** Explicit width override (px). */
  width?: number
  /** Explicit height override (px). */
  height?: number
  /**
   * Fully-resolved 4-tier branding shape. Pass `null` / `undefined` to render
   * the default SVG mark. Consumers typically wire this from their app-level
   * `useBranding({tenantId, appSlug})` hook.
   */
  branding?: LogoBranding | null
  /**
   * Optional app slug — used as a tie-breaker when picking a Tier-1 platform
   * default that may have app-specific entries in the future. Currently
   * informational only (kept for forward-compat with bsuite#320 sub-org work).
   */
  appSlug?: AppSlug
}

/** Default dimensions per slot. Matches BSU's existing BSULogo contract. */
const SLOT_SIZES: Record<LogoSlot, { width: number; height: number }> = {
  favicon: { width: 32, height: 32 },
  sidebar: { width: 112, height: 28 },
  auth: { width: 160, height: 40 },
  marketing: { width: 200, height: 50 },
  header: { width: 120, height: 30 },
}

function pickFirstString(...candidates: Array<string | null | undefined>): string | null {
  for (const value of candidates) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) return trimmed
    }
  }
  return null
}

/**
 * Resolve the final logo URL across all four tiers.
 *
 * Pure function. Stable, deterministic, and tested for 100% branch coverage.
 *
 * @param branding — merged 4-tier branding shape (server-resolved sub-org chain).
 * @param slot     — layout slot. `favicon` prefers mark/favicon fields.
 * @param scheme   — concrete colour scheme (callers should pre-resolve `'auto'`).
 */
export function resolveLogoUrl(
  branding: LogoBranding | null | undefined,
  slot: LogoSlot,
  scheme: 'light' | 'dark',
): ResolvedLogo {
  if (!branding) {
    return { src: null, tier: 'default', scheme }
  }

  // Favicon slot has its own field family — mark/favicon, not the wordmark.
  if (slot === 'favicon') {
    const appTier = pickFirstString(branding.app_logo_url)
    if (appTier) return { src: appTier, tier: 'app', scheme }
    const tenantTier = pickFirstString(branding.favicon_url, branding.mark_url, branding.logo_url)
    if (tenantTier) return { src: tenantTier, tier: 'tenant', scheme }
    const platformTier = pickFirstString(
      branding.platform_favicon_url,
      branding.platform_mark_url,
      branding.platform_logo_url,
    )
    if (platformTier) return { src: platformTier, tier: 'platform', scheme }
    return { src: null, tier: 'default', scheme }
  }

  // Wordmark slots: prefer scheme-specific, then scheme-neutral, at each tier.
  const appCandidates =
    scheme === 'dark'
      ? [branding.app_logo_dark_url, branding.app_logo_url, branding.app_logo_light_url]
      : [branding.app_logo_light_url, branding.app_logo_url, branding.app_logo_dark_url]
  const appTier = pickFirstString(...appCandidates)
  if (appTier) return { src: appTier, tier: 'app', scheme }

  const tenantCandidates =
    scheme === 'dark'
      ? [branding.logo_dark_url, branding.logo_url, branding.logo_light_url]
      : [branding.logo_light_url, branding.logo_url, branding.logo_dark_url]
  const tenantTier = pickFirstString(...tenantCandidates)
  if (tenantTier) return { src: tenantTier, tier: 'tenant', scheme }

  const platformCandidates =
    scheme === 'dark'
      ? [branding.platform_logo_dark_url, branding.platform_logo_url, branding.platform_logo_light_url]
      : [branding.platform_logo_light_url, branding.platform_logo_url, branding.platform_logo_dark_url]
  const platformTier = pickFirstString(...platformCandidates)
  if (platformTier) return { src: platformTier, tier: 'platform', scheme }

  return { src: null, tier: 'default', scheme }
}

/**
 * Collapse the `'auto'` colour scheme to a concrete value by reading the
 * `dark` class on `<html>`. SSR-safe: returns `'light'` when document is
 * undefined.
 */
function resolveAutoScheme(scheme: LogoColorScheme): 'light' | 'dark' {
  if (scheme !== 'auto') return scheme
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Slot-aware, theme-aware, branding-aware logo component.
 *
 * Renders an `<img>` for resolved URLs and the inline D2C default SVG when
 * no URL is available at any tier. Memoised because the same component
 * frequently mounts in app shells (header, sidebar, auth gate) and the
 * resolver inputs are stable.
 */
export const Logo = memo(function Logo({
  slot = 'sidebar',
  colorScheme = 'auto',
  className,
  alt,
  width,
  height,
  branding,
  appSlug,
}: LogoProps) {
  const resolvedScheme = resolveAutoScheme(colorScheme)
  const { src, tier } = resolveLogoUrl(branding, slot, resolvedScheme)
  const dims = SLOT_SIZES[slot]
  const finalWidth = width ?? dims.width
  const finalHeight = height ?? dims.height
  const finalAlt =
    alt ?? (typeof branding?.company_name === 'string' ? branding.company_name : 'BSuite')

  if (src) {
    return (
      <img
        src={src}
        alt={finalAlt}
        width={finalWidth}
        height={finalHeight}
        className={cn('inline-block object-contain', className)}
        style={{ width: finalWidth, height: finalHeight }}
        loading="eager"
        data-slot={slot}
        data-tier={tier}
        data-scheme={resolvedScheme}
        data-app={appSlug}
      />
    )
  }

  return (
    <D2CDefaultLogo
      title={finalAlt}
      width={finalWidth}
      height={finalHeight}
      className={cn('inline-block', className)}
      data-slot={slot}
      data-tier={tier}
      data-scheme={resolvedScheme}
      data-app={appSlug}
    />
  )
})
