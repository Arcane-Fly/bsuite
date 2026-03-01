# BSuite Reconciliation Sweep & Information Flow Architecture

> **Status:** v1.00W (Working)
> **Date:** 2026-03-01
> **Author:** Claude Code (architecture) + Braden (domain expertise)
> **Approach:** 5 independent audit passes + 6th tie-together reconciliation

**Goal:** Ensure every feature lives in the right app, data flows correctly between all 7 GTO personas, roles are unified across apps, custom fields propagate where needed, and the auth/SSO mesh is complete.

**Scope:** BSU, CRM7, Conduit, R80.3, Braden — all on `development` branch.

---

## Table of Contents

1. [GTO Persona × App Matrix](#1-gto-persona--app-matrix)
2. [Pass 1: Feature Placement](#2-pass-1-feature-placement)
3. [Pass 2: Information Flow](#3-pass-2-information-flow)
4. [Pass 3: Role/Permission Alignment](#4-pass-3-rolepermission-alignment)
5. [Pass 4: Custom Fields & Extensibility](#5-pass-4-custom-fields--extensibility)
6. [Pass 5: Auth/SSO Mesh](#6-pass-5-authsso-mesh)
7. [Pass 6: Tie-Together Reconciliation](#7-pass-6-tie-together-reconciliation)
8. [Domain Model Reference](#8-domain-model-reference)
9. [Implementation Priority](#9-implementation-priority)

---

## 1. GTO Persona × App Matrix

### The 7 Personas

| # | Persona | Description | Primary App | Also Uses |
|---|---------|-------------|-------------|-----------|
| 1 | **Field Officer** (Skills Dev Consultant) | Visits host sites, monitors apprentices, liaison between GTO/host/apprentice/RTO, handles escalations | CRM7 | R80.3 (rate context) |
| 2 | **GTO Admin / Office Manager** | Day-to-day operations, oversees admin team, reporting, approvals | CRM7 | BSU (org settings), R80.3 |
| 3 | **Claims & Records Manager** | Funding claims, government reporting, AASN/STA paperwork, financial records | CRM7 | BSU (billing) |
| 4 | **HR Coordinator** (GTO Apprenticeship & HR) | Onboarding, HR admin, disciplinary, placement matching, recruitment | CRM7 + Conduit | BSU (user mgmt) |
| 5 | **Host Employer** (external) | Views their apprentices' progress, submits timesheets, reports site issues | CRM7 (portal view) | — |
| 6 | **Training Provider / RTO** (internal or external) | Training plan delivery, competency sign-off, progress reporting, schedule setting | CRM7 (portal view) | — |
| 7 | **Apprentice / Trainee** | Views training plan, timesheets, leave; submits welfare/safety concerns directly to GTO | CRM7 (portal view) | — |

### Data Access Matrix (CRUD by Persona × Entity)

| Entity | Field Officer | GTO Admin | Claims/Records | HR Coord | Host Employer | RTO | Apprentice |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Contacts** | CRU | CRUD | R | CRU | R (own) | R (own) | R (self) |
| **Apprentices** | CRU | CRUD | R | CRU | R (hosted) | R (trained) | R (self) |
| **Placements** | CRU | CRUD | R | CRU | R (own) | R | R (self) |
| **Host Employers** | CRU | CRUD | R | R | R (self) | — | R (own host) |
| **Training Plans** | RU (negotiate) | CRUD | R | R | R + request reschedule | CRU (set & adjust) | R + submit query |
| **Training Schedules** | RU (coordinate) | CRUD | R | R | R (absence dates) | CRU | R (own) |
| **Competency Records** | CRU | CRUD | R | R | R (hosted) | CRU (sign-off) | R (self) |
| **RTO Assignments** | CRU | CRUD | R | CRU | R | R (self) | R (own) |
| **Site Inspections** | CRU (conduct) | CRUD | R | R | R (own sites) | — | — |
| **Timesheets** | RU (approve) | CRUD | R | R | CRU (submit) | — | CRU (submit) |
| **Leave Requests** | RU (approve) | CRUD | R | CRU | R | — | CRU (submit) |
| **Funding Claims** | R | RU | CRUD | R | — | — | — |
| **Funding Sources** | R | R | CRUD | — | — | — | — |
| **Charge Rates** | R | CRUD | R | — | R (own rates) | — | — |
| **Invoices/Billing** | — | RU | CRUD | — | R (own) | — | — |
| **WHS Incidents** | CRU (investigate) | CRUD | R | CRU | CRU (site) | — | CR (submit) |
| **Welfare Reports** | CRU (investigate) | CRUD | R | CRU | **BLOCKED if confidential** | — | CR (submit, confidential) |
| **Escalation Log** | CRU | CRUD | R | CRU | R (own, non-confidential) | R | R (self) |
| **Compliance Alerts** | R | CRUD | CRU | R | R (own) | R (own) | R (self) |
| **BOOT Assessments** | R | CRUD | R | R | — | — | — |
| **GTO Complaints** | CRU | CRUD | R | CRU | R (own) | R | R (self) |
| **Candidates** (Conduit) | R | R | — | CRUD | — | — | — |
| **Talent Pools** (Conduit) | R | R | — | CRUD | — | — | — |
| **Jobs** (Conduit) | R | CRUD | — | CRU | CR | — | — |
| **Custom Fields** | R (use) | CRUD (define) | R (use) | R (use) | R (use) | R (use) | R (use) |
| **Org Settings** | — | CRUD | — | — | — | — | — |
| **User Management** | — | CRUD | — | R | — | — | — |
| **Subscriptions** | — | R | — | — | — | — | — |

*C=Create, R=Read, U=Update, D=Delete. Scoped qualifiers: own, hosted, trained, self, site.*

**Key access rules:**
- Host Employer, RTO, and Apprentice are "portal" personas with restricted views
- Welfare reports with `confidential: true` are invisible to host_employer and training_provider roles (RLS-enforced)
- Training plan modifications follow request/mediation workflow, not direct CRUD
- Apprentice safety/bullying reports go directly to GTO, bypassing host

---

## 2. Pass 1: Feature Placement

### Principle
Each app has a clear domain boundary. BSU = account/portal (like Microsoft account). CRM7 = GTO operations. Conduit = recruitment pipeline. R80.3 = charge calculations. Braden = corporate website.

### Current Misplacements & Gaps

| Issue | Current State | Target State | Rationale |
|-------|--------------|-------------|-----------|
| Account/profile settings | BSU `/settings` is a non-functional stub | BSU owns profile, security, notification prefs | Portal-level account management |
| Org settings (name, logo, ABN, addresses) | Only in CRM7 `/settings/organization` | BSU owns org identity; CRM7 reads it | One-shot: org identity entered once, consumed everywhere |
| User management | Both BSU (Admin Panel) and CRM7 (settings) | BSU owns user+role CRUD; CRM7 extends with app-specific role mapping | BSU is the identity provider |
| Subscription/billing | BSU `/billing` | No change needed | Already correctly placed |
| Custom field definitions | CRM7 only | Hybrid: create in any app, share config via BSU | Create where relevant, BSU manages sharing |
| Conduit ↔ CRM7 handoff | No connection | Conduit "convert to apprentice" → CRM7 | HR Coordinator workflow spans both apps |
| RTO management | Not modeled | CRM7: `training_providers` table (scope: qualifications + locations) | GTOs blend RTOs; per-apprentice assignment |
| Training schedule coordination | Not implemented | CRM7: RTO feeds dates → system alerts host + field officer | "Expect apprentice absent" notification flow |
| Safety inspections | WHS incidents exist; inspections don't | CRM7: `site_inspections` (pre-placement + periodic 4-6 week) | GTO must inspect before and during placement |
| Escalation tracking | Not modeled | CRM7: `escalation_log` on placement (host → field officer → GTO) | Unions audit this; must be documented |
| Welfare/bullying reports | Not modeled | CRM7: `welfare_reports` with confidential flag, RLS-enforced | Apprentice needs safe channel bypassing host |

### Target App Boundaries

**BSU (Portal / Account / Control Plane)**
- App launcher grid (existing)
- Account profile & security settings (stub → implement)
- Org identity: name, logo, ABN, addresses (move from CRM7)
- User management & role assignment (existing)
- Subscription & billing with Stripe (existing)
- Custom field sharing configuration (new)
- Global notification center (new, future)

**CRM7 (GTO Operations)**
- All operational entities: contacts, apprentices, placements, host employers, qualifications, training plans, competencies
- New entities: `training_providers`, `rto_assignments`, `site_inspections`, `escalation_log`, `welfare_reports`, `training_schedules`
- Field officer workflows (site visits, monitoring, escalation)
- Claims & records (funding, AASN/STA reporting)
- WHS, compliance, BOOT
- Portal views for host employers, RTOs, apprentices (scoped-down)
- Custom field CRUD for operational data
- GTO-specific role mapping (BSU portal roles → operational roles)
- Request/mediation workflow engine

**Conduit (Recruitment Pipeline)**
- Candidate sourcing, talent pools, job postings
- Application tracking, interview scheduling
- "Convert to apprentice" handoff → creates entity in CRM7
- HR Coordinator's primary workspace for pre-placement
- Custom fields for recruitment-specific data (screening scores, assessments)

**R80.3 (Charge Rate Calculator)**
- Award rate calculations, BOOT assessments, charge rate quotes
- Reads from CRM7: apprentice, host employer, qualification, placement
- Writes to CRM7: calculated rates, BOOT results (shared Supabase tables)

**Braden (Corporate Website)**
- Public-facing content, admin auth for CMS. No operational data. No changes needed.

---

## 3. Pass 2: Information Flow

### GTO Operational Lifecycle

```
STAGE 1: RECRUITMENT (Conduit)
  HR Coordinator creates job posting → candidate applies
  Screens, interviews, shortlists
  ──── HANDOFF: "Convert to Apprentice" ────
  Creates: contact (one-shot), apprentice record, links qualification

STAGE 2: SIGN-UP & PLACEMENT (CRM7)
  GTO Admin / HR Coordinator:
    → Selects host employer + host site
    → Assigns qualification (from training.gov.au national registry)
    → Selects RTO (internal or external, per qualification + location)
    → AASN registers apprentice (federal) — GTO tracks status
    → Training contract → filters to STA (state has carriage)

  Field Officer:
    → Pre-placement safety inspection of host site
    → Creates site_inspection (PASS/FAIL + notes)
    → If PASS → placement activated

STAGE 3: ACTIVE TRAINING (CRM7 + R80.3)
  RTO:
    → Sets training plan for the year (largely fixed)
    → Delivers training blocks, feeds dates back to GTO

  System → notifies host: "Apprentice absent [dates] for training"

  Field Officer (every 4-6 weeks):
    → Site visit → visit record
    → Checks: apprentice welfare, host compliance, training progress
    → Competency sign-offs (from RTO) recorded
    → Escalation log if issues found

  Host Employer:
    → Submits timesheets
    → Day-to-day supervision
    → Can request training reschedule → GTO mediates with RTO

  Apprentice:
    → Views training plan, progress, upcoming dates
    → Submits leave requests → GTO approves
    → Submits queries about training → GTO acts on behalf
    → Reports safety/bullying concerns → GTO directly (bypasses host)

  Claims & Records:
    → Funding claims to AASN/STA based on milestones
    → Tracks funding source eligibility + claim lifecycle

  R80.3:
    → Charge rates (host pays GTO)
    → BOOT assessment
    → Quotes for new/renewed placements

STAGE 4: COMPLETION / EXIT (CRM7)
  RTO confirms all competencies signed off
  GTO processes completion paperwork → STA issues certificate
  OR: Early termination → documented with reason + escalation history
```

### Request/Mediation Workflow Pattern

Many GTO interactions follow this pattern:

```
[Requester]                    [GTO Mediator]              [Authority]
Apprentice/Host ──request──→  Field Officer/Admin ──negotiate──→ RTO/STA

                               ├── Approve (within guidelines)
                               ├── Deny (with reason)
                               └── Escalate (internal chain)

Audit trail: who requested, who mediated, decision, guidelines applied
```

Applies to: training rescheduling, placement changes, disciplinary actions, leave outside normal entitlement, RTO changes, host site changes, early termination.

Awards/legislation set hard limits on how much training can be rescheduled. Hosts must allow apprentices to attend training as required.

### Cross-App Data Flow

| Data Created In | Consumed By | Mechanism |
|----------------|-------------|-----------|
| Candidate (Conduit) | CRM7 on conversion | Writes to `contacts` + `apprentices` on handoff |
| Apprentice (CRM7) | R80.3 for rate calc | Reads `apprentices` JOIN `qualifications` JOIN `clients` |
| Charge rate (R80.3) | CRM7 for invoicing | Reads `charge_calculations` WHERE status='approved' |
| Training schedule (CRM7) | Host portal, field officer dashboard | Reads `training_schedules` scoped by placement |
| Site inspection (CRM7) | Host portal (own sites), BSU compliance dashboard | Reads `site_inspections` scoped by host/tenant |
| Funding claim (CRM7) | BSU revenue dashboard | Reads `funding_claims` aggregated in `bi_metrics` |
| Custom field (any app) | Other apps via BSU sharing config | Reads `tenant_field_definitions` + entity `custom_fields` JSONB |
| Org identity (BSU) | All apps (header, invoices, docs) | Reads `tenants` table (name, logo_url, abn, addresses) |
| Welfare report (CRM7) | GTO internal only | `confidential` flag enforced by RLS — host/RTO cannot read |

### One-Shot Entity Relationships

```
training.gov.au (national)
    └── Qualification (code + name)
            └── linked to Trade (qualification + real-world application)
                    └── Apprentice/Trainee
                            ├── placed with Host Employer (at Host Site)
                            │       ├── Site Inspections (pre-placement + periodic)
                            │       ├── Day-to-day supervision by host
                            │       └── Escalation: host → field officer → GTO
                            ├── assigned to RTO (per qualification + location)
                            │       ├── Training Plan (set by RTO, largely fixed)
                            │       ├── Competency Records (RTO sign-off)
                            │       └── Schedule → notifies host of absences
                            ├── employed by GTO (legal employer)
                            │       ├── Payroll
                            │       ├── Leave management
                            │       ├── Welfare reports (confidential to GTO)
                            │       └── Funding claims (GTO → AASN/STA)
                            └── monitored by Field Officer
                                    ├── 4-6 week site visits
                                    ├── Progress tracking
                                    └── Escalation handling
```

**RTO Assignment Model:** Many-to-many. A GTO uses multiple RTOs (internal + external/TAFE). An RTO serves multiple GTOs. The specific RTO for an apprentice depends on their qualification + location. GTOs blend between RTOs based on scope and availability.

---

## 4. Pass 3: Role/Permission Alignment

### Problem
Two incompatible role systems: BSU uses `owner/admin/manager/member/viewer`, CRM7 uses `gto_admin/gto_staff/field_officer/host_employer/apprentice/training_provider/finance`. No mapping between them.

### Solution: Unified Role Architecture

BSU defines identity + tier. CRM7/Conduit map to operational roles.

```
BSU Portal Role (identity)        CRM7 Mapped Role (operations)
────────────────────────────      ──────────────────────────────
platform_developer             →  gto_admin (bypass all)
owner                          →  gto_admin
admin                          →  gto_admin OR gto_staff (org configurable)
manager                        →  field_officer OR claims_records OR hr_coordinator
member                         →  gto_staff
viewer                         →  viewer (read-only)
─── external portal roles ───
host_employer                  →  host_employer (scoped to their placements)
training_provider              →  training_provider (scoped to their apprentices)
apprentice                     →  apprentice (scoped to self)
```

### Key Decisions

- **BSU adds three new portal roles**: `host_employer`, `training_provider`, `apprentice` for external users
- **CRM7 role mapping is per-tenant configurable**: an org can decide their BSU "admin" maps to `field_officer`
- **Conduit uses BSU portal roles directly**: `admin`+ manages recruitment, `hr_coordinator` operates pipeline
- **R80.3 inherits from BSU**: `viewer`+ runs calculations, `manager`+ edits award rates
- **External users get portal views**, not full app access: direct URL + magic link auth

### Portal Views for External Personas

Host employers, RTOs, and apprentices access scoped views:
- Direct URL: `crm.crm7.app/portal/host/[id]`, `/portal/rto/[id]`, `/portal/apprentice/[id]`
- Auth: shared cookie (`.crm7.app`) or magic link for external domains
- PermissionGate enforces role — only own data visible
- Welfare reports with `confidential: true` invisible to host_employer and training_provider (RLS-enforced at DB level, not just UI)

### Data Scoping: Three Isolation Layers

Data visibility is enforced at three levels, each narrower than the last:

```
Layer 1: Tenant Isolation (all tables)
  └── RLS: tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = auth.uid())

Layer 2: Entity-Level Scoping (external portal roles)
  └── host_employer → only sees apprentices/workers placed with them
  └── training_provider → only sees apprentices assigned to them
  └── apprentice → only sees own records
  └── field_officer → sees all OR partitioned workload (org configurable)

Layer 3: Field-Level Permissions (configurable internal)
  └── Who can UPDATE wages, charge rates, funding claims, etc.
  └── Configured per-tenant in org/super admin section
  └── Stored in tenant_role_permissions table
```

**Layer 2 — External party isolation:** A host employer sharing an apprentice with another host CANNOT see the other host's details, charges, or placements. An RTO cannot see apprentices trained by other RTOs within the same GTO. This is enforced via RLS policies that JOIN through placement/assignment records, not just tenant_id.

Example RLS for host_employer viewing apprentices:
```sql
-- Host sees apprentices placed with them (via placements table)
CREATE POLICY "apprentices_host_scoped" ON public.apprentices
  AS RESTRICTIVE FOR SELECT USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = apprentices.tenant_id
          AND ut.role = 'host_employer'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.placements p
        JOIN public.user_tenant_links utl ON utl.entity_id = p.host_employer_id
        WHERE p.apprentice_id = apprentices.id
          AND utl.user_id = auth.uid()
          AND p.status IN ('active', 'suspended')
      )
    )
  );
```

**Layer 2 — Team/workload partitioning (internal):** Some GTOs partition field officer workloads (officer A handles apprentices 1-50, officer B handles 51-100). Others use filters or a combination. Admin vs payroll may also be separated by function. This is handled via optional `assigned_to` or `team_id` columns + org-configurable filter preferences (not hard RLS — internal staff can override with sufficient role).

**Layer 3 — Configurable internal permissions:** Who can update wages, charge rates, funding claims, etc. is set per-tenant. A `tenant_role_permissions` table stores overrides:

```
tenant_role_permissions:
  tenant_id  UUID
  role       TEXT (operational role)
  entity     TEXT (e.g. 'charge_rates', 'payroll', 'funding_claims')
  actions    TEXT[] (e.g. ['read', 'update'] or ['read', 'create', 'update', 'delete'])
```

Org admins / super admins configure this in the **Organisation Settings → Permissions** section. Defaults are set by `DEFAULT_ROLE_MAPPING` + hardcoded permission matrix; overrides are per-tenant.

### Auth Sign-In State

| App | Current Auth UI | Social Login | Notes |
|-----|----------------|:---:|-------|
| CRM7 | Best looking sign-in | Google, MS | Reference implementation |
| BSU | Basic/minimal | Missing Google + MS buttons | Needs upgrade to match CRM7 |
| Conduit | Next.js server-managed | TBC | Has BSU OAuth inline |
| R80.3 | TBC | TBC | Uses BS OAuth |
| Braden | TBC | TBC | Corporate branding |

**Target:** BSU sign-in should be the canonical auth UI (as the portal/identity provider). Bring it up to CRM7's quality level including Google and Microsoft social login buttons.

---

## 5. Pass 4: Custom Fields & Extensibility

### Model: Create Anywhere, Share via BSU

**Existing infrastructure (CRM7):** `tenant_field_definitions` table, `DynamicFieldRenderer`, `EntityLinker`, `customFieldsService.ts` — 13 field types, 11 entity types.

### Extensions Needed

1. **Conduit gets custom fields** — same `tenant_field_definitions` table, Conduit-specific entity types (`candidate`, `talent_pool`, `job`, `application`)

2. **BSU gets "Field Sharing" admin panel** — org admins see all custom fields across apps:
   - Which apps can read the field
   - Which apps can write the field
   - Display location in each consuming app

3. **Shared fields flow via JSONB** — `custom_fields` column on entity tables. On cross-app handoff (e.g. Conduit→CRM7 candidate conversion), shared field values copy to the target entity.

### Example: OCEAN Personality Assessment

1. Org admin creates `ocean_openness`, `ocean_conscientiousness`, `ocean_extraversion`, `ocean_agreeableness`, `ocean_neuroticism` (type: `percent`) on `candidate` entity in **Conduit**
2. BSU Field Sharing: configure readable in CRM7 on `apprentice` and `placement` entities
3. Candidate converts to apprentice → OCEAN scores copy to apprentice `custom_fields`
4. Field officers see scores on apprentice detail. Host employers see in portal. Training providers see if org configures it. Finance doesn't. Exec sees aggregates in BSU dashboards.

---

## 6. Pass 5: Auth/SSO Mesh

### Tech Stack Note

Only Conduit is Next.js (App Router, server components). All other apps (BSU, CRM7, R80.3, Braden) are React + Vite SPAs. This affects auth implementation: Conduit uses `@supabase/ssr` with server-managed cookies; the others use client-side `@supabase/supabase-js` with `getCookieDomain()` for shared cookie on `.crm7.app`.

### Current State

| App | Stack | SSO to BSU | Cookie Sharing | External Portal |
|-----|-------|:---:|:---:|:---:|
| BSU | React+Vite | N/A (provider) | Sets `.crm7.app` cookie | N/A |
| CRM7 | React+Vite | BS OAuth | Shared cookie | Not implemented |
| R80.3 | React+Vite | BS OAuth | Shared cookie | N/A |
| Conduit | **Next.js** | Has BSU OAuth inline | `@supabase/ssr` (server cookies) | `/portal/careers` (public) |
| Braden | React+Vite | BS OAuth | Different TLD (expected) | N/A |

### Target State

| Change | What | Why |
|--------|------|-----|
| Verify Conduit SSO works | BSU OAuth already inline in login page | HR Coordinator seamless transition Conduit↔CRM7 |
| External portal auth | Magic link invites for host/RTO/apprentice | External users get direct links, no BSU knowledge needed |
| Role in JWT claims | BSU includes `portal_role` + `app_roles` | Apps read role from session, no extra DB query |
| Conduit ↔ CRM7 session | Shared cookie domain on `.crm7.app` | HR workflow spans both apps |
| BSU auth UI upgrade | Add Google + MS social login buttons | Currently basic — CRM7 is the reference |

---

## 7. Pass 6: Tie-Together Reconciliation

### Cross-Cutting Dependencies

| Pass 1 Decision | Affects | How |
|----------------|---------|-----|
| Org identity moves to BSU | Pass 2 | All apps read from `tenants`, not local config |
| New CRM7 entities | Pass 2, 3 | Field officers/RTOs need CRUD, PermissionGate rules |
| Conduit→CRM7 handoff | Pass 4, 5 | Custom fields carry over, SSO seamless |
| External portal roles | Pass 3, 5 | BSU new role types, magic link auth flow |
| Request/mediation workflow | Pass 2, 3 | Generic workflow engine, per-role approve/deny |
| Welfare report confidentiality | Pass 3, 5 | RLS enforcement, role-based visibility |

### Work Already Completed (Context)

**Claude Code (this session + prior):**
- Wave 0: PKCE on all projects, cookie domains, migration collision fix, barrels, .npmrc
- Wave 1: 9 migration tables + 6 Zod schemas
- Wave 2.9-2.12: Calc bridge verified, missing scripts added
- Wave 4.4-4.8: Security red-team, all 5 builds pass, migration notes, docs, PR #1

**Claude 2:**
- Wave 0.9: Baseline documented
- Wave 1.10-1.15: 6 Zod v4 schemas
- Wave 4.1: 6 test failures fixed
- Wave 4.2-4.3: Coverage 58.5% → 71.9%, 214 new tests, 1080/1080 passing
- Wave 4.7: DRY doc + reconciliation doc updated

**Cascade (in progress):**
- Wave 2.1-2.8: Zod upgrades, Supabase client standardization, store migration
- Wave 3.1-3.10: PermissionGate rollout, store migration

---

## 8. Domain Model Reference

### GTO Organizational Structure

```
Parent Company (e.g. IntoWork Group)
  └── GTO Entity (e.g. Skill Hire WA Pty Ltd)
        ├── Internal Teams
        │     ├── GTO Operations (GM, Admin, Field Officers)
        │     ├── Claims & Records
        │     ├── HR Coordination
        │     ├── Internal RTO (if parent has one)
        │     ├── Finance / Payroll
        │     ├── WHS / Compliance
        │     ├── Recruitment (feeds Conduit)
        │     └── Business Development
        │
        ├── External Parties
        │     ├── Host Employers (place apprentices with)
        │     ├── External RTOs / TAFE (when internal doesn't cover qual+location)
        │     ├── AASN (register apprentices, federal)
        │     ├── STA / DTWD (carriage of training contracts, state audit)
        │     ├── ADMS (federal online channel, increasingly replacing manual)
        │     └── Industry bodies (CITB, CSQ — funding sources)
        │
        └── Apprentices / Trainees (employed by GTO, placed with hosts)
```

### Key Domain Rules

- **GTO is the legal employer** — handles payroll, leave, compliance, funding claims
- **Host employer provides day-to-day supervision** but is NOT the employer
- **Field officer** is the GTO's on-ground representative — visits every 4-6 weeks, handles escalation
- **RTO assignment is per-apprentice**, not per-GTO — depends on qualification + location
- **Internal vs external RTO**: GTOs blend based on scope. If internal RTO doesn't cover the qualification or location, use external RTO/TAFE
- **Training plans are set by RTO**, largely fixed for the year. Changes go through GTO mediation
- **Awards set minimum training time** — hosts must allow apprentices to attend
- **Apprentice welfare reports bypass host** — confidential channel to GTO, RLS-enforced
- **Discipline chain**: host handles day-to-day → field officer for escalation → GTO internal chain
- **AASN registers apprentices (federal)** → training contract filters to STA (state has carriage) → STA audits GTO compliance against National Standards for GTOs (2017)

---

## 9. Implementation Priority

1. **Role unification** (Pass 3) — everything depends on who can do what
2. **Conduit SSO** (Pass 5) — unblocks HR Coordinator cross-app workflow
3. **New CRM7 entities** (Pass 1) — training_providers, site_inspections, escalation_log, rto_assignments, welfare_reports, training_schedules
4. **Request/mediation workflow** (Pass 2) — generic engine for training reschedule, escalation, etc.
5. **Custom field sharing** (Pass 4) — BSU admin panel, Conduit field infrastructure
6. **External portals** (Passes 3+5) — host, RTO, apprentice scoped views with magic link auth
7. **Org identity migration** (Pass 1) — move from CRM7 to BSU
8. **Information flow wiring** (Pass 2) — notification flows, cross-app data subscriptions

### Delegation Suggestion

| Priority | Task | Agent |
|----------|------|-------|
| 1 | Role unification — BSU new roles, CRM7 mapping layer | Claude Code |
| 2 | Conduit SSO — BS OAuth client, shared cookie | Claude Code |
| 3 | New CRM7 entity migrations + Zod schemas | Claude Code (migrations) + Claude 2 (schemas) |
| 4 | Request/mediation workflow engine | Claude Code (architecture) + Cascade (UI) |
| 5 | Custom field sharing — BSU admin panel | Cascade |
| 6 | External portal views | Cascade (UI) + Claude Code (RLS policies) |
| 7 | Org identity migration | Claude Code |
| 8 | Notification flows | Cascade |
