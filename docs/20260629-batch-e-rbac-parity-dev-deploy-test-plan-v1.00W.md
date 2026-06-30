# Batch E — RBAC Parity (WC-008…012) Dev-Deploy Validation Test Plan

**Date:** 2026-06-29
**Environments (Vercel `development` deploys):** d.conduit.crm7.app (conduit @ `5f9480b`), d.crm.crm7.app (crm7 @ `ce450b7b`)
**Account:** braden.lang7…@gmail.com (BSU OAuth) — owner/admin-level.
**Auth path:** conduit/crm7 → `signInWithBusinessSuite()` → BSU `/auth/v1/oauth/authorize` consent → app `/auth/callback`.

## What changed (user-visible terms)
- **WC-012 (conduit):** route-level RBAC + OAuth subject resolution now read the canonical `user_tenants.portal_role` (and the rewritten `resolve_bs_oauth_subject_portal_role` RPC) instead of the legacy `role`. The team-settings role dropdown now shows each member's *actual* portal role (with a disabled `(current)` option for non-assignable roles) instead of defaulting the `<select>` to "Owner".
- **WC-011 (crm7):** `worker`/`viewer` added to the PortalRole union; new `/portal/worker` self-service route.
- **WC-010/009/008:** token rename `host_employer→host_contact`, privilege-predicate alignment, dead-branch migration — backend/consistency changes, not directly user-visible.

## Adversarial design note
The test account is owner-level, so legacy `role` and `portal_role` both resolve to `conduit_admin`; a plain login looks identical whether WC-012 is working or broken. Therefore the WC-012 deep divergence (a portal-only role becoming reachable) **cannot be manufactured through the UI with this single account** — it is covered by unit/middleware tests (907/907) and marked **untested at runtime** here, stated honestly rather than faked. The runtime tests below target the parts that *do* produce visibly different output if broken.

---

## Test 1 — Conduit login + settings reachable (WC-012 regression: RPC/middleware rewrite didn't break role resolution)
**Path:** d.conduit.crm7.app → "Sign in with BSuite" → consent → app.
- **1a** After callback, the app lands authenticated on a dashboard (e.g. `/candidates`), nav rail visible. **PASS:** authenticated shell renders, URL is not `/auth/login`. **FAIL:** stuck on login or error page.
- **1b** Navigate to `/settings`. **PASS:** Settings view renders the Team section (owner has `view_settings` → resolved via `portal_role`). **FAIL:** redirected to `/candidates?error=unauthorized` (would indicate the rewritten RPC/middleware failed to resolve the owner's portal_role — the exact regression risk of WC-012).

## Test 2 — Conduit team dropdown + load path
**Path:** `/settings` → Team section.
- **2a** Team tab loads without a `400`/`42703 undefined_column` toast. **PASS:** the section renders either a member list or the empty state with no red error banner. **FAIL:** the old "Failed to load team members" toast appears again.
- **2b** If members render, each member row is ordered by `joined_at` and the role `<select>` shows the member's actual portal role label (Owner/Admin/Manager/Staff/Viewer, or a `(current)` disabled option for host_contact/apprentice/field_officer/training_provider/worker). **If no members exist → mark the role-render portion `untested` and only verify the empty state.**

## Test 3 — crm7 login + portal routing intact (WC-010 host_contact rename + WC-008 migration regression)
**Path:** d.crm.crm7.app → BSU login → app.
- **3a** After callback, the authenticated app/dashboard or portal renders (no 500, no auth loop). **PASS:** authenticated shell renders. **FAIL:** error/blank/auth loop (would indicate the token rename or migration broke portal resolution).

## Test 4 — crm7 `/portal/worker` route exists (WC-011)
**Path:** navigate directly to d.crm.crm7.app/portal/worker (authenticated).
- **4a** **PASS:** the Worker/Apprentice Portal page renders (heading/self-service content from `worker-portal.tsx`), OR — if the tenant lacks the `portal_pages` feature flag — a feature-gate notice renders (still proves the route is *registered*, since a missing route would instead hit the app's not-found/redirect). **FAIL:** browser/app 404 / "page not found" / redirect to `/` as if the route does not exist. Record which of the two PASS sub-cases occurred.

---

## Out of scope / untested (stated explicitly)
- WC-012 portal-only-role reachability divergence at runtime (needs a user whose `role` ≠ `portal_role`; not creatable via UI with assignable-only dropdown). Covered by CI unit + middleware exhaustiveness tests (all 10 portal roles), 907/907 green.
- WC-008 migration effect (dead-branch removal) — no user-visible surface; verified by the SECURITY DEFINER guardrail CI check on crm7 #1091.
- WC-009 predicate alignment — internal; covered by roleMappingService tests.
