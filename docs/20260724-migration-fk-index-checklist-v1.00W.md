# Migration FK Index Checklist (pgTAP A1 / R1)

> **Naming:** `20260724-migration-fk-index-checklist-v1.00W.md` · Status **W**

Every new `REFERENCES` column in a migration **must** get a leading btree index in the **same** migration file.

## Why

pgTAP suite `09_missing_fk_indexes.sql` fails CI when a public FK lacks an index. Hit three times in 2026-07 (org_documents, email_message_links, …).

## Rule

```sql
CREATE TABLE public.example (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id)
);

-- REQUIRED — one index per FK column (leading column of a composite is OK)
CREATE INDEX IF NOT EXISTS idx_example_created_by ON public.example (created_by);
CREATE INDEX IF NOT EXISTS idx_example_tenant_id ON public.example (tenant_id);
```

## CI

`crm7/scripts/check-migration-fk-indexes.mjs` runs on changed migrations via `.github/workflows/db-lint.yml`.

```bash
node scripts/check-migration-fk-indexes.mjs path/to/migration.sql
```

## Exceptions

Primary key columns already indexed. Partial/expression indexes that lead with the FK column satisfy the script if the column appears first in the index column list.
