# Cron watchdog: scheduled controls need attention

https://github.com/GaryOcean428/bsuite/issues/3015

Snapshot updatedAt: 2026-09-08T05:23:33Z. Open at capture; re-read live.

**public.cron_watchdog_checkins and/or public.pg_cron_watchdog_check() do not exist**

Class: `not_installed`

crm7 migration 20261117000000_pg_cron_watchdog_checkins.sql has not reached production. Migrations apply only from the parent repo's main via the Supabase Migrations workflow, so this closes when that promotion lands. Until then there is NO liveness proof for any of the 24 scheduled controls.

Observed at 2026-09-03 12:53 UTC by [this run](https://github.com/GaryOcean428/bsuite/actions/runs/33757664708).

The watchdog is `cron-watchdog-every-15m` -> `public.pg_cron_watchdog_check()`, installed by crm7 migration `20261117000000`. It writes one row to `public.cron_watchdog_checkins` on every run. This is the single issue for that control: it is updated in place on every recurrence and CLOSES ITSELF once a later check-in is healthy.

First look:

```sql
SELECT ran_at, healthy, jobs_examined, manifest_rows, unhealthy_jobs, expected_missing, http_failures
  FROM public.cron_watchdog_checkins ORDER BY ran_at DESC LIMIT 5;
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```
