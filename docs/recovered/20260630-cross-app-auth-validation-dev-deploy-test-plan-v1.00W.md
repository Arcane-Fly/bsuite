<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> The single claim under test — that after a BSU OAuth 2.1 PKCE login each app bridges its `bs_*`
> tokens into a real Supabase session so RLS reads authenticate as the user — is implemented.
>
> **Evidence:** `crm7/src/pages/auth/callback.tsx:209` calls `supabase.auth.setSession({…})`, with
> the bridge documented at `:67` and the storage/`onAuthStateChange` ordering handled at `:247`.
> Contract test: `crm7/src/__tests__/oauth-contract.test.ts`.
>
> **The test *procedure* below remains useful** as a re-validation runbook for the `d.*`
> development deploys. Note that a Vercel *preview* host cannot be signed into — only the stable
> `d.*` development domains work, which is what this plan already targets.
>
> **Marker defect:** `W` on delivered work.

---

# Cross-App Auth Validation — Dev-Deploy Test Plan (d.* deploys)

**Date:** 2026-06-30
**Skill applied:** `supabase-auth-comprehensive` (BSU OAuth 2.1 PKCE + JWKS; `setSession` bridge doctrine)
**Environments:** development deploys only — `d.suite.crm7.app`, `d.crm.crm7.app`, `d.conduit.crm7.app`, `d.ideas.crm7.app` (Throughput), `d.r8.crm7.app`
**Account:** braden.lang77@gmail.com (BSU OAuth, owner-level)

---

## What is being validated (the single claim)

> After a BSU OAuth 2.1 PKCE login, each app's callback **bridges the `bs_*` OAuth tokens into a real Supabase session** (`supabase.auth.setSession`), so that **RLS-protected PostgREST/RPC/Realtime reads authenticate AS THE USER** — returning **200 with the user's data**, not anon `401/403` or empty.

This is the exact failure class behind the conduit team-load incident and the 2026-05-20 crm7 production incident (login succeeds but every downstream RLS read 401/403s because the session never bridged).

**Code anchors (canonical pattern, identical across apps):**
- conduit: `src/app/auth/callback/page.tsx:118-179` (`setSession` + poll `getSession` until `access_token` observed, else throw `[BS OAuth invariant violated]`); client `src/lib/supabase/client.ts:31-35` (`flowType: 'pkce'`, per-domain `@supabase/ssr`).
- crm7: `src/pages/auth/callback.tsx:164-241`; client `src/lib/supabase.ts:69-80` (`flowType: 'pkce'`, per-domain `storageKey`, `noopLock`).
- throughput: `src/pages/auth/AuthCallback.tsx:157-224`.
- R80.3: same `@bsuite/auth` callback pattern (to confirm at file open during execution).

### Why this test distinguishes working from broken
- **Broken bridge** (missing/failed `setSession`, or in-memory sync race): the callback either shows the **"Authentication failed — [BS OAuth invariant violated]"** error card, OR the destination page loads but the Network panel shows the first RLS-gated request to `*.supabase.co/rest/v1/*` (or `/rpc/*`) returning **401/403** (or 200 with `[]` where the user should have rows). A passing run looks visibly different: **200 with the user's row(s)** and the authenticated app shell rendered.
- A naive "did the page load?" check would look identical broken-vs-working (the shell renders either way), so the test MUST inspect the Supabase request status + payload, not just the page.

---

## Test matrix (one flow, five apps)

For each app, the flow is: open `d.<app>.crm7.app` → trigger BSU OAuth sign-in → complete consent (session already warm in BSU) → land on the authenticated landing route → open DevTools Network, filter `supabase.co`, inspect the first RLS-gated `rest/v1` or `rpc` request.

| # | App | URL | Authenticated landing + RLS read to inspect | PASS criteria |
|---|-----|-----|----------------------------------------------|---------------|
| A1 | business-suite-unified | d.suite.crm7.app | portal/admin landing; a `rest/v1/` read (e.g. `profiles`/tenant/branding) | request **200**, returns the user's row; no `401/403`; no auth-error card |
| A2 | crm7 | d.crm.crm7.app | dashboard; `branding_json_for_tenant` RPC + `user_tenants`/`profiles` read | requests **200** with data; no `401/403`; no invariant-violated card |
| A3 | conduit | d.conduit.crm7.app | `/candidates` (or `/settings` Team); `user_tenants` read | request **200** with `joined_at` select; member/data rows present |
| A4 | throughput | d.ideas.crm7.app | ideas dashboard; a `rest/v1/` ideas/projects read | request **200** with data (or legit empty state for a 0-row table); no `401/403` |
| A5 | R80.3 | d.r8.crm7.app | authenticated landing; a `rest/v1/` read | request **200**; no `401/403`; no auth-error card |

### Per-app assertions (concrete)
1. **Login completes** — the callback redirects to the app's authenticated landing route (NOT the auth-error card with "Authentication failed" / "[BS OAuth invariant violated]"). PASS = landing route renders with the user's identity (avatar/email) visible.
2. **Session bridged** — in DevTools Network filtered to `supabase.co`, the first RLS-gated `rest/v1/<table>` or `rpc/<fn>` request returns **HTTP 200** (NOT 401/403). For at least one request, the response body contains the user's data (≥1 row) OR a legitimate empty-state for a genuinely empty table — never a `401`/`{"code":"42501"}`/`{"message":"JWT ..."}`.
3. **Request carried a user JWT, not anon** — the request's `Authorization` header is a user token (the app is not silently anon). Verified indirectly: an RLS-gated table that anon cannot read returns rows (proves authenticated identity).

---

## Out of scope / explicitly not tested
- Deep per-role RBAC divergence (needs multiple seeded accounts; owner-only account here). Covered by CI unit/middleware tests.
- HS256-vs-JWKS verification internals, signing-key rotation, MCP token flows — not user-reachable via UI; doctrine-level only.
- Production URLs (only `d.*` per instruction).
- Native Google/Microsoft social login path (the BSU OAuth PKCE path is the suite SSO path under test).

## Recording
One continuous recording across all five apps, with `annotate_recording` per app (`test_start` = "It should bridge BSU OAuth into a Supabase session on d.<app>"; `assertion` = login-completed + RLS-read-200).
