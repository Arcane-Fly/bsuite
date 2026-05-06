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

export interface SilentAuthOptions {
  promptNone?: boolean;
}

export type SilentAuthResult = boolean | 'redirect_started';

export interface OAuthClient {
  signInWithBusinessSuite: () => Promise<void>;
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
  attemptSilentAuth: (options?: SilentAuthOptions) => Promise<SilentAuthResult>;
}
