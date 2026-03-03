import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { PortalRole } from '@/lib/roleMappingService'
import { mapPortalRoleToConduit } from '@/lib/roleMappingService'
import { checkPermission } from '@/hooks/usePermissions'
import type { Permission } from '@/lib/permissionConstants'

/** BSU login URL for cross-app SSO redirects. */
const BSU_LOGIN_URL = 'https://suite.crm7.app/login'

/**
 * Route permission map — maps path prefixes to required permissions.
 * Routes not listed here are accessible to all authenticated users.
 */
const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/settings': 'view_settings',
}

/**
 * Routes that require write permissions (create/edit/delete pages).
 * Viewers and candidates are blocked from these routes.
 */
const WRITE_ROUTE_PATTERNS: Array<{ pattern: string; permission: Permission }> = [
  { pattern: '/candidates/new', permission: 'create_candidate' },
  { pattern: '/jobs/new', permission: 'create_job' },
  { pattern: '/jobs/*/edit', permission: 'edit_job' },
  { pattern: '/jobs/*/distribute', permission: 'distribute_job' },
]

function matchWriteRoute(pathname: string): Permission | null {
  for (const { pattern, permission } of WRITE_ROUTE_PATTERNS) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '(/|$)')
    if (regex.test(pathname)) return permission
  }
  return null
}

export async function updateSession(request: NextRequest) {
  // Skip /auth/callback to prevent cookie race during token exchange
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  // Only apply .crm7.app cookie domain when running on that TLD
  const hostname = request.headers.get('host')?.split(':')[0] ?? ''
  const cookieDomain = (hostname === 'crm7.app' || hostname.endsWith('.crm7.app')) ? '.crm7.app' : undefined

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          }
        },
      },
    }
  )

  // Refresh session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users to BSU login (except public routes)
  const publicPaths = ['/auth', '/portal/careers', '/portal/candidate']
  const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic && request.nextUrl.pathname !== '/') {
    const returnPath = request.nextUrl.pathname + request.nextUrl.search
    const loginUrl = new URL(BSU_LOGIN_URL)
    loginUrl.searchParams.set('return_to', 'conduit')
    loginUrl.searchParams.set('return_path', returnPath)
    return NextResponse.redirect(loginUrl)
  }

  // --- RBAC: Route-level authorization for authenticated users ---
  if (user && !isPublic) {
    const pathname = request.nextUrl.pathname

    // Check if this route requires a specific permission
    const requiredPermission =
      Object.entries(ROUTE_PERMISSIONS).find(([prefix]) => pathname.startsWith(prefix))?.[1]
      ?? matchWriteRoute(pathname)

    if (requiredPermission) {
      // Fetch user's portal role from user_tenants
      const { data: membership } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single()

      const portalRole = (membership?.role as PortalRole) ?? 'guest'
      const conduitRole = mapPortalRoleToConduit(portalRole)

      if (!checkPermission(conduitRole, requiredPermission)) {
        // Redirect unauthorized users to the dashboard with an error
        const url = request.nextUrl.clone()
        url.pathname = '/candidates'
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
