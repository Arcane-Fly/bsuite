# DRY Principles & One-Shot Data Entry Architecture

**Applies to:** CRM7 • R8 • BSU • Conduit • All future modules
**Source of truth:** Unified Supabase schema (`business-suite-unified/database/`)
**Last updated:** 2026-03-01

---

## Core Principle

> **Enter once, use everywhere.**
> Every piece of data has exactly ONE authoritative entry point.
> All other apps READ from that source via Supabase.
> No duplication of forms, no re-keying, no local copies.

---

## 1. Entity Ownership Map

Every entity has exactly one **owning app** that provides the create/edit UI.
Other apps may READ the entity but NEVER create or edit it independently.

| Entity | Owner App | Create UI | Other Apps (READ) | Supabase Table |
|--------|-----------|-----------|-------------------|----------------|
| **Contacts** | CRM7 | Contact form | R8, BSU | `contacts` |
| **Clients** | CRM7 | Client form | R8, BSU | `clients` |
| **Apprentices** | CRM7 | Apprentice form | R8 (rates), BSU (metrics) | `apprentices` |
| **Host Employers** | CRM7 | Employer form | R8 (charge-to) | `clients` (type=host) |
| **Placements** | CRM7 | Placement form | R8 (context) | `placements` |
| **Qualifications** | CRM7 | Qualification form | R8 (award lookup) | `qualifications` |
| **Training Plans** | CRM7 | Training plan form | — | `training_plans` |
| **Assessments** | CRM7 | Assessment form | — | `assessments` |
| **Supervisors** | CRM7 | Supervisor form | — | `supervisors` |
| **Award Rates** | R8 | Rate calculator | CRM7 (payroll ref) | `award_rates` |
| **Charge Calculations** | R8 | Calculator | CRM7 (invoicing) | `charge_calculations` |
| **Invoices/Financial** | CRM7 | Invoice form | R8 (charge→invoice), BSU (revenue) | `financial_records` |
| **Ideas** | Throughput | Idea form | BSU (metrics) | `ideas` |
| **Business Plans** | Throughput | Plan editor | BSU (metrics) | `business_plan_sections` |
| **Projects** | CRM7/Throughput | Project form | R8, BSU | `projects` |
| **Users** | BSU | Admin panel | CRM7, R8 | `users` / `auth.users` |
| **Tenants/Orgs** | BSU | Org admin | CRM7, R8 | `tenants` |
| **Subscriptions** | BSU | Billing page | CRM7, R8 (feature gates) | `user_tenants` |
| **Permissions** | BSU | RBAC admin | CRM7, R8 (enforcement) | `permissions` / `role_permissions` |
| **BI Metrics** | BSU (aggregator) | Auto-collected | CRM7, R8 (write events) | `bi_metrics` |
| **WHS Incidents** | CRM7 | Incident form | BSU (compliance dash) | `incidents` |
| **Compliance Records** | CRM7 | Compliance form | BSU (audit) | `compliance_records` |
| **Timesheets** | CRM7 | Timesheet entry | R8 (hours→charges) | `timesheets` |
| **Funding Claims** | CRM7 | Claims form | BSU (revenue tracking) | `funding_claims` |
| **Candidates** | Conduit | Candidate form | CRM7 (placement ref) | `conduit_candidates` |
| **Talent Pools** | Conduit | Pool manager | — | `conduit_talent_pools` |
| **Jobs (Sourcing)** | Conduit | Job posting form | CRM7 (placement ref) | `conduit_jobs` |
| **Applications** | Conduit | Application tracker | — | `conduit_applications` |
| **Pipeline Stages** | Conduit | Pipeline settings | — | `conduit_pipeline_stages` |
| **Pipeline Entries** | Conduit | Kanban board | — | `conduit_pipeline_entries` |
| **Onboarding** | Conduit | Onboarding wizard | CRM7 (apprentice conversion) | `conduit_onboarding_*` |
| **Compliance Checks** | Conduit | Compliance dashboard | CRM7 (compliance records) | `conduit_compliance_checks` |
| **Comms (Sourcing)** | Conduit | Comms panel | — | `conduit_communications` |
| **Documents** | Conduit | Document upload | CRM7 (document ref) | `conduit_documents` |

---

## 2. One-Shot Data Entry Flows

### Flow A: New Apprentice (entered in CRM7)

```
CRM7: User creates apprentice
  → Writes to `apprentices` table (with contact_id, client_id, qualification_id)
  → Auto-links to existing contact (or creates one)
  → Auto-links to host employer (client)
  → Triggers bi_metrics event

R8: Sees apprentice in rate calculator dropdown
  → Reads from `apprentices` JOIN `contacts` JOIN `clients`
  → Never re-enters name, employer, qualification
  → Uses apprentice_id for charge_calculations

BSU: Sees apprentice count in dashboard
  → Reads from bi_metrics
```

### Flow B: Award Rate Update (entered in R8)

```
R8: Admin updates award rate
  → Writes to `award_rates` table
  → Recalculates affected charge_calculations
  → Triggers bi_metrics event

CRM7: Payroll module sees updated rate
  → Reads from `award_rates` for pay run calculations
  → Never duplicates rate data

BSU: Revenue impact shown in dashboard
  → Reads from bi_metrics
```

### Flow C: New Client / Host Employer (entered in CRM7)

```
CRM7: User creates client record
  → Writes to `clients` table (with addresses, contacts, ABN)
  → Client appears as host employer option in placement forms
  → Client appears as billing target in invoice forms

R8: Client appears in charge-to dropdown
  → Reads from `clients` table
  → Never re-enters ABN, address, contacts

CRM7 Invoicing: Uses same client record
  → financial_records.client_id → clients.id
  → No duplicate client entry for billing
```

### Flow D: Timesheet → Charge → Invoice (cross-app)

```
CRM7: Supervisor approves timesheet
  → Writes to `timesheets` table (worker_id, hours, dates)

R8: Picks up approved timesheets
  → Reads from `timesheets` WHERE status = 'approved'
  → Calculates charges using `award_rates`
  → Writes to `charge_calculations`

CRM7: Generates invoice from charges
  → Reads from `charge_calculations` WHERE status = 'approved'
  → Creates `financial_records` (type = 'invoice')
  → Links to client, apprentice, charge_calculation
```

### Flow E: Contact Reuse (one-shot person entry)

```
CRM7: User enters a person ONCE as a contact
  → Writes to `contacts` table

That same person can then be:
  → An apprentice (apprentices.contact_id → contacts.id)
  → A supervisor (supervisors.contact_id → contacts.id)
  → A client contact (client_contacts.contact_id → contacts.id)
  → A project member (project_members.user_id → users.id → contacts)

NEVER re-enter name, email, phone, address for the same person.
Use a contact picker/search component, not a free-text field.
```

---

## 3. Shared Components (DRY UI)

Components that appear in multiple apps MUST share the same behavior.
Implementation is per-app (no shared npm package yet) but patterns must match.

### Tier 1: Identical Pattern (copy pattern exactly)

| Component | Used In | Pattern Source |
|-----------|---------|---------------|
| **EntityPicker** (contact/client/apprentice search) | CRM7, R8 | CRM7 (owner) |
| **DataTable** (sort, filter, paginate) | CRM7, R8, BSU | CRM7 `DataTable.tsx` |
| **DashboardShell** (breadcrumbs, tabs, actions) | CRM7, R8, BSU | CRM7 `DashboardShell.tsx` |
| **StatusBadge** (entity status display) | CRM7, R8, BSU | Shared design token |
| **DateRangePicker** | CRM7, R8 | CRM7 existing component |
| **DocumentUploader** | CRM7 | CRM7 only (for now) |
| **LoadingSpinner / Skeleton** | CRM7, R8, BSU | Shared pattern |

### Tier 2: Shared Design Tokens (visual consistency)

| Token | Value | Used By |
|-------|-------|---------|
| Status colors | `active=green, pending=amber, expired=red, cancelled=gray` | All |
| Table density | `compact / comfortable / spacious` | CRM7, R8 |
| Card layout | `shadcn Card with consistent padding` | All |
| Form layout | `label-above, full-width inputs, consistent spacing` | CRM7, R8 |
| Theme | D2C Neon Electric (from `docs/20260228-d2c-theme-specification-v1.00W.md`) | All |

### Tier 3: Entity-Aware Components (smart reuse)

These components understand entity relationships and auto-populate.

| Component | Behavior |
|-----------|----------|
| **ApprenticeSelector** | Searches `apprentices` + shows qualification, host employer inline |
| **ClientSelector** | Searches `clients` + shows industry, status, ABN |
| **QualificationSelector** | Searches `qualifications` + shows level, code |
| **AwardRateSelector** | Searches `award_rates` + shows classification, current rate |
| **PlacementCard** | Shows apprentice + host + supervisor + dates from one placement record |
| **ContactCard** | Shows person details, linked entities (apprentice? supervisor? client contact?) |

**Rule:** If a dropdown or search field references an entity, use the EntitySelector pattern.
Never use a free-text field for data that exists in a table.

---

## 4. Auto-Population Rules

When a user selects an entity in a form, related fields auto-populate.

| When user selects... | Auto-populate... |
|---------------------|-----------------|
| Apprentice | Name, qualification, host employer, start date, status |
| Client | ABN, industry, primary contact, address |
| Host Employer | Address, site options, supervisor options, active placements count |
| Qualification | Code, level, duration, funding eligibility |
| Award Rate | Classification, current hourly rate, effective date |
| Placement | Apprentice name, host employer, supervisor, dates |
| Contact | Email, phone, preferred contact method, linked entities |

**Implementation:** Each EntitySelector component fetches with a JOIN/select that includes related display fields. No second query needed.

Example Supabase query for apprentice selector:

```typescript
supabase
  .from('apprentices')
  .select(`
    id, status, start_date, progress,
    contacts!contact_id (first_name, last_name, email, phone),
    clients!client_id (name, industry),
    qualifications!qualification_id (code, title, level)
  `)
  .ilike('contacts.last_name', `%${search}%`)
  .limit(20)
```

---

## 5. Access Levels & Permissions Matrix

Based on `crm7_rbac_rls.md` and `SCHEMA_DIAGRAM.md`.

### Role Hierarchy

```
owner > admin > manager > staff > viewer > free
```

### Module × Role Matrix

| Module / Action | Free | Viewer | Staff | Manager | Admin | Owner |
|----------------|------|--------|-------|---------|-------|-------|
| **Contacts** | | | | | | |
| View contacts | ✅ own | ✅ org | ✅ org | ✅ org | ✅ org | ✅ org |
| Create/edit contacts | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Delete contacts | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Apprentices** | | | | | | |
| View apprentices | ✅ own | ✅ org | ✅ org | ✅ org | ✅ org | ✅ org |
| Create/edit apprentices | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Placements** | | | | | | |
| View placements | ❌ | ✅ org | ✅ org | ✅ org | ✅ org | ✅ org |
| Manage placements | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Rate Calculator (R8)** | | | | | | |
| Run calculations | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit award rates | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve charges | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Financial** | | | | | | |
| View invoices | ❌ | ✅ org | ✅ org | ✅ org | ✅ org | ✅ org |
| Create invoices | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Approve payments | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **WHS / Compliance** | | | | | | |
| View incidents | ❌ | ✅ org | ✅ org | ✅ org | ✅ org | ✅ org |
| Report incidents | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage inspections | ❌ | ❌ | ❌ | ✅* | ✅ | ✅ |
| **Workflows** | ❌ | ❌ | ❌ | ❌ | ✅* | ✅ |
| **Reports / Exports** | ❌ | ❌ | ❌ | ✅* | ✅ | ✅ |
| **User Management (BSU)** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Billing / Subscriptions** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

_✅ = allowed, ❌ = denied, * = requires pro/enterprise subscription_

### Subscription Tier Gates

| Feature | Basic | Professional | Enterprise |
|---------|-------|-------------|------------|
| Core CRM (contacts, clients) | ✅ | ✅ | ✅ |
| Apprentice management | ✅ limited | ✅ | ✅ |
| Rate calculator (R8) | ❌ | ✅ | ✅ |
| WHS inspections + scheduling | ❌ | ✅ | ✅ |
| Workflow automation | ❌ | ❌ | ✅ |
| Report builder + exports | ❌ | ✅ | ✅ |
| BI dashboard | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |

### RLS Enforcement

All access control is enforced at the **database level** via Supabase RLS:

```sql
-- Every query is automatically filtered:
-- 1. tenant_id must match user's org (data isolation)
-- 2. role must have permission for the action (RBAC)
-- 3. subscription must include the module (feature gate)
```

**Frontend role:** Show/hide UI elements based on role. But NEVER trust the frontend alone — RLS is the real enforcement.

---

## 6. DRY Violations to Watch For

### Red Flags (stop and fix immediately)

1. **Free-text field for an entity that has a table** — Use an EntitySelector
2. **Duplicated entity form across apps** — One app owns the form, others link
3. **Local state that mirrors a Supabase table** — Use Zustand store with Supabase fetch
4. **Re-entering contact details** — Link to `contacts` table via FK
5. **Hardcoded award rates** — Must come from `award_rates` table
6. **Separate user tables per app** — Single `users` + `user_tenants`
7. **Permission checks only in frontend** — Must have RLS policy

### Yellow Flags (address in next iteration)

1. **Similar but not identical components** — Extract shared pattern
2. **Same API query in multiple components** — Extract to service/hook
3. **Inline status color logic** — Use shared StatusBadge component
4. **Date formatting scattered** — Use shared date utility
5. **Toast/notification patterns differ** — Standardize

---

## 7. Implementation Checklist for Every New Feature

Before building any new page or component, verify:

- [ ] **Entity ownership:** Which app owns this entity's CRUD?
- [ ] **Entry point:** Where does the user first enter this data?
- [ ] **Propagation:** What other views/apps will display this data?
- [ ] **Selectors vs text:** Are all FK fields using EntitySelector, not free text?
- [ ] **Auto-populate:** When entity is selected, what fills automatically?
- [ ] **Access level:** What role can create/read/update/delete?
- [ ] **Subscription gate:** What tier is required?
- [ ] **RLS policy:** Does one exist for this table?
- [ ] **BI event:** Should this action emit a `bi_metrics` record?
- [ ] **Shared component:** Am I building something that already exists?

---

## 8. Cross-App Data Flow Diagram

```
                    ┌──────────────────────┐
                    │   SUPABASE (unified)  │
                    │                       │
                    │  contacts ◄──────────────── CRM7 (owner)
                    │  clients  ◄──────────────── CRM7 (owner)
                    │  apprentices ◄───────────── CRM7 (owner)
                    │  qualifications ◄────────── CRM7 (owner)
                    │  placements ◄────────────── CRM7 (owner)
                    │  timesheets ◄────────────── CRM7 (owner)
                    │  financial_records ◄─────── CRM7 (owner)
                    │  funding_claims ◄────────── CRM7 (owner)
                    │  incidents ◄─────────────── CRM7 (owner)
                    │                       │
                    │  award_rates ◄───────────── R8 (owner)
                    │  charge_calculations ◄───── R8 (owner)
                    │                       │
                    │  ideas ◄─────────────────── Throughput (owner)
                    │  business_plan_sections ◄── Throughput (owner)
                    │                       │
                    │  users ◄─────────────────── BSU (owner)
                    │  tenants ◄───────────────── BSU (owner)
                    │  user_tenants ◄──────────── BSU (owner)
                    │  permissions ◄───────────── BSU (owner)
                    │  bi_metrics ◄────────────── ALL (write events)
                    │  projects ◄──────────────── CRM7 + Throughput
                    │                       │
                    └──────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                ┌───▼───┐ ┌──▼──┐ ┌───▼───┐
                │ CRM7  │ │ R8  │ │  BSU  │
                │       │ │     │ │       │
                │ READS:│ │READS│ │ READS │
                │ award │ │cont.│ │  ALL  │
                │ rates,│ │clnt,│ │(admin)│
                │ charge│ │appr,│ │       │
                │ calcs │ │qual │ │WRITES:│
                │       │ │     │ │users, │
                │       │ │     │ │tenant,│
                │       │ │     │ │perms, │
                │       │ │     │ │billing│
                └───────┘ └─────┘ └───────┘
```

---

## 9. Naming Conventions (consistency = DRY)

| Convention | Example | Applies To |
|-----------|---------|-----------|
| Table names | `snake_case`, plural | Supabase tables |
| Column names | `snake_case` | Supabase columns |
| FK columns | `{entity}_id` | All foreign keys |
| TypeScript interfaces | `PascalCase`, singular | `Apprentice`, `Client` |
| Zustand stores | `use{Entity}Store` | `useApprenticeStore` |
| Component files | `PascalCase.tsx` | `DataTable.tsx` |
| Route paths | `kebab-case` | `/charge-rates/:id` |
| CSS variables | `--{category}-{name}` | `--primary-foreground` |
| API responses | `snake_case` (Supabase native) | All Supabase data |

---

## 10. Barrel Export Structure (added 1 Mar 2026)

Directories with 3+ exports use barrel `index.ts` files for cleaner imports.

### CRM7 Barrel Exports

| Directory | Barrel File | Exports |
|-----------|------------|---------|
| `src/types/` | `index.ts` | All entity types, enums, interfaces |
| `src/lib/` | `index.ts` | Supabase client, utilities |
| `src/utils/` | `index.ts` | Helper functions |
| `src/hooks/` | `index.ts` | All custom hooks |
| `src/stores/` | `index.ts` | All Zustand stores |
| `src/schemas/` | `index.ts` | All Zod validation schemas |
| `src/lib/compliance/` | `index.ts` | Alert engine, scanner |
| `src/lib/ai/` | `index.ts` | AI client, config, tools, plugins |
| `src/components/` | `index.ts` | Re-exports from subdirectories |

### CRM7 Zod Schema Conventions (added 1 Mar 2026)

All entity validation uses Zod v4 schemas in `src/schemas/`. Pattern:

| Convention | Example |
|-----------|---------|
| Create schema | `createHostEmployerSchema` — all required fields, defaults for optional |
| Update schema | `updateHostEmployerSchema` — `.partial()` of create schema |
| Type inference | `type CreateHostEmployer = z.infer<typeof createHostEmployerSchema>` |
| Enums | Standalone `z.enum()` exports: `hostEmployerStatusEnum` |
| BaseEntity fields | Excluded (generated by DB): `id`, `tenant_id`, `created_at`, `updated_at` |
| Validation | `.min()`, `.max()`, `.email()`, `.url()`, `.uuid()` on appropriate fields |
| AU-specific enums | Imported from existing schemas: `auStateEnum`, `auMilestoneTypeEnum` |
| Test files | Co-located: `schemas/hostEmployer.test.ts` |
| Barrel export | All schemas re-exported from `schemas/index.ts` |

Schema files: `hostEmployer`, `hostAgreement`, `award`, `vacancy`, `qualifications`, `funding`, `fundingClaim`, `bootAssessment`, `rateSchedule`

### Shared Calculation Package

| Package | Path | Used By |
|---------|------|---------|
| `@bsuite/charge-calc` | `packages/charge-calc/` | CRM7 (`file:../packages/charge-calc`), R80.3 (`workspace:*`) |

**Single source of truth** for all charge rate calculations. Both projects delegate to this package — no duplicated calc logic.

---

_This document is the single reference for all DRY and data-flow decisions. Both Cascade and Claude Code/Cline agents must consult this before implementing any feature._
