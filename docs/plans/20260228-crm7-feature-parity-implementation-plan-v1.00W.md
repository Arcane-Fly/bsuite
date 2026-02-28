# CRM7 Feature Parity Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Close 25 feature gaps between CRM7 and CRM13 spec across 4 parallel workstreams by mining donor code and converting types.

**Architecture:** 4 independent domain streams dispatched to parallel agents. Each stream owns its DB migrations, types, stores, and pages. All new entities extend `BaseEntity`, use `createEntityStore<T>()` factory, and include Zod schemas. R80.3 `@bsuite/charge-calc` is the single calculation source of truth.

**Tech Stack:** React 18 + Vite 6 + TypeScript strict + Zustand 5 + TanStack React Query 5 + Supabase + Zod 4 + Radix UI + Tailwind + Wouter

---

## Execution Strategy

### Agent Assignment

| Stream | Agent | Rationale |
|--------|-------|-----------|
| **A: Financial Pipeline** | Claude Code | Critical business logic, R80.3 bridge, one-shot lifecycle |
| **B: Compliance & Legal** | Claude Code | GTO standards, legal domain, audit requirements |
| **C: Communications & Portals** | **Cascade** | Standard CRUD patterns, template system, portal UI |
| **D: Data & Integration** | **Cascade** | Import/export, document management, adapter patterns |

### Shared Conventions (ALL streams must follow)

**Entity pattern** (example: Quote):
```typescript
// 1. Type in src/types/entities.ts
export interface Quote extends BaseEntity {
  opportunity_id?: string;
  client_id?: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'expired';
  total_value?: number;
  valid_until?: string;
  notes?: string;
}

// 2. Zod schema in src/schemas/<entity>.ts (NEW directory)
import { z } from 'zod';
export const quoteSchema = z.object({
  opportunity_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  title: z.string().min(1),
  status: z.enum(['draft', 'sent', 'accepted', 'converted', 'expired']),
  total_value: z.number().nonnegative().optional(),
  valid_until: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// 3. Store in src/stores/<entity>Store.ts
import { createEntityStore } from './createEntityStore';
import type { Quote } from '@/types/entities';
export const useQuoteStore = createEntityStore<Quote>('quotes', {
  defaultSort: { column: 'created_at', direction: 'desc' },
  defaultPageSize: 25,
});

// 4. Export from src/stores/index.ts
export { useQuoteStore } from './quoteStore';

// 5. DB migration in supabase/migrations/YYYYMMDDHHMMSS_create_quotes.sql
```

**Page pattern** (replace stubs):
- Use DataTable from `@/components/common/DataTable` for list pages
- Use StatCard from `@/components/common/StatCard` for KPIs — but wire to REAL Supabase counts
- Use EmptyState from `@/components/common/EmptyState` when no data (never fake numbers)
- Lazy-load via `React.lazy()` in App.tsx

**Commit pattern:** `feat(crm7): <description>` — one commit per task.

---

## Stream A: Financial Pipeline (Claude Code)

### Task A1: Quote Entity & Lifecycle

**Files:**
- Modify: `crm7/src/types/entities.ts` — add Quote, QuoteLineItem interfaces
- Create: `crm7/src/schemas/quote.ts` — Zod validation
- Create: `crm7/src/stores/quoteStore.ts` — entity store
- Modify: `crm7/src/stores/index.ts` — add export
- Modify: `crm7/src/pages/quotes/index.tsx` — replace 80-line stub
- Create: `crm7/src/pages/quotes/create.tsx` — quote creation form
- Create: `crm7/src/pages/quotes/[id]/index.tsx` — quote detail
- Create: `crm7/src/lib/quoteLifecycle.ts` — Quote→Contract conversion
- Create: `supabase/migrations/20260228120000_create_quotes.sql`

**Step 1: Add types to entities.ts**
```typescript
export interface Quote extends BaseEntity {
  opportunity_id?: string;
  client_id?: string;
  contact_id?: string;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'expired';
  total_value?: number;
  discount_percent?: number;
  valid_until?: string;
  sent_at?: string;
  accepted_at?: string;
  converted_contract_id?: string;
  notes?: string;
  prepared_by?: string;
}

export interface QuoteLineItem extends BaseEntity {
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}
```

**Step 2: Create Zod schema**
```typescript
// crm7/src/schemas/quote.ts
import { z } from 'zod';

export const quoteLineItemSchema = z.object({
  description: z.string().min(1, 'Description required'),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  sort_order: z.number().int().nonnegative(),
});

export const quoteSchema = z.object({
  opportunity_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'converted', 'expired']).default('draft'),
  total_value: z.number().nonnegative().optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  line_items: z.array(quoteLineItemSchema).optional(),
});
```

**Step 3: Create store**
```typescript
// crm7/src/stores/quoteStore.ts
import { createEntityStore } from './createEntityStore';
import type { Quote } from '@/types/entities';

export const useQuoteStore = createEntityStore<Quote>('quotes', {
  defaultSort: { column: 'created_at', direction: 'desc' },
  defaultPageSize: 25,
  defaultFilters: { client_id: '' },
  buildQuery: (query, filters) => {
    let q = query;
    if (filters.client_id) q = q.eq('client_id', filters.client_id) as typeof q;
    return q;
  },
});
```

**Step 4: Create DB migration**
```sql
-- supabase/migrations/20260228120000_create_quotes.sql
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  opportunity_id UUID REFERENCES opportunities(id),
  client_id UUID REFERENCES clients(id),
  contact_id UUID REFERENCES contacts(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','converted','expired')),
  total_value NUMERIC(12,2),
  discount_percent NUMERIC(5,2),
  valid_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  converted_contract_id UUID,
  notes TEXT,
  prepared_by UUID,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
```

**Step 5: Replace stub page with real DataTable** — wire to useQuoteStore, show real stats from count queries, DataTable with columns [title, client, value, status, valid_until, created_at]

**Step 6: Create quote form page** — react-hook-form + Zod resolver, line item management, client selector, opportunity link

**Step 7: Create lifecycle conversion** — `convertQuoteToContract(quoteId)` in quoteLifecycle.ts: reads quote + line items, creates contract record, updates quote status to 'converted', sets converted_contract_id

**Step 8: Commit** — `feat(crm7): add quote entity with lifecycle and CRUD`

---

### Task A2: Wire Charge-Rates to @bsuite/charge-calc

**Files:**
- Modify: `crm7/src/pages/charge-rates/create.tsx` — replace inline calc with bridge
- Create: `crm7/src/utils/crmCalcBridge.ts` — CRM7→shared engine adapter
- Reference: `R80.3/src/utils/calcBridge.ts` (donor pattern)
- Reference: `packages/charge-calc/src/calculate.ts` (shared engine)

**Step 1: Read R80.3's calcBridge.ts pattern**

**Step 2: Create CRM7 bridge** — `crmCalcBridge.ts` with `toCalcConfig()` and `fromCalcResult()` functions mapping CRM7 charge-rate form state → shared engine CalcConfig → CRM7 display format

**Step 3: Replace inline calculation in create.tsx** — remove duplicated math, call `calculateFromCrm7()` bridge function instead

**Step 4: Verify all 3 billing models** — Standard, ALEX48, W52 produce identical results to R80.3

**Step 5: Commit** — `refactor(crm7): wire charge-rates to @bsuite/charge-calc bridge`

---

### Task A3: Host Billing Engine

**Files:**
- Create: `crm7/src/types/billing.ts` — Invoice, InvoiceLineItem, Payment, CreditNote types
- Create: `crm7/src/schemas/billing.ts` — Zod schemas
- Create: `crm7/src/stores/invoiceStore.ts`
- Create: `crm7/src/stores/paymentStore.ts`
- Modify: `crm7/src/pages/financial/invoicing.tsx` — wire to real stores
- Create: `crm7/src/lib/billingEngine.ts` — timesheet→invoice generation
- Create: `supabase/migrations/20260228120100_create_billing.sql`

**Step 1: Define billing types** — Invoice (host_id, period_start, period_end, status, subtotal, tax, total, due_date, po_reference), InvoiceLineItem (invoice_id, apprentice_id, description, hours, rate, amount), Payment (invoice_id, amount, method, reference, received_at), CreditNote (invoice_id, amount, reason)

**Step 2: Create billing engine** — `generateInvoiceFromTimesheets(hostId, periodStart, periodEnd)`: queries approved timesheets for period, applies charge rates from placements, creates invoice + line items

**Step 3: Wire invoicing page** — replace existing financial invoicing with real DataTable, invoice generation button, payment recording, credit notes

**Step 4: Commit** — `feat(crm7): add host billing engine with invoice generation`

---

### Task A4: Timesheet Approval Workflow

**Files:**
- Modify: `crm7/src/types/entities.ts` — enhance Timesheet type with approval fields
- Create: `crm7/src/schemas/timesheet.ts` — Zod schema
- Modify: `crm7/src/stores/timesheetStore.ts` — add approval actions
- Modify: `crm7/src/pages/payroll/timesheets.tsx` — approval UI
- Create: `crm7/src/lib/timesheetWorkflow.ts` — status machine

**Step 1: Enhance Timesheet type** — add approver_id, approved_at, disputed_at, dispute_reason, processed_at, overtime_approved, training_hours, billable_hours

**Step 2: Create status machine** — `advanceTimesheetStatus(timesheet, action)`: draft→submitted→approved→processed, with dispute branch

**Step 3: Add approval UI** — supervisor sees pending timesheets, can approve/dispute, overtime flagged separately

**Step 4: Commit** — `feat(crm7): add timesheet approval workflow`

---

### Task A5: Payroll Integration Framework

**Files:**
- Create: `crm7/src/types/payroll.ts` — PayrollAdapter interface, PayrollRun, PayRunItem
- Create: `crm7/src/lib/payroll/adapter.ts` — base adapter interface
- Create: `crm7/src/lib/payroll/xeroAdapter.ts` — Xero implementation
- Create: `crm7/src/lib/payroll/myobAdapter.ts` — typed stub
- Create: `crm7/src/lib/payroll/quickbooksAdapter.ts` — typed stub
- Create: `crm7/src/stores/payrollStore.ts`
- Modify: `crm7/src/pages/payroll/index.tsx` — replace stub

**Step 1: Define PayrollAdapter interface** — `syncEmployees()`, `submitPayRun()`, `getPaySlips()`, `syncAwardRates()`

**Step 2: Implement Xero adapter** — OAuth token management, employee sync, pay run submission, STP structure

**Step 3: Create typed stubs for MYOB/QuickBooks** — same interface, `throw new Error('Not yet implemented')`

**Step 4: Wire payroll hub page** — adapter selection, pay run creation, status tracking

**Step 5: Commit** — `feat(crm7): add payroll integration framework with Xero adapter`

---

### Task A6: Government Funding Claims

**Files:**
- Modify: `crm7/src/stores/fundingClaimStore.ts` — add ADMS submission actions
- Create: `crm7/src/lib/funding/eligibilityEngine.ts` — eligibility checks
- Create: `crm7/src/lib/funding/admsAdapter.ts` — ADMS API adapter
- Modify: `crm7/src/pages/claims/new.tsx` — wire eligibility check
- Create: `crm7/src/schemas/fundingClaim.ts` — Zod validation

**Step 1: Create eligibility engine** — checks apprentice profile against funding source requirements (qualification, duration, demographics)

**Step 2: Create ADMS adapter** — submission workflow structure (register, claim, track)

**Step 3: Wire claims pages** — eligibility check before creation, payment reconciliation on detail page

**Step 4: Commit** — `feat(crm7): add funding eligibility engine and ADMS adapter`

---

### Task A7: Leave Management

**Files:**
- Modify: `crm7/src/types/entities.ts` — add LeaveRequest, LeaveBalance types
- Create: `crm7/src/schemas/leave.ts`
- Create: `crm7/src/stores/leaveStore.ts`
- Create: `crm7/src/pages/leave/index.tsx` — leave requests list
- Create: `crm7/src/pages/leave/request.tsx` — request form
- Create: `crm7/src/lib/leaveAccrual.ts` — accrual calculations
- Create: `supabase/migrations/20260228120200_create_leave.sql`

**Step 1: Define leave types** — LeaveRequest (employee_id, leave_type, start_date, end_date, hours_per_day, status, medical_cert_url), LeaveBalance (employee_id, leave_type, accrued, taken, balance)

**Step 2: Create accrual calculator** — per-award leave loading (17.5% default), accrual rates for annual/personal/long service

**Step 3: Create leave pages** — request form with calendar picker, approval workflow, balance display

**Step 4: Commit** — `feat(crm7): add leave management with accrual calculations`

---

### Task A8: Banking Integration

**Files:**
- Create: `crm7/src/lib/banking/becsGenerator.ts` — BECS file format
- Create: `crm7/src/lib/banking/reconciliation.ts` — match payments to invoices
- Create: `crm7/src/types/banking.ts` — PaymentFile, ReconciliationRecord

**Step 1: Implement BECS file generator** — Australian payment file format (BSB, account, amount, reference)

**Step 2: Create reconciliation utility** — match imported bank transactions to outstanding invoices

**Step 3: Commit** — `feat(crm7): add BECS payment file generation and reconciliation`

---

## Stream B: Compliance & Legal (Claude Code)

### Task B1: Compliance Automation Engine

**Files:**
- Modify: `crm7/src/types/entities.ts` — add ComplianceAlert type
- Create: `crm7/src/schemas/complianceAlert.ts`
- Create: `crm7/src/stores/complianceAlertStore.ts`
- Create: `crm7/src/lib/compliance/alertEngine.ts` — alert generation logic
- Create: `crm7/src/pages/compliance/alerts.tsx` — alert dashboard
- Create: `supabase/migrations/20260228130000_create_compliance_alerts.sql`
- Create: `supabase/functions/compliance-check/index.ts` — Edge Function for scheduled checks

**Step 1: Define ComplianceAlert type**
```typescript
export interface ComplianceAlert extends BaseEntity {
  entity_type: 'apprentice' | 'host_employer' | 'document' | 'contract' | 'license';
  entity_id: string;
  alert_type: 'expiring_document' | 'due_inspection' | 'training_deadline' | 'license_renewal' | 'contract_expiry';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  due_date?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'expired';
}
```

**Step 2: Create alert engine** — `generateAlerts()` queries docs with expiry < 30 days, inspections overdue, training units past deadline, licenses expiring, contracts near end date

**Step 3: Create Supabase Edge Function** — scheduled daily, runs alertEngine, inserts new alerts

**Step 4: Create alerts dashboard** — DataTable with priority badges, acknowledge/resolve actions, filter by type/priority

**Step 5: Commit** — `feat(crm7): add compliance automation engine with scheduled alerts`

---

### Task B2: Training Contract Management

**Files:**
- Modify: `crm7/src/types/entities.ts` — add TrainingContract, ContractVariation
- Create: `crm7/src/schemas/trainingContract.ts`
- Create: `crm7/src/stores/trainingContractStore.ts`
- Create: `crm7/src/pages/contracts/training/index.tsx` — list
- Create: `crm7/src/pages/contracts/training/create.tsx` — form
- Create: `crm7/src/pages/contracts/training/[id]/index.tsx` — detail
- Create: `crm7/src/lib/trainingContractLifecycle.ts` — status machine
- Create: `supabase/migrations/20260228130100_create_training_contracts.sql`

**Step 1: Define types** — TrainingContract (apprentice_id, host_employer_id, qualification_id, registration_number, aasn_provider, probation_weeks, probation_end_date, start_date, expected_end_date, actual_end_date, funding_source_id, training_plan_id, status), ContractVariation (contract_id, variation_type, reason, effective_date, approved_by, approved_at)

**Step 2: Create lifecycle** — registered→active→probation_complete→varied→completing→completed / cancelled

**Step 3: Create pages** — list with status filters, creation form linked to apprentice/host/qualification, detail with variation history and timeline

**Step 4: Commit** — `feat(crm7): add training contract management with lifecycle`

---

### Task B3: Audit Trail System

**Files:**
- Create: `supabase/migrations/20260228130200_create_audit_trail.sql` — table + trigger function
- Create: `crm7/src/types/audit.ts` — AuditEvent type
- Create: `crm7/src/stores/auditStore.ts`
- Modify: `crm7/src/pages/settings/audit-log.tsx` — wire to real data

**Step 1: Create audit_events table with trigger**
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_events (tenant_id, user_id, entity_type, entity_id, action, old_data, new_data, changed_fields)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'UPDATE' THEN ARRAY(
      SELECT key FROM jsonb_each(to_jsonb(NEW))
      EXCEPT SELECT key FROM jsonb_each(to_jsonb(OLD))
      WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
    ) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 2: Attach trigger to critical tables** — apprentices, hosts, contracts, placements, timesheets, quotes, invoices

**Step 3: Wire audit log page** — DataTable with filters (entity type, user, action, date range), expandable row showing old→new diff

**Step 4: Commit** — `feat(crm7): add database-level audit trail with triggers`

---

### Task B4: Performance Reviews

**Files:**
- Modify: `crm7/src/types/entities.ts` — add PerformanceReview, ReviewGoal
- Create: `crm7/src/schemas/performanceReview.ts`
- Create: `crm7/src/stores/performanceReviewStore.ts`
- Modify: `crm7/src/pages/progress-reviews/` — wire to real data
- Create: `supabase/migrations/20260228130300_create_performance_reviews.sql`

**Step 1-4:** Follow standard entity pattern. Review types: probation, quarterly, annual, pip, exit. Template system with form_structure JSONB. Goals with target dates and progress percentage.

**Step 5: Commit** — `feat(crm7): add performance review system with templates and goals`

---

### Task B5: Return-to-Work Plans

**Files:**
- Create: `crm7/src/types/rtw.ts` — ReturnToWorkPlan, RTWMilestone
- Create: `crm7/src/schemas/rtw.ts`
- Create: `crm7/src/stores/rtwStore.ts`
- Create: `crm7/src/pages/whs/return-to-work/index.tsx`
- Create: `crm7/src/pages/whs/return-to-work/[id]/index.tsx`
- Create: `supabase/migrations/20260228130400_create_rtw.sql`

**Step 1-4:** RTW plan linked to WHS incident. Graduated return schedule. Medical clearance tracking. Status: created→medical_review→graduated_return→full_duties→closed.

**Step 5: Commit** — `feat(crm7): add return-to-work plan management`

---

### Task B6: Missing Apprentice Data Model Fields

**Files:**
- Modify: `crm7/src/types/entities.ts` — verify fields exist (already added)
- Create: `supabase/migrations/20260228130500_alter_apprentices.sql` — add columns if missing

**Step 1: Verify types** — Apprentice already has field_officer_id, training_provider_id, trade, training_days_per_week, training_contract_number, probation_end_date, mentor_id (confirmed in entities.ts)

**Step 2: Create migration** — ALTER TABLE if columns don't exist in DB

**Step 3: Commit** — `fix(crm7): ensure apprentice data model fields in database`

---

### Task B7: Missing Database Tables

**Files:**
- Create: `supabase/migrations/20260228130600_create_gto_tables.sql`

**Step 1: Create all 7 tables** — training_providers, training_contracts, field_officer_assignments, site_visits, support_contacts, workplace_inspections, reimbursements. All with RLS enabled.

**Step 2: Create corresponding stores** — trainingProviderStore, siteVisitStore, supportContactStore, workplaceInspectionStore, reimbursementStore (where store doesn't already exist)

**Step 3: Commit** — `feat(crm7): create missing GTO database tables and stores`

---

### Task B8: Competency Tracking Depth

**Files:**
- Modify: `crm7/src/types/entities.ts` — enhance ApprenticeCompetency, add CompetencyAssessment
- Modify: `crm7/src/stores/competencyStore.ts` — add assessment actions
- Modify: relevant competency pages — add RPL, evidence, attempts UI

**Step 1: Enhance types** — add rpl_granted, evidence_url, attempt_count, assessor_id, assessment_date to ApprenticeCompetency

**Step 2: Add TrainingPlanReview** — progress_rating (on_track/behind/ahead), employer_feedback, apprentice_feedback, follow_up_required

**Step 3: Wire UI** — competency detail shows assessment history, evidence uploads, RPL toggle

**Step 4: Commit** — `feat(crm7): deepen competency tracking with RPL and assessments`

---

## Stream C: Communications & Portals

### >>> DELEGATE TO CASCADE <<<

**Provide Cascade this file path:**
```
/home/braden/Desktop/Dev/bsuite/docs/plans/20260228-crm7-feature-parity-implementation-plan-v1.00W.md
```

**Cascade prompt:**
```
Read the implementation plan at docs/plans/20260228-crm7-feature-parity-implementation-plan-v1.00W.md

You are implementing Stream C: Communications & Portals (tasks C1-C8).

CRITICAL CONVENTIONS:
- All entities extend BaseEntity from src/types/entities.ts
- All stores use createEntityStore<T>() factory from src/stores/createEntityStore.ts
- Export new stores from src/stores/index.ts
- Create Zod schemas in src/schemas/ for every new entity
- Pages use DataTable, StatCard, EmptyState from src/components/common/
- NEVER use fake/hardcoded stats — query Supabase or show EmptyState
- Commit format: feat(crm7): <description>
- Create DB migrations in supabase/migrations/

Read src/stores/apprenticeStore.ts and src/pages/quotes/index.tsx for
the exact patterns to follow.

Tasks:
C1: Communications System — bulk email/SMS, templates, delivery tracking.
     Replace the stub at src/pages/communications/ with full CRUD.
C2: Email/SMS Templates — template CRUD with {{variable}} tokens, preview.
C3: Notification Engine — automated notifications, priority levels,
     read/unread, bell icon with count badge.
C4: Mail Merge — batch document generation, variable substitution, PDF output.
C5: Role-Gated Portal Views — extend ProtectedRoute to filter nav/dashboard
     per role (GTO Staff, Host Employer, Apprentice, Training Provider, Finance).
C6: Reports & Custom Builder — operational/compliance/financial reports,
     custom builder with entity selection, filters, grouping, export.
C7: AI Insights — wire existing Jodie AI to analyze entity data, replace
     40-line stub at src/pages/insights/.
C8: Register 23 Missing Routes — wire unregistered GTO pages into App.tsx.
     Check crm7/docs/20260228-crm7-comprehensive-gap-plan-v1.00W.md for the list.

Work through tasks sequentially C1→C8. Commit after each task.
For C5 (portals), reference the crm8 donor at:
/mnt/wwn-0x5000c500c05cd06f-part1/Compressed_Dev/crm8/admin-portal/
/mnt/wwn-0x5000c500c05cd06f-part1/Compressed_Dev/crm8/client-portal/
```

---

## Stream D: Data & Integration

### >>> DELEGATE TO CASCADE <<<

**Cascade prompt:**
```
Read the implementation plan at docs/plans/20260228-crm7-feature-parity-implementation-plan-v1.00W.md

You are implementing Stream D: Data & Integration (tasks D1-D8).

CRITICAL CONVENTIONS:
- All entities extend BaseEntity from src/types/entities.ts
- All stores use createEntityStore<T>() factory from src/stores/createEntityStore.ts
- Export new stores from src/stores/index.ts
- Create Zod schemas in src/schemas/ for every new entity
- Pages use DataTable, StatCard, EmptyState from src/components/common/
- NEVER use fake/hardcoded stats — query Supabase or show EmptyState
- Commit format: feat(crm7): <description>
- Create DB migrations in supabase/migrations/

Read src/stores/apprenticeStore.ts for the exact store pattern.

Tasks:
D1: Document Management — template system, versioning, expiry tracking,
     access control. Replace basic documents page.
D2: Data Import/Export — CSV/Excel upload with field mapping UI, validation
     preview, duplicate detection. Replace settings import/export stub.
D3: State Government Integrations — GovernmentSystemAdapter interface.
     ADMS (federal) full, WAAMS/NSW/VIC/QLD/SA as typed stubs.
D4: Digital Signatures — DocuSign adapter, signature request workflow,
     status tracking per document.
D5: Custom Fields System — custom_field_definitions + custom_field_values
     tables. Admin UI for field management. Dynamic rendering on entity forms.
     BaseEntity already has custom_fields: Record<string, unknown>.
D6: Skills Matrix — worker skills, proficiency levels, certifications,
     availability patterns, skills matching for placements.
D7: RTO/Training Plan Integration — auto plan creation from apprentice
     profile, unit scheduling, assessment scheduling, credit transfers.
D8: Wire Mock Data Pages to Supabase — replace ALL hardcoded/demo data
     with real Supabase queries. Pages: Dashboard, Financial hub, Payroll hub,
     Reports hub, Insights stats, Communications hub, Host monitoring/reports.
     If no data exists, show EmptyState — NEVER show fake numbers.

For donor code, reference:
/mnt/wwn-0x5000c500c05cd06f-part1/Compressed_Dev/crm13-development/src/schemas/
/mnt/wwn-0x5000c500c05cd06f-part1/Compressed_Dev/crm13-development/src/lib/services/
/home/braden/Desktop/Dev/bsuite/docs/crm13-docs/requirements/

Work through tasks sequentially D1→D8. Commit after each task.
```

---

## Verification Checklist (After All Streams Complete)

Run after all 4 streams finish:

```bash
# 1. TypeScript compilation
cd crm7 && pnpm typecheck

# 2. Lint
pnpm lint

# 3. Tests
pnpm test

# 4. Build
pnpm build

# 5. Verify no fake stats remain
grep -rn '"[0-9]\+%\|"$[0-9]' src/pages/ --include='*.tsx' | grep -v '.test.'
# Should return zero results (no hardcoded stats)

# 6. Verify all new stores exported
grep 'export.*Store' src/stores/index.ts | wc -l
# Should be 37 (existing) + ~20 (new) = ~57

# 7. Verify new entities have Zod schemas
ls src/schemas/*.ts | wc -l
# Should have schemas for all new entities
```

---

## Migration Order

Streams own separate tables so migrations can run in any order. Recommended sequence to avoid FK issues:

1. **B7** (training_providers, training_contracts — base tables referenced by others)
2. **B6** (ALTER apprentices — adds FKs to training_providers)
3. **A1** (quotes, quote_line_items)
4. **A3** (billing tables)
5. **A7** (leave tables)
6. **B1** (compliance_alerts)
7. **B2** (training_contracts detail)
8. **B3** (audit_events + triggers)
9. **B4** (performance_reviews)
10. **B5** (return_to_work)
11. **C1-C4** (communications, templates, notifications)
12. **D1-D7** (documents, imports, integrations, custom fields, skills)
