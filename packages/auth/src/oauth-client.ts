/**
 * BSuite OAuth 2.1 PKCE Client Factory
 *
 * Implements the OAuth 2.1 Authorization Code flow with PKCE (Proof Key for
 * Code Exchange) to authenticate users via the Business Suite identity provider.
 *
 * Token verification uses JWKS (JSON Web Key Set) from the Supabase
 * /.well-known/jwks.json endpoint — asymmetric key verification via jose.
 *
 * Per Supabase OAuth 2.1 server docs:
 * - PKCE with S256 code challenge is mandatory (OAuth 2.1 spec)
 * - Access tokens include user_id, role, and client_id claims
 * - JWKS endpoint provides public keys for third-party token validation
 * - Dynamic client registration available for MCP-compatible clients
 *
 * @see https://supabase.com/docs/guides/auth/oauth-server/getting-started
 * @see https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
 * @see https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';
import type {
  BusinessSuiteTokens,
  OAuthClient,
  SignInOptions,
  SilentAuthOptions,
  VerifiedUser,
} from './types.js';

const BUSINESS_SUITE_SUPABASE_URL = 'https://tuybltdrdefjblnplpqo.supabase.co';

// Lazy-initialized JWKS set — cached by jose, safe to create once per clientId
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(BUSINESS_SUITE_SUPABASE_URL);
  if (cached) return cached;
  const jwks = createRemoteJWKSet(
    new URL(`${BUSINESS_SUITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
  );
  jwksCache.set(BUSINESS_SUITE_SUPABASE_URL, jwks);
  return jwks;
}

function getRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify an access token against the Business Suite JWKS endpoint.
 *
 * Uses asymmetric key verification (RS256/ES256) — the public key is fetched
 * from the Supabase /.well-known/jwks.json endpoint and cached by jose.
 */
async function verifyAccessToken(token: string): Promise<VerifiedUser> {
  const { payload } = await jwtVerify(token, getJWKS(), {
    issuer: `${BUSINESS_SUITE_SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  });

  return {
    sub: payload.sub!,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    client_id: payload.client_id as string | undefined,
    role: payload.role as string | undefined,
  };
}

/**
 * Verify the id_token nonce claim against the expected value.
 * Protects against id_token replay attacks (OIDC Core §3.1.2.2).
 * Only rejects when the server returns a nonce that does NOT match — if the
 * server omits the nonce claim we skip verification rather than hard-fail.
 */
async function verifyIdToken(idToken: string, expectedNonce: string): Promise<void> {
  const { payload } = await jwtVerify(idToken, getJWKS(), {
    issuer: `${BUSINESS_SUITE_SUPABASE_URL}/auth/v1`,
    audience: 'authenticated',
  });
  if (payload.nonce !== undefined && payload.nonce !== expectedNonce) {
    throw new Error('id_token nonce mismatch — possible replay attack');
  }
}

/**
 * Decode a JWT payload without verification (for reading expiry only).
 * Full cryptographic verification happens via JWKS in verifyAccessToken().
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

/**
 * Create an OAuth 2.1 PKCE client for a specific BSuite application.
 *
 * Each app passes its OAuth client ID (registered in the Supabase
 * auth.oauth_clients table). All other logic is shared.
 *
 * @param clientId - The OAuth client ID for the calling app
 * @returns OAuthClient with all auth methods bound to the given clientId
 *
 * @example
 * ```ts
 * // crm7/src/lib/business-suite-oauth.ts
 * import { createOAuthClient } from '@bsuite/auth';
 * export const { signInWithBusinessSuite, exchangeCodeForTokens, ... } =
 *   createOAuthClient('30f76744-3e0b-40bf-abb8-8c587389802e');
 * ```
 */
export function createOAuthClient(clientId: string): OAuthClient {
  /** Refresh buffer — refresh 5 minutes before expiry */
  const REFRESH_BUFFER_MS = 5 * 60 * 1000;
  let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Redirect-loop circuit breaker — defense-in-depth regression guard.
   *
   * Every INTERACTIVE call to `signInWithBusinessSuite` stamps
   * `localStorage['bs_oauth_last_redirect_at']` with `Date.now()` immediately
   * before assigning `window.location.href`. Any subsequent interactive
   * attempt within {@link REDIRECT_LOOP_WINDOW_MS} throws *before* rotating
   * PKCE state.
   *
   * The `prompt=none` silent re-auth slow path (invoked by
   * `attemptSilentAuth`) is EXEMPT — it neither stamps the sentinel nor
   * asserts against it. Rationale: BSU may return `error=login_required`
   * from a silent attempt, and the consumer's login page is then expected
   * to fall through to an interactive `signInWithBusinessSuite()` call.
   * That legitimate two-redirect sequence happens well within the 10s
   * window, so the breaker must not block it.
   *
   * Under normal OAuth flow timing this never fires: the browser navigates
   * away from our origin the moment `window.location.href` is assigned and
   * does not execute client JS again for at least the round-trip to BSU +
   * consent + callback — well beyond 10s. The guard exists purely so that
   * if a caller (e.g. a future AuthProvider mount-effect) ever wires a loop
   * back in, production users see a loud error rather than a redirect spin.
   *
   * To manually reset (e.g. after a recovery flow or a deliberate retry),
   * clear `localStorage['bs_oauth_last_redirect_at']`.
   */
  const REDIRECT_LOOP_KEY = 'bs_oauth_last_redirect_at';
  const REDIRECT_LOOP_WINDOW_MS = 10_000;

  function assertNoRecentRedirect(): void {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(REDIRECT_LOOP_KEY);
    } catch {
      // SSR / private-browsing / storage-disabled — skip the guard rather
      // than block a legitimate sign-in on a storage edge case.
      return;
    }
    if (!raw) return;
    const last = Number(raw);
    if (!Number.isFinite(last)) return;
    const now = Date.now();
    if (now - last < REDIRECT_LOOP_WINDOW_MS) {
      // Browser-only breadcrumb so a tripped breaker leaves a production
      // trace. Guarded by `typeof window` so SSR / Node contexts (Next.js
      // server components, Vitest non-jsdom envs) don't spam stderr with
      // a log that's only actionable from a browser console.
      if (typeof window !== 'undefined') {
        console.warn(
          '[bs-oauth] Refusing to redirect: last redirect was <10s ago',
          { lastRedirectAt: last, now, key: REDIRECT_LOOP_KEY }
        );
      }
      throw new Error(
        `BS OAuth redirect attempted within 10s of previous redirect — refusing to loop. ` +
          `Clear localStorage['${REDIRECT_LOOP_KEY}'] to reset.`
      );
    }
  }

  function recordRedirectTimestamp(): void {
    try {
      localStorage.setItem(REDIRECT_LOOP_KEY, String(Date.now()));
    } catch {
      // SSR / private-browsing / quota — the happy path continues without
      // the loop guard on this call.
    }
  }

  /**
   * Initiate the OAuth 2.1 authorization flow with PKCE.
   *
   * Redirects the user to the Business Suite OAuth Server. By default this is
   * an interactive flow (the consent screen renders if a fresh session is
   * required). Pass `prompt: 'none'` for OIDC silent re-auth — the OAuth
   * Server returns either an auth code (when a BSU session already exists,
   * delivered without UI) or `error=login_required` (delivered as a redirect
   * with the same query parameter shape, so the callback page handles it
   * uniformly).
   *
   * Pass `returnTo` to control where the callback navigates after completion.
   * It is stored at `sessionStorage['auth_return_path']` and consumed by each
   * app's callback handler.
   *
   * @see OIDC Core 1.0 §3.1.2.1 — Authentication Request
   */
  async function signInWithBusinessSuite(options?: SignInOptions): Promise<void> {
    // Silent `prompt=none` re-auth is exempt from the circuit breaker —
    // BSU may return `error=login_required` and the consumer's login page
    // will then fall through to an interactive sign-in within the same
    // 10s window. See {@link REDIRECT_LOOP_KEY} for the full rationale.
    const isInteractive = options?.prompt !== 'none';
    if (isInteractive) {
      assertNoRecentRedirect();
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();
    const nonce = generateState(); // Same CSPRNG — 16 random bytes as hex (OIDC Core §3.1.2.1)

    sessionStorage.setItem('bs_oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('bs_oauth_state', state);
    sessionStorage.setItem('bs_oauth_nonce', nonce);

    const returnTo = options?.returnTo ?? window.location.href;
    try {
      sessionStorage.setItem('auth_return_path', returnTo);
    } catch {
      // Storage write failures are non-fatal — callback falls back to /dashboard.
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
      scope: 'openid email profile',
    });
    if (options?.prompt) {
      params.set('prompt', options.prompt);
    }

    if (isInteractive) {
      recordRedirectTimestamp();
    }
    window.location.href = `${BUSINESS_SUITE_SUPABASE_URL}/auth/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange the authorization code for tokens, then verify the access token
   * against the JWKS endpoint before returning.
   */
  async function exchangeCodeForTokens(
    code: string,
    state: string
  ): Promise<{ tokens: BusinessSuiteTokens; user: VerifiedUser }> {
    const storedState = sessionStorage.getItem('bs_oauth_state');
    const codeVerifier = sessionStorage.getItem('bs_oauth_code_verifier');
    const storedNonce = sessionStorage.getItem('bs_oauth_nonce');

    if (!storedState || storedState !== state) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }
    if (!codeVerifier) {
      throw new Error('Missing PKCE code verifier');
    }

    const response = await fetch(`${BUSINESS_SUITE_SUPABASE_URL}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });

    // Clean up stored PKCE values and nonce
    sessionStorage.removeItem('bs_oauth_code_verifier');
    sessionStorage.removeItem('bs_oauth_state');
    sessionStorage.removeItem('bs_oauth_nonce');

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
    }

    const tokens: BusinessSuiteTokens = await response.json();
    const user = await verifyAccessToken(tokens.access_token);

    // Verify id_token nonce to prevent replay attacks (OIDC Core §3.1.2.2)
    if (tokens.id_token && storedNonce) {
      await verifyIdToken(tokens.id_token, storedNonce);
    }

    return { tokens, user };
  }

  /**
   * Refresh an access token using a refresh token from Business Suite.
   * Verifies the new access token against the JWKS endpoint.
   */
  async function refreshBusinessSuiteToken(
    refreshToken: string
  ): Promise<{ tokens: BusinessSuiteTokens; user: VerifiedUser }> {
    const response = await fetch(`${BUSINESS_SUITE_SUPABASE_URL}/auth/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorBody}`);
    }

    const tokens: BusinessSuiteTokens = await response.json();
    const user = await verifyAccessToken(tokens.access_token);

    return { tokens, user };
  }

  /**
   * Fetch user info from the Business Suite UserInfo endpoint.
   * The information returned depends on the scopes granted in the access token.
   */
  async function getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${BUSINESS_SUITE_SUPABASE_URL}/auth/v1/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`UserInfo request failed: ${response.status} ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Clear all BS OAuth tokens from localStorage.
   * MUST be called during sign-out to prevent stale token leakage.
   */
  function clearBSTokens(): void {
    localStorage.removeItem('bs_access_token');
    localStorage.removeItem('bs_refresh_token');
    localStorage.removeItem('bs_user');
    localStorage.removeItem('bs_id_token');
    // Also clear the redirect-loop sentinel. Without this, a user who
    // signs out and immediately clicks "Sign in" again (within 10s) would
    // trip the circuit breaker and see an error instead of the consent
    // screen. Sign-out is always an intentional reset, so wiping the
    // sentinel here is correct behaviour, not an escape hatch.
    localStorage.removeItem(REDIRECT_LOOP_KEY);
  }

  /**
   * Check if the stored BS OAuth access token needs refreshing.
   * If expired or about to expire, uses the refresh token to get new tokens.
   * Updates localStorage with the new tokens.
   */
  async function checkAndRefreshToken(): Promise<void> {
    const accessToken = localStorage.getItem('bs_access_token');
    const refreshToken = localStorage.getItem('bs_refresh_token');
    if (!accessToken || !refreshToken) return;

    const payload = decodeJwtPayload(accessToken);
    if (!payload?.exp) return;

    const expiresAt = (payload.exp as number) * 1000;
    const now = Date.now();

    if (now < expiresAt - REFRESH_BUFFER_MS) return; // Still valid

    try {
      const { tokens, user } = await refreshBusinessSuiteToken(refreshToken);
      localStorage.setItem('bs_access_token', tokens.access_token);
      localStorage.setItem('bs_refresh_token', tokens.refresh_token);
      localStorage.setItem('bs_user', JSON.stringify(user));
      if (tokens.id_token) {
        localStorage.setItem('bs_id_token', tokens.id_token);
      }
    } catch (err) {
      const isAuthError = err instanceof Error && /^Token refresh failed: 4/.test(err.message);
      if (!isAuthError) {
        window.dispatchEvent(new CustomEvent('bs-oauth-expired', { detail: { reason: 'network_error' } }));
      }
      console.warn('[BS OAuth] Token refresh failed, clearing tokens:', err);
      clearBSTokens();
    }
  }

  /**
   * Attempt a silent auth refresh before showing the explicit login UI.
   *
   * Strategy (in order):
   *
   *   1. **Fast path — local access token still valid.** Returns `true`
   *      immediately. No network call.
   *   2. **Fast path — refresh token present.** Exchanges it for a new
   *      access token via the OAuth Server `/auth/v1/oauth/token` endpoint
   *      and persists the rotated tokens.
   *   3. **Slow path — OIDC silent re-auth via `prompt=none`.** Redirects
   *      the browser to BSU `/auth/v1/oauth/authorize?…&prompt=none`. The
   *      OAuth Server either:
   *        - issues an auth code without UI (BSU session exists), or
   *        - redirects back with `error=login_required` (no BSU session).
   *      In the success case the browser navigates away before this Promise
   *      resolves, so the function is intentionally treated as
   *      "may not return". In the `login_required` case the consumer's
   *      callback page must surface the error (e.g. clear stale tokens and
   *      route to its own `/auth/login`) — see crm7's `/auth/callback`.
   *
   * The first two branches are best-effort and never throw — errors fall
   * through to the redirect path so the user is never stranded on a stale
   * page. The redirect itself may navigate before the Promise resolves;
   * callers should treat this function as "render unauthenticated only if
   * it returns `false`" and otherwise let the navigation proceed.
   *
   * @see OIDC Core 1.0 §3.1.2.1 — Authentication Request (`prompt=none`)
   */
  async function attemptSilentAuth(options?: SilentAuthOptions): Promise<boolean> {
    // Fast path 1: existing local access token (still treats stored token as
    // valid; the auto-refresh interval owns expiry checking).
    const existingToken = localStorage.getItem('bs_access_token');
    if (existingToken) {
      return true;
    }

    // Fast path 2: refresh-token exchange.
    const refreshToken = localStorage.getItem('bs_refresh_token');
    if (refreshToken) {
      try {
        const { tokens, user } = await refreshBusinessSuiteToken(refreshToken);
        localStorage.setItem('bs_access_token', tokens.access_token);
        localStorage.setItem('bs_refresh_token', tokens.refresh_token);
        localStorage.setItem('bs_user', JSON.stringify(user));
        if (tokens.id_token) {
          localStorage.setItem('bs_id_token', tokens.id_token);
        }
        return true;
      } catch {
        // fall through to slow-path redirect
      }
    }

    // Slow path: OIDC silent re-auth via prompt=none.
    try {
      await signInWithBusinessSuite({
        prompt: 'none',
        returnTo: options?.returnTo ?? window.location.href,
      });
    } catch {
      // If the redirect itself fails (extremely unlikely — only if
      // window.location is unwritable), fall through to false so callers
      // surface the interactive login UI.
      return false;
    }

    // The browser is navigating; this return value is reached only when the
    // navigation did not happen (e.g. JSDOM in tests or a blocked redirect).
    return false;
  }

  /**
   * Start periodic BS OAuth token refresh. Call once on app initialization.
   * Checks every 60 seconds and refreshes 5 minutes before expiry.
   * Returns a cleanup function to stop the interval.
   */
  function startBSTokenRefresh(): () => void {
    void checkAndRefreshToken();
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(() => void checkAndRefreshToken(), 60_000);
    return () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    };
  }

  return {
    signInWithBusinessSuite,
    exchangeCodeForTokens,
    refreshBusinessSuiteToken,
    verifyAccessToken,
    getUserInfo,
    clearBSTokens,
    startBSTokenRefresh,
    attemptSilentAuth,
  };
}
