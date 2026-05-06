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
  /** OIDC prompt parameter — when `'none'`, the call attempts silent re-auth. */
  prompt?: OidcPrompt;
  /**
   * Where to navigate back to after a successful callback. Defaults to
   * `window.location.href`. Stashed under `sessionStorage['auth_return_path']`
   * so the callback can sanitize and redirect once the auth code arrives.
   */
  returnTo?: string;
}

export interface SilentAuthOptions {
  /** Where to return after silent re-auth completes. Defaults to current URL. */
  returnTo?: string;
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
  attemptSilentAuth: (options?: SilentAuthOptions) => Promise<boolean>;
}
