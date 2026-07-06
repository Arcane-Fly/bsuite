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

const DEFAULT_BUSINESS_SUITE_SUPABASE_URL = 'https://tuybltdrdefjblnplpqo.supabase.co';
const BUSINESS_SUITE_SUPABASE_URL_ENV_NAMES = [
  'VITE_BSU_OAUTH_SUPABASE_URL',
  'NEXT_PUBLIC_BSU_OAUTH_SUPABASE_URL',
  'BSU_OAUTH_SUPABASE_URL',
  'VITE_BUSINESS_SUITE_SUPABASE_URL',
  'NEXT_PUBLIC_BUSINESS_SUITE_SUPABASE_URL',
  'BUSINESS_SUITE_SUPABASE_URL',
] as const;

function readRuntimeEnv(name: string): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const processEnv = (
    globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;

  return env?.[name] ?? processEnv?.[name];
}

function resolveBusinessSuiteSupabaseUrl(): string {
  for (const name of BUSINESS_SUITE_SUPABASE_URL_ENV_NAMES) {
    const value = readRuntimeEnv(name)?.trim();
    if (!value) continue;

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(
        `${name} must be an absolute Supabase URL in the form https://<project-ref>.supabase.co`
      );
    }

    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      throw new Error(
        `${name} must be an HTTPS Supabase URL in the form https://<project-ref>.supabase.co`
      );
    }

    return parsed.origin;
  }

  return DEFAULT_BUSINESS_SUITE_SUPABASE_URL;
}

const BUSINESS_SUITE_SUPABASE_URL = resolveBusinessSuiteSupabaseUrl();

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
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const processEnv = (
    globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const configuredAppUrl =
    env?.VITE_APP_URL ??
    processEnv?.VITE_APP_URL ??
    processEnv?.NEXT_PUBLIC_APP_URL;

  if (configuredAppUrl) {
    try {
      const appUrl = new URL(configuredAppUrl);
      return `${appUrl.origin}/auth/callback`;
    } catch {
      // Fall through to runtime origin when the env value is not a valid URL.
    }
  }
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
 * Verify an OAuth-Server-issued access token against the Business Suite JWKS endpoint.
 *
 * Uses asymmetric key verification (RS256/ES256) — the public key is fetched
 * from the Supabase /.well-known/jwks.json endpoint and cached by jose.
 *
 * Per [Supabase OAuth Flows §6 "Access token structure"](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows#access-token-structure)
 * the access token `aud` is canonically `'authenticated'` — same as a native
 * Supabase session JWT, with an additional `client_id` claim. Do NOT pass the
 * OAuth clientId here; that's only for ID tokens (see `verifyIdToken`).
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
 * Verify the OIDC id_token against the JWKS endpoint AND the expected nonce.
 *
 * Per [Supabase OAuth Server / OAuth Flows §6](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
 * and [OIDC Core 1.0 §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation):
 *   - Access token `aud` is `'authenticated'` (Supabase canonical).
 *   - **ID token `aud` is the CLIENT ID** of the requesting OAuth client.
 *
 * Using `audience: 'authenticated'` here causes jose to throw
 * "unexpected 'aud' claim value" the moment Supabase enforces audience
 * strictly on ID tokens — which it now does (verified 2026-05-07 via the
 * crm.crm7.app/auth/callback regression). Pass the consumer app's clientId
 * so the audience check matches the issuer's intent.
 *
 * Nonce check (OIDC Core §3.1.2.2): only rejects when the server returns a
 * nonce that does NOT match — if the server omits the nonce claim we skip
 * verification rather than hard-fail.
 */
async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
  clientId: string
): Promise<void> {
  const { payload } = await jwtVerify(idToken, getJWKS(), {
    issuer: `${BUSINESS_SUITE_SUPABASE_URL}/auth/v1`,
    audience: clientId,
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
 * Auth-code lifetime — Supabase OAuth codes are single-use and expire after
 * 10 minutes. Shared by the legacy single-key TTL guard and the concurrent-
 * flow map below so both mechanisms agree on what "fresh" means.
 * @see https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
 */
const PKCE_TTL_MS = 10 * 60 * 1000;

/** Cap on tracked concurrent flows — oldest survivors are dropped first. */
const FLOW_MAP_MAX_ENTRIES = 5;

/**
 * Concurrent-flow safety net — localStorage key for a small map of recent
 * in-flight PKCE flows, keyed by the `state` value minted for each flow.
 *
 * Problem: `signInWithBusinessSuite` also dual-writes a single flat set of
 * legacy keys (`bs_oauth_state`, `bs_oauth_code_verifier`, `bs_oauth_nonce`,
 * `bs_oauth_started_at`). Those keys are per-origin and singular, so when two
 * sign-in attempts race — an auto-initiator (PortalScopeGate / MarketingHome
 * / protected-route) firing alongside a manual click, or a second tab/window
 * — the slower flow's legacy keys get clobbered by the faster one before its
 * redirect round-trip to BSU completes. When the slower flow's callback
 * finally arrives with its own `state`, the legacy keys now hold the OTHER
 * flow's data, `storedState !== state`, and the exchange fails with
 * "Invalid state parameter - possible CSRF attack" even though this flow was
 * never actually compromised (crm.crm7.app prod incident).
 *
 * Fix: every flow ALSO appends `{ [state]: { verifier, nonce, startedAt } }`
 * to this map. `exchangeCodeForTokens` looks up the RETURNED state directly
 * in the map first — CSRF safety is preserved because the map can only ever
 * contain states this origin itself minted via `signInWithBusinessSuite`, so
 * a hit is exactly as trustworthy as the legacy single-key comparison. If the
 * map has no entry (storage was cleared, TTL-pruned, or the consumer app is
 * still on an @bsuite/auth build predating the flow map under a rolling
 * deploy) we fall back to the legacy single-key path unchanged, for one
 * release of back-compat.
 */
const OAUTH_FLOWS_KEY = 'bs_oauth_flows';

interface OAuthFlowEntry {
  verifier: string;
  nonce: string;
  startedAt: number;
}

type OAuthFlowMap = Record<string, OAuthFlowEntry>;

function readFlowMap(): OAuthFlowMap {
  try {
    const raw = localStorage.getItem(OAUTH_FLOWS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as OAuthFlowMap;
    }
    return {};
  } catch {
    // Corrupt JSON / storage-disabled — treat as empty; the legacy
    // single-key path still covers the non-concurrent case.
    return {};
  }
}

function writeFlowMap(map: OAuthFlowMap): void {
  try {
    localStorage.setItem(OAUTH_FLOWS_KEY, JSON.stringify(map));
  } catch {
    // Storage write failures are non-fatal — the legacy dual-write keys
    // still provide a (non-concurrent-safe) fallback path.
  }
}

/**
 * Drop entries older than {@link PKCE_TTL_MS}, then cap to the
 * {@link FLOW_MAP_MAX_ENTRIES} most recent survivors so localStorage can't
 * grow unbounded across many abandoned sign-in attempts.
 */
function pruneFlowMap(map: OAuthFlowMap): OAuthFlowMap {
  const now = Date.now();
  const fresh = Object.entries(map).filter(
    ([, entry]) => typeof entry?.startedAt === 'number' && now - entry.startedAt <= PKCE_TTL_MS
  );
  fresh.sort(([, a], [, b]) => b.startedAt - a.startedAt);
  return Object.fromEntries(fresh.slice(0, FLOW_MAP_MAX_ENTRIES));
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

  function dispatchOAuthExpired(reason: 'cross_tab_logout' | 'network_error' | 'refresh_rejected'): void {
    window.dispatchEvent(new CustomEvent('bs-oauth-expired', { detail: { reason } }));
  }

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
   * It is stored at `localStorage['auth_return_path']` and consumed by each
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

    // Store PKCE state in localStorage (not sessionStorage) so it survives:
    //   - Page refreshes on the callback URL (auth code is single-use;
    //     a refresh must replay the exchange with the SAME verifier)
    //   - ITP/ETP-Strict cross-site navigations in Safari / Firefox
    //   - Privacy extensions that nuke sessionStorage on cross-origin redirect
    //   - Login links opened in a new tab/window
    // Per Supabase PKCE Flow docs: "code exchange must be initiated on the
    // same browser and device where the flow was started" — localStorage is
    // per-origin and fulfils this requirement across all the above failure modes.
    // @see https://supabase.com/docs/guides/auth/sessions/pkce-flow
    localStorage.setItem('bs_oauth_code_verifier', codeVerifier);
    localStorage.setItem('bs_oauth_state', state);
    localStorage.setItem('bs_oauth_nonce', nonce);
    // TTL sentinel: written alongside the verifier so exchangeCodeForTokens
    // can reject stale state (>10min) that survived across sessions.
    // Auth codes are single-use and expire after 10min per Supabase OAuth docs.
    // @see https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
    localStorage.setItem('bs_oauth_started_at', String(Date.now()));

    // Concurrent-flow safety net: append this flow to the state-keyed map
    // (dual-write alongside the legacy flat keys above) so a slower/earlier
    // flow's PKCE data survives even if a later flow overwrites those flat
    // keys — see the OAUTH_FLOWS_KEY doc comment for the full race-condition
    // rationale and exchangeCodeForTokens for the lookup-by-returned-state
    // consumer. Pruned for staleness before insertion, then again after so
    // the size cap accounts for the newly-added entry.
    const flowMap = pruneFlowMap(readFlowMap());
    flowMap[state] = { verifier: codeVerifier, nonce, startedAt: Date.now() };
    writeFlowMap(pruneFlowMap(flowMap));

    const returnTo = options?.returnTo ?? window.location.href;
    try {
      localStorage.setItem('auth_return_path', returnTo);
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
    // Idempotency sentinel: if the same code is already being exchanged
    // (e.g. the user refreshed the /auth/callback page mid-flight),
    // reject immediately rather than sending a second token request.
    // Auth codes are single-use — a duplicate request would fail with
    // invalid_grant; the sentinel gives a more descriptive error first.
    const inflightCode = localStorage.getItem('bs_oauth_inflight_code');
    if (inflightCode === code) {
      throw new Error('Code exchange already in progress — please wait or retry sign-in');
    }
    localStorage.setItem('bs_oauth_inflight_code', code);

    // Concurrent-flow lookup: try the state-keyed map first. A hit here is
    // exactly as CSRF-safe as the legacy single-key comparison below — the
    // map can only contain states this origin minted via
    // signInWithBusinessSuite — and it survives a second/faster flow having
    // clobbered the legacy flat keys in the meantime. See the OAUTH_FLOWS_KEY
    // doc comment above for the full race-condition rationale.
    const flowMap = pruneFlowMap(readFlowMap());
    writeFlowMap(flowMap); // persist the prune even if this exchange fails below
    const flowEntry: OAuthFlowEntry | undefined = flowMap[state];
    const usingFlowMap = flowEntry !== undefined;

    let codeVerifier: string | null;
    let storedNonce: string | null;

    if (flowEntry) {
      codeVerifier = flowEntry.verifier;
      storedNonce = flowEntry.nonce;
    } else {
      // Legacy fallback path — kept for one release of back-compat with
      // consumers still on an @bsuite/auth build predating the flow map.
      const storedState = localStorage.getItem('bs_oauth_state');
      const startedAt = localStorage.getItem('bs_oauth_started_at');

      // TTL guard: auth codes expire after 10 minutes per Supabase OAuth docs.
      // Reject stale PKCE state that survived across sessions (e.g. user closed
      // the tab before completing sign-in, then returned later).
      if (startedAt) {
        const elapsed = Date.now() - Number(startedAt);
        if (elapsed > PKCE_TTL_MS) {
          // Clean up before throwing so the user gets a fresh start on retry.
          localStorage.removeItem('bs_oauth_code_verifier');
          localStorage.removeItem('bs_oauth_state');
          localStorage.removeItem('bs_oauth_nonce');
          localStorage.removeItem('bs_oauth_started_at');
          localStorage.removeItem('bs_oauth_inflight_code');
          throw new Error('PKCE state expired (>10min) — please retry sign-in');
        }
      }

      if (!storedState || storedState !== state) {
        // Hygiene: an unmatched/unknown state means this attempt's own PKCE
        // data (if any) is unrecoverable — clear the stale flat keys too,
        // not just the inflight sentinel, so a retry starts clean.
        localStorage.removeItem('bs_oauth_code_verifier');
        localStorage.removeItem('bs_oauth_state');
        localStorage.removeItem('bs_oauth_nonce');
        localStorage.removeItem('bs_oauth_started_at');
        localStorage.removeItem('bs_oauth_inflight_code');
        throw new Error('Invalid state parameter - possible CSRF attack');
      }
      codeVerifier = localStorage.getItem('bs_oauth_code_verifier');
      storedNonce = localStorage.getItem('bs_oauth_nonce');
    }

    if (!codeVerifier) {
      localStorage.removeItem('bs_oauth_inflight_code');
      throw new Error('PKCE code verifier not found in storage — sign-in session may have been interrupted. Please retry sign-in.');
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

    // Clean up stored PKCE values, nonce, TTL sentinel, and inflight sentinel
    // (legacy dual-write keys) — plus this flow's own entry in the map, if any.
    localStorage.removeItem('bs_oauth_code_verifier');
    localStorage.removeItem('bs_oauth_state');
    localStorage.removeItem('bs_oauth_nonce');
    localStorage.removeItem('bs_oauth_started_at');
    localStorage.removeItem('bs_oauth_inflight_code');
    if (usingFlowMap) {
      delete flowMap[state];
      writeFlowMap(flowMap);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
    }

    const tokens: BusinessSuiteTokens = await response.json();
    const user = await verifyAccessToken(tokens.access_token);

    // Verify id_token signature, audience, and nonce (OIDC Core §3.1.3.7 + §3.1.2.2).
    // Audience MUST be the OAuth clientId per Supabase OAuth Flows §6 (NOT
    // 'authenticated'). See verifyIdToken() docs for full rationale.
    if (tokens.id_token && storedNonce) {
      await verifyIdToken(tokens.id_token, storedNonce, clientId);
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
    localStorage.removeItem('bs_oauth_code_verifier');
    localStorage.removeItem('bs_oauth_state');
    localStorage.removeItem('bs_oauth_nonce');
    localStorage.removeItem('bs_oauth_started_at');
    localStorage.removeItem('bs_oauth_inflight_code');
    localStorage.removeItem('auth_return_path');
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
      dispatchOAuthExpired(isAuthError ? 'refresh_rejected' : 'network_error');
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
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'bs_access_token') return;
      if (event.oldValue && event.newValue === null) {
        clearBSTokens();
        dispatchOAuthExpired('cross_tab_logout');
      }
    };

    window.addEventListener('storage', handleStorage);
    void checkAndRefreshToken();
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(() => void checkAndRefreshToken(), 60_000);
    return () => {
      window.removeEventListener('storage', handleStorage);
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
