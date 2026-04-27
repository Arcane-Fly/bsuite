# Codex Operator Handoff v4.00W

Status: Working  
Date: 2026-04-28  
Supersedes: `docs/20260428-operator-handoff-v3.00W.md`

## Summary

Codex re-ran the Phase 0 verification sweep on 2026-04-27 UTC.

The `OAUTH_STATE_SECRET` item from v3 is now verified complete: the secret exists and both email OAuth edge functions are active on version 28. The remaining operator-only items are the TGA Postgres custom config, the TGA production enablement after a dry-run, and Microsoft Graph confirmation for the Azure `xms_edov` optional claim.

Evidence file: `/tmp/bsuite_claim_verification_20260427_preflight.json`

## Current Operator Items

| # | Item | Status | Why Codex Cannot Finish It Directly |
| --- | --- | --- | --- |
| 1 | Add `app.tga_sync_url` and `app.tga_sync_secret` Postgres custom config | Verified incomplete | Hosted Supabase does not expose `ALTER DATABASE ... SET app.*` privilege through the current SQL connection. |
| 2 | Enable production TGA sync after a sandbox dry-run | Blocked by Item 1 and operator data inspection | Requires safe branch dry-run review before touching live TGA reference data. |
| 3 | Confirm Azure `xms_edov` optional claim | Unverified from current shell | Requires Microsoft Graph token from an interactive Microsoft tenant admin login. |
| 4 | Ratify Supabase Auth allow-list doctrine conflict | Needs owner confirmation before live auth-config change | `AGENTS.md` says client `/auth/callback` URIs must remain; current operator verification says GoTrue allow-list correctly excludes them because BS OAuth clients use the OAuth registry. |

## Item 1: TGA Postgres Custom Config

Exact dashboard path:

`https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/database/custom-config`

Exact action:

1. Add custom variable `app.tga_sync_url`.
2. Set value to `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/tga-sync`.
3. Add custom variable `app.tga_sync_secret`.
4. Set value to a new high-entropy secret, for example `openssl rand -hex 32`.
5. Save the same value in the password store because Item 2 must set it as `TGA_SYNC_TRIGGER_SECRET`.

Pre-action snapshot Codex ran:

```sql
select
  (current_setting('app.tga_sync_url', true) is not null and current_setting('app.tga_sync_url', true) <> '') as has_url,
  (current_setting('app.tga_sync_secret', true) is not null and current_setting('app.tga_sync_secret', true) <> '') as has_secret;
```

Result: `false,false`.

Post-action verification command:

```sql
select
  current_setting('app.tga_sync_url', true) as tga_url,
  (
    current_setting('app.tga_sync_secret', true) is not null
    and current_setting('app.tga_sync_secret', true) <> ''
  ) as tga_secret_set;
```

Expected result: `tga_url` equals the function URL and `tga_secret_set` is `true`.

Rollback:

Remove both custom variables from the same Supabase dashboard page. If the dashboard cannot remove them, ask Supabase support to run:

```sql
alter database postgres reset app.tga_sync_url;
alter database postgres reset app.tga_sync_secret;
```

## Item 2: Enable Production TGA Sync

Exact dashboard path:

`https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/functions/tga-sync`

Exact action:

1. Complete Item 1 first.
2. Create a Supabase branch named `tga-dryrun-20260428`.
3. Invoke `tga-sync` on the branch with a tiny known-safe payload.
4. Inspect `units_of_competency` and `qualifications`; confirm only expected rows changed.
5. If the branch inspection is safe, set production edge secrets:

```bash
supabase secrets set TGA_SYNC_ENABLED=true --project-ref tuybltdrdefjblnplpqo
supabase secrets set TGA_SYNC_TRIGGER_SECRET=<same-value-as-app.tga_sync_secret> --project-ref tuybltdrdefjblnplpqo
supabase functions deploy tga-sync --project-ref tuybltdrdefjblnplpqo
```

Pre-action snapshot Codex ran:

```sql
select coalesce(string_agg(jobname || ':' || active::text, ',' order by jobname), '')
from cron.job
where jobname ilike '%tga%';

select status, triggered_by, records_fetched
from public.tga_sync_runs
order by started_at desc
limit 3;
```

Result: no TGA cron job; latest run is `partial:seed:0`.

Post-action verification command:

```sql
select jobid, schedule, jobname, active
from cron.job
where jobname = 'tga-sync-daily';

select id, started_at, completed_at, status,
       records_fetched, records_inserted, records_updated, triggered_by
from public.tga_sync_runs
order by started_at desc
limit 3;
```

Expected result: one active `tga-sync-daily` cron job and a non-seed run with `records_fetched > 0`.

Rollback:

```bash
supabase secrets unset TGA_SYNC_ENABLED --project-ref tuybltdrdefjblnplpqo
supabase secrets unset TGA_SYNC_TRIGGER_SECRET --project-ref tuybltdrdefjblnplpqo
supabase functions deploy tga-sync --project-ref tuybltdrdefjblnplpqo
```

Then disable the cron job:

```sql
select cron.unschedule('tga-sync-daily');
```

## Item 3: Azure `xms_edov` Optional Claim

Exact dashboard path:

`https://entra.microsoft.com` -> Identity -> Applications -> App registrations -> BSuite Microsoft app -> Token configuration.

Exact action:

1. Confirm ID-token optional claims include `xms_edov`.
2. If absent, add optional claim -> ID -> `xms_edov` -> Add.
3. Grant the required admin consent when Microsoft prompts.

Pre-action snapshot Codex ran:

- `az` is not installed in the current shell.
- No Microsoft Graph token is available in the current shell.
- Source code does contain the fail-closed consumer path in `business-suite-unified/src/lib/azureEmailVerification.ts`.

Post-action verification command:

```bash
az login
MS_GRAPH_TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken -o tsv)

APP_ID=<AZURE_CLIENT_ID>

curl -s "https://graph.microsoft.com/v1.0/applications/${APP_ID}/optionalClaims" \
  -H "Authorization: Bearer ${MS_GRAPH_TOKEN}" \
  | jq '.idToken'
```

Expected result: the ID-token claims array contains an object with `"name": "xms_edov"`.

Rollback:

Return to the same Token configuration page and remove the `xms_edov` optional claim. This weakens the Microsoft email verification path and should only be used if the claim breaks Microsoft sign-in.

## Item 4: Supabase Auth Allow-List Doctrine Conflict

Exact dashboard path:

`https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/auth/url-configuration`

Exact action:

Choose one doctrine and keep the docs consistent:

- Keep current GoTrue-only allow-list: no CRM7/R80/Throughput/Conduit `/auth/callback` entries in Supabase Auth allow-list; BS OAuth client callback URIs live only in the BS OAuth registry.
- Or restore the callback URIs listed in `AGENTS.md`.

Pre-action snapshot Codex ran:

Management API `GET /v1/projects/tuybltdrdefjblnplpqo/config/auth` returned these allow-list entries:

```text
http://localhost:*/**
https://crm.crm7.app/oauth/consent
https://ideas.crm7.app/oauth/consent
https://r8.crm7.app/oauth/consent
https://suite.crm7.app/auth/callback
https://suite.crm7.app/oauth/consent
https://www.braden.com.au/auth/callback
```

It returned zero `*.vercel.app/auth/callback` wildcard entries.

Post-action verification command:

```bash
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  | jq -r '.uri_allow_list'
```

Expected result depends on the doctrine ratified above. If the GoTrue-only doctrine wins, the current list is acceptable and `AGENTS.md` must be corrected. If the `AGENTS.md` list wins, the missing exact callback URIs must be added without reintroducing wildcard callback entries.

Rollback:

Restore the previous allow-list shown in the pre-action snapshot.

## Verified Complete In This Sweep

| Item | Evidence |
| --- | --- |
| `OAUTH_STATE_SECRET` | Supabase secrets list shows present, updated `2026-04-27T03:50:06.122Z`. |
| `oauth-google-email` redeploy | Supabase functions list shows active version 28, updated `2026-04-27T03:55:58.340Z`. |
| `oauth-microsoft-email` redeploy | Supabase functions list shows active version 28, updated `2026-04-27T03:54:04.773Z`. |
| W1-C migrations | `phase12_tenant_hierarchy_hardening`, `phase12_hierarchy_rls`, and `phase6_11_seed_enterprise_subscriptions` are present in `supabase_migrations.schema_migrations`. |
| `pg_cron` and `pg_net` | `pg_extension` returns both `pg_cron` and `pg_net`. |
| Wildcard redirect URI cleanup | Supabase Management API auth config returns zero `*.vercel.app/auth/callback` entries. |
| Current JWKS has no HS256 | Public JWKS returns two `ES256` keys and zero `HS256` keys. |
| Xero env/secrets presence | CRM7 Vercel has `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, and `XERO_REDIRECT_URI`; Supabase secrets also contain the Xero trio. This does not by itself prove Xero developer-portal registration or token-exchange smoke. |
| Delete-branch-on-merge | GitHub API returns `delete_branch_on_merge: false` across the seven repos checked. |
| Branch protection | GitHub API verifies `main` and `development` protection across all seven repos: admins enforced, force-push disabled, PR reviews configured. |
| Security-definer hardening | `is_team_admin` and `set_payroll_super_due_date` are security-definer functions with explicit `search_path` config. |

## Notes For Next Verification

- The ledger's old `TGA_SYNC_SECRET` wording is stale for the edge function. Current `crm7/supabase/functions/tga-sync/index.ts` expects `TGA_SYNC_TRIGGER_SECRET`.
- The ledger's old `VITE_XERO_CLIENT_ID` check is stale for CRM7. Current Vercel env uses server-side `XERO_CLIENT_ID`.
- Public JWKS verifies current signing keys, not Supabase's internal previous-key slot. The Management API endpoints tried for JWT-key config returned 404, so deeper previous-slot verification still needs a Supabase-supported API or dashboard evidence.
- Phase 0 evidence was tightened after red-team review. Updated evidence file: `/tmp/bsuite_claim_verification_20260427_preflight_v2.json`.
