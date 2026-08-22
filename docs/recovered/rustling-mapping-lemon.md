---
kind: record
authority: none
owner: bsuite-lane
verdict: not-this-estate
---

# Auth Alignment Plan: monkey-projects + Supabase OAuth 2.1

> # VERDICT: NOT THIS ESTATE — recorded 2026-08-22
>
> An auth alignment plan for **monkey-projects / fastmonkey.au** — `monkey-oauth`, `monkey1`,
> `coder.fastmonkey.au`. None of those repos are in this estate; the submodule set is crm7,
> braden, business-suite-unified, conduit, throughput and R80.4.
> >
> FastMonkey appears in BSuite exactly twice, both in `AuthShell.tsx` COMMENTS describing an
> aesthetic influence ("matching the FastMonkey dark-mode aesthetic"). That is a design
> reference, not an integration.
> >
> Its unresolvable `monkey-oauth/...` source paths were being counted against this estate's
> doc-to-code drift. They are not broken BSuite references — they were never BSuite references.
>
> The original document is unchanged below this banner.


## Context

The FastMonkey auth architecture (single Supabase project, RS256 JWTs, cross-subdomain cookies on `.fastmonkey.au`, OAuth 2.1 consent flow) is well-designed but has consistency gaps across the three repos. monkey-oauth (Vercel) is the auth hub with working OAuth 2.1 consent; monkey1 and monkey-coder (Railway) consume it but have unsafe `getSession()` calls without `getClaims()` validation, outdated SDK versions, and missing OAuth 2.1 consumer features. This plan brings everything into alignment.

---

## Phase 1: SDK Version Alignment (unblocks all other phases)

### 1.1 Bump monkey-oauth SDK versions
- **File:** `monkey-oauth/package.json`
- Bump `@supabase/supabase-js` from `^2.49.4` to `^2.98.0`
- Bump `@supabase/ssr` from `^0.6.1` to `^0.9.0`
- Run `yarn install` and verify build

### 1.2 Bump monkey-coder SDK versions
- **File:** `monkey-coder/services/frontend/package.json`
- Bump `@supabase/supabase-js` from `^2.48.1` to `^2.98.0`
- Bump `@supabase/ssr` from `^0.8.0` to `^0.9.0`

### 1.3 Pin monkey1 API gateway
- **File:** `monkey1/packages/api-gateway/package.json`
- Change `@supabase/supabase-js` from `^2` to `^2.98.0`

---

## Phase 2: Fix `getSession()` without `getClaims()` (security fix)

**Rule:** `getClaims()` validates JWT locally via JWKS. `getSession()` does NOT revalidate. Always call `getClaims()` first.

### 2.1 monkey1 frontend — 7 unsafe `getSession()` calls

| File | Line | Fix |
|------|------|-----|
| `packages/frontend/src/context/AuthContext.tsx` | 115 | Add `getClaims()` before `getSession()` |
| `packages/frontend/src/shared/lib/supabase-ssr.ts` | 312 | Replace `getSession()` with `getClaims()` in `testSupabaseConnection()` |
| `packages/frontend/src/shared/lib/sandbox-api.ts` | 20 | Add `getClaims()` before `getSession()` |
| `packages/frontend/src/features/auth/components/ExtensionAuthBridge.tsx` | 139 | Add `getClaims()` before `getSession()` |
| `packages/frontend/src/shared/lib/supabase.ts` | 51 | Add `getClaims()` before `getSession()` |
| `packages/frontend/src/shared/lib/sse/SSEConnectionManager.tsx` | 39 | Add `getClaims()` before `getSession()` |
| `business-suite-unified/src/hooks/useSubscription.ts` | 66 | Add `getClaims()` before `getSession()` |

**Pattern:**
```typescript
// BEFORE (unsafe)
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;

// AFTER (safe)
const { error: claimsError } = await supabase.auth.getClaims();
if (claimsError) return; // JWT invalid
const { data: { session } } = await supabase.auth.getSession();
if (!session) return;
```

### 2.2 monkey1 mock client — add `getClaims()` mock
- **File:** `packages/frontend/src/shared/lib/supabase-ssr.ts`
- Add `getClaims` to `createMockSupabaseClient()` auth methods:
  ```typescript
  getClaims: async () => ({ data: null, error: { message: 'Not configured' } }),
  ```

### 2.3 monkey-coder frontend — 2 unsafe calls

| File | Line | Fix |
|------|------|-----|
| `monkey-coder/services/frontend/src/lib/auth-context.tsx` | 37 | Add `getClaims()` before `getSession()` |
| `monkey-coder/services/frontend/src/app/auth/callback/page.tsx` | 52 | Add `getClaims()` before `getSession()` |

---

## Phase 3: Shared JWKS Validation Utility

### 3.1 Extract JWKS validator from MCP server
- **Reference:** `monkey1/packages/mcp-browser-http-server/src/index.ts` lines 106-155 (already uses `jose` + `createRemoteJWKSet`)
- **New file:** `monkey1/packages/utils/src/jwks-validator.ts`
```typescript
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function validateSupabaseJWT(
  token: string,
  supabaseUrl: string,
): Promise<JWTPayload> {
  let jwks = jwksCache.get(supabaseUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    jwksCache.set(supabaseUrl, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${supabaseUrl}/auth/v1`,
    audience: 'authenticated',
  });
  return payload;
}
```

### 3.2 Add `jose` dependency to utils package
- **File:** `monkey1/packages/utils/package.json` — add `jose` dep

### 3.3 Update API gateway middleware to use JWKS fast path
- **File:** `monkey1/packages/api-gateway/src/middleware/extensionAuth.ts`
  - Import `validateSupabaseJWT` from `@monkey1/utils`
  - Try JWKS validation first (fast, no network call to Supabase)
  - Extract `user.id` and `client_id` from JWT payload
  - Fall back to `admin.auth.getUser(token)` only when full user metadata needed

### 3.4 Update subscription guard middleware
- **File:** `monkey1/packages/api-gateway/src/middleware/subscriptionGuard.ts`
  - Same JWKS fast path pattern

### 3.5 Fix misleading comment in auth routes
- **File:** `monkey1/packages/api-gateway/src/routes/auth.ts` line 8-9
  - Update comment to explain that `getUser()` is correct here (service_role context, authoritative validation for profile/metadata routes)

---

## Phase 4: Publishable Key Format Alignment

### 4.1 monkey1 frontend — add publishable key support
- **File:** `monkey1/packages/frontend/src/shared/lib/supabase-ssr.ts`
  - In `getSupabaseAnonKey()`: try `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY` first, fall back to `ANON_KEY`
  - In `hasValidSupabaseConfig()`: check publishable key vars too, accept `sb_publishable_` prefix

### 4.2 Update .env.example files
- **File:** `monkey1/.env.example` — add `VITE_SUPABASE_PUBLISHABLE_KEY` with comment
- **File:** `monkey-coder/.env.example` / `.env.railway.example` — verify consistency

### 4.3 Update shared-env-vars doc
- **File:** `fastmonkey-platform/docs/deployment/shared-env-vars.md`
  - Add `NEXT_PUBLIC_AUTH_URL` to monkey-coder section
  - Note publishable key preference across all repos

---

## Phase 5: Edge Function `client_id` Extraction

### 5.1 Extend `AuthResult` with `clientId`
- **File:** `monkey1/supabase/functions/_shared/auth.ts`
  - Add `clientId?: string` to `AuthResult` interface
  - After `getUser()` succeeds, decode JWT to extract `client_id` claim:
    ```typescript
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const clientId = payload.client_id ?? undefined;
    return { supabase, userId: user.id, clientId };
    ```

### 5.2 Edge functions: log/use `clientId` for audit
- All edge functions that call `authenticateRequest()` can now access `clientId` for logging, RLS context, or client-specific behavior

---

## Phase 6: `client_id`-Aware RLS on Data Tables

### 6.1 New migration: add restrictive RLS policies
- **New file:** `monkey1/supabase/migrations/YYYYMMDDHHMMSS_oauth_client_rls_data_tables.sql`
- **Reuse:** `public.oauth_client_permitted()` function from migration `20260217000005`
- Apply `AS RESTRICTIVE` policies to:
  - `public.conversations` — `oauth_client_permitted('monkey1', 'data:read')`
  - `public.messages` — same
  - `public.documents` — same
  - `public.document_chunks` — same
  - `public.projects` — same

**Pattern (from existing billing policies):**
```sql
CREATE POLICY "oauth_client_data_guard" ON public.conversations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.oauth_client_permitted('monkey1', 'data:read'));
```

---

## Phase 7: User Grant Management UI

### 7.1 New grants page in monkey-oauth account center
- **New file:** `monkey-oauth/app/account/grants/page.tsx`
  - Server component using `supabase.auth.oauth.getUserGrants()`
  - List: client name, scopes, granted date
  - Revoke button calls `supabase.auth.oauth.revokeGrant(clientId)`
  - Uses `getClaims()` for auth check (existing pattern from consent page)

### 7.2 Add navigation link
- **File:** `monkey-oauth/app/account/layout.tsx` — add "Authorized Apps" nav link

---

## Phase 8: MCP OAuth 2.1 Authentication

### 8.1 Enable dynamic client registration
- **Action:** Supabase Dashboard > Authentication > OAuth Server > Enable dynamic client registration
- Security: Review auto-registered clients periodically

### 8.2 Add OAuth discovery proxy to MCP server
- **File:** `monkey1/packages/mcp-browser-http-server/src/index.ts`
  - Add `GET /.well-known/oauth-authorization-server` route that returns/redirects to `https://kxdaxwvxaonnvjmqfvtj.supabase.co/auth/v1/.well-known/oauth-authorization-server`
  - This enables MCP clients to auto-discover the OAuth flow

### 8.3 Update monkey-coder CLI device flow
- **File:** `monkey-coder/packages/cli/src/device-flow.ts`
  - Point to Supabase OAuth 2.1 authorization endpoint instead of custom backend device flow
  - Use PKCE with `code_challenge_method=S256`

---

## Phase 9: RLS & Function Audit (Supabase AI Editor Rules)

### 9.1 RLS optimization: `auth.uid()` -> `(select auth.uid())`
- **Files:** All migration files in `monkey1/supabase/migrations/`
- New migration to recreate ~30 RLS policies with `(select auth.uid())` for query plan caching
- Target tables: `profiles`, `conversations`, `messages`, `documents`, `document_chunks`, `projects`, `user_api_keys`, `billing.*`

### 9.2 SECURITY INVOKER audit
- Audit all `CREATE FUNCTION` in migrations
- Functions querying user-facing tables and meant to respect RLS → `SECURITY INVOKER`
- Keep `SECURITY DEFINER` for: trigger functions, admin operations, cross-user billing
- New migration to alter appropriate functions

### 9.3 Add missing indexes on policy-referenced columns
- Check all RLS policies reference indexed columns
- Add indexes where missing (especially `client_id` in `oauth_client_policies`)

---

## Phase 10: auth-contracts Type Expansion

### 10.1 Add OAuth and MCP types
- **File:** `auth-contracts/src/index.ts`
  - Add interfaces:
    ```typescript
    export interface OAuthGrant {
      clientId: string;
      clientName: string;
      scopes: string[];
      grantedAt: string;
    }

    export interface TokenEndpointResponse {
      access_token: string;
      token_type: 'bearer';
      expires_in: number;
      refresh_token: string;
      scope?: string;
      id_token?: string;
    }
    ```

### 10.2 Rebuild and publish package
- Run `tsc` in auth-contracts, verify types compile

---

## Verification

### Per-phase testing:
1. **SDK bump:** `yarn build` in each repo, verify no type errors
2. **getClaims() fixes:** Run frontend dev servers, verify login/session flows still work; confirm `getClaims()` is called before `getSession()` in browser devtools network tab
3. **JWKS utility:** Unit test `validateSupabaseJWT()` with a test token; verify API gateway auth passes with valid token, rejects invalid
4. **Publishable key:** Test with both key formats in `.env.local`
5. **Edge functions:** Deploy with `supabase functions deploy`, test account-profile endpoint with OAuth token and verify `clientId` in logs
6. **RLS:** Run `supabase db reset` locally, test OAuth token access vs direct session access
7. **Grants UI:** Navigate to `/account/grants`, verify list and revoke work
8. **MCP OAuth:** Test MCP client discovery at `/.well-known/oauth-authorization-server`, verify OAuth flow completes
9. **RLS audit:** Run existing test suite, verify no policy regressions

### End-to-end integration test:
1. Log in via `fastmonkey.au` (monkey-oauth) with Google
2. Verify cross-subdomain cookie works on `one.fastmonkey.au` and `coder.fastmonkey.au`
3. Register an OAuth client, complete consent flow, verify `client_id` in token
4. Verify RLS restricts data access for OAuth client tokens
5. Verify user can view and revoke grants at `/account/grants`
