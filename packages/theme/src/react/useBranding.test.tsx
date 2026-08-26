/**
 * @vitest-environment jsdom
 */
/**
 * useBranding — a missing provider must DEGRADE, never throw.
 *
 * THE INCIDENT THIS LOCKS OUT. `if (!ctx) throw` is the ordinary React idiom for
 * a missing provider, and it is right for a hook only developers can reach. This
 * one is not: it runs on anonymous, logged-out page views, where a throw is a
 * white screen for a visitor who has done nothing wrong. crm7#1603 recorded
 * 1,856 fatal errors over 80 days from exactly that — 87% of the error log.
 *
 * That issue was closed by mounting a provider in crm7. Then in conduit, and
 * throughput, and BSU, and R80.4 — five independent workarounds for a throw
 * nobody removed. The hook itself stayed hostile, so the next consumer rendered
 * outside a provider would have recreated the incident in full.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrandingContext, type BrandingContextValue } from './BrandingProvider.js'
import { useBranding } from './useBranding.js'

/* Auto-cleanup only runs when vitest globals are on; this package runs without
   them, so renders would otherwise stack up and a getByTestId would find two. */
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Probe() {
  const { branding, isLoading, error } = useBranding()
  return (
    <div data-testid="out">
      {`branding=${branding === null ? 'null' : 'set'} loading=${isLoading} error=${error === null ? 'null' : 'set'}`}
    </div>
  )
}

let identityA: unknown
let identityB: unknown
function IdentityProbe({ slot }: { slot: 'a' | 'b' }) {
  const ctx = useBranding()
  if (slot === 'a') identityA = ctx
  else identityB = ctx
  return null
}

describe('useBranding without a provider', () => {
  it('does NOT throw, and returns a usable null-branding value', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).not.toThrow()
    expect(screen.getByTestId('out').textContent).toBe(
      'branding=null loading=false error=null',
    )
  })

  it('returns a STABLE identity, so it cannot churn a dependency array', () => {
    // A fresh object per call would change on every render. This estate has
    // already paid for that shape once, at 1,143 fetches in fifteen seconds.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <>
        <IdentityProbe slot="a" />
        <IdentityProbe slot="b" />
      </>,
    )
    expect(identityA).toBe(identityB)
  })

  it('its refresh() is callable and resolves, rather than being undefined', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let refresh: (() => Promise<void>) | undefined
    function R() {
      refresh = useBranding().refresh
      return null
    }
    render(<R />)
    expect(typeof refresh).toBe('function')
    return expect(refresh!()).resolves.toBeUndefined()
  })
})

describe('useBranding WITH a provider — the control', () => {
  it('still returns the real context, so the fallback cannot be masking a break', () => {
    const value: BrandingContextValue = {
      /* A tenant SLUG, not a colour. An explicit hex here would be a literal in
         a file the palette whitelist audit scans, and this assertion only needs
          to be non-null. */
      branding: { tenant_slug: 'a-tenant' } as unknown as BrandingContextValue['branding'],
      isLoading: true,
      error: new Error('boom'),
      refresh: async () => {},
    }
    render(
      <BrandingContext.Provider value={value}>
        <Probe />
      </BrandingContext.Provider>,
    )
    expect(screen.getByTestId('out').textContent).toBe(
      'branding=set loading=true error=set',
    )
  })
})
