# TP-04 — @bsuite/auth Migration Plan for Throughput

| Field | Value |
|---|---|
| **Date** | 2026-05-04 |
| **Author** | Buffy (orchestration session) |
| **Status** | Draft (D) |
| **Version** | v1.00D |
| **Tracking issue** | [throughput#77](https://github.com/GaryOcean428/throughput/issues/77) — labels `auth`, `p0`, Wave A |
| **Related docs** | [`AGENTS.md` §Authentication & OAuth](../AGENTS.md), [`MEMORY_PROTOCOL.md`](../MEMORY_PROTOCOL.md), [`20260425-bsuite-finish-line-roadmap-v1.00W.md`](./20260425-bsuite-finish-line-roadmap-v1.00W.md) |
| **Scope** | `throughput/` submodule only — no schema, no RLS, no other-app changes |

---

## 1. TL;DR

- **TP-04's original premise is stale.** Throughput has **already migrated** to `@bsuite/auth ^0.1.0` and cookie SSO is fully wired. The migration is **~85% complete**.
- `throughput/src/lib/business-suite-oauth.ts` is a clean 38-line re-export of `createOAuthClient('35f0db49-ef62-4115-baba-7b961f034cc3')` from the shared package — identical pattern to CRM7, R80.3, and Braden.
- Cookie SSO (storage key `business_suite_auth`, domain `.crm7.app`, chunked, `SameSite=Lax`, `Secure`, 30-day max-age, `flowType: 'pkce'`) matches the reference consumers exactly. Login UI already delegates to BSU via `LoginContent.tsx`, and `AuthCallback.tsx` already sanitizes `return_path` against open-redirect and supports preview-branch `return_origin`.
- **Remaining work is alignment polish** — 5 Wave A items (P0, required to close TP-04), 3 Wave B items (P1, hardening), 3 Wave C items (P2, cosmetic). Total net-deletion of ~120 lines from the bespoke `AuthSessionManager`, plus one-line adds for `noopLock` and `onAuthStateChange`.
- **No schema/RLS/migration changes required.** Throughput reads from the shared Supabase project (`tuybltdrdefjblnplpqo`) via the same `auth.uid() = user_id` policy patterns as CRM7/R80.3/BSU. No new OAuth client registration — `35f0db49-…` is already live.
- **Acceptance for TP-04 close**: Wave A merged, typecheck + tests pass, manual cross-tab sign-out smoke, and `throughput#77` closed referencing the implementation PR. Wave B can ship as a follow-up PR under the same issue or a new sub-issue.

---

## 2. Current State Audit

All paths relative to `/home/braden/Desktop/Dev/bsuite/throughput/`.

### 2.1 ✅ Already Done (confirmed by source inspection)

| File | Line count | Status | Notes |
|---|---:|---|---|
| `src/lib/business-suite-oauth.ts` | ~38 | ✅ Clean | Re-exports `createOAuthClient('35f0db49-ef62-4115-baba-7b961f034cc3')`. Identical pattern to `crm7/src/lib/business-suite-oauth.ts`, `R80.3/src/lib/business-suite-oauth.ts`, `braden/src/lib/business-suite-oauth.ts`. All 8 exports present: `signInWithBusinessSuite`, `exchangeCodeForTokens`, `refreshBusinessSuiteToken`, `verifyAccessToken`, `getUserInfo`, `clearBSTokens`, `startBSTokenRefresh`, `attemptSilentAuth`. |
| `src/lib/supabase.ts` | ~143 | ✅ Matches reference | Chunked `cookieStorage` (3 500-byte chunks), `getCookieDomain()` resolves `.crm7.app` for production subdomains and null for localhost, `cookieAttrs()` emits `path=/ max-age=2592000 SameSite=Lax Secure` (HTTPS only), `flowType: 'pkce'`, `storageKey: 'business_suite_auth'`, `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`. Also exports `checkDatabaseConnection()` probe. |
| `src/pages/auth/AuthCallback.tsx` | ~87 | ✅ Done | Reads `business_suite_auth` cookie via `supabase.auth.getSession()`. Sanitizes `return_path` — decodes once, rejects `//`, `/\`, non-leading-slash. Bounces to `${VITE_BSU_URL}/auth/login?return_to=throughput&return_path=…&return_origin=…` on missing session. `handledRef` guards Strict-Mode double-invoke. Renders a configuration-error banner if `VITE_BSU_URL` is unset in production. |
| `src/components/login/LoginContent.tsx` | ~67 | ✅ Done | Thin redirect shell — evaluates `VITE_BSU_URL` eagerly, renders a "Login Misconfigured" banner when unset in production (falls back to `http://localhost:5675` only in dev). Reuses the same `return_path` sanitization as AuthCallback. Appends `return_origin` for BSU's per-app Vercel preview allowlist (bsuite commit `f75b4b6`). |
| `src/pages/Login.tsx` | ~2 | ✅ Done | `export { default } from '../components/login/LoginContent'` — no bespoke login UI. |
| `src/lib/auth/operations.ts` | ~62 | ✅ Done | `AuthOperations.signOut()` calls `supabase.auth.signOut()` then `clearBSTokens()` to prevent stale BS OAuth token leakage. Matches the CRM7 / R80.3 signOut contract. Historical `signIn` / `signUp` already removed. |
| `src/lib/auth/__tests__/AuthProvider.test.tsx` | ~82 | ✅ Present | Vitest suite with proper factory-form `vi.mock()` for `../supabase`, `../errorMonitoring`, `../business-suite-oauth`, `../sessionManager`, `../operations`. Tests `AuthProvider` renders children + throws outside provider. Will need re-alignment after Wave A3. |

### 2.2 ⚠️ Over-Engineered vs References

| File | Line count | Issue |
|---|---:|---|
| `src/lib/auth/AuthProvider.tsx` | ~115 | Uses bespoke `AuthSessionManager` + `AuthOperations` classes with `userRef` ref-passing. Introduces `retryAuth` and `authInitialized` flag. **No `onAuthStateChange` subscription** — the auth state only updates on mount. Cross-tab sign-out does not propagate to Throughput. Compare to `crm7/src/contexts/AuthContext.tsx` (plain functional context, ~245 lines, subscribes in `useEffect`). |
| `src/lib/auth/sessionManager.ts` | ~170 | Re-implements logic that `@supabase/supabase-js` already handles: manual localStorage sniffing of `business_suite_auth`, manual expiry check, 60 000 ms timeout watchdog with fallback to cached session. This predates the PKCE flow and is no longer needed. CRM7/R80.3 achieve the same outcome in ~40 lines. |
| `src/lib/auth/types.ts` | ~22 | Exposes `AUTH_TIMEOUT_MS` + `retryAuth` on the context. Both become dead after §4 Wave A3/A4. |
| `src/components/layout/*`, `src/components/auth-diagnostics/index.tsx`, `src/App.tsx`, `src/components/layout/ErrorScreen.tsx` | various | 7 call-sites consume `retryAuth` from `useAuth()` (code-searcher confirmed). Cleanup cascades once A4 removes it. |

### 2.3 Version Pins (package.json)

```jsonc
{
  "@bsuite/auth": "^0.1.0",                // ✅ matches CRM7, R80.3, braden
  "@supabase/supabase-js": "^2.103.0"      // ✅ already at A5 target; verify lockfile resolved version only
}
```

**`@bsuite/auth` peerDependencies** (from `packages/auth/package.json`): `{ "jose": "^5.9.6" }` — no `@supabase/supabase-js` peer constraint, so consumer is free to pin any minor. If `@bsuite/auth` later adds a `@supabase/supabase-js` peer constraint, re-check before bumping either package (see §4 A5 pre-check).

> **Note on "latest @bsuite/auth":** `@bsuite/auth` published only `0.1.0` to npm as of the drafting of this document (confirmed `npm view @bsuite/auth dist-tags` → `latest: 0.1.0`). If a newer version ships before implementation starts, bump the pin in Throughput **and** in the other 3 consumers (CRM7, R80.3, braden) in the same PR wave to avoid version skew — consumer parity is explicitly required by the AGENTS.md shared-packages doctrine.

---

## 3. Gap Analysis vs Reference Consumers

| Capability | CRM7 | R80.3 | braden | Throughput |
|---|:---:|:---:|:---:|:---:|
| `createOAuthClient()` factory from `@bsuite/auth` | ✅ | ✅ | ✅ | ✅ |
| Cookie SSO domain `.crm7.app` | ✅ | ✅ | ❌ (TLD `.braden.com.au`, uses BS OAuth) | ✅ |
| Chunked cookie storage (`key.0`, `key.1`, …) | ✅ | ✅ | n/a | ✅ |
| PKCE flow (`flowType: 'pkce'`) | ✅ | ✅ | ✅ | ✅ |
| JWKS asymmetric token verification (via `@bsuite/auth`)² | ✅ | ✅ | ✅ | ✅ |
| OIDC nonce (replay protection)² | ✅ | ✅ | ✅ | ✅ |
| Storage key `business_suite_auth` | ✅ | ✅ | n/a | ✅ |
| `startBSTokenRefresh()` wired on mount | ✅ | ✅ | ✅¹ | ✅ |
| `clearBSTokens()` on sign-out | ✅ | ✅ | ✅¹ | ✅ |
| `supabase.auth.onAuthStateChange` subscription | ✅ | ✅ | ⚠️ Recipe C inline, partial | ❌ **Gap — Wave A1** |
| `noopLock: LockFunc` Web Locks bypass (Strict Mode safety) | ✅ | ❌ | ❌ | ❌ **Gap — Wave A2** |
| Cached auth JSON for fast first paint | ✅ (`CACHE_KEY = 'crm7-cached-auth'`) | ❌ | ❌ | ❌ **Gap — Wave B2** |
| Audit log on `SIGNED_IN` | ✅ (`logAuditEvent`) | ❌ | N/A | ❌ (Throughput has no audit table ownership — out of scope) |
| Tenant-ID load on `SIGNED_IN` | ✅ (`getCurrentTenantId` → cache clear on SIGNED_OUT) | ✅ (`loadUserTenant`) | ❌ | ❌ (Throughput is single-tenant per user; no `current_tenant_id` concept. Out of scope.) |
| `getClaims()` for JWT verification (server/sensitive paths) | ⚠️ partial | ⚠️ partial | ⚠️ partial | ❌ **Gap — Wave B1** (audit ~20 call sites) |
| Bespoke timeout watchdog | ❌ removed | ❌ removed | ❌ never had | ⚠️ **Present — Wave A3 removes** |
| `retryAuth()` exposed on context | ❌ | ❌ | ❌ | ⚠️ **Present — Wave A4 removes** |
| Login UI delegates to BSU | ✅ | ✅ | N/A (different TLD) | ✅ |
| `AuthCallback` sanitizes `return_path` | ✅ | ✅ | ✅ | ✅ |
| `return_origin` wiring for preview-branch OAuth | ✅ | ✅ | ✅ | ✅ |

**Key reading**: Throughput is in good shape on the OAuth-contract axis. The remaining gaps are lifecycle/hardening items, not protocol deviations.

> ¹ Confirmed via `rg` on `braden/src/` — `startBSTokenRefresh` and `clearBSTokens` are imported and used in `business-suite-oauth.ts`, `hooks/useAuth.ts`, `pages/auth/AdminAuth.tsx`, `components/admin/AdminLayout.tsx`.
>
> ² Delegated to `@bsuite/auth/oauth-client.ts` — consumer has no direct code for JWKS verification or OIDC nonce. The package uses `jose` for JWKS fetch + RS256/ES256 signature verification, and enforces an OIDC `nonce` claim match in `verifyAccessToken()`. Consumer parity here means all four apps call the same `@bsuite/auth` factory with their client ID — no per-app JWKS code exists or should exist.

---

## 4. Remaining Work Breakdown

### Wave A — P0 Alignment (required for TP-04 close)

#### A1. Add `onAuthStateChange` subscription

**Problem**: `throughput/src/lib/auth/AuthProvider.tsx` initializes auth once on mount via `AuthSessionManager.initializeAuth()` and never subscribes to Supabase auth state changes. Cross-tab sign-out does not propagate to Throughput — a user who signs out in the BSU tab remains "signed in" in Throughput until manual reload or token expiry.

**Reference**: `crm7/src/contexts/AuthContext.tsx` lines 98–132:

```ts
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange((_event, s) => {
  if (_event === 'SIGNED_OUT') { clearTenantIdCache(); }
  if (mounted) {
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) { setCachedAuth(s.user, s); }
    setLoading(false);
  }
});
// ... return () => { subscription.unsubscribe(); stopBSRefresh(); }
```

**Files to change**:

- `throughput/src/lib/auth/AuthProvider.tsx` — add subscription in the mount `useEffect`, return `subscription.unsubscribe()` in the cleanup.
- `throughput/src/lib/auth/sessionManager.ts` — (after A3) remove the `cleanup()` method once the timeout watchdog is gone.

**Acceptance**:

1. Open Throughput and BSU in two tabs on the same domain (`*.crm7.app`).
2. Sign out from BSU.
3. Within ≤ 1 second, Throughput redirects to `/login` without manual reload.
4. Sign-in from BSU while Throughput is on `/login` → Throughput auto-redirects to `/` within ≤ 1 second.
5. **Automated test** — unit test in `AuthProvider.test.tsx` mocks `supabase.auth.onAuthStateChange`, emits a `SIGNED_OUT` event, asserts `user` becomes `null` and `loading` becomes `false` within a single render cycle. A parallel `SIGNED_IN` test asserts `user` is populated and `ensureProfile` is called exactly once. A `TOKEN_REFRESHED` test asserts `ensureProfile` is **not** called.

---

#### A2. Adopt `noopLock` in the Supabase client

**Problem**: React Strict Mode double-mounts all components in development. The Supabase JS v2 auth module uses the Web Locks API to serialize session access, and the second mount blocks indefinitely waiting for a lock held by the (already-unmounted) first mount. Symptoms: `Authenticating…` spinner that never resolves in dev. CRM7 has a documented fix.

**Reference**: `crm7/src/lib/supabase.ts` lines 113 + 128:

```ts
import { createClient, type LockFunc, type SupabaseClient } from '@supabase/supabase-js';
const noopLock: LockFunc = async (_name, _acquireTimeout, fn) => fn();
// …
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { /* … */, lock: noopLock },
});
```

**Files to change**:

- `throughput/src/lib/supabase.ts` — import `LockFunc`, declare `noopLock`, **conditionally** pass `lock: import.meta.env.DEV ? noopLock : undefined` in the auth config block. Production retains the Web Locks serialization that prevents multi-tab refresh-token race and chunked-cookie interleaving. The Strict-Mode double-mount issue is dev-only, so this scope is both necessary and sufficient. See §7 R9 for the multi-tab risk this guards.

**Acceptance**:

1. `pnpm dev` in `throughput/` with React Strict Mode active (default).
2. Sign in on BSU, navigate to `*.crm7.app/ideas.crm7.app` equivalent dev URL.
3. The session initializes on first render without hanging. No `authTimeoutRef` fallback triggers.
4. Production build (`pnpm build && pnpm preview`) still serializes multi-tab refresh — open 2 tabs, force token expiry, verify only one `/auth/v1/token?grant_type=refresh_token` call fires (other tab waits on the lock).

---

#### A3. Simplify `AuthSessionManager` — remove the 60 s timeout watchdog

**Problem**: `throughput/src/lib/auth/sessionManager.ts` (170 lines) re-implements session bootstrapping that `@supabase/supabase-js` already handles via `persistSession + autoRefreshToken + detectSessionInUrl`. The 60 000 ms `AUTH_TIMEOUT_MS` watchdog, the manual `localStorage.getItem('business_suite_auth')` parsing, the `existingSession` fallback, the `checkAuthDirectly()` RPC probe — all predate the PKCE flow and the shared `@bsuite/auth` package.

**Target shape** (matches CRM7, net ~30 lines):

```ts
useEffect(() => {
  let mounted = true;
  (async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!mounted) return;
    if (error) { setError(error); setLoading(false); return; }
    setUser(session?.user ?? null);
    setLoading(false);
  })();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(/* A1 */);
  const stopRefresh = startBSTokenRefresh();
  return () => { mounted = false; subscription.unsubscribe(); stopRefresh(); };
}, []);
```

> **Critical — `ensureProfile` placement**: `ensureProfile(user)` (confirmed export in `throughput/src/lib/auth/profileUtils.ts`) must be called from the `onAuthStateChange` **`SIGNED_IN` branch** with a `useRef`-guarded "first SIGNED_IN this mount" check — **not** from the bootstrap `useEffect`. The bootstrap effect only runs once on mount and fires when `session` is already loaded from the cookie; cross-tab sign-ins trigger `onAuthStateChange` instead, and the bootstrap effect would silently skip the side-effect. A `TOKEN_REFRESHED` event (every ~55 minutes) must **not** trigger `ensureProfile` — it's not a new session and write amplification is a regression. Only `SIGNED_IN` with `didHandleFirstSignIn.current === false` should trigger it. Pattern:
>
> ```ts
> const didHandleFirstSignIn = useRef(false);
> // ... inside onAuthStateChange handler:
> if (event === 'SIGNED_IN' && session?.user && !didHandleFirstSignIn.current) {
>   didHandleFirstSignIn.current = true;
>   ensureProfile(session.user);
> }
> // TOKEN_REFRESHED: update setUser/setSession only, do NOT call ensureProfile
> ```

**Files to change**:

- `throughput/src/lib/auth/sessionManager.ts` — delete (or reduce to a tiny `ensureProfile` helper if the profile side-effect is still desired).
- `throughput/src/lib/auth/AuthProvider.tsx` — inline the bootstrap `useEffect`, drop the `sessionManagerRef` / `authOperationsRef` lazy-init pattern. Wire `ensureProfile` into the `onAuthStateChange` SIGNED_IN branch per the Critical note above. Keep `AuthOperations` (signOut) since it wraps both `supabase.auth.signOut()` and `clearBSTokens()` — that contract is fine.
- `throughput/src/lib/auth/profileUtils.ts` (referenced by `sessionManager.ts`) — **retain** (`export const ensureProfile = async (user: User): Promise<void> => {...}` confirmed present). Callers change from `sessionManager.ts` to `AuthProvider.tsx`.

**Net change**: ~120-line deletion.

**Acceptance**: `pnpm typecheck` clean, `pnpm test` passes (AuthProvider.test.tsx re-aligned — vi.mock of `../sessionManager` can be removed once the file is gone).

---

#### A4. Remove `AUTH_TIMEOUT_MS` and `retryAuth` from the auth context

**Problem**: Once A3 removes the timeout watchdog, `AUTH_TIMEOUT_MS` and `retryAuth()` are dead.

**Consumers today (7 references across 6 files)** — 3 production consumer files, 1 dev-tool file, 1 test fixture, 1 producer, 1 type decl:

| Kind | File | Disposition post-A4 |
|---|---|---|
| Production consumer | `src/App.tsx` (lines 35, 59 — ProtectedRoute error UI) | Migrate to path-preserving `/login` redirect |
| Production consumer | `src/components/layout/index.tsx` (lines 10, 39) | Migrate to path-preserving `/login` redirect |
| Production consumer | `src/components/layout/ErrorScreen.tsx` (lines 10, 19, 80) | Migrate per "ErrorScreen.tsx button disposition" below |
| Dev-tool (exception) | `src/components/auth-diagnostics/index.tsx` (lines 41, 75) | Keep a local `retryAuth` helper (not from context) |
| Test fixture | `src/components/layout/__tests__/ErrorScreen.test.tsx` | Re-align or delete the fixture after ErrorScreen refactor |
| Producer (remove) | `src/lib/auth/AuthProvider.tsx` | Remove the `retryAuth` production |
| Type decl (remove) | `src/lib/auth/types.ts` | Remove `retryAuth: () => Promise<void>` from `AuthContextType` |

**Migration**: Replace the in-place "Try Again" button with a **path-preserving** redirect:

```ts
window.location.href = '/login?return_path=' + encodeURIComponent(window.location.pathname + window.location.search);
```

This matches the sanitization contract in `LoginContent.tsx` / `AuthCallback.tsx` and preserves user intent (unsaved modal state is still lost to the reload, but the user lands back on their original page post-auth rather than the dashboard root).

**Exception — `auth-diagnostics/index.tsx`**: this is a developer-diagnostic page that needs an in-place retry to inspect auth state, not a reload. For that one call-site, retain a minimal local helper inside the component:

```ts
const retryAuth = async () => {
  setError(null);
  const { error } = await supabase.auth.getSession();
  if (error) setError(error);
};
```

Do **not** export this from the auth context. The dev-tool exception is documented in `§4 A4` so the reviewer gate (`§8 A4-1`) explicitly allows matches inside `auth-diagnostics/`.

**Files to change**: 3 production consumer files (`App.tsx`, `layout/index.tsx`, `ErrorScreen.tsx`) + 1 test fixture (`ErrorScreen.test.tsx`) + `throughput/src/lib/auth/types.ts` + `throughput/src/lib/auth/index.ts` (drop `AUTH_TIMEOUT_MS` export) + `throughput/src/lib/auth/AuthProvider.tsx` (producer removal). `auth-diagnostics/index.tsx` keeps a local-only `retryAuth` helper (dev-tool exception per the disposition table above).

**ErrorScreen.tsx button disposition** — the current handler calls **both** `onConnectionReset()` and `retryAuth()` (verified in source: lines 78–81). Post-A4, the button must disambiguate by error kind:

- `error.kind === 'db_unreachable'` (or similar DB error) → call `onConnectionReset()` only (auth is fine, DB is the issue)
- `error.kind === 'auth_failed'` or unknown → full-page `/login` redirect with `return_path` per Migration above
- If `error` is generic/unknown, default to `/login` redirect (safer fallback)

If the current `error` shape doesn't carry a `kind` discriminator, extend it (preferred) or add a conservative `onConnectionReset()` call followed by the `/login` redirect so neither recovery path is lost. The critical invariant: the button must still produce *some* forward motion for the user — silently doing nothing is a worse regression than an unnecessary reload.

**Acceptance**:

```bash
cd throughput
rg 'retryAuth' src/                                    # → only local matches inside src/components/auth-diagnostics/ (dev-tool exception, documented in §4 A4)
rg 'AUTH_TIMEOUT_MS' src/                              # → zero matches
rg 'retryAuth' src/lib/auth/types.ts src/lib/auth/index.ts  # → zero matches (no context-level export)
pnpm typecheck                                         # → 0 errors
pnpm test                                              # → ErrorScreen.test.tsx updated, passes
```

---

#### A5. Verify `@supabase/supabase-js` ≥ 2.103.0 (verification-only)

**Problem**: `throughput/src/lib/business-suite-oauth.ts` JSDoc claims `@supabase/supabase-js is pinned to ^2.103.0 for OAuth 2.1 server support`. The `package.json` is **already at `^2.103.0`** (confirmed during drafting, §2.3), so A5 is a **verification-only** item — no install or lockfile regeneration expected. This item exists to catch silent drift if a concurrent PR bumps the pin mid-flight.

**Files to change** (only if verification fails):

- **Pre-check — peer-dep compatibility**: `jq '.peerDependencies' /home/braden/Desktop/Dev/bsuite/packages/auth/package.json` — confirmed currently `{ "jose": "^5.9.6" }` (no `@supabase/supabase-js` peer constraint). If `@bsuite/auth` later adds a `@supabase/supabase-js` peer constraint and the consumer pin falls outside that range, pnpm emits `ERR_PNPM_PEER_DEP_ISSUES` on install. Re-check before bumping either package.
- `throughput/package.json` — only if resolved version < 2.103.0: bump `@supabase/supabase-js` pin.
- `throughput/pnpm-lock.yaml` — only if `package.json` changed: regenerate via the **isolated-directory lockfile pattern** per AGENTS.md §pnpm Lockfile Generation. **Do not** run `pnpm install` from within `/home/braden/Desktop/Dev/bsuite/throughput/` — the parent workspace config will embed `..` paths that fail on Vercel.

**Acceptance**:

```bash
cd throughput
pnpm ls @supabase/supabase-js   # resolved version ≥ 2.103.0
jq -r '.dependencies["@supabase/supabase-js"]' package.json  # → "^2.103.0" (or higher)
head -5 pnpm-lock.yaml | grep -E '^importers:' -A2 | grep '^  \.:'  # → single `.:` importer (no `..` paths)
# Vercel preview deploy build succeeds (no ERR_PNPM_OUTDATED_LOCKFILE) — only relevant if lockfile was regenerated
```

---

### Wave B — P1 Hardening

#### B1. Migrate authorization-sensitive call-sites to `getClaims()`

**Problem**: Throughput calls `supabase.auth.getSession()` and `supabase.auth.getUser()` in ~20 places (code-searcher output). Per the `auth-setup` skill and current Supabase docs, `getClaims()` is preferred for server/sensitive use because it validates the JWT signature locally against a cached JWKS, avoiding a round-trip to the auth server per call.

Throughput is a pure SPA — it has no server-side routes — so the risk profile is lower than conduit's SSR. Still, the following call-sites make **authorization decisions** (i.e., their result gates DB writes or reveals other users' data) and should migrate:

| File | Calls | Treatment |
|---|---|---|
| `src/lib/collaboration.ts` | 5× `getUser()` | Migrate → `getClaims()`; fallback to `getUser()` if claims unavailable (anon key). |
| `src/lib/user-management.ts` | 7× `getUser()` / `getSession()` | Same. |
| `src/lib/auth-mfa.ts` | 3× `getSession()` | **Re-review per-line**: lines 162 / 239 / 255 look like they read `session.user.id` for audit-log context only — those could migrate to `getClaims()` cleanly. Lines that actually need `session.access_token` or MFA factor state must stay on `getSession()`. Verify each call-site's downstream usage before migrating; do not bulk-convert. |
| `src/lib/billing.ts` | ≥1× (from search) | Migrate where it gates a Stripe mutation. |
| `src/lib/groq.ts` line 86 | 1× `getSession()` | Keep — session provides `session.access_token` (the **Supabase** JWT) for the Groq API auth header. **Verify**: Groq edge function must verify against Supabase JWKS, not against BS OAuth JWKS. If the edge function was built expecting the BS OAuth token, this is a pre-existing bug out-of-scope for TP-04 but worth filing separately. |
| `src/components/notifications/*` | 3× `getUser()` | Display-only; leave as-is (not an authorization decision). |
| `src/components/DatabaseSetup.tsx` line 84 | 1× `getSession()` | Keep — uses the session token for a privileged setup RPC. |
| `src/pages/auth/AuthCallback.tsx` | 1× `getSession()` | **Keep** — this is the correct API for reading the cookie-SSO session on callback. |
| `src/lib/auth/sessionManager.ts` | 1× `getSession()` | Deleted by A3. |

**Migration pattern** (per `auth-setup` skill):

```ts
const { data: claimsData } = await supabase.auth.getClaims();
const userId = claimsData?.claims?.sub;
if (!userId) { /* treat as unauthenticated */ }
```

**Acceptance**: RLS-guarded mutations in `collaboration.ts` / `user-management.ts` / `billing.ts` use `getClaims()`. `pnpm test` passes. No behavior change visible to end-users.

---

#### B2. Cached auth JSON for fast first paint

**Problem**: Throughput renders a loading spinner on every cold load while waiting for `supabase.auth.getSession()` to resolve — even when the shared cookie already holds a valid session. CRM7 eliminates this flash by reading a cached `{ user, session, cachedAt }` blob from `localStorage` and using it as the initial state, only showing the spinner if the cache is missing or expired.

**Reference**: `crm7/src/contexts/AuthContext.tsx` lines 52–84 (`getCachedAuth`, `setCachedAuth`, `clearCachedAuth`). The cache is written on every `SIGNED_IN` and `onAuthStateChange` with a valid session, and cleared on sign-out.

**Files to change**: `throughput/src/lib/auth/AuthProvider.tsx` — port the `CACHE_KEY = 'throughput-cached-auth'` pattern 1:1.

**Acceptance**: Signed-in user reloading Throughput sees UI render immediately (< 100 ms) instead of a ~500 ms spinner flash. Cache expiry respects `session.expires_at` (skip if token already expired).

---

#### B3. Audit `bs-oauth-expired` event handling

**Problem**: `@bsuite/auth`'s `checkAndRefreshToken()` dispatches a `window.dispatchEvent(new CustomEvent('bs-oauth-expired', { detail: { reason: 'network_error' } }))` when the refresh endpoint returns a non-4xx error. Verify Throughput listens for this event and routes the user to `/login` gracefully (same as the other consumers).

**Files to change (if gap confirmed)**: `throughput/src/lib/auth/AuthProvider.tsx` — add a `window.addEventListener('bs-oauth-expired', …)` in the mount `useEffect`, remove in cleanup. The listener must be **reentrancy-safe**: use a `useRef(false)` guard (`redirectedRef`) set to `true` on first invocation to prevent double-navigation when the event fires twice in quick succession (e.g., two racing `verifyAccessToken()` calls both fail, or the event interleaves with a SIGNED_OUT from `onAuthStateChange`). Also path-preserve per §4 A4:

```ts
const redirectedRef = useRef(false);
const handleExpired = () => {
  if (redirectedRef.current) return;
  redirectedRef.current = true;
  window.location.href = '/login?return_path=' + encodeURIComponent(window.location.pathname + window.location.search);
};
window.addEventListener('bs-oauth-expired', handleExpired);
return () => window.removeEventListener('bs-oauth-expired', handleExpired);
```

**Acceptance**: Simulated refresh-endpoint 500 response (via devtools network throttle or mocked fetch) triggers a clean redirect to `/login` rather than a silent stale-session state. A second simulated 500 within 500 ms does **not** cause a navigation-aborted console error (the guard absorbs it).

---

### Wave C — P2 Polish (nice-to-have)

- **C1.** Delete `cleanupStaleVerifierCookies` / `forceRemoveAuthCookies` / `isPkceExchangeInFlight` helpers if any remain in `throughput/src/lib/auth/**`. Code-searcher confirmed **0 matches** for all four patterns — likely already clean. **Skip if no files found.**
- **C2.** Align cookie attribute helper naming with R80.3 (`readRawCookie` vs `readCookieRaw`). Purely cosmetic; no behavior change. Low priority.
- **C3.** Update the comment block at the top of `throughput/src/lib/business-suite-oauth.ts` — it currently hard-codes `@bsuite/auth v0.1.0`. Replace with a note pointing to `package.json` as the source of truth, so future bumps don't leave stale doc strings.

---

## 5. Non-Goals / Deferred

| Item | Rationale |
|---|---|
| Schema or RLS changes | None needed. Throughput uses the shared Supabase project's tables with `auth.uid() = user_id` policies. No new RLS on `ideas`, `teams`, etc. for this migration. |
| Moving MFA UI into BSU | MFA is currently enrolled in `throughput/src/lib/auth-mfa.ts` via `supabase.auth.mfa.*` — this is the correct per-app entry point. BSU does not own MFA enrollment UX; moving it would require a larger cross-app design discussion. Out of scope for TP-04. |
| Server-side route handlers | Throughput is a pure Vite SPA — no `@supabase/ssr`, no middleware. The SSR auth patterns from conduit don't apply. |
| Registering a new OAuth client | Client ID `35f0db49-ef62-4115-baba-7b961f034cc3` is already live in `auth.oauth_clients`. No dashboard change needed. |
| Second OAuth provider parity check | AGENTS.md §Mandatory OAuth Providers requires Google + Microsoft in **auth modal UIs**. Throughput has no login modal — it delegates to BSU, which is the surface governed by that invariant. This TP-04 plan does not touch the BSU modal. |
| Cross-subdomain cookie for Braden | Braden is on `.braden.com.au`, uses BS OAuth 2.1 instead. Out of scope. |

> **Zero-Defer Policy applicability**: Wave B items (B1 `getClaims()` migration, B2 cached-auth first-paint, B3 `bs-oauth-expired` listener) are **hardening upgrades to already-working auth**, not deferred defects. TP-04's scope boundary is the `@bsuite/auth` migration + cookie-SSO alignment — current behavior is safe under Throughput's SPA + RLS model (`getUser()` still returns the same `userId`, stale-token paths already redirect via the `/login` bounce in `AuthCallback.tsx`). Wave B ships as a separate PR under the Zero-Defer Policy's **distinct scope boundary** exception — it is a hardening sweep, not a deferred fix. If a Wave B item later proves to be a user-facing defect rather than hardening, escalate it into Wave A immediately per the Zero-Defer Policy.

---

## 6. Acceptance Criteria — Checklist for TP-04 Close

> **Usage note**: §6 is the **narrative** acceptance form (prose bullets for implementers to self-check as they go); §8 Reviewer Checklist is the **binary-gate** form (table rows for reviewers at PR-review time). Both cover the same ground — implementers work through §6, reviewers work through §8. If they disagree, §8 wins (it's the merge gate).

- [ ] **A1** `onAuthStateChange` subscription wired; cross-tab sign-out propagates within 1 s.
- [ ] **A2** `lock: import.meta.env.DEV ? noopLock : undefined` added to `throughput/src/lib/supabase.ts`; Strict Mode dev no longer hangs; production retains Web Locks serialization.
- [ ] **A3** `AuthSessionManager` timeout watchdog removed; `sessionManager.ts` deleted or reduced to ≤ 40 lines; `ensureProfile` wired into `onAuthStateChange` SIGNED_IN with a `useRef` first-signin guard (not bootstrap effect, not TOKEN_REFRESHED).
- [ ] **A4** `AUTH_TIMEOUT_MS` + `retryAuth` removed from the auth context; 3 production consumer files (`App.tsx`, `layout/index.tsx`, `ErrorScreen.tsx`) migrated to path-preserving `window.location.href = '/login?return_path=...'` redirect; test fixture re-aligned; `auth-diagnostics/index.tsx` retains a local-only `retryAuth` helper (dev-tool exception); producer + type decl removed. See §4 A4 disposition table.
- [ ] **A5** `@supabase/supabase-js` **verified** at ≥ 2.103.0 (no bump expected, see §4 A5); peer-dep pre-check passes; lockfile has `.:` as only importer.
- [ ] `pnpm typecheck` passes in `throughput/` with 0 errors.
- [ ] `pnpm test` passes (`AuthProvider.test.tsx` re-aligned after A3; `ErrorScreen.test.tsx` re-aligned after A4).
- [ ] `rg 'AUTH_TIMEOUT_MS|AuthSessionManager' throughput/src/` returns **0 matches**. `rg 'retryAuth' throughput/src/` returns matches **only** inside `src/components/auth-diagnostics/` (dev-tool exception per §4 A4).
- [ ] `throughput/src/lib/supabase.ts` auth-config block matches `crm7/src/lib/supabase.ts` 1:1 (modulo placeholder-client fallback path).
- [ ] Manual smoke:
  - [ ] Sign in on BSU → land on Throughput dashboard without spinner flash > 500 ms.
  - [ ] Wait > 5 minutes → token auto-refreshes (check Network tab for `/auth/v1/oauth/token` grant_type=refresh_token call; verify new `bs_access_token` in localStorage).
  - [ ] Sign out in a BSU tab → Throughput tab redirects to `/login` within 1 s.
  - [ ] Sign out via the Throughput UI → BS OAuth tokens cleared from localStorage (`bs_access_token`, `bs_refresh_token`, `bs_user`, `bs_id_token` all gone).
- [ ] Vercel preview deploy succeeds on `d.ideas.crm7.app` with the new lockfile.
- [ ] `throughput#77` closed referencing the implementation PR(s).

---

## 7. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | Removing `retryAuth()` (A4) degrades the in-page "Try Again" UX on the `ErrorScreen`. | Low | Low | The cookie-SSO fallback is a `window.location.href = '/login'` redirect — a fresh mount either re-hydrates from the shared cookie or bounces to BSU. This is the correct recovery path, and the current `retryAuth()` implementation does essentially the same thing (setAuthInitialized(false) + re-run initializeAuth). No user-visible regression expected. |
| **R2** | Adopting `noopLock` (A2) in development removes the Web Locks multi-tab serialization. | Low | Low | Scope is **dev-only** per §4 A2 (`lock: import.meta.env.DEV ? noopLock : undefined`). Dev rarely hits the multi-tab refresh scenario (single developer, single browser) and Strict-Mode double-mount is strictly a dev-time artefact. Production keeps the Web Lock. See R9 for the production-scoped concern. |
| **R3** | `getClaims()` migration (B1) touches ~20 files across `collaboration.ts`, `user-management.ts`, `billing.ts`. Risk of a missed call-site or a break in RLS-guarded mutations. | Medium | Medium | Ship B1 as a separate PR under the same `throughput#77` tracking issue (or a sub-issue). Exhaustive code-search audit before merge. Each migrated call-site keeps a `getUser()` fallback. Add a unit test per critical path (create/delete idea, update team, billing mutation). |
| **R4** | Removing `AuthSessionManager` (A3) breaks the `profileUtils.ensureProfile()` side-effect that currently runs during initial session load — new users may not get their profile row created on first login. | Low | Medium | Call `ensureProfile(user)` inside the `onAuthStateChange` **`SIGNED_IN` branch**, guarded by a `useRef(false)` to fire exactly once per mount (skip `TOKEN_REFRESHED` events to avoid write amplification on every ~55 min refresh). Do **not** place the call in the bootstrap `useEffect` — that misses cross-tab sign-ins where the bootstrap runs before auth is established. See §4 A3 "Critical — `ensureProfile` placement" for the exact pattern. Verify via dev-account signup smoke (new email → signs in → `profiles` row present in Supabase) **and** a cross-tab smoke (sign in via BSU in a second tab while Throughput is open → `profiles` row still created). |
| **R5** | Lockfile regeneration (A5) done incorrectly (from within `bsuite/throughput/`) will cause `ERR_PNPM_OUTDATED_LOCKFILE` on Vercel. | Medium | High | Follow AGENTS.md §pnpm Lockfile Generation exactly — `mkdir ~/throughput_lockgen && cp throughput/package.json ~/throughput_lockgen/ && cd ~/throughput_lockgen && pnpm install && cp ~/throughput_lockgen/pnpm-lock.yaml throughput/pnpm-lock.yaml && rm -rf ~/throughput_lockgen`. Verify the resulting lockfile has `.:` as its only importer (no `..`). |
| **R6** | `@bsuite/auth` v0.2.x (or later) ships to npm mid-PR — e.g., a new breaking change lands between PR-open and merge, causing `^0.1.0` to resolve to an incompatible version. | Low | Medium | Rely on Phase 0 P0.1 dist-tag check + `pnpm-lock.yaml` snapshot (the lockfile records the exact resolved version, so a mid-PR npm publish does not change the resolved version unless `pnpm install` is re-run). If belt-and-braces is desired on a long-lived PR branch, temporarily pin to an exact version, then **restore the caret range in the final commit before merge** so the merged `main` complies with AGENTS.md §Dependency Version Policy rule 4 (caret ranges mandatory). The exact-pin must never land on `development` or `main`. If v0.2.x ships, defer the version bump to a separate follow-up PR to avoid scope creep. Coordinate a suite-wide bump with CRM7/R80.3/Braden per the AGENTS.md §Shared Packages doctrine — consumer parity is a hard requirement, a lone throughput bump is forbidden. |
| **R7** | `getClaims()` vs `getUser()` diverge on a subtle RLS edge case — e.g., a user whose JWT is still cryptographically valid but whose `auth.users` row was deleted mid-session. | Low | Low | The JWKS-validated claim `sub` still resolves locally, so `getClaims()` returns the user ID even for a deleted-account case. Any subsequent DB query correctly fails under RLS (`auth.uid() = user_id` → 0 rows), so the net effect is identical to `getUser()`. Add one integration test: seed a user, sign in, delete the user row via service-role RPC, call `getClaims()`, verify the subsequent `ideas` insert returns an RLS failure rather than succeeding. |
| **R8** | **Split-state auth**: the shared Supabase cookie session (`business_suite_auth` on `.crm7.app`) is valid, but the localStorage BS OAuth token set (`bs_access_token` / `bs_refresh_token` / `bs_user` / `bs_id_token`) is missing or stale — e.g., user signed in via another BSuite app that does NOT complete the BS OAuth PKCE flow to Throughput's consent surface, or a partial localStorage clear by browser extensions / privacy tools. `startBSTokenRefresh()` silently does nothing (early-return when no tokens present), so the Supabase session looks healthy but any code path that calls `verifyAccessToken()` or reads `localStorage.getItem('bs_access_token')` fails. | Medium | Medium | On AuthProvider mount, after `getSession()` resolves a valid session, check if `localStorage.getItem('bs_access_token')` is present. If missing but the Supabase session is active, kick `signInWithBusinessSuite()` **directly** to re-synchronise the two stores. **Do NOT** call `attemptSilentAuth()` here — it can dispatch `bs-oauth-expired` on refresh failure, which the B3 listener would translate into an immediate `/login` redirect (loop with the SIGNED_IN event that just fired). The B3 listener itself must guard against reentrancy with a `useRef(false)` flag flipped to `true` on first redirect (see §4 B3). Acceptance: cross-tab sign-in via BSU → Throughput tab detects valid Supabase session + missing `bs_access_token` → silently re-kicks PKCE → tokens populated within 2 s, no `/login` redirect fires. |
| **R9** | **Multi-tab refresh-token race / chunked-cookie interleaving** when `noopLock` is active in production: Web Locks serialization guarantees only one tab calls `/auth/v1/token?grant_type=refresh_token` with a given refresh token. Without the lock, multi-tab users (common in Throughput's idea-management workflow — users often keep 3+ idea tabs open) can have concurrent tabs race on the same refresh token → first wins, others get 401 (one-time-use refresh tokens) → cascading sign-outs. Chunked-cookie writes (`business_suite_auth.0`, `.1`, …) can also interleave across tabs and corrupt the merged JSON payload. | Medium | Medium | Scope `noopLock` to `import.meta.env.DEV` only (see A2 above) — production keeps the Web Lock, eliminating both races entirely. If a multi-tab refresh-race is later observed in production despite the lock, add a BroadcastChannel-based refresh coordinator as a belt-and-braces layer. Add a monitoring gate in Supabase Auth logs for a spike in `/token` 401s on the Throughput client ID to detect regression early. |

---

## 8. Reviewer Checklist

Binary pass/fail gates for PR-review time. Each row is independently verifiable — tick the box only when the stated check passes. Organised by Wave item so a reviewer can focus on one item at a time.

| # | Gate | Check | Pass? |
|---|---|---|:---:|
| **A1-1** | `onAuthStateChange` | `supabase.auth.onAuthStateChange(...)` is called inside `AuthProvider`'s mount `useEffect` | ☐ |
| **A1-2** | `onAuthStateChange` | `subscription.unsubscribe()` is returned from the effect's cleanup function | ☐ |
| **A1-3** | `onAuthStateChange` | Handler treats `SIGNED_OUT` as "clear user + navigate to /login" | ☐ |
| **A2-1** | `noopLock` | `lock: import.meta.env.DEV ? noopLock : undefined` appears in the auth config of `throughput/src/lib/supabase.ts` (dev-only scope per §4 A2) | ☐ |
| **A2-2** | `noopLock` | `LockFunc` is imported from `@supabase/supabase-js` | ☐ |
| **A2-3** | `noopLock` | Dev-server Strict-Mode double-mount no longer hangs the spinner | ☐ |
| **A2-4** | `noopLock` | Production build retains Web Locks serialization (smoke: `pnpm build && pnpm preview`, two tabs, force refresh, only one `/token` call) | ☐ |
| **A3-1** | `AuthSessionManager` simplification | `src/lib/auth/sessionManager.ts` is reduced to ≤ 40 lines **or** deleted entirely if `ensureProfile` moves to `AuthProvider` per §4 A3 guidance. Reviewer's choice which target is used; both satisfy the gate. | ☐ |
| **A3-2** | `AuthSessionManager` simplification | No `setTimeout` / `window.setTimeout` calls for auth init remain in `src/lib/auth/**` | ☐ |
| **A3-3** | `AuthSessionManager` simplification | `profileUtils.ensureProfile(user)` still called on first-login path (specifically via the `onAuthStateChange` SIGNED_IN handler per A3-4; **never** from the bootstrap `useEffect`). A cross-tab sign-in smoke confirms the profile row is created for the second-tab-signup scenario. | ☐ |
| **A3-4** | `ensureProfile` placement | `ensureProfile` is called inside `onAuthStateChange` SIGNED_IN branch with a `useRef`-guarded first-signin check; **not** called on `TOKEN_REFRESHED`; **not** called from bootstrap `useEffect` | ☐ |
| **A4-1** | `retryAuth` removal | `rg 'retryAuth' throughput/src/` returns matches **only** inside `src/components/auth-diagnostics/` (dev-tool exception documented in §4 A4) — zero matches anywhere else | ☐ |
| **A4-2** | `AUTH_TIMEOUT_MS` removal | `rg 'AUTH_TIMEOUT_MS' throughput/src/` returns **0 matches** | ☐ |
| **A4-3** | `retryAuth` removal | `ErrorScreen.test.tsx` no longer references the `retryAuth` fixture | ☐ |
| **A4-4** | `retryAuth` removal | `AuthContextType` in `types.ts` no longer declares the `retryAuth` field | ☐ |
| **A4-5** | `return_path` preservation | Production call-sites use `window.location.href = '/login?return_path=' + encodeURIComponent(...)` (not bare `/login`) | ☐ |
| **A4-6** | ErrorScreen disambiguation | `ErrorScreen.tsx` retry button handles `db_unreachable` → `onConnectionReset` vs `auth_failed`/unknown → `/login` redirect per §4 A4 | ☐ |
| **A5-0** | `supabase-js` peer-dep | `jq '.peerDependencies' packages/auth/package.json` shows no `@supabase/supabase-js` constraint **OR** the consumer pin satisfies it | ☐ |
| **A5-1** | `supabase-js` pin | `pnpm ls @supabase/supabase-js` in `throughput/` resolves to ≥ 2.103.0 (**verification-only** per §4 A5 — no bump expected) | ☐ |
| **A5-2** | `supabase-js` pin | `pnpm-lock.yaml` has `.:` as its only `importers:` key (no `..` / `../packages/*`) | ☐ |
| **A5-3** | `supabase-js` pin | Vercel preview build on `d.ideas.crm7.app` succeeds (no `ERR_PNPM_OUTDATED_LOCKFILE`) — only relevant if lockfile was regenerated | ☐ |
| **B1-1** | `getClaims()` | `src/lib/collaboration.ts` migrated to `getClaims()` with `getUser()` fallback; 0 regressions on create/delete idea | ☐ |
| **B1-2** | `getClaims()` | `src/lib/user-management.ts` migrated; 0 regressions on profile / team update | ☐ |
| **B1-3** | `getClaims()` | `src/lib/billing.ts` migrated for mutation-gating calls; Stripe checkout still succeeds | ☐ |
| **B2-1** | Cached auth | `throughput-cached-auth` key present in `localStorage` after sign-in; cleared on sign-out | ☐ |
| **B2-2** | Cached auth | First-paint spinner < 100 ms when a valid cached session exists | ☐ |
| **B3-1** | `bs-oauth-expired` | `window.addEventListener('bs-oauth-expired', …)` wired in `AuthProvider` mount effect | ☐ |
| **B3-2** | `bs-oauth-expired` | Listener routes the user to `/login` on receipt of the event | ☐ |
| **SEC-1** | Token leakage | After `signOut`, localStorage contains **none** of `bs_access_token`, `bs_refresh_token`, `bs_user`, `bs_id_token` | ☐ |
| **SEC-2** | Service-role leakage | `rg 'service_role\|SERVICE_ROLE' throughput/src/` returns **0 matches** | ☐ |
| **SEC-3** | Redirect hardening | `AuthCallback.tsx` and `LoginContent.tsx` `return_path` sanitisation intact (rejects `//`, `/\`, non-`/` prefix) | ☐ |
| **DOC-1** | Status bump | Document status footer bumped from `v1.00D` → `v1.01W` in the Wave A PR (see §11) | ☐ |
| **DOC-2** | Issue link | `throughput#77` referenced in the PR description with `Closes` keyword | ☐ |

**Minimum gates** for Wave A merge: all `A*` and `SEC-*` rows. **Minimum** for Wave B merge: all `B*` rows. `DOC-*` rows ship with their respective PRs.

---

## 9. Post-Merge Follow-Ups

Housekeeping to complete after the Wave A PR lands on `throughput/development`. Track these as checklist items in the Wave A PR description so they are visible at merge time.

| # | Task | Owner surface | Evidence |
|---|---|---|---|
| **F1** | Close `throughput#77` referencing the Wave A PR URL | `throughput` repo | Issue closed; PR linked via `Closes #77` |
| **F2** | File a **suite-wide** `getClaims()` migration issue in the `bsuite` parent repo (not `throughput`) covering CRM7 + R80.3 + Braden + Throughput, since the Gap Analysis §3 shows all 4 consumers are equally partial | `bsuite` repo | New issue `bsuite#NN` with labels `auth`, `p1`, `cross-repo` |
| **F3** | File a Wave C tracking issue in `bsuite` (not `throughput`) — C1/C2/C3 touch the shared cookie-storage / `business-suite-oauth.ts` doc-comment pattern across all 4 consumers | `bsuite` repo | New issue `bsuite#NN` with labels `auth`, `p2`, `cleanup` |
| **F4** | Update `docs/20260501-merged-execution-backlog-v1.00W.md` — mark TP-04 as `Done` with the Wave A PR SHA | `bsuite/docs/` | Doc PR or same-PR amendment |
| **F5** | Update `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` — mark Wave A complete; add a Wave B row if shipping separately | `bsuite/docs/` | Doc PR or same-PR amendment |
| **F6** | Write session summary to QIG Memory key `bsuite_session_latest` with TP-04 resolution + Wave A commit SHAs (per `MEMORY_PROTOCOL.md`) | QIG Memory API | `curl -s .../bsuite_session_latest \| jq -r '.content'` contains the TP-04 entry |
| **F7** | Bump this document's status: `v1.00D` → `v1.01W` after Wave A merges on `development`; → `v1.02W` after Wave A promotes to `main`; → `v2.00A` after Wave B merges; → `v2.00F` (Frozen) after cross-repo `getClaims()` sweep closes all 4 consumers. See §11 for the full ladder. | `bsuite/docs/` | Footer version string updated in each PR; file renamed per BSuite doc convention |
| **F8** | Parent `bsuite` submodule-pointer bump — after the throughput Wave A PR merges with post-squash SHA `$THROUGHPUT_SHA`, open a parent PR in `bsuite` bumping the `throughput` submodule pointer to that SHA per the 2026-05-04 ceremony | `bsuite` repo | Parent `chore(bsuite): bump throughput submodule pointer post-TP-04-Wave-A` PR merged |
| **F9** | Monthly promote ceremony — when Wave A moves from `throughput/development` → `throughput/main`, use `--merge` (merge-commit) strategy per the 2026-05-04 ceremony to preserve the SHA currently pinned in the parent | `throughput` + `bsuite` | Promote PR merged; SHA preservation verified (`git merge-base --is-ancestor $THROUGHPUT_SHA origin/main` → exit 0) |
| **F10** | Cross-notify CRM7, R80.3, Braden of the `noopLock` adoption decision — R80.3 and Braden currently lack it per the Gap Analysis §3 and may want parity on the Strict-Mode fix | Coordination (Slack / issue) | Follow-up issue(s) opened OR an explicit `won't-fix` note |
| **F11** | Update `AGENTS.md` §Recent Changes with a dated entry for TP-04 Wave A — this is the project's institutional memory and every material auth/infra change is expected to land there (see the existing 2026-04-14 / 2025-02-27 entries for the canonical format). Include: date, scope (throughput), one-line summary, PR reference. If Wave B or the cross-repo `getClaims()` sweep also merges in the same week, consolidate into a single dated entry. | `bsuite/AGENTS.md` | AGENTS.md has a new `Recent Changes (YYYY-MM-DD)` entry referencing the Wave A PR and `throughput#77` |

---

## 10. Execution Order

End-to-end sequence for Wave A, interleaving `throughput/` repo work with the parent `bsuite/` submodule-pointer ceremony. Pattern matches the 2026-05-04 docs-unification merge ceremony. **Do not skip steps** — the `--merge` vs `--squash` decision at step 20 is doctrinal (preserves SHA for submodule-pointer integrity).

### Phase 0 — Pre-work gate (mandatory, ~2 minutes)

Run these checks **before creating the feature branch**. They exist to catch suite-wide version-skew problems that would otherwise derail the PR mid-flight (see §7 R6).

- **P0.1 — Check `@bsuite/auth` dist-tag on npm**:

  ```bash
  npm view @bsuite/auth dist-tags
  # expected: { latest: '0.1.0' } (or a patch like 0.1.1 / 0.1.2 / …)
  ```

  If `latest` is a **major/minor bump** (i.e., `≥ 0.2.0`), **STOP and coordinate a suite-wide bump PR** first (covering CRM7 / R80.3 / Braden / Throughput together) before returning to this plan — consumer parity is a hard requirement per AGENTS.md §Shared Packages doctrine. **Patch-level bumps (`0.1.1`, `0.1.2`, …) are safe to pull in** as part of this PR; note the patch version in the PR description and update consumers' pins together via a single targeted commit. The distinction matters: patches ship bug fixes only, minors/majors ship API changes that require coordinated consumer updates.

- **P0.2 — Check current consumer-version parity**:

  ```bash
  cd /home/braden/Desktop/Dev/bsuite
  for sub in crm7 R80.3 braden throughput; do
    printf '%-12s: ' "$sub"
    jq -r '.dependencies["@bsuite/auth"]' "$sub/package.json"
  done
  # expected: all four print ^0.1.0 (or the exact same pin)
  ```

  If any consumer pins a different version, align them **before** starting this work. A heterogeneous suite is a smell that should not be inherited.

- **P0.3 — Check the tracking issue is still open and unassigned**:

  ```bash
  gh issue view --repo GaryOcean428/throughput 77 --json state,assignees
  ```

  If someone else has already self-assigned, coordinate with them before proceeding.

- **P0.4 — Confirm the `@supabase/supabase-js` target version is still 2.103.0-or-current**: Supabase changes frequently (per the `supabase` skill). If the latest supported version has moved, update §4 A5 and the §8 A5-1 reviewer gate accordingly before opening the PR.

- **P0.5 — Verify `VITE_BSU_URL` is set in Throughput's Vercel project** for both `ideas.crm7.app` (production) and `d.ideas.crm7.app` (development preview):

  ```bash
  # Requires Vercel CLI authenticated to the Throughput project
  vercel env ls --project throughput 2>/dev/null | grep -E 'VITE_BSU_URL'
  # expected: VITE_BSU_URL set for Production and Preview scopes
  ```

  A missing value silently degrades the login UI to the "Login Misconfigured" banner (see `LoginContent.tsx`) — a silent failure mode that a reviewer won't catch because no error is thrown, CI still passes, and the production build still succeeds. The banner is the only user-visible signal, and it appears only at runtime after the user tries to sign in. Adding this as a Phase 0 gate catches it **before** the feature-branch PR is opened. If the var is missing, set it via the Vercel dashboard or `vercel env add VITE_BSU_URL` before starting implementation.

Only proceed to Phase 1 after all five P0 checks pass.

### Phase 1 — Wave A implementation (`throughput/`)

1. **Sync workspace**: `cd throughput/ && git fetch origin && git checkout development && git pull --ff-only`
2. **Create feature branch**: `git checkout -b fix/throughput-tp04-wave-a-20260504`
3. **Implement in 5 commits** (one per item, in dependency order):
   - Commit 1 — **A1**: `onAuthStateChange` subscription added
   - Commit 2 — **A2**: `noopLock` in supabase client
   - Commit 3 — **A3**: `AuthSessionManager` simplified (large net-deletion; retain `ensureProfile` call path per §7 R4)
   - Commit 4 — **A4**: `retryAuth` / `AUTH_TIMEOUT_MS` removed from context; 3 production consumer files (`App.tsx`, `layout/index.tsx`, `ErrorScreen.tsx`) migrated to path-preserving `/login` redirect; `auth-diagnostics/` retains local `retryAuth`; test fixture re-aligned. See §4 A4 disposition table.
   - Commit 5 — **A5**: `@supabase/supabase-js` version bump + **isolated-directory** lockfile regen (see §4 A5)
4. **Local verification**: `pnpm typecheck && pnpm test && pnpm lint` all pass
5. **Push**: `git push -u origin fix/throughput-tp04-wave-a-20260504`
6. **Open PR** targeting `throughput/development`. Title: `fix(throughput): TP-04 Wave A — @bsuite/auth alignment (onAuthStateChange, noopLock, AuthSessionManager simplification)`. Body references `throughput#77` with the `Closes #77` keyword. **Paste the §8 Reviewer Checklist** as a markdown block.
7. **CI**: wait for `build-and-test` to pass on the PR
8. **Vercel preview**: wait for the deploy to `d.ideas.crm7.app`; run the manual auth smoke from §6 (sign-in on BSU, observe Throughput, cross-tab sign-out, token refresh > 5 min)
9. **Request review**; address comments
10. **Merge with `--squash`**: `gh pr merge --repo GaryOcean428/throughput <PR-NUM> --squash --delete-branch`
11. **Capture the post-squash SHA**: `gh pr view --repo GaryOcean428/throughput <PR-NUM> --json mergeCommit --jq '.mergeCommit.oid'` → record as `$THROUGHPUT_SHA`

### Phase 2 — Parent submodule-pointer bump (`bsuite/`)

12. **Sync parent**: `cd /home/braden/Desktop/Dev/bsuite && git fetch origin && git checkout development && git pull --ff-only && git submodule update --init --recursive`
13. **Create parent branch**: `git checkout -b chore/bsuite-bump-throughput-tp04-wave-a-20260504`
14. **Bump pointer**: `(cd throughput && git fetch origin && git checkout $THROUGHPUT_SHA)` then `git add throughput`
15. **Commit**: `git commit -m "chore(bsuite): bump throughput submodule pointer post-TP-04-Wave-A ($THROUGHPUT_SHA)"`
16. **Push + open parent PR** targeting `bsuite/development`
17. **Wait CI** (DOM Layout Invariants, build-and-test, gitleaks, submodule-pointer validation)
18. **Merge parent with `--squash`**: `gh pr merge --repo GaryOcean428/bsuite <PR-NUM> --squash --delete-branch`

### Phase 3 — Promote-to-main (monthly ceremony)

19. **Wait** for the next scheduled `development → main` promote cycle (or trigger one early per the 2026-05-04 ceremony pattern if urgent)
20. **Promote PR merge strategy**: use `--merge` (merge-commit), **NOT** `--squash`. Rationale: squash on `main` would create a new SHA, invalidating the parent's pinned submodule pointer and requiring a re-bump dance. `--merge` preserves `$THROUGHPUT_SHA` as a reachable ancestor of `throughput/main`, so the parent pointer stays valid automatically. This is the canonical lesson from the 2026-05-04 ceremony (see `bsuite_session_latest` in QIG Memory).
21. **Verify** after promote: `git -C throughput merge-base --is-ancestor $THROUGHPUT_SHA origin/main` exits 0.
22. **Close `throughput#77`** if not already auto-closed by step 10's `Closes #77` keyword (manual close may be required if the keyword was on the parent PR instead).

### Phase 4 — Wave B (separate PR, after Wave A merges)

23. **Repeat Phase 1–3** with branch `fix/throughput-tp04-wave-b-20260504`, 3 commits (B1/B2/B3), new PR targeting `throughput/development`, references the (now closed) `throughput#77` or a new sub-issue. Same `--squash` on development, `--merge` on promote-to-main.

### Phase 5 — Wave C (opportunistic)

24. Bundle with the next unrelated cleanup PR to avoid PR-noise. Not time-sensitive. Track via the `bsuite#NN` issue filed in §9 F3.

### Cleanup if anything goes wrong

- **Stale remote branches**: `gh api -X DELETE repos/GaryOcean428/throughput/git/refs/heads/fix/throughput-tp04-wave-a-20260504`
- **Local state drift**: `git submodule deinit --force throughput && git submodule update --init throughput`
- **Lockfile corruption**: re-run the isolated-directory regen from §4 A5 — **never** `pnpm install` from within `bsuite/throughput/`.
- **Parent pointer wrong SHA**: run `(cd throughput && git checkout $THROUGHPUT_SHA) && git add throughput && git commit --amend --no-edit && git push --force-with-lease` on the parent branch (only before merge).

---

## 11. Document Status Evolution

| Version | Status | Trigger | Action required |
|---|---|---|---|
| **v1.00D** | Draft (D) | Initial plan — this document, 2026-05-04 | Internal review by a second agent or the author's next session |
| **v1.01R** | Review (R) | Reviewer feedback applied, ready for PR-level review | Attach to Wave A PR description; reviewer approval unlocks merge |
| **v1.02W** | Working (W) | Wave A PR merged on `throughput/development` and promoted to `main` via the monthly ceremony | Rename file, update footer, update `MERGED_EXECUTION_BACKLOG` entry |
| **v2.00A** | Approved (A) | Wave B + Wave C merged; TP-04 fully closed in production across the suite | Rename file, update footer, move source-of-truth to the closed-state entry |
| **v2.00F** | Frozen (F) | Cross-repo `getClaims()` sweep (filed per §9 F2) closes all 4 consumers (CRM7 / R80.3 / Braden / Throughput) at parity | Move to `docs/archive/` per BSuite doc retention policy |

**Naming convention reminder** (per AGENTS.md §Documentation): each version bump renames the file following the ladder above — `…-v1.00D.md` → `…-v1.01R.md` → `…-v1.02W.md` → `…-v2.00A.md` → `…-v2.00F.md`. The trailing letter (D / R / W / A / F) is part of the filename, not just the frontmatter metadata block. Update the `| **Version** |` row of the metadata block **and** the `| **Status** |` row on every bump. AGENTS.md §Documentation defines the canonical status codes: `W=Working, D=Draft, R=Review, A=Approved, F=Frozen`.

---

## 12. References

### Canonical source files

- `/home/braden/Desktop/Dev/bsuite/packages/auth/src/oauth-client.ts` — `@bsuite/auth` OAuth 2.1 PKCE implementation (375 lines; JWKS via `jose`, OIDC nonce, silent refresh, token lifecycle).
- `/home/braden/Desktop/Dev/bsuite/packages/auth/src/types.ts` — `BusinessSuiteTokens`, `OAuthClient`, `VerifiedUser` shared types.
- `/home/braden/Desktop/Dev/bsuite/crm7/src/contexts/AuthContext.tsx` — reference AuthProvider (cached auth, onAuthStateChange, signOut with BS-token cleanup, audit logging).
- `/home/braden/Desktop/Dev/bsuite/crm7/src/lib/supabase.ts` — reference Supabase client (chunked cookies, `noopLock`, env-var key transition fallback, configured-vs-placeholder guard).
- `/home/braden/Desktop/Dev/bsuite/R80.3/src/stores/authStore.ts` — reference Zustand variant of the same contract (`initialize()` subscribes + tenant load, `signOut()` + `clearBSTokens()`).
- `/home/braden/Desktop/Dev/bsuite/R80.3/src/services/supabaseClient.ts` — reference cookie-storage helpers with `VITE_COOKIE_DOMAIN` env override.

### Docs & standards

- [`AGENTS.md`](../AGENTS.md) — §Authentication & OAuth (two-mechanism model, OAuth client registry table), §Cross-Domain Session Sharing (Cookie SSO), §Cookie Hardening (Applied), §Mandatory OAuth Providers (Google + Microsoft invariant), §Shared Packages (npm) (version-pinning rules), §pnpm Lockfile Generation (isolated-directory pattern).
- Supabase OAuth 2.1 Server — <https://supabase.com/docs/guides/auth/oauth-server/getting-started>, <https://supabase.com/docs/guides/auth/oauth-server/oauth-flows>, <https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication>.
- `auth-setup` skill — cross-project auth coordination checklist, `getClaims()` migration pattern, Supabase key-transition fallback.
- `supabase` skill — core principles, security checklist (user_metadata trap, views/RLS, storage upsert), OAuth 2.1 cross-reference to `supabase-auth-comprehensive`.

### Issues & history

- [`throughput#77`](https://github.com/GaryOcean428/throughput/issues/77) — TP-04 tracking issue (OPEN; labels `auth`, `p0`; Wave A).
- `docs/archive/crm7/2026-04-24-submodule-import/20260226-authentication-fix-summary-v1.00A.md` — historical context for the `@bsuite/auth` migration doctrine.
- Cookie SSO deployment timeline — AGENTS.md §Recent Changes (2026-04-14) entry on `business_suite_auth` + `noopLock` rollout.

---

## 13. Implementation Plan — Estimated Effort

| Item | Description | Effort (h) | Blocks | Blocked by |
|---|---|:---:|---|---|
| **A1** | `onAuthStateChange` subscription | 1.0 | A3, A4 | — |
| **A2** | `noopLock` in supabase client | 0.25 | — | — |
| **A3** | Simplify `AuthSessionManager`, remove timeout watchdog | 2.5 | A4 | A1 |
| **A4** | Remove `retryAuth` / `AUTH_TIMEOUT_MS` from context, migrate 3 production consumer files + test fixture (auth-diagnostics keeps local helper) | 1.5 | — | A3 |
| **A5** | **Verify** `@supabase/supabase-js` ≥ 2.103.0 + peer-dep pre-check (no bump expected; lockfile regen only if pin changes) | 0.25 | — | — |
| **Wave A total** | P0 — required to close TP-04 | **5.5 h** | | |
| **B1** | `getClaims()` migration across 20 call-sites | 4.0 | — | Wave A merged |
| **B2** | Cached auth first-paint | 1.0 | — | A1 |
| **B3** | `bs-oauth-expired` event listener | 0.5 | — | Wave A merged |
| **Wave B total** | P1 — hardening | **5.5 h** | | |
| **C1** | Delete deprecated helpers (skip if already clean) | 0.1 | — | — |
| **C2** | Naming alignment | 0.25 | — | — |
| **C3** | Doc-comment cleanup | 0.1 | — | — |
| **Wave C total** | P2 — polish | **0.5 h** | | |
| **Grand total** | | **~11.5 h** | | |

### Suggested PR decomposition

1. **PR 1 (Wave A)** — single PR, 5 commits (one per A-item), targets `throughput/development`. Closes `throughput#77`.
2. **PR 2 (Wave B)** — follow-up PR, references closed `throughput#77` or a new sub-issue (e.g. `throughput#NN` for the `getClaims()` sweep).
3. **PR 3 (Wave C)** — opportunistic; bundle with the next unrelated cleanup PR to avoid PR-noise.

All three PRs follow the BSuite promote/development→main ceremony documented in `AGENTS.md` and the prior merge-ceremony session record (see `bsuite_session_latest` in QIG Memory).

---

*Generated 2026-05-04 by Buffy during the TP-04 planning session.*
