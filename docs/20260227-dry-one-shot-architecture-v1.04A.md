# DRY Principles & One-Shot Data Entry Architecture

> **Filename corrected 2026-08-17: `v1.02A` → `v1.04A`.** The body advanced through v1.03A
> (2026-05-25) and v1.04A (2026-07-24) and the filename never followed, so **three different
> versions were in circulation at once**: the filename said 1.02, this body said 1.04, and six agent
> skills pointed at a `v1.01A` file that has not existed for months — including one skill's
> `description` field, the text an agent reads to decide whether to load it at all. Every in-repo
> reference was repointed in the same commit. **The six skill files under `~/.agents/skills/` are a
> separate repository and are NOT fixed by this commit** — see the handback note.

> **R80.3 → R80.4 corrected 2026-08-17.** R80.3 left the submodule set on 2026-08-06 (`5e000c35`,
> operator directive); R80.4 took its place. Two live operational references below named the
> retired directory as if it still existed — the §10 Shared Calculation Package table (originally
> read `CRM7 + R80.3 via npm semver`) and the §"rename sweep" script's submodule loop (originally
> read `for m in crm7 conduit business-suite-unified R80.3 throughput braden`, which would fail on
> `git -C R80.3` today). Both now read R80.4. **§11's historical gap-closure narrative (dated
> 2026-04-22/23) still says R80.3 on purpose** — it is a dated record of what was true when written,
> per `AGENTS.md`'s "reading a document that says R80.3" rule, and is left untouched.

**Applies to:** CRM7 • R8 • BSU • Conduit • braden • throughput • All future modules
**Source of truth:** Unified Supabase schema (`business-suite-unified/database/` + `crm7/supabase/migrations/`)
**Last updated:** 2026-07-24 (v1.04A — Leads/Funding Offsets/Org Documents added to §1; lifecycle-handover exception class documented)

**Changelog (top):**
- 2026-07-24 (v1.04A): Added Leads (CRM7-owned, braden captures via lead-capture path), Funding Offsets (R8-owned), Org Documents (CRM7-owned) to §1. Documented the lifecycle-handover exception: one-time ownership-domain transitions may take an immutable evidence copy with provenance (a migration, not a mirror) — approved for the recruitment→employment handover. Full cross-cutting audit report at `docs/20260724-oneshot-cross-cutting-audit-v1.00W.md`.
- 2026-05-25 (v1.03A): Updated §1 Entity Ownership Map Host Employers row from `clients` (type=host) to `employers` to match current production implementation.

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
| **Host Employers** | CRM7 | Employer form | R8 (charge-to) | `employers` |
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
| **Leads** | CRM7 | Lead form | braden (marketing capture via crm7 lead-capture path) | `leads` |
| **Funding Offsets** | R8 | Funding-offset form | CRM7 (placement ref), BSU (reporting) | `funding_offsets` |
| **Org Documents** | CRM7 | Org document editor | Assigned users (read/ack) | `org_documents` |

> **Lifecycle-handover exception (approved 2026-07-24):** the one-shot rule targets *data-entry duplication and live mirrors*, not one-time lifecycle transitions. When a record changes ownership domain (e.g. a Conduit **candidate** becomes a CRM7 **apprentice** on offer acceptance), the receiving domain may take an **immutable copy** of evidence artifacts (documents) with provenance markers — this is a *migration*, not a mirror, and is not a violation. Live ongoing access remains a DRY read; only the transition event copies, and only for legal-evidence artifacts where deletion-independence is required (design: `docs/plans/20260724-recruitment-employment-handover-design-v1.00D.md` §W2 Option A, operator-approved).

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

### One-Shot Compliance Gate (development completion)

Before any feature branch can be considered complete on `development`, the reviewer must
run this one-shot gate against the changed surface:

- [ ] New create/edit flows use the owning app from §1; reader apps link out or select
      existing records rather than creating duplicate local forms.
- [ ] Every entity reference uses an FK-backed selector or lookup component; no new
      free-text `*_name`, `*_email`, `*_phone`, `*_company`, or `*_code` fields are added
      when a canonical table already exists.
- [ ] Cross-app reads use published packages and Supabase tables only; no app-local mirror
      table, in-memory seed model, or duplicated service becomes a second source of truth.
- [ ] RLS, role checks, and subscription gates are present before UI merge; frontend-only
      checks are not enough.
- [ ] Any `@bsuite/*` consumer dependency uses an npm semver range in deployable
      `package.json` files. `workspace:*` and `file:../packages/*` are local-dev only and
      must not appear in Vercel deploy context.
- [ ] Project build/typecheck/lint status is green on the `development` branch before any
      promotion discussion.

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
| `@bsuite/charge-calc` | `packages/charge-calc/` | CRM7 + R80.4 via npm semver (`^0.1.0` or later published version) |

**Single source of truth** for all charge rate calculations. Both projects delegate to the
published package — no duplicated calc logic. In deployable consumer repos, never use
`workspace:*` or `file:../packages/*` for `@bsuite/*` packages because Vercel clones the
consumer repo without the parent `packages/` directory. Local workspace links are allowed
only as temporary developer tooling and must be removed before the consumer lockfile is
regenerated for deployment.

---

## 11. 2026-04-22/23 Gap Closure — Phases 1 through 6 outcomes

The master plan [`docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md`](plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md) executed six phases of DRY-violation closure and schema-builder uplift. This section captures the on-disk outcomes so future agents can reconcile §1 (Entity Ownership Map) and §6 (DRY Violations to Watch For) against what actually shipped.

### Phase 1 — CRITICAL golden-path FKs + braden lead-notification fix (shipped)

| Violation | Fix |
|-----------|-----|
| `contacts` + `leads` + `invoices` carried free-text `client_name` instead of `client_id` FK | Migration `crm7/supabase/migrations/20260422140000_phase1_golden_path_fks.sql` adds `client_id UUID REFERENCES clients(id)` with fuzzy-match backfill of the historic name strings |
| braden website leads landed at `braden.lang77@gmail.com` not `braden@braden.com.au` | Migration `business-suite-unified/supabase/migrations/20260422140100_update_braden_lead_notification_email.sql` adds `tenant_settings.lead_notification_email` and seeds the braden-website tenant row. Phase 4 V5 (see below) wires the crm7 `lead-capture` edge function to read this column. |

### Phase 2 — MEDIUM compliance/billing FKs (shipped)

| Violation | Fix |
|-----------|-----|
| `placements` held free-text `award_code` instead of FK to `award_rates` | Migration `crm7/supabase/migrations/20260422075100_phase2_medium_fks.sql` adds `award_rate_id` with resolver + synthetic-discontinued backfill. Comment drift tracked in `crm7/supabase/migrations/CLAUDE.md` Nit 4 + Nit 5. |
| `vet_assessments` had no FK to host employer | Same migration adds `host_employer_id` + snapshot trigger on the host-employer primary contact. Nit 4 guard bug fixed in `20260422092715_fix_primary_contact_snapshot_trigger_phone_only.sql`. |
| No entity for apprenticeship training contracts | Same migration creates `training_contracts` with lifecycle states. |
| FK indexes absent | `crm7/supabase/migrations/20260422180000_phase2_fk_indexes.sql` adds covering indexes. |

### Phase 3 — GTO entity gap + TGA API integration (shipped)

| Violation / Gap | Fix |
|-----------|-----|
| No entities for STAs, AASS providers, units of competency, incidents, reminders | `crm7/supabase/migrations/20260422213000_phase3_gto_entities.sql` creates single-table STA + AASS + UoC + Incident + Reminder entities per §7.1 decision (state discriminator, NOT polymorphic). |
| UoC seed data had to come from an official source | `crm7/supabase/functions/tga-sync/` edge function pulls training.gov.au web services; CSV fallback in Developer Portal. See `docs/20260422-tga-api-integration-reference-v1.00W.md`. |
| Stage-2 UoC remodel for alignment rules | `crm7/supabase/migrations/20260422230000_phase3_stage2_uoc_remodel.sql` + `20260423010000_phase3_uoc_drop_legacy_contract.sql`. |

### Phase 4 — Cross-app write-violation closure + lead-capture consolidation (shipped 2026-04-23)

> **2026-04-24 status correction:** the Phase 4 V3/V4 audit was narrow. The
> current one-shot gate found broader unresolved ownership leaks: R80.3 writes
> CRM7-owned apprentices, BSU writes Throughput-owned ideas, Braden writes
> CRM7-owned leads/clients, schema-builder authoring is duplicated across apps,
> and tenant/team writes appear outside BSU-owned flows. Treat those as active
> Phase 7 blockers until fixed or formally reconciled in the owner map.

| Violation | Fix |
|-----------|-----|
| V1 — Conduit candidate → CRM7 apprentice handoff created a fresh `contacts` row every time, even when one already existed for that email | `crm7/supabase/migrations/20260423020000_phase4_v1_candidate_contact_merge.sql` replaces the `create_apprentice_from_candidate` RPC with a version that merges by `(tenant_id, lower(email))` before insert. Non-NULL fields in the existing contact are preserved. Backfill DO block covers historic `source='conduit_handoff'` apprentices. |
| V3 — users mirrored in any app? | **No.** Grep audit `docs/20260423-cross-app-write-audit-v1.00W.md` confirms zero local `public.users` tables. All auth identity lives in `auth.users` (GoTrue). |
| V4 — apprentices mirrored in any app? | **No active violation.** CRM7 owns the canonical `apprentices` table; R80.3 and BSU are readers. throughput carries a dormant `CREATE TABLE IF NOT EXISTS` duplicate that is never executed against the shared project — tracked as throughput-debt-001. |
| V5 — `lead-capture` edge function duplicated in both BSU and crm7 (drifted) | crm7 is the canonical copy; BSU copy deleted. crm7 copy gained tenant-scoped admin-email notification via `tenant_settings.lead_notification_email` (replaces BSU's hardcoded `info@braden.com.au`). |

### Phase 5 — Schema + page-builder + navigation uplift (shipped 2026-04-22/23, page-builder superseded 2026-05-01 per P1-4(b))

**Note (v1.02A, 2026-05-01)**: The Phase 5 page-builder design (BSU-authored `tenant_page_layouts` + `TenantLayoutSlot` slot in each consumer app) was atomically replaced 2026-04-29 per ADR-0001 / ADR-0003. Page-builder authoring consolidated under CRM7 `custom_pages` (sole canonical surface); each consumer app ships its own read-only `CustomPageRenderer` (no shared package). The schema-registry package version 0.3.0 removes the deprecated `TenantLayoutSlot`, `useTenantPageLayout`, and `prefetchTenantPageLayout` exports. See `docs/20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md` for the execution log; see ADR-0001 + ADR-0003 for the doctrine.

---


| Entity | Role |
|--------|------|
| ~~`tenant_page_layouts`~~ | ~~BSU-authored page layout JSON~~ — **DROPPED 2026-04-29** per ADR-0001 atomic drop. Replaced by CRM7 `custom_pages` (single canonical authoring surface). Migration: `20260502000000_drop_tenant_page_layouts.sql` recorded in supabase_migrations as version `20260429045143`. Backup table `public.tenant_page_layouts_backup_20260502` retained 90 days (drop on 2026-08-02). |
| `custom_pages` | **CRM7-authored** tenant page layouts (canonical surface per ADR-0001). 20 columns including `slug`, `tenant_id` (nullable for `scope='platform'`), `layout` jsonb (blocks live here, no separate `custom_page_blocks` table), `is_published`, `version`, `nav_config`. RLS: 4 policies (SELECT/INSERT/UPDATE/DELETE for `authenticated`) verified 2026-04-29. Realtime publication enabled. |
| `custom_page_revisions` | Optional version-history surface for `custom_pages` (CRM7-owned). |
| `tenant_navigation` | BSU-authored navigation overlays per `(tenant_id, app_scope)` |
| `tenant_field_definitions` | Tenant-scoped custom field metadata for Phase 5+ form extensions |
| `tenant_entities` | Whitelist of entities a tenant may bind widgets to |
| `platform_branding` / `tenant_branding` / `tenant_app_branding` | Three-tier branding already delivered by Phase 4 theme work |

Consumer-side renderer: `@bsuite/schema-registry@^0.1.0` exports `<TenantLayoutSlot route=... appScope=... supabase=...>` + `useTenantNavigation(supabase, appScope)`. Realtime invalidation via `tenant-schema:<tenant_id>` channel. RLS policies enforce `is_developer_only=true` isolation from Enterprise-tenant authors — only `platform_admin` / `developer` may write to `app_scope='braden'` or developer-only surfaces.

### Phase 6 — Documentation + CI lint (this section)

- This document renamed `v1.00A` → `v1.01A` and now carries §11 (above).
- Each consumer app's `CLAUDE.md` updated with the `TenantLayoutSlot` + `useTenantNavigation` pattern (§6b).
- CI lint rule `no-free-text-where-fk` added as a GitHub Actions reusable workflow in every submodule repo (`.github/workflows/dry-lint.yml`). Rule flags any new migration `text` column matching `*_name|*_email|*_phone|*_company|*_code` added to a table that has an existing `_id` FK column, unless accompanied by `-- DRY exemption: <reason>` (§6c).

### How to reconcile §1 after a future change

1. Open the merge migration in the owning submodule.
2. Update §1 entity row with: the new column, the FK target, and any new app that READs the entity.
3. If a violation was closed, append a bullet under §11 with migration filename + fix summary.
4. **Do NOT bump a version string in the body.** Add a dated entry to the changelog at the top
   describing what changed, and leave every version string alone. **The version lives in the
   filename and nowhere else.**

   > *This step used to read "Status-bump the doc: v1.01A → v1.02A when §11 gains a new Phase
   > block." **That instruction is what broke this document.*** Two authors followed it —
   > 2026-05-25 and 2026-07-24 — advancing an in-body version to v1.03A and then v1.04A while the
   > file on disk never moved and no citation was ever swept. The result was three versions in
   > circulation at once: the filename, the body, and eleven agent skills pointing at a `v1.01A`
   > file that had not existed since 2026-08-06 — including one skill's `description` field, the
   > text an agent reads to decide whether to load it at all. Renaming the file fixes the symptom;
   > deleting this instruction is what stops it recurring.

5. **If the version must move, the rename is the whole job — and it reaches outside this repo.**
   A version bump is a breaking change to this document's address. Sweep all three surfaces in the
   same change, or the next reader gets a path that does not resolve:

   ```bash
   SPEC=20260227-dry-one-shot-architecture      # match any version
   git grep -lE "$SPEC-v[0-9]+\.[0-9]+[A-Z]"                      # parent repo
   for m in crm7 conduit business-suite-unified R80.4 throughput braden; do
     git -C "$m" grep -lE "$SPEC-v[0-9]+\.[0-9]+[A-Z]"            # every submodule
   done
   grep -rlE "$SPEC-v[0-9]+\.[0-9]+[A-Z]" ~/.agents/skills/       # the one nobody remembers
   ```

   **The skills hub is the surface that has been missed every time.** It is not in any repo, so no
   CI job and no `git grep` in this tree can see it. `general-dry-one-shot-architecture/scripts/verify.sh`
   now fails if any skill cites a spec path that does not resolve, or if two skills cite different
   versions — run it after any rename.

   **Two of the in-repo references are executable, not prose:**
   `packages/dry-lint/src/ownership-map.json` and `scripts/audit-one-shot.mjs`.

   **Do not rewrite applied migrations or archived logs.** A migration comment naming the filename
   that was current when it was written is correct history, not a stale pointer.

---

_This document is the single reference for all DRY and data-flow decisions. Both Cascade and Claude Code/Cline agents must consult this before implementing any feature._
