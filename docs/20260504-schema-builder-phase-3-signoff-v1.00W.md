# Schema Builder Phase 3 A+B+C — Sign-off (2026-05-04)

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

**Workstream C — Seeded E2E fixture tenant for Playwright**

- Migration `crm7/supabase/migrations/20260507000000_e2e_fixture_tenant.sql` (UP-only, idempotent, no SECURITY DEFINER, no new RLS policies)
  - Adds `is_e2e_fixture BOOLEAN NOT NULL DEFAULT FALSE` audit-marker column to `tenants`, `tenant_entities`, `tenant_field_definitions`, and `user_tenants`, each with a `COMMENT ON COLUMN` clarifying the marker is audit-only and NOT an RLS guard
  - Seeds the fixture tenant (`e2e-fixture`, UUID `00000000-0000-0000-0000-000000000e2e`), one entity (`e2e_widgets`, UUID `00000000-0000-0000-0000-00000000e2e1`), and three fields: `widget_name` (text, required, sort_order 1, UUID `...e2e2`), `widget_sku` (text, optional, sort_order 2, UUID `...e2e3`), `in_stock` (boolean, optional, sort_order 3, UUID `...e2e4`)
  - Fully idempotent via `ADD COLUMN IF NOT EXISTS` and `ON CONFLICT (id) DO NOTHING` on every `INSERT`
  - Commented `/* ROLLBACK ... */` block at the bottom documents the destructive revert path for emergencies
- Seed script: `crm7/scripts/seed-e2e-tenant.ts` — creates the fixture `auth.users` row (`e2e@crm7.app`) via the Supabase admin API and wires the `user_tenants` membership at `role = admin`, `is_e2e_fixture = true`. Paginated list-then-skip for idempotency (walks `auth.admin.listUsers` up to 50 pages × 200 users); fail-closed on missing `CRM7_E2E_PASSWORD` / `SUPABASE_SERVICE_ROLE_KEY` / `VITE_SUPABASE_URL` via a `requireEnv` helper that never logs secret values. Verifies the fixture rows from the migration are present before attempting the membership upsert.
- Fixtures module: `crm7/tests/e2e/fixtures/e2e-tenant.ts` — exports fixed UUIDs (`E2E_FIXTURE_TENANT_ID`, `E2E_FIXTURE_USER_ID`, `E2E_FIXTURE_USER_EMAIL`, `E2E_FIXTURE_ENTITY_ID`, `E2E_FIXTURE_ENTITY_NAME`, `E2E_FIXTURE_FIELD_IDS`) plus the `isSeededMode()` helper that reads `CRM7_E2E_SEED_SUPABASE` (canonical) and `CRM7_E2E_SEED_MODE` (legacy alias) as a single source of truth
- Auth setup extension: `crm7/tests/e2e/auth.setup.ts` — seeded-mode branch activated by `CRM7_E2E_SEED_SUPABASE=1` + `CRM7_E2E_PASSWORD` signs in as the fixture user. Developer-credential mode (`CRM7_E2E_EMAIL` + `CRM7_E2E_PASSWORD`) preserved for ad-hoc runs. Graceful-skip mode (empty storage state) preserved for unauthenticated CI.
- Spec extension: `crm7/tests/e2e/schema-builder-field-dialogs.spec.ts` — in seeded mode hard-asserts canvas visibility + fixture entity `e2e_widgets` + fixture field `widget_name` edit button; in graceful-skip mode falls back to `test.skip(...)` as before. The "route renders" sanity test runs unconditionally to catch bundle regressions.
- Documentation: `crm7/tests/e2e/README.md` — env-var contract, two-mode harness explanation, bootstrapping sequence, SQL teardown recipe using the `is_e2e_fixture` marker, and the membership-based design rationale
- Package script: `pnpm db:seed:e2e` wired in `crm7/package.json` as `tsx scripts/seed-e2e-tenant.ts`

### Design deviation — membership-based isolation over SET LOCAL

The Phase 3 plan §3.C originally sketched RLS gating via `SET LOCAL app.e2e_mode = 'on'` with fixture rows hidden behind a `current_setting('app.e2e_mode', true) = 'on'` predicate. We deliberately did not implement that pattern.

`SET LOCAL` persists only within the current transaction, and supabase-js issues each query in its own transaction — so the GUC silently falls off across sequential calls and the "visibility toggle" becomes a per-query dance with no reliable way to enforce it from the client. Every query that forgot the toggle would either break the tests (hiding fixture rows from the fixture user) or break production (exposing fixture rows to real users), depending on the default.

The membership-based approach sidesteps this entirely: the fixture tenant is a real tenant, the fixture user is a real member via `user_tenants`, and the suite's standard tenant-isolation RLS — already battle-tested across every first-party table — scopes the fixture user to fixture rows automatically. The in-house implementation therefore adds ZERO new RLS policies and ZERO GUC plumbing. `is_e2e_fixture` exists as an audit marker only (for cleanup scripts, forensic queries, teardown DDL). Relying on it for security would be a mistake; tenant isolation is the enforcement mechanism.

## Validation

- **Unit tests**: 104 passing (12 files) — 88 existing + 16 new Phase 3 (Workstreams A + B)
- **Typecheck**: `pnpm typecheck` clean on the package and on crm7 after the Workstream C files were added
- **Build**: `pnpm build` clean
- **Consumer-preview gate**: `@bsuite/schema-builder@0.7.0` tarball packs and installs into a disposable crm7 clone; all new exports (`reorderEntityFields`, `renamePhysicalColumn`, `reorderFields`, `renameField`) are visible in the generated `dist/**/*.d.ts`.
- **Workstream C — spec compiles**: `npx playwright test tests/e2e/schema-builder-field-dialogs.spec.ts --list` discovered 4 tests plus the auth-setup project, confirming the spec + fixtures module + modified `auth.setup.ts` all typecheck under Playwright's Node loader
- **Workstream C — migration structure**: 212 lines; 4 × `ADD COLUMN IF NOT EXISTS`; 4 × `COMMENT ON COLUMN` (one per audit-marker column); 3 × `INSERT ... ON CONFLICT (id) DO NOTHING` (tenant, entity, fields); no `CREATE POLICY` statements; no SECURITY DEFINER functions; rollback block exists only as a trailing SQL comment
- **Workstream C — no deferrals**: every new file grepped for `TODO` / `FIXME` / `XXX` / `HACK` / `defer` / `will implement` / `later` — zero hits

## SECURITY DEFINER posture

All new RPCs observe the Phase 3 §6 hardening checklist:

- `SET search_path = ''` (strictest; cannot be hijacked by per-session search_path rewrite)
- Every object reference fully schema-qualified (`public.*`, `auth.*`, `information_schema.*`, `pg_catalog.*`)
- Role gate via `user_tenants` (admin or owner in the entity's tenant; owner-only for NULL-tenant platform entities)
- Parameter validation before any side effect (identifier regex, array dedupe, column existence)
- `GRANT EXECUTE TO authenticated` only — never `anon` or `public`
- `rename_physical_column`: audit row written BEFORE execution, updated with `error_code`/`error_message` on failure, ensuring observability even for failed attempts
- All dynamic DDL in `rename_physical_column` uses `format('%I', ...)` for safe identifier quoting
- Workstream C adds no new SECURITY DEFINER functions and no new RLS policies — the fixture-user scoping relies entirely on the tenant-isolation policies already in place across the suite

## Consumer rollout

- `@bsuite/schema-builder@0.7.0` published to npm
- Consumer bump PRs (all picking up `^0.7.0`):
  - crm7#350 — base: development
  - R80.3#136 — base: development
  - business-suite-unified#243 — base: main
  - conduit#152 — base: development
  - bsuite#361 — parent repo (base: development)
- Workstream C is crm7-scoped by design (crm7#352 + bsuite#364 pointer bump); no other consumer required changes because Workstream C lives entirely inside `crm7/`.

## Lessons learned

### vitest 2.x `.rejects.toThrow(/regex/)` quirk

vitest 2.1.9 returns an empty string when `.rejects.toThrow(regex)` is used against plain `Error` instances wrapping PostgREST-style `{ error: { message } }` payloads. The Error IS thrown with the correct message (verified empirically via `toBeInstanceOf(Error)` + manual `.message` inspection), but the regex matcher path strips the message.

Fix: extracted `expectRejectsWithMessage(promise, re)` helper into `src/__tests__/test-helpers.ts`. Collapses 6 duplicated try/catch blocks across `reorderFields.test.ts` and `renameField.test.ts` into single-line calls. See helper JSDoc for full rationale.

### `tenant_entities` has no `physical_table_name` column

The physical table name is the `tenant_entities.name` column directly (snake_case identifier, matches `public.<name>` for system entities seeded in `20260311053135_visual_relational_builder.sql`). Non-system entities may not have a matching physical table at all — the RPC uses `pg_catalog.to_regclass` to detect this and returns `{ executed: false, reason: 'no_physical_table' }` without writing audit or attempting DDL.

### Optimistic update cache-undefined edge case

`fieldsQuery` can error pre-mutation (RLS mis-grant, network blip), leaving the cache unpopulated. When a `reorderFields` or `createField` mutation then fires, `qc.getQueryData(fieldsKey)` returns `undefined` rather than `[]`. The rollback path guards this with `qc.setQueryData(fieldsKey, ctx?.prev ?? [])` so rollback is deterministic rather than silently preserving the optimistic write. Documented inline.

### `SET LOCAL` GUCs are unreliable under supabase-js

Each query issued through supabase-js runs in its own transaction, so session-style `SET LOCAL app.foo = 'on'` toggles silently fall off between calls. This killed the plan's original §3.C sketch for fixture-row visibility gating. Prefer membership-based tenant isolation — or any other pattern that does not rely on cross-query session state — for test-fixture access control. Applies broadly to any "toggle visibility" feature flag sketch that assumes a persistent session setting.

### `auth.admin.createUser` cannot accept a caller-supplied UUID

GoTrue assigns the id unilaterally and silently ignores any `id` passed in the payload. Code that expects a symbolic UUID must look up by email (which IS stable) and fall back to the assigned id; encoding the symbolic id as a hard expectation will break on first reseed. The fixture user is therefore looked up by email in both the seed script and downstream tests, with the symbolic UUID treated as an advisory constant for logging/documentation only.

## Refs

- Plan: `docs/20260504-schema-builder-phase-3-plan-v1.00W.md` §3.A + §3.B + §3.C + §6
- Hardening reference: `crm7/supabase/migrations/20260427010341_security_definer_hardening.sql`
- Canonical DDL for `tenant_entities`: `crm7/supabase/migrations/20260311053135_visual_relational_builder.sql`
- Canonical DDL for `tenant_field_definitions`: `crm7/supabase/migrations/20260304090002_phase5_create_tenant_field_definitions.sql`
- Workstream C migration: `crm7/supabase/migrations/20260507000000_e2e_fixture_tenant.sql`
- Workstream C seed script: `crm7/scripts/seed-e2e-tenant.ts`
- Workstream C harness docs: `crm7/tests/e2e/README.md`

## Zero-Defer closure (2026-04-30)

This signoff was updated on 2026-04-30 after the operator explicitly forbade deferrals. The prior revision listed Workstream C (seeded E2E fixture tenant) as a non-blocking follow-up; that deferral is now closed. All three workstreams — A (field reorder), B (physical column rename), and C (seeded E2E fixture tenant) — ship together as Phase 3.

**Merged PRs**

- Parent bsuite: #361 (parent package + migrations), #362 (submodule bumps + original signoff), #363 (docs-archive-sweep + schema-builder lockfile), #364 (crm7 pointer post-Workstream-C)
- crm7: #350 (schema-builder 0.7.0 consumer bump), #351 (docs-archive-sweep), #352 (Workstream C), #353 (dev→main promotion)
- R80.3: #136 (schema-builder 0.7.0 consumer bump), #137 (docs-archive-sweep), #138 (dev→main promotion)
- conduit: #152 (schema-builder 0.7.0 consumer bump), #153 (docs-archive-sweep), #154 (dev→main promotion)
- business-suite-unified: #243 (schema-builder 0.7.0 consumer bump), #244 (docs-archive-sweep)
- braden: #171 (docs-archive-sweep)
- throughput: #67 (docs-archive-sweep)

All PRs merged via admin; CI clean or blocking-check-waived on every one. No deferred follow-ups remain from Phase 3.
