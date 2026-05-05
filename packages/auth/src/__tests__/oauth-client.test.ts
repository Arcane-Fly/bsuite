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
const mockCreateRemoteJWKSet = vi.fn(() => 'jwks-sentinel')

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

let localMock = makeStorageMock()
let sessionMock = makeStorageMock()
let fetchMock: ReturnType<typeof vi.fn>
let originalLocation: Location

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
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
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
    expect(sessionMock.getItem('bs_oauth_code_verifier')).toMatch(/^[0-9a-f]+$/)
    expect(sessionMock.getItem('bs_oauth_state')).toMatch(/^[0-9a-f]+$/)
    expect(sessionMock.getItem('bs_oauth_nonce')).toMatch(/^[0-9a-f]+$/)
  })

  it('state and nonce are distinct values', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    await createOAuthClient(CLIENT_ID).signInWithBusinessSuite()
    const state = sessionMock.getItem('bs_oauth_state')
    const nonce = sessionMock.getItem('bs_oauth_nonce')
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
    expect(params.get('state')).toBe(sessionMock.getItem('bs_oauth_state'))
    expect(params.get('nonce')).toBe(sessionMock.getItem('bs_oauth_nonce'))
  })
})

// ---------------------------------------------------------------------------
// exchangeCodeForTokens — CSRF state guard + happy path
// ---------------------------------------------------------------------------

function seedPkceState(state: string, verifier: string, nonce?: string) {
  sessionMock.setItem('bs_oauth_state', state)
  sessionMock.setItem('bs_oauth_code_verifier', verifier)
  if (nonce) sessionMock.setItem('bs_oauth_nonce', nonce)
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
    sessionMock.setItem('bs_oauth_state', 's')
    await expect(
      createOAuthClient(CLIENT_ID).exchangeCodeForTokens('code', 's'),
    ).rejects.toThrow(/PKCE/i)
  })

  it('returns tokens + verified user on success and clears PKCE session storage', async () => {
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
    expect(sessionMock.getItem('bs_oauth_state')).toBeNull()
    expect(sessionMock.getItem('bs_oauth_code_verifier')).toBeNull()
    expect(sessionMock.getItem('bs_oauth_nonce')).toBeNull()
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
    localMock.setItem('unrelated', 'keep')
    createOAuthClient(CLIENT_ID).clearBSTokens()
    expect(localMock.getItem('bs_access_token')).toBeNull()
    expect(localMock.getItem('bs_refresh_token')).toBeNull()
    expect(localMock.getItem('bs_user')).toBeNull()
    expect(localMock.getItem('bs_id_token')).toBeNull()
    expect(localMock.getItem('unrelated')).toBe('keep')
  })
})

// ---------------------------------------------------------------------------
// attemptSilentAuth
// ---------------------------------------------------------------------------

describe('attemptSilentAuth', () => {
  it('returns true immediately when an access token is already stored', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_access_token', 'existing')
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    expect(result).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false when neither token is stored', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    expect(result).toBe(false)
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

  it('returns false and never throws when refresh fails', async () => {
    const { createOAuthClient } = await import('../oauth-client.js')
    localMock.setItem('bs_refresh_token', 'rt-bad')
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid_grant', json: async () => ({}) })
    const result = await createOAuthClient(CLIENT_ID).attemptSilentAuth()
    expect(result).toBe(false)
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
})
