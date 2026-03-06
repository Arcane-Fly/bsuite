# CRM7 Unified Integration Plan — Feature Audit & Import Strategy

Comprehensive plan to consolidate three donor repos (crm7r, workforce-hub, and bsuite/crm7) into one canonical CRM at `bsuite/crm7`, importing the best patterns and implementations from each.

---

## 1. Ecosystem Map

| App | Repo | Stack | Domain | Role |
|-----|------|-------|--------|------|
| **BSU** | `bsuite/business-suite-unified` | Vite + React 18 + Supabase | suite.crm7.app | Hub/portal |
| **CRM7** (canonical) | `bsuite/crm7` | Vite + React 18 + Wouter + Supabase | crm.crm7.app | **Target** |
| **R8** | `bsuite/R80.3` | Vite + React 18 + Supabase | r8.crm7.app | Calculator |
| **Braden** | `bsuite/braden` | Vite + React 18 + Supabase | braden.com.au | Corp site |
| **CRM7R** (donor) | `business/crm7r` | Next.js 15 + pnpm + Auth0 | — | Feature donor |
| **Workforce Hub** (donor) | `business/workforce-hub` | Vite + React 19 + Zustand + Firebase | — | Architecture donor |

### Three CRM Codebases → One

- **bsuite/crm7** — Deployed canonical CRM. Correct auth (Supabase), correct stack (Vite), connected to unified schema.
- **crm7r** — Next.js app with 40+ pages not in crm7 (payroll, placements, training, analytics, rates). Wrong auth (Auth0), wrong stack.
- **workforce-hub** — Vite app with **excellent architecture patterns** (Zustand stores, entity type system, type-safe routing, entity relationship tabs, DashboardShell, DataTable, FastAPI backend). Uses Firebase auth (wrong), but architecture is gold.

---

## 2. Workforce-Hub Deep Audit — What It Does Really Well

### 2A. Architecture Patterns (IMPORT ALL)

| Pattern | Source File(s) | What It Provides | Import Priority |
|---------|---------------|------------------|----------------|
| **Entity Type System** | `utils/entityTypes.ts` (500+ lines) | `BaseEntity`, `EntityRef<T>`, `Person`, `Apprentice`, `HostEmployer`, `HostSite`, `HostAgreement`, `Qualification`, `TrainingPlan`, `Placement`, `Assessment`, `FundingClaim`, `Client`, `Candidate`, `LabourHireWorker`, `StaffMember`, `Address`, `Document`, `CommunicationRecord`, `RateCard` — all strongly typed with generics | **P0** |
| **Zustand Store Pattern** | `utils/*Store.ts` (7 stores) | Service + Store separation: each entity gets a service (CRUD with Firestore/localStorage fallback) and a Zustand store (state, filters, pagination, actions, helpers). Includes optimistic updates and real-time subscriptions. | **P0** |
| **Type-Safe Routing** | `utils/typeSafeRouting.ts` | `AppRoute` enum, `useTypedNavigate()` with `navigateTo()`, `navigateToEntity()`, `navigateToRelationship()`, `navigateToAddRelatedEntity()`, query param handling | **P0** |
| **DashboardShell** | `components/DashboardShell.tsx` | Consistent page layout: sidebar nav, header, breadcrumbs, tabs, top metrics, entity search, sidebar content. Every page uses this. | **P0** |
| **DataTable** | `components/DataTable.tsx` | Generic `<DataTable<T>>` with strong typing, ARIA attributes, fixed headers, sort indicators, custom cell renderers, mobile-responsive columns, loading/empty states | **P0** |
| **Entity Relationship Tabs** | `components/EntityRelationshipTabs.tsx` | Tabbed interface for entity relationships (1:1, 1:many, many:many) with navigation context, tab persistence, loading skeletons | **P1** |
| **Cross-Entity Search** | `components/CrossEntitySearch.tsx` | `cmdk`-based unified search across entity types with debounce, relationship context, entity type filtering | **P1** |
| **Navigation Store** | `utils/navigationStore.ts` | Persisted Zustand store for sidebar state, navigation history (20 items), entity context, dropdown expansion, quick access panel | **P1** |
| **Entity Relationship Service** | `utils/firestore/EntityRelationshipService.ts` | `fetchByReference<T>()`, `fetchRelatedEntities<T>()`, `findWithMultipleReferences<T>()`, `updateEntityRelationship()` — adapt from Firestore to Supabase | **P1** |

### 2B. Feature Implementations (IMPORT SELECTIVELY)

| Feature | Source | Quality | Import? |
|---------|--------|---------|---------|
| **Funding Claims** (`pages/FundingClaims.tsx` + 4 related pages) | 5 Australian funding sources (AAIS, WA Jobs, BAC, Aboriginal Employment, NSW Fee Free), claim workflow (draft→submitted→approved→paid), admin fee splits, filtering/sorting | **Production-quality** | **YES — P0** |
| **Contract Management** (`pages/ContractManagement.tsx`) | Table + card dual views, status management, expiry tracking, notification days, signatory info | **Production-quality** | **YES — P1** |
| **Training Plans** (service + store + types) | Competency-level tracking, module progress, optimistic updates, real-time subscriptions, auto-generated modules per qualification | **Production-quality** | **YES — P1** |
| **Qualification Management** (service + store + types) | National codes, units with core/elective, funding eligibility, traineeship/apprenticeship flags, duration tracking | **Production-quality** | **YES — P1** |
| **Employer/Host Site** (service + store) | Full CRUD with entity references, sites per employer, contact management, active placement counts | **Production-quality** | **YES — P1** |
| **Supervisor Management** (service + store + types) | Supervisor entities linked to employers and sites | **Good** | **YES — P2** |
| **Dashboard** (`pages/Dashboard.tsx`) | Metrics cards with framer-motion, quick actions, activity feed, error boundary, skeleton loading | **Good** | **Partial — adapt patterns** |
| **Apprentice CRUD** (pages: Create, Detail, Edit, Form, Management, list) | Comprehensive but uses Firebase — needs Supabase adaptation | **Good structure** | **Adapt structure only** |
| **Communications** (4 pages) | Mostly stubs (placeholder text) | **Stub** | **NO — use crm7r specs instead** |
| **Compliance** (5 pages) | Mostly stubs | **Stub** | **NO** |

### 2C. Documentation as Implementation Specs (USE AS BLUEPRINTS)

workforce-hub has **excellent embedded TypeScript documentation** that serves as implementation specs:

| Spec | File | Use For |
|------|------|---------|
| **Payroll** | `docs/core-features/payroll.ts` | PayItem types, LeaveType types, Timesheet types, Award types, AnyTime integration spec, pay run workflow, role permissions matrix |
| **Communications** | `docs/core-features/communication.ts` | Bulk email/SMS, template management with variable substitution, recipient management, batch processing with throttling |
| **Document Management** | `docs/core-features/document-management.ts` | Template system, mail merge, version control, document copying, digital signatures |
| **Security** | `docs/core-features/security.ts` | Feature-level security, RBAC hierarchy, integration security, data protection, audit layer |
| **AnyTime Integration** | `docs/integration-points/anytime.ts` | Bi-directional timesheet sync, data mapping JSON, configuration options |
| **ATO Reporting** | `docs/integration-points/ato-reporting.ts` | Tax/super reporting integration |
| **Requirements Matrix** | `docs/requirements/matrix.ts` | Full traceability: functional, technical, compliance, performance, security, UI requirements |
| **CRM7 Features** | `docs/crm7-features.ts` | 360° profiles, engagement scoring, workflow builder, trigger automation, predictive analytics, GraphQL/webhook integration |

### 2D. Backend Models (ADAPT TO SUPABASE)

workforce-hub has a **FastAPI + SQLAlchemy backend** at `business/workforce-hub/backend/`:

| Asset | What It Provides | Adaptation |
|-------|-----------------|------------|
| `app/models.py` | SQLAlchemy models: User, Apprentice, Employer, Qualification, TrainingPlan, Placement, Assessment, Site, Contract — with relationships and denormalized fields | → Supabase table DDL + RLS policies |
| `app/schemas.py` | Pydantic Base/Create/Update/Read schemas for all entities + `PaginatedResponse` | → Zod schemas in CRM7 |
| `app/security.py` | Security middleware | → Supabase Edge Function middleware |
| `app/external_apis.py` | External API integration patterns | → Edge Function API proxies |

---

## 3. CRM7R Import Map (Updated)

Cherry-pick from crm7r, **but prefer workforce-hub implementations where both exist:**

| Feature | crm7r Has | workforce-hub Has | Use Which |
|---------|-----------|-------------------|-----------|
| Entity types | Basic page types | **Full type system with EntityRef<T>** | **workforce-hub** |
| State management | React Query | **Zustand stores** | **workforce-hub** |
| Routing | Next.js App Router | **Type-safe AppRoute enum** | **workforce-hub** (adapt to Wouter) |
| Layout shell | Next.js layouts | **DashboardShell** | **workforce-hub** |
| Data tables | Inline tables | **Generic DataTable<T>** | **workforce-hub** |
| Funding claims | claim-form, overview | **5 pages with AU funding sources** | **workforce-hub** |
| Training plans | 4 training sub-pages | **Service + store + competency tracking** | **workforce-hub** |
| Qualifications | Qualification page | **Service + store with national codes** | **workforce-hub** |
| Contract management | Not present | **Full table + card views** | **workforce-hub** |
| Payroll module | **6 sub-routes** | Spec only (docs) | **crm7r** (pages) + workforce-hub (types) |
| Placements | **3 sub-routes** | Placement model only | **crm7r** (pages) + workforce-hub (store pattern) |
| Settings module | **10 sub-routes** | Not present | **crm7r** |
| Analytics dashboards | **5 dashboard types** | Not present | **crm7r** |
| Rates components | **7 components** | Not present | **crm7r** |
| FairWork API | **Full proxy + validation** | FairWork spec in docs | **crm7r** (routes → Edge Functions) |
| LMS | course/enrollment | Not present | **crm7r** |
| Banking | Not present | bank-account-form, payment-form, transactions | Neither (build fresh when needed) |
| Candidates | candidate form | Full candidate entity type | **workforce-hub** (type) + crm7r (UI) |
| Leads | 4 pages + API | Not present | **crm7r** |
| Monitoring | system monitoring | Not present | **Defer** |
| Communications | Not present | Spec only (docs) | **Build from workforce-hub spec** |
| Document management | Documents page | Spec only (docs) | **Build from workforce-hub spec** |

---

## 4. Data Connection Map

```
BSU (suite.crm7.app)
  └── Supabase: tuybltdrdefjblnplpqo
       ├── auth.users (shared)
       ├── tenants, user_tenants (multi-tenancy)
       ├── subscription_plans (SaaS)
       ├── contacts, clients (shared CRM)
       ├── apprentices, award_rates, charge_calculations (R8)
       ├── ideas, business_plan_sections (Throughput)
       ├── projects, financial_records (cross-module)
       └── bi_metrics (analytics)
```

### Missing Data Connections

| Connection | Status |
|-----------|--------|
| CRM7 → unified `contacts`/`clients` | **NOT WIRED** |
| R8 → `apprentices`/`award_rates`/`charge_calculations` | **NOT WIRED** (uses local state) |
| Cross-module `financial_records` | **NOT WIRED** |
| Cross-module `bi_metrics` | **NOT WIRED** |
| RBAC (`permissions` + `role_permissions`) | **NOT WIRED** (RLS documented, not applied) |
| Stripe subscriptions frontend | **Backend ready**, frontend incomplete |

---

## 5. Red Team Assessment (3 Passes)

### Pass 1: {SECURITY_SPECIALIST}

| Finding | Severity |
|---------|----------|
| RLS policies documented but NOT applied to production | **CRITICAL** |
| crm7r `.env` (3.3KB) committed to git | **CRITICAL** |
| workforce-hub `.env` also committed to git | **CRITICAL** |
| Auth0 + Firebase + Supabase Auth coexist across repos | **HIGH** |
| No MFA enforcement | **HIGH** |

### Pass 2: {TECHNICAL_ARCHITECT}

| Finding | Severity |
|---------|----------|
| Three CRM codebases with diverging features | **CRITICAL** |
| Unified schema exists but no app fully uses it | **CRITICAL** |
| No shared entity type library | **HIGH** |
| workforce-hub has the best architecture but wrong auth provider | **HIGH** |
| Flyway migrations documented but not executed | **HIGH** |

### Pass 3: {UX_ADVOCATE}

| Finding | Severity |
|---------|----------|
| R8 uses React Context — won't scale | **HIGH** |
| No code splitting in CRM7 | **HIGH** |
| workforce-hub DashboardShell pattern not used in bsuite apps | **HIGH** |
| No onboarding, no empty states, no CMD+K | **MEDIUM** |

---

## 6. Implementation Plan

### Phase 0: Foundation & Security (Week 1)

1. **Rotate secrets** — remove `.env` files from git in crm7r and workforce-hub, rotate all exposed keys
2. **Apply RLS policies** to production Supabase using `crm7_rbac_rls.md`
3. **Import entity type system** — adapt workforce-hub's `entityTypes.ts` for Supabase (remove Firebase deps, add `tenant_id`)
4. **Import Zustand store pattern** — create `src/stores/` in CRM7 with the service + store template from workforce-hub
5. **Import DashboardShell** — adapt for CRM7's existing layout, replace inline layouts
6. **Import DataTable** — drop into CRM7's `src/components/ui/`
7. **Import type-safe routing** — adapt `AppRoute` enum + `useTypedNavigate()` for Wouter
8. **Standardize theme** — apply `Theme-best-practice.md` to CRM7

### Phase 1: Core Feature Porting (Weeks 2-4)

**Week 2 — Funding & Contracts:**

1. Port workforce-hub FundingClaims (5 pages) → CRM7, adapting Firebase → Supabase
2. Port workforce-hub ContractManagement → CRM7
3. Port workforce-hub qualification service + store → CRM7
4. Wire CRM7 to unified `contacts` and `clients` tables

**Week 3 — Training & Placements:**
5. Port workforce-hub TrainingPlan service + store + competency tracking → CRM7
6. Port crm7r Placements module (calendar, roster, shifts) using workforce-hub store pattern
7. Port crm7r Training module (assessments, certifications, courses, skills)
8. Port workforce-hub employer/host-site management → CRM7

**Week 4 — Payroll & Settings:**
9. Port crm7r Payroll module (6 sub-routes) using workforce-hub payroll types spec
10. Port crm7r Settings module (10 sub-routes)
11. Create FairWork API → Supabase Edge Function (from crm7r's `api/fairwork/`)
12. Import workforce-hub EntityRelationshipTabs + CrossEntitySearch

### Phase 2: Analytics & Advanced Features (Weeks 5-6)

1. Port crm7r analytics dashboards (5 types) using Recharts (already in workforce-hub deps)
2. Port crm7r rates components (7) — bulk calculator, comparison, compliance validator, template builder
3. Port crm7r leads module (4 pages)
4. Build communication system from workforce-hub spec (`docs/core-features/communication.ts`)
5. Wire R8 to unified schema (`apprentices`, `award_rates`, `charge_calculations`)
6. Migrate R8 state management Context → Zustand

### Phase 3: BSU Platform Completion (Weeks 7-8)

1. Wire Stripe payment frontend
2. Implement Admin Panel
3. Wire notification + document management edge functions
4. Cross-app `bi_metrics` dashboard
5. Production LLM integration for Throughput
6. Implement RBAC permission checks in CRM7 + R8 frontend

### Phase 4: Polish & Quality (Weeks 9-10)

1. Theme consistency across all apps
2. Onboarding flows for CRM7 and R8
3. Empty states with actionable CTAs
4. Responsive design + accessibility audit (WCAG 2.1 AA)
5. E2E testing with Playwright
6. Bundle analysis + code splitting for CRM7

### Phase 5: Braden CMS + Cleanup (Week 11)

1. Drag-and-drop layout editor
2. Publishing workflow
3. Version history and rollbacks
4. Archive crm7r and workforce-hub after all features extracted

---

## 7. Donor Repo Disposition

| Repo | Decision | Reason |
|------|----------|--------|
| `business/crm7r` | **Archive** after Phase 2 | Feature donor only; wrong stack (Next.js), wrong auth (Auth0) |
| `business/workforce-hub` | **Archive** after Phase 1 | Architecture donor; wrong auth (Firebase), but patterns are the foundation |
| `bsuite/crm7` | **Keep as canonical CRM** | Correct stack, correct auth, correct deployment |

---

## 8. Key Files to Import (Quick Reference)

### From workforce-hub → bsuite/crm7

```
ARCHITECTURE PATTERNS:
  utils/entityTypes.ts          → src/types/entities.ts
  utils/*Store.ts (7 stores)    → src/stores/*.ts
  utils/*Service.ts (7 services)→ src/services/*.ts
  utils/*Types.ts               → src/types/*.ts
  utils/typeSafeRouting.ts      → src/utils/typeSafeRouting.ts
  utils/navigationStore.ts      → src/stores/navigationStore.ts

COMPONENTS:
  components/DashboardShell.tsx           → src/components/layout/DashboardShell.tsx
  components/DataTable.tsx                → src/components/ui/DataTable.tsx
  components/EntityRelationshipTabs.tsx   → src/components/entity/EntityRelationshipTabs.tsx
  components/CrossEntitySearch.tsx        → src/components/entity/CrossEntitySearch.tsx
  components/BreadcrumbTrail.tsx          → src/components/navigation/BreadcrumbTrail.tsx
  components/ErrorBoundary.tsx            → src/components/common/ErrorBoundary.tsx

PAGES:
  pages/FundingClaims.tsx         → src/pages/funding/FundingClaims.tsx
  pages/FundingClaimNew.tsx       → src/pages/funding/FundingClaimNew.tsx
  pages/ContractManagement.tsx    → src/pages/contracts/ContractManagement.tsx
  pages/Dashboard.tsx             → adapt patterns into existing dashboard

SPECS (as implementation blueprints):
  utils/docs/core-features/payroll.ts       → reference for payroll types
  utils/docs/core-features/communication.ts → reference for comms module
  utils/docs/core-features/security.ts      → reference for RBAC implementation
  utils/docs/integration-points/anytime.ts  → reference for timesheet integration

BACKEND (adapt to Supabase):
  backend/app/models.py   → Supabase migration SQL
  backend/app/schemas.py  → Zod validation schemas
```

### From crm7r → bsuite/crm7

```
PAGES (convert from Next.js to Vite + React):
  app/(sections)/payroll/*         → src/pages/payroll/
  app/(sections)/placements/*      → src/pages/placements/
  app/(sections)/training/*        → src/pages/training/
  app/(sections)/settings/*        → src/pages/settings/

COMPONENTS:
  components/analytics/*           → src/components/analytics/
  components/rates/*               → src/components/rates/

API ROUTES (convert to Supabase Edge Functions):
  app/api/fairwork/*               → supabase/functions/fairwork/
  app/api/leads/*                  → supabase/functions/leads/
  app/api/rates/enhanced/*         → supabase/functions/rates/
```

---

## 9. Deliverables Checklist

- [ ] Secrets rotated, `.env` files removed from all donor repos
- [ ] RLS policies applied to production Supabase
- [ ] Entity type system imported and adapted for Supabase
- [ ] Zustand store pattern established in CRM7
- [ ] DashboardShell + DataTable imported and integrated
- [ ] Type-safe routing adapted for Wouter
- [ ] Theme standardized across CRM7
- [ ] Funding Claims ported (5 pages)
- [ ] Contract Management ported
- [ ] Training Plan service + competency tracking ported
- [ ] Qualification management ported
- [ ] Employer/Host Site management ported
- [ ] Payroll module ported (6 sub-routes)
- [ ] Settings module ported (10 sub-routes)
- [ ] FairWork API → Edge Function
- [ ] Placements module ported (3 sub-routes)
- [ ] Analytics dashboards ported (5 types)
- [ ] Rates components ported (7)
- [ ] Leads module ported (4 pages)
- [ ] R8 wired to unified schema
- [ ] BSU Stripe frontend complete
- [ ] All apps: theme + RBAC + onboarding + E2E tests
- [ ] crm7r and workforce-hub archived
