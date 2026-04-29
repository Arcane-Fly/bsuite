# Schema Builder — Phase 3 Plan

**Package:** `@bsuite/schema-builder`
**Status:** W (Working)
**Target version:** `0.7.0` (Phase 3B), `0.9.0` (Phase 3C — future)
**Base:** `docs/20260504-schema-builder-phase-2-signoff-v1.00W.md`

---

## Overview

Phase 3 adds DDL-level field lifecycle operations to the schema builder: safe, opt-in, dry-run-by-default paths for column renames (3B), type changes (3C, future), and column drops (3D, future). Each operation is gated by:

1. Role check (admin/owner in `user_tenants`)
2. Identifier validation (regex before `format('%I')`)
3. Audit log write BEFORE execution (so failed attempts are captured)
4. Dry-run default (explicit `p_dry_run = false` required to execute DDL)

---

## §3.B — ALTER TABLE RENAME COLUMN (v0.7.0) ✅ COMPLETE

**Branch:** `copilot/feat-schema-builder-rename-column`
**PR:** Phase 3B feature

### What ships

#### 1. Database migration

`packages/schema-builder/src/supabase/migrations/20260506000000_rename_physical_column_rpc.sql`:

- **`schema_mutations_audit` table** — audit log for all DDL calls. Columns:
  `id`, `tenant_id`, `user_id`, `entity_id`, `field_id`, `operation`, `sql_preview`,
  `dry_run`, `succeeded`, `error_msg`, `created_at`.
  RLS: `schema_audit_tenant_admin_select` — tenant admins can SELECT their own rows only.

- **`rename_physical_column(p_entity_id, p_field_id, p_new_name, p_dry_run=true)` SECURITY DEFINER**:
  - `SET search_path = ''` at function level (SEC-EDGE-005 pattern)
  - Role check: caller must hold `admin` or `owner` in `user_tenants` for the entity's tenant
  - Identifier validation: `p_new_name` must match `^[a-z][a-z0-9_]{0,62}$`
  - Resolves `v_table_name` from `tenant_entities.name` for the given `p_entity_id`
  - Resolves `v_old_name` from `tenant_field_definitions.field_name` for the given `p_field_id`
  - Writes audit row BEFORE executing (captures all attempts)
  - `p_dry_run = true` (default): returns `{ would_execute, affected_views, affected_policies }` without DDL
  - `p_dry_run = false`: executes `format('ALTER TABLE %I RENAME COLUMN %I TO %I', ...)` AND updates `tenant_field_definitions.field_name` in one transaction

**Rollback SQL:**
```sql
DROP FUNCTION IF EXISTS public.rename_physical_column(uuid, uuid, text, boolean);
DROP TABLE IF EXISTS public.schema_mutations_audit;
```

#### 2. TypeScript types (`types.ts`)

New `RenamePreviewResult` interface:
```typescript
interface RenamePreviewResult {
  would_execute: string;
  affected_views: string[];
  affected_policies: string[];
}
```

#### 3. Service function (`service.ts`)

New `renamePhysicalColumn(client, entityId, fieldId, newName, dryRun=true)` that calls the RPC.

#### 4. Controller (`useSchemaController.ts`)

Two new methods on `SchemaController`:

- `renameField(entityId, fieldId, newName, { physical? })`:
  - `physical: false` (default): metadata-only, calls `updateEntityField`
  - `physical: true`: wet-run via RPC, calls `renamePhysicalColumn(..., false)`

- `previewRenameField(entityId, fieldId, newName)`:
  - Calls `renamePhysicalColumn(..., true)` — returns `RenamePreviewResult`
  - Intended to be wired into `FieldEditDialog.onPreviewRename`

#### 5. FieldEditDialog (`components/FieldEditDialog.tsx`)

- Updated Phase 2 JSDoc caveat to document the Phase 3B opt-in path
- New optional `onPreviewRename?: (newName: string) => Promise<RenamePreviewResult>` prop
- `FieldEditDialogPayload` extended with optional `physical?: boolean`
- `<details>` disclosure (shown only when `field_name` changes AND `onPreviewRename` is wired):
  - Labelled: "Also rename the underlying Postgres column (advanced, destructive)"
  - Checkbox + inline warning: "Raw SQL queries and views referencing the old column name will break. Metadata-driven widgets (Form Builder / Page Builder) are unaffected."
  - When Save is clicked with checkbox checked:
    1. Calls `onPreviewRename(newName)` — shows "Fetching dry-run preview…"
    2. On success: opens confirmation modal with proposed SQL + affected views/policies
    3. On user confirm → calls `onSave({ ..., physical: true })`
    4. On user cancel → dismisses confirmation, no changes
    5. On RPC error → shows error message in disclosure

#### 6. Tests

- 7 new Phase 3B `FieldEditDialog` tests (disclosure visibility, dry-run modal, confirm, cancel, error handling)
- 3 new `renamePhysicalColumn` service tests
- Package version bumped to `0.7.0`
- `tsconfig.json`: added `"types": ["@testing-library/jest-dom"]` to fix pre-existing typecheck failures

### Safety constraints (all met)

| Constraint | Status |
|---|---|
| Dry-run is the default | ✅ `p_dry_run boolean DEFAULT true` |
| `format('%I', ident)` — no raw concatenation | ✅ |
| `SET search_path = ''` at function level | ✅ |
| Role check before any side-effect | ✅ First thing after auth.uid() |
| Audit row written before ALTER TABLE | ✅ INSERT before EXECUTE |
| Regex validation before `format('%I', ...)` | ✅ `!~ '^[a-z][a-z0-9_]{0,62}$'` check |
| No `role="button"` regressions | ✅ All new elements use `<button type="button">` |

---

## §3.C — ALTER COLUMN TYPE (v0.9.0) — FUTURE

Not in scope for Phase 3B. Planned for a future phase with additional complexity:
- Type compatibility matrix (e.g., `text → varchar` safe; `text → int` unsafe)
- Shadow column pattern for safe type migrations
- Full dry-run with value-range checks

---

## §3.D — DROP COLUMN (v0.9.0) — FUTURE

Not in scope for Phase 3B. Would follow the same pattern as rename but with additional safety gates:
- Verify no active FK references to the column
- Require explicit `p_force boolean DEFAULT false` parameter for columns with data
