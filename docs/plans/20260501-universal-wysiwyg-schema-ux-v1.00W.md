---
kind: plan
authority: engineering
owner: bsuite-platform
evidence:
  - .github/workflows/security-audit.yml
  - scripts/check-unmet-peer-deps.mjs
  - scripts/check-published-peer-ranges.mjs
  - scripts/check-lockfile-hygiene.mjs
---

# Universal WYSIWYG + Schema UX Master Plan — v1.07W

**Date:** 2026-05-01 (revised 2026-05-05, seventh pass)
**Status:** W (Working — React 19 parity, Phase 0, Schema Builder Phase 1a/1b, and schema-builder-specific Phase 3 are complete; page/form/custom authoring phases remain active)
**Owner:** Codebuff (Buffy) coordination with user
**Supersedes / extends:** `docs/20260427-full-7-execution-ledger-v1.00W.md`, `docs/adr/ADR-0003-consumer-renderer-pattern.md`

**Revision history:**

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

- **v1.07W (2026-05-05)** — Zero-workaround reconciliation per user directive. Updated the React ground-truth table to current code: all six web apps, mobile, and shared packages are on React 19-compatible dependency lines. Removed stale “Throughput React 18 deferred” language and converted deferred/optional polish into explicit backlog requirements: DBML/SQL DDL exporters, durable undo/redo history, and cross-app WYSIWYG parity are required for plan completion rather than nice-to-have work.
- **v1.06W (2026-05-05)** — Documentation reconciliation after the WYSIWYG/layout-shift and Schema Builder Phase 3 waves. Added explicit current-status notes so the historical delivery sections are not mistaken for open work: Phase 1a consolidation shipped as `@bsuite/schema-builder@0.1.0`; Phase 1b/Airtable upgrades advanced through `@bsuite/schema-builder@0.5.1`; the schema-builder-specific Phase 3 follow-up plan (`docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-plan-v1.00W.md`) closed via `@bsuite/schema-builder@0.7.0` and `docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-signoff-v1.00W.md`. Also records the mandatory WYSIWYG primitive contract in §6.1 and the cross-app layout-shift remediation in the phase status notes.
- **v1.05W (2026-05-01)** — Operational-rigour refresh per user direction (2026-05-01): *"use ship all apps skill to bring all changes including earlier and claude code and other changes into development branch… make sure development branch contains everything before commencing 1a and repeat this before each subsequent phase… inbuild skills to your plans and phases and ensure you include red-team skills/steps."* Three additive structural changes, no scope drift: **(1) new §4.−1 Pre-Phase Readiness Gate** — before any phase begins, run the `ship-all-apps` skill's sweep to pull every unmerged Claude-Code / other-agent branch that does not conflict into `development` across the parent bsuite repo and all 6 submodules (gate blocks if any PR is open + conflict-free + has passed its checks yet not merged); **(2) Skills per phase** — each phase §4.x now enumerates the exact session-loaded skills + MCP tools the executing agent must load before coding (pulled from the `master-orchestration` skill's allow-list, scoped to the BSuite silo, QIG skills explicitly excluded); **(3) Red-team per phase** — each phase now has a mandatory `multi-agent-red-team-implementation` pass after the main deliverables land but before the phase is marked complete, with explicit red-team lenses pre-chosen per phase. Archival of three divergent plan docs (`20260425-universal-canvas-master-execution-plan-v1.00F.md`, `20260422-entity-linkage-schema-builder-uplift-v1.02W.md`, `20260316-mermaid-ui-builder-reference-v1.00A.md`) lands in the same PR into `docs/archive/2026-05-01-wysiwyg-consolidation/` with SUPERSEDED-BY headers pointing at this plan — user approval 2026-05-01: *"archival plan approved"* + *"mermaid ui builder doc can be archived because if done correctly our end result will be better."*
- **v1.04W (2026-05-01)** — Knowledge-currency refresh via `/best-practice-research` + skill sweep (`bsuite-brand-system`, `ui-ux-pro-max`, `dry-one-shot-architecture`, `dnd-kit`, `zustand`, `shadcn-ui`, `forms-and-validation`, `tanstack-query`, `tanstack-table`, `supabase`). Findings applied as surgical refinements — no structural changes, no new phases. Key updates: **Phase 0 marked ✅ Completed** (shipped via PRs #335 parent / #332 crm7 / #228 BSU on 2026-05-01); **Dagre pin bumped** `^1.1.x` → `^3.0.0` (verified current stable — the `@dagrejs/dagre` 3.x line is the active maintenance branch and what production React Flow integrations ship against in 2026); **OKLCH color-space mandate** added to §3.5 per `bsuite-brand-system` skill (D2C tokens are authored in OKLCH; the color picker must present OKLCH values even when the user picks a custom colour so brand compliance gates catch non-OKLCH drift); **TanStack Query `queryOptions` factory pattern** named explicitly in §3.7 as the canonical read-query shape used inside `useSchemaController` per `tanstack-query` skill v5 guidance; **Protected-branch workflow** documented in §7 (parent `bsuite/development` + `crm7/development` + `business-suite-unified/development` are protected — all work lands via PR branches, never direct push, even for maintainers); Q2 marked locked/resolved since Phase 0 has shipped.
- **v1.03W (2026-05-01)** — Consolidated 15 refinements from v1.02W code review: dropped `useOptimistic` from Vite pattern (TanStack Query's native optimistic is transition-safe; `useOptimistic` in a TanStack Query callback throws in React 19); fixed dagre axis labels for `rankdir: 'LR'` (`ranksep` is horizontal between ranks, `nodesep` is vertical within a rank); added Zod↔DB alias table in §3.9 so `SchemaRelation.source.tableId` ↔ `tenant_entity_relations.source_entity_id` is explicit; split `metadata.isSystem` into two orthogonal flags (`isSystem` = reflects existing native FK, `applyAsPostgresFK` = one-shot intent to emit DDL); moved field-level FK migration into Phase 1a deliverable 0 (must land before any code work); Phase 0 aligns shared-package React devDependencies while keeping peer ranges liberal; reconciled page persistence with ADR-0001 so CRM7 `custom_pages` remains canonical and `tenant_page_layouts` is not resurrected; added §4.0 Phase dependency graph; locked Q5 + Q7 (plan body already answers them); clarified `cmdk` is shadcn-transitive (not a separate package.json entry); named `syncpack` explicitly as the peer-dep + base-stack enforcement tool; scoped Phase 1a Cmd+K subset down to `Find Entity` + `Go to <page-path>` only to prevent Phase 1a sprawl. Trailing `Next session entry point` footnote retained unchanged.
- **v1.02W (2026-05-01)** — Integrated user's improvement notes (field-level React Flow handles, React 19 `useOptimistic` + TanStack Query / Server-Action mutation pattern, hybrid relational-registry + jsonb view-state storage, shared `useSchemaController` hook, strict React 19 peer enforcement, Cmd+K command palette via shadcn `cmdk`). New §§2.6 / 3.7 / 3.8 / 3.9 / 3.10 added; §3.2 package structure expanded; §3.5 color picker refined to store CSS variable **name** (`var(--accent-primary)`) rather than resolved hex so the same layout renders correctly across D2C and Corporate themes; §3.6 dagre config pinned (`rankdir: 'LR'`, `nodesep: 60`, `ranksep: 80`) and smart-edge routing file named (`edges/SmartEdge.tsx`); §4 Phase 1 starts with a 'Hot-Sync' carve-out that extracts the shared `useSchemaController` hook BEFORE layering Airtable upgrades; §5 extended with peer-dependency enforcement clause; `cmdk` + `tailwind-merge` added to §2.5 + §6 as already-in-base-stack (cmdk needs install in BSU / conduit / R80.3 via `pnpm dlx shadcn add command`). Trailing user-notes block removed — content now integrated into body.
- **v1.01W (2026-05-01)** — Scope tightened to base-stack-only per user direction: *"we have these skills already and the base. we've just diverted recently."* Dropped ELKjs, reactflow-smart-edge, react-colorful, Puck, and Craft.js. Added `@dagrejs/dagre` (~25 KB) as the single new dependency for Schema Builder auto-layout, justified by the user's explicit *"highest UX is key"* directive. New §2.5 maps every capability in the plan to an already-installed base-stack library plus its corresponding session-loaded skill.
- **v1.00W (2026-05-01)** — Initial draft.

---

## 1. Executive Summary

The user has directed a complete overhaul of the in-app authoring experience across BSuite: developer-gated visual editing of pages, cards, borders, and layouts; an Airtable/Supabase-grade Schema Builder with drag-to-connect relationships; and codification of "latest compatible versions" as an enforced rule. This plan lays out the architecture, phases, acceptance criteria, and rollout strategy.

**Direct user directives (2026-05-01):**

> "as developer i should be able to edit the borders, the full layout by drag and drop and have it persist accross the platform or local to the page as i see fit"
>
> "all the create form layout is unintuitive. drag and drop."
>
> "in schema builder there are dots on each card that i can then connect that card to another card … similarly to supabase's schema visualizer … similar usability to airtable"
>
> "we've reverted to react 18 at some point when it should be 19. always has been or directed to be. our rules should always say the latest versions compatible with eachother of everything."

The work is sized in 6 phases, running approximately 5–8 sessions depending on scope approvals. This document is the single source of truth.

---

## 2. Ground-Truth Audit (2026-05-01)

### 2.1 React version state

| Location | React | `react-dom` | `@types/react` | Status |
|---|---|---|---|---|
| business-suite-unified | ^19.2.4 | ^19.2.4 | ^19.2.14 | ✅ Correct |
| crm7 | ^19.2.4 | ^19.2.4 | ^19.2.14 | ✅ Correct |
| conduit | ^19.2.5 | ^19.2.5 | ^19.2.14 | ✅ Correct |
| braden | ^19.2.4 | ^19.2.4 | ^19.2.14 | ✅ Correct |
| R80.3 | ^19.2.4 | ^19.2.4 | ^19.2.14 | ✅ Correct |
| throughput | ^19.2.5 | ^19.2.5 | ^19.2.14 | ✅ Correct |
| mobile | ^19.2.4 | ^19.2.4 | ^19.2.14 | ✅ Correct |
| packages/schema-registry | ^19.2.5 (dev) | ^19.2.5 (dev) | ^19.2.14 | ✅ Correct |
| packages/page-builder | ^19.2.5 (dev) | ^19.2.5 (dev) | ^19.2.14 | ✅ Correct |
| packages/nav-core | ^19.2.5 (dev) | ^19.2.5 (dev) | ^19.2.14 | ✅ Correct |

> **Phase 0 status (2026-05-05): ✅ Completed and superseded by current React 19 parity.** React 19 devDependency alignment across shared packages (`@bsuite/schema-registry`, `@bsuite/page-builder`, `@bsuite/nav-core`, `@bsuite/theme`, `@bsuite/ui`) and `mobile` shipped via PR #335 (parent bsuite) + PR #228 (BSU — aligns local `@business-suite/ui` React deps). Throughput has also been brought to React 19. Dependency Version Policy (§5) is present in the rule files. CRM7 FormLayoutBuilder card-clipping fix shipped via PR #332.

The user's 2026-05-01 claim "we've reverted to React 18" was partially correct at the time of audit:

- 5 of 6 web apps were already on React 19 during the original audit.
- Shared packages had React 18 pinned as dev deps while keeping liberal peer ranges — resolved by Phase 0 and subsequent shared-package alignment.
- Throughput is now on React 19.2.x and no longer carries a React 18 exception.
- `mobile` now pins React and React DOM to matching React 19.2.x ranges.

### 2.2 Schema Builder duplication (DRY violation)

`crm7/src/pages/settings/schema-builder/` (React Flow canvas with `EntityNode`, `EntityPropertiesPanel`, `RelationshipConfigDialog`, drag-to-persist positions) has been **copied 3 times** into:

- `business-suite-unified/src/pages/Settings/SchemaBuilder.tsx` (monolithic 480-line file)
- `conduit/src/app/(dashboard)/settings/schema-builder/_view.tsx` (monolithic 480-line file)
- `R80.3/src/components/SchemaBuilderView.tsx` (monolithic 440-line file)

All four already implement:

- ✅ Top/bottom handles for drag-to-connect
- ✅ `onConnect` → `RelationshipConfigDialog` → `createSchemaRelation` persist
- ✅ Smoothstep edges with labels from `RELATION_LABELS`
- ✅ `inherits_from` special case (animated, accent-secondary stroke)
- ✅ Persist node positions to `tenant_entities.metadata.position` on drag-end
- ✅ Delete handling via `onNodesChange` / `onEdgesChange` with DB cleanup
- ✅ `RelationshipConfigDialog` for configuring edge type + labels

But **none** of them implement:

- ❌ Column-level handles (connect a specific field to another table's field — Airtable/dbdiagram parity)
- ❌ Cardinality markers at edge endpoints (`1` / `N` / crow's-foot glyphs)
- ❌ Auto-layout (ELKjs or dagre) — users must drag-position every entity manually
- ❌ Smart edge routing to avoid label collisions
- ❌ Cross-entity column picker / "connect field to field" dialog
- ❌ Live schema reflection from Postgres (currently metadata-only via `tenant_entities`)
- ❌ Field-level preview inside each entity card (users see "Fields mapped" placeholder text, not the actual columns)

### 2.3 Form Layout Builder ("create form layout") issues

Current state (`crm7/src/components/ui-customization/FormLayoutBuilder.tsx`, 585 lines):

- ✅ Real `@dnd-kit` drag-and-drop (sections, fields within/across sections)
- ✅ Field palette (left) + canvas (center) + properties panel (right) — three-pane layout
- ✅ Property panel for sections (title, description, columns, collapsible) and fields (label, placeholder, help, col-span, required, read-only, hidden)
- ✅ `rectSortingStrategy` for grid reordering
- ✅ Keyboard accessibility (`KeyboardSensor`, `sortableKeyboardCoordinates`)

Gaps the user identified:

- ❌ **Card clipping**: `<span className="flex-1 text-xs font-medium">{section.title}</span>` has no `truncate` / `break-words` / tooltip — long titles bleed past the card's right edge when palette + inspector narrow the canvas
- ❌ **Unintuitive drag-and-drop**: palette fields can't be dragged into the canvas directly (the hover-only `+` button is the only way); only within-canvas DnD works
- ❌ No drag preview / drop indicator when dragging from palette
- ❌ No inline rename on section / field (double-click to edit title)
- ❌ Property inspector is hidden behind a narrow 256px panel — style editing (border color, radius, padding) not represented at all
- ❌ No undo / redo
- ❌ No live preview toggle (current builder shows the skeleton, not the rendered form)

### 2.4 WYSIWYG state ("edit borders, add cards anywhere")

No infrastructure currently exists for:

- Developer-gated in-page edit mode (e.g., a `?edit=1` toggle or keyboard shortcut on any page)
- Per-card style overrides (border color, radius, shadow, padding)
- Adding new cards to arbitrary pages (only `PageGridLayout` grid items are addable via the `crm7-add-entity-widget` CustomEvent; no freeform card creation)
- Tenant-wide persistence of layout edits (current grid positions persist to `localStorage` per user, never to Supabase)

### 2.5 Base-stack confirmation — no new libraries beyond what's already in the project

Per user direction (2026-05-01): *"we have these skills already and the base. we've just diverted recently."* This plan uses **only** libraries already in the BSuite base stack. The single exception is `@dagrejs/dagre` for Schema Builder auto-layout — the smallest proven graph-layout library (~25 KB gzipped, zero runtime deps, de-facto standard for React Flow tidy-up in production schema visualizers like dbdiagram.io and azimutt), justified by the user's explicit *"highest UX is key"* directive.

| Capability needed | Base-stack library | Status in project | Session skill |
|---|---|---|---|
| Headless high-perf data grid | TanStack Table v8 | ✅ Used (`crm7/src/components/ui/data-table.tsx`, many consumers) | `tanstack-table` |
| Enterprise data grid (heavy views) | AG Grid Community | ✅ Used (crm7 enterprise surfaces) | `ag-grid` |
| Schema / relationship canvas | `@xyflow/react` (React Flow v12) | ✅ Used in 4 apps (CRM7 canonical + 3 duplicates) | Built into code patterns |
| Drag-and-drop (reorder, sort, kanban, form builder) | `@dnd-kit/core` + `/sortable` + `/utilities` | ✅ Used (FormLayoutBuilder, kanban) | `dnd-kit` |
| Forms + field validation | React Hook Form + Zod | ✅ Used (universal pattern) | `forms-and-validation` |
| Server state + cache | TanStack React Query v5 | ✅ Used everywhere | `tanstack-query` |
| Backend + Auth + Realtime + RLS | Supabase + `@supabase/ssr` | ✅ Used (all 6 apps) | `supabase`, `supabase-postgres-best-practices` |
| UI primitives | shadcn/ui on Radix + Tailwind | ✅ Mandated by BSuite brand system | `shadcn-ui`, `ui-styling` |
| Animation + gestures | Framer Motion v12 | ✅ Used (modals, kanban, micro-interactions) | `framer-motion` |
| Global UI state (undo/redo, edit-mode) | Zustand v5 | ✅ Used (R80.3, FormLayoutStore) | `zustand` |
| CSV / XLSX / PDF export | xlsx + papaparse + pdf-lib + jspdf | ✅ Used (R80.3 imports, crm7 reports) | `data-export` |
| tRPC bridges (when needed) | `@trpc/tanstack-react-query` | ✅ Available | `trpc-tanstack-react-query` |
| Payments + webhooks | Stripe + BSU edge functions | ✅ Used (BSU, crm7) | `stripe-integration` |
| Command palette / fuzzy actions (Cmd+K) | shadcn `cmdk` Command | ✅ crm7, braden have it. ⚠️ BSU / conduit / R80.3 need `pnpm dlx shadcn@latest add command` (installs the `cmdk` transitive dep — already a shadcn standard, not a net-new library choice) | `shadcn-ui` |
| Utility-class merging / style overrides | `tailwind-merge` + `clsx` (`cn()` helper) | ✅ Already installed everywhere via shadcn — critical for the "edit borders" requirement so user-authored style overrides can safely override component base styles without class collisions | `shadcn-ui`, `ui-styling` |
| **Schema auto-layout (NEW)** | **`@dagrejs/dagre@^3.0.0`** | ➕ **New addition — Phase 1 only** | N/A (see §3.6) |

**Dropped from v1.00W drift** (replaced with built-ins; no net new runtime deps besides dagre):

| Dropped library | Why | Replacement |
|---|---|---|
| ELKjs | ~800 KB gzipped, ~30× heavier than dagre for marginal layout-quality gain at CRM schema scale | `@dagrejs/dagre` (~25 KB) |
| reactflow-smart-edge | Adds maintenance surface; React Flow v12 ships smoothstep + `pathOptions` which suffices | React Flow built-in `smoothstep` edge + custom edge component where fine routing is needed |
| react-colorful | New dep for a single UI surface; brand system mandates token-aware swatches first anyway | shadcn `Popover` + token-swatch grid + native `<input type="color">` for "Custom" fallback |
| Puck | Would require porting authoring to a new mental model plus dual-persistence migration | Extend existing `@bsuite/page-builder` with `WidgetInspector` + `EditModeProvider` layers |
| Craft.js | Same reasoning as Puck | Same as above |
| Arcade.js | Would ship a third-party demo/tooltip runtime for the Cmd+K palette use-case; adds billing surface and foreign UI chrome | shadcn `cmdk` Command — same UX, zero new runtime deps (see §3.10) |
| react-joyride | Tour library, not a command palette; was considered for "unintuitive" complaint but wrong shape of tool | shadcn `cmdk` Command for discoverability (see §3.10); inline help copy in widgets for contextual guidance |

### 2.6 Hybrid storage strategy — relational registry + jsonb view-state

Per user direction (2026-05-01 follow-up): *"The plan relies heavily on jsonb for layouts. For a CRM, this makes querying 'Which pages use the Customer entity?' very slow. Use a Hybrid Storage Strategy."* This is already the de-facto architecture (the `tenant_entities` + `tenant_entity_relations` + `tenant_field_definitions` registry tables exist and are queried directly); v1.02W codifies the split so every new feature respects it.

| Data class | Storage | Why | Already exists? |
|---|---|---|---|
| Entities (tables the CRM knows about) | `public.tenant_entities` (flat table, RLS) | Queryable by RLS + indexes; Realtime-publishable | ✅ Yes — used by all 4 schema-builder duplicates |
| Fields / columns on entities | `public.tenant_field_definitions` (flat table, RLS) | Queryable per-entity; validates row payloads via `dbSchemaToZod` | ✅ Yes — BSU + crm7 wire to it |
| Relationships (FKs, inheritance, M:N) | `public.tenant_entity_relations` (flat table, RLS) | Core of the Schema Builder graph; drives crow's-foot markers | ✅ Yes — used by `createSchemaRelation` etc. |
| Canvas view state (x/y, accent color, collapsed) | `tenant_entities.metadata` jsonb | Non-functional; never queried to answer "which entities…" questions | ✅ Yes — current drag-end persist targets `metadata.position` |
| Page layouts (widget positions + style overrides) | `custom_pages.layout` + `custom_page_blocks` jsonb | Per-page, per-scope; rarely cross-queried | ✅ Yes — CRM7-owned canonical surface per ADR-0001 |
| Form layouts (tabs/sections/fields) | `form_layouts.layout` jsonb | Per-form, tenant-scoped | ✅ Yes — existing in crm7 UI customization system |
| Custom pages | `custom_pages.layout` jsonb + `custom_page_revisions` | Per-page, revisioned | ✅ Yes — schema exists; authoring UI in Phase 5 |

**Rule**: any time a new feature stores data that must be answered by "which entities use X" / "which forms reference Y" / "which users edited Z", it MUST live in a flat relational table, not jsonb. Jsonb is reserved for view-state that is always fetched together with its owning row.

**Realtime benefit**: because the registry tables are already listed in `enable_realtime_all_tables.sql`, every open developer tab receives schema mutations via Supabase Realtime without polling. The Schema Builder subscribes to `postgres_changes` on `tenant_entities`, `tenant_entity_relations`, and `tenant_field_definitions` to keep all open canvases in sync.

**Prereq migration (Phase 1a blocker) — `20260503000000_add_field_level_relations.sql`**:

The existing `tenant_entity_relations` table is entity-to-entity only (`source_entity_id` → `target_entity_id`). To support Airtable / dbdiagram-grade field-level connections per §3.6 item 1 and the `SchemaRelationSchema` Zod contract in §3.9, two nullable FK columns are added plus a Realtime publication confirmation. The migration is additive and fully backwards-compatible — existing entity-to-entity rows keep working (both new columns NULL), and Phase 1b can start emitting field-level rows the moment the migration lands.

```sql
-- 20260503000000_add_field_level_relations.sql
-- Phase 1a prereq per docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md §2.6.
-- Adds field-level FK columns to tenant_entity_relations + confirms Realtime.

BEGIN;

-- 1. Field-level FK columns (nullable — entity-to-entity rows stay valid)
ALTER TABLE public.tenant_entity_relations
  ADD COLUMN IF NOT EXISTS source_field_id uuid
    REFERENCES public.tenant_field_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_field_id uuid
    REFERENCES public.tenant_field_definitions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tenant_entity_relations.source_field_id IS
  'Field-level FK source column. NULL = entity-to-entity relation (legacy). '
  'Set by Schema Builder when the user drags from a field-row handle per §3.9.';

COMMENT ON COLUMN public.tenant_entity_relations.target_field_id IS
  'Field-level FK target column. Almost always the primary key of the target entity.';

-- 2. Integrity guard — both field IDs present or both NULL (never mismatched)
ALTER TABLE public.tenant_entity_relations
  DROP CONSTRAINT IF EXISTS chk_field_level_pair;
ALTER TABLE public.tenant_entity_relations
  ADD CONSTRAINT chk_field_level_pair
  CHECK (
    (source_field_id IS NULL AND target_field_id IS NULL)
    OR
    (source_field_id IS NOT NULL AND target_field_id IS NOT NULL)
  );

-- 3. Performance indexes for the typical Schema Builder queries
CREATE INDEX IF NOT EXISTS idx_ter_source_field
  ON public.tenant_entity_relations (source_field_id)
  WHERE source_field_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ter_target_field
  ON public.tenant_entity_relations (target_field_id)
  WHERE target_field_id IS NOT NULL;

-- 4. Realtime publication — idempotent add (table is already in the
-- publication in canonical environments, but re-assert to guard against
-- drift on dev/staging Supabase projects).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tenant_entity_relations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_entity_relations;
  END IF;
END $$;

COMMIT;
```

**Rollback migration** (`20260503000001_revert_field_level_relations.sql`) ships alongside per §7 rollback policy:

```sql
-- 20260503000001_revert_field_level_relations.sql
BEGIN;

DROP INDEX IF EXISTS public.idx_ter_source_field;
DROP INDEX IF EXISTS public.idx_ter_target_field;

ALTER TABLE public.tenant_entity_relations
  DROP CONSTRAINT IF EXISTS chk_field_level_pair;

ALTER TABLE public.tenant_entity_relations
  DROP COLUMN IF EXISTS source_field_id,
  DROP COLUMN IF EXISTS target_field_id;

COMMIT;
```

**RLS note**: the existing `tenant_entity_relations` policies (SELECT / INSERT / UPDATE / DELETE scoped by `tenant_id` through `user_tenants`) already cover the new columns — row-level filtering is unaffected. The new FK references to `tenant_field_definitions(id)` use `ON DELETE SET NULL` so dropping a field-definition row degrades the relation to entity-level rather than cascading to delete the whole relation. This preserves the audit trail of the connection even when one endpoint column is removed.

---

## 3. Target Architecture

### 3.1 Three coexisting layout systems (reconciled)

| System | Purpose | Authoring surface | Storage | Renderer |
|---|---|---|---|---|
| **FormLayoutConfig** | Per-entity **form** customization (tabs/sections/fields) | `crm7` `/settings/form-layouts/:id` (FormLayoutBuilder) | `form_layouts.layout` jsonb (Supabase) | `FormLayoutRenderer` |
| **PageGridLayout** | Per-user **dashboard grid** widget arrangement | Any page in edit mode (Settings2 icon) | `localStorage` per-user today; tenant-authored published pages use CRM7 `custom_pages` per ADR-0001 | `PageGridLayout` + `WidgetRenderer` |
| **Custom Pages** | Tenant-authored **new pages** added to navigation | CRM7 custom page settings (canonical editor) | `custom_pages.layout` jsonb + `custom_page_blocks` + `custom_page_revisions` (Supabase) | `CustomPageRenderer` (per-app thin wrapper + shared `WidgetRenderer`) |

### 3.2 Shared package boundaries after refactor

```
@bsuite/schema-registry (React 19)
  ├── /react           — FormLayoutRenderer, WidgetRenderer, all widgets
  ├── /react/editors   — (existing) widget prop editors
  └── /schemas         — Zod schemas for FormLayoutConfig, WidgetProps, LayoutJson

@bsuite/page-builder (React 19)
  ├── PageGridLayout          — react-grid-layout wrapper (existing)
  ├── WidgetInspector         — NEW: style inspector panel for selected widgets
  ├── EditModeProvider        — NEW: permission-gated edit mode context
  ├── LayoutAdapter           — NEW: pluggable localStorage | CRM7 custom_pages reader | dual resolver persistence
  └── styles/                 — CSS for grid overrides + inspector chrome

@bsuite/schema-builder (NEW — React 19)
  ├── SchemaCanvas            — React Flow canvas (consolidated from 4 duplicates)
  ├── EntityNode              — Entity card with column-level handles (port pattern, one Handle per field row)
  ├── RelationshipDialog      — edge config dialog (existing in CRM7)
  ├── AutoLayout              — dagre wrapper, rankdir 'LR' + nodesep 60 + ranksep 80 (~30 lines)
  ├── CardinalityMarker       — crow's-foot / 1:N glyphs at edge endpoints
  ├── edges/
  │   └── SmartEdge.tsx       — custom React Flow edge that inspects nodes[] and nudges waypoints to avoid label overlap; wraps the built-in smoothstep edge
  ├── schemas.ts              — Zod schemas exported for consumers (CardinalitySchema, SchemaRelationSchema, EntityFieldSchema, EntityNodeDataSchema — see §3.9)
  └── hooks/
      ├── useSchemaController.ts — canonical controller hook (Hot-Sync target — §4 Phase 1a); owns load/save/persist + optimistic mutations + Realtime subscription
      ├── useSchemaCanvas.ts     — React Flow state (nodes, edges, viewport) + dagre layout actions
      └── useEntityColumns.ts    — Postgres reflection via information_schema RPC
```

### 3.3 Persistence strategy (CASS — Client-side/Application-side Schema Stacking)

Layered resolution at runtime:

```
1. localStorage user override (per-user, optional)   ← highest priority
2. CRM7 custom_pages published layout (tenant-wide, optional)
3. app_default_layouts          (shipped with app bundle)
4. hardcoded fallback           ← lowest priority
```

Developer picks persistence scope per edit via a UI toggle where the current surface supports publishing:

- **"Save to my layout"** → writes to the existing per-user/local layout preference layer
- **"Publish to tenant"** → writes through the canonical CRM7 `custom_pages` / `custom_page_blocks` service
- **"Reset to default"** → clears the per-user override so the published tenant or shipped default layout resolves

RLS:

- `custom_pages` / `custom_page_blocks`: tenant-scoped RLS remains canonical; write requires the existing CRM7 authoring permissions
- Per-user layout preferences remain user-scoped and never write to deprecated layout tables

### 3.4 Edit-mode UX (borrowed from Puck + Notion + Framer)

A global `EditModeProvider` context at the app shell level controls:

- **Chrome visibility**: drag handles, delete buttons, "+ Add card" hover targets, selection rings
- **Cursor state**: `crosshair` on hover over editable regions
- **Selection state**: single-select card/section/field, shown in inspector
- **Inspector panel**: right-docked `Sheet` (shadcn) showing style, layout, content, and data-binding tabs
- **Undo/redo stack**: `zustand` store with `history` middleware (keeps last 50 states)
- **Keyboard shortcuts**:
  - `E` toggle edit mode (guarded by `PermissionGate`)
  - `Delete` remove selected
  - `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo
  - `Escape` deselect

### 3.5 Style inspector (what "edit borders" means concretely)

A shadcn `Sheet` docked to the right edge, 320px wide, with four tabs (shadcn `Tabs`):

| Tab | Controls | Notes |
|---|---|---|
| **Style** | Border (color/width/style), Radius, Padding, Margin, Shadow, Background, Text color | Color pickers are **token-aware** — pick from theme (`--accent-primary`, `--accent-secondary`, etc.) not freeform hex. "Custom" option opens a shadcn `Popover` containing a native `<input type="color">` (zero new deps). The picker presents values in **OKLCH** colour space per the `bsuite-brand-system` skill — D2C and Corporate tokens are authored as OKLCH (e.g. `oklch(0.60 0.22 250)`), and the "Custom" fallback `<input type="color">` emits sRGB hex which the picker transparently converts to OKLCH before persisting so downstream brand-compliance linters catch drift. Hex storage is forbidden in layout JSON; every persisted colour is either `var(--token-name)` or an explicit `oklch(...)` string. |
| **Layout** | Grid position (x/y/w/h), breakpoint overrides (lg/md/sm/xs), min/max size, alignment | Read/write bound to `react-grid-layout` `Layout` object |
| **Content** | Title, description, icon, inline text editor for card body | Applies to card-type widgets only; data-bound widgets show the binding instead |
| **Data** | Entity binding, filter, sort, row limit, columns shown | Applies to DataTable / EntityTable / Chart widgets |

**Token-aware color picker** (critical for brand compliance — no new deps): the default swatches are a grid of shadcn `Button` components coloured from the app's own CSS variables (D2C or Corporate tokens — e.g., `--accent-primary`, `--accent-secondary`, `--surface-raised`). A final "Custom" button opens a shadcn `Popover` wrapping a native `<input type="color">` for arbitrary hex. This keeps developers inside the brand system by default and avoids pulling in `react-colorful` or any other picker library.

> **Critical implementation rule (v1.02W R1 refinement)**: when a user picks a token swatch, persist the CSS variable **name** (`var(--accent-primary)`) into the layout JSON — NEVER the resolved hex colour at authoring time. Reason: the same page must render correctly under both D2C Neon Electric (blue primary) and Corporate (red primary) themes. A hex locks the layout to whichever theme was active during authoring. Only freeform "Custom" values are stored as `oklch(...)` strings (never raw hex), and those carry an explicit `isCustomColor: true` flag so the validator can warn on brand drift during review.

### 3.6 Schema Builder upgrades (Airtable/Supabase-grade)

**Consolidation**: the 4 duplicate implementations become consumers of a single `@bsuite/schema-builder` package. Each app's route file becomes a ~30-line wrapper that passes in `tenantId`, `appScope`, and optionally custom entity filters.

**New capabilities** (on top of what all 4 already have):

1. **Column-level handles (Airtable / dbdiagram parity)** — each field row inside an entity card has its own left and right `<Handle>` (React Flow v12 supports multi-handle nodes via the `id` prop). The handle ID format is `${tableId}.${fieldId}.(left|right)` so the `onConnect` callback receives a source / target that pinpoints the exact column, not just the table. Dragging from `orders.customer_id.left` → `customers.id.right` resolves to a `SchemaRelation` (see §3.9 Zod schema) with auto-inferred cardinality (1:N since `id` is a primary key and `customer_id` is not). Entity-level handles (current behaviour) remain as a fallback when a user drops on empty card chrome rather than a specific field row. See §3.9 for the Zod schema that validates every connection before persist.

2. **Crow's-foot cardinality markers** — custom edge component renders `|` or `⟨` glyphs at source/target based on `relation_type`:
   - `one_to_one`: `—|` both ends
   - `one_to_many`: `—|` source, `—⟨` target
   - `many_to_many`: `⟩—⟨` both ends
   - `inherits_from`: animated arrow (existing)

3. **Dagre auto-layout** — a "Tidy up" button in the toolbar runs `@dagrejs/dagre` with `rankdir: 'LR'` (left-to-right), `ranker: 'network-simplex'` (default, minimises edge crossings), `nodesep: 60` (vertical spacing between sibling nodes within the same rank), and `ranksep: 80` (horizontal spacing between successive ranks — tuned for our default entity-card width of ~260 px so labels never overlap). Preserves existing positions on manual drag (auto-layout only applies when requested). Dagre is the smallest proven graph-layout library (~25 KB gzipped, zero runtime deps, synchronous API) and is the de-facto standard for React Flow auto-layout in production schema visualizers (dbdiagram.io, azimutt, drawsql). Integration is ~30 lines: build the dagre graph from `nodes` + `edges`, call `dagre.layout()`, map the returned `(x, y)` back onto React Flow node positions. See §6 for the pinned version.

4. **Schema reflection** — a new `useEntityColumns(entityId)` hook queries `information_schema.columns` (via a Supabase RPC) for the underlying table, showing actual column names and types inside each card — not just "Fields mapped".

5. **Smart-edge routing** — use React Flow v12's built-in `smoothstep` edge type with `pathOptions: { borderRadius, offset }` to route edges around nodes. For the rare case where an edge crosses a node label, implement a small custom edge component at `edges/SmartEdge.tsx` that inspects `sourceX/sourceY` + `targetX/targetY` against the `useStore((s) => s.nodeInternals)` node-rect map and nudges waypoints around overlapping rects. No new library required.

6. **Minimap + zoom-to-fit + search** — add a toolbar with entity search; selecting a search result pans + zooms to that entity.

7. **Inline edit** — double-click an entity label to rename; double-click a field row to edit field metadata in a popover (not the side panel).

8. **Export** — button to export the current schema as DBML, SQL DDL, or PNG (for docs). PNG shipped first via React Flow's image path; DBML and SQL DDL emitters remain required backlog scope before this plan can be marked complete in full.

### 3.7 Mutation pattern — `useOptimistic` + TanStack Query (+ Server Actions where available)

Per user direction (2026-05-01 follow-up): *"Since you are on React 19, stop using useEffect for persistence. Use the `useOptimistic` hook for the DnD layout… Wrap your Supabase calls in React Server Actions… atomic transactions, preventing the 'UI out of sync with DB' issues."*

**Constraint**: only Conduit (Next.js 16 App Router) supports true React Server Actions (`'use server'`). The other 5 apps are Vite-based and run client-side, so they get the equivalent behaviour via TanStack Query + `useOptimistic` instead. v1.02W specifies a single unified `useSchemaController` hook that picks the right primitive at build time.

| App | Runtime | Mutation primitive |
|---|---|---|
| business-suite-unified | Vite | TanStack Query `useMutation` with `onMutate` optimistic update + `useOptimistic` for local staged state |
| crm7 | Vite | Same as BSU |
| conduit | Next.js 16 | React Server Action (`'use server'`) called via `useActionState` + `useOptimistic` for instant UI |
| braden | Vite | Same as BSU |
| R80.3 | Vite | Same as BSU |
| throughput | Vite | N/A — not a Schema Builder consumer |

**`queryOptions` factory pattern** (per TanStack Query v5 / `tanstack-query` skill): all read queries in `useSchemaController` are defined as factory-returned `queryOptions` objects so consumers can compose, share, and invalidate them without stringly-typed `queryKey` arrays. Example:

```ts
// packages/schema-builder/src/hooks/queries.ts
import { queryOptions } from '@tanstack/react-query';
export const schemaEntitiesOptions = (tenantId: string) =>
  queryOptions({
    queryKey: ['schema-entities', tenantId] as const,
    queryFn: ({ signal }) => fetchSchemaEntities(tenantId, signal),
    staleTime: 30_000,
  });
export const schemaRelationsOptions = (tenantId: string) =>
  queryOptions({
    queryKey: ['schema-relations', tenantId] as const,
    queryFn: ({ signal }) => fetchSchemaRelations(tenantId, signal),
    staleTime: 30_000,
  });
```

The mutation's `onSettled` then invalidates `schemaRelationsOptions(tenantId).queryKey` rather than a bare string array, which keeps the key canonical across the package and its consumers.

**Canonical Vite-app pattern** (used in `useSchemaController`) — TanStack Query native optimistic, no `useOptimistic`:

```ts
// Drag-end / connect persist — TanStack Query native optimistic pattern
const createRelationMutation = useMutation({
  mutationFn: (relation: SchemaRelation) => createSchemaRelation(relation),
  onMutate: async (relation) => {
    await queryClient.cancelQueries({ queryKey: ['schema-relations', tenantId] });
    const prev = queryClient.getQueryData<SchemaRelation[]>(['schema-relations', tenantId]);
    queryClient.setQueryData<SchemaRelation[]>(
      ['schema-relations', tenantId],
      (old = []) => [...old, relation],
    );
    return { prev };
  },
  onError: (_err, _relation, ctx) => {
    if (ctx?.prev) queryClient.setQueryData(['schema-relations', tenantId], ctx.prev);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['schema-relations', tenantId] }),
});
```

> **Why no `useOptimistic` in Vite apps**: React 19's `useOptimistic` updater must be invoked inside a transition or action (i.e., inside a Server-Action flow driven by `useActionState`, or inside a manual `startTransition`). Calling it from a TanStack Query `onMutate` callback runs outside any transition and React 19 throws *"An optimistic state update occurred outside a transition or action."* TanStack Query's own `onMutate` + `queryClient.setQueryData` + `onError` rollback is already transition-safe and is functionally equivalent to `useOptimistic` for this use-case — there is no advantage to layering `useOptimistic` on top. `useOptimistic` is used in the Conduit / Server-Action pattern only, where `useActionState` provides the required transition boundary.

**Canonical Next.js / Conduit pattern** (used in `useSchemaController` when running inside the Next.js app):

```ts
// app/(dashboard)/settings/schema-builder/actions.ts
'use server';
export async function createSchemaRelationAction(relation: SchemaRelation) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('tenant_entity_relations').insert(relation).select().single();
  if (error) throw error;
  revalidateTag('schema-relations');
  return data;
}

// component
const [state, action, pending] = useActionState(createSchemaRelationAction, initialState);
const [optimistic, addOptimistic] = useOptimistic(relations, (curr, r: SchemaRelation) => [...curr, r]);
```

**Rule**: no component in `@bsuite/schema-builder` uses `useEffect` to trigger persist. All persist flows go through `useSchemaController` → TanStack Query mutation (Vite) or Server Action (Conduit). This eliminates the "UI out of sync with DB" class of bug because every mutation path has optimistic UI + rollback + cache invalidation wired.

### 3.8 Realtime cross-tab sync

The Schema Builder subscribes to three `postgres_changes` channels on mount:

1. `tenant_entities` — INSERT / UPDATE / DELETE → refresh `['schema-entities', tenantId]`
2. `tenant_entity_relations` — INSERT / UPDATE / DELETE → refresh `['schema-relations', tenantId]`
3. `tenant_field_definitions` — INSERT / UPDATE / DELETE → refresh `['entity-fields', entityId]`

These tables are already published to Realtime (per `business-suite-unified/supabase/migrations/20260409000003_enable_realtime_all_tables.sql`). The subscription logic lives in `useSchemaController` and uses the shared `tenantId` + `appScope` filter so cross-tenant leakage is impossible.

### 3.9 Field-level relationship Zod schemas

Canonical shape exported from `@bsuite/schema-builder/schemas`. These drive both React Flow edge rendering (`SchemaRelationSchema` → custom edge → crow's-foot marker) and the Supabase mutation that persists to `tenant_entity_relations`.

```ts
import { z } from 'zod';

// Cardinality — Airtable / Supabase FK semantics
export const CardinalitySchema = z.enum(['one_to_one', 'one_to_many', 'many_to_many']);
export type Cardinality = z.infer<typeof CardinalitySchema>;

// Field (column) inside an entity card
export const EntityFieldSchema = z.object({
  id: z.string(),                     // usually the fully-qualified `${tableId}.${columnName}`
  name: z.string(),                   // column name (e.g. 'customer_id')
  type: z.string(),                   // Postgres type ('uuid', 'text', 'timestamptz', …)
  isPrimary: z.boolean().default(false),
  isNullable: z.boolean().default(true),
});
export type EntityField = z.infer<typeof EntityFieldSchema>;

// Entity node data (the React Flow node's `data` prop)
export const EntityNodeDataSchema = z.object({
  tableId: z.string(),                // matches tenant_entities.id
  label: z.string(),                  // human-readable entity name
  fields: z.array(EntityFieldSchema),
  accentColor: z.string().optional(), // stores CSS variable name (e.g. 'var(--accent-secondary)'), not hex — see §3.5 R1
  collapsed: z.boolean().default(false),
});
export type EntityNodeData = z.infer<typeof EntityNodeDataSchema>;

// Relationship — one edge on the canvas = one FK in the database
export const SchemaRelationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),        // e.g. 'CustomerOrders'; defaults to `${source.fieldId}_${target.fieldId}`

  source: z.object({                  // the table holding the foreign key
    tableId: z.string(),
    fieldId: z.string(),              // specific column (e.g. 'customer_id')
    handle: z.enum(['left', 'right']).default('right'),
  }),

  target: z.object({                  // the referenced table
    tableId: z.string(),
    fieldId: z.string(),              // the referenced column (usually 'id')
    handle: z.enum(['left', 'right']).default('left'),
  }),

  metadata: z.object({
    cardinality: CardinalitySchema.default('one_to_many'),
    onDelete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).default('SET NULL'),
    onUpdate: z.enum(['CASCADE', 'RESTRICT', 'NO ACTION']).default('CASCADE'),
    isSystem: z.boolean().default(false),            // true iff this row REFLECTS a native Postgres FK discovered by schema reflection (read-only in UI)
    applyAsPostgresFK: z.boolean().default(false),   // one-shot INTENT: emit ALTER TABLE ... ADD CONSTRAINT via the apply_schema_relation RPC on next save. Never persisted — the RPC consumes and clears it.
  }),
});
export type SchemaRelation = z.infer<typeof SchemaRelationSchema>;
```

**Zod ↔ DB column aliasing** — because `SchemaRelation.source.tableId` and `target.tableId` are React Flow terminology but the database calls them `entity_id`, the Schema Controller translates at the persistence boundary. The mapping is 1:1:

| Zod field | DB column in `tenant_entity_relations` | Notes |
|---|---|---|
| `id` | `id` | UUID |
| `name` | `source_label` or `target_label` | Human-readable; stored on whichever side the user authored |
| `source.tableId` | `source_entity_id` | Points to `tenant_entities.id` |
| `source.fieldId` | `source_field_id` (new — see §2.6 migration) | Points to `tenant_field_definitions.id`; NULL for entity-level fallback |
| `source.handle` | — | UI-only; the full Handle ID `${tableId}.${fieldId}.(left\|right)` is reconstructed by `EntityNode` and never persisted |
| `target.tableId` | `target_entity_id` | |
| `target.fieldId` | `target_field_id` (new) | |
| `target.handle` | — | UI-only, as above |
| `metadata.cardinality` | `relation_type` | Existing column; values map 1:1 (`one_to_one`, `one_to_many`, `many_to_many`, `inherits_from`) |
| `metadata.onDelete` | `on_delete` (new) | |
| `metadata.onUpdate` | `on_update` (new) | |
| `metadata.isSystem` | `is_system` | Existing column |
| `metadata.applyAsPostgresFK` | — | Not persisted — a one-shot intent flag passed to the `apply_schema_relation` RPC, never stored |

**Integration points**:

- **Handle generation** — `EntityNode.tsx` maps `data.fields` to one `<Handle type="source" id={`${data.tableId}.${field.id}.right`}>` and one `<Handle type="target" id={`${data.tableId}.${field.id}.left`}>` per field row.
- **`onConnect`** — decomposes the React Flow `Connection` (`sourceHandle`, `targetHandle`) strings into `{ tableId, fieldId, side }`, constructs a `SchemaRelation`, validates through `SchemaRelationSchema.parse()`, then dispatches through `useSchemaController.createRelation()`.
- **Persist** — the validated object maps 1:1 onto `tenant_entity_relations` rows via the alias table above. For the rare case where a developer wants the Schema Builder to emit actual Postgres FK DDL (not just metadata), a Supabase RPC `apply_schema_relation(rel_id uuid)` runs `ALTER TABLE … ADD CONSTRAINT` server-side with SECURITY DEFINER scoped to the tenant. Gated behind `metadata.applyAsPostgresFK = true` (a one-shot intent flag, never persisted — the RPC consumes and clears it) plus an extra "Apply to database" explicit confirmation dialog — never automatic. The separate `metadata.isSystem` flag is orthogonal: it tags rows that REFLECT an already-existing native Postgres FK discovered by schema reflection (such rows are read-only in the UI), whereas `applyAsPostgresFK` is the transient intent to CREATE a new native FK from the current metadata row.
- **Rendering** — the custom edge component reads `metadata.cardinality` to render crow's-foot markers (§3.6 item 2), and `metadata.onDelete` to style the edge (solid for CASCADE, dashed for SET NULL).
- **Handle ID vs Zod `handle` field** — the `source.handle` and `target.handle` Zod fields store only `'left' | 'right'` (the side of the card the handle lives on). The full React Flow Handle ID `${tableId}.${fieldId}.${handle}` is reconstructed at render time by `EntityNode` and never persisted. This separation keeps the Zod schema 1:1 with the DB row shape while giving React Flow the unique handle IDs it requires.

### 3.10 Command palette (Cmd+K)

Per user direction (2026-05-01 follow-up): *"Add a 'Command Palette' (Cmd+K) that allows developers to type 'Add Column' or 'Connect Tables' rather than hunting for small UI dots."*

**Implementation**: shadcn's `cmdk` Command component (already the standard shadcn palette primitive) mounted at the app shell level behind a global `Cmd/Ctrl+K` hotkey. No new libraries. Permission-gated by `manage_system` — non-developers get the palette with read-only actions (search, navigate) but not mutation commands.

**Command catalogue (v1.02W target set — expand as features ship)**:

| Command | Scope | Phase |
|---|---|---|
| `Add Column` to `entity` | Schema Builder, any page with a selected entity | Phase 1b |
| `Connect Tables` `source` → `target` | Schema Builder | Phase 1b |
| `Find Entity` `name` (fuzzy) + pan & zoom | Schema Builder | Phase 1a |
| `Tidy Up Layout` (runs dagre auto-layout) | Schema Builder | Phase 1b |
| `Add to Page` `entity` as `widget-type` | Any page with PageGridLayout | Phase 3 |
| `Edit Page` / `Save Page Layout` / `Reset Page Layout` | Any page with PageGridLayout | Phase 3 |
| `Go to` `page-path` (fuzzy navigation) | Global | Phase 1a |
| `Toggle Edit Mode` (E) | Global | Phase 3 |
| `Undo` / `Redo` | Global | Phase 3 |
| `Publish` / `Preview` (for Custom Pages) | CRM7 custom page settings | Phase 5 |

**Install step (Phase 1a prereq)**: BSU, conduit, and R80.3 need `pnpm dlx shadcn@latest add command` run once (inside an isolated dir per AGENTS.md lockfile rules). crm7 and braden already have it. This is a shadcn top-up, not a new library choice — `cmdk` is a shadcn-native primitive.

**Keyboard gesture convention**:

- `Cmd/Ctrl+K` — open palette (anywhere)
- `Cmd/Ctrl+Shift+K` — open palette scoped to current page (pre-filters to page-level actions)
- `Esc` — close
- Arrow keys + `Enter` — navigate / execute

**Accessibility**: `cmdk` ships full keyboard support + ARIA roles out of the box. We wrap the trigger in a shadcn `Tooltip` showing the keystroke for discoverability.

---

## 4. Phased Execution

### 4.−1 Pre-Phase Readiness Gate (run before EVERY phase)

Per user direction (2026-05-01): *"use ship all apps skill to bring all changes including earlier and claude code and other changes into development branch so long as they don't conflict with our current work. stop short of merge to default branch. but make sure development branch contains everything before commencing 1a and repeat this before each subsequent phase."*

**Trigger:** runs immediately before **every** phase (0, 1a, 1b, 2, 3, 4, 5, 6) — including repeat runs when a phase spans multiple sessions.

**Agent skill to load:** `ship-all-apps` (parent-repo sweep across parent bsuite + 6 submodules: crm7, business-suite-unified, conduit, braden, R80.3, throughput).

**Gate steps (sequential, fail-fast):**

1. **Fetch + sweep** — `git fetch --all --prune` in parent and every submodule; list every remote branch that has no open PR (orphans) and every open PR across all 7 repos.
2. **Pull conflict-free work into `development`** — for every open PR that (a) targets `development`, (b) is MERGEABLE/CLEAN, (c) has passed its required checks, (d) does not conflict with the current phase's planned file changes → merge into `development` via GitHub's merge-queue-equivalent. Orphan branches with no PR are surfaced to the user for triage, not auto-merged.
3. **Stop short of `main`** — nothing in the gate merges `development` → `main` / default branch. That is a separate sign-off event the user retains control of.
4. **Report** — print a per-repo table: `open_prs`, `merged_into_dev`, `skipped_conflicting`, `orphaned_no_pr`, `blocked_failing_checks`. The current phase MAY NOT start until every entry in `skipped_conflicting` is resolved, converted into an operator-only/external-blocked item with explicit evidence, or removed because a newer canonical plan supersedes it.
5. **Snapshot** — record the final `development` HEAD SHA for parent + every submodule in the phase's kickoff memo so the phase has a deterministic base.

**Skills consulted during the gate:**

- `ship-all-apps` — sweep + merge orchestration
- `git-workflow` — conventional commit format for any cleanup commits
- `tandem-dev-main-reconcile` — only if the sweep surfaces a parent/submodule pointer conflict (DIRTY merge state)
- `using-git-worktrees` — if a conflict needs side-by-side resolution, the worktree is created in `/tmp/bsuite-reconcile-YYYYMMDD/`
- `verification-before-completion` — no gate step is marked complete until its output is shown to the user

**Definition of done:** a single comment posted to the phase's tracking issue (or the user's chat) with the report table from step 4 and the snapshot SHAs from step 5.

### 4.0 Phase dependency graph

```
Phase 0  (React 19 unification + Dep Policy + card clipping)           — no prereqs
   ↓
Phase 1a (Hot-Sync — migration + useSchemaController + 4 wrappers      — needs Phase 0
          + cmdk install + Find Entity/Go to palette subset)
   ↓
Phase 1b (Airtable upgrades — column handles + crow's-foot             — needs 1a
          + dagre + reflection + SmartEdge + minimap + PNG export)
   ↓
Phase 2  (custom_pages renderer + LayoutAdapter resolver)              — needs Phase 1b's useSchemaController patterns
   ↓
Phase 3  (EditModeProvider + WidgetInspector + undo/redo                — needs Phase 2's LayoutAdapter
          + twMerge style overrides + Cmd+K mutation commands)
   ↓
Phase 4  (Form Builder DnD + inline rename + live preview)              — shares zustand temporal store with Phase 3
                                                                          (can start in parallel with Phase 3 once
                                                                          the temporal store is extracted in 3's first milestone)
   ↓
Phase 5  (Custom Page authoring in CRM7 custom page settings)           — needs Phase 2 + Phase 3
   ↓
Phase 6  (peer policy re-evaluation + CI lint + DBML/SQL DDL exporters   — no hard prereqs; can run anytime after Phase 0
          + durable undo/redo history + final parity verification)         but traditionally last so the suite converges)
```

Phase 1a is a hard blocker for all feature work. Phases 3/4 can overlap once the shared zustand temporal store is extracted in Phase 3's first milestone. Phase 6 now closes remaining parity and governance scope after React 19 parity is already achieved: peer policy decision, CI enforcement, DBML/SQL DDL exporters, durable undo/redo history, and cross-app WYSIWYG parity verification.

**Gate before every phase:** run §4.−1 Pre-Phase Readiness Gate. A phase may not begin until its gate report has been posted and its conflicts are either resolved, operator/external-blocked with evidence, or superseded by a newer canonical plan. This is in addition to any code-level prereqs listed in the phase's own Prereqs line.

### Phase 0 — Safe quick wins (this session)

**Skills to load before starting:** `master-orchestration`, `git-workflow`, `cross-platform-sync` (AGENTS.md / CLAUDE.md / .windsurfrules must stay in sync), `verification-before-completion`, `dependency-management`, `bsuite-brand-system` (React 19 across all apps without cross-contaminating braden Corporate theme).

**Scope** (all low-risk, no behavior changes to editor UX):

1. **Rule**: Add "Dependency Version Policy" to `AGENTS.md` + `CLAUDE.md` + `.windsurfrules`:
   > Always use the latest mutually-compatible versions of React, React-DOM, `@types/react`, and related libraries across apps AND shared packages. When a shared package is bumped, consumer apps must be re-verified. A CI lint step blocks PRs where `packages/*/package.json` React version falls behind the lowest consumer app React version.

2. **React 19 unification in shared packages (devDependency alignment, liberal peers)**:
   - `packages/schema-registry`: devDeps react / react-dom → `^19.2.4`, `@types/react` → `^19.2.14`, `@types/react-dom` → `^19.2.3`; peer range stays liberal.
   - `packages/page-builder`: same devDependency bump; peer range stays liberal.
   - `packages/nav-core`: same devDependency bump; no React peer tightening in Phase 0.
   - `packages/theme` and `packages/ui`: same devDependency bump because they are shared packages and must not trail the consumer React major.
   - `mobile`: react `19.2.0` (exact) → `^19.2.4` to match `react-dom`.
   - `throughput`: originally outside Phase 0 scope; now independently complete on React 19.2.x.

3. **Card clipping fix** (`crm7/src/components/ui-customization/FormLayoutBuilder.tsx`):
   - Section title: add `truncate` + `min-w-0` so flex clipping works; add `title={section.title}` for native tooltip on hover
   - Field label in `SortableField`: already has `truncate` — audit for the same `min-w-0` parent issue
   - Property-panel inputs: add `w-full` consistently so labels don't push inputs off-panel

4. **Throughput React 19 parity** — now complete in current code; keep Phase 6 focused on enforcement and full-app parity, not migration.

**Acceptance criteria for Phase 0**:

- `pnpm typecheck` passes in `packages/schema-registry`, `packages/page-builder`, `packages/nav-core`, `crm7`
- Visual confirmation in the user's browser that the clipped title now truncates with ellipsis and shows a tooltip
- The three rule files contain the new Dependency Version Policy section

**Red-team pass (mandatory before Phase 0 is marked ✅):** spawn `multi-agent-red-team-implementation` with these three lenses: (1) `dependency-management` + `security-audit` — any secret leak or downgrade attack vector introduced by the React 19 bump? (2) `cross-platform-sync` — does the Dependency Version Policy read identically in all three rule files, with no drift? (3) `bsuite-brand-system` — has the Corporate (braden) brand accidentally picked up D2C tokens anywhere during the edit?

### Phase 1 — Schema Builder consolidation + Airtable upgrades (1 session)

> **Current status (2026-05-05): ✅ Completed for Schema Builder.** Phase 1a shipped the shared `@bsuite/schema-builder` package and consumer thin-wrapper pattern. Phase 1b's Airtable/dbdiagram-grade upgrades subsequently shipped through the package's 0.2.x–0.5.x line: column-level handles, crow's-foot markers, dagre auto-layout, schema reflection, smart edge routing, minimap/zoom-to-fit/fuzzy toolbar, inline editing, PNG export, full command surface foundations, `FieldCreateDialog`, `FieldEditDialog`, and migration-path cleanup. The current package line is `@bsuite/schema-builder@0.7.0`; details are summarized in `packages/schema-builder/README.md` and the Phase 3 signoff.

**Prereqs**: Phase 0 merged; user approval of this doc; `pnpm dlx shadcn@latest add command` run in BSU / conduit / R80.3 (Cmd+K palette prereq per §3.10).

Phase 1 splits into **Phase 1a (Hot-Sync Fix)** and **Phase 1b (Airtable upgrades)**. Phase 1a MUST ship and land in all 4 consumers before Phase 1b starts — it eliminates the ~1500-line DRY violation that blocks every subsequent change.

#### Phase 1a — Hot-Sync Fix (carve-out per user direction)

> **Completion note (2026-05-05):** Closed. The canonical package, `useSchemaController`, Zod contracts, Cmd+K Phase-1a subset, migration fixture split, and consumer wrappers exist. ADR-0004 records the consolidation decision.

**Skills to load before starting:** `master-orchestration`, `ship-all-apps` (re-run the gate per §4.−1), `dry-one-shot-architecture` (the consolidation IS the DRY fix for the 4 duplicated schema builders), `tanstack-query` + `tanstack-router` (controller hook), `forms-and-validation` (Zod schemas in §3.9), `supabase` + `supabase-postgres-best-practices` (RLS + Realtime wiring + migration application), `shadcn-ui` (Cmd+K Command install), `zustand` (canvas state), `dnd-kit` (node drag handles), `subagent-driven-development` (4 consumer PRs open in parallel), `verification-before-completion`.

Per user direction (2026-05-01): *"Before building new features, consolidate the 4 duplicated Schema Builders into `@bsuite/schema-builder`. Extract the logic into a `useSchemaController` hook. Publish as a versioned package. Inject into the 4 apps."*

**Deliverables**:
0. **Ship DB migration `20260503000000_add_field_level_relations.sql`** (inlined in §2.6) + its rollback twin. MUST land in the dev Supabase project before any code work begins; Phase 1b column-level handles require these columns (`source_field_id`, `target_field_id`, `on_delete`, `on_update`) to exist.

1. New `packages/schema-builder/` package scaffolded with tsc build pipeline + Vitest + tsup (matching `packages/schema-registry` layout)
2. Port `crm7/src/pages/settings/schema-builder/*` into the package (canonical source — crm7 becomes the 4th consumer, collapsing its own route file to a thin wrapper)
3. Extract all load / save / persist / subscribe logic into a single `useSchemaController` hook that owns:
   - TanStack Query reads (`tenant_entities`, `tenant_entity_relations`, `tenant_field_definitions`)
   - TanStack Query mutations with native optimistic (Vite — see §3.7) or Server Action bridge via `useActionState` + `useOptimistic` (Next.js / conduit — see §3.7)
   - Supabase Realtime subscriptions per §3.8
   - Zod-validated create / update / delete through `SchemaRelationSchema` + `EntityNodeDataSchema` (§3.9), translated to DB column names via the alias table in §3.9
4. **All four consumer apps collapse to thin wrappers (~30 lines each)** — this includes crm7 (whose current schema-builder page is the canonical source being extracted), business-suite-unified, conduit, braden, and R80.3. Net removal of ~1500 lines of duplicated code. Wrappers pass in `tenantId`, `appScope`, and optional entity filters.
5. **Install shadcn `Command` (`cmdk`) in BSU / conduit / R80.3**: run `pnpm dlx shadcn@latest add command` once per app **from an isolated directory outside the bsuite tree per AGENTS.md pnpm-workspace lockfile rules**. crm7 and braden already have the component.
6. **Wire Cmd+K palette with the Phase-1a command subset ONLY**: `Find Entity name` (fuzzy search + pan/zoom to picked node) and `Go to page-path` (fuzzy navigation). That is the entire Phase 1a Cmd+K surface — nothing else. *Full Cmd+K catalogue (`Add Column`, `Connect Tables`, `Tidy Up Layout`, `Toggle Edit Mode`, `Add to Page`, `Undo`, `Redo`, `Publish`) ships incrementally across Phases 1b, 3, and 5 — see §3.10.*
7. Publish `@bsuite/schema-builder@0.1.0` to npm
8. 4 consumer PRs + 1 parent PR (package + ADR-0004 documenting the consolidation)

**Acceptance criteria for Phase 1a**:

- All 4 apps show identical Schema Builder UI (pixel-matched to current CRM7 behaviour before any upgrades)
- Each consumer file that previously held the canvas is ≤ 40 lines
- `useSchemaController` has Vitest coverage for load / save / optimistic-rollback / Realtime-dedup paths
- No `useEffect`-for-persist patterns remain anywhere in the 4 apps' Schema Builder code
- Cmd+K opens in all 5 Vite-shelled apps + conduit; `Find Entity` pans & zooms to the picked node

**Red-team pass (mandatory before Phase 1a is marked ✅):** spawn `multi-agent-red-team-implementation` with five lenses: (1) `security-audit` on the new Supabase migration + RPC scaffolding (RLS preserved? no `service_role` bypass?); (2) `dry-one-shot-architecture` — do all 4 consumers actually share one implementation, or did a subtle divergence survive the port? (3) `test-coverage-analysis` + `qa-and-verification` — does `useSchemaController` have tests for every mutation rollback path? (4) `api-design-validation` — does the Zod schema in §3.9 match the DB column-alias table with zero drift? (5) `receiving-code-review` — every PR review comment on the 4 consumer PRs is addressed or explicitly deferred with a linked follow-up issue.

#### Phase 1b — Airtable / dbdiagram upgrades (on top of 1a)

> **Completion note (2026-05-05):** Closed for the schema-builder scope listed below. Follow-up work that belongs to page/card authoring remains in the later universal-plan phases, not in Schema Builder Phase 1b.

**Skills to load before starting:** `master-orchestration`, `ship-all-apps`, `ui-ux-pro-max` (the UX bar for column-level handles + crow's-foot is explicit user direction: *"highest UX is key"*), `bsuite-brand-system` (OKLCH colours on edge styling), `tanstack-query` (dagre-run mutation invalidation), `supabase` (information_schema reflection RPC), `shadcn-ui` (remaining Cmd+K commands), `framer-motion` (node auto-layout transition), `verification-before-completion`.

**Deliverables**:

1. Column-level handles per §3.6 item 1 (IDs use `${tableId}.${fieldId}.(left|right)` format)
2. Crow's-foot cardinality markers per §3.6 item 2
3. Dagre auto-layout per §3.6 item 3 with the pinned config (`LR`, `nodesep: 60`, `ranksep: 80`)
4. Schema reflection via `useEntityColumns` + `information_schema` Supabase RPC (§3.6 item 4)
5. `SmartEdge.tsx` custom edge routing per §3.6 item 5
6. Minimap + zoom-to-fit + fuzzy search toolbar per §3.6 item 6
7. Inline edit on double-click per §3.6 item 7
8. PNG export via React Flow `toImage` per §3.6 item 8
9. Full Cmd+K command catalogue from §3.10 exposed
10. Bump `@bsuite/schema-builder` → `0.2.0` + 4 consumer pin bumps

**Acceptance criteria for Phase 1b**:

- User drags `orders.customer_id` → `customers.id` and a 1:N relation is created automatically via `SchemaRelationSchema.parse()` → `useSchemaController.createRelation()`
- "Tidy up" button arranges all entities in a sensible left-to-right tree layout within 100 ms for ≤100 entities
- Crow's-foot markers render correctly for all 4 relation types
- Two open tabs on the same tenant see each other's schema mutations within 500 ms (Realtime sync)
- PNG export captures the full canvas (not just viewport)

**Red-team pass (mandatory before Phase 1b is marked ✅):** spawn `multi-agent-red-team-implementation` with four lenses: (1) `ui-ux-pro-max` + `vercel-web-design-guidelines` — does the final canvas meet the Airtable/dbdiagram UX bar the user explicitly demanded? (2) `performance-regression` adapted for BSuite (rename to "layout-performance-regression") — does dagre run in ≤100 ms for 100 entities as the acceptance criterion demands? (3) `wiring-validation` — is every documented feature actually wired + telemetry-enabled? (4) `api-design-validation` on the `apply_schema_relation` RPC shape (if Q9 is answered "ship now" — if Q9 is "defer", this lens moves to the DDL follow-on phase).

### Phase 2 — CRM7 `custom_pages` rendering + layout resolver (1 session)

**Skills to load before starting:** `master-orchestration`, `ship-all-apps`, `dry-one-shot-architecture` (CRM7 is the one-shot owner of `custom_pages`), `supabase` + `supabase-postgres-best-practices` (RLS on `custom_pages` / `custom_page_blocks` / `custom_page_revisions`), `tanstack-query` (resolver cache), `api-design-validation` (LayoutAdapter interface surface), `verification-before-completion`.

**Deliverables**:

1. Verify CRM7 `custom_pages`, `custom_page_blocks`, and `custom_page_revisions` schema coverage; add only additive columns required by ADR-0001 follow-ons if missing.
2. New `LayoutAdapter` abstraction in `@bsuite/page-builder`:
   - `LocalStorageAdapter` (existing behavior, default for non-dev users)
   - `CustomPagesAdapter` (reads published CRM7-authored pages for consumer apps)
   - `ResolvedLayoutAdapter` (composes local per-user preference over published tenant defaults where applicable)
3. Per-app `CustomPageRenderer` thin wrappers for BSU, conduit, R80.3, braden, throughput, and CRM7 routes.
4. Atomic removal path for deprecated BSU `tenant_page_layouts` remains governed by ADR-0001, not this plan.

**Acceptance criteria**:

- Tenant-authored pages render from CRM7 `custom_pages` in consumer apps via per-app wrappers.
- Per-user dashboard layout preferences continue to work without writing to deprecated tables.
- No new `tenant_page_layouts` table or BSU authoring surface is introduced.

**Red-team pass (mandatory before Phase 2 is marked ✅):** spawn `multi-agent-red-team-implementation` with three lenses: (1) `dry-one-shot-architecture` — did any consumer app grow a write path to `custom_pages`? (only CRM7 may write per ADR-0001); (2) `security-audit` + `schema-consistency` — RLS on `custom_pages` + `custom_page_blocks` intact, no tenant leak; (3) `frontend-backend-mapping` — every CRM7 authoring API has a TypeScript consumer in every other app.

### Phase 3 — Edit mode + style inspector (2 sessions)

> **Status note (2026-05-05):** This universal-plan Phase 3 is the page/card edit-mode and style-inspector phase. It is distinct from `docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-plan-v1.00W.md`, whose Schema Builder follow-ups (field reorder, physical column rename, seeded E2E tenant) are complete per `docs/archive/parent/2026-05-05-schema-builder-phase-3-verified/20260504-schema-builder-phase-3-signoff-v1.00W.md`.

**Skills to load before starting:** `master-orchestration`, `ship-all-apps`, `ui-ux-pro-max` + `vercel-web-design-guidelines` (inspector + edit-mode UX), `bsuite-brand-system` (OKLCH + token-aware picker), `zustand` (temporal undo/redo), `shadcn-ui` (Sheet + Tabs + Popover), `framer-motion` (inspector open/close + selection ring), `dnd-kit` (grid-item drag-in-edit-mode), `verification-before-completion`.

**Deliverables**:

1. `EditModeProvider` + `usePermission` gate (requires `manage_system` on both client and server — see §8 Q7)
2. `WidgetInspector` shadcn `Sheet` with 4 tabs (Style / Layout / Content / Data)
3. Token-aware color picker — default swatches from theme CSS variables; "Custom" opens shadcn `Popover` with native `<input type="color">`. Persists CSS variable **name** (`var(--accent-primary)`) per §3.5 R1 refinement, not resolved hex.
4. Undo/redo via zustand + `temporal` middleware (per-page-session scope first; durable DB-backed history remains required Phase 6 parity scope)
5. Keyboard shortcuts (E toggle edit, Delete remove selected, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo, Escape deselect)
6. Wire into `PageGridLayout` — clicking a grid item in edit mode opens inspector
7. Style overrides persist into the layout JSON as a `style` property per widget, using `tailwind-merge`'s `cn()` helper at render time so authored overrides safely layer on top of component base classes without collisions
8. Cmd+K palette actions `Toggle Edit Mode`, `Undo`, `Redo`, `Add to Page …` wired per §3.10

**Acceptance criteria**:

- Developer presses `E` on any page with `manage_system` — edit mode activates, chrome appears
- Clicking any card opens inspector; changing border radius updates live
- Cmd+Z reverts; Cmd+Shift+Z re-applies
- Published tenant-authored pages persist to CRM7 `custom_pages` (Phase 2 dependency)

**Red-team pass (mandatory before Phase 3 is marked ✅):** spawn `multi-agent-red-team-implementation` with four lenses: (1) `bsuite-brand-system` — no raw hex in persisted JSON, every colour is `var(--…)` or `oklch(…)`; (2) `ui-ux-pro-max` — inspector passes WCAG 2.1 AA + has keyboard + screen-reader parity; (3) `security-audit` — `manage_system` check is enforced both client-side (UX) and server-side (RLS); (4) `performance-regression` adapted — undo/redo history never exceeds the declared 50-state cap and has no memory leak across multi-hour sessions.

### Phase 4 — Form Builder UX overhaul (1 session)

**Skills to load before starting:** `master-orchestration`, `ship-all-apps`, `dnd-kit` (palette→canvas drop), `forms-and-validation` (live preview wiring), `ui-ux-pro-max`, `zustand` (shared temporal store with Phase 3), `shadcn-ui`, `verification-before-completion`.

**Deliverables**:

1. Drag-from-palette into canvas works (currently only within-canvas DnD)
2. Drop indicator shows where the field will land
3. Inline double-click rename on sections and fields
4. Live preview toggle (renders the actual `FormLayoutRenderer` in a tab)
5. Undo/redo (shared zustand history with Phase 3)
6. Style tab added to property panel (border, radius, padding per section)

**Acceptance criteria**:

- User drags a field from palette to an empty section and drops it successfully
- Double-click section title → inline edit → Enter commits
- "Preview" toggle shows the rendered form; "Edit" returns to builder

**Red-team pass (mandatory before Phase 4 is marked ✅):** spawn `multi-agent-red-team-implementation` with three lenses: (1) `ui-ux-pro-max` — palette→canvas drop has drop-indicator + keyboard parity; (2) `forms-and-validation` — live preview uses the exact same Zod validator path the production form will; (3) `qa-and-verification` — undo/redo is coherent across section + field + style edits (shared store with Phase 3).

### Phase 5 — Custom page authoring (1 session)

**Skills to load before starting:** `master-orchestration`, `ship-all-apps`, `dry-one-shot-architecture`, `supabase` (revision history), `ui-ux-pro-max` (side-by-side diff), `shadcn-ui`, `verification-before-completion`.

**Deliverables**:

1. CRM7 custom page settings get the unified `PageGridLayout` + inspector authoring experience.
2. Editor writes to `custom_pages.layout` / `custom_page_blocks` and revision history through the canonical CRM7 service.
3. Each consumer app's `CustomPageRenderer` remains a thin per-app wrapper — no resurrected BSU authoring surface.
4. "Publish to tenant" flow with revision history via `custom_page_revisions` (table already exists)
5. Side-by-side diff view between current and previous revision

**Acceptance criteria**:

- Admin creates a new page in CRM7, adds widgets, saves, publishes
- Page appears in all consumer apps at the configured route
- Revision history shows diffs; rollback button reverts

**Red-team pass (mandatory before Phase 5 is marked ✅):** spawn `multi-agent-red-team-implementation` with three lenses: (1) `dry-one-shot-architecture` + `frontend-backend-mapping` — no consumer app grew a write path; (2) `security-audit` — publish/rollback flows have server-side permission checks; (3) `documentation-compliance` — every new public API has JSDoc + an entry in the per-app CONTRIBUTING.md.

### Phase 6 — `throughput` React 19 migration + polish

**Skills to load before starting:** `master-orchestration`, `ship-all-apps`, `dependency-management`, `cross-platform-sync`, `verification-before-completion`, `git-workflow`.

**Deliverables**:

1. Verify `throughput` stays on React 19.2.x with matching `react-dom` and `@types/react`.
2. Full typecheck + Vitest run + Playwright (if configured)
3. Fix any React 19 strict-mode / concurrent issues discovered by verification
4. Update the Zero-Defer checklist in AGENTS.md confirming 100% React 19 parity
5. Re-evaluate whether shared-package `peerDependencies` should remain liberal or tighten after every consumer app is verified on React 19.
6. DBML + SQL DDL exporters for Schema Builder (required completion of Phase 1b §3.6 item 8)
7. Persist undo/redo history to DB so it survives refresh (required completion of Phase 3 §4)
8. CI lint enforcing the base-stack-only rule (blocks PRs that add runtime deps outside the §2.5 + §6 approved dependency set — enforces v1.01W's hard scope constraint mechanically)

**Acceptance criteria for Phase 6**:

- `throughput` remains green on React 19.2.x: typecheck + Vitest + any configured Playwright run
- `pnpm list --depth=-1 react` in every app and every shared package returns React 19.2.x — no React 18 anywhere
- Shared-package `peerDependencies` decision (tighten vs keep liberal) is recorded in the canonical tech-stack alignment doc
- The base-stack-only CI lint blocks a deliberately-poisoned test PR that tries to add a non-allow-listed runtime dep

**Red-team pass (mandatory before Phase 6 is marked ✅):** spawn `multi-agent-red-team-implementation` with three lenses: (1) `dependency-management` — can a malicious transitive bump slip past syncpack? (2) `cross-platform-sync` — AGENTS.md / CLAUDE.md / .windsurfrules all carry the final policy with zero drift; (3) `security-audit` — no high-severity pnpm-audit findings remain suppressed.

---

## 5. Dependency Version Policy (normative — goes into AGENTS.md / CLAUDE.md / .windsurfrules)

```
### Dependency Version Policy

1. All apps and shared packages MUST use the latest mutually-compatible versions
   of React, React-DOM, @types/react, and related libraries. When adding or
   bumping a dependency, verify against the reference matrix in
   `docs/dependencies/20260501-compatibility-matrix-v1.00W.md`.

2. When ANY of the production apps (BSU, crm7, conduit, braden, R80.3,
   throughput, or mobile)
   bumps React, all shared packages (@bsuite/schema-registry,
   @bsuite/page-builder, @bsuite/nav-core, @bsuite/theme, @bsuite/ui,
   @bsuite/schema-builder) MUST be
   bumped in the same PR or the next PR. CI will block if a shared package
   is behind the lowest consumer app version by more than one minor.

3. Peer-dependency ranges for shared packages stay liberal unless a package
   has an explicit, verified React-major incompatibility. The corresponding
   devDependencies in each package MUST match the active consumer React major
   so local tests reflect the suite's current runtime. Enforcement is via
   `syncpack` (see item 8) for `react`, `react-dom`, `@types/react`, and
   `@types/react-dom` devDependency drift.

4. Use caret ranges (`^X.Y.Z`) for all dependencies that follow semver.
   Pinning exact versions (no caret) is reserved for native / build-tool
   dependencies (Expo, Next.js major, Vite major) where patch upgrades
   have historically broken builds.

5. `pnpm update --latest --interactive` is run monthly, committed as
   `chore(deps): monthly dependency sweep YYYY-MM`. Breaking bumps get a
   dedicated PR per package.

6. Security advisories (`pnpm audit`) are triaged weekly via
   `scripts/pnpm-audit-all.sh`. High-severity issues are fixed within
   48 hours; moderate within 7 days.

   > **DELIVERED 2026-08-22, under a different name and on a tighter cadence.**
   > `scripts/pnpm-audit-all.sh` was never written. `.github/workflows/security-audit.yml`
   > runs `pnpm audit --audit-level=high --prod` across every submodule app on a
   > **daily** cron (`0 2 * * *`), not weekly. The obligation is met; the filename in
   > this item is not the thing that meets it.

7. Base-stack-only rule (per v1.02W §2.5): no new runtime dependency may
   be added to any app or shared package without updating §2.5 + §6 of
   the master plan in the same PR. A CI lint script
   (~~`scripts/check-base-stack-only.sh`, delivered in Phase 6~~ — see the note
   below: it shipped 2026-08-22 as `scripts/check-base-stack-only.mjs`) diffs each
   PR's package.json changes against the allow-list and blocks on violation.

   > **DELIVERED 2026-08-22 — it was the one item on this list that had not shipped
   > under any name, and it stayed invisible for exactly that reason: six of the seven
   > obligations here WERE real under different filenames, so a reader spot-checking the
   > list finds most items genuine and stops checking.**
   >
   > For two and a half months the estate had a dependency policy that read as enforced
   > and was not — the weakest of the three possible states, weaker than having no rule,
   > because nobody looks for a control they believe they already have.
   >
   > Shipped as `scripts/check-base-stack-only.mjs` (not `.sh` — it parses 27 manifests,
   > and a shell wrapper existing only to match a filename in this paragraph would be
   > cargo cult), wired by `.github/workflows/base-stack-only.yml`, with the allow-list
   > at `.github/base-stack-allowlist.txt`.
   >
   > **Seeded from reality, not from §2.5.** The table below describes the base stack as
   > designed; the estate installs 159 distinct runtime dependencies as built. Gating
   > against the designed list would fail every PR on day one and be switched off within
   > a week. So the gate answers the question the rule actually asks — *is this
   > dependency new?* — and presence on the allow-list means "already installed", never
   > "reviewed and approved".
   >
   > It uses equality rather than a ceiling, like the estate's other ratchets: an entry
   > still listed after the dependency was removed would let it return unnoticed.
   > `--bank` rewrites the file, so satisfying the removal side costs one command.
   The script can reuse the same `pnpm dlx syncpack@latest list-mismatches`
   invocation used for peer-dep enforcement (item 8), extended with an
   allow-list check against the §2.5 + §6 tables so one tool catches both
   classes of violation.

8. Peer-dependency enforcement mechanism (item 3 implementation, delivered
   in Phase 0): use `syncpack` (https://github.com/JamieMason/syncpack —
   zero-runtime-dep dev-tool, invoked via `pnpm dlx` so no new package.json
   entry is required) to detect version drift across every workspace
   package.json. Shipping artefacts in Phase 0:
     - `.syncpackrc.json` at repo root declaring a single pinned version
       group for `react`, `react-dom`, `@types/react`, `@types/react-dom`
       (all pinned to the latest active major — currently `^19.2.x`)
     - ~~`scripts/check-peer-deps.sh` wrapping
       `pnpm dlx syncpack@latest list-mismatches` with a non-zero exit on
       any detected mismatch~~ — never written; superseded, see below

       > **DELIVERED by a different mechanism.** syncpack was never adopted — there is
       > no `.syncpackrc.json`. Peer-dependency enforcement ships as
       > `scripts/check-unmet-peer-deps.mjs` (an app must satisfy each `@bsuite/*`
       > package's peers at a version that package accepts) and
       > `scripts/check-published-peer-ranges.mjs` (which reads what the REGISTRY
       > serves rather than what the source says). Same obligation, stricter source
       > of truth.
     - Husky `.husky/pre-push` hook calling the script for fast local
       fail-before-push
     - GitHub Actions required status check `peer-deps-aligned` calling
       the same script on every PR so the policy is enforced even when
       pre-push is bypassed with `--no-verify`
   Any PR that misaligns React versions across the workspace is blocked
   at both the pre-push and CI layer. Non-React peer-dep drift (e.g. zod,
   @tanstack/react-query) is surfaced as a warning by the same script but
   does not block — only the React version group is a hard fail, because
   it is the one that causes the peer-dep cascade the user called out.
```

---

## 6. Compatibility matrix (to become `docs/dependencies/20260501-compatibility-matrix-v1.00W.md`)

As of 2026-05-01 the confirmed mutually-compatible versions are:

| Library | Version | Notes |
|---|---|---|
| react | `^19.2.4` | React 19.2 GA. Strict-mode double-mount behavior unchanged from 19.0 |
| react-dom | `^19.2.4` | Must exactly match react major.minor |
| @types/react | `^19.2.14` | Ships new JSX namespace for React 19 |
| @types/react-dom | `^19.2.14` | Matches @types/react |
| next | `^16.2.3` | Conduit only. App Router. React 19 compatible |
| @vitejs/plugin-react | `^5.2.0` | React 19 supported |
| typescript | `^5.9.2` | React 19 requires TS ≥5.1; we pin 5.9.x for type-import stability |
| @xyflow/react | `^12.10.1` | React 19 compatible |
| react-grid-layout | `^2.2.2` | React 19 compatible (latest in 2.x) |
| @dnd-kit/core | `^6.3.1` | React 19 compatible |
| @dnd-kit/sortable | `^10.0.0` | React 19 compatible |
| @dnd-kit/utilities | `^3.2.2` | React 19 compatible |
| @tanstack/react-query | `^5.x` | React 19 compatible |
| @supabase/supabase-js | `^2.98.0` | Framework-agnostic |
| zustand | `^5.0.11` | React 19 compatible |
| zod | `^4.x` | v4 is mono-package; both schema-registry peers support v3 or v4 |
| framer-motion | `^12.x` | React 19 compatible |
| react-hook-form | `^7.x` | React 19 compatible |
| `cmdk` | ships with `pnpm dlx shadcn@latest add command` — **not a separate `package.json` entry** | shadcn Command primitive. Already present in crm7 + braden; BSU / conduit / R80.3 install it via the shadcn CLI in Phase 1a (from an isolated dir per AGENTS.md pnpm-workspace lockfile rules). Never add `"cmdk": "…"` manually to any `package.json` — it's a shadcn-transitive dep. |
| `tailwind-merge` | `^2.x \|\| ^3.x` | Already installed everywhere via shadcn's `cn()` helper. Critical for the "edit borders" requirement (§3.5) |
| `clsx` | `^2.x` | Companion to tailwind-merge in shadcn's `cn()` helper |

### 6.1 WYSIWYG primitive contract — mandatory implementation split

All WYSIWYG work MUST use the correct canvas/interaction primitive for the surface being edited. The shared source of truth is `@bsuite/page-builder`'s `WYSIWYG_SURFACE_CONTRACTS` export, with Vitest coverage in `packages/page-builder/src/__tests__/wysiwygContract.test.ts`.

| Surface | Interaction primitive | Persistence primitive | Owner |
|---|---|---|---|
| Schema Builder | React Flow (`@xyflow/react`) handles, edges, custom nodes | TanStack Query v5 (`queryOptions`, optimistic mutation rollback, invalidation) | `@bsuite/schema-builder` |
| Page Builder / card canvas | Resizable cards through `@bsuite/page-builder` / React Grid Layout | Page-grid preference adapter now, later `custom_pages` adapter | `@bsuite/page-builder` |
| Form Layout Builder | `dnd-kit` sortable/palette-to-canvas interactions with `PointerSensor`, `KeyboardSensor`, `DragOverlay` | TanStack Query v5 for persisted form layout writes | CRM7 UI customization |
| Custom Page Renderer | Read-only renderer | TanStack Query read from CRM7-owned `custom_pages` | `@bsuite/page-builder` wrappers |

This contract prevents primitive drift: schema relationships must not be reimplemented with `dnd-kit`, card layout editing must not bypass resizable grid cards, and persisted WYSIWYG server state must not use ad-hoc local mirrors instead of TanStack Query + owner tables.

**New runtime dependency introduced by this plan** (single addition, justified in §2.5):

| Library | Version | Phase | Notes |
|---|---|---|---|
| `@dagrejs/dagre` | `^3.0.0` | Phase 1b | Schema Builder auto-layout. ~25 KB gzipped, zero runtime deps, synchronous API. De-facto standard for React Flow tidy-up. Stable 3.x active maintenance line as of 2026-05-01. |

**Top-up installs (not new libraries — existing shadcn components in some apps, missing in others)**:

| Component | Where needed | Install |
|---|---|---|
| shadcn `Command` (`cmdk`) | BSU, conduit, R80.3 | `pnpm dlx shadcn@latest add command` (per app, from isolated dir per AGENTS.md lockfile rules). Phase 1a prereq for the Cmd+K palette. |

All other features in this plan use libraries already installed in the BSuite monorepo. **No other `package.json` additions are planned across any of the 6 phases** — this is a hard scope constraint per v1.01W, tightened to a CI-enforced rule in Phase 6 per §5.7.

---

## 7. Rollout & safety

- Every phase ships as a parent PR + per-app PRs. Nothing merges until typecheck + tests pass in all 6 apps.
- Phase 1a–3 are behind a feature flag per tenant (`visual_editor_enabled`, default false except Braden pty ltd).
- Rollback plan: every new table has a corresponding `20260502000001_revert_*.sql` migration that restores the prior state non-destructively.
- Phase 2+ require Supabase migration approval from the user before running in production.
- **Protected-branch workflow**: `bsuite/development`, `crm7/development`, and `business-suite-unified/development` (and any other submodule's `development` branch) are protected. Direct pushes are rejected even for maintainers. All work — including Phase 0's React 19 alignment + policy rollout — lands via feature-branch PRs targeting `development`. This was validated during the Phase 0 rollout on 2026-05-01 when direct-push attempts were rejected and the work was preserved via PRs #335 / #332 / #228.

---

## 8. Open questions for the user

Mark these ⬜ below and reply inline when reviewing:

- [ ] **Q1**: Approve the overall 6-phase plan (with Phase 1 now split into 1a Hot-Sync + 1b Airtable upgrades)?
- [x] **Q2**: ~~Approve Phase 0 to execute immediately…~~ **Resolved 2026-05-01**: Phase 0 shipped via PRs #335 (parent) / #332 (crm7) / #228 (BSU). Dependency Version Policy in AGENTS.md / CLAUDE.md / .windsurfrules; React 19 devDep alignment across all shared packages + mobile + BSU local UI; CRM7 FormLayoutBuilder card-clipping fix. All typechecks + BSU Vitest (243 passed) green.
- [x] **Q3**: ~~For the style inspector color picker…~~ **Locked (v1.02W §3.5 R1)**: token-aware defaults (CSS variable names, not hex) with shadcn `Popover` + native `<input type="color">` for "Custom" fallback.
- [ ] **Q4**: CASS persistence — do you want "per-user override on tenant default" (most flexible, complex) or "tenant-wide only, no per-user" (simpler)? (Recommendation: CASS with a UI toggle at save time.)
- [x] **Q5**: ~~Undo/redo scope…~~ **Locked (v1.03W §3.4 + §4 Phase 3 deliverable 4)**: per-page-session, zustand + `temporal` middleware, no DB persistence. DB persistence is a Phase 6 optional polish item.
- [x] **Q6**: ~~Schema Builder column-level handles…~~ **Locked (v1.02W §3.6 item 1 + §3.9)**: column-level when the user drags from a field handle; entity-level as fallback when dropping on empty card chrome.
- [x] **Q7**: ~~Editor keyboard shortcut `E` + Cmd+K palette mutations…~~ **Locked (v1.03W §4 Phase 3 deliverable 1)**: both client-side permission gates (UX) AND server-side RLS on canonical CRM7 `custom_pages` writes (security). Defense in depth per the brand-system security-audit skill.
- [x] **Q8** (refined v1.03W): ~~Shared-package peerDependency tightening…~~ **Resolved in Phase 0**: keep peer ranges liberal and align React 19 devDependencies across shared packages so local tests match the active consumer runtime without unnecessarily breaking npm consumers.
- [ ] **Q9** (new v1.02W): The Supabase RPC `apply_schema_relation(rel_id uuid)` that emits actual `ALTER TABLE … ADD CONSTRAINT` is powerful but risky. Ship it in Phase 1b as originally planned, or defer to a later explicit "Postgres DDL" phase behind its own feature flag + destructive-action confirmation UI? (Recommendation: defer — the metadata-only relation is enough for 99 % of CRM authoring use-cases.)
- [ ] **Q10** (new v1.02W): Conduit (Next.js) gets real Server Actions (`'use server'`) while the 5 Vite apps get the `useOptimistic` + TanStack Query equivalent (§3.7). Both flow through the same `useSchemaController` hook, which picks the right primitive at build time. Confirm this split is acceptable, or do you want the Vite apps to also route through a /api route that mimics Server Actions (slower but uniform)?

---

## 9. Sign-off

**Reviewed by:** *pending user*
**Executed by:** Codebuff (Buffy) — Phase 0 ✅ shipped (PRs #335/#332/#228); Phase 1a kickoff pending pre-phase gate (§4.−1) completion.
**Memory key:** `bsuite_universal_wysiwyg_plan_20260501`

---

## Appendix A — User improvement-notes integration index (v1.02W)

The user appended a set of best-practice improvement notes to v1.01W; v1.02W integrated them into the body. This index maps each original bullet to its new home so reviewers can confirm nothing was lost.

| Original user note | Integrated location in v1.02W |
|---|---|
| "Upgrade to Field-Level React Flow — custom handles mapped to field_id, port pattern per row" | §3.6 item 1 (handle ID format `${tableId}.${fieldId}.(left\|right)`) + §3.9 Zod schemas |
| "Implement Server Actions for Schema Mutations — stop using useEffect for persistence, use useOptimistic" | §3.7 (unified `useSchemaController` with useOptimistic + TanStack Query in Vite apps, real Server Actions in conduit) |
| "Move from JSONB to a Relational Registry — hybrid storage" | §2.6 (tenant_entities / tenant_entity_relations / tenant_field_definitions are flat; jsonb reserved for view-state) + §3.8 (Realtime cross-tab sync) |
| "Dnd-kit/Sortable for Form Layout Builder" | Already present in §2.5 base-stack table + §2.3 confirming FormLayoutBuilder uses it |
| "Arcade.js or Joyride for Cmd+K" → replaced with shadcn cmdk | §2.5 dropped-library table + §3.10 (shadcn `cmdk` Command with full command catalogue) |
| "Tailwind Merge for edit-borders requirement" | §2.5 base-stack table (already installed everywhere via shadcn) + §4 Phase 3 step 7 |
| "Strict React version enforcement" | §5 policy item 3 + Phase 0 deliverable + Phase 6 peer-policy re-evaluation |
| "Phase 1.5 Hot-Sync Fix — useSchemaController hook" | §4 Phase 1a (Hot-Sync carve-out that MUST land before Phase 1b) |
| CardinalitySchema / SchemaRelationSchema / EntityFieldSchema / EntityNodeDataSchema | §3.9 (cleaned, typed, with integration points documented) |
| Concrete migration SQL (`20260503000000_add_field_level_relations.sql` + rollback twin) | §2.6 (inlined verbatim as the Phase 1a blocker, with RLS / CHECK / index / Realtime publication clauses ready to copy into `*/supabase/migrations/`) |
| Syncpack + Husky peer-dep enforcement mechanism (concrete tooling, not just the rule) | §5 item 8 (zero-runtime-dep approach via `pnpm dlx syncpack`, hooked into `.husky/pre-push` + GitHub Actions required check `peer-deps-aligned`) |
| "Should we move on to drafting the React 19 Custom Node component…" user rhetorical prompt | Preserved verbatim in the "Next session entry point" footnote at the end of this document, pre-answered with Phase 1a step 3 + `packages/schema-builder/src/components/EntityNode.tsx` file path and shape contract |
| v1.04W knowledge-currency refresh (Dagre 3.x, OKLCH, queryOptions factory, protected-branch workflow) | §3.5 (OKLCH mandate + updated R1 callout) + §3.7 (queryOptions factory paragraph + code block above Vite pattern) + §6 (Dagre pin) + §7 (protected-branch bullet) + §8 Q2 locked |
| v1.05W operational-rigour refresh (pre-phase gate + skills-per-phase + red-team-per-phase) | §4.−1 (new Pre-Phase Readiness Gate) + every §4.x phase now has a `**Skills to load before starting**` line and a `**Red-team pass (mandatory …)**` block + Appendix A row added for v1.04W retroactively |

---

## Next session entry point

> *"Should we move on to drafting the React 19 Custom Node component that renders these field-level handles?"*
>
> — User, 2026-05-01 (appended to v1.01W improvement notes; preserved verbatim per v1.02W R4 refinement).

**Answer — Yes**. This is the first concrete code deliverable of Phase 1a (§4):

1. **File**: `packages/schema-builder/src/components/EntityNode.tsx`
2. **Reference implementation to port**: `crm7/src/pages/settings/schema-builder/components/EntityNode.tsx` (canonical — the other 3 apps carry copies that converge on this shape).
3. **Shape contract**: `EntityNodeDataSchema` from §3.9 — `{ tableId, label, fields[], accentColor?, collapsed }`. Note the `tableId` ↔ `tenant_entities.id` aliasing — the Zod schema calls it `tableId` because that is the React Flow term, but the DB column is `tenant_entities.id`. The mapping is 1:1; do not introduce a second id concept.
4. **Handle wiring**: iterate `data.fields`; for each field emit two `<Handle>` components from `@xyflow/react`:
   - `<Handle type="target" id={`${data.tableId}.${field.id}.left`} position={Position.Left} />`
   - `<Handle type="source" id={`${data.tableId}.${field.id}.right`} position={Position.Right} />`
   The field row itself stays a shadcn-styled flex row (icon + name + type badge) so the handle anchors precisely on the row midline per React Flow's port pattern. The entity card keeps its top/bottom handles as the entity-level fallback (drop on empty card chrome) per §3.6 item 1.
5. **Accent color**: read `data.accentColor` as-is — the value is a CSS variable reference (`var(--accent-secondary)`) per §3.5 R1, never a hex literal, so the card reacts to the active theme (D2C vs Corporate) at render time.
6. **Realtime**: the canvas parent (`SchemaCanvas`) subscribes via `useSchemaController`; `EntityNode` stays a pure display component that re-renders when its `data` prop changes. No internal state, no `useEffect` for persist — all mutations flow through the controller hook per §3.7.
7. **Acceptance**: the component must render in Storybook (shipped with `packages/schema-builder`) with a fixture entity containing 10 fields (one primary key, one FK source, one nullable, mixed types) and show correct handle anchoring under both D2C Neon Electric and Corporate theme CSS variables.

**Prerequisites that must land before this component is written**:

- [ ] Phase 0 merged (React 19 unification in shared packages + Dependency Version Policy in AGENTS.md/CLAUDE.md/.windsurfrules + syncpack hook)
- [ ] PRs #334 (parent schema-registry 0.3.1 recovery) and #331 (crm7 cross-app entity picker) merged so `main` carries the clean base
- [ ] Migration `20260503000000_add_field_level_relations.sql` (§2.6) applied in the dev Supabase project
- [ ] `@bsuite/schema-builder` package scaffolded (empty shell with `package.json` + `tsconfig.json` + `vitest.config.ts` + `tsup.config.ts` matching `packages/schema-registry`'s layout)

Then `EntityNode.tsx` is the first real component to land, followed by `SchemaCanvas.tsx`, then `useSchemaController.ts`, then the 4 consumer thin-wrapper PRs (BSU / conduit / braden / R80.3) collapsing their ~1500 lines of duplicated React Flow code down to ~30 lines each.
