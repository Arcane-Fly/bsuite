# AU Funding Claims Enhancement — Implementation Plan

**Date:** 2026-02-26
**Version:** 1.00W (Working)
**Status:** Ready for implementation

## Context

Research across Australian Government portals (ADMS, WAAMS, CTF), state incentive programs (WA, NSW, VIC, QLD, SA), donor CRM projects (crm12, crm13), and the WorkforceOne platform identified significant gaps in our funding claims data model. The current implementation supports a generic claim workflow but lacks structured fields for the ~17 distinct AU government incentive programs, milestone-based payment tracking, external system references, and custom field extensibility for claims entities.

### Key Research Sources

- **apprenticeships.gov.au** — Federal incentive system (KAP, PHI, AATSP, DAAWS, LAFHA, AASL)
- **jobsandskills.wa.gov.au** — WA state programs (JSWA Employer Incentive, Adult Apprentice, AUKUS Defence, GTO Wage Subsidy)
- **ADMS portal** — No third-party API; myGovID/RAM auth only. Mirror workflow internally.
- **WAAMS portal** — WA-specific claims via DTWD online client portal
- **crm12/crm13 donor projects** — Had `milestoneType: 'commencement' | 'progress' | 'completion'` and `employerId` on claims
- **Supabase multi-tenant JSONB** — Industry-standard pattern for custom fields confirmed

### ADMS Integration Assessment

**No public API exists.** ADMS uses Digital Identity (myGovID) via Relationship Authorisation Manager (RAM). Automated integrations exist only with ATO (Single Touch Payroll) and USI internally. Our approach: mirror the ADMS workflow internally, store external reference IDs, and enable export-ready claim packages for manual ADMS submission.

---

## Task Breakdown

### Task 1: DB Migration — Add structured columns to `funding_claims`

**Goal:** Model AU incentive reality — claim types, milestones, external systems, employer linkage.

**Columns to add:**

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `claim_type` | text | YES | NULL | `employer_incentive`, `apprentice_payment`, `wage_subsidy`, `tool_allowance`, `travel_allowance`, `loan`, `reimbursement`, `gto_reimbursement`, `other` |
| `milestone_type` | text | YES | NULL | `commencement`, `progress`, `midpoint`, `completion`, `periodic`, `ad_hoc` |
| `government_level` | text | YES | NULL | `federal`, `state`, `territory`, `local`, `private` |
| `external_system` | text | YES | NULL | `adms`, `waams`, `ctf`, `smart_and_skilled`, `skills_first`, `other` |
| `external_claim_id` | text | YES | NULL | Generic external reference (supersedes narrow `workforceone_claim_id` usage) |
| `employer_id` | uuid | YES | NULL | FK → `employers(id)` ON DELETE SET NULL |
| `milestone_number` | integer | YES | NULL | Which milestone payment (1, 2, 3...) |
| `milestone_due_date` | date | YES | NULL | When this milestone becomes claimable |

**Acceptance criteria:**
- All columns exist and are nullable
- `employer_id` FK constraint exists with ON DELETE SET NULL
- Existing rows unaffected (all new columns default NULL)
- `vite build` passes

### Task 2: DB Migration — Add structured columns to `funding_sources`

**Goal:** Categorize sources by AU program type, external system, and payment structure.

**Columns to add:**

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `government_level` | text | YES | NULL | Same enum as claims |
| `external_system` | text | YES | NULL | Which portal manages it |
| `payment_schedule` | jsonb | YES | NULL | Milestone schedule template (e.g., `[{month: 6, percent: 20}, ...]`) |
| `priority_list_category` | text | YES | NULL | `kap_energy`, `kap_housing`, `priority`, `non_priority` |

**Acceptance criteria:**
- All columns exist and are nullable
- Existing rows unaffected

### Task 3: DB Migration — Expand `tenant_field_definitions` entity_type CHECK

**Goal:** Enable custom fields for funding_claim and funding_source entities.

**Change:** ALTER CHECK constraint `valid_entity_type` to add `'funding_claim'` and `'funding_source'` to the allowed values array.

**Current constraint:**
```sql
CHECK (entity_type = ANY (ARRAY['contact','lead','client','apprentice','employer','placement','project','task']))
```

**New constraint:**
```sql
CHECK (entity_type = ANY (ARRAY['contact','lead','client','apprentice','employer','placement','project','task','funding_claim','funding_source']))
```

**Acceptance criteria:**
- Can insert a `tenant_field_definitions` row with `entity_type = 'funding_claim'`
- Can insert a `tenant_field_definitions` row with `entity_type = 'funding_source'`
- Existing rows unaffected

### Task 4: Update TypeScript types

**Goal:** Reflect new DB columns in FundingClaim and FundingSource interfaces.

**Files:** `src/types/entities.ts`

**Changes:**
- Add all new optional fields to `FundingClaim` interface
- Add all new optional fields to `FundingSource` interface
- Add `employer?` JOIN type to `FundingClaim` (like existing `apprentice?` and `funding_source?`)
- Add `custom_fields?: Record<string, unknown>` to both interfaces
- Update `EntityType` union in `customFieldsService.ts` to include `'funding_claim' | 'funding_source'`

**Acceptance criteria:**
- All new fields are optional (`?`)
- No existing code breaks
- `vite build` passes

### Task 5: Update service layer

**Goal:** Select new columns, support employer JOIN, expose new filters.

**Files:** `src/services/fundingService.ts`

**Changes:**
- Add new columns to all SELECT statements
- Add `employer:employers(id, business_name, trading_name, abn)` to JOINs (LEFT JOIN via nullable FK)
- Add `claim_type` and `milestone_type` to validation logic

**Acceptance criteria:**
- Service methods return new fields when present
- Employer data joined when `employer_id` is set
- `vite build` passes

### Task 6: Update stores

**Goal:** JOIN employer data, expose new filter capabilities.

**Files:** `src/stores/fundingClaimStore.ts`, `src/stores/fundingSourceStore.ts`

**Changes:**
- Add `employer:employers(id, business_name, trading_name, abn)` to `selectColumns` in claim store
- Add new columns to select if needed
- Add `government_level` and `external_system` to source store filter support

**Acceptance criteria:**
- Claim store JOINs employer
- Source store supports filtering by government_level
- `vite build` passes

### Task 7: Update custom fields admin UI

**Goal:** Allow tenants to define custom fields for funding claims and funding sources.

**Files:** `src/pages/settings/custom-fields.tsx`, `src/services/customFieldsService.ts`

**Changes:**
- Add `{ value: 'funding_claim', label: 'Funding Claims' }` and `{ value: 'funding_source', label: 'Funding Sources' }` to `ENTITY_TYPES` array
- Add to `EntityType` type union
- Subtitle: "Government incentives, wage subsidies, and other funding claims"

**Acceptance criteria:**
- Can select "Funding Claims" in custom fields settings
- Can create a custom field definition for `funding_claim`
- `vite build` passes

### Task 8: Wire DynamicFieldRenderer into claims pages

**Goal:** Render tenant-defined custom fields on claim detail and creation forms.

**Files:** `src/pages/claims/[id].tsx`, `src/pages/claims/new.tsx`

**Changes:**
- Import `DynamicFieldRenderer` component
- Fetch tenant ID (from `user_tenants` table)
- Render custom fields section on detail page (read-only when not editing)
- Render custom fields section on new claim form
- Save custom field values in `custom_fields` JSONB on create/update

**Acceptance criteria:**
- Custom fields render on detail page
- Custom fields render on new claim form
- Custom field values persist to `custom_fields` column
- `vite build` passes

### Task 9: Add claim_type + milestone_type to list/new pages

**Goal:** Enable filtering by claim type and milestone, auto-populate from funding source.

**Files:** `src/pages/claims/list.tsx`, `src/pages/claims/new.tsx`

**Changes:**
- Add `claim_type` and `milestone_type` filter dropdowns to list page
- Add `claim_type`, `milestone_type`, `government_level` fields to new claim form
- Auto-populate `claim_type`, `government_level`, `external_system` from selected funding source defaults
- Place new fields in an "Advanced" expandable section to avoid overwhelming simple claim creation

**Acceptance criteria:**
- List page can filter by claim_type and milestone_type
- New claim form has type/milestone fields
- Auto-populate works from funding source selection
- `vite build` passes

### Task 10: Add external system tracking to detail page

**Goal:** Track ADMS/WAAMS/CTF reference IDs alongside internal claim lifecycle.

**Files:** `src/pages/claims/[id].tsx`

**Changes:**
- Add "External Reference" card showing `external_system`, `external_claim_id`
- Make fields editable for draft/submitted claims, read-only for approved/paid
- Add UI hint: "Reference number only, no personal information"
- Keep `workforceone_claim_id` as legacy alias (display if present, save to `external_claim_id`)

**Acceptance criteria:**
- External reference card visible on detail page
- Read-only enforcement for approved/paid claims
- `vite build` passes

### Task 11: Funding source template catalog (future/backlog)

**Goal:** Pre-populate common AU program templates for tenants.

**Approach:** Admin UI "Create from Template" button or edge function endpoint. NOT a migration seed.

**Templates to catalog:**
- KAP Employer Incentive (federal/adms)
- KAP Apprentice Payment (federal/adms)
- Priority Hiring Incentive (federal/adms)
- AATSP (federal/adms)
- DAAWS (federal/adms)
- LAFHA (federal/adms)
- Tool Allowance (federal/adms)
- JSWA Employer Incentive (state/waams)
- Adult Apprentice Employer Incentive (state/waams)
- GTO Wage Subsidy (state/waams)
- CTF Employer Grant (state/ctf)

**Status:** DEFERRED — implement after core schema + UI is stable.

### Task 12: Build verify + stale reference grep

**Goal:** Ensure zero build errors and no stale column references.

**Acceptance criteria:**
- `npx vite build` exit 0
- `grep -r 'workforceone_claim_id\|remaining_amount\|contact_person\|\.claim_date\b\|\.payment_date\b' src/` returns only expected hits

---

## Red-Team Report

### Roles Used

| Role | Issues Found |
|------|-------------|
| Security | 3 (SEC-01 employer_id RLS, SEC-02 PII in external ID, SEC-03 XSS in custom fields) |
| Reliability | 4 (REL-01 nullable FK, REL-02 TS breaks, REL-03 seed collisions, REL-04 milestone terms) |
| Performance | 2 (PERF-01 employer JOIN, PERF-02 payment_schedule size) |
| UX/DX | 3 (UX-01 form complexity, UX-02 label confusion, UX-03 read-only refs) |
| Code Quality | 3 (CQ-01 interface size, CQ-02 triple maintenance, CQ-03 seed in migration) |

### Issue Resolutions

- **All new columns nullable** — prevents breaking existing data (REL-01, REL-02)
- **Template catalog deferred** — avoids seed collisions, uses admin UI instead (REL-03, CQ-03)
- **Generic milestone enum** — covers both federal and state terminology (REL-04)
- **Auto-populate from funding source** — reduces form complexity (UX-01)
- **Read-only external refs for approved/paid** — prevents accidental audit trail changes (UX-03)
- **LEFT JOIN employer** — cheap with NULL FK, no perf concern (PERF-01)
- **payment_schedule is template only** — clarified scope (PERF-02)

### Accepted Risks

- **SEC-03** (XSS in custom field exports): React handles display. Flag for future CSV/PDF export pipeline.
- **CQ-01** (large interface): Flat matches DB. Section comments sufficient.
- **CQ-02** (triple maintenance for entity types): Documented lockstep requirement. No practical single-source across DB constraint + TS type + UI array.

---

## Dependencies & Blocking

- Tasks 1-3 (DB migrations) must run first
- Task 4 (types) depends on 1-3
- Tasks 5-6 (service/stores) depend on 4
- Tasks 7-10 (UI) depend on 5-6
- Task 11 (templates) deferred
- Task 12 (verify) runs last

## Estimated Effort

| Task | Complexity | Lines ~approx |
|------|-----------|---------------|
| 1-3 | Low | ~40 SQL |
| 4 | Low | ~30 TS |
| 5-6 | Medium | ~50 TS |
| 7 | Low | ~10 TS |
| 8 | Medium | ~80 TS |
| 9 | Medium | ~100 TS |
| 10 | Low | ~40 TS |
| 12 | Low | CLI only |
