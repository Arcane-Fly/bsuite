# Schema Builder — Phase 3 Plan

- **Status:** Working (W)
- **Version:** v1.00W
- **Date:** 2026-05-04
- **Target package:** `@bsuite/schema-builder@0.6.0`
- **Predecessor:** [`20260504-schema-builder-phase-2-signoff-v1.00W.md`](./20260504-schema-builder-phase-2-signoff-v1.00W.md)
- **Roadmap ref:** WYSIWYG / Schema Builder §3.6 items 5 + 6, §3.7 (E2E tenant isolation)

---

## 1. Goals

Phase 3 closes the three remaining gaps flagged in the Phase 2 signoff's **Known follow-ups** section and documented in `docs/OUTSTANDING.md`:

1. **Field reorder** — users must be able to reorder fields on an entity (drag *or* keyboard) and the order must round-trip through Postgres.
2. **Physical column rename** — when a user renames a field via `FieldEditDialog`, they must be offered a safe, opt-in path to also `ALTER TABLE ... RENAME COLUMN` so that raw-SQL consumers don't silently break.
3. **Deterministic E2E surface** — Playwright must be able to exercise the full schema-builder canvas (create entity → add field → edit field → delete field) against a seeded tenant, instead of relying on the current "gracefully skip when unreachable" pattern.

All three are **independent** and decomposable. Workstreams A and B live on the parent `bsuite` submodule (package code). Workstream C lives on `crm7` (the canonical consumer + E2E harness).

---

## 2. Delegation Strategy

Phase 3 is the first phase where we fan out to **GitHub Copilot coding agent** (`copilot-swe-agent`) for parallel execution, then integrate via the standard ship-all-apps loop.

| Workstream | Owner | Why |
|---|---|---|
| **A — FieldRow keyboard reorder + `sort_order` column** | Copilot | Self-contained, clear API surface, existing test patterns, no cross-app coupling |
| **B — ALTER TABLE RENAME COLUMN path** | Copilot | Self-contained (single RPC + single dialog tweak), clear safety constraints documented inline |
| **C — Seeded E2E tenant** | Copilot | Isolated scope (Supabase seed + `auth.setup.ts` extension), existing graceful-fallback pattern to extend |
| **D — Phase 3 integration** | Human (Buffy) | Package version bump, cross-workstream test run, 4 consumer PRs, submodule pointer bumps, signoff doc |

Copilot opens a draft PR on a `copilot/fix-<issue>` branch for each workstream. The parent agent:

1. Polls each PR via `gh pr view`
2. On "ready for review" signal, pulls the branch into the local session
3. Runs local typecheck + test + build
4. Reviews via `code-reviewer-multi-prompt`
5. If clean: merges via `gh pr merge --admin` and continues
6. If issues: pushes fix commits onto the Copilot branch (or comments with specific asks)

See **§6 Acceptance Gates** for the full gate list.

---

## 3. Workstreams

### 3.A — FieldRow keyboard reorder + `sort_order` column

**Repo:** `GaryOcean428/bsuite`
**Branch target:** `development`
**Package deliverable:** `packages/schema-builder/` changes only

**Scope:**

- Additive migration: add `sort_order INT NOT NULL DEFAULT 0` to `tenant_field_definitions`, backfill via `row_number() OVER (PARTITION BY entity_id ORDER BY created_at)`
- New `reorderEntityFields(entity_id, field_ids uuid[])` SECURITY DEFINER RPC (atomic, validates tenant ownership, validates the array covers exactly the fields of the entity)
- New controller method: `reorderFields(entityId, orderedFieldIds)`
- `FieldRow` keyboard handlers: **Alt+ArrowUp** / **Alt+ArrowDown** to move the focused row up/down
- Announce moves via a `role="status" aria-live="polite"` region
- `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"` on the edit button
- Unit tests for the new RPC (happy path + unauthorized tenant + partial-array rejection)
- Component tests for keyboard reorder + announcements

**Out of scope:**

- Mouse drag-and-drop (defer to Phase 4 — needs `@dnd-kit` which is not currently a schema-builder dependency)
- Cross-entity field move (fields cannot move between entities)

**Canonical references:**

- Existing migration style: `packages/schema-builder/src/supabase/migrations/20260504000000_schema_reflection_rpc.sql`
- Existing controller pattern: `useSchemaController.ts` — mirror the shape of `updateEntityPosition`
- Existing `tenant_field_definitions` DDL: `crm7/supabase/migrations/20260304090002_phase5_create_tenant_field_definitions.sql`

---

### 3.B — ALTER TABLE RENAME COLUMN path

**Repo:** `GaryOcean428/bsuite`
**Branch target:** `development`
**Package deliverable:** `packages/schema-builder/` changes only

**Scope:**

- New SECURITY DEFINER RPC `rename_entity_field_column(p_entity_id uuid, p_field_id uuid, p_new_name text)` that:
  - Resolves the entity's underlying table name via `tenant_entities.physical_table_name`
  - Validates `p_new_name` matches `^[a-z][a-z0-9_]{0,62}$` (snake_case, 1-63 chars)
  - Uses `format('ALTER TABLE %I RENAME COLUMN %I TO %I', ...)` — **never string concatenation** — for safe identifier quoting
  - Updates the `tenant_field_definitions.field_name` row in the same transaction
  - Validates caller's tenant ownership via `auth.uid()` + `user_tenants` join
  - Raises a descriptive exception on any precondition failure (not silent no-op)
- `FieldEditDialog` UI addition:
  - When `field_name` differs from the initial value, render an unchecked **checkbox** labeled: "Also rename the underlying Postgres column (advanced, destructive)"
  - Inline warning copy below the checkbox: "Raw SQL queries and views referencing the old column name will break. Metadata-driven widgets (Form Builder / Page Builder) are unaffected."
  - Hidden when the name is unchanged
- Controller: new `renameField(entityId, fieldId, newName, { physical: boolean })` method
  - `physical: false` → calls existing `updateEntityField` (metadata only, current behaviour)
  - `physical: true` → calls the new RPC (metadata + ALTER TABLE in one transaction)
- Unit tests for both branches
- The prior JSDoc caveat on `FieldEditDialog.tsx` (shipped in Phase 2) should be updated to reflect that the "unsafe" path is now available + guarded

**Out of scope:**

- Renaming `field_type` (changing Postgres column type is a distinct migration concern)
- Cascading updates to application-layer code that references the old name

**Canonical references:**

- Existing SECURITY DEFINER pattern: `packages/schema-builder/src/supabase/migrations/20260504000000_schema_reflection_rpc.sql`
- Existing dialog pattern: `packages/schema-builder/src/components/FieldEditDialog.tsx`
- Phase 2 JSDoc caveat on `FieldEditDialog.tsx` (lines 16-26) — update to reflect new capability

---

### 3.C — Seeded E2E tenant for Playwright

**Repo:** `GaryOcean428/crm7`
**Branch target:** `development`
**Deliverable:** Seed + auth setup extension + spec hardening

**Scope:**

- New seed SQL at `crm7/supabase/seed/e2e_tenant_seed.sql` that creates (all using deterministic UUIDs so reruns are idempotent):
  - One `auth.users` row (email `e2e+schema-builder@crm7.test`, pre-hashed password)
  - One `tenants` row (id `00000000-0000-0000-0000-000000000E2E`, slug `e2e-schema-builder`)
  - One `user_tenants` row (role `admin`)
  - One `tenant_entities` row (sample entity `e2e_widgets`)
  - Three `tenant_field_definitions` rows (`name text`, `price numeric`, `is_active boolean`)
  - All with `ON CONFLICT DO NOTHING` so reruns are safe
- Extend `crm7/tests/e2e/auth.setup.ts`:
  - If `CRM7_E2E_SEED_MODE=1` and `CRM7_E2E_EMAIL`/`CRM7_E2E_PASSWORD` are unset, use the seeded credentials
  - Preserve existing optional-auth behaviour (graceful fallback when neither seed nor real credentials available)
- New npm script `crm7: "db:seed:e2e"` that runs `supabase db reset --local` + applies the seed
- Update `crm7/tests/e2e/schema-builder-field-dialogs.spec.ts`:
  - Add a **second describe block** guarded by `test.describe.skip(!process.env.CRM7_E2E_SEED_MODE, ...)` that asserts the full canvas flow: login → navigate → Cmd+K → add field → pencil-edit field → delete field
  - Preserve the existing graceful-skip describe block (runs in CI without seed mode)
- Document the flow in `crm7/tests/e2e/README.md` (new file): how to run `pnpm db:seed:e2e && CRM7_E2E_SEED_MODE=1 pnpm e2e`

**Out of scope:**

- Running the seeded flow in CI (requires a dedicated Supabase preview branch — follow-up in Phase 4)
- BSU / Conduit / R80.3 E2E hardening (crm7 is the reference consumer)

**Canonical references:**

- Existing auth setup: `crm7/tests/e2e/auth.setup.ts`
- Existing Playwright config: `crm7/playwright.config.ts`
- Existing seed SQL file: `crm7/supabase/seed/document_templates_seed.sql` (style reference only)
- Phase 2 spec: `crm7/tests/e2e/schema-builder-field-dialogs.spec.ts`

---

## 4. Safety Constraints (all workstreams)

Applies to every Copilot PR. The parent agent will reject any PR that violates these:

- **No `workspace:*`** for `@bsuite/*` deps in any consumer `package.json` (per root `AGENTS.md` §Shared Packages)
- **No service account JSON keys** (per root `AGENTS.md` §Google Cloud Authentication)
- **No downgrading** of existing feature status
- **No hex colours** in component styling (use semantic CSS variables per `bsuite-brand-system`)
- **No `role="button"` on `<div>` elements** with interactive descendants (ARIA 1.2 §5.2.8.4 — enforced in Phase 2)
- **No raw-SQL identifier concatenation** in RPCs (use `format('%I', ident)`)
- **No bumping** `@bsuite/schema-builder` version in consumer `package.json`s (Workstream D does this)
- **Conventional commits** (`feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`)

---

## 5. Rollout Plan

1. **T+0** — File 3 issues (A, B, C), assign each to `copilot-swe-agent`, record issue numbers in `docs/OUTSTANDING.md`
2. **T+hours** — Copilot opens 3 draft PRs on `copilot/fix-<n>` branches
3. **T+review** — Parent agent polls + reviews each PR independently as they become ready
4. **T+merge** — As each workstream merges, parent pulls the latest into the local session
5. **T+integration (Workstream D, human)** — Bump `@bsuite/schema-builder` to `0.6.0`, publish to npm, bump all 4 consumer `package.json`s, ship-all-apps loop, submodule pointer bump, Phase 3 signoff doc

---

## 6. Acceptance Gates

Each Copilot PR must pass **all** of these before the parent merges:

- [ ] `pnpm typecheck` clean (in the PR's workspace)
- [ ] `pnpm test` passes (new tests + existing tests, no regressions)
- [ ] `pnpm build` clean
- [ ] `pnpm lint` clean
- [ ] All CI checks green on the PR (GitHub Actions rollup `SUCCESS`)
- [ ] No files outside the workstream's declared scope touched
- [ ] No safety-constraint violations (§4)
- [ ] Commit messages follow Conventional Commits
- [ ] PR description references the issue number and checks off the acceptance criteria from the issue

For the Phase 3 integration (Workstream D), additionally:

- [ ] `@bsuite/schema-builder@0.6.0` published to npm and verified via `npm view`
- [ ] All 4 consumer PRs green and merged
- [ ] Parent submodule pointers bumped to post-merge development HEADs
- [ ] Phase 3 signoff doc at `docs/20260504-schema-builder-phase-3-signoff-v1.00W.md` (or later date if integration slips)

---

## 7. Known Risks

| Risk | Mitigation |
|---|---|
| Copilot opens an overly large PR touching files outside scope | Issue body explicitly enumerates the allowed file paths; parent agent rejects and comments with the specific violation |
| Copilot fabricates a library import (`@dnd-kit`, `react-dnd`) | Safety constraint §4 + issue body `Out of scope: Mouse drag-and-drop` + reviewer check |
| RPC safety regression (SQL injection via identifier concatenation) | Issue body explicitly requires `format('%I', ident)`; reviewer checks |
| Seed SQL conflicts with existing auth.users rows | `ON CONFLICT DO NOTHING` + fixed UUIDs scoped to `00000000-0000-0000-0000-...` prefix |
| Copilot's PR breaks on a transitive type export from the Phase 2 barrel | Parent agent is familiar with this pattern from Phase 2 recovery, will fix in-place |
| Workstreams A + B both touch `FieldEditDialog.tsx` | Workstream B is sole owner of the dialog this phase; Workstream A's changes are confined to `FieldRow.tsx` + new migration/RPC/controller method |

---

## 8. Tracking

Issue numbers will be recorded here once filed:

- **Workstream A:** [GaryOcean428/bsuite#343](https://github.com/GaryOcean428/bsuite/issues/343) — assigned `copilot-swe-agent`
- **Workstream B:** [GaryOcean428/bsuite#344](https://github.com/GaryOcean428/bsuite/issues/344) — assigned `copilot-swe-agent`
- **Workstream C:** [GaryOcean428/crm7#338](https://github.com/GaryOcean428/crm7/issues/338) — assigned `copilot-swe-agent`

Expected Copilot branches:

- `copilot/fix-343` on `GaryOcean428/bsuite` (Workstream A)
- `copilot/fix-344` on `GaryOcean428/bsuite` (Workstream B)
- `copilot/fix-338` on `GaryOcean428/crm7` (Workstream C)

Filed at 2026-05-04. Copilot typically opens a draft PR within 5–30 minutes of assignment.

**Copilot SWE agent GraphQL node ID:** `BOT_kgDOC9w8XQ` (used for programmatic assignment when `gh issue edit --add-assignee copilot-swe-agent` fails silently — fall back to `gh api graphql -f query='mutation { replaceActorsForAssignable(...) }'`).
