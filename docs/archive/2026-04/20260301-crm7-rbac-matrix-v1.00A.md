# CRM7 RBAC Matrix v1.10W

> Updated 2026-03-02 | Post-deep-audit update (v1.00W → v1.10W)
> Source files: `permissionConstants.ts`, `usePermissions.ts`, all `PermissionGate` usage in pages

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Permission constants defined | 87 across 18 domain groups (unified in `permissionConstants.ts`) |
| Operational roles defined | 15 — org-level: `org_admin`, `org_it_admin`, `executive`, `manager`, `hr`, `payroll`; CRM7: `gto_admin`, `gto_staff`, `field_officer`, `finance`; external: `host_employer`, `training_provider`, `apprentice`; generic: `member`, `viewer` |
| Legacy roles mapped | 6 (`admin`, `owner`, `developer`, `organization_admin`, `rto_admin`, `free`) |
| Platform bypass roles | 2 (`isDeveloper`, `isTester` — bypass all permission checks) |
| Pages with PermissionGate | ~178 of 190+ (93%) |
| Route-level auth enforcement | All via `ProtectedRoute` (requires auth session) |
| Permission hook | `usePermissions()` — single source of truth |
| Nav filtering | Sidebar sections filtered by `section.permission` in `AppSidebar.tsx` |

### Improvements Since v0 (2026-02-28)

- Unified from 2 divergent permission systems into 1 (`permissionConstants.ts` + `usePermissions.ts`)
- All operational roles now have explicit permission maps (was TODO)
- PermissionGate deployed on 90%+ of pages (was 3.7%)
- Legacy role normalisation handles migration from old role strings
- Platform developer/tester bypass integrated

---

## Permission Definitions (87 total across 18 groups)

### Admin (4)

| Permission | Description |
|-----------|-------------|
| `manage_users` | Create, edit, delete users |
| `manage_roles` | Create, edit, delete roles |
| `manage_system` | System configuration, settings |
| `manage_organizations` | Organization management |

### Dashboard (2)

| Permission | Description |
|-----------|-------------|
| `view_dashboard` | View main dashboard |
| `view_analytics` | View analytics page |

### Apprentice (7)

| Permission | Description |
|-----------|-------------|
| `view_apprentices` | View apprentice list and details |
| `manage_apprentices` | Full apprentice management |
| `create_apprentice` | Create new apprentices |
| `edit_apprentice` | Edit existing apprentices |
| `delete_apprentice` | Delete apprentices |
| `archive_apprentice` | Archive apprentices |
| `view_own_training` | View own training records (self-service) |

### Host / Employer (8)

| Permission | Description |
|-----------|-------------|
| `view_hosts` | View host employer list |
| `manage_hosts` | Full host management |
| `create_host` | Create new host employers |
| `edit_host` | Edit host employers |
| `delete_host` | Delete host employers |
| `view_employers` | View employer data |
| `manage_employers` | Manage employers |
| `view_workers` | View worker records |

### Contract (5)

| Permission | Description |
|-----------|-------------|
| `view_contracts` | View contracts |
| `manage_contracts` | Full contract management |
| `create_contract` | Create contracts |
| `edit_contract` | Edit contracts |
| `delete_contract` | Delete contracts |

### Placement (5)

| Permission | Description |
|-----------|-------------|
| `view_placements` | View placements |
| `manage_placements` | Full placement management |
| `create_placement` | Create placements |
| `edit_placement` | Edit placements |
| `delete_placement` | Delete placements |

### Timesheet (5)

| Permission | Description |
|-----------|-------------|
| `view_timesheets` | View timesheets |
| `manage_timesheets` | Full timesheet management |
| `submit_timesheets` | Submit timesheets |
| `approve_timesheets` | Approve timesheets |
| `view_own_timesheet` | View own timesheet only |

### Document (5)

| Permission | Description |
|-----------|-------------|
| `view_documents` | View documents |
| `manage_documents` | Full document management |
| `upload_document` | Upload single document |
| `upload_documents` | Upload multiple documents |
| `delete_document` | Delete documents |

### Compliance (4)

| Permission | Description |
|-----------|-------------|
| `view_compliance` | View compliance records |
| `manage_compliance` | Full compliance management |
| `view_compliance_dashboard` | View compliance dashboard |
| `manage_inspections` | Manage inspections |

### Report (3)

| Permission | Description |
|-----------|-------------|
| `view_reports` | View reports |
| `generate_report` | Generate new reports |
| `export_data` | Export data |

### Financial (5)

| Permission | Description |
|-----------|-------------|
| `view_financial` | View financial data |
| `manage_financial` | Full financial management |
| `view_charge_rates` | View charge rates |
| `view_billing` | View billing information |
| `manage_payroll` | Manage payroll |

### Training (4)

| Permission | Description |
|-----------|-------------|
| `manage_training_delivery` | Manage training delivery |
| `manage_qualifications` | Manage qualifications |
| `manage_assessments` | Manage assessments |
| `view_gto_relationships` | View GTO relationships |

### WHS (4)

| Permission | Description |
|-----------|-------------|
| `view_whs` | View WHS data |
| `manage_whs` | Full WHS management |
| `manage_whs_incidents` | Manage WHS incidents |
| `manage_whs_inspections` | Manage WHS inspections |

### CRM (14)

| Permission | Description |
|-----------|-------------|
| `view_contacts` | View contacts |
| `manage_contacts` | Manage contacts |
| `view_leads` | View leads |
| `manage_leads` | Manage leads |
| `view_deals` | View deals |
| `manage_deals` | Manage deals |
| `view_communications` | View communications |
| `manage_communications` | Manage communications |
| `view_calendar` | View calendar |
| `manage_calendar` | Manage calendar |
| `view_tasks` | View tasks |
| `manage_tasks` | Manage tasks |
| `view_pipeline` | View pipeline |
| `manage_pipeline` | Manage pipeline |

### Field Officer (3)

| Permission | Description |
|-----------|-------------|
| `view_field_officers` | View field officers |
| `manage_field_officers` | Manage field officers |
| `manage_site_assessments` | Manage site assessments |

### People (5)

| Permission | Description |
|-----------|-------------|
| `view_people` | View unified people list |
| `manage_people` | Full people management |
| `create_person` | Create new person |
| `edit_person` | Edit existing person |
| `delete_person` | Delete person |

### Activity (2)

| Permission | Description |
|-----------|-------------|
| `view_activities` | View activities |
| `manage_activities` | Manage activities |

### Performance Review (2)

| Permission | Description |
|-----------|-------------|
| `view_performance_reviews` | View performance reviews |
| `manage_performance_reviews` | Manage performance reviews |

---

## Role-Permission Matrix

Legend: **F** = Full access (all CRUD) | **R** = Read/view only | **-** = No access | **P** = Partial (specific actions only)

### Core Operations

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `manage_users` | F | - | - | - | - | - | - |
| `manage_roles` | F | - | - | - | - | - | - |
| `manage_system` | F | - | - | - | - | - | - |
| `manage_organizations` | F | - | - | - | - | - | - |
| `view_dashboard` | F | F | F | F | F | F | F |
| `view_analytics` | F | F | - | - | - | - | F |

### Apprentice Management

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_apprentices` | F | F | F | F | - | F | F |
| `manage_apprentices` | F | F | - | - | - | - | - |
| `create_apprentice` | F | F | - | - | - | - | - |
| `edit_apprentice` | F | F | P | - | - | - | - |
| `delete_apprentice` | F | - | - | - | - | - | - |
| `archive_apprentice` | F | F | - | - | - | - | - |
| `view_own_training` | F | - | - | - | F | F | - |

### Host / Employer Management

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_hosts` | F | F | F | - | - | - | F |
| `manage_hosts` | F | F | - | - | - | - | - |
| `create_host` | F | F | - | - | - | - | - |
| `edit_host` | F | F | - | - | - | - | - |
| `delete_host` | F | - | - | - | - | - | - |
| `view_employers` | F | F | F | - | - | - | F |
| `manage_employers` | F | F | - | - | - | - | - |
| `view_workers` | F | F | F | F | - | - | - |

### Contracts

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_contracts` | F | F | R | R | R | R | R |
| `manage_contracts` | F | F | - | F | - | F | - |
| `create_contract` | F | F | - | - | - | - | - |
| `edit_contract` | F | F | - | - | - | - | - |
| `delete_contract` | F | - | - | - | - | - | - |

### Placements

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_placements` | F | F | R | R | R | R | - |
| `manage_placements` | F | F | - | - | - | F | - |
| `create_placement` | F | F | - | - | - | - | - |
| `edit_placement` | F | F | - | - | - | - | - |
| `delete_placement` | F | - | - | - | - | - | - |

### Timesheets

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_timesheets` | F | F | R | R | R | - | R |
| `manage_timesheets` | F | F | - | - | - | - | - |
| `submit_timesheets` | F | - | - | - | F | - | - |
| `approve_timesheets` | F | F | F | F | - | - | - |
| `view_own_timesheet` | F | - | - | F | F | - | - |

### Documents

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_documents` | F | F | R | R | R | R | R |
| `manage_documents` | F | F | - | - | - | - | - |
| `upload_document` | F | F | F | F | F | F | F |
| `upload_documents` | F | F | F | F | F | F | F |
| `delete_document` | F | - | - | - | - | - | - |

### Compliance

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_compliance` | F | F | R | - | - | R | - |
| `manage_compliance` | F | F | - | - | - | - | - |
| `view_compliance_dashboard` | F | F | R | R | - | R | - |
| `manage_inspections` | F | F | F | - | - | - | - |

### Reports

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_reports` | F | F | R | R | - | R | F |
| `generate_report` | F | F | - | - | - | - | F |
| `export_data` | F | F | - | - | - | - | F |

### Financial

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_financial` | F | R | - | - | - | - | F |
| `manage_financial` | F | - | - | - | - | - | F |
| `view_charge_rates` | F | R | - | R | - | - | F |
| `view_billing` | F | R | - | R | - | - | F |
| `manage_payroll` | F | - | - | - | - | - | F |

### Training

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `manage_training_delivery` | F | - | - | - | - | F | - |
| `manage_qualifications` | F | - | - | - | - | F | - |
| `manage_assessments` | F | - | - | - | - | F | - |
| `view_gto_relationships` | F | R | - | - | - | F | - |

### WHS

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_whs` | F | F | R | - | - | - | - |
| `manage_whs` | F | F | - | - | - | - | - |
| `manage_whs_incidents` | F | F | F | - | - | - | - |
| `manage_whs_inspections` | F | F | F | - | - | - | - |

### CRM

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_contacts` | F | F | R | - | - | - | - |
| `manage_contacts` | F | F | - | - | - | - | - |
| `view_leads` | F | F | R | - | - | - | - |
| `manage_leads` | F | F | - | - | - | - | - |
| `view_deals` | F | F | - | - | - | - | - |
| `manage_deals` | F | F | - | - | - | - | - |
| `view_communications` | F | F | R | - | - | - | - |
| `manage_communications` | F | F | - | - | - | - | - |
| `view_calendar` | F | F | R | - | - | - | - |
| `manage_calendar` | F | F | - | - | - | - | - |
| `view_tasks` | F | F | R | - | - | - | - |
| `manage_tasks` | F | F | - | - | - | - | - |
| `view_pipeline` | F | F | - | - | - | - | - |
| `manage_pipeline` | F | F | - | - | - | - | - |

### Field Officers

| Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| `view_field_officers` | F | F | R | - | - | - | - |
| `manage_field_officers` | F | F | - | - | - | - | - |
| `manage_site_assessments` | F | F | F | - | - | - | - |

---

## Page Group Access Matrix

Which roles can access which page groups (based on PermissionGate checks).

Legend: **Y** = Has access | **-** = Blocked by PermissionGate

| Page Group | Gate Permission | gto_admin | gto_staff | field_officer | host_employer | apprentice | training_provider | finance |
|-----------|----------------|:---------:|:---------:|:-------------:|:-------------:|:----------:|:-----------------:|:-------:|
| Dashboard | `view_dashboard` | Y | Y | Y | Y | Y | Y | Y |
| Analytics | `view_analytics` | Y | Y | - | - | - | - | Y |
| Contacts | `view_contacts` | Y | Y | Y | - | - | - | - |
| Leads | `view_leads` | Y | Y | Y | - | - | - | - |
| Pipeline / Deals | `view_pipeline` / `view_deals` | Y | Y | - | - | - | - | - |
| Communications | `view_communications` | Y | Y | Y | - | - | - | - |
| Calendar | `view_calendar` | Y | Y | Y | - | - | - | - |
| Tasks | `view_tasks` | Y | Y | Y | - | - | - | - |
| Apprentice Pages | `view_apprentices` | Y | Y | Y | Y | - | Y | Y |
| Create Apprentice | `create_apprentice` | Y | Y | - | - | - | - | - |
| Leave Management | `manage_apprentices` | Y | Y | - | - | - | - | - |
| Hosts | `view_hosts` | Y | Y | Y | - | - | - | Y |
| Create Host | `create_host` | Y | Y | - | - | - | - | - |
| Host Agreements (create) | `manage_hosts` | Y | Y | - | - | - | - | - |
| Contracts | `view_contracts` | Y | Y | Y | Y | Y | Y | Y |
| Create Contract | `manage_contracts` | Y | Y | - | Y | - | Y | - |
| Placements | `view_placements` | Y | Y | Y | Y | Y | Y | - |
| External Employees | `view_workers` | Y | Y | Y | Y | - | - | - |
| Field Officers | `view_field_officers` | Y | Y | Y | - | - | - | - |
| Site Assessment | `manage_site_assessments` | Y | Y | Y | - | - | - | - |
| Timesheets | `view_timesheets` | Y | Y | Y | Y | Y | - | Y |
| Documents | `view_documents` | Y | Y | Y | Y | Y | Y | Y |
| Compliance | `view_compliance` | Y | Y | Y | - | - | Y | - |
| Create Compliance | `manage_compliance` | Y | Y | - | - | - | - | - |
| GTO Compliance | `view_compliance` | Y | Y | Y | - | - | Y | - |
| Standard Assessment | `manage_compliance` | Y | Y | - | - | - | - | - |
| WHS Pages | `view_whs` | Y | Y | Y | - | - | - | - |
| RTW Plans (manage) | `manage_whs` | Y | Y | - | - | - | - | - |
| Progress Reviews | `view_apprentices` | Y | Y | Y | Y | - | Y | Y |
| Financial Pages | `view_financial` | Y | Y | - | - | - | - | Y |
| Financial (manage) | `manage_financial` | Y | - | - | - | - | - | Y |
| Payroll | `manage_payroll` | Y | - | - | - | - | - | Y |
| Charge Rates (view) | `view_charge_rates` | Y | Y | - | Y | - | - | Y |
| Award Rates | `view_charge_rates` | Y | Y | - | Y | - | - | Y |
| Awards Management | `view_financial` | Y | Y | - | - | - | - | Y |
| Claims / Funding | `view_financial` | Y | Y | - | - | - | - | Y |
| Reports | `view_reports` | Y | Y | Y | Y | - | Y | Y |
| Insights | `view_analytics` | Y | Y | - | - | - | - | Y |
| VET Hub | `manage_qualifications` | Y | - | - | - | - | Y | - |
| VET Assessments | `manage_assessments` | Y | - | - | - | - | Y | - |
| Training Packages | `manage_training_delivery` | Y | - | - | - | - | Y | - |
| Training Hub | `manage_training_delivery` | Y | - | - | - | - | Y | - |
| Enrichment | `view_apprentices` | Y | Y | Y | Y | - | Y | Y |
| Mentors | `view_apprentices` | Y | Y | Y | Y | - | Y | Y |
| Competencies | `view_apprentices` | Y | Y | Y | Y | - | Y | Y |
| Skills Matrix | `view_apprentices` | Y | Y | Y | Y | - | Y | Y |
| Settings Hub | `manage_system` | Y | - | - | - | - | - | - |
| User Management | `manage_users` | Y | - | - | - | - | - | - |
| Permissions | `manage_roles` | Y | - | - | - | - | - | - |
| Organization | `manage_organizations` | Y | - | - | - | - | - | - |
| AI Plugins | `manage_system` | Y | - | - | - | - | - | - |
| Workflows | `manage_system` | Y | - | - | - | - | - | - |
| Labour Hire | `view_workers` | Y | Y | Y | Y | - | - | - |
| Notifications | `view_dashboard` | Y | Y | Y | Y | Y | Y | Y |
| Pricing | (no gate) | Y | Y | Y | Y | Y | Y | Y |
| Portal Router | `view_dashboard` | Y | Y | Y | Y | Y | Y | Y |
| Host Employer Portal | `view_hosts` | Y | Y | Y | - | - | - | Y |
| Training Provider Portal | `view_gto_relationships` | Y | Y | - | - | - | Y | - |
| Worker Portal | `view_own_training` | Y | - | - | - | Y | Y | - |
| Workplace Portal | `view_hosts` | Y | Y | Y | - | - | - | Y |

---

## Portal Routing by Tenant Type / Role

The portal router (`portal/index.tsx`) auto-redirects based on tenant type and portal role:

| Portal Role | Redirects To |
|------------|--------------|
| `apprentice` | `/portal/worker` |
| `training_provider` | `/portal/training-provider` |
| `host_employer` | `/portal/host-employer` |

| Tenant Type (for GTO staff) | Redirects To |
|-----------------------------|--------------|
| `rto` | `/portal/training-provider` |
| `host_employer` | `/portal/host-employer` |
| `workplace` | `/portal/workplace` |
| `gto` / `labour_hire` / `combined` | `/dashboard` |

---

## Legacy Role Mapping

The `normalizeRole()` function in `usePermissions.ts` maps legacy database role strings to operational roles:

| Legacy Role | Maps To | Rationale |
|-------------|---------|-----------|
| `admin` | `org_admin` | Full access |
| `owner` / `org_owner` | `org_admin` | Organization owner |
| `developer` | `gto_admin` | Platform devs get full CRM7 access |
| `organization_admin` | `org_it_admin` | IT admin (not full admin) |
| `rto_admin` | `training_provider` | RTO-specific |
| `free` | `viewer` | Minimal access fallback |
| (unknown) | `viewer` | Least privilege default |

---

## Permission Count Summary by Role

| Role | Permission Count | % of Total (87) | Category |
|------|:----------------:|:---------------:|----------|
| `org_admin` | 87 | 100% | Org-level |
| `gto_admin` | 87 | 100% | CRM7 operational |
| `org_it_admin` | ~30 | 34% | Org-level |
| `executive` | ~30 | 34% | Org-level |
| `manager` | ~60 | 69% | Org-level |
| `hr` | ~55 | 63% | Org-level |
| `payroll` | ~21 | 24% | Org-level |
| `gto_staff` | ~60 | 69% | CRM7 operational |
| `field_officer` | ~24 | 28% | CRM7 operational |
| `finance` | ~16 | 18% | CRM7 operational |
| `host_employer` | ~18 | 21% | External portal |
| `training_provider` | ~18 | 21% | External portal |
| `apprentice` | ~10 | 11% | External portal |
| `member` | ~14 | 16% | Generic |
| `viewer` | 1 | 1% | Generic |

---

## Identified Gaps and Risks

### 1. No RLS enforcement validation

PermissionGate is client-side only. Supabase RLS policies must independently enforce the same boundaries. No automated test verifies PermissionGate permissions match RLS policies.

### 2. ~~Missing navigation filtering~~ — RESOLVED (v1.10W)

`AppSidebar.tsx` filters top-level navigation sections using `section.permission` against `usePermissions().can()`. Users only see nav items they are authorised to access. Sub-items within a section are not individually filtered — the section-level gate is sufficient since sub-pages have their own `PermissionGate`.

### 3. ~~`host_employer` cannot see Contacts or Leads~~ — RESOLVED (v1.10W)

`host_employer` now has `view_contacts` for operational coordination with GTO staff. `view_leads` remains excluded (not relevant to host employer workflow).

### 4. `apprentice` role very limited

Apprentice can view contracts, placements, timesheets, and documents, but cannot access any compliance, reporting, or financial pages. This is by design (self-service portal), but should be validated against worker portal UX.

### 5. `gto_staff` lacks `manage_financial`

Staff can view financial data but cannot create/edit financial records, awards, or charge rates. They must escalate to admin for any financial mutations. This may be intentionally restrictive.

### 6. `training_provider` has `manage_contracts` but no `create_contract`

Training providers can manage contracts (edit/approve) but not create them. This seems intentional but should be validated.

### 7. ~~Some pages use old `use-permissions.ts` import~~ — RESOLVED (v1.10W)

`permissions-demo.tsx` and `action-button.tsx` migrated from deprecated `PermissionGuard` to unified `PermissionGate`. All permission checks now use `PermissionGate` from `@/components/common/PermissionGate`.

### 8. Pricing page has no PermissionGate

The pricing page is accessible to all authenticated users regardless of role. This is likely intentional but worth noting.

### 9. `finance` role cannot access WHS, CRM, or field officer pages

Finance role is intentionally narrow — financial data only. If finance staff need to cross-reference apprentice or compliance data, they must switch roles or request escalation.

### 10. Workflow and AI Plugin pages are admin-only

These are gated by `manage_system`, meaning only `gto_admin` / `org_admin` can access. If workflows become operational (e.g., automated compliance alerts), `gto_staff` may need access.

### 11. Deprecated files still exist (backward compat)

The following files are maintained for backward compatibility but should be removed once all consumers are migrated:

- `src/hooks/use-permissions.ts` — re-exports from canonical hook
- `src/lib/permissions.ts` — legacy permission system (478 lines, DRY violation)
- `src/components/auth/permission-guard.tsx` — deprecated component wrapper

### 12. New org-level roles not yet reflected in Role-Permission Matrix tables

The matrix tables above only show the 7 original CRM7 roles. The 8 new org-level roles (`org_admin`, `org_it_admin`, `executive`, `manager`, `hr`, `payroll`, `member`, `viewer`) are defined in `usePermissions.ts` with full permission mappings but not yet reflected in the matrix tables. This is a documentation gap only — the code is correct.
