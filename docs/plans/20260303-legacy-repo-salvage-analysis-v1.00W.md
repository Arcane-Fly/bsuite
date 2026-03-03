# Legacy Repository Salvage Analysis

**Version:** 1.00W
**Date:** 2026-03-03
**Status:** Working
**Scope:** 7 legacy repos → BSuite CRM7 / R80.3 / Conduit

---

## Executive Summary

Seven legacy repositories contain ~200K+ LOC of GTO/apprentice management code. Most is stub or incomplete, but specific modules are production-quality and directly fill gaps in BSuite. This document catalogs every salvageable asset, ranks them by value, and provides a concrete extraction plan.

**Bottom line:** 3 repos contain high-value assets worth extracting. The remaining 4 are reference-only.

| Repo | High-Value Assets | Worth Cloning? |
|------|-------------------|----------------|
| `Arcane-Fly/crm7` | SQL functions, Zod schemas, rate types, migration DDL | Yes — targeted extraction |
| `GaryOcean428/crm8u` | Flexible calc formula, 3-model config, DB schema | Yes — targeted extraction |
| `GaryOcean428/ApprenticeTracker` | WHS module, real MAPD client, award monitor | Yes — targeted extraction |
| `GaryOcean428/crm13` | RLS patterns, monitoring hooks | Reference only |
| `GaryOcean428/workforce-hub` | Form patterns, 96+ components | Reference only |
| `GaryOcean428/crm8` | Identical calc to crm8u (earlier fork) | Superseded by crm8u |
| `Arcane-Fly/CRM7A` | Sidebar layout pattern | Reference only |

---

## Salvage Catalog

### Tier 1: Critical — Directly Fills Roadmap Gaps

#### 1.1 Charge Rate Calculation Engine

**Gap filled:** R80.3 ↔ CRM7 cross-functionality audit Phase 1 (shared calc package)

| Asset | Source | LOC | Quality |
|-------|--------|-----|---------|
| `calculateFlexibleChargeRate()` — parametric formula | `crm8u/rates-payroll/src/ratesCalculation.ts` | 486 | Formula correct, missing payroll tax |
| `ChargeRateBreakdown` interface (13 cost fields) | `crm8u/rates-payroll/src/ratesCalculation.ts` | — | Complete, needs payroll tax + admin fields |
| `FlexibleChargeParams` interface (13 params) | `crm8u/rates-payroll/src/ratesCalculation.ts` | — | Good foundation, `trainingWeeks` unused |
| 3-model config (Standard/ALEX/52-Week) | `crm8u/rates-payroll/src/ratesCalculation.ts` | — | Business logic correct, hardcoded values |
| `RateTemplateSchema` (Zod, 12 cost fields) | `Arcane-Fly/crm7: lib/services/fairwork/fairwork.types.ts` | 220 | Production-ready, drop into `@bsuite/charge-calc` |
| `calculate_rate.sql` plpgsql | `Arcane-Fly/crm7: supabase/functions/calculate_rate.sql` | 125 | Complete with ROUND(), all components |
| `award-rates.sql` plpgsql functions (7 functions) | `Arcane-Fly/crm7: supabase/functions/award-rates.sql` | 395 | Best artifact in all repos |
| `RateError` class (12 error codes, HTTP mapping) | `Arcane-Fly/crm7: lib/services/rates/errors.ts` | 149 | Production-ready |
| `rate_calculations` DDL (30+ named columns) | `Arcane-Fly/crm7: prisma/migrations/20250206_*/migration.sql` | 145 | Richest schema, includes `billing_model` |
| `rate_calculations` table (crm8u, 26 named fields) | `crm8u` Supabase types | — | Adds `financing_cost`, `gross_profit` |
| `rate_templates` + `rate_base_values` schema | `crm8u` Supabase types | — | Flexible key-value parameter store |

**The formula** (from crm8u, the cleanest version):

```typescript
function calculateFlexibleChargeRate(params: FlexibleChargeParams) {
  const annualBaseWage = params.hourlyRateAward * params.weeklyHours * params.totalPaidWeeks;
  const leaveLoadingCost = params.hourlyRateAward * params.weeklyHours
    * params.annualLeaveWeeks * params.leaveLoadingPercent;
  const superannuationCost = annualBaseWage * params.superRate;
  const workersCompCost = annualBaseWage * params.workersCompRate;
  const grossAnnualCost = annualBaseWage + leaveLoadingCost + superannuationCost
    + workersCompCost + params.trainingFees + params.otherOnCosts;
  const netAnnualCost = grossAnnualCost - params.fundingOffset;
  const marginAmount = netAnnualCost * params.marginRate;
  const totalAnnualCharge = netAnnualCost + marginAmount;

  // Method A: spread over 52 weeks (Standard/52-Week)
  const hourlyChargeA = totalAnnualCharge / 52 / params.weeklyHours;
  // Method B: concentrate into on-site weeks (ALEX)
  const hourlyChargeB = totalAnnualCharge / params.onSiteWeeks / params.weeklyHours;
}
```

**Known formula gaps to fix:**
- No payroll tax (WA threshold $1M, GTOs regularly breach)
- No penalty rates or shift loadings
- Super applied on full 52-week wage (should exclude unpaid leave per SGA OTE rules)
- No date-aware super progression (11% → 11.5% → 12%)
- `trainingWeeks` declared but unused in formula
- No BOOT comparison output

#### 1.2 Fair Work MAPD API Client

**Gap filled:** Allowance, penalty, and expense-allowance endpoint coverage

| Asset | Source | LOC | Quality |
|-------|--------|-----|---------|
| `FairWorkApiClient` class (13 endpoints) | `ApprenticeTracker: server/services/fairwork/api-client.ts` | 728 | Real MAPD endpoints, production-quality |
| `getApprenticeRates()` with fallback logic | `ApprenticeTracker: server/services/fairwork/api-client.ts` | — | Per-award reference classification lookup |
| Per-award percentage tables (MA000025/036/003) | `ApprenticeTracker: server/services/fairwork/api-client.ts` | — | Domain-accurate, matches award clauses |
| `AwardRateCalculator` (3-tier fallback) | `ApprenticeTracker: server/services/award-rate-calculator.ts` | 736 | DB → API → percentage → hardcoded chain |
| `AwardMonitorService` (version change detection) | `ApprenticeTracker: server/services/fairwork/award-monitor.ts` | 580 | Weekly check, email alerts — net new for CRM7 |
| `FairWorkDataSync` (cron-driven DB sync) | `ApprenticeTracker: server/services/fairwork/data-sync.ts` | 351 | Daily sync, Sunday full refresh |
| `FairWorkConfigSchema` (Zod) | `Arcane-Fly/crm7: lib/services/fairwork/fairwork.config.ts` | 39 | Clean config validation |

**API endpoints called by ApprenticeTracker (real MAPD):**

| Endpoint | CRM7 Status |
|----------|-------------|
| `GET /api/v1/awards` | Already implemented |
| `GET /api/v1/awards/{code}` | Already implemented |
| `GET /api/v1/awards/{code}/classifications` | Already implemented |
| `GET /api/v1/awards/{code}/pay-rates` | Already implemented |
| `GET /api/v1/awards/{code}/wage-allowances` | **Missing in CRM7** |
| `GET /api/v1/awards/{code}/expense-allowances` | **Missing in CRM7** |
| `GET /api/v1/awards/{code}/penalties` | **Missing in CRM7** |
| `POST /api/v1/rates/validate` | **Missing in CRM7** |
| `POST /api/v1/calculate` | **Missing in CRM7** |

#### 1.3 WHS Module

**Gap filled:** GTO Standard 2 compliance — WHS incident tracking is entirely absent from CRM7

| Asset | Source | LOC | Quality |
|-------|--------|-----|---------|
| WHS Drizzle schema (8 tables, Zod schemas) | `ApprenticeTracker: shared/schema/whs.ts` | 341 | Production-ready |
| Incident routes (CRUD + workflow + metrics) | `ApprenticeTracker: server/api/whs/incident-routes.ts` | 761 | Complete with email notifications |
| Risk assessment routes (CRUD + approval) | `ApprenticeTracker: server/api/whs/risk-assessment-routes.ts` | 584 | Includes PDF/Excel export |
| Report generator (PDF + Excel) | `ApprenticeTracker: server/services/whs-report-generator.ts` | 367 | Uses jsPDF + ExcelJS |
| Dashboard component (Recharts) | `ApprenticeTracker: client/src/components/whs/whs-dashboard.tsx` | 366 | Trend analysis, pie charts |
| Incident form (react-hook-form + Zod) | `ApprenticeTracker: client/src/components/whs/new-incident-form.tsx` | 354 | Witness array management |

**WHS table schema highlights:**
- `whs_incidents` — 34 columns incl. `notifiable_incident`, `authority_notified`, `authority_reference`
- 9-state status machine: reported → investigating → action-required → remediation-in-progress → pending-review → resolved → closed + escalated + requires-followup
- `whs_witnesses` — cascade delete with incident
- `whs_documents` — polymorphic FK (incident | risk_assessment | inspection | policy)
- `whs_risk_assessments` — `hazards` JSON array, `action_plan`, approval workflow
- `whs_inspections` — `compliance_score` (0-100)
- `whs_policies` — versioned with `effective_date`/`review_date`
- `whs_metrics` — scheduled report runner with `recipients` JSON

**Total WHS module: ~3,900 LOC**

---

### Tier 2: High — Accelerates Existing Roadmap

#### 2.1 Database Schemas

| Asset | Source | Tables | Notes |
|-------|--------|--------|-------|
| `rates_schema.sql` DDL | `Arcane-Fly/crm7` | `rate_templates`, `rate_template_history`, `rate_calculations`, `bulk_calculations`, `rate_activities` | GIN trigram index for fuzzy search |
| `rate_rls_policies.sql` | `Arcane-Fly/crm7` | RLS on `rate_templates`, `timesheet_entries`, `rate_calculations` | Uses `auth.uid()` + `user_organizations` — BSuite compatible |
| `rate_adjustments` table | `crm8u` | Per-worker per-host adjustments | Funding offsets, special rates |
| `billing_cycles` table | `crm8u` | Invoice/billing tracking | `status: draft|sent|paid` |
| `mv_rate_analytics` materialized view | `crm8u` | Analytics aggregates | avg_base_rate, avg_charge_rate, annual_revenue_potential |
| GTO compliance tables (7) | `ApprenticeTracker` | `gto_compliance_standards`, `compliance_assessments`, `apprentice_recruitment`, `host_employer_agreements`, `apprentice_induction`, `complaints`, `appeals` | `required_evidence text[]` pattern |

#### 2.2 Complaints/Appeals Enhancement

| Enhancement | Source | CRM7 Impact |
|-------------|--------|-------------|
| `appeals.external_referral` boolean | `ApprenticeTracker` | Track when appeal goes to STA/FWC |
| `appeals.referral_details` jsonb | `ApprenticeTracker` | Store external referral specifics |
| `appeals.status = 'referred'` | `ApprenticeTracker` | New status for external referrals |
| `complaints.complainant_type` enum | `ApprenticeTracker` | Categorize complainant role |

#### 2.3 Template Comparison Engine

| Asset | Source | LOC |
|-------|--------|-----|
| `compareTemplates()` — field-by-field diff with significance threshold | `Arcane-Fly/crm7: lib/services/rates/enhanced-service.ts` | ~60 |

---

### Tier 3: Medium — Reference Patterns

| Asset | Source | Value |
|-------|--------|-------|
| `use-fairwork.ts` React Query hooks (12 hooks) | `Arcane-Fly/crm7` | Good API surface design, needs typed responses |
| `CacheService` injection pattern | `Arcane-Fly/crm7` | 1-hour TTL, key-prefixed |
| Form patterns (TanStack Table) | `workforce-hub` | 96+ shadcn components |
| Monitoring hooks library | `crm13` | Performance monitoring, error boundaries |
| `WageTemplate` interface (from doc) | `crm8u/docs/payroll/WAGE_CALCULATION.md` | `gtoMargin`, `adminFee`, `allowances`, `deductions` |

---

### Do Not Salvage

| Asset | Source | Reason |
|-------|--------|--------|
| `parseEnterpriseAgreement()` | `crm8u` | Regex on structured text — violates CLAUDE.md |
| `fetchFairworkWageData()` / `fetchSuperRateData()` | `crm8u` | `setTimeout` stubs returning hardcoded values |
| `fairwork-enhanced.ts` (622 LOC) | `ApprenticeTracker` | Hardcoded demo data, not real API |
| `fairwork-client.ts` (238 LOC) | `Arcane-Fly/crm7` | Fictional API paths (not real MAPD) |
| `RateManagementServiceImpl` | `Arcane-Fly/crm7` | camelCase column queries (silently broken) |
| CRM7A entire repo | `Arcane-Fly/CRM7A` | 1,495 LOC, 15-20% complete, experimental only |
| crm8 entire repo | `GaryOcean428/crm8` | Superseded by crm8u (identical calc, no DB schema) |
| `forcedTotalCost` pattern | `crm8u` | Hardcoded models compute sum then discard it |
| Award scraper regex | `ApprenticeTracker` | Regex on HTML — violates CLAUDE.md |

---

## Adaptation Friction Points

| Issue | Repos Affected | Effort | Solution |
|-------|---------------|--------|----------|
| Integer PKs vs UUID | ApprenticeTracker migrations | Medium | Use Drizzle schema (UUIDs), not raw SQL migrations |
| Custom JWT vs Supabase Auth | ApprenticeTracker | Low | Map permission strings to CRM7 RBAC |
| Drizzle ORM vs Supabase client | ApprenticeTracker | Medium | Convert Drizzle queries to `supabase.from()` |
| No RLS policies | ApprenticeTracker WHS | Medium | Add `tenant_id` + RLS per BSuite pattern |
| Prisma vs Supabase | Arcane-Fly/crm7 | Medium | Schema shapes portable, queries not |
| `current_setting('app.current_org_id')` RLS | Arcane-Fly/crm7 rates schema | Low | Already has alternative `auth.uid()` policy file |
| Express routes → CRM7 pages | ApprenticeTracker | Medium | Convert route handlers to Zustand store + page |
| Duplicate `RateTemplate` types (3 versions) | Arcane-Fly/crm7 | Low | Collapse to single Zod source of truth |

---

## Extraction Plan

### Phase 1: `@bsuite/charge-calc` Package

**Priority:** Critical — resolves known DRY violation between R80.3 and CRM7

1. Extract `FlexibleChargeParams` and `ChargeRateBreakdown` interfaces from crm8u
2. Add missing fields: `payrollTaxRate`, `adminCosts`, `financingCostRate`, `publicHolidaysDays`, `sickLeaveDays`
3. Extract `calculateFlexibleChargeRate()` as pure function
4. Fix formula gaps: payroll tax, super OTE rules, training weeks
5. Implement 3-model config (`BillingModelConfig` discriminant union)
6. Extract `RateTemplateSchema` (Zod) from Arcane-Fly/crm7
7. Extract `RateError` class from Arcane-Fly/crm7
8. Port `calculate_rate.sql` to Supabase migration
9. Port `award-rates.sql` plpgsql functions to Supabase migration
10. Port `rates_schema.sql` DDL (adapted for BSuite RLS)

### Phase 2: Fair Work API Coverage

**Priority:** High — fills missing allowance/penalty/expense endpoints

1. Extract allowance, penalty, and expense-allowance endpoint callers from ApprenticeTracker `api-client.ts`
2. Integrate into CRM7's existing `fairworkEnhancedService` chain
3. Extract `AwardMonitorService` version-change detection logic
4. Convert to Supabase Edge Function (cron-triggered)
5. Extract `FairWorkConfigSchema` Zod from Arcane-Fly/crm7

### Phase 3: WHS Module

**Priority:** High — required for GTO Standard 2 compliance

1. Convert WHS Drizzle schema to Supabase migration
2. Add `tenant_id` column + RLS policies to all WHS tables
3. Port incident routes → CRM7 Zustand store + pages
4. Port risk assessment routes → CRM7 Zustand store + pages
5. Adapt report generator (jsPDF + ExcelJS) for CRM7 context
6. Port dashboard component (Recharts → existing CRM7 chart setup)
7. Port incident form (react-hook-form → existing CRM7 form pattern)

### Phase 4: Schema Enhancements

**Priority:** Medium

1. Add `external_referral` + `referral_details` to CRM7 appeals
2. Add `referred` status to appeals enum
3. Consider `required_evidence text[]` pattern for GTO standards
4. Port `rate_adjustments` table schema
5. Port `billing_cycles` table schema

---

## Estimated Effort

| Phase | New Files | Modified Files | LOC (net new) | Effort |
|-------|-----------|---------------|---------------|--------|
| 1 — Charge Calc | 8-10 | 3-5 | ~1,200 | 2-3 sessions |
| 2 — Fair Work API | 3-5 | 2-3 | ~600 | 1-2 sessions |
| 3 — WHS Module | 15-20 | 3-5 | ~3,000 | 3-5 sessions |
| 4 — Schema Enhancements | 3-5 | 2-3 | ~300 | 1 session |
| **Total** | **~35** | **~15** | **~5,100** | **7-11 sessions** |

---

## Decision Record

- **crm8u `calculateFlexibleChargeRate()` chosen over Arcane-Fly/crm7 `chargeCalculationService`** — crm8u formula is parametric with Method A/B billing model support. Arcane-Fly version is flat (all components as % of base * hours, no sequential application).
- **ApprenticeTracker `api-client.ts` chosen over Arcane-Fly/crm7 `fairwork-client.ts`** — ApprenticeTracker calls real MAPD endpoints; Arcane-Fly uses fictional REST paths.
- **Arcane-Fly/crm7 SQL functions chosen for DB layer** — `award-rates.sql` and `calculate_rate.sql` are the most complete, production-ready artifacts across all repos. Pure SQL, no TypeScript dependencies.
- **ApprenticeTracker WHS module chosen as sole source** — only repo with WHS implementation. ~3,900 LOC, 75% production-ready.
- **crm8u DB schema chosen over crm8** — crm8u adds 5 rate-specific tables that crm8 lacks (evolved post-fork).
