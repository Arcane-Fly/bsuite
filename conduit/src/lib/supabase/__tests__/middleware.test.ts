import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — must be declared before importing the module under test
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// Lightweight mock implementations for NextRequest / NextResponse.
// We avoid importing the real next/server since it pulls in the full
// Next.js runtime which is unavailable in a pure Vitest environment.

class MockURL {
  pathname: string
  searchParams: URLSearchParams
  origin: string

  constructor(url: string, base?: string) {
    const full = base && !url.startsWith('http') ? `${base}${url}` : url
    const parsed = new URL(full)
    this.pathname = parsed.pathname
    this.searchParams = parsed.searchParams
    this.origin = parsed.origin
  }

  get search(): string {
    const qs = this.searchParams.toString()
    return qs ? `?${qs}` : ''
  }

  get href(): string {
    return `${this.origin}${this.pathname}${this.search}`
  }

  clone(): MockURL {
    return new MockURL(this.href)
  }

  toString(): string {
    return this.href
  }
}

class MockCookies {
  private store = new Map<string, string>()

  set(name: string, value: string) {
    this.store.set(name, value)
  }

  get(name: string) {
    const value = this.store.get(name)
    return value !== undefined ? { name, value } : undefined
  }

  getAll() {
    return [...this.store.entries()].map(([name, value]) => ({ name, value }))
  }

  delete(name: string) {
    this.store.delete(name)
  }
}

function createMockRequest(pathname: string, host = 'conduit.crm7.app'): {
  nextUrl: MockURL
  cookies: MockCookies
  headers: Map<string, string>
  url: string
} {
  const nextUrl = new MockURL(`https://${host}${pathname}`)
  return {
    nextUrl,
    cookies: new MockCookies(),
    headers: new Map([['host', host]]),
    url: `https://${host}${pathname}`,
  }
}

// Track calls to NextResponse static methods
const mockNextFn = vi.fn()
const mockRedirectFn = vi.fn()

vi.mock('next/server', () => {
  const NextResponseClass = class {
    cookies: MockCookies
    headers: Map<string, string>
    status: number
    _type: string

    constructor(type: string) {
      this.cookies = new MockCookies()
      this.headers = new Map()
      this.status = 200
      this._type = type
    }

    static next(opts?: { request?: unknown }) {
      mockNextFn(opts)
      const res = new NextResponseClass('next')
      return res
    }

    static redirect(url: URL | MockURL | string) {
      const urlString = typeof url === 'string' ? url : url.toString()
      mockRedirectFn(urlString)
      const res = new NextResponseClass('redirect')
      ;(res as unknown as Record<string, unknown>).redirectUrl = urlString
      return res
    }
  }

  return {
    NextResponse: NextResponseClass,
    NextRequest: vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are registered
// ---------------------------------------------------------------------------

import { updateSession } from '../middleware'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate an authenticated Supabase user. */
function setAuthenticatedUser(userId = 'user-123') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
  })
}

/** Simulate no authenticated user. */
function setUnauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
  })
}

/**
 * Stub the `user_tenants` query to return a given portal role.
 * The mock chain replicates: supabase.from().select().eq().eq().limit().single()
 */
function setUserRole(role: string) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

/** Stub user_tenants query to return no membership (null data). */
function setNoMembership() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

/** Extract the redirect URL from the response, if present. */
function getRedirectUrl(response: unknown): string | undefined {
  return (response as Record<string, unknown>).redirectUrl as string | undefined
}

/** Check whether the response was a "next" (pass-through) vs redirect. */
function isPassthrough(response: unknown): boolean {
  return (response as Record<string, unknown>)._type === 'next'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('updateSession (middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set env vars expected by the middleware
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  // =========================================================================
  // 1. Auth callback passthrough
  // =========================================================================

  describe('auth callback bypass', () => {
    it('passes through /auth/callback without checking auth', async () => {
      const request = createMockRequest('/auth/callback')
      const response = await updateSession(request as never)

      // Should call NextResponse.next() and NOT call getUser
      expect(mockNextFn).toHaveBeenCalled()
      expect(mockGetUser).not.toHaveBeenCalled()
      expect(isPassthrough(response)).toBe(true)
    })

    it('passes through /auth/callback with query params', async () => {
      const request = createMockRequest('/auth/callback?code=abc123')
      const response = await updateSession(request as never)

      expect(mockGetUser).not.toHaveBeenCalled()
      expect(isPassthrough(response)).toBe(true)
    })
  })

  // =========================================================================
  // 2. Public routes — accessible without authentication
  // =========================================================================

  describe('public routes', () => {
    it('allows unauthenticated access to /auth routes', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/auth/login')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })

    it('allows unauthenticated access to /portal/careers', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/portal/careers')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })

    it('allows unauthenticated access to /portal/candidate', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/portal/candidate/apply')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })

    it('allows unauthenticated access to the root path /', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })
  })

  // =========================================================================
  // 3. Unauthenticated users redirected to BSU login
  // =========================================================================

  describe('unauthenticated redirect', () => {
    it('redirects unauthenticated users on protected routes to BSU login', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/candidates')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('suite.crm7.app/login')
      expect(url).toContain('return_to=conduit')
      expect(url).toContain('return_path=%2Fcandidates')
    })

    it('preserves the return path with query params in the redirect', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/jobs?status=active&page=2')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('return_to=conduit')
      // The return_path should include the query string
      expect(url).toContain('return_path=')
      expect(url).toContain('%2Fjobs')
    })

    it('redirects unauthenticated users on /settings', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('suite.crm7.app/login')
    })

    it('redirects unauthenticated users on nested protected routes', async () => {
      setUnauthenticatedUser()
      const request = createMockRequest('/candidates/new')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('suite.crm7.app/login')
    })
  })

  // =========================================================================
  // 4. Authenticated users — general route access (no special permission)
  // =========================================================================

  describe('authenticated general access', () => {
    it('allows authenticated users to access routes with no required permission', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('/candidates')
      const response = await updateSession(request as never)

      // /candidates is not in ROUTE_PERMISSIONS or WRITE_ROUTE_PATTERNS
      expect(isPassthrough(response)).toBe(true)
    })

    it('allows authenticated users to access the dashboard', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('/dashboard')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })

    it('allows authenticated users to access /jobs (view, no write permission needed)', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('/jobs')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })
  })

  // =========================================================================
  // 5. RBAC — ROUTE_PERMISSIONS (e.g., /settings requires view_settings)
  // =========================================================================

  describe('route-level RBAC (/settings)', () => {
    it('allows admin users to access /settings', async () => {
      setAuthenticatedUser()
      setUserRole('admin') // admin -> conduit_admin -> has view_settings

      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })

    it('allows recruiter (staff) to access /settings (recruiter has view_settings)', async () => {
      setAuthenticatedUser()
      setUserRole('staff') // staff -> recruiter -> has view_settings

      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })

    it('redirects viewer (guest) from /settings (no view_settings permission)', async () => {
      setAuthenticatedUser()
      setUserRole('guest') // guest -> viewer -> no view_settings

      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('/candidates')
      expect(url).toContain('error=unauthorized')
    })

    it('redirects employer (host_employer) from /settings', async () => {
      setAuthenticatedUser()
      setUserRole('host_employer') // host_employer -> employer -> no view_settings

      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('error=unauthorized')
    })

    it('redirects candidate (apprentice) from /settings', async () => {
      setAuthenticatedUser()
      setUserRole('apprentice') // apprentice -> candidate -> no view_settings

      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('error=unauthorized')
    })
  })

  // =========================================================================
  // 6. RBAC — WRITE_ROUTE_PATTERNS (granular write permissions)
  // =========================================================================

  describe('write route RBAC', () => {
    describe('/candidates/new (requires create_candidate)', () => {
      it('allows admin to create candidates', async () => {
        setAuthenticatedUser()
        setUserRole('owner') // owner -> conduit_admin -> has create_candidate

        const request = createMockRequest('/candidates/new')
        const response = await updateSession(request as never)

        expect(isPassthrough(response)).toBe(true)
      })

      it('allows recruiter to create candidates', async () => {
        setAuthenticatedUser()
        setUserRole('manager') // manager -> recruiter -> has create_candidate

        const request = createMockRequest('/candidates/new')
        const response = await updateSession(request as never)

        expect(isPassthrough(response)).toBe(true)
      })

      it('redirects viewer from /candidates/new', async () => {
        setAuthenticatedUser()
        setUserRole('guest') // guest -> viewer -> no create_candidate

        const request = createMockRequest('/candidates/new')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })

      it('redirects employer from /candidates/new', async () => {
        setAuthenticatedUser()
        setUserRole('host_employer') // host_employer -> employer -> no create_candidate

        const request = createMockRequest('/candidates/new')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })

      it('redirects candidate from /candidates/new', async () => {
        setAuthenticatedUser()
        setUserRole('apprentice') // apprentice -> candidate -> no create_candidate

        const request = createMockRequest('/candidates/new')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })
    })

    describe('/jobs/new (requires create_job)', () => {
      it('allows recruiter to create jobs', async () => {
        setAuthenticatedUser()
        setUserRole('staff') // staff -> recruiter -> has create_job

        const request = createMockRequest('/jobs/new')
        const response = await updateSession(request as never)

        expect(isPassthrough(response)).toBe(true)
      })

      it('redirects hiring_manager from /jobs/new (no create_job)', async () => {
        // hiring_manager has edit_job but NOT create_job
        setAuthenticatedUser()
        // There is no portal role that maps directly to hiring_manager in
        // DEFAULT_ROLE_MAPPING, but we can test via guest -> viewer
        setUserRole('guest') // guest -> viewer -> no create_job

        const request = createMockRequest('/jobs/new')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })
    })

    describe('/jobs/*/edit (requires edit_job)', () => {
      it('allows admin to edit jobs', async () => {
        setAuthenticatedUser()
        setUserRole('admin') // admin -> conduit_admin -> has edit_job

        const request = createMockRequest('/jobs/abc-123/edit')
        const response = await updateSession(request as never)

        expect(isPassthrough(response)).toBe(true)
      })

      it('allows recruiter to edit jobs', async () => {
        setAuthenticatedUser()
        setUserRole('staff') // staff -> recruiter -> has edit_job

        const request = createMockRequest('/jobs/some-uuid/edit')
        const response = await updateSession(request as never)

        expect(isPassthrough(response)).toBe(true)
      })

      it('redirects viewer from /jobs/*/edit', async () => {
        setAuthenticatedUser()
        setUserRole('guest') // guest -> viewer -> no edit_job

        const request = createMockRequest('/jobs/some-uuid/edit')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })
    })

    describe('/jobs/*/distribute (requires distribute_job)', () => {
      it('allows recruiter to distribute jobs', async () => {
        setAuthenticatedUser()
        setUserRole('manager') // manager -> recruiter -> has distribute_job

        const request = createMockRequest('/jobs/job-456/distribute')
        const response = await updateSession(request as never)

        expect(isPassthrough(response)).toBe(true)
      })

      it('redirects viewer from /jobs/*/distribute', async () => {
        setAuthenticatedUser()
        setUserRole('guest') // guest -> viewer -> no distribute_job

        const request = createMockRequest('/jobs/job-456/distribute')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })

      it('redirects employer from /jobs/*/distribute', async () => {
        setAuthenticatedUser()
        setUserRole('host_employer') // host_employer -> employer -> no distribute_job

        const request = createMockRequest('/jobs/job-456/distribute')
        const response = await updateSession(request as never)

        const url = getRedirectUrl(response)
        expect(url).toBeDefined()
        expect(url).toContain('error=unauthorized')
      })
    })
  })

  // =========================================================================
  // 7. Edge case — user with no tenant membership defaults to guest/viewer
  // =========================================================================

  describe('missing membership fallback', () => {
    it('treats users with no tenant membership as guest (viewer) for permission checks', async () => {
      setAuthenticatedUser()
      setNoMembership()

      // /settings requires view_settings — viewer does not have this
      const request = createMockRequest('/settings')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('error=unauthorized')
    })

    it('allows users with no membership to access unprotected routes', async () => {
      setAuthenticatedUser()
      // No mockFrom setup needed — /dashboard has no required permission
      const request = createMockRequest('/dashboard')
      const response = await updateSession(request as never)

      expect(isPassthrough(response)).toBe(true)
    })
  })

  // =========================================================================
  // 8. Cookie domain logic
  // =========================================================================

  describe('cookie domain handling', () => {
    it('processes requests from crm7.app domain', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('/candidates', 'conduit.crm7.app')
      const response = await updateSession(request as never)

      // Should complete without errors; cookie domain = '.crm7.app'
      expect(isPassthrough(response)).toBe(true)
    })

    it('processes requests from non-crm7.app domain (e.g., localhost)', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('/candidates', 'localhost:3000')
      const response = await updateSession(request as never)

      // Should complete without errors; cookie domain = undefined
      expect(isPassthrough(response)).toBe(true)
    })
  })

  // =========================================================================
  // 9. Supabase client creation
  // =========================================================================

  describe('Supabase client configuration', () => {
    it('creates a Supabase client with correct env vars', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      setAuthenticatedUser()

      const request = createMockRequest('/candidates')
      await updateSession(request as never)

      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          auth: { flowType: 'pkce' },
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        }),
      )
    })

    it('trims whitespace from env vars', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      process.env.NEXT_PUBLIC_SUPABASE_URL = '  https://test.supabase.co  '
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  test-anon-key  '

      setAuthenticatedUser()
      const request = createMockRequest('/candidates')
      await updateSession(request as never)

      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.any(Object),
      )
    })
  })

  // =========================================================================
  // 10. matchWriteRoute — pattern matching specificity
  // =========================================================================

  describe('write route pattern matching', () => {
    it('does not match partial path prefixes (e.g., /candidates/new-feature)', async () => {
      // /candidates/new-feature should NOT match /candidates/new because
      // the regex expects /candidates/new followed by / or end-of-string.
      // However, "new-feature" does start with "new" and the char after is '-',
      // not '/' — let's verify the middleware's exact regex behavior.
      setAuthenticatedUser()
      setUserRole('guest') // viewer — no create_candidate

      const request = createMockRequest('/candidates/new-feature')
      const response = await updateSession(request as never)

      // The regex is: /^\/candidates\/new(\/|$)/
      // '/candidates/new-feature' does NOT match because after 'new' comes '-', not '/' or end
      // So no permission is required => passes through
      expect(isPassthrough(response)).toBe(true)
    })

    it('matches /candidates/new/ (with trailing slash)', async () => {
      setAuthenticatedUser()
      setUserRole('guest') // viewer — no create_candidate

      const request = createMockRequest('/candidates/new/')
      const response = await updateSession(request as never)

      // The regex matches trailing slash, so permission is checked -> unauthorized
      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('error=unauthorized')
    })

    it('matches /jobs/uuid-here/edit with any UUID slug', async () => {
      setAuthenticatedUser()
      setUserRole('guest') // viewer — no edit_job

      const request = createMockRequest('/jobs/550e8400-e29b-41d4-a716-446655440000/edit')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      expect(url).toContain('error=unauthorized')
    })

    it('does not match /jobs/edit (missing wildcard segment)', async () => {
      setAuthenticatedUser()
      // No role setup needed — this path should not trigger permission check
      const request = createMockRequest('/jobs/edit')
      const response = await updateSession(request as never)

      // /jobs/edit doesn't match /jobs/*/edit (needs a segment between)
      // so it falls through as unprotected
      expect(isPassthrough(response)).toBe(true)
    })
  })

  // =========================================================================
  // 11. User tenant query structure
  // =========================================================================

  describe('user_tenants query', () => {
    it('queries user_tenants with correct filters for permission-gated routes', async () => {
      setAuthenticatedUser('user-abc')
      const chain = setUserRole('admin')

      const request = createMockRequest('/settings')
      await updateSession(request as never)

      expect(mockFrom).toHaveBeenCalledWith('user_tenants')
      expect(chain.select).toHaveBeenCalledWith('role')
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-abc')
      expect(chain.eq).toHaveBeenCalledWith('status', 'active')
      expect(chain.limit).toHaveBeenCalledWith(1)
      expect(chain.single).toHaveBeenCalled()
    })

    it('does not query user_tenants for non-permission-gated routes', async () => {
      setAuthenticatedUser()
      const request = createMockRequest('/candidates')
      await updateSession(request as never)

      // /candidates has no required permission, so no DB query needed
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 12. Redirect URL structure for unauthorized
  // =========================================================================

  describe('unauthorized redirect structure', () => {
    it('redirects to /candidates with error=unauthorized param', async () => {
      setAuthenticatedUser()
      setUserRole('guest') // viewer — no view_settings

      const request = createMockRequest('/settings/team')
      const response = await updateSession(request as never)

      const url = getRedirectUrl(response)
      expect(url).toBeDefined()
      // Should redirect to /candidates (the default fallback)
      expect(url).toContain('/candidates')
      expect(url).toContain('error=unauthorized')
    })
  })

  // =========================================================================
  // 13. All portal role mappings
  // =========================================================================

  describe('portal role to conduit role mapping integration', () => {
    const writeRoute = '/candidates/new'

    it.each([
      // [portalRole, shouldBeAllowed]
      ['owner', true],     // conduit_admin -> has create_candidate
      ['admin', true],     // conduit_admin -> has create_candidate
      ['manager', true],   // recruiter -> has create_candidate
      ['staff', true],     // recruiter -> has create_candidate
      ['guest', false],    // viewer -> no create_candidate
      ['host_employer', false],     // employer -> no create_candidate
      ['training_provider', false], // viewer -> no create_candidate
      ['apprentice', false],        // candidate -> no create_candidate
    ] as const)(
      'portal role "%s" %s create candidates',
      async (portalRole: string, shouldBeAllowed: boolean) => {
        setAuthenticatedUser()
        setUserRole(portalRole)

        const request = createMockRequest(writeRoute)
        const response = await updateSession(request as never)

        if (shouldBeAllowed) {
          expect(isPassthrough(response)).toBe(true)
        } else {
          const url = getRedirectUrl(response)
          expect(url).toBeDefined()
          expect(url).toContain('error=unauthorized')
        }
      },
    )
  })
})
