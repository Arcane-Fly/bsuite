# Cross-App Auth Validation — Dev-Deploy Test Report

**Date:** 2026-06-30
**Branch:** `development` → Vercel `d.*` deploys
**Account:** braden.lang77@gmail.com (BSU OAuth 2.1 PKCE)
**Reference doctrine:** `supabase-auth-comprehensive` SKILL v2.1.0 (OAuth 2.1 Server, PKCE, JWKS, RLS, session-bridge invariant)
**Session:** https://app.devin.ai/sessions/9132113f1a7f48f9961dc9188a1b98d1

---

## Single adversarial claim under test

> After BSU OAuth 2.1 PKCE login, each app's callback bridges the `bs_*` tokens into a **real Supabase session** (`setSession` + poll `getSession` until the token is observed). Therefore RLS-protected reads authenticate **as the user** → **HTTP 200 with the user's data**, not anon **401/403**, and no `[BS OAuth invariant violated]` error card.

This is the exact failure class behind the conduit team-load bug and the 2026-05-20 crm7 incident, so it is the sharpest possible probe of auth health.

**Method:** for each app I logged in (or confirmed a warm session), landed on the authenticated route, and inspected the Network panel for the first RLS-gated `*.supabase.co/rest/v1/*` (or `/rpc/*`) request. PASS = 200 + user data rendered; FAIL = 401/403, invariant error, or empty where rows should exist.

---

## Result summary — 5/5 PASS

| App | URL | Authenticated route | RLS read evidence | Result |
|-----|-----|---------------------|-------------------|--------|
| BSU (business-suite-unified) | d.suite.crm7.app | Suite dashboard (9 services) | `user_tenants` 200 (833 B), `profiles`/`tenant_settings`/`bi_metrics` 200 | **PASS** |
| crm7 | d.crm.crm7.app | Dashboard (35 contacts, $695K) | `branding_json_for_tenant` 200, `user_preferences`/`user_tenants` 200 | **PASS** |
| conduit | d.conduit.crm7.app | Settings → Team (2 members) | `user_tenants?select=...joined_at` 200 | **PASS** |
| Throughput | d.ideas.crm7.app | Ideas dashboard | `ideas?select=*&user_id=eq...` 200 | **PASS** |
| R80.3 | d.r8.crm7.app | R8 Calculator | `user_tenants` 200 (844 B), `profiles`/`branding` 200 | **PASS** |

**No `[BS OAuth invariant violated]` error card appeared on any app.** The only 401s observed were `branding_json_for_tenant` on the **public marketing pages before login** (crm7, r8, suite) — expected anon behaviour; they resolve to 200 after authentication.

---

## Evidence per app

### A1 — BSU (d.suite.crm7.app)
Logged in via the native BSU identity form (BSU is the OAuth authority). "Welcome back!" toast, full dashboard with 9 active services, Developer plan, user `braden.lang77`.

![BSU authenticated dashboard](https://app.devin.ai/attachments/0bcb96a9-e1ed-4f8f-b01c-c0405a725c20/ss_1602a06a.png)

RLS reads — `user_tenants` (833 B), `profiles`, `tenant_settings`, `platform_branding`, `tenant_app_branding`, `bi_metrics`, `app_notifications` all **200**:

![BSU rest/v1 reads 200](https://app.devin.ai/attachments/d924183a-97de-4987-bd5e-f033c2ed86ac/ss_zoom_70b897b5.png)

### A2 — crm7 (d.crm.crm7.app)
Session warm — landed straight on the authenticated dashboard rendering real RLS data (Total Contacts **35**, Monthly Revenue **$695K**, "Welcome back, Braden Lang"), tenant "bsuite Platform", user `braden.lang77`. Post-login `branding_json_for_tenant` is **200** (the earlier 401 was the anon marketing page).

![crm7 authenticated dashboard with real data](https://app.devin.ai/attachments/8968146f-c538-4e65-9300-bdd91d621f35/ss_02e7a107.png)

### A3 — conduit (d.conduit.crm7.app)
Settings → Team renders 2 members. The RLS read uses the WC-012 / #342 fix: `select=user_id,portal_role,status,joined_at&order=joined_at.asc` → **200 OK** (no 42703 `undefined_column`, no "Failed to load team members").

![conduit Team + user_tenants 200](https://app.devin.ai/attachments/b880cdf1-475f-49cc-82a4-73bae6e18c25/ss_4a8a80f5.png)

![conduit user_tenants joined_at 200 OK](https://app.devin.ai/attachments/b8343e7b-7be0-4c67-b62b-e8a9fa9b5728/ss_zoom_a070c8e9.png)

### A4 — Throughput (d.ideas.crm7.app)
Session warm — Ideas dashboard renders real ideas (Capture/Refine stages). RLS read `ideas?select=*&user_id=eq.ebdb7d74-...&order=created_at.desc` → **200 OK** (scoped to the user's own rows).

![Throughput ideas dashboard](https://app.devin.ai/attachments/4d35517b-d07f-4b83-8046-c37c909763f0/ss_260161ba.png)

![Throughput ideas read 200 OK](https://app.devin.ai/attachments/9a22b33a-1c8d-47f1-8f43-c92b2d0dacb3/ss_zoom_98e25719.png)

### A5 — R80.3 (d.r8.crm7.app)
Login bridged the session — R8 Calculator app renders, user `braden.lang77`. RLS reads `user_tenants` (844 B), `profiles`, `branding_json_for_tenant`, `tenant_branding`, `system_notices` all **200**.

![R8 authenticated calculator](https://app.devin.ai/attachments/87e5b735-6005-481f-9898-7191786cd41b/ss_3493b797.png)

![R8 rest/v1 reads 200](https://app.devin.ai/attachments/4fb65369-f571-4b86-adb0-ffbd2dbb5d69/ss_zoom_47d525aa.png)

---

## Observations / honest caveats

- **Per-domain storage confirmed by behaviour:** crm7, r8 and suite each presented their own public marketing/login page (not an instant SSO bypass) — consistent with the per-domain Supabase storage doctrine (no shared `domain=.crm7.app` cookie). conduit and Throughput were warm from earlier in the session.
- **Anon 401s are expected, not failures:** `branding_json_for_tenant` returns 401 for the anon role on public pages and 200 after login. This is correct RLS behaviour, not a regression.
- **Scope:** this validates the runtime auth/session-bridge + RLS read path (the world-class auth claim). It does not re-test the WC-012 *portal-only-role divergence* (needs a user whose legacy `role` ≠ `portal_role`; not creatable via UI with one owner account — covered by CI 907/907).
- **No code changes made** — validation only. No merge to main/master.
