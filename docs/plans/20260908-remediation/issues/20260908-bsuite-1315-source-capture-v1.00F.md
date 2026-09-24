---
kind: record
authority: none
owner: bsuite
---

# auth: move every sibling app to BS OAuth 2.1 PKCE tokens (eliminate shared Supabase user sessions)

https://github.com/GaryOcean428/bsuite/issues/1315

Snapshot updatedAt: 2026-07-28T08:52:19Z. Open at capture; re-read live.

## Context

Following [business-suite-unified#519](https://github.com/GaryOcean428/business-suite-unified/pull/519) and [crm7#917](https://github.com/GaryOcean428/crm7/pull/917) (per-app `storageKey` + default `scope: 'local'` signOut), the **proximate** 403 wave is fixed: sibling apps no longer collide on the localStorage key, and per-app signout no longer deletes the shared `auth.sessions` row out from under siblings.

But the **architectural alignment** with `@bsuite/auth` and the supabase-auth-comprehensive skill isn't complete. Today every app still holds a direct Supabase user session (issued by `/auth/v1/token`, `/auth/v1/callback`, etc.) rather than an OAuth-Server-issued access token (issued by `/auth/v1/oauth/token` with `client_id` claim).

## The right end-state

Per `@bsuite/auth` design (and the supabase-auth-comprehensive skill's OAuth 2.1 Server section):

- **`suite.crm7.app`** (business-suite-unified) is the SINGLE login host. It owns the user's primary Supabase user session.
- **Every other app** (`crm7`, `r80.3`, `braden`, `conduit`) is a registered OAuth 2.1 client. On first visit, the app initiates a PKCE flow:
  1. SPA generates `code_verifier` + `code_challenge` (S256), stores verifier in localStorage with TTL guard.
  2. Redirects to `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/oauth/authorize?response_type=code&client_id=<this-app>&...`.
  3. Supabase 302s to `suite.crm7.app/oauth/consent?authorization_id=<id>`.
  4. User approves (or auto-approve if previously granted).
  5. App receives `code` at its callback, exchanges it via POST `/auth/v1/oauth/token` with the `code_verifier`.
  6. App stores the OAuth-Server-issued tokens in its per-app `storageKey`. The access token's claims now include `client_id: <this-app>`.
- The app's RLS gains `client_id`-aware policies (already supported by the project's RLS helpers).

## Why this matters beyond the 403 fix

- Per-client `client_id` claim enables fine-grained RLS per app ("crm7 can read leads; r80.3 cannot" etc.).
- Per-app refresh tokens and per-app sessions \u2014 logging out of `crm7` cannot ever interfere with `r8`, even if a future change reintroduces a `scope: 'global'` somewhere.
- Aligns with the supabase-auth-comprehensive skill's "All OAuth access tokens have full data access (same as regular session tokens) plus `client_id`. Use RLS with `client_id` for fine-grained per-client access control."
- Aligns with the `@bsuite/auth` package's PKCE-first design.

## Sub-tasks

- [ ] Verify each app has a registered OAuth client in `auth.oauth_clients` (suite, crm7, r80.3, braden, conduit, throughput). Document the UUIDs.
- [ ] Add `@bsuite/auth` to each app's package.json if not already present.
- [ ] Replace direct Supabase login flows in each app with `@bsuite/auth`'s OAuth client wrapper.
- [ ] Keep the existing per-app `storageKey` (`sb-bsu-auth`, `sb-crm7-auth`, etc.) \u2014 those become the OAuth-token stores.
- [ ] Add RLS policies that respect `(auth.jwt() ->> 'client_id')` where per-app access scoping is desired (e.g. restrict R80.3 to apprentice rows; restrict Conduit to candidate rows). Default-allow if no client-specific policy exists.
- [ ] CI guard: assert each app's `supabase.ts` does not call any `signInWith*` method directly; sign-in MUST go through `@bsuite/auth`.
- [ ] Documentation: `docs/AUTH_CANONICAL.md` to reflect that direct Supabase sessions are deprecated except in `business-suite-unified` (the consent host).

## Acceptance criteria

- A logged-in user on `suite.crm7.app` clicks 'Open CRM7' \u2192 navigates to `crm.crm7.app` \u2192 silent OAuth code exchange happens \u2192 they are logged into crm7 without typing a password.
- Calling `signOut({ everywhere: true })` on any one app revokes ONLY that app's OAuth grant (via `supabase.auth.oauth.revokeGrant(clientId)`) \u2014 other apps' sessions are unaffected.
- A crm7 OAuth token presented to PostgREST carries `client_id = <crm7-client-uuid>` in its JWT claims (verify in console).

## References

- supabase-auth-comprehensive skill, section 'OAuth 2.1 Server' and 'RLS with OAuth client_id'.
- `@bsuite/auth` package: <https://www.npmjs.com/package/@bsuite/auth>
- Supabase OAuth Server docs: <https://supabase.com/docs/guides/auth/oauth-server>
- [business-suite-unified#519](https://github.com/GaryOcean428/business-suite-unified/pull/519) and [crm7#917](https://github.com/GaryOcean428/crm7/pull/917) (the proximate fixes that enable this work).
