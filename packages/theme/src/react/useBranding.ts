import { useContext } from 'react'
import { BrandingContext, type BrandingContextValue } from './BrandingProvider.js'

/**
 * Access the current tenant branding values and loading state.
 *
 * Must be used inside a <BrandingProvider>.
 *
 * @example
 *   const { branding, isLoading } = useBranding()
 *   const logoUrl = branding?.logo_url ?? '/logos/default-logo.svg'
 */
/**
 * The value returned when no <BrandingProvider> is above this hook.
 *
 * Frozen and module-level so every provider-less consumer gets the SAME object
 * identity. A fresh object each call would change on every render and churn any
 * dependency array it lands in — the estate has already paid for that once, at
 * 1,143 fetches in fifteen seconds.
 */
const NO_BRANDING: BrandingContextValue = Object.freeze({
  branding: null,
  isLoading: false,
  error: null,
  refresh: async () => {},
})

/**
 * THIS HOOK USED TO THROW, AND THE THROW REACHED PRODUCTION.
 *
 * `if (!ctx) throw new Error(...)` is the ordinary React idiom for a missing
 * provider, and it is right for a hook only developers can reach. This one is
 * not: it is called on anonymous, logged-out page views, where a throw is a
 * white screen for a visitor who has done nothing wrong. crm7#1603 recorded
 * 1,856 fatal errors over 80 days from exactly that — 87% of the error log.
 *
 * That issue was closed by mounting a provider in crm7. Then in conduit, and
 * throughput, and BSU, and R80.4 — five independent workarounds for a throw
 * nobody removed, leaving the next consumer rendered outside a provider to
 * recreate the incident in full.
 *
 * So the hook now DEGRADES instead of throwing: a null branding, which every
 * consumer already handles because `branding` is nullable inside a provider too.
 *
 * The developer signal is not lost, only moved off the user's screen. A missing
 * provider is still a real mistake, so it is reported once per session via
 * console.error in development. Once, not per render: a hook that fires on every
 * anonymous view would otherwise flood the console and train everyone to ignore
 * it, which is how a real warning becomes invisible.
 */
export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    warnOnceAboutMissingProvider()
    return NO_BRANDING
  }
  return ctx
}

let warnedAboutMissingProvider = false
function warnOnceAboutMissingProvider(): void {
  if (warnedAboutMissingProvider) return
  warnedAboutMissingProvider = true
  /* `import.meta.env?.DEV` rather than NODE_ENV: this package is consumed by
     Vite apps and by Next.js, and the optional chain keeps it from throwing in
     any bundler that does not define import.meta.env at all. */
  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
  if (!isDev) return
  console.error(
    '[@bsuite/theme] useBranding() was called with no <BrandingProvider> above it. '
      + 'Returning null branding rather than throwing, because this hook runs on '
      + 'anonymous page views and a throw there is a white screen for the visitor '
      + '(crm7#1603: 1,856 fatal errors over 80 days). Mount <BrandingProvider> so '
      + 'tenant branding actually resolves.',
  )
}
