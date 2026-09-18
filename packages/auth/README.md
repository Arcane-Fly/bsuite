# @bsuite/auth

OAuth 2.1 PKCE client shared across BSuite apps (CRM7, Conduit, R80.4, Braden, Throughput). BSU is the OAuth server; this package is the client every other app uses to consume it.

## Concurrent sign-in and callback recovery

The opt-in [session ownership coordinator](docs/session-ownership.md) serializes
consumer SDK writes and logout across same-origin tabs. Consumer adapter wiring,
transaction snapshot binding and deployed verification remain required.

Login initiators should use `attemptSilentAuthDetailed()`. Continue to the destination on `authenticated`; stop on `redirecting` or `superseded`; offer interactive recovery on `failed`. The old boolean helper remains compatible but cannot distinguish a scheduled navigation from failure. Assigning `window.location` does not stop subsequent JavaScript.

Route callbacks with `hasPendingBusinessSuiteTransaction(state)`, which requires this origin's complete, fresh transaction state. Do not dispatch from state shape or the presence of an unrelated legacy key. Legacy transactions also require their verifier, nonce and timestamp. Incomplete transactions need a fresh sign-in.

`BusinessSuiteOAuthExchangeUncertainError.recovery` is `fresh-sign-in`: the server may have consumed the single-use code before a network or response-body failure. Never automatically replay it. Callback error handlers must preserve unrelated transactions and newer sessions. Capture the consumer session/logout generation before starting an exchange and check it again after verification and before committing tokens or navigating. An exchange already in flight can return after sign-out; its result must not restore the previous session. After successful exchange, bridge through the consumer's `supabase.auth.setSession()` before protected data reads. Host-local session storage remains separate from cross-app OAuth SSO.

The package is intentionally small — it defaults to the production BSuite Supabase host (`https://tuybltdrdefjblnplpqo.supabase.co`), supports an explicit OAuth-server override for persistent development Supabase branches, resolves redirect URIs from `VITE_APP_URL` (or `NEXT_PUBLIC_APP_URL`) when available, and falls back to `${window.location.origin}/auth/callback`. It depends only on `jose` for JWKS verification.

## OAuth server environment

Production consumers need no extra configuration; the OAuth server defaults to the production BSuite Supabase project. Long-lived development deployments that use a persistent Supabase branch/project must set one of these variables to that branch URL:

- `VITE_BSU_OAUTH_SUPABASE_URL` for Vite browser builds
- `NEXT_PUBLIC_BSU_OAUTH_SUPABASE_URL` for Next.js browser builds
- `BSU_OAUTH_SUPABASE_URL` for server/build-time environments

Accepted aliases are `VITE_BUSINESS_SUITE_SUPABASE_URL`, `NEXT_PUBLIC_BUSINESS_SUITE_SUPABASE_URL`, and `BUSINESS_SUITE_SUPABASE_URL`. Values must be HTTPS Supabase project URLs in the form `https://<project-ref>.supabase.co`; invalid overrides throw before redirecting users into a broken OAuth flow.

## Install

```bash
pnpm add @bsuite/auth
```

## Usage

Every consumer app creates a thin wrapper that re-exports the shared client bound to its OAuth client ID. Example from CRM7 (the canonical reference — same pattern in `R80.4`, `braden`, `conduit`, `throughput`):

```ts
// src/lib/business-suite-oauth.ts
import { createOAuthClient } from '@bsuite/auth';
export type { BusinessSuiteTokens, VerifiedUser } from '@bsuite/auth';

export const {
  signInWithBusinessSuite,
  exchangeCodeForTokens,
  refreshBusinessSuiteToken,
  verifyAccessToken,
  getUserInfo,
  clearBSTokens,
  startBSTokenRefresh,
  attemptSilentAuthDetailed,
} = createOAuthClient('30f76744-3e0b-40bf-abb8-8c587389802e'); // your app's OAuth client ID
```

Then wire it into the auth lifecycle:

```ts
// On a login button click — schedules navigation to the OAuth server
void signInWithBusinessSuite();

// In your /auth/callback route, with `code` and `state` parsed from the URL
const { tokens, user } = await exchangeCodeForTokens(code, state);
localStorage.setItem('bs_access_token', tokens.access_token);
localStorage.setItem('bs_refresh_token', tokens.refresh_token);
localStorage.setItem('bs_user', JSON.stringify(user));
if (tokens.id_token) localStorage.setItem('bs_id_token', tokens.id_token);

// On app mount (e.g. AuthContext / AuthProvider) — try OIDC silent re-auth before showing the login UI
const result = await attemptSilentAuthDetailed();
// Stop on redirecting/superseded; navigate only on authenticated.

// Start the auto-refresh loop and capture the cleanup function
const stopRefresh: () => void = startBSTokenRefresh();
// later, e.g. on AuthContext unmount or sign-out:
stopRefresh();

// Sign-out — clear all 4 BS OAuth localStorage keys
clearBSTokens();
```

## API

```ts
import type { OAuthClient, BusinessSuiteTokens, VerifiedUser } from '@bsuite/auth';

declare function createOAuthClient(clientId: string): OAuthClient;

interface OAuthClient {
  signInWithBusinessSuite(): Promise<void>;
  exchangeCodeForTokens(
    code: string,
    state: string,
  ): Promise<{ tokens: BusinessSuiteTokens; user: VerifiedUser }>;
  refreshBusinessSuiteToken(
    refreshToken: string,
  ): Promise<{ tokens: BusinessSuiteTokens; user: VerifiedUser }>;
  verifyAccessToken(token: string): Promise<VerifiedUser>;
  getUserInfo(accessToken: string): Promise<Record<string, unknown>>;
  clearBSTokens(): void;
  startBSTokenRefresh(): () => void; // returns a cleanup function
  attemptSilentAuth(): Promise<boolean>;
}

interface BusinessSuiteTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface VerifiedUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  client_id?: string;
  role?: string;
}
```

## Behaviour notes

- **`signInWithBusinessSuite`** generates a PKCE `code_verifier`, `code_challenge` (S256), `state`, and OIDC `nonce`, stores them in `localStorage` with a 10-minute TTL sentinel, then sets `window.location.href` to the BSU `/auth/v1/oauth/authorize` URL. The returned Promise never resolves — the page navigates away.
- **`exchangeCodeForTokens`** validates `state` (CSRF), reads the stored PKCE verifier, posts to `/auth/v1/oauth/token`, then JWKS-verifies the access token AND the OIDC `id_token` nonce (replay protection per OIDC Core §3.1.2.2). Throws on state mismatch, missing verifier, non-2xx response, or nonce mismatch.
- **`refreshBusinessSuiteToken`** posts to `/auth/v1/oauth/token` with `grant_type=refresh_token` and verifies the new access token via JWKS before returning.
- **`verifyAccessToken`** uses cached JWKS (`jose`'s `createRemoteJWKSet`) with `issuer: "<supabase>/auth/v1"` and `audience: "authenticated"`. RS256/ES256 only.
- **`getUserInfo`** GETs `/auth/v1/oauth/userinfo` with the supplied bearer token and returns the parsed JSON body.
- **`startBSTokenRefresh`** triggers an immediate check, then polls every 60 seconds and refreshes tokens 5 minutes before expiry. Returns a cleanup function that stops the interval. **Always capture the cleanup** to avoid leaking timers in components that mount/unmount (e.g. AuthProvider).
- **`attemptSilentAuth`** returns `true` if there's a valid access token already in localStorage OR a refresh token that successfully exchanges. Returns `false` otherwise. Never throws — errors are swallowed so the login UI can still render.
- **`clearBSTokens`** removes `bs_access_token`, `bs_refresh_token`, `bs_user`, `bs_id_token` from localStorage. Always call on sign-out.

## Storage keys

| Storage | Key | Purpose | Lifetime |
|---------|-----|---------|----------|
| `localStorage` | `bs_access_token` | JWT access token (JWKS-verified) | until refresh / sign-out |
| `localStorage` | `bs_refresh_token` | Refresh token | until refresh / sign-out |
| `localStorage` | `bs_user` | JSON-serialised `VerifiedUser` | until refresh / sign-out |
| `localStorage` | `bs_id_token` | OIDC id_token (optional) | until refresh / sign-out |
| `localStorage` | `bs_oauth_code_verifier` | PKCE code verifier | sign-in flow only, TTL-guarded |
| `localStorage` | `bs_oauth_state` | CSRF state | sign-in flow only, TTL-guarded |
| `localStorage` | `bs_oauth_nonce` | OIDC replay-protection nonce | sign-in flow only, TTL-guarded |
| `localStorage` | `bs_oauth_started_at` | PKCE TTL sentinel | sign-in flow only |
| `localStorage` | `bs_oauth_flows` | State-keyed PKCE transactions | ten minutes / completion / sign-out |
| `localStorage` | `bs_oauth_inflight_codes` | Per-code claims with owner identity | ten minutes / owning completion / sign-out |

## Design notes

- **Per-domain `localStorage`** — tokens never leave the app's own origin. Cross-app SSO is achieved via OIDC `prompt=none` silent re-auth (`attemptSilentAuth`), NOT cross-domain cookies. The deprecated `business_suite_auth` cookie SSO scheme was removed 2025-02-27; do not reintroduce it.
- **JWKS verification** — `verifyAccessToken` fetches the Supabase `/.well-known/jwks.json` once and caches it via `jose`'s `createRemoteJWKSet`. RS256/ES256 only.
- **PKCE S256 mandatory** — no implicit flow, no `plain` challenge.
- **OIDC nonce verification** — if `id_token` is returned, its `nonce` claim is verified against the nonce in the matching state-keyed transaction (or eligible legacy transaction). A missing or mismatched nonce throws “id_token nonce mismatch — possible replay attack” (OIDC Core §3.1.2.2).
- **Token expiry event** — if the auto-refresh loop fails or a sibling tab removes `bs_access_token`, the package dispatches a `bs-oauth-expired` `CustomEvent` on `window` so apps can react (e.g. show a banner) before tokens are cleared. Reasons: `network_error`, `refresh_rejected`, `cross_tab_logout`.

## Per-app OAuth client IDs

| App | Client ID |
|-----|-----------|
| CRM7 | `30f76744-3e0b-40bf-abb8-8c587389802e` |
| R80.3 | `5d804d20-cd1b-4724-9107-86d2a9e51e09` |
| Braden | `dcb7af18-254a-4946-b94d-5c606b01fc3f` |
| Throughput | `35f0db49-ef62-4115-baba-7b961f034cc3` |
| Conduit | `da925c19-8f32-40a0-b74d-4eb9540c422f` |

## Related docs

- Parent repo canonical auth architecture: [`AUTH_CANONICAL.md`](../../AUTH_CANONICAL.md)
- Per-app integration: each consumer's `src/lib/business-suite-oauth.ts`

## License

UNLICENSED (internal BSuite use only).
