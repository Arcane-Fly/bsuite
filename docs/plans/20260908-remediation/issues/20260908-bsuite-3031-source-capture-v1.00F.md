---
kind: record
authority: none
owner: bsuite
---

# Operator runbook: seed the vault entries for document-retention-sweep-daily and sync-award-rates-weekly (both failing since August; the watchdog's first proof cases)

https://github.com/GaryOcean428/bsuite/issues/3031

Snapshot updatedAt: 2026-09-03T17:14:26Z. Open at capture; re-read live.

## What the watchdog found (its first real check-in, 00:52 AWST, 4 September)

Two scheduled controls have never once succeeded because their vault entries were never seeded, and both refuse to POST to a null endpoint by design:

| job | schedule | vault names it reads | failing since |
| --- | --- | --- | --- |
| `document-retention-sweep-daily` | `30 4 * * *` | `document_retention_sweep_url`, `document_retention_sweep_secret` | 2026-08-19 (16 failed, 0 ok) |
| `sync-award-rates-weekly` | `20 2 * * 0` | `sync_award_rates_url`, `sync_award_rates_token` | 2026-08-23 (2 failed, 0 ok) |

Both are described in `docs/20260903-expected-monitors-register-v1.00W.md` (rows near line 160) and in the migration headers (`supabase/migrations/archive/20260822080000_document_retention_destruction_sweep.sql:217-219`).

## One-shot runbook (operator: Supabase SQL editor, production project `tuybltdrdefjblnplpqo`)

Secrets are operational values and must not live in a migration, so this is a console step. Where: Supabase dashboard → SQL editor. Why: the cron jobs read these four names from `vault.decrypted_secrets` and post to the URL with the secret as a shared-secret header.

1. Confirm the function URLs exist (Edge Functions list): `document-retention-sweep` and `sync-award-rates` in this project. The URL shape is `https://<project-ref>.supabase.co/functions/v1/<function-name>`.
2. Generate two random secrets (32+ bytes, e.g. `openssl rand -hex 32`), one per job.
3. Seed (replace the placeholders; run once):
```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/document-retention-sweep', 'document_retention_sweep_url');
select vault.create_secret('<random-shared-secret-1>', 'document_retention_sweep_secret');
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/sync-award-rates', 'sync_award_rates_url');
select vault.create_secret('<random-shared-secret-2>', 'sync_award_rates_token');
```
4. Set the SAME two secrets on the function side (Edge Functions → secrets) under the names each function reads (see `supabase/functions/document-retention-sweep/index.ts` and `supabase/functions/sync-award-rates/index.ts` for the exact env names), plus `FAIRWORK_API_KEY` for the award-rates sync if absent.
5. Then either wait for the next schedule or run once by hand: `select cron.schedule(...)` is not needed; use the existing job: `select * from cron.job where jobname in ('document-retention-sweep-daily','sync-award-rates-weekly')` then trigger via the dashboard's "run now", and read `cron.job_run_details` for a `succeeded` row.

## Caution

The retention sweep **destroys personal information by design** (APP 11.2). Before the first successful run, confirm the sweep's dry-run/threshold settings in the function match policy; the migration header documents the guard. The watchdog will turn the estate healthy on its next check-in once both jobs succeed; the observer comments on #3015 on every unhealthy check-in until then.

Labels: `external-blocked-operator`. Filed by the PI lane at 01:17 AWST from the watchdog's first production check-in; audit C3 output, tracked as FOLLOW 33 in the Phase 1 contract.
