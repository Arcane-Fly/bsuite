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
  SilentAuthResult,
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
  // SECURITY: never assign `import.meta.env` itself to a variable or read it
  // dynamically — consumer bundlers (Vite) then inline the ENTIRE env object
  // into every client bundle, leaking every VITE_* secret. Only the two
  // VITE_-prefixed candidates can exist on import.meta.env, so reference them
  // as direct static keys (inlined individually); the rest resolve through
  // process.env for Next.js/Node contexts.
  let fromImportMeta: string | undefined;
  try {
    switch (name) {
      case 'VITE_BSU_OAUTH_SUPABASE_URL':
        fromImportMeta = (
          import.meta as ImportMeta & { env: { VITE_BSU_OAUTH_SUPABASE_URL?: string } }
        ).env.VITE_BSU_OAUTH_SUPABASE_URL;
        break;
      case 'VITE_BUSINESS_SUITE_SUPABASE_URL':
        fromImportMeta = (
          import.meta as ImportMeta & { env: { VITE_BUSINESS_SUITE_SUPABASE_URL?: string } }
        ).env.VITE_BUSINESS_SUITE_SUPABASE_URL;
        break;
    }
  } catch {
    // Not in a Vite context — fall through to process.env
  }

  const processEnv = (
    globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;

  return fromImportMeta ?? processEnv?.[name];
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
  // SECURITY: direct static key access only (see readRuntimeEnv) — assigning
  // `import.meta.env` to a variable makes consumer bundlers inline the entire
  // env object, leaking every VITE_* secret into client bundles.
  let viteAppUrl: string | undefined;
  try {
    viteAppUrl = (import.meta as ImportMeta & { env: { VITE_APP_URL?: string } }).env.VITE_APP_URL;
  } catch {
    // Not in a Vite context — fall through to process.env
  }

  const processEnv = (
    globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const configuredAppUrl =
    viteAppUrl ?? processEnv?.VITE_APP_URL ?? processEnv?.NEXT_PUBLIC_APP_URL;

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
 * This client sends a nonce. OIDC Core §3.1.3.7 therefore requires the ID
 * token to contain the same value; omission is also a validation failure.
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
  if (payload.nonce !== expectedNonce) {
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
 * Is a stored access token still usable (well-formed AND not expired)?
 *
 * `attemptSilentAuth`'s fast path previously trusted ANY truthy value under
 * `bs_access_token` — including a token past its `exp`, or a corrupted /
 * partially-written string left behind by a crashed tab — and reported the
 * caller as authenticated on that basis alone. A caller that then makes an
 * authenticated request gets a 401 it has no path to recover from, because
 * `attemptSilentAuth` already told it silent auth succeeded. Requiring a
 * decodable payload with a still-future `exp` makes the fast path agree with
 * what `checkAndRefreshToken` already treats as "valid" for the same key.
 */
function isAccessTokenUsable(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Date.now() < payload.exp * 1000;
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

/**
 * Is `value` a sane "started at" timestamp: a finite positive number, not
 * timestamped in the future (corrupted/tampered storage — clocks do not run
 * backwards for a value this package itself wrote), and within
 * {@link PKCE_TTL_MS} of now? All timestamp-bounded eligibility checks in
 * this file (the flow map, the legacy single-flow fallback, and
 * {@link hasPendingBusinessSuiteTransaction}) route through this single
 * function so "fresh" means the same thing everywhere.
 */
function isFreshTimestamp(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return false;
  const now = Date.now();
  if (value > now) return false; // reject timestamps from the future
  return now - value <= PKCE_TTL_MS;
}

/**
 * Is `entry` a complete, well-formed, still-fresh flow-map entry? Requires
 * non-empty `verifier`/`nonce` strings in addition to a fresh timestamp —
 * an entry missing either field is exactly as useless to
 * `exchangeCodeForTokens` (which would immediately throw "PKCE code
 * verifier not found") as no entry at all, so it must not be reported as
 * "pending" by {@link hasPendingBusinessSuiteTransaction} or treated as a
 * usable hit anywhere else.
 */
function isValidFlowEntry(entry: unknown): entry is OAuthFlowEntry {
  if (!entry || typeof entry !== 'object') return false;
  const candidate = entry as Partial<OAuthFlowEntry>;
  return (
    typeof candidate.verifier === 'string' &&
    candidate.verifier.length > 0 &&
    typeof candidate.nonce === 'string' &&
    candidate.nonce.length > 0 &&
    isFreshTimestamp(candidate.startedAt)
  );
}

/**
 * Copy `source`'s OWN enumerable string keys onto a `null`-prototype object.
 *
 * A flow map read via `JSON.parse` (or the `{}` fallback) inherits from
 * `Object.prototype`, so `map[state]` for an attacker- or accident-chosen
 * `state` value equal to an inherited member name (`toString`,
 * `constructor`, `hasOwnProperty`, `__proto__`, …) returns that inherited
 * function/object — which is truthy — even when the map has no own entry
 * for it at all. A `null`-prototype object has no inherited members, so
 * `map[state]` can only ever be non-`undefined` for a key this package
 * itself wrote.
 */
function toNullPrototypeMap<T>(source: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = Object.create(null);
  for (const key of Object.keys(source)) {
    result[key] = source[key];
  }
  return result;
}

function readFlowMap(): OAuthFlowMap {
  const empty: OAuthFlowMap = Object.create(null);
  try {
    const raw = localStorage.getItem(OAUTH_FLOWS_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return toNullPrototypeMap(parsed as Record<string, OAuthFlowEntry>);
    }
    return empty;
  } catch {
    // Corrupt JSON / storage-disabled — treat as empty; the legacy
    // single-key path still covers the non-concurrent case.
    return empty;
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
 * Drop entries that are malformed, incomplete, or stale per
 * {@link isValidFlowEntry}, then cap to the {@link FLOW_MAP_MAX_ENTRIES}
 * most recent survivors so localStorage can't grow unbounded across many
 * abandoned sign-in attempts. Returns a `null`-prototype object — see
 * {@link toNullPrototypeMap}.
 */
function pruneFlowMap(map: OAuthFlowMap): OAuthFlowMap {
  const fresh = Object.entries(map).filter(([, entry]) => isValidFlowEntry(entry));
  fresh.sort(([, a], [, b]) => b.startedAt - a.startedAt);
  const result: OAuthFlowMap = Object.create(null);
  for (const [key, entry] of fresh.slice(0, FLOW_MAP_MAX_ENTRIES)) {
    result[key] = entry;
  }
  return result;
}

/**
 * Per-code exchange-in-progress guard, keyed by the authorization `code`
 * itself rather than a single flat slot.
 *
 * A single global `bs_oauth_inflight_code` value cannot guard concurrent
 * transactions: flow A claims the slot for its code, flow B (a different
 * code) immediately overwrites it with its own code, and a duplicate
 * submission of A's original code no longer sees a match — three network
 * requests fire (A, B, and the unguarded A-duplicate) where at most two
 * (A and B) should. Keying by code gives each transaction its own slot, so
 * B claiming its own guard can never clobber A's, and a true duplicate of
 * A's code is still caught. Bounded by {@link PKCE_TTL_MS} (via
 * {@link isFreshTimestamp}) so a claim whose release never ran (a crashed
 * tab mid-fetch) cannot block that code forever.
 */
const INFLIGHT_CODES_KEY = 'bs_oauth_inflight_codes';
/** Legacy single-value key from prior releases — cleared defensively, never read. */
const LEGACY_INFLIGHT_CODE_KEY = 'bs_oauth_inflight_code';

interface InflightEntry {
  owner: string;
  startedAt: number;
}

type InflightMap = Record<string, InflightEntry>;

function readInflightMap(): InflightMap {
  const empty: InflightMap = Object.create(null);
  try {
    const raw = localStorage.getItem(INFLIGHT_CODES_KEY);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return toNullPrototypeMap(parsed as Record<string, InflightEntry>);
    }
    return empty;
  } catch {
    return empty;
  }
}

function writeInflightMap(map: InflightMap): void {
  try {
    localStorage.setItem(INFLIGHT_CODES_KEY, JSON.stringify(map));
  } catch {
    // Storage write failures are non-fatal — worst case, the duplicate
    // guard degrades to "not guarded" rather than blocking a legitimate
    // request.
  }
}

function pruneInflightMap(map: InflightMap): InflightMap {
  const result: InflightMap = Object.create(null);
  for (const [key, entry] of Object.entries(map)) {
    if (isFreshTimestamp(entry?.startedAt)) {
      result[key] = entry;
    }
  }
  return result;
}

/**
 * Claim the per-code duplicate-exchange guard. Returns `null` (does NOT
 * claim) if `code` already has a live, unexpired claim — the caller must
 * treat that as "already in progress" and reject rather than firing a
 * second network request for the same code.
 */
function claimInflightCode(code: string): string | null {
  const map = pruneInflightMap(readInflightMap());
  if (map[code]) return null;
  const owner = generateState();
  map[code] = { owner, startedAt: Date.now() };
  writeInflightMap(map);
  return owner;
}

/** Release this code's own claim. A no-op if it was already released or pruned. */
function releaseInflightCode(code: string, owner: string): void {
  const map = pruneInflightMap(readInflightMap());
  if (map[code]?.owner === owner) {
    delete map[code];
    writeInflightMap(map);
  }
}

/**
 * Read-only predicate: did THIS origin actually mint `state` via
 * `signInWithBusinessSuite` (either the concurrent-flow map or the legacy
 * single-flow fallback), and does it still have everything
 * `exchangeCodeForTokens` needs to redeem it?
 *
 * Consumers receiving an OAuth callback need to decide whether an incoming
 * `?state=...` belongs to a @bsuite/auth-initiated transaction before routing
 * it to `exchangeCodeForTokens`. Guessing from callback shape or a flat-key
 * match alone (the per-app patterns this replaces: flat-key dispatch,
 * state-shape fallback, or an unconditional direct-BS assumption) has no
 * relationship to which flow this package actually started — this reads the
 * same storage `exchangeCodeForTokens` will consult, and (via
 * {@link isValidFlowEntry} / the matching legacy checks below) requires a
 * COMPLETE, freshly-timestamped entry, so a `true` result is a reliable
 * predictor of whether that call will actually find its PKCE data rather
 * than immediately throwing. This function only reads storage; it never
 * mutates or consumes a transaction, so it is safe to call speculatively
 * (e.g. from multiple callback handlers) without affecting the eventual
 * `exchangeCodeForTokens` outcome.
 */
export function hasPendingBusinessSuiteTransaction(state: string): boolean {
  if (!state) return false;

  const flowMap = pruneFlowMap(readFlowMap());
  if (flowMap[state]) return true;

  try {
    const storedState = localStorage.getItem('bs_oauth_state');
    if (storedState !== state) return false;
    // Aligned with exchangeCodeForTokens's legacy path: a state match alone
    // is not enough — that call also hard-requires a code_verifier (it
    // throws "PKCE code verifier not found" without one), so a state-only
    // match here would report "pending" for a transaction that cannot
    // actually be redeemed.
    const codeVerifier = localStorage.getItem('bs_oauth_code_verifier');
    if (!codeVerifier || !localStorage.getItem('bs_oauth_nonce')) return false;
    const startedAtRaw = localStorage.getItem('bs_oauth_started_at');
    if (!startedAtRaw) return false;
    return isFreshTimestamp(Number(startedAtRaw));
  } catch {
    // SSR / private-browsing / storage-disabled.
    return false;
  }
}

/**
 * Thrown by `exchangeCodeForTokens` when the exchange's outcome is
 * genuinely UNKNOWN: the token request failed at the network level (the
 * connection dropped, DNS failed, etc.) before any HTTP response — success
 * or failure — arrived. This is NOT the same as a deterministic server
 * rejection (`Token exchange failed: 4xx …`, thrown as a plain `Error`),
 * which means the server definitely saw and definitively rejected the
 * request.
 *
 * OAuth authorization codes are single-use. If the server DID receive and
 * process the request before the response was lost, the code is already
 * consumed server-side — retrying with the SAME code will simply fail with
 * `invalid_grant`. This package therefore makes no "safe to retry" promise
 * for this case; `recovery: 'fresh-sign-in'` names the only recovery it
 * vouches for — starting a brand new `signInWithBusinessSuite()` flow,
 * which mints a fresh authorization code the server has never seen.
 */
export class BusinessSuiteOAuthExchangeUncertainError extends Error {
  readonly recovery = 'fresh-sign-in' as const;
  /** The underlying network-level error, if any (e.g. the rejected fetch). */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'BusinessSuiteOAuthExchangeUncertainError';
    this.cause = cause;
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
   * Assigning location schedules navigation; JavaScript may continue and
   * initiate another flow before the browser leaves. Callers must honor the
   * detailed silent-auth result as well as this interactive loop guard.
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
    // Single timestamp shared by the legacy sentinel and the flow-map entry
    // below — two separate Date.now() calls could straddle a millisecond
    // boundary and disagree, which is both semantically wrong (they claim
    // to record the same "flow started" instant) and was observed to flake
    // an exact-equality test comparing the two.
    const startedAt = Date.now();
    localStorage.setItem('bs_oauth_code_verifier', codeVerifier);
    localStorage.setItem('bs_oauth_state', state);
    localStorage.setItem('bs_oauth_nonce', nonce);
    // TTL sentinel: written alongside the verifier so exchangeCodeForTokens
    // can reject stale state (>10min) that survived across sessions.
    // Auth codes are single-use and expire after 10min per Supabase OAuth docs.
    // @see https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
    localStorage.setItem('bs_oauth_started_at', String(startedAt));

    // Concurrent-flow safety net: append this flow to the state-keyed map
    // (dual-write alongside the legacy flat keys above) so a slower/earlier
    // flow's PKCE data survives even if a later flow overwrites those flat
    // keys — see the OAUTH_FLOWS_KEY doc comment for the full race-condition
    // rationale and exchangeCodeForTokens for the lookup-by-returned-state
    // consumer. Pruned for staleness before insertion, then again after so
    // the size cap accounts for the newly-added entry.
    const flowMap = pruneFlowMap(readFlowMap());
    flowMap[state] = { verifier: codeVerifier, nonce, startedAt };
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
    const claimOwner = claimInflightCode(code);
    if (!claimOwner) {
      throw new Error('Code exchange already in progress — please wait or retry sign-in');
    }

    // Concurrent-flow lookup: try the state-keyed map first. A hit here is
    // exactly as CSRF-safe as the legacy single-key comparison below — the
    // map can only contain states this origin minted via
    // signInWithBusinessSuite — and it survives a second/faster flow having
    // clobbered the legacy flat keys in the meantime. See the OAUTH_FLOWS_KEY
    // doc comment above for the full race-condition rationale.
    const flowMapAtStart = pruneFlowMap(readFlowMap());
    writeFlowMap(flowMapAtStart); // persist the prune even if this exchange fails below
    const flowEntry: OAuthFlowEntry | undefined = flowMapAtStart[state];
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
      const ownsLegacySlot = storedState !== null && storedState === state;

      if (!ownsLegacySlot) {
        // The legacy flat keys — if any are even present — belong to a
        // DIFFERENT transaction: a newer flow that has since overwritten
        // them, or simply an unrelated/unknown state. They are not ours to
        // touch. Only release our own per-code inflight claim; do NOT clear
        // storage that may be another in-progress flow's own PKCE data.
        releaseInflightCode(code, claimOwner);
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // From here the legacy slot is CONFIRMED to be this transaction's own
      // data (storedState === state) — safe to inspect and, if needed, clear.
      const startedAtRaw = localStorage.getItem('bs_oauth_started_at');
      if (!startedAtRaw || !isFreshTimestamp(Number(startedAtRaw))) {
        // TTL guard: auth codes expire after 10 minutes per Supabase OAuth
        // docs. Also rejects a future-dated timestamp (corrupted/tampered
        // storage) — either way this is not usable. Clean up before
        // throwing; these keys are confirmed ours to clear.
        localStorage.removeItem('bs_oauth_code_verifier');
        localStorage.removeItem('bs_oauth_state');
        localStorage.removeItem('bs_oauth_nonce');
        localStorage.removeItem('bs_oauth_started_at');
        releaseInflightCode(code, claimOwner);
        throw new Error('PKCE state expired (>10min) — please retry sign-in');
      }

      codeVerifier = localStorage.getItem('bs_oauth_code_verifier');
      storedNonce = localStorage.getItem('bs_oauth_nonce');
    }

    if (!codeVerifier) {
      releaseInflightCode(code, claimOwner);
      throw new Error('PKCE code verifier not found in storage — sign-in session may have been interrupted. Please retry sign-in.');
    }

    if (!storedNonce) {
      releaseInflightCode(code, claimOwner);
      throw new Error('PKCE nonce not found in storage — please retry sign-in.');
    }

    let response: Response;
    try {
      response = await fetch(`${BUSINESS_SUITE_SUPABASE_URL}/auth/v1/oauth/token`, {
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
    } catch (networkErr) {
      // Network-level rejection — no HTTP response, success or failure,
      // ever arrived. Unlike a deterministic server rejection (handled
      // below via response.ok), we genuinely do NOT know whether the OAuth
      // Server processed this single-use code before the response was
      // lost — see {@link BusinessSuiteOAuthExchangeUncertainError}. We do
      // not touch this flow's PKCE verifier, state, nonce, or map entry
      // (a caller may still choose to retry), and we release ONLY our own
      // per-code inflight guard (never a newer transaction's, per
      // {@link releaseInflightCode}) so that choice is not blocked forever
      // by a request that will never resolve. We do NOT promise the retry
      // will succeed — that depends on whether the server already
      // committed the original request.
      releaseInflightCode(code, claimOwner);
      const reason = networkErr instanceof Error ? networkErr.message : String(networkErr);
      throw new BusinessSuiteOAuthExchangeUncertainError(
        `Token exchange response unknown — the network request failed before any server response arrived, so this authorization code's consumption state cannot be determined. Do not assume it is safe to retry with the same code; the recommended recovery is a fresh sign-in. (${reason})`,
        networkErr
      );
    }

    // The server gave a definitive answer (success or rejection), so this
    // transaction is settled. Release our own inflight claim unconditionally
    // (it can only ever be ours by the time we reach here), but clear the
    // legacy flat PKCE keys and this flow's map entry ONLY if they are still
    // confirmed to belong to THIS transaction at this exact moment:
    //   - Legacy keys: re-check `bs_oauth_state === state` fresh, right
    //     before clearing. A concurrent flow (e.g. a second sign-in started
    //     while this fetch was in flight) may have since overwritten the
    //     flat keys with ITS OWN data — unconditionally wiping them here,
    //     as this code previously did, would erase that unrelated flow's
    //     PKCE state out from under it.
    //   - Flow-map entry: re-read the map fresh (not the `flowMapAtStart`
    //     snapshot captured before the `await` above) right before deleting
    //     THIS transaction's own entry — a concurrent flow may have added
    //     or removed entries in the meantime, and writing back the stale
    //     snapshot would silently erase those changes.
    if (localStorage.getItem('bs_oauth_state') === state) {
      localStorage.removeItem('bs_oauth_code_verifier');
      localStorage.removeItem('bs_oauth_state');
      localStorage.removeItem('bs_oauth_nonce');
      localStorage.removeItem('bs_oauth_started_at');
    }
    releaseInflightCode(code, claimOwner);
    if (usingFlowMap) {
      const freshFlowMap = pruneFlowMap(readFlowMap());
      delete freshFlowMap[state];
      writeFlowMap(freshFlowMap);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
    }

    let tokens: BusinessSuiteTokens;
    try {
      tokens = await response.json();
    } catch (cause) {
      throw new BusinessSuiteOAuthExchangeUncertainError(
        'Token exchange response could not be read. Start a fresh sign-in; do not replay this authorization code.',
        cause
      );
    }
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
    localStorage.removeItem(OAUTH_FLOWS_KEY);
    localStorage.removeItem(INFLIGHT_CODES_KEY);
    localStorage.removeItem(LEGACY_INFLIGHT_CODE_KEY); // defensive: pre-1.1 single-value key
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
      // Guard the SUCCESS write too, not just the failure cleanup below: the
      // `await` above is a network round-trip, and in that window a
      // concurrent success (another tab's re-login, or the 60s interval's
      // next tick winning the race) may already have replaced
      // `bs_refresh_token` with a newer session. This attempt's response is
      // still valid on the wire, but writing it now would resurrect a
      // superseded session over whatever currently owns the slot.
      if (localStorage.getItem('bs_refresh_token') !== refreshToken) return;
      localStorage.setItem('bs_access_token', tokens.access_token);
      localStorage.setItem('bs_refresh_token', tokens.refresh_token);
      localStorage.setItem('bs_user', JSON.stringify(user));
      if (tokens.id_token) {
        localStorage.setItem('bs_id_token', tokens.id_token);
      }
    } catch (err) {
      // Ownership check FIRST, before any side effect — including
      // dispatchOAuthExpired. That event is not merely informational:
      // consumer listeners treat it as authoritative and react
      // destructively (Braden's listener signs the user out; R8's listener
      // clears ALL of its own storage, not just BS OAuth keys). Firing it
      // for a refresh token that has ALREADY been superseded by a newer,
      // valid session — because a concurrent tab's re-login or the next
      // interval tick won the race during this attempt's network
      // round-trip — would be a false signal with real destructive
      // consequences downstream, even though this package's own
      // `clearBSTokens()` is correctly skipped in that case.
      if (localStorage.getItem('bs_refresh_token') !== refreshToken) {
        console.warn(
          '[BS OAuth] Stale token refresh failed after being superseded by a newer session — ignoring',
          err
        );
        return;
      }
      const isAuthError = err instanceof Error && /^Token refresh failed: 4/.test(err.message);
      dispatchOAuthExpired(isAuthError ? 'refresh_rejected' : 'network_error');
      console.warn('[BS OAuth] Token refresh failed, clearing tokens:', err);
      clearBSTokens();
    }
  }

  /**
   * Attempt a silent auth refresh before showing the explicit login UI, and
   * report which outcome occurred instead of collapsing
   * them into a boolean.
   *
   * Strategy (in order):
   *
   *   1. **Fast path — local access token still valid.** Returns
   *      `{ status: 'authenticated' }` immediately. No network call. The
   *      token must decode and have a still-future `exp` — a present-but-
   *      expired or malformed value is treated the same as absent and falls
   *      through, matching what `checkAndRefreshToken` already treats as
   *      valid for the same storage key.
   *   2. **Fast path — refresh token present.** Exchanges it for a new
   *      access token via the OAuth Server `/auth/v1/oauth/token` endpoint,
   *      persists the rotated tokens, and returns `{ status: 'authenticated' }`.
   *   3. **Slow path — OIDC silent re-auth via `prompt=none`.** Redirects
   *      the browser to BSU `/auth/v1/oauth/authorize?…&prompt=none` and
   *      returns `{ status: 'redirecting' }`. The OAuth Server either:
   *        - issues an auth code without UI (BSU session exists), or
   *        - redirects back with `error=login_required` (no BSU session).
   *      Navigation is scheduled asynchronously, so `'redirecting'` is the
   *      correct outcome: the caller must NOT treat it as "silent auth
   *      failed, fall back to interactive sign-in now". Doing so races an
   *      interactive `signInWithBusinessSuite()` call against a navigation
   *      that is already under way, which mints a second, redundant PKCE
   *      flow entry and can trip the redirect-loop circuit breaker on the
   *      follow-up interactive call. `'failed'` is reserved for the case
   *      where the redirect itself could not be initiated at all (e.g.
   *      `window.location` unwritable) — that is genuinely safe to treat as
   *      "show the interactive login UI now".
   *
   * @see OIDC Core 1.0 §3.1.2.1 — Authentication Request (`prompt=none`)
   */
  async function attemptSilentAuthDetailed(options?: SilentAuthOptions): Promise<SilentAuthResult> {
    // Fast path 1: existing local access token, but only if it is still
    // usable — a present-but-expired or corrupted value must not be
    // reported as authenticated (see isAccessTokenUsable doc comment).
    const existingToken = localStorage.getItem('bs_access_token');
    if (existingToken && isAccessTokenUsable(existingToken)) {
      return { status: 'authenticated' };
    }

    // Fast path 2: refresh-token exchange.
    const refreshToken = localStorage.getItem('bs_refresh_token');
    if (refreshToken) {
      try {
        const { tokens, user } = await refreshBusinessSuiteToken(refreshToken);
        // Guard the write: the `await` above is a network round-trip, and a
        // concurrent flow (another tab's re-login, sign-out, or the 60s
        // refresh interval winning the race) may already have replaced
        // `bs_refresh_token` while this one was in flight. This response is
        // still valid on the wire but stale locally — writing it now would
        // resurrect a superseded session over whatever currently owns the
        // slot. The ownership check below reports the replacement session
        // or stops this superseded attempt without starting another flow.
        if (localStorage.getItem('bs_refresh_token') === refreshToken) {
          localStorage.setItem('bs_access_token', tokens.access_token);
          localStorage.setItem('bs_refresh_token', tokens.refresh_token);
          localStorage.setItem('bs_user', JSON.stringify(user));
          if (tokens.id_token) {
            localStorage.setItem('bs_id_token', tokens.id_token);
          }
          return { status: 'authenticated' };
        }
      } catch {
        // fall through to slow-path redirect
      }

      // A newer login or logout owns navigation now. This older refresh must
      // neither overwrite it nor start another authorization flow.
      if (localStorage.getItem('bs_refresh_token') !== refreshToken) {
        const replacement = localStorage.getItem('bs_access_token');
        return { status: replacement && isAccessTokenUsable(replacement) ? 'authenticated' : 'superseded' };
      }
    }

    // Slow path: OIDC silent re-auth via prompt=none.
    try {
      await signInWithBusinessSuite({
        prompt: 'none',
        returnTo: options?.returnTo ?? window.location.href,
      });
    } catch (err) {
      // The redirect itself could not be initiated (extremely unlikely —
      // only if window.location is unwritable, or the 10s redirect-loop
      // breaker tripped). This is the one genuine failure case: no
      // navigation is under way, so it is safe for the caller to fall back
      // to the interactive login UI immediately.
      return { status: 'failed', reason: err instanceof Error ? err.message : String(err) };
    }

    // Location assignment schedules navigation; this return can execute in
    // a real browser. Callers must stop rather than start a second flow.
    return { status: 'redirecting' };
  }

  /**
   * Boolean-returning convenience wrapper over {@link attemptSilentAuthDetailed}
   * for existing callers. Preserves the original contract exactly:
   * `true` only for `'authenticated'`; `false` for both `'redirecting'` and
   * `'failed'`, since neither means "silently authenticated". Callers that
   * need to avoid double-initiating an interactive sign-in while a silent
   * `prompt=none` redirect is still in flight should adopt
   * {@link attemptSilentAuthDetailed} directly and branch on `'redirecting'`
   * vs `'failed'` instead of falling back to interactive sign-in on every
   * `false`.
   */
  async function attemptSilentAuth(options?: SilentAuthOptions): Promise<boolean> {
    const result = await attemptSilentAuthDetailed(options);
    return result.status === 'authenticated';
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
    attemptSilentAuthDetailed,
  };
}
