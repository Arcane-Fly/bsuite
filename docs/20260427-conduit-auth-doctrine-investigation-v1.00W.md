# Conduit Auth Doctrine vs Reality Investigation

**Status:** Working (W)
**Date:** 2026-04-27
**Author:** Claude (investigation subagent for WS-J finish-line review)
**Trigger:** WS-J smoke test (2026-04-25) reported "Conduit smoke shows 'Sign in with BSuite' + redirects through BSU `/login`" — appearing to contradict frozen-decision #5: *"Conduit remains Supabase SSR/native auth only."*

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Verdict

**(C) Doctrine is partially stale — reality is a documented hybrid that doctrine described too narrowly.**

The implementation is **NOT** BS OAuth 2.1 client wiring. Conduit is still **Supabase native auth via `@supabase/ssr`** — exactly as decision #5 says. But Conduit *also* short-circuits its own `/auth/login` UI and bounces unauthenticated visitors to BSU's `/login` page. Once authenticated on BSU, the `.crm7.app` shared cookie (`business_suite_auth`) lets Conduit treat that session as its own. No OAuth 2.1 authorization code, no consent screen, no client registration, no `business-suite-oauth.ts`.

The smoke observation is real. The doctrine line *"Supabase SSR/native auth only"* is technically correct (the auth mechanism IS Supabase native) but is misleading because it implies Conduit hosts its own login UI — which it deliberately doesn't.

This is **neither** verdict A (smoke wrong) **nor** verdict B (BS OAuth drift). It's a third state: **smoke right + implementation right + doctrine description incomplete**.

---

## Code Evidence

### 1. Conduit hosts NO BS OAuth 2.1 client surface

```
$ grep -rn "business_suite_auth\|bs_oauth_state\|business-suite-oauth\|bs-oauth" conduit/src/
src/lib/supabase/client.ts:22:        storageKey: 'business_suite_auth',
src/lib/supabase/server.ts:25:        storageKey: 'business_suite_auth',
src/lib/supabase/middleware.ts:55:        storageKey: 'business_suite_auth',
```

Only hits are the **Supabase storage key** — the same shared key used for cookie-SSO. **Zero hits** for `bs_oauth_state` or `business-suite-oauth`.

- No `src/lib/business-suite-oauth.ts`
- No `@bsuite/auth` dependency in `conduit/package.json`
- No registered OAuth client ID for Conduit in BSU's OAuth client registry (CLAUDE.md table lists only CRM7, R80.3, Braden, Throughput)

### 2. Conduit's `/auth/login` page is a redirect-only stub

`/home/braden/Desktop/Dev/bsuite/conduit/src/app/auth/login/page.tsx:1-30`

```ts
const BSU_LOGIN_URL = 'https://suite.crm7.app/login'

export default function LoginPage() {
  useEffect(() => {
    const url = new URL(BSU_LOGIN_URL)
    const params = new URLSearchParams(window.location.search)
    const returnPath = params.get('return_path') || '/candidates'
    url.searchParams.set('return_to', 'conduit')
    url.searchParams.set('return_path', returnPath.startsWith('/') ? returnPath : '/candidates')
    window.location.href = url.toString()
  }, [])
  // Loading spinner only
}
```

Comment (line 7-10) explicitly says *"Auth is centralized at BSU (suite.crm7.app)."*

### 3. Middleware actively redirects unauthenticated users to BSU

`/home/braden/Desktop/Dev/bsuite/conduit/src/lib/supabase/middleware.ts:9, 87-93`

```ts
const BSU_LOGIN_URL = 'https://suite.crm7.app/login'
...
if (!user && !isPublic && request.nextUrl.pathname !== '/') {
  const returnPath = request.nextUrl.pathname + request.nextUrl.search
  const loginUrl = new URL(BSU_LOGIN_URL)
  loginUrl.searchParams.set('return_to', 'conduit')
  loginUrl.searchParams.set('return_path', returnPath)
  return NextResponse.redirect(loginUrl)
}
```

### 4. Landing page CTAs link directly to BSU (smoke observation source)

`/home/braden/Desktop/Dev/bsuite/conduit/src/components/marketing/ConduitLanding.tsx:144, 148, 185, 189, 332, 335`

Three "Sign in with BSuite" buttons (header, hero, footer), all hrefed to `https://suite.crm7.app/login?return_to=https://conduit.crm7.app`.

### 5. Callback uses Supabase native PKCE, NOT BS OAuth token endpoint

`/home/braden/Desktop/Dev/bsuite/conduit/src/app/auth/callback/route.ts:9-14`

```ts
if (code) {
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  ...
}
```

This is the standard Supabase PKCE handler (the same call used by all `@supabase/ssr` apps). No call to BSU's `/oauth/token` endpoint, no `bs_oauth_state` validation.

### 6. The handoff is cookie-SSO via shared `.crm7.app` storage

`/home/braden/Desktop/Dev/bsuite/conduit/src/lib/supabase/client.ts:6-13` — applies `domain=.crm7.app` cookie scope.
`/home/braden/Desktop/Dev/bsuite/business-suite-unified/src/lib/redirectTargets.ts:18` — BSU has `conduit: 'https://conduit.crm7.app'` in its allowlist.
`/home/braden/Desktop/Dev/bsuite/business-suite-unified/src/components/auth/AuthScreen.tsx:22-28` — BSU's login page accepts `return_to` and uses `buildReturnUrl` to bounce back after Supabase login completes.

So the flow is:
1. Conduit redirects user → BSU `/login?return_to=conduit&return_path=/...`
2. User signs in on BSU's native AuthScreen (Supabase email/password or Google/Microsoft)
3. BSU's Supabase client sets the `business_suite_auth` cookie at `.crm7.app` scope
4. BSU's AuthCallback redirects back to `https://conduit.crm7.app/<path>`
5. Conduit's middleware reads the same cookie via `@supabase/ssr` — user is authenticated, no token exchange needed

No OAuth 2.1 authorization code flow involved at any step.

---

## Git Trail

| Commit | Date | Author | Summary |
|--------|------|--------|---------|
| `dd88a3c` | 2026-03-02 | GaryOcean428 | `feat(conduit): add Microsoft OAuth to login page` — original Conduit-hosted login |
| `540c018` | 2026-03-03 | GaryOcean428 | `fix(conduit): fix cookie domain check for cross-app SSO, replace login/register with BSU redirect` — **first BSU-redirect implementation**; deletes 350 lines of Conduit-hosted login UI |
| `8a3143e` / `197fdab` | 2026-04-23 | BSuite Agent (committed by Braden) | `feat(conduit): Phase 9.1 — BSU SSO redirect with full return_to URL` — **PR #102, MERGED 2026-04-23**; landing page CTAs now point directly at BSU |

PR #102 body explicitly says: *"`/auth/callback` route (PKCE code exchange) is **untouched**"* and *"`/auth/register` redirect behaviour is **unchanged**"*. Author was aware this was a redirect/UX change, not an auth-mechanism change.

The migration was authored 7+ weeks ago (2026-03-03) and reinforced 4 days ago (2026-04-23) — both periods were active development times. Braden personally committed PR #102. **This is intentional, ratified work that was simply not propagated into the doctrine description.**

---

## Doctrine Audit

### Where the doctrine is correct

- ✅ `bsuite_decisions` #5: *"Conduit remains Supabase SSR/native auth only"* — the **mechanism** is Supabase native (cookie-SSO via `@supabase/ssr`). True.
- ✅ Parent `CLAUDE.md` (`/home/braden/Desktop/Dev/bsuite/CLAUDE.md`): *"Conduit uses `@supabase/ssr` server-managed cookies and does not participate"* in BS OAuth. True.
- ✅ All four CLAUDE.md OAuth-client tables (parent + per-project) correctly omit Conduit. True.

### Where the doctrine is incomplete

- ⚠️ Parent `CLAUDE.md` Cookie-SSO section: *"BSU, CRM7, R80.3, and Throughput share a Supabase session via cookieStorage"* — **omits Conduit**. But code shows Conduit also uses `business_suite_auth` storage key with `.crm7.app` domain (`conduit/src/lib/supabase/client.ts:22`, `server.ts:25`, `middleware.ts:55`). **Conduit DOES participate in cookie-SSO.**
- ⚠️ Doctrine never explicitly states *"Conduit's `/auth/login` is a stub that redirects to BSU"* or *"Conduit landing page CTAs link to BSU"*. A reader could reasonably conclude Conduit hosts its own login UI.
- ⚠️ Project-local `conduit/CLAUDE.md` likewise omits the BSU-redirect behaviour.

### The actual hybrid (what reality is)

Conduit is in a **third auth posture** not currently described:

> **"Cookie-SSO consumer with delegated login UI"** — Conduit uses Supabase native auth for sessions (no BS OAuth 2.1) AND delegates its own login surface to BSU's hosted login page, treating BSU as the only place users ever see a login form. Cross-app cookie SSO via `domain=.crm7.app` makes the BSU login session valid on Conduit without any token exchange.

This is **architecturally cleaner** than BS OAuth 2.1 (no second token system to maintain) and is consistent with the cookie-SSO pattern used by the other `.crm7.app` apps. Braden ratified this in PR #102.

---

## Smoke Test Re-interpretation

WS-J smoke (2026-04-25): *"Conduit smoke shows 'Sign in with BSuite' + redirects through BSU `/login`"*

✅ **The smoke is accurate.** Conduit DOES show "Sign in with BSuite" buttons (3 of them on the landing page) and DOES redirect through BSU `/login`. The smoke author correctly observed user-facing behaviour.

The smoke author's *concern* (this contradicts decision #5) is the part that was wrong — they assumed any "redirect through BSU `/login`" implies BS OAuth 2.1 client wiring. But the redirect is to BSU's **native Supabase login screen**, not BSU's `/oauth/consent` OAuth-server screen. The two are distinct surfaces on BSU.

---

## Recommended Next Action (coordinator-level)

**Update doctrine to ratify the hybrid posture (no code changes required):**

### 1. Amend `bsuite_decisions` #5

Replace:
> *"Conduit remains Supabase SSR/native auth only."*

With:
> *"Conduit uses Supabase SSR/native auth only (no BS OAuth 2.1 client). It is a cookie-SSO consumer on `.crm7.app` and delegates its login UI to BSU's `/login` page via `return_to=conduit` redirects. No OAuth client registration, no `business-suite-oauth.ts`, no consent screen — but `/auth/login` and middleware redirect unauthenticated users to BSU."*

### 2. Update parent `CLAUDE.md` Cookie-SSO section

Add Conduit to the participating-app list:
> *"BSU, CRM7, R80.3, Conduit, and Throughput share a Supabase session via `cookieStorage` with `domain=.crm7.app`, key `business_suite_auth`."*

### 3. Update parent + project `CLAUDE.md` Conduit auth notes

Add a one-line note:
> *"Conduit's `/auth/login` is a redirect stub to BSU; landing page CTAs link directly to `suite.crm7.app/login`. PKCE code exchange in `src/app/auth/callback/route.ts` is standard Supabase native, not BS OAuth."*

### 4. Mark WS-J smoke item as RESOLVED-NO-DRIFT

In the WS-J finish-line signoff, note: *"Smoke observation accurate; doctrine was ambiguous; updated to clarify that BSU `/login` redirect is by design (cookie-SSO), distinct from BS OAuth 2.1 client wiring (which Conduit does NOT have)."*

### 5. (Optional) Verify Throughput parity

Decision #5 lists Throughput as a BS OAuth 2.1 client. Worth a quick check whether Throughput is in the same hybrid (cookie-SSO + delegated login) or genuinely uses BS OAuth — the project-local CLAUDE.md for Conduit was outdated, the same may be true for Throughput. **Out of scope for this investigation but flagged.**

---

## Concerns

1. **Conduit's local `CLAUDE.md` is stale on auth** — still says "5 web applications" (Throughput is missing) and lists only 4 OAuth clients. The doctrine drift on Conduit auth is part of a broader pattern of project-local CLAUDE.md files lagging the parent. Consider a sync sweep.
2. **The `/auth/register` page** — PR #102 said it was "unchanged" and still uses an opaque `'conduit'` token rather than the full `https://conduit.crm7.app` URL. Inconsistency between login (full URL) and register (opaque token) routes. Not security-critical but worth tidying.
3. **`/auth/callback` is a Supabase PKCE handler that BSU's redirect path never actually hits** — BSU redirects users back to `/<return_path>` directly (not via `/auth/callback`), because the cookie is already set. The `/auth/callback` route appears to be dead code in the current flow — verify whether anything else (e.g., email magic links) still uses it before removing.
4. **Documentation invariant violated:** parent CLAUDE.md states Conduit "does not participate" in cookie SSO, but `business_suite_auth` storage key + `.crm7.app` cookie domain proves it does. Decision #7 (`storageKey: 'business_suite_auth'`) silently applies to Conduit too.
