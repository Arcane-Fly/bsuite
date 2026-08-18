# BSuite Data Platform — Reporting, Bulk Data, and Tiered Schema Control

> **RESCUED AND RENAMED 2026-08-10.** This file sat **untracked** in the working tree from
> 2026-08-06 to 2026-08-10 under the machine-generated filename
> `https-crm-crm7-app-reports-custom-create-distributed-origami.md` — one `git clean` from being
> lost, and invisible to anyone who did not have this working copy. Committed on the operator's
> instruction, byte-identical apart from this notice, under a name that follows the
> `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md` convention.
>
> **How it relates to the successor.** `20260807-data-platform-completion-program-v1.00D.md`
> supersedes this document *as the execution plan*, and its phases P1–P9 were delivered on
> 2026-08-07 (the report catalogue went from 23 entities to 84). This document is retained because
> it is the **fuller analysis**, and because the two carry **different, both-unanswered decision
> sets** that are easy to confuse:
>
> | | This document (2026-08-06) | Successor (2026-08-07) |
> |---|---|---|
> | D1 | Grid technology — glide-data-grid vs TanStack vs AG Grid | Sub-orgs / enterprise tier |
> | D2 | Does the developer console apply DDL directly, or only via generated PR? | Catalog scope — everything or curated |
> | D3 | Are the 14 dead-GUC tables fixed inside this program or as a separate lane? | Is the catalog derived or hand-curated |
> | D4 | Sub-orgs — define `parent_tenant_id` now or design it in inert? | `min_role` default for a new field |
> | D5 | May an org admin bulk-update platform reference data? | (same question, already enforced) |
> | D6 | Supabase UI Platform Kit vs extending the in-house proxy panels | `r80_*` tables — wire or drop |
> | D7 | Does the catalog carry a per-field PII flag with its own role gate? | `apprentices` → `people` migration |
>
> Cite the date when referring to "D1" — the two D1s are unrelated questions.
>
> **What has NOT been overtaken by the successor:** §1.1, the finding that there is no query
> engine. "Billable hours per month" is still a migration rather than a configuration. Delivering
> P1–P9 grew the catalogue; it did not add joins, GROUP BY or aggregates.

**Status:** DRAFT — analysis complete, decisions required before implementation
**Date:** 2026-08-06 · **Rescued from untracked:** 2026-08-10
**Silo:** `bsuite_` · Project family: BSuite · Author: claude-code via `agent-master-orchestration`
**Method:** 3 parallel read-only `Explore` agents + 1 `Plan` design agent + live verification against Postgres `tuybltdrdefjblnplpqo` + Context7 (Gate A) + all 7 operator-supplied external references visited.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Context — why this work exists

The operator asked for four things that turn out to be **one system**:

1. `/reports/custom/create` must become a real Airtable-grade report builder with full entity/field coverage.
2. `/developer/tables` (BSU) is "currently useless" and must become a real database console.
3. Bulk **import** and bulk **update** must exist for every tier — developer, super admin, org admin, user — each safe within its own scope.
4. A developer must be able to manage schema, functions, triggers, enums, extensions, indexes, publications, policies, roles and settings with better UX and tighter control than raw Supabase.

They share one substrate: **a catalog of what entities and fields exist, who may see them, and who may change them.** Today that catalog does not exist — it is a hardcoded TypeScript array in one file. Everything downstream inherits that limitation.

Work in the last 48 hours (the Airtable-style grid rewrite, `crm7#1432`/`#1426`, and the schema-builder tenancy scope doc) was real and correct, but it improved the *shell*. The engine underneath it still cannot answer "billable hours per month."

---

## 1. Verified findings

### 1.1 The central gap: there is no query engine

`report_templates.query_definition` is a discriminated union with exactly two arms:

| Arm | What it executes | Ceiling |
|---|---|---|
| `{kind:'view', source}` | literally `supabase.from(source).select('*')` | **one table, no join, no aggregate, no GROUP BY** |
| `{kind:'rpc', name}` | one of **16 hand-written** `report_*` Postgres functions | fixed params; a new report = a new migration |

The 16 RPCs are real and good (`report_gto_billable_hours`, `report_timesheet_summary`, `report_pay_items_by_employee`, `report_gto_avetmiss_statistical_summary`, …), each taking `(startDate, endDate, employeeIds[], clientIds[], p_tenant_id, p_page, p_page_size)`.

**Consequence:** "billable hours per month" is not a configuration — it is a migration. Every genuinely new question a GTO asks requires an engineer. That is the opposite of Airtable.

### 1.2 The field catalog is a hardcoded array

`crm7/src/components/reports/ReportBuilder.tsx:103-212` — `REPORT_SOURCES` is a static TS literal: **9 sources, ~30 fields**, against a database of **~280 tables**.

`JOIN_DEFINITIONS` (`:232-276`) declares 5 joins that are **display-only** — they render in the "technical details" panel but are never executed. The preview issues independent per-source `select()`s and stitches them client-side by row label. One join carries a code comment marking it **known-broken**: `apprentices.current_host_employer_id → host_employers.id` actually needs a two-hop path through `clients`, so it "silently matches nothing for correctly-written rows."

A silent wrong join in a reporting tool is the worst failure mode available: it produces a confident, plausible, wrong number.

**It is worse than "display-only" implies.** `reportService.fetchReport` (`:34-80`), which backs the live preview, issues independent `.from(table).select(fields).limit(5)` calls per source and interleaves results *by source order* — so even the preview never matches a join key. And `saveReportDefinition` (`:135`) writes the definition into `report_configs.parameters.report_definition`, a column **nothing reads back**. The builder's "Save definition" button produces a dead-end row.

### 1.3 Nobody has ever successfully saved a custom report

Live: `report_templates` holds **23 rows, all `scope='platform'`**. Zero `enterprise`, zero `tenant`, zero `user`. The 4-scope hierarchy, its CHECK constraint and its four per-scope RLS write policies all exist and were hardened as recently as 2026-08-05 — but no tenant or user has ever produced a row through them.

Similarly: `saved_views` 0 rows · `tenant_user_saved_views` 0 rows · `report_configs` 0 rows · `form_layouts` 0 rows · `custom_fields` 0 rows · `ui_config_overrides` 0 rows.

Six persistence surfaces, built, wired to no successful writer. This is the estate's dominant failure signature and the plan must treat "a row appears in this table from the UI" as the completion test, not "the code compiles."

### 1.4 Bulk import: two tables, both empty, no UI reaching them

| Table | Rows | Shape |
|---|---|---|
| `data_import_jobs` | **0** | `tenant_id, name, entity_type, file_name, file_url, format, status, field_mapping jsonb, total_rows, imported_rows, failed_rows, errors jsonb, started_at, completed_at, created_by` |
| `employee_imports` | **0** | `filename, status, total_rows, processed_rows, error_rows, column_mapping jsonb, errors jsonb, …` — **no `tenant_id` at all** |

`data_import_jobs` is a genuinely well-shaped job table — it already anticipates field mapping, partial failure and error capture. It has never been written to. `crm7/src/pages/settings/import-wizard.tsx` exists and uses `papaparse`, but nothing connects it to the job table, and BSU has **no import path whatsoever** (no `papaparse`, no `xlsx`, no upload UI in the developer portal).

There is **no bulk-update path anywhere** in any app, for any tier.

### 1.5 `/developer/tables` is thin — and a better version already exists, unlinked

`business-suite-unified/src/pages/Developer/Tables.tsx` (283 lines): a flat list of table names → click → **top 50 rows** in a hand-rolled `<table>`, columns inferred from `Object.keys(rows[0])`, every cell truncated. No types, no FKs, no sort, no filter, no pagination, no edit, no export.

Meanwhile the same repo already ships:

- `supabase/functions/platform-kit-proxy/index.ts` (618 lines) exposing `/db/tables`, `/db/rows`, **`/db/columns`**, **`/db/indexes`**, **`/db/policies`**, and a `/dynamic-tables/*` entity browser — with a pinned project ref, a destructive-endpoint blocklist, and `assertPublicTable()` validation. `Tables.tsx` calls only the two weakest routes.
- `src/pages/Admin/PlatformKitDatabase.tsx` — a 4-tab Columns/Rows/Indexes/**Policies** browser with a left rail and query history.
- `src/pages/Admin/PlatformKitDynamicTables.tsx` — entity/FK browser.
- `src/components/uplift/DataTable.tsx` — TanStack Table + shadcn, sortable, column visibility, bulk select, CSV export.

**The capability is 70% built and simply not joined up.** This is the cheapest large win in the whole plan.

### 1.6 Roles and tiers — the model is richer than the data

| Layer | Values (live) |
|---|---|
| `profiles.platform_role` | `developer`, `tester`, `user` — **no `platform_admin` account exists** |
| `user_tenants.role` | `owner`, `guest` in live data (schema allows `admin`, `manager`, `staff`) |
| `org_members.gto_role` | `gto_admin`, `host_supervisor` |
| `role_capabilities` | **486 rows** across `platform_admin, tenant_admin, gto_admin, gto_staff, recruiter, member, viewer, owner, guest` |
| `permissions` | 25 named, incl. `reports.view`, `reports.export` |
| `tenants.tier` | `platform` ×1, `enterprise` ×4 — **all 5 root, zero sub-orgs** |

SQL primitives all exist and are live: `auth_tenant_id()` (SETOF), `auth_tenant_id_with_role(text[])`, `auth_parent_tenant_id()`, `acting_tenant_id()`, `get_descendant_tenant_ids()`, `get_visible_tenant_ids()`, `is_platform_super_admin()`, `is_platform_developer()`, `is_enterprise_admin()`, `is_gto_staff()`.

**So the four tiers the operator described are expressible today** — the enterprise tier simply has nothing to act on until sub-orgs exist.

`tester` is a live landmine: two docstrings call it "full access", while every real authority check excludes it. `caris@mbawa.com` is a `tester` **and** FutureBuild's own admin — treating `tester` as platform authority would let one client act as another.

### 1.7 Cross-app consistency (orchestration §5) — no drift

All six apps: React 19.2.7 · Tailwind 4.3 · `@supabase/supabase-js` 2.108.1 · TanStack Query 5.101 · zustand 5 · zod 4.4.3 · shadcn/Radix. crm7/BSU/R80.3/throughput/braden are Vite 8; conduit is Next 16.2.9. crm7 routes on `wouter`, BSU on `react-router-dom` 7.

**One material gap, uniform across all six: no virtualization library.** No `@tanstack/react-virtual`, no `react-window`, no canvas grid. The report table renders unvirtualized while `MAX_REPORT_EXPORT_ROWS = 50_000`.

### 1.8 Gate A — Context7 verification of grid options

| Option | Version | Licence | React 19? | Verdict |
|---|---|---|---|---|
| `@glideapps/glide-data-grid` | 6.0.3 | MIT | **NO — peer caps at `18.x`** | Canvas, true Excel feel (fill handle, range select, clipboard TSV), but needs a peer override across 6 apps |
| `@tanstack/react-virtual` | 3.14.9 | MIT | **Yes — `^19.0.0` declared** | Headless; pairs with the already-installed TanStack Table 8.21.3 |
| `ag-grid` | — | Community MIT / Enterprise paid | yes | Not a dependency; previously considered and rejected in `import-wizard.tsx:10` |

### 1.9 External reference analysis (all 7 links visited)

| Project | Storage model | Licence | What to take |
|---|---|---|---|
| **NocoDB** | UI layer over an *existing* Postgres schema — no schema rewrite | Sustainable Use Licence (not OSI) | The "connect to a DB you already have" stance. **Closest philosophical match to BSuite.** Vue — not embeddable. |
| **Teable** | Real Postgres tables, not EAV; NestJS + Next.js | AGPL-3.0 core, MIT `packages/` | Field-type taxonomy incl. rollup/link/formula; record history; undo/redo |
| **Baserow** | Django + Vue + Postgres | MIT core, premium/enterprise tiers | **Snapshots, trash and undo** — the safety model for bulk operations |
| **Mathesar** | Direct on Postgres; **permissions are real Postgres roles**, not an app layer | GPLv3 | The Data Explorer query builder; and the discipline that "relationships in the UI are foreign keys in the database" |
| **Rowy** | Firestore | — | Derivative/aggregate column model; field-level RBAC. Wrong DB — inspiration only |
| **undb** | SQLite, SvelteKit | AGPL-3.0 | Least applicable |
| **Supabase UI Platform Kit** | shadcn registry components over the **Management API** | Apache-2.0 (Supabase UI) | See below — important constraint |

**Licence conclusion: none of these can be vendored.** AGPL-3.0 (Teable core, undb) and GPLv3 (Mathesar) are incompatible with a proprietary SaaS; NocoDB's Sustainable Use Licence forbids competing offerings. They are **design references, not dependencies.** Baserow's MIT core and Teable's MIT `packages/` are the only pieces that could legally be borrowed, and neither is a drop-in.

**Supabase UI Platform Kit — a real constraint, not a blocker.** It ships `SupabaseManagerDialog`, `sql-editor`, `results-table`, `dynamic-form`, and hooks `use-tables`/`use-auth`/`use-logs`/`use-secrets`/`use-storage`. But it drives the **Management API** with a *personal access token* (`SUPABASE_MANAGEMENT_API_TOKEN`) via a server proxy, and its own docs warn: *"Never expose your Management API token to the client. Always implement authentication and permission checks in your proxy."* Its shipped example permission check is a placeholder (`Boolean(projectRef)`).

Therefore:

- It is legitimate **only for the developer tier**, and only behind BSU's existing `platform-kit-proxy` (which already pins the project ref and blocklists destructive endpoints).
- It can **never** back the super-admin / org-admin / user tiers — those are tenant-scoped row operations, and the Management API has no concept of a tenant. (It also, per prior BSuite finding, has no auth-user endpoints at all.)
- BSU has already independently built ~70% of it. The decision is whether to adopt the registry components or keep the in-house proxy panels.

---

## 2. The reportable-entity catalog (what "full coverage" means)

Live database: **~280 public tables.** Grouped by reporting domain, with the fact tables that carry measures:

| Domain | Fact / measure tables | Representative measures |
|---|---|---|
| **Time & attendance** | `timesheets` (7), `timesheet_events`, `timesheet_groups`, `people_training_day_pattern_periods` | billable / ordinary / overtime / training hours, week_ending |
| **Billing & revenue** | `invoices` (3), `invoice_line_items` (5), `invoice_batches`, `invoice_runs`, `payments`, `credit_notes`, `rcti_invoices`, `billing_history` | amount, tax, paid, outstanding, days-overdue |
| **Charge rates** | `charge_rate_quotes` (13), `charge_rate_snapshots` (13), `charge_calculations`, `host_charge_rates`, `charge_rate_schedules`, `batch_charge_rate_quotes`, `r80_margin_*` | charge rate, margin, overhead, on-costs, billable weeks |
| **Payroll** | `payroll_records` (2), `pay_runs` (2), `payroll_runs`, `wage_calculation_snapshots`, `pay_items`, `leave_balances`, `leave_requests` | gross, super, PAYG, payroll tax, leave accrual |
| **People & placement** | `people` (34), `placements` (29), `apprentices` (16), `engagements`, `employers` (17), `sites` (14), `field_officers`, `field_officer_assignments` | headcount, placement duration, status transitions, FO caseload |
| **Training & compliance** | `training_contracts` (8), `training_plans` (19), `training_plan_units` (195), `qualifications` (6), `qualification_units` (119), `units_of_competency` (160), `assessments`, `competency_assessments`, `apprentice_wage_progression_events` | units complete, % progress, at-risk days, completion rate |
| **Funding** | `funding_claims`, `funding_claim_items`, `funding_sources` (2), `funding_offsets`, `incentive_claims`, `engagement_funding_sources` | claimed, received, expected vs actual, eligibility |
| **Recruitment (conduit)** | `r7_candidates` (9), `r7_jobs` (8), `r7_applications`, `r7_pipeline_entries`, `r7_offers`, `r7_interviews` | time-to-fill, conversion by stage, source effectiveness |
| **WHS & risk** | `incidents`, `whs_incidents`, `whs_records`, `whs_risk_assessments`, `workplace_inspections`, `site_visits`, `inspections` | LTIFR, incidents per 100 FTE, days since incident, overdue inspections |
| **GTO standards** | `gto_compliance_standards` (34), `gto_standards_clauses` (10), `gto_self_assessments`, `gto_compliance_assessments`, `gto_complaints`, `monitoring visits` | clause coverage, self-assessment status, 90-day visit compliance |
| **CRM & sales** | `clients` (21), `contacts` (63), `leads` (7), `opportunities` (10), `contact_activities`, `communications` (5) | pipeline value, activity counts, conversion |
| **Documents & comms** | `document_metadata` (425), `document_expiry_alerts`, `email_messages` (12), `signature_requests` (5) | expiring documents, unsigned, response time |
| **Reference (non-tenant)** | `training_providers` (8119), `awards` (7), `apprentice_rate_configs` (183), `public_holidays` (25), `state_training_authorities` (8) | dimension tables — join targets, not fact tables |
| **Platform / audit** | `audit_events` (64), `audit_logs` (1980), `error_log` (1961), `tenant_switch_audit` (30), `platform_admin_act_as_audit` | developer-tier only |

**"Billable hours per month" concretely requires:** `timesheets.billable_hours` SUM · `date_trunc('month', timesheets.week_ending)` GROUP BY · optional join `timesheets → placements → employers.business_name` · tenant scope via RLS. **Not one of those four capabilities exists today.**

### Dimension vocabulary the builder must expose
Time (day/week/month/quarter/FY — Australian FY is Jul–Jun and `financial_years` already holds 5 rows) · Tenant / sub-org · Host employer / site / region · Person / apprentice / field officer · Qualification / training package / RTO · Award / classification / year-of-trade · Funding scheme / state jurisdiction · Status enums · Pay item / work type / penalty / allowance group.

---

### 2.1 BLOCKER — 14 tables are currently unreadable by every tenant user

Verified twice, independently, against live `pg_policies` (not migration files):

```sql
-- live qual, e.g. insurance_policies:
(tenant_id = ((SELECT current_setting('app.current_tenant_id'::text, true)))::uuid)
```

`app.current_tenant_id` is a session GUC that **nothing sets**. All BSuite clients authenticate by JWT through PostgREST, which does not propagate custom GUCs. So the GUC is always NULL, `tenant_id = NULL` is never true, and these 14 tables return **zero rows to every authenticated user, always**:

`coy_apprentice_changes` · `coy_batches` · `disciplinary_actions` · `disciplinary_cases` · `enterprise_memberships` · `enterprises` · `host_preferred_qualifications` · `incentive_claims` · `insurance_policies` · `pipeline_cards` · `probation_records` · `record_corrections` · `training_plan_signatures` · `ui_configurations`

It fails **closed and silent** — it renders as an empty state, never an error. `case_notes` was in exactly this state until `crm7#RT-1` (2026-07-27) rebuilt it onto `auth_tenant_id()`; that migration is the template, and these 14 never received it.

**This is a precondition for the reporting work, not a side quest.** Three of them (`incentive_claims`, `insurance_policies`, `probation_records`) are tables a GTO would certainly report on, and any report built over them would confidently return zero rows.

Note `enterprises` / `enterprise_memberships` are on that list — so the *enterprise tier* the operator described is doubly blocked: no sub-orgs exist, **and** the tables that would model them are unreadable.

---

## 3. Recommended architecture

Five layers. Each independently shippable, each used by every tier — the tier changes only *what the catalog exposes* and *what RLS permits*.

```
┌─ L5  Surfaces      /reports · /data · /developer/database   (per-tier entry points)
├─ L4  Grid          one virtualized spreadsheet component, shared
├─ L3  Ops           bulk import · bulk update · export · undo
├─ L2  Engine        definition (AST) → PostgREST | validated RPC
└─ L1  Catalog       reportable entities · fields · joins · measures  (DB tables)
```

### L1 — The catalog (the thing that does not exist today)

Four new tables, following the estate's established `custom_pages` precedent: **nullable `tenant_id`, read as `.or('tenant_id.is.null,tenant_id.eq.X')`, tenant row wins on key collision.**

| Table | Purpose |
|---|---|
| `catalog_entities` | one row per reportable entity: physical table, label, domain, icon, `tenant_id` (NULL = platform), `is_system` |
| `catalog_fields` | per entity: column, label, data type, semantic role (`measure`/`dimension`/`identifier`), format, PII flag, `min_role` |
| `catalog_joins` | declared, **executable** join paths: from/to entity, from/to column, cardinality, multi-hop path array |
| `catalog_measures` | named aggregates: entity, expression, aggregate fn, unit ("Billable hours" = `SUM(timesheets.billable_hours)`) |

**Seeded by introspection, curated by hand.** A generator reads `information_schema` + `pg_constraint` to propose entities, fields and *real* FK-derived joins; a developer promotes them. This is what kills the known-broken hardcoded join: joins derive from `pg_constraint`, so a declared join either matches a real foreign key or is explicitly marked multi-hop with its full path.

**Drift detection is mandatory.** A CI check compares catalog against live schema and fails on a row whose table/column no longer exists. Without it the catalog rots into the same lie the hardcoded array is now.

### L2 — The engine

**Recommendation: hybrid, with the safety property carried by `SECURITY INVOKER`.**

| Query shape | Path | Why |
|---|---|---|
| Single-entity select, filters, sort, no aggregation | **unchanged `{kind:'view'}`** — already PostgREST-native and correct | RLS applies natively; no SQL string is ever built |
| Joins, GROUP BY, aggregates, date bucketing, computed measures | **new `{kind:'catalog'}` → one generic `SECURITY INVOKER` plpgsql RPC** | the only path that can express multi-hop joins and grouping |
| The existing 16 hand-written reports | unchanged `{kind:'rpc'}` | already correct; do not rewrite working compliance reports |

**PostgREST cannot carry the aggregate half — verified, not assumed.** `pg_db_role_setting` for `authenticator` on this project carries `statement_timeout=8s`, `lock_timeout=8s`, `pgrst.db_schemas=public,catalog` and **no `pgrst.db_aggregates_enabled`** — aggregates are off, and that is a project-level API setting a migration cannot flip. More decisively, PostgREST aggregates are *structurally* insufficient even if enabled: only `avg/count/max/min/sum`, implicit grouping, no `HAVING`, and embedding cannot chain across an intermediate table. The known-broken two-hop join (`people.current_host_employer_id → clients.id → employers.id`) is exactly as inexpressible in PostgREST as in the current hardcoded array.

**The house pattern already is this pattern.** All 16 existing `report_*` functions are `LANGUAGE plpgsql`, `SECURITY INVOKER`, `STABLE`, `SET search_path`. `report_gto_billable_hours` was read in full: it checks membership against `auth_tenant_id()` *before* touching a table, then also filters each base read — with RLS underneath as an independent second layer. The generic RPC replicates that shape rather than inventing a new trust model.

The generic RPC — `report_run_definition(p_definition jsonb, p_page int, p_page_size int)`:

- **`SECURITY INVOKER`, never DEFINER.** This is the whole security argument: the function runs as the calling user, so **RLS on every base table still applies**. Tenant scoping is not a `WHERE` clause the client could omit — it is the database's own row filter. A hostile org admin who forges a definition naming another tenant's rows gets zero rows, because RLS, not the definition, decides visibility.
- **Every identifier is catalog-validated, then `format('%I')`-quoted.** Table, column, join and aggregate names are looked up in `catalog_*` (readable to the caller only through *its* RLS); an identifier not in the catalog is rejected before any SQL is composed. Aggregate function names come from a fixed allowlist (`sum|count|avg|min|max`), never from user text.
- **All literals are bound parameters**, never interpolated.
- `LANGUAGE plpgsql`. A `LANGUAGE sql` SECURITY DEFINER gets inlined by the planner, loses its security context and re-applies RLS — the known Supabase recursion trap. Not applicable to INVOKER, but the convention is enforced repo-wide.
- **Explicit `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`.** This repo's `ALTER DEFAULT PRIVILEGES` grants EXECUTE to `anon` on new public functions — every new function needs the explicit revoke, not just SECURITY DEFINER ones.
- Hard caps on rows, join depth. `authenticated` already carries `statement_timeout=8s` — a real backstop already in place; the RPC does not need to reinvent it.
- **Joins are edges, not guesses.** An entity pair with no `catalog_joins` row cannot be joined at all. This is what structurally fixes the broken two-hop path: the AST lists *two* join refs, each resolving to its own correct catalog row (`people→clients`, then `clients→employers`), instead of one wrong direct edge.

> **RLS trap to avoid on the catalog tables.** Write the predicate as `tenant_id IS NULL OR tenant_id IN (SELECT auth_tenant_id())` — **not** `tenant_id IN (...)` alone. `NULL IN (…)` evaluates to NULL, not TRUE, so a bare `IN` makes every platform-scope row invisible to everyone, permanently, even when the client sends the correct `.or()` filter. That exact bug shipped on `tenant_field_definitions` and needed migration `20260805230000` to fix. The client filter shape and the RLS predicate shape are two different things and both must be right.

★ Insight ─────────────────────────────────────
Why `SECURITY INVOKER` is the right call, and why it's counter-intuitive: most "generic query endpoint" designs reach for `SECURITY DEFINER` so the function can read metadata the caller can't. That inverts the trust model — the function becomes the *only* thing between a crafted request and every tenant's data. With `INVOKER`, even a totally compromised definition parser cannot leak cross-tenant rows, because the leak is prevented one layer below, by Postgres itself. You trade a little convenience (the catalog needs its own readable RLS) for the property that the blast radius of a bug in your own SQL builder is zero.
─────────────────────────────────────────────────

### L3 — Bulk operations

`data_import_jobs` already has the right shape (`field_mapping`, `total_rows`, `imported_rows`, `failed_rows`, `errors`) and zero rows. **Wire it rather than replace it.** `employee_imports` has no `tenant_id` and is superseded — fold into `data_import_jobs` and retire.

Add one sibling table `data_change_sets` for bulk **update**, because an update needs what an import does not: a reversible record of the previous value.

Both flow through one pipeline:

```
upload → parse → map columns → VALIDATE (zod + DB constraints, dry run)
      → PREVIEW diff (n created / updated / skipped / rejected + reasons)
      → COMMIT in batches → change-set written → UNDO available
```

**The dry-run preview is non-negotiable.** Baserow's snapshots/trash/undo is the reference model. A bulk update that cannot be previewed and cannot be undone is not safe for an org admin to hold, and the operator explicitly asked for scope-safety. Undo is an inverse change set, not a database restore — `audit_events` already captures `old_data`/`new_data`/`changed_fields` via `audit_trigger_fn()`, so the mechanism partly exists.

### L4 — The grid

One shared component published as `@bsuite/data-grid`, consumed by every surface. Technology decision open — see D1.

### L5 — Surfaces and tier placement

| Tier | Entry point | Scope of effect | Catalog visible | Writes catalog? |
|---|---|---|---|---|
| **Developer** (`platform_role='developer'`) | **BSU** `/developer/*` | platform-wide, all tenants | all | yes — platform rows |
| **Platform admin** | BSU `/developer/*` (subset) | platform-wide, read-heavy | all | no |
| **Enterprise / super admin** | crm7 `/admin/data` | own tenant + descendants | platform + own | own tenant rows |
| **Org admin** (`user_tenants.role ∈ owner/admin`) | crm7 `/settings/data` | own tenant only | platform + own | own tenant rows |
| **User** | crm7 `/reports`, per-entity list views | own records per RLS | platform + own (read) | no — `scope='user'` views only |

This matches the operator's rule exactly: *the BSU developer portal is platform-level only; every other tier reaches the same capability from its own tab, bounded by its own scope.* The **capability is one codebase**; the tier is a catalog filter plus RLS.

`tester` gets **no** platform authority; its two "full access" docstrings are corrected in the first commit.

---

## 4. Developer database console (`/developer/database`)

Replaces the four-route sprawl (`/developer/tables`, `/admin/platform-kit/database`, `/admin/platform-kit/dynamic-tables`) with one console covering the operator's list.

**Build on the existing `platform-kit-proxy` edge function**, which already pins the project ref, blocklists destructive Management API endpoints, validates table names via `assertPublicTable()`, and re-checks the platform role server-side. It already serves `/db/columns`, `/db/indexes`, `/db/policies` — currently unused by the page that most needs them.

| Operator's list | Source | Read | Write |
|---|---|---|---|
| Schema Visualizer | `pg_constraint` FKs → `@xyflow/react` (installed, 12.11) | ✅ | layout only |
| Tables / Columns | `information_schema` + proxy | ✅ | **guarded** |
| Functions | `pg_proc` | ✅ | guarded |
| Triggers | `pg_trigger` | ✅ | guarded |
| Enumerated Types | `pg_enum` | ✅ | guarded (`ALTER TYPE ADD VALUE` is non-transactional → `.nontx.sql`) |
| Extensions | `pg_extension` | ✅ | **no** — platform risk |
| Indexes | `pg_indexes` | ✅ | guarded (`CREATE INDEX CONCURRENTLY` → `.nontx.sql`) |
| Publications | `pg_publication` | ✅ | **no** |
| Policies | `pg_policies` + live `pg_get_expr()` | ✅ | guarded |
| Roles | `pg_roles` + `profiles.platform_role` | ✅ | app roles only, never DB roles |
| Settings | proxy → Management API | ✅ | **no** |

**"Guarded" means the console never executes DDL directly.** It generates a migration file and opens a draft PR — reusing the `feature-builder-export` edge function, which already does exactly this. The developer reviews a diff and merges; the existing `supabase-migrate` workflow applies it.

This is the most important constraint in the console. One shared production Postgres serves all six apps and every tenant; an in-app `DROP COLUMN` has no undo. Routing DDL through a PR buys review, history, CI, the migration-floor lint, the explicit-grant lint and the duplicate-version check — every guardrail the estate has already paid for. It is also *better* UX than Supabase Studio, not worse: Studio applies immediately, with no review and no record.

**Supabase UI Platform Kit** components (`sql-editor`, `results-table`, `dynamic-form`) can be adopted here behind the existing proxy — but its Management API token stays server-side, and it can serve no tenant tier.

---

## 5. UX — what "feels like Airtable/Excel/Sheets" actually requires

The gap is not styling. It is these behaviours, almost none of which exist:

| Behaviour | Status |
|---|---|
| Virtualized rows + columns | **missing — no virtualization library in any app** |
| Cell-range selection (click, shift-click, drag) | missing |
| Keyboard grid nav (arrows, tab, enter, ⌘/ctrl+arrow to edges) | missing |
| Copy/paste **as TSV**, so Excel↔app round-trips | missing |
| Fill handle (drag-to-fill, double-click fill-down) | missing |
| Inline typed editors (date, select, FK lookup, currency, checkbox) | partial — runner has single-cell edit |
| Frozen first column + sticky header | missing |
| Column resize / reorder / hide | partial — reorder exists via `@dnd-kit` |
| Group-by with collapsible aggregate rows | missing |
| Undo/redo stack (⌘Z) | missing |
| View switcher: grid / kanban / calendar / gallery / chart | missing (`recharts` installed but unwired to reports) |
| Saved views (filters + sort + column set) | tables exist, **0 rows, no writer** |
| Optimistic edit with rollback **and a visible error on RLS denial** | **critical gap** |

That last row is the estate's recurring defect and must be a cross-cutting requirement: **every mutation surface passes an `onError` that renders**. A silent 403 is indistinguishable from a no-op — it is exactly how "Tidy does nothing" happened.

---

## 6. Dead and superseded code to remove

| Item | Evidence | Action |
|---|---|---|
| `crm7 settings/import-export.tsx` (29k) · `import-export-data.tsx` (6k) · `import-wizard.tsx` (28k) | all three routed, overlapping; `data_import_jobs` has 0 rows so none ever completed | consolidate to one `/settings/data` |
| `ReportBuilder.tsx` `REPORT_SOURCES` + `JOIN_DEFINITIONS` | hardcoded 9 sources; one join documented broken | replace with catalog reads |
| `employee_imports` table | no `tenant_id`, superseded by `data_import_jobs` | migrate then drop (Expand→Migrate→Contract) |
| BSU `Developer/Marketing.tsx` | static CRM7 landing page inside the developer portal; `platform_marketing` never created | remove route |
| BSU `Developer/Tables.tsx` | superseded by the new console | remove |
| `report_executions`, legacy `report_configs.org_id` | `org_id`-keyed pre-`tenant_id` generation, 0 rows | assess for drop |
| `tester = full access` docstrings (`usePlatformRole.ts`, `lib/permissions.ts`) | contradict every real check; live cross-client authority hazard | fix in first commit |
| `workers` table | already comment-marked DEPRECATED, 0 rows | already queued — Contract phase |

---

## 7. Implementation sequence

Each phase independently shippable and live-verifiable. Ordered so risk rises only after the safety net is in.

| # | Phase | Risk | Verified by |
|---|---|---|---|
| **P0** | Fix the 14 dead-GUC RLS policies onto `auth_tenant_id()` (the `case_notes` template) · fix `tester` docstrings | **high** — touches live RLS | dry-run in guaranteed rollback; pgTAP per table; then **live**: sign in as a real tenant user and read a row from each |
| **P1** | `@bsuite/data-grid` — virtualized grid, range selection, keyboard, clipboard TSV, fill handle, typed editors | med | Playwright: paste 500 Excel rows; scroll 100k rows |
| **P2** | Catalog tables + introspection seeder + CI drift check | med | catalog covers ≥95% of tenant-scoped tables; drift check fails on a deliberately-renamed column |
| **P3** | Engine: PostgREST compiler + `report_run_definition` RPC | **high** | adversarial pgTAP: org admin A crafts a definition naming tenant B → **0 rows**; injection corpus rejected |
| **P4** | Rebuild `/reports/custom/create` on catalog + engine + grid; retire hardcoded sources | med | **a `scope='tenant'` row appears in `report_templates` from the UI** — the thing that has never happened |
| **P5** | Bulk import/update pipeline + `data_change_sets` + undo; consolidate 4 pages to 1 | **high** — writes tenant data | dry-run preview matches commit exactly; undo restores byte-identical; org admin cannot target another tenant |
| **P6** | `/developer/database` console (read-all + PR-guarded DDL) | med | all 11 surfaces render live data; a DDL edit produces a reviewable PR and applies nothing directly |
| **P7** | Tier surfaces `/admin/data`, `/settings/data`, user saved views | med | four real accounts, one per tier, live |
| **P8** | Views: kanban / calendar / chart; scheduling; real PDF via `pdf-lib` | low | live |
| **P9** | Dead-code sweep (§6) + `employee_imports` contract | low | routes 404; grep clean |

**P0 before everything.** Building reporting over tables that silently return zero rows produces confident wrong answers — the exact failure the operator is trying to eliminate.

**P3 is the one to be slowest on.** It is the first generic query path in the estate; a mistake there is a cross-tenant leak, not a bug.

---

## 8. Verification contract

Per the estate's own recurring-failure record, these are required, not optional:

1. **Live catalog, never migration files.** Fetch `pg_get_expr()` for every policy touched. A `DROP POLICY` in a merged migration is not proof the policy is gone — that has failed three times in this repo.
2. **Dry-run every migration inside a guaranteed rollback** (a `DO` block ending in an unconditional `RAISE`).
3. **Check duplicate stamps before pushing:** `ls supabase/migrations | grep -oE '^[0-9]{14}' | sort | uniq -d` — a collision silently skips another lane's file forever.
4. **Every migration ≥ `MIGRATION_FLOOR` 20260611000000**, with explicit `GRANT`s in the same file.
5. **Deployed-UX test as a real user** (Gate B.2): wait for deploy → sign in at `d.crm.crm7.app` / `d.suite.crm7.app` → exercise per tier → screenshots, clean console, expected network calls.
6. **Two-account cross-tenant test before P3 and P5 merge.**
7. **Package-boundary budget:** `@bsuite/data-grid` and `@bsuite/schema-builder` are consumed as *published* deps, not workspace links — build → version bump → publish → consumer pin → lockfile regen before anything is observable.
8. **Exclude `.claude/worktrees`, `.vercel`, `dist`, `public` from every repo-wide measurement** — worktrees are full second copies and silently inflate counts.

---

## 9. Decisions required from the operator

| ID | Decision | My recommendation |
|---|---|---|
| **D1** | **Grid technology.** (a) `@glideapps/glide-data-grid` — canvas, true Excel feel out of the box, but **peer-caps at React 18** and needs a pnpm override across 6 React-19 apps. (b) TanStack Table 8.21 (already installed) + `@tanstack/react-virtual` (React 19 supported) + a hand-built selection/clipboard/fill layer — ~3–4 weeks more work, zero peer risk. (c) AG Grid Community. | **(b)** — a forced peer override on the estate's most-shared dependency is a poor trade for saved weeks, and TanStack is already the house standard |
| **D2** | **Does the developer console apply DDL directly, or only via generated PR?** | **PR only.** One shared prod Postgres, six apps, no undo on `DROP COLUMN` |
| **D3** | **Are the 14 dead-GUC tables fixed inside this program (P0) or as a separate lane?** | **Inside, as P0.** Reporting over them otherwise returns confident zeros |
| **D4** | **Sub-orgs / enterprise tier** — define and populate `parent_tenant_id` now, or ship two effective tiers with the third designed-in but inert? | **Defer**, design it in. All 5 tenants are root, and `enterprises`/`enterprise_memberships` are themselves in the D3 broken set. What a sub-org *is* is a domain ruling, not an engineering guess |
| **D5** | **May an org admin bulk-update platform-scoped reference data** (e.g. `apprentice_rate_configs` rows with `tenant_id IS NULL`)? | **No** — read-only, with a clear "Platform-managed" affordance |
| **D6** | **Adopt Supabase UI Platform Kit components, or extend the in-house `platform-kit-proxy` panels?** BSU has already built ~70% independently | **Extend in-house**, borrowing only `sql-editor`/`results-table`. The Kit assumes a Management API token and has no tenant concept |
| **D7** | **PII in the report builder.** `incidents` carries a comment that descriptions may contain PII and `viewer` has no SELECT. Does the catalog carry a per-field PII flag with its own role gate? | **Yes** — `catalog_fields.min_role` + PII flag, defence-in-depth over RLS |

---

## 10. What I could not verify

- **Whether `pgrst.db_aggregates_enabled` can be flipped from the Supabase Dashboard** independently of the role-level GUC. Its *absence* on `authenticator` was confirmed (consistent with the documented default-off), but the Dashboard UI was not inspected. This does not block the recommendation — the catalog RPC does not depend on it.
- **PostgREST's exact deployed minor version** — only Postgres 17.6 was confirmed. Aggregate behaviour was read from current docs, not version-pinned to what runs here.
- **No end-to-end execution of the proposed RPC** — this was a read-only pass. The local-fixture replay (applied twice, for idempotency) plus adversarial cross-tenant and injection fixtures are required before P3 can be called done.
- **No `EXPLAIN`/performance data** for a dynamically-built multi-join aggregate against production row counts. The 8s `statement_timeout` is a real backstop but is not evidence of sufficiency.
- **Every consumer of `report_configs` was not audited** before recommending that `saveReportDefinition` be redirected off it. Grep that first — `report_configs` also backs saved builder views.
- **Row-count feasibility** — the largest tenant-scoped table is `document_metadata` at 425 rows; `training_providers` has 8,119 but is global reference data. Virtualization is specified for a load that does not yet exist. Correct to build, but the 100k-row target is unmeasured.
- **conduit / R80.3 / braden / throughput were not audited** for their own reporting or import surfaces. Only crm7 + BSU + the live DB. A parallel surface in R80.3 would change the consolidation scope.
- **`recharts`** is installed in crm7 (14 files) but unwired to reports; I did not verify it is the right charting choice for P8.
- **`glide-data-grid` under React 19 in practice** — the peer range excludes 19, but I did not test whether it runs. If D1(a) is chosen, spike it first.
- **No industry guidance** was found for tier-scoped catalog visibility as a named pattern; the platform/tenant overlay is extrapolated from this estate's own `custom_pages` precedent.
- **`workers` / `apprentices` deprecation** — both marked deprecated in table comments; I did not confirm no live reader remains before proposing catalog exclusion.

---

## 11. Delivery record — 2026-08-10 (data-platform lane)

**Operator directive:** implement this plan in full. Sync `development` with `main` first; merge
everything back to `development` before deciding to promote.

**Sync, verified before starting:** `development` contained every line of `main` in all seven
repos — `git rev-list origin/main --not origin/development --no-merges` returned **0 everywhere**.
The "behind" counts routinely reported in this estate are merge commits only. `rev-list --count`
measures graph distance; only a content diff supports a sync claim.

### The finding that reframes this document

**This plan is far more implemented than it reads, and its central claim is no longer true.**
§1.1 says "there is no query engine". There is one. Anyone reading this document cold will
re-derive work that already exists, so read this section first.

| Already live — do not rebuild | Evidence |
|---|---|
| L1 catalog | `report_catalog_entities` 84 · `fields` 1,208 · `joins` 124 · `measures` 21 |
| L2 engine | `report_run_catalog_query(jsonb,uuid,int,int)`, SECURITY INVOKER, catalog-validated identifiers |
| L3 bulk ops | `bulk_data_import` / `bulk_data_update` / `bulk_data_undo`, all with `p_dry_run` |
| P0 dead-GUC | **CLOSED** — zero live policies reference `app.current_tenant_id` |
| P5 consolidation | the three legacy import pages are gone; `/settings/data` is the single surface |
| P6 console | `Developer/Database/` with panels + a PR-guarded `ProposeMigrationDialog`; `Tables.tsx` and `Marketing.tsx` removed per §6 |
| P9 (most) | `REPORT_SOURCES` and `JOIN_DEFINITIONS` are gone; the `tester` docstring is corrected |

### What this lane added

| Phase | Delivered | Where |
|---|---|---|
| **P3** | The adversarial suite §7 demanded and nobody wrote — suite 57, **18/18**. The engine had run four days unguarded. | crm7#1545 |
| **P2** | `report_catalog_drift()` + suite 58, **8/8** — the *production-runnable* counterpart to the existing CI script | crm7#1545 |
| **P5** | Suite 59, **10/10** — "dry-run matches commit exactly" and "undo restores byte-identical", the two P5 properties never tested | crm7#1545 |
| **D3** | The promotion path's missing surface — `propose`/`approve` shipped 2026-08-07 with **zero callers** | bsu#673 |

Both merged to `development`. **Nothing promoted to `main`.**

**The engine is stronger than this plan specified.** §7 predicted a cross-tenant query returns
0 rows via RLS. It refuses at the door: `p_tenant_id` must appear in `auth_tenant_id()` or it
raises `42501` before composing any SQL. Suite 57 pins that as a throw.

### An empty table is not a broken path — proven three times

§1.3 treats zero rows as the estate's dominant failure signature. That reflex is wrong here.
Each of these was positive-controlled against production inside a guaranteed rollback:

- **`report_templates`** — `user` scope inserts fine; `tenant` scope is correctly refused for a
  caller with no `org_members` row, **and the UI correctly hides the scope it cannot use**. The
  page shipped 2026-08-09. Disuse, not defect.
- **`data_import_jobs`** — a real tenant admin can insert; the pre-`crm7#1288` shape is still
  correctly refused `42501`.
- **`saved_views`** — insert succeeds.

### One thing needs Braden, under ruling B3's own escalation clause

`org_members` holds **5 rows for 5 users**; `user_tenants` holds **13 for 9**. Four owner/admin
users have no `org_members` row — and **54 write policies** gate on `is_gto_staff()` /
`is_enterprise_admin()`, both of which read `org_members` only. Those four cannot write invoices,
payments, payroll records, timesheet events, WHS audits or reports.

B3 reserved exactly this: *"if it turns out an ordinary tenant owner would gain authoring rights
across 331 routes, that comes BACK to him."*

**Recommendation: map the role, don't assume it** — `user_tenants` owner → `gto_admin`, admin →
`gto_staff`, provisioned at membership creation with one backfill. A GTO owner who cannot raise
an invoice is a broken product. B6 forbids the shortcut of hand-granting rows to real accounts.

### Two defects found in other people's work, flagged not edited

- **pgTAP suite 47 is a gate that does not gate.** Its D1 asserts a tenant `gto_admin` can save a
  report — and its own fixture inserts the `org_members` row first. Green over the condition
  production lacks. `workspace-lane` owns that file.
- **crm7 has a live duplicate migration stamp**: `20260512230000` is used by two files. Below
  `MIGRATION_FLOOR` so inert today, but the duplicate-version lint does not fail on it.

### A retraction

I first recorded that this plan's mandatory catalog drift check "was never built". **That was
wrong.** `scripts/check-report-catalog-drift.mjs` is wired into `db-lint.yml` as the required
check `report_catalog_* drift vs live schema`, and is in several respects better than my first
draft. I grepped workflow *filenames*, not contents, then asserted an absence from it. What
survives is genuinely distinct: that script can only measure the CI replay; nothing measured
production. `report_catalog_drift()` is the production-runnable counterpart, and its severities
were aligned to the existing script rather than left to diverge. Live production drift: **zero**,
124 of 124 joins FK-backed.

### Still open

- **P8** is thin — kanban/calendar/chart, scheduling UI and PDF are roughly one file each.
  Needs scoping rather than assuming.
- **P9 remainder** — `employee_imports` contract-phase drop (0 rows; the four references left are
  a generated type and comments).
