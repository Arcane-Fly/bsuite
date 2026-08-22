---
kind: record
authority: none
owner: bsuite-lane
verdict: not-this-estate
---

# Plan: Shared Cookie Domain for Cross-Subdomain Auth

> # VERDICT: NOT THIS ESTATE — recorded 2026-08-22
>
> A shared-cookie-domain plan for **fastmonkey.au** subdomains. Same provenance as
> `rustling-mapping-lemon.md` — a different product's auth architecture, recovered into this
> directory.
> >
> Worth noting for anyone who reads it as guidance: BSuite's cross-app SSO is OIDC
> `prompt=none`, explicitly **not** cookies (`docs/CONSISTENCY-REPORT.md`). Following this
> plan here would reverse a standing architectural decision.
>
> The original document is unchanged below this banner.


## Context

After authenticating on `fastmonkey.au` (monkey-oauth), users are redirected to `one.fastmonkey.au` (monkey1) or `coder.fastmonkey.au` (monkey-coder) but land on the **landing page** instead of the authenticated app.

**Root cause:** Supabase session cookies set by monkey-oauth are scoped to `fastmonkey.au` only — subdomains can't read them. monkey1 additionally uses `localStorage` instead of cookies, so even shared domain cookies wouldn't help without switching storage.

**Solution (Supabase best practice 2026):** Use `cookieOptions.domain = '.fastmonkey.au'` across all three apps so Supabase session cookies are shared across all subdomains. This is the pattern documented in [Supabase GitHub Discussion #5742](https://github.com/orgs/supabase/discussions/5742) and the `@supabase/ssr` package.

**Existing infrastructure found:** monkey-oauth's middleware already reads `NEXT_PUBLIC_COOKIE_DOMAIN` and applies it — but the env var is empty and the server/browser clients don't apply it. monkey-coder's `auth-context.tsx` already has Supabase session → backend JWT bridge logic (lines 48-61).

---

## Step 1: monkey-oauth — Complete cookie domain wiring

**Already done (middleware.ts:12,38):** `COOKIE_DOMAIN` applied via `NEXT_PUBLIC_COOKIE_DOMAIN` env var.

### 1a. Server client — apply domain to cookies

**File:** `monkey-oauth/lib/supabase/server.ts`

The `setAll` callback needs to apply the cookie domain, matching what middleware already does:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? undefined

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
              }),
            )
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    },
  )
}
```

### 1b. Browser client — apply domain to cookies

**File:** `monkey-oauth/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? undefined

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ...(COOKIE_DOMAIN ? { cookieOptions: { domain: COOKIE_DOMAIN } } : {}),
  )
}
```

### 1c. Callback route — redirect to target app's auth callback

**File:** `monkey-oauth/app/auth/callback/route.ts`

Change the external redirect from bare `target` URL to `target/auth/callback` so the target app's auth initialization runs in the callback route context (where `detectSessionInUrl` processes any hash params and the shared cookies are available):

```typescript
if (target) {
  // Redirect to target app's auth callback so its Supabase client
  // can pick up the shared session cookie
  return NextResponse.redirect(`${target}/auth/callback`)
}
```

### 1d. Set env var on Vercel

Set `NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au` on the Vercel deployment for monkey-oauth. (Leave empty for localhost dev — cookies without domain attribute default to exact hostname, which is correct for local dev.)

---

## Step 2: monkey1 — Switch from localStorage to shared cookies

### 2a. Browser client — remove localStorage, add cookie domain

**File:** `monkey1/packages/frontend/src/shared/lib/supabase-ssr.ts` (lines 200-208)

Replace:
```typescript
const client = createBrowserClient<Database>(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'monkey1-auth',
    storage: window.localStorage,
  },
});
```

With:
```typescript
const cookieDomain = import.meta.env.VITE_COOKIE_DOMAIN || undefined;
const client = createBrowserClient<Database>(url, key, {
  ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

Key changes:
- **Remove** `storage: window.localStorage` and `storageKey` — let `@supabase/ssr` use its default cookie storage
- **Add** `cookieOptions.domain` from `VITE_COOKIE_DOMAIN` env var
- **Keep** `detectSessionInUrl: true` — still needed for direct OAuth callback flows
- **Keep** `autoRefreshToken: true` — `@supabase/ssr` handles refresh via cookies client-side

### 2b. Add env var to .env.example

**File:** `monkey1/.env.example` — add under frontend section:

```
VITE_COOKIE_DOMAIN=.fastmonkey.au
```

### 2c. Set env var on Railway

Set `VITE_COOKIE_DOMAIN=.fastmonkey.au` on the monkey1 frontend Railway service.

---

## Step 3: monkey-coder — Add shared cookie domain to Supabase client

### 3a. Browser client — add cookie domain

**File:** `monkey-coder/services/frontend/src/lib/supabase/client.ts`

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key'

export const isConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
)

if (typeof window !== 'undefined' && !isConfigured) {
  console.warn(
    'Supabase URL or API key not configured. OAuth login will not work. ' +
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  )
}

export function createClient() {
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? undefined
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
    },
  })
}
```

**Note:** monkey-coder uses `@supabase/supabase-js` (not `@supabase/ssr`), so `cookieOptions` goes inside the `auth` config object, not at the top level.

### 3b. Auth callback — handle shared cookie arrival

**File:** `monkey-coder/services/frontend/src/app/auth/callback/page.tsx`

The callback currently requires `?code=` query param. When arriving from monkey-oauth via shared cookies, there's no code — but the Supabase session is already available from the shared cookie. Add a branch:

```typescript
const handleCallback = async () => {
  try {
    const { searchParams } = new URL(window.location.href)
    const code = searchParams.get('code')
    const supabase = createClient()

    if (code) {
      // PKCE flow: exchange code for session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('Auth exchange error:', exchangeError)
        setError(exchangeError.message)
        setTimeout(() => router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`), 2000)
        return
      }
    }
    // If no code, try shared cookie session (cross-subdomain redirect from monkey-oauth)

    // Bridge Supabase session to backend JWT
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      try {
        await exchangeSupabaseToken(session.access_token)
      } catch (bridgeErr) {
        console.warn('Backend token exchange failed, continuing with Supabase session:', bridgeErr)
      }
      router.push('/dashboard')
      return
    }

    // No code AND no session — authentication failed
    router.push('/login?error=no_session')
  } catch (err) {
    console.error('Unexpected error during auth callback:', err)
    setError('An unexpected error occurred during authentication')
    setTimeout(() => router.push('/login?error=unexpected'), 2000)
  }
}
```

### 3c. Add env var to .env.example

**File:** `monkey-coder/services/frontend/.env.example` — add:

```
# Cookie domain for cross-subdomain session sharing
NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au
```

### 3d. Set env var on Railway

Set `NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au` on the monkey-coder frontend Railway service.

---

## Step 4: Supabase Dashboard — Add redirect URLs

Ensure the following redirect URLs are in the Supabase project's **Redirect URLs** allow list (Authentication > URL Configuration):

- `https://fastmonkey.au/auth/callback`
- `https://one.fastmonkey.au/auth/callback`
- `https://coder.fastmonkey.au/auth/callback`
- `http://localhost:3000/auth/callback` (dev)
- `http://localhost:5173/auth/callback` (dev — Vite)

---

## Files Summary

| Repo | File | Change |
|------|------|--------|
| **monkey-oauth** | `lib/supabase/server.ts` | Add `domain: COOKIE_DOMAIN` to `setAll` cookies |
| **monkey-oauth** | `lib/supabase/client.ts` | Add `cookieOptions: { domain }` to browser client |
| **monkey-oauth** | `lib/supabase/middleware.ts` | Already done — no changes needed |
| **monkey-oauth** | `app/auth/callback/route.ts` | Redirect external targets to `/auth/callback` instead of bare URL |
| **monkey-oauth** | `.env.example` | Already has `NEXT_PUBLIC_COOKIE_DOMAIN=` — no changes needed |
| **monkey1** | `packages/frontend/src/shared/lib/supabase-ssr.ts` | Remove localStorage, add `cookieOptions.domain` from env var |
| **monkey1** | `.env.example` | Add `VITE_COOKIE_DOMAIN=.fastmonkey.au` |
| **monkey-coder** | `services/frontend/src/lib/supabase/client.ts` | Add `cookieOptions.domain` from env var |
| **monkey-coder** | `services/frontend/src/app/auth/callback/page.tsx` | Handle shared-cookie arrival (no `?code=` needed) |
| **monkey-coder** | `services/frontend/.env.example` | Add `NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au` |

**Environment variables to set (production):**
- Vercel (monkey-oauth): `NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au`
- Railway (monkey1 frontend): `VITE_COOKIE_DOMAIN=.fastmonkey.au`
- Railway (monkey-coder frontend): `NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au`

---

## Auth Flow After Changes

```
1. User visits fastmonkey.au → clicks "Monkey One"
2. Redirected to fastmonkey.au/auth/login?next=one
3. Clicks "Sign in with Google" → Google OAuth → Supabase callback
4. fastmonkey.au/auth/callback?code=AUTH_CODE&next=one
5. Server exchanges code → session stored in cookie (domain: .fastmonkey.au)
6. Redirect to one.fastmonkey.au/auth/callback
7. monkey1 loads → Supabase client reads .fastmonkey.au cookie → session found!
8. AuthContext.initializeAuth() → getSession() returns session → fetchUserFromGateway()
9. User sees /dashboard (authenticated)
```

For monkey-coder, same flow except step 8 additionally calls `exchangeSupabaseToken()` to bridge to backend JWT.

---

## Verification

1. **Build all three apps:**
   - `cd monkey-oauth && pnpm build`
   - `cd monkey1 && npx nx run frontend:build`
   - `cd monkey-coder/services/frontend && pnpm build`

2. **Local dev test** (optional — cookies without domain attr work on localhost):
   - Start monkey-oauth on localhost:3000
   - Sign in → verify cookie set without domain attr
   - Navigate to monkey1 on localhost:5173 → verify separate session (expected — no shared domain in dev)

3. **Production test:**
   - Set `NEXT_PUBLIC_COOKIE_DOMAIN=.fastmonkey.au` on Vercel + Railway
   - Deploy all three apps
   - Go to `fastmonkey.au` → sign in → click "Monkey One"
   - Verify redirect to `one.fastmonkey.au/auth/callback` → auto-logged in → `/dashboard`
   - Repeat for "Monkey Coder" → `coder.fastmonkey.au`

4. **Supabase Dashboard:** Confirm all redirect URLs are in the allow list

5. **Verify cookie inspection:**
   - In Chrome DevTools > Application > Cookies
   - After sign-in on fastmonkey.au, should see Supabase session cookie with `Domain: .fastmonkey.au`
   - Same cookie visible when on `one.fastmonkey.au` and `coder.fastmonkey.au`

6. **Sign-out propagation test:**
   - Sign out on any subdomain
   - Verify cookie cleared with matching domain
   - Other subdomains should also be signed out on next page load
