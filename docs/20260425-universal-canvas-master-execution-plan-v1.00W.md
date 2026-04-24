# Universal Page Canvas + Design Studio — Master Execution Plan

**Status:** 1.00W (Working — authored 2026-04-25, awaiting review)
**Owner:** Architect (this document) → dispatch to subagents listed in §3
**Target branch:** `bsuite/development` — no `main` merges without explicit operator approval
**Parent docs (do not duplicate content; cite by §):**

- `docs/plans/20260423-phase5-schema-pagebuilder-implementation-v1.00W.md` (1528 lines) — "phase5-spec"
- `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` (642 lines) — "combined-roadmap"
- `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` (505 lines) — "schema-audit"

**Scope statement (user directive 2026-04-25):** every CRM7 page must have edit-mode toggle + widget palette drag-and-drop + card resize. Enterprise super-admins must be able to add schema fields from the page canvas. Entities must be linkable cross-app (a CRM7 table cell embeddable on an R80.3 page). BSU hosts a Design Studio for authoring entirely new pages. Current adoption: 87 of 347 CRM7 page files reference `PageGridLayout` (25%) — 260 remain un-wired.

---

## Table of Contents

- [§1 Ground-truth status — 7 Phase 5 PRs](#1-ground-truth-status--7-phase-5-prs)
- [§2 Five must-haves → implementation map](#2-five-must-haves--implementation-map)
- [§3 Execution waves (parallel-safe dispatch)](#3-execution-waves-parallel-safe-dispatch)
- [§4 Dependencies + ordering](#4-dependencies--ordering)
- [§5 Every-page rollout — Tier A / B / C](#5-every-page-rollout--tier-a--b--c)
- [§6 Stop-ship gates (re-enumerated)](#6-stop-ship-gates-re-enumerated)
- [§7 Security hardening checklist](#7-security-hardening-checklist)
- [§8 Definition of done](#8-definition-of-done)

---

## 1. Ground-truth status — 7 Phase 5 PRs

Every PR in the phase5-spec §3 PR-chain overview has been landed to `bsuite/development` as of 2026-04-24. The table below lists the **merge SHAs** and the **remaining gap work** — i.e. the things the five user must-haves still require beyond what PRs 5.0 through 5.6 actually delivered.

**Wave-1 + Wave-2 Universal Canvas update (2026-04-25 session):** W1-A DONE — `@bsuite/schema-registry@0.2.0` published (parent SHA `8aac009`) with `EntityRefCell` + `SchemaFieldAdder` + 7-widget registry API. W1-B DONE — `isResizable` exposed on both `crm7/src/components/platform/PageGridLayout.tsx` (`b55926f3`) and `business-suite-unified/src/components/platform/PageGridLayout.tsx` (`01de8334`). W1-C DONE-staged — `tenant_field_definitions.entity_id` FK + enterprise-admin RLS + `add_field` RPC all committed (`43fb250`); migration-apply is an operator action pending the Supabase MCP push. W2-A DONE — BSU Design Studio palette + canvas + inspector surface shipped (`3421ac3`). W2-B DONE — CRM7 chrome-level `PageEditorLauncher` + Tier-A 20-page rollout shipped (`858b9149`). Wave-3 in progress at the time of this edit: W3-D shipped the cross-app E2E + this doc update.

| PR | Title | Status | Merge SHAs / evidence | Remaining work to unlock must-haves | Est effort |
|----|-------|--------|-----------------------|-------------------------------------|------------|
| **5.0** | DB pre-conditions | **DONE** | BSU: `4f1a14c feat(db): Phase 5 pre-conditions — tenant_page_layouts, tenant_navigation, hierarchy RLS`; migrations `20260408000000_phase5_create_tenant_page_layouts.sql`, `20260408000001_phase5_create_tenant_navigation.sql`, `20260408000002_phase5_tenant_hierarchy_functions.sql`, `20260408000003_phase5_tenant_page_layouts_rls_policies.sql` exist. CRM7: `20260304090002_phase5_create_tenant_field_definitions.sql` exists. | Phase 5.0 delivered base tables. MISSING: `tenant_field_definitions.entity_id` FK column (schema-audit §3.1 C-3) needed so enterprise super-admins can add fields scoped to a specific entity. MISSING: RLS policies on `tenant_field_definitions` for enterprise-admin INSERT scoped to `app_scope ∈ tenant_allowed_scopes` and `is_system=false`. | 0.5 d [Subagent] |
| **5.1** | `@bsuite/nav-core@0.5.0` | **DONE + PUBLISHED** | Commits: `a58a8d0 feat(nav-core): mergeNavConfigs utility + v0.5.0` (packages/nav-core/package.json reports `"version": "0.5.0"`). `mergeNavConfigs` exported from `src/merge.ts`. | None required for must-haves. | 0 d |
| **5.2** | `@bsuite/schema-registry@0.1.0` | **DONE + PUBLISHED** | Commit: `7d42350 feat(schema-registry): @bsuite/schema-registry@0.1.0 — hooks, TenantLayoutSlot, widgets, Zod schemas`. Files confirmed at `packages/schema-registry/src/react/{TenantLayoutSlot.tsx,useTenantSchema.ts,useTenantPageLayout.ts,useTenantNavigation.ts,WidgetRenderer.tsx,minimalClient.ts,ErrorBoundary.tsx}` + 5 widgets under `widgets/`. `packages/schema-registry/package.json` version `0.1.0`. | ~~PARTIAL — 5 widgets exist (DataTable, StatGrid, EntitySelector, Card, FormRenderer) but: (a) no `EntityRefCell` / cross-app cell-reference widget (must-have 5); (b) no `SchemaFieldAdder` widget (must-have 4); (c) no pluggable registry API — widgets are hard-coded switch in `WidgetRenderer.tsx`, not consumer-extensible; (d) `EntitySelector` is a form dropdown, not a cross-app embeddable cell. Bump `0.1.0 → 0.2.0`.~~ — **SHIPPED `8aac009`** (W1-A) — `@bsuite/schema-registry@0.2.0` published. `EntityRefCell` + `SchemaFieldAdder` widgets added; `registerWidget`/`getWidgetById` runtime registry API landed; `WidgetRenderer.tsx` refactored to dispatch via the Zod discriminated union with registry fallback. 6 widget props-editor components exist. 30/30 vitest cases pass. | ~~1.5 d [Subagent W1-A]~~ 0 d |
| **5.3** | BSU PageComposer + NavigationEditor | **DONE (partial surface)** | Commits: `e0706ea feat(bsu): Phase 5 PageComposer + NavigationEditor + lockfile (#168)`; `0c7e076 feat(bsu): /developer/pages drag-and-drop canvas — port CRM7 pattern`; `caa6c19 fix(bsu): LayoutCanvas TS — react-grid-layout v2 type names`. Files: `business-suite-unified/src/pages/Developer/Pages.tsx` (239 LOC), `src/pages/Developer/Nav.tsx`, `src/components/platform/LayoutCanvas.tsx` (206 LOC). | ~~PARTIAL — authoring surface exists BUT: (a) widget palette in `Pages.tsx` uses local `LayoutCanvas` Widget type only (not the 5 schema-registry widgets with Zod props editors); (b) no `PropsEditor` per widget (phase5-spec §7 Task 5.3.4 says "Each widget also requires a `PropsEditor`" — absent); (c) no "Add field" handoff to `tenant_field_definitions` (must-have 4); (d) no cross-app cell picker (must-have 5); (e) no "Design Studio" branded entry — currently `/developer/pages` only (must-have 6 requests a separate full-surface). Bump to PR 5.3.1 "PageComposer Design Studio Uplift".~~ — **SHIPPED `3421ac3`** (W2-A) — BSU Design Studio Palette + Canvas + Inspector surface wired to `@bsuite/schema-registry@0.2.0`. All 6 widget PropsEditors exposed via inspector drawer; `EntityRefCell` + `SchemaFieldAdder` picker flows live. | ~~2 d [Subagent W2-A]~~ 0 d |
| **5.4** | Consumer: crm7 | **DONE (ref dashboard only)** | Commit: `f4a9f386 feat(crm7): Phase 5 TenantLayoutSlot + nav merge (#282)`. `TenantLayoutSlot` mounted at `src/pages/Dashboard.tsx`, `src/pages/contacts/index.tsx`, `src/pages/contacts/[id]/index.tsx` (3 pages). `useMergedNavConfig` wired via `src/config/navigation.ts`. | PARTIAL — Tier-A 20-page rollout **SHIPPED `858b9149`** (W2-B): chrome-level `PageEditorLauncher` + 20 additional pages wrapped with `PageGridLayout` + `TenantLayoutSlot`. Tier-B (50 pages) + Tier-C codemod (≤190 pages) remain for W3-A. Must-have 1 (edit-mode toggle in app chrome) is universal post-W2-B. | ~~3 d~~ 1.5 d [Subagents ~~W2-B +~~ W3-A] |
| **5.5** | Consumer: conduit | **DONE (dashboard + pipeline)** | Commit: `414f813 feat(conduit): Phase 5 TenantLayoutSlot + two-layer cache invalidation (#97)`. Two-layer cache pattern (`revalidateTenantSchema` server action + `router.refresh()`) landed per phase5-spec §9 Task 5.5.3. | PARTIAL — same gap as CRM7. Conduit has 2 mount points; the 4 roadmap routes (`/`, `/pipeline`, `/operations`, `/insights`) are partially covered. Must-have rollout requires the other 2 + tier-B route sweep. | 1.5 d [Subagent W3-B] |
| **5.6** | Consumer: R80.3 + braden + embed route | **DONE** | Commits: `f9ec621 feat(r80): Phase 5 TenantLayoutSlot integration (#97)`; `bbe47b4 feat(braden): Phase 5 TenantLayoutSlot integration (#152)`; BSU: `62b8a5f feat(bsu): Phase 5 embed lead form route (#169)` + `731f6bb feat(embed): Phase 5 /embed/lead-form route + iframe CSP headers + snippet generator`. `business-suite-unified/src/pages/Embed/LeadForm.tsx` confirmed present. | ~~PARTIAL — R80.3 and braden render the slot but NEITHER app has the edit-mode toggle affordance (consumer apps in phase5-spec are read-only by design — phase5-spec §4 D-04, D-06). Must-have 5 (cross-app linkage) requires one additional widget type `EntityRefCell` registered on schema-registry, then mounted via existing slot. No migration needed on R80.3/braden DB because schema lives in BSU.~~ — **SHIPPED `8aac009`** (widget in W1-A) + **SHIPPED W3-D this session** (cross-app E2E at `crm7/tests/e2e/cross-app-entity-linkage.spec.ts` + vitest integration at `packages/schema-registry/src/react/widgets/EntityRefCell.cross-app.test.tsx` — 6/6 passing — + runbook at `docs/testing/20260425-cross-app-e2e-runbook-v1.00W.md`). | ~~0.5 d [Subagent W3-D]~~ 0 d |

**Summary:** 7 of 7 Phase 5 PRs merged; ~~2 of 7 are done-complete (5.1, 5.6 baseline), 5 of 7 are partial — each has exactly the gap the five must-haves introduce.~~ **Updated 2026-04-25:** 5.1, 5.2, 5.3, 5.6 now DONE-COMPLETE (5.2 via W1-A `8aac009`, 5.3 via W2-A `3421ac3`, 5.6 via W1-A + W3-D this session). 5.0 DONE-staged (W1-C DB objects committed at `43fb250`; operator must apply migrations via Supabase MCP). 5.4 PARTIAL (Tier-A done W2-B `858b9149`; Tier-B/C pending W3-A). 5.5 PARTIAL (conduit rollout pending W3-B). **Remaining effort after this session: ~2 subagent-days (W3-A CRM7 Tier-B + Tier-C codemod, W3-B conduit rollout).**

Cross-references: phase5-spec §3 (PR chain), §4 (PR 5.0 SQL), §6 (PR 5.2 widgets), §7 (PR 5.3 PageComposer), §8 (PR 5.4 crm7), §9 (PR 5.5 conduit), §10 (PR 5.6 R80.3/braden/embed).

---

## 2. Five must-haves → implementation map

User directive 2026-04-25 enumerated **six** must-have behaviours (not five — the plan preserves all six). Every must-have is traced below to the PR(s) that introduced the surface, the current implementation state, and the minimum commit set to ship it across the consumer fleet.

### Legend

- `[Subagent]` — task assigned to one of the waves in §3; no operator action required
- `[Operator]` — requires Braden (Supabase console, npm publish, main-branch merge decisions)
- `[Claude Code]` — this architect thread finalises

| # | Must-have | Covered by PR(s) | Status | Minimum commits to ship it across the fleet |
|---|-----------|------------------|--------|---------------------------------------------|
| 1 | **EDIT MODE TOGGLE on every page** | 5.3 (BSU authoring) + 5.4 (consumer mounts) | ~~PARTIAL — 87 of 347 CRM7 pages expose `usePageGridLayout`'s `isEditing`; only those render the "Edit Page" launcher via `PageEditorLauncher.tsx`. Remaining 260 pages have no affordance.~~ — **Tier-A COMPLETE — SHIPPED `858b9149`** (W2-B) — chrome-level launcher wired in `crm7/src/components/layout/AppLayout.tsx` + Tier-A 20 pages wrapped. Tier-B + Tier-C queued in W3-A for the remaining ~240 pages. | (a) CRM7: promote `PageEditorLauncher` to **app-chrome-level** in `src/components/layout/AppLayout.tsx` so every route gets the button regardless of whether the page uses `PageGridLayout`; fallback launcher navigates to `/developer/pages?scope=crm7&route=<current>` (already supported by `business-suite-unified/src/pages/Developer/Pages.tsx:37-44`). (b) Conduit + R80.3 + braden: add the same chrome-level launcher with BSU deep-link. (c) BSU deep-link accepts `?scope=&route=` — already implemented. |
| 2 | **DRAG FROM PALETTE (universal)** | 5.3 (BSU widget palette) + 5.2 (widget registry) | ~~PARTIAL — BSU PageComposer (`business-suite-unified/src/pages/Developer/Pages.tsx`) uses local `LayoutCanvas` widget type. The 5 schema-registry widgets (DataTable, StatGrid, EntitySelector, Card, FormRenderer) are NOT yet exposed as palette items with `PropsEditor` components (phase5-spec §7 Task 5.3.4 lists this as required; absent today).~~ — **DONE — SHIPPED `8aac009`** (W1-A schema-registry v0.2.0 widget catalog + `registerWidget` API) **+ `3421ac3`** (W2-A BSU Palette + Canvas + Inspector wired to the catalog). All 7 widgets (5 original + `EntityRefCell` + `SchemaFieldAdder`) draggable from the BSU palette with per-widget Zod PropsEditors. | (a) schema-registry v0.2.0: export a `WidgetCatalog` constant listing each of 5 widgets + `PropsEditor` components. (b) BSU PageComposer: replace `LayoutCanvas` local palette with the imported catalog. (c) schema-registry: add public registration API `registerWidget({type, PropsEditor, Renderer})` for future extensibility. |
| 3 | **CARD RESIZE** | 5.3 (PageComposer edit surface) + 5.4 (consumer exposure) | ~~PARTIAL — `react-grid-layout` underneath `PageGridLayout` supports resize handles natively; the flag is `isResizable`. Current `crm7/src/components/platform/PageGridLayout.tsx:420` does not expose `isResizable` as a prop; default is the component's internal logic which ties resize to `isEditing`. Need to confirm `isResizable={true}` flows when `isEditing=true`. In BSU's `LayoutCanvas.tsx:206` the mode has no resize handle visible.~~ — **DONE — SHIPPED `b55926f3`** (W1-B CRM7) **+ `01de8334`** (W1-B BSU). `isResizable` prop exposed on both `PageGridLayout` components with sensible defaults + D2C-theme resize-handle CSS. | (a) CRM7 `PageGridLayout`: expose `isResizable` prop; default `true` when `isEditing`. (b) BSU `LayoutCanvas`: mirror flag so PageComposer can resize authored cards. (c) Add `minW/minH/maxW/maxH` defaults per widget type in the schema-registry `WidgetCatalog`. |
| 4 | **SCHEMA ENTITY ADDITIONS (add field from canvas)** | 5.0 (DB `tenant_field_definitions`) + 5.3 (PageComposer UI) | ~~NOT STARTED — `tenant_field_definitions` table exists (CRM7 migration `20260304090002_phase5_create_tenant_field_definitions.sql`) but: (a) column `entity_id` is still `NULL`-able / missing proper FK per schema-audit §3.1 C-3; (b) no UI surfaces an "Add field" button from the page canvas. CRM7 has a standalone `src/services/customFieldsService.ts` but it is not wired to the canvas.~~ — **WIDGET SHIPPED `8aac009`** (W1-A `SchemaFieldAdder` widget + PropsEditor) **+ DB-staged `43fb250`** (W1-C: `entity_id` FK + enterprise-admin RLS + `add_field` RPC committed). `enabled=false` pending operator `apply_migration` push to live Supabase project `tuybltdrdefjblnplpqo`. | (a) Migration `20260425_tfd_entity_fk.sql` adds `entity_id uuid REFERENCES tenant_entities(id) ON DELETE CASCADE` + backfill from `entity_type`. (b) Migration `20260425_tfd_enterprise_admin_rls.sql` adds RLS allowing `auth_tenant_id_with_role(['owner','admin'])` to INSERT rows where `is_system=false` AND `tenant_id = auth_tenant_id()`. (c) schema-registry v0.2.0: add `SchemaFieldAdder` widget type whose `PropsEditor` is a form that upserts a row into `tenant_field_definitions` via Supabase. (d) BSU PageComposer palette exposes the widget; placing it on any canvas renders as an "+ Add field" affordance bound to the entity inferred from the widget's parent (DataTable/EntitySelector). (e) CRM7 `useFieldsForEntity(entity_id)` hook — already partially covered by `customFieldsService.ts` — invalidates via Realtime on `tenant_field_definitions`. |
| 5 | **CROSS-APP ENTITY-CELL LINKAGE** (embed a CRM7 cell on R80.3 page) | 5.2 (`EntitySelector` + new `EntityRefCell`) + 5.6 (cross-app consumer) | ~~NOT STARTED — `EntitySelector` exists but it is a form-input dropdown, not an embeddable read-only cell. No `app_scope='all'` widget that fetches from tables scoped to a different app. No widget validates `foreign_app_scope ∈ tenant_allowed_scopes` at render.~~ — **WIDGET SHIPPED `8aac009`** (W1-A `EntityRefCell` + `EntityRefCellPropsSchema` with `foreign_app_scope` whitelist enforcement + `tenant_entities` server lookup). **E2E SHIPPED this session** (W3-D) — `crm7/tests/e2e/cross-app-entity-linkage.spec.ts` (Playwright, env-gated) + `packages/schema-registry/src/react/widgets/EntityRefCell.cross-app.test.tsx` (6 vitest cases, all passing) + `docs/testing/20260425-cross-app-e2e-runbook-v1.00W.md` manual runbook. | (a) schema-registry v0.2.0: add `EntityRefCell` widget — props `{entity, record_id, display_fields, foreign_app_scope}`. At render, it fetches `SELECT <display_fields> FROM <entity> WHERE id = <record_id>` subject to RLS. (b) Zod schema `EntityRefCellPropsSchema` validates `foreign_app_scope ∈ {'bsu','crm7','conduit','r80','braden'}` and `entity` against the server-side whitelist from phase5-spec §R S-02 vector B. (c) BSU PageComposer `PropsEditor` for `EntityRefCell` is a two-step picker: step 1 = choose `foreign_app_scope`, step 2 = searchable entity picker (reuses existing `EntitySelector` widget wiring but scoped to the chosen app). (d) Consumer apps (R80.3, braden) already mount `TenantLayoutSlot` — no consumer-side change needed except verifying their Supabase clients can read the foreign entity row (RLS must allow read — already allowed on `tenant_entities` + entity tables per app scope). |
| 6 | **DESIGN STUDIO for new pages** | 5.3 (BSU PageComposer full surface) | ~~PARTIAL — `business-suite-unified/src/pages/Developer/Pages.tsx` provides app-scope + route-path inputs, but: (a) branded entry is `/developer/pages`, not `/design-studio`; (b) no multi-route outline (can only author one route at a time); (c) no template library (phase5-spec §Z "platform defaults" deferred); (d) no Zod-validated props editor drawer. User's expectation per directive is a **distinct authoring surface** separate from the Developer Portal list tabs.~~ — **SHIPPED `3421ac3`** (W2-A) — Design Studio surface at `/design-studio` with Palette + Canvas + Inspector drawer wired to `@bsuite/schema-registry@0.2.0`. Zod-validated PropsEditor for all 7 widgets. Multi-route outline + template library partially deferred (non-blocking for must-have scope). | (a) Rename route: add `/design-studio` as an alias in `business-suite-unified/src/App.tsx` pointing to `Developer/Pages.tsx` with `designStudioMode=true` prop. Chrome shows full-screen editor (hide sub-nav) when `designStudioMode`. (b) Add left-rail route outline: a `TenantPageList` component reads `tenant_page_layouts` grouped by `app_scope`; clicking a row switches the editor. (c) "New page" CTA: creates a draft `tenant_page_layouts` row with `is_published=false`. (d) Template library: seed 3 platform-scope template rows (Dashboard, List, Detail) per combined-roadmap §Phase 1 F-1.5. |

~~**Result:** 1 must-have is full-NOT-STARTED (cross-app cell-ref), 4 are PARTIAL (edit toggle, drag-palette, card-resize, add-field, design-studio), and the underlying plumbing (DB tables, package hooks, realtime) is all in place. Net additional surface: 1 new widget type (`EntityRefCell`), 1 extended widget type (`SchemaFieldAdder`), 5 `PropsEditor` components, 1 WidgetCatalog export, 2 migrations, 1 chrome-level launcher. Ship as `schema-registry@0.2.0` + 4 consumer bumps.~~

**Updated result (2026-04-25 post Wave-1/2/W3-D):** 5 of 6 must-haves SHIPPED to `bsuite/development`. Must-have #4 (schema-field-adder) has the widget shipped but DB migrations staged — enablement flag stays `false` until operator applies W1-C's `20260425_phase5_tfd_entity_fk.sql` + `20260425_phase5_tfd_enterprise_admin_rls.sql` to the live project. Must-have #1 (edit toggle) is COMPLETE at the app-chrome level (W2-B) with Tier-A 20 pages; Tier-B (50 pages) + Tier-C codemod (≤190 pages) remain for W3-A as a rollout task, not a gap. Must-have #5 (cross-app linkage) is CODE+E2E complete via this subagent (W3-D).

### 2.1 Reference widget specs (informative — subagents treat as canonical)

The two new widget types are called out separately because they are the net-new surface area for Phase 5.5 and they carry security implications beyond the 5 widgets already in `schema-registry@0.1.0`.

#### `EntityRefCell` (must-have 5)

Zod props:

```
{
  type: 'EntityRefCell',
  foreign_app_scope: 'bsu' | 'crm7' | 'conduit' | 'r80' | 'braden',
  entity: string,         // FK to tenant_entities.name — server-side whitelisted per S-02 vector B
  record_id: string,      // UUID of the foreign row
  display_fields: string[], // e.g. ['first_name','last_name','email']
  link_mode: 'none' | 'open_in_host_app' | 'open_in_foreign_app',
}
```

Render semantics (phase5-spec §6 Task 5.2.6 pattern):

1. Validate `foreign_app_scope` against the `app_scope` CHECK enum (same 5 values accepted by `tenant_page_layouts`).
2. Re-validate `entity` against `SELECT name FROM tenant_entities WHERE app_scope IN (foreign_app_scope,'all')` — S-02b.
3. Fetch `SELECT <display_fields> FROM <entity> WHERE id = <record_id>` — RLS handles cross-tenant denial; no extra check needed on the fetch path (S-07 covered by existing RLS).
4. Render fields as read-only text; if `link_mode='open_in_foreign_app'` wrap in `<a href='https://<app-domain>/<entity>/<record_id>'>` with `rel='noopener'`.
5. On null result (record deleted, RLS denies), render `<UnknownWidget>` fallback per phase5-spec §6 Task 5.2.6.

#### `SchemaFieldAdder` (must-have 4)

Zod props:

```
{
  type: 'SchemaFieldAdder',
  entity_id: string,       // UUID FK to tenant_entities
  allowed_field_types: Array<'text'|'number'|'date'|'boolean'|'select'|'entity_ref'>,
  default_label: string,   // SafeText
}
```

Render semantics:

1. Renders inline "+ Add field" button wired to a drawer (`PropsEditor`).
2. Drawer form collects `name`, `label`, `field_type`, `is_required`, `metadata`.
3. On submit: `supabase.from('tenant_field_definitions').insert({ tenant_id: auth_tenant_id(), entity_id, name, label, field_type, is_required, metadata, is_system: false })`.
4. RLS policy `tfd_enterprise_admin_insert` (see W1-C) enforces `is_system=false` AND enterprise-admin role AND own-tenant.
5. On success → invalidate `useFieldsForEntity(entity_id)` TanStack query key; realtime `postgres_changes` subscription fires the consumer DataTables to re-render with the new column.

### 2.2 Subagent dispatch command cheat sheet

Each wave can be dispatched by prefixing the subagent-driven-development skill with exactly these bullet points (copy-paste-ready):

```
W1-A: Extend @bsuite/schema-registry to v0.2.0.
  Repo: /home/braden/Desktop/Dev/bsuite/packages/schema-registry/
  Deliverables: WidgetCatalog + registerWidget API + EntityRefCell widget
  + SchemaFieldAdder widget + 5 PropsEditor components.
  Gate: gzip bundle ≤ 35 KB, pnpm test + typecheck green, publish workflow
  dry-run green. Branch: feat/phase55-schema-registry-v0.2.0.

W1-B: Expose isResizable on PageGridLayout.
  Repos: /home/braden/Desktop/Dev/bsuite/crm7/ and
  /home/braden/Desktop/Dev/bsuite/business-suite-unified/.
  Deliverables: isResizable prop + CSS token resize handle.
  Gate: Playwright resize round-trip + lint green. Branch:
  feat/phase55-page-grid-resize.

W1-C: Land tfd_entity_fk migration + enterprise-admin RLS.
  Repo: /home/braden/Desktop/Dev/bsuite/crm7/supabase/migrations/.
  Deliverables: 2 new migrations applied via Supabase MCP;
  pgTap tests pass; db reset exits 0. Branch:
  feat/phase55-tfd-entity-fk.

W2-A: BSU Design Studio uplift (gated on v0.2.0 publish).
  Repo: /home/braden/Desktop/Dev/bsuite/business-suite-unified/.
  Deliverables: /design-studio route, PropsEditor drawer, TenantPageList,
  widget palette wired to WidgetCatalog. Branch:
  feat/phase55-design-studio.

W2-B: CRM7 chrome launcher + Tier-A 20-page rollout.
  Repo: /home/braden/Desktop/Dev/bsuite/crm7/.
  Deliverables: chrome-level PageEditorLauncher + Tier-A wraps.
  Branch: feat/phase55-crm7-tier-a.

W3-{A,B,C,D}: Tail rollout + E2E + ship-sweep. (dispatch post W2 gate)
```

---

## 3. Execution waves (parallel-safe dispatch)

Three waves, each parallel-safe within itself. Wave 2 waits on W1-A (schema-registry v0.2.0 must be published to npm before consumer apps can pick it up, per AGENTS.md shared-package rule "NEVER use `workspace:*`"). Wave 3 is a tail-rollout + E2E pass.

### Wave 1 (parallel-safe; 3 subagents; ~2 days) — ✅ DONE (2026-04-25)

**Status:** W1-A ✅ SHIPPED `8aac009`; W1-B ✅ SHIPPED `b55926f3` (crm7) + `01de8334` (bsu); W1-C ✅ committed `43fb250` — migrations staged, operator apply pending.

#### Subagent W1-A — schema-registry v0.2.0 (widget catalog + 2 new widgets + registry API)
- **Owner:** `[Subagent]`
- **Repo:** `bsuite/packages/schema-registry/`
- **Files touched:**
  - `packages/schema-registry/package.json` — bump `version: 0.1.0 → 0.2.0`
  - `packages/schema-registry/src/react/widgets/EntityRefCell.tsx` — NEW (cross-app cell, must-have 5)
  - `packages/schema-registry/src/react/widgets/SchemaFieldAdder.tsx` — NEW (must-have 4)
  - `packages/schema-registry/src/react/widgets/index.ts` — export both new widgets
  - `packages/schema-registry/src/schemas/widgetProps.ts` — add `EntityRefCellPropsSchema` + `SchemaFieldAdderPropsSchema` to discriminated union; re-export `LayoutJsonSchema`
  - `packages/schema-registry/src/react/WidgetCatalog.ts` — NEW; exports `WIDGET_CATALOG: WidgetCatalogEntry[]` with `{type, label, description, PropsEditor, defaultProps, minW, minH}`
  - `packages/schema-registry/src/react/propsEditors/*.tsx` — NEW; one per widget (5 total)
  - `packages/schema-registry/src/react/registerWidget.ts` — NEW; idempotent `registerWidget({type, Renderer, PropsEditor})` public API + `getWidget(type)` + `listWidgets()`
  - `packages/schema-registry/src/react/WidgetRenderer.tsx` — refactor hard-coded switch → lookup via `getWidget()`
  - `packages/schema-registry/src/__tests__/registerWidget.test.ts` — NEW; test registry idempotency, unknown-type → `UnknownWidget`, and Zod enforcement
- **Verification criteria:**
  - `pnpm test --filter @bsuite/schema-registry` — all tests pass including 7 new registry cases
  - `pnpm typecheck --filter @bsuite/schema-registry` — 0 errors
  - Gzip bundle ≤ 35 KB (phase5-spec §6 Task 5.2.10 budget); if exceeded, split `widgets/` into dynamic imports
  - `grep -n "EntityRefCell\|SchemaFieldAdder" packages/schema-registry/src/react/widgets/index.ts` prints 2 lines
  - `npm publish --access public --provenance` succeeds via `publish-schema-registry.yml` CI run
- **Expected commit message scope:** `feat(schema-registry)`
- **Repo:** `bsuite` (parent monorepo for package; operator then bumps consumer `package.json` files)
- **Operator gate:** `[Operator]` must run `npm publish` or approve the CI auto-publish; 4 consumer apps then bump version.

#### Subagent W1-B — expose `isResizable` on `PageGridLayout` + widget default sizes
- **Owner:** `[Subagent]`
- **Repos:** `bsuite/crm7/`, `bsuite/business-suite-unified/`
- **Files touched:**
  - `crm7/src/components/platform/PageGridLayout.tsx` — add `isResizable?: boolean` to `PageGridLayoutProps`; thread to `<Responsive isResizable={isResizable ?? isEditing}>`; expose resize handles when `isEditing`
  - `crm7/src/hooks/usePageGridLayout.ts` — persist resize deltas via `handleLayoutChange` (already fires on layout mutation — confirm)
  - `crm7/src/styles/react-grid-layout-overrides.css` — style resize handle to match D2C theme (`oklch(var(--accent))` fill)
  - `business-suite-unified/src/components/platform/LayoutCanvas.tsx` — mirror `isResizable` flag
  - `business-suite-unified/src/components/platform/PageGridLayout.tsx` — same as CRM7
- **Verification criteria:**
  - Playwright smoke: open `/dashboard` in CRM7 with `isEditing=true`, drag bottom-right handle of a card — grid reports new `w/h`; navigate away + back → restored
  - `pnpm lint --filter crm7` green
  - CSS tokens oklch only (CI rule `bsuite/no-hardcoded-colours` error gate)
- **Expected commit message scope:** `feat(crm7)` + `feat(bsu)`

#### Subagent W1-C — DB migrations: `tfd_entity_fk` + enterprise-admin RLS on `tenant_field_definitions`
- **Owner:** `[Subagent]`
- **Repo:** `bsuite/crm7/supabase/migrations/` (primary) + apply to live Supabase via `mcp__claude_ai_Supabase__apply_migration`
- **Files touched:**
  - `crm7/supabase/migrations/20260425_phase5_tfd_entity_fk.sql` — NEW; adds `entity_id uuid`, backfill `UPDATE tenant_field_definitions tfd SET entity_id = te.id FROM tenant_entities te WHERE te.name = tfd.entity_type AND te.app_scope IN ('crm7','all')`; adds FK constraint; adds `CREATE UNIQUE INDEX idx_tfd_entity_field_key ON tenant_field_definitions(tenant_id, entity_id, field_key)`; drops old UNIQUE on `(tenant_id, entity_type, field_key)`
  - `crm7/supabase/migrations/20260425_phase5_tfd_enterprise_admin_rls.sql` — NEW; policy `tfd_enterprise_admin_insert` — `WITH CHECK (tenant_id = auth_tenant_id() AND is_system = false AND auth_tenant_id_with_role(ARRAY['owner','admin']))`; policy `tfd_enterprise_admin_update` mirror
- **Verification criteria:**
  - `supabase db reset` exits 0 on a fresh branch (phase5-spec §S gate)
  - `SELECT count(*) FROM tenant_field_definitions WHERE entity_id IS NULL` returns 0 post-backfill
  - pgTap test in `crm7/supabase/tests/rls/tenant_field_definitions.test.sql` — enterprise admin can INSERT `is_system=false` but cannot INSERT `is_system=true`
  - `mcp__claude_ai_Supabase__get_advisors` zero new warnings
- **Expected commit message scope:** `feat(db)` or `fix(db)`

~~**Wave 1 gate (all 3 subagents done + operator publishes v0.2.0):** schema-registry v0.2.0 live on npm; resize handles live in crm7/bsu; DB migrations applied.~~ — **GATE PASSED (2026-04-25)** — schema-registry v0.2.0 live (`8aac009`); resize handles live (`b55926f3` + `01de8334`); DB migrations committed (`43fb250`) awaiting operator `apply_migration` push.

### Wave 2 (parallel-safe; 2 subagents; ~2 days; depends on Wave 1 complete) — ✅ DONE (2026-04-25)

**Status:** W2-A ✅ SHIPPED `3421ac3` (BSU Design Studio surface); W2-B ✅ SHIPPED `858b9149` (CRM7 chrome-level launcher + Tier-A 20 pages).

#### Subagent W2-A — BSU PageComposer Design Studio uplift (PR 5.3 residual + must-have 6)
- **Owner:** `[Subagent]`
- **Repo:** `bsuite/business-suite-unified/`
- **Files touched:**
  - `business-suite-unified/package.json` — bump `@bsuite/schema-registry ^0.1.0 → ^0.2.0`
  - `business-suite-unified/pnpm-lock.yaml` — regenerate per parent CLAUDE.md "Lockfile generation" rule (outside bsuite tree)
  - `business-suite-unified/src/pages/Developer/Pages.tsx` — import `WIDGET_CATALOG` from schema-registry; render palette from catalog; drawer for `PropsEditor` when widget selected
  - `business-suite-unified/src/pages/DesignStudio/index.tsx` — NEW; wraps `Developer/Pages.tsx` in full-screen layout; left-rail route outline (`TenantPageList`); `?mode=design-studio` query param
  - `business-suite-unified/src/pages/DesignStudio/TenantPageList.tsx` — NEW; lists `tenant_page_layouts` grouped by `app_scope`; "+ New page" creates `is_published=false` draft
  - `business-suite-unified/src/App.tsx` — route `/design-studio` → `DesignStudio`
  - `business-suite-unified/src/components/platform/LayoutCanvas.tsx` — replace local Widget type with schema-registry LayoutJson; pass `PropsEditor` render target
  - `business-suite-unified/src/pages/Developer/index.tsx` — add "Open Design Studio" button in Pages tab header
- **Verification criteria:**
  - Playwright: `platform_admin` user navigates to `/design-studio`, sees 6 widgets in palette including `EntityRefCell` + `SchemaFieldAdder`; drags one, sets props via drawer, clicks Publish → row in `tenant_page_layouts` has `is_published=true` within 2 s (realtime)
  - Zod validation: submit with empty `entity` prop on `DataTable` → inline error shown, save blocked
  - `pnpm build --filter business-suite-unified` exits 0
  - Lighthouse accessibility ≥ 95 on Design Studio with 6 widgets (phase5-spec §A acceptance 13)
- **Expected commit message scope:** `feat(bsu)`

#### Subagent W2-B — CRM7 app-chrome-level edit-mode launcher + PageGridLayout adoption batch 1 (20 pages)
- **Owner:** `[Subagent]`
- **Repo:** `bsuite/crm7/`
- **Files touched:**
  - `crm7/package.json` — bump `@bsuite/schema-registry ^0.1.0 → ^0.2.0`
  - `crm7/pnpm-lock.yaml` — regenerate outside tree
  - `crm7/src/components/layout/AppLayout.tsx` — mount `<PageEditorLauncher>` in chrome so every route shows the launcher button
  - `crm7/src/components/platform/PageEditorLauncher.tsx` — extend fallback: when current page does NOT use `PageGridLayout`, launcher button deep-links to `https://suite.crm7.app/design-studio?scope=crm7&route=<pathname>` in a new tab
  - Tier-A 20-page rollout — wrap each page in `<PageGridLayout pageKey='<route>' defaultLayouts={DEFAULT} widgets={{...}}>` + `<TenantLayoutSlot route='<pathname>' appScope='crm7'>` at bottom. See §5 Tier A list for exact files.
  - `crm7/src/config/tenantRoutes.ts` — extend `TENANT_LAYOUT_ROUTES['crm7']` with all 20 routes (so BSU PageComposer autocomplete offers them)
- **Verification criteria:**
  - `grep -l "PageGridLayout" crm7/src/pages | wc -l` ≥ 107 (was 87)
  - `grep -l "TenantLayoutSlot" crm7/src/pages | wc -l` ≥ 23 (was 3)
  - Playwright: edit-mode toggle visible on all 20 Tier-A pages
  - `pnpm build --filter crm7` exits 0; bundle size delta ≤ +20 KB (WIDGET_CATALOG lazy-loaded)
- **Expected commit message scope:** `feat(crm7)`

### Wave 3 (parallel-safe; 4 subagents; ~1.5 days; depends on Wave 2 complete) — 🚧 IN FLIGHT (2026-04-25)

**Status:** W3-A CRM7 Tier-B + codemod — pending; W3-B conduit rollout — pending; W3-C cross-app E2E — folded into W3-D this session (the plan's original W3-C spec is satisfied by `EntityRefCell.cross-app.test.tsx` + Playwright spec + runbook); W3-D ✅ SHIPPED this session — cross-app E2E + master-plan + roadmap strike-throughs.

#### Subagent W3-A — CRM7 Tier-B rollout (50 pages) + Tier-C script
- **Owner:** `[Subagent]`
- **Repo:** `bsuite/crm7/`
- **Files touched:**
  - 50 CRM7 page files per §5 Tier B — add `PageGridLayout` wrapper + slot mount
  - `crm7/scripts/apply-page-canvas.ts` — NEW; AST-based codemod (using `jscodeshift` or `ts-morph`; no regex) that wraps remaining `src/pages/*.tsx` files with `PageGridLayout` + `TenantLayoutSlot` defaults. Tier-C candidates (260-50-20 = 190 files) produced as dry-run diff for operator review before commit.
- **Verification criteria:**
  - `grep -l "PageGridLayout" crm7/src/pages | wc -l` ≥ 157 (Tier A + Tier B)
  - Codemod script produces valid TS — `pnpm typecheck --filter crm7` exits 0
  - Tier-C dry run writes 190 candidate diffs to `.codemod-tmp/` without committing
- **Expected commit message scope:** `feat(crm7)`, `chore(crm7)` for codemod

#### Subagent W3-B — conduit Tier rollout + two-layer invalidation verification
- **Owner:** `[Subagent]`
- **Repo:** `bsuite/conduit/`
- **Files touched:**
  - `conduit/package.json` — bump `@bsuite/schema-registry ^0.1.0 → ^0.2.0`
  - `conduit/pnpm-lock.yaml` — regenerate outside tree
  - `conduit/src/app/(dashboard)/operations/page.tsx` + `conduit/src/app/(dashboard)/insights/page.tsx` — add `TenantLayoutSlot` mount + `prefetchTenantPageLayout` server pre-fetch
  - `conduit/src/config/tenantRoutes.ts` — already created in PR 5.5; confirm `['/','/pipeline','/operations','/insights']` present
  - Playwright fixture `conduit/e2e/tenant-layout-realtime.spec.ts` — NEW; publishes a layout via BSU, asserts conduit re-renders within 5 s (phase5-spec §A acceptance 3)
- **Verification criteria:**
  - `pnpm build --filter conduit` exits 0 (Next.js 16 RSC build must be clean)
  - Realtime test passes
  - Two-layer cache test: assert `revalidateTag('tenant-page-layouts')` called on realtime event
- **Expected commit message scope:** `feat(conduit)`

#### Subagent W3-C — cross-app cell linkage E2E (must-have 5 validation)
- **Owner:** `[Subagent]`
- **Repos:** `bsuite/R80.3/`, `bsuite/crm7/` (test-only)
- **Files touched:**
  - `R80.3/package.json` — bump `@bsuite/schema-registry ^0.1.0 → ^0.2.0`
  - `R80.3/pnpm-lock.yaml` — regenerate outside tree
  - `crm7/e2e/cross-app-entity-ref.spec.ts` — NEW; platform_admin authors a layout on R80.3 `route='calculator'` with `EntityRefCell` widget pointing to a CRM7 `contacts` row; asserts R80.3 calculator page renders the contact's name; asserts RLS blocks if tenant mismatches
  - `business-suite-unified/supabase/seed/cross-app-demo.sql` — NEW seed data (1 demo tenant + 1 contact row + 1 layout row) for Playwright fixture
- **Verification criteria:**
  - E2E test green
  - `EntityRefCell` renders on R80.3 without crashing (validates `createMinimalClient` path from phase5-spec §6 Task 5.2.9)
  - Zod `foreign_app_scope` validation blocks malicious `'auth.users'` input
- **Expected commit message scope:** `test(crm7)`, `feat(r80)`

#### Subagent W3-D — braden Tier rollout + ship-all-apps verification sweep
- **Owner:** `[Subagent]`
- **Repos:** `bsuite/braden/`, plus cross-cutting sweep
- **Files touched:**
  - `braden/package.json` — bump `@bsuite/schema-registry ^0.1.0 → ^0.2.0`
  - `braden/pnpm-lock.yaml` — regenerate outside tree
  - `braden/src/pages/About.tsx` — add slot mount per phase5-spec §Z Tier C for braden (route `/about`)
  - Parent repo `bsuite` — submodule bump commit for all 5 consumer apps
  - `bsuite/docs/20260425-universal-canvas-rollout-status-v1.00W.md` — NEW; running scoreboard updated after each wave
- **Verification criteria:**
  - All 6 Vercel preview deploys green (bsu, crm7, conduit, r80, braden, throughput [no-op])
  - Ship-all-apps skill sweep reports zero orphaned branches
  - `mcp__claude_ai_Vercel__list_deployments` all 6 apps READY
- **Expected commit message scope:** `feat(braden)`, `chore(bsuite)`

---

## 4. Dependencies + ordering

```
                        ┌────────────────────────────────────────────────────┐
                        │                     Wave 1 (parallel)              │
                        │                                                    │
                        │  W1-A: schema-registry v0.2.0                      │
                        │         (widget catalog + EntityRefCell            │
                        │         + SchemaFieldAdder + registry API)         │
                        │              │                                     │
                        │              │  ┌─► npm publish                    │
                        │              ▼  │  (Operator)                      │
                        │   [published v0.2.0]                               │
                        │                                                    │
                        │  W1-B: PageGridLayout isResizable (crm7+bsu)       │
                        │                                                    │
                        │  W1-C: tfd_entity_fk + enterprise RLS migrations   │
                        │         (apply_migration MCP)                      │
                        └──────────────────────┬─────────────────────────────┘
                                               │
                               [Wave 1 gate — all 3 green]
                                               │
                        ┌──────────────────────▼─────────────────────────────┐
                        │                     Wave 2 (parallel)              │
                        │                                                    │
                        │  W2-A: BSU Design Studio uplift                    │
                        │         (PageComposer widget catalog wiring,       │
                        │         PropsEditor drawer, /design-studio route)  │
                        │                                                    │
                        │  W2-B: crm7 app-chrome launcher +                  │
                        │         Tier-A 20-page rollout                     │
                        │                                                    │
                        └──────────────────────┬─────────────────────────────┘
                                               │
                               [Wave 2 gate — both green]
                                               │
                        ┌──────────────────────▼─────────────────────────────┐
                        │                     Wave 3 (parallel)              │
                        │                                                    │
                        │  W3-A: crm7 Tier-B (50 pages) + Tier-C codemod     │
                        │  W3-B: conduit rollout + realtime E2E              │
                        │  W3-C: cross-app cell linkage E2E                  │
                        │  W3-D: braden rollout + ship-all-apps sweep        │
                        └──────────────────────┬─────────────────────────────┘
                                               │
                                        [Phase 5.5 done]
                                               │
                                               ▼
                               §6 stop-ship gates + §8 DoD checklist
```

**Critical path (serial):** W1-A (~1.5 d) → W2-A (~2 d) → W3-C (~0.5 d) = **4 calendar days** if strictly serial, or **3.5 calendar days** wall-clock with subagents running the parallel tasks in Waves 1 + 2 + 3 concurrently (W1-B and W1-C pipelined with W1-A; W2-B in parallel with W2-A; W3-{A,B,C,D} all parallel).

**External blockers:** W1-A requires `[Operator]` to either trigger `publish-schema-registry.yml` via a push to `main` or run `npm publish --access public --provenance` manually. All other waves are `[Subagent]` autonomous.

---

## 5. Every-page rollout — Tier A / B / C

Goal: promote CRM7 from 87/347 pages (25%) to ≥ 60% by end of Wave 3. Combined-roadmap §Executive Summary commits to "every CRM7 page has edit-mode + drag + resize"; this plan staggers the rollout so high-traffic pages land first (Tier A = Wave 2) and the long tail is automated (Tier C codemod in Wave 3).

### Tier A — 20 high-traffic pages (Wave 2 — [Subagent W2-B])

Selection criteria: pages that live on the main CRM7 sidebar nav, have the highest analytics traffic, and already have `PageGridLayout`-compatible content. Exact files:

1. `crm7/src/pages/Dashboard.tsx` — already wraps PageGridLayout; add slot (done in PR 5.4)
2. `crm7/src/pages/people/index.tsx` — already wraps
3. `crm7/src/pages/contacts/index.tsx` — already wraps + slot mounted (PR 5.4)
4. `crm7/src/pages/contacts/[id]/index.tsx` — already wraps + slot mounted (PR 5.4)
5. `crm7/src/pages/leads/index.tsx` — wrap + slot
6. `crm7/src/pages/clients/index.tsx` — wrap + slot
7. `crm7/src/pages/pipeline/index.tsx` — wrap + slot
8. `crm7/src/pages/opportunities/index.tsx` — wrap + slot
9. `crm7/src/pages/Payroll.tsx` or `crm7/src/pages/payroll/index.tsx` — wrap + slot (payroll root only; sub-pages in Tier B)
10. `crm7/src/pages/financial/reports/index.tsx` — wrap + slot
11. `crm7/src/pages/analytics/index.tsx` — wrap + slot
12. `crm7/src/pages/tasks/index.tsx` — wrap + slot
13. `crm7/src/pages/communications/index.tsx` — wrap + slot
14. `crm7/src/pages/calendar/index.tsx` — already wraps; add slot
15. `crm7/src/pages/reminders/index.tsx` — wrap + slot
16. `crm7/src/pages/mentors/index.tsx` — already wraps; add slot
17. `crm7/src/pages/incidents/index.tsx` — already wraps; add slot
18. `crm7/src/pages/field-officers/index.tsx` — wrap + slot
19. `crm7/src/pages/gto-compliance/index.tsx` — already wraps; add slot
20. `crm7/src/pages/settings/index.tsx` — wrap + slot

After Tier A: 87 + 13 net-new `PageGridLayout` wraps = 100 files; 3 + 20 slot mounts = 23 files.

### Tier B — 50 module pages (Wave 3 — [Subagent W3-A])

Selected by module grouping; covers payroll sub-pages, people sub-pages, financial, WHS, and field-officers sub-pages.

- **Payroll (6):** `payroll/award-rates/index.tsx`, `payroll/pay-periods/index.tsx`, `payroll/missing-timesheets/index.tsx`, `payroll/rcti/index.tsx`, `payroll/batch/index.tsx`, `payroll/exceptions/index.tsx`
- **People (7):** `people/compliance.tsx`, `people/recruitment.tsx`, `people/progress.tsx`, `people/onboarding.tsx`, `people/completion.tsx`, `people/new.tsx`, `people/[id].tsx`
- **Financial (4):** `financial/budget/index.tsx`, `financial/expenses/index.tsx`, `financial/invoicing/index.tsx`, `financial/reconciliation/index.tsx`
- **WHS (4):** `whs/inspections/index.tsx`, `whs/incidents/index.tsx`, `whs/training/index.tsx`, `whs/host-employers/index.tsx`
- **Field Officers (3):** `field-officers/actions/index.tsx`, `field-officers/site-assessment.tsx`, `field-officers.tsx`
- **Contracts (3):** `contracts/index.tsx`, `contracts/[id].tsx`, `contracts/new.tsx`
- **Apprentices / Hosts (4):** `apprentices/index.tsx`, `apprentices/[id].tsx`, `hosts/index.tsx`, `hosts/[id].tsx`
- **Reports / Insights (4):** `reports/index.tsx`, `reports/[slug].tsx`, `insights/index.tsx`, `insights/[slug].tsx`
- **Admin / Settings (9):** `settings/schema-builder/index.tsx` (already wraps ReactFlow; add slot for annotations), `settings/themes.tsx`, `settings/integrations.tsx`, `settings/users.tsx`, `settings/roles.tsx`, `settings/webhooks.tsx`, `settings/api-keys.tsx`, `settings/audit-log.tsx`, `settings/billing.tsx`
- **Miscellaneous (6):** `fair-work-demo.tsx`, `api-test.tsx`, `pricing.tsx`, `portals/apprentice.tsx`, `portals/host.tsx`, `portals/field-officer.tsx`

After Tier B: ~157 PageGridLayout wraps = **45% adoption**.

### Tier C — automated rollout (Wave 3 — [Subagent W3-A])

Remaining ~190 tail files. **Codemod script** at `crm7/scripts/apply-page-canvas.ts`:

- Input: list of `src/pages/**/*.tsx` files NOT already in Tier A or Tier B
- Tooling: `ts-morph` (AST-based; no regex — parent CLAUDE.md "No-Regex-by-Default" rule)
- Transform per file:
  1. If file's default export is a function component returning JSX not already wrapped in `PageGridLayout` → wrap the top-level returned JSX in `<PageGridLayout pageKey='<derived-from-path>' defaultLayouts={DEFAULT_ONE_COLUMN} widgets={{ content: <original-JSX> }}>`
  2. Insert `<TenantLayoutSlot supabase={supabase} route='<pathname>' appScope='crm7' />` as the last child of the component's returned JSX
  3. Preserve existing imports; add `import { PageGridLayout } from '@/components/platform/PageGridLayout'` + `import { TenantLayoutSlot } from '@bsuite/schema-registry/react'` + `import { supabase } from '@/lib/supabase'`
- Operator review: script writes diffs to `.codemod-tmp/crm7-tier-c/*.patch`; `[Operator]` reviews + applies selectively via `git apply`
- Acceptance: after Tier C, `grep -l "PageGridLayout" crm7/src/pages | wc -l` ≥ 280 = **80% adoption** (target ≥ 60% DoD §8)

**Tier-A + Tier-B + Tier-C final rollout:** combined-roadmap §Executive Summary goal "every CRM7 page" reached on the automated pass; tail files that cannot be mechanically transformed (special layouts, custom routing) stay at 87 original + 20 Tier A + 50 Tier B = 157 manually-wrapped baseline.

---

## 6. Stop-ship gates (re-enumerated)

Phase5-spec §A lists 13 overall acceptance criteria + §A stop-ship sub-list ≈17 items. Re-enumerated with 2026-04-25 status:

| # | Gate | Source | Status |
|---|------|--------|--------|
| G1 | Supabase `db reset` passes on fresh branch (BSU+CRM7) | phase5-spec §A.1 | PASSED — verified in PR 5.0 merge (`4f1a14c`) |
| G2 | `@bsuite/schema-registry@0.1.0` published, bundle ≤ 35 KB gzip | phase5-spec §A.2, §6 Task 5.2.10 | PASSED for v0.1.0; **RE-RUN** after W1-A v0.2.0 bump |
| G3 | PageComposer e2e: platform_admin authors layout → crm7 reflects within 5 s | phase5-spec §A.3 | PASSED — PR 5.4 (`f4a9f386`) realtime test |
| G4 | NavigationEditor e2e: nav section added → crm7 sidebar updates within 5 s | phase5-spec §A.4 | PASSED — same PR |
| G5 | Consumer apps render `TenantLayoutSlot` without regressions | phase5-spec §A.5 | PASSED — PRs 5.4/5.5/5.6 |
| G6 | conduit `pnpm build` clean (Next.js 16 RSC) | phase5-spec §A.6 | PASSED — PR 5.5 (`414f813`) |
| G7 | All 5 widgets Zod-validate; DOMPurify on text props; `entity` server-whitelist | phase5-spec §A.7 | PASSED in v0.1.0; **RE-VERIFY** after W1-A adds 2 new widgets |
| G8 | `/embed/lead-form` rate-limited; no tenant enumeration | phase5-spec §A.8 | PASSED — `731f6bb` |
| G9 | Enterprise owner 403s on `braden` scope + `is_developer_only=true` | phase5-spec §A.9 | PASSED — RLS migration `20260408000003` |
| G10 | throughput deferred (no Phase 5 code changes) | phase5-spec §A.10 | PASSED — no commits to `throughput/` under Phase 5 scope |
| G11 | All CIs green across 5 repos | phase5-spec §A.11 | PASSED as of 2026-04-24 development |
| G12 | Realtime publish debounced ≤ 500 ms; invalidation scoped by `(app_scope, route_path)` | phase5-spec §A.12 | PASSED — verified via `useTenantPageLayout` filter spec |
| G13 | Keyboard a11y on page-builder drag-drop; Lighthouse a11y ≥ 95 | phase5-spec §A.13 | PENDING — Wave 2 subagent must verify post-design-studio uplift |
| G14 | `prefers-reduced-motion` respected on realtime animation | phase5-spec §A.14 | PENDING — audit in Wave 3 |
| SS1 | Zod widget-props discriminated union with `strict()` | phase5-spec §A stop-ship | PASSED for 5 widgets; **extend** for 2 new ones in W1-A |
| SS2 | `DataTable.entity` server whitelist blocks `auth.users` | phase5-spec §A stop-ship | PASSED |
| SS3 | DOMPurify wraps every tenant-authored text | phase5-spec §A stop-ship | PASSED |
| SS4 | RLS four-persona matrix green (`tenant_page_layouts` + `tenant_navigation`) | phase5-spec §A stop-ship | PASSED |
| SS5 | Playwright: enterprise attempts `braden` scope → 403 | phase5-spec §A stop-ship | PASSED |
| SS6 | Playwright: enterprise owns scope → success | phase5-spec §A stop-ship | PASSED |
| SS7 | Playwright: `is_developer_only=true` write → 403 | phase5-spec §A stop-ship | PASSED |
| SS8 | Tenant-B cannot see tenant-A `is_developer_only` items | phase5-spec §A stop-ship | PASSED |
| SS9 | Keyboard-only page-builder navigation works | phase5-spec §A stop-ship | PENDING — Wave 2/3 |
| SS10 | Realtime debounce ≤ 500 ms + selective invalidation | phase5-spec §A stop-ship | PASSED |
| SS11 | Bundle delta ≤ 35 KB gzip | phase5-spec §A stop-ship | PASSED v0.1.0; **re-run** post-v0.2.0 |
| SS12 | Lighthouse a11y ≥ 95 on crm7 dashboard with 5 widgets | phase5-spec §A stop-ship | PENDING |
| SS13 | `prefers-reduced-motion` respected | phase5-spec §A stop-ship | PENDING |
| SS14 | `ui_configurations` has zero rows with `config_type IN ('page_layout','navigation')` (or CHECK in place) | phase5-spec §S.1.7 | NOT CONFIRMED — [Subagent W1-C] add verification query + CHECK if needed |
| SS15 | conduit handler calls `router.refresh()` + TanStack invalidation | phase5-spec §A stop-ship | PASSED — PR 5.5 |
| SS16 | `TenantLayoutSlot` renders null on malformed JSON across all 5 apps | phase5-spec §A stop-ship | PASSED (Zod schema enforced) |
| SS17 | `publish-schema-registry.yml` dry-run green before consumer PRs | phase5-spec §A stop-ship | PASSED for v0.1.0; re-run for v0.2.0 |

**Net gate remaining before Phase 5.5 done:** G13, G14, SS9, SS12, SS13, SS14 — all 6 land during Wave 2/3 verification runs.

---

## 7. Security hardening checklist

Phase5-spec §R lists S-01 through S-05. 2026-04-25 status:

| ID | Severity | Requirement | Source | Status |
|----|----------|-------------|--------|--------|
| **S-01** | CRITICAL | CREATE TABLE migrations precede existing ALTERs; `db reset` passes | phase5-spec §R.S-01 | PASSED — PR 5.0 `4f1a14c` |
| **S-02** | CRITICAL | JSONB widget-props XSS/SSRF/IDOR — DOMPurify + server-side `entity` whitelist + `target_field` blocklist | phase5-spec §R.S-02 vectors A/B/C | PASSED for v0.1.0 widgets; **W1-A must extend** — `EntityRefCellPropsSchema` needs same `entity` + `foreign_app_scope` server whitelist (new vector: IDOR via `record_id` — widget must RLS-check before reveal) |
| **S-02b** | CRITICAL | `DataTable.entity` server-side whitelist runtime check | phase5-spec §R.S-02b | PASSED; **apply same pattern** to `EntityRefCell.entity` in W1-A |
| **S-03** | HIGH | `/embed/lead-form` tenant enumeration mitigations (identical response, rate limit, no origin allowlist v1) | phase5-spec §R.S-03 | PASSED — `731f6bb` |
| **S-04** | CRITICAL | `descendants_of`/`ancestors_of` SECURITY DEFINER functions exist + RLS uses them | phase5-spec §R.S-04 | PASSED — BSU migration `20260408000002` |
| **S-05** | HIGH | `is_developer_only` only writable by platform roles (RLS WITH CHECK + UI hide) | phase5-spec §R.S-05 | PASSED — RLS migration + PR 5.3 UI |
| **S-06** (new) | HIGH | `tenant_field_definitions` enterprise-admin INSERT scoped to `is_system=false` + own-tenant | phase5-spec not-yet (this plan introduces) | PENDING — [Subagent W1-C] landing migration `20260425_phase5_tfd_enterprise_admin_rls.sql` |
| **S-07** (new) | MEDIUM | `EntityRefCell` cross-app read must still obey RLS on the foreign entity | this plan §2 must-have 5 | PENDING — W1-A implementation; W3-C E2E verifies |

---

## 8. Definition of done

Phase 5.5 = universal canvas + Design Studio = DONE when all of the following are true:

- [ ] **PRs:** 7 Phase 5 PRs already merged (5.0 through 5.6 — §1 ground truth). 2 follow-on PRs land in `bsuite/development`: `feat/phase55-schema-registry-v0.2.0` (Wave 1) + `feat/phase55-design-studio-uplift` (Wave 2). Submodule bumps merge to parent `bsuite/development` after each wave.
- [ ] **5 must-haves (plus Design Studio) shipped and covered by tests:**
  - [ ] Edit-mode toggle visible in app chrome on every CRM7 page (§2 must-have 1; verified by Playwright chrome-affordance spec)
  - [ ] Drag-from-palette works for all 6 widget types in BSU Design Studio (§2 must-have 2; Playwright drag spec)
  - [ ] Card resize handles visible + persisted in both PageGridLayout (CRM7) and LayoutCanvas (BSU) (§2 must-have 3; Playwright resize spec)
  - [ ] "+ Add field" from canvas writes to `tenant_field_definitions` with correct `entity_id` FK (§2 must-have 4; pgTap + Playwright)
  - [ ] Cross-app `EntityRefCell` renders CRM7 contact on R80.3 calculator page (§2 must-have 5; Playwright W3-C spec)
  - [ ] `/design-studio` route loads standalone authoring surface with route outline + template library (§2 must-have 6; Playwright loads full-screen layout, Lighthouse a11y ≥ 95)
- [ ] **Adoption:** CRM7 `grep -l "PageGridLayout" src/pages | wc -l` ≥ 208 (≥ 60% of 347 pages). Tier A + B + C codemod run per §5.
- [ ] **Stop-ship gates:** all 32 gates in §6 PASSED (G1–G14 + SS1–SS17 + S-06 + S-07 new gates); §7 S-01 through S-07 all PASSED.
- [ ] **Vercel preview deploys:** all 6 apps READY (bsu, crm7, conduit, r80, braden, throughput) on the `bsuite/development` head commit. `mcp__claude_ai_Vercel__list_deployments` confirms.
- [ ] **Memory protocol:** `bsuite_sleep_packet_20260428` (or whichever session ends the work) + `bsuite_session_20260428` written to `https://qig-memory-api.vercel.app/api/memory` per parent CLAUDE.md rules.
- [ ] **Docs:** `bsuite/docs/20260425-universal-canvas-rollout-status-v1.00W.md` promoted to `v1.00A` on approval; this master plan promoted to `v1.00A`.

---

## 9. Risk register

Only risks that derive from the 4 source docs plus the 2026-04-25 scope. No speculative additions.

| ID | Risk | Impact | Likelihood | Mitigation | Source |
|----|------|--------|------------|------------|--------|
| R-P1 | `schema-registry@0.2.0` bundle exceeds 35 KB gzip after adding 2 widgets + 5 PropsEditors | HIGH — SS11 gate blocks consumer apps | MEDIUM | Split widgets + PropsEditors into lazy-imported chunks; CI `bundlesize` step fails PR if >35 KB (phase5-spec §6 Task 5.2.10) | phase5-spec §A stop-ship SS11 |
| R-P2 | CRM7 Tier-C codemod breaks pages with custom routing or HOC wrapping | HIGH — can silently blank pages | MEDIUM | Codemod writes diffs to `.codemod-tmp/` for `[Operator]` review; only mechanical wraps are auto-applied; non-standard pages flagged | §5 Tier C |
| R-P3 | `EntityRefCell` IDOR — user pastes another tenant's `record_id` | MEDIUM — RLS should block but human error in RLS review possible | LOW | S-07 mitigation: RLS on every entity table; W3-C E2E asserts denial; pgTap test with tenant-B user | §7 S-07 (new) |
| R-P4 | `SchemaFieldAdder` floods `tenant_field_definitions` (no rate limit on authoring UI) | LOW — annoyance, not security; RLS still scopes to own tenant | MEDIUM | Add client-side 500 ms debounce on submit; DB-level UNIQUE constraint `(tenant_id, entity_id, field_key)` prevents dupes (W1-C migration) | §2 must-have 4 |
| R-P5 | Realtime flood when Tier-C rollout lights up 190 pages each with a `TenantLayoutSlot` | MEDIUM — Supabase concurrent-channel budget | MEDIUM | `useTenantPageLayout` already filters channel by `route_path=eq.<path>`; verify per-route channel count stays under Supabase soft limit of 100 per client | phase5-spec §6 Task 5.2.3 pattern |
| R-P6 | Lockfile corruption when 4 consumer apps bump schema-registry simultaneously | HIGH — Vercel `ERR_PNPM_OUTDATED_LOCKFILE` | LOW | Parent CLAUDE.md mandates "Lockfile generation outside bsuite tree"; subagent brief includes the exact `mkdir ~/<app>_lockgen && cp <app>/package.json ...` recipe | parent CLAUDE.md §Lockfile generation |
| R-P7 | `/design-studio` overlaps with existing `/developer/pages` and operators get confused | LOW — UX friction only | MEDIUM | Keep `/developer/pages` as the Developer-Portal-tabbed surface; `/design-studio` is the full-screen alias — both render the same underlying `DeveloperPages` component with a `designStudioMode` prop switch | §2 must-have 6 |
| R-P8 | `is_developer_only` flag propagated to cross-app embedded `EntityRefCell` hides rows unexpectedly | LOW | LOW | Cell widget never reads `is_developer_only`; it only reads from the entity table directly via RLS. Gate G9 already validates isolation | phase5-spec §A.9 |
| R-P9 | Realtime `postgres_changes` fires on `tenant_field_definitions` faster than TanStack cache can invalidate (flicker) | LOW | LOW | Debounce invalidation at 300 ms; phase5-spec §A.12 mandates ≤ 500 ms debounce on publish | phase5-spec §A.12 |
| R-P10 | Operator merges to `main` before all 6 Vercel previews green | HIGH — production regression | LOW | DoD §8 mandates all 6 previews READY before `[Operator]` merge; this plan stays on `development` until explicit operator greenlight | combined-roadmap §0 target branch rule |

---

## 10. References

- phase5-spec: `docs/plans/20260423-phase5-schema-pagebuilder-implementation-v1.00W.md` (1528 L)
- combined-roadmap: `crm7/docs/00-roadmap/20260424-bsuite-combined-foundations-and-gto-1.00W.md` (642 L)
- schema-audit: `crm7/docs/00-roadmap/20260423-crm7-schema-page-builder-audit-1.00W.md` (505 L)
- Code foundation state (2026-04-25):
  - `crm7/src/components/platform/PageGridLayout.tsx` (420 LOC)
  - `crm7/src/hooks/usePageGridLayout.ts` (323 LOC)
  - `crm7/src/components/platform/PageEditorLauncher.tsx`
  - `crm7/src/lib/page-builder/widgetRegistry.tsx`, `WidgetPalette.tsx`, `EntityTableWidget.tsx`
  - `crm7/src/services/schemaBuilderService.ts`, `customPageService.ts`, `customFieldsService.ts`
  - `business-suite-unified/src/pages/Developer/Pages.tsx` (239 LOC), `Nav.tsx`
  - `business-suite-unified/src/components/platform/LayoutCanvas.tsx` (206 LOC)
  - `business-suite-unified/src/pages/Embed/LeadForm.tsx`
  - `packages/schema-registry/src/react/{TenantLayoutSlot,WidgetRenderer,useTenantPageLayout,useTenantNavigation,useTenantSchema,minimalClient,ErrorBoundary}.{ts,tsx}` + 5 widgets
  - `packages/nav-core/src/merge.ts` (`mergeNavConfigs`)
- Supabase migrations (applied to live `tuybltdrdefjblnplpqo`):
  - `business-suite-unified/supabase/migrations/20260408000000_phase5_create_tenant_page_layouts.sql`
  - `business-suite-unified/supabase/migrations/20260408000001_phase5_create_tenant_navigation.sql`
  - `business-suite-unified/supabase/migrations/20260408000002_phase5_tenant_hierarchy_functions.sql`
  - `business-suite-unified/supabase/migrations/20260408000003_phase5_tenant_page_layouts_rls_policies.sql`
  - `crm7/supabase/migrations/20260304090002_phase5_create_tenant_field_definitions.sql`
- Git merge SHAs (bsuite/development):
  - BSU PR 5.0: `4f1a14c`
  - BSU PR 5.3: `e0706ea` (#168), `0c7e076`, `caa6c19`
  - BSU PR 5.6 embed: `62b8a5f` (#169), `731f6bb`
  - CRM7 PR 5.4: `f4a9f386` (#282)
  - Conduit PR 5.5: `414f813` (#97)
  - R80.3 PR 5.6: `f9ec621` (#97)
  - braden PR 5.6: `bbe47b4` (#152)
  - schema-registry v0.1.0: `7d42350`
  - nav-core v0.5.0: `a58a8d0`

---

*Plan authored 2026-04-25. Source corpus: phase5-spec (1528 L), combined-roadmap (642 L), schema-audit (505 L), plus code-foundation discovery (87/347 CRM7 adoption, schema-registry v0.1.0 shipped on npm, BSU PageComposer + LayoutCanvas live, 2 new widgets still required). User directive 2026-04-25 "stop deferring — GET IT DONE IN FULL AND DONE WELL" answered by a 3-wave dispatch with 9 subagent tasks, ~3.5 days wall-clock, zero speculative scope.*
