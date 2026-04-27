// TODO: The full BSU-specific Logo implementation lives in
// packages/ui/src/Logo.tsx. This stub is the foundational interface
// and resolution logic; the BSU app also has its own version at
// src/components/ui/Logo.tsx until the workspace is fully wired.

export type LogoSlot = 'header' | 'sidebar' | 'auth' | 'favicon'
export type AppSlug = 'crm7' | 'bsu' | 'conduit' | 'r80' | 'throughput'

export interface LogoProps {
  slot?: LogoSlot
  appSlug?: AppSlug
  colorScheme?: 'light' | 'dark' | 'auto'
  className?: string
}

const SLOT_SIZES: Record<LogoSlot, { width: number; height: number }> = {
  header: { width: 120, height: 30 },
  sidebar: { width: 112, height: 28 },
  auth: { width: 160, height: 40 },
  favicon: { width: 32, height: 32 },
}

const BSU_DEFAULT_MARK = '/logos/bsu-mark.svg'

/**
 * Logo — slot-aware, theme-aware logo component for @bsuite/ui.
 *
 * In standalone usage (without a branding context provider), resolves
 * to the BSuite default mark. For full tenant-branding-aware resolution
 * use the app-specific Logo in src/components/ui/Logo.tsx which wraps
 * this with useTenantBrandingContext().
 *
 * Interface is intentionally identical to the BSU app Logo so that
 * migration to this package component requires only an import change.
 */
export function Logo({
  slot = 'header',
  appSlug: _appSlug = 'bsu',
  colorScheme: _colorScheme = 'auto',
  className = '',
}: LogoProps) {
  const dims = SLOT_SIZES[slot]

  return (
    <img
      src={BSU_DEFAULT_MARK}
      alt="BSuite"
      width={dims.width}
      height={dims.height}
      className={`inline-block object-contain ${className}`}
      loading="eager"
      data-slot={slot}
    />
  )
}
