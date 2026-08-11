# Scheduled jobs — what runs, what doesn't, and what to do about it

**Date:** 2026-08-11 · **Status:** 1.00W · **Requested by:** Braden ("this needs to be fully
investigated, researched and recommendations provided")

## The short answer

**Nothing is broken right now.** Three cleanup functions exist that no schedule ever calls,
but every table they would clean is currently empty or healthy, and the one that looked like
a security risk turned out not to be one.

The problem is timing, not damage. Those tables are empty because the features that fill them
are barely used yet — FutureBuild is the only live client. **The cleanup is missing for the
day the usage arrives, not for today.** That makes this worth fixing now, while it is cheap
and nothing is on fire.

One thing I reported earlier was wrong and I have corrected it below.

---

## What I found

### It is three functions, not two

| function | what it does | scheduled? |
|---|---|---|
| `cleanup_apprentice_handoff_tokens` | deletes handoff tokens older than 24 hours | **no** |
| `xero_cleanup_expired` | deletes expired Xero idempotency keys | **no** |
| `reap_stale_tga_sync_runs` | marks a training.gov.au sync "stale" if stuck over 10 min | **no** |

I originally said two. The third (`reap_stale_tga_sync_runs`) is a different kind of thing —
see below — which is probably why it was missed.

### Nothing has accumulated

Measured live, 2026-08-11:

| table | rows | rows overdue for cleanup |
|---|---:|---:|
| `apprentice_handoff_tokens` | 0 | 0 |
| `xero_request_idempotency` | 0 | 0 |
| `tga_sync_runs` | 126 | 0 stuck |

### The security question — answered, and the answer is good

A cleanup that deletes **tokens** raises an obvious worry: if it never runs, do old tokens stay
usable? An apprentice handoff token moves a candidate between organisations, so a stale one
being redeemable would matter.

**It is not a hole.** Expiry is enforced by the database itself, on every read and every
redemption, independent of the cleanup:

```
select_active_apprentice_handoff_tokens   USING (expires_at > now() AND redeemed_at IS NULL)
redeem_apprentice_handoff_tokens          USING (expires_at > now() AND redeemed_at IS NULL
                                                 AND host tenant is owner/admin/manager)
```

An expired token is invisible and unusable whether or not the row was ever deleted. **The
cleanup is housekeeping, not a lock.** Worth saying plainly, because the opposite conclusion
would have been reasonable to jump to.

### A correction to what I told you earlier

I said `sta-email-watch` had "failed 462 of 1,790 runs, 26%, and is still firing every 15
minutes" — framed as a live failure. **That was wrong.** All 462 failures fall between
23 and 28 July, from a vault secret that had not been seeded. It has succeeded **1,328
consecutive times** since 28 July. It is healthy and needs nothing.

I read a lifetime total as a current rate. The lesson is to always bound a failure count by
date before calling it live.

### `reap_stale_tga_sync_runs` is a different problem

The other two are housekeeping. This one is a **self-healing** step, and it is missing while
the detector that would notice the problem is present.

`tga-sync-liveness-check` runs daily and raises an alarm if no training.gov.au sync has
succeeded in 48 hours. So if a sync crashes and leaves its row stuck at "running", you will
find out — up to two days later. Nothing un-sticks it. Detection exists; remediation does not.

---

## Why this happened, since it will happen again

Eleven jobs are scheduled. Three functions are not. Nothing in the codebase or in CI compares
those two lists, so a function can be written, reviewed, merged and forgotten, and every
signal says the work was done. **A function that exists but never runs reads exactly like
coverage.**

This is the same shape as two other things found this week: a report catalogue entry pointing
at a table with six rows instead of the register with 5,243, and three database protections
that existed in production but in no committed file. In each case the artefact was present and
the wiring was not.

---

## Recommendations

**1. Schedule all three — but not identically.** They are not the same kind of job.

| function | suggested schedule | why |
|---|---|---|
| `cleanup_apprentice_handoff_tokens` | daily | tokens live 24h; daily is sufficient |
| `xero_cleanup_expired` | daily | idempotency keys, low volume |
| `reap_stale_tga_sync_runs` | every 15 min | it un-sticks a stalled sync; daily would leave a sync jammed for a day |

**2. Make the gap impossible to recreate.** A test that fails when a cleanup-shaped function
has no schedule. The rule is mechanical:

> every `public` function matching `cleanup|purge|retention|reap|prune` must be referenced by
> some `cron.job.command`, or carry an explicit marker saying why not

That converts "someone has to remember" into "CI refuses". Cheap, and it is the only
recommendation here that prevents recurrence rather than fixing today's instance.

**3. Make a job that does nothing distinguishable from a job that never ran.** Today, both
look identical — silence. The retention work merged yesterday added a `retention_run_log` for
exactly this; these three should write to it too, so "cleanup is working, there was nothing to
clean" is a statement you can check rather than assume.

**4. Alarm on a stuck sync, not just an absent one.** `tga-sync-liveness-check` asks "has
anything succeeded lately?". It should also ask "is anything stuck right now?" — the reaper
already computes that.

## What I did not do

I did not schedule anything. These are production jobs and scheduling one is a live change; it
should land as a reviewed migration, not from an investigation. Nor did I research whether the
24-hour token window is the right window — it is a product decision, and nothing suggests it is
wrong.
