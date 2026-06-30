# Batch E — Conduit Team `joined_at` Fix — Dev-Deploy Validation Report

**Date:** 2026-06-30
**Environment:** `d.conduit.crm7.app` (Vercel `development`), merge commit `14b616ac` (PR #342, verified → READY)
**Account:** braden.lang77@gmail.com (BSU OAuth, owner-level)
**How tested:** Logged in via BSU OAuth, opened Settings → Team, compared the stale pre-deploy bundle (still requesting `created_at`) against the deployed fix (requesting `joined_at`), inspecting the live `user_tenants` PostgREST request in the Network panel.

---

## Escalations

- None blocking. The fix is verified live.
- Both rendered members show role **Owner** because this tenant only has owner-level members — so the WC-012 *per-member divergence* failure mode (a non-owner erroneously showing "Owner") **cannot be adversarially exercised** with this data. Stated honestly; covered by CI unit/middleware tests (907/907), not by this runtime check.

---

## Results

- **PASS — Team tab loads without 42703 (the PR fix).** After the deployed fix, the `user_tenants` request uses `select=...joined_at` & `order=joined_at.asc` and returns **200 OK**; the Team section renders **2 members** with no "Failed to load team members" toast.
- **PASS — regression: login + `/settings` reachable** (owner `portal_role` resolves; authenticated shell renders).
- **PASS (data-limited) — per-member role dropdowns render** with actual labels (both Owner here, consistent with an owner-only tenant).
- **Previously validated (prior Batch E run, unaffected by this PR):** crm7 login/portal routing (WC-010/008), crm7 `/portal/worker` route (WC-011), conduit invite-role dropdown 5th option = Viewer (WC-010/011).

---

## Evidence

### Before (🔴) vs After (🟢) — the `user_tenants` request

| 🔴 BUG — stale pre-deploy bundle | 🟢 FIX — deployed `14b616ac` |
|---|---|
| ![BUG: created_at -> 400](https://app.devin.ai/attachments/30f7e2b5-d776-41d0-a303-e4252c000b20/ss_zoom_b0dc1e8c.png) | ![FIX: joined_at -> 200](https://app.devin.ai/attachments/c76c17c4-7c13-43b0-9ff0-6f4c09f17514/ss_zoom_aae56e53.png) |
| `select=...created_at`, `order=created_at.asc` → **400 Bad Request** (PostgREST `42703`) | `select=...joined_at`, `order=joined_at.asc` → **200 OK** |

### Before (🔴) vs After (🟢) — the Team tab UI

| 🔴 BUG — 0 members / error | 🟢 FIX — 2 members render |
|---|---|
| ![BUG: 0 members](https://app.devin.ai/attachments/7512da52-c438-49e2-9dee-b5f98003bb9d/ss_b89ed716.png) | ![FIX: 2 members](https://app.devin.ai/attachments/55f8e76d-c1dc-476c-aa85-37687b4b5ea2/ss_94c612ec.png) |
| "No team members found" — the 42703 query failed | Braden Lang + Unnamed User, each with a role `<select>` |

### Recording

![Team joined_at fix recording](https://app.devin.ai/attachments/40786b4c-0036-4ab9-b779-c5b72e6d5a6f/rec-team-joined-at.webp)

---

## Out of scope / untested (stated explicitly)

- WC-012 portal-only-role reachability divergence at runtime (needs a user whose `role` ≠ `portal_role`; not creatable via UI with assignable-only dropdown). Covered by CI unit + middleware exhaustiveness tests (all 10 portal roles), 907/907 green.
- WC-008 migration effect — no user-visible surface; verified by the SECURITY DEFINER guardrail CI check on crm7 #1091.
- WC-009 predicate alignment — internal; covered by roleMappingService tests.
