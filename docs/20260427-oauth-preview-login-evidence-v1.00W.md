# OAuth Preview Login Evidence

This note records the OAuth preview-login blocker analysis and exact-match callback URI registration for BSuite preview inspection.

## Problem

Authenticated inspection of development/review Vercel deployments was blocked because OAuth callback URLs from preview origins did not exactly match entries in `auth.oauth_clients.redirect_uris`, or BSU login bounce-back lacked the originating preview origin.

## Constraints

- Supabase OAuth 2.1 requires `redirect_uri` to exactly match a registered OAuth client redirect URI.
- No wildcard OAuth client redirect URIs were added.
- PKCE state/nonce validation and JWKS token verification remain mandatory.
- BSU remains the only OAuth server/consent surface.

## Current OAuth Client Registry Shape

`auth.oauth_clients` uses `id` as the OAuth client identifier. There is no `client_id` column.

Relevant columns:

- `id`
- `client_name`
- `redirect_uris`
- `grant_types`
- `client_type`
- `token_endpoint_auth_method`
- `deleted_at`

## Vercel Preview Aliases Observed

Observed via Vercel MCP on 2026-04-27.

| App | Development / Review Alias |
|---|---|
| BSU | `business-suite-git-development-braden-pty-ltd.vercel.app` |
| CRM7 | `crm7-git-development-braden-pty-ltd.vercel.app` |
| CRM7 integration | `crm7-git-reconcile-crm7integration-braden-pty-ltd.vercel.app` |
| CRM7 AVETMISS | `crm7-git-reconcile-crm7avetmiss-braden-pty-ltd.vercel.app` |
| Conduit | `conduit-git-development-braden-pty-ltd.vercel.app` |
| Conduit release | `conduit-git-release-conduit-bsu-oauth-21-merge-braden-pty-ltd.vercel.app` |
| R80.3 | `r8-git-development-braden-pty-ltd.vercel.app` |
| Throughput | `throughput-git-development-braden-pty-ltd.vercel.app` |
| Throughput dry-lint branch | `throughput-git-chore-dry-lint-020-bump-braden-pty-ltd.vercel.app` |
| Braden | `braden-git-development-braden-pty-ltd.vercel.app` |

## Registered Callback URIs

Updated directly in Supabase project `tuybltdrdefjblnplpqo` via MCP SQL on 2026-04-27.

| Client | Client ID | Registered Redirect URIs |
|---|---|---|
| CRM7 | `30f76744-3e0b-40bf-abb8-8c587389802e` | `https://crm.crm7.app/auth/callback`, `https://crm7-git-development-braden-pty-ltd.vercel.app/auth/callback`, `https://crm7-git-reconcile-crm7integration-braden-pty-ltd.vercel.app/auth/callback`, `https://crm7-git-reconcile-crm7avetmiss-braden-pty-ltd.vercel.app/auth/callback` |
| Conduit | `da925c19-8f32-40a0-b74d-4eb9540c422f` | `https://conduit.crm7.app/auth/callback`, `https://conduit-git-development-braden-pty-ltd.vercel.app/auth/callback`, `https://conduit-git-release-conduit-bsu-oauth-21-merge-braden-pty-ltd.vercel.app/auth/callback` |
| R8 | `5d804d20-cd1b-4724-9107-86d2a9e51e09` | `https://r8.crm7.app/auth/callback`, `https://r8-git-development-braden-pty-ltd.vercel.app/auth/callback` |
| Throughput | `35f0db49-ef62-4115-baba-7b961f034cc3` | `https://ideas.crm7.app/auth/callback`, `https://throughput-git-development-braden-pty-ltd.vercel.app/auth/callback`, `https://throughput-git-chore-dry-lint-020-bump-braden-pty-ltd.vercel.app/auth/callback` |
| Braden.com.au | `dcb7af18-254a-4946-b94d-5c606b01fc3f` | `https://www.braden.com.au/auth/callback`, `https://braden-git-development-braden-pty-ltd.vercel.app/auth/callback` |

## Verification Performed

- Confirmed Supabase docs state OAuth 2.1 `redirect_uri` must exactly match a registered redirect URI.
- Confirmed `auth.oauth_clients` schema and corrected the query from non-existent `client_id` to `id`.
- Confirmed the update by selecting `id`, `client_name`, and `redirect_uris` after the transaction committed.
- Patched CRM7 preview bounce-back in `crm7/src/pages/auth/login.tsx`, `crm7/src/pages/auth/callback.tsx`, and `crm7/src/components/marketing/MarketingHome.tsx` so BSU login receives the initiating preview origin.
- Patched Conduit direct BSU login stubs so protected-route middleware, candidate portal CTA, and marketing CTAs route through local `/auth/login?return_path=...`; that page remains the local initiator for Conduit's distinct `@bsuite/auth` OAuth client.
- Added Conduit return-path persistence through `sessionStorage` in `src/lib/auth/return-path.ts`, `src/app/auth/login/page.tsx`, and `src/app/auth/callback/page.tsx`.
- Updated BSU OAuth registry guardrails so Conduit is treated as a fifth distinct OAuth client, not as a duplicate of another app registration.

## No OAuth Implementation Duplication Check

Conduit still delegates OAuth mechanics to the shared `@bsuite/auth` package:

- OAuth client wrapper: `conduit/src/lib/business-suite-oauth.ts`
- Shared implementation: `packages/auth/src/oauth-client.ts`
- Conduit app-specific client ID: `da925c19-8f32-40a0-b74d-4eb9540c422f`

Focused scan showed OAuth mechanics only in `packages/auth/src/oauth-client.ts`:

```bash
rg -n 'createOAuthClient\(|generateCodeVerifier|generateCodeChallenge|oauth/token|oauth/authorize|jwtVerify|createRemoteJWKSet' conduit/src packages/auth/src
```

The only Conduit hit outside comments is `createOAuthClient(CONDUIT_OAUTH_CLIENT_ID)` in `conduit/src/lib/business-suite-oauth.ts`.

## Automated Verification

Commands run on 2026-04-27:

| Project | Command | Result |
|---|---|---|
| Conduit | `pnpm typecheck` | PASS |
| Conduit | `pnpm lint` | PASS; Node package-type warning only |
| Conduit | `pnpm exec vitest run src/lib/supabase/__tests__/middleware.test.ts src/test/wcag-static.test.ts` | PASS — 2 files, 65 tests |
| Conduit | `pnpm build` | PASS; Next.js workspace-root and `--localstorage-file` warnings only |
| BSU | `pnpm typecheck` | PASS |
| BSU | `pnpm lint` | PASS with 18 pre-existing unrelated warnings; no errors |
| BSU | `pnpm exec vitest run src/pages/oauth/OAuthConsent.test.tsx` | PASS — 1 file, 42 tests |
| BSU | `pnpm build:noprerender` | PASS |

## Code-Side Closure

The code-side blocker is closed for CRM7 and Conduit:

- no direct `suite.crm7.app/login?return_to=conduit` stubs remain in Conduit source;
- Conduit local login keeps the initiating origin, including Vercel preview origins;
- BSU registry surfaces and tests now include all five distinct OAuth clients;
- no wildcard OAuth client redirect URIs were added;
- no duplicate OAuth implementation was introduced.

## Remaining Runtime Verification

After Claude Code finishes active workstreams and preview deployments settle, perform browser-based authenticated smoke tests for:

- CRM7 development and active review alias;
- Conduit release alias;
- R80.3 development alias;
- Throughput development alias;
- Braden development alias.

The expected result is that each login round trip returns to the same preview origin that initiated authentication.
