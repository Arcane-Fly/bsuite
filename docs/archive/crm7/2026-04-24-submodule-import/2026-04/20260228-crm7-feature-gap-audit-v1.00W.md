# CRM7 Feature Gap Audit

_Last Modified: 2026-02-28_
_Version: 1.00W (Working)_

## Methodology

Sources cross-referenced:
- `/home/braden/Desktop/Dev/bsuite/docs/matrix.md` — Requirements Traceability Matrix
- `/home/braden/Desktop/Dev/bsuite/docs/compliance.md` — Compliance Requirements
- `/home/braden/Desktop/Dev/bsuite/docs/ui.md` — UI Requirements
- `/home/braden/Desktop/Dev/bsuite/docs/navigation.md` — Full navigation spec (9 top-level sections)
- `/mnt/.../crm13-development/docs/crm7-features.md` — CRM13 feature spec
- `/mnt/.../crm13-development/docs/system-README.md` — System README
- CRM7 actual codebase: all routes in `App.tsx`, all page files, all stores, Supabase table usage

---

## CRITICAL: Dead Links & Missing Routes

These are links users can click that navigate to a **404 page**.

| Dead Link Target | Where It's Triggered | Impact |
|---|---|---|
| `/contacts/:id` | Contacts table → Actions → "View Details" | **No contact detail page exists. No route registered.** |
| `/contacts/:id/edit` | Contacts table → Actions → "Edit Contact" | **No contact edit page exists. No route registered.** |
| `/hosts/:id` | Hosts list → row click / Host detail file exists but **no route registered in App.tsx** | **Host detail page unreachable** |
| `/hosts/:id/edit` | Host detail page → Edit button | **No host edit page exists** |
| `/placements/:id` | Host detail → Placements tab → View button | **No placement detail page exists. No route registered.** |
| `/placements/create?hostId=X` | Host detail → "New Placement" / "Create Placement" buttons | **No placement create page exists. No route registered.** |
| `/compliance?relatedTo=host&relatedId=X` | Host detail sidebar → Compliance button | **Compliance page exists but doesn't support query params** |
| `/compliance/create?relatedTo=host&relatedId=X` | Host detail → Compliance tab → "Add Compliance Record" | **No compliance create page** |
| `/documents/create?relatedTo=host&relatedId=X` | Host detail → Documents tab → "Upload Document" | **Documents page doesn't support query params or creation** |

---

## CRITICAL: Broken Features

### 1. Awards Section — Non-Functional Data Pipeline

- **`useAwardStore`** reads from `award_rates` table via `createEntityStore`
- The `createEntityStore` search filter uses `first_name.ilike, last_name.ilike, name.ilike, email.ilike` — **none of which exist on `award_rates`**. Any search will error.
- The `Award` entity type expects `classifications` sub-array but `createEntityStore` does a flat `select('*')` — **classifications are never joined/loaded**
- The `filteredClassifications` in `AwardRatesPage` will always be `[]` because `selectedAward?.classifications` is never populated
- **Net effect**: Awards page loads but shows no classifications, search errors, effectively non-functional

### 2. Host Employer → Apprentice Placement Visibility Gap

- `hosts/[id].tsx` line 87-94: queries `placements` table by `employer_id`
- **But**: the placements query only returns raw placement rows — no apprentice name, no qualification, no contact info
- The template renders `placement.position` and `placement.apprenticeId` (just an ID number) — **user cannot see WHO is placed**
- **Missing**: a joined query that includes `apprentice.first_name`, `apprentice.last_name`, qualification info
- **Missing**: from hosts list page (`hosts/index.tsx`) there is **no column showing placement count** — you can't tell which hosts have apprentices

### 3. Contact Actions — Dead Page Navigation

- `contacts/index.tsx` line 912: `setLocation('/contacts/${contact.id}')` → **404** (no route)
- `contacts/index.tsx` line 916: `setLocation('/contacts/${contact.id}/edit')` → **404** (no route)
- "Log Interaction" (line 920-928) is a **placeholder** — shows a toast but does nothing

### 4. Host Detail Page — Stub Functions with TODOs

- Line 100-101: `// TODO: Create host_preferred_qualifications table` — returns empty array
- Line 117-118: `// TODO: Create qualifications table or use vet_qualifications` — returns empty array
- Line 134: `// TODO: Insert into host_preferred_qualifications table when created` — logs warning, does nothing
- Line 167: `// TODO: Delete from host_preferred_qualifications table when created` — logs warning, does nothing
- Line 162: Uses `window.confirm()` instead of ConfirmDialog component

---

## HIGH: Missing Functional Requirements (from matrix.md)

### REQ-003: Training Contract Tracking — Partially Implemented

- Contracts list page exists with CRUD
- **Missing**: Link between contract and apprentice (contract → apprentice assignment)
- **Missing**: Contract progress tracking (milestones, completion %)
- **Missing**: Contract variation management
- **Missing**: Contract document attachments

### REQ-004: Timesheet Processing — Stub Only

- `timesheets/index.tsx` and `payroll/timesheets/index.tsx` exist
- **Missing**: Actual timesheet entry form
- **Missing**: Timesheet approval workflow
- **Missing**: Link between timesheet hours → charge rates → host employer billing
- **Missing**: This is the critical path for "what charges are associated with apprentices' worked hours"

### REQ-005: Compliance Monitoring — Fragmented

- GTO compliance pages exist (5 pages) ✓
- WHS pages exist (incidents, inspections, reports) ✓
- **Missing**: Unified compliance dashboard across all compliance types
- **Missing**: Due date calendar / compliance calendar
- **Missing**: Automated compliance alerts/notifications
- **Missing**: Compliance create/edit flow from host detail page

### FIN-001: Payroll Integration — Not Started

- Award rates page exists (read-only from R80.3) but classifications don't load
- **Missing**: Payroll processing engine
- **Missing**: Leave management
- **Missing**: Pay run creation and management

### FIN-002: Host Billing — Not Started

- Charge rates pages exist (`charge-rates/index.tsx`, `charge-rates/create.tsx`, `charge-rates/[id]/index.tsx`) ✓
- **Missing**: Invoice generation from timesheets + charge rates
- **Missing**: Billing cycle management
- **Missing**: Linking charge rates to specific host employer placements
- **Missing**: Billing → financial reports pipeline

### FIN-003: Government Funding Tracking — Partially Implemented

- Funding sources CRUD exists ✓
- Claims management exists ✓
- **Missing**: Funding eligibility calculator per apprentice
- **Missing**: Automated claim generation from milestones

### FIN-004: Financial Reporting — Stub

- Financial reports page exists but appears to be static/placeholder
- **Missing**: Dynamic report generation
- **Missing**: P&L by host employer
- **Missing**: Revenue per apprentice tracking

---

## HIGH: Missing Pages / Unregistered Routes

These page files exist on disk but have **no route in App.tsx**:

| File | Expected Route | Status |
|---|---|---|
| `hosts/[id].tsx` | `/hosts/:id` | **File exists, no route** |
| `hosts/create.tsx` | `/hosts/create` | **File exists, no route** |
| `hosts/agreement.tsx` | `/hosts/agreement/:id` | **File exists, no route** |
| `hosts/agreements.tsx` | Duplicate of `hosts/agreements/index.tsx`? | **Ambiguous** |
| `hosts/monitoring.tsx` | `/hosts/monitoring` | **File exists, no route** |
| `hosts/reports.tsx` | `/hosts/reports` | **File exists, no route** |
| `hosts/vacancies.tsx` | Duplicate of `hosts/vacancies/index.tsx`? | **Ambiguous** |
| `hosts/agreements/new.tsx` | `/hosts/agreements/new` | **File exists, no route** |
| `hosts/vacancies/new.tsx` | `/hosts/vacancies/new` | **File exists, no route** |
| `gto-compliance/standard-assessment.tsx` | `/gto-compliance/standard-assessment` | **File exists, no route** |
| `gto-compliance/access-equity.tsx` | `/gto-compliance/access-equity` | **File exists, no route** |
| `gto-compliance/records-management.tsx` | `/gto-compliance/records-management` | **File exists, no route** |
| `gto-compliance/risk-management.tsx` | `/gto-compliance/risk-management` | **File exists, no route** |
| `gto-compliance/complaints.tsx` | `/gto-compliance/complaints` | **File exists, no route** |
| `field-officers.tsx` | `/field-officers` (dashboard) | **File exists, no route** |
| `field-officers/site-assessment.tsx` | `/field-officers/site-assessment` | **File exists, no route** |
| `contracts/new.tsx` | Registered ✓ | OK |
| `contracts/[id].tsx` | Registered ✓ | OK |
| `vet/units/create.tsx` | `/vet/units/create` | **File exists, no route** |
| `vet/units/[id]/edit.tsx` | `/vet/units/:id/edit` | **File exists, no route** |
| `vet/qualifications/create.tsx` | `/vet/qualifications/create` | **File exists, no route** |
| `vet/qualifications/import.tsx` | `/vet/qualifications/import` | **File exists, no route** |
| `vet/qualifications/[id]/edit.tsx` | `/vet/qualifications/:id/edit` | **File exists, no route** |
| `vet/qualifications/[id]/structure.tsx` | `/vet/qualifications/:id/structure` | **File exists, no route** |
| `progress-reviews/templates/create.tsx` | `/progress-reviews/templates/create` | **File exists, no route** |
| `progress-reviews/reviews/index.tsx` | Registered ✓ | OK |

---

## MEDIUM: Feature Gaps vs CRM13 Spec / navigation.md

### Host Employer Management (navigation.md §2)
- ✅ Employer directory (hosts list)
- ❌ **Placement management visible FROM host** (shows IDs not names)
- ❌ **Site visits** — no site visit scheduling/tracking
- ❌ **Capacity management** — no max apprentice capacity per host
- ❌ **Host employer billing integration** — charge rates exist but aren't linked to hosts

### Contacts & CRM (navigation.md §1)
- ✅ Contact directory with search/filter
- ❌ **Contact detail page** — dead link
- ❌ **Contact edit page** — dead link  
- ❌ **Interaction/activity logging** — placeholder only
- ❌ **Contact history timeline** — not implemented
- ❌ **Contact → related entities** (which host employer, which apprentice, etc.)

### Financial Management (navigation.md §6)
- ✅ Budget, expenses, invoicing, reports pages exist
- ✅ Charge rates CRUD
- ❌ **Timesheet → charge rate → invoice pipeline** — the critical billing flow
- ❌ **Bank reconciliation**
- ❌ **Cost centers**
- ❌ **P&L by client/host employer**

### Training & VET (navigation.md §4)
- ✅ Qualifications, units, training packages, assessments
- ❌ **Training plan management** — page exists but no CRUD for plans
- ❌ **Training delivery tracking** — no session/delivery records
- ❌ **RTO engagement tracking** — no RTO management section
- ❌ **Apprentice → qualification progress** (unit completion tracking)

### Marketing & Sales (navigation.md §7)
- ✅ Leads, opportunities, pipeline, deals, quotes
- ❌ **Campaign management** — not implemented
- ❌ **Email marketing** — not implemented
- ❌ **Marketing calendar** — not implemented
- ❌ **ROI tracking** — not implemented

### Reports & Analytics (navigation.md §9)
- ✅ Reports page, analytics page, insights page exist
- ❌ **Custom report builder** — not implemented
- ❌ **Report scheduler** — not implemented
- ❌ **Export center** — not implemented
- ❌ **KPI tracking** — not implemented

### Compliance & Quality (navigation.md §8)
- ✅ GTO compliance (5 pages)
- ✅ WHS (incidents, inspections, reports, training, workflow)
- ❌ **Audit management** — no audit scheduling/checklist
- ❌ **Policy management** — not implemented
- ❌ **License management** — not implemented
- ❌ **Compliance calendar** — not implemented
- ❌ **Corrective actions** — not implemented

---

## LOW: Data Model / Schema Gaps

| Missing Table/Relationship | Purpose |
|---|---|
| `host_preferred_qualifications` | Link hosts to preferred quals (TODO in code) |
| `contact_interactions` | Log calls/emails/meetings per contact |
| `site_visits` | Field officer site visit records |
| `training_sessions` / `training_delivery` | Actual training delivery records |
| `compliance_calendar` | Due dates, renewals, reminders |
| `host_capacity` | Max apprentice capacity per host employer |
| `timesheet_entries` | Individual timesheet line items (hours × rate) |
| `billing_cycles` | Invoice generation scheduling |
| `apprentice_unit_completions` | Track which units each apprentice has completed |

---

## Summary: Priority Action Items

### P0 — Fix Broken User-Facing Features
1. **Register missing routes** in `App.tsx` for `hosts/:id`, `contacts/:id`, `contacts/:id/edit`, `placements/:id`, `placements/create`, GTO sub-pages, VET CRUD pages, and all other unregistered page files
2. **Fix awards data pipeline** — either join classifications or change the store/page to work with flat data
3. **Fix host detail placements query** — join apprentice data so names show instead of IDs
4. **Wire "Log Interaction" on contacts** to actually save to DB (or disable it)

### P1 — Core Domain Functionality
5. **Build contact detail/edit pages** — this is core CRM functionality
6. **Build placement create/detail pages** — critical for host employer → apprentice visibility
7. **Build timesheet → charge rate → invoice pipeline** — the money path
8. **Fix host preferred qualifications** — remove TODOs, create table or wire to `vet_qualifications`

### P2 — Feature Completion
9. **Training plan management** — CRUD for apprentice training plans
10. **Site visit scheduling** — field officer workflows
11. **Compliance calendar** — due dates and automated reminders
12. **Financial reporting** — dynamic reports, P&L by host
13. **Contact interaction history** — timeline of all touchpoints

### P3 — Navigation Spec Parity
14. Campaign/email marketing
15. Custom report builder
16. Audit management
17. Policy/license management
