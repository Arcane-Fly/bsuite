/**
 * Shared types for BSuite OAuth 2.1 PKCE client.
 *
 * @see https://supabase.com/docs/guides/auth/oauth-server/getting-started
 */

export interface BusinessSuiteTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

export interface VerifiedUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  client_id?: string;
  role?: string;
}

/**
 * OIDC `prompt` parameter values supported by Supabase OAuth Server.
 * - `none`  — silent re-auth: BSU returns an auth code if a session exists,
 *             otherwise redirects back with `error=login_required`.
 * - `login` — force the consent screen even if a session exists.
 */
export type OidcPrompt = 'none' | 'login';

export interface SignInOptions {
  /** Synchronously bind state to session ownership before navigation. Throw to cancel. */
  beforeRedirect?: (state: string) => undefined;
  /** OIDC prompt parameter — when `'none'`, the call attempts silent re-auth. */
  prompt?: OidcPrompt;
  /**
   * Where to navigate back to after a successful callback. Defaults to
   * `window.location.href`. Stashed under `localStorage['auth_return_path']`
   * so the callback can sanitize and redirect once the auth code arrives.
   */
  returnTo?: string;
}

export interface SilentAuthOptions {
  /** Passed through only when silent auth initiates an authorization redirect. */
  beforeRedirect?: (state: string) => undefined;
  /** Where to return after silent re-auth completes. Defaults to current URL. */
  returnTo?: string;
}

/**
 * Outcome of an `attemptSilentAuthDetailed` call.
 * - `authenticated` — a usable session exists (local token or refresh succeeded).
 * - `redirecting`   — an OIDC `prompt=none` redirect was initiated. In a real
 *   browser the page is navigating away; callers must NOT treat this as a
 *   failure and fall back to interactive sign-in, which would race a second
 *   navigation against the one already in flight.
 * - `failed`        — the redirect itself could not be initiated (e.g. the
 *   10s redirect-loop breaker tripped, or `window.location` is unwritable).
 *   No navigation is under way; it is safe to fall back to interactive UI.
 * - `superseded` — another session change took ownership while this call
 *   awaited refresh. Stop; do not initiate another navigation.
 */
export type SilentAuthStatus = 'authenticated' | 'redirecting' | 'failed' | 'superseded';

export interface SilentAuthResult {
  status: SilentAuthStatus;
  /** Present only when `status === 'failed'`. */
  reason?: string;
}

export interface OAuthClient {
  signInWithBusinessSuite: (options?: SignInOptions) => Promise<void>;
  exchangeCodeForTokens: (
    code: string,
    state: string
  ) => Promise<{ tokens: BusinessSuiteTokens; user: VerifiedUser }>;
  refreshBusinessSuiteToken: (
    refreshToken: string
  ) => Promise<{ tokens: BusinessSuiteTokens; user: VerifiedUser }>;
  verifyAccessToken: (token: string) => Promise<VerifiedUser>;
  getUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
  clearBSTokens: () => void;
  startBSTokenRefresh: () => () => void;
  /**
   * Boolean convenience wrapper — see {@link SilentAuthResult} and
   * `attemptSilentAuthDetailed` for the full outcome contract this
   * collapses. `true` only for `'authenticated'`.
   */
  attemptSilentAuth: (options?: SilentAuthOptions) => Promise<boolean>;
  /**
   * Additive, non-breaking sibling of `attemptSilentAuth` that reports the
   * full three-outcome result instead of a boolean. Prefer this for any new
   * call site — it is the only way to distinguish "a `prompt=none` redirect
   * is in flight" from "silent auth genuinely failed", which matters
   * because treating the former as the latter double-initiates sign-in.
   */
  attemptSilentAuthDetailed: (options?: SilentAuthOptions) => Promise<SilentAuthResult>;
}
