# CRM7 Feature Parity Rebuild — Design Document

**Date:** 2026-02-28
**Version:** 1.00W (Working)
**Status:** Approved
**Scope:** CRM7 gap analysis vs CRM13 specification + donor extraction from crm8/crm13-dev/R80.3

---

## Executive Summary

CRM7 has 171 routes, 241 components, and 37 Zustand stores — but depth varies wildly. Many pages are UI shells with fabricated stats. The CRM13 documentation describes a system 2-3x deeper in business logic. This plan closes ~25 major feature gaps through 4 parallel workstreams, aggressively mining code from donor CRM versions while converting all types to CRM7's `BaseEntity` pattern.

**Key decisions:**
- Feature parity with depth (no more stubs with fake data)
- One-shot data entry model preserved throughout
- R80.3 `@bsuite/charge-calc` as calculation source of truth
- Role-gated portal views (single SPA, lazy-loaded per role)
- Aggressive code mining from donors with strict type conversion
- Host employers ARE clients (`is_host_employer: true` flag)
- Contacts are polymorphic (linked to any entity type)

---

## Architecture

### Type Conversion Strategy

All donor types map to CRM7's `BaseEntity` constraint:

```typescript
interface BaseEntity {
  id: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, unknown>;
}
```

**Conversion rules:**
1. All `id` fields → `string` (UUID), never `number`
2. All entities get `tenant_id?: string` for multi-tenancy
3. crm13 Prisma `DateTime` → `string` (ISO 8601)
4. crm13 enums → TypeScript union types (CRM7 pattern)
5. crm8 Express service logic → Zustand store actions + Supabase Edge Functions
6. New stores created via `createEntityStore<T>()` factory
7. Zod schemas created alongside every new entity type

### One-Shot Data Entry Model

Data enters once, in one place, and propagates:
- Quote → Contract conversion (not re-entry)
- Contract → Invoice generation (automatic)
- Timesheet approval → Payroll processing (workflow)
- Compliance alert → Corrective action (linked)

### Calculation Source of Truth

R80.3's `@bsuite/charge-calc` package via `calcBridge.ts` pattern:
- CRM7 charge-rates page uses same bridge (eliminates 1,326-line duplication)
- R80.3 owns the engine; CRM7 consumes it
- Three billing models: Standard, ALEX48, W52
- Funding-aware: first_year, evenly_over_term, weighted_over_term

### Entity Relationships

- **Client ↔ Host Employer:** `Client.is_host_employer: boolean`. Host employer views filter on this flag.
- **Contact (polymorphic):** `related_entity_type` + `related_entity_id` links to apprentice, host, client, training provider, or industry body.
- **Quote → Contract → Invoice:** Lifecycle conversion chain (one-shot, not re-entry).

### New Entities Required

| Entity | Purpose | Store |
|--------|---------|-------|
| `Quote` | Sales quote from opportunity | `quoteStore.ts` |
| `QuoteLineItem` | Line items within a quote | (nested in quoteStore) |
| `Communication` | Email/SMS record | `communicationStore.ts` |
| `CommunicationTemplate` | Email/SMS template with variables | `communicationTemplateStore.ts` |
| `Notification` | System notification | `notificationStore.ts` |
| `LeaveRequest` | Leave request record | `leaveStore.ts` |
| `LeaveBalance` | Leave balance per type | (nested in leaveStore) |
| `ComplianceAlert` | Automated compliance alert | `complianceAlertStore.ts` |
| `AuditEvent` | CRUD audit trail event | `auditStore.ts` |
| `PerformanceReview` | Scheduled performance review | `performanceReviewStore.ts` |
| `ReviewGoal` | Goal within a review | (nested in performanceReviewStore) |
| `ReturnToWorkPlan` | WHS return-to-work plan | `rtwStore.ts` |
| `Report` | Saved/scheduled report | `reportStore.ts` |
| `ReportConfiguration` | Custom report builder config | (nested in reportStore) |
| `SkillProfile` | Worker skill/availability | `skillStore.ts` |
| `DocumentTemplate` | Document template with versioning | `documentTemplateStore.ts` |
| `IntegrationConfig` | External system integration config | `integrationStore.ts` |
| `CustomFieldDefinition` | Tenant-defined custom field | `customFieldStore.ts` |
| `TrainingProvider` | RTO entity | `trainingProviderStore.ts` |
| `TrainingContract` | Apprenticeship training contract | `trainingContractStore.ts` |

---

## Donor Sources

### R80.3 (Calculation Gold Standard)
- `packages/charge-calc/src/calculate.ts` — shared calculation engine
- `R80.3/src/utils/calcBridge.ts` — bridge pattern for domain→shared conversion
- `R80.3/src/stores/apprenticeStore.ts` — multi-apprentice management
- `R80.3/src/services/awardRatesService.ts` — award rate management
- `R80.3/src/services/fairworkApi.ts` — Fair Work fallback data
- `R80.3/src/services/wageSourceManager.ts` — spreadsheet wage import

### crm8 (Architecture & Business Logic)
- `/mnt/.../Compressed_Dev/crm8/rates-payroll/src/ratesCalculation.ts` — 486-line calc engine (3 models + flexible)
- `/mnt/.../crm8/docs/FEATURES.md` — 591-line feature matrix (8 capabilities)
- `/mnt/.../crm8/docs/rates/README.md` — rate template/forecasting/analytics design
- `/mnt/.../crm8/docs/payroll/WAGE_CALCULATION.md` — pay calculation architecture
- `/mnt/.../crm8/admin-portal/` — admin layout, dashboard components, chart types
- `/mnt/.../crm8/client-portal/` — client portal routes and structure
- `/mnt/.../crm8/central-shell/src/types/` — shared types (ApiResponse, Portal, User)

### crm13-dev (Modern Patterns & Schemas)
- `/mnt/.../crm13-development/prisma/schema.prisma` — 11 core + 8 GTO models
- `/mnt/.../crm13-development/src/schemas/employee.ts` — 28 nested Zod schemas
- `/mnt/.../crm13-development/src/schemas/client.ts` — 20+ nested Zod schemas
- `/mnt/.../crm13-development/src/schemas/gto.ts` — 9 GTO Zod schemas
- `/mnt/.../crm13-development/src/lib/services/calculationEngine.ts` — allowance/penalty composition
- `/mnt/.../crm13-development/src/lib/services/rates.ts` — singleton caching, error handling
- `/mnt/.../crm13-development/src/api/compliance.ts` — compliance status calculation

### CRM13 Documentation
- `/home/braden/Desktop/Dev/bsuite/docs/crm13-docs/` — 90+ files covering architecture, requirements, progress

---

## Stream A: Financial Pipeline

**Independence:** Fully independent. No blockers from other streams.
**Donor primary:** R80.3 charge-calc bridge, crm8 ratesCalculation.ts, crm13 financial schemas.

### A1: Quote Entity & Lifecycle
- Create `Quote` + `QuoteLineItem` types extending BaseEntity
- Create `quoteStore.ts` via createEntityStore factory
- Replace 80-line stub with full CRUD page (list, create, detail, edit)
- Implement Quote→Contract one-shot conversion
- PDF export for quote documents
- Status workflow: draft → sent → accepted → converted → expired
- **Depth:** Real data, real CRUD, real lifecycle

### A2: Wire Charge-Rates to @bsuite/charge-calc
- Replace CRM7's 1,326-line `charge-rates/create.tsx` with calcBridge pattern
- Import `calculateFromR80()` or equivalent from shared package
- Maintain UI but delegate all calculation to shared engine
- Support all 3 billing models (Standard, ALEX48, W52)
- **Depth:** Bridge wiring only, logic lives in shared package

### A3: Host Billing Engine
- Charge rate application to approved timesheets
- Invoice generation from timesheet batches (configurable: per-host, per-period)
- Payment tracking with status (sent, viewed, partial, paid, overdue)
- Credit management (credit notes, adjustments)
- Consolidated vs itemized billing options
- Purchase order reference tracking
- **Depth:** Full financial workflow

### A4: Timesheet Approval Workflow
- Host employer submits timesheet → supervisor reviews → payroll approves
- Overtime hours require separate approval gate
- Training time auto-deducted from billable hours (per billing model)
- Dispute period (configurable, default 7 days)
- Status: draft → submitted → approved → disputed → processed
- **Donor:** crm13 employee.ts timesheet + leave schemas

### A5: Payroll Integration Framework
- Adapter pattern: `PayrollAdapter` interface with Xero/MYOB/QuickBooks implementations
- Award interpretation using R80.3 Fair Work data + awardRatesService
- STP (Single Touch Payroll) reporting structure
- Pay rate progression tracking (year 1→4 auto-progression)
- Superannuation calculation and reporting
- Initial implementation: Xero adapter (primary), others as typed stubs
- **Depth:** Xero full, others adapter interface only

### A6: Government Funding Claims
- Wire existing claims pages to real ADMS submission workflow
- Eligibility engine from crm13 GTO schemas (commencement, completion, milestone claims)
- Payment reconciliation tracking
- Audit documentation generation
- Claim types: employer_incentive, apprentice_payment, wage_subsidy, tool_allowance, completion_bonus
- Use R80.3's funding config (3 application methods)
- **Depth:** Full submission workflow

### A7: Leave Management
- Leave request CRUD (create, approve, reject, cancel)
- Leave balance tracking per type: annual, personal, long service, parental, study
- Accrual calculations per modern award
- Leave calendar view
- Medical certificate attachment for personal leave
- Award-aware leave loading (17.5%)
- **Donor:** crm13 employee.ts leave balance + leave request schemas

### A8: Banking Integration
- BECS (Bulk Electronic Clearing System) payment file generation
- Bank reconciliation structure (match payments to invoices)
- Account validation (BSB + account number format)
- **Depth:** Schema + file export utility

### DB Migrations (Stream A)
```sql
-- New tables
quotes, quote_line_items, leave_requests, leave_balances,
payment_files, payroll_runs, payroll_run_items,
payroll_adapter_configs, bank_reconciliation_records
```

---

## Stream B: Compliance & Legal

**Independence:** Fully independent. No blockers from other streams.
**Donor primary:** crm13 Prisma models, crm13 Zod schemas (compliance, training contract, safety).

### B1: Compliance Automation Engine
- Automated alert generation for:
  - Expiring documents (insurance, licenses, certifications)
  - Due WHS inspections (per host employer schedule)
  - Training deadline approaching (unit completion dates)
  - License renewal required (trade licenses, blue cards)
  - Contract expiration (host agreements, training contracts)
- ComplianceAlert entity with priority levels (critical, high, medium, low)
- Alert → notification trigger (feeds Stream C notification engine)
- Dashboard widget showing compliance status per host/apprentice
- **Donor:** crm13 compliance.ts status calculation, GTO Standards

### B2: Training Contract Management
- Full training contract lifecycle:
  - Registration with authority (registration number tracking)
  - Probation period tracking (configurable, default 12 weeks)
  - Contract variations: extension, qualification change, employer change, part-time adjustment
  - Completion workflow with authority notification
- AASN provider integration tracking
- Training plan link (contract → plan → units)
- Status: registered → active → on_probation → varied → completed → cancelled
- **Donor:** crm13 TrainingContract Prisma model + Zod schemas

### B3: Audit Trail System
- Every CRUD action logged: who, what, when, old_value, new_value, entity_type, entity_id
- Queryable audit log page (replacing settings stub)
- Filter by: user, entity type, action type, date range
- Export capability for compliance audits
- Supabase trigger-based implementation (database-level, not app-level)
- **Depth:** Full system with DB triggers

### B4: Performance Reviews
- Scheduled reviews: probation, quarterly, annual, performance improvement plan, exit
- Template system with form_structure (JSONB)
- Ratings dictionary per review criteria
- Goals with target dates and progress tracking
- Corrective action tracking when performance below threshold
- Review→next action workflow
- **Donor:** crm13 employee.ts performance review schemas

### B5: Return-to-Work Plans
- WHS incident → RTW plan creation
- Graduated return schedule (modified duties, reduced hours)
- Medical clearance tracking with dates
- Functional assessment records
- Treating practitioner communication log
- Status: created → medical_review → graduated_return → full_duties → closed
- **Depth:** Full workflow

### B6: Missing Apprentice Data Model Fields
Add to Apprentice entity and DB:
- `field_officer_id` (FK to field_officers)
- `training_provider_id` (FK to training_providers)
- `trade` (string)
- `training_days_per_week` (number)
- `training_contract_number` (string)
- `probation_end_date` (string, ISO date)
- `mentor_id` (FK to mentors)

### B7: Missing Database Tables
Create 7 tables identified in gap analysis:
- `training_providers` — RTO entities
- `training_contracts` — apprenticeship contracts with lifecycle
- `field_officer_assignments` — officer ↔ apprentice/host links
- `site_visits` — field visit records with follow-up
- `support_contacts` — mentor/support officer interaction logs
- `workplace_inspections` — WHS audit records with safety ratings
- `reimbursements` — expense reimbursement tracking

### B8: Competency Tracking Depth
- Wire CompetencyAssessment with:
  - RPL (Recognition of Prior Learning) grants
  - Evidence URLs (document attachments)
  - Attempt counts per unit
  - Assessor assignment
- TrainingPlanReview with:
  - Progress ratings (on_track, behind, ahead)
  - Employer feedback
  - Apprentice feedback
  - Follow-up requirements
- **Donor:** crm13 Prisma CompetencyAssessment + TrainingPlanReview models

### DB Migrations (Stream B)
```sql
-- New tables
compliance_alerts, audit_events, performance_reviews, review_goals,
return_to_work_plans, rtw_milestones, training_providers,
training_contracts, contract_variations, field_officer_assignments,
site_visits, support_contacts, workplace_inspections, reimbursements

-- Alter tables
ALTER TABLE apprentices ADD COLUMN field_officer_id UUID REFERENCES field_officers(id);
ALTER TABLE apprentices ADD COLUMN training_provider_id UUID REFERENCES training_providers(id);
ALTER TABLE apprentices ADD COLUMN trade TEXT;
ALTER TABLE apprentices ADD COLUMN training_days_per_week INTEGER;
ALTER TABLE apprentices ADD COLUMN training_contract_number TEXT;
ALTER TABLE apprentices ADD COLUMN probation_end_date DATE;
ALTER TABLE apprentices ADD COLUMN mentor_id UUID REFERENCES mentors(id);
```

---

## Stream C: Communications & Portals

**Independence:** Mostly independent. Portal role-gating depends on existing auth (already in place).
**Donor primary:** crm13 comms documentation, crm8 admin-portal + client-portal layouts.

### C1: Communications System
- Bulk email sending (via existing email Edge Functions or Resend/SendGrid)
- Bulk SMS sending (Twilio adapter)
- Recipient list management (dynamic filters: all apprentices, all hosts in region, etc.)
- Delivery tracking (sent, delivered, bounced, opened, clicked)
- Scheduling (send later with timezone support)
- Communication history per entity (view all comms for an apprentice/host)
- Replace stub hub with full implementation
- **Depth:** Full system

### C2: Email/SMS Templates
- Template CRUD with variable tokens: `{{apprentice.first_name}}`, `{{host.business_name}}`, `{{placement.start_date}}`
- Template categories: onboarding, compliance, billing, general
- Preview with sample data before sending
- Version history (who edited, when, diff)
- HTML email builder (or markdown→HTML)
- **Depth:** Full CRUD with preview

### C3: Notification Engine
- System event → notification generation (configurable triggers)
- Events: placement_created, timesheet_approved, compliance_alert, document_expiring, etc.
- Priority: critical (red), high (orange), medium (yellow), low (blue)
- Read/unread status per user
- Filtering by type, priority, date range
- "Mark all read" and "Clear all" actions
- In-app notification bell with count badge
- Optional email digest (daily/weekly summary)
- **Depth:** Full engine with configurable triggers

### C4: Mail Merge
- Batch document generation from templates
- Recipient list validation before processing
- Variable substitution with fallback values
- PDF output with batch download (zip)
- Merge error logging for review
- **Depth:** Full workflow

### C5: Role-Gated Portal Views
- Extend `<ProtectedRoute>` with role-based filtering
- Role definitions:
  - **GTO Staff (Admin):** Full access, all nav items
  - **Host Employer:** Placements, timesheets, invoices, WHS, site visits
  - **Apprentice:** Training progress, documents, leave requests, timesheets
  - **Training Provider:** Training plans, assessments, unit progress
  - **Finance:** Invoices, payments, funding claims, payroll
  - **View Only:** Dashboard and reports only
- Nav transformation per role (different sidebar items)
- Dashboard transformation per role (different widgets/KPIs)
- Route restriction (404 for unauthorized role paths)
- **Donor:** crm8 admin-portal + client-portal differentiation

### C6: Reports & Custom Builder
- **Operational reports:** Apprentice statistics, host performance, compliance status
- **Compliance reports:** Regulatory submissions, audit documentation, training progress
- **Financial reports:** Revenue by host, funding utilization, payroll summaries
- **Custom report builder:**
  - Entity selection (apprentices, hosts, placements, etc.)
  - Filter configuration (status, date range, region, etc.)
  - Column selection and ordering
  - Grouping and aggregation (count, sum, average)
  - Export: PDF, Excel, CSV
  - Save and schedule (daily/weekly/monthly email)
- **Depth:** Full builder with scheduling

### C7: Insights (AI-Powered)
- Wire Jodie AI tools to analyze entity data
- Surface recommendations:
  - At-risk apprentices (low progress, missed training)
  - Expiring compliance (documents, insurance, licenses)
  - Funding opportunities (eligible but unclaimed)
  - Host performance trends (incident rates, retention)
- Replace 40-line stub with real AI-driven page
- **Depth:** Real AI analysis using existing Jodie infrastructure

### C8: Register 23 Missing Routes
- Wire all unregistered GTO pages into App.tsx router
- Ensure each page has correct lazy loading and route preloading
- No new UI — just routing fixes
- **Depth:** Routing only

### DB Migrations (Stream C)
```sql
-- New tables
communications, communication_recipients, communication_templates,
template_variables, notifications, notification_preferences,
notification_triggers, reports, report_configurations, report_schedules
```

---

## Stream D: Data & Integration

**Independence:** Fully independent. No blockers from other streams.
**Donor primary:** crm13 document specs, crm8 integration-services docs, crm13 schemas.

### D1: Document Management Depth
- Template system with categories: training_contract, host_agreement, induction, compliance, financial
- Document versioning (track changes, view history)
- Expiry tracking with automated alerts (feeds Stream B compliance engine)
- Access control per document (role-based visibility)
- Upload with metadata (entity link, category, expiry date)
- Folder/category organization
- **Depth:** Full system replacing basic page

### D2: Data Import/Export
- **Import:** CSV/Excel upload → field mapping UI → validation preview → import execution
  - Supported entities: contacts, clients, apprentices, hosts, qualifications
  - Duplicate detection (email match, ABN match)
  - Error reporting with row-level detail
  - Rollback capability (undo import)
- **Export:** Entity selection → filter → format (CSV, Excel, PDF) → download
  - Bulk export with progress indicator
  - Scheduled exports (daily/weekly)
- Replace settings stub with functional implementation
- **Donor:** crm8 admin bulk operations pattern

### D3: State Government Integrations
- Adapter pattern: `GovernmentSystemAdapter` interface
- **ADMS (Federal):** Full implementation — apprenticeship registration, incentive claims, progress reporting, status updates
- **WAAMS (WA):** Typed stub with adapter interface
- **NSW Training Services:** Typed stub with adapter interface
- **Skills Victoria:** Typed stub with adapter interface
- **QLD DELTA:** Typed stub with adapter interface
- **SA Training Accord:** Typed stub with adapter interface
- Integration config per tenant (which systems to connect)
- Integration log for audit trail
- **Depth:** ADMS full, others adapter stubs ready for implementation

### D4: Digital Signatures
- DocuSign (or equivalent) API integration
- Signature request workflow: create envelope → send → track → complete
- Applicable documents: training contracts, host agreements, safety declarations
- Signature status tracking per document
- Webhook handler for completion notifications
- **Depth:** Integration + status tracking

### D5: Custom Fields System
- `custom_field_definitions` table: field_name, field_type (text, number, date, select, multi_select, boolean), entity_type, options (for select), is_required, display_order
- `custom_field_values` table: definition_id, entity_id, entity_type, value (JSONB)
- Admin UI: create/edit/reorder custom fields per entity type
- Entity forms: dynamically render custom fields
- Wire to `createEntityStore` (custom_fields already on BaseEntity)
- **Depth:** Full system with dynamic rendering

### D6: Skills Matrix
- Labour hire worker skills tracking
- Proficiency levels: novice, basic, intermediate, advanced, expert
- Certification tracking per skill (cert number, expiry)
- Availability patterns (days, shifts, locations)
- Preferred work locations and maximum weekly hours
- Skills matching for placement (worker skills vs vacancy requirements)
- **Donor:** crm13 GTO schemas (SkillAssessment, CompetencyUnit)

### D7: RTO/Training Plan Integration
- Auto plan creation from apprentice profile (qualification → units)
- Unit scheduling with RTO calendar alignment
- Assessment scheduling and result recording
- Credit transfer management (prior learning → exemptions)
- AVETMISS reporting data structure
- Training plan progress visualization
- **Donor:** crm13 training management specs

### D8: Wire Mock Data Pages to Supabase
Replace hardcoded/demo data with real Supabase queries on:
- Dashboard stats (currently uses demo data with localStorage toggle)
- Financial hub (stat cards with placeholder numbers)
- Payroll hub (stub page)
- Reports hub (stub page)
- Insights (fake stats: "47 key insights")
- Communications hub (fake stats)
- Host monitoring (stub)
- Host reports (stub)
- **Depth:** Data wiring only (UI stays, data becomes real)

### DB Migrations (Stream D)
```sql
-- New tables
document_templates, document_versions, document_access_rules,
import_jobs, import_mappings, import_errors,
integration_configs, integration_logs, integration_credentials,
signature_requests, signature_events,
custom_field_definitions, custom_field_values,
skill_profiles, skill_certifications, skill_availability,
training_plans_enhanced, training_plan_units, training_plan_schedules
```

---

## GTO Standards Compliance Checklist

Cross-referencing against GTO National Standards 2017 and functional requirements:

| GTO Standard | Stream | Task(s) |
|-------------|--------|---------|
| Apprentice lifecycle management | B | B2, B6, B8 |
| Host employer compliance (insurance, WHS) | B | B1, B7 |
| Training contract registration & tracking | B | B2 |
| Competency unit tracking & assessment | B | B8 |
| Workplace inspections & safety | B | B7 |
| Financial management (timesheets, payroll, billing) | A | A3, A4, A5 |
| Government funding claims | A | A6 |
| Document management & audit trails | B, D | B3, D1 |
| Communication & notifications | C | C1, C2, C3 |
| Reporting & compliance documentation | C | C6 |
| Multi-role access (staff, host, apprentice, RTO) | C | C5 |
| Fair Work award compliance | A | A2, A5 |
| Leave management per award | A | A7 |
| AVETMISS reporting structure | D | D7 |
| State government system integration | D | D3 |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Donor code incompatible with CRM7 patterns | High | Type conversion rules enforced; review before merge |
| Scope creep within streams | Medium | Each task has defined "Depth" level; no gold-plating |
| Database migration conflicts between streams | Medium | Each stream owns its own tables; no overlapping ALTER |
| R80.3 charge-calc bridge changes | Low | Bridge pattern is stable; shared package versioned |
| One-shot model breaks in lifecycle chains | High | Integration tests for Quote→Contract→Invoice chain |
| Role-gated views miss edge cases | Medium | Per-role test accounts; manual QA per role |

---

## Success Criteria

1. **Zero stubs with fake data** — every page shows real Supabase data or honest "No data yet" state
2. **All 25 feature gaps closed** — feature parity with CRM13 specification
3. **One-shot data entry** — data enters once and propagates through lifecycle chains
4. **R80.3 calculation bridge** — no duplicated calculation logic in CRM7
5. **Type safety** — every new entity has BaseEntity extension + Zod schema
6. **GTO Standards compliance** — all checklist items above addressed
7. **Test coverage** — minimum 70% on critical paths (calculations, compliance, workflows)
