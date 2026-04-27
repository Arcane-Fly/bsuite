# CRM7 Comprehensive Gap Analysis & Implementation Plan

_Created: 2026-02-28_
_Version: 1.00W_

## Sources Cross-Referenced

- **Donor CRMs**: crm (original), crm8, crm8u, crm12, crm13-development
- **Docs**: `docs/navigation.md`, `docs/matrix.md`, `docs/compliance.md`, `docs/crm13-docs/requirements/functional.md`
- **CRM8**: `FEATURES.md`, `TRAINING_MANAGEMENT.md`, `EMPLOYMENT_SERVICES.md`
- **CRM13 pages**: 67 page files across 15 sections (most feature-complete donor)
- **CRM7 current**: 113 page files, 97 registered routes in `App.tsx`

---

## PART A — Unregistered Routes (Pages Exist but No Route)

These files exist in `crm7/src/pages/` but have **no route in App.tsx**:

| # | File | Expected Route | Priority |
|---|------|---------------|----------|
| 1 | `field-officers.tsx` | `/field-officers` | P0 |
| 2 | `field-officers/site-assessment.tsx` | `/field-officers/site-assessment` | P1 |
| 3 | `hosts/[id].tsx` | `/hosts/:id` | P0 |
| 4 | `hosts/create.tsx` | `/hosts/create` | P0 |
| 5 | `hosts/monitoring.tsx` | `/hosts/monitoring` | P1 |
| 6 | `hosts/reports.tsx` | `/hosts/reports` | P1 |
| 7 | `hosts/agreement.tsx` | `/hosts/agreement` | P2 |
| 8 | `hosts/vacancies/new.tsx` | `/hosts/vacancies/new` | P1 |
| 9 | `labour-hire/workers/[id].tsx` | `/labour-hire/workers/:id` | P1 |
| 10 | `gto-compliance/access-equity.tsx` | `/gto-compliance/access-equity` | P1 |
| 11 | `gto-compliance/complaints.tsx` | `/gto-compliance/complaints` | P1 |
| 12 | `gto-compliance/records-management.tsx` | `/gto-compliance/records-management` | P1 |
| 13 | `gto-compliance/risk-management.tsx` | `/gto-compliance/risk-management` | P1 |
| 14 | `gto-compliance/standard-assessment.tsx` | `/gto-compliance/standard-assessment` | P1 |
| 15 | `progress-reviews/templates/create.tsx` | `/progress-reviews/templates/create` | P1 |
| 16 | `vet/qualifications/create.tsx` | `/vet/qualifications/create` | P1 |
| 17 | `vet/qualifications/import.tsx` | `/vet/qualifications/import` | P1 |
| 18 | `vet/qualifications/[id]/edit.tsx` | `/vet/qualifications/:id/edit` | P1 |
| 19 | `vet/qualifications/[id]/structure.tsx` | `/vet/qualifications/:id/structure` | P1 |
| 20 | `vet/units/create.tsx` | `/vet/units/create` | P1 |
| 21 | `vet/units/[id]/edit.tsx` | `/vet/units/:id/edit` | P1 |
| 22 | `pricing.tsx` | `/pricing` | P2 |
| 23 | `contacts/modern-contacts.tsx` | `/contacts/modern` | P2 |

**Action**: Register all 23 routes in `App.tsx`. Pure wiring — no new code needed.

---

## PART B — Data Model Gaps

### B1. Apprentice Entity (`entities.ts` + Supabase `apprentices` table)

Missing fields (confirmed by cross-referencing CRM13 + functional requirements):

| Field | Type | Purpose | Source |
|-------|------|---------|--------|
| `field_officer_id` | `uuid` FK → `field_officers.id` | Assigned field officer | CRM13 ApprenticeProfile, functional req 1.1 |
| `training_provider_id` | `uuid` FK → `training_providers.id` | RTO/training provider | functional req 1.2, navigation.md §4 |
| `trade` | `text` | Trade name (e.g., "Carpentry") | `shared/schema.ts` line 34 (exists there, not in entities.ts) |
| `training_days_per_week` | `integer` | Days per week at training | User requirement |
| `training_contract_number` | `text` | Contract registration number | functional req 1.2 |
| `probation_end_date` | `date` | Probation period end | functional req 1.2 |
| `mentor_id` | `uuid` FK → `contacts.id` | Assigned mentor | CRM8 TRAINING_MANAGEMENT §2 |

### B2. FieldOfficer Entity — Duplicate Interface

`entities.ts` has **two** `FieldOfficer` interface declarations (lines ~654 and ~661). One has `id/name/email/phone`, the other `extends BaseEntity` with `contact_id/region`. These need merging.

### B3. Missing Tables (not confirmed in Supabase)

| Table | Purpose | Donor Source |
|-------|---------|-------------|
| `training_providers` | RTO management | CRM13, functional req 3.1 |
| `training_contracts` | Contract tracking per apprentice | CRM13 TrainingContractsPage, functional req 1.2 |
| `field_officer_assignments` | Assignment history with date ranges | CRM13 FieldOfficers, navigation.md |
| `site_visits` | Field officer visit scheduling/recording | CRM13 SiteVisitScheduler |
| `support_contacts` | Emergency/support contacts per apprentice | CRM13 SupportContactsPage |
| `workplace_inspections` | WHS workplace inspection records | CRM13 WorkplaceInspections |
| `reimbursements` | Reimbursement claims and tracking | CRM13 reimbursements/ |

---

## PART C — Missing Pages (Exist in Donors, Not in CRM7)

### C1. Critical (P0) — Core GTO operations

| # | Page | Donor Source | Description |
|---|------|-------------|-------------|
| 1 | Field Officers CRUD | CRM13 `hr/FieldOfficers.tsx` | Proper field officer management (current page is mock activities) |
| 2 | Training Contracts | CRM13 `apprentices/TrainingContractsPage.tsx` | Training contract management per apprentice |
| 3 | Support Contacts | CRM13 `apprentices/SupportContactsPage.tsx` | Emergency/support contacts |
| 4 | Site Visit Scheduler | CRM13 `employers/SiteVisitScheduler.tsx` | Schedule/record field officer visits |

### C2. High (P1) — Business-critical features

| # | Page | Donor Source |
|---|------|-------------|
| 5 | Workplace Inspections | CRM13 `employers/WorkplaceInspections.tsx` |
| 6 | Staff Directory | CRM13 `hr/StaffDirectory.tsx` |
| 7 | Employee Management | CRM13 `hr/Employees.tsx` + `hr/EmployeeDetail.tsx` |
| 8 | Contract Finances | CRM13 `payroll/ContractFinances.tsx` |
| 9 | Rate Management | CRM13 `payroll/RateManagement.tsx` |
| 10 | Reimbursements | CRM13 `reimbursements/index.tsx` + details |
| 11 | Compliance Audits | CRM13 `compliance/Audits.tsx` |
| 12 | Compliance Documents | CRM13 `compliance/Documents.tsx` |
| 13 | Qualification Compliance | CRM13 `compliance/QualificationCompliance.tsx` |

### C3. Medium (P2) — Reporting & analytics

| # | Page | Donor Source |
|---|------|-------------|
| 14 | Apprentice Reports | CRM13 `reports/ApprenticeReports.tsx` |
| 15 | Employer Reports | CRM13 `reports/EmployerReports.tsx` |
| 16 | Financial Reports (dedicated) | CRM13 `reports/FinancialReports.tsx` |
| 17 | Training Reports | CRM13 `reports/TrainingReports.tsx` |
| 18 | Training Certifications | CRM13 `training/Certifications.tsx` |
| 19 | Training Reviews | CRM13 `training/TrainingReviewsPage.tsx` |
| 20 | Course Management | CRM13 `courses/` (3 pages) |

---

## PART D — Pages Using Mock/Fake Data (Need Supabase Wiring)

| Page | Issue |
|------|-------|
| `field-officers.tsx` | Hardcoded `setTimeout` with fake `FieldVisit[]` data |
| `field-officers/actions/index.tsx` | Mock `ActionItem[]` data |
| `field-officers/case-notes/index.tsx` | Likely mock data |
| `field-officers/competency/index.tsx` | Likely mock data |
| `field-officers/incidents/index.tsx` | Likely mock data |
| `apprentices/progress/index.tsx` | Mock `ApprenticeProgress` data |
| `placements/index.tsx` | Falls back to `fallbackPlacements` mock data |
| `mentors/index.tsx` | Needs verification |

---

## PART E — Apprentice Profile Enrichment

Current `apprentices/[id].tsx` displays: name, email, phone, DOB, USI, status, host employer, qualification, dates, custom fields.

**Missing from profile (per functional req + user request)**:

1. **Field Officer** — assigned officer name, email, phone (requires `field_officer_id` FK)
2. **Training Provider/RTO** — organization name, contact (requires `training_provider_id` FK)
3. **Trade** — e.g., "Carpentry", "Electrical" (requires `trade` column)
4. **Progress** — competency-based % (not time-based guess from dates)
5. **Training Days** — days per week attending training
6. **Placement History** — query `placements` table by `apprentice_id`, show timeline
7. **Training Contract** — contract number, probation end, variations
8. **Support Contacts** — emergency contacts, mentor
9. **Compliance Records** — linked compliance documents

---

## PART F — Implementation Plan (Sub-Agent Assignments)

### Wave 1: Route Registration + Data Model (Day 1)

**Agent: Windsurf**

1. Register all 23 unregistered routes in `App.tsx` (Part A)
2. Merge duplicate `FieldOfficer` interface in `entities.ts`
3. Add missing fields to `Apprentice` interface in `entities.ts`
4. Add `TrainingProvider` and `TrainingContract` interfaces to `entities.ts`

### Wave 2: Supabase Migrations (Day 1-2)

**Agent: Claude Code / Windsurf**

1. Migration: Add columns to `apprentices` table (`field_officer_id`, `training_provider_id`, `trade`, `training_days_per_week`, `training_contract_number`, `probation_end_date`, `mentor_id`)
2. Migration: Create `training_providers` table
3. Migration: Create `training_contracts` table
4. Migration: Create `site_visits` table
5. Migration: Create `support_contacts` table
6. Migration: Create `field_officer_assignments` table
7. Migration: Create `workplace_inspections` table
8. Migration: Create `reimbursements` table
9. RLS policies for all new tables

### Wave 3: Wire Existing Pages to Supabase (Day 2-3)

**Agent: Windsurf**

1. Wire `field-officers.tsx` → use `fieldOfficerStore` instead of mock data
2. Wire `field-officers/actions/index.tsx` → Supabase
3. Wire `field-officers/case-notes/index.tsx` → Supabase
4. Wire `field-officers/competency/index.tsx` → Supabase
5. Wire `field-officers/incidents/index.tsx` → Supabase
6. Wire `apprentices/progress/index.tsx` → Supabase (real competency data)
7. Wire `placements/index.tsx` → remove fallback, use real data
8. Wire `mentors/index.tsx` → Supabase

### Wave 4: Apprentice Profile Enrichment (Day 3-4)

**Agent: Windsurf**

1. Update `apprentices/[id].tsx` query to join `field_officers`, `training_providers`
2. Add Field Officer card to detail page
3. Add Training Provider card to detail page
4. Add Trade display
5. Add Training Days display
6. Add Placement History timeline (query `placements` by `apprentice_id`)
7. Add Training Contract section
8. Add Support Contacts section
9. Update `apprentices/index.tsx` list to show field officer + training provider columns

### Wave 5: New Pages from Donor CRMs (Day 4-7)

**Agent: Claude Code (parallel)**

Port from CRM13 (adapt to CRM7 patterns — Zustand stores, Radix UI, Tailwind):

1. Field Officers CRUD page (replace mock activities page)
2. Training Contracts page
3. Support Contacts page
4. Site Visit Scheduler
5. Workplace Inspections
6. Staff Directory
7. Employee Management
8. Reimbursements
9. Compliance Audits
10. Compliance Documents

### Wave 6: Stores + Filters (Day 5-7)

**Agent: Windsurf**

Create Zustand stores for new entities:

1. `trainingProviderStore.ts`
2. `trainingContractStore.ts`
3. `siteVisitStore.ts`
4. `supportContactStore.ts`
5. `workplaceInspectionStore.ts`
6. `reimbursementStore.ts`

Update existing stores:

7. `apprenticeStore.ts` — add `field_officer_id`, `training_provider_id` filters
8. `fieldOfficerStore.ts` — verify working with real data

### Wave 7: Reporting Pages (Day 7-8)

**Agent: Claude Code**

1. Apprentice Reports
2. Employer Reports
3. Financial Reports (dedicated)
4. Training Reports

### Wave 8: Verification & Testing (Day 8-9)

**All Agents**

1. `pnpm typecheck` passes
2. `pnpm build` passes
3. All routes accessible
4. All Supabase queries execute without error
5. All forms create/update records
6. RLS policies verified

---

## Summary Stats

| Category | Count |
|----------|-------|
| Unregistered routes (pages exist) | 23 |
| Missing data model fields | 7 on Apprentice |
| Duplicate interfaces to fix | 1 (FieldOfficer) |
| New Supabase tables needed | 7 |
| Pages using mock data | 8+ |
| Missing pages from donors | 20+ |
| New Zustand stores needed | 6 |
| Total estimated effort | 8-9 days with 2 agents |
