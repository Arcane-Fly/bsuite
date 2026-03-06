# BSuite Feature Gap Closure & Demo Readiness Plan

Close all feature gaps across BSuite: fix auth blockers, create missing DB tables, wire mock pages to Supabase, build missing UIs, add data management tooling (wipe/bulk/Excel), set up demo org, and make every feature demo-ready with real persisted data.

## Accounts & Org Setup

- **Dev account**: `braden.lang77@gmail.com` (user `ebdb7d74-a3ba-44d8-8e1b-2973a9b14420`, already exists)
- **MS account**: `braden@braden.com.au` — email/password signup for now (MS OAuth broken, fix separately)
- **Existing tenant**: "bsuite Platform" (slug: `platform`, type: `combined`)
- **New tenant**: "Braden Group" / "Braden Pty Ltd" — owned by `braden@braden.com.au`, with `braden.lang77@gmail.com` as a member (tests cross-tenant interplay)

---

## Phase 0: Immediate Blockers

### 0A. Fix Microsoft OAuth (Azure provider)

CRM7 `LoginModal.tsx` sends `provider: 'azure'` via `signInWithOAuth()`. Error: "Error getting user email from external provider".

**Root cause**: Azure AD app registration likely missing the `email` scope or the `email` claim isn't being returned. Supabase needs `email` and `openid profile` scopes.

**Fix**:

1. In Supabase Dashboard → Auth → Providers → Azure: verify Client ID, Secret, Tenant URL are correct
2. In Azure Portal → App Registration → API Permissions: ensure `openid`, `profile`, `email`, `User.Read` are granted
3. In Azure Portal → Token Configuration: add `email` as an optional claim for ID tokens
4. Verify redirect URL in Azure matches `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1/callback`

### 0B. Create `ai_sessions` and `ai_messages` tables

CRM7's sync service (`sync-service.ts` line 65-66) includes these in `SYNC_TABLES`. The `ai-chat-service.ts` writes to them via SQLite locally, and the sync service tries to push to Supabase — but the tables don't exist, causing 404 errors on every sync cycle.

**Migration needed**: Create both tables with columns matching the SQLite schema in `sqlite-db.ts`:

- `ai_sessions`: id, tenant_id, user_id, name, is_active, message_count, last_message_at, metadata, sync_status, last_synced_at, created_at, updated_at
- `ai_messages`: id, session_id, role, content, tool_calls, tool_results, model, tokens_used, metadata, sync_status, last_synced_at, created_at, updated_at
- RLS policies scoped to user_id = auth.uid()
- FK indexes on session_id, user_id, tenant_id

---

## Phase 1: DB Foundation (migrations)

### 1A. Create 4 missing platform admin tables

Frontend code in `platformService.ts` and `tenantSwitcherService.ts` references these — currently broken at runtime.

| Table | Purpose |
|-------|---------|
| `tester_licenses` | Platform admin tester license management |
| `developer_impersonation_sessions` | Super-admin impersonation session tracking |
| `super_admin_action_audit` | Super-admin action audit trail |
| `tenant_switch_audit` | Tenant switching audit log |

Each needs: RLS policies, FK indexes, `search_path` on any functions.

### 1B. Create "Braden Group" tenant + second user

- Insert tenant `Braden Group` (slug: `braden-group`, type: `combined`, status: `active`)
- Register `braden@braden.com.au` via Supabase Auth (or create profile manually)
- Create `user_tenants` entries: <braden@braden.com.au> as `owner`, <braden.lang77@gmail.com> as `admin`
- Create profile records for both users

### 1C. Wire Organization → Tenant hierarchy (multi-level)

The DB already supports multi-level nesting via `tenants.parent_tenant_id` (self-referencing FK):

- **Level 1**: `organizations` = billing/corporate entity (e.g., IntoWork)
- **Level 2**: Tenants with `parent_tenant_id` = GTOs under that org (e.g., SkillHire, MEGT)
- **Level 3**: Sub-tenants = regional/state branches (e.g., SkillHire WA - Perth Metro)
- `organization_members` = users with org-level cross-tenant visibility

**Example**:

```
IntoWork (Organization)
├── SkillHire WA (GTO tenant)
│   ├── Perth Metro (regional sub-tenant)
│   └── Regional WA (regional sub-tenant)
├── MEGT VIC (GTO tenant)
│   ├── Melbourne (regional sub-tenant)
│   └── Geelong (regional sub-tenant)
└── ... more GTOs
```

**Work needed**:

- Add `organization_id` FK column to `tenants` (links top-level tenants to their org)
- Add `region` and `state` columns to `tenants` for geo metadata
- Build org admin dashboard: tree view of child tenants + aggregated stats
- Wire org member roles: `org_admin` sees all descendants, `org_viewer` read-only
- Add org/tenant switcher in sidebar (tree-style picker for nested tenants)
- RLS helper function: `get_descendant_tenant_ids(tenant_id)` for cross-tenant queries

### 1D. Dead schema tables — all kept

10 remaining tables with zero frontend code. Kept for future use:

- `collaboration_sessions`, `comments`, `projects` — future collab features
- `teams` / `team_members` / `team_workspaces` / `team_invitations` — team management
- `platform_admin_sessions` — platform admin dashboard
- `content_pages` / `content_blocks` — CMS for tenant portals

---

## Phase 2: Cross-Cutting Data Management (CRM7)

### 2A. Admin Data Wipe Feature

- New page: `pages/settings/data-management.tsx`
- Org admin/owner only (check `user_tenants.role`)
- "Wipe All Data" button with double-confirm dialog
- Truncates all tenant-scoped entity tables (cascading via RLS tenant_id)
- Implemented as Supabase Edge Function `wipe-tenant-data` for safety

### 2B. Bulk Operations Service

- New shared service: `services/bulkOperationsService.ts`
- **Mass Update**: Select multiple rows → apply field changes (status, assigned_to, tags, etc.)
- **Bulk Delete**: Select multiple rows → confirm → delete all
- Operates on any entity table via the `createEntityStore` pattern
- Add `selectedIds: string[]`, `selectAll()`, `bulkUpdate()`, `bulkDelete()` to `createEntityStore`

### 2C. Excel Upload & Export

- Extend existing `pages/settings/import-export.tsx` (currently a shell with forms but no real backend)
- **Export**: Query Supabase → generate XLSX via `xlsx` library → download
- **Import**: Parse XLSX → validate against Zod schema → upsert to Supabase
- Support entity types: apprentices, contacts, leads, employers, placements, opportunities, tasks, clients, host_employers
- Column mapping UI already partially built

### 2D. Audit Logging Service

- New service: `services/auditService.ts`
- Writes to `audit_logs` and `user_activity_logs` tables on every CUD operation
- Hook into `createEntityStore` — after every `create`, `update`, `remove` call, log the action
- Wire `pages/settings/audit-log.tsx` to read from `audit_logs`

### 2E. AI Usage Tracking

- Hook into AI chat endpoints to record token usage to `ai_usage_metrics`
- Dashboard widget in CRM7 analytics page

### 2F. Customizable Module Visibility

- New settings section: `pages/settings/modules.tsx`
- Org admins can toggle which sidebar modules are visible for their tenant
- Store preferences in `tenants.preferences` JSONB column (add if missing)
- Modules: CRM, GTO/Apprenticeships, Labour Hire, WHS, Financial, Compliance, VET, Communications, Reports
- Sidebar reads tenant preferences and hides/shows accordingly
- Default: all modules visible for `combined` tenant type

### 2G. Power BI Integration (ROADMAP ONLY)

- Add to master roadmap as P3 nice-to-have
- Concept: Supabase → read replica or API → Power BI dataset connector
- Not implemented this phase

---

## Phase 3: CRM7 Page Wiring (mock → Supabase)

CRM7 has 14 entity stores already wired via `createEntityStore`. The gap is that many **pages** use local state or `useContacts()` instead of their store. Fix = swap data source.

### Tier 1 — Core CRM (demo-critical, existing stores)

| Page | Current State | Fix |
|------|--------------|-----|
| `pages/leads/` | Uses `useContacts()` + filters | Rewire to `useLeadStore` (already exists) |
| `pages/contacts/` | Uses `useContacts()` offline hook | Verify store wiring, ensure CRUD persists |
| `pages/opportunities/` | Has data (12 rows), check store usage | Verify wired |
| `pages/tasks/` | Has data (12 rows), check store usage | Verify wired |
| `pages/clients/` | Has data (12 rows), check store usage | Verify wired |
| `pages/placements/` | Has data (12 rows), check store usage | Verify wired |

### Tier 2 — GTO/Apprenticeship (demo-critical, existing stores)

| Page | Fix |
|------|-----|
| `pages/apprentices/` | Verify `useApprenticeStore` wired (15 rows exist) |
| `pages/timesheets/` | Wire `useTimesheetStore` into page |
| `pages/vet/assessments/` | Create `useAssessmentStore`, wire page |
| `pages/vet/training-packages/` | Create `useTrainingPackageStore`, wire page |
| `pages/vet/units/` | Create `useUnitStore`, wire page |
| `pages/competencies/` | Create `useCompetencyStore`, wire page |
| `pages/mentors/` | Create `useMentorStore`, wire page |
| `pages/hosts/` | Verify `useHostEmployerStore` wired |
| `pages/hosts/vacancies/` | Create `useVacancyStore`, wire page |
| `pages/hosts/agreements/` | Create `useHostAgreementStore`, wire page |

### Tier 3 — Financial/Compliance (existing stores + new)

| Page | Fix |
|------|-----|
| `pages/claims/` | Verify `useFundingClaimStore` + `fundingService.ts` wired |
| `pages/funding-sources/` | Verify `useFundingSourceStore` wired |
| `pages/charge-rates/` | Create `useChargeCalculationStore`, wire page |
| `pages/contracts/` | Verify `useContractStore` wired |
| `pages/financial/` | Create stores for `financial_records`, wire budget/invoicing/reports |
| `pages/compliance/` | Create `useComplianceStore`, wire page |
| `pages/gto-compliance/` | Create stores for `gto_*` tables, wire 6 sub-pages |

### Tier 4 — Supporting Features

| Page | Fix |
|------|-----|
| `pages/field-officers/` | Create `useFieldOfficerStore`, wire 4 sub-pages |
| `pages/external-employees/workers/` | Create `useWorkerStore`, wire pages |
| `pages/labour-hire/workers/` | Share `useWorkerStore` |
| `pages/communications/` | Wire `emailService.ts` to page (service already has Supabase CRUD) |
| `pages/reports/` | Create report execution service, wire to `report_*` tables |
| `pages/progress-reviews/` | Create `useProgressReviewStore`, wire page |
| `pages/whs/inspections` | Create inspection stores, wire 3 WHS sub-features |
| WHS workflow components | Wire workflow stores to `workflow_*` tables |
| `pages/settings/audit-log.tsx` | Wire to `audit_logs` table (Phase 2D) |

### New Stores Needed (~15)

```
useAssessmentStore, useTrainingPackageStore, useUnitStore,
useCompetencyStore, useMentorStore, useVacancyStore,
useHostAgreementStore, useChargeCalculationStore,
useComplianceStore, useFieldOfficerStore, useWorkerStore,
useProgressReviewStore, useInspectionStore, useWHSRecordStore,
useFinancialRecordStore
```

All follow the `createEntityStore<T>('table_name')` pattern — each is ~10-20 lines.

---

## Phase 4: Conduit Gap Closure

| Feature | Fix |
|---------|-----|
| Communications page | Add route `(dashboard)/communications/page.tsx`, wire `communicationStore` (store already exists) |
| Documents UI | Add route `(dashboard)/documents/page.tsx`, wire `r7_documents` via new store |
| Compliance page | Already has page + store — verify data persistence |

---

## Phase 5: BSU Gap Closure

| Feature | Fix |
|---------|-----|
| **Idea Hub** (biggest gap) | Build full feature: idea list, detail, create, analytics, launch checklists. 6 DB tables already exist. New pages + stores needed. |
| Billing History | Wire `billing_history` table into `Billing.tsx` page |
| Analytics Dashboard | Wire real data into `Analytics.tsx` (subscription counts, usage stats from `ai_usage_metrics`) |

---

## Phase 6: Seed Data for Demo

Create a comprehensive seed script (`supabase/seed-demo-data.sql`) scoped to "Braden Group" tenant:

- 20 contacts, 10 leads, 8 opportunities, 15 tasks
- 10 apprentices, 5 placements, 3 employers, 3 host employers
- 5 funding claims, 3 funding sources
- 5 assessments, 3 training plans, 10 timesheets
- 5 WHS records, 3 inspections
- 3 email templates
- Sample ideas in BSU
- Sample jobs + candidates in Conduit

This ensures every page has visible data during demos.

---

## Execution Order (priority)

1. **Phase 1A** — Create 4 missing tables (unblocks platform admin)
2. **Phase 1B** — Create Braden Group org + second user
3. **Phase 2A-2B** — Data wipe + bulk operations (cross-cutting, needed by all pages)
4. **Phase 3 Tier 1** — Core CRM wiring (leads, contacts — highest demo impact)
5. **Phase 2C** — Excel import/export (enables data seeding)
6. **Phase 3 Tier 2** — GTO/apprenticeship wiring
7. **Phase 2D** — Audit logging
8. **Phase 3 Tier 3-4** — Financial, compliance, field officers, WHS
9. **Phase 4** — Conduit gaps
10. **Phase 5** — BSU Idea Hub + billing
11. **Phase 6** — Demo seed data
12. **Phase 2F** — Power BI (roadmap only)

---

## Estimated Scope

| Phase | Effort | Files Changed |
|-------|--------|--------------|
| Phase 1 (DB + org) | 1 session | 2 migrations + SQL |
| Phase 2 (data mgmt) | 2-3 sessions | ~10 new/modified files |
| Phase 3 (CRM7 wiring) | 4-6 sessions | ~40 pages + 15 new stores |
| Phase 4 (Conduit) | 1 session | 3 new pages |
| Phase 5 (BSU) | 2-3 sessions | ~8 new pages + stores |
| Phase 6 (seed data) | 1 session | 1 seed script |

**Total: ~12-15 agent sessions**, parallelizable across agents by project (CRM7 / Conduit / BSU).

---

## Resolved Decisions

1. **organizations / organization_members** — Keep for future parent/subsidiary grouping. No action now.
2. **Braden Group tenant_type** — `combined` (full access to all modules)
3. **<braden@braden.com.au> auth** — Email/password for now. MS OAuth fix tracked in Phase 0A.
4. **Demo seed data** — Manual "Load Demo Data" button in settings (Phase 2A data management page)
