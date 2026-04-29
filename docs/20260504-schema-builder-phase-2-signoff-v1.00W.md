# Schema Builder — Phase 2 Signoff

**Package:** `@bsuite/schema-builder@0.5.0`
**Date:** 2026-05-04
**Status:** ✅ Working
**Supersedes:** `20260504-schema-builder-phase-1b-1c-signoff-v1.00W.md`
**Roadmap:** `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §3.6 items 4 + 7

---

## Summary

Phase 2 ships the second dialog in the field-CRUD pair — **`FieldEditDialog`** — plus the **`reflect_entity_schema` Postgres RPC** that backs the physical-column inspection hook (`useSchemaReflection`), plus the first **Playwright E2E coverage** for the schema builder dialogs on crm7.

With 0.5.0 live on npm, all four consumers (CRM7, BSU, Conduit, R80.3) are on the same canonical surface and the window.prompt placeholder from Phase 1b.2 is fully retired.

---

## 1. What Ships (v0.5.0)

### New components

- **`FieldEditDialog`** — sibling of `FieldCreateDialog` for editing an existing `tenant_field_definitions` row. Mirror-symmetric design on purpose:
  - Identical `useReducer` shape (`SET_NAME` / `SET_LABEL` / `SET_TYPE` / `SET_PLACEHOLDER` / `TOGGLE_REQUIRED` + new `INIT` action that seeds from a field)
  - Identical `SNAKE_CASE_RE` validation + min-length + uniqueness check (excluding the field's own current name)
  - Identical native `<dialog>` + imperative `showModal()` / `close()` lifecycle
  - Render-time reset pattern keyed on `field.id` so opening the dialog for a different field re-seeds atomically before paint
  - Adds a destructive **Delete Field** button (left-aligned, separate from Cancel/Save) guarded by `window.confirm("Delete field X? This cannot be undone.")`
  - `⚠ Rename semantics` warning in the file header: edits to `field_name` mutate metadata only; the underlying Postgres column is NOT renamed (deferred to Phase 3)

### Row affordance

- **`FieldRow.tsx`** — editable (non-primary, non-system) rows now render a real `<button>` pencil-icon with `aria-label="Edit field {name}"`. The outer `<div>` keeps `onDoubleClick` as a mouse shortcut but is ARIA-cleaned (no `role=button`, no `tabIndex`, no `aria-label`, no `onKeyDown`). Resolves the **WCAG 4.1.2 / ARIA 1.2 §5.2.8.4** violation where a `role=button` wrapper contained interactive React Flow `<Handle>` descendants.

### Canvas wiring

- **`SchemaCanvas`** — listens for the `bsuite-edit-field` CustomEvent, resolves the target field live from `controller.entities[entityId].fields[fieldId]` (no stale closure), renders `<FieldEditDialog>`, and routes:
  - `onSave(payload)` → `controller.updateField(fieldId, payload)`
  - `onDelete()` → `controller.deleteField(fieldId)` + closes the dialog

### Barrel exports restored + extended

- **`src/components/index.ts`** + **`src/index.ts`** now export (value + type):
  - `FieldCreateDialog`, `FieldEditDialog`
  - `FIELD_TYPE_OPTIONS`, `SNAKE_CASE_RE`
  - `FieldCreateDialogProps`, `FieldCreateDialogPayload`
  - `FieldEditDialogProps`, `FieldEditDialogPayload`
  - All previously-exported symbols preserved (`SmartEdgeMarkers`, `buildSmartEdgeStyle`, `getMarkerIdsForCardinality`, `EntityNodeType`, `EntityPropertiesPanelProps`, `CommandPaletteProps`, `CommandPaletteNavTarget`, `SchemaBuilderProps`, `SchemaBuilderHandle`, `SchemaToolbarProps`, etc.)

### Tests

- 14 new unit tests for `FieldEditDialog` (mirror of `FieldCreateDialog` tests + delete-confirm coverage)
- Suite total: **79/79 passing** (was 65/65 after Phase 1c)
- Typecheck clean, build clean

---

## 2. Database Migration — `reflect_entity_schema`

### What

New `SECURITY DEFINER` function that reflects the underlying Postgres column metadata for an entity's physical table, scoped to the caller's tenant via RLS-style guard.

```sql
CREATE OR REPLACE FUNCTION public.reflect_entity_schema(
  p_entity_name text,
  p_tenant_id uuid
) RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text,
  ordinal_position int
) LANGUAGE plpgsql SECURITY DEFINER ...
```

### Migration file

- `packages/schema-builder/src/supabase/migrations/20260504000000_schema_reflection_rpc.sql`
- Shipped inside the package so consumers can apply it from their own migration runners when needed.

### Applied

- **Applied to Supabase project `tuybltdrdefjblnplpqo`** on 2026-05-04 via the pooler-bypass route (`dig @8.8.8.8` → hardcoded IP → `psql host=... hostaddr=... sslmode=require`).
- **Smoke-tested:** `SELECT proname, prosecdef, pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'reflect_entity_schema'` → returns the expected row, `prosecdef=true`, signature matches.

### Consumer wiring

- Called by the existing `useSchemaReflection` hook for physical-column inspection (vs. the metadata-only `tenant_field_definitions` reads that power the canvas today).
- Supports §3.6 item 4 of the WYSIWYG roadmap ("reflect real column shape, not just the metadata row") and unblocks Phase 3's coordinated `ALTER TABLE` rename path.

---

## 3. E2E Tests (crm7)

New Playwright spec at **`crm7/tests/e2e/schema-builder-field-dialogs.spec.ts`** with 4 tests:

1. **`route renders`** — canvas / access-denied / login sanity. Fails hard on a blank page; passes on any of the three valid production states.
2. **`Cmd+K opens the command palette`** — when the canvas is available, verifies the command palette shows the canonical `Add Field` / `Tidy Up` actions. Falls back from `Meta+K` to `Control+K` for cross-platform reliability.
3. **`Add Field via Cmd+K opens FieldCreateDialog with snake_case validation`** — full form walkthrough: empty → disabled, `"a"` → "must be at least 2 chars", `"9bad"` → "must be snake_case", `"e2e_smoke_field"` → enabled. Cancels out without committing (no DB mutation).
4. **`clicking the edit button on a non-primary field row opens FieldEditDialog`** — locates the real `<button aria-label="Edit field …">` pencil, single-clicks it, asserts the "Edit Field in …" heading is visible, cancels out cleanly.

**Graceful skips:** each deeper test checks for the canvas/entity presence and `test.skip()`s with a readable reason when auth or seed data is missing. Preview-server safe.

**Runtime budget:** under 120s total wall time, no flake-risk network writes.

---

## 4. Rollout to Consumers

| Repo | Branch | Bump | Notes |
|------|--------|------|-------|
| bsuite (parent) | `feat/phase-2-field-edit-dialog` | `packages/schema-builder@0.5.0` + signoff doc + submodule pointer bumps | — |
| crm7 | `feat/phase-2-schema-builder-0.5.0` | `^0.4.0 → ^0.5.0` + E2E spec | Lockfile regen requires copying `patches/` alongside `package.json` (pnpm.overrides references `file:./patches/node-domexception`) |
| business-suite-unified | `feat/phase-2-schema-builder-0.5.0` | `^0.4.0 → ^0.5.0` | Clean |
| conduit | `feat/phase-2-schema-builder-0.5.0` | `^0.4.0 → ^0.5.0` | Clean |
| R80.3 | `feat/phase-2-schema-builder-0.5.0` | `^0.4.0 → ^0.5.0` | Clean |

**Lockfile pattern** (per `AGENTS.md`):

```bash
# Generic consumer:
mkdir /tmp/<app>_lockgen
cp <app>/package.json /tmp/<app>_lockgen/
cd /tmp/<app>_lockgen && pnpm install --lockfile-only
cp pnpm-lock.yaml <app>/pnpm-lock.yaml

# crm7 additionally:
cp -r crm7/patches /tmp/crm7_lockgen/
```

All four consumer typechecks clean under local symlink (`node_modules/@bsuite/schema-builder → ../../../packages/schema-builder`) before push.

---

## 5. ARIA / Accessibility Notes

**Why this matters for future maintainers:**

- **WCAG 4.1.2 Name, Role, Value.** The pencil button has a computable accessible name via `aria-label={`Edit field ${field.name}`}`. Screen readers announce e.g. "Edit field email_address, button".
- **ARIA 1.2 §5.2.8.4 (Presentational Children Rule).** `role=button` may not contain interactive descendants. The prior FieldRow put `role=button` on a `<div>` that rendered four React Flow `<Handle>` components as children — those Handles are focusable DOM nodes, which violated the rule. The fix promotes the edit affordance to a dedicated inner `<button>` element and demotes the wrapper to a plain `<div>`.
- **Keyboard.** The pencil button is tab-focusable (opacity 50 baseline, 100 on hover/focus), focus ring visible (`focus:ring-2 focus:ring-blue-500`), activates on Space/Enter by default (native button behaviour).
- **Mouse parity.** Users who learned the "double-click to edit" gesture on the row still get it — `onDoubleClick` is preserved on the wrapper. Discovery is now better because the pencil icon is always visible (not hover-gated).

---

## 6. Files Changed (packages/schema-builder/)

### Added

- `src/components/FieldEditDialog.tsx` — new dialog (~310 LOC)
- `src/__tests__/FieldEditDialog.test.tsx` — 14 new unit tests
- `src/supabase/migrations/20260504000000_schema_reflection_rpc.sql` — `reflect_entity_schema` SECURITY DEFINER function

### Modified

- `package.json` — version `0.4.0 → 0.5.0`, description updated
- `src/index.ts` — add `FieldEditDialog`, `FIELD_TYPE_OPTIONS`, `SNAKE_CASE_RE` value exports; add `FieldEditDialogProps`, `FieldEditDialogPayload`, `FieldCreateDialogProps`, `FieldCreateDialogPayload` type exports; restore barrel exports for `SmartEdgeMarkers`, `EntityNodeType`, `SchemaBuilderProps`, etc.
- `src/components/index.ts` — export `FieldEditDialog` + re-export `FieldCreateDialog` named values alongside; restore all prior component + type exports (`SmartEdgeMarkers`, `buildSmartEdgeStyle`, `getMarkerIdsForCardinality`, `EntityNodeType`, `EntityPropertiesPanelProps`, `CommandPaletteProps`, `CommandPaletteNavTarget`, `SchemaBuilderProps`, `SchemaBuilderHandle`, `SchemaToolbarProps`)
- `src/components/FieldRow.tsx` — add inner pencil `<button>` edit affordance; remove `role="button"` / `tabIndex` / `aria-label` / `onKeyDown` from outer wrapper; keep `onDoubleClick`; add WCAG / ARIA rationale to header JSDoc
- `src/components/SchemaCanvas.tsx` — subscribe to `bsuite-edit-field` CustomEvent, render `<FieldEditDialog>`, route `onSave` / `onDelete` to the controller

### Added (crm7 submodule)

- `tests/e2e/schema-builder-field-dialogs.spec.ts` — 4 Playwright tests covering route sanity, Cmd+K palette, FieldCreateDialog validation, FieldEditDialog pencil-click

---

## 7. Known Follow-ups (deferred to Phase 3)

- **Physical column rename via `ALTER TABLE`.** `FieldEditDialog` currently updates `tenant_field_definitions.field_name` metadata only. Widgets bound to the physical column name via raw SQL will break if the metadata row is renamed; metadata-driven widgets (Form Builder, Page Builder) are unaffected. The dialog's file-header `⚠ Rename semantics` warning documents this. Phase 3 will add a coordinated `ALTER TABLE ... RENAME COLUMN` migration path + a consumer-facing confirmation dialog.
- **Seeded E2E tenant + `storageState`.** The current E2E spec skips gracefully when the preview server is unauthenticated or the canvas has no entities. Phase 3 to add a seeded test tenant (via Supabase CLI + a fixture migration) + an `auth.setup` that writes a real `storageState.json` so all 4 tests run end-to-end in CI.
- **FieldRow keyboard reorder.** Drag-to-reorder rows via keyboard (arrow keys when focused on the field row) — tracked in §3.6 item 5 of the WYSIWYG roadmap.

---

## 8. Verification Checklist

| Check | Result |
|-------|--------|
| `pnpm typecheck` (package) | ✅ clean |
| `pnpm test` (package) | ✅ 79/79 |
| `pnpm build` (package) | ✅ clean |
| `npm view @bsuite/schema-builder version` | ✅ `0.5.0` |
| `reflect_entity_schema` exists on `tuybltdrdefjblnplpqo` | ✅ smoke-tested (`pg_proc` lookup) |
| `prosecdef=true` on `reflect_entity_schema` | ✅ confirmed |
| 4 consumer typechecks under symlinked local package | ✅ all clean |
| 4 consumer lockfiles standalone (`.:` importer, Vercel-safe) | ✅ verified |
| crm7 `patches/` copied into lockgen tmp dir | ✅ resolved `ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND` |
| Playwright spec under 120s wall time | ✅ |

---

## 9. Credits

- Editor-multi-prompt (Strategy B for FieldEditDialog + E2E) — mirror-symmetric reducer, render-time reset keyed on `field.id`, live field lookup avoiding stale closures, graceful E2E skips
- Editor-multi-prompt (ARIA + barrel restoration pass) — WCAG 4.1.2 / ARIA 1.2 compliant pencil-button affordance, combined value+type export blocks
- Code-reviewer-multi-prompt × 3 rounds — caught the `role=button` interactive-descendants violation and the missing barrel exports before publish

---

**Next: Phase 3** — physical column rename coordination, seeded E2E tenant, keyboard reorder.
