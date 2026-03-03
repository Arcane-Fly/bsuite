'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Apply .crm7.app cookie domain only when running on that TLD (not localhost). */
function getCookieOptions(): Record<string, unknown> | undefined {
  if (typeof window === 'undefined') return undefined
  const hostname = window.location.hostname
  if (hostname === 'crm7.app' || hostname.endsWith('.crm7.app')) {
    return { domain: '.crm7.app', path: '/', sameSite: 'lax' as const, secure: true }
  }
  return undefined
}

export function createClient() {
  const cookieOptions = getCookieOptions()
  return createBrowserClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
    {
      auth: {
        flowType: 'pkce',
      },
      ...(cookieOptions ? { cookieOptions } : {}),
    }
  )
}
