# Migration FK Index Checklist (pgTAP A1 / R1)

> **Naming:** `20260724-migration-fk-index-checklist-v1.00W.md` · Status **W**

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Every new `REFERENCES` column in a migration **must** get an index whose **leading**
column is that FK column, in the **same** migration file.

## Why

Postgres needs a leading-column index on the referencing side for two things: lookups
by the FK, and the referential-action scan run when a **parent** row is deleted or its
key updated. Without one, deleting a single parent row sequentially scans the whole
child table — which is how this class shows up in production, long after the migration
looked fine.

pgTAP suite `09_missing_fk_indexes.sql` fails CI when a public FK lacks an index. Hit
three times by hand in 2026-07 (`org_documents`, `email_message_links`, …).

**Leading column, specifically.** An index on `(tenant_id, owner_id)` does *not*
accelerate a lookup by `owner_id` alone, so "the column appears somewhere in the index"
is not the test. The checker enforces first-position.

## Rule

```sql
CREATE TABLE public.example (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id)
);

-- REQUIRED — an index leading with each FK column
CREATE INDEX IF NOT EXISTS idx_example_created_by ON public.example (created_by);
CREATE INDEX IF NOT EXISTS idx_example_tenant_id ON public.example (tenant_id);
```

## CI

`scripts/check-migration-fk-indexes.mjs` (parent repo), run by
`.github/workflows/migration-fk-index-lint.yml` on pull requests into `main` or
`development` that touch `**/supabase/migrations/**.sql`.

```bash
# whatever you pass — self-contained, no DB connection needed
node scripts/check-migration-fk-indexes.mjs path/to/migration.sql
pnpm lint:migration-fk-indexes path/to/migration.sql

# prove the checker can still fail (the workflow runs this first)
node scripts/check-migration-fk-indexes.mjs --self-test
```

### Scope is PR-delta only — deliberately

The workflow checks **only migration files added or modified in the PR**, not the repo.
As of 2026-07-29 there are pre-existing violations across the submodules:

| Repo | Migrations | Files with an unindexed FK |
|---|---|---|
| crm7 | 397 | 131 |
| business-suite-unified | 94 | 15 |
| R80.3 | 30 | 12 |
| braden | 46 | 6 |
| conduit | 29 | 3 |

A repo-wide gate could therefore never go green, and gating on it would simply be
switched off. Delta scoping stops **new** debt accruing today without blocking on a
retro-fix sweep. The existing rows are backlog, not a CI failure.

Most of the existing hits are audit columns (`created_by`, `approved_by`,
`uploaded_by`, `verified_by`) referencing `auth.users`. They are low-read but they are
exactly the ones that make a user deletion scan every child table, so the retro-fix is
worth scheduling — it is not cosmetic.

## Exceptions

- A FK column that is itself the leading column of the table's `PRIMARY KEY` or a
  `UNIQUE` constraint is already indexed by the backing index; the checker accepts both.
- Partial and expression indexes count if the FK column is first in the column list.

## Implementation note

The checker is a token walk, not a regex matcher, per the repo's No-Regex-by-Default
discipline (`CLAUDE.md` › Code Quality).

The original 2026-07-24 implementation was regex-based and **silently passed every
violating file**: its column-definition pattern used the character class
`[\w\s\[\]]`, which excludes `.`, so `ALTER TABLE public.x ADD COLUMN y uuid
REFERENCES …` — the dominant form in this repo — never matched. It also parsed
`ADD COLUMN IF NOT EXISTS foo` as a column literally named `if`. Both are fixed, and
both are covered by `--self-test` cases so a regression is caught rather than passing
quietly.

That failure mode is the reason the workflow runs `--self-test` **before** the real
check: a gate whose pass and no-op states are indistinguishable hides defects
indefinitely (see bsuite#1688).
