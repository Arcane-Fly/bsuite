/**
 * @bsuite/auth — Shared OAuth 2.1 PKCE client for BSuite applications
 *
 * Uses JWKS for token verification via jose. Consistent with Supabase
 * OAuth 2.1 server endpoints and PKCE flow.
 *
 * @see https://supabase.com/docs/guides/auth/oauth-server/getting-started
 */

export {
  BusinessSuiteOAuthExchangeUncertainError,
  createOAuthClient,
  hasPendingBusinessSuiteTransaction,
} from './oauth-client.js';
export type {
  BusinessSuiteTokens,
  OAuthClient,
  SilentAuthOptions,
  SilentAuthResult,
  SilentAuthStatus,
  SignInOptions,
  VerifiedUser,
} from './types.js';
export {
  AuthCoordinationUnavailableError,
  AuthOwnershipSupersededError,
  createAuthSessionCoordinator,
} from './session-ownership.js';
export type {
  AuthOwnershipSnapshot,
  AuthOwnershipEnvironment,
  AuthSessionLock,
  AuthCommitScope,
  AuthSessionAdapter,
  AuthSessionCommit,
} from './session-ownership.js';
