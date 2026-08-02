import { describe, expect, it } from 'vitest'
import { resolvePlatformLogo } from './usePlatformLogo.js'

describe('resolvePlatformLogo', () => {
  it('prefers the dark logo for dark full-logo slots', () => {
    const logo = resolvePlatformLogo(
      {
        logo_url: 'https://cdn.example.com/default.svg',
        logo_light_url: 'https://cdn.example.com/light.svg',
        logo_dark_url: 'https://cdn.example.com/dark.svg',
        company_name: 'Acme Training',
      },
      { slot: 'header', scheme: 'dark' },
    )

    expect(logo.src).toBe('https://cdn.example.com/dark.svg')
    expect(logo.alt).toBe('Acme Training logo')
    expect(logo.source).toBe('branding')
    expect(logo.isTenantLogo).toBe(true)
    expect(logo.cssVariable).toBe('--logo-dark-url')
  })

  it('prefers the mark for mark slots and falls back to the full logo', () => {
    expect(
      resolvePlatformLogo(
        { mark_url: 'https://cdn.example.com/mark.svg', logo_url: 'https://cdn.example.com/full.svg' },
        { slot: 'mark' },
      ).src,
    ).toBe('https://cdn.example.com/mark.svg')

    expect(resolvePlatformLogo({ logo_url: 'https://cdn.example.com/full.svg' }, { slot: 'mark' }).src).toBe(
      'https://cdn.example.com/full.svg',
    )
  })

  it('uses slot-specific fallbacks when branding has no logo', () => {
    const logo = resolvePlatformLogo(null, {
      slot: 'sidebar',
      fallback: 'https://cdn.example.com/default.svg',
      fallbackBySlot: {
        sidebar: 'https://cdn.example.com/sidebar.svg',
      },
    })

    expect(logo.src).toBe('https://cdn.example.com/sidebar.svg')
    expect(logo.source).toBe('fallback')
    expect(logo.isTenantLogo).toBe(false)
  })

  it('returns no source when both branding and fallback are empty', () => {
    const logo = resolvePlatformLogo({ logo_url: '   ' }, { fallback: ' ' })

    expect(logo.src).toBeNull()
    expect(logo.source).toBe('none')
  })
})
