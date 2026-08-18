<!-- G5-VERDICT-BANNER -->
> **VERDICT (REFERENCE-ONLY) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # 📚 VERDICT: REFERENCE-ONLY — competitor analysis
>
> Feature-parity mapping of **Workforce One** (Code House, Adelaide), the incumbent GTO platform,
> against BSuite, drawn from public product pages and vendor PDFs.
>
> **No implementation verdict applies** — this is competitor research, not a BSuite requirement.
> Its gap list feeds prioritisation but is not itself a work queue, and several gaps it names have
> since been closed under their own issues (for example the Codehouse integration parity set,
> `bsuite#577`, CLOSED).
>
> **Marker defect:** `W` (Working) on reference material implies pending work. Its companion
> extraction `wf1-ots-parity-implementation-229a69.md` is undated and out of this backlog's scope.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

# Workforce One vs BSuite — Feature Parity Analysis

**Date:** 2026-03-06
**Status:** Working (v1.00W)
**Author:** Windsurf Cascade (deep-dive analysis)
**Sources:** Workforce One product tour, OTS Timesheet Process PDF (WF1_OTS_002), OTS Employee Guide PDF (WF1_OTS_004), Code House FAQ articles, workforceone.com.au product pages, Tavily research report

---

## Executive Summary

Workforce One (Code House, Adelaide) is the incumbent GTO/labour-hire management platform used by most Australian GTOs. BSuite (CRM7 + R80.3 + Conduit + BSU) is being built as a modern replacement. This document maps every publicly-documented WF1 module, feature, and field to its BSuite equivalent and identifies gaps requiring action.

**Verdict:** BSuite already exceeds WF1 parity on ~70% of modules (especially compliance, AI, government APIs, charge-rate calculation, and document management). The primary gaps are in **OTS timesheet UX details**, **payroll engine/STP**, **RCTI/debtor automation**, and **pay period management**.

---

## 1. Module-Level Comparison

| # | WF1 Module | BSuite Equivalent | Parity | Gap Summary |
|---|-----------|-------------------|--------|-------------|
| 1 | **Employee/HR Management** | CRM7 `UnifiedPerson` + `people` table | ✅ **Exceeds** | BSuite has 100+ fields incl. AVETMISS, WAAMS, indigenous status, school-based, custodial, case notes. WF1 field list is not public but BSuite covers all known AU requirements. |
| 2 | **Client/Host Employer Mgmt** | CRM7 `HostEmployer` + `Client` + `HostSite` + `HostAgreement` | ✅ **Exceeds** | BSuite has multi-site, WHS compliance flag, agreement lifecycle, preferred qualifications, pre-placement checks. |
| 3 | **Hirings/Placements** | CRM7 `Placement` + `PlacementStatusHistory` + placement workflow | ✅ **Exceeds** | BSuite has 13-state lifecycle machine (draft→matching→offered→accepted→active→monitoring→completing→completed + rejected/declined/suspended/resumed/terminated), supervisor contacts, charge/pay/margin rates. WF1 has "multiple hirings per employee" — BSuite supports this via multiple `Placement` rows per `person_id`. |
| 4 | **Online Timesheet System (OTS)** | CRM7 `Timesheet` + `timesheetEntrySchema` + worker/host portals | ⚠️ **Partial** | See §2 deep-dive. Core fields match. Gaps in: work type per shift, copy-hours UX, attachment uploads on timesheets, missing timesheet email/SMS notifications, pay-period management. |
| 5 | **Payroll** | R80.3 wage calculator + CRM7 `chargeToPayroll` pipeline | ⚠️ **Partial** | R80.3 calculates wages correctly. **No built-in pay run engine or STP submission.** WF1 has full payroll with award interpretation, STP, tax, super, leave accruals. BSuite defers payroll to Xero/MYOB integration. |
| 6 | **Invoicing/Debtors/RCTI** | CRM7 `billingEngine` + `chargeToBilling` pipeline + `Quote`/`QuoteLineItem` | ⚠️ **Partial** | BSuite has billing engine, invoice generation from timesheets, and Xero journal export plugin. **Missing:** RCTI (Recipient Created Tax Invoice) generation, debtor ageing reports, automated invoice-from-timesheet batch. |
| 7 | **Award Interpretation** | R80.3 Fair Work API + `AwardRateCache` + `RateSchedule` + `EnterpriseAgreement` + BOOT assessment | ✅ **Exceeds** | BSuite has live FWC API integration, BOOT assessments (Fair Work Act s.193), enterprise agreement management, rate schedule versioning. WF1 has award-linked progression but no public BOOT tooling. |
| 8 | **Recruitment/ATS** | Conduit (full ATS) | ✅ **Exceeds** | Conduit has candidates, jobs, pipeline kanban, talent pools, onboarding, job distribution, offer management. WF1 uses idibu + Broadbean for job posting. BSuite's Conduit is a full standalone ATS. |
| 9 | **Compliance & Training** | CRM7 `TrainingPlan` + `TrainingContract` + `CompetencyAssessment` + `ApprenticeCompetency` + `TrainingPlanReview` + GTO compliance entities | ✅ **Exceeds** | BSuite has unit-level competency tracking, RPL, training plan reviews with progress ratings, contract variations, AASN registration, STA submissions per state. WF1 tracks training schedules but no public evidence of unit-level competency tracking. |
| 10 | **Forms & Safety/WHS** | CRM7 `WorkplaceInspection` + `SiteVisit` + `ReturnToWorkPlan` + `RTWMilestone` + WHS manager components | ✅ **Exceeds** | BSuite has safety ratings (5-point scale), return-to-work plans with milestones, inspection scheduling, host employer WHS management. WF1 has digital forms for incidents and site visits but details are not public. |
| 11 | **Document Management & eSign** | CRM7 documents + Google Docs API merge + react-pdf + pdf-lib signing + Supabase Storage | ✅ **Parity** | BSuite has document templates, mail merge, PDF viewing, e-signatures (pdf-lib + SHA-256), audit trail. WF1 uses Secured Signing integration. Both adequate. |
| 12 | **Dashboards & Reporting** | CRM7 analytics + consultant dashboard + BSU analytics page | ✅ **Parity** | BSuite has analytics, financial summary, compliance score. WF1 has consultant KPI dashboards. Roughly equivalent. |
| 13 | **Employee Portal** | CRM7 `worker-portal.tsx` | ⚠️ **Partial** | BSuite has worker portal with timesheets and profile. WF1 portal has OTS entry + payslip viewing + leave balance display + leave application. **Gaps:** payslip viewing (depends on payroll), leave balance display on submit. |
| 14 | **Client/Host Portal** | CRM7 `host-employer.tsx` portal | ✅ **Parity** | BSuite has host employer portal with timesheet approval, placement overview. WF1 has client portal with timesheet approval + invoice viewing. |
| 15 | **Notifications** | CRM7 `Communication` + `Notification` + `CommunicationTemplate` | ✅ **Parity** | BSuite has email/SMS/internal channels, bulk batches, templates with variables. WF1 has client/employee notifications. |
| 16 | **Integrations** | CRM7 Xero plugin + TGA API + Fair Work API + BSU OAuth | ⚠️ **Partial** | BSuite has Xero, TGA, Fair Work, Google Docs. WF1 has 20+ GL integrations, Secured Signing, Onboarded, WorkPro, Referoo, Message Media, idibu, Calendly, smartAI, LiveHire, Microsoft 365. **Gap:** SMS provider (Message Media), background checks (WorkPro/Referoo), onboarding automation (Onboarded). |
| 17 | **Consultant Dashboard** | CRM7 analytics + pipeline views | ✅ **Parity** | BSuite has pipeline cards with stages (enquiry→sign_up→probation→year_1-4→completion), field officer assignments, KPI tracking. |
| 18 | **Leave Management** | CRM7 `LeaveRequest` + `LeaveBalance` | ✅ **Parity** | BSuite has leave types (annual, personal, long service, parental, study, unpaid, compassionate), balances, approval workflow, medical cert URL. WF1 OTS has leave creation with balance display. |
| 19 | **Candidate Portal** | Conduit candidate experience | ✅ **Exceeds** | Conduit has full candidate portal for applications. WF1 has basic candidate portal. |
| 20 | **Admin/Config** | BSU Admin Panel + CRM7 `CustomFieldDefinition` + `UIConfiguration` | ✅ **Exceeds** | BSuite has custom fields, UI configuration, tenant settings, OAuth client management. WF1 has admin with email templates, SMTP relay, employee imports, requirement checks. |
| 21 | **Funding Claims** | CRM7 `FundingSource` + `FundingClaim` + `FundingMilestone` + `IncentiveClaim` | ✅ **Exceeds** | BSuite has comprehensive AU funding model with 20+ claim types, 12+ milestone types, per-state external systems (ADMS, WAAMS, CTF_WA, CITB_SA, etc.), payment schedules. No evidence WF1 has this level of funding automation. |
| 22 | **Data Import/Export** | CRM7 `DataImportJob` + CSV/XLSX/JSON | ✅ **Parity** | BSuite has import with field mapping, validation, row-level error tracking. WF1 has "Admin - Employee Imports". |

---

## 2. OTS (Online Timesheet System) — Deep-Dive Field Comparison

### 2a. Timesheet Entry Fields

| WF1 OTS Field | BSuite Field | Status | Notes |
|---------------|-------------|--------|-------|
| Placement (client dropdown) | `host_employer_id` on `Timesheet` | ✅ | BSuite links timesheet to host employer via placement |
| Start Time | `start_time` on `timesheetEntrySchema` | ✅ | Per-day entry |
| Break Time | `break_minutes` on `timesheetEntrySchema` | ✅ | BSuite stores as minutes (more precise than WF1 time field) |
| End Time | `end_time` on `timesheetEntrySchema` | ✅ | Per-day entry |
| Work Type (default, editable) | — | ❌ **GAP** | BSuite has no `work_type` field on timesheet entries. WF1 allows different work types per shift (e.g., ordinary, overtime, training, travel). BSuite splits into `ordinary_hours`/`overtime_hours`/`training_hours` but no named work-type selector. |
| +Shift (multiple shifts per day) | `entries` array on `Timesheet` | ⚠️ **Partial** | BSuite `timesheetEntrySchema` has per-date entries but no explicit multi-shift-per-day support. The `entries` field is a JSON array which could store multiple entries per date, but the UI and schema don't enforce or present this. |
| Copy Hours (copy first day to all weekdays) | — | ❌ **GAP** | No copy-hours UX feature in BSuite timesheet create/edit. |
| Copy Last (copy last week's timesheet) | — | ❌ **GAP** | No copy-last-week feature. |
| Attachments (doc/docx/pdf/jpg/png/txt/rtf) | — | ❌ **GAP** | No attachment field on timesheets. BSuite has document management but not linked to individual timesheets. |
| Save (draft) | `status: 'draft'` | ✅ | Draft status exists |
| Save & Submit | `status: 'submitted'` | ✅ | Submit action exists |
| Date/week per entry | `date` on `timesheetEntrySchema`, `week_ending` on `Timesheet` | ✅ | |
| Notes | `notes` on both `Timesheet` and `timesheetEntrySchema` | ✅ | |

### 2b. Timesheet Workflow/Admin Fields

| WF1 OTS Feature | BSuite Equivalent | Status | Notes |
|-----------------|-------------------|--------|-------|
| View by timesheet status | Timesheet list page with status filter | ✅ | `timesheetStatusSchema`: draft/submitted/approved/disputed/processed |
| View by pay period | — | ❌ **GAP** | BSuite has `week_ending` but no `pay_period` entity. WF1 has configurable pay periods (weekly, fortnightly, monthly) with OTS Pay Period permissions. |
| Approve/Reject timesheets | `timesheetApproveSchema` + `timesheetDisputeSchema` | ✅ | Approve with `overtime_approved` flag; dispute with reason |
| Un-submit approved/submitted timesheets | `resubmit` action in `timesheetActionSchema` | ✅ | |
| View missing timesheets | — | ❌ **GAP** | WF1 has "View Missing Timesheets" screen showing employees who haven't submitted. BSuite has no equivalent view. |
| Email/SMS missing timesheet notifications | — | ❌ **GAP** | WF1 can email and/or SMS employees with missing timesheets. BSuite has Communication entity but no automated timesheet-reminder trigger. |
| Enter timesheet on behalf of employee | — | ⚠️ **Partial** | BSuite timesheet create page exists but may not support "on behalf of" mode explicitly. |
| Send supervisor approval notifications | — | ❌ **GAP** | WF1 sends supervisors awaiting-approval notifications. BSuite has no automated approval notification trigger. |
| Flag for payroll batch | — | ❌ **GAP** | WF1 has "Add to Payroll Batch" action. BSuite's `chargeToPayroll` pipeline exists but has no explicit "flag for batch" UI action on the timesheet screen. |
| Accept multiple timesheets (bulk) | — | ❌ **GAP** | WF1 bulk-accept via checkbox selection. BSuite likely processes one at a time. |
| Timesheet errors/warnings pre-accept | — | ❌ **GAP** | WF1 says "ensure all errors have been addressed and all warnings reviewed" before accepting. BSuite has no timesheet validation/warning system. |

### 2c. Leave via OTS

| WF1 OTS Feature | BSuite Equivalent | Status |
|-----------------|-------------------|--------|
| Leave application via portal | `LeaveRequest` entity + worker portal | ✅ |
| Select placement (client) for leave | `employee_id` / `person_id` on `LeaveRequest` | ✅ |
| Leave type selection | `leave_type`: annual/personal/long_service/parental/study/unpaid/compassionate | ✅ |
| Display current leave balance on submission | `LeaveBalance` entity exists | ⚠️ **Partial** — entity exists but unclear if worker portal displays balance inline during leave creation |
| View previous applications | Leave request list | ✅ |

---

## 3. Payroll & Financial — Detailed Gap Analysis

| WF1 Feature | BSuite Status | Gap Detail |
|-------------|--------------|------------|
| **Full payroll engine** | ❌ Not built | BSuite defers to Xero/MYOB. No internal pay-run processing. |
| **STP (Single Touch Payroll)** | ❌ Not built | No ATO STP submission. Relies on external payroll provider. |
| **Award-linked rate progression** | ✅ Built | R80.3 + `ApprenticeWageSchedule` + `RateSchedule` + year-of-trade progression |
| **Multiple roles per employee per pay period** | ✅ Built | Multiple `Placement` rows per person, each with own pay/charge rates |
| **Leave accruals** | ⚠️ Partial | `LeaveBalance` entity exists but no automatic accrual engine |
| **Tax & deductions** | ❌ Not built | Deferred to external payroll |
| **Superannuation** | ⚠️ Partial | `super_rate` field on `ApprenticeWageSchedule` but no super fund management |
| **RCTI generation** | ❌ Not built | No Recipient Created Tax Invoice generation |
| **Debtor ageing** | ❌ Not built | No debtor ageing reports |
| **Invoice from timesheet (batch)** | ⚠️ Partial | `chargeToBilling` pipeline exists but no one-click batch UI |
| **Pay Item groups** | ❌ Not built | WF1 has configurable pay item groups (e.g., Cash Out Leave, Back Pay). BSuite has no equivalent. |
| **Termination timesheet** | ❌ Not built | WF1 has specific termination timesheet entry. BSuite has no special termination workflow for timesheets. |
| **Payroll process checklist** | ❌ Not built | WF1 has a formal payroll process checklist. BSuite has no equivalent. |
| **Change of Year (CoY) batch** | ✅ Built | `CoYBatch` + `CoYApprenticeChange` entities |

---

## 4. Integration Gaps

| WF1 Integration | BSuite Status | Priority |
|----------------|--------------|----------|
| 20+ General Ledger systems | Xero plugin only | Medium — most GTOs use Xero or MYOB |
| Secured Signing (eSign) | pdf-lib + SHA-256 (internal) | ✅ Equivalent |
| Onboarded (onboarding automation) | No integration | Low — Conduit has built-in onboarding |
| WorkPro (background checks) | No integration | Medium — police checks, WWC checks are tracked but not auto-verified |
| Referoo (reference checking) | No integration | Low |
| Message Media (SMS) | No SMS provider wired | Medium — `Communication` entity supports SMS channel but no provider |
| idibu / Veritone Hire (job posting) | Conduit has job distribution | ✅ Equivalent |
| Calendly (scheduling) | No integration | Low |
| smartAI | CRM7 has Jodie AI (exceeds) | ✅ Exceeds |
| LiveHire (talent communities) | Conduit talent pools | ✅ Equivalent |
| Microsoft 365 | No integration | Medium — email/calendar sync would be valuable |
| RatesCalc (quotation/compliance) | R80.3 + charge-calc package | ✅ Exceeds |

---

## 5. BSuite Features That EXCEED Workforce One

These are features BSuite has that WF1 does **not** publicly offer:

1. **AI Assistant (Jodie)** — AI-powered chat with tool calling for CRUD operations, search, timesheet management, report generation
2. **BOOT Assessment** — Automated Better Off Overall Test per Fair Work Act s.193 with engine results, pass/fail/marginal verdicts
3. **Government API integrations** — Live TGA/NTR API (56 endpoints), Fair Work Commission API, ADMS/WAAMS/state STA submissions
4. **Charge-rate calculator** — Full charge-rate quoting engine with batch quotes, BOOT gate, per-worker line items
5. **GTO Compliance Evidence** — Audit-ready evidence tracking per NSQA standard with auto-linking
6. **Funding claim automation** — 20+ AU claim types, milestone tracking per state system
7. **Training contract lifecycle** — Full WAAMS-aligned contract registration with variations, suspensions, STA submissions
8. **Competency-level tracking** — Unit-of-competency status with RPL, attempt counting, evidence URLs
9. **Multi-app SSO** — OAuth 2.1 PKCE across 5 apps with cookie SSO
10. **Custom fields & UI configuration** — Tenant-scoped custom fields and page layouts
11. **Pipeline Kanban** — Visual apprentice pipeline from enquiry to completion
12. **Disciplinary management** — Full escalation ladder with sign-offs and document generation
13. **Mail merge** — Batch document generation with variable substitution
14. **PWA support** — Progressive Web App with offline capability (CRM7)

---

## 6. Priority Action Plan — Closing Gaps

### P0 — Critical for GTO parity (blocks sales)

| # | Gap | Action | Effort | BSuite Location |
|---|-----|--------|--------|----------------|
| 1 | **Work type per timesheet shift** | Add `work_type` field to `timesheetEntrySchema` with configurable picklist (ordinary, overtime_1.5, overtime_2.0, training, travel, leave, other). Add to timesheet entry UI. | 2h | `crm7/src/schemas/timesheet.ts`, timesheet create/edit pages |
| 2 | **Multi-shift per day in UI** | Enhance timesheet entry UI to allow "+Shift" button per day, each shift with its own start/end/break/work_type. The `entries[]` schema already supports this — just needs UI. | 4h | `crm7/src/pages/timesheets/create.tsx` |
| 3 | **Copy Hours / Copy Last Week** | Add "Copy to all weekdays" and "Copy last week" buttons on timesheet entry form. | 2h | Timesheet create page |
| 4 | **Timesheet attachments** | Add `attachments` field (JSONB array of {url, filename, mime_type}) to timesheet entry. Allow file upload on submit. | 3h | Schema + Supabase migration + UI |
| 5 | **Pay period management** | Create `pay_periods` table (id, tenant_id, period_type, start_date, end_date, status, payroll_batch_id). Filter timesheets by pay period instead of just week_ending. | 4h | New migration + new entity + timesheet list filter |
| 6 | **Missing timesheet view** | Add "Missing Timesheets" tab on timesheet admin page — cross-reference active placements vs submitted timesheets for current pay period. | 3h | New component on timesheet list page |
| 7 | **Timesheet email/SMS reminders** | Wire automated reminders via `Communication` entity — trigger on missing timesheets and awaiting-approval. | 4h | New scheduled function or Supabase Edge Function |

### P1 — Important for operational parity

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 8 | **Bulk timesheet approval** | Add checkbox selection + "Approve Selected" bulk action on timesheet admin. | 2h |
| 9 | **Timesheet validation/warnings** | Add pre-approval validation: flag >12h/day, missing days, overlapping shifts, rate mismatches. | 4h |
| 10 | **Supervisor approval notifications** | Auto-create notification when timesheet submitted; email supervisor. | 2h |
| 11 | **Add to payroll batch action** | Add "Flag for Payroll" button on approved timesheets; integrate with `chargeToPayroll` pipeline. | 3h |
| 12 | **Leave balance display in portal** | Show current `LeaveBalance` inline when worker creates leave request in portal. | 1h |
| 13 | **Termination timesheet** | Add termination timesheet flow (final pay period, pro-rated leave, separation certificate generation). | 4h |
| 14 | **RCTI generation** | Generate Recipient Created Tax Invoices from timesheet data for host employers. | 8h |
| 15 | **SMS provider integration** | Wire Message Media or Twilio for outbound SMS via `Communication` entity. | 4h |

### P2 — Nice to have / future

| # | Gap | Action | Effort |
|---|-----|--------|--------|
| 16 | **Full internal payroll engine** | Not recommended — Xero/MYOB integration is the strategy. Add MYOB integration alongside Xero. | 2-4w |
| 17 | **STP submission** | Only needed if building internal payroll. Otherwise deferred to Xero/MYOB. | N/A |
| 18 | **Debtor ageing reports** | Financial reporting module addition. | 1w |
| 19 | **Pay item groups** | Configurable pay item group management (only needed with internal payroll). | N/A |
| 20 | **WorkPro / Referoo integration** | Background check API integration for automated police/WWC checks. | 1w |
| 21 | **Microsoft 365 integration** | Email/calendar sync for field officers and consultants. | 1w |
| 22 | **Payroll process checklist** | Configurable payroll close checklist UI (similar to `CoYBatch.checklist_data`). | 2h |

---

## 7. OTS Field-Level Schema Changes Required

### Migration: Add `work_type` and `attachments` to timesheet entries

```sql
-- Add work_type enum
CREATE TYPE timesheet_work_type AS ENUM (
  'ordinary', 'overtime_1_5', 'overtime_2_0', 'training',
  'travel', 'leave', 'shift_loading', 'other'
);

-- Add columns to timesheets table
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- The entries JSONB column already exists — work_type goes inside each entry object
-- Schema enforcement is at the application level via Zod
```

### Schema update: `timesheetEntrySchema`

```typescript
export const timesheetEntrySchema = z.object({
  date: z.string().min(1, 'Date required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  break_minutes: z.number().nonnegative().default(0),
  ordinary_hours: z.number().nonnegative().default(0),
  overtime_hours: z.number().nonnegative().default(0),
  training_hours: z.number().nonnegative().default(0),
  work_type: z.enum([
    'ordinary', 'overtime_1_5', 'overtime_2_0', 'training',
    'travel', 'leave', 'shift_loading', 'other'
  ]).default('ordinary'),
  notes: z.string().optional(),
});
```

### New entity: `PayPeriod`

```typescript
export interface PayPeriod extends BaseEntity {
  period_type: 'weekly' | 'fortnightly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'processing' | 'closed';
  payroll_batch_id?: string;
  total_timesheets?: number;
  approved_timesheets?: number;
}
```

---

## 8. Summary Scorecard

| Category | WF1 | BSuite | Winner |
|----------|-----|--------|--------|
| Employee/HR data model | Good | Excellent (100+ fields, AVETMISS) | **BSuite** |
| Placements/Hirings | Good | Excellent (13-state lifecycle) | **BSuite** |
| OTS Timesheet UX | Excellent | Good (core works, UX gaps) | **WF1** |
| Payroll engine | Excellent (full STP) | Deferred to Xero/MYOB | **WF1** |
| Award interpretation | Good | Excellent (live FWC API + BOOT) | **BSuite** |
| Invoicing/RCTI | Good | Partial (billing engine, no RCTI) | **WF1** |
| Recruitment/ATS | Basic (idibu) | Excellent (full Conduit ATS) | **BSuite** |
| Compliance tracking | Good | Excellent (unit-level + evidence) | **BSuite** |
| WHS/Safety | Good | Excellent (RTW plans, inspections) | **BSuite** |
| Document management | Good (Secured Signing) | Good (pdf-lib signing) | **Tie** |
| Portals (employee/client) | Good | Good (worker + host portals) | **Tie** |
| AI capabilities | Basic (smartAI) | Excellent (Jodie AI + tools) | **BSuite** |
| Government APIs | Unknown | Excellent (TGA, FWC, ADMS, WAAMS) | **BSuite** |
| Integrations breadth | Excellent (20+ partners) | Good (Xero, TGA, FWC) | **WF1** |
| Funding claims | Unknown | Excellent (20+ claim types) | **BSuite** |
| Mobile/PWA | Unknown | Good (CRM7 PWA) | **BSuite** |

**Overall: BSuite wins 10 categories, WF1 wins 3, Tie on 3.**

The P0 action items (§6) close the remaining OTS timesheet gaps with ~22 hours of focused work.
