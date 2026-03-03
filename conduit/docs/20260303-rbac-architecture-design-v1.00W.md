# Conduit RBAC Architecture Design

**Version:** 1.00W
**Date:** 2026-03-03
**Status:** Working
**Phase:** 8C
**Applies to:** Conduit ATS

---

## Overview

Conduit implements role-based access control (RBAC) with a two-tier model: **portal roles** (shared across BSuite) map to **Conduit operational roles**, which resolve to **fine-grained permissions** for ATS-specific actions.

---

## Architecture Layers

```
┌──────────────────────────────────────────────────────┐
│  BSuite Portal Layer (user_tenants.role)              │
│  owner | admin | manager | staff | guest              │
│  host_employer | training_provider | apprentice       │
├──────────────────────────────────────────────────────┤
│  Conduit Mapping Layer (roleMappingService.ts)        │
│  mapPortalRoleToConduit() + optional tenant overrides │
├──────────────────────────────────────────────────────┤
│  Conduit Operational Roles                            │
│  conduit_admin | recruiter | hiring_manager           │
│  employer | candidate | viewer                        │
├──────────────────────────────────────────────────────┤
│  Permission Resolution (permissionConstants.ts)       │
│  69 fine-grained permissions across 12 domains        │
├──────────────────────────────────────────────────────┤
│  UI Enforcement                                       │
│  usePermissions() hook + PermissionGate component     │
│  Server enforcement via middleware.ts                 │
└──────────────────────────────────────────────────────┘
```

---

## Portal → Conduit Role Mapping

| Portal Role | Conduit Role | Rationale |
|-------------|-------------|-----------|
| `owner` | `conduit_admin` | Full ATS + settings access |
| `admin` | `conduit_admin` | Full ATS + settings access |
| `manager` | `recruiter` | Manage recruitment pipeline |
| `staff` | `recruiter` | Manage recruitment pipeline |
| `guest` | `viewer` | Read-only access |
| `host_employer` | `employer` | View placed candidates |
| `training_provider` | `viewer` | Read-only access |
| `apprentice` | `candidate` | Self-service portal |

**Extensibility:** `mapPortalRoleToConduit()` accepts optional `tenantOverrides` to customise mapping per tenant (e.g., promoting a `guest` to `hiring_manager` for a specific workspace).

---

## Permission Domains (69 total)

| Domain | Permissions | Count |
|--------|------------|-------|
| Candidates | view, manage, create, edit, delete | 5 |
| Jobs | view, manage, create, edit, delete, distribute | 6 |
| Pipeline | view, manage, move_candidates | 3 |
| Offers | view, manage, create, approve | 4 |
| Interviews | view, manage, schedule | 3 |
| Onboarding | view, manage, create_template | 3 |
| Compliance | view, manage | 2 |
| Analytics | view, export | 2 |
| Talent Pools | view, manage | 2 |
| Communications | view, manage | 2 |
| AI | use_ai_assistant | 1 |
| Settings/Admin | view_settings, manage_settings, manage_users, manage_roles | 4 |

---

## Role → Permission Matrix

| Permission | Admin | Recruiter | Hiring Mgr | Employer | Candidate | Viewer |
|-----------|:-----:|:---------:|:----------:|:--------:|:---------:|:------:|
| view_candidates | Y | Y | Y | Y | - | Y |
| manage_candidates | Y | Y | - | - | - | - |
| view_jobs | Y | Y | Y | Y | Y | Y |
| manage_jobs | Y | Y | - | - | - | - |
| view_pipeline | Y | Y | Y | Y | - | Y |
| move_candidates | Y | Y | Y | - | - | - |
| view_offers | Y | Y | Y | Y | Y | Y |
| approve_offer | Y | Y | - | - | - | - |
| schedule_interview | Y | Y | Y | - | - | - |
| view_analytics | Y | Y | - | - | - | Y |
| export_analytics | Y | Y | - | - | - | - |
| use_ai_assistant | Y | Y | Y | - | - | - |
| manage_settings | Y | - | - | - | - | - |
| manage_users | Y | - | - | - | - | - |
| manage_roles | Y | - | - | - | - | - |

---

## Implementation Files

### Permission Constants

**File:** `src/lib/permissionConstants.ts`

Defines the `Permission` type as a union of 69 string literals and exports `ALL_PERMISSIONS` array for admin role assignment.

### Role Mapping Service

**File:** `src/lib/roleMappingService.ts`

- `PortalRole` type matching DB CHECK constraint on `user_tenants.role`
- `ConduitRole` type for ATS-specific operational roles
- `DEFAULT_ROLE_MAPPING` record
- `mapPortalRoleToConduit(portalRole, tenantOverrides?)` function

### usePermissions Hook

**File:** `src/hooks/usePermissions.ts`

Provides reactive permission checking in components:

```typescript
const { can, canAny, canAll, cannot, role, permissions, loading } = usePermissions()

if (can('manage_candidates')) { /* render admin UI */ }
if (canAny(['view_jobs', 'manage_jobs'])) { /* show jobs section */ }
```

Also exports pure functions for non-React contexts:
- `checkPermission(role, permission)` → boolean
- `checkAnyPermission(role, permissions)` → boolean
- `checkAllPermissions(role, permissions)` → boolean
- `getPermissionsForRole(role)` → Permission[]

### PermissionGate Component

**File:** `src/components/common/PermissionGate.tsx`

Declarative UI guard:

```tsx
<PermissionGate permission="manage_users">
  <AdminPanel />
</PermissionGate>

<PermissionGate permissions={['view_jobs', 'manage_jobs']} require="any">
  <JobsSidebar />
</PermissionGate>
```

Props:
- `permission` — single permission check
- `permissions` + `require` — multi-permission check ("any" or "all")
- `fallback` — alternative content when access denied
- `showAccessDenied` — render AccessDenied alert component

### Middleware

**File:** `src/lib/supabase/middleware.ts`

Server-side route protection:
- `ROUTE_PERMISSIONS` — maps routes to required permissions
- `WRITE_ROUTE_PATTERNS` — pattern matching for write operations (e.g., `/candidates/new` → `create_candidate`)
- Unauthenticated users redirected to `/login`
- Unauthorized users redirected to dashboard

---

## Security Model

1. **Defense in depth:** Middleware checks on the server, hook checks on the client, RLS policies on the database
2. **Principle of least privilege:** Roles start with no permissions; each is explicitly granted
3. **Tenant isolation:** `r7_current_tenant_id()` PostgreSQL function enforces RLS on all `r7_*` tables
4. **No client trust:** Client-side `PermissionGate` is for UX only; actual enforcement is server-side middleware + Supabase RLS

---

## Testing Strategy

| Layer | Test Type | File |
|-------|----------|------|
| Permission resolution | Unit | `src/hooks/__tests__/usePermissions.test.ts` |
| UI gating | Component | `src/components/common/__tests__/PermissionGate.test.tsx` |
| Route protection | Integration | `src/lib/supabase/__tests__/middleware.test.ts` |

Tests cover all 6 role combinations, permission boundary conditions, and loading states.
