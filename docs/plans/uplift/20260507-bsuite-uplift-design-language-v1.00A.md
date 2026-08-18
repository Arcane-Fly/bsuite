# BSuite Uplift — Unified Design Language

**Operator directive (2026-05-07T08:31 AWST):** "ALL need an upluift including reports... noting that airtable is already PART of the broader feature pareity set. there is plenty of existing research for like features in the repo that have plans and the link consider those too so we have consistent design accross all."

**Operator directive (prior, 2026-05-07T08:00 AWST):** "no task or issue or feature or anything can be done without a red team sweep AND that sweep should include a specific UX agent that advocates for simplest and most intuitive and powerful UX design choices."

**Status:** A (Approved) — matches the `v1.00A` filename marker.

> **Marker correction, 2026-08-17.** This line read *"DRAFT — to be promoted to ACTIVE upon operator
> review"* while the filename said `A`. The filename was right and the body was stale: the review
> happened, the 9-wave rollout was authorised, and it has been executing since under tracking issue
> **bsuite#635** (W0 and W1 complete, W4 scoped and landed). `docs/plans/uplift/INDEX.md` indexes
> this file as the design-language spec, and five other documents cite it as settled doctrine.
> An *Approved* marker sitting on a body that says *awaiting review* invites the next agent to
> re-open a decision that was already made — which is the whole failure mode this sweep exists to
> stop. The body now matches.

**Authority:** This document defines the unified design language that ALL BSuite UI work must conform to going forward — Feature Builder, Reports, Pay Item Groups, Permissions, Portal Admin, Tenant Admin, Branding, Schema Builder, Page Builder, every CRUD surface, every read surface.

**Scope:** All 6 portal sub-plans + Visual Feature Builder + Reports + every Codehouse parity domain.

**Supersedes:**
- Surface-level fixes in BSU#358 + BSU#359 (chips, datalist, dimmed tabs) — these were polish, not the redesign the operator demanded.
- Any future PR that ships a new admin surface without applying this language.

**References (do NOT restate, link only):**
- `bsuite/docs/plans/20260507-feature-builder-ux-red-team-v1.00W.md` — the existing red-team plan (Claude-authored, captures Q1–Q3 strategic questions, Supabase Studio bar, Airtable cmdk pattern, role × operation matrix). This document operationalises that plan.
- `bsuite/docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md` — index plan covering 21 parity domains across 9 portals.
- `bsuite/docs/plans/20260506-codehouse-parity/` — 9 portal sub-plans + visual feature builder spec.
- `bsuite/docs/20260506-reports-parity-spec-v1.00W.md` — Reports parity spec (4 standard reports + Consultant KPI + LSL + Pay Items by Employee).
- `bsuite/docs/20260506-apprentice-placement-avetmiss-nat00120-mapping-v1.00W.md` — Apprentice placement L4 spec.
- `bsuite-state/20260507-red-team-ux-doctrine-v1.0ACTIVE.md` — UX-DX agent doctrine + 16-item checklist.

---

## 1. Why a unified design language

Operator has reviewed three surfaces in the last 24 hours and rejected each:

1. **Feature Builder** — "almost identical" after BSU#359; chips look clickable but aren't, 8-tab nav, free-text FK input, Live SQL panel
2. **Reports** (per operator directive — "ALL need an uplift including reports") — implied gap: report list, filter form, results table, export bar are not aligned with Feature Builder visuals or vocabulary
3. **Page editor / canvas** (bsuite#538, #539, #545) — column slider, resize handle, edit-page button — three separate surface fixes shipped without a unifying interaction model

The pattern: each surface gets fixed in isolation, vocabulary and components diverge, and the operator hits the next surface to find another bespoke set of bad decisions.

**A unified design language fixes this once.** Every surface that adds, edits, lists, or filters data uses the same primitives in the same vocabulary.

---

## 2. The 12 design primitives

Every BSuite admin surface is built from these 12 primitives. No bespoke alternatives.

| # | Primitive | Single source of truth | Used in |
|---|---|---|---|
| 1 | **Stepped Workspace** | `<StepperShell>` — vertical stepper on left, content panel on right, current step labeled, completed steps with check, future steps dimmed-but-clickable | Feature Builder, Tenant onboarding, Apprentice placement creation, Report creation wizard |
| 2 | **Scope Selector** | `<ScopeSelect>` — 4 fixed options: Tenant-scoped / User-scoped / Platform-wide / Public | Feature Builder Step 2, Report visibility, Branding scope, Permission scope |
| 3 | **Track-changes Toggle** | `<TrackChanges>` — single switch that enables created_by/at + updated_by/at + deleted_at + revision history; explains in plain English what audit trail is | Every entity surface |
| 4 | **Picker** | `<EntityPicker>` / `<RoutePicker>` / `<RolePicker>` / `<UserPicker>` / `<TablePicker>` — Combobox backed by live data with search, recent, and "create new" affordance | Anywhere a reference to existing data is needed |
| 5 | **Command Palette (cmdk)** | `<AddFieldPalette>` / `<AddReportPalette>` / `<AddCardPalette>` — categorised, searchable picker invoked by `+ Add field` / `+ Add report` / `+ Add card` button or `⌘K` | Feature Builder, Page Builder, Report Builder |
| 6 | **Sortable Rows** | `<SortableList>` from @dnd-kit/sortable — drag handle in first column, keyboard reorder, undo on drop | Field rows, report column order, page-builder card order, nav-builder, role-permission matrix rows |
| 7 | **Permission Matrix** | `<PermissionMatrix>` — role × action grid with checkbox cells; 4 plain-English presets above; advanced row-level rules behind toggle | Feature Builder Step 3, Report visibility, Page permissions, Workflow steps |
| 8 | **Live Preview Pane** | `<LivePreview>` — renders the actual UI (sample data) the operator is configuring; never raw JSON or SQL | Feature Builder Step 2, Report builder, Page builder, Branding |
| 9 | **Filter Bar** | `<FilterBar>` — date range, multi-select chips for entity references, free-text search; chips show clear-X; "Save filter as preset" | Reports list, Apprentice placements list, Tenant list, Audit log |
| 10 | **Results Table** | `<DataTable>` — TanStack Table + shadcn primitives, paginated, sortable headers, column visibility menu, row actions menu, bulk select, CSV/PDF export bar | Reports results, all admin lists |
| 11 | **Empty State** | `<EmptyState>` — illustration + headline + 1-line subhead + 1 primary CTA (always something the user can do, never just "no data") | Every list before data, every step before configuration |
| 12 | **Technical Details Disclosure** | `<TechnicalDetails>` — single toggle/accordion at the bottom of any config screen that reveals the SQL/migration/RLS/JSON the system is generating | Feature Builder Step 5, Report SQL view, Page layout JSON view, Permission RLS view |

If a surface needs something not on this list, **the design language is wrong and must be extended via a new draft of this document — do NOT ship a one-off**.

---

## 3. The vocabulary contract

Internal-engineering terms NEVER appear in the default UI. They appear only inside `<TechnicalDetails>` (primitive #12).

| ❌ Internal term (forbidden in default UI) | ✅ Operator-facing term |
|---|---|
| tenant_id, owner_id, deleted_at, created_at | "Track changes" toggle (audit columns auto-applied) |
| Foreign key column, FK target table | "Link to: [entity name]" |
| ON DELETE CASCADE / SET NULL / RESTRICT | "What happens when the [parent entity] is deleted?" — 3 plain-English options |
| RLS policy, SECURITY DEFINER, INVOKER | "Who can see/edit this?" with role × action matrix |
| Migration, schema, DDL, apply_migration | "Ship this feature" / "Save changes" |
| Live SQL preview | "Live preview" (renders the UI, not the SQL) |
| uuid, varchar, jsonb, numeric, timestamptz | Single-line text / Long text / Number / Money / Date / Yes-no / Email / URL / Image / File / Link to entity / List of entities |
| chips | tags / badges (or remove the term — primitive should self-describe) |
| stub tab / phase N / lock icon | (don't ship locked tabs at all — see §5.4) |
| MCP, Edge function, GoTrue, Postgres | "Background process" / "Saved" / system-level — only in `<TechnicalDetails>` |
| Authorization, OAuth client, JWT claim | "Sign-in" / "Permissions" — only in `<TechnicalDetails>` |
| Apply via Supabase MCP apply_migration | (this string is forbidden in any user-facing UI) |
| client_id, tenant_id (in RLS expressions) | "this organisation" / "this user" |

Compliance check: search the codebase for any of the left-column strings appearing in `*.tsx` outside test files and `<TechnicalDetails>` blocks. If any match, that's a doctrine violation.

---

## 4. The Scope Selector (the single biggest IA win)

The current Feature Builder forces the operator to manually add `tenant_id` for tenant-scoped data. Replace this with a single 4-way selector that drives all auto-emit logic:

```
Who is this data for?
─────────────────────────────────────────────────────────────────
○ Tenant-scoped (default)
  Each organisation sees only their own records.
  Auto-applied: tenant_id (linked to organisations), RLS WHERE tenant_id = auth.tenant_id()

○ User-scoped
  Each signed-in user sees only their own records.
  Auto-applied: owner_id (linked to users), RLS WHERE owner_id = auth.uid()

○ Platform-wide
  All signed-in users see everything. (e.g. industry templates, country list)
  Auto-applied: read-all RLS, write restricted to platform_admin

○ Public
  Visible to anyone, including signed-out visitors. (e.g. marketing pages)
  Auto-applied: read-all RLS for anon role, write restricted to platform_admin
```

The selector replaces three separate things in the current Feature Builder:
- Manual chip add for `tenant_id` / `owner_id` / `deleted_at`
- The "Permissions" tab's first decision
- The portal-targeting decision in the Surface step

The 4 options are named for the operator's mental model, not the database's. The system writes the right migration + RLS + audit columns based on the selection.

**Same selector appears in Reports** — choose whether a report is tenant-private, user-private, platform-wide template, or public dashboard. Same vocabulary, same component.

**Same selector appears in Branding** — choose whether a branding override is platform-default, tenant-override, or sub-organisation-override.

---

## 5. Information architecture rules

### 5.1 Vertical stepper, not horizontal tabs

The 8 horizontal tabs (Entity / Page / Logic / AI / Permissions / Portal / Export / Verification) are dead. Replace with a 5-step vertical stepper everywhere a multi-step config exists:

```
1. Describe       — what is this in plain English?
2. Data           — what fields/columns?
3. Access         — who can see / edit?
4. Surface        — where does it appear?
5. Ship           — review + go live
```

Same 5 steps for: Feature Builder, Report Builder, Permission Editor (where Step 1 is "Describe the role"), Tenant onboarding, Apprentice placement creation. Different content per step but identical shell.

### 5.2 No locked / stub tabs

Currently 6 of 8 tabs are stubs with lock icons + "Stub — ships in Phase N" tooltip. **Don't ship locked tabs.** Either the feature exists and has a tab, or it doesn't and there's no tab.

Replace with a single "Roadmap" link at the bottom of the sidebar that lists what's coming. The user opts in to seeing roadmap; the workspace doesn't constantly remind them what's missing.

### 5.3 Progressive disclosure, defaults that work

Every step shows the smallest possible set of decisions by default:

- **Step 1 Describe:** name + description only. AI-generate-the-rest as a secondary CTA.
- **Step 2 Data:** Scope Selector + Track-changes toggle ON + 1 empty field row. Click `+ Add field` to add more. cmdk palette suggests common fields based on entity name ("Customer order" → suggests Total, Customer, Items).
- **Step 3 Access:** 4 plain-English presets visible, selected = "Members read, admins edit". "Show advanced" reveals the matrix.
- **Step 4 Surface:** "Where does this appear?" with checkbox group of apps + route picker. Layout slot defaults to "Main content".
- **Step 5 Ship:** plain-English summary + single "Ship this feature" button. SQL/migration behind "Show technical details".

### 5.4 Empty states are inviting

Every list, every step, every panel has an empty state with:
- Illustration (not an icon — illustration sized 80–120px)
- Headline ("No reports yet")
- Subhead one line ("Build your first report or pick a template")
- Primary CTA ("Create report") and secondary CTA ("Browse templates")

Forbidden: blank panels, "0 results", "No data".

### 5.5 Two-click rule

Common operator tasks reachable in ≤2 clicks from the relevant landing page:
- "Add a new column to existing entity" — entity row click → "+ Add field"
- "Run a report for last week" — Reports → date preset
- "Invite a user" — Users → Invite
- "Create a feature" — Developer Portal → New feature

If a task takes 3+ clicks, the IA is wrong.

---

## 6. Per-surface mappings — what changes in each existing surface

This section maps the 12 primitives onto each Codehouse parity domain so the implementing agent knows exactly which existing surface gets which primitive.

### 6.1 Visual Feature Builder (BSU `/developer/feature-builder`)

| Step | Primitives applied |
|---|---|
| Describe | StepperShell shell. Plain inputs for name + description. AI-generate as secondary CTA. |
| Data | ScopeSelect + TrackChanges (replaces tenant_id/owner_id/deleted_at chips). SortableList of FieldRow + AddFieldPalette (cmdk replaces `+ Add field` button). EntityPicker for "Link to" type. LivePreview pane below shows sample-data table. |
| Access | PermissionMatrix with 4 presets + advanced toggle. |
| Surface | RoutePicker per app. Visual layout-slot diagram (no JSON). |
| Ship | Plain-English summary. Primary "Ship feature" CTA. TechnicalDetails accordion at bottom. |

Replaces: 8 tabs, chips above field list, free-text FK inputs, RLS-policy text, Live SQL preview, "Apply via Supabase MCP" instructions.

### 6.2 Reports (CRM7 `/reports/*` and `/reports/custom/create`)

Existing reports parity spec defines: filter form + results table + export bar. Apply the design language:

| Layer | Primitives applied |
|---|---|
| Reports list (`/reports`) | DataTable (TanStack) of available report templates. EmptyState when none. FilterBar (filter by category/owner/last-run). |
| Report builder (`/reports/custom/create`) | StepperShell (same 5 steps): 1. Describe (report name + plain description), 2. Data (which entity to report on — EntityPicker; which fields to include — SortableList from selected entity), 3. Access (PermissionMatrix — who can run this report), 4. Surface (which menu it appears in, who sees it on the dashboard), 5. Ship. |
| Report run page (e.g. `/reports/timesheet-summary`) | FilterBar at top (date range + EntityPicker chips for employee/client). DataTable of results. Export bar bottom (CSV / PDF buttons). LivePreview during filter editing — table updates as filters change, debounced 300ms. |

Replaces: bespoke filter forms, result-table-only reports, missing scope context.

### 6.3 Pay Item Groups / Allowance Groups / Penalty Groups / Timesheet Groups (CRM7 settings/*)

Per Codehouse parity row 21–24 (closed in #569), these are admin CRUD surfaces. Currently each is its own bespoke screen. Apply the design language:

| Surface | Primitives applied |
|---|---|
| List page | DataTable + FilterBar + EmptyState |
| Create / edit | StepperShell (3 steps: Describe → Items → Ship — Access is implied since these are tenant-scoped admin tables) |
| Items step | SortableList of items with AddFieldPalette-style cmdk for adding from existing pay items |

### 6.4 Permissions Editor (BSU `/admin/permissions`)

Currently the in-flight BSU#346 Phase 5 Permissions Visual Editor. Apply the design language:

| Layer | Primitives applied |
|---|---|
| Editor surface | Pure PermissionMatrix view at the top: roles down rows, capabilities across columns, checkbox cells. ScopeSelect at top right ("Showing: this tenant" / "Showing: platform-wide"). |
| Bulk actions | Apply preset to selected role. Copy permissions from another role. |
| Advanced | Per-row RLS expression editor (SQL) behind TechnicalDetails toggle. |

Replaces: BSU#346's 7,254-LOC implementation that operator has not yet seen but which based on the Phase 5 patterns is unlikely to follow this language.

### 6.5 Tenant Admin (BSU `/admin/tenants`, `/admin/tenants/:id/sub-organizations`)

| Surface | Primitives applied |
|---|---|
| Tenant list | DataTable + FilterBar + EmptyState |
| Tenant detail | StepperShell (1. Describe → 2. Branding → 3. Permissions → 4. Sub-organisations → 5. Audit) |
| Sub-org tree | Indented DataTable with tree-row primitive (NOT a separate "tree view"; reuse the table) |

### 6.6 Branding (BSU `/admin/tenants/:id/branding`)

ScopeSelect at top (platform default / tenant override / sub-org override). LivePreview pane shows actual rendered components. TechnicalDetails reveals OKLCH tokens.

### 6.7 Apprentice placements (CRM7 `/placements`, `/apprentices`)

Per AVETMISS NAT00120 spec. Apply:
- Placement list = DataTable + FilterBar
- Placement create/edit = StepperShell (Describe / People / Dates / Funding / Compliance)
- Apprentice profile = read-only summary + DataTable of placements

### 6.8 BOOT compliance + AI assistant + offline PWA (CRM7)

These are CRM7-specific over-deliveries. They keep their bespoke surfaces BUT must use the 12 primitives for any data-list, filter, or config screen they include.

---

## 7. Domain-language relationship templates

When the operator picks "Link to" type for a field (Feature Builder Step 2) or "Filter by" (Reports), the EntityPicker offers categorised templates that match the operator's domain vocabulary, not the database schema:

```
Categories:                        Common templates:
─────────────────────────────────  ─────────────────────────────────
Identity                           Link to apprentice
Payroll                            Link to client
People                             Link to employee
Workflow                           Link to job / placement
Compliance                         Link to timesheet
Reports                            Link to pay item
Custom                             Link to allowance
                                   Link to penalty
                                   Link to organisation / tenant
                                   Link to user
                                   ...
```

These templates carry the operator-language label but stamp the correct underlying schema (FK column = `id`, on-delete = CASCADE, comment = "Reference to apprentice record").

The category list is the same across Feature Builder, Reports, Pay Item Groups, Permissions — wherever a domain reference is needed.

---

## 8. Component hand-off — what every PR must do

Any PR that touches an admin/CRUD surface must:

1. **Import the 12 primitives from a single canonical package.** Recommended location: `business-suite-unified/src/components/uplift/` (mirrored to `crm7/src/components/uplift/` etc. via codemod or shared package). Do not re-implement.
2. **Use the vocabulary contract.** No internal terms in default UI; only in TechnicalDetails.
3. **Include the §3.2 UX-DX checklist (16 items) ticked off in the PR body.**
4. **Include before/after screenshots of every surface touched.** Light + dark mode.
5. **Include a Playwright test that validates the Two-click rule for the primary task on this surface.**
6. **Include a §2.2 red-team table.** UX-DX role's verdict references THIS document by section number.

PRs that add a primitive must update §2 of this document. PRs that change the vocabulary must update §3. PRs that add a surface must add a §6 mapping.

---

## 9. Implementation sequencing — the rollout plan

The unified design language can ship in waves without blocking everything else. Each wave is one PR per app, kept small.

| Wave | Scope | Repos | LOC est. | Sign-off gate |
|---|---|---|---|---|
| **W0** | Author 12 primitives in `business-suite-unified/src/components/uplift/` (no consumer changes yet) | BSU only | ~1500 | Operator approves §2 primitives |
| **W1** | Feature Builder full redesign — applies all 12 primitives to BSU `/developer/feature-builder` | BSU | ~2000 | Operator screenshot-reviews each step |
| **W2** | Reports uplift — applies primitives to CRM7 `/reports/*` | CRM7 | ~1500 | Operator screenshot-reviews list + builder + run |
| **W3** | Pay Item Groups + Allowance Groups + Penalty Groups + Timesheet Groups | CRM7 | ~800 | One operator screenshot review covers all 4 |
| **W4** | Permissions Editor (replaces BSU#346) | BSU | ~1500 | Operator screenshot review |
| **W5** | Tenant Admin + Sub-org hierarchy | BSU | ~1200 | Operator screenshot review |
| **W6** | Branding | BSU | ~600 | Operator screenshot review |
| **W7** | Apprentice placements | CRM7 | ~1500 | Operator screenshot review |
| **W8** | Conduit + Throughput + R80.3 + Braden — ship the same primitives via shared package consumer bump | 4 apps | ~400 each | One operator review per app |

Each wave gates on `Doctrine 20260507 §2.2 + §3.2 + §1.2`.

W0 must land before any subsequent wave. W1–W8 can ship in parallel pairs once W0 is in.

**This deprecates BSU#346 (Phase 5 Permissions Editor) and BSU#359 (chips/datalist polish).** W4 is the canonical replacement for #346. The chips/datalist work in #359 is rolled forward into W1 but with the redesigned UX (chips become the Track-changes toggle; datalist becomes EntityPicker backed by live schema query).

---

## 10. Acceptance criteria — what "done" looks like

The unified design language is "done" when:

1. Operator can visit any admin surface in any of the 5 D2C apps and recognise the same 5-step shell.
2. Operator never sees `tenant_id`, `RLS`, `migration`, `CASCADE`, or `chips` as default-UI vocabulary in any of the 5 apps.
3. Operator can complete each canonical task (create feature / build report / set permissions / invite user / brand a tenant) in ≤90 seconds without consulting docs.
4. Lighthouse INP <200ms on all 12 primitives.
5. WCAG-AA in light + dark mode on all 12 primitives.
6. Mobile reflow verified at 375 / 768 / 1024 / 1440 px.
7. Every surface has Playwright test for Two-click rule on its primary task.
8. The 17 doc-drift items from #579 are reconciled — no surface mentioned in docs that isn't either built or removed.

---

## 11. Anti-patterns — the catalog of what's banned

This section names every pattern that has shown up in the recent merged work and is now banned. New PRs that introduce any of these are auto-blocked by the doctrine gate.

### From Feature Builder (post-#359 review):

- ❌ Chips that look clickable but display already-applied state
- ❌ "Live SQL preview" panel as default content (use LivePreview primitive — renders the UI, not the SQL)
- ❌ Free-text inputs for entity references (use EntityPicker)
- ❌ Free-text inputs for table/column names (use TablePicker / FieldPicker — backed by `information_schema` query)
- ❌ Locked stub tabs with "ships in Phase N" tooltip
- ❌ "Apply via Supabase MCP apply_migration" or any internal CLI string in user UI
- ❌ "ON DELETE CASCADE/SET NULL/RESTRICT" without translation
- ❌ "RLS will be enabled but the table will deny all access" scare text
- ❌ "Untitled feature" + "Optional one-line description" without explaining what a feature is
- ❌ 8+ tabs of any kind at depth-2 inside a portal
- ❌ Zod errors invisible during editing (P1-5 from claude's red-team plan)
- ❌ Manual save with no autosave indicator (P2-2 from claude's red-team plan)
- ❌ Raw JSON preview pane (P2-4 from claude's red-team plan)

### From Reports (anticipated based on the parity spec):

- ❌ Bespoke filter form per report (use FilterBar primitive)
- ❌ Result table without column visibility menu / sortable headers / pagination (use DataTable primitive)
- ❌ Export buttons named "Download CSV" / "Download PDF" without unified export bar (use DataTable's export bar)
- ❌ "Date range" inputs that aren't a unified DateRangePicker

### From Permissions (BSU#346 anticipated):

- ❌ RLS policy text editor as primary UI (use PermissionMatrix; SQL goes in TechnicalDetails)
- ❌ Per-table separate permission screens (use one screen with role × table × action 3D matrix, navigated via tabs at the top — but max 5 tabs)

### From every surface:

- ❌ Internal vocabulary in default UI (§3 contract)
- ❌ Empty panels with no CTA (§5.4 EmptyState rule)
- ❌ Save-then-refresh flows where autosave is canonical
- ❌ Error toasts with no recovery path

---

## 12. Self-validation — how this document gets reviewed

This document is itself subject to the doctrine. Before promotion W → A, it must:

1. Be reviewed by the operator (ground-truth check).
2. Be cross-referenced by claude-code-local against the existing `20260507-feature-builder-ux-red-team-v1.00W.md` plan to confirm no conflict.
3. Be cross-referenced by perplexity-computer against the 9 portal sub-plans + reports parity spec to confirm no conflict.
4. Be tested mentally against the operator's furious-rejection criteria from §1.

If any of those reviews flag a conflict, this document is wrong, not the prior document.

---

## 13. Versioning

| Version | Date | Status | Author | Changes |
|---|---|---|---|---|
| 1.0 | 2026-05-07 | DRAFT | Perplexity Computer (post-operator-feedback) | Initial draft consolidating Claude's red-team plan, codehouse parity research, reports parity spec, and operator's "ALL need an uplift" directive. |
