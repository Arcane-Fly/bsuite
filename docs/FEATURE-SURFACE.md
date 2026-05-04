# BSuite Feature Surface Map

**Generated:** 2026-05-04
**Purpose:** For every UX feature/pattern present in any BSuite app, identify (a) which apps have it, (b) the canonical implementation, (c) the adopt-plan or divergence justification for apps that lack it.

> **Sibling docs:** [crm7](../crm7/docs/FEATURE-SURFACE.md) · [conduit](../conduit/docs/FEATURE-SURFACE.md) · [business-suite-unified](../business-suite-unified/docs/FEATURE-SURFACE.md) · [R80.3](../R80.3/docs/FEATURE-SURFACE.md) · [braden](../braden/docs/FEATURE-SURFACE.md) · [throughput](../throughput/docs/FEATURE-SURFACE.md)
> **Parent:** [`docs/INDEX.md`](./INDEX.md) · [`docs/UNIFIED-ROADMAP.md`](./UNIFIED-ROADMAP.md) · [`docs/CONSISTENCY-REPORT.md`](./CONSISTENCY-REPORT.md) · [`docs/STACK-AUDIT.md`](./STACK-AUDIT.md)

---

## Detection method

Counts below come from filename + import grep on each repo's default branch:

- `PageGridLayout*` filename match
- `*schema-builder*` / `*SchemaBuilder*` / `*schemaBuilder*` filename match
- `*page-builder*` / `*PageBuilder*` filename match
- `*command-palette*` / `*CommandPalette*` / `*cmdk*` filename match
- `ThemeToggle*` filename match
- `@xyflow/react` import grep (React Flow usage)
- `@dnd-kit/` import grep
- `@tanstack/react-query` import grep
- `*EntitySelector*` filename match (oneship reads)

These are presence indicators, not full quality assessments. See per-feature row for canonical implementation pointer.

---

## Feature presence matrix

| Feature | Canonical | crm7 | conduit | BSU | R80.3 | braden | throughput | Action |
|---------|-----------|------|---------|-----|-------|--------|-----------|--------|
| **F-1 ThemeToggle (OKLCH)** | crm7 (`src/components/ThemeToggle*`) | ✅ 1 | ✅ 1 | ✅ 1 | ❌ | ✅ 1 | ✅ 1 | Add to R80.3 |
| **F-2 Schema builder canvas** | `@bsuite/schema-builder` 0.6.0 → crm7 | ✅ 2 files | 🟡 2 files | ✅ 2 files | n/a | n/a | n/a | conduit version may be a stub — verify |
| **F-3 Page builder (PageGridLayout / @bsuite/page-builder)** | `@bsuite/page-builder` 0.1.0 → consumers | ✅ 1 file (consumer) | n/a | ✅ 1 file (consumer) | n/a | n/a | n/a | Already shipped via shared package |
| **F-4 React Flow (`@xyflow/react`) usage** | crm7 schema-builder | ❌ via package | ✅ 1 | ✅ 2 | n/a | n/a | n/a | crm7 imports through `@bsuite/schema-builder`, not directly |
| **F-5 dnd-kit dashboard pattern** | crm7 (canonical) | ✅ 6 files | ✅ 3 files | 🟡 1 file | ❌ | ✅ 5 files | ❌ | Adopt in BSU dashboards; assess R80.3 + throughput |
| **F-6 TanStack Query for server state** | crm7 (135 import sites) | ✅ 135 | ✅ 22 | ✅ 38 | 🟡 2 | 🟡 1 | ❌ | Adopt in throughput (CON-1); audit R80.3 + braden coverage |
| **F-7 EntitySelector / oneship reads** | crm7 (6 selectors in `src/components/entity/selectors/`) | ✅ 1+ | ❌ | ❌ | ❌ | n/a | ❌ | CON-6 — port pattern |
| **F-8 Cmd+K command palette** | crm7 partial (5 files) | 🟡 5 | 🟡 1 | ❌ | ❌ | ❌ | ❌ | Plan §3.10 to land canonical primitive |
| **F-9 ThemeProvider with `var(--*)` CSS-variable contract** | crm7 + parent theme spec | ✅ | ✅ | ✅ | ✅ | ✅ corporate variant | ✅ | Aligned |
| **F-10 RBAC + PermissionGate** | crm7 + conduit RBAC design | ✅ | ✅ | ✅ | partial | n/a | n/a | crm7 / conduit / BSU canonical |
| **F-11 BS OAuth callback (dual-purpose)** | crm7 + conduit | ✅ | ✅ | n/a (server) | ✅ | ✅ | ✅ | Aligned per parent CLAUDE.md §Auth |
| **F-12 Form pattern: RHF + Zod + shadcn `Form`** | crm7 / BSU / conduit | ✅ | ✅ | ✅ | ❌ | ✅ Zod3 | ❌ | CON-1 (throughput), confirm R80.3 needs |
| **F-13 Data-table pattern: TanStack Table v8** | crm7 (`EnhancedDataTable`) | ✅ | partial | partial | ❌ | partial | ❌ | Adopt where data tables exist |
| **F-14 Charge-calc engine consumer (`@bsuite/charge-calc`)** | bsuite (pkg) → crm7 + R80.3 | ✅ | n/a | n/a | ✅ | n/a | n/a | Aligned |
| **F-15 Auth helpers (`@bsuite/auth`)** | bsuite (pkg) → 5 client apps | ✅ | ✅ | n/a (server) | ✅ | ✅ | ✅ | Aligned |
| **F-16 BOOT engine consumer** | spec at `docs/plans/20260227-boot-compliance-engine-specification-v1.00W.md` | ⬜ | n/a | n/a | ⬜ | n/a | n/a | Not started |

---

## Canonical pattern descriptions

### Dashboard dnd-kit (F-5) — canonical: crm7

CRM7 implements a dashboard whose widgets can be dragged, dropped, persisted per-user. The pattern uses `@dnd-kit/core` + `@dnd-kit/sortable`, persists order to a per-user `dashboard_layouts` table via Supabase, and renders through `@bsuite/page-builder`'s grid primitives.

**Adopt-plan template** for sibling apps: open `<app>/docs/plans/2026-05-04-adopt-dnd-dashboard.md` with:

1. Add `@dnd-kit/core` + `@dnd-kit/sortable`.
2. Replace static widget grid with `@bsuite/page-builder` `<Grid>` consumer.
3. Add Supabase migration for per-user layout persistence (`tenant_id, user_id, layout_json, updated_at`).
4. Wire `useUser()` → load saved layout → debounce save on drag end.
5. Test: Playwright drag-and-drop snapshot.

### EntitySelector / oneship (F-7) — canonical: crm7

CRM7 has six `EntitySelector` components in `src/components/entity/selectors/` (Award, Person, Host, Apprentice, Contact, Placement). Each reads from the canonical owning store via Supabase and exposes a typed `(value, onChange)` signature. **Pattern guarantees:** never duplicate a creation form across apps; always pick from the source.

**Adopt-plan template:** open `<app>/docs/plans/2026-05-04-adopt-entity-selectors.md` and pull the relevant subset (e.g. conduit needs `PersonSelector` + `HostSelector`).

### Cmd+K command palette (F-8) — canonical: per WYSIWYG plan §3.10

The plan locks the implementation to shadcn `cmdk` + a global keyboard shortcut. crm7 has 5 files; conduit has 1; the others are zero. Phase 1a of the WYSIWYG plan ships a minimal `Find Entity` + `Go to <page-path>` to seed the pattern; later phases add app-specific actions.

### Schema builder canvas (F-2) — canonical: `@bsuite/schema-builder`

The canonical implementation lives in the shared package, not in any one app. crm7 is the canonical consumer + E2E harness ([`docs/20260504-schema-builder-phase-3-plan-v1.00W.md`](./20260504-schema-builder-phase-3-plan-v1.00W.md) Workstream C).

### Page builder (F-3) — canonical: `@bsuite/page-builder` 0.1.0

Consolidated 2026-04-28 per [`docs/plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md`](./plans/20260428-codex-phase-2-shared-packages-plan-v1.00W.md). All four prior `PageGridLayout.tsx`/`usePageGridLayout.ts` duplicates removed; consumers now hold thin adapters only.

---

## Adopt-plan inventory (per app)

These are the new plans to be authored in this PR. Each plan should follow the BSuite naming convention (`YYYYMMDD-descriptive-name-vMAJOR.MINORW.md`) and include a **Sibling docs** cross-link block.

| Plan | Owner | File location |
|------|-------|---------------|
| Throughput stack modernization (React 19 + Vite 8 + Zod 4 + TanStack Query + shadcn) | throughput | `throughput/docs/plans/2026-05-04-stack-modernization.md` |
| Throughput dnd-kit + EntitySelector adoption | throughput | `throughput/docs/plans/2026-05-04-adopt-canonical-patterns.md` |
| R80.3 ThemeToggle adoption | R80.3 | `R80.3/docs/plans/2026-05-04-add-theme-toggle.md` |
| BSU dashboard dnd-kit adoption | BSU | `business-suite-unified/docs/plans/2026-05-04-adopt-dnd-dashboard.md` |
| Conduit shadcn init | conduit | `conduit/docs/plans/2026-05-04-shadcn-init.md` |
| EntitySelector port to BSU + conduit | crm7 → siblings | `business-suite-unified/docs/plans/2026-05-04-adopt-entity-selectors.md` and conduit equivalent |
| Braden Zod 4 migration | braden | `braden/docs/plans/2026-05-04-zod-4-migration.md` |
| Cmd+K palette adoption (BSU, R80.3, braden, throughput) | each | per-app plan files |

These plans are **scoped only** in this docs PR — implementation belongs to follow-up PRs.

---

## Maintenance

- A row moves from "presence" to "canonical" only when the implementation is referenced from a shared package or cited as the source by sibling apps.
- New features land first as a row here with status `🟡 partial — only in <app>`, then migrate to `✅ canonical via <pkg>` once promoted.
- The submodule mirror at `<app>/docs/FEATURE-SURFACE.md` is a stub pointing at this parent doc.
