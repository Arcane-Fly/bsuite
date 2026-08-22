---
kind: record
authority: none
owner: bsuite-lane
verdict: reference
---

# Supabase Authentication Research for JavaScript/TypeScript Applications

> # VERDICT: REFERENCE — recorded 2026-08-22
>
> Supabase authentication research. Background reading, not a plan and not a decision record.
> Where it conflicts with `docs/CONSISTENCY-REPORT.md` or the shipped `@bsuite/auth`, the
> shipped code wins.
>
> The original document is unchanged below this banner.


**Research Date:** 2026-02-12
**supabase-js version:** v2.94.0 (latest as of Feb 2026)
**Key packages:** `@supabase/supabase-js`, `@supabase/ssr`, `@supabase/auth-js`

---

## 1. Client Setup and Initialization

### Basic Initialization

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xyzcompany.supabase.co',
  'public-anon-key'
)
```

### Full Configuration Options

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key', {
  auth: {
    autoRefreshToken: true,       // Default: true. Auto-refresh session tokens
    persistSession: true,         // Default: true. Persist across browser sessions
    detectSessionInUrl: true,     // Default: true. Detect session from URL hash
    flowType: 'pkce',             // Default: 'pkce'. Options: 'pkce' | 'implicit'
    storage: window.localStorage, // Custom storage implementation
    storageKey: 'supabase-auth-token', // Key for session in storage
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-custom-header': 'value' },
    fetch: customFetchImplementation, // For Cloudflare Workers, service workers, etc.
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})
```

### Key Configuration Notes

- **`autoRefreshToken: true`** -- the client automatically refreshes the access token before it expires. The library does this proactively, not reactively.
- **`persistSession: true`** -- stores session in the configured `storage` (defaults to `localStorage`). Set to `false` for server-side or stateless use.
- **`detectSessionInUrl: true`** -- detects OAuth callback tokens in the URL hash after redirect. Set to `false` for extensions and non-web contexts.
- **`flowType: 'pkce'`** -- PKCE (Proof Key for Code Exchange) is recommended over implicit flow. PKCE is mandatory for SSR and more secure overall.
- **`storage`** -- must implement `getItem(key)`, `setItem(key, value)`, `removeItem(key)`. Async versions are supported.

### TypeScript with Generated Types

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

Generate types with: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > database.types.ts`

---

## 2. Session Management

### How Sessions Work

- A **session** is created when a user signs in. By default, it lasts **indefinitely** and a user can have **unlimited active sessions**.
- Sessions consist of two tokens:
  1. **Access token (JWT)** -- short-lived (default 1 hour), contains user identity and claims
  2. **Refresh token** -- long-lived unique string, used to obtain new access tokens
- The client library automatically refreshes the access token **before** it expires using the refresh token.
- Token refresh is **synchronized across tabs** using the browser's `LockManager` API.

### Session Configuration (Supabase Dashboard)

- **Time-box user sessions**: Set an inactivity timeout after which sessions are terminated.
- **Single session per user**: Only the most recent sign-in stays active; others are terminated.
- **JWT expiration time**: Minimum recommended is 5 minutes. Shorter values increase Auth server load.

**Important**: Session settings are enforced on the *next* refresh, not immediately. Actual session duration = configured timeout + JWT expiration time.

### Retrieving Sessions

```typescript
// Get current session from local storage (auto-refreshes if expired)
const { data, error } = await supabase.auth.getSession()

if (data.session) {
  console.log('Access token:', data.session.access_token)
  console.log('Refresh token:', data.session.refresh_token)
  console.log('Expires at:', new Date(data.session.expires_at * 1000))
  console.log('User:', data.session.user.email)
}
```

### getSession() vs getUser() vs getClaims()

**CRITICAL SECURITY DISTINCTION:**

| Method | Source | Network Call | Use Case |
|--------|--------|-------------|----------|
| `getSession()` | Local storage | No (unless refresh needed) | Fast, client-side UI updates |
| `getUser()` | Auth server | Always | Trusted user data on server-side |
| `getClaims(token)` | JWT verification | Depends on JWT type | New recommended approach (2025+) |

- **`getSession()`** reads from local storage. **Never trust this on the server** -- the data could be tampered with. Use only for client-side UI state.
- **`getUser()`** makes a network request to the Auth server every time. Guaranteed fresh and trustworthy. Can cause performance issues with prefetching/middleware.
- **`getClaims(token)`** -- **NEW (2025)** -- verifies the JWT using JWT Signing Keys (asymmetric RS256). Can verify locally without a network round-trip when using the new JWT Signing Keys feature. Recommended for middleware/server-side auth checks going forward.

### Setting Sessions Manually

```typescript
// Useful for browser extensions, custom auth flows
const { data, error } = await supabase.auth.setSession({
  access_token: 'your-access-token',
  refresh_token: 'your-refresh-token',
})
```

### Auto-Refresh Behavior

- The client refreshes tokens **proactively** (before expiry), not on demand.
- If auto-refresh fails (e.g., network issue), the client retries on the next API call.
- Token refresh can occur even when the tab is backgrounded (via `setInterval`).
- **Clock skew warning**: User devices can be off by minutes or hours. Don't set JWT expiry too short.
- Access tokens should be valid for **at least as long as the longest running request** in your application.

---

## 3. Auth State Change Listeners (onAuthStateChange)

### Full Event Handling

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    switch (event) {
      case 'INITIAL_SESSION':
        // Fires ONCE when subscription is created, with current session from storage
        break
      case 'SIGNED_IN':
        // Fires on every session confirmation/re-establishment
        // INCLUDING when refocusing a tab (not just initial sign-in!)
        break
      case 'SIGNED_OUT':
        // Fires when signOut() called, session expires, or sign out on another device
        break
      case 'TOKEN_REFRESHED':
        // Fires each time new access + refresh tokens are fetched
        // Extract and store the access token in memory here
        break
      case 'USER_UPDATED':
        // Fires after updateUser() completes successfully
        break
      case 'PASSWORD_RECOVERY':
        // Fires when user lands on page with password recovery link in URL
        break
      case 'MFA_CHALLENGE_VERIFIED':
        // Fires after MFA challenge completed
        break
    }
  }
)

// CRITICAL: Clean up when done (component unmount, etc.)
subscription.unsubscribe()
```

### Critical Rules for onAuthStateChange

1. **Never use async callbacks directly.** This can cause deadlocks. If you need async operations, dispatch them via `setTimeout`:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // BAD: async callback
  // const data = await fetchSomething()

  // GOOD: dispatch async work
  setTimeout(async () => {
    const data = await fetchSomething()
  }, 0)
})
```

2. **Do not call other Supabase functions directly inside the callback.** Dispatch them after the callback finishes.

3. **Events fire frequently** -- `SIGNED_IN` fires every time a tab is refocused, not just on actual sign-in. Use efficient callbacks.

4. **Extract the access token on `TOKEN_REFRESHED`** and store it in memory rather than calling `getSession()` frequently.

5. **Events synchronize across tabs** -- sign out in one tab triggers `SIGNED_OUT` in all tabs.

6. **Always unsubscribe** when the component unmounts to prevent memory leaks.

---

## 4. Browser Extension Best Practices (Chrome MV3)

### Known Issues and Challenges

#### Issue 1: XMLHttpRequest Not Available in Service Workers
**Problem:** Older versions of `supabase-js` (and some bundled versions) used `XMLHttpRequest` internally, which is not available in MV3 service workers.
**Solution:** Use `supabase-js` v2.x+ which uses `fetch` by default. If still seeing this, provide a custom `fetch` in the global options.

**GitHub Discussion #6527** (supabase/supabase) documents this extensively.

#### Issue 2: Service Worker Lifecycle (5-minute Shutdown)
**Problem:** MV3 service workers shut down after ~5 minutes of inactivity. All in-memory state is lost, including Supabase client instances and `onAuthStateChange` listeners.
**Solution:**
- Persist sessions to `chrome.storage.local` (not `localStorage`, which is unavailable in service workers)
- Re-initialize the Supabase client on every service worker wake-up
- Register `onAuthStateChange` synchronously at the top level of the service worker

#### Issue 3: Token Refresh Race Conditions
**Problem:** After `TOKEN_REFRESHED`, the refreshed tokens may not be properly persisted to `chrome.storage.local`, making the old refresh token invalid. API calls hang silently after token refresh.
**Solution:** Always persist the full session in the `onAuthStateChange` listener:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
    chrome.storage.local.set({ 'supabase_session': session })
  }
  if (event === 'SIGNED_OUT') {
    chrome.storage.local.remove('supabase_session')
  }
})
```

#### Issue 4: No `localStorage` in Service Workers
**Problem:** `localStorage` is not available in service workers. The default Supabase storage adapter fails.
**Solution:** Use a custom storage adapter backed by `chrome.storage.local`:

### Custom Chrome Storage Adapter (Recommended Pattern)

```typescript
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? null)
      })
    })
  },
  setItem: async (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve())
    })
  },
  removeItem: async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => resolve())
    })
  },
}
```

### Recommended Extension Client Initialization

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // IMPORTANT: disable for extensions
    flowType: 'pkce',
    storageKey: 'supabase-auth',
  },
  global: {
    headers: { 'X-Client-Info': 'chrome-extension' },
  },
})
```

### OAuth in Extensions (Google, GitHub, etc.)

The standard `signInWithOAuth` redirect flow doesn't work directly in extensions. The recommended approach from the community blog post (pustelto.com/blog/supabase-auth/):

1. Use `chrome.identity.getRedirectURL()` as the redirect URL
2. Open a new tab for the OAuth flow (or use `chrome.identity.launchWebAuthFlow`)
3. Listen for tab URL changes with `chrome.tabs.onUpdated`
4. Extract tokens from the redirect URL hash
5. Call `supabase.auth.setSession()` with the extracted tokens
6. Persist the session to `chrome.storage.local`

```typescript
// In background service worker
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url?.startsWith(chrome.identity.getRedirectURL())) {
    finishOAuthSignIn(changeInfo.url)
  }
})

async function finishOAuthSignIn(url: string) {
  const hashParams = new URLSearchParams(new URL(url).hash.substring(1))
  const access_token = hashParams.get('access_token')
  const refresh_token = hashParams.get('refresh_token')

  if (!access_token || !refresh_token) throw new Error('No tokens found')

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })

  if (error) throw error
  await chrome.storage.local.set({ session: data.session })
}
```

### Required Extension Permissions

```json
{
  "permissions": ["identity", "tabs", "storage"]
}
```

### Session Sharing Across Extension Contexts

The biggest challenge is sharing auth state between:
- **Background service worker** (has `chrome.storage.local`, no `localStorage`)
- **Popup/Options pages** (have both `localStorage` and `chrome.storage.local`)
- **Content scripts** (no `chrome.storage.local`, no `localStorage` of extension origin)

**Recommended pattern:**
- Use `chrome.storage.local` as the single source of truth
- Each context creates its own Supabase client with the `chromeStorageAdapter`
- Content scripts communicate via `chrome.runtime.sendMessage` to get session from service worker
- Use `chrome.storage.onChanged` to detect session updates across contexts

### Known Bug: createClient Crashes on Empty Storage

**GitHub Issue #2030 (supabase-js):** When using a custom async storage adapter and storage is empty/freshly cleared (e.g., after logout), `createClient` can throw during `_initSupabaseAuthClient`. Wrap initialization in try-catch:

```typescript
function initSupabase() {
  try {
    return createClient(URL, KEY, {
      auth: { storage: chromeStorageAdapter },
    })
  } catch (error) {
    console.error('Supabase init failed:', error)
    return null // Treat as "not logged in"
  }
}
```

---

## 5. Common Pitfalls and Error Handling

### Pitfall 1: Trusting getSession() on the Server

`getSession()` reads from local storage and **can be tampered with**. Never use it for authorization decisions on the server. Use `getUser()` or `getClaims()` instead.

### Pitfall 2: SIGNED_IN Fires on Tab Refocus

`SIGNED_IN` fires not only on actual sign-in but also when a tab is refocused and the session is re-established. Don't treat every `SIGNED_IN` event as a new login. Check the user object to detect genuine new sign-ins.

### Pitfall 3: Stale JWT Claims

JWT claims are embedded at token creation time. If you update `app_metadata` (e.g., remove a user from a team), the change won't be reflected in `auth.jwt()` until the token is refreshed. This affects RLS policies that rely on JWT claims.

### Pitfall 4: Cookie Size Limits (SSR)

If using cookies to store JWTs, browsers limit cookies to ~4096 bytes. Keep JWT payloads small -- don't stuff excessive metadata into `app_metadata`.

### Pitfall 5: Parallel Token Refresh Across Tabs

Without the `LockManager` API (older browsers), multiple tabs can attempt to refresh the token simultaneously, causing race conditions where one tab's refresh invalidates another's refresh token. Modern `supabase-js` handles this, but custom implementations must be careful.

### Pitfall 6: Async Callbacks in onAuthStateChange

Using async functions directly as the callback can cause deadlocks. Always use `setTimeout` to dispatch async work.

### Pitfall 7: Missing Unsubscribe

Forgetting to call `subscription.unsubscribe()` leads to memory leaks and multiple handlers firing.

### Pitfall 8: Service Role Key Exposure

**Never expose `service_role` keys** on the frontend or in browser extensions. The `service_role` key bypasses RLS entirely. Only use `anon` (public) key in client-side code.

### Error Handling Pattern

```typescript
// Comprehensive error handling
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
})

if (error) {
  switch (error.status) {
    case 400:
      // Invalid credentials, validation error
      break
    case 422:
      // Email not confirmed, user already exists, etc.
      break
    case 429:
      // Rate limited
      break
    default:
      // Unknown error
      console.error('Auth error:', error.message)
  }
}
```

---

## 6. JWT Token Handling

### JWT Structure

Supabase access tokens are standard JWTs with three parts: Header.Payload.Signature

Key claims in the payload:
- **`iss`** -- Issuer (your Supabase Auth URL). Append `/.well-known/jwks.json` for public keys.
- **`sub`** -- User's unique UUID
- **`exp`** -- Expiration timestamp
- **`role`** -- Postgres role for RLS (`authenticated`, `anon`, `service_role`)
- **`aal`** -- Authentication Assurance Level (`aal1`, `aal2` for MFA)
- **`session_id`** -- Unique session identifier
- **`app_metadata`** -- Server-set metadata (immutable by user)
- **`user_metadata`** -- User-settable metadata

### JWT Signing Keys (New in 2025)

Supabase now supports **asymmetric JWT signing** (RS256) via JWT Signing Keys:

- **Old method**: Symmetric HS256 with a shared `JWT_SECRET`. Both signing and verification require the same secret.
- **New method**: Asymmetric RS256 with public/private key pairs. Private key stays on Auth server; public key is distributed for verification.

**Benefits:**
- Verify JWTs **locally** without network round-trip (huge performance gain for middleware)
- Public keys available at: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- Keys are cached by Supabase Edge for 10 minutes

### Verifying JWTs (Edge Functions / Custom Servers)

```typescript
import * as jose from 'jose'

const SUPABASE_JWT_ISSUER = Deno.env.get('SUPABASE_URL') + '/auth/v1'
const SUPABASE_JWT_KEYS = jose.createRemoteJWKSet(
  new URL(Deno.env.get('SUPABASE_URL')! + '/auth/v1/.well-known/jwks.json')
)

function verifySupabaseJWT(jwt: string) {
  return jose.jwtVerify(jwt, SUPABASE_JWT_KEYS, {
    issuer: SUPABASE_JWT_ISSUER,
  })
}
```

### Using Third-Party JWTs

```typescript
const supabase = createClient('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', {
  accessToken: async () => {
    return 'your-custom-jwt-from-third-party-auth'
  },
})
```

---

## 7. Row Level Security (RLS) with Auth

### Core Concepts

RLS policies are SQL `WHERE` clauses that the database automatically applies to every query. Two built-in functions power most policies:

- **`auth.uid()`** -- Returns the UUID of the authenticated user (from JWT `sub` claim). Returns `null` for unauthenticated requests.
- **`auth.jwt()`** -- Returns the full JWT payload as JSON. Access any claim.

### Basic Policies

```sql
-- Users can only read their own data
CREATE POLICY "Users read own data"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can only insert their own data
CREATE POLICY "Users insert own data"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Users can update their own data
CREATE POLICY "Users update own data"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### Advanced Policies with JWT Claims

```sql
-- Team-based access using app_metadata
CREATE POLICY "User is in team"
ON my_table
TO authenticated
USING (team_id IN (SELECT auth.jwt() -> 'app_metadata' -> 'teams'));

-- MFA requirement for sensitive operations
CREATE POLICY "Require MFA for updates"
ON profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING ((SELECT auth.jwt() ->> 'aal') = 'aal2');

-- OAuth client-specific access
CREATE POLICY "Specific client access"
ON user_data FOR SELECT
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') = 'trusted-client-id'
);

-- Block OAuth clients from sensitive data
CREATE POLICY "Direct sessions only for payments"
ON payment_methods FOR ALL
USING (
  auth.uid() = user_id AND
  (auth.jwt() ->> 'client_id') IS NULL  -- Only direct user sessions
);
```

### RLS Performance Optimization

```sql
-- GOOD: Wrap auth functions in (select ...) to cache per-statement
CREATE POLICY "optimized_select"
ON test_table
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Add indexes on columns used in RLS policies
CREATE INDEX idx_user_id ON test_table USING btree (user_id);
```

The `(SELECT auth.uid())` wrapper causes Postgres to run an `initPlan`, caching the result per-statement instead of calling the function for each row. This is a significant performance improvement for large tables.

### Important RLS Gotchas

- **`raw_user_meta_data`** is updatable by the user via `supabase.auth.update()`. **Never use it for authorization.** Use `raw_app_meta_data` instead.
- **JWT staleness**: Changing `app_metadata` won't take effect until the JWT is refreshed (up to JWT expiry time).
- **Enable RLS on ALL user-facing tables.** Create an event trigger to auto-enable on new tables:

```sql
-- Auto-enable RLS on new tables
CREATE OR REPLACE FUNCTION rls_auto_enable() RETURNS event_trigger AS $$
-- ... (see Supabase docs for full implementation)
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
EXECUTE FUNCTION rls_auto_enable();
```

### Bypassing RLS (Admin Operations)

```sql
-- Grant bypass to a specific role (NEVER expose credentials to clients)
ALTER ROLE "admin_role" WITH BYPASSRLS;
```

Or create a separate Supabase client with the `service_role` key in server-side code:

```typescript
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
// This client bypasses ALL RLS policies
```

---

## 8. Edge Function Authentication Patterns

### Pattern 1: Identify User and Enforce RLS

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  )

  // RLS is automatically enforced for this client
  const { data, error } = await supabaseClient.from('profiles').select('*')
  return Response.json({ data })
})
```

### Pattern 2: Verify User + Bypass RLS

```typescript
Deno.serve(async (req: Request) => {
  // Client with user context (for identity verification)
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  // Verify the user
  const { data: { user }, error } = await userClient.auth.getUser()
  if (!user || error) {
    return Response.json({ msg: 'Unauthorized' }, { status: 401 })
  }

  // Admin client for bypassing RLS
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Use adminClient for privileged operations, but scoped to verified user
  const { data } = await adminClient
    .from('hidden_table')
    .select('*')
    .eq('user_id', user.id)

  return Response.json({ data })
})
```

### Pattern 3: JWT Verification with jose (New Recommended Pattern)

```typescript
import * as jose from 'jsr:@panva/jose@6'

const SUPABASE_JWT_ISSUER =
  Deno.env.get('SB_JWT_ISSUER') ?? Deno.env.get('SUPABASE_URL') + '/auth/v1'

const SUPABASE_JWT_KEYS = jose.createRemoteJWKSet(
  new URL(Deno.env.get('SUPABASE_URL')! + '/auth/v1/.well-known/jwks.json')
)

function getAuthToken(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) throw new Error('Missing authorization header')
  const [bearer, token] = authHeader.split(' ')
  if (bearer !== 'Bearer') throw new Error("Auth header is not 'Bearer {token}'")
  return token
}

export async function AuthMiddleware(
  req: Request,
  next: (req: Request) => Promise<Response>
) {
  if (req.method === 'OPTIONS') return await next(req)
  try {
    const token = getAuthToken(req)
    const isValidJWT = await jose.jwtVerify(token, SUPABASE_JWT_KEYS, {
      issuer: SUPABASE_JWT_ISSUER,
    })
    if (isValidJWT) return await next(req)
    return Response.json({ msg: 'Invalid JWT' }, { status: 401 })
  } catch (e) {
    return Response.json({ msg: e?.toString() }, { status: 401 })
  }
}
```

### Pattern 4: getClaims() (Simpler, Newer Pattern)

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_PUBLISHABLE_KEY')!
)

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')

  const { data, error } = await supabase.auth.getClaims(token)
  const userEmail = data?.claims?.email

  if (!userEmail || error) {
    return Response.json({ msg: 'Invalid JWT' }, { status: 401 })
  }

  return Response.json({ message: `hello ${userEmail}` })
})
```

### Edge Function Best Practices

1. **Keep functions short and stateless** (under 1s execution)
2. **Always pass `Authorization` header** to the Supabase client -- without it, the client defaults to `anon` role
3. **Use `getUser()` or `getClaims()`** for identity verification, never trust the JWT payload without verification
4. **Create a separate admin client** with `service_role` key only when you need to bypass RLS
5. **Never log JWTs or tokens** in production
6. **Handle CORS** -- check for `OPTIONS` method and return appropriate headers
7. **Offload heavy background jobs** to external queues (Upstash, SQS, Temporal)

---

## Summary of Key Recommendations for Monkey1 Browser Extension

Given that this project is a **Chrome MV3 browser extension** with service workers:

1. **Use `chrome.storage.local`** as the storage adapter (not `localStorage`)
2. **Set `detectSessionInUrl: false`** -- extensions don't have URL hash-based auth
3. **Set `flowType: 'pkce'`** for better security
4. **Persist session in `onAuthStateChange`** on every `TOKEN_REFRESHED` and `SIGNED_IN` event
5. **Re-initialize Supabase client** on every service worker wake-up (load session from `chrome.storage.local`)
6. **Use `chrome.runtime.sendMessage`** for content scripts to access auth state
7. **Wrap `createClient` in try-catch** to handle the known empty storage crash bug
8. **Never expose `service_role` key** in extension code
9. **Use the new JWT Signing Keys** for local JWT verification in Edge Functions
10. **Enable RLS on ALL tables** and use `(SELECT auth.uid())` wrapped form for performance

---

## Sources

- Supabase Docs: User Sessions -- https://supabase.com/docs/guides/auth/sessions
- Supabase Docs: JWT -- https://supabase.com/docs/guides/auth/jwts
- Supabase Docs: Securing Edge Functions -- https://supabase.com/docs/guides/functions/auth
- Supabase Docs: Legacy JWT Edge Functions -- https://supabase.com/docs/guides/functions/auth-legacy-jwt
- Supabase Docs: Row Level Security -- https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Docs: SSR Advanced Guide -- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Supabase Docs: Token Security and RLS -- https://supabase.com/docs/guides/auth/oauth-server/token-security
- GitHub Discussion #6527: Supabase in Chrome Extension MV3 Service Workers -- https://github.com/orgs/supabase/discussions/6527
- GitHub Discussion #21923: Chrome.Local.Storage Adapter Request -- https://github.com/orgs/supabase/discussions/21923
- GitHub Issue #2030: createClient crashes on empty storage -- https://github.com/supabase/supabase-js/issues/2030
- GitHub PR #570: Inconsistent auth between popup and service-worker -- https://github.com/supabase/supabase-js/pull/570
- GitHub Discussion #4400: getSession vs getUser -- https://github.com/orgs/supabase/discussions/4400
- Chromium Extensions Group: API calls fail after token refresh -- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/V2yw3PS5zOg
- Blog: How to implement Supabase auth in a browser extension -- https://pustelto.com/blog/supabase-auth/
- Blog: Supabase RLS Complete Guide 2026 -- https://designrevision.com/blog/supabase-row-level-security
- Blog: Harden Your Supabase (Pentestly) -- https://www.pentestly.io/blog/supabase-security-best-practices-2025-guide
- Video: We made Supabase Auth way faster (JWT Signing Keys) -- https://www.youtube.com/watch?v=rwnOal_xRtM
- supabase-js GitHub repo (v2.94.0) -- https://github.com/supabase/supabase-js
- Context7 documentation for /supabase/supabase-js and /websites/supabase
