# Operator Handoff v4.00W — All Items Closed

**Status:** W (Working — closes-out the v3.00W remaining list)
**Date:** 2026-04-28
**Supersedes:** `docs/20260428-operator-handoff-v3.00W.md`
**Audience:** Braden + future-session continuity

This handoff records that all 4 outstanding items from v3.00W are now complete, plus 3 additional branding bugs that surfaced once Microsoft sign-in started working were also fixed in the same session. **Nothing remains operator-only.**

---

## v3.00W → v4.00W transition table

| Item | v3.00W status | v4.00W status | Evidence |
|---|---|---|---|
| 1. `OAUTH_STATE_SECRET` set + 2 edge fns redeployed | 🟡 operator | ✅ done | Secret set via `supabase secrets set`; `oauth-google-email` v30 (ezbr_sha256 `5a39fd69…`) + `oauth-microsoft-email` v30 (ezbr_sha256 `fe135c7a…`); both deployed from current main with HMAC-state code |
| 2. TGA GUCs (`app.tga_sync_url`, `app.tga_sync_secret`) | 🟡 operator | ✅ done — switched to Vault | Hosted Supabase blocks `app.*` GUCs at the Management API. Swapped to **Supabase Vault** (canonical Supabase pattern per `docs/guides/functions/schedule-functions`). Two `vault.create_secret()` entries (`tga_sync_url`, `tga_sync_secret`); pg_cron migration `phase3_pg_cron_vault_replaces_guc` reads from `vault.decrypted_secrets`. |
| 3. `TGA_SYNC_ENABLED=true` flip | 🟡 operator | ✅ done | Set via `supabase secrets set TGA_SYNC_ENABLED=true`. Cron schedule `tga-sync-daily` registered, active, fires `15 17 * * *` UTC. End-to-end dry-run returned 200 OK from edge fn. Cron timeout extended to 5 min (was 2s default) via `phase3_pg_cron_tga_sync_timeout_5min` migration. |
| 4. `xms_edov` Azure optional claim | 🟡 operator | ✅ done | Added to both `idToken` and `accessToken` `optionalClaims` in App Registration manifest via Microsoft Graph API. Verified working: post-fix Microsoft sign-in produces `auth.identities.identity_data.email_verified = true` (the way GoTrue consumes `xms_edov` is to derive standard OIDC `email_verified` — original claim is consumed not preserved). |

---

## Three additional bugs surfaced + fixed (post-OAuth sign-in)

Once Microsoft sign-in worked again, three pre-existing branding bugs became visible that had been masked by the broken auth flow.

### Bug 1 — `Logo.tsx` rendering oversized

**Surface:** dashboard top-left logo rendered at intrinsic SVG viewBox (huge) instead of the 120×30 / 32×32 slot dimensions.

**Root cause:** Tailwind v4 preflight injects `img { max-width: 100%; height: auto; }` which overrides HTML `width`/`height` attributes. `Logo.tsx` had attrs but no inline `style`. Compare `BSULogo.tsx:56-59` which has both — works correctly.

**Fix:** PR `business-suite-unified#215` adds `style={{ width: dims.width, height: dims.height }}` to both `<img>` sites in `Logo.tsx` (favicon + main).

### Bug 2 — `platform_branding` 403 for authenticated readers

**Surface:** `useBranding.ts:303` query returned 403 even for signed-in users.

**Root cause:** `platform_branding` table had RLS policies for INSERT, UPDATE, DELETE — but **no SELECT policy**. RLS-enabled table without a SELECT policy = no reads. Compounded by missing table-level GRANT (Postgres needs both layers: GRANT + RLS).

**Fix:** Two production migrations applied:
- `20260428010027_fix_branding_select_policy_and_multi_tenant_rpc.sql` — adds SELECT policy to authenticated
- `20260428010108_grant_platform_branding_select_to_authenticated.sql` — adds the table-level GRANT (and grants the public view to authenticated + anon for SSR/marketing)

Both codified to source via PR `business-suite-unified#215`.

Per `business-suite-unified/CLAUDE.md` SEC-006, `platform_branding` is considered non-sensitive defaults — exposing to authenticated users matches existing security posture.

### Bug 3 — `branding_json_for_tenant()` RPC 500 for multi-tenant users

**Surface:** RPC returned 500 for users with multiple active tenants (e.g. operator with 2 owner tenants).

**Root cause:** `auth_tenant_id()` is a `SETOF uuid` function. Statement `v_tenant_id := auth_tenant_id();` triggers SQLSTATE `21000` (`cardinality_violation`: "query returned more than one row") for multi-tenant users. The surrounding `EXCEPTION WHEN undefined_function` catches only the named exception, so 21000 propagates as 500. Discovered as part of the fix: the fallback path also referenced `user_tenants.created_at` which doesn't exist (actual column is `joined_at`) — both bugs fixed in sequence.

**Fix:** Two production migrations applied:
- `20260428010027_fix_branding_select_policy_and_multi_tenant_rpc.sql` — replaces SETOF assignment with deterministic `SELECT … LIMIT 1` (also addresses Bug 2)
- `20260428010146_fix_branding_rpc_use_correct_joined_at_column.sql` — corrects `created_at` → `joined_at`

Both codified to source via PR `business-suite-unified#215`.

---

## Codified migrations PRs

| Repo | PR | What's in it |
|---|---|---|
| `business-suite-unified` | #215 | `Logo.tsx` inline style fix + 3 branding migration source files (already applied to prod) |
| `crm7` | #328 | 2 TGA cron migration source files (already applied to prod) — `phase3_pg_cron_vault_replaces_guc` + `phase3_pg_cron_tga_sync_timeout_5min` |

Both PRs are source-codification only — no prod state change. The migrations were applied directly via Supabase Management API (`apply_migration` MCP) during diagnosis; these PRs ensure the source repos match the live `supabase_migrations.schema_migrations` history so a future `supabase db reset` or full-replay reproduces current state.

---

## Microsoft Entra cleanup (also done this session)

| Setting | Before | After |
|---|---|---|
| Live SDK support | Enabled | **Disabled** (was forcing v1.0 token endpoint, mismatching v2.0 JWKS GoTrue uses) |
| SAML ACS redirect URI | `…/auth/v1/sso/saml/acs` registered as default | **Deleted** (was a residual from a prior agent session that tried to set up Supabase SAML SSO; not needed for OIDC social login) |
| `xms_edov` in `accessToken` optional claims | absent | added (was already in `idToken`) |

These three changes resolved the `failed to verify id token signature` error in Supabase Auth logs that was breaking Microsoft sign-in. The Live SDK toggle was the load-bearing one.

---

## What's still operator-only

**Nothing.**

`bsuite_pending_actions` memory key updated to reflect this. Future operator action only required if there's a NEW issue.

---

## Suggested next-session pickup

Per `docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md` — Codex Phase 2 (`@bsuite/page-builder` extraction, schema-registry consumer alignment, theme 0.3.3 platform-logo helpers, dry-lint warn→error promotion, charge-calc/nav workspace-pin elimination). Foundation (Phases 0+1+ε) is solid; broader ledger work picks up there.
