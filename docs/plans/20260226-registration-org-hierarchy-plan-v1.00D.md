# Registration & Organization Hierarchy

Wire up multi-tenant registration with a 4-tier hierarchy (Platform → Enterprise → Division → Team), domain-based auto-join (as viewer, elevated roles need admin approval), and both self-service org creation and invite/domain-match join paths.

---

## Current State (Gaps)

- `tenants` table exists but has **0 rows** — no tenant ever created
- `user_tenants` exists (user_id, tenant_id, role) — no entries
- Auth trigger `create_user_profile` only inserts into `profiles` — **no tenant logic**
- No `allowed_domains` column, no `parent_tenant_id`, no `tenant_invitations` table
- CRM7 `register.tsx` hits dead `/api/auth/register` endpoint
- BSU AuthContext falls back to `user_id` as tenant_id (single-user hack)

---

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Hierarchy model | **4-tier**: Platform → Enterprise → Division → Team + Locations |
| Domain auto-join | **Auto-join as viewer**; elevated roles require admin approval |
| First signup | **Both paths**: org setup wizard OR invite/domain-match join |
| Platform level | Dev/support super-admin — can impersonate, view audit trail |

---

## Phase 1: Database Schema Migration

### 1.1 Alter `tenants` table

```sql
ALTER TABLE tenants
  ADD COLUMN parent_tenant_id uuid REFERENCES tenants(id),
  ADD COLUMN tier text NOT NULL DEFAULT 'enterprise'
    CHECK (tier IN ('platform', 'enterprise', 'division', 'team', 'location')),
  ADD COLUMN allowed_domains text[] DEFAULT '{}',
  ADD COLUMN join_policy text NOT NULL DEFAULT 'domain_auto'
    CHECK (join_policy IN ('open', 'domain_auto', 'invite_only')),
  ADD COLUMN logo_url text,
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id);
```

- `parent_tenant_id` — self-referencing FK for hierarchy tree
- `tier` — which level: platform, enterprise, division, team, location
- `allowed_domains` — e.g. `{'braden.com.au', 'bradengroup.com'}`
- `join_policy` — controls whether org creation toggle is per-tenant
- `owner_user_id` — the user who created/owns this tenant

### 1.2 Create `tenant_invitations` table

```sql
CREATE TABLE tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id),
  token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(tenant_id, email)
);
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;
```

### 1.3 Create `membership_requests` table (for approval flow)

```sql
CREATE TABLE membership_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  requested_role text NOT NULL DEFAULT 'staff',
  current_role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, status)
);
ALTER TABLE membership_requests ENABLE ROW LEVEL SECURITY;
```

### 1.4 Create `platform_admin_sessions` table (impersonation audit)

```sql
CREATE TABLE platform_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_tenant_id uuid NOT NULL REFERENCES tenants(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  actions_taken jsonb DEFAULT '[]',
  reason text
);
ALTER TABLE platform_admin_sessions ENABLE ROW LEVEL SECURITY;
```

### 1.5 Update auth trigger — auto-assign tenant on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_domain text;
  v_tenant_id uuid;
BEGIN
  -- Extract domain from email
  v_domain := split_part(NEW.email, '@', 2);
  
  -- Find a tenant with matching allowed_domains
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE v_domain = ANY(allowed_domains)
    AND status = 'active'
  ORDER BY tier ASC  -- prefer enterprise over division
  LIMIT 1;
  
  IF v_tenant_id IS NOT NULL THEN
    -- Auto-join as viewer
    INSERT INTO user_tenants (user_id, tenant_id, role, status)
    VALUES (NEW.id, v_tenant_id, 'viewer', 'active')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Also check for pending invitations
  INSERT INTO user_tenants (user_id, tenant_id, role, status, invited_by)
  SELECT NEW.id, ti.tenant_id, ti.role, 'active', ti.invited_by
  FROM tenant_invitations ti
  WHERE ti.email = NEW.email AND ti.status = 'pending'
    AND ti.expires_at > now()
  ON CONFLICT DO NOTHING;
  
  -- Mark invitations as accepted
  UPDATE tenant_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE email = NEW.email AND status = 'pending';
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_tenant();
```

### 1.6 RLS Policies

- `tenant_invitations`: tenant admins/owners can CRUD; invited user can read their own
- `membership_requests`: user can create for self; tenant admins can read/update
- `platform_admin_sessions`: only platform admins can read/write
- Existing `user_tenants` policies should already be correct

### 1.7 Seed the platform tenant

```sql
-- Create the platform-level tenant (Braden dev/support)
INSERT INTO tenants (name, slug, tier, status, allowed_domains, join_policy)
VALUES ('bsuite Platform', 'platform', 'platform', 'active', '{}', 'invite_only');
```

---

## Phase 2: Edge Function — Tenant Management

Create `tenant-management` edge function with actions:

| Action | Description |
|--------|-------------|
| `create-org` | Create enterprise tenant + set caller as owner |
| `create-division` | Create division under enterprise |
| `create-team` | Create team under division |
| `create-location` | Create location under any tier |
| `invite-user` | Create invitation + send email via email-dispatcher |
| `request-role-upgrade` | Submit role upgrade request |
| `approve-request` | Admin approves/denies role upgrade |
| `list-hierarchy` | Return full org tree for an enterprise |
| `update-tenant` | Update tenant settings, domains, join policy |
| `impersonate-start` | Platform admin starts session (audit logged) |
| `impersonate-end` | Platform admin ends session |

---

## Phase 3: Frontend — Post-Signup Flow

### 3.1 Org Setup Wizard (CRM7 + BSU)

Show after first login when user has no `user_tenants` entry:

1. **Step 1 — Welcome**: "You're not part of any organization yet"
2. **Step 2 — Choose path**: "Join an existing org (enter invite code)" OR "Create a new organization"
3. **Step 3a — Create org**: Company name, industry, ABN, allowed domains (auto-suggest from user's email domain)
4. **Step 3b — Join via invite**: Paste invite token
5. **Step 4 — Invite team** (create path only): Enter emails of initial team members
6. **Step 5 — Done**: Redirect to dashboard

### 3.2 Tenant Settings Page — Org Management

New tab in Settings or standalone page:

- **Hierarchy tree view**: Visual tree of Enterprise → Divisions → Teams → Locations
- **Create sub-org buttons**: "Add Division", "Add Team", "Add Location"
- **Domain management**: Add/remove allowed domains
- **Join policy toggle**: Domain auto-join / invite-only
- **Member list per org level**: Role, status, last active
- **Pending requests**: Approve/deny role upgrade requests
- **Invitation management**: Send, revoke, resend invitations

### 3.3 Platform Admin Panel (BSU only)

- **Tenant browser**: List all enterprises with member counts
- **Impersonate button**: Start session (logged), switch context
- **Audit trail**: Show platform_admin_sessions per tenant
- **Create tenant**: Manual tenant creation for support

### 3.4 Fix CRM7 Registration

- Replace dead `/api/auth/register` endpoint with `supabase.auth.signUp()`
- After signup, trigger checks domain → auto-join or show org wizard

---

## Phase 4: Role Hierarchy Enforcement

### Role levels (ascending privilege)
```
viewer < staff < manager < admin < owner < platform_admin
```

### Rules
- **viewer**: Read-only access (auto-join default)
- **staff**: CRUD on assigned records
- **manager**: CRUD + team management + reporting
- **admin**: Full tenant management + invite + approve roles
- **owner**: All admin + billing + delete tenant + transfer ownership
- **platform_admin**: Cross-tenant access, impersonation, system settings

### Data visibility
- **Enterprise** admins/owners see all data across divisions/teams
- **Division** users see only their division + child teams
- **Team** users see only their team's data
- RLS enforced via a `get_visible_tenant_ids(user_id)` function that walks the hierarchy

---

## Phase 5: RLS Helper — Hierarchy-Aware Visibility

```sql
CREATE OR REPLACE FUNCTION get_visible_tenant_ids(p_user_id uuid)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_tenant_ids uuid[];
  v_role text;
BEGIN
  -- Get all tenants the user belongs to
  SELECT array_agg(tenant_id), max(role) INTO v_tenant_ids, v_role
  FROM user_tenants
  WHERE user_id = p_user_id AND status = 'active';
  
  -- If admin/owner, include all child tenants
  IF v_role IN ('admin', 'owner', 'platform_admin') THEN
    WITH RECURSIVE tree AS (
      SELECT id FROM tenants WHERE id = ANY(v_tenant_ids)
      UNION ALL
      SELECT t.id FROM tenants t JOIN tree ON t.parent_tenant_id = tree.id
    )
    SELECT array_agg(id) INTO v_tenant_ids FROM tree;
  END IF;
  
  -- Platform admin sees everything
  IF v_role = 'platform_admin' THEN
    SELECT array_agg(id) INTO v_tenant_ids FROM tenants;
  END IF;
  
  RETURN COALESCE(v_tenant_ids, '{}');
END;
$$;
```

---

## Implementation Order

| # | Task | Priority | Est. |
|---|------|----------|------|
| 1 | DB migration (alter tenants + new tables + trigger + RLS) | High | 1 session |
| 2 | Seed platform tenant + add your user as platform_admin | High | Quick |
| 3 | Edge function: `tenant-management` | High | 1 session |
| 4 | Fix CRM7 register.tsx (use supabase.auth.signUp) | High | Quick |
| 5 | Post-signup org wizard component | High | 1 session |
| 6 | Tenant settings — hierarchy tree + domain management | Medium | 1 session |
| 7 | Invitation flow (send + accept + email) | Medium | 1 session |
| 8 | Role upgrade request/approval UI | Medium | 0.5 session |
| 9 | Platform admin impersonation + audit panel | Low | 1 session |
| 10 | RLS helper `get_visible_tenant_ids` + update existing policies | High | 1 session |

**Total: ~7-8 sessions**

---

## Files to Create/Modify

### Create
| File | Description |
|------|-------------|
| `supabase migration` | Schema changes (Phase 1) |
| `supabase/functions/tenant-management/index.ts` | Edge function (Phase 2) |
| `crm7/src/components/onboarding/OrgSetupWizard.tsx` | Post-signup org creation (Phase 3.1) |
| `crm7/src/pages/settings/organization.tsx` | Org hierarchy management (Phase 3.2) |
| `crm7/src/services/tenantService.ts` | Frontend service layer for tenant management |
| `crm7/src/stores/tenantStore.ts` | Zustand store for tenant state |

### Modify
| File | Changes |
|------|---------|
| `crm7/src/pages/auth/register.tsx` | Replace dead API call with supabase.auth.signUp |
| `crm7/src/contexts/AuthContext.tsx` | Add tenant context, remove user_id fallback |
| `crm7/src/App.tsx` | Add org wizard gate (like onboarding wizard) |
| `business-suite-unified/src/pages/Admin/TenantManagement.tsx` | Wire to real tables, add impersonation |
| `business-suite-unified/src/contexts/AuthContext.tsx` | Add tenant hierarchy awareness |
