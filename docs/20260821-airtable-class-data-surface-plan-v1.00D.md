---
kind: plan
authority: engineering
owner: datum-lane
evidence:
  - scripts/check-shared-package-reach.mjs
  - scripts/check-table-reach.mjs
---

# What to borrow from Atmosphere for crm7 reports + data manipulation

> ## ⚠ CORRECTED 2026-08-25 — THIS DOCUMENT READ THE WRONG REPOSITORY
>
> It evaluated **`Atmosphere/atmosphere`**, a JVM async/WebSocket framework. The
> repository that matters is **`GaryOcean428/atmosphere`** — the operator's own,
> TypeScript, described as *"A Free & Self-hostable Airtable Alternative"*, and pushed
> two days before this was written.
>
> That repository is a **rebranded NocoDB** (nine packages, nine matches, NocoDB's
> tagline verbatim) still carrying **`"license": "Sustainable Use License"`** in its root
> `package.json` — and the ruling that this licence bars BSuite use was recorded on
> **2026-08-08, thirteen days before this document.**
>
> The verdict below — *do not adopt* — happens to be right, and its reasoning does not
> reach the repository in question. See
> **`docs/20260825-atmosphere-is-nocodb-and-the-licence-already-ruled-v1.00A.md`**.
>
> Findings about **our own report engine** in this document were measured against our
> code and remain accurate.

**Date:** 2026-08-21 · **Status:** D (Draft) · **Author:** Datum
**Supersedes nothing. Companion to:** `claude/20260821-atmosphere-evaluation-v1.00D.md` (the adoption verdict)

---

## 0. Two corrections before the useful part

**Atmosphere has no Airtable-like setup.** I looked specifically, because the premise matters.
It ships two UIs: a static admin console at `/atmosphere/admin/` (the `modules/admin/` directory
is 58 Java files, zero `.html`/`.css` — REST controllers only), and a Vue 3 SPA at
`/atmosphere/console/`. The complete component list of that SPA is `ChatContainer`, `ChatInput`,
`ChatMessage`, `Checkpoints`, `ConnectionStatus`, `Governance{Commitments,Decisions,Owasp,Policies}`,
`Interactions`, `McpApps`, `Observability`, `Rooms`, `Sessions`, `Tape`, `TapeFlow`, `ToolCard`,
`Validation`, `Workspace`. No grid. No editable cell. No view model. No record store.

Searches across the repo for `resultset`, `column metadata`, `streaming rows`, `TabularResult`,
`DataGrid`, `spreadsheet` return **zero hits each**. Its only structured payload type is a sealed
interface of four records — `Text`, `Image`, `Audio`, `File`. The one thing that looks
Airtable-adjacent, `/atmosphere/admin/workflow.html`, is a DAG node/edge editor whose own README
concedes "the runtime that executes a manifest is not yet wired."

So: **do not mine Atmosphere for grid patterns. There are none.** What it does have is a very
disciplined answer to a different question — *how do you keep twelve implementations of one
concept from drifting* — and that turns out to be exactly crm7's disease.

**Second correction, and this one is good news: crm7 is much closer to Airtable than it feels.**
The reason it feels far away is not absence. It is that every piece exists two or three times and
none of them compose. Specifics in §2.

---

## 1. What crm7 already has (measured, not assumed)

| Capability | State |
|---|---|
| Entity/field catalogue | `report_catalog_entities` (84 entities) + `report_catalog_fields` (1,297 fields) with `data_type`, `semantic_role`, `is_filterable/sortable/groupable/aggregatable`, `is_pii`, `min_role` |
| Executable joins | `report_catalog_joins` — real `from/to` column pairs, `left\|inner`, cardinality |
| Measures | `report_catalog_measures` (`sum/count/avg/min/max/count_distinct`) + `report_catalog_derived_measures` |
| Server-side query compiler | `report_run_catalog_query(p_ast, p_tenant, p_page, p_page_size)` — compiles an AST to one dynamic statement with real `GROUP BY` / `ORDER BY` slots, `SECURITY INVOKER`, per-field re-authorisation, bounded (40 fields, 6 joins, 10 groupBy, 10 aggregates, page ≤ 1000) |
| Saved views | `saved_views.config` is already `{columns:[{key,label,width?,visible,sortOrder}], filters[], sort[], groupBy?, chartView?{mode,chartType,dimensionKey,measureKey}, pageSize, catalogAst?}` |
| Dashboards | `public.dashboards` with `layout jsonb` of `DashboardWidget{templateKey, viewMode:'chart'\|'table', chartConfig, w, h}`; widgets run through the **same** `useReportTemplate` → `useReportRun` → `ReportChartView`/`ReportTable` pipeline as `/reports/:key` |
| Cross-filtering | `dashboardCrossFilter.ts` + `dashboardCrossFilterStore.ts` — click a chart segment, sibling widgets filter |
| Spreadsheet editing | `@bsuite/data-grid` — range selection, TSV clipboard, fill handle, undo/redo (200), typed editors |
| Write + audit + undo | `bulk_data_update` → `data_change_sets` / `data_change_set_items(old_data,new_data,changed_fields)` → `bulk_data_undo(change_set_id)` |
| Charts | recharts 3.8.1 behind the shadcn `chart.tsx` wrapper |

That is a genuinely strong foundation. A catalogue with joins and measures, a server-side AST
compiler that does real SQL grouping, a view config type with chart settings in it, and dashboard
widgets that already reuse the report pipeline rather than duplicating it. Most teams asking for
"Airtable" have none of this.

---

## 2. Why it nonetheless feels bad — the fragmentation inventory

| Concept | How many implementations | Consequence |
|---|---|---|
| **Saved view** | **3** — `report_preferences` (per-user/template), `saved_views` (used by `/reports/:key`), `report_configs` with `report_type='builder_view'` (Browse tab) | No single object to point a dashboard at |
| **Table** | **4** — `EnhancedDataTable` (95 importers), `uplift/DataTable` (claims canonical), `@bsuite/data-grid` (2 call sites), `ReportTable` | No surface has the union of features; every page feels different |
| **Filter UI** | **3** onto the same AST — `SchemaDrivenFilterForm`/`CatalogFilterBar` (always `eq`), `reportRuntimeFilters.ts` (full operators), `browseDataService.buildBrowseFilterGroup` | Filtering behaves differently depending on where you are |
| **Editability rule** | **2 divergent** — `reportRowEditing.isFieldWritable()` (deny-by-default) vs `browseDataService.isFieldEditable()` (much looser), both hand-mirroring `report_catalog_caller_may_access_field()`, **which has already drifted three times per its own doc comment** | Same field is editable on one screen, not on another |
| **Report builder** | **2** — the catalogue engine, and `/financial/reports/new` hardcoded (crm7#1568) | — |

And three structural disconnects:

1. **A dashboard widget binds to `templateKey`, never to a `saved_views.id`.** So a view's filters,
   column selection and chart config cannot reach a dashboard — only the template's baked-in AST
   can. This is the single field standing between you and "views connect to dashboards."
2. **`saved_views.sort` is always written empty** by `reportPreferencesToSavedViewConfig`, and
   `groupBy` is truncated to one key (`groupByColumnKeys.slice(0, 1)`) and applied client-side —
   even though the server RPC supports 10 groupBy keys and 5 sort keys.
3. **The catalogue has no FK-target column.** `guessReferencedEntityKey` matches label text against
   a hardcoded `ENTITY_LABEL_HINTS` map. Its own header says why: *"there is no FK-target column in
   the schema."* This is why users see raw UUIDs (crm7#1701, #1572) — and it is the single biggest
   reason the product does not *feel* like Airtable, where every link is a chip with a human name.

---

## 3. The seven patterns worth stealing, each mapped to a change

### P1 — Capability by module presence → one View, N renderers
Atmosphere: the `@Agent` class never changes; putting `atmosphere-mcp` / `atmosphere-a2a` /
`atmosphere-agui` on the classpath *is* what mounts `/agent/{name}/mcp`, `/a2a`, `/agui`. Zero
author code. One definition, many surfaces.

**Apply:** make `saved_views` the single first-class object and give it renderers rather than copies.
One view id feeds: the grid, the chart, a dashboard tile, a CSV/XLSX export, a scheduled delivery,
and (later) an MCP tool the AI assistant can call. **Concretely: change `DashboardWidget.templateKey`
to `viewId`** (keep `templateKey` as a deprecated fallback for one release). The agent who mapped
this found the plumbing already terminates in the right place — the widget already calls
`useReportTemplate` → `useReportRun`. It is one field and a resolver.

This is the highest-leverage change in this document and it is roughly a day of work.

### P2 — Capabilities are declared data, pinned by a conformance suite → kill the two editability heuristics
Atmosphere: `capabilities()` returns a declared `Set<AiCapability>`; degradation is
*advertise-and-document, not negotiate*; and `AbstractAgentRuntimeContractTest.expectedCapabilities()`
is a shared conformance suite every adapter must pass, so no adapter can silently drift.

**Apply:** writability is a *server-declared fact*, not a client heuristic. Add `is_writable` to
`report_catalog_fields`, derived from `has_column_privilege()` (already named as a v2 requirement in
`bsuite/docs/plans/20260817-estate-completion-plan-v1.00D.md` §Phase 3). Then **delete both**
`isFieldWritable()` and `isFieldEditable()` and read the column. Add one contract test that asserts
the client's notion of writability equals `report_catalog_caller_may_access_field()` for a fixture
set — that test is what stops the fourth drift.

Same move for `is_pii` and `min_role`: they are already declared server-side and already
re-checked in the RPC. The client should read, never re-derive.

### P3 — Runtime probe, not manifest check → template health
Atmosphere: CrewAI's `isAvailable()` hits a live `/health` on its sidecar — *"availability is gated
by a live probe, not classpath presence"* — and `/api/console/info` reports *"actual attached state
— runtime truth, never configuration intent."*

**Apply directly to crm7#1602** ("6 of 23 starter reports query views that do not exist") and
**#1711** ("Financial Reports nav entry has led nowhere since 2026-08-12"). A registered template is
configuration intent. Add a cheap probe — run the compiled AST with `LIMIT 0` — and store
`last_probe_at` / `probe_ok` / `probe_error` on the template. Then: the catalogue page shows broken
templates as broken instead of offering them, the nav hides an entry whose target does not resolve,
and a nightly sweep files the issue instead of a user discovering it.

This is the cheapest item here and it addresses a P0 and a P1 at once.

### P4 — The four-variant decision union → make the write path speak it
Atmosphere: `PolicyDecision` is a sealed union — `Admit()` · `Transform(request)` · `Deny(reason)` ·
`Prefer(a,b)` — evaluated at two phases (`PRE_ADMISSION`, `POST_RESPONSE`), **fails closed to Deny on
exception**, and `Transform` auto-downgrades to `Admit` at the post phase because you cannot rewrite
what has already streamed.

**Apply:** `bulk_data_update` today returns loose text — `would_update|would_skip|updated|skipped|rejected`.
Make it a discriminated union with the same four shapes: `admitted` · `transformed(from,to)` (real
for date/number coercion and trimming, and currently invisible to the user) · `denied(reason)` ·
`preferred(hint)` (e.g. "this looks like a linked record; set it via the picker"). The client already
has to fan a result set back onto cells keyed `rowId::field` — a typed union makes that fan-out
honest instead of string-matching. Keep the existing fail-closed posture: the RPC already wraps each
row in `BEGIN … EXCEPTION WHEN OTHERS THEN action := 'rejected'`, which is correct.

### P5 — Two-tier transform-and-gate filter chain → per-recipient report redaction
Atmosphere: `BroadcastFilter.filter(id, original, message)` runs once globally;
`PerRequestBroadcastFilter.filter(id, resource, original, message)` runs **once per subscriber**.
Both return `CONTINUE | ABORT | SKIP` and both can *rewrite* (original and current message are
separate arguments), so the chain transforms as well as gates.

**Apply to scheduled deliveries.** A GTO compliance pack emailed to a host employer and to an
internal officer should not be the same file. The catalogue already carries `is_pii` and `min_role`
per field — that is the seam. One global filter (tenant scoping, applied once) plus one
per-recipient filter (column redaction by the recipient's role, applied per delivery row) gives you
recipient-appropriate exports without a second template. Today `report-delivery` builds one file and
mails it to everyone.

### P6 — `fork()`-based append-only checkpoints → real cross-session undo
Atmosphere: `CheckpointStore` = `save/load/list/fork/delete`; snapshots carry `parentCheckpointId`;
**resumption is `fork()` into a child, never a mutation** — an append-only audit chain. Also worth
copying: an `atmosphere_schema_version(component, version)` table where opening a store stamped
*newer* than the running build **throws and closes the connection** rather than limping on.

**Apply:** `data_change_sets` / `data_change_set_items` is already 80% of this — you have
`old_data`, `new_data`, `changed_fields` and `bulk_data_undo`. Add `parent_change_set_id` and the
chain becomes navigable: "revert this table to 4pm yesterday", "show me who changed this cell and
what it was", branch-and-compare. That is a feature Airtable charges for (record revision history),
and you are one column from it.

The schema-version guard maps onto `report_templates.schema_version`, which exists in the column
list but is not enforced — a template stamped for a newer compiler should refuse, not run and
silently drop the arms it does not understand.

### P7 — Parser / translator / terminal-guard trio → the progress UI, when you build it
Atmosphere's reference TS client (`frontend/src/transports/agui.ts`, ~200 lines) is three parts: a
**pure SSE parser state machine** (unit-testable with no live stream), a **stateful translator** that
keeps a `toolCallId → toolName` map because the protocol correlates by id while the renderer
correlates by name, and a **terminal-path guard** — if the stream ends without `RUN_FINISHED` or
`RUN_ERROR`, it synthesises a completion so the UI never sticks in "streaming".

**Apply** when you wire `/reports/deliveries` to live status (per the companion doc, via
`postgres_changes` on `report_deliveries` — the row already persists `status`, `row_count`,
`duration_ms`, `error_message`, `retry_count` and nothing subscribes). The terminal guard is the
part people forget: an export that dies without writing a terminal status must still resolve the
spinner. Today there is no spinner to resolve — but build it with the guard from the start.

**Explicitly do NOT port:** `ServiceLoader` classpath discovery (no npm equivalent — use an explicit
registry), virtual-thread parking and `executeBounded` (`AbortController` + `Promise.race` gives you
the same bound for free), and the failure-driven UUID broadcaster cache as a resume design — it has
no cursor or sequence and Atmosphere's own repo has zero hits for `Last-Event-ID` / `afterSeq`.

---

## 4. What is actually missing for the Airtable *feel*

Ordered by how much each one changes the felt experience, not by effort.

1. **Linked records as chips, not UUIDs.** Add `references_entity_key` + `display_column` to
   `report_catalog_fields`; delete `guessReferencedEntityKey`. Render a chip with the human label and
   a picker editor. Closes crm7#1701 / #1572. *Nothing else on this list moves the needle as much.*
2. **Grouping with visible subtotals.** The RPC can `GROUP BY` — but aggregate mode is **exclusive**
   ("groupBy/aggregates take priority over plain fields[]"), so you cannot get detail rows and group
   headers in one call. Airtable's defining view is collapsible groups with counts. Needs
   `GROUPING SETS` or a second aggregate pass keyed to the same filter.
3. **Views that are real and shared.** Collapse three stores into `saved_views`; stop writing `sort`
   empty; let `groupBy` be the array the server already accepts; honour the `width` field that is
   already in the type and unused. Then P1 makes them dashboard-connectable.
4. **Field types with options.** No enum/picklist metadata exists, so every select editor is
   hand-fed. Add `enum_options jsonb` and `format` to the catalogue.
5. **Per-cell heterogeneous writes.** `bulk_data_update` is one patch applied to N rows;
   `commitBrowseCellEdits` therefore issues **one RPC per distinct (field,value) pair, sequentially**
   — pasting 100 different values across 100 rows is 100 round-trips, and rows an aborted later batch
   never reached are reported as failures rather than omissions. Needs a `cell_data_update(p_edits jsonb[])`
   taking per-row values in one call.
6. **Optimistic concurrency.** There is none: the only staleness check is a value diff, so concurrent
   edits are silently clobbered (last write wins). Add a row version (`xmin` or `updated_at`) to the
   edit payload and return `denied(stale)` — which is exactly the P4 union.
7. **Row expand / detail card.** Airtable's second-most-used affordance. Nothing equivalent exists.
8. **Field-level comments / history surfacing.** `data_change_set_items` already stores it; nothing
   shows it. With P6's parent chain this becomes revision history nearly free.

---

## 5. Improve or replace — a ruling per surface

| Surface | Ruling | Why |
|---|---|---|
| `@bsuite/data-grid` | **Promote to the one grid.** Build v2. | Only implementation with real spreadsheet semantics — range select, TSV clipboard, fill, undo. Must absorb: pagination, checkbox selection + bulk actions, column visibility, row actions, export, FK/link editor, saved-view awareness. |
| `ReportTable` | **Fold into data-grid v2** as its view-aware preset. | It already knows saved views, column order and export. That is v2's view layer, not a separate table. |
| `EnhancedDataTable` (95 importers) | **Improve in place, do not migrate.** | crm7#1628 already rules this: virtualise inside it. 95 call sites is not a migration you win. Long-term it becomes a thin preset over v2, but that is a later, mechanical step. |
| `uplift/DataTable` | **Replace and delete.** | This is the true duplicate — it overlaps `EnhancedDataTable` on sort/paginate/select/visibility and overlaps data-grid on inline editing, while claiming canonical status in its own header. Two canonical tables is zero canonical tables. |
| `/financial/reports/new` | **Replace** with the catalogue engine (crm7#1568). | A second hardcoded report builder. |
| `/gto-compliance` "Export Compliance Report" | **Replace.** | Writes a plain `.txt` blob through a hand-rolled anchor click, bypassing `@bsuite/data-export` — and `selectedGtoId` is hardcoded `null`, so it exports all-zeros. |
| Bespoke dashboards (`Dashboard.tsx`, `analytics/gto/*`, `whs-dashboard`, `claims/dashboard`) | **Migrate to `dashboards` + widgets.** | They are hardcoded queries sitting beside a working widget system that already reuses the report pipeline. |
| `@bsuite/page-builder` / `tenant_page_layouts` / `CustomPageRenderer` | **Leave alone, but rule on it.** | A *third* canvas system, unrelated to dashboards. Decide whether it is the page shell or a competitor before either grows. |
| `report_preferences`, `report_configs('builder_view')` | **Migrate into `saved_views`, then retire.** | |

---

## 6. The one real decision: which grid engine

You are ~60% of the way to an Airtable-class grid with a package you own. Three honest options:

| | Build data-grid v2 | AG Grid Enterprise | Glide Data Grid |
|---|---|---|---|
| Licence | yours | **$999/developer perpetual, 1yr support** ([ag-grid.com](https://www.ag-grid.com/license-pricing)) | MIT (`@glideapps/glide-data-grid` 6.0.3) |
| Range select / fill / clipboard | **already built** | built-in (Enterprise only) | built-in |
| Row grouping + subtotals | must build | **built-in** (Enterprise) | must build |
| Pivot | must build | built-in (Enterprise) | no |
| Virtualisation | built (react-virtual) | built-in | canvas — best-in-class at 100k+ rows |
| Fit with shadcn/Tailwind v4 theme | native | fights it; theming is AG Grid's own system | canvas — you draw cells, so full control but no DOM styling |
| Cost of switching | zero | rewrite both editing surfaces | rewrite; canvas cells mean no shadcn components inside cells |

**My read:** grouping-with-subtotals (§4 item 2) is the one place AG Grid Enterprise would save
serious work, and $999 for a solo developer is not a real obstacle. But you cap at 1,000 rows, so
you do not need canvas performance, and AG Grid's theming would fight the D2C Neon Electric token
system that the estate has invested heavily in. **Recommend: build v2, and revisit AG Grid only if
grouping+pivot proves harder than a fortnight.** That is a decision for you, not for me — flagging
it rather than assuming.

*(Aside, a version-policy item: crm7 peers `@tanstack/react-table ^8.21.3`; the current release is
**9.1.2**. Under AGENTS.md §4 that is a bump owed.)*

---

## 7. Sequence

**Now — cheap, high felt-impact**
1. P3 template health probe (`LIMIT 0` + `probe_ok`). Closes crm7#1602, #1711.
2. P1 widget binds `viewId` not `templateKey`. **This is the "connect dashboards" ask, and it is one field.**
3. Stop writing `saved_views.sort` empty; let `groupBy` be the array the server already takes.

**Next — the Airtable feel**
4. FK metadata (`references_entity_key`, `display_column`) + link chips + picker. Closes #1701/#1572.
5. P2 server-declared `is_writable`; delete both client heuristics; add the drift contract test.
6. Grouping with subtotals in the RPC (`GROUPING SETS`).

**Then — correctness under real use**
7. `cell_data_update` for per-cell heterogeneous writes (kills the 100-RPC paste).
8. Row version + P4 decision union → no more silent clobber.
9. P6 `parent_change_set_id` → revision history.

**Consolidation, in parallel and continuous**
10. data-grid v2 absorbs `ReportTable`; delete `uplift/DataTable`; virtualise `EnhancedDataTable`
    in place per crm7#1628; migrate `report_preferences` + `report_configs('builder_view')` into
    `saved_views`; replace `/financial/reports/new` and the `/gto-compliance` `.txt` export.

**Not on this list, but first in the companion doc:** six of the 23 templates query views that do
not exist, and exactly one template has ever produced a delivery. Fix what is broken before
polishing how it renders — an Airtable-class grid over a report nobody can run is still zero reach.

---

## Sources

- Atmosphere framework — https://github.com/Atmosphere/atmosphere (public; `modules/ai/AgentRuntime.java`, `modules/cpr/`, `modules/agui/AgUiEventType.java`, `modules/admin/`, `modules/spring-boot-starter/frontend/src/`)
- AG Grid licence pricing — https://www.ag-grid.com/license-pricing
- crm7 (private): migrations `20260806230000_report_catalog_schema.sql`, `20260807074000`, `20260812220000`, `20260423160000_ws5_report_system.sql`, `20260304100000_ui_customization_system.sql`; `src/types/ui-customization.ts`, `src/services/{browseDataService,reportTemplateRunnerService}.ts`, `src/lib/reports/reportRowEditing.ts`, `src/components/dashboards/dashboardTypes.ts`
- bsuite (private): `docs/plans/20260817-estate-completion-plan-v1.00D.md` §Phase 3, `packages/data-grid/`
- Issues: crm7 #1477, #1517, #1568, #1602, #1628, #1701, #1711, #1712, #1721; bsuite #1882
