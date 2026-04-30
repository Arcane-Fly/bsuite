# Operator Handoff v3.00W — Post-Verification (3 Real Items)

**Status:** W (Working)
**Last updated:** 2026-04-28 (WS-β verification sweep)
**Supersedes:** `docs/20260425-operator-handoff-v1.00W.md` (kept for git history)
**Audience:** Braden — operator with credentials for Supabase dashboard, Microsoft Entra portal, Supabase CLI.

This doc supersedes v1.00W after WS-β ran independent verification on every item the operator had reported (or had been carried as) complete. Verification used Supabase MCP `execute_sql` + `list_extensions` + `list_migrations` + `list_edge_functions` + `get_edge_function`, plus the Supabase Management API for project secrets and auth config, plus the public JWKS endpoint. Evidence files in `docs/20260428-operator-verification/`.

The original v1.00W carried 7 items. After verification:
- **4 of 7 are confirmed complete** (one reverted from "operator action required" to "done"), and have moved to the Already-Verified appendix.
- **3 items remain genuinely operator-only** and are detailed below.
- **1 item (Xero OAuth) is now confirmed done** — `XERO_CLIENT_ID/SECRET/REDIRECT_URI` were set in Supabase secrets at some point between 2026-04-27 and 2026-04-28.

---

## Quick reference — 3 remaining operator items

| # | Item | Where | Time | Blocking? |
|---|---|---|---|---|
| 1 | Set `OAUTH_STATE_SECRET` + redeploy 2 edge fns from current `main` | Supabase CLI (preferred) | 5 min | OAuth state forgery hardening |
| 2 | Add 2 TGA GUCs (`app.tga_sync_url`, `app.tga_sync_secret`) | Supabase dashboard | 10 min | Blocks Item 3 |
| 3 | Flip `TGA_SYNC_ENABLED=true` after sandbox dry-run | Supabase branch + CLI | 30 min | Blocks TGA cron job |
| 4 | Confirm `xms_edov` Azure optional claim is enabled | Microsoft Graph CLI (one curl) | 2 min | Per-call evidence; not currently consumed by deployed code |

**Total:** ~50 minutes of active operator time.

**Suggested order:** 4 (single curl) → 1 → 2 → 3. Item 3 needs Item 2 done first. Item 4 is the smallest and produces a binary yes/no.

---

## Item 1 — Set `OAUTH_STATE_SECRET` + redeploy 2 edge fns

**What:** Generate a 32-byte secret. Set it as a Supabase project-level edge function secret. Redeploy `oauth-google-email` and `oauth-microsoft-email` from the current `main` branch (which has the Phase 6.4 HMAC-state code — local source has it, deployed v26 from 2026-04-22 does NOT).

**Why you (not the agent):** Two reasons:
1. Supabase edge function env vars are platform-config, not Postgres rows. The MCP `execute_sql` tool can't reach them. Setting requires the Supabase CLI (interactive `supabase login`) or the dashboard.
2. WS-β verified 2026-04-28 that the deployed function code is older than local source. The agent could in principle re-deploy, but the WS-β coordination contract says agent does NOT modify auth code or auth-deploy without operator-in-the-loop.

### How — CLI path (preferred)

```bash
supabase login                                        # one-time browser flow

supabase secrets set OAUTH_STATE_SECRET=$(openssl rand -hex 32) \
  --project-ref tuybltdrdefjblnplpqo

cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
supabase functions deploy oauth-google-email --project-ref tuybltdrdefjblnplpqo
supabase functions deploy oauth-microsoft-email --project-ref tuybltdrdefjblnplpqo
```

### Verify

```bash
# 1. Secret is now in the project
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.[].name' | grep -c '^OAUTH_STATE_SECRET$'
# Expected: 1

# 2. Edge fn ezbr_sha256 changed (means new deploy actually shipped)
# Pre-fix v26 hashes:
#   oauth-google-email   974c55d9e853c5116ca2704d4d64794908b28b817198f8dbb2082f27817eb082
#   oauth-microsoft-email b9bd727be573596fb64cc05f7a3b341a157c7464c9f404ee1fe76d5e56e9930c
# After deploy these MUST change.

# 3. Function logs show no "OAUTH_STATE_SECRET is not configured" errors
# (raised by _shared/oauth-state.ts:48-52 on first invocation)
```

### Bonus — secret-name mismatch surfaced during verification

Deployed v26 reads `MICROSOFT_CLIENT_ID` and `GOOGLE_EMAIL_CLIENT_ID`/`GOOGLE_EMAIL_CLIENT_SECRET`. Supabase has `AZURE_CLIENT_ID` and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` instead. If you've been using Microsoft / Google email OAuth flows successfully recently, ignore this. If not, add aliases:

```bash
# Get the existing values from the dashboard (Management API redacts them)
# then re-set under the names the deployed code expects:
supabase secrets set MICROSOFT_CLIENT_ID=<value-of-AZURE_CLIENT_ID> --project-ref tuybltdrdefjblnplpqo
supabase secrets set MICROSOFT_CLIENT_SECRET=<value-of-AZURE_CLIENT_SECRET> --project-ref tuybltdrdefjblnplpqo
supabase secrets set GOOGLE_EMAIL_CLIENT_ID=<value-of-GOOGLE_CLIENT_ID> --project-ref tuybltdrdefjblnplpqo
supabase secrets set GOOGLE_EMAIL_CLIENT_SECRET=<value-of-GOOGLE_CLIENT_SECRET> --project-ref tuybltdrdefjblnplpqo
```

(See `docs/20260428-operator-verification/03-oauth-state-secret.md` §"Bonus secret-name discrepancy" for full context.)

---

## Item 2 — Add 2 TGA GUCs

**What:** Add two custom Postgres GUCs scoped to the database — `app.tga_sync_url` and `app.tga_sync_secret`. The pg_cron job that drives TGA syncing is gated on these being non-NULL.

**Why you (not the agent):** Hosted Supabase doesn't grant the connecting `postgres` role privileges to `ALTER DATABASE ... SET app.*`. WS-β verified 2026-04-28: `current_setting('app.tga_sync_url', true)` returns NULL. Either dashboard "Custom Postgres Config" panel or a Supabase support ticket.

### How

1. https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/database/custom-config
2. **Add custom variable** — name `app.tga_sync_url` — value `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/tga-sync` → Add.
3. **Add custom variable** — name `app.tga_sync_secret` — value `openssl rand -hex 32` output → Add. **Save this same value to your password store** — you'll need it again in Item 3.
4. Save. Postgres pool restarts (~30s).

If the dashboard rejects (`variable not in allowed list`), open a Supabase support ticket: subject *"Need ALTER DATABASE SET privilege for `app.*` GUCs (project tuybltdrdefjblnplpqo)"*.

### Verify

```sql
-- via Supabase SQL Editor or psql
SELECT
  current_setting('app.tga_sync_url', true)    AS tga_url,
  (current_setting('app.tga_sync_secret', true) IS NOT NULL
   AND current_setting('app.tga_sync_secret', true) != '') AS tga_secret_set;
-- Expected: tga_url = function URL; tga_secret_set = true
```

---

## Item 3 — Flip `TGA_SYNC_ENABLED=true` (after sandbox dry-run)

**What:** Turn on the production TGA sync cron job after proving it doesn't corrupt existing `units_of_competency` data on a sandbox branch.

**Why you (not the agent):** Requires manual sandbox dry-run with non-prod data. Agent can't pick safe test payloads or judge "did this disturb existing rows" without operator inspection. Also, this is dependent on Item 2 (the cron-registration migration is gated on the GUCs).

WS-β verified 2026-04-28: `cron.job` has 2 active jobs (apprentice rate review, report-delivery hourly) — **neither is `tga-sync`**. The `tga_sync_runs` table has exactly one row, a `triggered_by: seed` placeholder from 2026-04-22 with all `records_*: 0`.

### How

1. Complete Item 2 first.
2. Re-apply the gate migration (so it re-evaluates GUC presence and registers the cron):
   ```bash
   supabase db push --project-ref tuybltdrdefjblnplpqo
   ```
3. https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/branches → **Create branch** → name `tga-dryrun-20260428`.
4. Manually invoke the `tga-sync` function on the branch with a tiny payload (1–3 qualification codes).
5. Inspect `units_of_competency` rows on the branch. Confirm only your test rows landed; existing data untouched.
6. If safe, flip production:
   ```bash
   supabase secrets set TGA_SYNC_ENABLED=true --project-ref tuybltdrdefjblnplpqo
   supabase secrets set TGA_SYNC_SECRET=<value-from-Item-2-step-3> --project-ref tuybltdrdefjblnplpqo
   supabase functions deploy tga-sync --project-ref tuybltdrdefjblnplpqo
   ```
7. Delete the dry-run branch.

### Verify

```sql
-- Most recent tga_sync_runs row should have non-seed trigger and non-zero records
SELECT id, started_at, completed_at, status,
       records_fetched, records_inserted, records_updated, triggered_by
FROM public.tga_sync_runs
ORDER BY started_at DESC
LIMIT 3;
-- Expected: at least one row with triggered_by != 'seed' and records_fetched > 0

-- And the cron job must exist
SELECT jobid, schedule, jobname, active FROM cron.job WHERE jobname = 'tga-sync';
-- Expected: 1 row, active = true
```

---

## Item 4 — Confirm Azure `xms_edov` optional claim

**What:** Confirm via Microsoft Graph that the BSU Microsoft App Registration's ID-token optional claims include `xms_edov`. Operator reported done previously; WS-β could not verify from agent tooling.

**Why you (not the agent):** Microsoft Graph requires interactive `az login` or service-principal credentials we don't carry in this MCP set.

### How

```bash
# 1. Get a Microsoft Graph token (one-time, interactive)
az login
MS_GRAPH_TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken -o tsv)

# 2. Pull the BSU app's GUID (value of AZURE_CLIENT_ID in Supabase secrets)
APP_ID=<paste-uuid-from-1Password-or-Supabase-dashboard>

# 3. Read optionalClaims for ID tokens
curl -s "https://graph.microsoft.com/v1.0/applications/${APP_ID}/optionalClaims" \
  -H "Authorization: Bearer ${MS_GRAPH_TOKEN}" \
  | jq '.idToken'
```

### Verify

Expected: array contains an entry with `"name": "xms_edov"`. Any other shape means the claim was never added or was reverted.

If absent: https://entra.microsoft.com → Identity → Applications → App registrations → select app → Token configuration → Add optional claim → ID → tick `xms_edov` → Add → grant Microsoft Graph `email` permission (admin consent).

### Caveat — Item 4 is currently unconsumed

WS-β found that deployed `oauth-microsoft-email` v26 still uses the OLD `btoa(JSON.stringify(...))` state pattern and never inspects `id_token` claims. Even if `xms_edov` is enabled today, no production code consumes it. The claim becomes useful AFTER Item 1 (redeploy from current `main` to pick up Phase 6.4 HMAC code, which includes the id_token-claim inspector path).

So: Item 4 is a configuration prerequisite for the next deploy, not a present-day fix. Verifying it's done now means Item 1's deploy doesn't block on it.

---

## Already verified (audit trail)

These items appeared in v1.00W's "operator action required" or "already resolved" sections. WS-β re-verified them on 2026-04-28 and they are confirmed.

| v1.00W # | Item | Verification | Evidence |
|---|---|---|---|
| (Already-Resolved §2) | 3 W1-C migrations applied | `list_migrations` shows `phase12_tenant_hierarchy_hardening` (20260425100032), `phase12_hierarchy_rls` (20260425100051), `phase6_11_seed_enterprise_subscriptions` (20260425100056) | [docs/20260428-operator-verification/08-w1c-migrations.md](20260428-operator-verification/08-w1c-migrations.md) |
| (Already-Resolved §3a) | `pg_cron@1.6.4` + `pg_net@0.19.5` extensions installed | `pg_extension` join confirmed both present | [docs/20260428-operator-verification/07-pg-cron-pg-net.md](20260428-operator-verification/07-pg-cron-pg-net.md) |
| 5 (Item 5) | `*.vercel.app` wildcard redirect URIs removed | Management API `uri_allow_list` shows 7 explicit entries, zero wildcards | [docs/20260428-operator-verification/02-vercel-wildcard-redirect.md](20260428-operator-verification/02-vercel-wildcard-redirect.md) |
| 6 (Item 6) | HS256 Previous JWK revoked | JWKS endpoint shows 2 ES256/EC keys, zero HS256 | [docs/20260428-operator-verification/06-hs256-jwk-revoked.md](20260428-operator-verification/06-hs256-jwk-revoked.md) |
| 7 (Item 7) | Xero OAuth app registered (Part O.2) | `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI` all present in Supabase secrets | (no separate evidence file — surfaced as bonus during secrets enumeration) |
| (Already-Resolved §4) | "Automatically delete head branches" disabled across 8 BSuite repos | `gh api /repos/.../<repo> --jq '.delete_branch_on_merge'` returns `false` everywhere | (verified WS-G, 2026-04-25 — not re-checked in WS-β) |
| (Already-Resolved §new1) | `set_payroll_super_due_date` SECURITY DEFINER hardened | Migration `20260427000000_security_definer_hardening` present in `list_migrations` (applied) | (cross-checked in [docs/20260428-operator-verification/08-w1c-migrations.md](20260428-operator-verification/08-w1c-migrations.md) §"Most recent migration") |
| (Already-Resolved §new2) | Branch protection enforced on all 14 refs | Verified WS-G + 0427 PR #280 | (not re-checked in WS-β) |

---

## Cross-reference

- **WS-β verification evidence dir:** [`docs/20260428-operator-verification/`](20260428-operator-verification/) — 8 evidence files + README
- **v1.00W handoff (kept for history):** [`docs/20260425-operator-handoff-v1.00W.md`](20260425-operator-handoff-v1.00W.md)
- **Memory key listing reality:** `bsuite_pending_actions` (rewritten 2026-04-28 by WS-β)
- **Per-item verified-complete memory keys:**
  - `bsuite_vercel_wildcard_redirects_removed_verified`
  - `bsuite_hs256_jwk_revoked_verified`
  - `bsuite_pg_cron_pg_net_verified`
  - `bsuite_w1c_migrations_verified`
- **Per-item verified-incomplete memory keys:**
  - `bsuite_oauth_state_secret_verified_incomplete`
  - `bsuite_tga_gucs_verified_incomplete`
  - `bsuite_tga_sync_enabled_verified_incomplete`

---

**Author:** Claude Opus 4.7 (1M context). v3.00W = post-WS-β verification, supersedes v1.00W.
