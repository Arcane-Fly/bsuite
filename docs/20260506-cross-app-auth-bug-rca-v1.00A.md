# Cross-App Auth Bug RCA + Remediation — 2026-05-06

**Status:** A (Approved investigation; defensive remediation + CRM7 session bridge shipped, OIDC silent re-auth tracked)
**Tracking issue:** [GaryOcean428/bsuite#505](https://github.com/GaryOcean428/bsuite/issues/505)
**Affected user:** ebdb7d74-a3ba-44d8-8e1b-2973a9b14420
**Supabase project:** tuybltdrdefjblnplpqo

## Symptoms

User reported: signs in to crm7 alone (works), signs in to BSU alone (works), but navigating BSU → crm7 logs them out. Browser console shows:

- `GET /rest/v1/profiles?...&id=eq.<uuid>` → **406 Not Acceptable**
- `GET /rest/v1/platform_branding?id=eq.platform` → **401 Unauthorized**
- `POST /rest/v1/rpc/branding_json_for_tenant` → **401 Unauthorized**
- Deprecated zustand default-export warning in `instrument.*.js`
- PWA `beforeinstallprompt` advisory

## Root cause

`AUTH_CANONICAL.md` (effective 2025-02-27) prescribes cross-app SSO via **BS OAuth 2.1 PKCE + JWKS** silent re-auth (`prompt=none`) through `@bsuite/auth`'s `attemptSilentAuth()`. Cookie SSO is explicitly forbidden.

Initial audit found that **the silent re-auth portion of the doctrine is not implemented in code**:

1. `attemptSilentAuth()` in `packages/auth/src/oauth-client.ts:326-346` only checks per-domain `localStorage` for `bs_access_token` / `bs_refresh_token`. It does not issue an OIDC `prompt=none` redirect to BSU.
2. crm7's `AuthContext` (`crm7/src/contexts/AuthContext.tsx:119-156`) calls `supabase.auth.getSession()` on mount and renders unauthenticated on null. **It never calls `attemptSilentAuth()`.**
3. Consequence: a user who is signed in at BSU but has no Supabase session at crm7's domain renders as logged-out until the normal CRM7 login redirect flow is entered. The 401s on `platform_branding` and the RPC are derivative of the missing Supabase client session.

Follow-up Supabase MCP inspection found the reported user does have a `public.profiles` row, but lacked tenant claims in `auth.users.raw_app_meta_data`. With an anon Supabase client session, RLS hides the own-profile row, so `.single()` also returns 406 (PostgREST cannot satisfy `Accept: application/vnd.pgrst.object+json` with 0 visible rows).

## Decision

Two-track remediation:

### Track A — Defensive client + bootstrap (SHIPPED in this session)

PR: [GaryOcean428/crm7#487](https://github.com/GaryOcean428/crm7/pull/487)

- Switch every user-keyed `profiles` fetch from `.single()` to `.maybeSingle()` so missing rows produce `null` instead of 406. Affected: `usePlatformRole.ts`, `tenantSwitcherService.ts`, `useDevMode.ts`.
- Migration `20260506000100_bootstrap_profile_for_existing_users.sql`:
  - Detects active `profiles` PK column (`id` vs `user_id`) via `information_schema`.
  - Re-defines `handle_new_user()` to insert against the active PK with `ON CONFLICT DO NOTHING`.
  - Re-binds `on_auth_user_created` trigger on `auth.users`.
  - Backfills missing rows.
  - Idempotent.
- DB application of the profile-bootstrap migration from crm7#487 remains tracked separately if not already applied by its PR pipeline.

### Track A2 — CRM7 OAuth-token → Supabase session bridge (SHIPPED after RCA)

Commit: `GaryOcean428/crm7@bc4eae77`

- CRM7 callback now calls `supabase.auth.setSession({ access_token, refresh_token })` after the BS OAuth code exchange. Supabase OAuth Server access tokens are Supabase-compatible JWTs, but they are not automatically installed into the per-domain `supabase-js` client until this bridge runs.
- CRM7 `AuthContext` re-seeds `supabase.auth.setSession()` from `bs_access_token` / `bs_refresh_token` whenever `@bsuite/auth` rotates the BS OAuth access token.
- WCAG login tests now block redirect URLs via a URL-parsed helper so direct `https://suite.crm7.app/...` OAuth redirects are caught reliably.
- Supabase MCP migration `20260506003000_backfill_app_metadata_tenant_id_from_profiles` was applied to project `tuybltdrdefjblnplpqo` and recorded as version `20260506001528`. It populated `app_metadata.tenant_id`, `app_metadata.home_tenant_id`, and `app_metadata.current_tenant_id` from `public.profiles` for profile-linked users missing tenant claims.
- Verification: affected user `ebdb7d74-a3ba-44d8-8e1b-2973a9b14420` now has app metadata tenant claims; profile-linked missing-tenant count is 0.

### Track B — OIDC silent re-auth (DESIGNED, NOT SHIPPED — too risky for the executing session)

Per AUTH_CANONICAL.md doctrine. Implementation plan in issue #505 §"W1 — Doctrine-correct fix":

1. `@bsuite/auth` v0.2.0: add `prompt` parameter to `signInWithBusinessSuite`; modify `attemptSilentAuth` to redirect with `prompt=none` when no local token.
2. Each consumer's auth callback handles `error=login_required` by routing to `/auth/login`.
3. Each consumer's `AuthContext` calls `attemptSilentAuth()` before rendering unauthenticated, with a sessionStorage loop guard.
4. Verify BSU `/auth/v1/oauth/authorize` honours `prompt=none` per OIDC Core §3.1.2.6.
5. CI grep gate: every consumer must reference `attemptSilentAuth` from its boot path.

Reasons not shipped in this session:

- Touches a published npm package (`@bsuite/auth`) — requires version bump + republish + propagation to 5 consumers.
- Requires confirmation that BSU's OAuth server supports `prompt=none`; cannot confirm without DB / live server access (none available in this session).
- Risk of breaking cross-app auth further if shipped half-implemented.

### Track C — No-op confirmations

- **W5 (zustand):** all repos use `zustand@^5.0.13` with named imports. The deprecated-default warning seen in production is from a stale CDN-cached bundle or service-worker cache, not the current source. No code change required.
- **W6 (PWA):** crm7 already implements `beforeinstallprompt` correctly (`src/hooks/usePWA.ts:101-109`, `src/components/pwa/InstallPrompt.tsx:131-148`). BSU has no PWA — the advisory is informational.

## Forbidden alternative (rejected)

The original task spec proposed F1: "unify both apps onto a single `@bsuite/auth` client using `@supabase/ssr` cookie-based sessions with `cookieOptions: { domain: '<lowest-common-parent>'…}`."

**This is forbidden by `AUTH_CANONICAL.md`** (effective 2025-02-27). Reasons the cookie scheme was abandoned:

1. Tokens leaked across all `.crm7.app` subdomains regardless of consent.
2. Broke on previews that move off `.crm7.app`.
3. Didn't work for Braden's different TLD (`.braden.com.au`).
4. Doubled the auth attack surface.
5. Made per-app session isolation impossible.
6. Encouraged AI agents to "fix" things by reintroducing it on every refactor.

The doctrine-correct path is Track B, not cookie unification.

## Verification

- E2E test scaffolded at `crm7/tests/e2e/cross-app-auth.spec.ts` — asserts no 401/406 on the protected fetches after a BSU → crm7 navigation. Skips automatically without `CRM7_E2E_EMAIL` + `CRM7_E2E_PASSWORD`. Will fail with a redirect to `/auth/login` until Track B ships — that failure documents the regression.
- CRM7 verification for the session bridge: `pnpm test` passed (165 files, 3256 passed, 23 skipped); `pnpm run typecheck` passed; `pnpm run build:noprerender` passed; targeted auth/route-blocker tests passed (23 tests).
- Supabase MCP verification confirmed the app metadata tenant claims and zero remaining profile-linked users missing `app_metadata.tenant_id`.

## Next steps

1. Track B implementation (`@bsuite/auth` v0.2.0 + 5-app propagation) per the plan in issue #505.
2. Re-enable the cross-app E2E in CI once Track B ships and Playwright browser binaries are available in the runner.
3. Continue applying equivalent session bridges to any remaining BS OAuth client apps that exchange OAuth Server tokens but do not install them into their local Supabase client.

## References

- `/home/user/workspace/bsuite-state/auth-bug-refined.md` — original task spec (parts of which were rejected as forbidden).
- `/home/user/workspace/bsuite-state/auth-bug-evidence.md` — full Phase 1 audit evidence.
- [`AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) — binding canonical auth doctrine.
- [GaryOcean428/crm7#487](https://github.com/GaryOcean428/crm7/pull/487) — Track A PR.
- [GaryOcean428/bsuite#505](https://github.com/GaryOcean428/bsuite/issues/505) — tracking issue.
