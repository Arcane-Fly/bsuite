---
kind: record
authority: none
owner: bsuite
---

# Automation liveness sweep 2026-08-23: submodule-pointer writer dead 132/132; pg_cron audit self-test masking two never-successful compliance jobs; two guards vacuous

https://github.com/GaryOcean428/bsuite/issues/2306

Snapshot updatedAt: 2026-08-24T10:31:28Z. Open at capture; re-read live.

Weekly automation-liveness sweep (Datum). **Report only — no writes, no merges, no workflow edits performed.**

Window: 2026-08-16T23:00Z → 2026-08-23T23:00Z. Examined: 124 registered workflows / 121 workflow files across all seven repos, 395 scheduled runs, 62 registered guards, 8 scheduled tasks, 22 live pg_cron jobs.

---

## P1 — `advance-submodule-pointers.yml`: 132/132 scheduled failures, and the failure is a fail-safe holding

Failed **every scheduled run since inception** (created 2026-08-18, hourly `17 * * * *`). The 2026-08-21 audit recorded 20/20; it is now 132/132 over five days. Nothing changed in between.

Root cause, from run [32670447063](https://github.com/GaryOcean428/bsuite/actions/runs/32670447063):

```
Failed to clone 'R80.4' a second time, aborting
advance-submodule-pointers: 6 submodule(s) examined; 0 already current; 0 to advance; 6 refused.
##[error]REFUSED crm7 — 176fba0c is NOT a descendant of the recorded 740c7615...
##[error]REFUSED business-suite-unified — 176fba0c is NOT a descendant of the recorded 9f8904e6...
##[error]REFUSED conduit — 176fba0c is NOT a descendant of the recorded 9d27ea0a...
##[error]REFUSED R80.4 / braden / throughput — same 176fba0c
```

**All six submodules report the identical candidate head `176fba0c`.** That SHA is not in any submodule — it is a **bsuite parent** commit: `Merge pull request #2303 ... advance the crm7 and R80.4 gitlinks` (2026-08-22T16:33Z). The submodule clone fails, and the script does not distinguish "clone failed" from "read head": it falls through to the parent repo's own HEAD and offers it as the new pointer for all six apps.

The descendant check is the only thing standing between that and **six gitlinks rewritten to a parent-repo SHA**. It refused, correctly, 132 times. The guard is working; the plumbing underneath it is not. Fix the clone (private-submodule credentials / PAT scope), and separately make a failed clone an explicit hard error rather than a silent fallback to `HEAD`.

**Correction to the premise this sweep was chartered on.** Measured, not assumed: the gitlinks are **not stale**. All six equal their repo's current `development` HEAD, 0 commits behind, recorded 2026-08-22.

| repo | gitlink | recorded | `development` HEAD | behind |
|---|---|---|---|---|
| crm7 | `740c761` | 2026-08-22T16:23Z | `740c761` | 0 |
| business-suite-unified | `9f8904e` | 2026-08-22T11:13Z | `9f8904e` | 0 |
| conduit | `9d27ea0` | 2026-08-22T15:29Z | `9d27ea0` | 0 |
| R80.4 | `cf854d0` | 2026-08-22T16:13Z | `cf854d0` | 0 |
| braden | `f5bcd6e` | 2026-08-22T11:13Z | `f5bcd6e` | 0 |
| throughput | `0fbb6e2` | 2026-08-22T11:13Z | `0fbb6e2` | 0 |

So the harm — stale pointers making the six reader workflows report confident nonsense under an app's name — **has not materialised**. Manual promote PRs are keeping the pointers fresh. The automation is dead and a human is unknowingly compensating for it. That is the real exposure: the day the manual merges pause, staleness starts with nothing watching.

## P2 — pg_cron health audit fails on a wrong assertion, and is masking two compliance jobs that have never succeeded

`cron-job-health-audit.yml` — 22 failures / 26 runs. Run [32658840614](https://github.com/GaryOcean428/bsuite/actions/runs/32658840614), step *"Self-test — prove the detector can fire"*:

```
FIRED=3
CLEAN=19
##[error]cron_job_health() did NOT report the synthetic failed run.
          The detector is broken and any clean sweep below is meaningless.
```

The detector is **not** broken. The self-test asserts `FIRED=1` exactly, expecting only its synthetic probe. It saw 3 because **two real pg_cron jobs are already failing**. The assertion aborts the run before the sweep reports them. A guard written to prove it can fire is being tripped by the very thing it exists to catch.

Verified live against `tuybltdrdefjblnplpqo`:

| job | schedule | runs | failed | **succeeded — ever** | first fire |
|---|---|---|---|---|---|
| `document-retention-sweep-daily` | `30 4 * * *` | 5 | 5 | **0** | 2026-08-19 |
| `sync-award-rates-weekly` | `20 2 * * 0` | 1 | 1 | **0** | 2026-08-23 |

Both fail safe, with good refusals:

- `document-retention-sweep-daily`: `vault entry missing — seed document_retention_sweep_url and document_retention_sweep_secret ... See 20260822080000 m…`
- `sync-award-rates-weekly`: `vault entry missing — seed sync_award_rates_url and sync_award_rates_token ... Refusing to POST to a null endpoint and report success.`

Neither has ever run. Document retention is a compliance obligation; `sync-award-rates` feeds R80.4 wage rates, which are legally compliance-critical. The two Vault secrets were never seeded after migration `20260822080000`.

Fix is a comparison operator — assert the synthetic run is *among* the fired set, not that it is the only member — plus seeding the four Vault entries. The remaining 19 jobs are clean; `publish-scheduled-pages` and `r7-automation-processor` are at 1440/1440.

## P3 — `pending-encryption-watch.yml`: 7/7 failures, never succeeded

Daily `0 4 * * *`, created 2026-08-17, has never once passed. Not yet root-caused in this sweep.

## P4 — Two registered guards pass vacuously

`guard-self-reporting.yml` catches guards that exit 0 without reporting a count. It does not catch a guard whose **scope** is empty. Two are in that state now.

**`parent-check-supabase-client-init` — VACUOUS.** Enforces the cookie-auth tripwire over a hardcoded five-path list. Its production gate `build-and-test.yml` uses `actions/checkout@v5` with **no `submodules:` key**, so all five paths resolve to nothing and it prints `Result: 0/0 apps passed (5 skipped)` and exits 0. The registry's recorded evidence `Result: 5/5 apps passed` was measured under LANE-WATCHER, which *does* set `submodules: recursive` — **the watcher certifies a shape the merge-blocking gate never runs.** Two further gaps: **conduit is absent from the candidate list entirely** — the one app that legitimately manages auth cookies — and `mobile/lib/supabase.ts` (a real, non-gitlink path in this repo) declares `auth: { storage: ExpoSecureStoreAdapter, ... }` with **no `flowType: 'pkce'`**, a live violation of AGENTS.md Critical Auth Rule 2, sitting undetected today.

**`parent-audit-palette-whitelist` — VACUOUS.** Walks `packages/` only. Its clean-pass line prints `Permitted palette: 222 oklch + 27 hex` — that is the size of the allowlist parsed out of the two source-of-truth HTML docs, **not a count of anything scanned**. The output is byte-identical whether it walked 583 files or zero. `theme-conformance.yml` pays for a full `submodules: recursive` checkout with a cross-repo PAT and this guard then reads none of it. Live undetected violation: `mobile/lib/constants.ts` declares 16 raw OKLCH literals under a "D2C Neon Electric" header, including `warning: 'oklch(0.868 0.125 81.4)'` against the declared `--role-warning` of `oklch(0.728 0.168 22.5)`. Also `.mjs` is outside `SCAN_SUFFIX`, so `packages/theme-codemod/migrate.mjs` — a colour codemod — is exempt from the colour gate.

**`parent-drift-scan` — PARTIAL.** Nine signals genuinely armed, but the registered invocation is the bare diff-scoped form with no `diffScoped: true` marker, and on `main` the diff is empty. Its clean line's only number is the constant `SIGNALS.length = 9`, which would print `9` having examined zero bytes. Its two most-cited tripwires (`workspace:*`, browser-session SSO) live in submodule files a parent diff structurally cannot contain.

## P5 — `scripts/guard-registry.mjs` silently drops 3 of 62 guards

Three `id:` keys are lost to duplicate-key object-literal merges (a missing `},\n  {` boundary — the later key overwrites the earlier, silently, at parse time). 62 declared, **59 actually exported**:

| lost id | swallowed by | script exists? |
|---|---|---|
| `parent-setup-node-pnpm-guard` (L108) | `parent-component-mounts` (L124) | yes |
| `parent-recovered-doc-verdicts` (L443) | `parent-check-hook-suppression-ratchet` (L470) | yes |
| `parent-audit-routes-inventory` (L529) | `parent-parse-closing-keywords-selftest` (L555) | yes |

LANE-WATCHER never executes those three. The registry's own header promises that guards left out are "named in the PR description, not silently dropped".

Separately, eight scripts exist but are unregistered: `check-no-cookie-sso.mjs`, `check-node-pin-parity.mjs`, `check-lockfile-hygiene.mjs`, `check-cross-tenant-references.mjs`, `check-phantom-migrations.mjs`, `check-oauth-boot-wiring.mjs`, `check-table-reach.mjs`, `check-tailwind-sources.mjs`.

## P6 — Dead workflow registrations (files deleted, registration persists)

| repo | workflow | last run of any event |
|---|---|---|
| bsuite | `pgtap.yml` | 2026-05-13, failure |
| bsuite | `autonoma-adoption-audit.yml` | 2026-05-13, failure |
| crm7 | `lint-rls-jwt-claims.yml` | 2026-05-11, failure |
| throughput | `secret-scan.yml` | 2026-05-06, failure (ran once, ever) |

## P7 — crm7's only cron was deleted rather than fixed

`crm7/.github/workflows/prod-migration-history-audit.yml` (daily) failed **every scheduled run it ever had** — 20+ consecutive, ~60 total — on `SUPABASE_DB_URL secret is required`, an unset repository secret. It never once read production migration history. The file was deleted from `main` and `development` around 2026-07-27 rather than the secret being set. bsuite's own copy of this audit is healthy (22 ok / 28).

---

## Check 2 result — silent workflows: NONE, but the estate is thinner than it looks

Zero schedule-declaring workflows had zero runs in the window. No workflow anywhere is in `disabled_inactivity` or `disabled_manually` — the 60-day auto-disable mode is not present.

The structural finding is where the cron lives:

| repo | workflows | declaring `schedule:` |
|---|---|---|
| bsuite | 79 | **16** |
| crm7 | 18 | 0 |
| business-suite-unified | 18 | 0 |
| conduit | 14 | 0 |
| throughput | 11 | 0 |
| braden | 11 | 0 |
| R80.4 | 5 | 0 |

**All unattended automation in this estate is in the parent repo.** Every gate in all six app repos is `pull_request` / `push` / `workflow_dispatch` only — nothing in any app runs on a timer. Six repos cannot suffer a silent scheduled-workflow death because none of them have one.

## Check 3 result — scheduled tasks

Four Datum tasks enabled, all with future `next_run_at`. Four tasks remain **disabled with `next_run_at` frozen three months in the past** — unchanged since the 2026-08-21 audit, neither re-enabled nor deleted:

| task | cron | next_run_at (stuck) |
|---|---|---|
| `crm7#772 pgTAP CI babysitter` | `0 * * * *` | 2026-05-14 |
| `bsuite-claude-coordination-poller` | `20 * * * *` | 2026-05-25 |
| `bsuite-vercel-monitor` | `0 0-14 * * 1-5` | 2026-05-25 |
| `BSuite: Autonomous Iteration Loop` | `15 * * * *` | 2026-05-25 |

They are user-paused, so they cannot fire — but `BSuite: Autonomous Iteration Loop` is an autonomous prompt one toggle away from running against a worldview three months stale (pre-R80.4 rename, pre-browser-session SSO removal, pre-model-roster change). Recommend deletion rather than indefinite pause.

**Stale prompt facts — including this sweep's own.** The automation-liveness task prompt states the estate has *"63 workflows and 41 gate scripts"*. Measured: **121 workflow files / 124 registered**, and **62 declared / 59 live guards**. It is scoped to roughly half the estate it is meant to watch. It also cites `advance-submodule-pointers` at "20 of 20 for ~19 hours" — now 132/132 over five days.

**Caveat needing operator eyes:** none of the four enabled Datum tasks has a recorded `last_run`, including two dailies created 2026-08-21 that have had two fire windows since. That is either an artefact of how this task type records runs, or they are not firing. This sweep cannot distinguish the two from the API alone.

---

### Suggested order

1. Fix the submodule clone in `advance-submodule-pointers.yml`; make a failed clone a hard error, never a fallback to parent `HEAD`. **(P1)**
2. Change the pg_cron self-test to `synthetic ∈ fired` rather than `count == 1`, and seed the four Vault secrets. **(P2)** — this is the one with live compliance exposure.
3. Add `submodules: recursive` to `build-and-test.yml`, add conduit + `mobile/` to the client-init candidate list, and make `audit-palette-whitelist.py` print a scan denominator. **(P4)**
4. Repair the three duplicate-key guard entries. **(P5)**
5. Delete the four dead workflow registrations and the four stale scheduled tasks. **(P6, Check 3)**
6. Re-scope this liveness routine's own prompt to the measured estate. **(Check 3)**

<sub>Filed by Datum, weekly automation-liveness sweep. Report-only authority: no merges, promotions, force-pushes, deletions, or workflow edits were performed.</sub>
