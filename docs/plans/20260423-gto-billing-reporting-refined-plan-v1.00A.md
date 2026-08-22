# GTO Billing, Payroll & Reporting — Refined Implementation Prompt
**Prompt-Enhancer Tier:** Heavy (6+ topics, production stakes, regulatory compliance)
**Produced:** 2026-04-23 | **Silo:** BSuite (`bsuite_*` memory keys only)
**Target branch:** `development` — NO merges to `main` until explicit user confirmation

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Evidence Refresh — 2026-05-12 (zero-defer audit per AGENTS.md §1)

All 9 workstreams re-audited against live code state on branch `origin/development`. Only claims with file/line citations, migration filenames, or published-package verification are marked ✅ DONE.

### WS-level scorecard

| WS | Title | Status | Evidence |
|---|---|---|---|
| WS-1 | Calc Engine Convergence | 🟡 **PARTIAL — PUBLISH BLOCKED** | BUG-2/4/5 + ADR ✅; BUG-1 `/52` conversion is fixed and regression-locked in source `@bsuite/charge-calc@0.5.0`, but npm still serves 0.4.0 and publish is blocked by registry permissions (`bsuite#1408`). The missing `apprentice_rate_configs` forward migration was codified with 99 FY2025-26 seed rows and RLS/grant coverage via `crm7#1001`. |
| WS-2 | MAPD Edge Function + snapshots | ✅ **DONE** | `crm7/supabase/functions/mapd-sync/index.ts` + migration `20260423110000_ws2_wage_calculation_snapshots.sql` + `crm7/src/services/wageSnapshotService.ts` |
| WS-3 | Host Invoicing | ✅ **DONE** | Migration `20260423140000_ws3_invoices.sql`, `crm7/src/lib/pipelines/xeroInvoiceAdapter.ts` (idempotency keys L41/65/85), `crm7/src/lib/invoicing/renderInvoicePdf.ts`, subsidy-credit logic in `crm7/src/lib/billingEngine.ts` (+ test `billingEngine.subsidyCredit.test.ts`) |
| WS-4 | Timesheet state machine + payroll | 🟡 **MOSTLY DONE — VOCAB ALIGNED + ADAPTER SCHEMA CONTRACT LOCKED** | The DB↔TS timesheet vocabulary divergence was closed via `crm7#948`. DB migration `20260423150000_ws4_timesheet_state_machine.sql` and CRM7 runtime types now share the canonical state vocabulary. `crm7#1009` refreshed `XeroPayrollAdapter` against the generated `payroll_records` Supabase type and locked its select contract to live columns (`apprentice_id`, `paye_tax`, `super_guarantee_amount`, `income_type`, `metadata`) instead of stale aliases. STP ADR restored under `crm7/docs/adr/`. Remaining WS-4 follow-on work is concrete Xero Payroll AU client/export sequencing and Payday Super UI polish, not state vocabulary or adapter schema alignment. |
| WS-5 | Report builder + 7 templates | 🟡 **MOSTLY DONE — MANDATORY BACKENDS + EXPORT/PREFERENCE/LARGE-CSV GUARDRAILS LANDED** | Migration `20260423160000_ws5_report_system.sql`, UI skeleton `crm7/src/pages/reports/` (incl. `deliveries.tsx`, `custom/create.tsx`, `training-plan-progress.tsx`), `pg_cron` delivery migration `20260423190000_ws5_cron_report_delivery.sql` + edge fn `report-delivery/index.ts`. The exact 7 mandatory pre-built templates are seeded by `crm7/supabase/migrations/20260604210000_seed_ws5_gto_mandatory_report_templates.sql` (`crm7#998`), their tenant-scoped runnable RPC backends landed in `crm7/supabase/migrations/20260604211000_ws5_gto_mandatory_report_rpcs.sql` (`crm7#999`), generic runner/export guardrails landed via `crm7#1005` (view+RPC runner path, bounded full-result CSV/XLSX, stale-filter/template-switch protection, and stable `orderBy` for view full exports), per-user report view preferences landed via `crm7#1006` (saved column visibility/order, page-local grouping, scoped saved-view cache, serialized saves, and visible-column exports), and queued large CSV delivery landed via `crm7#1007` (over-cap queue affordance, authenticated edge invocation, tenant/template binding, user-scoped RPC fetches, terminal user-scoped failures, row caps, BOM/header output, and CSV formula-injection guards). Remaining WS-5 work is AG Grid/native Excel decisions plus PDF/chart polish. |
| WS-6 | AVETMISS / NCVER Export | 🟡 **MOSTLY DONE — LODGEMENT PACKAGE GUARDRAILS LANDED** | `crm7/src/lib/avetmiss/` now contains the full mandatory 9-file AVETMISS suite (`formatNat00010.ts`, `formatNat00020.ts`, `formatNat00030.ts`, `formatNat00060.ts`, `formatNat00080.ts`, `formatNat00085.ts`, `formatNat00090.ts`, `formatNat00120.ts`, `formatNat00130.ts`) plus WA/NSW/QLD/SA state extract helpers. Edge fn `crm7/supabase/functions/avetmiss-export/` generates/zips all 9 files, returns validation errors using the frontend `entityId` contract, fails explicitly on source-query errors instead of generating partial exports, includes non-empty WAAMS / NSW Smart and Skilled / QLD User Choice / SA STELA TSV extracts in the export archive, and now rejects structurally malformed generated packages before upload using fixed-width NAT record checks, mandatory-file checks, STA header/row-count checks, and agency-required STA field checks. Migration `20260423180000_ws6_avetmiss_fields.sql` adds Training Contract Identifier. Evidence: formatter/export wiring landed in `crm7#770`; edge validation contract/source-query hardening landed in `crm7#1002`; state STA TSV extract generation and edge zip wiring landed in `crm7#1003`; lodgement package guardrails and STA eligibility filtering landed in `crm7#1004`. Remaining WS-6 work is agency-certified STA conformance depth against external lodgement fixtures, not missing formatter files, edge API contract mismatches, absent state extract generation, or missing generated-package guardrails. |
| WS-7 | GTO National Standards gaps | ✅ **DONE** | Migration `20260423170000_ws7_gto_registers.sql`; Financial Viability (`crm7/src/pages/compliance/financial-viability/`); induction (`onboarding/induction-checklist.tsx`); guardian (`compliance/guardian-consents/`); WHS (`crm7/src/components/whs/host-employer-whs-manager.tsx`); F17 (`crm7/src/lib/compliance/renderF17.tsx` + `renderF17Xlsx.ts`); monitoring-visits & LLN pages under `compliance/` |
| WS-8 | RLS & Security Hardening | 🟡 **MOSTLY DONE** | Migration `20260423100000_ws8_org_members_gto_role_helpers.sql` with `org_members`, `gto_role` enum, and `is_gto_staff` / `get_user_role` / `get_user_host_employer_id` / `get_user_apprentice_id` `SECURITY DEFINER` helpers; `(SELECT auth.uid())` pattern used throughout new RLS. HF-4 anon-context pgTAP harness evidence landed via `crm7#949`; remaining noncanonical `SECURITY DEFINER` search paths and grants were normalized via `crm7#1000`. Extend harness coverage as new WS-4/WS-5/WS-6 tables and policies land. |
| WS-9 | Portals (apprentice/host/field officer) | 🟡 **MOSTLY DONE, GATED** | `crm7/src/pages/portal/worker-portal.tsx`, `host-employer.tsx`, `host-reports.tsx`; `crm7/src/pages/field-officers/` tree. Routes gated behind `portal_pages` feature flag in `App.tsx:514-517`. **Depends on WS-4 DB↔TS fix** before full wiring |

**Scorecard:** 3/9 fully DONE (WS-2, WS-3, WS-7) · 6/9 partial or mostly-done with gaps flagged (WS-1 package publish still blocked, but `apprentice_rate_configs` migration/seed/RLS provenance is closed via `crm7#1001`; WS-4 state vocabulary alignment landed via `crm7#948` and Xero payroll adapter schema-contract coverage landed via `crm7#1009`; WS-5 exact template seed closed via `crm7#998`, tenant-scoped runnable RPC backends closed via `crm7#999`, generic runner/export guardrails closed via `crm7#1005`, per-user column/grouping preferences closed via `crm7#1006`, and queued large CSV delivery closed via `crm7#1007`; WS-6 full NAT formatter suite verified via `crm7#770`, edge validation contract/source-query hardening landed via `crm7#1002`, WA/NSW/QLD/SA state TSV extract generation landed via `crm7#1003`, and generated-package lodgement guardrails landed via `crm7#1004`, with external agency-certified STA conformance fixtures still open; WS-8 pgTap harness closed via `crm7#949` and SECDEF search-path/grant normalization landed via `crm7#1000`; WS-9 gated + WS-4 dependent).

### Hard findings and closure notes

**HF-1: Publish-blocked BUG-1 release drift for `@bsuite/charge-calc`** (CRITICAL — impact latent, materialises on `annum` payment_frequency)

The WS-1 handoff claimed BUG-1 was committed to `feat/phase5-schema-registry` on the `packages/charge-calc` repo. Verification on 2026-05-12:

- `packages/charge-calc/src/awards/mapd-mapper.ts` in parent-repo view (v0.2.4 unpublished): `mapPaymentFrequency` only re-labels `"per annum"` → `"perWeek"` (line 67 comment `// annualise to weekly`), **does not divide `allowance_amount` by 52**. `mapWageAllowance` and `mapExpenseAllowance` pass `raw.allowance_amount` through unchanged.
- Published `@bsuite/charge-calc@0.2.3` on npm (consumers `crm7@^0.2.3`, `R80.3@^0.2.3`) — `npm pack` + grep of `dist/awards/mapd-mapper.js` returns NO match for `/ 52`, `isAnnualFrequency`, or equivalent arithmetic.
- Impact: annual allowances are 52× overstated in charge-rate calculations for both `crm7` and `R80.3` — **but only when MAPD returns a `payment_frequency` of `per annum` / `per year` for a wage or expense allowance**. Impact is latent until a MAPD record with annual frequency is processed; once processed it is CRITICAL (52× overstatement on that allowance's on-cost contribution).
- This is the CRITICAL bug WS-1 was blocked on.
- 2026-06-04 verification: source `@bsuite/charge-calc@0.5.0` already keeps the divide in `converter.mapAllowanceAmount`, with mapper-boundary tests preventing double-divide and converter tests covering annual/yearly frequencies. `pnpm --filter @bsuite/charge-calc test` passed 728 tests, `typecheck` passed, `build` passed, and `pnpm publish --dry-run --access public --no-git-checks` produced a valid 0.5.0 tarball.
- Blocker: real `pnpm publish --access public --no-git-checks` failed from this environment with npm registry permission (`404 ... not found or you do not have permission`), and `npm view @bsuite/charge-calc version` still returns 0.4.0.
- Action: resolve npm publish permission, publish `@bsuite/charge-calc@0.5.0`, then bump CRM7/R80.3 consumers only after npm confirms the version. Tracked as `bsuite#1408`.

**HF-2: WS-4 DB↔TS state-machine divergence** (HIGH)

- DB enum `public.timesheet_state` in migration `20260423150000_ws4_timesheet_state_machine.sql` (7 states per plan): `draft`, `submitted`, `pending_host_approval`, `pending_gto_review`, `approved`, `exported`, `archived`.
- TS type `TimesheetState` in `crm7/src/types/entities.ts:413` (7 DIFFERENT states): `draft`, `submitted`, `approved`, `disputed`, `processed`, `payroll_locked`, `paid`.
- `crm7/src/lib/timesheetWorkflow.ts` implements the TS vocabulary; the SQL RLS policies rely on the DB vocabulary. **Zero overlap between mid-flow states**: TS has `disputed/processed/payroll_locked/paid`; DB has `pending_host_approval/pending_gto_review/exported/archived`.
- Impact: any timesheet transitioned via `timesheetWorkflow.ts` will write a `state` value not present in the DB enum → insert will fail OR (if enum was altered silently) bypass the RLS-enforced role transitions defined in WS-4 spec.
- 2026-06-04 evidence: DB↔TS vocabulary alignment landed via `crm7#948`; Xero payroll adapter schema-contract coverage landed via `crm7#1009`, replacing stale `payroll_records` aliases with generated Supabase type-backed live columns and metadata-backed Xero employee/earnings-rate IDs. Remaining WS-4 work is concrete Xero Payroll AU client/export sequencing and Payday Super polish, not state vocabulary unification or adapter column alignment.

**HF-3: WS-1 ADR-001 and WS-4 STP-path ADR archived, not canonical**

- `20260423-calc-engine-single-source-v1.00W.md` and `0004-stp-xero-passthrough.md` exist only at `docs/archive/crm7/2026-04-24-submodule-import/2026-04/` — the `crm7/docs/adr/` directory does not exist in the crm7 submodule.
- Impact: ADRs are discoverable only via archive path; new contributors won't find them.
- Action: restore ADRs to `crm7/docs/adr/` or relocate to parent-repo `docs/adr/` and cross-link.

**HF-4: WS-8 pgTap test harness missing**

- Constraint C10 mandates RLS policies be verified via anon-key test harness (not SQL editor / service role).
- Original audit found no `pgtap` or `pg-tap` artefacts in `crm7/`.
- 2026-06-04 evidence: anon-context pgTAP harness landed via `crm7#949`; remaining WS-8 work is incremental coverage as new WS-4/WS-5/WS-6 tables and policies land.

### Apprentice_rate_configs table — migration provenance note

The WS-2 handoff claimed `apprentice_rate_configs` was seeded with 99 rows via Supabase MCP. That out-of-band state is now codified by `crm7/supabase/migrations/20260423125000_ws2_apprentice_rate_configs.sql` (`crm7#1001`): table shape, tenant/public RLS, least-privilege grants, active-public uniqueness, updated-at trigger, and 99 FY2025-26 public seed rows compile before the follow-on `20260423130000_ws8_arc_anon_public_read.sql` patch.

*Evidence refresh produced 2026-05-12 per AGENTS.md §1 zero-defer. Auditor: parent-agent (live-code verified, no deferral). Scope: 9 workstreams + archived ADRs + published npm package content.*

---

## Intent

Build a fully production-ready GTO/labour-hire billing, payroll, and reporting system within the existing BSuite platform (CRM7 + BSU + bsuite monorepo packages). The system must: (1) correctly calculate and invoice charge-out rates including all on-cost components and government subsidy deductions; (2) pay apprentices in compliance with relevant Modern Awards, EBA overrides, and Payday Super (1 Jul 2026); (3) produce fully customisable reports across apprentice progress, billable hours, competency/field activities, payroll records, and funding; and (4) satisfy all Australian regulatory reporting obligations — AVETMISS/NCVER NAT file export, STP Phase 2 via Xero, WAAMS/state STA extract, Fair Work 7-year record retention, and GTO National Standards audit evidence.

---

## Decomposition

The work decomposes into 8 workstreams with explicit dependencies noted.

### WS-1 · Calc Engine Convergence (PREREQUISITE — blocks WS-2 and WS-3)
**Problem:** Three divergent calculation engines exist — `packages/charge-calc`, CRM7's internal rate calc, and R80.3's engine. `ChargeRate.sync_source` enum `('r80' | 'crm7' | 'manual')` acknowledges this. Gap report item P2-4 flags the architectural decision as outstanding.
**Decision required:** Establish `@bsuite/charge-calc` as the single canonical engine. CRM7 and R80.3 must consume it as a package import, not maintain their own copies. This must be resolved first — building more billing features on three engines makes the debt exponentially worse.
**Deliverable:** ADR (Architecture Decision Record) in `docs/adr/` + migration shim in CRM7 and R80.3 to route their calculations through `charge-calc`.

### WS-2 · Award Rate & Charge-Out Rate Engine (depends on WS-1)
**What exists:** `charge-calc` package has MAPD client interface, mapper, billable-weeks calculator (4 models), BOOT comparison, and F17 JSON export. The MAPD edge function is not co-located — it must be implemented.
**What's missing:**
- MAPD Supabase Edge Function (`supabase/functions/mapd-sync`) — polls MAPD API, caches with 24h TTL, writes to `award_rates` table
- Local `apprentice_rate_configs` table — MAPD does not include all apprentice rates; year-of-trade percentage tables must supplement it (e.g. Electrical Award yr 1 = 42% of trade rate for under-21)
- Payday Super rate: 12.0% from 1 Jul 2026 (current schema has `super_rate: 0.115` in `cost_factors` — must be bumped with effective-date logic)
- `wage_calculation_snapshots` table — immutable JSONB snapshot at timesheet-approval time (Fair Work s.535 7-year retention + dispute resolution)
- `annualised_allowance_correction` — `mapPaymentFrequency` converts `"per annum"` → `perWeek` without dividing by 52; this is a precision bug for annual allowances

**Charge-out rate formula (per WS-3 invoice line):**
```
charge_out = base_award_rate × (1 + super_rate + payroll_tax_rate + workers_comp_rate + leave_loading_rate + gto_service_fee_rate)
less: subsidy_credit_per_hour (GTO Reimbursement $100/wk ÷ hours_per_week)
```

### WS-3 · Host Invoicing (depends on WS-1, WS-2)
**What exists:** CRM7 has invoice list/detail/generate pages plus `billingEngine.computeAgingReport()`. BSU `V0003` schema has `host_contracts` with `margin_strategy`, `billing_rules`, `cost_factors`.
**What's missing:**
- `invoices` table migration with full line-item structure (wages line GST-free, service fee line GST-applicable, subsidy credit line itemised per apprentice per program)
- Bulk invoice generation across all active engagements for a billing period
- Government subsidy pass-through on invoice (GTO Reimbursement $100/wk must appear as named charge-out reduction with apprentice name per ATO rules)
- State-specific subsidy fields: WA GTO Wage Subsidy (WAAMS reference), SA GTO Boost ($100/wk)
- Xero API batch invoice creation (up to 50 per call) with idempotency key per engagement+period
- PDF invoice renderer (currently only Xero-pushed; need local PDF for record-keeping)
- Annual reconciliation report: billable weeks vs contracted weeks, subsidy received vs invoiced

### WS-4 · Timesheet & Payroll Pipeline (depends on WS-2)
**What exists:** CRM7 has `payroll/` page tree, `chargeToPayroll` pipeline module, STP Phase 2 status widget, Payday Super countdown. `Timesheet` type has `host_approved_at`, `payroll_flagged`, `validation_warnings` fields.
**What's missing:**
- 7-state timesheet state machine: `draft → submitted → pending_host_approval → pending_gto_review → approved → exported → archived` — with explicit role transitions and RLS enforcement
- `timesheet_events` append-only audit table (Fair Work s.535: hours records retained 7 years)
- `pay_runs` and `payroll_records` tables (gap report SP-3)
- Payday Super: update `isPaydaySuperRequired()` to 7 business days (legislation says 7 business days, not 3 as currently displayed)
- STP Phase 2 clarification: does `chargeToPayroll` submit directly to ATO via SBR2/XBRL, or prepare data for Xero to submit? This must be determined and documented before further payroll work. If Xero-passthrough: wire Xero Payroll AU API `EarningsRate` mapping with income type `LAB` (labour hire) for STP Phase 2 disaggregation.
- Xero Payroll AU: employee ID matching, `EarningsRate` creation per award classification, pay run export

### WS-5 · Customisable Report Builder (depends on WS-3, WS-4)
**What exists:** CRM7 has a report catalogue at `/reports` with category cards and quick-access favouriting. `/reports/custom` route exists but content unknown from audit.
**What's needed:**
- JSONB `report_templates` table: `{columns[], filters[], groupBy[], sort[], schedule?, recipients[], format: 'table'|'chart'|'pdf'|'excel'}`
- TanStack Table v8 for interactive report viewer with column show/hide, filter, sort, grouping — state persisted to Supabase per user
- AG Grid Enterprise for large datasets (>50k rows) — native Excel export via `ExcelExportModule`
- `pg_cron` + Edge Function for scheduled report delivery (email PDF/CSV)
- Recharts → `html-to-image` → PNG pipeline for charts embedded in PDF exports
- Pre-built report templates (non-negotiable minimum set):
  1. **Apprentice Progress Report** — per apprentice: current stage, competencies achieved vs required, field activities logged, training plan reviews, field officer contact log
  2. **Billable Hours Report** — per host per period: hours billed vs approved timesheets, billing model, charge-out rate breakdown, subsidy deductions
  3. **Charge-Out Rate Summary** — per engagement: rate components, effective date, BOOT status, award classification
  4. **Payroll Liability Report** — per pay period: wages, super, tax, allowances, leave accruals
  5. **Funding Claims Report** — CTF/AASN/ASIP/GTO Wage Subsidy status per apprentice
  6. **GTO National Standards Audit Pack** — evidence status per sub-standard, gaps, export bundle
  7. **AVETMISS Statistical Summary** — demographic breakdown for pre-lodgement review

**Evidence update 2026-06-04:** the exact seven mandatory platform templates landed via `crm7#998`, tenant-scoped runnable RPC backends for all seven landed via `crm7#999`, and generic runner/export hardening landed via `crm7#1005`: `/reports/[key]` now uses the canonical view/RPC template runner, full-result CSV/XLSX exports are bounded to 50,000 rows, explicit exports use current filters rather than debounced stale values, template switches clear hidden parent params, seeded view templates have deterministic `orderBy` metadata, and unordered multi-page view exports fail closed. `crm7#1006` then reused the existing `saved_views` ownership model for per-user report preferences: saved column visibility/order, page-local grouping, visible-column page/full exports, tenant/user-scoped preference cache keys, and serialized saves so rapid changes cannot create duplicate/stale default report views. `crm7#1007` adds the over-cap queued CSV delivery path without introducing a service-role report-data bypass: the browser calls `report-delivery` with the user's bearer token, the edge function checks tenant membership plus template tenant/system binding, accepts only RPC templates with `tenantParam`, fetches report pages through an anon client carrying the user JWT, fails user-scoped retries terminally if the original request context is absent, strips internal delivery params before RPC invocation, caps delivery rows, emits BOM/header-labelled CSV, and sanitizes formula-leading values including CR/LF fragments. Remaining WS-5 work is AG Grid/native Excel decisions plus PDF/chart polish, not the mandatory backend catalogue, bounded small-export path, queued large CSV path, or column/grouping persistence.

### WS-6 · AVETMISS / NCVER Export (depends on WS-4, WS-5)
**What exists:** AVETMISS demographic fields are implemented in CRM7 `people` table migration `20260304000007` with all codes annotated. `FundingType` enum covers CTF/AASN/ASIP. The full mandatory AVETMISS 8.0 NAT formatter suite exists in `crm7/src/lib/avetmiss/`, and `crm7/supabase/functions/avetmiss-export/index.ts` generates/zips all 9 mandatory NAT files.
**What's needed:**
- Lodgement-grade validation/export hardening for the full AVETMISS 8.0 suite:
  - `NAT00010` — Training Organisation
  - `NAT00020` — Training Organisation Delivery Location
  - `NAT00030` — Course
  - `NAT00060` — Unit of Competency (from VET units table)
  - `NAT00080` — Subject (enrolment activity per UoC per client)
  - `NAT00085` — Prior Educational Achievement
  - `NAT00090` — Client (demographic record per apprentice)
  - `NAT00120` — Enrolment (Training Contract Identifier mandatory; links to NAT00090)
  - `NAT00130` — Outcome (completion code: 70=continuing, 20=complete, 40=withdrawn)
- National deadline: **28 February** each year (5pm ACDT)
- State STA extracts: WAAMS (WA, tab-delimited text v1.4), NSW Smart and Skilled eReporting, QLD DTET Partner Portal, SA STELA (monthly, second Friday)
- `Training Contract Identifier` field — keep the `20260423180000_ws6_avetmiss_fields.sql` schema path validated in NAT00120 and all STA submissions

**Evidence update 2026-06-04:** the earlier "NAT00020/30/60/80/85 missing" finding was stale. Those formatter files, their unit coverage, and edge-function generation paths landed in CRM7 via `crm7#770` (`c43e9b3e8b207cf175950ae7a2337603e27526c8`). Validation on CRM7 `development` passed `pnpm vitest run src/lib/avetmiss/__tests__/formatters.test.ts` (49/49) and `pnpm run typecheck`. The edge export API contract/source-query failure path was then hardened via `crm7#1002` (`ab20a2cf`): validation errors now persist/return `entityId` for the frontend drawer, malformed JSON/date/body inputs return explicit 400s, missing edge env returns explicit 500, and source table query failures stop generation instead of silently producing partial NAT archives. State STA TSV generation for WAAMS, NSW Smart and Skilled, QLD User Choice, and SA STELA landed via `crm7#1003` (`cf917321`), including reusable formatter coverage and edge zip/record-count wiring for non-empty state extracts. Focused AVETMISS tests (62/62), `pnpm run typecheck`, edge-file ESLint, and a local edge-runtime load check passed. WS-6 remains open for lodgement validation fixtures and agency-specific STA conformance checks.

### WS-7 · GTO National Standards Compliance Gaps (depends on WS-4, WS-5)
Fill the explicitly "Missing" or "Partial" items from the completeness matrix:
- **Standard 3.4 Financial Viability Dashboard** (High — Missing): financial health indicators (cash position, funding secured vs required, viability ratio) with registering-body alert thresholds
- **Induction register (1.2)**: structured induction checklist with apprentice sign-off capture and completion evidence pack export
- **Guardian sign-off system (1.1)**: under-18 acknowledgement workflow with notification dispatch
- **Host WHS audit register (1.3)**: site audit form, host capacity assessment, host agreement workflow
- **Training plan co-development sign-off (1.4)**: RTO discussion records, training plan sign-off evidence capture
- **Monitoring visit records (2.2)**: field officer contact log with structured visit record and training plan linkage
- **LLN assessment register**: Language, Literacy, Numeracy assessment entry and outcome recording
- **F17 PDF/XLSX renderer**: render `generateF17Data()` JSON output to downloadable PDF/XLSX for FWC lodgement

### WS-8 · RLS & Security Hardening (runs in parallel with WS-2 through WS-7)
From best-practice research:
- `org_members` table with `gto_role` enum: `gto_admin | gto_staff | field_officer | host_supervisor | apprentice`
- `SECURITY DEFINER` helper functions: `is_gto_staff()`, `get_user_role()`, `get_user_host_employer_id()`, `get_user_apprentice_id()`
- RLS policies for all new tables using `(SELECT auth.uid())` optimization (not `auth.uid()` inline — prevents per-row function call)
- Apprentices see only their own timesheets + progress; host supervisors see only their site's timesheets; invoices visible only to billing staff and host contacts
- pgTap tests for all RLS policies (note: SQL Editor bypasses RLS — must test via application client)

**Evidence update 2026-06-04:** HF-4 anon-context pgTAP harness landed via `crm7#949`; remaining noncanonical `SECURITY DEFINER` helper search paths were normalized with `pg_temp` last and least-privilege grants reasserted via `crm7#1000`. WS-8 remains open for incremental harness coverage as new WS-4/WS-5/WS-6 tables and policies land.

---

## Best-Practice Citations

| Topic | Source | Key Takeaway |
|---|---|---|
| MAPD API integration | [Fair Work MAPD Developer Docs](https://developer.fwc.gov.au) | 24h minimum cache TTL required; webhook events for `PayRatesForAward`, `PenaltiesForAward` |
| AVETMISS 8.0 spec | [NCVER AVETMISS 8.0 Data Standard](https://www.ncver.edu.au/research-and-statistics/data/avetmiss) | NAT file format, field definitions, Training Contract Identifier mandatory in NAT00120 |
| STP Phase 2 | [ATO STP Phase 2 employer guide](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/payroll/single-touch-payroll/what-you-need-to-report-through-stp/stp-phase-2-employer-reporting-guidelines) | Income type `LAB` for labour hire; YTD cumulative; disaggregated gross required |
| Payday Super | [ATO Payday Super](https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/payday-super) | 7 business days from payday (not 3); SBR2 reporting fields: YTD Qualifying Earnings + YTD super liability |
| WAAMS reporting | DTWD WA — TAMS v1.4 tab-delimited format | TRS Number mandatory; UoC outcomes due 31 January; annual reconciliation within 2 weeks of DTWD annual report |
| Timesheet audit trail | Fair Work Act ss.535–536 | 7-year retention; pay records, hours records, leave records all required |
| TanStack Table v8 | [TanStack Table docs](https://tanstack.com/table/v8/docs) | Column visibility, filtering, grouping, sorting — all in-memory; use `keepPreviousData` for async pagination |
| AG Grid Enterprise | [AG Grid Enterprise docs](https://www.ag-grid.com/react-data-grid/) | `ExcelExportModule` for native XLSX; `ServerSideRowModelModule` for >50k rows |
| Supabase RLS + `SECURITY DEFINER` | [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) | Always use `(SELECT auth.uid())` not inline `auth.uid()`; test via application client not SQL editor |
| Xero Payroll AU | [Xero Developer — Payroll AU](https://developer.xero.com/documentation/api/payroll-au/overview) | `EarningsRate` per award classification; pay run creation → approval → post sequence; batch timesheet import |
| pg_cron scheduling | [Supabase pg_cron extension](https://supabase.com/docs/guides/database/extensions/pg_cron) | Invoke Edge Functions for report delivery; schedule at cron time in UTC |

---

## Blindspots to Counter

| Blindspot | Counter |
|---|---|
| **Payday Super 3 vs 7 days** — current dashboard shows "3 business days" but legislation (Treasury Laws Amendment 2023) mandates 7 business days. | Explicitly correct this in WS-4. Do not preserve the existing "3 business days" wording. |
| **MAPD apprentice rate gap** — MAPD API does not return all apprentice rates; year-of-trade percentage tables (e.g. 42% for yr1 under-21 electrical) are separate. | WS-2 must include a `apprentice_rate_configs` supplementary table, not rely solely on MAPD. |
| **Annual allowance divide-by-52 bug** — `mapPaymentFrequency` converts `"per annum"` → `perWeek` without dividing by 52. This means annual allowances are 52× overstated. | WS-1/WS-2 must fix this in the mapper before any invoicing work is built on top. |
| **STP = Xero passthrough, not direct ATO** — The `chargeToPayroll` pipeline likely prepares data for Xero to submit (via SBR2), not a direct ATO connection. Treating it as direct would be architecturally wrong. | Determine and document which path is used before WS-4 payroll work proceeds. |
| **Training Contract Identifier missing from schema** — NAT00120 AVETMISS mandate it; if not in `engagements` or `people`, WS-6 export will fail validation. | Audit for this field in WS-6 kickoff; add migration if absent. |
| **Supabase publishable key format** — The new publishable key format (`sb_publishable_*`) is 47 chars and passes the `> 20` length check in `supabase.ts`. The old `anon` JWT format is different. Both formats need to work in the key-length guard. | When updating the key check, accept both `sb_publishable_*` format and JWT-format keys. |
| **RLS bypassed by SQL editor** — pgTap and SQL Editor both bypass RLS. Any RLS test must be run via the application's Supabase client (anon key), not via service role. | All WS-8 RLS tests use the anon key in a test harness, not the service role. |
| **Three calc engines will diverge further** — If WS-2 is built before WS-1 convergence decision, the engines will diverge again. | WS-1 is hard-blocked. Do not accept "we'll converge later" — it must be done first. |
| **Node 24, not Node 22** — Gap report explicitly flags Node 24 requirement. CI workflows for BSU and others must not pin Node 22. | All new workflow additions target `node-version: '24'`. |
| **`data-testid` over regex in tests** — Repo has a no-regex rule. Any new e2e tests added as part of this work must use `getByTestId()`, `getByRole()`, or `getByLabel()`. | Enforce in WS-3 through WS-7 when e2e tests are written. |

---

## Skills & MCPs to Use

| Skill / MCP | When |
|---|---|
| `supabase` (MCP connector) | All schema migrations, Edge Function deployment, RLS policy application, `execute_sql`, `apply_migration`, `list_tables` |
| `vercel` (MCP connector) | Deploy Edge Functions and check build logs for all apps |
| `github_mcp_direct` (connector via `gh` CLI) | Commit, push, PR creation across CRM7, BSU, bsuite monorepo |
| `xero-integration` (org skill) | Xero Payroll AU API — `EarningsRate`, pay run creation, batch invoice creation, OAuth token refresh |
| `supabase-postgres-best-practices` (org skill) | All schema design decisions — JSONB vs structured tables, indexing strategy for `wage_calculation_snapshots`, `timesheet_events` |
| `supabase-auth-comprehensive` (org skill) | RLS policy design, `SECURITY DEFINER` helper functions, role-based access for WS-8 |
| `ag-grid` (org skill) | AG Grid Enterprise for large-dataset reports in WS-5 |
| `tanstack-query` (org skill) | Data-fetching hooks for report builder and timesheet state machine |
| `forms-and-validation` (org skill) | React Hook Form + Zod for timesheet entry, induction register, guardian sign-off forms |
| `office/xlsx` (built-in skill) | F17 XLSX renderer in WS-7; AVETMISS NAT file generation in WS-6 |
| `office/pdf` (built-in skill) | Invoice PDF renderer in WS-3; Apprentice Progress Report PDF export in WS-5 |
| `dispatching-parallel-agents` (org skill) | WS-5 report templates and WS-7 compliance gaps can be built in parallel once WS-1/WS-2 are done |
| `writing-plans` (org skill) | Each workstream should have its own plan before execution; use this to produce WS-level implementation plans |
| `qa-and-verification` (org skill) | Before any WS is marked complete — run test suite, verify no regressions |
| `verification-before-completion` (org skill) | Before every PR — run build, lint, typecheck, tests |
| `git-workflow` (org skill) | Conventional commits, feature branch per WS, `development` branch only |

---

## The Refined Prompt

> **Scope:** GTO/labour-hire billing, payroll, and reporting system for the BSuite platform (CRM7 + BSU + bsuite monorepo). Target: `development` branch only. No merges to `main` without explicit user sign-off.
>
> **CRITICAL PREREQUISITE — WS-1: Calc Engine Convergence**
> Before any billing or payroll work begins, resolve the three-engine divergence (P2-4 from gap report). Write an ADR establishing `@bsuite/charge-calc` as the single canonical engine. Add migration shims in CRM7 and R80.3 to route their calculations through the package. Fix the `annualised allowance divide-by-52 bug` in `mapPaymentFrequency` at the same time. Do not skip this step.
>
> **WS-2: Award Rate & MAPD Edge Function**
> Implement the MAPD Supabase Edge Function (`supabase/functions/mapd-sync`) with 24h cache TTL against the `award_rates` table. Add `apprentice_rate_configs` supplementary table for year-of-trade percentage rates not covered by MAPD. Update `cost_factors.super_rate` to `0.12` with effective-date logic (1 Jul 2026). Add `wage_calculation_snapshots` immutable table for Fair Work 7-year retention.
>
> **WS-3: Host Invoicing**
> Implement the full invoice pipeline in CRM7: `invoices` and `invoice_line_items` tables (wages line GST-free, service fee GST-applicable, subsidy credit line per apprentice per program with ADMS reference). Build bulk invoice generation for all active engagements per billing period. Wire Xero batch invoice creation (50 per call, idempotency key = `engagement_id:period_start`). Government subsidies must appear as named charge-out-rate reductions on the invoice face with apprentice name (ATO requirement). Implement PDF invoice renderer for local record-keeping. Build an annual reconciliation report (billable weeks vs contracted, subsidy received vs invoiced).
>
> **WS-4: Timesheet & Payroll Pipeline**
> Implement the 7-state timesheet state machine with RLS-enforced role transitions. Add `timesheet_events` append-only audit log. Add `pay_runs` and `payroll_records` tables. First: determine whether `chargeToPayroll` submits to ATO directly or via Xero — document in an ADR, then wire accordingly using income type `LAB` for labour hire STP Phase 2 disaggregation. Fix the Payday Super display from "3 business days" to **7 business days** (Treasury Laws Amendment 2023). Wire Xero Payroll AU `EarningsRate` per award classification.
>
> **WS-5: Customisable Report Builder**
> Add `report_templates` JSONB table. Build interactive report viewer with TanStack Table v8 (column show/hide, filter, sort, group — state persisted to Supabase per user). Use AG Grid Enterprise for >50k-row datasets with native XLSX export. Add `pg_cron` + Edge Function for scheduled delivery. Build the 7 mandatory pre-built report templates listed in the decomposition above, including the AVETMISS Statistical Summary and GTO National Standards Audit Pack.
>
> **WS-6: AVETMISS / NCVER Export**
> Build NAT file generator for the full AVETMISS 8.0 suite (NAT00010 through NAT00130). Verify `Training Contract Identifier` exists on `engagements` table — add migration if absent. Add state STA extract variants: WAAMS (WA tab-delimited v1.4), NSW Smart and Skilled, QLD DTET, SA STELA monthly. National deadline is 28 February (5pm ACDT).
>
> **WS-7: GTO National Standards Gaps**
> Implement Standard 3.4 Financial Viability Dashboard (currently "Missing" — high severity). Implement induction register (1.2), guardian sign-off workflow (1.1, under-18), host WHS audit register (1.3), training plan co-development sign-off (1.4), monitoring visit records (2.2), and LLN assessment register. Render `generateF17Data()` JSON to downloadable PDF/XLSX using the `office/pdf` and `office/xlsx` skills.
>
> **WS-8: RLS & Security (parallel)**
> Add `org_members` table with `gto_role` enum. Implement `SECURITY DEFINER` helper functions. Apply RLS policies to all new tables using `(SELECT auth.uid())` optimization. Verify all policies via application client (anon key), not SQL Editor.
>
> **Constraints (non-negotiable):**
> - Node 24 in all CI workflows (not 22)
> - No inline `oklch()` values in JSX/className — CSS tokens only
> - No regex in Playwright tests — use `getByTestId()`, `getByRole()`, `getByLabel()`
> - `no-text-white` rule is `warn` not `error`
> - pnpm lockfiles generated outside the bsuite tree (use `/tmp/`)
> - All commits to `development` branch only
> - Conventional commit format per `git-workflow` skill
> - No deferred items — if something is scoped here, implement it fully
>
> **Use these skills/MCPs during the work:**
> `supabase` MCP, `vercel` MCP, `github_mcp_direct` (gh CLI), `xero-integration`, `supabase-postgres-best-practices`, `supabase-auth-comprehensive`, `ag-grid`, `tanstack-query`, `forms-and-validation`, `office/xlsx`, `office/pdf`, `dispatching-parallel-agents`, `writing-plans`, `qa-and-verification`, `verification-before-completion`, `git-workflow`

---

## Assumptions Made (Clarify if Wrong)

Since clarifying questions were not answered before this pass, the following defaults were applied. Correct any that are wrong before execution begins:

| # | Assumption | Default Applied |
|---|---|---|
| A1 | **Which apps host reporting/payroll/billing** | CRM7 is the primary host for all GTO operational screens (billing, payroll, reports, compliance). BSU provides the multi-tenant platform overview (GTO.tsx). bsuite monorepo packages host the shared calc engine. |
| A2 | **Award rate source** | MAPD API primary, with local `apprentice_rate_configs` table supplementing where MAPD is incomplete. EBA layer handled via existing `awards` table with `is_public=false` tenant records. |
| A3 | **Report format** | Both: pre-built named templates AND a user-configurable report builder. The 7 pre-built templates in WS-5 are non-negotiable; the builder is additive. |
| A4 | **Timesheet flow** | Configurable per engagement: default is `apprentice self-service → host supervisor approval → GTO field officer review → GTO payroll staff export`. The state machine in WS-4 supports all four roles. |
| A5 | **STP path** | Assumed Xero passthrough (not direct ATO SBR2). Must be confirmed via code read of `chargeToPayroll` before WS-4 proceeds. |

---

*Document produced by prompt-enhancer Heavy tier. Pass 1: decomposition. Pass 2: best-practice research (MAPD, AVETMISS, STP, Xero Payroll AU, TanStack Table v8, AG Grid, Supabase RLS). Pass 3: blindspot audit. Pass 4: cross-referenced against gto-codebase-audit.md (566 lines), gto-bestpractice-research.md (1441 lines), gto-regulatory-reporting.md (833 lines). Pass 5: user sign-off required before execution.*
Apprentice Rate Configs — Refined Implementation Prompt
Prompt-Enhancer Tier: Standard (4 topics, known stack, production data integrity stakes)
Produced: 2026-04-23 | Silo: BSuite (bsuite_* keys)
Target branch: development only

Intent
Pre-populate the apprentice_rate_configs supplementary table (introduced in WS-2 of the GTO billing plan) with the top NCVER trade apprenticeship wage percentages for FY2025-26, covering the three apprentice types the system must handle — junior (under 21), adult (21+), and school-based (SBA/SBT still enrolled in Year 11/12). Seed data must distinguish whether the apprentice completed Year 10 only vs Year 12 at time of commencement, which determines the Year-1 percentage under most awards. Add a persistent guidance mechanism (toast-based onboarding + help banner) instructing operators how to add additional awards and reminding them to review all rates annually after each Fair Work minimum wage decision (typically effective 1 July). Extend the same annual-review reminder pattern to superannuation (12.0% from 1 Jul 2026) and other percentage-based cost factors. Where a tenant has an active Jodie AI subscription, the annual review can be triggered and partially automated via Jodie AI using the Vercel AI Gateway.

Decomposition
WS-A · apprentice_rate_configs Table + Seed Data
Depends on: WS-1 calc engine convergence (must exist before seeding)

Table schema
sql
CREATE TABLE apprentice_rate_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),           -- NULL = public/shared default
  award_code      TEXT NOT NULL,                         -- e.g. 'MA000025', 'MA000020', 'MA000010'
  award_name      TEXT NOT NULL,
  trade_name      TEXT NOT NULL,                         -- human-readable e.g. 'Electrician'
  apprentice_type TEXT NOT NULL CHECK (apprentice_type IN ('junior_yr10','junior_yr12','adult','sba_sbt')),
  year_of_trade   INT  NOT NULL CHECK (year_of_trade BETWEEN 1 AND 6),
  wage_percentage NUMERIC(5,2) NOT NULL,                 -- e.g. 55.00 (meaning 55% of trade rate)
  effective_from  DATE NOT NULL,
  effective_to    DATE,                                  -- NULL = currently in force
  source          TEXT NOT NULL DEFAULT 'fairwork_award',-- 'fairwork_award' | 'eba' | 'manual'
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON apprentice_rate_configs(award_code, apprentice_type, year_of_trade, effective_from);
CREATE INDEX ON apprentice_rate_configs(tenant_id);
apprentice_type semantics:

junior_yr10 — under 21 at commencement, did NOT complete Year 12 (completed Year 10 or equivalent)

junior_yr12 — under 21 at commencement, completed Year 12

adult — 21 or older at commencement (minimum wage floor = NMW applies; fixed rate per year not %)

sba_sbt — school-based apprentice/trainee (part-time, usually 1–3 days/week while still enrolled in Year 11–12)

For adult type: wage_percentage column stores the percentage of the trade rate BUT the system must enforce a floor: MAX(percentage × trade_rate, national_minimum_wage). For carpentry (MA000010) the adult rate is the same across all years (100% of trade rate from Year 1 — no graduation). Store 100.00 and note accordingly.

Seed data — Top NCVER trade apprenticeships (FY2025-26, effective 1 Jul 2025)
Source: NCVER quarterly data (Construction Trades and Electrotechnology are #1 and #2 by commencements nationally). Rates from Fair Work PACT tool and MIGAS FY26 guide, verified against award documents.

IMPORTANT NOTE for implementation: These are percentage-of-trade-rate values. The actual dollar weekly rates shown below are derived from FY2025-26 base rates; they are for reference only. The system stores percentages and derives dollars at runtime from the current trade rate, which changes annually.

1. Electrician / Air Conditioning & Refrigeration / Instrumentation
Award: Electrical, Electronic and Communications Contracting Award (MA000025)
FY26 Trade (C10 Electrician) rate: ~$1,508/wk full rate (incl. allowances)

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 42% 55% 75% 88%
junior_yr12 55% 65% 75% 88%
adult 100% floor¹ 100% 100% 100%
sba_sbt 42% 55% 75% —
¹ Adult: minimum = NMW ($948/wk FY26). MA000025 adult yr1 = $939.33/wk which is below NMW — system must apply floor automatically.

Trades using this award: Electrician, Air Conditioning & Refrigeration Mechanic, Instrumentation & Control Technician, Telecommunications Technician.

1. Carpenter / Joiner / Bricklayer / Ceiling Fixer / Plasterer
Award: Building and Construction General On-site Award (MA000020)
FY26 Trade (CW3) rate: ~$1,071.22/wk

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 55% 65% 80% 95%
junior_yr12 60% 70% 80% 95%
adult 100%¹ 100% 100% 100%
sba_sbt 55% 65% 80% —
¹ Adult carpentry: $1,071.22/wk across all years (above NMW — no floor adjustment needed).

Trades using this award: Carpenter, Joiner, Bricklayer, Plasterer, Ceiling & Partition Fixer, Formwork Carpenter.

1. Plumber / Gasfitter / Drainer / Fire Sprinkler
Award: Plumbing and Fire Sprinklers Award (MA000036)
FY26 Trade rate: ~$1,040/wk

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 42% 55% 75% 88%
junior_yr12 55% 65% 75% 88%
adult 100% floor 100% 100% 100%
sba_sbt 42% 55% 75% —
4. Boilermaker / Fitter & Turner / Fitter Machinist / Mechanical Fitter / Sheet Metal / Welder
Award: Manufacturing and Associated Industries and Occupations Award (MA000010)
FY26 Trade rate: ~$854.47/wk yr1 base (varies by classification level)

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 42% 55% 75% 88%
junior_yr12 55% 65% 75% 88%
adult 100% floor 100% 100% 100%
sba_sbt 42% 55% 75% —
5. Vehicle Mechanic / Heavy Vehicle / Mobile Plant / Panel Beater / Auto Electrician
Award: Vehicle Repair, Services and Retail Award (MA000089)
FY26 Trade rate: ~$854.47/wk

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 42% 55% 75% 88%
junior_yr12 55% 65% 75% 88%
adult 100% floor 100% 100% 100%
sba_sbt 42% 55% 75% —
6. Hairdresser
Award: Hair and Beauty Industry Award (MA000005)
FY26 Trade rate: varies by level

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 50% 60% 75% 90%
junior_yr12 55% 65% 75% 90%
adult 100% floor 100% 100% 100%
sba_sbt 50% 60% 75% —
Note: Hairdressing is typically 3 years not 4. Year 3 = final year.

1. Chef / Cook
Award: Hospitality Industry (General) Award (MA000009)
FY26 Trade rate: ~$950/wk

apprentice_type Yr 1 Yr 2 Yr 3 Yr 4
junior_yr10 50% 60% 75% 90%
junior_yr12 55% 65% 75% 90%
adult 100% floor 100% 100% 100%
sba_sbt 50% 60% 75% —
Note: Commercial Cookery is typically 3 years.

1. Refrigeration & Air Conditioning Mechanic (commercial)
Award: Same as MA000025 above — see Electrician entry.

Annual Review Reminder pattern
A rate_review_reminders table (or a scheduled pg_cron job) triggers a notification to GTO admin users each year:

sql
-- pg_cron: runs 1 July every year at 08:00 AWST (00:00 UTC)
SELECT cron.schedule('annual-rate-review', '0 0 1 7 *', $$
  INSERT INTO notifications (tenant_id, type, title, body, created_at)
  SELECT id, 'rate_review',
    'Annual apprentice rate review required',
    'Fair Work minimum wages changed from 1 July. Review all apprentice_rate_configs, super_rate (now 12.0%), payroll_tax thresholds, and workers_comp rates before processing payroll.',
    now()
  FROM tenants WHERE status = 'active';
$$);
WS-B · UI: Rate Config Management Page
Route: /settings/apprentice-rates (CRM7)

Components:

Rate table — AG Grid showing all apprentice_rate_configs rows filterable by award, trade, type. effective_from date column sortable. Current/historical toggle.

Add/edit form — React Hook Form + Zod. Fields: award code (MAPD-autocomplete), trade name, apprentice type (select), year of trade (1–6), wage percentage, effective from date.

Import from MAPD — button triggers Edge Function to pull latest classifications from MAPD API for the selected award and suggest percentages (where MAPD has them).

Guidance toast / onboarding banner:

tsx
// Shown on first visit and anytime no custom rates exist for a tenant
<Banner variant="info" data-testid="rate-config-guidance-banner">
  <BannerIcon><Info /></BannerIcon>
  <BannerContent>
    <strong>Pre-loaded rates cover the top 8 trade awards (effective 1 July 2025).</strong>
    To add your own award: click "Add Rate Config", enter the award code from the
    <a href="https://www.fwc.gov.au/agreements-awards/awards/find-award" target="_blank">
      Fair Work award finder
    </a>, and enter the percentage from the award's Schedule of Wages.
    <strong> Review all rates each 1 July</strong> when Fair Work publishes the annual
    minimum wage decision (typically released in June, effective 1 July).
  </BannerContent>
  <BannerDismiss />
</Banner>
Annual review toast (triggered by notification from pg_cron):

tsx
toast({
  title: "Annual rate review required",
  description: "Fair Work minimum wages change on 1 July. Check apprentice wage percentages, superannuation rate, and state payroll tax thresholds before processing the new financial year's payroll.",
  action: <ToastAction altText="Review now" onClick={() => navigate('/settings/apprentice-rates')}>Review now</ToastAction>,
  duration: Infinity, // stays until dismissed
});
Super rate & cost factor review card — separate card on the same settings page showing current super_rate, payroll_tax_rate (per state), workers_comp_rate. Each has an "Edit" button and a "Last reviewed" date. Yellow warning badge if last_reviewed_at is more than 11 months ago.

WS-C · Jodie AI Integration for Annual Rate Review
Condition: Only available if tenant has feature_flags.jodie_ai = true (subscription check).

Architecture: Jodie AI is an internal AI assistant connected via Vercel AI Gateway. The gateway acts as the proxy/router — Jodie is not a separate provider but a configured endpoint on the tenant's Vercel deployment.

Connection pattern (from Vercel AI SDK docs):

typescript
// lib/jodie-client.ts
import { createGateway } from 'ai';

export const jodieGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,        // Vercel AI Gateway key
  baseURL: 'https://ai-gateway.vercel.sh/v3/ai', // default gateway URL
});

// Use Jodie as a model string routed through the gateway
// Jodie's model slug to be confirmed — likely a fine-tuned or configured model
export const JODIE_MODEL = process.env.JODIE_AI_MODEL_SLUG ?? 'anthropic/claude-sonnet-4-6';
Rate review flow:

typescript
// When annual review toast is clicked and user has Jodie subscription:
const { text } = await generateText({
  model: jodieGateway(JODIE_MODEL),
  system: `You are Jodie, a GTO payroll specialist AI. The user needs to review their
    apprentice rate configs for the new financial year. You have access to:
    - Current rate configs (provided as context)
    - The Fair Work annual wage decision summary (fetch from FWC)
    - The new super rate (12.0% from 1 Jul 2026)
    Identify which rates need updating, suggest new percentages, and flag any
    award codes that have been superseded or consolidated.`,
  prompt: `Review these rate configs for FY${currentFY} and identify what needs to change:
    ${JSON.stringify(currentRateConfigs)}`,
  providerOptions: {
    gateway: {
      order: ['anthropic', 'openai'], // fallback chain
    },
  },
});
Feature flag check:

typescript
// In the settings page component
const { data: flags } = useFeatureFlags();
const hasJodieAI = flags?.jodie_ai === true;

{hasJodieAI ? (
  <Button onClick={triggerJodieReview} data-testid="jodie-review-btn">
    <Sparkles className="h-4 w-4 mr-2" />
    Review with Jodie AI
  </Button>
) : (
  <Tooltip content="Upgrade to a Jodie AI subscription to automate rate reviews">
    <Button disabled data-testid="jodie-review-btn-locked">
      <Lock className="h-4 w-4 mr-2" />
      Review with Jodie AI
    </Button>
  </Tooltip>
)}
Environment variables needed:

text
AI_GATEWAY_API_KEY=<Vercel AI Gateway API key>
JODIE_AI_MODEL_SLUG=<model slug — confirm with Braden>
JODIE_AI_ENABLED=true
Best-Practice Citations
Topic Source Takeaway
FY2025-26 Yr1 wages by trade
MIGAS FY26 guide
Dollar rates for reference; percentages derived from award schedule
Award percentage tables
FCTA 2013 decision
Post-2013 standard: Yr12 complete = 55%/65%/75%/88%; not Yr12 = 50%/60%/75%/88% (or 42%/55% for electro)
Junior pay rates
Fair Work Ombudsman
Age-based %; for apprentices the year-of-trade table overrides the age table
Annual wage decision FWC Annual Wage Review Effective 1 July each year; GTOs must update rate configs before first July payrun
Payday Super + super rate ATO Payday Super 12.0% from 1 Jul 2026; 7 business days from payday
Vercel AI Gateway
Vercel AI Gateway docs
createGateway({ apiKey, baseURL }) — single key for all providers; OIDC auto-auth on Vercel
AI SDK v5 createGateway
AI SDK Gateway provider
baseURL: 'https://ai-gateway.vercel.sh/v3/ai'; provider fallback via providerOptions.gateway.order
NCVER top trades
AI Group commencement data
Carpentry, Plumbing, Electrical = top 3 by demand nationally
Blindspots to Counter
Blindspot Counter
Adult rate is not always a percentage — For many awards (e.g. MA000020 carpentry) adult apprentices receive the full trade rate from Year 1, not a graduated percentage. The wage_percentage column should store 100.00 with a note, and the engine must apply MAX(percentage × trade_rate, NMW). Enforce in the rate engine: adult type always uses MAX(computed_rate, current_nmw). NMW for FY26 = $948/wk.
SBA/SBT is part-time — hours matter — School-based apprentices typically work 1–3 days per week. The percentage applies to pro-rata hours, not a 38hr week. apprentice_rate_configs for sba_sbt type should have a typical_hours_per_week field (default 14). The charge-out calculation uses actual approved hours, not 38.
MAPD does not return apprentice percentages — The MAPD API returns classification base rates but NOT the year-of-trade percentage schedule for apprentices. This table is the whole point — it must be manually seeded. Do not attempt to auto-derive these from MAPD. The seed data above is the canonical source. The "Import from MAPD" button only fills the base trade rate reference, not the percentage.
Percentages changed post-2013 FWC decision — The 2013 National Wage Case changed Year 1 Yr12-complete from 42% to 55% and Year 2 from 55% to 65% for most awards. Any rates cached from pre-2013 sources are wrong. Use the post-2013 schedule only. Clearly document effective_from: '2014-01-01' on all seed records.
Jodie AI model slug not confirmed — We don't know which model slug Jodie AI resolves to on the Vercel AI Gateway. Using anthropic/claude-sonnet-4-6 as default is reasonable but must be configurable via env var. JODIE_AI_MODEL_SLUG env var with sensible default. Never hardcode the model string.
toast.duration = Infinity — A persistent toast that never auto-dismisses can be annoying. Use a persistent banner component (not sonner toast) for the first-visit guidance, and use the annual review toast only when triggered by the notification system. Two separate UX patterns: Banner (dismissible, stored in localStorage) for first-visit; Toast (with explicit "Review now" action) for the annual reminder only.
effective_to = NULL doesn't mean "currently in force" uniquely — Multiple rows may have effective_to = NULL if the migration history was done wrong. Add a partial unique index: CREATE UNIQUE INDEX ON apprentice_rate_configs (award_code, apprentice_type, year_of_trade) WHERE effective_to IS NULL AND tenant_id IS NULL; — ensures only one active public rate per slot.
Skills & MCPs to Use
Skill / MCP When
supabase MCP Apply migration for apprentice_rate_configs table + partial unique index; run seed data via execute_sql; deploy pg_cron reminder job
ag-grid (org skill) Rate config table in /settings/apprentice-rates
forms-and-validation (org skill) Add/edit form with Zod validation — percentage must be 1–100, year_of_trade 1–6, effective_from required
tanstack-query (org skill) useQuery for rate configs; useMutation for add/edit/soft-delete
shadcn-ui (org skill) Banner component, Toast with action, Tooltip for locked Jodie button
supabase-postgres-best-practices (org skill) Partial unique index strategy; pg_cron job syntax
vercel MCP / connector Set AI_GATEWAY_API_KEY + JODIE_AI_MODEL_SLUG env vars on the CRM7 Vercel project
github_mcp_direct Commit, push, PR on CRM7 development branch
verification-before-completion (org skill) Before PR: build, lint, typecheck, tests all pass
The Refined Prompt
Task: Implement the apprentice_rate_configs supplementary table, seed it with pre-loaded rates for the top 8 Australian trade apprenticeship awards (effective 1 Jul 2025), build the rate management UI in CRM7 at /settings/apprentice-rates, and wire the annual review reminder system — including Jodie AI integration for tenants with the appropriate subscription.

Step 1 — Migration
Apply the apprentice_rate_configs table migration to Supabase project tuybltdrdefjblnplpqo. Include:

The table schema exactly as specified (tenant_id nullable, apprentice_type CHECK constraint, partial unique index for NULL tenant_id rows)

A sba_typical_hours_per_week column (INT DEFAULT 14) on rows where apprentice_type = 'sba_sbt'

An audit updated_at trigger

Step 2 — Seed data
Insert the pre-loaded percentage tables for the 8 awards listed above. All seed records have tenant_id = NULL (public/shared defaults) and effective_from = '2025-07-01'. Source = 'fairwork_award'.
Awards to seed: MA000025 (Electrical), MA000020 (Building & Construction), MA000036 (Plumbing), MA000010 (Manufacturing), MA000089 (Vehicle), MA000005 (Hair & Beauty), MA000009 (Hospitality).

Step 3 — pg_cron annual reminder
Schedule a pg_cron job at 0 0 1 7 * (1 July 00:00 UTC) to insert a rate_review notification for all active tenants.

Step 4 — Rate management UI in CRM7
Build /settings/apprentice-rates with:

AG Grid table of current configs (filter by award, trade, apprentice_type)

Add/edit drawer with React Hook Form + Zod

"Import from MAPD" button (calls existing MAPD edge function to fetch trade rate reference — does NOT auto-fill percentages)

First-visit guidance Banner (data-testid="rate-config-guidance-banner") using localStorage dismissal key 'rate_config_banner_dismissed'

Super rate + cost factor review card with "Last reviewed" date and yellow warning if > 11 months old

Step 5 — Annual review toast
Wire the rate_review notification type to display a persistent shadcn Toast with a "Review now" CTA when the user next logs in after a notification exists.

Step 6 — Jodie AI integration

Add AI_GATEWAY_API_KEY and JODIE_AI_MODEL_SLUG to CRM7 Vercel project env vars (all environments)

Create lib/jodie-client.ts using createGateway from ai package with baseURL: 'https://ai-gateway.vercel.sh/v3/ai'

Gate the "Review with Jodie AI" button behind feature_flags.jodie_ai === true

When active: call generateText with the current rate configs as context, asking Jodie to identify what needs updating for the new FY. Stream the response into a side panel.

When locked: show disabled button with tooltip "Upgrade to Jodie AI to automate rate reviews"

Constraints:

No regex in tests — getByTestId() / getByRole() only

No inline oklch() in JSX — CSS tokens only

data-testid on all key interactive elements: "rate-config-table", "add-rate-config-btn", "rate-config-guidance-banner", "annual-review-toast", "jodie-review-btn", "jodie-review-btn-locked", "super-rate-review-card"

All commits to development branch only, conventional commit format

Node 24 in any CI workflow changes

Use these skills/MCPs: supabase MCP, ag-grid, forms-and-validation, tanstack-query, shadcn-ui, supabase-postgres-best-practices, vercel MCP, github_mcp_direct, verification-before-completion

Assumptions (confirm if wrong)
# Assumption
A1 Jodie AI model slug is configurable via env var — exact slug TBC by Braden
A2 feature_flags table already exists in CRM7 Supabase with a jodie_ai boolean column
A3 The Vercel AI Gateway API key (AI_GATEWAY_API_KEY) is a team-level key already created in the Vercel dashboard — if not, create it at Vercel Dashboard → AI Gateway → API Keys
A4 SBA/SBT hours default to 14/wk (2 days); field officers can override per engagement
A5 The annual reminder runs on 1 July (FY start) not when FWC publishes the decision (June) — operators are expected to review in early July before the first payrun
ADR-001 · @bsuite/charge-calc as Single-Source Calculation Engine
Date: 2026-04-23
Status: Accepted
Deciders: Braden Lang (GTO Product Owner), Computer (AI architect)
Supersedes: N/A — first formal ADR for this decision space

Context
BSuite was developed across three separate apps (R80.3, CRM7, business-suite-unified)
with overlapping charge-rate calculation logic. At the point of this ADR three partial
implementations existed:

packages/charge-calc — the shared package, containing calculate.ts (the cost
engine), mapd-mapper.ts (MAPD API normalization), and billing.ts. Published as
@bsuite/charge-calc.

R80.3 calcBridge.ts — a thin adapter around @bsuite/charge-calc; calls
toCalcConfig → sharedCalculate → fromCalcResult. Already the canonical path.

CRM7 crmCalcBridge.ts — also wraps @bsuite/charge-calc; mirrors R80.3's
pattern for payroll-side rate display.

A fourth "engine" existed implicitly in R80.3/src/services/awardRulesEngine.ts — a
rules engine for legal wage resolution. This is NOT a separate calculator; it resolves
the legally correct wage rate that is then passed into @bsuite/charge-calc.

Decision
**@bsuite/charge-calc@bsuite/charge-calc is the canonical, single-source calculation engine for all
charge-rate, payroll-rate, and cost calculations across BSuite.**

The calc-bridge pattern (a thin adapter between app-level rate resolution and the shared
engine) is the approved integration method.

text
App Rate Resolution (R80.3 awardRulesEngine / CRM7 crmCalcBridge)
    │
    ▼
@bsuite/charge-calc (sharedCalculate / calculate.ts)   ← CANONICAL ENGINE
    │
    ▼
CalcResult → charge rates, payroll rates, on-cost totals
No third engine shall be introduced. Any new calculation requirement is implemented
inside @bsuite/charge-calc first, then exposed via the bridge.

Data flow authority
Data Authority Reads
FWC award rates R80.3 fairworkApi.ts (live MAPD API + DB cache) CRM7 reads via award_rates / host_charge_rates tables
Apprentice rate configs CRM7 apprentice_rate_configs Supabase table (seeded + tenant overrides) R80.3 reads via fairworkApi.fetchApprenticeRateConfigs()
Legal wage resolution R80.3 awardRulesEngine.ts Wraps both sources above; output → calcBridge
Cost calculation @bsuite/charge-calc (canonical engine) Receives resolved wage + config
Host charge rates Written by R80.3 crm7SyncService.ts → host_charge_rates CRM7 reads for invoicing
Payroll runs CRM7 chargeToPayroll.ts → PayrollAdapter Xero Payroll AU API passthrough
Consequences
Positive
Single implementation eliminates divergence risk (previously annual allowances were
calculated differently in each app; BUG-1 would have been caught earlier).

New rate rules (e.g. SBA/SBT supplements, EBA overrides) are added once, in
@bsuite/charge-calc, and flow to all apps.

Testability: @bsuite/charge-calc has its own test suite independent of any app.

Compliance audit: every rate calculation passes through the same audited code path.

Negative / Trade-offs
App-level UI logic (e.g. CRM7's AwardRateSelector) must remain coordinated with
R80.3's rate fetch. This is managed via the apprentice_rate_configs table (CRM7 owns,
R80.3 reads via fetchApprenticeRateConfigs).

Any breaking change to CalcConfig or CalcResult types in @bsuite/charge-calc
must be coordinated across both bridges. Semantic versioning is enforced on the package.

Bugs fixed as part of this ADR (WS-1)
Bug Location Fix
Bug Location Fix
BUG-1 CRITICAL mapd-mapper.ts mapWageAllowance / mapExpenseAllowance Annual allowance amounts now divided by 52 before entering CalcConfig. A new isAnnualFrequency() helper is exported and 4 regression tests added.
BUG-2 HIGH chargeToPayroll.ts:44, jodie-persona.ts:94 Payday Super employer deadline corrected to 7 business days (Treasury Laws Amendment 2023).
BUG-4 HIGH R80.3 rules engine / fairworkApi fetchApprenticeRateConfigs() added to fairworkApi.ts; ResolveRatePackageInput extended with apprenticeRateConfigs?; Step 2b in resolveRatePackage applies percentage overrides while preserving FWC legal floor.
BUG-5 LOW R80.3/src/types/index.ts JSDoc superRate comment updated to reflect 12% (1 July 2025).
Compliance Notes
Payday Super: 7 business days (not 3) from pay run to fund receipt. Effective 1 July 2026.
Treasury Laws Amendment (Better Targeted Superannuation Debate) Act 2023.

Annual Minimum Wage: Award rates change 1 July annually. fetchApprenticeRateConfigs
rows with effective_to IS NULL are the live rates. A pg_cron job fires 1 July to trigger
a review notification.

SG Rate: 12% from 1 July 2025. Will rise to 12% (no further increases legislated).
All references to 11.5% in JSDoc are now corrected.

Related
Master Implementation Plan v1.00W

GTO Billing Reporting Plan

Apprentice Rate Configs Plan

WS-2: MAPD Edge Function (next — depends on this ADR being implemented)
WS-1 Complete — Calc Engine Convergence
All 4 bugs fixed, 64 tests passing, committed and pushed across 3 repos.

What was fixed
BUG-1 (CRITICAL) — packages/charge-calc mapd-mapper.ts

Added isAnnualFrequency() helper

mapWageAllowance and mapExpenseAllowance now divide allowance_amount / 52 when payment_frequency is "per annum" or "per year"

4 regression tests added — confirms $2600/yr → $50/wk, $1040/yr → $20/wk, null passthrough, non-annual unchanged

All 64 mapd-mapper tests pass

BUG-2 (HIGH) — crm7

chargeToPayroll.ts:44 — corrected JSDoc to "7 business days" with the correct legislation citation (Treasury Laws Amendment 2023)

jodie-persona.ts:94 — reworded to state employer's 7-business-day obligation clearly, removing the ambiguous "3 business days to allocate" phrasing

BUG-4 (HIGH) — R80.3

fairworkApi.ts — new fetchApprenticeRateConfigs(awardCode, yearOfTrade?) function; reads from apprentice_rate_configs Supabase table; uses existing in-memory cache; added to default export

awardRulesEngine.ts — ResolveRatePackageInput extended with optional apprenticeRateConfigs?: ApprenticeRateConfig[]; Step 2b added to resolveRatePackage() applying wage_percentage × lowestAdultClassificationRate as base rate, with FWC legal floor preservation and full audit logging to appliedRules

BUG-5 (LOW) — R80.3

types/index.ts CostConfig.superRate JSDoc updated to 0.12 (from 0.115)

ADR-001 — crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md written; documents @bsuite/charge-calc as canonical engine, calc-bridge pattern, data flow authority table, and all WS-1 bug fixes

Commits
crm7/development → f8718a3

R80.3/feat/phase5-consumer-r80-embed → 8c10980

packages/charge-calc/feat/phase5-schema-registry → 5ab1024

Next: WS-2
MAPD Supabase Edge Function + wage_calculation_snapshots table migration. Depends on WS-1 being merged. Ready to start whenever — no further blockers.
BSuite GTO — Full System Master Implementation Plan
Version: v1.00W (Working Draft)
Date: 2026-04-23
Prompt-Enhancer Tier: Heavy (8 workstreams, production + regulatory stakes)
Silo: BSuite (bsuite_* memory keys only)
Target branch: development — NO merges to main without explicit user sign-off
One-shot policy: Nothing deferred. Every scoped item is implemented fully in this plan.

For Claude: REQUIRED SUB-SKILL: Use executing-plans or subagent-driven-development to implement this plan task-by-task.

One-Shot Policy Reference
All AGENTS.md files across the monorepo (root, crm7, R80.3, BSU, conduit) reference the DRY one-shot pattern from docs/20260227-dry-one-shot-architecture-v1.04A.md:

Enter once, use everywhere.
Every piece of data has exactly ONE authoritative entry point.
All other apps READ from that source via Supabase.
No duplication of forms, no re-keying, no local copies.

Ownership map relevant to this plan:

Entity Owner READ-only apps
Award Rates R8 (via FWC API + award_rate_cache) CRM7 (payroll ref)
Charge Calculations R8 (via charge_calculations / host_charge_rates) CRM7 (invoicing)
Apprentice Rate Configs CRM7 (apprentice_rate_configs, now live) R8 (via Supabase read)
Timesheets CRM7 R8 (hours→charges)
Invoices/Financial CRM7 BSU (revenue dashboard)
Apprentices/People CRM7 R8, BSU
Host Employers CRM7 R8 (charge-to target)
Critical implication: apprentice_rate_configs now lives in Supabase (CRM7-owned). R8's AwardRateSelector currently reads from the FWC API only — it must be updated to also read apprentice_rate_configs for year-of-trade percentage supplements. This is a new dependency that WS-1 and WS-2 must wire.

Full Rate Calculation Data Flow (R8 → CRM7 → Portals)
text
FWC MAPD API
    │ (24h cached, auth-fairwork edge fn)
    ▼
award_rate_cache (Supabase)          apprentice_rate_configs (Supabase)
    │                                        │
    └────────────────────┬───────────────────┘
                         ▼
              R8 awardRulesEngine.ts
              (pure computation — AP/AA/TN/JN resolution,
               OTE derivation, SBAT loading, junior stepping,
               existing-worker preservation, CBP progression)
                         │
                         ▼
              @bsuite/charge-calc (calculate())
              [CalcConfig → CalcResult]
              Billing models: Standard (leave/training-derived) / ALEX48(48w) / W52(52w)
              On-costs: super + WC + payroll tax + leave loading + overhead + margin
              Allowances: per-hour / per-day / per-week / percent / perKm
                         │
              calcBridge.ts (toCalcConfig / fromCalcResult)
                         │
                         ▼
              host_charge_rates (Supabase)        charge_calculations (Supabase)
              [crm7SyncService pushes]            [chargeCalculationsService saves]
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    CRM7 invoicing  CRM7 payroll   BSU dashboard
    chargeToBilling  chargeToPayroll  bi_metrics
    billingEngine    (→ Xero payroll) (revenue)
          │              │
          ▼              ▼
    invoices table   pay_runs /        wage_calculation_snapshots
    (host billing)   payroll_records   (Fair Work 7yr retention)
          │              │
          ▼              ▼
    Xero batch       STP Phase 2       timesheets (7-state machine)
    invoice API      (via Xero SBR2)   timesheet_events (audit log)
          │
          ▼
    HOST EMPLOYER PORTAL (read invoices, approve timesheets)
    APPRENTICE PORTAL    (view pay slips, progress, timesheets)
    FIELD OFFICER PORTAL (monitoring visits, training plans)
Bugs Found In Codebase (Fix Before Building On Top)
ID Location Bug Severity Fix
BUG-1 packages/charge-calc/src/awards/mapd-mapper.ts:67 mapPaymentFrequency maps "per annum" → perWeek type but does NOT divide the amount by 52. Annual allowances are 52× overstated in charge rate calculations. CRITICAL In mapd-mapper.ts, when lower.includes('annum'), set type to perWeek AND divide amount by 52. Add unit test confirming $2600/yr → $50/wk.
BUG-2 crm7/src/lib/pipelines/chargeToPayroll.ts:44 Comment says "3 business days" — but Treasury Laws Amendment 2023 mandates 7 business days. Jodie persona also says "3 business days" in jodie-persona.ts:94. HIGH Fix comment, JSDoc, and any display strings. Search all apps for "3 business days" related to Payday Super.
BUG-3 crm7/src/lib/pipelines/chargeToPayroll.ts — PAYDAY_SUPER_EFFECTIVE_DATE constant is correct (2026-07-01) but the comment on line 44 contradicts it. MEDIUM Fix comment only. Logic is correct.
BUG-4 apprentice_rate_configs table now exists in Supabase but R8's AwardRateSelector and awardRulesEngine do NOT read from it — they only use FWC API rates. Year-of-trade percentage supplements from our seed data are invisible to R8. HIGH WS-1: Add fetchApprenticeRateConfigs() to R8's fairworkApi.ts service; update awardRulesEngine.resolveRatePackage() to apply percentage overrides from apprentice_rate_configs where present.
BUG-5 CostConfig.superRate in R80.3/src/types/index.ts JSDoc says // e.g., 0.115 for 11.5% but calcBridge.ts sets superRate: 0.12 (correct from 1 Jul 2025). Type comment is stale. LOW Update JSDoc comment in types/index.ts.
Workstreams
WS-1 · Calc Engine Convergence + apprentice_rate_configs Integration (PREREQUISITE — blocks WS-2, WS-3, WS-4)
Problem: Three partial engines exist. @bsuite/charge-calc is the canonical engine (confirmed: R8's calcBridge.ts already wraps it; CRM7's crmCalcBridge.ts also wraps it). The convergence decision is largely done architecturally. What IS missing:

apprentice_rate_configs is not wired into R8's award rules resolution

BUG-1 (annual allowance ÷52) must be fixed before any downstream invoicing

BUG-2 (Payday Super "3 business days") must be corrected in all display strings

Deliverables:

ADR: crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md — documents that @bsuite/charge-calc is canonical, calcBridge pattern is the adapter, no third engine tolerated

Fix BUG-1 in mapd-mapper.ts + unit test

Fix BUG-2 in chargeToPayroll.ts + jodie-persona.ts + any display strings across all 5 apps

Add fetchApprenticeRateConfigs() to R8 fairworkApi.ts — reads from apprentice_rate_configs Supabase table, filtered by award_code + apprentice_type + year_of_trade

Update awardRulesEngine.resolveRatePackage() to accept optional ApprenticeRateConfig[] and apply year-of-trade percentage overrides (overriding MAPD base rate where effective_to IS NULL)

Update calcBridge.toCalcConfig() to pass resolved rate from ApprenticeRateConfig when available

Files to touch:

packages/charge-calc/src/awards/mapd-mapper.ts (BUG-1 fix)

packages/charge-calc/src/__tests__/awards/mapd-mapper.test.ts (add annualised allowance test)

crm7/src/lib/pipelines/chargeToPayroll.ts (BUG-2 comment fix)

crm7/src/lib/ai/jodie-persona.ts (BUG-2 "3 business days" → "7 business days")

R80.3/src/services/fairworkApi.ts (add fetchApprenticeRateConfigs)

R80.3/src/services/awardRulesEngine.ts (accept ApprenticeRateConfig[], apply overrides)

R80.3/src/utils/calcBridge.ts (pass resolved rate into toCalcConfig)

R80.3/src/types/index.ts (fix JSDoc on superRate)

crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md (new ADR)

Tests required:

mapd-mapper.test.ts: mapPaymentFrequency('per annum', 2600) → { type: 'perWeek', amount: 50 }

awardRulesEngine.test.ts: with ApprenticeRateConfig override for MA000025 yr1 apprentice → base rate uses config percentage, not raw MAPD rate

calcBridge.test.ts: toCalcConfig() with apprenticeRateConfig present → wage reflects config-derived rate

WS-2 · Award Rate & MAPD Edge Function (depends on WS-1)
What exists: FWC API client in R8 (fairworkApi.ts), in-memory cache + award_rate_cache Supabase table, sync-award-rates edge function stub. apprentice_rate_configs table now seeded (99 rows, 7 awards).

What's missing:

MAPD Supabase Edge Function (supabase/functions/mapd-sync) — scheduled sync to award_rates table with 24h TTL, webhook registration for PayRatesForAward events

wage_calculation_snapshots table — immutable JSONB at timesheet-approval time (Fair Work s.535)

super_rate effective-date logic — bump to 0.12 for records effective ≥ 2025-07-01; expose in cost_factors JSONB on host_contracts

annualised_allowance_correction — this is BUG-1, already scoped in WS-1

New tables:

sql
-- wage_calculation_snapshots: immutable, no UPDATE/DELETE policies
CREATE TABLE wage_calculation_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  timesheet_id    uuid NOT NULL REFERENCES timesheets(id),
  apprentice_id   uuid NOT NULL,
  snapshot_at     timestamptz NOT NULL DEFAULT now(),
  award_code      text NOT NULL,
  apprentice_type text NOT NULL,
  year_of_trade   int NOT NULL,
  base_rate_hourly numeric(10,4) NOT NULL,
  ote_rate_hourly  numeric(10,4) NOT NULL,
  super_rate       numeric(6,4) NOT NULL,
  calc_config     jsonb NOT NULL,  -- full CalcConfig
  calc_result     jsonb NOT NULL,  -- full CalcResult
  applied_rules   text[] NOT NULL DEFAULT '{}',
  rule_warnings   text[] DEFAULT '{}'
);
-- RLS: INSERT by authenticated users; SELECT by tenant; NO UPDATE, NO DELETE
Files to touch:

supabase/functions/mapd-sync/index.ts (new edge function — scheduled + webhook)

CRM7 migration: create_wage_calculation_snapshots

crm7/src/services/wageSnapshotService.ts (new — write snapshot at timesheet approval)

R80.3/src/services/paydaySuperService.ts — verify CURRENT_SG_RATE = 0.12 (already correct per calcBridge; confirm display)

WS-3 · Host Invoicing (depends on WS-1, WS-2)
What exists: billingEngine.ts (generates draft invoices, aging report), chargeToBilling.ts pipeline (maps batch calc → invoice line items), charge_rate_quotes and batch_charge_rate_quotes tables, invoices table (already referenced in billingEngine).

What's missing (per gap analysis):

invoice_line_items table with full line structure — wages (GST-free), service fee (GST-applicable), subsidy credit (per apprentice per program, named per ATO requirement)

Government subsidy credit line: GTO Reimbursement $100/wk → must name apprentice + program (ATO requirement per SRE 2023/D5)

State-specific subsidy fields: WAAMS reference (WA), SA GTO Boost amount

Xero batch invoice creation (50/call, idempotency key = engagement_id:period_start:YYYY-MM)

PDF invoice renderer (local record-keeping — office/pdf skill)

Annual reconciliation report: billable weeks vs contracted, subsidy received vs invoiced

Bulk invoice generation across all active engagements for a billing period

Invoice line-item schema:

sql
CREATE TYPE invoice_line_type AS ENUM ('wages', 'service_fee', 'subsidy_credit', 'adjustment', 'training');

CREATE TABLE invoice_line_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL,
  line_type       invoice_line_type NOT NULL,
  description     text NOT NULL,            -- e.g. "GTO Reimbursement — Jane Smith (CTF)"
  apprentice_id   uuid REFERENCES people(id),
  program_ref     text,                     -- e.g. ADMS reference number
  quantity_hours  numeric(8,2),
  rate_per_hour   numeric(10,4),
  amount_excl_gst numeric(12,2) NOT NULL,
  gst_rate        numeric(5,4) NOT NULL DEFAULT 0, -- 0 for wages/subsidy, 0.10 for service fee
  gst_amount      numeric(12,2) GENERATED ALWAYS AS (amount_excl_gst * gst_rate) STORED,
  amount_incl_gst numeric(12,2) GENERATED ALWAYS AS (amount_excl_gst + amount_excl_gst * gst_rate) STORED,
  subsidy_type    text,                     -- 'waams' | 'sa_boost' | 'ctf' | 'gto_reimb'
  state_ref       text,                     -- WAAMS TRS number, SA reference
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
Charge-out formula (per WS-2 engine):

text
charge_out_hourly = base_award_rate × (1 + super_rate + payroll_tax_rate + wc_rate + leave_loading_rate + overhead_rate + margin_rate)
subsidy_credit_hourly = subsidy_weekly_amount ÷ hours_per_week
net_charge_hourly = charge_out_hourly − subsidy_credit_hourly
DRY one-shot: Invoices are owned by CRM7. R8 reads host_charge_rates for rate context only. BSU reads financial_records aggregate for the revenue dashboard.

WS-4 · Timesheet & Payroll Pipeline (depends on WS-2)
What exists: timesheets table with host_approved_at, payroll_flagged, validation_warnings fields. chargeToPayroll.ts pipeline. pay_periods/ pages in CRM7. STP Phase 2 disaggregated gross types in payroll.ts.

What's missing:

7-state timesheet state machine (currently 2-state: approved/not)

timesheet_events append-only audit table

pay_runs and payroll_records tables

Payday Super 3→7 business days fix (BUG-2, already in WS-1)

STP path clarification ADR — must read chargeToPayroll.ts fully to determine if direct ATO or Xero passthrough

Xero Payroll AU wiring — EarningsRate per award classification

7-state machine:

text
draft → submitted → pending_host_approval → pending_gto_review → approved → exported → archived

Role transitions (RLS-enforced):
  draft→submitted:            apprentice (self-service) OR gto_staff
  submitted→pending_host:     system (auto on submit)
  pending_host→pending_gto:   host_supervisor (approve)
  pending_host→submitted:     host_supervisor (reject — back to start)
  pending_gto→approved:       gto_staff (review pass)
  pending_gto→submitted:      gto_staff (reject — back to start)
  approved→exported:          gto_payroll (STP/Xero export)
  exported→archived:          pg_cron (7 years from export_date)
New tables:

sql
CREATE TYPE timesheet_state AS ENUM (
  'draft','submitted','pending_host_approval','pending_gto_review','approved','exported','archived'
);

CREATE TABLE timesheet_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id    uuid NOT NULL REFERENCES timesheets(id),
  tenant_id       uuid NOT NULL,
  from_state      timesheet_state,
  to_state        timesheet_state NOT NULL,
  actor_id        uuid NOT NULL REFERENCES auth.users(id),
  actor_role      text NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
  -- NO RLS UPDATE/DELETE — append-only
);

CREATE TABLE pay_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  pay_period_start date NOT NULL,
  pay_period_end   date NOT NULL,
  pay_date         date NOT NULL,
  status           text NOT NULL DEFAULT 'draft', -- draft|approved|exported|posted
  xero_payrun_id   text,
  stp_submitted_at timestamptz,
  payday_super_required boolean NOT NULL DEFAULT false,
  total_gross      numeric(14,2),
  total_super      numeric(14,2),
  total_tax        numeric(14,2),
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  UNIQUE(tenant_id, pay_period_start, pay_period_end)
);

CREATE TABLE payroll_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_run_id      uuid NOT NULL REFERENCES pay_runs(id),
  tenant_id       uuid NOT NULL,
  person_id       uuid NOT NULL REFERENCES people(id),
  ordinary_hours  numeric(8,2) NOT NULL,
  overtime_hours  numeric(8,2) NOT NULL DEFAULT 0,
  leave_hours     numeric(8,2) NOT NULL DEFAULT 0,
  gross_earnings  numeric(12,2) NOT NULL,
  super_amount    numeric(12,2) NOT NULL,
  tax_withheld    numeric(12,2) NOT NULL,
  net_pay         numeric(12,2) NOT NULL,
  income_type     text NOT NULL DEFAULT 'SAL', -- 'SAL'|'LAB' (labour hire STP Ph2)
  stp_ytd_gross   numeric(14,2),
  stp_ytd_super   numeric(14,2),
  xero_employee_id text,
  wage_snapshot_id uuid REFERENCES wage_calculation_snapshots(id),
  created_at       timestamptz DEFAULT now()
);
STP Path ADR: After reading chargeToPayroll.ts — it builds PayRunSubmission typed objects and calls PayrollAdapter.submitPayRun(). The adapter interface is not yet implemented with a concrete Xero class — it's abstract. Decision: Xero passthrough (not direct ATO SBR2). Wire XeroPayrollAdapter implementing PayrollAdapter using Xero Payroll AU API. Income type LAB for labour hire workers. Document in crm7/docs/adr/0004-stp-xero-passthrough.md.

Evidence update 2026-06-04: `crm7#1009` refreshed `crm7/src/lib/pipelines/xeroPayrollAdapter.ts` against the generated Supabase `payroll_records` row type and added focused regression coverage for the exact select contract. The adapter now reads `apprentice_id`, `paye_tax`, `super_guarantee_amount`, `income_type`, and metadata-backed Xero employee/earnings-rate IDs; stale `person_id`, `tax_withheld`, and `super_amount` aliases are regression-locked out.

WS-5 · Customisable Report Builder (depends on WS-3, WS-4)
What exists: /reports route with category cards and quick-access favouriting. custom_reports feature flag in LAUNCH_FLAGS.

What's needed:

New table:

sql
CREATE TABLE report_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid,          -- NULL = system/global template
  name            text NOT NULL,
  description     text,
  report_type     text NOT NULL, -- 'apprentice_progress'|'billable_hours'|'charge_rate'|'payroll_liability'|'funding_claims'|'gto_audit'|'avetmiss_summary'|'custom'
  config          jsonb NOT NULL, -- {columns[], filters[], groupBy[], sort[], schedule?, recipients[], format}
  is_system       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
7 mandatory pre-built templates (system, is_system=true, tenant_id=NULL):

Apprentice Progress — stage, competencies achieved vs required, field activities, training plan reviews, field officer log

Billable Hours — per host per period: hours billed vs approved, billing model, charge-out rate breakdown, subsidy deductions

Charge-Out Rate Summary — per engagement: rate components, effective date, BOOT status, award classification

Payroll Liability — per pay period: wages, super, tax, allowances, leave accruals

Funding Claims — CTF/AASN/ASIP/GTO Wage Subsidy status per apprentice

GTO National Standards Audit Pack — evidence status per sub-standard, gaps, export bundle

AVETMISS Statistical Summary — demographic breakdown pre-lodgement review

UI stack:

TanStack Table v8 for interactive viewer (column show/hide, filter, sort, group — state persisted to report_preferences Supabase per user)

AG Grid Enterprise for >50k row datasets with ExcelExportModule native XLSX export

pg_cron + Edge Function report-delivery for scheduled PDF/CSV email delivery

Recharts → html-to-image → PNG for chart embeds in PDF exports

No regex in Playwright tests — getByTestId, getByRole, getByLabel

WS-6 · AVETMISS / NCVER Export (depends on WS-4)
What exists: AVETMISS demographic fields in CRM7 people table (migration 20260304000007). FundingType enum covers CTF/AASN/ASIP. Zero export layer.

Training Contract Identifier audit (do first):

sql
-- Check if training_contract_identifier exists on engagements or people
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('engagements','people','training_contracts')
AND column_name ILIKE '%training_contract%';
-- If absent → add migration BEFORE building export
NAT file generator (Edge Function avetmiss-export):

NAT00010 — Training Organisation (GTO details from tenants)

NAT00020 — Delivery Location (from host_sites or locations)

NAT00030 — Course (from qualifications)

NAT00060 — Unit of Competency (from VET units table)

NAT00080 — Subject (enrolment per UoC per person)

NAT00085 — Prior Educational Achievement

NAT00090 — Client (demographic per apprentice — people table fields)

NAT00120 — Enrolment (mandatory: Training Contract Identifier, links to NAT00090)

NAT00130 — Outcome (code: 70=continuing, 20=complete, 40=withdrawn)

State STA variants:

WAAMS (WA): tab-delimited v1.4, TRS Number mandatory, UoC outcomes due 31 Jan

NSW Smart and Skilled: eReporting API

QLD DTET: Partner Portal CSV format

SA STELA: monthly (second Friday)

National deadline: 28 February (5pm ACDT) — add pg_cron reminder notification

WS-7 · GTO National Standards Compliance Gaps (depends on WS-4, WS-5)
Priority order (by gap severity from audit):

Standard 3.4 Financial Viability Dashboard (High — Missing): cash position, funding secured vs required, viability ratio, registering-body alert thresholds

Induction register (1.2): structured checklist + apprentice sign-off + completion evidence pack export

Guardian sign-off (1.1): under-18 acknowledgement workflow + notification dispatch

Host WHS audit register (1.3): site audit form, host capacity assessment, host agreement workflow

Training plan co-development sign-off (1.4): RTO discussion records, training plan sign-off evidence

Monitoring visit records (2.2): field officer contact log, structured visit record, training plan linkage

LLN assessment register: Language, Literacy, Numeracy assessment entry + outcome recording

F17 PDF/XLSX renderer: render generateF17Data() JSON → downloadable PDF/XLSX (office/pdf + office/xlsx skills)

F17 note: @bsuite/charge-calc/boot/f17-export.ts already generates the JSON — just need the renderer.

WS-8 · RLS & Security Hardening (parallel with WS-2 through WS-7)
From best-practice audit:

sql
-- org_members with GTO role
CREATE TYPE gto_role AS ENUM ('gto_admin','gto_staff','field_officer','host_supervisor','apprentice');

CREATE TABLE org_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  gto_role    gto_role NOT NULL,
  host_employer_id uuid REFERENCES people(id),  -- for host_supervisor
  apprentice_id    uuid REFERENCES people(id),   -- for apprentice role
  created_at  timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- SECURITY DEFINER helpers (call once, cache result per session)
CREATE OR REPLACE FUNCTION is_gto_staff() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE
  AS $$ SELECT EXISTS(SELECT 1 FROM org_members WHERE user_id = (SELECT auth.uid()) AND gto_role IN ('gto_admin','gto_staff')) $$;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS gto_role
  LANGUAGE sql SECURITY DEFINER STABLE
  AS $$ SELECT gto_role FROM org_members WHERE user_id = (SELECT auth.uid()) LIMIT 1 $$;

CREATE OR REPLACE FUNCTION get_user_host_employer_id() RETURNS uuid
  LANGUAGE sql SECURITY DEFINER STABLE
  AS $$ SELECT host_employer_id FROM org_members WHERE user_id = (SELECT auth.uid()) LIMIT 1 $$;

CREATE OR REPLACE FUNCTION get_user_apprentice_id() RETURNS uuid
  LANGUAGE sql SECURITY DEFINER STABLE
  AS $$ SELECT apprentice_id FROM org_members WHERE user_id = (SELECT auth.uid()) LIMIT 1 $$;
RLS template for all new tables:

sql
-- Use (SELECT auth.uid()) NOT auth.uid() inline — prevents per-row function call
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_tenant_select" ON <table> FOR SELECT
  USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "<table>_gto_insert" ON <table> FOR INSERT
  WITH CHECK (is_gto_staff() AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid);
Access control matrix:

Resource gto_admin gto_staff field_officer host_supervisor apprentice
Invoices R/W R — R (own host) —
Timesheets R/W R/W R R/Approve R/W (own)
Pay records R/W R — — R (own)
Reports R/W R/W R (limited) R (billing) R (own)
Rate configs R/W R — — —
Compliance R/W R/W R/W (visits) R/W (WHS own) R (own)
pgTap tests: All RLS policies tested via anon key (not service role — SQL editor bypasses RLS).

WS-9 · Portals — Apprentice, Host, Field Officer (parallel with WS-5 onward)
This was not explicitly in the GTO billing plan but is a direct downstream consequence of WS-3 and WS-4 per the one-shot policy. Portal screens must be updated to reflect new data.

DRY one-shot portal flows:

Apprentice Portal (read-only from CRM7 data):

View own timesheets + state (7-state machine badge)

Submit timesheets (draft→submitted transition)

View own pay slips (payroll_records — own only via RLS)

View training progress (competencies, UoC outcomes)

View induction checklist status + sign-off capture (WS-7 induction register)

Guardian sign-off flow if under 18 (WS-7)

Host Employer Portal:

View/approve timesheets for their site (pending_host_approval → pending_gto_review)

Reject timesheets with note (pending_host_approval → submitted)

View invoices for their engagements (read-only via RLS: host_employer_id match)

WHS audit register for their site (WS-7)

Training plan co-sign (WS-7)

Field Officer Portal (CRM7, gto_staff-adjacent role):

Monitoring visit records — create + link to apprentice + training plan (WS-7)

LLN assessment entry (WS-7)

View apprentice progress across caseload

Approve timesheets (pending_gto_review → approved)

R8 integration (rate data flow):

R8 writes approved charge calculations → host_charge_rates via crm7SyncService

CRM7 reads host_charge_rates for invoice pre-population → no re-entry

CRM7 reads charge_rate_quotes for engagement rate display

When apprentice_rate_configs is updated in CRM7 → R8 reads fresh values on next resolveRatePackage() call (no cache invalidation needed — Supabase reads are live)

Execution Sequence (with dependency graph)
text
PHASE 1 (blocker — do first, no parallelism):
  WS-1: Bug fixes + ADR + apprentice_rate_configs wiring into R8

PHASE 2 (parallel after WS-1):
  WS-2: MAPD edge fn + wage_calculation_snapshots
  WS-8: org_members + SECURITY DEFINER helpers + RLS on new tables

PHASE 3 (parallel after WS-2):
  WS-3: Host invoicing (invoice_line_items, Xero batch, PDF)
  WS-4: Timesheet state machine + pay_runs + payroll_records + Xero payroll

PHASE 4 (parallel after WS-3 + WS-4):
  WS-5: Report builder + 7 pre-built templates
  WS-6: AVETMISS / NCVER NAT export
  WS-7: GTO National Standards gaps

PHASE 5 (parallel after WS-5):
  WS-9: Portal UI updates (apprentice, host, field officer)

CONTINUOUS (throughout all phases):
  WS-8 RLS: Each new table gets policies in the same PR as the migration
  verification-before-completion: Every PR, every phase
apprentice_rate_configs → Full Downstream Impact
The table is now live. Here is the complete impact chain:

text
apprentice_rate_configs (Supabase)
  │
  ├── R8 AwardRateSelector
  │     └── reads via new fetchApprenticeRateConfigs() (WS-1)
  │           └── awardRulesEngine.resolveRatePackage() applies percentage override
  │                 └── calcBridge.toCalcConfig() uses resolved rate as `wage`
  │                       └── @bsuite/charge-calc calculate() → CalcResult
  │                             └── crm7SyncService.pushChargeRate() → host_charge_rates
  │                                   ├── CRM7 chargeToBilling → invoice line items
  │                                   └── CRM7 chargeToPayroll → pay_runs → Xero
  │
  ├── CRM7 /settings/apprentice-rates (UI — already shipped PR #297)
  │     └── useApprenticeRateConfigs hook → EnhancedDataTable CRUD
  │           └── Annual review toast from notifications.type='rate_review'
  │                 └── pg_cron fires 1 July → all admin/manager/gto_officer users
  │
  ├── CRM7 /payroll/award-rates (display reference — should show config percentages)
  │     └── AwardRateSelector (CRM7 version) — needs same Supabase read
  │
  ├── BSU /GTO.tsx dashboard
  │     └── reads bi_metrics aggregate — no direct impact but rate changes
  │           flow into revenue numbers via invoices → financial_records
  │
  └── AVETMISS export (WS-6)
        └── rate data referenced in funding claims and competency records
              → NAT00120 enrolment cost fields
Critical: CRM7's own AwardRateSelector component (src/components/entity/selectors/AwardRateSelector.tsx) also needs to read apprentice_rate_configs — it currently fetches from FWC API only. WS-1 must update both R8 and CRM7 selectors.

Constraints (non-negotiable, per AGENTS.md + user instructions)
# Constraint Source
C1 Node 24 in all CI workflows — not Node 22 Gap report explicit flag
C2 No inline oklch() in JSX/className — CSS tokens/variables only User instruction
C3 No regex in Playwright tests — getByTestId(), getByRole(), getByLabel() Repo rule + user instruction
C4 no-text-white rule is warn not error User instruction
C5 pnpm lockfiles generated outside bsuite tree — use /tmp/ AGENTS.md
C6 All commits to development branch only — no merges to main User instruction
C7 Conventional commit format per git-workflow skill AGENTS.md
C8 Nothing deferred — all scoped items implemented fully User one-shot policy
C9 DRY one-shot — each entity has exactly one owning app for create/edit All AGENTS.md files
C10 RLS tests via anon key, not SQL editor / service role WS-8 best practice
C11 handle_updated_at() trigger (not extensions.moddatetime()) Session history
C12 Zod v4 uses message not required_error in enum params Session history
C13 EnhancedDataTable (TanStack) — AG Grid not installed in CRM7 Session history
C14 Vercel AI Gateway at https://ai-gateway.vercel.sh/v1 (v1, not v3) Session history
C15 Payday Super: 7 business days (not 3) — fix all display strings Treasury Laws Amendment 2023
C16 JODIE_AI_MODEL_SLUG = xai/grok-4.20-reasoning Just set on all 4 Vercel projects
Files NOT to Touch
braden/ submodule — out of D2C scope by design, skip entirely

rrule type errors in reminders pages — pre-existing, out of scope

Any file in feat/phase5-consumer-crm7 branch — work moved to development

Skills & MCPs for Execution
Tool When
supabase MCP All migrations, edge function deploy, RLS application, execute_sql, apply_migration, list_tables
vercel MCP + VERCEL_TOKEN (agent secret — MUST ROTATE, was previously committed) Deploy edge functions, monitor builds
github_mcp_direct (gh CLI) Commit, push, PR creation on development
xero-integration Xero Payroll AU EarningsRate, pay run, batch invoices, OAuth refresh
supabase-postgres-best-practices All schema design — indexing, JSONB vs structured, immutable tables
supabase-auth-comprehensive RLS design, SECURITY DEFINER helpers
tanstack-query Data-fetching hooks for report builder, timesheet state machine
forms-and-validation RHF + Zod for timesheet entry, induction, guardian sign-off
office/xlsx F17 XLSX renderer (WS-7), AVETMISS NAT generation (WS-6)
office/pdf Invoice PDF renderer (WS-3), Apprentice Progress Report (WS-5)
dispatching-parallel-agents Phase 3 and 4 workstreams (WS-3/4 parallel; WS-5/6/7 parallel)
writing-plans Each phase should have WS-level implementation plan before execution
qa-and-verification Before any WS marked complete
verification-before-completion Before every PR
git-workflow Conventional commits, development branch only
Claude Code (Opus 4.7) on local Jodie AI edge function integration tests; complex type-level work; any heavy tsc scenarios
What Claude Code (Local, Opus 4.7) Should Own
Per your instruction to assign parallel work:

Hand off to local Claude Code:

WS-1 BUG-1 fix — mapd-mapper.ts annual allowance ÷52 (surgical, high-precision)

WS-4 STP/Xero payroll integration — concrete Xero Payroll AU client/export sequencing (adapter schema contract landed via `crm7#1009`; remaining complexity is EarningsRate per award and pay run sequence)

WS-6 AVETMISS NAT file generator — fixed-width file formatting, field validation, state variants (tedious precision work)

Playwright e2e tests for timesheet state machine (WS-4) — no regex, using getByTestId/getByRole

Keep in Computer (me):

WS-1 ADR + R8 fetchApprenticeRateConfigs + awardRulesEngine update

WS-2 MAPD edge function + wage_calculation_snapshots migration

WS-3 Invoice pipeline + Xero batch invoices

WS-5 Report builder UI + 7 templates

WS-7 GTO National Standards gaps

WS-8 RLS + org_members

WS-9 Portal updates

Verification Checklist (per phase)
Before marking any phase complete:

pnpm build passes in affected apps (zero errors, zero warnings)

pnpm typecheck on affected files passes

pnpm test passes in affected packages

No new oklch() inline values introduced

No new regex in test files

All new tables have RLS enabled + policies applied

RLS policies verified via anon-key test client

Conventional commit message on every commit

Push to development only

PR opened with build status verified before handoff

Produced by prompt-enhancer (Heavy tier) + master-orchestration + downstream-impact skill.
Pass 1: decomposed 9 workstreams + portals. Pass 2: read AGENTS.md one-shot policy, R8 calc engine, charge-calc package, chargeToPayroll/chargeToBilling pipelines, crm7SyncService, awardRulesEngine, DRY architecture doc. Pass 3: identified 5 bugs, mapped full rate data flow, confirmed apprentice_rate_configs downstream chain. Pass 4: cross-referenced against gto-billing-reporting-refined.md (8 WS), apprentice-rate-configs-refined.md (seeded). Pass 5: constraints + skills table + Claude Code ownership split.
BSuite GTO — Thread Handoff Context
Time: Thursday, 23 April 2026, 4:46 PM AWST
Email: braden.lang77@gmail.com
Previous session memory key: bsuite_session_20260423a @ https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260423a

IMMEDIATE CONTEXT: What was just completed
WS-1 (Calc Engine Convergence) is DONE. All 4 critical bugs fixed, 64 tests passing, pushed. The blocker for WS-2 through WS-9 is now cleared.

WS-1 Commits (pushed)
Repo Branch Commit What
crm7 development f8718a3 BUG-2 fix (Payday Super 7 days) + ADR-001
R80.3 feat/phase5-consumer-r80-embed 8c10980 BUG-4 fix (fetchApprenticeRateConfigs + rules engine Step 2b) + BUG-5 JSDoc
packages/charge-calc feat/phase5-schema-registry 5ab1024 BUG-1 fix (annual allowance ÷52) + 6 regression tests
Bugs fixed in WS-1
BUG-1 CRITICAL packages/charge-calc/src/awards/mapd-mapper.ts — mapWageAllowance + mapExpenseAllowance now divide allowance_amount / 52 when payment_frequency is "per annum" / "per year". New helper isAnnualFrequency() exported. 4 regression tests added. All 64 tests pass.

BUG-2 HIGH crm7/src/lib/pipelines/chargeToPayroll.ts:44 — JSDoc corrected to "7 business days" (Treasury Laws Amendment 2023). crm7/src/lib/ai/jodie-persona.ts:94 also corrected to state employer's 7-day obligation clearly.

BUG-4 HIGH R80.3/src/services/fairworkApi.ts — fetchApprenticeRateConfigs(awardCode, yearOfTrade?) added; reads apprentice_rate_configs Supabase table, uses in-memory cache. R80.3/src/services/awardRulesEngine.ts — ResolveRatePackageInput extended with optional apprenticeRateConfigs?: ApprenticeRateConfig[]; Step 2b in resolveRatePackage() applies wage_percentage × lowestAdultClassificationRate with FWC legal floor guard and full audit logging.

BUG-5 LOW R80.3/src/types/index.ts CostConfig.superRate JSDoc updated to 0.12.

ADR-001 written: crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md

OPEN PR
CRM7 PR #297 — development → main — https://github.com/GaryOcean428/crm7/pull/297 — apprentice-rate-configs feature. Do NOT merge to main yet — only working to development per instructions.

NEXT STEPS (in order)
NOW: WS-2 + WS-8 in parallel (both depend on WS-1 — now unblocked)
WS-2 · Award Rate & MAPD Edge Function
Repo: crm7 (Supabase migration + edge function), R80.3 (paydaySuperService check)
Branch: commit to development on crm7, feat/phase5-consumer-r80-embed on R80.3

Files to create/modify:

supabase/functions/mapd-sync/index.ts (NEW edge function — scheduled MAPD sync to award_rates table, 24h TTL, webhook for PayRatesForAward events)

Supabase migration: create_wage_calculation_snapshots table (immutable — INSERT only, no UPDATE/DELETE policies)

crm7/src/services/wageSnapshotService.ts (NEW — writes snapshot at timesheet approval)

Verify R80.3/src/services/paydaySuperService.ts has CURRENT_SG_RATE = 0.12

wage_calculation_snapshots schema:

sql
CREATE TABLE wage_calculation_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  timesheet_id    uuid NOT NULL REFERENCES timesheets(id),
  apprentice_id   uuid NOT NULL,
  snapshot_at     timestamptz NOT NULL DEFAULT now(),
  award_code      text NOT NULL,
  apprentice_type text NOT NULL,
  year_of_trade   int NOT NULL,
  base_rate_hourly numeric(10,4) NOT NULL,
  ote_rate_hourly  numeric(10,4) NOT NULL,
  super_rate       numeric(6,4) NOT NULL,
  calc_config     jsonb NOT NULL,
  calc_result     jsonb NOT NULL,
  applied_rules   text[] NOT NULL DEFAULT '{}',
  rule_warnings   text[] DEFAULT '{}'
);
-- RLS: INSERT authenticated, SELECT by tenant, NO UPDATE, NO DELETE (Fair Work s.535)
WS-8 · RLS & Security Hardening (parallel with WS-2)
Repo: crm7

Add org_members table RLS policies (currently missing — users can read other orgs' members)

Add SECURITY DEFINER helper functions for cross-tenant queries

Ensure all new tables from WS-1 (apprentice_rate_configs) and WS-2 (wage_calculation_snapshots) have correct RLS

Test via anon key (NOT service role / SQL editor) per constraint C10

THEN: WS-3 + WS-4 in parallel (after WS-2 merged)
WS-3 · Host Invoicing
invoice_line_items migration

Xero batch invoice creation (crm7/src/lib/integrations/xero/)

PDF invoice renderer (office/pdf skill)

CRM7 invoice page updates

WS-4 · Timesheet & Payroll Pipeline
Timesheet state machine (draft → submitted → host_approved → payroll_flagged → paid)

pay_runs + payroll_records tables

XeroPayrollAdapter concrete client/export sequencing (schema contract landed via `crm7#1009`; remaining work is Xero Payroll AU API, income type LAB, and EarningsRate mapping)

STP Phase 2 disaggregated gross — chargeToPayroll.ts already builds PayRunSubmission but adapter not wired

Playwright e2e tests for state machine (no regex — getByTestId, getByRole, getByLabel only)

ASSIGN TO LOCAL CLAUDE CODE (Opus 4.7):

XeroPayrollAdapter implementation (complex Xero Payroll AU API)

WS-6 AVETMISS NAT file generator (fixed-width, tedious precision)

WS-4 Playwright e2e tests

THEN: WS-5 + WS-6 + WS-7 in parallel (after WS-3 + WS-4)
WS-5: Report builder + 7 pre-built templates

WS-6: AVETMISS / NCVER NAT export

WS-7: GTO National Standards compliance gaps

THEN: WS-9 (after WS-5)
Portal UI updates — apprentice, host, field officer portals

Full Master Plan Location
crm7/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md (657 lines)
Also at /home/user/workspace/docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md

Supporting plans:

/home/user/workspace/docs/plans/gto-billing-reporting-refined.md (8 WS, heavy tier)

/home/user/workspace/docs/plans/apprentice-rate-configs-refined.md (standard tier, seeded)

Infrastructure
Item Value
Supabase project tuybltdrdefjblnplpqo
Supabase URL https://tuybltdrdefjblnplpqo.supabase.co
Supabase publishable key <stored in Vercel env — see SUPABASE_PUBLISHABLE_KEY>
Supabase service role key <stored in Vercel env — see SUPABASE_SERVICE_ROLE_KEY (MUST ROTATE — was previously committed)>
Vercel team team_ML7jNl1dZwSwgkKksx1pAOO9
Vercel PAT <stored in agent secrets — see VERCEL_TOKEN (MUST ROTATE — was previously committed)>
Vercel project IDs BSU=prj_OYfvQ2LzwnSFdV2DzxKHCl1H7ZBu, CRM7=prj_ZcvIEwYIBFQBfbJafOjGuc2THSbA, conduit=prj_EpTqQLe4muwr0E18AZoWcMRgUuT7, R80.3=prj_rYA6cjcjZYnHGJ0y366x4Xzyb9Ps
GitHub org GaryOcean428
Memory API https://qig-memory-api.vercel.app/api/memory/bsuite_session_20260423a
AI Gateway API key <stored in agent secrets — see AI_GATEWAY_API_KEY (MUST ROTATE — was previously committed)>
JODIE AI model slug xai/grok-4.20-reasoning
Developer login <stored in 1Password>
NPM token <stored in agent secrets — see NPM_TOKEN (MUST ROTATE — was previously committed)>
pnpm version 10.33.0
git push method api_credentials=["github"] on bash tool (uses git-agent-proxy) — do NOT use gh auth setup-git with enterprise token (expired)
Repo Branches
Repo Path Active Branch
crm7 /home/user/workspace/bsuite/crm7 development ✅
R80.3 /home/user/workspace/bsuite/R80.3 feat/phase5-consumer-r80-embed
business-suite-unified /home/user/workspace/bsuite/business-suite-unified feat/phase5-embed-lead-form
conduit /home/user/workspace/bsuite/conduit feat/phase5-consumer-conduit
packages/charge-calc /home/user/workspace/bsuite/packages/charge-calc feat/phase5-schema-registry
Important: All new commits must go to development on crm7. For R80.3/BSU/conduit, commit to the existing feat branch (they will PR into development). Do NOT push to main on any repo.

Database State (Supabase tuybltdrdefjblnplpqo — live)
Tables already created this session:

apprentice_rate_configs — seeded with 99 rows, 7 awards (MA000025/20/36/10/89 = 4yr; MA000005/9 = 3yr), all 4 apprentice types × years

pg_cron job: annual review notification fires 1 July

notifications.type extended to include rate_review

Tables needed next (WS-2):

wage_calculation_snapshots — immutable snapshot at timesheet approval (see schema above)

Files Created This Session
File Repo/Location Status
src/services/apprenticeRateConfigService.ts crm7 ✅
src/hooks/useApprenticeRateConfigs.ts crm7 ✅
src/lib/ai/jodie-rate-review.ts crm7 ✅
api/ai/rate-review.ts crm7 ✅
src/pages/settings/apprentice-rates.tsx crm7 ✅
src/App.tsx crm7 ✅ modified (route added)
src/hooks/useFeatureFlags.ts crm7 ✅ modified
src/pages/settings/feature-flags.tsx crm7 ✅ modified
src/pages/settings/index.tsx crm7 ✅ modified
docs/plans/20260423-bsuite-gto-master-plan-v1.00W.md crm7 ✅ 657 lines
crm7/docs/adr/20260423-calc-engine-single-source-v1.00W.md crm7 ✅ ADR-001
src/awards/mapd-mapper.ts packages/charge-calc ✅ BUG-1 fixed
src/__tests__/awards/mapd-mapper.test.ts packages/charge-calc ✅ 64 tests pass
src/services/fairworkApi.ts R80.3 ✅ BUG-4 fixed
src/services/awardRulesEngine.ts R80.3 ✅ BUG-4 wired
src/types/index.ts R80.3 ✅ BUG-5 JSDoc
src/lib/ai/jodie-persona.ts crm7 ✅ BUG-2 fixed
src/lib/pipelines/chargeToPayroll.ts crm7 ✅ BUG-2 fixed
Key Architecture Facts
@bsuite/charge-calc is the canonical engine — R80.3's calcBridge.ts wraps it via toCalcConfig/fromCalcResult. CRM7's crmCalcBridge.ts also wraps it.

Data flow: FWC MAPD API → R80.3 fairworkApi.ts → award_rate_cache → awardRulesEngine.resolveRatePackage() → calcBridge.toCalcConfig() → @bsuite/charge-calc → host_charge_rates table → CRM7 reads for invoicing + payroll

apprentice_rate_configs is CRM7-owned; R80.3 reads it via the new fetchApprenticeRateConfigs() function (added this session)

Portals (apprentice, host, field officer) are CRM7-owned — NOT separate apps in R80.3

STP path decision (from code audit): chargeToPayroll.ts builds PayRunSubmission objects for PayrollAdapter. Adapter is abstract — not yet implemented. Decision: Xero Payroll AU API passthrough (not direct ATO SBR2). Income type LAB for labour hire.

Vercel CLI SSL fails in sandbox — use REST API with vcp_ token for all Vercel operations

Full tsc OOM — use targeted file checks only with NODE_OPTIONS=--max-old-space-size=4096

AI gateway base URL: https://ai-gateway.vercel.sh/v1 (v1, not v3)

Non-Negotiable Constraints
Rule Detail
No inline oklch() in JSX CSS tokens/variables only — never className="oklch(...)"
No regex in tests Use getByTestId(), getByRole(), getByLabel() exclusively
no-text-white = warn Not error — use white text sparingly, not banned
pnpm lockfiles Must be generated OUTSIDE bsuite tree — use /tmp/
All commits to development Never push to main directly
Conventional commit format feat(scope): description
EnhancedDataTable prop enableSearch (NOT searchable)
Zod v4 Uses message not required_error
handle_updated_at() trigger NOT extensions.moddatetime()
Payday Super = 7 business days NOT 3
Node 24 in CI Not 22
Nothing deferred All scoped items implemented fully
Colourblind Flag UI that uses red-vs-green as sole state signifier
Audit role Read-only auditor stance — no more than 2 lines quoted from any file in findings
braden submodule Skip for D2C token checks — out of scope by design
no-text-white policy warn not error
Skills to Load (org scope unless noted)
text
load_skill("ship-all-apps", scope="org")
load_skill("git-workflow", scope="org")
load_skill("prompt-enhancer", scope="org")
load_skill("master-orchestration", scope="org")
load_skill("brainstorming", scope="org")
load_skill("writing-plans", scope="org")
load_skill("downstream-impact", scope="org")
load_skill("research-assistant")          # built-in
load_skill("supabase")                    # built-in — for WS-2 edge function
load_skill("office/pdf")                  # built-in — for WS-3 invoice PDF
load_skill("dispatching-parallel-agents", scope="org")  # for WS-3+4 parallel
Sources to Use
web, vercel, supabase, microsoft_entra_id__pipedream, github_mcp_direct

Problems + Known Solutions
Problem Solution
Problem Solution
git push auth fails Use bash tool with api_credentials=["github"] — the github connector injects credentials automatically
Remote branch ahead git pull --rebase origin <branch> then push
Vercel CLI SSL fails Use REST API: curl -H "Authorization: Bearer vcp_..."
"Sensitive Environment Variable" REST error Use type: "sensitive" for prod+preview, type: "encrypted" for dev — separate API calls
Full tsc OOM NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit targeting specific files only
searchable prop error on EnhancedDataTable Correct prop is enableSearch
Zod required_error not found v4 uses message key
tenantId TS6133 unused param Prefix with _tenantId
What Braden Has Asked For (complete unfinished list)
✅ Apprentice wage percentages from NCVER pre-loaded (99 rows seeded)

✅ Toast/reminder for annual rate review + Jodie AI subscription prompt

✅ WS-1 all bugs fixed, ADR written

🔲 WS-2: MAPD edge function + wage_calculation_snapshots (START HERE)

🔲 WS-8: RLS hardening (run parallel with WS-2)

🔲 WS-3: Host invoicing + Xero batch invoices

🔲 WS-4: Timesheet state machine + XeroPayrollAdapter (assign complex parts to local Claude Code Opus 4.7)

🔲 WS-5: Report builder + 7 templates

🔲 WS-6: AVETMISS NAT export (assign to local Claude Code)

🔲 WS-7: GTO National Standards gaps

🔲 WS-9: Portal UI updates

One-shot policy is in force: Nothing deferred. All scoped items must be implemented fully. Claude Code is bad for deferring — do not defer.
