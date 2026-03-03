import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** BSU login URL for cross-app SSO redirects. */
const BSU_LOGIN_URL = 'https://suite.crm7.app/login'

export async function updateSession(request: NextRequest) {
  // Skip /auth/callback to prevent cookie race during token exchange
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  // Only apply .crm7.app cookie domain when running on that TLD
  const hostname = request.headers.get('host') ?? ''
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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          )
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

  return supabaseResponse
}
