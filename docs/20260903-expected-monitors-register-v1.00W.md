---
kind: standard
authority: engineering
owner: bsuite
evidence:
  - .github/workflows/cron-watchdog-observer.yml
  - scripts/check-cron-watchdog-checkin.mjs
  - .github/cron-watchdog-baseline.json
---

<!--
  THE DATABASE HALF IS NAMED BY VERSION, NOT BY PATH, AND ON PURPOSE.
  check-doc-citations-resolve.mjs resolves every cited path against the tree as
  checked out — and crm7 is a SUBMODULE, pinned to a gitlink. The migration and
  the pgTAP suite that carry the other half of this control land in a separate
  crm7 pull request, so a path citation here would be unresolvable in CI until
  that PR merges AND the gitlink advances, and the only way to make it green in
  the meantime is to re-bank the unresolved-citation ratchet — which is how a
  ratchet becomes a place findings go to be forgotten.

  The two files, in the crm7 repository:
    supabase/migrations/20261116000000_pg_cron_watchdog_checkins.sql
    supabase/tests/database/91_pg_cron_watchdog_dead_mans_switch.sql
  Add them to `evidence` above once the gitlink carrying them reaches this repo.
-->


# Expected monitors register — what watches the estate, and what watches the watchers

**Document:** `docs/20260903-expected-monitors-register-v1.00W.md`
**Date:** 2026-09-03 · **Version:** 1.00W · **Status:** W — Working

> **The one sentence.** Every row below is a control that must be RUNNING; if a row's monitor
> stops, something else in this table notices, and the last thing in the chain is a scheduled
> GitHub Actions workflow whose failure emails the repository owner. A monitor nobody watches
> is a monitor that has already stopped and not told anyone.

## 1. Why a register rather than a query

`sta-email-watch` failed **462 consecutive times** between 2026-07-23 and 2026-07-28. Every one
of those failures was recorded, correctly and loudly, in `cron.job_run_details`. Nothing read
it. It stopped when somebody seeded an unrelated vault secret.

`document-retention-sweep-daily` has failed on **every run since 2026-08-24** and is still
failing today. `sync-award-rates-weekly` has run twice and **never once succeeded**.

Each of those jobs did the right thing — it raised loudly rather than silently reporting
success. The missing half was always the reader, and then the missing half was a reader whose
own death nobody would notice.

A query over `cron.job` cannot be the register, because the failure mode that costs most is a
control that is **not there**: renamed, dropped, or never scheduled. A job with no `cron.job`
row leaves nothing behind to classify, and a sweep over what exists reports every survivor
healthy. So the expectation is written down, and it default-denies in both directions.

## 2. The chain, and where each link's absence is noticed

| Link | What it is | Runs | Its silence is noticed by |
|---|---|---|---|
| 1 | 24 scheduled controls in `cron.job` + 2 deployed-but-unscheduled edge functions | per their own schedules | link 2, against `public.cron_job_manifest` |
| 2 | `public.pg_cron_watchdog_check()` via `cron-watchdog-every-15m` — writes ONE check-in row every run, healthy or not | every 15 min | link 3, which alarms on a MISSING check-in |
| 3 | `.github/workflows/cron-watchdog-observer.yml` — fails on a check-in older than 45 min, on `healthy = false`, on denominator drift, or on the watchdog not being installed | every 30 min | GitHub emails the repository owner on a failed scheduled run; a workflow that stops running is itself visible in the Actions tab |
| — | `.github/workflows/cron-job-health-audit.yml` — richer per-job diagnosis over `public.cron_job_health(24)` plus the window-independent never-succeeded sweep | every 6 h | the same email path; complementary to link 3, not a substitute (it infers expectations from schedule strings, so it cannot see a job that no longer exists) |

The chain terminates in a human inbox. That is the honest description of the current estate:
there is no paging vendor, no Sentry Crons monitor and no check-in URL in any checked-in file
in any of the six repositories, and nothing here pretends otherwise.

## 3. The expected monitors

Seeded from the live roster measured **2026-09-03** (`SELECT jobid, jobname, schedule, active,
(command ILIKE '%net.http_post%') FROM cron.job ORDER BY jobid` — 24 rows, 9 of them http),
plus the watchdog's own job, plus the two deployed-and-unscheduled edge functions. The
authoritative copy is the table `public.cron_job_manifest`, seeded by crm7 migration
`20261116000000`; this section is its readable form and must be updated in the same change.

`max_age_minutes` mirrors the tolerances `public.cron_job_health()` already applies, so the two
controls cannot disagree about what "late" means.

| Job | Schedule | Kind | Max age (min) | Health on 2026-09-03 |
|---|---|---|---|---|
| `annual-apprentice-rate-review` | `0 0 1 7 *` | sql | 576000 | succeeded |
| `report-delivery-hourly` | `0 * * * *` | sql | 180 | succeeded ×3 |
| `host-monthly-pack-monthly` | `5 6 1 * *` | sql | 57600 | succeeded ×3 |
| `document-expiry-alert-sweep` | `0 8 * * *` | sql | 4320 | succeeded ×3 |
| `publish-scheduled-pages` | `* * * * *` | sql | 60 | succeeded ×3 |
| `xero-connections-refresh-daily` | `30 8 * * *` | http | 4320 | succeeded ×3 |
| `sta-email-watch` | `*/15 * * * *` | http | 60 | succeeded ×3 (462 consecutive failures in July) |
| `r7-automation-processor` | `* * * * *` | http | 60 | succeeded ×3 |
| `r7-talent-pool-matcher` | `0 3 * * *` | http | 4320 | succeeded ×3 |
| `tga-sync-daily` | `15 17 * * *` | http | 4320 | succeeded ×3 — the only http job that reads its own response |
| `tga-sync-liveness-check` | `15 18 * * *` | sql | 4320 | succeeded ×3 |
| `audit-and-error-log-retention-daily` | `15 2 * * *` | sql | 4320 | succeeded ×3 |
| `jodie-error-log-scan-daily` | `20 9 * * *` | http | 4320 | succeeded ×3 |
| `edge-rate-limit-cleanup-hourly` | `40 * * * *` | sql | 180 | succeeded ×3 |
| `apprentice-handoff-token-cleanup-daily` | `50 3 * * *` | sql | 4320 | succeeded ×3 |
| `xero-expired-cleanup-hourly` | `55 * * * *` | sql | 180 | succeeded ×3 |
| **`sync-award-rates-weekly`** | `20 2 * * 0` | http | 14400 | **failed ×2 — never once succeeded** |
| `security-signal-scan-daily` | `45 3 * * *` | sql | 4320 | succeeded ×3 |
| `document-destruction-backlog-check-daily` | `10 4 * * *` | sql | 4320 | succeeded ×3 |
| **`document-retention-sweep-daily`** | `30 4 * * *` | http | 4320 | **failed ×3 — never once succeeded** |
| `training-contract-retention-daily` | `5 5 * * *` | sql | 4320 | succeeded ×3 |
| `tenant-link-expire-proposals` | `11 3 * * *` | sql | 4320 | succeeded ×3 |
| `tester-licence-expiry-daily` | `25 3 * * *` | sql | 4320 | succeeded ×3 |
| `email-inbox-sync-every-5-min` | `*/5 * * * *` | http | 60 | succeeded ×3 |
| `cron-watchdog-every-15m` | `7,22,37,52 * * * *` | sql | 60 | new in this change |
| `email-token-refresh` | — | unscheduled_expected | — | deployed, no `cron.job` row anywhere |
| `tga-organisation-sync` | — | unscheduled_expected | — | deployed, no `cron.job` row anywhere |

**A paused or never-pinged monitor pages, by construction.** A manifest row with no `cron.job`
row is `expected_missing`; a `cron.job` row with no manifest row is `unknown_job`; an
`unscheduled_expected` row that acquires a `cron.job` row is `manifest_stale`. All three mark
the check-in unhealthy, and the observer fails on that within 30 minutes.

## 4. What this does not assert

- **That an http job's edge function did its work.** Nine jobs POST through `net.http_post`.
  Eight of the nine discard the request id it returns, and `pg_net` keeps no job linkage of its
  own, so no per-job join is possible. Time-window attribution was tried and measured **wrong**:
  `document-retention-sweep-daily` has three `net._http_response` rows inside its window and
  never posted at all, because `r7-automation-processor` posts every minute and lands one in
  everybody's window. The http axis therefore reports at the **layer**, with an explicit
  `attribution: unattributed` field — it turns an invisible 500 into a 15-minute alarm and lets
  a human name the job.
- **That a job's output is correct.** Liveness is not correctness.
- **That the two unscheduled edge functions should be scheduled.** They are recorded as a known
  absence so the absence stops being invisible; scheduling them is a separate decision.

## 5. Known-blocked rows, and the pre-flight each needs

Neither is fixed here. Both are the watchdog's first real proof cases: `document-retention-sweep-daily`
must appear as unhealthy in the very first check-in, and if it does not, the control is wrong.

| Blocked row | What is missing | Why it is not seeded here | Pre-flight required first |
|---|---|---|---|
| `document-retention-sweep-daily` | vault secrets `document_retention_sweep_url`, `document_retention_sweep_secret` | The sweep **destroys personal information** by design (APP 11.2) and has never once executed. Seeding the secret arms a destructive job that has never run against real data. | A dry-run count of exactly what the sweep would delete — `SELECT count(*), min(destruction_eligible_date) FROM document_metadata WHERE destruction_eligible_date <= current_date` and the same broken down by tenant and category — reviewed before the first armed run. |
| `sync-award-rates-weekly` | vault secrets `sync_award_rates_url`, `sync_award_rates_token`; and the `FAIRWORK_API_KEY` repository secret upstream of it | Award rates feed wage calculations. A sync that runs against a wrong or stale endpoint changes money. | Confirm the endpoint and key against a manual single-award fetch, and diff the returned rates against the bundled snapshot, before the first scheduled run. |

Both are already acknowledged in `.github/cron-never-succeeded-baseline.json`, which may only
shrink: the audit fails on an unacknowledged never-successful job **and** on a stale entry for
a job that has since succeeded.

## 6. Changing this register

Adding or removing a scheduled control means changing **three** things in one commit, or the
gate will tell you:

1. the `cron.schedule` / `cron.unschedule` itself, in a migration in the owning scope;
2. the `public.cron_job_manifest` row, in the same migration — otherwise the watchdog reports
   `unknown_job` or `expected_missing` within 15 minutes;
3. `.github/cron-watchdog-baseline.json`, so the observer's denominators still match — a count
   that fell means something disappeared, a count that rose means nobody declared it.

And this table, so the readable form does not drift from the authoritative one.
