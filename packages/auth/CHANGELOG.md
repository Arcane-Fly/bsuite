# @bsuite/auth — Changelog

All notable changes to this package are documented here. This project adheres to [Semantic Versioning](https://semver.org/).

## 1.0.1 — 2026-09-09

### Added

- Opt-in same-origin session ownership coordinator using Web Locks, durable logout revocations and recovery markers. Older commits cannot publish after a newer sign-in or logout; failed cleanup must reconcile before another commit.
- Per-state ownership bindings and a synchronous `beforeRedirect` hook for carrying the original attempt across OAuth navigation. A failed binding cancels its redirect and preserves unrelated flows.
- Adapter guide and adversarial tests covering superseded session writes, partial publication, cleanup failure and delayed logout.
- `attemptSilentAuthDetailed()` distinguishes authenticated, redirecting, failed, and superseded outcomes. The existing boolean API remains compatible; consumers must adopt the detailed result to avoid starting an interactive authorization while silent navigation is pending.
- `hasPendingBusinessSuiteTransaction(state)` shares the validated pending-transaction predicate with callback adapters.

### Fixed

- Keep concurrent PKCE transactions and per-code exchange claims isolated; late cleanup cannot release a replacement claim or erase another flow.
- Reject malformed or expired transaction records and missing or mismatched requested ID-token nonces.
- Ignore superseded refresh results before token writes, expiry events, or navigation.
- Report an uncertain token exchange explicitly when transport or response-body reading fails; callers must start a fresh sign-in instead of replaying a potentially consumed code.
- Clear pending flow maps on sign-out with the other OAuth transaction state.

Consumer adoption of the session ownership coordinator and the detailed silent-auth result, and deployed acceptance across the five client apps, are required separately from this package release. See [session ownership](docs/session-ownership.md) for the integration contract.

## 0.2.7 — 2026-07-06

### Fixed — concurrent OAuth flows no longer clobber each other's PKCE state

**Root cause:** `signInWithBusinessSuite()` persisted PKCE `state`/`code_verifier`/`nonce` in a single fixed set of `localStorage` keys (`bs_oauth_state`, `bs_oauth_code_verifier`, `bs_oauth_nonce`, `bs_oauth_started_at`). `localStorage` is a per-origin singleton shared across tabs, so a second sign-in attempt — an auto-initiator using `prompt: 'none'` silent re-auth racing a manual click, or a genuine second-tab flow — overwrote those keys before the first flow's callback returned. The first flow's `exchangeCodeForTokens()` then compared its returned `state` against the second flow's overwritten value and failed with "Invalid state parameter - possible CSRF attack", even though nothing malicious occurred. Reported against production `crm.crm7.app`.

**Fix:** `signInWithBusinessSuite()` now dual-writes each flow's `{ verifier, nonce, startedAt }` into a state-keyed map at `localStorage['bs_oauth_flows']` (JSON: `{ [state]: { verifier, nonce, startedAt } }`), in addition to the existing legacy flat keys. The map is pruned on every write to the 10-minute PKCE TTL and capped at the 5 most recent entries.

`exchangeCodeForTokens()` now looks up the *returned* `state` in the flow map first. A hit is exactly as CSRF-safe as the legacy single-key comparison — a map entry can only exist if this origin's own `signInWithBusinessSuite()` minted it — so concurrent flows each resolve against their own verifier/nonce regardless of which one last touched the legacy keys. If no map entry is found (older `@bsuite/auth` versions, or a flow started before this release), the code falls back to the legacy single-key path unchanged for one release of backward compatibility. An unknown `state` present in neither the map nor the legacy keys still throws the CSRF error. On successful exchange, the consumed map entry is deleted and the legacy keys are cleared as before.

**Hygiene fix:** on the invalid-state CSRF error path, all stale `bs_oauth_*` keys are now cleared (previously only `bs_oauth_inflight_code` was cleared), so a failed flow doesn't leave orphaned PKCE state behind for the next attempt.

The existing 10-minute PKCE TTL, inflight-code idempotency sentinel, and 10-second redirect-loop circuit breaker in `signInWithBusinessSuite()` are unchanged.

**Tests added:** 7 new cases under `concurrent OAuth flows (bs_oauth_flows map)` — dual-write on sign-in, slower-flow-succeeds-after-clobber (the core regression), map-entry removal on success, unknown-state still throws CSRF, stale map entries beyond the TTL are ignored, the map is pruned to the TTL window on each new flow, and the map is capped at 5 entries with oldest-first eviction.

**Why a patch:** purely additive and backward-compatible — no change to the `OAuthClient` public API, the callback `setSession()` bridge, or existing single-flow behavior.

## 0.2.5 — 2026-06-05

### Added — cross-tab logout and refresh-rejection expiry events

- `startBSTokenRefresh()` now listens for `storage` events where another tab removes `bs_access_token`, clears the remaining BS OAuth keys in the current tab, and dispatches `bs-oauth-expired` with `reason: 'cross_tab_logout'`.
- Refresh failures now dispatch `bs-oauth-expired` for both non-auth/network failures (`reason: 'network_error'`) and 4xx OAuth rejection failures (`reason: 'refresh_rejected'`) before clearing tokens.
- The cleanup function returned by `startBSTokenRefresh()` removes the storage listener as well as the interval.

## 0.2.4 — 2026-05-29

### Fixed — logout cleanup clears PKCE and OAuth callback sentinels

- `clearBSTokens()` now removes all BS OAuth callback and PKCE state from `localStorage`: `bs_oauth_code_verifier`, `bs_oauth_state`, `bs_oauth_nonce`, `bs_oauth_started_at`, `bs_oauth_inflight_code`, and `auth_return_path`.
- This keeps sign-out as a full browser-side OAuth reset without reintroducing cookie SSO or cross-domain shared cookie storage.
- Regression coverage added for the expanded cleanup set.

## 0.2.3 — 2026-05-07

### Fixed — ID token `aud` claim verification (post-Stage-3 regression)

**Root cause:** `verifyIdToken()` was passing `audience: 'authenticated'` to `jose.jwtVerify`, but per [Supabase OAuth Flows §6 "Access token structure"](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows#access-token-structure) and [OIDC Core 1.0 §3.1.3.7](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation), the **ID token `aud` is the OAuth client_id**, not `'authenticated'`. The access token's `aud` IS `'authenticated'` — these two tokens have different audience semantics.

When Supabase began enforcing the `aud` claim strictly on ID tokens, every successful `/oauth/token` exchange surfaced "Authentication Error / unexpected 'aud' claim value" on the consumer app's `/auth/callback` page. Symptoms in production (verified 2026-05-07T04:51Z on `crm.crm7.app/auth/callback`):

- `/oauth/token` returns 200 with valid tokens (server-side OK)
- Client `verifyIdToken()` throws on the `aud` claim check
- Callback bails before `setSession()` runs
- Consumer Supabase REST/RPC queries fall back to anon → 401 on `/rest/v1/rpc/branding_json_for_tenant` and `/rest/v1/platform_branding`

**Fix:** `verifyIdToken(idToken, expectedNonce, clientId)` now takes `clientId` as a third parameter and passes `audience: clientId` to `jwtVerify`. The access token verifier (`verifyAccessToken`) keeps `audience: 'authenticated'` — that's still canonical per Supabase docs.

**Test added:** `verifies id_token with audience=clientId, NOT "authenticated"` — regression guard checking the exact arguments passed to `jose.jwtVerify` for both verifier calls.

**Source citations:**

- [Supabase OAuth Server / OAuth Flows §6](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows#access-token-structure)
- [OIDC Core 1.0 §3.1.3.7 ID Token Validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
- Internal: `supabase-auth-comprehensive` skill v2.1.0 §10 "ID token vs Access token — `aud` claim differs"

## 0.2.2 — 2026-05-08

### Fixed — Stage-3 PKCE state storage: sessionStorage → localStorage

**Root cause:** The `bs_oauth_code_verifier`, `bs_oauth_state`, `bs_oauth_nonce`, and
`auth_return_path` keys were written to `sessionStorage`. This caused
`"PKCE code verifier not found in storage"` failures under real-world conditions:

- Refreshing `/auth/callback` after redirect (auth code is single-use; the page
  must re-use the same verifier on reload, but sessionStorage was wiped by the browser)
- ITP/ETP-Strict cross-site navigation in Safari / Firefox (sessionStorage nuked
  on cross-origin redirect chain)
- Privacy extensions that clear sessionStorage on navigation
- Login links opened in a new tab/window (sessionStorage is not shared across tabs)

The `"unexpected 'aud' claim value"` follow-up error was from the fall-through
path in the callback trying `supabase.auth.exchangeCodeForSession()` with a
native-PKCE verifier key that didn't match.

**Fix:** All four keys now written to `localStorage` (per-origin, survives all
the above failure modes). Per [Supabase PKCE Flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow):
> "code exchange must be initiated on the same browser and device where the
> flow was started" — localStorage satisfies this while sessionStorage does not.

### Added — 10-minute TTL guard on PKCE state

`signInWithBusinessSuite()` now writes `localStorage['bs_oauth_started_at']` =
`Date.now()` alongside the verifier. `exchangeCodeForTokens()` rejects with
`"PKCE state expired (>10min) — please retry sign-in"` if more than 10 minutes
have elapsed. Auth codes expire after 10 minutes per [Supabase OAuth flows docs](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows),
so this guard prevents exchanges that would fail anyway. The cleanup on TTL
expiry gives the user a fresh slate.

### Added — Idempotent exchange via inflight-code sentinel

`exchangeCodeForTokens()` now writes `localStorage['bs_oauth_inflight_code']` =
`code` at the start of exchange and clears it in the cleanup block. If called a
second time with the same code (e.g. the user refreshed `/auth/callback`
mid-flight), it throws `"Code exchange already in progress — please wait or
retry sign-in"` immediately. Auth codes are single-use, so the duplicate request
would fail anyway; this gives a clearer error.

### Migration note

- **BREAKING (semver-patch):** PKCE state keys move from `sessionStorage` to `localStorage`.
  Existing `sessionStorage` entries are abandoned — no migration needed as they
  expire with the tab.
- Consumers do not need code changes. The keys are internal to `@bsuite/auth`.
- `auth_return_path` also moves to `localStorage` — consumer callback handlers
  reading this key must update their read (CRM7 callback updated in this release).

### References

- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase OAuth Flows](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
- [Supabase OAuth Getting Started](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
- `AUTH_CANONICAL.md` §Canonical pattern — localStorage per-domain token storage

---

## 0.2.1 — 2026-05-06

### Added — redirect-loop circuit breaker (regression guard)

- `signInWithBusinessSuite` now stamps `localStorage['bs_oauth_last_redirect_at']` with `Date.now()` immediately before assigning `window.location.href`. Subsequent calls within 10s throw `BS OAuth redirect attempted within 10s of previous redirect — refusing to loop.` *before* rotating PKCE state, so a tripped breaker leaves session storage clean.
- This is defense-in-depth: under normal OAuth flow timing the breaker never fires (the browser navigates away the moment `window.location.href` is assigned and does not execute client JS again until well after the round-trip to BSU + consent + callback). The guard exists so that if a future caller — e.g. an `AuthProvider` mount-effect — accidentally re-introduces a redirect loop, production users see a loud error rather than a silent spin.
- Skipped under SSR / private-browsing / storage-disabled rather than blocking legitimate sign-ins on a storage edge case.

### Why a patch (not a minor)

No public API changes. No behaviour change for any caller that wasn't already in a redirect loop. The added throw is on a code path that should never be exercised by correct callers.

### Manual reset

If a recovery flow or a deliberate retry trips the breaker, clear `localStorage['bs_oauth_last_redirect_at']` from the browser console.

### Reference

- `bsuite_incident_20260506_silent_auth_redirect_loop` (memory) — the `@bsuite/auth@0.2.0` `prompt=none` regression that motivated this guard.

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
