---
kind: record
authority: none
owner: bsuite
---

# document-retention-sweep-daily has failed 9 of 9 runs since birth — APP 11.2 destruction is not commissioned

https://github.com/GaryOcean428/bsuite/issues/2619

Snapshot updatedAt: 2026-08-31T02:49:42Z. Open at capture; re-read live.

## Measured against production, 2026-08-28

```
cron.job                              active   runs   status
document-retention-sweep-daily        true      9/9   FAILED   (latest 04:30Z)
document-destruction-backlog-check    true      9/9   success  (latest 04:10Z)

retention_run_log · document_metadata: 9 runs, all success, rows_deleted = 0
```

This is **APP 11.2 enforcement** — the statutory duty to destroy personal information once its retention period expires. Two halves were built:

1. the **backlog check** (DB-only, counts what is overdue) — works, always has
2. the **destroyer** (pg_cron → edge function, authenticated by a Vault shared secret) — **has never once run.** It `RAISE`s because `document_retention_sweep_url` and `document_retention_sweep_secret` were never seeded.

## Nothing has been missed — yet

The backlog check reports **0 overdue on every run**, so the destroyer failing has destroyed nothing that needed destroying. That is timing, not design: the day a document IS overdue, the destroyer will fail in exactly the same way and look identical in the logs.

## What arming actually does — no dry run exists

The edge function is **deployed and ACTIVE** (`document-retention-sweep`, v5, updated 2026-08-24). Its only mode is `hard_delete`; there is no preview, no report-only path. Seeding the two Vault entries means the next 04:30 tick destroys whatever is overdue, irreversibly, with no further human step.

Today that is zero rows. So arming it now is the *safest moment* it will ever be armed — but it is still arming.

## Why I have not done it

Irreversible destruction of real client data is the one shape the autonomous policy reserves for you. The FutureBuild ratification (precedent 2026-08-26 §1) covers removing rows an automated suite provably planted and is expressly *"not authority for writing to a client tenant generally"*.

## The decision, either of which closes this

- **Commission it** — seed `document_retention_sweep_url` and `document_retention_sweep_secret` in Vault plus the edge function's own secret, per the header of `20260822080000_document_retention_destruction_sweep.sql`. Backlog is 0, so the first run destroys nothing and proves the wiring.
- **Record that destruction stays manual** — and retire or deactivate the cron, so it stops being red 9-for-9. A job that has never succeeded is one nobody reads, and the next genuine failure will look exactly like the standing noise.

Leaving it as-is means the first genuinely overdue document is handled by a job that has never worked.
