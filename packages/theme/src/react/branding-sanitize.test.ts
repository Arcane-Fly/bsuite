/**
 * branding-sanitize — unit tests.
 *
 * Pins the SEC-002 (font) and SEC-003 (URL) CSS-injection contract for
 * `<BrandingProvider>`'s DOM-apply boundary. A regression here would let a
 * crafted `platform_branding` / `tenant_branding` / `tenant_app_branding`
 * row inject arbitrary CSS into every D2C-app page render via the
 * `branding_json_for_tenant` RPC payload.
 *
 * Validation loop: §9.1 output-equivalence — legitimate values must pass
 * through unchanged; only injection vectors are neutralised.
 *
 * Refs: BSU#485 (canonical sanitiser, merged 2026-05-25);
 *       crm7#857 (sibling app sanitiser, open draft);
 *       bsuite#1243 (handoff — the canonical fix landed here in
 *       @bsuite/theme as the DRY upstream patch).
 */

import { describe, expect, it } from 'vitest'

import {
  sanitizeBrandingUrl,
  sanitizeFontFamily,
  toCssUrl,
} from './branding-sanitize'

// ─── sanitizeBrandingUrl — legitimate values pass unchanged ──────────────────

describe('sanitizeBrandingUrl — accepts legitimate branding URLs', () => {
  it('returns an absolute https URL unchanged', () => {
    const url =
      'https://tuybltdrdefjblnplpqo.supabase.co/storage/v1/object/public/tenant-logos/platform/bsu-light.png'
    expect(sanitizeBrandingUrl(url)).toBe(url)
  })

  it('returns an absolute http URL unchanged', () => {
    expect(sanitizeBrandingUrl('http://localhost:3000/logo.svg')).toBe(
      'http://localhost:3000/logo.svg',
    )
  })

  it('returns a root-relative path unchanged (same-origin, no scheme)', () => {
    expect(sanitizeBrandingUrl('/assets/logo.svg')).toBe('/assets/logo.svg')
  })

  it('normalises an https URL via the URL API', () => {
    // The URL API lower-cases the host and keeps the path verbatim.
    expect(sanitizeBrandingUrl('https://CDN.Example/Logo.svg')).toBe(
      'https://cdn.example/Logo.svg',
    )
  })
})

// ─── sanitizeBrandingUrl — injection vectors are rejected ────────────────────

describe('sanitizeBrandingUrl — rejects dangerous input', () => {
  it('rejects a javascript: scheme', () => {
    expect(sanitizeBrandingUrl('javascript:alert(document.cookie)')).toBeNull()
  })

  it('rejects a data: scheme', () => {
    expect(
      sanitizeBrandingUrl('data:text/html,<script>alert(1)</script>'),
    ).toBeNull()
  })

  it('rejects vbscript:, blob: and file: schemes', () => {
    expect(sanitizeBrandingUrl('vbscript:msgbox(1)')).toBeNull()
    expect(sanitizeBrandingUrl('blob:https://x/abc')).toBeNull()
    expect(sanitizeBrandingUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects the protocol-relative //host form (arbitrary origin)', () => {
    expect(sanitizeBrandingUrl('//evil.example/logo.svg')).toBeNull()
  })

  it('rejects empty, whitespace-only and non-string input', () => {
    expect(sanitizeBrandingUrl('')).toBeNull()
    expect(sanitizeBrandingUrl('   ')).toBeNull()
    expect(sanitizeBrandingUrl(null)).toBeNull()
    expect(sanitizeBrandingUrl(undefined)).toBeNull()
    expect(sanitizeBrandingUrl(123 as unknown as string)).toBeNull()
  })

  it('rejects input containing control characters (CSS-token terminators)', () => {
    expect(sanitizeBrandingUrl('https://x/lo\ngo.svg')).toBeNull()
    expect(sanitizeBrandingUrl('https://x/lo\tgo.svg')).toBeNull()
  })

  it('rejects an over-long URL', () => {
    expect(sanitizeBrandingUrl(`https://x/${'a'.repeat(3000)}`)).toBeNull()
  })

  it('percent-encodes a CSS-breakout attempt so no raw quote survives', () => {
    // A "valid" URL whose path tries to close the url() token and inject a
    // ruleset. The URL API percent-encodes the quote/space, so the result
    // can never break out of url("...").
    const attack = 'https://x/logo.svg") } html { display: none } a { x: url("'
    const result = sanitizeBrandingUrl(attack)
    expect(result).not.toBeNull()
    expect(result).not.toContain('"')
    expect(result).not.toContain(' ')
  })
})

// ─── toCssUrl — wrapping + escaping ──────────────────────────────────────────

describe('toCssUrl — builds a safe url() token', () => {
  it('wraps a plain URL in a quoted url() token', () => {
    expect(toCssUrl('https://x/logo.svg')).toBe('url("https://x/logo.svg")')
  })

  it('returns null for null / empty input', () => {
    expect(toCssUrl(null)).toBeNull()
    expect(toCssUrl(undefined)).toBeNull()
    expect(toCssUrl('')).toBeNull()
  })

  it('escapes a double-quote so the string cannot be closed early', () => {
    // Defence-in-depth: even if a quote reaches toCssUrl (e.g. a relative
    // path), it is escaped rather than terminating the token.
    expect(toCssUrl('/logo".svg')).toBe('url("/logo\\".svg")')
  })

  it('escapes a backslash', () => {
    expect(toCssUrl('/a\\b')).toBe('url("/a\\\\b")')
  })
})

// ─── sanitizeFontFamily — legitimate font stacks pass ────────────────────────

describe('sanitizeFontFamily — accepts legitimate font stacks', () => {
  it('returns a single family name unchanged', () => {
    expect(sanitizeFontFamily('Inter')).toBe('Inter')
  })

  it('returns a comma-separated quoted stack unchanged', () => {
    const stack = '"Helvetica Neue", Arial, system-ui, sans-serif'
    expect(sanitizeFontFamily(stack)).toBe(stack)
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeFontFamily('  Inter  ')).toBe('Inter')
  })
})

// ─── sanitizeFontFamily — injection vectors are rejected ─────────────────────

describe('sanitizeFontFamily — rejects injection attempts', () => {
  it('rejects a declaration breakout via ; { }', () => {
    expect(
      sanitizeFontFamily('Inter; } html { display: none } body {'),
    ).toBeNull()
  })

  it('rejects a </style> breakout', () => {
    expect(sanitizeFontFamily('Arial</style><script>alert(1)</script>')).toBeNull()
  })

  it('rejects url(...) and expression(...) via the parenthesis guard', () => {
    expect(sanitizeFontFamily('x, url(//evil.example/font)')).toBeNull()
    expect(sanitizeFontFamily('x expression(alert(1))')).toBeNull()
  })

  it('rejects an @import at-rule', () => {
    expect(sanitizeFontFamily('@import url(evil)')).toBeNull()
  })

  it('rejects CSS comment markers', () => {
    expect(sanitizeFontFamily('Arial/* injected */Bold')).toBeNull()
  })

  it('rejects a backslash escape', () => {
    expect(sanitizeFontFamily('Arial\\41')).toBeNull()
  })

  it('rejects empty, over-long, control-bearing and non-string input', () => {
    expect(sanitizeFontFamily('')).toBeNull()
    expect(sanitizeFontFamily('   ')).toBeNull()
    expect(sanitizeFontFamily('A'.repeat(300))).toBeNull()
    expect(sanitizeFontFamily('Arial\nBlack')).toBeNull()
    expect(sanitizeFontFamily(null)).toBeNull()
    expect(sanitizeFontFamily(undefined)).toBeNull()
  })
})
