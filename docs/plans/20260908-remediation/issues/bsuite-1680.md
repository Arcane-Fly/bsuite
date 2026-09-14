# feat(infra): add silent-failure detection — pg_cron failure alerting + edge-function deployment drift check

https://github.com/GaryOcean428/bsuite/issues/1680

Snapshot updatedAt: 2026-08-26T15:28:25Z. Open at capture; re-read live.

From the 2026-07-28 weekly gap assessment (`docs/20260728-weekly-gap-register-v1.00W.md`).

The assessment's central finding was not any individual defect but that **BSuite had no working
detection for silent infrastructure failure**. Three delivery mechanisms failed simultaneously and
none raised a signal:

- the migration applier had not run since 2026-07-16 (path globs never matched gitlink commits),
- two edge functions were never deployed while live user code invoked one of them,
- a pg_cron job failed 288/288 times over three days.

Much of this is now closed — `86750146` fixed the path globs, the functions are deployed, the vault
secrets are seeded and the STA cron returns HTTP 200. **What is still missing is the detection layer
itself**, so the next occurrence is equally invisible.

## Gaps still open

1. **No pg_cron failure alerting.** Nothing anywhere in the stack polls `cron.job_run_details`. The only
   references are code comments telling a human where to look. A job can fail 100% indefinitely in silence.
2. **No edge-function deployment drift check.** Nothing compares the deployed function registry against
   `supabase/functions/*` in the repos. A function can be invoked by live code and simply not exist.
   Related: at time of writing `fairwork-enhanced` is still deployed from an operator local path
   (`/home/braden/Desktop/...`) rather than the CI path, so its deployed code can diverge from source.

## Acceptance criteria
- A scheduled check queries `cron.job_run_details` and fails loudly when any active job's recent success rate is 0 (or below a stated threshold).
- A scheduled check reconciles deployed edge-function slugs against the repos' `supabase/functions/` directories and fails on either a missing deployment or a non-CI `entrypoint_path`.
- Both must fail loudly when they cannot connect — a green check that proves nothing is worse than a red one.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: with a deliberately broken cron job / a deliberately undeployed function, each check FAILS; with a healthy state, each passes
- **Cross red-team**: claude-code
- **Skills to load**: `supabase`, `verification-before-completion`, `qa-and-verification`
- **Self-report on divergence**: yes
