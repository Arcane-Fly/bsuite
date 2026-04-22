import { useContext } from 'react'
import { BrandingContext } from './BrandingProvider'

/**
 * Access the current tenant branding values and loading state.
 *
 * Must be used inside a <BrandingProvider>.
 *
 * @example
 *   const { branding, isLoading } = useBranding()
 *   const logoUrl = branding?.logo_url ?? '/logos/default-logo.svg'
 */
export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    throw new Error('useBranding must be used within a <BrandingProvider>')
  }
  return ctx
}
