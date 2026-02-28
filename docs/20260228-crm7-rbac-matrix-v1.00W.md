# CRM7 RBAC Matrix v1.00W

> Generated 2026-02-28 via automated audit of CRM7 source code.

**Status:** CRITICAL — Permission enforcement is largely non-functional. Two divergent permission systems exist, route-level enforcement is a TODO, and 97% of pages have no permission checks.

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Permission constants defined | 41 (permissions.ts) + 19 (use-permissions.ts) |
| Roles defined | 8 application + 3 platform + 10 portal |
| Pages with permission checks | 3 of 80+ (3.7%) |
| Route-level role enforcement | **TODO** (commented out) |
| Navigation filtering by role | **None** |
| Settings pages protected | **No** |

---

## Two Divergent Permission Systems

### System A: `crm7/src/lib/permissions.ts` (41 permissions)

The "canonical" library with utility functions. Used only by the demo page.

| Category | Permissions |
|----------|-------------|
| Admin (4) | `manage_users`, `manage_roles`, `manage_system`, `manage_organizations` |
| Dashboard (2) | `view_dashboard`, `view_analytics` |
| Apprentices (6) | `view_apprentices`, `manage_apprentices`, `create_apprentice`, `edit_apprentice`, `delete_apprentice`, `archive_apprentice` |
| Hosts (5) | `view_hosts`, `manage_hosts`, `create_host`, `edit_host`, `delete_host` |
| Contracts (5) | `view_contracts`, `manage_contracts`, `create_contract`, `edit_contract`, `delete_contract` |
| Placements (5) | `view_placements`, `manage_placements`, `create_placement`, `edit_placement`, `delete_placement` |
| Timesheets (4) | `view_timesheets`, `manage_timesheets`, `submit_timesheets`, `approve_timesheets` |
| Documents (4) | `view_documents`, `manage_documents`, `upload_document`, `delete_document` |
| Compliance (2) | `view_compliance`, `manage_compliance` |
| Reports (3) | `view_reports`, `generate_report`, `export_data` |
| Financial (2) | `view_financial`, `manage_financial` |
| Employers (2) | `view_employers`, `manage_employers` |
| Inspections (1) | `manage_inspections` |

### System B: `crm7/src/hooks/use-permissions.ts` (19 permissions)

The actual hook used by components. Different permission set, portal-aware.

Portal-specific permissions include: `view_workers`, `approve_timesheets`, `view_charge_rates`, `view_billing`, `manage_training_delivery`, `manage_qualifications`, `manage_assessments`, `view_gto_relationships`, `view_compliance_dashboard`, `manage_payroll`, `view_own_timesheet`, `view_own_training`, `upload_documents`.

### Phantom Permissions (referenced but undefined)

Payroll and Enrichment pages use colon-delimited permissions (`view:award_rates`, `view:timesheets`, etc.) cast with `as any`. These don't exist in either system and always evaluate to `false` for non-privileged users.

---

## Role Hierarchy

### Application Roles (UserRole)

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all 41 permissions |
| `developer` | Full access (platform owner) |
| `organization_admin` | Most permissions except delete/system |
| `field_officer` | View + edit apprentices, approve timesheets, manage inspections |
| `host_employer` | View own workers, approve timesheets, view charges/billing |
| `apprentice` | Self-service: view own timesheets/contracts, submit timesheets |
| `rto_admin` | View apprentices/contracts/compliance/reports, upload documents |
| `free` | View dashboard only |

### Platform Roles

| Role | Behavior |
|------|----------|
| `developer` | Bypasses ALL permission checks, can impersonate tenants |
| `tester` | Bypasses ALL permission checks, free license |
| `user` | Subject to subscription and tenant checks |

Developer detection has hardcoded email fallback: `braden.lang77@gmail.com` and `braden@braden.com.au`.

### Portal Roles

| Role | Portal |
|------|--------|
| `owner`, `admin`, `manager`, `staff`, `field_officer`, `viewer` | Routes by tenant type |
| `training_provider` | Training Provider portal |
| `host_contact` | Host Employer portal |
| `apprentice`, `worker` | Worker portal |

---

## Enforcement Status by Page Category

### UNPROTECTED — No Permission Checks (97% of pages)

**Critical sensitivity (financial/compliance):**
- `/financial/*` — Budget, expenses, invoicing, reports
- `/payroll/award-rates`, `/payroll/timesheets` — Payroll data
- `/charge-rates/*` — Pricing information
- `/claims/*` — Funding claims
- `/compliance/*`, `/gto-compliance/*` — Compliance data
- `/settings/users`, `/settings/permissions`, `/settings/data-management` — Admin functions

**Operational:**
- `/apprentices/*` — Full apprentice CRUD (create, edit, delete)
- `/hosts/*` — Host employer management
- `/contracts/*` — Contract management
- `/placements` — Placement management
- `/documents/*` — Document management with signatures
- `/whs/*` — WHS incidents, inspections, reports

**All other pages** — Dashboard, analytics, reports, leads, pipeline, quotes, calendar, tasks, etc.

### PARTIALLY PROTECTED — UI-only Checks (3 pages)

| Page | Check | Issue |
|------|-------|-------|
| Payroll Hub | `hasPermission()` on feature cards | Uses phantom permissions — always fails for non-privileged |
| Enrichment | `hasPermission()` on feature cards | Uses phantom permissions — always fails for non-privileged |
| Permissions Demo | `can()`/`canAny()`/`canAll()` | Demo page only |

### DATA SHARING CHECKS — Separate System (2 pages)

| Page | Mechanism |
|------|-----------|
| Host Employer Portal | `useSharedData().canSee()` — tenant sharing policies |
| Worker Portal | Portal role conditional UI |

---

## Remediation Priority

1. **Unify permission systems** — Merge System A + B into one canonical source
2. **Implement route-level enforcement** — Complete the TODO in `ProtectedRoute`
3. **Protect settings pages** — Admin-only access for user/role/config management
4. **Filter navigation** — Hide nav items users can't access
5. **Fix phantom permissions** — Replace colon-delimited format with canonical permissions
6. **Verify RLS policies** — Database-level enforcement is the true guard (DRY-ONE-SHOT-ARCHITECTURE.md: "NEVER trust the frontend alone")
7. **Fix role source** — Replace `(user as any)?.role || 'free'` with typed user profile

---

## Data Access Matrix (Planned — from DRY-ONE-SHOT-ARCHITECTURE.md)

The aspirational role hierarchy is: `owner > admin > manager > staff > viewer > free`.

This is documented but NOT yet implemented in code.
