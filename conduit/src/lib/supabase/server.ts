import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

/** Resolve cookie domain from request hostname — only set .crm7.app on production TLD. */
async function resolveCookieDomain(): Promise<string | undefined> {
  try {
    const headerStore = await headers()
    const host = headerStore.get('host') ?? ''
    if (host === 'crm7.app' || host.endsWith('.crm7.app')) return '.crm7.app'
  } catch {
    // headers() unavailable outside request context
  }
  return undefined
}

export async function createClient() {
  const cookieStore = await cookies()
  const cookieDomain = await resolveCookieDomain()

  return createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
    {
      auth: {
        flowType: 'pkce',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, {
                ...options,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              })
            }
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
