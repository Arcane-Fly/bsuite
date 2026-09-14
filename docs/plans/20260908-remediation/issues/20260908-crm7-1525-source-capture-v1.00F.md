---
kind: record
authority: none
owner: bsuite
---

# Audit for other stamped-but-never-run migrations (funding_programs found by accident)

https://github.com/GaryOcean428/crm7/issues/1525

Snapshot updatedAt: 2026-08-24T03:27:04Z. Open at capture; re-read live.

## What happened

While wiring the funding-programs dropdown (crm7#1473) I found that `20260301201400_funding_eligibility.sql` is **recorded in `supabase_migrations.schema_migrations` but its body never executed** — both tables it creates (`funding_programs`, `funding_milestones`) are absent from production. Fixed for those two tables in #1524.

**I found this by accident.** The repaired pgTAP replay gate rejected my new migration for referencing a table that does not exist. Nothing was looking for this class of defect.

## Why the existing audit does not catch it

`prod-migration-history-audit.yml` flags rows with `statement_count = 0`. This row has a **populated** `statements[]` array — it is the *tracked-but-not-live* class already documented in `supabase/migrations/CLAUDE.md` (2026-07-04 section), which recorded four examples then and explicitly warned:

> "tracked in `schema_migrations` with a non-zero `statement_count`" is **not sufficient evidence a migration was applied**.

So this is a **known class with no automated detector**. Four instances were found by hand in July; a fifth (this one) surfaced in August by accident, five months after it was recorded.

## Scope of the gap

- 585 recorded migrations
- 371 tables in `public`
- No check asserts that a recorded migration's objects actually exist

## What to build

A check that, for every recorded migration, extracts the object names it claims to create (`CREATE TABLE`, `CREATE FUNCTION`, `CREATE INDEX`, `ADD COLUMN`) and asserts each resolves live. Report, do not auto-repair — `CLAUDE.md` is explicit that a zero-statement row must not be auto-repaired, and the same caution applies here.

Known false-positive sources to handle, or the check will be ignored:
- objects deliberately dropped by a **later** migration (walk the whole tree, not one file)
- deliberate tombstones (renamed-not-dropped, e.g. crm7 `ee4f3f39`, `91089e27`)
- conditional DDL inside `DO` blocks / `to_regclass` guards
- migrations targeting the `catalog` schema, whose DDL another submodule owns

## Acceptance criteria

- Running it today reports `20260301201400` as satisfied (after #1524) and lists any others still outstanding
- **Negative control**: with a known-live table's `CREATE` pointed at a nonexistent name, the check fails. A detector that cannot fail is not a detector.
- Output names the migration version, the missing object, and whether a later migration explains the absence

## Validation loop
§9.1 output-equivalence — baseline is the current live catalogue.

## Cross red-team
Verify the negative control genuinely fails before accepting the result.

## Skills to load
`supabase`, `test-verify-before-completion`

Found via crm7#1473 / #1524.
