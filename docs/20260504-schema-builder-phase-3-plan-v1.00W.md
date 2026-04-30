# Schema Builder — Phase 3 Plan

- **Status:** Working (W)
- **Version:** v1.00W
- **Date:** 2026-05-04
- **Target packages:** `@bsuite/schema-builder@0.6.0` (Workstream A) → `0.7.0` (Workstream B). See §5 for the A-before-B ordering rule.
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

Copilot opens a draft PR on a `copilot/*` branch for each workstream (Copilot chooses the branch slug — do **not** assume `copilot/fix-<n>`; poll with `gh pr list --head 'copilot/*'` instead). The parent agent:

1. Polls each PR via `gh pr view`
2. On "ready for review" signal, pulls the branch into the local session
3. Runs local typecheck + test + build + lint
4. Reviews via `code-reviewer-multi-prompt`; **mandatory security-focused reviewer pass on any PR that touches `*.sql` or contains `SECURITY DEFINER`**
5. If clean: merges via `gh pr merge --admin` and continues (subject to §6 gates — **SECURITY DEFINER migrations require explicit human signoff beyond CI green, see §6**)
6. If issues: small fixups (<20 lines, pure lint/rename) → push commit onto Copilot's branch; larger asks (logic changes) → comment on the PR and let Copilot iterate

See **§6 Acceptance Gates** for the full gate list and **§5 Rollout Plan** for escalation policy when Copilot stalls.

---

## 3. Workstreams

### 3.A — FieldRow keyboard reorder + `sort_order` column

**Repo:** `GaryOcean428/bsuite`
**Branch target:** `development`
**Package deliverable:** `packages/schema-builder/` changes only
**Version target:** `@bsuite/schema-builder@0.6.0`

**Scope:**

- Additive migration: add `sort_order INT NOT NULL DEFAULT 0` to `tenant_field_definitions`, backfill via `row_number() OVER (PARTITION BY entity_id ORDER BY created_at)`
- New `reorder_entity_fields(p_entity_id uuid, p_field_ids uuid[])` SECURITY DEFINER RPC (atomic, validates tenant ownership, validates the array covers exactly the fields of the entity — no missing, no extra)
- New controller method: `reorderFields(entityId, orderedFieldIds)` on `useSchemaController.ts` (optimistic UI + rollback toast on RPC error)
- `FieldRow` keyboard handlers: **Alt+ArrowUp** / **Alt+ArrowDown** to move the focused row up/down
- `SchemaCanvas.tsx` subscribes to a new `bsuite-reorder-field` CustomEvent and dispatches to `controller.reorderFields`
- Announce moves via a `role="status" aria-live="polite"` region
- `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"` on the edit button
- Unit tests for the new RPC (happy path + unauthorized tenant + partial-array rejection)
- Component tests for keyboard reorder + announcements

**Allowed paths (MUST NOT modify files outside this list):**

- `packages/schema-builder/src/components/FieldRow.tsx`
- `packages/schema-builder/src/components/SchemaCanvas.tsx` (event subscription only)
- `packages/schema-builder/src/hooks/useSchemaController.ts` (add `reorderFields` only — **do not touch other methods**, Workstream B also edits this file)
- `packages/schema-builder/src/service.ts` (add `reorderEntityFields` + extend `getEntityFields` ORDER BY only)
- `packages/schema-builder/src/supabase/migrations/20260505000000_*.sql` (new file)
- `packages/schema-builder/src/__tests__/*.test.{ts,tsx}` (new test files; existing ones may be read but not modified)
- `packages/schema-builder/package.json` (version bump to `0.6.0` only)
- `packages/schema-builder/src/index.ts` / `src/components/index.ts` (barrel additions if new public exports)

**Out of scope:**

- Mouse drag-and-drop (defer to Phase 4 — needs `@dnd-kit` which is not currently a schema-builder dependency)
- Cross-entity field move (fields cannot move between entities)
- `FieldEditDialog.tsx` / `FieldCreateDialog.tsx` changes (owned by Workstream B and Phase 2)

**Canonical references:**

- Existing migration style: `packages/schema-builder/src/supabase/migrations/20260504000000_schema_reflection_rpc.sql`
- Existing controller pattern: `useSchemaController.ts` — mirror the shape of `updateEntityPosition`
- Existing `tenant_field_definitions` DDL: `crm7/supabase/migrations/20260304090002_phase5_create_tenant_field_definitions.sql`
- SECURITY DEFINER hardening patterns: `crm7/supabase/migrations/20260427010341_security_definer_hardening.sql`

---

### 3.B — ALTER TABLE RENAME COLUMN path

**Repo:** `GaryOcean428/bsuite`
**Branch target:** `development`
**Package deliverable:** `packages/schema-builder/` changes only
**Version target:** `@bsuite/schema-builder@0.7.0`

> **Ordering dependency:** Workstream B must be rebased onto post-A-merge `development` before the parent agent accepts its PR. If B's PR arrives first, parent holds merge and asks Copilot to rebase after A lands. The `0.7.0` bump is mechanically correct only if A's `0.6.0` bump already shipped.

**Scope:**

- New SECURITY DEFINER RPC `rename_physical_column(p_entity_id uuid, p_field_id uuid, p_new_name text, p_dry_run boolean DEFAULT true)` that:
  - **Discovers the underlying physical table name by reading `tenant_entities` DDL** — the exact column name is NOT `physical_table_name` (that column does not exist on the current schema). Copilot MUST read `crm7/supabase/migrations/20260311053135_visual_relational_builder.sql` to discover the real column structure (`id`, `tenant_id`, `name`, `label`, `description`, `icon`, `is_system`, `metadata`, `created_at`, `updated_at`) and derive the physical table name via convention (likely `name` + tenant-scoped schema, or `information_schema.tables` lookup keyed on `tenant_entities.id` → table via a naming convention)
  - Validates `p_new_name` matches `^[a-z][a-z0-9_]{0,62}$` (snake_case, 1-63 chars)
  - Uses `format('ALTER TABLE %I RENAME COLUMN %I TO %I', ...)` — **never string concatenation** — for safe identifier quoting
  - Writes an audit row to a new `schema_mutations_audit` table **BEFORE** execution (so failed attempts are recorded)
  - If `p_dry_run = true` (default): returns JSON `{ would_execute: '...', affected_views: [...], affected_policies: [...] }` WITHOUT executing
  - If `p_dry_run = false`: executes the ALTER TABLE + updates `tenant_field_definitions.field_name` in one transaction
  - Role check: caller must have `admin` or `owner` role in `user_tenants` for the entity's tenant
  - `SET search_path = ''` at function top
- `FieldEditDialog.tsx` UI addition:
  - When `field_name` differs from initial, render a `<details>` disclosure with an unchecked checkbox "Also rename the underlying Postgres column (advanced, destructive)"
  - Inline warning: "Raw SQL queries and views referencing the old column name will break. Metadata-driven widgets (Form Builder / Page Builder) are unaffected."
  - On Save with checkbox checked → call RPC dry-run → show confirmation modal with SQL + affected objects → on confirm call wet-run
  - Hidden when `field_name` is unchanged
- Controller: new `renameField(entityId, fieldId, newName, { physical: boolean })` on `useSchemaController.ts`
  - `physical: false` (default) → existing `updateEntityField` (current behaviour preserved)
  - `physical: true` → the new RPC
- Update the Phase 2 JSDoc caveat on `FieldEditDialog.tsx` to reflect the new opt-in path

**Allowed paths (MUST NOT modify files outside this list):**

- `packages/schema-builder/src/components/FieldEditDialog.tsx`
- `packages/schema-builder/src/hooks/useSchemaController.ts` (add `renameField` only — **do not touch `reorderFields` from Workstream A**)
- `packages/schema-builder/src/supabase/migrations/20260506000000_*.sql` (new file)
- `packages/schema-builder/src/__tests__/*.test.{ts,tsx}` (new test files)
- `packages/schema-builder/package.json` (version bump to `0.7.0` only **and only after A's `0.6.0` is on `development`** — otherwise bump to `0.6.1` and flag for D to harmonise)
- `packages/schema-builder/src/index.ts` / `src/components/index.ts` (barrel additions if new public exports)

**Out of scope:**

- Type changes (ALTER COLUMN TYPE)
- Default value changes (ALTER COLUMN SET DEFAULT)
- Constraint changes
- `FieldRow.tsx` / `FieldCreateDialog.tsx` / reorder logic (Workstream A territory)
- Cascading updates to application-layer code referencing the old name (user responsibility; warning copy makes this explicit)

**Canonical references:**

- Existing SECURITY DEFINER pattern: `packages/schema-builder/src/supabase/migrations/20260504000000_schema_reflection_rpc.sql`
- Existing dialog pattern: `packages/schema-builder/src/components/FieldEditDialog.tsx` (Phase 2 JSDoc caveat at lines 16-26)
- `tenant_entities` DDL (READ THIS FIRST to avoid column hallucination): `crm7/supabase/migrations/20260311053135_visual_relational_builder.sql`
- Hardening patterns: `crm7/supabase/migrations/20260427010341_security_definer_hardening.sql` (`SET search_path = ''`)
- `tenant_field_definitions` DDL: `crm7/supabase/migrations/20260304090002_phase5_create_tenant_field_definitions.sql`

---

### 3.C — Seeded E2E tenant for Playwright

**Repo:** `GaryOcean428/crm7`
**Branch target:** `development`
**Deliverable:** Seed + auth setup extension + spec hardening

**Scope:**

- Single new migration `crm7/supabase/migrations/20260507000000_e2e_fixture_tenant.sql` (idempotent, UP-only) containing **both** the schema additions and the `set_e2e_mode` RPC — **do not split into two migration files**:
  - Adds `is_e2e_fixture BOOLEAN DEFAULT FALSE NOT NULL` column (`ADD COLUMN IF NOT EXISTS`) to `tenants`, `tenant_entities`, `tenant_field_definitions`, `user_tenants`
  - RLS policy addendum: `USING (is_e2e_fixture = FALSE OR current_setting('app.e2e_mode', true) = 'on')` — fixture rows invisible unless explicitly enabled
  - **Critical:** the `set_e2e_mode(p_enabled boolean)` RPC uses `SET LOCAL` which only persists **for the current transaction**. Because supabase-js issues each query as its own transaction, `set_e2e_mode` alone will not persist the setting across queries. **Copilot MUST either (a) use a GUC-aware pattern where each query re-applies the setting via a wrapping RPC, OR (b) write a table-level `is_e2e_tenant_context(user_id)` function that the RLS `USING` clause calls directly — NOT rely on session-wide `SET LOCAL`.** The implementation MUST demonstrate with a Playwright test that RLS visibility persists across ≥3 sequential queries.
  - Seeds (all with fixed UUIDs, `ON CONFLICT DO NOTHING`): one `auth.users`, one `tenants` (`00000000-0000-0000-0000-000000000E2E`), one `user_tenants` (admin), one `tenant_entities` (`e2e_widgets`), three `tenant_field_definitions`
- New seed SQL at `crm7/supabase/seed/e2e_tenant_seed.sql` (companion; migration above is idempotent schema, seed file is data only if a seed/migration split is preferred by convention)
- Extend `crm7/tests/e2e/auth.setup.ts`:
  - When `CRM7_E2E_SEED_SUPABASE=1` (or legacy `CRM7_E2E_SEED_MODE=1`), sign in the fixture user and ensure e2e mode is applied per-query (see above)
  - Preserve existing graceful-fallback behaviour when the env var is unset
- New helper `crm7/tests/e2e/fixtures/e2e-tenant.ts` exporting fixture UUIDs + `ensureE2EModeOn(page)` that idempotently applies the GUC/wrapper before RLS-sensitive operations
- Update 4 specs in `crm7/tests/e2e/schema-builder-field-dialogs.spec.ts` to assert actual dialog interaction (not skip) when seeded mode is on; preserve graceful-skip otherwise
- New `crm7/tests/e2e/README.md` documenting the env-var contract

**Allowed paths (MUST NOT modify files outside this list):**

- `crm7/supabase/migrations/20260507000000_*.sql` (new file, single migration)
- `crm7/supabase/seed/e2e_tenant_seed.sql` (new file, optional)
- `crm7/tests/e2e/auth.setup.ts`
- `crm7/tests/e2e/schema-builder-field-dialogs.spec.ts`
- `crm7/tests/e2e/fixtures/e2e-tenant.ts` (new file)
- `crm7/tests/e2e/README.md` (new file)
- `crm7/package.json` (new `db:seed:e2e` script only — **do not bump `@bsuite/schema-builder` version**, Workstream D owns that)

**Out of scope:**

- Bumping `@bsuite/schema-builder` dependency version (Workstream D)
- Separate Supabase branch per PR (Phase 4)
- CI concurrency locks on the fixture tenant
- BSU / Conduit / R80.3 E2E hardening
- Running the seeded flow in Vercel preview CI

**Canonical references:**

- Existing auth setup: `crm7/tests/e2e/auth.setup.ts`
- Existing Playwright config: `crm7/playwright.config.ts`
- Existing seed SQL file: `crm7/supabase/seed/document_templates_seed.sql` (style reference)
- Phase 2 spec: `crm7/tests/e2e/schema-builder-field-dialogs.spec.ts`
- RLS pattern: `crm7/supabase/migrations/20260425103122_team_members_admin_rls.sql`

---

## 4. Safety Constraints (all workstreams)

Applies to every Copilot PR. The parent agent will reject any PR that violates these:

- **No `workspace:*`** for `@bsuite/*` deps in any consumer `package.json` (per root `AGENTS.md` §Shared Packages)
- **No new dependencies in `package.json`** of any sort — Copilot has been observed adding unsolicited deps. Any new runtime dep requires an explicit user approval comment on the PR.
- **No service account JSON keys** (per root `AGENTS.md` §Google Cloud Authentication)
- **No downgrading** of existing feature status
- **No hex colours** in component styling (use semantic CSS variables per `bsuite-brand-system`)
- **No `role="button"` on `<div>` elements** with interactive descendants (ARIA 1.2 §5.2.8.4 — enforced in Phase 2)
- **No raw-SQL identifier concatenation** in RPCs (use `format('%I', ident)`)
- **No bumping** `@bsuite/schema-builder` version in consumer `package.json`s (Workstream D does this)
- **SECURITY DEFINER migrations require an additional human security-review signoff** beyond CI green. The parent agent runs `code-reviewer-multi-prompt` with a dedicated security-focused prompt on any PR touching `*.sql` or containing `SECURITY DEFINER` before proposing merge; then waits for explicit user approval before `gh pr merge --admin`. See §6.
- **Conventional commits** (`feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`)

---

## 5. Rollout Plan

1. **T+0** — File 3 issues (A, B, C), assign each to `copilot-swe-agent`, record issue numbers in `docs/OUTSTANDING.md`
2. **T+minutes** — Copilot opens 3 draft PRs on `copilot/*` branches (exact slug varies — poll with `gh pr list --head 'copilot/*'`)
3. **T+review** — Parent agent polls + reviews each PR independently as they become ready
4. **T+ordering** — Workstream A merges FIRST (`0.6.0`). Once A is on `development`, parent asks Copilot to rebase B onto the new HEAD. C has no ordering dependency and can merge at any point.
5. **T+merge** — As each workstream merges, parent pulls the latest into the local session
6. **T+integration (Workstream D, human)** — Bump `@bsuite/schema-builder` (final consolidated version), **run `npm pack` into one disposable consumer via `npm install file:./<package>.tgz` and confirm typecheck + build before publishing to npm** (consumer-preview gate), `npm publish`, bump all 4 consumer `package.json`s, ship-all-apps loop, submodule pointer bump, Phase 3 signoff doc

### Escalation policy (Copilot stall detection)

| Condition | Parent agent action |
|---|---|
| No draft PR opened within 30 min of assignment | Comment on the issue with additional context + specific file paths |
| Draft PR opened but no commits for 2 h | Comment with specific asks; re-prod Copilot via `@copilot ping` comment |
| CI red on Copilot's PR after 2 push iterations | Take the workstream in-house: pull the branch, fix locally, push commits |
| CI green but `code-reviewer-multi-prompt` flags blocking concerns | Comment on PR with the reviewer's feedback, ask Copilot to address; if still broken after 1 iteration → take in-house |
| Copilot's PR touches files outside the workstream's Allowed paths (§3.X) | Comment with specific violation + rejection; if repeated → take in-house |

Any "take in-house" event is documented in the Phase 3 signoff doc as a lesson learned.

---

## 6. Acceptance Gates

Each Copilot PR must pass **all** of these before the parent merges:

- [ ] `pnpm typecheck` clean (in the PR's workspace)
- [ ] `pnpm test` passes (new tests + existing tests, no regressions)
- [ ] `pnpm build` clean
- [ ] `pnpm lint` clean
- [ ] All CI checks green on the PR (GitHub Actions rollup `SUCCESS`)
- [ ] No files outside the workstream's declared Allowed paths touched (§3.X)
- [ ] No safety-constraint violations (§4)
- [ ] Commit messages follow Conventional Commits
- [ ] PR description references the issue number and checks off the acceptance criteria from the issue
- [ ] PR description includes a **Rollback SQL** section for every new migration (executable DROP statements)
- [ ] **Rollback SQL actually verified**: parent agent applies migration to a fresh local Supabase instance, applies rollback SQL, then re-applies migration UP — all three steps clean
- [ ] **For any PR touching `*.sql` or containing `SECURITY DEFINER`**: `code-reviewer-multi-prompt` run with a dedicated security-focused prompt (SQL injection, role-check placement, audit-before-side-effect, `SET search_path = ''`, regex vs `format('%I')` defence-in-depth), AND explicit user approval before `gh pr merge --admin`
- [ ] **Smoke-test against production Supabase (`tuybltdrdefjblnplpqo`) is a HUMAN responsibility, not Copilot's.** Copilot's migration file is validated by `psql --syntax-check` or `supabase db reset --local` + apply; the live prod smoke-test runs after merge, by Workstream D.

For the Phase 3 integration (Workstream D), additionally:

- [ ] Consumer-preview gate: tarball `npm pack`ed and installed into one disposable consumer (`npm install file:./<package>.tgz`); that consumer's `pnpm typecheck && pnpm build` clean — BEFORE `npm publish`
- [ ] `@bsuite/schema-builder@<version>` published to npm and verified via `npm view`
- [ ] All 4 consumer PRs green and merged
- [ ] Parent submodule pointers bumped to post-merge development HEADs
- [ ] Phase 3 signoff doc at `docs/20260504-schema-builder-phase-3-signoff-v1.00W.md` (or later date if integration slips)

### Mechanically-enforceable guards (future work)

The two safety constraints most likely to regress should become CI lint rules in a future phase:

- ESLint rule: flag `role="button"` on non-`<button>` elements that contain interactive descendants
- SQL linter: flag raw string concatenation with `||` or `concat()` inside `CREATE FUNCTION` bodies where an identifier (not literal) is being constructed

Neither is a Phase 3 deliverable.

---

## 7. Known Risks

| Risk | Mitigation |
|---|---|
| Copilot opens an overly large PR touching files outside scope | Per-workstream Allowed-paths whitelist (§3.X); parent agent rejects + comments with specific violation; repeat offence → take in-house |
| Copilot fabricates a library import (`@dnd-kit`, `react-dnd`) | Safety constraint §4 (no new deps without explicit approval) + issue body `Out of scope: Mouse drag-and-drop` + reviewer check |
| RPC safety regression (SQL injection via identifier concatenation) | Issue body explicitly requires `format('%I', ident)`; mandatory security-focused `code-reviewer-multi-prompt` pass on any `*.sql` change (§6) |
| Seed SQL conflicts with existing auth.users rows | `ON CONFLICT DO NOTHING` + fixed UUIDs scoped to `00000000-0000-0000-0000-...` prefix |
| Copilot's PR breaks on a transitive type export from the Phase 2 barrel | Parent agent is familiar with this pattern from Phase 2 recovery, will fix in-place |
| **Workstreams A + B both modify `packages/schema-builder/src/hooks/useSchemaController.ts`** (A adds `reorderFields`, B adds `renameField`) | Allowed-paths whitelist on each issue makes the conflict surface explicit; ordering rule: A merges first (§5), B rebases onto A's merged HEAD before parent accepts B's PR |
| Version ordering collision (A=0.6.0, B=0.7.0) | §5 ordering rule: A lands first. If B's PR arrives with `0.7.0` before A is on `development`, parent comments and asks Copilot to either wait for A OR bump to `0.6.1` (Workstream D harmonises in the final integration) |
| Copilot ships a broken `SET LOCAL app.e2e_mode` pattern in Workstream C | §3.C scope explicitly requires a per-query wrapper or `is_e2e_tenant_context` RLS function — NOT session-wide `SET LOCAL`; acceptance criterion requires a Playwright test across ≥3 sequential queries |
| Copilot hallucinates a `tenant_entities.physical_table_name` column in Workstream B | §3.B scope explicitly names `crm7/supabase/migrations/20260311053135_visual_relational_builder.sql` as the canonical DDL to read first; reviewer cross-checks |
| SECURITY DEFINER migration auto-merge exposes production | §4 SECURITY DEFINER carve-out + §6 explicit human approval gate before `gh pr merge --admin` on any SQL-touching PR |
| Package regression only surfaces after npm publish | §6 consumer-preview gate: `npm pack` + install into disposable consumer BEFORE `npm publish` |

---

## 8. Tracking

- **Workstream A:** [GaryOcean428/bsuite#343](https://github.com/GaryOcean428/bsuite/issues/343) — assigned `copilot-swe-agent`. Draft PR: [#346](https://github.com/GaryOcean428/bsuite/pull/346) (branch `copilot/feat-schema-builder-fieldrow-drag-reorder`)
- **Workstream B:** [GaryOcean428/bsuite#344](https://github.com/GaryOcean428/bsuite/issues/344) — assigned `copilot-swe-agent`. Draft PR: [#345](https://github.com/GaryOcean428/bsuite/pull/345) (branch `copilot/feat-schema-builder-rename-column`)
- **Workstream C:** [GaryOcean428/crm7#338](https://github.com/GaryOcean428/crm7/issues/338) — assigned `copilot-swe-agent`. Draft PR: [#339](https://github.com/GaryOcean428/crm7/pull/339) (branch `copilot/add-e2e-tenant-fixture-migration`)

### Review status (updated 2026-04-28)

All three Copilot PRs were opened, locally validated (worktree + merge-with-development), and reviewed in a single parent-agent session on 2026-04-28. Full review trail in `docs/OUTSTANDING.md` → §2 "Schema-Builder Phase 3 PRs — under review (2026-04-28)".

| Workstream | PR | Verdict | Merge-blockers | Hardening follow-ups |
|---|----|---------|----------------|----------------------|
| **A — keyboard reorder** | [#346](https://github.com/GaryOcean428/bsuite/pull/346) | **Approve with polish** | none | (optional) announcement specificity (`"Moved {name} to position N of M"`) + focus-return-to-edit-button after reorder |
| **B — rename column** | [#345](https://github.com/GaryOcean428/bsuite/pull/345) | **Request changes** | native `<dialog>` + `<details>` diverges from shadcn / Radix convention (§AGENTS.md §5) | 5 items tracked in OUTSTANDING.md (UX-correctness first: `affected_views` precision → stale-preview invalidation → reserved-keyword rejection → protected-table blocklist → TOCTOU hash) |
| **C — e2e fixture** | [crm7#339](https://github.com/GaryOcean428/crm7/pull/339) | **Approve with polish** | none | document `CRM7_E2E_SEED_SUPABASE` in `.env.example` + README + CONTRIBUTING; decide whether to remove the vestigial `set_e2e_mode` GUC (transaction-scoped so effectively dead code) or keep as explicit defense-in-depth with a clarifying migration comment |

**Severity recalibration (2026-04-28 addendum on #345):** initial review flagged 4 blockers for B; after verifying that `tenant_entities` is seeded with business-domain entities only (`contact`, `lead`, `apprentice`, `opportunity`, `employer`, etc. — NOT structural tables like `tenants`, `user_tenants`, `auth.*`) and that the existing RLS on `tenant_entities` prevents tenant admins from writing to system rows (`tenant_id IS NULL`), three of those four were recalibrated to "hardening follow-up" rather than merge-blocker. The SECURITY DEFINER function's actual attack-surface gates (`auth.uid()` null check, role verification, `format('%I')` quoting, pinned `search_path = ''`) are all correct. Addendum: [bsuite#345 issuecomment-4349518914](https://github.com/GaryOcean428/bsuite/pull/345#issuecomment-4349518914).

**Test-infra prereq:** commit `3249f98` landed the `vitest@2.1.9` + `jsdom` + `@testing-library/jest-dom` `.rejects.toThrow` workaround (manual `.catch((e) => e)` + `toBeInstanceOf(Error)` + `.message` check) directly on `development` on 2026-04-28. This unblocked local CI on all three Phase 3 PRs; each branch will pick up the conflict-resolution on its next rebase. Tracked in `packages/schema-builder/docs/testing-notes.md`.

**GitHub state (2026-04-28):** all 3 PRs `DRAFT` + `MERGEABLE: BLOCKED` pending rebase on post-`3249f98` development. Expect to flip green after Copilot's next push.

**Branch-naming caveat:** Copilot chooses its own branch slug (not always `copilot/fix-<n>`). Poll with `gh pr list --head 'copilot/*' --author 'app/copilot-swe-agent'` to discover the actual name.

Filed at 2026-05-04. Copilot typically opens a draft PR within 5–30 minutes of assignment (confirmed on this phase — all three draft PRs opened within ~5 min of issue filing).

**Copilot SWE agent GraphQL node ID:** `BOT_kgDOC9w8XQ` (used for programmatic assignment when `gh issue edit --add-assignee copilot-swe-agent` fails silently — fall back to `gh api graphql -f query='mutation { replaceActorsForAssignable(...) }'`).
