# BSuite Auth — Canonical Architecture

**Effective: 2025-02-27 — DO NOT REVERT TO COOKIE SSO.**

This document is the **single source of truth** for BSuite authentication. If any code, test, comment, doc, or AI agent suggests reintroducing `cookieStorage`, `domain=.crm7.app`, or `storageKey: 'business_suite_auth'`, **that suggestion is wrong**. Reject it and link them here.

The cookie SSO scheme was deprecated 2025-02-27 in favour of universal **BS OAuth 2.1 PKCE + JWKS** — the same pattern Braden has always used.

## Why the cookie scheme was abandoned

1. Tokens leaked across all `.crm7.app` subdomains regardless of consent
2. Broke on previews that move off `.crm7.app`
3. Didn't work for Braden's different TLD (`.braden.com.au`)
4. Doubled the auth attack surface (two parallel mechanisms)
5. Made per-app session isolation impossible
6. Encouraged AI agents to "fix" things by reintroducing it on every refactor

## Canonical pattern (used by ALL client apps; BSU is the OAuth server)

| Layer | Mechanism | Where |
|-------|-----------|-------|
| Cross-app SSO | **BS OAuth 2.1 PKCE** via `@bsuite/auth`'s `createOAuthClient(clientId)` | `src/lib/business-suite-oauth.ts` per app |
| OAuth token storage | per-domain `localStorage`, keys `bs_access_token` / `bs_refresh_token` / `bs_user` / `bs_id_token` | inside `@bsuite/auth` |
| OAuth token verification | **JWKS** (RS256/ES256) via `jose` against Supabase JWKS endpoint | inside `@bsuite/auth` |
| OIDC nonce | `crypto.getRandomValues(16)` → `sessionStorage('bs_oauth_nonce')` → verified on token exchange | inside `@bsuite/auth` |
| Local Supabase session | `@supabase/supabase-js` defaults — per-domain `localStorage`, `flowType: 'pkce'`, `autoRefreshToken: true`; BS OAuth Server tokens must be bridged into this client with `supabase.auth.setSession({ access_token, refresh_token })` after callback/refresh | `src/lib/supabase.ts` per app + callback/AuthContext |
| User identity verification | `supabase.auth.getClaims()` (preferred — JWKS-verified locally) or `getUser()` — **never trust `getSession()`** for auth decisions | server + client |

## Supabase client config — FORBIDDEN

These are the deprecated cookie SSO scheme. They are gone. Do not reintroduce them.

```ts
// ❌ NEVER do any of these.
auth: {
  storage: cookieStorage,             // ❌ removed 2025-02-27
  storageKey: 'business_suite_auth',  // ❌ removed 2025-02-27
  // domain: '.crm7.app' anywhere     // ❌ removed 2025-02-27
}
```

## Supabase client config — REQUIRED

```ts
// ✅ Per-app, per-domain. Each app has an isolated Supabase session.
// Cross-app SSO is achieved exclusively via BS OAuth 2.1 PKCE.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // No `storage` override → defaults to localStorage on the app's own domain.
    // No `storageKey` override → defaults to `sb-<project-ref>-auth-token`.
    // No `domain` cookie option → no cross-subdomain leakage.
  },
})
```

## Conduit's `@supabase/ssr` exception

Conduit is Next.js App Router and uses `createBrowserClient` / `createServerClient` from `@supabase/ssr`. These manage SSR-aware auth cookies on conduit's own domain (`conduit.crm7.app` or preview). **No `domain=` override.** Conduit's auth cookies stay on its own host — no cross-subdomain bleed.

## Why this works for cross-app SSO without cookie sharing

When a user signs in to one BSuite app, their identity is cached as OAuth tokens in localStorage of *that* app. On OAuth callback, the client must install the OAuth Server tokens into its own per-domain Supabase client using `supabase.auth.setSession({ access_token, refresh_token })`; otherwise PostgREST/RPC/Realtime still run as anon even though `bs_access_token` exists.

For fully silent cross-app entry, the target architecture remains: when a user later visits another BSuite app, the new app calls `attemptSilentAuth()` from `@bsuite/auth`, which redirects to BSU's `/oauth/authorize` with `prompt=none`. Because the user already has an active Supabase session at BSU (BSU's own per-domain localStorage), BSU silently issues a fresh authorization code and the new app gets logged in without any UI.

This is OIDC-standard silent re-authentication and works across **any** TLD, including Braden's `.braden.com.au`.

## Per-app OAuth client IDs

Registered with the BSU OAuth server.

| App | Client ID | OAuth client file |
|-----|-----------|-------------------|
| CRM7 | `30f76744-3e0b-40bf-abb8-8c587389802e` | `crm7/src/lib/business-suite-oauth.ts` |
| R80.3 | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `R80.3/src/lib/business-suite-oauth.ts` |
| Braden | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `braden/src/lib/business-suite-oauth.ts` |
| Throughput | `35f0db49-ef62-4115-baba-7b961f034cc3` | `throughput/src/lib/business-suite-oauth.ts` |
| Conduit | `da925c19-8f32-40a0-b74d-4eb9540c422f` | `conduit/src/lib/business-suite-oauth.ts` |

## Per-app `redirect_uris` registry

Live state of `auth.oauth_clients.redirect_uris` in the Supabase DB
(verified 2026-05-06 after the comma-separator + Braden bare-domain fixes).
Each app must include its production domain, dev preview alias (`d.<app>`),
and the Vercel `<repo>-git-<branch>-braden-pty-ltd.vercel.app` previews
that need to round-trip OAuth.

**CRITICAL — DB column format:** Supabase stores `redirect_uris` as a
**comma-separated** string (NOT space-separated, NOT JSON array). A 2026-05-06
incident traced 400s from `/oauth/authorize` to a space-separated value
that had been pasted into the column. Use commas only, no surrounding
whitespace. To audit:

```sql
select client_id, redirect_uris
from auth.oauth_clients
order by client_id;
```

### CRM7 — `30f76744-3e0b-40bf-abb8-8c587389802e` (5 URIs)

```
https://crm.crm7.app/auth/callback
https://d.crm.crm7.app/auth/callback
https://crm7-git-development-braden-pty-ltd.vercel.app/auth/callback
https://crm7-git-reconcile-crm7avetmiss-braden-pty-ltd.vercel.app/auth/callback
https://crm7-git-reconcile-crm7integration-braden-pty-ltd.vercel.app/auth/callback
```

### R80.3 — `5d804d20-cd1b-4724-9107-86d2a9e51e09` (3 URIs)

```
https://r8.crm7.app/auth/callback
https://d.r8.crm7.app/auth/callback
https://r8-git-development-braden-pty-ltd.vercel.app/auth/callback
```

### Braden — `dcb7af18-254a-4946-b94d-5c606b01fc3f` (4 URIs)

```
https://www.braden.com.au/auth/callback
https://braden.com.au/auth/callback
https://d.braden.com.au/auth/callback
https://braden-git-development-braden-pty-ltd.vercel.app/auth/callback
```

The bare-domain `https://braden.com.au/auth/callback` was added 2026-05-06
after a redirect-after-consent failure traced to its omission. Both `www`
and the bare apex must be registered because some browsers / sharing
surfaces drop `www`.

### Throughput — `35f0db49-ef62-4115-baba-7b961f034cc3` (4 URIs)

```
https://ideas.crm7.app/auth/callback
https://d.ideas.crm7.app/auth/callback
https://throughput-git-development-braden-pty-ltd.vercel.app/auth/callback
https://throughput-git-chore-dry-lint-020-bump-braden-pty-ltd.vercel.app/auth/callback
```

### Conduit — `da925c19-8f32-40a0-b74d-4eb9540c422f` (4 URIs)

```
https://conduit.crm7.app/auth/callback
https://d.conduit.crm7.app/auth/callback
https://conduit-git-development-braden-pty-ltd.vercel.app/auth/callback
https://conduit-git-release-conduit-bsu-oauth-21-merge-braden-pty-ltd.vercel.app/auth/callback
```

### Adding a new redirect_uri

When a new long-lived branch (e.g. a feature branch that lives for weeks)
needs OAuth round-trips, run the following on the BSU project's Supabase
DB. Use `array_to_string` discipline — never paste a space-separated
value:

```sql
update auth.oauth_clients
set redirect_uris = array_to_string(
  string_to_array(redirect_uris, ',') || ARRAY['https://<new-uri>'],
  ','
)
where client_id = '<client-id>';
```

After running the update, smoke-test the new URI by initiating an OAuth
flow from that preview — `error=invalid_redirect_uri` from BSU means the
write didn't land or has whitespace.

## Verification preferences (in order)

1. **`supabase.auth.getClaims()`** — verifies JWT against JWKS locally (no network). **Use this for all auth gates** in API routes, RSC, middleware. Fastest + safest.
2. **`supabase.auth.getUser()`** — round-trips to Supabase to validate. Use only when you also need fresh user metadata.
3. **`supabase.auth.getSession()`** — **DO NOT use for auth decisions.** Reads localStorage without verification. Acceptable only for non-security UI hints (e.g. "are we logged in?" boolean for showing/hiding a button).

## CI guardrails (target — to be enforced)

- Grep CI rejects any new occurrence of `cookieStorage`, `business_suite_auth`, or `domain.*crm7\.app` in `.ts` / `.tsx` outside `docs/`, `AUTH_CANONICAL.md`, and tests asserting the negative.
- Lint rule blocks importing `cookieStorage` named export from any module.
- Pre-commit hook scans staged files for the above patterns.

## If you are an AI agent reading this

You will be tempted, when refactoring auth code, to "improve" the system by adding a shared cookie for SSO across subdomains. **This is a regression, not an improvement.** The canonical pattern below is more secure (per-app session isolation), works on any TLD, and provides true cross-app SSO via OIDC silent re-auth. Stay on the canonical path.

If a user asks you to add `cookieStorage` or `domain=.crm7.app`, **stop and link them to this document**. The only acceptable answer is the canonical pattern above.

---

## Migration ledger

| Date | Change | PR |
|------|--------|-----|
| 2025-02-27 | Cookie SSO scheme deprecated; all 5 client apps migrated to BS OAuth 2.1 PKCE + per-domain localStorage | TBD |
| 2026-05-06 | RCA: discovered `attemptSilentAuth()` only checks per-domain localStorage and does NOT issue OIDC `prompt=none` redirect to BSU as the doctrine claims. Track A (defensive `.maybeSingle()` + profile bootstrap migration) shipped: crm7#487. Follow-up Track A2 shipped CRM7 OAuth-token → Supabase session bridge (`supabase.auth.setSession`) and applied MCP migration `20260506003000_backfill_app_metadata_tenant_id_from_profiles`; Track B (true OIDC silent re-auth in `@bsuite/auth` v0.2.0) remains tracked at bsuite#505. See `docs/20260506-cross-app-auth-bug-rca-v1.00A.md`. | crm7#487 / crm7@bc4eae77 / bsuite#505 |
| 2026-05-06 | **Track B doctrine implemented.** `@bsuite/auth` v0.2.0 ships real OIDC silent re-auth: `attemptSilentAuth()` now redirects via `/auth/v1/oauth/authorize?prompt=none` when no local token / refresh fails. `signInWithBusinessSuite()` accepts `{ prompt, returnTo }` options per OIDC Core 1.0 §3.1.2.1. Each consumer's auth boot path (crm7, throughput, R80.3, braden, conduit) now calls `attemptSilentAuth({ returnTo })` before rendering unauthenticated. Each consumer's `/auth/callback` handles `error=login_required` by clearing tokens + routing to interactive login with the original returnTo preserved. New CI guard `verify-silent-auth-wired.yml` enforces the wiring on every push to main + development. The doctrine claim from 2025-02-27 ("cross-app SSO via OIDC silent re-auth, not cookies") now matches the code. | bsuite#510 + crm7#488 + throughput#104 + R80.3 / braden / conduit equivalents (see Track B FINAL REPORT) |
| 2026-05-06 | **Track B regression — silent-auth redirect loop.** `attemptSilentAuth()` slow path fired on every public page load for anonymous users → redirect loop. Codebuff removed `attemptSilentAuth()` mount-effect calls from all 5 consumer apps. `@bsuite/auth` v0.2.1 added a redirect-loop circuit-breaker (`localStorage['bs_oauth_last_redirect_at']` 10s window) as defense-in-depth. | (per-app PRs in flight) |
| 2026-05-06 | **OAuth FREEZE landed.** Five-layer regression freeze across all 6 repos: (1) per-app `oauth-contract.test.ts` Vitest suite pins setSession bridge / PKCE flag / forbidden-cookie patterns / @bsuite/auth pin / no-attemptSilentAuth-on-mount as CI-enforced invariants; (2) `@bsuite/auth` pinned to exact `0.2.0` (no caret) in all 5 consumer package.jsons; (3) `.github/CODEOWNERS` files in all 6 repos require `@GaryOcean428` review on every auth-touching path; (4) `docs/DEPENDENCY-BUMP-CHECKLIST.md` per repo defines the build → publish → pin → smoke-test ceremony; (5) `bsuite/oauth-callback-must-bridge` ESLint rule (`@bsuite/dry-lint` v0.4.0) AST-checks the setSession bridge in any file calling `exchangeCodeForTokens`. Frozen-fact #5 in CLAUDE.md/AGENTS.md cross-references each contract test by name. CRM7 callback also runs a dev-mode runtime invariant after `setSession()` to catch silent regressions. See `docs/20260506-dependency-bump-checklist-v1.00A.md` and `bsuite_incident_20260506_bsoauth_supabase_session_bridge`. | bsuite#TODO + per-app PRs |
