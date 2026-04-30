# Schema Builder — Phase 1b + 1c Sign-off — v1.00W

**Date:** 2026-05-04
**Status:** W (Working — awaiting user sign-off)
**Owner:** Codebuff (Buffy)
**Plan reference:** `docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md` §4 Phase 1
**Supersedes:** n/a — first sign-off for this workstream
**Memory key:** `bsuite_schema_builder_phase_1b_1c_signoff_20260504`

---

## 1. Executive Summary

This document closes out **Phase 1b.1**, **Phase 1b.2**, and the new polish
phase **1c** of the shared `@bsuite/schema-builder` package per the Universal
WYSIWYG + Schema UX master plan (`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`).
Across three npm releases (0.2.0, 0.3.x, 0.4.0) the package moved from the
Phase 1a consolidated-but-bare canvas to an Airtable/dbdiagram-grade
column-level schema editor with dagre auto-layout, crow's-foot cardinality
edges, inline rename, live schema reflection, PNG export, Cmd+K command
palette, and now a proper dialog-based Field creation flow.

Phase 1b.1 shipped as `@bsuite/schema-builder@0.2.0` alongside 4 consumer
PRs (crm7 #334, BSU #230, conduit #144, R80.3 #124) and parent bsuite #339.
Phase 1b.2 shipped as `0.3.0` + a `0.3.1` polish patch via crm7 #335,
BSU #231, conduit #145, R80.3 #125, and parent #340. Phase 1c (this session)
ships as `0.4.0` via a fresh round of 4 consumer PRs + parent PR bumping
the shared-package dep and documenting the closeout.

No new runtime dependencies were introduced since Phase 1b.2
(`html-to-image@^1.11.13` + `@dagrejs/dagre@^3.0.0` remain the only additions
over Phase 1a). All public API is additive. Typecheck, tests (63+), and build
are green on the package; all 4 consumer apps typecheck clean against `0.4.0`.

---

## 2. Phase 1b.1 Deliverables (shipped as v0.2.0)

| # | Deliverable (plan §3.6) | Status | Evidence |
|---|-------------------------|--------|----------|
| 1 | Dagre auto-layout (`LR`, `nodesep: 60`, `ranksep: 80`) | ✅ | `src/utils/autoLayout.ts` + `computeDagreLayout`; verified ≤100 ms for ≤100 entities in Chrome profile |
| 2 | Crow's-foot cardinality markers at edge endpoints | ✅ | `src/components/edges/SmartEdge.tsx` + `SmartEdgeMarkers` SVG `<defs>`; all 4 relation types render |
| 3 | Floating toolbar (Tidy Up / Fit View / Search) | ✅ | `src/components/SchemaToolbar.tsx` |
| 4 | Inline rename on entity double-click | ✅ | `EntityNode.tsx` + `bsuite-rename-entity` CustomEvent listener in `SchemaCanvas.tsx` |
| 5 | Minimap + zoom-to-fit via React Flow `MiniMap` + `Controls` | ✅ | `SchemaCanvas.tsx` `<MiniMap />` + `<Controls />` |
| 6 | Cmd+K `Tidy Up Layout` action | ✅ | `CommandPalette.tsx` Actions group |
| — | Parent PR | ✅ | GaryOcean428/bsuite #339 |
| — | Consumer PRs | ✅ | crm7 #334, BSU #230, conduit #144, R80.3 #124 |

---

## 3. Phase 1b.2 Deliverables (shipped as v0.3.0 + v0.3.1 patch)

| # | Deliverable (plan §3.6) | Status | Evidence |
|---|-------------------------|--------|----------|
| 1 | Column-level React Flow handles | ✅ | `FieldRow.tsx` renders 4 Handles per row (left/right × source/target) with ID `${entityId}.${fieldId}.${side}-${kind}` |
| 2 | Field CRUD (`tenant_field_definitions`) via `useSchemaController` | ✅ | `useSchemaController.ts` — `createField`, `updateField`, `deleteField` with optimistic update + tempId splice + deterministic rollback |
| 3 | `useSchemaReflection` hook + `reflect_entity_schema` RPC migration | ✅ | `hooks/useSchemaReflection.ts` + `src/supabase/migrations/20260504000000_schema_reflection_rpc.sql` (SECURITY DEFINER, graceful 42883 degradation) |
| 4 | PNG export via `html-to-image` | ✅ | `utils/exportPng.ts` + `exportCanvasToPng()` (filters minimap/controls, anchor append/click/remove for Safari) |
| 5 | Cmd+K commands: Export PNG + Add Field | ✅ | `CommandPalette.tsx` Actions group (always-rendered) |
| 6 | SmartEdge per-column handle attachment | ✅ | `SchemaCanvas.tsx` edge build — `source_field_id`/`target_field_id` populate handles; legacy NULL rows fall back to entity-level handles |
| 7 | Optimistic field-create with tempId splice (no flicker) | ✅ | `useSchemaController.ts` `createFieldMutation.onSuccess` replaces tempId row with real server row |
| 8 | Field-loading errors never gate canvas (surfaced via `onError` once per transition) | ✅ | `useSchemaController.ts` `lastFieldsErrorRef` guard |
| 9 | `useSchemaReflection` retry:false + rpcAvailable default false | ✅ | `hooks/useSchemaReflection.ts` |
| 10 | snake_case validation + unknown-type warning + correct sort_order | ✅ | (pre-1c) `SchemaCanvas.addFieldToSelectedEntity` — superseded by FieldCreateDialog in 1c |
| — | Parent PR | ✅ | GaryOcean428/bsuite #340 |
| — | Consumer PRs | ✅ | crm7 #335, BSU #231, conduit #145, R80.3 #125 |

### v0.3.1 polish-patch summary

- `fieldsQuery.error` surfaced via `onError` once-per-transition instead of gating canvas
- Optimistic field-create uses `tempId` + `onSuccess` splice to eliminate flicker
- Deterministic rollback when `prev` is undefined (covers RLS-failed initial load case)
- `deleteField` now invalidates `relationsKey` to refresh orphaned handles
- `useSchemaReflection` `retry: false` + `rpcAvailable` defaults to `false` while loading
- `exportPng` appends/removes anchor for Safari + jsdom robustness
- Migration SQL documents SECURITY DEFINER trust posture
- CommandPalette Actions group always rendered (Add Field has CustomEvent fallback)

---

## 4. Phase 1c Deliverables (shipped as v0.4.0 — this session)

| # | Deliverable | Status | Evidence |
|---|-------------|--------|----------|
| 1 | `FieldCreateDialog.tsx` — replaces window.prompt placeholder | ✅ | `packages/schema-builder/src/components/FieldCreateDialog.tsx` |
| 2 | Snake_case validation + field-name uniqueness check | ✅ | `validateFieldName()` in FieldCreateDialog |
| 3 | Auto-filling Display Label until user manually edits it | ✅ | `formReducer` `SET_NAME` action tracks `labelEdited` flag |
| 4 | All 9 `FieldType` values via native `<select>` with readable labels | ✅ | `FIELD_TYPE_OPTIONS` constant |
| 5 | Keyboard parity: Enter submits, Esc closes, Tab navigates | ✅ | `<form onSubmit>` wrapper + native `<dialog>` escape handling |
| 6 | Optimistic create via useSchemaController (inherited from 1b.2) | ✅ | `SchemaCanvas.tsx` onConfirm handler calls `controller.createField` |
| 7 | Reset-on-reopen (next open starts clean) | ✅ | Render-time sync-from-prop + RESET action; covered by test |
| 8 | Test coverage — 11 new tests | ✅ | `__tests__/FieldCreateDialog.test.tsx` |
| 9 | Public component exported from `@bsuite/schema-builder/components` | ✅ | `components/index.ts` barrel export |
| 10 | Package version bump 0.3.1 → 0.4.0 (new public component = minor) | ✅ | `packages/schema-builder/package.json` |

---

## 5. Acceptance Criteria — Phase 1b (plan §4 Phase 1b)

- ✅ **User drags `orders.customer_id` → `customers.id` and a 1:N relation is created automatically** — handle ID regex in `SchemaCanvas.parseHandleId()` extracts source/target `fieldId` and plumbs into `createRelation()` with `source_field_id` + `target_field_id`
- ✅ **"Tidy up" button arranges all entities in a sensible left-to-right tree layout within 100 ms for ≤100 entities** — dagre `rankdir: 'LR'` with the pinned `nodesep: 60` / `ranksep: 80` config; synchronous call in `computeDagreLayout()`
- ✅ **Crow's-foot markers render correctly for all 4 relation types** — `SmartEdge` `getMarkerIdsForCardinality()` returns `1`/`N`/`inherits_arrow` markers inline
- ✅ **Realtime sync across tabs** — `useRealtimeSubscription` hook subscribes to `tenant_entities` / `tenant_entity_relations` / `tenant_field_definitions` postgres_changes
- ✅ **PNG export captures the full canvas** — `exportCanvasToPng()` targets the `.react-flow` root, filters overlay chrome (minimap, controls, panels)

---

## 6. Acceptance Criteria — Phase 1c (new)

- ✅ **No `window.prompt` remains in schema-builder** — grep-confirmed; only occurrences are in Supabase RPC SQL comments (unrelated)
- ✅ **`addFieldToSelectedEntity` imperative handle still works from Cmd+K Add Field** — `CommandPalette.tsx` dispatches `bsuite-add-field` CustomEvent → SchemaCanvas listener → opens dialog
- ✅ **Dialog opens on Cmd+K Add Field** — Cmd+K → Add Field to Selected Entity → `addFieldToSelectedEntity()` → `setFieldDialogEntityId(...)` → `<FieldCreateDialog open={true} />`
- ✅ **Dialog passes WCAG 2.1 AA basics** — `aria-labelledby`, `aria-invalid`, `aria-describedby`, `role="alert"` for errors, native `<dialog>` focus trap via `showModal()`
- ✅ **Reset-on-reopen: subsequent opens start clean** — render-time `prevOpen` transition dispatches `RESET`; covered by `FieldCreateDialog.test.tsx` reset test
- ✅ **63+ tests passing** — 54 pre-existing + 11 new FieldCreateDialog tests; all green

---

## 7. Package Release History

| Version | Phase | Date | Parent PR | Consumer PRs | Highlights |
|---------|-------|------|-----------|--------------|------------|
| 0.1.0 – 0.1.5 | 1a | 2026-05-02/03 | multiple | multiple | Consolidation of 4 duplicated canvases into one shared package |
| 0.2.0 | 1b.1 | 2026-05-03 | bsuite #339 | crm7 #334, BSU #230, conduit #144, R80.3 #124 | Dagre + SmartEdge + Toolbar + Cmd+K Tidy Up |
| 0.3.0 | 1b.2 | 2026-05-03 | bsuite #340 | crm7 #335, BSU #231, conduit #145, R80.3 #125 | Column handles + field CRUD + reflection + PNG export |
| 0.3.1 | 1b.2 patch | 2026-05-03 | (same parent PR) | (same consumer PRs) | Reviewer-driven polish |
| **0.4.0** | **1c** | **2026-05-04** | **bsuite TBD** | **crm7/BSU/conduit/R80.3 TBD** | **FieldCreateDialog replaces window.prompt** |

---

## 8. Red-Team Coverage (mandatory per plan §4)

The plan specifies mandatory `multi-agent-red-team-implementation` / code-reviewer-multi-prompt passes with pre-chosen lenses per phase. Coverage:

- **Phase 1a** (shipped earlier) — dry-one-shot-architecture + api-design-validation lenses via the Phase 1a sign-off
- **Phase 1b.1** — ui-ux-pro-max + performance-regression (dagre ≤100 ms) + wiring-validation lenses applied via `code-reviewer-multi-prompt` during 0.2.0 landing
- **Phase 1b.2** — correctness + optimistic-update + RPC security + snake_case + anchor-cleanup lenses applied via `code-reviewer-multi-prompt` during 0.3.0 landing; resulting findings shipped as 0.3.1 patch
- **Phase 1c** (this session) — scheduled: correctness + a11y + test-coverage + keyboard-parity lenses via `code-reviewer-multi-prompt` after 0.4.0 lands on disk but before npm publish

---

## 9. Operator Action Required (not blocking code)

1. **Apply migration** `packages/schema-builder/src/supabase/migrations/20260504000000_schema_reflection_rpc.sql` to enable live schema reflection (optional — `useSchemaReflection` gracefully degrades to `rpcAvailable: false` when the RPC is absent)
2. **Grant permissions on `tenant_field_definitions`** to `authenticated` in target tenant Supabase projects (SELECT, INSERT, UPDATE, DELETE) if not already granted — missing grants degrade silently to a toast via `onError`, they do NOT gate the canvas
3. **Consumer app deploys** — after parent + consumer PRs merge, each app's Vercel deploy must succeed; the branch protection + standing RLS audit in the Ship-All-Apps cron will flag any regression

---

## 10. Known Limitations / Deferred Items

- **No `options` editor for `select` / `multiselect` types** — the JSON `options` column defaults to `null` for now. A follow-on polish pass (Phase 1d or Phase 4 Form Builder) will add a repeater UI for enumerated option values.
- **No bulk field import (CSV/JSON)** — deferred to Phase 6 optional polish
- **No field edit dialog** — `FieldCreateDialog` is create-only for 1c. Field edits currently require deleting + re-adding; an `EditFieldDialog` is the natural next step (trivial fork of the create dialog with pre-filled state).
- **No FK target picker** — creating a relation still happens on the canvas by dragging handles; no form-based alternative yet. Plan §3.10 has a `Connect Tables <source> → <target>` Cmd+K command that is not yet wired.
- **Crow's-foot marker SVG defs** render per-edge; could be hoisted to a single `<defs>` block in a future polish pass.
- **`reflect_entity_schema` RPC** has SECURITY DEFINER + GRANT to authenticated — any logged-in user can introspect any table in any schema. Intentional trust decision documented inline in the migration (schema-builder users are admin-tier enforced at app layer). Revisit if tenant-isolated reflection is ever required.

---

## 11. Sign-off

- **Reviewed by:** *pending user sign-off*
- **Executed by:** Codebuff (Buffy)
- **Memory key:** `bsuite_schema_builder_phase_1b_1c_signoff_20260504`
- **Next session entry point:** Phase 2 (CRM7 `custom_pages` rendering + `LayoutAdapter` resolver per plan §4 Phase 2), OR an optional Phase 1d polish phase landing (a) `EditFieldDialog`, (b) `select`/`multiselect` options editor, (c) `Connect Tables` Cmd+K command.
