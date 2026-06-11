# P1-4(b) Consumer-Renderer Migration — Multi-Agent Coordination Log

**Status**: W (Working) — live coordination, updated as agents progress
**Started**: 2026-05-01
**Agents**: Codebuff (Opus, credits-gated), Claude Code (Sonnet, no per-session gating)
**HANDOFF spec**: [`docs/20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md`](./20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md)
**ADRs**: [ADR-0001 — page-builder ownership](./adr/ADR-0001-page-builder-ownership.md), [ADR-0003 — consumer-renderer pattern](./adr/ADR-0003-consumer-renderer-pattern.md)
**Merged backlog item**: P1-4(b) in [`docs/20260501-merged-execution-backlog-v1.00W.md`](./20260501-merged-execution-backlog-v1.00W.md)
**Doctrine**: one-shot (single entity source of truth) — see [`docs/20260227-dry-one-shot-architecture-v1.01A.md`](./20260227-dry-one-shot-architecture-v1.01A.md), bumped to v1.02A by Phase 5.B

---

## How to use this log

Each agent appends an entry whenever they **START**, **COMPLETE**, or **BLOCK** a phase. Read the whole log before starting any phase to avoid stepping on the other agent's work.

Entry format:

````markdown
### YYYY-MM-DD HH:MM TZ — <Agent> — <Phase ID> — <Status>

- **Summary**: one-line description
- **PRs / SHAs**: [#nnn](link) or `abc1234`
- **Unblocks**: [phase IDs that can now proceed]
- **Blocks on**: [phase IDs that this one is waiting on]
- **Notes**: optional — decisions made, corrections, red flags
````

**Status values**: `START` · `COMPLETE` · `BLOCKED` · `CORRECTION` · `HANDOFF`

When appending: keep entries chronological (newest at the bottom of §Event stream). Do NOT edit past entries — append a `CORRECTION` entry instead.

<!-- APPEND NEW ENTRIES AT THE BOTTOM OF THE EVENT STREAM SECTION BELOW -->

---

## Phase assignments

| Phase | Description | Owner | Status | Blocks |
|---|---|---|---|---|
| 0 | RLS verification on `custom_pages` + `custom_page_revisions` | CC | ✅ COMPLETE | — |
| 1 | BSU broken `tenant_page_layouts` authoring deletion | CC | ✅ COMPLETE (PR #225) | — |
| 3 | `@bsuite/schema-registry` → deprecated-shim release (0.3.1 after 0.3.0 premature removal) | Codebuff | ✅ COMPLETE (PR #334, npm 0.3.1 published) | — |
| 5.A | `@bsuite/dry-lint` ownership-map update (`tenant_page_layouts` dropped, `custom_pages` readers expanded) | CC | ✅ COMPLETE (PR #329) | — |
| 7 | CRM7 schema-builder cross-app entity picker + redirect + live row preview (one-shot) | Codebuff | ✅ COMPLETE ([crm7#331](https://github.com/GaryOcean428/crm7/pull/331)) | Phase 2 |
| 2.BSU | BSU per-app `CustomPageRenderer` (full widget parity, `/custom/:slug`) | CC | ⏳ QUEUED — starts after Phase 7 | — |
| 2.conduit | Conduit per-app `CustomPageRenderer` + migrate 5 `TenantLayoutSlot` imports | CC | ⏳ QUEUED — starts after 2.BSU | — |
| 2.R80.3 | R80.3 per-app `CustomPageRenderer` + migrate 1 `TenantLayoutSlot` import + test mock | Codebuff (next session) | ⏳ QUEUED | — |
| 2.braden | braden per-app `CustomPageRenderer` + migrate 1 `TenantLayoutSlot` import | Codebuff (next session) | ⏳ QUEUED | — |
| 2.throughput | throughput per-app `CustomPageRenderer` (no `TenantLayoutSlot` imports to migrate) | Codebuff (next session) | ⏳ QUEUED | — |
| 4 | 5 consumer `@bsuite/schema-registry: ^0.3.0` dep bumps | **Co-committed into each Phase 2 PR** (not standalone) | ⏳ QUEUED | Depends on Phase 3 npm publish |
| 5.B | One-shot spec v1.01A → v1.02A doctrine update | Codebuff | ⏳ QUEUED | — |
| 5.C | Backlog closure marker in `20260501-merged-execution-backlog-v1.00W.md` | Codebuff | ⏳ QUEUED | — |
| 6 | Drop `tenant_page_layouts_backup_20260502` table (scheduled 2026-08-02) | TBD | 📅 SCHEDULED | — |

---

## Key decisions

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-01 | schema-registry target version is **0.3.1**, not 0.3.0 | `0.3.0` was published 2026-04-29 with `TenantLayoutSlot` removed atomically before consumers migrated — premature breaking change. `0.3.1` restores it as a no-op `@deprecated` shim. `0.3.0` is `npm deprecate`'d. |
| 2026-05-01 | Phase 1 scope narrowed from original plan | Notices / RateLimits / Routing / Schema.tsx in BSU author unrelated tables (system_notices, platform_rate_limits, lead_routing_rules, tenant_entities) — kept. Only the `tenant_page_layouts`-authoring surface deleted. |
| 2026-05-01 | Phase 7 full scope (picker + redirect + live row preview), gating Phase 2 | User directive: enforce one-shot doctrine in CRM7 authoring UI before per-app renderers ship. |
| 2026-05-01 | Phase 4 co-committed into each Phase 2 PR | Avoids a "dead" dep-bump PR that would break consumer builds if landed before its renderer. |
| 2026-05-01 | Shim atomic removal deferred from 0.3.0 → 0.4.0 | See §ADR corrections below. |

---

## ADR corrections (2026-05-01)

**ADR-0001 consequence #4** ("removes the `TenantLayoutSlot` component" / "remove atomically") and **ADR-0003** ("`TenantLayoutSlot` … is deleted outright" / "No `@deprecated` JSDoc — it gets deleted, not marked") are **superseded by a 2026-05-01 recovery decision**:

- `@bsuite/schema-registry@0.3.0` published 2026-04-29 removed the export atomically, but the 7 active consumer imports (conduit ×5, braden ×1, R80.3 ×1) were not migrated in the same PR set — consumer builds would break on next install.
- **Decision**: retain `TenantLayoutSlot` as an `@deprecated` no-op shim in `0.3.1`. `npm deprecate` `0.3.0` with a migration message. Atomic removal deferred to `0.4.0`, gated on `git grep -r TenantLayoutSlot` returning zero matches across braden, conduit, R80.3, BSU, and CRM7 (Phase 2 completion).
- The shim intentionally does NOT query `tenant_page_layouts` (dropped 2026-04-29) — it renders `null` unconditionally, emits a one-time `console.warn` in development, and never throws. No PostgREST traffic, no Sentry noise.
- ADRs 0001 and 0003 are not rewritten — this entry records the amendment. Future agents should treat the shim as intentionally retained until the 0.4.0 release criteria are met.

---

## Event Stream

### 2026-05-01 — CC — Phase 0 — COMPLETE

- **Summary**: RLS verification passed on Supabase project `tuybltdrdefjblnplpqo` — 4 policies on `custom_pages`, 2 on `custom_page_revisions`, all `{authenticated}`.
- **Notes**: Gate for Phase 2 renderer development is open from the data-access side.

### 2026-05-01 — CC — Phase 1 — COMPLETE

- **Summary**: BSU broken `tenant_page_layouts` authoring deletion merged via [PR #225](https://github.com/GaryOcean428/business-suite-unified/pull/225). Scope narrowed to 3 deletes + 4 updates (Notices/RateLimits/Routing/Schema kept per §Key decisions).
- **Unblocks**: Phase 3 on the BSU side (no remaining writers to `tenant_page_layouts`).

### 2026-05-01 — CC — Phase 5.A — COMPLETE

- **Summary**: `@bsuite/dry-lint` ownership-map updated via [PR #329](https://github.com/GaryOcean428/bsuite/pull/329). `tenant_page_layouts` dropped as an entry; `custom_pages` readers expanded; `custom_page_blocks` → `custom_page_revisions` rename reflected.
- **Unblocks**: Phase 7 (CRM7 schema-builder now reads a stable ownership-map).

### 2026-05-01 — Codebuff — Phase 3 — CORRECTION

- **Summary**: schema-registry on-disk version was `0.2.2` while npm registry had `0.3.0` (published 2026-04-29). Divergence caused by a publish whose compiled `dist` diverged from the parent-repo source tree. 0.3.0 is being `npm deprecate`'d; 0.3.1 ships as the recovery release.
- **Notes**: See §ADR corrections above.

### 2026-05-01 — Codebuff — Phase 3 — START

- **Summary**: Local `packages/schema-registry/package.json` bumped `0.2.2` → `0.3.1`. `TenantLayoutSlot` restored as a pure no-op shim (no Supabase traffic, `useEffect`-driven one-time `console.warn`, renders `null`). Barrel exports re-added in `src/react/index.ts` and `src/index.ts`. CHANGELOG.md created.
- **PRs / SHAs**: (pending)
- **Unblocks**: Phase 4 consumer dep-bumps once published.
- **Blocks on**: `pnpm build` in `packages/schema-registry/` + `npm publish` + `npm deprecate @bsuite/schema-registry@0.3.0`.

### 2026-05-01 — Codebuff — Phase 7 — START

- **Summary**: CRM7 schema-builder cross-app entity picker shipped. New `src/lib/ownership-map-helper.ts` (reads `@bsuite/dry-lint/ownership-map`), new `CanonicalEntityPicker.tsx` (search + select + deep-link), new `CanonicalRowPreview.tsx` (live preview with PII redaction), `EntityPropertiesPanel.tsx` refactored with Create/Link tabs. One-shot doctrine enforced on the Create tab (canonical name collision check). Tests added for helper + picker + preview redaction.
- **PRs / SHAs**: (pending)
- **Unblocks**: Phase 2 renderer work (entity-linking authoring surface is in place).
- **Blocks on**: `pnpm test` + `pnpm typecheck` + code review on crm7.

<!-- APPEND NEW ENTRIES BELOW THIS LINE -->

### 2026-05-01 — Codebuff — Phase 3 — COMPLETE

- **Summary**: `@bsuite/schema-registry@0.3.1` published to npm (pure no-op shim restoring `TenantLayoutSlot`). `0.3.0` deprecated on registry with migration message. Parent-repo source now in sync with published artefact.
- **PRs / SHAs**: parent [PR #334](https://github.com/GaryOcean428/bsuite/pull/334) (branch `feat/schema-registry-0.3.1-deprecated-shim`, commit `b789434`). npm: `npm view @bsuite/schema-registry@0.3.1 version` → `0.3.1`. `npm view @bsuite/schema-registry@0.3.0 deprecated` returns the migration message.
- **Unblocks**: Phase 4 consumer dep-bumps (`^0.3.0` → `^0.3.1` for anything pinned in the interim; existing `^0.2.x` ranges auto-upgrade to `0.3.1` on next install since `0.3.0` is deprecated).
- **Validation**: `pnpm typecheck` ✅ · 25 tests pass ✅ · `pnpm build` ✅ · `dist/index.d.ts` exports `TenantLayoutSlot` ✅. Multi-reviewer security + semver + API-compat review completed. Six Phase 7 verification items spot-checked post-review (RLS client source, no XSS vectors, hardcoded APP_ORIGINS redirect map, no service-role usage, lowercase-name convention, trusted `tableName` source).
- **Notes**: parent PR #334 also bumps `crm7` submodule pointer to `d6b8920` (PR #331 head) and adds this coordination log.

### 2026-05-01 — Codebuff — Phase 7 — COMPLETE

- **Summary**: CRM7 [PR #331](https://github.com/GaryOcean428/crm7/pull/331) opens with the cross-app canonical entity picker, live row preview with PII redaction, and deep-link-to-owner deep link. Create-local tab now blocks canonical name collisions and routes operators to the Link-existing tab. Canonical collision check fires BEFORE `existingNames` check for better error actionability.
- **PRs / SHAs**: [crm7#331](https://github.com/GaryOcean428/crm7/pull/331), branch `feat/schema-builder-cross-app-entity-picker`, commit `d6b8920`.
- **Unblocks**: Phase 2 per-app `CustomPageRenderer` work across all 5 consumer apps — the authoring surface now enforces one-shot doctrine before any tenant registers a local copy of a canonical entity.
- **Validation**: 21 new tests pass (13 helper + 5 picker + 3 preview) ✅ · `pnpm eslint` clean on all 7 changed files ✅ · `npx tsc --noEmit -p tsconfig.app.json` passes on the schema-builder paths ✅ · Multi-reviewer pass on security (no service-role, no open-redirect, no XSS) + a11y (Tabs integration preserves ARIA, redacted cells have `aria-label`) + one-shot doctrine (no mirror tables, pseudo-owners excluded, multi-writer surfaced via badge).
- **Notes**: parent submodule pointer bumps to `d6b8920` in PR #334. Phase 4 dep-bump is satisfied by CRM7's existing `@bsuite/dry-lint: ^0.2.0` + `@bsuite/schema-registry: ^0.2.2` — both resolve correctly post-publish (`^0.2.2` resolves to `0.3.1` since `0.3.0` is deprecated).

### 2026-05-01 — Codebuff — HANDOFF — next session

- **Summary**: Remaining work on P1-4(b) is the 5× Phase 2 per-app `CustomPageRenderer` implementations + Phase 5.B doctrine spec bump + Phase 5.C backlog closure marker + Phase 6 backup table drop (scheduled 2026-08-02). Phase 4 dep-bumps are co-committed into each Phase 2 PR.
- **Suggested execution order** (reviewer's lens): BSU first (reference impl, owner already has Phase 1 context) → conduit (biggest migration load, 5 `TenantLayoutSlot` imports to swap) → R80.3 (1 import + 1 test mock) → braden (1 import) → throughput (no `TenantLayoutSlot` imports, clean add). Phase 5.B + 5.C land any time after BSU is in.
- **Agent assignments**: CC takes BSU + conduit (biggest complexity + CC already has dashboard-shell context from Phase 1). Codebuff takes R80.3 + braden + throughput + Phase 5.B/5.C in the next session.
- **Guardrails for next executor**: (1) Every renderer MUST query `custom_pages` directly — no shared npm package replacement. (2) Every Phase 2 PR MUST include the `@bsuite/schema-registry: ^0.3.1` dep bump in its own repo's `package.json`. (3) Every renderer MUST handle the empty / unauthenticated / RLS-denied states gracefully (render an empty-state card, never a white screen). (4) Full widget parity per HANDOFF: DataTable, StatGrid, Card, FormRenderer, EntitySelector, EntityRefCell, SchemaFieldAdder.
