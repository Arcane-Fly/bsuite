# @bsuite/auth — Changelog

All notable changes to this package are documented here. This project adheres to [Semantic Versioning](https://semver.org/).

## 0.2.0 — 2026-05-06

### Added — OIDC silent re-auth via `prompt=none` (Track B)

- `signInWithBusinessSuite(options?: { prompt?: 'none' | 'login'; returnTo?: string })` — added `options` argument. The `prompt` value is forwarded to BSU's `/auth/v1/oauth/authorize` per OIDC Core 1.0 §3.1.2.1. `returnTo` is stashed at `sessionStorage['auth_return_path']` for the callback handler.
- `attemptSilentAuth(options?: { returnTo?: string })` — added `options` argument. The function now performs **real** OIDC silent re-auth: when no local access/refresh token is available (or refresh fails), it redirects the browser to BSU `/auth/v1/oauth/authorize?prompt=none&…`. The OAuth Server returns either an auth code (silent success) or `error=login_required` (delivered to the consumer's callback page).
- New types `OidcPrompt`, `SignInOptions`, `SilentAuthOptions` exported from `@bsuite/auth/types`.

### Changed — public API surface

- The `signInWithBusinessSuite` signature changed from `() => Promise<void>` to `(options?: SignInOptions) => Promise<void>`. The optional argument is backwards-compatible at the call-site for existing consumers.
- The `attemptSilentAuth` signature changed from `() => Promise<boolean>` to `(options?: SilentAuthOptions) => Promise<boolean>`. **Behaviour change**: previously returned `false` when no tokens were stored; now redirects via `prompt=none` (and only returns `false` when the redirect itself is suppressed, e.g. JSDOM in tests).

### Why a minor (not a patch)

The behaviour change in `attemptSilentAuth` is observable by callers: previously a no-token call was a synchronous "you are unauthenticated" signal, now it triggers a navigation. Consumers that called `attemptSilentAuth()` and rendered an unauthenticated UI based on the `false` result need to be aware that the call may navigate. This is the **intended doctrine fix per `AUTH_CANONICAL.md`** (cross-app SSO via OIDC, not local-storage probing) — the prior behaviour was the very bug Track B exists to fix.

### Migration

Consumer apps do not need to change their OAuth-callback wiring (the callback is dual-purpose for native PKCE / BS OAuth 2.1 PKCE today; the only addition is handling `error=login_required` returned by `prompt=none`). Each consumer should:

1. Wire `attemptSilentAuth({ returnTo: window.location.href })` into the boot path (e.g. crm7's `AuthContext` runs it before rendering unauthenticated when `getSession()` returns null).
2. In the callback handler, when `url.searchParams.get('error') === 'login_required'`, clear stale tokens, clear PKCE state, and route the user to the app's interactive login (typically `/auth/login`) — not back to `prompt=none` again, which would loop.

The two changes are shipped together as a single canonical doctrine update across crm7, R80.3, Braden, Throughput, and Conduit.

### Notes

- BSU's `/auth/v1/oauth/authorize` is the Supabase-hosted OAuth Server (`tuybltdrdefjblnplpqo.supabase.co`), which is OIDC-spec-compliant and honours `prompt=none` natively. No custom BSU server changes are required for the doctrine flip.

## 0.1.2 — 2026-05-05

### Fixed

- Published tarball no longer contains leaked test artifacts. Prior `0.1.1` build shipped `dist/__tests__/*.{js,d.ts}` (including a `setup.ts` with a `@testing-library/jest-dom` import) into the published package because `tsconfig.build.json` was last rebuilt before the test-exclude was consolidated. Consumer-facing impact was minimal (jsdom-setup + small test helpers, never imported by any BSuite app per `rg @bsuite/auth.*__tests__` sweep), but the tarball is now clean.

### Changed

- Canonicalised `tsconfig.build.json` `exclude` to the 5-entry pattern: `src/__tests__`, `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/**/*.spec.ts`, `src/**/*.spec.tsx`. Same semantics as before (still excludes tests from the build), but now matches the reference pattern documented in `docs/20260505-bsuite-dependency-refresh-ts6-migration-v1.00W.md` §2.1 and propagated to all 6 sibling `@bsuite/*` packages in the same session.

### Notes

- No runtime behaviour changes. Public API is byte-identical to `0.1.1`. Consumers on `^0.1.0` or `^0.1.1` pick this up automatically via semver caret on next install.

## 0.1.1 — 2026-05-05

### Added

- `README.md` documenting the verified public API, usage pattern, storage keys, and design notes.
- `CHANGELOG.md` (this file).
- `pnpm-lock.yaml` so the new CI publish workflow can run `pnpm install --frozen-lockfile`.
- CI publish workflow at `.github/workflows/publish-auth.yml` (was missing; sibling `@bsuite/*` packages already had theirs).

### Notes

- No runtime behaviour changes. `dist/` content is byte-identical to 0.1.0 for the OAuth flow, token exchange, JWKS verification, OIDC silent re-auth, and the auto-refresh loop. Consumers on `^0.1.0` pick this up automatically via semver caret on their next install.
- Version bump is intentional so the new README, CHANGELOG, lockfile, and CI workflow ship under a tagged version rather than overwriting `0.1.0` in place.

## 0.1.0 — 2026-04-20

### Added

- Initial release. OAuth 2.1 PKCE client with `createOAuthClient(clientId)`, PKCE S256 flow, JWKS verification (RS256/ES256 via `jose`), OIDC silent re-auth (`attemptSilentAuth`), interval-based token refresh (`startBSTokenRefresh` returning a cleanup function), and `localStorage` token lifecycle helpers.
- Consumed by CRM7, Conduit, R80.3, Braden, Throughput.
