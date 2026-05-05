# @bsuite/auth — Changelog

All notable changes to this package are documented here. This project adheres to [Semantic Versioning](https://semver.org/).

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
