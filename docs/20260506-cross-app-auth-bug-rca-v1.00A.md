# Cross-App Auth Bug RCA + Remediation — 2026-05-06

**Status:** A (Approved investigation; W2 partial remediation shipped, W1 design tracked)
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

Audit found that **the doctrine is not implemented in code**:

1. `attemptSilentAuth()` in `packages/auth/src/oauth-client.ts:326-346` only checks per-domain `localStorage` for `bs_access_token` / `bs_refresh_token`. It does not issue an OIDC `prompt=none` redirect to BSU.
2. crm7's `AuthContext` (`crm7/src/contexts/AuthContext.tsx:119-156`) calls `supabase.auth.getSession()` on mount and renders unauthenticated on null. **It never calls `attemptSilentAuth()`.**
3. Consequence: a user who is signed in at BSU but has no Supabase session at crm7's domain renders as logged-out. The 401s on `platform_branding` and the RPC are derivative of the missing session.

The 406 on `profiles` is a separate (overlapping) failure mode: when a user lacks a row in `public.profiles`, `.single()` against `id=eq.<uuid>` returns 406 (PostgREST cannot satisfy `Accept: application/vnd.pgrst.object+json` with 0 rows).

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
- DB application of the migration is operator-blocked (no Supabase access in the executing session); tracked as an external-blocked sub-task on issue #505.

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
- DB diagnosis SQL (the four queries in `auth-bug-refined.md` Phase 1) is filed as a blocked sub-task on issue #505. Operator action: `supabase login && supabase link --project-ref tuybltdrdefjblnplpqo && supabase db push`.

## Next steps

1. Operator applies the bootstrap migration.
2. Track B implementation (`@bsuite/auth` v0.2.0 + 5-app propagation) per the plan in issue #505.
3. Re-enable the cross-app E2E in CI once Track B ships.
4. Update AUTH_CANONICAL.md migration ledger with both events.

## References

- `/home/user/workspace/bsuite-state/auth-bug-refined.md` — original task spec (parts of which were rejected as forbidden).
- `/home/user/workspace/bsuite-state/auth-bug-evidence.md` — full Phase 1 audit evidence.
- [`AUTH_CANONICAL.md`](../AUTH_CANONICAL.md) — binding canonical auth doctrine.
- [GaryOcean428/crm7#487](https://github.com/GaryOcean428/crm7/pull/487) — Track A PR.
- [GaryOcean428/bsuite#505](https://github.com/GaryOcean428/bsuite/issues/505) — tracking issue.
