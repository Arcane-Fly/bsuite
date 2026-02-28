# CRM7 Comprehensive Remediation & Gap Closure Plan v2.00

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Close all identified gaps from the 8-agent red-team audit, bringing CRM7 from ~35% to production-ready for GTO operations.

**Architecture:** Four phases — Foundation (compliance blockers), Core UX (day-to-day ops), Financial (billing pipeline), Integration (external APIs). Each phase has tasks delegatable to Cascade or Claude Code 2.

**Tech Stack:** TypeScript strict, React 18, Supabase v2, Zustand v5, Zod v4, Vite 6, @ai-sdk/react v3

---

## Pre-Requisites (Before Any Phase)

### PR-1: Merge development → main (fast-forward)

Development is 52 commits ahead, 0 behind. Pure superset.

```bash
git checkout main
git merge --ff-only development
git push origin main
git checkout development
```

**Delegate to:** Claude Code 2 (5 min, needs human approval)

### PR-2: Fix BSU cookie cleanup bug

**File:** `business-suite-unified/src/lib/supabase.ts:106`
**Fix:** Change `readCookie(name)` → `readCookieRaw(name)`
**Risk:** Session chunk orphaning in production

**Delegate to:** Cascade (trivial fix, 2 min)

---

## Phase 0: Documentation & Hygiene (Unblocks Everything)

### 0.1: Consolidate all disparate .md files

**Problem:** 356 .md files, 78 outside `/docs/`, no naming convention, no indexing.

**Steps:**
1. Inventory all .md files across repo (done — see audit above)
2. For each subproject root (braden/, bsu/, crm7/, R80.3/, conduit/):
   - Keep: README.md, CLAUDE.md, AGENTS.md, CONTRIBUTING.md (standard files)
   - Move to `docs/archive/{project}/`: All ALLCAPS summaries (IMPLEMENTATION_SUMMARY.md, FIX_SUMMARY.md, etc.)
   - Rename per contributing standard: `YYYYMMDD-descriptive-name-type-vMAJOR.MINOR[STATUS].md`
3. Root level:
   - Move `GTO-Standards.md` → `docs/20260228-gto-standards-reference-v1.00W.md`
   - Move `Theme-best-practice.md` → `docs/20260228-d2c-theme-specification-v1.00W.md`
   - Move `mapd-api-guide.md` → `docs/archive/mapd-api-guide.md`
4. Fix typo: `R80.3/docs/fiarwork-api-2.md` → delete (duplicate of `fairwork-api.md`)
5. Create/update README.md index in every docs/ subdirectory

**Delegate to:** Cascade (file moves + renames, low risk, ~30 min)

### 0.2: Index and mark CRM13 donor docs

**Problem:** 93 files in `docs/crm13-docs/`, no README, no import markers, duplicates with `docs/`.

**Steps:**
1. Create `docs/crm13-docs/README.md` with table of all 93 files, organized by category
2. Add `> [IMPORTED FROM CRM13] — Reference only, not canonical` header to each file
3. Identify duplicates between `docs/` and `docs/crm13-docs/` — remove from `docs/` if CRM13 version is more complete
4. Categorize: architecture/, guides/, models/, progress/ — already partly done, verify completeness

**Delegate to:** Cascade (~20 min)

### 0.3: Create CRM7 page inventory document

**Problem:** 174 pages, no inventory, can't prioritize remediation without knowing what exists.

**Steps:**
1. List all files in `crm7/src/pages/` with:
   - Page name and route
   - Entity/store it uses (or "direct Supabase" if no store)
   - Data criticality (financial/compliance/operational/informational)
   - Stub vs functional (does it render real data or fabricated?)
2. Save as `docs/20260228-crm7-page-inventory-v1.00W.md`

**Delegate to:** Claude Code 2 (read-only research, ~15 min)

### 0.4: Create RBAC matrix document

**Problem:** No permission spec for CRM7. 174 pages accessible to all users.

**Steps:**
1. Harvest permission constants from `crm7/src/lib/permissions.ts`
2. Cross-reference with portal role detection in `src/pages/portal/index.tsx`
3. Map against DRY-ONE-SHOT-ARCHITECTURE.md data access table
4. Create matrix: Page × Role → Permission (read/write/none)
5. Save as `docs/20260228-crm7-rbac-matrix-v1.00W.md`

**Delegate to:** Claude Code 2 (~20 min research)

---

## Phase 1: Foundation — Compliance Blockers (Weeks 1-4)

### 1.1: Fair Work API — Remove hardcoded fallback, wire real API

**Problem:** R80.3 `fairworkApi.ts` returns hardcoded 2022-2025 rates instead of calling the real API. Award rates become stale every July.

**Files:**
- Fix: `R80.3/src/services/fairworkApi.ts` (lines 304-342 — fallback logic)
- Fix: `R80.3/supabase/functions/sync-award-rates/index.ts` (lines 170-180 — uses test data)
- Reference: `R80.3/docs/fairwork-api.md` (API spec from user)
- Reference: `R80.3/supabase/functions/auth-fairwork/index.ts` (working auth pattern)

**Steps:**
1. Read user-provided Fair Work API docs at `R80.3/docs/fairwork-api.md`
2. In `fairworkApi.ts`: Change fallback from "return hardcoded data" to "call edge function, fall back to cached DB data only if API fails"
3. In `sync-award-rates`: Replace test fixture data with actual API call using `auth-fairwork` pattern
4. Add rate cache table: `award_rate_cache(award_code, year, effective_date, rates JSONB, fetched_at)`
5. Add annual sync cron: First Monday of July (annual wage review)
6. Wire `crm7/src/services/fairworkEnhancedService.ts` to use same cache

**Delegate to:** Claude Code 2 (needs careful API integration, ~4 hours)

### 1.2: BOOT assessment schema and validation engine

**Problem:** 0% implemented. BOOT is the competitive differentiator. Unions drill down on this.

**Files:**
- Reference: `.claude/projects/.../memory/boot-test-research.md` (legal framework)
- Reference: `.claude/projects/.../memory/r80-crm7-audit.md` (BOOT engine design)
- Reference: `docs/plans/20260228-r80-crm7-shared-calc-engine-v1.00W.md` (Phase 2 BOOT tasks)
- Create: `crm7/src/types/entities.ts` — add BootAssessment entity
- Create: `crm7/src/schemas/bootAssessment.ts`
- Create: `crm7/src/stores/bootAssessmentStore.ts`
- Create: `crm7/supabase/migrations/YYYYMMDD_create_boot_assessment.sql`

**Steps:**
1. Define BootAssessment entity:
   - `apprentice_id`, `award_code`, `ea_reference` (if enterprise agreement)
   - `assessment_type`: 'global' | 'per_class' | 'per_employee'
   - `ordinary_hours_weekly`, `base_rate_hourly`, `loaded_rate_hourly`
   - `penalty_scenarios`: JSON array of (scenario_name, hours, rate, total)
   - `monetary_comparison`: { award_total, ea_total, difference, percentage }
   - `non_monetary_notes`: text (leave, rostering, consultation)
   - `overall_result`: 'pass' | 'fail' | 'marginal'
   - `fwc_form_reference`: string (F16/F17 form number)
   - `assessed_by`, `assessed_at`, `review_notes`
2. Create Zod schema with refinements (total must be positive, percentage calculated correctly)
3. Create store with filters for `apprentice_id`, `award_code`, `overall_result`
4. Create migration with RLS (tenant-scoped)
5. Add BOOT assessment page stub under `/pages/compliance/boot/`

**Delegate to:** Claude Code 2 (domain-specific, needs careful schema design, ~6 hours)

### 1.3: Compliance alert automation

**Problem:** Alerts are manual-only. No scheduled scanning for expiring documents, overdue visits, training deadlines.

**Files:**
- Modify: `crm7/src/stores/complianceAlertStore.ts`
- Create: Edge function `compliance-scanner` (or Supabase cron)
- Reference: existing ComplianceAlert entity

**Steps:**
1. Create edge function `compliance-alert-scanner`:
   - Scan `document_records` for `expires_at < NOW() + INTERVAL '30 days'` → create document_expiry alert
   - Scan `site_visits` for hosts with no visit in 28+ days → create overdue_visit alert
   - Scan `training_plans` for `expected_end_date < NOW() + INTERVAL '90 days'` with progress < 75% → create training_delay alert
   - Scan `host_agreements` for `expiry_date < NOW() + INTERVAL '60 days'` → create agreement_expiry alert
   - Scan `apprentices` for `visa_expiry < NOW() + INTERVAL '90 days'` → create visa_expiry alert
   - Deduplicate: don't create alert if one already exists for same entity+type
2. Schedule via Supabase cron: daily at 6 AM AEST
3. Add alert count badge to main navigation

**Delegate to:** Claude Code 2 (~4 hours)

### 1.4: Placement lifecycle state machine

**Problem:** 35% implemented. No workflow from matching → approval → active → monitoring → completion.

**Files:**
- Modify: `crm7/src/types/entities.ts` — enhance Placement entity
- Create: `crm7/src/lib/workflows/placementWorkflow.ts`
- Modify: `crm7/src/pages/placements/` — add workflow UI
- Create: migration for placement_status_history table

**Steps:**
1. Define placement status machine:
   ```
   draft → matching → offered → accepted → active → monitoring → completing → completed
                    ↘ rejected    ↘ declined         ↘ suspended → resumed
                                                      ↘ terminated
   ```
2. Create `placement_status_history` table (placement_id, from_status, to_status, changed_by, changed_at, reason)
3. Add validation: Can't go active without WHS induction complete, training plan approved, host agreement current
4. Add UI: Status timeline, transition buttons with reason capture, validation error display

**Delegate to:** Claude Code 2 (~6 hours)

### 1.5: Award interpretation and wage compliance

**Problem:** 15% implemented. No classification → rate mapping, no penalty calculation, no progression tracking.

**Files:**
- Reference: `R80.3/docs/fairwork-api.md` (API endpoints for classifications, penalties, allowances)
- Modify: `crm7/src/types/entities.ts` — enhance Award, Classification entities
- Create: `crm7/src/lib/awards/awardInterpreter.ts`
- Create: `crm7/src/lib/awards/penaltyCalculator.ts`

**Steps:**
1. Fetch classifications endpoint from Fair Work API: `GET /api/v1/awards/{id}/classifications`
2. Map apprentice year + trade area → classification level → base rate
3. Implement penalty multiplier logic: weekend × 1.5, public holiday × 2.5, late night × 1.25 (configurable per award)
4. Implement allowance calculation: tools, travel, uniform (per award schedule)
5. Add progression tracking: apprentice year 1 → 2 → 3 → 4 → qualified rate
6. Store calculation history for Fair Work audit trail

**Delegate to:** Claude Code 2 (~6 hours)

### 1.6: Funding claim eligibility and milestone automation

**Problem:** 35% implemented. Entities exist but no eligibility rules, no milestone auto-generation, no state-specific logic.

**Files:**
- Modify: `crm7/src/lib/funding/admsAdapter.ts` (507 lines of stubs)
- Create: `crm7/src/lib/funding/eligibilityEngine.ts`
- Create: `crm7/src/lib/funding/milestoneGenerator.ts`

**Steps:**
1. Define eligibility rules as data (not code):
   ```ts
   const ELIGIBILITY_RULES: EligibilityRule[] = [
     { program: 'boosting_apprenticeships', conditions: { year: 1, fullTime: true, qualLevel: ['III', 'IV'] } },
     { program: 'priority_list', conditions: { occupation: PRIORITY_OCCUPATIONS, state: 'any' } },
     ...
   ];
   ```
2. Implement milestone generator: Given apprentice + funding source → generate milestones at 0%, 25%, 50%, 75%, 100%
3. Wire ADMS adapter HTTP calls (replace TODO stubs with actual fetch + error handling)
4. Add claim submission workflow UI

**Delegate to:** Claude Code 2 (~8 hours)

---

## Phase 2: Core UX — Day-to-Day Operations (Weeks 5-8)

### 2.1: RBAC enforcement across all pages

**Problem:** 174 pages accessible to all users. No permission checks.

**Files:**
- Reference: CRM7-Standalone donor (`/mnt/.../CRM7-Standalone/src/lib/permissions.ts`)
- Reference: CRM7-Standalone donor (`/mnt/.../CRM7-Standalone/src/hooks/use-permissions.ts`)
- Create: `crm7/src/hooks/usePermissions.ts` (harvest from donor)
- Create: `crm7/src/components/common/PermissionGate.tsx`
- Modify: All page components (wrap with PermissionGate)

**Steps:**
1. Harvest from donor: `Permission` enum (40+ constants), `rolePermissions` map, `checkPermission`/`checkAny`/`checkAll` functions
2. Convert to TypeScript strict (donor may have loose types)
3. Create `usePermissions()` hook: `const { can, canAny, canAll } = usePermissions()`
4. Create `<PermissionGate permission="manage_apprentices">` wrapper component
5. Apply to all pages — start with financial pages (highest risk), then compliance, then operational

**Delegate to:** Cascade (batch file edits, ~2 hours) + Claude Code 2 (hook + gate component, ~2 hours)

### 2.2: Host employer portal

**Problem:** 10% implemented. Hosts can't approve timesheets, view apprentices, or request placements.

**Files:**
- Create: `crm7/src/pages/portal/host/dashboard.tsx`
- Create: `crm7/src/pages/portal/host/apprentices.tsx`
- Create: `crm7/src/pages/portal/host/timesheets.tsx`
- Create: `crm7/src/pages/portal/host/placements.tsx`

**Steps:**
1. Host dashboard: Active apprentices count, pending timesheets, next site visit, compliance status
2. Apprentice roster: List of apprentices placed at this host with progress bars
3. Timesheet approvals: View submitted timesheets, approve/reject with comments
4. New placement request: Form to request additional apprentice(s), specify trade area, start date, hours

**Delegate to:** Claude Code 2 (~8 hours)

### 2.3: Apprentice self-service portal

**Problem:** 10% implemented. Apprentices can't view progress, submit timesheets, or access documents.

**Files:**
- Create: `crm7/src/pages/portal/apprentice/dashboard.tsx`
- Create: `crm7/src/pages/portal/apprentice/training.tsx`
- Create: `crm7/src/pages/portal/apprentice/timesheets.tsx`
- Create: `crm7/src/pages/portal/apprentice/documents.tsx`

**Steps:**
1. Dashboard: Qualification progress, next assessment, field officer contact, WHS alerts
2. Training plan view: Units of competency with status badges, RPL indicators
3. Timesheet submission: Weekly hours entry, overtime flagging, submission to host for approval
4. Documents: Training contract, training plan, certificates, payslips (read-only)

**Delegate to:** Claude Code 2 (~6 hours)

### 2.4: Training plan management UI

**Problem:** 35% implemented. No unit-to-plan mapping, no progress tracking by unit, no RTO reporting.

**Files:**
- Modify: `crm7/src/pages/training/` module
- Create: `crm7/src/pages/training/plans/[id].tsx` (plan detail with unit mapping)
- Create: `crm7/src/components/training/UnitMapper.tsx`

**Steps:**
1. Training plan detail page: Show apprentice, qualification, RTO, dates, status
2. Unit mapper component: Drag/drop or checkbox to assign units to plan
3. Progress tracker: For each unit, show status (not started → in progress → competent), assessment dates
4. RTO progress request: Button to generate progress report request email/notification to RTO

**Delegate to:** Claude Code 2 (~6 hours)

### 2.5: Consolidate charge rate calculator

**Problem:** `crm7/src/pages/charge-rates/create.tsx` (1,295 lines) duplicates R80.3 logic. `@bsuite/charge-calc` package exists but isn't used.

**Files:**
- Delete most of: `crm7/src/pages/charge-rates/create.tsx`
- Import from: `packages/charge-calc/`
- Reference: R80.3 `charge-calculator.jsx` (gold standard)

**Steps:**
1. Audit `@bsuite/charge-calc` package — what's exported, what's missing
2. Replace inline calculations in charge-rates page with `@bsuite/charge-calc` imports
3. Keep CRM7-specific form UI, replace calculation engine only
4. Verify results match R80.3 output for same inputs

**Delegate to:** Claude Code 2 (~4 hours)

---

## Phase 3: Financial Pipeline (Weeks 9-12)

### 3.1: Invoice generation from approved timesheets

**Steps:**
1. Create Invoice entity (line items, tax, total, due date, status)
2. Auto-generate: When timesheet status → 'processed', create invoice line item
3. GST calculation (10% for Australian entities)
4. Invoice numbering: `INV-{YEAR}-{SEQUENTIAL}`
5. PDF export via edge function

**Delegate to:** Claude Code 2 (~8 hours)

### 3.2: Payment tracking and aging

**Steps:**
1. Create Payment entity (invoice_id, amount, payment_date, method, reference)
2. Aging report: 0-30, 31-60, 61-90, 90+ days outstanding
3. Payment reconciliation dashboard

**Delegate to:** Cascade (~4 hours)

### 3.3: Complete Xero payroll integration

**Problem:** 5 major TODO blocks in `crm7/src/lib/payroll/xeroAdapter.ts`.

**Steps:**
1. Complete employee sync to Supabase workers table (lines 305-325)
2. Implement earnings rate field mapping (lines 380-391)
3. Complete payslip update logic (line 405)
4. Test STP (Single Touch Payroll) reporting workflow
5. Add Xero sync status dashboard

**Delegate to:** Claude Code 2 (~6 hours)

---

## Phase 4: External Integrations (Weeks 13-16)

### 4.1: training.gov.au API integration

**Steps:**
1. Wire `tga-search` edge function to real REST API (`https://training.gov.au/api`)
2. Search qualifications by name/code
3. Verify RTO registration status
4. Cache results in `tga_cache` table (24-hour TTL)
5. Add autocomplete to qualification search fields

**Reference:** Donor project SOAP credentials are sandbox-only — use REST API for production.

**Delegate to:** Claude Code 2 (~4 hours)

### 4.2: ADMS HTTP implementation

**Steps:**
1. Implement OAuth2 token exchange in `admsAdapter.ts` (line 491)
2. Wire `registerApprenticeship()` HTTP POST (line 231)
3. Wire `submitClaim()` HTTP POST (line 328)
4. Wire `getClaimStatus()` HTTP GET (line 373)
5. Wire `getPaymentHistory()` HTTP GET (line 402)
6. Add retry logic (exponential backoff, 3 retries)
7. Add request/response logging for compliance audit trail

**Delegate to:** Claude Code 2 (~6 hours)

### 4.3: GTO Standards compliance evidence system

**Note:** AVETMISS is for RTO compliance, NOT GTO compliance. GTOs follow the National Standards for Group Training Organisations (2017). See `GTO-Standards.md`.

**GTO Standards structure:**
1. **Standard 1: Recruitment, Employment and Induction** (1.1–1.4)
   - Pre-contract information provision to apprentice/trainee
   - Induction program with sign-off
   - Host employer assessment and agreement
   - Training Plan development participation with RTO
2. **Standard 2: Monitoring and Supporting to Completion** (2.1–2.4+)
   - Support and mentoring services
   - Training Plan progress monitoring + workplace rotations
   - Economic downturn/stand-down management
   - Host employer coordination
3. **Standard 3: Sustainable Business, Governance and Administration**

**Steps:**
1. Create GTO compliance evidence schema: `GtoComplianceEvidence` entity
   - `standard_ref` (e.g., '1.1', '2.3'), `apprentice_id` or `host_employer_id`
   - `evidence_type` (document, sign-off, site_visit_record, feedback_analysis, review_record)
   - `evidence_description`, `document_url`, `recorded_by`, `recorded_at`
   - `audit_ready`: boolean (reviewed and complete)
2. Create compliance dashboard mapping each GTO Standard to evidence status
3. Auto-link existing data as evidence: site visits → Standard 2.2, host agreements → Standard 1.3, training plans → Standard 1.4, induction records → Standard 1.2
4. Generate audit preparation report: gaps per standard, evidence count, last evidence date

**Delegate to:** Claude Code 2 (~8 hours)

### 4.4: State Training Authority (STA) + AASS + ADMS integration — DTWD (WA) first

**Problem:** 0% implemented. Three external bodies are involved in apprentice lifecycle:

1. **AASS (formerly AASN)** — Australian Apprenticeship Support Services. These are the organisations that officially sign up and register apprentices on behalf of the federal government. GTOs do NOT directly register apprentices; AASS does.
2. **STAs (State Training Authorities)** — Register GTOs, audit GTO compliance with National Standards, register training contracts, AND are a federal funding source through ADMS.
3. **australianapprenticeships.gov.au** — Federal portal. Funding source through ADMS system.

**Apprentice registration flow:**
```
GTO recruits apprentice → AASS officially registers apprentice (federal)
                        → STA registers training contract (state)
                        → RTO delivers off-the-job training
                        → STA provides funding through ADMS
```

**Key STA relationship:** GTOs must comply with National Standards for GTOs (2017) to be registered. STAs audit compliance, handle complaints, and determine transition arrangements. See `GTO-Standards.md` for full context.

**State Training Authorities by jurisdiction:**

| State | STA | System | Priority |
|-------|-----|--------|----------|
| WA | DTWD (Dept of Training and Workforce Development) | Apprenticeship Office / WAAMS | P1 — Primary |
| NSW | Training Services NSW | Apprenticeship/Traineeship system | P2 |
| VIC | VRQA / Skills Victoria | Victorian Registration | P2 |
| QLD | DESBT (Dept of Employment, Small Business and Training) | CSQ system | P2 |
| SA | Dept for Industry, Innovation and Science | SkillsIQ | P3 |
| TAS | Skills Tasmania | TAS registration | P3 |
| ACT | ACT Skills Canberra | ACT system | P3 |
| NT | Dept of Industry, Tourism and Trade | NT system | P3 |

**Note:** STAs are government regulatory bodies that register and audit GTOs. They are NOT training providers. Training providers (RTOs) deliver the off-the-job training component. The GTO selects the RTO and participates in Training Plan development (Standard 1.4).

**Steps:**

**A. AASS integration (federal apprentice registration):**
1. Create `crm7/src/lib/integrations/aass/aassAdapter.ts`
2. Define integration points:
   - New apprentice sign-up request → AASS (they do the official registration)
   - Registration confirmation receipt
   - Apprentice status updates (active, suspended, cancelled, completed)
3. Create `AassRegistration` entity: `apprentice_id`, `aass_provider`, `registration_date`, `registration_number`, `status`
4. Add AASS registration status to apprentice profile

**B. DTWD / STA integration (state training contract + funding):**
1. Research DTWD Apprenticeship Office API/portal (<https://www.dtwd.wa.gov.au/apprenticeship-office>)
2. Define integration points:
   - Training contract registration (new apprentice → DTWD)
   - Contract variation submission (hours change, host change, suspension)
   - Completion/cancellation notification
   - Funding claims through ADMS (STA is the funding channel)
   - Progress reporting (quarterly)
3. Create `crm7/src/lib/integrations/stateAuthorities/dtwdAdapter.ts`
4. Create `crm7/src/lib/integrations/stateAuthorities/types.ts` (shared interface for all states)
5. Create `crm7/src/lib/integrations/stateAuthorities/index.ts` (factory pattern — state selector)
6. Add state authority status to apprentice profile page
7. Add GovtIntegrationLog entries for all submissions

**C. ADMS integration (federal funding through STAs):**
- Wire existing `admsAdapter.ts` (507 lines of stubs) to actual HTTP calls
- ADMS submissions go through STAs — STA is the funding intermediary
- See Task 4.2 for ADMS HTTP implementation details

**Note:** DTWD and AASS may use manual portal submission rather than API. If so, create:
- Export function to generate submission-format documents
- Checklist of manual steps with auto-populated form fields
- Status tracking (submitted, acknowledged, registered, rejected)

**Delegate to:** Claude Code 2 (~8 hours for AASS + DTWD, ~4 hours per additional state)

### 4.5: USI Registry validation

**Steps:**
1. Create USI validation service (verify format: 10-char alphanumeric)
2. If USI Registry API available: wire lookup endpoint
3. Block training plan enrollment if USI invalid/missing
4. Add verification badge to apprentice profile

**Delegate to:** Cascade (~2 hours)

---

## Phase 5: DRY & Naming Cleanup (Concurrent with Above)

### 5.1: Consolidate duplicate stores

Investigate `contractStore` vs `hostAgreementStore` — both query `host_agreements` but with different filter logic. If intentionally different UIs, rename to clarify. If duplicates, consolidate.

**Delegate to:** Cascade (~1 hour)

### 5.2: Normalize FK naming

Audit DB schema for `host_employer_id` vs `host_org_id` vs `employer_id`. Create expand → migrate → contract migration. Update TypeScript types after DB normalized.

**Delegate to:** Claude Code 2 (~3 hours)

### 5.3: Extract shared StatusBadge component

Audit 6+ inline status badge implementations. Create `crm7/src/components/common/StatusBadge.tsx`. Replace all inline implementations.

**Delegate to:** Cascade (~1 hour)

### 5.4: Migrate remaining direct Supabase pages to stores

After page inventory (Task 0.3), prioritize by data criticality. Add ESLint rule to forbid new `supabase.from()` in pages.

**Delegate to:** Cascade (batch, ~4 hours)

### 5.5: Extract Australian validators

Harvest ABN, TFN, phone, postcode validators from CRM7-Standalone donor. Place in `crm7/src/lib/validators/au.ts`. Add tests.

**Delegate to:** Cascade (~1 hour)

---

## Delegation Summary

### Cascade (Batch file operations, low-risk, high-volume)

| Task | Est. Time | Description |
|------|-----------|-------------|
| PR-2 | 2 min | BSU cookie bug fix |
| 0.1 | 30 min | Consolidate 356 .md files |
| 0.2 | 20 min | Index CRM13 donor docs |
| 2.1 (partial) | 2 hours | Wrap pages with PermissionGate |
| 3.2 | 4 hours | Payment tracking entity + UI |
| 4.4 | 2 hours | USI format validation |
| 5.1 | 1 hour | Duplicate store investigation |
| 5.3 | 1 hour | StatusBadge extraction |
| 5.4 | 4 hours | Migrate pages to stores |
| 5.5 | 1 hour | AU validators from donor |
| **Total** | **~15 hours** | |

### Claude Code 2 (Complex logic, API integration, schema design)

| Task | Est. Time | Description |
|------|-----------|-------------|
| PR-1 | 5 min | Merge development → main |
| 0.3 | 15 min | Page inventory document |
| 0.4 | 20 min | RBAC matrix document |
| 1.1 | 4 hours | Fair Work API — remove fallback, wire real API |
| 1.2 | 6 hours | BOOT assessment schema + validation |
| 1.3 | 4 hours | Compliance alert automation |
| 1.4 | 6 hours | Placement lifecycle state machine |
| 1.5 | 6 hours | Award interpretation engine |
| 1.6 | 8 hours | Funding claim eligibility + ADMS wiring |
| 2.1 (partial) | 2 hours | usePermissions hook + PermissionGate component |
| 2.2 | 8 hours | Host employer portal |
| 2.3 | 6 hours | Apprentice portal |
| 2.4 | 6 hours | Training plan management UI |
| 2.5 | 4 hours | Consolidate charge-calc |
| 3.1 | 8 hours | Invoice generation |
| 3.3 | 6 hours | Xero payroll completion |
| 4.1 | 4 hours | training.gov.au integration |
| 4.2 | 6 hours | ADMS HTTP implementation |
| 4.3 | 8 hours | GTO Standards compliance evidence system |
| 4.4 | 8 hours | AASS + DTWD (WA STA) + ADMS integration |
| 5.2 | 3 hours | FK naming normalization |
| **Total** | **~97 hours** | |

### Combined Total: ~112 hours

---

## Deferred Items (Post-Launch)

| Item | Reason |
|------|--------|
| 356 `any` type violations | Needs ESLint rule re-enable + batch fix |
| App.tsx 662-line routing split | Architectural — feature module extraction |
| pnpm workspaces migration | Large blast radius |
| MYOB/QuickBooks payroll adapters | Stubs, implement on customer demand |
| State training authority integrations (beyond WA ADMS) | Per-state, add as needed |
| Training provider (RTO) portal | Launch without, manual coordination |
| Mobile app offline support | Post-launch enhancement |
| AI-assisted EA drafting | BOOT enhancement, post-core |

---

## Quality Gates

Every task must pass before merge:
1. `npx tsc --noEmit` — zero type errors
2. New migrations: tested in local Supabase
3. New stores: at least one unit test
4. New pages: PermissionGate applied
5. API integrations: error handling + retry logic + fallback
6. Donor harvesting: converted to TypeScript strict, no leftover `any`
