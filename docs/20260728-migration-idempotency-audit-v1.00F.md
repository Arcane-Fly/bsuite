---
kind: record
authority: none
owner: bsuite
---

# Migration Idempotency Audit — 2026-07-28

**Task:** Gap Remediation Plan Task 3 (P0-2) — reconcile the migration ledger.
**Scope:** the 18 in-window migrations named in the task brief as "applied out-of-band,

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

absent from `supabase_migrations.schema_migrations`" (17 above `MIGRATION_FLOOR`
`20260611000000` plus one pre-floor file noted for completeness).
**What this document is:** a per-file idempotency verdict + evidence of a
live-catalog check performed 2026-07-28. **No migration was applied, no DDL was
executed, and no ledger row was hand-inserted by this task** — see §3.

---

## 0. Headline finding — the premise has partially changed since the brief was written

The brief states the 18 migrations are **absent** from `supabase_migrations.schema_migrations`
and warns the fixed applier (commit `86750146`) will attempt to **re-apply all of
them** on its next run, risking a partial-transaction failure if any is not
idempotent.

A **read-only** `SELECT` against `supabase_migrations.schema_migrations` (Supabase
MCP `execute_sql`, project `tuybltdrdefjblnplpqo`, 2026-07-28) — permitted under
this task's constraints, which forbid applying/executing DDL and hand-inserting
rows but not reading the catalog — shows:

> **All 17 above-floor migration versions in this audit's scope now have a row
> in `supabase_migrations.schema_migrations`.** Zero are actually absent as of
> this check.

This means the specific failure mode the brief describes (`grep -qxF "$VERSION"`
in `.github/workflows/supabase-migrate.yml`'s apply step returns no match →
attempt to re-run the file) **will not fire for any of these 17 on the next
applier run**, because the applier's skip logic is a pure version-string
presence check (confirmed by reading the workflow — not modified, per the
"do not touch `.github/workflows/`" constraint):

```bash
if echo "$APPLIED" | grep -qxF "$VERSION"; then
  SKIPPED_COUNT=$((SKIPPED_COUNT + 1)); continue
fi
```

Any row — even one with an empty `statements` array — causes a skip. The
ledger gap that motivated this task has evidently been substantially closed
between the plan being authored and this task running (most likely: the
applier itself ran on a subsequent merge now that its path-glob is fixed,
and recorded these versions as it went; commit `66c0958e` "Merge pull request
#1679" and prior invite-guarded merges landed on `development` since the plan's
07:45Z snapshot).

**This does not make the idempotency audit moot.** Two reasons the deliverable
still stands as written:

1. **Defense in depth.** If the ledger is ever reconciled/reset again (this has
   happened before — see `crm7/supabase/migrations/CLAUDE.md`'s multi-month
   `#758` reconciliation history), these files will be replayed directly and
   must still be safe. The verdicts below are evaluated **as if the ledger
   rows did not exist**, per the brief's instructions.
2. **A residual drift class exists** among these 17: 5 of them (see §2 table,
   "Ledger content" column) are tracked with an **empty `statements[]` array**
   despite the live objects existing — the same "tracked but not faithfully
   recorded" pattern documented in crm7's migrations `CLAUDE.md` (2026-06-10
   and 2026-07-04 sections). This is a **ledger-fidelity** concern for Task 2's
   revived prod-migration-history-audit to catch, not a re-application risk —
   flagged here for completeness, not fixed (out of this task's scope).

Live-catalog evidence (read-only, 2026-07-28, project `tuybltdrdefjblnplpqo`):

| Check | Result |
|---|---|
| `rcti_invoices` | exists |
| `rcti_batches` | **absent** (pre-floor `rcti_schema` correctly skipped) |
| `rcti_lines` | **absent** (same) |
| `org_documents`, `email_message_links`, `funding_offsets`, `case_notes`, `sta_inbound_emails`, `training_contract_status_confirmations`, `enterprise_licence_events` | all exist |

This matches the brief's asserted live facts exactly — no contradiction there,
only in the ledger-row-presence claim.

---

## 1. Method

For each file: read the full migration, checked every DDL/DML statement against
the six unsafe patterns named in the brief (bare `CREATE TABLE`/`CREATE INDEX`/
`CREATE TYPE` without `IF NOT EXISTS`; `CREATE POLICY` without a preceding
`DROP POLICY IF EXISTS`; unguarded `ADD COLUMN`/`ADD CONSTRAINT`; unguarded
`::regclass` casts; seed `INSERT`s without `ON CONFLICT`; `CREATE FUNCTION`
without `OR REPLACE`), then cross-checked the live catalog for the objects
each file creates (§0 table) to confirm the "already applied out-of-band"
premise. **No migration was executed as part of this check** — the live-object
existence check is a `to_regclass()`/`information_schema` read, and the ledger
check is a `SELECT`.

## 2. Verdict table (17 above-floor migrations)

| # | Repo | Migration | Verdict | Ledger row? (2026-07-28) | Ledger content |
|---|---|---|---|---|---|
| 1 | crm7 | `20260724090000_org_documents` | **SAFE** | yes | 37 statements (populated) |
| 2 | crm7 | `20260724100000_org_documents_fk_indexes` | **SAFE** | yes | 2 statements (populated) |
| 3 | crm7 | `20260725093000_error_log_anon_insert` | **SAFE** | yes | 5 statements (populated) |
| 4 | crm7 | `20260725160000_create_sub_organization` | **SAFE** | yes | 4 statements (populated) |
| 5 | crm7 | `20260725161000_create_sub_organization_revoke_anon` | **SAFE** | yes | 3 statements (populated) |
| 6 | crm7 | `20260726090000_email_message_links` | **SAFE** | yes* | 15 statements (populated) |
| 7 | crm7 | `20260726100000_email_message_links_fk_indexes` | **SAFE** | yes | 1 statement (populated) |
| 8 | crm7 | `20260727120000_case_notes_rls_setof` | **SAFE** | yes | 8 statements (populated) |
| 9 | crm7 | `20260727130000_money_integrity_batch` | **SAFE** | yes | 16 statements (populated) |
| 10 | crm7 | `20260727230000_funding_claim_rpc_status_align` | **SAFE** | yes | 8 statements (populated) |
| 11 | conduit | `20260725090000_training_contract_email_ingestion` | **SAFE** | yes | **0 statements (empty — see §0.2)** |
| 12 | conduit | `20260725091000_sta_email_watch_cron` | **SAFE** | yes | **0 statements (empty)** |
| 13 | conduit | `20260725094000_align_rls_authenticated_scope` | **SAFE** | yes | **0 statements (empty)** |
| 14 | conduit | `20260725140000_confirm_sta_email_atomic` | **SAFE** | yes | **0 statements (empty)** |
| 15 | business-suite-unified | `20260728120000_enterprise_licence_events` | **SAFE** | yes | 12 statements (populated) |
| 16 | R80.3 | `20260725150000_funding_offsets_placement_scheme_unique` | **SAFE** | yes | **0 statements (empty)** |
| 17 | R80.3 | `20260726090000_funding_offsets` | **SAFE** | yes* | see note* |

\* `20260726090000` collides between crm7 (`email_message_links`) and R80.3
(`funding_offsets`) — both files share the same timestamp. This is the
pre-existing, already-filed collision **bsuite#1682** (out of scope for this
task per the brief). The single shared ledger row at that version currently
holds `email_message_links`'s 15 statements; R80.3's `funding_offsets` content
is not separately representable under the current version scheme. This is a
ledger/versioning concern for #1682, not an idempotency defect in either file
— both files are independently SAFE on their own terms (verdict below is for
the file content, not the ledger slot).

**Not in this table:** `crm7/20260306000004_rcti_schema.sql` — pre-floor
(`MIGRATION_FLOOR = 20260611000000`), explicitly excluded by the brief as "not
a re-apply risk" because the applier's own floor check
(`if [ "$VERSION" \< "$MIGRATION_FLOOR" ]; then ... skip`) removes it from
consideration regardless of ledger state. Confirmed live: `rcti_invoices`
exists, `rcti_batches`/`rcti_lines` do not — consistent with this file never
having applied (matches the brief's stated live fact; not re-derived
differently here).

**All 17 above-floor migrations in scope are SAFE to re-apply.** Zero required
a guard change.

## 3. Per-file evidence (why each is SAFE)

### crm7

1. **`20260724090000_org_documents`** — `CREATE TABLE IF NOT EXISTS` ×3,
   `CREATE INDEX IF NOT EXISTS` throughout, `DROP POLICY IF EXISTS` before
   every `CREATE POLICY` (9 policies), `DROP TRIGGER IF EXISTS` before
   `CREATE TRIGGER`. No bare CREATEs found.
2. **`20260724100000_org_documents_fk_indexes`** — 2×
   `CREATE INDEX IF NOT EXISTS`. Nothing else.
3. **`20260725093000_error_log_anon_insert`** — 2 bare `GRANT` statements
   (idempotent in Postgres — re-granting an already-held privilege is a
   no-op, never an error) + `DROP POLICY IF EXISTS` before `CREATE POLICY`.
4. **`20260725160000_create_sub_organization`** — `CREATE OR REPLACE FUNCTION`
   + `REVOKE ALL` / `GRANT EXECUTE` (both idempotent). Function bodies are
   pure logic (INSERT ... ON CONFLICT (user_id, tenant_id) DO UPDATE for the
   membership row) — no bare CREATEs.
5. **`20260725161000_create_sub_organization_revoke_anon`** — 3× `REVOKE`/
   `GRANT` only, all idempotent.
6. **`20260726090000_email_message_links`** — a leading `DO $$ ... to_regclass`
   guard block that hard-fails only if `email_messages`/`tenants` are absent
   (both are live prerequisites, confirmed present); `CREATE TABLE IF NOT
   EXISTS`; `CREATE INDEX IF NOT EXISTS` ×3; `DROP POLICY IF EXISTS` before
   each of 3 `CREATE POLICY`.
7. **`20260726100000_email_message_links_fk_indexes`** — 1×
   `CREATE INDEX IF NOT EXISTS`.
8. **`20260727120000_case_notes_rls_setof`** — a `DO $$` block that
   dynamically enumerates and drops **every** existing policy on
   `case_notes` via `pg_policies` before recreating the 4 named policies +
   1 rename. Traced through two hypothetical re-applications by hand: the
   dynamic drop-all at the top means a second run starts from zero policies
   on the table every time — no name collision is possible on any replay
   count. **SAFE**, and more robust than a static `DROP POLICY IF EXISTS`
   list because it does not need to know the pre-migration policy names.
9. **`20260727130000_money_integrity_batch`** — `CREATE OR REPLACE FUNCTION`
   ×3 (`approve_funding_claim`, `reject_funding_claim`,
   `record_payment_atomic`); the one non-function block (RCTI unique
   constraint) is guarded twice — `to_regclass('public.rcti_invoices') IS
   NULL` skip (handles the pre-floor-skipped table case) AND a
   `pg_constraint` existence check before `ALTER TABLE ... ADD CONSTRAINT`.
   A duplicate-data guard additionally downgrades to `RAISE WARNING` (not an
   exception) if dupes exist, so it can never fail a replay even in that
   edge case.
10. **`20260727230000_funding_claim_rpc_status_align`** — `CREATE OR REPLACE
    FUNCTION` ×2 superseding the same two functions from file #9 above (by
    signature). Order-independent: whichever of #9/#10 runs last simply wins
    via `OR REPLACE`, regardless of replay order or count.

### conduit

11. **`20260725090000_training_contract_email_ingestion`** — `CREATE TABLE
    IF NOT EXISTS` ×2; a guarded FK add (`to_regclass('public.r7_offers') IS
    NOT NULL` + `information_schema.table_constraints` existence check before
    `ADD CONSTRAINT`); `CREATE INDEX IF NOT EXISTS` / `CREATE UNIQUE INDEX IF
    NOT EXISTS` throughout; `DROP POLICY IF EXISTS` before every `CREATE
    POLICY` (4 total); `GRANT`/`REVOKE` idempotent. A leading `DO $$` guard
    hard-fails only if `email_messages`/`tenants` are absent (both present
    live).
12. **`20260725091000_sta_email_watch_cron`** — wraps `cron.unschedule('sta-
    email-watch')` in a `BEGIN...EXCEPTION WHEN OTHERS THEN NULL` block (so
    "not yet scheduled" never errors), then unconditionally
    `cron.schedule(...)` with the same job name — re-registering a
    `pg_cron` job by name replaces it; the file is explicitly designed to be
    re-run.
13. **`20260725094000_align_rls_authenticated_scope`** — 5×
    `DROP POLICY IF EXISTS` immediately before the matching `CREATE POLICY`.
    No other DDL.
14. **`20260725140000_confirm_sta_email_atomic`** — `CREATE OR REPLACE
    FUNCTION confirm_sta_email` + idempotent `REVOKE`/`GRANT`.

### business-suite-unified

15. **`20260728120000_enterprise_licence_events`** — `CREATE TABLE IF NOT
    EXISTS`; `CREATE INDEX IF NOT EXISTS` ×4; `DROP POLICY IF EXISTS` before
    each of 3 `CREATE POLICY`; `GRANT` idempotent. (This file is also present,
    byte-identical, in the parent repo and in crm7 per the brief's stated
    finding — not re-verified independently here since the brief already
    confirmed the md5 match; not modified, per the brief's explicit
    instruction not to "fix" the triplication.)

### R80.3

16. **`20260725150000_funding_offsets_placement_scheme_unique`** — a `DO $$`
    block that `RETURN`s immediately if `to_regclass('public.funding_offsets')
    IS NULL` (so it no-ops cleanly if the table-creating migration hasn't run
    yet — self-documented as expected, since this file's timestamp sorts
    before `20260726090000_funding_offsets`), dedupes via `DELETE ... USING
    ranked` (a pure data operation, safe to re-run — a second run has nothing
    left to dedupe), then adds the unique constraint only if a
    `pg_constraint` row for it doesn't already exist.
17. **`20260726090000_funding_offsets`** — `CREATE TABLE IF NOT EXISTS`;
    guarded FK add (`to_regclass('public.apprentice_placements')` +
    `pg_constraint` check); `CREATE OR REPLACE FUNCTION
    funding_offsets_set_updated_at`; `DROP TRIGGER IF EXISTS` before `CREATE
    TRIGGER`; `DROP POLICY IF EXISTS` before each of 4 `CREATE POLICY`.

## 4. Guards applied

**None.** All 17 above-floor migrations in scope were already written with
correct environment-divergence guards by their original authors (each file's
own header comment already claims "Idempotent" / lists the guards used, and
this audit confirms those claims are accurate on a statement-by-statement
read). No SQL file was edited in crm7, conduit, business-suite-unified, or
R80.3 as part of this task. Where this document differs from the brief's
premise is the **ledger state** (§0), not the **file content** — there was
nothing left to guard.

## 5. What remains unverified (explicit self-report)

Per the task's own instruction, actual re-application was **not** run and
**cannot** be claimed as verified:

- **No dry-run re-apply was performed.** This audit is a static read of each
  file's DDL plus a live read of the object/ledger state — not a replay. If a
  file's guard logic has a subtle bug this read missed (e.g. a
  `pg_constraint` lookup that doesn't account for a renamed constraint), that
  would only surface on an actual second execution, which this task is
  explicitly forbidden from performing.
- **The `case_notes_rls_setof` dynamic-drop pattern (#8)** was traced by hand
  through a hypothetical two-run sequence, not executed. The reasoning is
  sound (drop-all-then-recreate has no name-collision surface on any replay
  count) but is still inference, not observed behavior.
- **The 4 conduit files + R80.3's `#16`** show an empty `statements[]` array
  in the ledger despite a ledger row existing. This audit does not know
  **how** that row was created (hand `repair --status applied`, an MCP
  `execute_sql` insert, or a partial applier run that recorded the version
  but failed to persist statement text) — only that it exists and is
  content-empty. This is flagged, not investigated further, since diagnosing
  it would likely require exactly the kind of DDL/ledger manipulation this
  task is barred from performing.
- **`bsuite#1682`'s `20260726090000` collision** is confirmed still present
  (one ledger row, two source files with different content) but, per the
  brief, fixing it is explicitly out of scope for this task.
- **Whether the applier's "next run" will exercise these files at all** is
  now moot for re-application (see §0 — all 17 already have ledger rows,
  so the version-skip fires), but this audit cannot predict future ledger
  resets, so the SAFE verdicts stand as the durable answer to "if these ran
  again from zero, would they succeed."

## 6. Files changed by this task

**None** in crm7, conduit, business-suite-unified, or R80.3. This document is
the only artifact added, in the parent repo only.
