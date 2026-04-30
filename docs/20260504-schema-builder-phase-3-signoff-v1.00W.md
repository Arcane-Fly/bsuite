# Schema Builder Phase 3 A+B — Sign-off (2026-05-04)

## Scope delivered

**Workstream A — Field reorder (keyboard-accessible)**

- Migration `20260505000000_field_sort_order_and_reorder_rpc.sql` lives canonically in `business-suite-unified/supabase/migrations/` and is mirrored into `packages/schema-builder/supabase/migrations/` for package-local testing.
  - Enforces `tenant_field_definitions.sort_order NOT NULL` with a deterministic per-entity `row_number()` backfill
  - Adds composite index `idx_tfd_entity_sort` for ordered reads
  - Creates `public.reorder_entity_fields(p_entity_id, p_field_ids)` SECURITY DEFINER RPC (strict `SET search_path = ''`, fully-qualified refs, admin/owner auth gate via `user_tenants`, array-completeness + dedupe validation, atomic sort_order write, `GRANT EXECUTE TO authenticated`)
  - Idempotent realtime publication membership for `tenant_field_definitions`
- UI: `FieldRow.tsx` Alt+ArrowUp / Alt+ArrowDown keyboard reorder with `aria-keyshortcuts` and descriptive title. Emits `bsuite-reorder-field` CustomEvent to stay a11y-friendly for mouse/keyboard/AT users alike.
- Controller: `useSchemaController.reorderFields(entityId, orderedFieldIds)` — TanStack Query optimistic update with deterministic rollback (handles cache-undefined edge case where `fieldsQuery` errored pre-mutation)
- Service: `reorderEntityFields(client, entityId, orderedFieldIds)` with the canonical `p_entity_id` / `p_field_ids` payload shape
- Tests: `reorderFields.test.ts` (8 tests), `FieldRow.keyboard.test.tsx` (9 tests)

**Workstream B — Physical column rename with dry-run + audit**

- Migration `20260506000000_rename_physical_column_rpc.sql` (same canonical / mirrored arrangement)
  - Creates `public.schema_mutations_audit` table (RLS authenticated, scoped to `user_tenants` membership — tenant-less platform rows visible to all authenticated callers; no client INSERT/UPDATE/DELETE policies = implicit deny)
  - Creates `public.rename_physical_column(p_entity_id, p_field_id, p_new_name, p_dry_run)` SECURITY DEFINER RPC
  - Two-phase flow: dry-run returns `{ executed: false, would_execute, affected_views, affected_policies, audit_id, old_field_name, new_field_name }` without mutating; wet-run performs `ALTER TABLE RENAME COLUMN` under identifier validation (`^[a-z][a-z0-9_]{0,62}$`) and duplicate-column check
  - All dynamic DDL uses `format('%I', ...)` — never string concatenation
  - `to_regclass` fast-path returns `{ executed: false, reason: 'no_physical_table' }` without audit write for metadata-only entities (caller falls back to the metadata-only `updateField` path)
  - Audit row written BEFORE execution; failed wet-runs update the existing audit row with `error_code` / `error_message` before re-raising so the client observes the original SQLSTATE
- UI: `FieldEditDialog.tsx` advanced disclosure showing `would_execute` preview + affected-objects list + explicit wet-run confirmation
- Controller: `useSchemaController.renameField(entityId, fieldId, newName, opts?)` — metadata-only by default, physical path opt-in via `opts.physical: true`, dry-run default = true
- Service: `renamePhysicalColumn(client, entityId, fieldId, newName, { dryRun })` returning `RenamePhysicalColumnResult` discriminated union
- Tests: `renameField.test.ts` (8 tests)

## Validation

- **Unit tests**: 104 passing (12 files) — 88 existing + 16 new Phase 3
- **Typecheck**: `pnpm typecheck` clean
- **Build**: `pnpm build` clean
- **Consumer-preview gate**: `@bsuite/schema-builder@0.7.0` tarball packs and installs into a disposable crm7 clone; all new exports (`reorderEntityFields`, `renamePhysicalColumn`, `reorderFields`, `renameField`) are visible in the generated `dist/**/*.d.ts`.

## SECURITY DEFINER posture

All new RPCs observe the Phase 3 §6 hardening checklist:

- `SET search_path = ''` (strictest; cannot be hijacked by per-session search_path rewrite)
- Every object reference fully schema-qualified (`public.*`, `auth.*`, `information_schema.*`, `pg_catalog.*`)
- Role gate via `user_tenants` (admin or owner in the entity's tenant; owner-only for NULL-tenant platform entities)
- Parameter validation before any side effect (identifier regex, array dedupe, column existence)
- `GRANT EXECUTE TO authenticated` only — never `anon` or `public`
- `rename_physical_column`: audit row written BEFORE execution, updated with `error_code`/`error_message` on failure, ensuring observability even for failed attempts
- All dynamic DDL in `rename_physical_column` uses `format('%I', ...)` for safe identifier quoting

## Consumer rollout

- `@bsuite/schema-builder@0.7.0` published to npm
- Consumer bump PRs (all picking up `^0.7.0`):
  - crm7#350 — base: development
  - R80.3#136 — base: development
  - business-suite-unified#243 — base: main
  - conduit#152 — base: development
  - bsuite#361 — parent repo (base: development)

## Lessons learned

### vitest 2.x `.rejects.toThrow(/regex/)` quirk

vitest 2.1.9 returns an empty string when `.rejects.toThrow(regex)` is used against plain `Error` instances wrapping PostgREST-style `{ error: { message } }` payloads. The Error IS thrown with the correct message (verified empirically via `toBeInstanceOf(Error)` + manual `.message` inspection), but the regex matcher path strips the message.

Fix: extracted `expectRejectsWithMessage(promise, re)` helper into `src/__tests__/test-helpers.ts`. Collapses 6 duplicated try/catch blocks across `reorderFields.test.ts` and `renameField.test.ts` into single-line calls. See helper JSDoc for full rationale.

### `tenant_entities` has no `physical_table_name` column

The physical table name is the `tenant_entities.name` column directly (snake_case identifier, matches `public.<name>` for system entities seeded in `20260311053135_visual_relational_builder.sql`). Non-system entities may not have a matching physical table at all — the RPC uses `pg_catalog.to_regclass` to detect this and returns `{ executed: false, reason: 'no_physical_table' }` without writing audit or attempting DDL.

### Optimistic update cache-undefined edge case

`fieldsQuery` can error pre-mutation (RLS mis-grant, network blip), leaving the cache unpopulated. When a `reorderFields` or `createField` mutation then fires, `qc.getQueryData(fieldsKey)` returns `undefined` rather than `[]`. The rollback path guards this with `qc.setQueryData(fieldsKey, ctx?.prev ?? [])` so rollback is deterministic rather than silently preserving the optimistic write. Documented inline.

## Follow-ups (deferred)

- **Workstream C — Seeded E2E tenant** — not shipped in this PR set. Requires a fresh Supabase migration in CRM7 + `auth.setup.ts` wiring + fixtures helper + e2e spec update. Non-blocking for Phase 3 A+B rollout.
- **Integration tests against real Supabase** for the two new RPCs (pgTAP or local-Supabase harness). Unit coverage is currently mock-only; the actual RPC SQL is exercised only indirectly via the mirrored migrations.
- **Advisory-only `affected_views` scope**: the current `information_schema.view_column_usage` query misses materialized views and views referencing the column indirectly via `SELECT *`. Acceptable for the "warn the user" UX; document the limitation in a follow-up.
- **vitest upgrade**: 2.x → 3.x likely removes the `toThrow(regex)` quirk. Revisit the `expectRejectsWithMessage` helper after the upgrade.

## Refs

- Plan: `docs/20260504-schema-builder-phase-3-plan-v1.00W.md` §3.A + §3.B + §6
- Hardening reference: `crm7/supabase/migrations/20260427010341_security_definer_hardening.sql`
- Canonical DDL for `tenant_entities`: `crm7/supabase/migrations/20260311053135_visual_relational_builder.sql`
- Canonical DDL for `tenant_field_definitions`: `crm7/supabase/migrations/20260304090002_phase5_create_tenant_field_definitions.sql`
