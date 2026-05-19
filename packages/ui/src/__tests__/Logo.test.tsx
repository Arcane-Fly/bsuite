/**
 * Unit tests for @bsuite/ui <Logo /> and resolveLogoUrl().
 *
 * Covers all four resolution tiers + branch coverage on the resolver:
 *   Tier 3 (app)      — per-tenant + per-app override (highest precedence)
 *   Tier 2 (tenant)   — per-tenant
 *   Tier 1 (platform) — platform defaults
 *   Tier 0 (sub-org)  — server-resolved before reaching the client; the
 *                       component sees its product in the `app_*` /
 *                       `logo_*` fields. Verified via the parent-chain
 *                       fixture below: when a sub-org has no app_* logo
 *                       but inherits the parent tenant's `logo_url`, the
 *                       resolver picks Tier 2 because that's how the
 *                       server walked the chain.
 *   Default           — inline SVG mark (no URL anywhere)
 *
 * Plus: favicon-slot variant fields, scheme-aware ordering, blank-string
 * rejection (so "" doesn't satisfy a tier), `'auto'` scheme resolution
 * against `<html class="dark">`, alt-text fallback, and dimensions.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, resolveLogoUrl, type LogoBranding } from '../Logo.js'

describe('resolveLogoUrl — pure resolver', () => {
  it('returns the default tier when branding is null', () => {
    const result = resolveLogoUrl(null, 'sidebar', 'light')
    expect(result).toEqual({ src: null, tier: 'default', scheme: 'light' })
  })

  it('returns the default tier when branding is undefined', () => {
    const result = resolveLogoUrl(undefined, 'sidebar', 'light')
    expect(result).toEqual({ src: null, tier: 'default', scheme: 'light' })
  })

  it('returns the default tier when every field is empty/whitespace', () => {
    const branding: LogoBranding = {
      app_logo_url: '   ',
      logo_url: '',
      platform_logo_url: undefined,
    }
    const result = resolveLogoUrl(branding, 'sidebar', 'light')
    expect(result.tier).toBe('default')
    expect(result.src).toBeNull()
  })

  describe('wordmark slots (header / sidebar / auth / marketing)', () => {
    it('Tier 3: prefers app_logo_url when set', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app.png',
        logo_url: 'https://cdn/tenant.png',
        platform_logo_url: 'https://cdn/platform.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'light')
      expect(result).toEqual({ src: 'https://cdn/app.png', tier: 'app', scheme: 'light' })
    })

    it('Tier 3 (dark): prefers app_logo_dark_url over app_logo_url when scheme=dark', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app.png',
        app_logo_dark_url: 'https://cdn/app-dark.png',
        app_logo_light_url: 'https://cdn/app-light.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'dark')
      expect(result.src).toBe('https://cdn/app-dark.png')
      expect(result.tier).toBe('app')
    })

    it('Tier 3 (light): prefers app_logo_light_url over app_logo_url when scheme=light', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app.png',
        app_logo_dark_url: 'https://cdn/app-dark.png',
        app_logo_light_url: 'https://cdn/app-light.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'light')
      expect(result.src).toBe('https://cdn/app-light.png')
      expect(result.tier).toBe('app')
    })

    it('Tier 3 (dark fallback): app_logo_dark_url missing falls to app_logo_url', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app.png',
        app_logo_light_url: 'https://cdn/app-light.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'dark')
      expect(result.src).toBe('https://cdn/app.png')
      expect(result.tier).toBe('app')
    })

    it('Tier 3 (light fallback): app_logo_light_url missing falls to app_logo_url', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app.png',
        app_logo_dark_url: 'https://cdn/app-dark.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'light')
      expect(result.src).toBe('https://cdn/app.png')
      expect(result.tier).toBe('app')
    })

    it('Tier 2: falls to tenant logo_url when Tier 3 is empty', () => {
      const branding: LogoBranding = {
        logo_url: 'https://cdn/tenant.png',
        platform_logo_url: 'https://cdn/platform.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'light')
      expect(result).toEqual({ src: 'https://cdn/tenant.png', tier: 'tenant', scheme: 'light' })
    })

    it('Tier 2 (dark): prefers logo_dark_url for scheme=dark', () => {
      const branding: LogoBranding = {
        logo_url: 'https://cdn/tenant.png',
        logo_dark_url: 'https://cdn/tenant-dark.png',
        logo_light_url: 'https://cdn/tenant-light.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'dark')
      expect(result.src).toBe('https://cdn/tenant-dark.png')
      expect(result.tier).toBe('tenant')
    })

    it('Tier 2 (light): prefers logo_light_url for scheme=light', () => {
      const branding: LogoBranding = {
        logo_url: 'https://cdn/tenant.png',
        logo_dark_url: 'https://cdn/tenant-dark.png',
        logo_light_url: 'https://cdn/tenant-light.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'light')
      expect(result.src).toBe('https://cdn/tenant-light.png')
      expect(result.tier).toBe('tenant')
    })

    it('Tier 2 (dark fallback): logo_dark missing falls through logo_url then logo_light', () => {
      const branding: LogoBranding = {
        logo_light_url: 'https://cdn/tenant-light.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'dark')
      expect(result.src).toBe('https://cdn/tenant-light.png')
      expect(result.tier).toBe('tenant')
    })

    it('Tier 2 (light fallback): logo_light missing falls through logo_url then logo_dark', () => {
      const branding: LogoBranding = {
        logo_dark_url: 'https://cdn/tenant-dark.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'light')
      expect(result.src).toBe('https://cdn/tenant-dark.png')
      expect(result.tier).toBe('tenant')
    })

    it('Tier 1: falls to platform_logo_url when Tiers 3 and 2 are empty', () => {
      const branding: LogoBranding = {
        platform_logo_url: 'https://cdn/platform.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'light')
      expect(result).toEqual({ src: 'https://cdn/platform.png', tier: 'platform', scheme: 'light' })
    })

    it('Tier 1 (dark): prefers platform_logo_dark_url for scheme=dark', () => {
      const branding: LogoBranding = {
        platform_logo_url: 'https://cdn/platform.png',
        platform_logo_dark_url: 'https://cdn/platform-dark.png',
        platform_logo_light_url: 'https://cdn/platform-light.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'dark')
      expect(result.src).toBe('https://cdn/platform-dark.png')
      expect(result.tier).toBe('platform')
    })

    it('Tier 1 (light): prefers platform_logo_light_url for scheme=light', () => {
      const branding: LogoBranding = {
        platform_logo_url: 'https://cdn/platform.png',
        platform_logo_dark_url: 'https://cdn/platform-dark.png',
        platform_logo_light_url: 'https://cdn/platform-light.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'light')
      expect(result.src).toBe('https://cdn/platform-light.png')
      expect(result.tier).toBe('platform')
    })

    it('Tier 1 (dark fallback): platform_logo_dark missing falls through', () => {
      const branding: LogoBranding = {
        platform_logo_light_url: 'https://cdn/platform-light.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'dark')
      expect(result.src).toBe('https://cdn/platform-light.png')
      expect(result.tier).toBe('platform')
    })

    it('Tier 1 (light fallback): platform_logo_light missing falls through', () => {
      const branding: LogoBranding = {
        platform_logo_dark_url: 'https://cdn/platform-dark.png',
      }
      const result = resolveLogoUrl(branding, 'header', 'light')
      expect(result.src).toBe('https://cdn/platform-dark.png')
      expect(result.tier).toBe('platform')
    })

    it('precedence: Tier 3 beats Tier 2 which beats Tier 1', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app.png',
        logo_url: 'https://cdn/tenant.png',
        platform_logo_url: 'https://cdn/platform.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'light')
      expect(result.tier).toBe('app')
      expect(result.src).toBe('https://cdn/app.png')
    })
  })

  describe('favicon slot', () => {
    it('Tier 3: prefers app_logo_url for favicon', () => {
      const branding: LogoBranding = {
        app_logo_url: 'https://cdn/app-icon.png',
        favicon_url: 'https://cdn/favicon.png',
      }
      const result = resolveLogoUrl(branding, 'favicon', 'light')
      expect(result).toEqual({ src: 'https://cdn/app-icon.png', tier: 'app', scheme: 'light' })
    })

    it('Tier 2: prefers favicon_url, then mark_url, then logo_url', () => {
      const fav: LogoBranding = { favicon_url: 'https://cdn/fav.png', logo_url: 'https://cdn/l.png' }
      expect(resolveLogoUrl(fav, 'favicon', 'light').src).toBe('https://cdn/fav.png')

      const mark: LogoBranding = { mark_url: 'https://cdn/mark.png', logo_url: 'https://cdn/l.png' }
      expect(resolveLogoUrl(mark, 'favicon', 'light').src).toBe('https://cdn/mark.png')

      const logo: LogoBranding = { logo_url: 'https://cdn/l.png' }
      expect(resolveLogoUrl(logo, 'favicon', 'light').src).toBe('https://cdn/l.png')
    })

    it('Tier 1: prefers platform_favicon, then platform_mark, then platform_logo', () => {
      const fav: LogoBranding = {
        platform_favicon_url: 'https://cdn/pf.png',
        platform_logo_url: 'https://cdn/pl.png',
      }
      expect(resolveLogoUrl(fav, 'favicon', 'light').src).toBe('https://cdn/pf.png')

      const mark: LogoBranding = {
        platform_mark_url: 'https://cdn/pm.png',
        platform_logo_url: 'https://cdn/pl.png',
      }
      expect(resolveLogoUrl(mark, 'favicon', 'light').src).toBe('https://cdn/pm.png')

      const logo: LogoBranding = { platform_logo_url: 'https://cdn/pl.png' }
      expect(resolveLogoUrl(logo, 'favicon', 'light').src).toBe('https://cdn/pl.png')
    })

    it('Default when no favicon-relevant field is set', () => {
      const branding: LogoBranding = { company_name: 'Acme' }
      const result = resolveLogoUrl(branding, 'favicon', 'light')
      expect(result).toEqual({ src: null, tier: 'default', scheme: 'light' })
    })
  })

  describe('sub-org Tier-0 chain (server-resolved before client)', () => {
    it('renders the parent tenant logo when the sub-org has no own override', () => {
      // The server's branding_json_for_tenant() walked parent_tenant_id and
      // returned the parent's logo_url in the `logo_url` field. The sub-org
      // never sets its own app_logo_url. Resolver should land on Tier 2.
      const branding: LogoBranding = {
        // Sub-org's own app fields — empty (no override).
        app_logo_url: null,
        app_logo_light_url: null,
        app_logo_dark_url: null,
        // Parent's logo_url surfaced by the server walk.
        logo_url: 'https://cdn/parent-tenant.png',
        platform_logo_url: 'https://cdn/platform.png',
      }
      const result = resolveLogoUrl(branding, 'sidebar', 'light')
      expect(result.tier).toBe('tenant')
      expect(result.src).toBe('https://cdn/parent-tenant.png')
    })
  })
})

describe('<Logo /> component', () => {
  beforeEach(() => {
    // Reset the dark-mode class so 'auto' tests are deterministic.
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark')
    }
  })

  it('renders the default SVG mark when branding is missing', () => {
    const { container } = render(<Logo slot="sidebar" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('data-tier')).toBe('default')
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the tenant logo when only tenant fields are present', () => {
    const branding: LogoBranding = { logo_url: 'https://cdn/tenant.png', company_name: 'Acme' }
    render(<Logo slot="sidebar" branding={branding} />)
    const img = screen.getByRole('img')
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('src')).toBe('https://cdn/tenant.png')
    expect(img.getAttribute('alt')).toBe('Acme')
    expect(img.getAttribute('data-tier')).toBe('tenant')
  })

  it('renders the sub-org chain (parent tenant logo via Tier 2)', () => {
    // Sub-org has no app override; server walked the chain and gave us the
    // parent tenant's logo_url. We expect Tier 2 to win.
    const branding: LogoBranding = {
      app_logo_url: null,
      logo_url: 'https://cdn/parent-tenant.png',
      platform_logo_url: 'https://cdn/platform.png',
    }
    render(<Logo slot="sidebar" branding={branding} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('https://cdn/parent-tenant.png')
    expect(img.getAttribute('data-tier')).toBe('tenant')
  })

  it('renders the app-specific logo when set (Tier 3 highest precedence)', () => {
    const branding: LogoBranding = {
      app_logo_url: 'https://cdn/app.png',
      logo_url: 'https://cdn/tenant.png',
      platform_logo_url: 'https://cdn/platform.png',
    }
    render(<Logo slot="header" branding={branding} appSlug="crm7" />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('https://cdn/app.png')
    expect(img.getAttribute('data-tier')).toBe('app')
    expect(img.getAttribute('data-app')).toBe('crm7')
  })

  it('renders the platform default when only Tier 1 is set', () => {
    const branding: LogoBranding = { platform_logo_url: 'https://cdn/platform.png' }
    render(<Logo slot="auth" branding={branding} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('https://cdn/platform.png')
    expect(img.getAttribute('data-tier')).toBe('platform')
  })

  it("uses 'BSuite' as the default alt text when no company_name", () => {
    render(<Logo slot="sidebar" branding={{ logo_url: 'https://cdn/x.png' }} />)
    expect(screen.getByRole('img').getAttribute('alt')).toBe('BSuite')
  })

  it("'auto' colour scheme resolves to dark when <html class='dark'>", () => {
    document.documentElement.classList.add('dark')
    const branding: LogoBranding = {
      logo_dark_url: 'https://cdn/dark.png',
      logo_light_url: 'https://cdn/light.png',
    }
    render(<Logo slot="sidebar" colorScheme="auto" branding={branding} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('https://cdn/dark.png')
    expect(img.getAttribute('data-scheme')).toBe('dark')
  })

  it("'auto' colour scheme resolves to light without .dark on <html>", () => {
    const branding: LogoBranding = {
      logo_dark_url: 'https://cdn/dark.png',
      logo_light_url: 'https://cdn/light.png',
    }
    render(<Logo slot="sidebar" colorScheme="auto" branding={branding} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('https://cdn/light.png')
    expect(img.getAttribute('data-scheme')).toBe('light')
  })

  it('applies slot-specific default dimensions', () => {
    const branding: LogoBranding = { logo_url: 'https://cdn/x.png' }
    const { rerender } = render(<Logo slot="favicon" branding={branding} />)
    expect(screen.getByRole('img').getAttribute('width')).toBe('32')
    rerender(<Logo slot="auth" branding={branding} />)
    expect(screen.getByRole('img').getAttribute('width')).toBe('160')
    rerender(<Logo slot="marketing" branding={branding} />)
    expect(screen.getByRole('img').getAttribute('width')).toBe('200')
  })

  it('honours explicit width/height overrides', () => {
    const branding: LogoBranding = { logo_url: 'https://cdn/x.png' }
    render(<Logo slot="sidebar" branding={branding} width={300} height={75} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('width')).toBe('300')
    expect(img.getAttribute('height')).toBe('75')
  })

  it('merges consumer className', () => {
    const branding: LogoBranding = { logo_url: 'https://cdn/x.png' }
    render(<Logo slot="sidebar" branding={branding} className="ml-4 opacity-80" />)
    const cls = screen.getByRole('img').getAttribute('class') ?? ''
    expect(cls).toContain('ml-4')
    expect(cls).toContain('opacity-80')
    expect(cls).toContain('inline-block')
  })

  it('passes through alt text override', () => {
    const branding: LogoBranding = { logo_url: 'https://cdn/x.png', company_name: 'Acme' }
    render(<Logo slot="sidebar" branding={branding} alt="Custom alt" />)
    expect(screen.getByRole('img').getAttribute('alt')).toBe('Custom alt')
  })
})
