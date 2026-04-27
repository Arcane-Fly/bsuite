# Item 4 — TGA GUCs (`app.tga_sync_url` + `app.tga_sync_secret`)

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ❌ **VERIFIED INCOMPLETE**

## Operator claim history

Item appeared on the original 10-item checklist (2026-04-23). Carried forward as Item 2 in v1.00W handoff. Operator has not yet reported it complete.

## Verification command

```sql
SELECT
  current_setting('app.tga_sync_url', true)    AS tga_url,
  (current_setting('app.tga_sync_secret', true) IS NOT NULL
   AND current_setting('app.tga_sync_secret', true) != '') AS tga_secret_set;
```

Run via `mcp__claude_ai_Supabase__execute_sql(project_id="tuybltdrdefjblnplpqo")`.

## Evidence (captured 2026-04-28)

```json
[{"tga_url": null, "tga_secret_set": false}]
```

Both GUCs are unset. The `current_setting(..., true)` call returns NULL when the GUC isn't defined (the trailing `true` arg suppresses the "unrecognized configuration parameter" error).

## Outcome

❌ **VERIFIED INCOMPLETE.** Both `app.tga_sync_url` and `app.tga_sync_secret` are NULL in the running Postgres instance. Hosted Supabase doesn't grant the connecting `postgres` role privileges to `ALTER DATABASE ... SET app.*`, so this requires either the dashboard "Custom Postgres Config" panel or a Supabase support ticket.

### Operator runs to fix

1. https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/database/custom-config
2. Add custom variable `app.tga_sync_url` = `https://tuybltdrdefjblnplpqo.supabase.co/functions/v1/tga-sync` → Add.
3. Add custom variable `app.tga_sync_secret` = `openssl rand -hex 32` output → Add. Also save the same value under Supabase edge-fn secret `TGA_SYNC_SECRET`.
4. Save. Postgres pool restarts (~30s).
5. Re-run the SQL above; expect non-NULL `tga_url` and `tga_secret_set: true`.
6. If dashboard rejects, support ticket subject: *"Need ALTER DATABASE SET privilege for `app.*` GUCs (project tuybltdrdefjblnplpqo)"*.

## Memory key written

`bsuite_tga_gucs_verified_incomplete` (PUT 2026-04-28).
