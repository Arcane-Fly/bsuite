# Database Migration Dispatch — Operator Runbook

**Status:** W (Working)
**Audience:** Platform operator (Braden), not an agent
**Canonical source of truth:** [`crm7/supabase/migrations/CLAUDE.md`](../archive/README.md) *(archived — was `CLAUDE.md`)* (long — read it if anything here seems to contradict it) and root [`CLAUDE.md`](../../CLAUDE.md) §12 (Supabase Policy & Verification Gates)
**Workflow file:** [`.github/workflows/supabase-migrate.yml`](../../.github/workflows/supabase-migrate.yml)
**Related guide:** [Parent Pointer Reconcile](20260716-parent-pointer-reconcile-guide-v1.00W.md) — read that one first if you don't already understand submodule gitlinks

## Why this exists

All six BSuite apps share **one** Supabase project (`tuybltdrdefjblnplpqo`). Migrations live inside each submodule's own `supabase/migrations/` directory, but the applier that actually runs them against the shared database lives in the **parent** repo. That split is the source of the single most dangerous trap in this whole pipeline (see "The stale-pointer trap" below) — read that section even if you skip everything else.

## The canonical pipeline

1. **Merge the migration to the submodule's `main` branch.** The migration file must live under `<submodule>/supabase/migrations/`, named `<YYYYMMDDHHMMSS>_description.sql` (or `.nontx.sql` for non-transactional statements like `CREATE INDEX CONCURRENTLY`).
2. **Bump the parent submodule pointer.** The parent repo's **tree-recorded gitlink** for that submodule — a mode-`160000` commit entry in the parent's git tree, not anything in `.gitmodules` (`.gitmodules` holds only `path`/`url`/`branch`, never a SHA; confirm with `git ls-tree <ref> <submodule>`) — must be updated to the new commit SHA and pushed to the parent's `main`. See the [Parent Pointer Reconcile guide](20260716-parent-pointer-reconcile-guide-v1.00W.md) for the exact commands. **This step is not optional and not implied by step 1** — the parent repo has no automatic tracking of submodule commits.
3. **Dispatch the migration workflow:**
   ```bash
   gh workflow run supabase-migrate.yml --ref main -f submodule=<name>
   ```
   Valid `submodule` values: `all`, `root`, `crm7`, `R80.4`, `braden`, `business-suite-unified`, `conduit`, `throughput`, `schema-builder`. **Use `--ref main`: the dispatched ref determines which parent tree — and therefore which submodule gitlinks — the run reads.** The workflow file itself exists on other branches too (verified: `git ls-tree origin/development .github/workflows/supabase-migrate.yml` returns the same blob as `main`), so dispatching against `development` or a feature branch does **not** fail to find it — it runs, and applies migrations using THAT ref's submodule pointers, which may include commits never promoted to `main`. There is no safety net here; `--ref main` is a hard requirement, not a convenience default.
4. **Verify the LIVE catalog** — not the workflow's "success" log line, not the on-disk migration file, not the Supabase dashboard's migration list. Query the actual database via Supabase MCP (`execute_sql`, `list_migrations`) or `psql`/the Supabase CLI against `pg_proc`, `pg_policies`, `information_schema.role_table_grants`, `pg_class`, etc., depending on what the migration was supposed to create or change. This is root `CLAUDE.md` §12.1 (Supabase Policy Gate) — it is mandatory for any RLS/storage/grant/function claim, not just a suggestion.

## The stale-pointer trap (read this one)

**A migrate-workflow run reporting "success" proves nothing if the parent submodule pointer is stale — it silently no-ops.** This burned the team on 2026-07-16.

Why: `supabase-migrate.yml`'s `apply-migrations` job checks out the repository with `actions/checkout@v5` and `submodules: recursive`. A recursive submodule checkout clones each submodule at **whatever commit SHA is recorded in the parent tree's gitlink** for the ref you dispatched against (`--ref main` → the parent's `main` branch's gitlink for that submodule) — it does **not** fetch the submodule's own latest `main`/`development` tip.

So if you merge a migration into `crm7`'s `main` but forget to bump the parent pointer:

- `gh workflow run supabase-migrate.yml --ref main -f submodule=crm7` still runs.
- The checkout step clones `crm7` at the **old, pre-migration commit** — the new migration file simply is not present in the working directory the job operates on.
- The "Apply transactional migrations" step's `find supabase/migrations -maxdepth 1 -name "*.sql"` loop finds only the old files, all of which are already recorded in `schema_migrations`.
- The job logs `Done: 0 applied, N already recorded.` and exits 0 (success).
- The "Verify transactional migrations recorded" step compares against the **latest local file it can see**, which is also the old one — so it reports success too, because from its perspective nothing changed.

**The workflow's own dispatch input (`submodule=crm7`) only selects which working directory to run `psql` in — it has no effect on which commit of that submodule gets checked out.** Fixing the pointer and re-dispatching is the only fix; there is no separate "refresh submodule to latest" input on this workflow.

**Symptom to watch for:** you dispatched the workflow, it went green, but your live-catalog check (step 4 above) still doesn't show the new function/table/policy. First thing to check is whether the parent pointer for that submodule actually includes your migration's commit — `git log --oneline -1 -- <submodule>` in the parent repo, or `git ls-tree main <submodule>` to see the pinned SHA, then confirm that SHA is a descendant of your migration commit in the submodule's own history.

## MIGRATION_FLOOR

The workflow defines `MIGRATION_FLOOR: '20260611000000'` (currently). Any migration file whose version prefix sorts below the floor is **never applied and never verified** by this workflow — it's treated as pre-floor history owned by the migration-history reconciliation lane (see `crm7/supabase/migrations/CLAUDE.md` for the full ledger of how that backlog was closed out). If you're authoring a **new** migration, its timestamp will always be well above the current floor, so this normally doesn't matter — it matters if you're ever tempted to "fix" an old file by re-dating it below the floor; don't, it will simply be ignored.

## Unique timestamps across ALL submodules

Migration versions are recorded in **one shared** `supabase_migrations.schema_migrations` table (there is one physical database, and the applier records every scope's history there). If two submodules each ship a migration with the same `YYYYMMDDHHMMSS` prefix, the second one to be recorded is silently skipped by the "already recorded" check in the applier — it looks like a duplicate version even though the content is completely different. Pick a timestamp that is unique across every submodule's migration history, not just your own. When in doubt, use the actual current UTC time rather than reusing a round number.

## Never edit an applied migration — fix forward

Once a migration's version appears in `supabase_migrations.schema_migrations`, the file is frozen. Do not edit it, even to fix a comment, a typo, or a bug that turns out to be harmless in practice. Ship a new migration instead. `crm7/supabase/migrations/CLAUDE.md` documents a case (PR #756, 2026-05-13) where an agent edited four frozen files based on a mistaken belief they weren't tracked, and had to revert — the frozen-migration rule holds even when an edit would have zero practical effect, because it preserves the source↔database lockstep for anyone resetting a fresh database from source.

Absence of a row in `schema_migrations` is **not** proof a migration is safe to edit either — migrations have been applied out-of-band (Studio editor, direct `psql`, MCP `execute_sql`) without ever being recorded. Always cross-check the live schema (via MCP `pg_class`/`pg_proc`/`pg_policies`) against what the file would produce before treating it as "never applied."

## Never apply via raw MCP DDL as the routine path

Supabase MCP's `execute_sql` (or an equivalent ad hoc `psql` session) is for **verification and genuine emergencies**, not the normal way to ship a migration. Every routine schema change goes through the floor-gated dispatch pipeline above so it's recorded consistently in `schema_migrations` and replayable by the pgTAP baseline-replay harness. Out-of-band DDL is exactly the class of drift that created the month-long crm7#758 migration-history reconciliation — it is fixed forward, never repeated.

## After dispatch — triage checklist

- [ ] Parent pointer for the target submodule includes the migration's commit (`git ls-tree main <submodule>` in the parent repo)
- [ ] Workflow run is green **and** its log shows `N applied` where N > 0 for a fresh migration (0 applied on a run you expected to do work is the stale-pointer symptom above)
- [ ] Live catalog confirms the actual DDL exists (function body via `pg_get_functiondef`, table via `information_schema.tables`, policy via `pg_policies`, grant via `information_schema.role_table_grants` — whichever applies)
- [ ] For any RLS/policy/grant change: MCP `get_advisors` (security + performance) run and every new finding triaged — fix, file, or documented as accepted (root `CLAUDE.md` §12.1.3; enforced on schedule by `.github/workflows/supabase-advisor-sweep.yml`)
- [ ] For scheduled/independent verification of the whole migration history (not just today's migration): `crm7/.github/workflows/prod-migration-history-audit.yml` runs daily and on dispatch, flagging rows where `statement_count = 0` **and** the corresponding local file is non-empty. **`statement_count = 0` by itself is normal, not a defect** — this pipeline's own applier records every successful apply via `INSERT INTO supabase_migrations.schema_migrations(version, name) VALUES (...)` with no `statements` array, so 0 is the healthy end-state of every migration this workflow applies (live-verified: `20260717090100` and `20260703010000` both sit at `statement_count = 0` while `pg_get_functiondef`/live catalog confirm their DDL is fully applied). The audit script's own message is the correct framing: a flagged row "usually means migration history was repaired as applied without running the SQL" — **verify production state against the migration file before concluding anything**, and never re-apply a flagged migration on the strength of the flag alone (most non-idempotent DDL will error or double-apply).

## Related

- [Parent Pointer Reconcile guide](20260716-parent-pointer-reconcile-guide-v1.00W.md) — the pointer-bump mechanics in detail
- [Edge Function Deploy guide](20260716-edge-function-deploy-guide-v1.00W.md) — the sibling pipeline for `supabase/functions/`, same stale-pointer risk applies
- `crm7/supabase/migrations/CLAUDE.md` — full operator ledger of every migration-history incident and how each was resolved
