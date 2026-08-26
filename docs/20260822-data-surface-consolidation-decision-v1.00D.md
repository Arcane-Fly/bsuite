---
kind: decision
authority: operator
owner: datum-lane
evidence:
  - crm7/src/components/reports/reportScopeDeveloperBinding.test.ts
  - packages/data-grid/src/lib/selection.test.ts
  - scripts/check-doc-classification.mjs
  - docs/plans/20260817-estate-completion-plan-v1.00D.md (Gate G1)
supersedes: docs/20260821-atmosphere-evaluation-v1.00F.md
review_by: 2026-09-05
---

# Data-surface consolidation — six surfaces to one

**Date:** 2026-08-22 · **Status:** D (Draft — Proposed, NOT ratified) · **Author:** Datum
**Decision needed from:** Braden (operator). Four items in §9 require his ruling and are
not decided here.

> **Read §1 first.** The requirement was already written, repeatedly, between 2026-05-01
> and 2026-08-21. This document does not invent a specification. It recovers the one that
> exists and measures the six surfaces against it.

---

## 0. Summary

Six surfaces. Measured against Braden's own documented requirements, **nine capabilities
he asked for are absent from all six**, and the single most-repeated one — *a surface that
opens showing data instead of a form* — has been unfixed for 14 days despite being
announced as delivered on 2026-08-08.

The surfaces are not, however, mostly-empty. They contain a mature catalogue engine
(89 entities / 1,297 fields / 124 joins), a correct four-tier `report_scope` model with
RLS that is genuinely enforced, a working Airtable-grade grid package, and a working
developer database console. The estate's own diagnosis is the accurate one:

> *"crm7 is much closer to Airtable than it feels. The reason it feels far away is not
> absence. **It is that every piece exists two or three times and none of them compose.**"*
> — `docs/20260821-airtable-class-data-surface-plan-v1.00F.md` §0, 2026-08-21

**Recommendation: Option 1 — consolidate onto one surface and complete it, reusing the
parts that already work.** Not because it is ambitious, but because it is the only one of
the three options that terminates in something finished. Defended in §8, with its
strongest counterargument stated and answered.

---

## 1. THE REQUIREMENT — recovered from Braden's own documents

This section is authoritative. Everything below is measured against it. Quotes are
verbatim with path and date. Full reconstruction: 41 requirements across 22 dated operator
statements, 2026-05-01 → 2026-08-22.

### 1.1 The core ask, in his words

> *"give me this [NocoDB] — all data connected of all suite apps. developer read all edit
> all all tenants. then scoped per or permissions thereafter. developer, superadmin, org
> admin decide who can read and edit what to the max limit of their own scope limit."*
> — `docs/00-roadmap/20260808-data-workspace-implementation-plan-v1.00W.md:31-33`, **2026-08-08**

> *"all reports and data analytics capabilities must be the airtable/excel/sheets style UI
> and related capabilities. and ability to do powerbi style dashboards and charts etc."*
> — bsuite#1882, **2026-08-10**

> **"D-79. Airtable-style reporting.** Specified in docs, planned, and directed repeatedly.
> `/financial/reports`, `/financial/reports/new` and `/reports/custom/create` are none of
> it… Reference implementations for study are listed in the notes; nocodb is the closest."
> — `docs/20260813-operator-directive-notes-backlog-remediation-v1.00D.md:112`, **2026-08-13**

> **"Both of these fucking suck."** — crm7#1477, having opened `/settings/data` and
> `/admin/data`, **2026-08-08**

> *"**Airtable opens showing you a table. These open showing you a form.**"*
> — `docs/00-roadmap/20260808-operator-decision-register-v1.00W.md:379-382`, **2026-08-08**

> **The standing tie-break, verbatim:** *prefer the most advanced, UX-friendly,
> cutting-edge version of any feature — e.g. **Airtable-style data manipulation is
> preferred over any other report feature***.
> — `docs/20260817-estate-remaining-work-register-v3.00W.md:50-52`, **2026-08-17**

### 1.2 The meta-complaint — which this document is itself subject to

> **"D-62. Fix the class, not the page.** *These issues are persistent across the app and
> have been flagged to be fixed across the full app many times. Typically the fixing agent
> fixes that page I've pointed to but I have always said it is a platform wide
> consideration.*" — **A PR that fixes only the URL I named is a failed PR.**
> — same file `:37`, **2026-08-13**

> **"D-59. The distinction that matters: filing is not addressing.** A large fraction of
> what I reported was converted into a well-written issue and then left."
> — same file `:31`, **2026-08-13**

> Operator ruling: **"deferals are forbidden."**
> — `docs/20260806-schema-authoring-and-tenancy-scope-v1.00A.md:9`, **2026-08-06**

### 1.3 Requirement register (abridged — IDs are stable, full text in the reconstruction)

| ID | Requirement | Acceptance criterion | Status across all six |
|---|---|---|---|
| **R-1** | Opens showing DATA, not a form | ≥1 real row rendered in one paint, zero clicks | **ABSENT ×6** |
| R-2 | Browse any catalogued entity, searchable by business phrase | Find entity without knowing table name | PARTIAL (S5) |
| R-3 | Cross-app reach — all suite apps' data | Browse conduit/throughput/braden entities from one place | **ABSENT ×6** |
| R-4 | Exactly ONE report builder | Grep: one definition-construction path | **PRESENT** |
| **R-5** | A report is a saved **VIEW of records**, not a saved question | Switching renderer re-renders same records | **ABSENT — NEVER RULED ON** |
| R-6 | Preview the chart BEFORE saving | Chart visible in builder pre-save | ABSENT |
| R-7 | Full entity/field coverage, no hardcoded sources | Catalogue-driven | **PRESENT** |
| R-8 | Filters on the **column header** | Click header → 9-operator picker | PARTIAL, never on headers |
| **R-9** | Grouping with collapsible subtotals | Per-group subtotals beside detail rows | **ABSENT ×6** (counts only) |
| R-10 | Multi-key sort, persisted | Sort survives reload | ABSENT — and the UI **lies** about it |
| R-11 | A permission denial is visible, never an empty grid | Revoke privilege → UI names the refusal | PARTIAL |
| R-12 | Inline cell editing reachable by a real user | Edit 3 entities, verify in SQL | PARTIAL (S5 + runner) |
| R-13 | Paste from Excel, range select, fill handle, keyboard nav | Paste multi-row from Excel | PARTIAL (S5 only) |
| R-14 | Undo from the UI | Ctrl+Z reverts a committed edit | PARTIAL |
| **R-15** | Add a new row | An add-row control exists | **ABSENT ×6** |
| R-16 | Per-cell heterogeneous writes | Paste 100 values = 1 call | ABSENT |
| R-17 | Optimistic concurrency, no silent clobber | Concurrent edit rejected server-side | ABSENT |
| **R-18** | **Server-declared** per-field writability (`has_column_privilege()`) | Revoke UPDATE(col) → column read-only, no client change | **ABSENT — two client heuristics that DISAGREE** |
| **R-19** | Revision history — who changed this cell | Cell history panel | **ABSENT** (data stored, nothing reads it) |
| R-20 | PowerBI-class dashboards: canvas, cross-filter, drill | Click chart → siblings filter; drill to detail | PARTIAL (drill ABSENT) |
| **R-21** | A saved view placeable on a dashboard | Tile honours view's filters+columns+chart | **ABSENT — `DashboardWidget` has no `viewId`** |
| R-22 | Definition scope × data scope as two independent axes | One dashboard, N tenant-filtered answers | PARTIAL (data half free; definition half absent) |
| R-23 | View switcher: grid/chart/kanban/calendar on same records | Switch lens, same records | PARTIAL (runner only) |
| R-24 | Schedule + deliver, status LIVE not guessed | Status transitions without refresh | PARTIAL (no subscription anywhere) |
| R-26 | Export CSV/XLSX/PDF + spreadsheet round-trip | Round-trip through Excel | PARTIAL (runner only) |
| R-27 | `/developer/tables` a real DB console, better than raw Supabase | Manage schema without opening Supabase | **PARTIAL — best of the six** |
| **R-28** | Schema builder: drag dot-to-dot to create a relation | Drag creates persisted edge | **BROKEN SINCE 2026-05-03 — HAS NEVER WORKED** |
| R-29 | Catalogue governance — promote an entity | Propose→approve flow | **PRESENT** (S6, undocumented) |
| R-30 | Developer reads all, edits all, all tenants | Dev edits in a tenant they don't belong to | **PRESENT** |
| R-31 | Nobody but developer holds platform visibility + **published sweep count** | A count exists | PARTIAL — **sweep never done** |
| R-33 | Fix the CLASS, not the page | Every PR states its surface count | **ABSENT as a practice** |
| **R-34** | ONE grid, everywhere | One table component; rest deleted | **ABSENT — FIVE grids live** |
| **R-35** | ONE saved-view object | One store | **ABSENT — THREE stores** |
| **R-36** | FK values as human chips with a picker; nobody sees a UUID | No raw UUID in any cell | **ABSENT — catalogue has no FK-target column** |
| R-37 | Typed field editors driven by field type | Enum → dropdown | PARTIAL (S5) |
| **R-38** | Row expand / detail card | Click row → detail panel | **ABSENT ×6** |
| R-39 | Edit in place on the page you're on | No navigation to edit | ABSENT — **regression** |
| R-40 | Reports feel like they're inside the app you're in | One extra nav link, same shell | **UNDECIDED — needs ruling** |
| R-41 | Archive recovery through the reports | >2yr range → "Recover from archive?" | ABSENT |

### 1.4 What he has explicitly ruled OUT — do not re-propose

| | Ruling | Where | Date |
|---|---|---|---|
| **N-1** | **No new `/data` or `/tables` route.** *"Ruled out 2026-08-08 and I am not re-opening it."* | data-workspace plan §1; re-affirmed report-builder design §9 | 08-08 / 08-13 |
| **N-2** | No second table for saved views — extend `report_configs` | T3.4 | 08-08 |
| **N-3** | **Formula columns permanently cut** | R1-15 | 08-08 |
| **N-4** | **No vendored Airtable clone.** NocoDB / Teable / Baserow / Grist / APITable / undb / Mathesar all rejected on licence or the *mirror trap*: *"adopting either means mirroring 363 live tables and abandoning RLS, the catalogue and the write engine — i.e. abandoning the permission model, **which is the requirement**."* **NocoDB is a study reference for interaction design only; its code may never be read or copied.** | data-workspace plan §5, licences re-verified twice | **2026-08-08** |
| **N-5** | Query engine must NOT bypass row security; no developer membership rows | operator decision register | 08-08 |
| **N-8** | *"deferals are forbidden."* | schema-authoring scope | 08-06 |

### 1.5 THE HEADLINE FINDING

**Nine capabilities Braden documented are absent from all six surfaces:**
R-1 (opens on data), R-9 (subtotals; no pivot exists anywhere), R-15 (add a row),
R-18 (server-declared writability), R-19 (revision history), R-21 (view on a dashboard),
R-36 (FK chips — *"Nothing else on this list moves the needle as much"*), R-38 (row
expand), R-8-as-specified (header filters).

**And three structural facts that make "half-finished" literally correct:**

1. **The most Airtable-like component in the estate has three consumers, and one renders
   it read-only.** `@bsuite/data-grid` — range selection, TSV clipboard, fill handle,
   200-deep undo, all tested — is imported by `ReportBuilder.tsx:50` (**read-only**),
   `BrowseDataTab.tsx:42`, and `browseDataService.ts:40` (types only). Meanwhile
   `EnhancedDataTable` — no paste, no fill, no range — has **36 importers**.
2. **Five grid components and three saved-view stores coexist.** A view saved in one is
   invisible to the other two. *"Two canonical tables is zero canonical tables."*
3. **The one thing announced as fixed is not fixed.** On 2026-08-08 the decision register
   announced *"The spreadsheet now exists — go and look… Pick a data type, see your rows
   straight away."* The 2026-08-22 audit finds `/admin/data` Browse still opens on
   *"Pick an entity above to see its rows"* (`BrowseDataTab.tsx:1058`). **R-1 has been
   reported delivered and is not delivered.**

---

## 2. INVENTORY — what each surface actually is

Evidence: direct code audit, 2026-08-22, crm7 @ `7edd2caf`. LOC via `wc -l`.

| # | Surface | App / repo | Entry file | Owned LOC | Verdict |
|---|---|---|---|---|---|
| S1 | `/reports` | crm7 | `src/pages/reports/index.tsx` | 1,406 | Working **list**, runs nothing |
| S2 | `/reports/custom/create` | crm7 | `src/pages/reports/custom/create.tsx` | 3,762 | Working builder; **build-then-run** model |
| S3 | `/reports/schedules` | crm7 | `src/pages/reports/schedules.tsx` | 821 | Working CRUD; **nothing drains the queue** |
| S4 | `/settings/data` | crm7 | `src/pages/settings/data.tsx` | 1,796 | Working import/bulk-update; **no Browse tab** |
| S5 | `/admin/data` | crm7 | `src/pages/admin/data.tsx` | 5,237 | Working; the only true per-cell editor |
| S6 | `/developer/database` | BSU | `src/pages/Developer/Database/index.tsx` | 2,552 (+480 test) | **Best-functioning.** 10 sub-surfaces, all real |
| | | | **Total** | **≈15,574** | |

### 2.1 Notable per-surface findings

**S1 `/reports`** — honest and correct within its scope. No inert controls found. Its own
header comment records: *of 23 platform starter templates, exactly ONE has ever produced a
delivery; zero tenant/enterprise/personal reports have ever been created; zero schedules
exist.* Reads `report_templates`, writes nothing.

**S2 `/reports/custom/create`** — the most mature builder. Catalogue-driven (R-7 PRESENT),
faithful `report_scope` implementation with genuine defence-in-depth (`reportScopeAccess.ts:83-102`
mirrors the live RLS predicate; `reportTemplateInsertService.ts:70-95` re-validates the
scope/tenant/user shape against the DB CHECK). **One genuinely cosmetic control:** the
*"Track changes"* switch (`create.tsx:325-327`, state at `:62`) writes only
`tags: ['tracks-changes']`; grep of the entire `src/` tree finds **zero readers** of that
tag. The panel then tells the user *"Track changes: enabled (audit columns)"* (`:342`) —
**it claims audit behaviour that does not exist.** Also: every preview column is
`editable:false` (`ReportBuilder.tsx:566`) and `handleCellsEdited` toasts *"Preview is
read-only"* — the builder embeds the Airtable grid and disables the Airtable part.

**S3 `/reports/schedules`** — leanest surface, no inert controls, real mutations
throughout. The defect is downstream: `pg_net` is disabled, so `report_schedules_process_due()`
inserts `pending` rows that nothing drains; the `report-delivery` edge function processes
**inline and blocks the caller**; and no surface subscribes to `report_deliveries` despite
that row already persisting `status`, `row_count`, `duration_ms`, `error_message`,
`retry_count`. **There is no spinner to resolve.**

**S4 `/settings/data`** — deliberately scoped, well-built, honest. Replaced four retired
pages. Preview and commit call the **same** RPC in dry-run vs commit mode, so they cannot
diverge. No inert controls. **The gap is R-32:** `browseDataService.ts:1-12` names *both*
`/admin/data` and `/settings/data` as its targets; **the Browse wiring only landed on
`/admin/data`.** The org-admin home surface has no browse capability at all.

**S5 `/admin/data`** — largest, five tabs. Browse tab is the only true per-cell editor in
the estate. **Interpretation rules is honestly labelled as not-yet-wired** —
`interpretationRulesService.ts:21-33` states in code that nothing reads `interpretation_rules`
except its own UI, and `InterpretationRulesTab.tsx:945` renders that as a visible
`<AlertTitle>Not yet applied to any calculation</AlertTitle>`. That is a partial feature
declared in the UI, not a hidden stub — it does not count as an inert control, and the
practice is correct.

**S6 `/developer/database`** — **Braden's assessment that this is the best-functioning is
confirmed, and his assessment that its theming is incomplete is NOT.** Ten sub-surfaces via
`?surface=`, every one backed by real network calls. **Zero inert controls found.** Zero
empty `onClick`. Two panels deliberately *decouple* their write controls from the list
query's error state so a broken read cannot hide a working write button
(`ExtensionsPanel.tsx:83-90`) — the opposite of inert.

**On theming, measured:** hardcoded colours (`bg-slate-`, `text-gray-`, `#hex`) = **0
matches**. Token usage (`bg-card`, `text-muted-foreground`, `border-border`, `var(--…)`) =
**67 matches**. It renders inside the standard shell via `DeveloperTabFrame` → `PageGridLayout`.
Focus-visible states are token-driven rings (`focus-visible:ring-ring` in the shared
`button.tsx:8` / `input.tsx:14`), not removed outlines. **The console's own markup is
essentially 100% token-compliant.** The one plausible visual gap is
`SchemaVisualizer.tsx:23` importing `@xyflow/react/dist/style.css` unmodified — vendor
node/edge/minimap colours that the app never re-skins. *That is the theming defect, and
it is one stylesheet, not a surface-wide problem.*

### 2.2 Security finding — S6, stated plainly

The entire read side of `/developer/database` executes with the Postgres **service role**,
deliberately bypassing RLS, via `supabase/functions/platform-kit-proxy` (holds
`SUPABASE_SERVICE_ROLE_KEY` **and** `SBP_MGMT_TOKEN`). It is gated only by (1) an
edge-function-side `profiles.platform_role IN ('platform_admin','developer')` check and
(2) `EXECUTE`-grant allowlisting on the `pk_*` introspection RPCs.

This is architecturally justified and extensively documented — PostgREST cannot reach
`pg_catalog`/`information_schema` at all, so there is no RLS-respecting alternative for
schema introspection. **But the Rows tab reads arbitrary `public` tables through that same
service-role client.** A bug in the gate at `platform-kit-proxy/index.ts:139-152` is a
full-schema, full-data exposure, not a partial one. The Settings write path additionally
holds a Management-API credential able to alter live project configuration outside any RLS
concept.

This does not conflict with N-5 (which governs the *query engine* — `report_run_catalog_query`
is correctly `SECURITY INVOKER`, proven by `crm7/supabase/tests/database/68_global_reference_scope.sql`).
But it means **S6 cannot become the general-user data surface without a second,
RLS-respecting read path.** See §7 and §9.

---

## 3. OVERLAP MATRIX

### 3.1 Capability × surface

`●` = implemented · `◐` = partial/degraded · `—` = absent
(`R` = the runner `/reports/:key`, adjacent to the six, included because five capabilities
live only there)

| Capability | S1 reports | S2 create | S3 schedules | S4 settings/data | S5 admin/data | S6 dev/database | R runner | **Count** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| List saved reports | ● | — | — | — | — | — | — | 1 |
| Browse table rows | — | ◐ preview | — | ◐ selection | ● | ● | ● | **5** |
| Per-cell inline edit | — | — | — | — | ● | — | ● | **2** |
| Bulk update rows | — | — | — | ● | ● | — | — | **2** |
| Import CSV/XLSX/JSON | — | — | — | ● | — | — | — | 1 |
| Define a report | — | ● | — | — | — | — | — | 1 |
| Ad-hoc query | — | ● | — | — | ● | — | ● | **3** |
| Filter data | — | ◐ | — | — | ● | — | ● | **3** |
| Sort | ● | ● | — | ● | ● | ● | ● | **6** |
| Group-by | — | ◐ no subtotals | — | — | — | — | ◐ counts | 2 |
| Aggregate / measures | — | ● | — | — | — | — | ● | 2 |
| Chart / visualise | — | — | — | — | — | — | ● | 1 |
| Export | ● | — | — | — | — | ● CSV | ● | **3** |
| Schedule + deliver | — | — | ● | — | — | — | — | 1 |
| Delivery history | — | — | ◐ link | — | — | — | — | 1 |
| Change / audit history | — | — | — | — | ● | — | — | 1 |
| Inspect schema / columns | — | ◐ AST | — | ◐ fields | ● | ● | — | **4** |
| Author schema (DDL) | — | — | — | — | — | ● PR-only | — | 1 |
| Saved views | — | ● `report_configs` | — | — | ● `report_configs` | — | ● `saved_views` | **3** |
| Catalogue governance | — | — | — | — | — | ● | — | 1 |
| Undo | — | — | — | ● | ● | — | — | **2** |

**Countable duplication: browse rows ×5, sort ×6, schema inspection ×4, filter ×3,
ad-hoc query ×3, export ×3, saved views ×3 (in three different tables), per-cell edit ×2,
bulk update ×2, undo ×2.**

### 3.2 Backing tables × surface

`r` read · `w` write · `—` untouched

| Table | S1 | S2 | S3 | S4 | S5 | S6 | R | Scope column | RLS |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|---|
| `report_templates` | r | **w** | r | — | — | — | r | **`scope report_scope`** | ● hardened ×4 migrations |
| `report_configs` | — | **rw** | — | — | **rw** | — | — | no — `org_id` only | ● scoped |
| `report_executions` | — | — | — | — | — | — | — | no — `org_id` only | ● |
| `report_schedules` | — | — | **rw** | — | — | — | — | no — `tenant_id NOT NULL` | ● tenant-isolated |
| `report_deliveries` | — | — | r | — | — | — | r | no | ● |
| `report_catalog_entities` | — | r | — | r | r | **rw** | r | nullable `tenant_id` = platform | ● |
| `report_catalog_fields` | — | r | — | r | r | — | r | nullable `tenant_id` | ● |
| `report_catalog_joins` | — | r | — | — | — | — | r | nullable `tenant_id` | ● |
| `report_catalog_measures` | — | r | — | — | — | — | r | nullable `tenant_id` | ● |
| `report_catalog_derived_measures` | — | — | — | — | — | — | — | nullable `tenant_id` | ● |
| `report_preferences` | — | — | — | — | — | — | — | no | ● owner-only |
| `dashboards` | — | — | — | — | — | — | — | **`definition_scope report_scope`** | ● |
| `tenant_schema_layout` | — | — | — | — | — | — | — | no | ● |
| `tenant_entities` | — | — | — | — | — | — | — | nullable `tenant_id` | ● |
| `tenant_field_definitions` | — | — | — | — | — | — | — | no | ● (policies in a later migration) |
| `saved_views` | — | — | — | — | — | — | **rw** | — | ● |
| `data_change_sets` | — | — | — | r+RPC | r+RPC | — | — | — | ● |

**Two dead tables.** `report_catalog_derived_measures` has full DDL, RLS, and a complete
SQL-side compute engine (`report_catalog_resolve_derived_measure()`,
`report_catalog_compute_measure_scalar()` — migration `20260812220000`) and **zero
`.from()` and zero `.rpc()` call sites estate-wide**. Its only non-migration references are
a denylist entry (`reportRowEditing.ts:124`) and a doc comment. `report_preferences` is
likewise **zero readers, zero writers** (already flagged U-10 in the v3 remaining-work
register).

### 3.3 `report_scope` — is it respected?

**The enum is real and correct.** `crm7/supabase/migrations/20260522010000_report_templates_scope_hierarchy.sql:34-42`:

```sql
CREATE TYPE public.report_scope AS ENUM (
  'platform',   -- super_admin authored; visible to ALL users in ALL tenants
  'enterprise', -- enterprise admin authored; visible to enterprise tenant + sub-orgs
  'tenant',     -- gto_admin authored; visible to tenant only (no sub-org inheritance)
  'user'        -- any user; visible only to that user
);
```

**Verdict: exactly one of the six surfaces implements it. The other five each invented
their own scoping — and three of those inventions are defensible.**

| Surface | Posture |
|---|---|
| S2 | **Respects it faithfully, end to end.** `reportScopeAccess.ts:83-102` implements the four-tier visibility table; `create.tsx:163-169` re-validates against the exact live RLS predicate before insert; `reportTemplateInsertService.ts:70-95` re-checks the shape against the DB CHECK. Pinned by `reportScopeDeveloperBinding.test.ts`. |
| S1 | **Reads it honestly, does not re-derive it.** Uses the four values as UI section headings only; states in its own UI that *"Platform, enterprise, tenant, and personal templates are filtered by database policy; this page does not duplicate scope rules client-side."* Correct. |
| S3 | **Never touches it.** The template dropdown does `.from('report_templates').select().order('name')` with no scope filter — relying purely on RLS. Correct behaviour, but the surface has no scope model of its own; `report_schedules` is unconditionally single-tenant. |
| S4 | **Own tier model** — `resolveBulkDataTier()` (`bulkDataService.ts:177-206`): developer / tenant owner-admin / none. Appropriate, since this surface authors no `report_templates` rows. |
| S5 | **Own multi-layer model** — `canAccessAdminDataConsole()` plus a documented *widening* for the Browse tab (`data.tsx:457-491`) plus `resolveAdminDataScope()` tenant-plus-descendants. Coherent and self-consistent, but a **third** scoping vocabulary. |
| S6 | **Bypasses the concept entirely** — service-role proxy, gated on `profiles.platform_role`. A **fourth** vocabulary. |

**So: four distinct authorization vocabularies across six surfaces, over one enum that was
designed to be the single spine.** `report_scope` *is* the right spine — R-22's data-scope
half is already free by construction because `report_run_catalog_query` is `SECURITY
INVOKER`. What is missing is that only `report_templates` and `dashboards` carry a scope
column; `report_configs` (the ruled home for saved views, N-2) does not.

---

## 4. DRY ONE-SHOT — capability ownership

Applying `dry-one-shot-architecture` rule 1 (*entity ownership is singular*) and rule 4
(*no local mirror tables*). Decisive assignments, no "it depends".

| Capability | **ONE owner** | Every other surface does this instead |
|---|---|---|
| **Browse / explore data rows** | **S5 `/admin/data` → Browse**, promoted to the canonical Data Workspace | S4 gains a *link* to it scoped to org-admin tier (the wiring `browseDataService.ts` already claims). S6 Rows tab **deleted** — it is the service-role duplicate. S2's read-only preview becomes a live sub-view of the same component. |
| **Per-cell inline edit** | **S5 Browse**, on `@bsuite/data-grid` | Runner `/reports/:key` stops carrying a second edit path (`updateReportRowCell`) and renders the same grid component. S2's `editable:false` preview becomes editable via the same path or is removed. |
| **Bulk import / bulk update** | **S4 `/settings/data`** — keep as-is, it is the best-built surface in the set | S5 links to it; does not reimplement. Already true. |
| **Define a report / saved view** | **S2's `ReportBuilder`, relocated INTO the grid toolbar** (see §5) | S1 becomes a launcher only. `saved_views` and `report_preferences` **deleted**; everything moves to `report_configs` per N-2. |
| **Run + filter + visualise** | **The runner `/reports/:key`, merged with S5 Browse into one surface** | S2 stops being a separate destination; it becomes the toolbar. |
| **Schedule + deliver** | **S3 `/reports/schedules`** — keep the route, it is clean | Gains a realtime subscription on `report_deliveries`. No other surface schedules. |
| **Admin data ops (change history, tenant scope)** | **S5** | — |
| **Developer DB inspection + DDL authoring** | **S6 `/developer/database`** — keep, unchanged, service-role and all | Its **Rows tab is deleted**; row browsing belongs to S5 where RLS applies. Everything else stays. |
| **Catalogue governance (propose/approve entity)** | **S6 `ReportCatalogPanel`** | Document the relationship — currently *"documented nowhere"* (v3 register `:219`). |
| **Schema authoring (visual)** | **`@bsuite/schema-builder`** per ADR-0002 / ADR-0008 | Out of scope here except: it is **broken** (R-28) and that is a separate spec. |

**Deletions this implies:** `saved_views` table + its readers, `report_preferences` (dead),
`report_catalog_derived_measures` (dead — or wire it, ruling needed), S6's Rows tab, S2 as
a standalone route, four of the five grid components, `report-form-dialog.tsx` (residue).

---

## 5. THE REFERENCE — what atmosphere actually demonstrates

**Finding that supersedes `docs/20260821-atmosphere-evaluation-v1.00F.md`:** that document
evaluated `Atmosphere/atmosphere`, a JVM agent runtime. **That is the wrong repository.**
`github.com/GaryOcean428/atmosphere` is a **fork of `nocodb/nocodb`, renamed by
find-and-replace.** Evidence: `Merge pull request #1 from nocodb/develop` (2026-08-18)
followed immediately by `Rename nocodb to atmosphere across codebase`; of 468 reachable
commits, GaryOcean authored 20, **all** rename/Vercel/Node-pin/CORS plumbing, **zero
product commits**; upstream identity leaks throughout (Typesense index `atmosphere-docs-v2`,
`contrib.rocks/image?repo=atmosphere/atmosphere`, deps `nc-jsep`, `nc-analytics`).

This is *good* news and it closes a loop: **D-79 already named NocoDB as "the closest"
reference on 2026-08-13.** Braden pointing at atmosphere is him pointing at NocoDB again.
The interaction model is therefore not aspirational — it is a mature product design
validated over years.

**It also means N-4 already governs it.** NocoDB is a study reference for interaction
design only; its code may never be read or copied. Nothing below copies code.

### 5.1 The interaction model, framework-stripped

Structurally, **Nuxt contributes nothing load-bearing**: `nuxt.config.ts:20` is `ssr:false`,
there is no `server/` directory, and there are **zero** occurrences of `useAsyncData`,
`useFetch(`, or `defineEventHandler` in the entire frontend. It is a Vue SPA in a Nuxt
costume. The value is entirely in decisions, and decisions port for free.

The seven that matter:

1. **One object hierarchy, one chrome, one URL space.** `Workspace → Base → Table → View →
   Row`. One route file is the whole product. Braden has six top-level nouns, so every
   task begins with *"which app?"* — **and that question, asked repeatedly, IS the
   half-built feeling.**
2. **Grid-primary. There is no build step.** You land *inside data*. You configure the grid
   — fields, filters, group-by, sort, per-column aggregation footer — and press Save. The
   config *is* the report. **This is exactly R-5, which has never been ruled on.**
3. **The View is a first-class server object** with persisted filters/sorts/field-visibility/
   row-height/row-colour and **Collaborative / Personal / Locked** semantics. "Personal"
   — *my filters don't move your grid* — is the single feature that lets a shared surface
   survive a second user. Maps directly onto `report_scope`.
4. **Command palette as universal entry point**, server-backed so it finds objects not
   currently loaded. (⌘K nav, ⌘L recents.)
5. **Schema editing from inside the grid.** `+` in the header row is `ALTER TABLE`. Table
   metadata — fields, relations/ERD, permissions, APIs, webhooks — is a **tab on the same
   surface**, not a separate app. *Braden's S5 and S6 are that one tab strip, split across
   two apps.*
6. **Nine renderings of one View object** — grid/gallery/kanban/calendar/form/… all sharing
   one filter/sort/field config. **This is R-23 done properly.**
7. **Live feedback, always.** No preview/apply split. Staleness handled by an epoch guard
   (`useQuerySession.ts`, ~30 lines) rather than by blocking the UI.

### 5.2 The capability delta — honestly

**Roughly 70% of the delta is coherence, not capability.** Six well-built React surfaces
would cover most of the features. The coherence *is* the product. The five genuine
capability gaps: View-as-permissioned-object (§5.1.3), schema editing from inside the data
view, nine renderings of one view, Excel-grade grid interaction, public share links.

**And the delta runs both ways — this matters for the recommendation.** NocoDB OSS has
**no schedule manager at all** (`cron-parser`/`cronstrue` are declared and unreferenced),
**no SQL developer console** (`monaco-sql-languages` is dead weight), **undo/redo gutted
upstream** (`useUndoRedo.ts` is a 16-line permanently-disabled stub), **realtime a 3-line
no-op**, and it reimplements authorization across 71 controllers in application code where
Supabase RLS puts it in the database. **S3 and S6 are capabilities the reference lacks.**
Do not delete them to chase it.

**What cannot be copied cheaply:** the grid is **28,952 lines of hand-written canvas**.
There is no grid library to `npm install` from that repo. And the discipline of collapsing
six nouns into one — which is free, and is the whole finding.

---

## 6. TECHNOLOGY SURVEY

Verified 2026-08-22. Full table in the working notes; decisions and rejections here.

### 6.1 Two estate facts that settle most of it

**(a) There is no AG Grid licence anywhere in the estate.** Searched for
`ag-grid-enterprise`, `LicenseManager`, `AG_GRID_LICENSE`, `setLicenseKey`,
`ag-grid-community` across source, every `package.json`, docs and env files. **Zero AG Grid
hits.** (The `LicenseManager` matches are BSU's own tester-licence admin page, unrelated.)
**Adopting AG Grid Enterprise is a net-new purchase — ~$999/dev perpetual plus a mandatory
Deployment Licence Add-On, ≈$3,750 for three devs — not a sunk cost.**

**(b) `@bsuite/data-grid` already implements ~60% of the hard part, with tests.**

| Capability | Status in `packages/data-grid` |
|---|---|
| Rectangular range selection | ● `packages/data-grid/src/lib/selection.ts` + tests |
| Drag-fill handle | ● `packages/data-grid/src/lib/fill.ts` + `FillHandle.tsx` + tests |
| TSV clipboard round-trip | ● `packages/data-grid/src/lib/clipboard.ts`, `tsv.ts` + tests |
| Cross-type paste coercion | ● per-column `parseValue`/`formatValue` |
| Keyboard grid nav | ● `packages/data-grid/src/lib/keyboard.ts` + tests |
| Undo/redo (200-deep) | ● `packages/data-grid/src/lib/undo.ts` + tests |
| Inline editors (5 types) | ● + `renderEditor` escape hatch |
| Virtualization | ● TanStack Virtual |
| Column freeze | ◐ **first column only** |
| Aggregation footer | — |
| Group-by | — |

Its `onError` and `onCellsEdited` are **required** props specifically to prevent silent
RLS-failure writes. This is high-quality work with three consumers.

### 6.2 Rejections, with reasons

| Candidate | Verdict |
|---|---|
| **NocoDB self-hosted** | **REJECT — a trap, and already ruled out by N-4.** Licence changed 2026-01-29 to the **Sustainable Use License** — *"only for your own internal business purposes… distribute only free of charge for non-commercial purposes."* Not open source; branches other than master/develop are unlicensed. Plus: Vue/Nuxt; demands its own `NC_DB` metadata store; connects as **a single privileged role** so `auth.uid()` is meaningless and RLS is neutered; and Custom Sync (mirroring existing Postgres tables — the exact capability needed) is **paywalled to the Business plan**. |
| **Teable** | REJECT as spine — **AGPL-3.0** on `apps/*` (fatal for commercial SaaS). Best stack fit of the clones (Next + React + shadcn + Tailwind); `packages/*` are MIT, but get counsel before copying a line. |
| **Directus / Baserow** | REJECT — Vue admin + a separate long-running server (Node / Django+Celery+Redis) + a permission model that duplicates rather than uses RLS. Directus is also source-available with a live "Competing Use" ban. |
| **Rowy** | REJECT — dead (last release 2023-10-27), and Firestore-only. |
| **Supabase Studio** | **REJECT as spine and as component — this was the highest-value question and the answer is a clear no.** Licence is clean (Apache-2.0, **no NOTICE file**, so no de-branding restriction — cleaner than Prisma's). But: **the table editor bypasses RLS by design.** Traced end to end: `table-rows-query.ts` → `execute-sql-mutation.ts` → `/platform/pg-meta/{ref}/query` → `getConnectionString()` → `POSTGRES_USER_READ_WRITE \|\| 'supabase_admin'`. **Every cell render runs as a superuser-class role; it never uses supabase-js or PostgREST for table data.** That is the exact inverse of this estate's requirement. It also has **none** of the NocoDB features (no server-persisted views — *"Filters and sorts are stored in URL parameters"* per its own README; no group-by, no aggregation footer, no gallery/kanban/calendar, no row-height, no lock semantics). It pins upstream `react-data-grid@7.0.0-beta.47` **with a mandatory patch**, and Supabase's own design docs say they are leaving it for TanStack Table. Decisive signal: **when Supabase themselves needed an embeddable dashboard they wrote a fresh MIT + shadcn app rather than extract the grid.** — **DO adopt `packages/pg-meta` (MIT, zod-only, zero React).** |
| **Outerbase** | REJECT — AGPL-3.0, copyright now Cloudflare, hosted product sunset 2025-10-15. |
| **Drizzle Studio embeddable** | REJECT — proprietary, private per-customer npm. Cannot own or audit the product's primary surface. |
| **Prisma Studio core** | Viable for internal admin only — Apache-2.0 **but the NOTICE forbids removing Prisma branding without a commercial licence**, and it requires a raw-SQL BFF. Wrong authz shape. |
| **Glide Data Grid** | **REJECT** — no published release supports React 19 (peer caps at 18), no release in 2.5 years, and canvas rendering means it can never wear Neon Electric tokens. |
| **AG Grid Enterprise** | Viable but **rejected** — see §6.3. |
| **Refine** | Viable component, **not a spine.** MIT, genuinely headless, real Supabase provider that keeps RLS as the boundary. But its `accessControlProvider` exists to make authz decisions **in app code** — precisely what fights this estate. And maintenance: last release 2026-04-02, last `main` push 2026-06-05, ~4.5 months silent from a project that shipped weekly. **Copy its data-provider shape; don't take the dependency across six apps.** |
| **Cube / Lightdash / Rill / Evidence / Malloy** | REJECT all — each needs a runtime the estate does not run (Node+Rust cluster / Node+Python dbt / Go binary / SvelteKit) and each either bypasses RLS or ships a rival RBAC. Evidence caches to Parquet at build time, which is architecturally incompatible with per-user RLS. |
| **Tremor (npm `@tremor/react`)** | REJECT — dead; **Tailwind v4 breaks every Tremor class** (issue #1152). The **copy-paste** path at tremor.so is alive (Vercel acquired it Jan 2025) and is fine. |
| **react-awesome-query-builder** | REJECT — stable release ~3 years old, AntD-first, no shadcn adapter. Strictly dominated by react-querybuilder. |
| **DuckDB-WASM** | Defer — **~34 MB of WASM**, cannot query Postgres (no TCP in WASM), and kills server-side pagination. Only justifiable behind an explicit "Analyse" mode at 10⁵+ rows. |
| **FINOS Perspective** | Defer — best-maintained thing in the survey (v5.2.0, 2026-08-10), Apache-2.0, but it is a **Shadow DOM Web Component**: Tailwind v4 and shadcn cannot reach inside it, so it will always look adjacent to the product. A viewer, not an editor. |

### 6.3 AG Grid — the specific answer

**Five of the six capabilities in the NocoDB model are Enterprise-gated. Only column
freeze is free.**

| Capability | Tier |
|---|---|
| Rectangular range selection | 🔒 Enterprise |
| Fill handle | 🔒 Enterprise |
| Multi-cell clipboard | 🔒 Enterprise |
| Aggregation + total rows / status bar | 🔒 Enterprise |
| Row grouping / pivot / server-side row model | 🔒 Enterprise |
| Set / Multi / Advanced filters, column menu, tool panels | 🔒 Enterprise |
| Excel export | 🔒 Enterprise (CSV is free) |
| **Column pinning / freeze** | ✅ **Community** |
| Sorting, sizing, moving, row selection, infinite row model | ✅ Community |

**For a greenfield team, buy AG Grid. For this estate, don't.** You already own range
selection, fill, TSV paste coercion, keyboard nav and undo — tested, on TanStack. AG Grid's
advantage over that position collapses to *aggregation footer + multi-column freeze + set
filters*, roughly a fortnight, while costing a licence, a **354 kB** foreign bundle, and a
design system that must be re-skinned across six apps **while Neon Electric is already
mid-repair**. It also contradicts the 2026-08-17 ruling.

**This independently reproduces the ruling already on the books:**
`docs/plans/20260817-estate-completion-plan-v1.00D.md` §3.1 — *grid library = TanStack
Table v9 headless; AG Grid and Glide rejected, AG Grid kept only as an escape hatch.*

### 6.4 The adopted stack

> **`@bsuite/data-grid` (TanStack Table v9 + Virtual) for the grid · `react-querybuilder`
> (MIT, official shadcn registry, 371k weekly downloads, releases every few days) for
> filters, with a PostgREST `or=()`/`and=()` rule-processor · `pg-meta` (MIT, vendored) for
> schema introspection · `cmdk` (already in shadcn) over a Postgres FTS RPC for ⌘K ·
> Recharts + Tremor copy-paste for charts · Supabase/PostgREST for data, RLS as the only
> authorization boundary.**

Every element is MIT/Apache, React 19 + Tailwind v4 compatible, needs no server the estate
does not already run, and can wear Neon Electric.

**Also worth taking, framework-agnostic, from the reference's dependency list:**
`cronstrue` (turns a cron expression into *"At 09:00 AM, Monday through Friday"* — exactly
what makes S3 stop feeling half-built; NocoDB declares it and never uses it) and the
`useQuerySession` epoch-guard pattern (~30 lines, makes type-ahead filtering feel solid
instead of flickery).

---

## 7. OPTIONS

### Option 1 — Consolidate onto one surface and complete it to the documented requirement

Promote **S5 `/admin/data` → Browse** into the canonical Data Workspace, with the S2
builder relocated *into its toolbar* and the runner's renderers layered onto the same
grid. **S6 stays exactly as it is** (minus its Rows tab) as the developer console — it is
the best-functioning surface and answers a different requirement (R-27) that the reference
does not even have.

Note the correction to the brief's framing: **the consolidation target is S5, not S6.**
S6 is the best-*functioning*, but it is service-role and RLS-bypassing (§2.2) and cannot
become the general-user data surface without a second read path. S5 already has the
RLS-respecting write engine, the catalogue, the tenant scoping, and the only true per-cell
editor.

**Deleted:** S2 as a route (becomes the toolbar) · S6's Rows tab · `saved_views` ·
`report_preferences` · four of five grid components · `report-form-dialog.tsx`.
**Kept:** S1 (launcher), S3 (schedule — a capability the reference lacks), S4 (import —
best-built surface in the set), S6 (developer console).

- **Effort: 14–20 engineer-weeks** to genuinely complete, not to demo. Roughly: data-grid
  → TanStack v9 + multi-column freeze + aggregation footer + group-by (3–4w) · View object
  CRUD on `report_configs` + URL addressability + `report_scope` lock semantics (3w) ·
  header filters + PostgREST emitter (2w) · **R-36 FK chips: add `references_entity_key` /
  `display_column` / `enum_options` to `report_catalog_fields` + an EntitySelector cell
  renderer (2w)** · **R-18 server-declared `is_writable` from `has_column_privilege()`
  (1w)** · gallery/kanban/calendar renderers (3w) · server-backed ⌘K (1–2w).
- **Blast radius:** ~15,500 LOC touched; 5 routes changed, 1 deleted; three saved-view
  stores collapsed to one (**data migration required**); 36 `EnhancedDataTable` importers
  eventually affected (phase 2, not phase 1). RLS unchanged. No new framework, no new
  build path, no second theme.
- **The failure mode that would make me regret it:** *it becomes surface number seven.*
  If the View object ships before the grid can group and subtotal, or the toolbar ships
  before S2 is actually deleted, the estate gains a partial surface and keeps six others.
  **Mitigation, and it is non-negotiable: nothing ships until the deletion in the same PR
  set.** ADR-0008's own rule — *"no dual-path interim states, no `@deprecated` markers
  shipped."* Second risk: TanStack Table v9 went stable **2026-08-04, eighteen days ago**;
  its `cellSelectionFeature` is unproven at scale. Mitigation: the v8-based selection code
  already works — treat v9 as an optimisation, not a prerequisite.

### Option 2 — Adopt an open-source React component or framework as the spine

Take Refine (or React Admin, or a Teable/Supabase-Studio extraction) as the structural
spine and build the surface inside it.

- **Effort: 9–14 engineer-weeks** *if the spine fits*, 20+ if it does not.
- **Blast radius:** a new framework's conventions propagate into routing, data fetching and
  authorization across whichever apps adopt it. Refine's `resources` registry and
  `routerProvider` want to own routing shape across six apps.
- **The failure mode:** **the authorization model.** Every credible candidate either owns
  authz in application code (Refine's `accessControlProvider`, React Admin, Directus,
  NocoDB) or bypasses RLS outright (Supabase Studio's `supabase_admin` connection). This
  estate's requirement *is* the permission model — N-4 rejected the clones on precisely
  this ground: *"abandoning the permission model, which is the requirement."* You would
  stub the authz layer, at which point you are paying framework tax for hooks that TanStack
  Query already provides, and you have solved ~15% of the problem — none of the View
  persistence, grid, schema-editing, ⌘K or kanban work. Second failure mode: Refine has
  been silent for 4.5 months.
- **Honest note:** the *component* half of this option is not rejected — it is **already
  folded into Option 1** (react-querybuilder, pg-meta, cmdk, Recharts, cronstrue). What is
  rejected is adopting a framework as the *spine*.

### Option 3 — Implement the atmosphere/NocoDB model natively, reusing existing pieces

Build the full seven-decision interaction model — one hierarchy, grid-primary, View as
permissioned object, ⌘K, schema-from-grid, nine renderers, live feedback — across the
estate as a first-class new capability.

- **Effort: 30–45 engineer-weeks.** This is Option 1 plus: cross-app entity reach (R-3,
  explicitly marked *"not v1"* in the 2026-08-08 plan and never built), the remaining six
  renderers, public share links, row-expand panels, revision-history UI, per-recipient
  redaction, drill-through, and the `@bsuite/schema-builder` repair (R-28, broken since
  2026-05-03).
- **Blast radius:** the whole estate. Every one of the 36 `EnhancedDataTable` call sites,
  the dashboard system, the page-builder question (a *third* canvas system that has not
  been adjudicated), and the D-66 sweep.
- **The failure mode, and it is the historically observed one:** **this is the option that
  has already been attempted five times and produced the six surfaces.** Every one of them
  was a sincere attempt at exactly this. The scope is large enough that it is always
  90% done, which is indistinguishable from half-finished from the outside. It also
  violates N-8 in spirit — a 40-week plan is a deferral wearing a Gantt chart.

### 7.1 Comparison

| | Option 1 Consolidate | Option 2 OSS spine | Option 3 Full native model |
|---|---|---|---|
| Effort | **14–20 wk** | 9–14 wk (if it fits) / 20+ | 30–45 wk |
| New framework | none | **yes** | none |
| Second theme implementation | no | **likely** | no |
| Fights RLS | no | **yes — every candidate** | no |
| Contradicts an existing ruling | no | **N-4** | no |
| Reuses `@bsuite/data-grid` | **yes** | no | yes |
| Surfaces deleted | **S2, S6-Rows** + 3 tables + 4 grids | unclear | S1, S2, S4, S5 eventually |
| Requirements closed | R-1,5,8,9,10,12,13,14,15,18,21,23,34,35,36,37,38 | few | nearly all |
| **Probability of reaching genuinely complete** | **high** | low–medium | **low** |

---

## 8. RECOMMENDATION

**Adopt Option 1.** Consolidate onto S5 `/admin/data` as the canonical Data Workspace,
relocate the S2 builder into its toolbar, keep S1/S3/S4/S6 in reduced and explicit roles,
and delete the rest **in the same PR set that ships the replacement**.

Four reasons, in order of weight:

1. **It is the only option that plausibly terminates.** Braden's stated complaint is
   half-finished duplicative attempts. Option 3 is what produced them. Option 2 introduces
   a framework whose central abstraction fights the estate's central requirement. **The
   standard set for this recommendation was "prefer the option most likely to reach
   genuinely working and complete, even if it is the least ambitious." That is Option 1,
   and I am naming it plainly.**
2. **It is what has already been ruled.** N-4 (no vendored clone), N-1 (no new route), N-2
   (extend `report_configs`), the 2026-08-17 grid ruling (TanStack v9, AG Grid rejected),
   and the 2026-08-17 contest result (*"crm7 catalogue engine + `@bsuite/data-grid` WINS"*).
   Option 1 is the execution of decisions already made. Options 2 and 3 re-open them.
3. **The parts already exist and are good.** The catalogue is real (89/1,297/124). The
   scope model is correct and RLS-enforced. The grid has range/fill/paste/undo with tests.
   S6 is fully token-compliant and has zero inert controls. The estate's own diagnosis is
   right: *not absence — non-composition.*
4. **The reference lacks two of the six surfaces' capabilities.** NocoDB OSS has no
   scheduler and no SQL console. S3 and S6 are not redundancy to be deleted; they are
   coverage the reference does not have.

### 8.1 The single strongest counterargument, stated fairly

**Option 1 preserves the organising principle that caused the problem.**

The reference's power is that there is *one noun*. Option 1 ends with five routes —
a launcher, a workspace, a scheduler, an importer, and a developer console — plus a rule
that they must not overlap. That rule has been written before and has not held. Braden
already ruled *"no new `/data` route"* and got six data-named destinations anyway. A
consolidation that leaves five doors is a consolidation that can silently become six again,
and the DRY rule is only as strong as the next agent's willingness to read it.

Option 3, for all its cost, is the only one that removes the *structural possibility* of
the failure rather than forbidding it by policy.

**My answer, and I hold it:** the counterargument is correct about the risk and wrong about
the remedy. The 40-week plan does not remove the possibility — it *is* the failure, drawn
out. The observed evidence is that ambitious plans in this domain have produced partial
surfaces five times running; there is no reason to expect the sixth attempt to behave
differently.

But the counterargument earns two hard concessions, and they are conditions of the
recommendation, not decorations:

- **The deletion ships in the same PR set as the replacement.** No dual-path interim state,
  no `@deprecated` marker, no follow-up issue. If a PR cannot delete, it does not merge.
  This is already ADR-0008's rule; it just has to be enforced this time.
- **A CI gate, not a doctrine.** Add a lint rule asserting exactly one grid component,
  exactly one saved-view table, and exactly one report-definition path — the mechanical
  form of R-33 and R-34. Doctrine has not held here. A failing build will.

---

## 9. WHAT NEEDS BRADEN'S RULING — not decided here

| # | Question | Why it cannot be decided for him | Blocking? |
|---|---|---|---|
| **B-1** | **R-5 / Decision 1 — is a report an editable VIEW of records, or a read-only saved question?** `crm7/docs/20260813-report-builder-design-v1.00D.md` §0, 2026-08-13: *"This is the whole question, and it has never actually been put to you."* Still open nine days later. | **Everything in §4 and §7 is downstream of this.** Option 1 assumes "editable view". If the answer is "saved question", the recommendation changes materially. | **YES — blocks everything** |
| **B-2** | **Consolidation target: S5 or S6?** The brief proposed promoting S6. This ADR recommends **S5**, because S6 is service-role and RLS-bypassing (§2.2) while S5 has the RLS-respecting write engine. | Reverses an instruction in the brief, on evidence. Needs confirmation. | **YES** |
| **B-3** | **Gate G1** — *"no new data surface may be built before `<DataState>` ships, all 11 sites replaced"* (`docs/plans/20260817-estate-completion-plan-v1.00D.md:640`). `resolveDataState`/`DataUnavailable` exist in `packages/ui`. Does consolidating an existing surface count as "a new data surface"? | It is his gate. | **YES — procedural** |
| **B-4** | **R-40 / NX-26** — is "reports" a page inside crm7 or a federated module? *"this is a ruling, not a task."* | Determines whether the Data Workspace lives in crm7 or BSU. | **YES** |
| **B-5** | Decision 2 — the eight broken starter reports (crm7#1602 says six; it is eight): build the missing views, or withdraw them? *"These are the reports a regulator asks for."* | | No |
| **B-6** | Decision 3 — drop the empty `financial_reports` table, or leave it? | | No |
| **B-7** | `report_catalog_derived_measures` — dead schema with a complete SQL compute engine and zero call sites. **Wire it or drop it.** | | No |
| **B-8** | `@bsuite/page-builder` / `tenant_page_layouts` / `CustomPageRenderer` — a **third** canvas system beside dashboards. *"Decide whether it is the page shell or a competitor before either grows."* | | No |
| **B-9** | **ADR filing convention.** This document follows the dated `docs/` convention as instructed. The estate also has `docs/adr/ADR-NNNN-kebab-case-title.md` (next free: **ADR-0009**) with a mandatory index row. Should this be re-filed as ADR-0009? **Note the history:** ADR-0008 was ratified as "ADR-0004", collided, **lost its index row and was unreachable for three months.** | | No |
| **B-10** | **The `/settings/data` Browse gap.** `browseDataService.ts:1-12` names both `/admin/data` and `/settings/data` as targets; only `/admin/data` was wired. Is the org-admin tier meant to have Browse (R-32), or was S4 deliberately import-only? | | No |

**Also flagged, not a ruling but a correction:** `docs/20260821-atmosphere-evaluation-v1.00F.md`
evaluated the wrong repository (the JVM `Atmosphere/atmosphere`, not
`GaryOcean428/atmosphere`). Its conclusions about JVM adoption are irrelevant to the
question asked. Its §3 findings about the report engine — inline "queued" path, nothing
draining the queue, no progress feedback — remain accurate and are incorporated above.
This document supersedes it.

---

## 10. STORYBOOK — the answer

**Not now. Yes, in Phase 3, and only with an owner and a CI gate.**

**The binding constraint is not component duplication or token drift — it is the six
half-built surfaces.** Storybook is a catalogue. It shows you what exists; it does not
merge anything. Standing it up today would document five grid components and three
saved-view stores beautifully, and delete none of them. Worse, it would produce the exact
artefact Braden has objected to most: another surface that looks complete and does not
close a requirement. D-59: *"filing is not addressing."* A story is a filing.

**But the yes is real, and the reasoning is specific.** Storybook is the natural enforcement
point for the token system being specced right now, and it catches one class of bug
particularly well: **states that are visually indistinguishable** — focused vs resting,
disabled vs read-only, loading vs empty. That class is expensive to catch by hand and
trivial to catch in a story grid rendering every state side by side. It is also the only
practical way to prove R-11 (*a permission denial must never render as an empty grid* —
"this estate's most-repeated defect") without a live database: a story for `denied` beside
a story for `empty` makes them provably different at build time.

Measured against the current situation: S6 has **zero** hardcoded colours and **67** token
usages, and its focus states are token-driven rings. **Token drift is not currently the
problem on the best surface.** That is evidence for "later", not "never".

**Ordering:**

1. **Phase 1 — Consolidate.** No Storybook. Delete four grids and two saved-view stores.
2. **Phase 2 — After exactly one grid exists**, add Storybook scoped to **`packages/ui` +
   `packages/data-grid` only.** Not app pages. Stories for every state of the grid, every
   `<DataState>` variant (which also discharges Gate G1's evidence requirement), and the
   full token palette.
3. **Phase 3 — Wire it to CI** with an accessibility addon and visual-regression snapshots.
   **A Storybook that does not fail a build is a Storybook nobody updates.**

**The maintenance cost, stated plainly:** an unowned Storybook rots in about one quarter,
and a rotted one is worse than none — it becomes a confident, wrong reference that agents
read and copy. The only version worth building is one where **adding a component without a
story fails CI**. If that gate will not be added, do not start. Scoping it to two packages
instead of six apps is what makes that gate affordable.

---

## 11. MIGRATION PATH

Every phase deletes something. **Nothing ships without its deletion in the same PR set.**

### Phase 0 — Unblock (days). Requires B-1, B-2, B-3.
- Obtain rulings B-1 (view vs question), B-2 (S5 vs S6), B-3 (G1 applicability).
- **Delete nothing yet.** Nothing is safe to delete before B-1.
- Fix two truth defects that are cheap and are actively lying to users:
  - `reportViewPreferences.ts:180` hardcodes `sort: []`, while `/reports/[key].tsx:361`
    tells the user *"Your filters, columns, and sort are saved."* **Either persist sort or
    stop claiming it.**
  - S2's *"Track changes"* switch (`create.tsx:325-327`) and its
    *"Track changes: enabled (audit columns)"* label (`:342`). **Delete the control** — the
    tag has zero readers.

### Phase 1 — One grid (3–5 wk).
- `@bsuite/data-grid`: multi-column freeze, aggregation footer, group-by with subtotals
  (**R-9**), row-expand panel (**R-38**), add-row (**R-15**).
- Migrate `ReportTable` (2 importers) and `uplift/DataTable` (9) onto it.
- **DELETE:** `ReportTable.tsx`, `uplift/DataTable`.
- **Safe when:** the data-grid has aggregation + group-by, and `ReportTable`'s chart/board/
  calendar renderers have been re-hosted on it.

### Phase 2 — One saved-view object (2–3 wk). Requires B-1.
- Add `scope report_scope` + lock semantics (`collaborative`/`personal`/`locked`) to
  `report_configs`, per **N-2** (no new table).
- Migrate `saved_views` rows in; point the runner at `report_configs`.
- Add `viewId` to `DashboardWidget` — **R-21**, *"this is the 'connect dashboards' ask, and
  it is one field."*
- **DELETE:** `saved_views` table + readers · `report_preferences` (already dead).
- **Safe when:** the migration is written and reversible, and every `saved_views` reader is
  repointed **in the same PR**.

### Phase 3 — Data-first workspace (4–6 wk). Requires B-1, B-2.
- **R-1:** S5 Browse opens on the last-used or a default entity with real rows. Delete the
  *"Pick an entity above to see its rows"* empty state as the landing state.
- **R-18:** add `is_writable` to `report_catalog_fields`, derived server-side from
  `has_column_privilege()`; unknown → read-only. **Delete both client heuristics**
  (`reportRowEditing.isFieldWritable`, `browseDataService.isFieldEditable`) — they
  currently disagree, so the same field is editable on one surface and not the other.
- **R-36:** add `references_entity_key` / `display_column` / `enum_options` to
  `report_catalog_fields`; render FK cells as chips with an EntitySelector picker.
  **Delete `guessReferencedEntityKey`** (`browseDataService.ts:530-544`) — it guesses the
  FK target from label text.
- **R-8:** move filters onto column headers, full nine-operator set, via
  `react-querybuilder` + a PostgREST rule-processor.
- Wire Browse into `/settings/data` for the org-admin tier (**R-32** — see B-10).
- **DELETE:** S6's Rows tab (`TablesBrowser` RowsTab) — the service-role duplicate.
- **Safe when:** S5 Browse reaches every entity S6's Rows tab reached, under RLS, and the
  developer read-all clause (**R-30**, already built) is verified for a developer with no
  membership in the target tenant.

### Phase 4 — The builder becomes the toolbar (3–4 wk). Requires B-1.
- Relocate `ReportBuilder`'s field/filter/sort/aggregate controls into the Browse toolbar.
- Live preview replaces build-then-run (**R-6**); "Save" persists a `report_configs` view.
- Make the embedded grid **editable** — remove `editable:false` (`ReportBuilder.tsx:566`)
  and the *"Preview is read-only"* toast.
- **DELETE:** the `/reports/custom/create` **route** · `report-form-dialog.tsx` (residue) ·
  the stale comment at `ReportBuilder.tsx:46-48` asserting a retired gate.
- **Safe when:** every S2 capability is reachable from the toolbar, and `create.test.tsx`
  coverage has been ported.

### Phase 5 — Finish the edges (3–4 wk).
- **R-24:** subscribe `/reports/deliveries` and S3 to `postgres_changes` on
  `report_deliveries` — the row already persists every column a progress UI needs and
  **nothing subscribes.** Add `cronstrue` so a schedule reads *"At 09:00, Mon–Fri."*
- **R-19:** render `data_change_set_items` as a cell-history panel — the data is already
  stored.
- **R-17:** row-version optimistic concurrency, server-rejected.
- **R-16:** `cell_data_update(p_edits jsonb[])` — one call per paste, not per value.
- Server-backed ⌘K over a Postgres FTS index.
- **DELETE:** the last of `EnhancedDataTable`'s report-path importers.

### Phase 6 — Storybook, per §10. Scoped to two packages, gated in CI.

### Explicitly OUT of this migration
Cross-app entity reach (**R-3**) — marked *"not v1"* on 2026-08-08 and unbuilt since; it is
a separate program. Schema-builder relationship repair (**R-28**, broken since 2026-05-03)
— has its own spec, `docs/20260822-schema-builder-ux-remediation-spec-v1.00D.md`.
The **D-66 sweep and count** (**R-31**) — open since 2026-08-13, bsuite#1960; *"the larger
half of what you asked for."*

### 11.1 Deletion list, consolidated

| Order | Delete | Precondition |
|---|---|---|
| P0 | S2 "Track changes" switch + its false label | none — the tag has zero readers |
| P1 | `ReportTable.tsx` | renderers re-hosted on `@bsuite/data-grid` |
| P1 | `uplift/DataTable` (9 importers) | data-grid has aggregation + group-by |
| P2 | `saved_views` table + readers | rows migrated to `report_configs`; readers repointed same PR |
| P2 | `report_preferences` table | already zero readers/writers |
| P3 | `reportRowEditing.isFieldWritable` + `browseDataService.isFieldEditable` | server `is_writable` shipped |
| P3 | `guessReferencedEntityKey` | `references_entity_key` shipped |
| P3 | S6 `TablesBrowser` Rows tab | S5 Browse reaches every entity under RLS |
| P4 | `/reports/custom/create` route | toolbar reaches parity; tests ported |
| P4 | `report-form-dialog.tsx` | already unreferenced residue |
| P5 | `EnhancedDataTable` report-path importers | per-call-site |
| — | `report_catalog_derived_measures` | **B-7 ruling required — do not delete unruled** |
| — | `financial_reports` (empty) | **B-6 ruling required** |

---

## 12. CONSEQUENCES

**If accepted:**
- Five grid components → one. Three saved-view stores → one. Two report-definition paths → one.
- ~15,500 LOC of surface code reduced; two dead tables removed; two client authorization
  heuristics that currently disagree replaced by one server-declared fact.
- Seventeen documented requirements close (§7.1). Nine remain, scoped out with reasons.
- **`report_scope` becomes the actual spine** rather than one of four scoping vocabularies.
- A CI gate makes R-33/R-34 mechanical rather than doctrinal.

**Costs and risks accepted:**
- The estate owns its grid permanently. No vendor to escalate to.
- TanStack Table v9 is eighteen days old at time of writing.
- Cross-app reach (R-3) — his 2026-08-08 *"all data connected of all suite apps"* — is
  **not** delivered by this plan. That is a real, named shortfall, not an oversight.
- Five routes remain. The counterargument in §8.1 is not fully answered; it is mitigated by
  a lint rule.

**If rejected in favour of Option 3,** the honest expectation, from five prior attempts:
a seventh surface, ~90% complete, in roughly 30 weeks.

---

## 13. COMPLIANCE GATE

A PR in this domain fails review unless it:
1. States **how many surfaces** the change covers and how the rest were enumerated (**D-62**).
2. Deletes its predecessor **in the same PR set** — no dual-path, no `@deprecated` (ADR-0008).
3. Adds no second implementation of: a grid, a saved-view store, a report-definition path,
   or a scoping vocabulary.
4. Ships every new entity table with its RLS policy in the same migration
   (`dry-one-shot-architecture` rule 5).
5. Uses `EntitySelector` for any FK field — never free text (rule 2, CI rule
   `no-free-text-where-fk`).
6. Reports per item: **closed with evidence · open with an owner and a date · not started
   with a reason** (**D-85**). A filed issue is not an addressed defect (**D-59**).
