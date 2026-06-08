// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BusinessSuiteTokens } from '../types.js'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stub `jose` at module-scope so createRemoteJWKSet returns a sentinel and
// jwtVerify is a vi.fn() we can control per-test. The sentinel is opaque —
// the module under test never inspects its shape.
const mockJwtVerify = vi.fn()
const mockCreateRemoteJWKSet = vi.fn((_url: URL) => 'jwks-sentinel')

vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
  createRemoteJWKSet: mockCreateRemoteJWKSet,
}))

// Deterministic crypto.getRandomValues so the generated verifier/state/nonce
// are predictable in assertions. A per-call counter ensures successive same-
// size buffers differ (state ≠ nonce). crypto.subtle.digest stays real — jsdom
// provides a WebCrypto SubtleCrypto implementation.
let randomCallIndex = 0
function fillDeterministicRandom(buf: Uint8Array) {
  const seed = randomCallIndex++
  for (let i = 0; i < buf.length; i++) buf[i] = (i * 17 + 3 + seed * 131) & 0xff
  return buf
}

// Storage mocks — vitest+jsdom's localStorage is inconsistent across versions
// (same issue the nav-core tests hit). Roll our own minimal shim.
function makeStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
    _raw: store,
  }
}

const CLIENT_ID = '30f76744-3e0b-40bf-abb8-8c587389802e'
const BS_URL = 'https://tuybltdrdefjblnplpqo.supabase.co'
const DEV_BS_URL = 'https://udztobxdhunypbxtwevc.supabase.co'
const OAUTH_SUPABASE_ENV_NAMES = [
  'VITE_BSU_OAUTH_SUPABASE_URL',
  'NEXT_PUBLIC_BSU_OAUTH_SUPABASE_URL',
  'BSU_OAUTH_SUPABASE_URL',
  'VITE_BUSINESS_SUITE_SUPABASE_URL',
  'NEXT_PUBLIC_BUSINESS_SUITE_SUPABASE_URL',
  'BUSINESS_SUITE_SUPABASE_URL',
] as const

let localMock = makeStorageMock()
let sessionMock = makeStorageMock()
let fetchMock: ReturnType<typeof vi.fn>
let originalLocation: Location
let originalViteAppUrl: string | undefined
let originalNextPublicAppUrl: string | undefined
let originalOAuthSupabaseEnv: Partial<Record<(typeof OAUTH_SUPABASE_ENV_NAMES)[number], string | undefined>>

function getProcessEnv(): Record<string, string | undefined> {
  const processLike = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }
  if (!processLike.process) {
    processLike.process = {}
  }
  if (!processLike.process.env) {
    processLike.process.env = {}
  }
  return processLike.process.env
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  randomCallIndex = 0
  localMock = makeStorageMock()
  sessionMock = makeStorageMock()
  fetchMock = vi.fn()
  vi.stubGlobal('localStorage', localMock)
  vi.stubGlobal('sessionStorage', sessionMock)
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(crypto, 'getRandomValues').mockImplementation(((buf: ArrayBufferView) => {
    if (buf instanceof Uint8Array) fillDeterministicRandom(buf)
    return buf
  }) as Crypto['getRandomValues'])
  originalLocation = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { origin: 'https://crm.crm7.app', href: '' } as Location,
  })
  const env = getProcessEnv()
  originalViteAppUrl = env.VITE_APP_URL
  originalNextPublicAppUrl = env.NEXT_PUBLIC_APP_URL
  originalOAuthSupabaseEnv = {}
  delete env.VITE_APP_URL
  delete env.NEXT_PUBLIC_APP_URL
  for (const name of OAUTH_SUPABASE_ENV_NAMES) {
    originalOAuthSupabaseEnv[name] = env[name]
    delete env[name]
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
  const env = getProcessEnv()
  if (originalViteAppUrl === undefined) {
    delete env.VITE_APP_URL
  } else {
    env.VITE_APP_URL = originalViteAppUrl
  }
  if (originalNextPublicAppUrl === undefined) {
    delete env.NEXT_PUBLIC_APP_URL
  } else {
    env.NEXT_PUBLIC_APP_URL = originalNextPublicAppUrl
  }
  for (const name of OAUTH_SUPABASE_ENV_NAMES) {
    const value = originalOAuthSupabaseEnv[name]
    if (value === undefined) {
      delete env[name]
    } else {
      env[name] = value
    }
  }
})

// ---------------------------------------------------------------------------
// factory smoke — every expected method is bound + stable
// ---------------------------------------------------------------------------

describe('createOAuthClient', () => {
  it('returns all eight expected methods', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    expect(typeof client.signInWithBusinessSuite).toBe('function')
    expect(typeof client.exchangeCodeForTokens).toBe('function')
    expect(typeof client.refreshBusinessSuiteToken).toBe('function')
    expect(typeof client.verifyAccessToken).toBe('function')
    expect(typeof client.getUserInfo).toBe('function')
    expect(typeof client.clearBSTokens).toBe('function')
    expect(typeof client.startBSTokenRefresh).toBe('function')
    expect(typeof client.attemptSilentAuth).toBe('function')
  })

  it('two clients for different app IDs have independent bindings', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const a = createOAuthClient('id-a')
    const b = createOAuthClient('id-b')
    expect(a.signInWithBusinessSuite).not.toBe(b.signInWithBusinessSuite)
  })
})

// ---------------------------------------------------------------------------
// signInWithBusinessSuite — redirect URL + PKCE setup
// ---------------------------------------------------------------------------

describe('signInWithBusinessSuite', () => {
  it('stashes a PKCE verifier, state, and nonce before redirecting', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite()
    // Keys now in localStorage (not sessionStorage) — Stage-3 PKCE fix
    expect(localMock.getItem('bs_oauth_code_verifier')).toMatch(/^[0-9a-f]+$/)
    expect(localMock.getItem('bs_oauth_state')).toMatch(/^[0-9a-f]+$/)
    expect(localMock.getItem('bs_oauth_nonce')).toMatch(/^[0-9a-f]+$/)
  })

  it('writes started_at timestamp to localStorage alongside the verifier', async () => {
    // Stage-3: TTL guard requires bs_oauth_started_at to be written
    const { createOAuthClient } = await import('../oauth-client.js')
    const before = Date.now()
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const after = Date.now()
    const startedAt = Number(localMock.getItem('bs_oauth_started_at'))
    expect(Number.isFinite(startedAt)).toBe(true)
    expect(startedAt).toBeGreaterThanOrEqual(before)
    expect(startedAt).toBeLessThanOrEqual(after)
  })

  it('state and nonce are distinct values', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const state = localMock.getItem('bs_oauth_state')
    const nonce = localMock.getItem('bs_oauth_nonce')
    expect(state).not.toBe(nonce)
  })

  it('redirects to /auth/v1/oauth/authorize with PKCE S256 + openid scope', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const href = window.location.href
    expect(href.startsWith(`${BS_URL}/auth/v1/oauth/authorize?`)).toBe(true)
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('client_id')).toBe(CLIENT_ID)
    expect(params.get('response_type')).toBe('code')
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('scope')).toBe('openid email profile')
    expect(params.get('redirect_uri')).toBe('https://crm.crm7.app/auth/callback')
    expect(params.get('code_challenge')).toBeTruthy()
    expect(params.get('state')).toBe(localMock.getItem('bs_oauth_state'))
    expect(params.get('nonce')).toBe(localMock.getItem('bs_oauth_nonce'))
    // Default invocation does NOT include the OIDC prompt parameter.
    expect(params.get('prompt')).toBeNull()
  })

  it('uses VITE_BSU_OAUTH_SUPABASE_URL for isolated development OAuth servers', async () => {
    getProcessEnv().VITE_BSU_OAUTH_SUPABASE_URL = DEV_BS_URL
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    expect(window.location.href.startsWith(`${DEV_BS_URL}/auth/v1/oauth/authorize?`)).toBe(true)
  })

  it('rejects malformed OAuth Supabase URL overrides before redirecting', async () => {
    getProcessEnv().VITE_BSU_OAUTH_SUPABASE_URL = 'https://not-supabase.example.com'
    await expect(import('../oauth-client.js')).rejects.toThrow(/VITE_BSU_OAUTH_SUPABASE_URL/)
  })

  it('prefers VITE_APP_URL for redirect_uri when configured', async () => {
    getProcessEnv().VITE_APP_URL = 'https://d.crm.crm7.app'
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const href = window.location.href
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('redirect_uri')).toBe('https://d.crm.crm7.app/auth/callback')
  })

  it('falls back to NEXT_PUBLIC_APP_URL when VITE_APP_URL is unset', async () => {
    getProcessEnv().NEXT_PUBLIC_APP_URL = 'https://d.conduit.crm7.app'
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const href = window.location.href
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('redirect_uri')).toBe('https://d.conduit.crm7.app/auth/callback')
  })

  it('falls back to window.location.origin when VITE_APP_URL is malformed', async () => {
    getProcessEnv().VITE_APP_URL = 'not-a-url'
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const href = window.location.href
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('redirect_uri')).toBe('https://crm.crm7.app/auth/callback')
  })

  it('passes prompt=none for OIDC silent re-auth', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite({ prompt: 'none' })
    const href = window.location.href
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('prompt')).toBe('none')
  })

  it('passes prompt=login when explicitly requested', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite({ prompt: 'login' })
    const href = window.location.href
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('prompt')).toBe('login')
  })

  it('stashes returnTo into localStorage[auth_return_path]', async () => {
    // Stage-3: auth_return_path now in localStorage (not sessionStorage)
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite({ returnTo: '/dashboard?x=1' })
    expect(localMock.getItem('auth_return_path')).toBe('/dashboard?x=1')
  })

  it('defaults returnTo to current window.location.href', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    Object.defineProperty(window, 'location', {
      configurable: true, writable: true,
      value: { origin: 'https://crm.crm7.app', href: 'https://crm.crm7.app/projects/42' } as Location,
    })
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    expect(localMock.getItem('auth_return_path')).toBe('https://crm.crm7.app/projects/42')
  })
})

// ---------------------------------------------------------------------------
// signInWithBusinessSuite — redirect-loop circuit breaker
// ---------------------------------------------------------------------------

describe('signInWithBusinessSuite redirect-loop circuit breaker', () => {
  beforeEach(() => {
    // Defense-in-depth: ensure a clean slate for each test regardless of
    // whether the outer beforeEach resets localMock.
    localMock.removeItem('bs_oauth_last_redirect_at')
  })

  it('throws if invoked within 10s of a previous redirect', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    // First call records the timestamp and "navigates" (jsdom no-op).
    await client.signInWithBusinessSuite()
    await expect(client.signInWithBusinessSuite()).rejects.toThrow(/refusing to loop/i)
  })

  it('mentions the localStorage key in the error message so callers can reset', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite()
    await expect(client.signInWithBusinessSuite()).rejects.toThrow(/bs_oauth_last_redirect_at/)
  })

  it('does NOT rotate PKCE state for the rejected second call', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite()
    // Snapshot what the first (successful) call wrote — now in localStorage.
    const firstVerifier = localMock.getItem('bs_oauth_code_verifier')
    const firstState = localMock.getItem('bs_oauth_state')
    const firstNonce = localMock.getItem('bs_oauth_nonce')
    expect(firstVerifier).toMatch(/^[0-9a-f]+$/)
    // Rejected call must throw before rotating verifier / state / nonce.
    await expect(client.signInWithBusinessSuite()).rejects.toThrow(/refusing to loop/i)
    expect(localMock.getItem('bs_oauth_code_verifier')).toBe(firstVerifier)
    expect(localMock.getItem('bs_oauth_state')).toBe(firstState)
    expect(localMock.getItem('bs_oauth_nonce')).toBe(firstNonce)
  })

  it('succeeds again after clearing bs_oauth_last_redirect_at from localStorage', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite()
    localMock.removeItem('bs_oauth_last_redirect_at')
    await expect(client.signInWithBusinessSuite()).resolves.toBeUndefined()
  })

  it('records the timestamp under bs_oauth_last_redirect_at after a successful redirect', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const before = Date.now()
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const after = Date.now()
    const stored = Number(localMock.getItem('bs_oauth_last_redirect_at'))
    expect(Number.isFinite(stored)).toBe(true)
    expect(stored).toBeGreaterThanOrEqual(before)
    expect(stored).toBeLessThanOrEqual(after)
  })

  it('unblocks after the 10s window has elapsed (verified deterministically with fake timers)', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-05-06T00:00:00Z'))
      await client.signInWithBusinessSuite()
      // 9s later — still inside the window, still blocked (9 < 10).
      vi.setSystemTime(new Date('2026-05-06T00:00:09Z'))
      await expect(client.signInWithBusinessSuite()).rejects.toThrow(/refusing to loop/i)
      // Exactly at the window edge: strict-less-than means 10s unblocks
      // (10 !< 10). This pins the boundary so a future `<=` typo regresses
      // loudly — the test would start failing at this line.
      vi.setSystemTime(new Date('2026-05-06T00:00:10Z'))
      await expect(client.signInWithBusinessSuite()).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not rotate PKCE state when the breaker trips (defense in depth)', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite()
    const firstVerifier = localMock.getItem('bs_oauth_code_verifier')
    const firstState = localMock.getItem('bs_oauth_state')
    const firstNonce = localMock.getItem('bs_oauth_nonce')
    // Second call within 10s must throw BEFORE any PKCE rotation. If it
    // rotated first and then threw, the first consent round-trip would be
    // invalidated (verifier mismatch on /oauth/token).
    await expect(client.signInWithBusinessSuite()).rejects.toThrow(/refusing to loop/i)
    expect(localMock.getItem('bs_oauth_code_verifier')).toBe(firstVerifier)
    expect(localMock.getItem('bs_oauth_state')).toBe(firstState)
    expect(localMock.getItem('bs_oauth_nonce')).toBe(firstNonce)
  })

  it('does NOT stamp the sentinel on prompt=none silent redirects', async () => {
    // Silent re-auth is exempt from the circuit breaker so that a
    // silent → interactive fallback on a login page is not blocked.
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite({ prompt: 'none' })
    expect(localMock.getItem('bs_oauth_last_redirect_at')).toBeNull()
  })

  it('allows an interactive sign-in immediately after a prompt=none silent redirect', async () => {
    // Scenario: BSU returned error=login_required from a silent attempt, and
    // the consumer's login page now needs to redirect to the interactive
    // consent screen. The circuit breaker must NOT block this follow-up.
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite({ prompt: 'none' })
    await expect(client.signInWithBusinessSuite()).resolves.toBeUndefined()
    // But a SECOND interactive call within 10s of the first interactive one
    // still trips — the breaker still catches genuine interactive loops.
    await expect(client.signInWithBusinessSuite()).rejects.toThrow(/refusing to loop/i)
  })

  it('emits a browser-gated console.warn breadcrumb with structured context before throwing', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    await client.signInWithBusinessSuite()
    // Install the spy AFTER the first (successful) redirect so the
    // subsequent trip is the only call observed.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await expect(client.signInWithBusinessSuite()).rejects.toThrow(/refusing to loop/i)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[bs-oauth]'),
        expect.objectContaining({ key: 'bs_oauth_last_redirect_at' })
      )
    } finally {
      warnSpy.mockRestore()
    }
  })
})

// ---------------------------------------------------------------------------
// exchangeCodeForTokens — CSRF state guard + happy path
// ---------------------------------------------------------------------------

// Stage-3: PKCE state now in localStorage (not sessionStorage)
function seedPkceState(state: string, verifier: string, nonce?: string, startedAt?: number) {
  localMock.setItem('bs_oauth_state', state)
  localMock.setItem('bs_oauth_code_verifier', verifier)
  if (nonce) localMock.setItem('bs_oauth_nonce', nonce)
  // Default started_at to now so TTL guard doesn't trip unless the test overrides it
  localMock.setItem('bs_oauth_started_at', String(startedAt ?? Date.now()))
}

function tokensFixture(): BusinessSuiteTokens {
  return {
    access_token: 'access-token-xyz',
    refresh_token: 'refresh-token-xyz',
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: 'id-token-xyz',
  }
}

describe('exchangeCodeForTokens', () => {
  it('rejects when state does not match stored state (CSRF guard)', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('stored-state', 'verifier-1')
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 'wrong-state'),
    ).rejects.toThrow(/CSRF/i)
  })

  it('rejects when code_verifier is missing from storage', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    // Stage-3: state is now in localStorage; only set state (not verifier) to trigger the guard
    localMock.setItem('bs_oauth_state', 's')
    localMock.setItem('bs_oauth_started_at', String(Date.now()))
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 's'),
    ).rejects.toThrow(/PKCE/i)
  })

  it('returns tokens + verified user on success and clears PKCE localStorage keys', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('s', 'v', 'n')
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tokensFixture(),
      text: async () => JSON.stringify(tokensFixture()),
    })
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user-1',
        email: 'a@b.com',
        name: 'A B',
        client_id: CLIENT_ID,
        role: 'authenticated',
        nonce: 'n',
      },
    })
    const result = await createOAuthClient(CLIENT_ID).exchangeCodeForTokens('authcode', 's')
    expect(result.tokens.access_token).toBe('access-token-xyz')
    expect(result.user).toEqual({
      sub: 'user-1', email: 'a@b.com', name: 'A B', picture: undefined,
      client_id: CLIENT_ID, role: 'authenticated',
    })
    // Stage-3: all PKCE keys cleared from localStorage after exchange
    expect(localMock.getItem('bs_oauth_state')).toBeNull()
    expect(localMock.getItem('bs_oauth_code_verifier')).toBeNull()
    expect(localMock.getItem('bs_oauth_nonce')).toBeNull()
    expect(localMock.getItem('bs_oauth_started_at')).toBeNull()
    expect(localMock.getItem('bs_oauth_inflight_code')).toBeNull()
  })

  it('uses VITE_APP_URL for token exchange redirect_uri when configured', async () => {
    getProcessEnv().VITE_APP_URL = 'https://d.crm.crm7.app'
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('s', 'v', 'n')
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tokensFixture(),
      text: async () => JSON.stringify(tokensFixture()),
    })
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user-1',
        email: 'a@b.com',
        name: 'A B',
        client_id: CLIENT_ID,
        role: 'authenticated',
        nonce: 'n',
      },
    })
    await createOAuthClient(CLIENT_ID).exchangeCodeForTokens('authcode', 's')
    const [, init] = fetchMock.mock.calls[0]
    const body = new URLSearchParams((init as { body: string }).body)
    expect(body.get('redirect_uri')).toBe('https://d.crm.crm7.app/auth/callback')
  })

  it('uses the configured development OAuth server for token exchange and JWKS verification', async () => {
    getProcessEnv().NEXT_PUBLIC_BSU_OAUTH_SUPABASE_URL = `${DEV_BS_URL}/`
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('s', 'v', 'n')
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tokensFixture(),
      text: async () => JSON.stringify(tokensFixture()),
    })
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user-1',
        client_id: CLIENT_ID,
        role: 'authenticated',
        nonce: 'n',
      },
    })

    await createOAuthClient(CLIENT_ID).exchangeCodeForTokens('authcode', 's')

    expect(fetchMock.mock.calls[0][0]).toBe(`${DEV_BS_URL}/auth/v1/oauth/token`)
    expect(String(mockCreateRemoteJWKSet.mock.calls[0][0])).toBe(
      `${DEV_BS_URL}/auth/v1/.well-known/jwks.json`
    )
    expect(mockJwtVerify).toHaveBeenNthCalledWith(
      1,
      'access-token-xyz',
      'jwks-sentinel',
      expect.objectContaining({ issuer: `${DEV_BS_URL}/auth/v1` }),
    )
  })

  it('rejects when verifier is older than 10 minutes (TTL guard)', async () => {
    // Stage-3: PKCE state more than 10min old must be rejected
    const { createOAuthClient } = await import('../oauth-client.js')
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000
    seedPkceState('s', 'v', 'n', elevenMinutesAgo)
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 's'),
    ).rejects.toThrow(/PKCE state expired/i)
    // Cleanup: all PKCE keys should be wiped after TTL expiry
    expect(localMock.getItem('bs_oauth_state')).toBeNull()
    expect(localMock.getItem('bs_oauth_code_verifier')).toBeNull()
    expect(localMock.getItem('bs_oauth_started_at')).toBeNull()
    expect(localMock.getItem('bs_oauth_inflight_code')).toBeNull()
  })

  it('is idempotent for the same code — second call throws InflightInProgress', async () => {
    // Stage-3: inflight-code sentinel prevents duplicate exchange of a single-use code
    const { createOAuthClient } = await import('../oauth-client.js')
    // Seed the inflight sentinel directly (simulates a second call after the first already started)
    localMock.setItem('bs_oauth_inflight_code', 'authcode')
    seedPkceState('s', 'v', 'n')
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('authcode', 's'),
    ).rejects.toThrow(/Code exchange already in progress/i)
  })

  it('raises with server body when token endpoint returns non-OK', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('s', 'v')
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => 'invalid_grant',
    })
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 's'),
    ).rejects.toThrow(/Token exchange failed: 400 invalid_grant/)
  })

  it('rejects when id_token nonce does not match stored nonce', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('s', 'v', 'expected-nonce')
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => tokensFixture(),
      text: async () => '',
    })
    mockJwtVerify
      .mockResolvedValueOnce({ payload: { sub: 'u', nonce: 'expected-nonce' } }) // verifyAccessToken
      .mockResolvedValueOnce({ payload: { sub: 'u', nonce: 'WRONG-NONCE' } }) // verifyIdToken
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 's'),
    ).rejects.toThrow(/nonce mismatch/i)
  })

  // 0.2.3: ID token aud must be the CLIENT_ID, NOT 'authenticated'.
  // Per Supabase OAuth Flows §6 + OIDC Core 1.0 §3.1.3.7. Regression guard for
  // the crm.crm7.app/auth/callback failure on 2026-05-07 where verifyIdToken
  // was passing audience: 'authenticated' and Supabase rejected with
  // "unexpected 'aud' claim value" once it began enforcing audience strictly.
  it('verifies id_token with audience=clientId, NOT "authenticated"', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    seedPkceState('s', 'v', 'nonce-x')
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => tokensFixture(),
      text: async () => '',
    })
    mockJwtVerify
      .mockResolvedValueOnce({ payload: { sub: 'u', client_id: CLIENT_ID, role: 'authenticated' } }) // verifyAccessToken
      .mockResolvedValueOnce({ payload: { sub: 'u', nonce: 'nonce-x' } }) // verifyIdToken

    await createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 's')

    // First call: verifyAccessToken — audience canonical 'authenticated'
    expect(mockJwtVerify).toHaveBeenNthCalledWith(
      1,
      'access-token-xyz',
      'jwks-sentinel',
      expect.objectContaining({ audience: 'authenticated' }),
    )
    // Second call: verifyIdToken — audience MUST be CLIENT_ID (NOT 'authenticated')
    expect(mockJwtVerify).toHaveBeenNthCalledWith(
      2,
      'id-token-xyz',
      'jwks-sentinel',
      expect.objectContaining({ audience: CLIENT_ID }),
    )
  })
})

// ---------------------------------------------------------------------------
// refreshBusinessSuiteToken
// ---------------------------------------------------------------------------

describe('refreshBusinessSuiteToken', () => {
  it('returns fresh tokens + verified user on success', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => tokensFixture(),
      text: async () => '',
    })
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'u1', client_id: CLIENT_ID } })
    const { tokens, user } = await createOAuthClient(CLIENT_ID).refreshBusinessSuiteToken('rt-old')
    expect(tokens.access_token).toBe('access-token-xyz')
    expect(user.sub).toBe('u1')
  })

  it('raises with status + body when refresh endpoint returns non-OK', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    fetchMock.mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({}),
      text: async () => 'invalid_grant',
    })
    await expect(
      createOAuthClient(CLIENT_ID).refreshBusinessSuiteToken('bad-rt'),
    ).rejects.toThrow(/Token refresh failed: 401/)
  })

  it('posts grant_type=refresh_token + client_id to /auth/v1/oauth/token', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => tokensFixture(),
      text: async () => '',
    })
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'u' } })
    await createOAuthClient(CLIENT_ID).refreshBusinessSuiteToken('rt-123')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BS_URL}/auth/v1/oauth/token`)
    const body = new URLSearchParams(init.body as string)
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('rt-123')
    expect(body.get('client_id')).toBe(CLIENT_ID)
  })
})

// ---------------------------------------------------------------------------
// verifyAccessToken — direct
// ---------------------------------------------------------------------------

describe('verifyAccessToken', () => {
  it('calls jose.jwtVerify with BS issuer + authenticated audience and maps payload', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: 'user-42', email: 'x@y.com', name: 'X Y', picture: 'https://p',
        client_id: CLIENT_ID, role: 'authenticated',
      },
    })
    const user = await createOAuthClient(CLIENT_ID).verifyAccessToken('tkn')
    expect(mockJwtVerify).toHaveBeenCalledWith('tkn', 'jwks-sentinel', {
      issuer: `${BS_URL}/auth/v1`,
      audience: 'authenticated',
    })
    expect(user).toEqual({
      sub: 'user-42', email: 'x@y.com', name: 'X Y', picture: 'https://p',
      client_id: CLIENT_ID, role: 'authenticated',
    })
  })

  it('caches the JWKS set across verifyAccessToken calls', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'u' } })
    const client = createOAuthClient(CLIENT_ID)
    await client.verifyAccessToken('t1')
    await client.verifyAccessToken('t2')
    await client.verifyAccessToken('t3')
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// getUserInfo
// ---------------------------------------------------------------------------

describe('getUserInfo', () => {
  it('GETs /auth/v1/oauth/userinfo with Bearer auth and returns the body', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ sub: 'u', email: 'e' }),
      text: async () => '',
    })
    const info = await createOAuthClient(CLIENT_ID).getUserInfo('access-abc')
    expect(info).toEqual({ sub: 'u', email: 'e' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BS_URL}/auth/v1/oauth/userinfo`)
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer access-abc')
  })

  it('raises with status + body when userinfo endpoint returns non-OK', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    fetchMock.mockResolvedValue({
      ok: false, status: 403, json: async () => ({}), text: async () => 'insufficient_scope',
    })
    await expect(
      createOAuthClient(CLIENT_ID).getUserInfo('t'),
    ).rejects.toThrow(/UserInfo request failed: 403 insufficient_scope/)
  })
})

// ---------------------------------------------------------------------------
// clearBSTokens
// ---------------------------------------------------------------------------

describe('clearBSTokens', () => {
  it('removes all four bs_* keys from localStorage', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_access_token', 'a')
    localMock.setItem('bs_refresh_token', 'r')
    localMock.setItem('bs_user', '{}')
    localMock.setItem('bs_id_token', 'i')
    localMock.setItem('bs_oauth_code_verifier', 'verifier')
    localMock.setItem('bs_oauth_state', 'state')
    localMock.setItem('bs_oauth_nonce', 'nonce')
    localMock.setItem('bs_oauth_started_at', String(Date.now()))
    localMock.setItem('bs_oauth_inflight_code', 'code')
    localMock.setItem('auth_return_path', '/dashboard')
    localMock.setItem('unrelated', 'keep')
    createOAuthClient(CLIENT_ID).clearBSTokens()
    expect(localMock.getItem('bs_access_token')).toBeNull()
    expect(localMock.getItem('bs_refresh_token')).toBeNull()
    expect(localMock.getItem('bs_user')).toBeNull()
    expect(localMock.getItem('bs_id_token')).toBeNull()
    expect(localMock.getItem('bs_oauth_code_verifier')).toBeNull()
    expect(localMock.getItem('bs_oauth_state')).toBeNull()
    expect(localMock.getItem('bs_oauth_nonce')).toBeNull()
    expect(localMock.getItem('bs_oauth_started_at')).toBeNull()
    expect(localMock.getItem('bs_oauth_inflight_code')).toBeNull()
    expect(localMock.getItem('auth_return_path')).toBeNull()
    expect(localMock.getItem('unrelated')).toBe('keep')
  })

  it('also clears the redirect-loop sentinel so a fresh sign-in after sign-out is not blocked', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    // Pre-condition: a recent redirect has stamped the sentinel.
    localMock.removeItem('bs_oauth_last_redirect_at')
    await client.signInWithBusinessSuite()
    expect(localMock.getItem('bs_oauth_last_redirect_at')).not.toBeNull()
    // clearBSTokens must wipe the sentinel as part of its contract, so the
    // user's next explicit Sign-In click isn't rejected by the breaker.
    client.clearBSTokens()
    expect(localMock.getItem('bs_oauth_last_redirect_at')).toBeNull()
    // And a subsequent sign-in must succeed (no breaker trip).
    await expect(client.signInWithBusinessSuite()).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// attemptSilentAuth
// ---------------------------------------------------------------------------

describe('attemptSilentAuth', () => {
  beforeEach(() => {
    // Ensure the redirect-loop circuit breaker timestamp is cleared so the
    // slow-path tests below can trigger signInWithBusinessSuite freely.
    localMock.removeItem('bs_oauth_last_redirect_at')
  })

  it('returns true immediately when an access token is already stored', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_access_token', 'existing')
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    expect(result).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    // Should NOT redirect — fast path wins.
    expect(window.location.href).toBe('')
  })

  it('redirects to /oauth/authorize?prompt=none when no tokens are stored', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    // The redirect happens via window.location.href = ...
    // In jsdom this does not navigate, so the function falls through and returns false.
    expect(result).toBe(false)
    const href = window.location.href
    expect(href.startsWith(`${BS_URL}/auth/v1/oauth/authorize?`)).toBe(true)
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('prompt')).toBe('none')
  })

  it('refreshes + persists + returns true when only a refresh token is stored', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_refresh_token', 'rt')
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: async () => tokensFixture(),
      text: async () => '',
    })
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'u1' } })
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    expect(result).toBe(true)
    expect(localMock.getItem('bs_access_token')).toBe('access-token-xyz')
    expect(localMock.getItem('bs_refresh_token')).toBe('refresh-token-xyz')
    expect(localMock.getItem('bs_id_token')).toBe('id-token-xyz')
    expect(JSON.parse(localMock.getItem('bs_user')!)).toEqual({ sub: 'u1' })
  })

  it('falls through to prompt=none redirect when refresh fails', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_refresh_token', 'rt-bad')
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid_grant', json: async () => ({}) })
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    expect(result).toBe(false)
    // Should have redirected to the OAuth Server with prompt=none.
    const href = window.location.href
    expect(href).toContain('/auth/v1/oauth/authorize?')
    expect(href).toContain('prompt=none')
  })

  it('returns false (does not throw) when the redirect-loop circuit breaker trips on the slow path', async () => {
    // End-to-end contract: attemptSilentAuth's slow path invokes
    // signInWithBusinessSuite({ prompt: 'none' }). If the circuit breaker
    // throws (because a redirect already happened <10s ago), the slow
    // path must swallow the error and return `false` so callers can fall
    // back to the explicit interactive login UI instead of crashing.
    const { createOAuthClient } = await import('../oauth-client.js')
    const client = createOAuthClient(CLIENT_ID)
    // Prime the sentinel to simulate "we just redirected a moment ago".
    localMock.setItem('bs_oauth_last_redirect_at', String(Date.now()))
    // Silence the breadcrumb since a trip is expected inside this test.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = await client.attemptSilentAuth()
      expect(result).toBe(false)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('forwards returnTo to the prompt=none redirect via auth_return_path', async () => {
    // Stage-3: auth_return_path now in localStorage (not sessionStorage)
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).attemptSilentAuth({ returnTo: '/projects/42' })
    expect(localMock.getItem('auth_return_path')).toBe('/projects/42')
  })
})

// ---------------------------------------------------------------------------
// startBSTokenRefresh — interval schedule + cleanup
// ---------------------------------------------------------------------------

describe('startBSTokenRefresh', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns a cleanup function that stops the interval', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const stop = createOAuthClient(CLIENT_ID).startBSTokenRefresh()
    const spy = vi.spyOn(globalThis, 'clearInterval')
    stop()
    expect(spy).toHaveBeenCalled()
  })

  it('no-op on immediate check when no tokens are stored', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    createOAuthClient(CLIENT_ID).startBSTokenRefresh()
    await vi.runOnlyPendingTimersAsync()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears remaining BS tokens and emits an expiry event when another tab removes bs_access_token', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_access_token', 'access-old')
    localMock.setItem('bs_refresh_token', 'refresh-old')
    localMock.setItem('bs_user', '{"sub":"u"}')
    localMock.setItem('bs_id_token', 'id-old')
    const events: Array<CustomEvent<{ reason: string }>> = []
    window.addEventListener('bs-oauth-expired', ((event: CustomEvent<{ reason: string }>) => {
      events.push(event)
    }) as EventListener)

    const stop = createOAuthClient(CLIENT_ID).startBSTokenRefresh()
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'bs_access_token',
      oldValue: 'access-old',
      newValue: null,
    }))

    expect(localMock.getItem('bs_access_token')).toBeNull()
    expect(localMock.getItem('bs_refresh_token')).toBeNull()
    expect(localMock.getItem('bs_user')).toBeNull()
    expect(localMock.getItem('bs_id_token')).toBeNull()
    expect(events.map((event) => event.detail.reason)).toContain('cross_tab_logout')
    stop()
  })

  it('cleanup removes the cross-tab storage listener', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const stop = createOAuthClient(CLIENT_ID).startBSTokenRefresh()
    stop()

    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('emits refresh_rejected before clearing tokens when OAuth refresh returns 4xx', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    localMock.setItem('bs_access_token', `header.${expiredPayload}.signature`)
    localMock.setItem('bs_refresh_token', 'refresh-old')
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'invalid_grant',
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const events: Array<CustomEvent<{ reason: string }>> = []
    window.addEventListener('bs-oauth-expired', ((event: CustomEvent<{ reason: string }>) => {
      events.push(event)
    }) as EventListener)

    try {
      const stop = createOAuthClient(CLIENT_ID).startBSTokenRefresh()
      await vi.runOnlyPendingTimersAsync()
      stop()
    } finally {
      warnSpy.mockRestore()
    }

    expect(fetchMock).toHaveBeenCalled()
    expect(localMock.getItem('bs_access_token')).toBeNull()
    expect(localMock.getItem('bs_refresh_token')).toBeNull()
    expect(events.map((event) => event.detail.reason)).toContain('refresh_rejected')
  })
})
