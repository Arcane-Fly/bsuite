# Item 7 — `pg_cron` + `pg_net` extensions installed

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ✅ **VERIFIED COMPLETE**

## Operator claim history

Resolved in v1.00W "Already Resolved" §Original#3a (WS-G, 2026-04-25). Re-verifying as part of WS-β sweep.

## Verification command

```sql
SELECT extname, extversion, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE extname IN ('pg_cron','pg_net')
ORDER BY extname;
```

Run via `mcp__claude_ai_Supabase__execute_sql(project_id="tuybltdrdefjblnplpqo")`.

## Evidence (captured 2026-04-28)

```json
[
  { "extname": "pg_cron", "extversion": "1.6.4", "schema": "pg_catalog" },
  { "extname": "pg_net",  "extversion": "0.19.5", "schema": "extensions" }
]
```

Cross-confirmed via `mcp__claude_ai_Supabase__list_extensions`:
- `pg_cron` — installed_version `1.6.4` in `pg_catalog`
- `pg_net` — installed_version `0.19.5` in `extensions`

## Outcome

✅ **VERIFIED COMPLETE.** Both required extensions are installed and at recent versions. Removed from v3.00W handoff.

## Memory key written

`bsuite_pg_cron_pg_net_verified` (PUT 2026-04-28).
