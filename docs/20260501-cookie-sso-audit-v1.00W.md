# BSuite — Cookie SSO Audit (v1.00W)

**Status:** Working (Phase 0 deliverable)
**Scope:** All apps that participate (or should) in `.crm7.app` cookie-based Supabase session sharing.
**Resolves:** P1-12c in merged execution backlog (Phase 1 item).
**Authority:** `AGENTS.md` §Cross-Domain Session Sharing; `docs/20260227-auth-map-reference-v1.00A.md`.

---

## Summary

**All 5 intended apps are correctly wired for cookie SSO.** Console-log evidence of `cookies exist: false` on bootstrap is **expected first-visit behaviour**, not a bug. No migration required; one UX fix (`AuthBootLoader` component on BSU) prevents perceived error state.

## State per app (verified Phase 0 2026-05-01)

Citations below use symbolic locations (file + `createSupabaseClient()` or similar exported symbol) rather than line numbers, so the audit stays accurate as files are edited.

| App | Supabase client file | Symbolic anchor | `storageKey` | `domain` | `storage` wired | Status |
|---|---|---|---|---|---|---|
| **BSU** (`suite.crm7.app`) | `business-suite-unified/src/lib/supabase.ts` (406 lines) | `createSupabaseClient()` + `cookieStorage` export | `'business_suite_auth'` | `.crm7.app` | ✅ `cookieStorage` | ✅ Canonical (sets the cookie) |
| **CRM7** (`crm.crm7.app`) | `crm7/src/lib/supabase.ts` (155 lines) | `cookieStorage` branch in `createClient()` call | `'business_suite_auth'` | `.crm7.app` | ✅ `cookieStorage` | ✅ Reads + writes |
| **R80.3** (`r8.crm7.app`) | `R80.3/src/services/supabaseClient.ts` (311 lines) | `cookieStorage` branch in `createClient()` call | `'business_suite_auth'` | `.crm7.app` | ✅ `cookieStorage` | ✅ Reads + writes |
| **throughput** (`ideas.crm7.app`) | `throughput/src/lib/supabase.ts` (158 lines) | `cookieStorage` branch in `createClient()` call | `'business_suite_auth'` | `.crm7.app` | ✅ `cookieStorage` | ✅ Reads + writes |
| **conduit** (`conduit.crm7.app`) | `conduit/src/lib/supabase/{client,server,middleware}.ts` | `createClient()` (client), `createServerClient()` (server), `updateSession()` (middleware) | `'business_suite_auth'` | `.crm7.app` | ✅ `@supabase/ssr` server-managed cookies using same `storageKey` | ✅ Reads via SSR |
| **braden** (`www.braden.com.au`) | `braden/src/integrations/supabase/client.ts` | default export | default (localStorage) | N/A | Intentionally not wired | ✅ Correctly excluded — different TLD uses BS OAuth 2.1 PKCE instead |

### Verification evidence (Phase 0 discovery)

- `rg business_suite_auth` returned hits on every intended client file + their respective test files (`supabase-auth.test.ts`, `supabaseCookieStorage.test.ts`).
- Tests assert the `storageKey`, the `domain`, chunking behaviour (values > 3500 bytes split across `.0`, `.1`, ... cookies), `Secure` flag on HTTPS, `max-age=30 days`, and `SameSite=Lax`.
- `business-suite-unified/src/contexts/AuthContext.tsx` — in the bootstrap effect, checks `document.cookie.includes('business_suite_auth=') || document.cookie.includes('business_suite_auth.0=')` for bootstrap detection (chunked-cookie-aware).

### Tests that enforce the contract

- `business-suite-unified/src/lib/__tests__/supabaseCookieStorage.test.ts` — asserts set/get, chunking, chunk cleanup, removal, single-cookie path.
- `business-suite-unified/src/pages/auth/__tests__/AuthCallback.test.ts` — test block asserting `storageKey === 'business_suite_auth'`.
- `crm7/src/lib/__tests__/supabase-auth.test.ts` — test block asserting same.

## Known console-log evidence explained

The 2026-04-29 production console dump reads:

```
[auth] bootstrap: calling getSession()
[auth] bootstrap: getSession() returned null — cookies exist: false
[auth] onAuthStateChange: INITIAL_SESSION no session
... (branding 401s during session-less window)
[auth] onAuthStateChange: SIGNED_IN has session
```

**What's happening:** this is a first-visit to the app or a new browser profile. `cookies exist: false` correctly reports "no `business_suite_auth` cookie set yet". `getSession()` correctly returns null. `INITIAL_SESSION no session` correctly fires. Then the user's sign-in attempt (or auto-restore from a sibling tab) completes and `SIGNED_IN has session` fires.

**Why it looks like an error:** the 401s on `platform_branding` + `branding_json_for_tenant` during the sessionless window appear as production errors in DevTools, even though they are expected (see P1-12b in merged backlog — `useBranding` needs anon-path fallback).

## P1-12c action: BSU `AuthBootLoader` UX fix

Add a short-lived loading indicator during the bootstrap window to prevent the perceived error state. Atomic Phase 1 PR:

1. **`business-suite-unified/src/components/AuthBootLoader.tsx`** — displays a neutral loading state while `AuthContext.isBootstrapping === true`. Dismisses when bootstrap completes (either with or without session).
2. **Wire into `business-suite-unified/src/App.tsx`** — gate the router on `isBootstrapping === false` so downstream branding fetches happen after session state is settled.
3. **Delete any existing `no session` placeholder UI** that suggested an error state during the bootstrap window.

This PR ships alongside P1-12b (branding anon-path fallback) since they address the same user-visible symptom.

## Contract invariants (enforced in all future work)

1. Every `.crm7.app` Supabase client MUST use `cookieStorage` with `storageKey: 'business_suite_auth'` and `domain: .crm7.app`. CI regression: the existing tests cited above must stay green.
2. braden MUST NOT add cookie storage — it's on `.braden.com.au` (different TLD, cross-TLD cookies are impossible). BS OAuth 2.1 PKCE is the session-sharing mechanism there.
3. Any new `.crm7.app` app added to the suite joins the cookie-SSO ring from day one. Pattern: copy `business-suite-unified/src/lib/supabase.ts` `cookieStorage` implementation + test.
4. Cookie chunking (3500-byte threshold for `.0`, `.1`, ... split) is load-bearing for Supabase session values > 4 KB. The chunking test fixture in `business-suite-unified/src/lib/__tests__/supabaseCookieStorage.test.ts` must remain.
5. `Secure` flag is conditional on HTTPS (disabled for localhost dev per cookie hardening spec).
6. `max-age=30 days` aligned with Supabase refresh token lifetime.
7. `SameSite=Lax` is the standard. Do not change to `Strict` (would break BS OAuth redirect flow) or `None` (would weaken XSRF posture).

## What this unblocks

- **P1-12c** in merged backlog — resolved by this audit + the `AuthBootLoader` fix landing in Phase 1.
- **No migration needed** — the Supabase client layer is already contract-compliant.
- **Phase 1 UX polish** — the `AuthBootLoader` component is cited as the Phase 1 P1-12c deliverable.
- **AGENTS.md reference** — this audit can be cited by future agents asking "is cookie SSO wired correctly?" without re-running the discovery.

## Open tasks

- **None blocking.** AuthBootLoader ships in Phase 1 P1-12c PR.

---

## Revision log

- 2026-05-01 v1.00W — initial audit with verification evidence and P1-12c fix spec.
