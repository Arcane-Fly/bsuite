# Gap Remediation Plan — 2026-07-28

> **Recovery note (2026-07-28):** authored untracked and destroyed by a concurrent agent's git
> operation before being committed. Restored from the surviving task briefs in
> `.superpowers/sdd/20260728-gap-remediation-plan-v1.00F/` and the controller ledger.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Fixes the residue of [20260728-weekly-gap-register-v1.00F.md](../20260728-weekly-gap-register-v1.00F.md)
after re-verification. Hermes closed most P0s between the assessment and this plan; only the items
below remained open, each re-confirmed live at 2026-07-28T07:45Z.

## Global Constraints

- **Target branch is `development` in every repo.** Never commit to `main`/`master` directly.
- Commits must be **GPG-signed** (`git log --format='%G?' -1` → `G`). Unsigned commits get their
  Vercel deploy silently cancelled.
- Conventional commits: `type(scope): description`, scopes `bsu|crm7|conduit|braden|r80|throughput|shared|docs|deploy`.
- **Evidence before claiming done.** Run the command, quote the output.
- Do NOT apply migrations by hand; DB changes go through the floor-gated applier.
- One repo per task — do not edit a submodule another task owns.

## Verified-fixed before this plan — DO NOT re-fix

`enterprise_licence_events` exists live; `invite_team_member_guarded` RPC exists; `handover-to-employment`
and `sta-email-watch` edge functions deployed; STA vault secrets seeded and cron returning HTTP 200 with
real scan output; migrate/functions-deploy path-globs fixed for gitlink commits; dashboard counter computed
live; R80.3 `calculateChargeRate` threads `fundingOffset`.

## Tasks

## Task 1 — BSU: surface grace-invite audit failures (P0-4)

`business-suite-unified/src/lib/enterpriseLicenceEvents.ts:56` only `console.error`s when the
audit insert fails, so an admin sees a success toast while the compliance event is lost.

Make the failure visible and recoverable without breaking the invite:
- `recordGraceInviteEvent` must report failure to its caller (return a typed result or throw a typed error — your call, but it must be observable).
- The Team Members invite path must surface a non-blocking warning to the admin when the audit write fails, distinct from invite failure. The invite itself must still succeed.
- Add unit tests covering: audit-write success, audit-write failure (invite still succeeds AND warning surfaced).


## Task 2 — Parent: revive the production migration-history audit (S-1)

`crm7/.github/workflows/prod-migration-history-audit.yml` has failed every run since creation
because it requires a `SUPABASE_DB_URL` secret that does not exist in crm7 (`gh secret list`
confirms: crm7 has SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY only).

The parent repo already has the working pattern: secrets `SUPABASE_DB_PASSWORD` +
`SUPABASE_PROJECT_ID`, plus a runtime pooler-cluster probe (aws-1 vs aws-0) at
`.github/workflows/supabase-migrate.yml:191-225`.

- Port the audit into the **parent** repo as a scheduled workflow reusing that exact pooler-probe
  pattern and those existing secrets. Do not invent a new secret.
- Remove or disable crm7's broken workflow so it stops emitting daily red.
- The audit must FAIL LOUDLY on drift and must not silently pass when it cannot connect.
- `statement_count = 0` is NORMAL for this project — do not treat it as drift.


## Task 3 — Parent: reconcile the migration ledger (P0-2)

19 of 27 in-window migrations are absent from `supabase_migrations.schema_migrations` although
their objects exist live (applied out-of-band). Now that the applier's path-glob is fixed, the next
run will attempt to re-apply them.

- Determine, per unrecorded migration, whether re-application is **idempotent**. Read each file.
- Produce a written idempotency verdict table in `docs/` for all 19.
- For any migration that is NOT safely re-runnable, make it idempotent (guarded `CREATE ... IF NOT
  EXISTS`, `DROP POLICY IF EXISTS` before CREATE, `to_regclass()` on cross-table refs, existence-
  guarded `ALTER`) **without changing its semantics**.
- Do NOT hand-insert ledger rows and do NOT run the applier. Deliver the analysis + guards only;
  the operator runs the applier.


## Task 4 — Docs: correct the truth-drift (S-7)

Three documented claims contradict verified reality:
- `docs/20260728-overnight-worldclass-closeout-v1.00W.md:256` — "Grace invites from seat-cap path write durable rows". The table now exists, but the write is still fire-and-forget (Task 1 fixes that). Correct the claim to match reality as of this commit.
- `docs/00-roadmap/20260112-master-roadmap-v1.00F.md:38` — seat caps marked `[x]` complete. Server-side enforcement landed after that tick; verify and restate accurately rather than just re-ticking.
- `docs/20260728-overnight-worldclass-closeout-v1.00W.md:245` — "~65 open across repos"; actual is 85.

Also add a short "verified live" status block to `docs/20260728-weekly-gap-register-v1.00F.md`
recording which register items are now closed and by which commit. Do not rewrite the register's
findings — append status only.


## Task 5 — crm7: redeploy fairwork-enhanced from CI (CF-7)

`fairwork-enhanced` is the last edge function whose deployed `entrypoint_path` is
`/home/braden/Desktop/Dev/bsuite/...` (an operator local-machine deploy) rather than the CI path
`/home/runner/work/bsuite/bsuite/...`. Its deployed code can silently diverge from the repo.
Note it currently lives under `business-suite-unified/supabase/functions/fairwork-enhanced/`.

Determine which repo should own it and ensure it is covered by the
`supabase-functions-deploy.yml` workflow so the next CI run redeploys it from source. Do not deploy
by hand. If it is already covered and simply hasn't re-run, say so with evidence instead of changing code.


## Task 6 — Complete the three unassessed areas (read-only)

The original assessment's shared-package, security, and frontend/backend assessors were killed by a
session limit. Re-run them as read-only assessments. Any P0/P1 found becomes a new fix task.

---

## Out of scope for implementers (controller handles)

- Filing GitHub issues for residual findings (S-3).
- Merging each repo to `development` and the ship sequence.

## Out of scope for implementers (controller handled)

- Filing GitHub issues for residual findings (S-3) — done: bsuite#1680, bsuite#1682,
  business-suite-unified#620, crm7#1260, conduit#391, R80.3#367, R80.3#368.
- Merging each repo to `development` and the ship sequence.
