# Item 5 — `TGA_SYNC_ENABLED=true` flip + active sync

**Verification date:** 2026-04-28
**Workstream:** WS-β (operator-item verification sweep)
**Status:** ❌ **VERIFIED INCOMPLETE** (and dependent on Item 4 — TGA GUCs)

## Operator claim history

Item 6 on original 10-item checklist (2026-04-23). Carried forward as Item 3 in v1.00W handoff.

## Verification commands

### A. Are there real (non-seed) sync runs?

```sql
SELECT id, started_at, completed_at, status,
       records_fetched, records_inserted, records_updated, records_failed,
       triggered_by
FROM public.tga_sync_runs
ORDER BY started_at DESC
LIMIT 5;
```

### B. Is the `tga-sync` cron job scheduled?

```sql
SELECT jobid, schedule, command, jobname, active
FROM cron.job
ORDER BY jobid;
```

### C. Is `TGA_SYNC_ENABLED` set as a Supabase secret?

```bash
curl -s "https://api.supabase.com/v1/projects/tuybltdrdefjblnplpqo/secrets" \
  -H "Authorization: Bearer $SUPABASE_MCP_ACCESS_TOKEN" \
  | jq -r 'map(.name) | sort | .[]' | grep -i tga
```

## Evidence (captured 2026-04-28)

### A. Sync runs

```json
[
  {
    "id": "2599ced7-cc75-4f58-ad4e-547bf73a0c06",
    "started_at": "2026-04-22 10:22:04.824573+00",
    "completed_at": "2026-04-22 10:22:04.824573+00",
    "status": "partial",
    "records_fetched": 0,
    "records_inserted": 0,
    "records_updated": 0,
    "records_failed": 0,
    "triggered_by": "seed"
  }
]
```

Only **one** row — a `triggered_by: seed` placeholder from 2026-04-22 with all `records_*: 0`. No real sync has ever run.

### B. Cron jobs (full inventory)

| jobid | schedule | jobname | active |
|---|---|---|---|
| 1 | `0 0 1 7 *` | `annual-apprentice-rate-review` | t |
| 2 | `0 * * * *` | `report-delivery-hourly` | t |

**Zero `tga-sync` cron jobs.** The migration that registers the cron job (`20260422112947_phase3_pg_cron_guc_guard.sql`) is gated on the GUCs being set — since Item 4 GUCs are NULL, the cron registration step is being skipped.

### C. Secret check

```
(no output — TGA_SYNC_ENABLED, TGA_SYNC_SECRET, TGA_SYNC_URL all absent)
```

## Outcome

❌ **VERIFIED INCOMPLETE.** Three independent gaps:
1. `TGA_SYNC_ENABLED` is not in Supabase secrets.
2. `app.tga_sync_url` + `app.tga_sync_secret` GUCs are NULL (Item 4).
3. No `tga-sync` row exists in `cron.job` because the gate migration short-circuits when the GUCs are absent.

**Cannot complete Item 5 until Item 4 is done.** After Item 4 is operator-resolved:

```bash
# 1. Re-run the gate migration to re-evaluate GUC presence + register the cron
supabase db push --project-ref tuybltdrdefjblnplpqo
# (or re-apply the 20260422112947_phase3_pg_cron_guc_guard.sql migration)

# 2. Set the enable flag
supabase secrets set TGA_SYNC_ENABLED=true --project-ref tuybltdrdefjblnplpqo

# 3. Redeploy tga-sync (currently version 3, deployed 2026-04-23)
supabase functions deploy tga-sync --project-ref tuybltdrdefjblnplpqo

# 4. Manually trigger one run to validate, OR wait for the cron schedule.
# 5. Re-verify: query A should show a row with triggered_by != 'seed' and records_* > 0.
```

The v1.00W handoff also called out a sandbox-branch dry-run before flipping production — that operator judgment step still applies. See v1.00W §Item 3 for full procedure.

## Memory key written

`bsuite_tga_sync_enabled_verified_incomplete` (PUT 2026-04-28).
