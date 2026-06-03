# HF-4 · pgTAP anon-context RLS harness for WS-8 (v1.00W)

| Field         | Value                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| Issue         | [bsuite#866](https://github.com/GaryOcean428/bsuite/issues/866)           |
| Constraint    | C10 (GTO master plan — RLS must be tested via anon key, not SQL editor)   |
| Status        | A — Approved / completed on development                                   |
| Author        | @buffy (automated)                                                        |
| Created       | 2026-05-13                                                                |
| Last updated  | 2026-06-03                                                                |
| Scope         | `crm7/` (primary), `bsuite/` (plan doc + submodule bump)                  |

> **Status: COMPLETED** — HF-4 is merged to CRM7 `development`; [bsuite#866](https://github.com/GaryOcean428/bsuite/issues/866) is closed. Evidence: pgTAP workflow green on CRM7 `development` ([run #26491002652](https://github.com/GaryOcean428/crm7/actions/runs/26491002652)); documentation path drift corrected by [CRM7 PR #949](https://github.com/GaryOcean428/crm7/pull/949), including `Anon-context RLS tests (Constraint C10)` passing.

## Goal

Close the WS-8 verification gap. Every RLS policy shipped since WS-2 was
only hand-validated against the SQL editor, which runs as `service_role`
and **bypasses RLS**. A policy written `TO public` by accident (or a
missing `auth.uid()` clause) would be invisible. HF-4 adds a pgTAP
harness that exercises every shipped policy through the same GUC +
role-switch dance PostgREST performs for a real anon / authenticated
JWT, and gates CI on it.

## Non-goals

- Rewriting any existing policy (this is a verification-only drop).
- Covering tables shipped by WS-3 (invoices), WS-5 (reports), WS-6
  (AVETMISS fields), WS-7 (registers). They are in scope for a follow-up
  HF once HF-4 lands (tracked in master plan §Recently Completed).
- Converting the existing anon-key JS smoke
  (`crm7/scripts/rls-tests/ws8-rls-anon-smoke.mjs`) — that test stays as
  a live-Postgres sanity check and is documented alongside the new suite.

## Deliverables

### Tests (6 suites + helpers)

| File                                              | Policies covered                             | Assertion count |
| ------------------------------------------------- | -------------------------------------------- | --------------- |
| `00_harness_helpers.sql`                          | n/a — shared JWT/role simulation             | 0               |
| `01_security_definer_helpers.sql`                 | 5 WS-8 helpers + revoke migration            | 18              |
| `02_org_members_rls.sql`                          | 4 `org_members` policies                     | 11              |
| `03_wage_calculation_snapshots_rls.sql`           | 5 policies + immutability trigger            | 11              |
| `04_timesheets_rls.sql`                           | 4 `timesheets` + 4 `timesheet_events` polici |  11             |
| `05_pay_runs_rls.sql`                             | 2 `pay_runs` policies                        |  8              |
| `06_payroll_records_rls.sql`                      | 3 `payroll_records` policies                 |  9              |
| **Total**                                         |                                              | **68**          |

### CI

`.github/workflows/pgtap.yml` — runs on PR + push when migrations or
pgTAP files change. Uses the **canonical Supabase CLI path** per the
`supabase` skill doctrine:

1. `supabase/setup-cli@v1` installs the latest CLI.
2. `supabase init` creates an ephemeral `supabase/config.toml` (the
   crm7 repo doesn't commit one — team uses hosted Supabase via MCP).
3. `supabase db start` provisions the **official Supabase Postgres
   container** which already ships with:
   - pgTAP extension installed
   - Real `auth` schema with production `auth.uid()` / `auth.jwt()` /
     `auth.role()` (sourced from gotrue, **not hand-stubbed**)
   - `anon` / `authenticated` / `service_role` / `authenticator` roles
     correctly configured
   - `pg_hba.conf` pre-configured for password auth
4. The workflow hides historical migrations, replays the canonical production baseline, marks baseline migrations as applied, then applies post-baseline migrations explicitly.
5. `pg_prove` runs every `.sql` file under `supabase/tests/database/`.

### Docs

- `crm7/supabase/tests/database/README.md` — harness rationale,
  layout, how to add new suites, how the anon-key simulation works.
- `crm7/CONTRIBUTING.md` — new "RLS testing (Constraint C10)" section
  explaining the mandatory gate.
- This plan doc (`docs/plans/20260513-hf4-pgtap-rls-harness-v1.00W.md`).

## Test strategy

### Anon-context simulation

pgTAP runs inside Postgres. We cannot open a PostgREST connection; we
must reproduce PostgREST's side-effects. PostgREST, after verifying a
JWT, does exactly two things before running your query:

1. `SET LOCAL request.jwt.claims = '…';` (the signed JWT body, as JSON).
2. `SET LOCAL role = <role claim>;` (either `anon` or `authenticated`).

The harness helper functions write the same GUCs with `set_config(…, true)`
and flip the same `role`. Policies marked `TO authenticated` / `TO anon`
therefore evaluate identically to a real HTTP request. Any assertion
that runs while the session is still `postgres` / `service_role` would
bypass RLS — every suite is structured so assertions happen **only
after** a `sign_in_as_*` call.

### Fixture strategy

- Each suite wraps its work in `BEGIN; … ROLLBACK;`, so migrations and
  any prior suite cannot observe fixtures.
- Fixture UUIDs are predictable (`a{suite}000000-0000-0000-0000-…`) so
  failures pinpoint the exact suite + role without reading the test
  body.
- `test_rls.reset_role()` is used before every `INSERT` that fixtures
  protected tables (auth.users, tenants, org_members). This keeps the
  seed step distinct from the assertion step.

### Coverage

| Invariant flavour           | Covered by                                                      |
| --------------------------- | --------------------------------------------------------------- |
| Anon denial (A-series)      | Every suite — `sign_in_as_anon()` then expect 0 rows / throw    |
| Tenant isolation            | 02 (org_members), 03 (snapshots), 04 (timesheets), 05/06        |
| Role-based read             | 01 (helpers), 04 (apprentice + host), 06 (apprentice self-read) |
| Staff-only write            | 03, 04, 05, 06                                                  |
| Immutability trigger        | 03 (snapshots UPDATE/DELETE rejected even for gto_staff)        |
| SECURITY DEFINER revoke     | 01 (all 5 helpers + overload)                                   |
| Policy scope via helper fn  | 01 (B-series return values match gto_role enum)                 |

## Acceptance criteria (from issue #866)

| # | Criterion                                                                 | Status |
| - | ------------------------------------------------------------------------- | ------ |
| 1 | `crm7/supabase/tests/database/` directory exists with anon-context harness | ✅     |
| 2 | `.github/workflows/pgtap.yml` spins up Postgres, applies migrations, runs | ✅     |
| 3 | `org_members_rls.sql`: tenant isolation + gto_admin writes + appr denial  | ✅     |
| 4 | `security_definer_helpers.sql`: per-role returns + anon revoke            | ✅     |
| 5 | `wage_calculation_snapshots_rls.sql`: tenant SELECT + staff INSERT +      |        |
|   | trigger-blocked UPDATE/DELETE                                             | ✅     |
| 6 | `timesheets_rls.sql`: apprentice / host-supervisor / gto-staff visibility | ✅     |
| 7 | `pay_runs_rls.sql` + `payroll_records_rls.sql`: staff access + apprentice | ✅     |
| 8 | CI gate on any migration touching RLS                                     | ✅ via `paths:` filter |
| 9 | CONTRIBUTING.md "RLS testing" section added                               | ✅     |

## Risks & mitigations

| Risk                                                              | Mitigation                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Stub auth schema drifts from real gotrue implementation           | **Eliminated** — we use `supabase db start` which provisions the real `auth` schema |
| Migrations depend on extensions not available in CI Postgres      | Supabase Postgres image ships pgTAP, pgcrypto, plpgsql, etc. preinstalled            |
| `timesheets` / `engagements` tables created in pre-WS migrations  | Fixtures use only columns the RLS policies reference; rest falls to DEFAULT          |
| `supabase db start` slow on cold runner (Docker pull)             | Step has 20-min timeout; subsequent layer cache hits should be < 60 s                |
| Future migration changes fixture-required columns                 | Suites are self-contained per transaction; only the affected suite needs update      |

## Rollout

1. **crm7 PR** (feature branch `fix/hf4-pgtap-rls-harness-20260513`
   → `development`) — all test files, workflow, CONTRIBUTING update.
2. **bsuite parent PR** (branch
   `chore/hf4-pgtap-harness-plan-doc-20260513` → `development`) — plan doc +
   crm7 submodule pointer bump after #1 lands.
3. Close issue #866 with links to both merged PRs.

## References

- [`crm7/supabase/migrations/20260423100000_ws8_org_members_gto_role_helpers.sql`](../../crm7/supabase/migrations/20260423100000_ws8_org_members_gto_role_helpers.sql)
- [`crm7/supabase/migrations/20260423110000_ws2_wage_calculation_snapshots.sql`](../../crm7/supabase/migrations/20260423110000_ws2_wage_calculation_snapshots.sql)
- [`crm7/supabase/migrations/20260423120000_ws8_revoke_anon_execute_on_gto_helpers.sql`](../../crm7/supabase/migrations/20260423120000_ws8_revoke_anon_execute_on_gto_helpers.sql)
- [`crm7/supabase/migrations/20260423150000_ws4_timesheet_state_machine.sql`](../../crm7/supabase/migrations/20260423150000_ws4_timesheet_state_machine.sql)
- [`crm7/scripts/rls-tests/ws8-rls-anon-smoke.mjs`](../../crm7/scripts/rls-tests/ws8-rls-anon-smoke.mjs)
- [`docs/plans/20260423-gto-billing-reporting-refined-plan-v1.00A.md`](./20260423-gto-billing-reporting-refined-plan-v1.00A.md) §C10
- [`crm7/docs/adr/20260423-calc-engine-single-source.md`](../../crm7/docs/adr/20260423-calc-engine-single-source.md) (ADR-001 restored in HF-3)
