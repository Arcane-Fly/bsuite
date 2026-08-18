<!-- G5-VERDICT-BANNER -->
> **VERDICT (DELIVERED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: DELIVERED
>
> The unified role system and the new GTO entity tables specified here are live.
>
> **Evidence, live database `tuybltdrdefjblnplpqo` (2026-08-17):** `apprentices`, `placements`,
> `training_providers`, `user_tenants` and `org_members` all exist in `public`. Host entities
> landed as `host_agreements` / `host_contracts` / `host_charge_rates` rather than a single
> `host_employers` table.
> **Migration:** `crm7/supabase/migrations/20260228000001_gto_foundation_tables.sql`.
>
> **Marker defect:** no version or status marker in the filename, so a delivered plan is
> indistinguishable from an open one at a directory listing.

---

# Reconciliation Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Establish the unified role system, verify Conduit SSO, and create the new CRM7 entities that all subsequent phases depend on.

**Architecture:** Expand the BSU portal role system to include external personas (host_employer, training_provider, apprentice), create a mapping layer in CRM7 that translates portal roles to operational roles, verify Conduit's existing BSU SSO integration, and create the 6 new entity tables needed for GTO operations.

**Tech Stack:** Supabase (migrations, RLS), TypeScript, React, Zod v4, Zustand, Vitest

**Design Doc:** `docs/plans/20260301-reconciliation-sweep-information-flow-design-v1.00W.md`

---

## Task 1: Expand user_tenants Role Constraint

The `user_tenants.role` column currently has a CHECK constraint limiting to `owner, admin, manager, staff, guest`. We need three new external portal roles.

**Files:**

- Create: `crm7/supabase/migrations/20260301200000_expand_user_tenants_roles.sql`

**Step 1: Write the migration**

```sql
-- Expand user_tenants role CHECK constraint to include external portal roles
-- These roles support host employers, training providers, and apprentices
-- accessing scoped portal views without full app access.

-- Drop the existing constraint
ALTER TABLE public.user_tenants
  DROP CONSTRAINT IF EXISTS user_tenants_role_check;

-- Add expanded constraint with new external portal roles
ALTER TABLE public.user_tenants
  ADD CONSTRAINT user_tenants_role_check
  CHECK (role IN (
    -- Internal roles (existing)
    'owner', 'admin', 'manager', 'staff', 'guest',
    -- External portal roles (new)
    'host_employer', 'training_provider', 'apprentice',
    -- Operational roles (CRM7-specific, stored for mapping)
    'field_officer', 'claims_records', 'hr_coordinator', 'finance'
  ));

-- Add comment documenting the role hierarchy
COMMENT ON COLUMN public.user_tenants.role IS
  'Portal role. Internal: owner > admin > manager > staff > guest. '
  'External: host_employer, training_provider, apprentice. '
  'Operational: field_officer, claims_records, hr_coordinator, finance.';
```

**Step 2: Verify migration syntax**

Run: `cd crm7 && cat supabase/migrations/20260301200000_expand_user_tenants_roles.sql`
Expected: File contents match above

**Step 3: Commit**

```bash
cd crm7
git add supabase/migrations/20260301200000_expand_user_tenants_roles.sql
git commit -m "feat(crm7): expand user_tenants role constraint for portal + operational roles"
```

---

## Task 2: Update BSU Permissions Service

Add the three new external roles to BSU's permission matrix so the portal recognizes them.

**Files:**

- Modify: `business-suite-unified/src/lib/permissionsService.ts`
- Test: `business-suite-unified/src/lib/__tests__/permissionsService.test.ts`

**Step 1: Write the failing test**

Create `business-suite-unified/src/lib/__tests__/permissionsService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, isRoleAtLeast, canPerform } from '../permissionsService';

describe('permissionsService', () => {
  describe('ROLE_PERMISSIONS', () => {
    it('includes all internal roles', () => {
      expect(ROLE_PERMISSIONS).toHaveProperty('owner');
      expect(ROLE_PERMISSIONS).toHaveProperty('admin');
      expect(ROLE_PERMISSIONS).toHaveProperty('manager');
      expect(ROLE_PERMISSIONS).toHaveProperty('staff');
      expect(ROLE_PERMISSIONS).toHaveProperty('guest');
    });

    it('includes external portal roles', () => {
      expect(ROLE_PERMISSIONS).toHaveProperty('host_employer');
      expect(ROLE_PERMISSIONS).toHaveProperty('training_provider');
      expect(ROLE_PERMISSIONS).toHaveProperty('apprentice');
    });

    it('host_employer has read permission only', () => {
      expect(ROLE_PERMISSIONS.host_employer).toContain('read');
      expect(ROLE_PERMISSIONS.host_employer).not.toContain('write');
      expect(ROLE_PERMISSIONS.host_employer).not.toContain('admin');
    });

    it('training_provider has read permission only', () => {
      expect(ROLE_PERMISSIONS.training_provider).toContain('read');
      expect(ROLE_PERMISSIONS.training_provider).not.toContain('delete');
    });

    it('apprentice has read permission only', () => {
      expect(ROLE_PERMISSIONS.apprentice).toContain('read');
      expect(ROLE_PERMISSIONS.apprentice).not.toContain('write');
    });
  });

  describe('isRoleAtLeast', () => {
    it('owner is at least manager', () => {
      expect(isRoleAtLeast('owner', 'manager')).toBe(true);
    });

    it('external roles are below guest in hierarchy', () => {
      expect(isRoleAtLeast('host_employer', 'guest')).toBe(false);
      expect(isRoleAtLeast('apprentice', 'guest')).toBe(false);
    });

    it('external roles are at least themselves', () => {
      expect(isRoleAtLeast('host_employer', 'host_employer')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd business-suite-unified && npx vitest run src/lib/__tests__/permissionsService.test.ts`
Expected: FAIL — external roles not in ROLE_PERMISSIONS

**Step 3: Update permissionsService.ts**

Open `business-suite-unified/src/lib/permissionsService.ts` and add:

1. Add external roles to `ROLE_PERMISSIONS`:

```typescript
host_employer: ['read'],
training_provider: ['read'],
apprentice: ['read'],
```

2. Add external roles to the `ROLE_HIERARCHY` array (below `guest`):

```typescript
const ROLE_HIERARCHY = ['owner', 'admin', 'manager', 'staff', 'guest', 'host_employer', 'training_provider', 'apprentice'];
```

3. Export `isRoleAtLeast` and `canPerform` if not already exported.

**Step 4: Run test to verify it passes**

Run: `cd business-suite-unified && npx vitest run src/lib/__tests__/permissionsService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
cd business-suite-unified
git add src/lib/permissionsService.ts src/lib/__tests__/permissionsService.test.ts
git commit -m "feat(bsu): add external portal roles to permissions service"
```

---

## Task 3: CRM7 Role Mapping Layer

Create a mapping service that translates BSU portal roles to CRM7 operational roles. This is per-tenant configurable.

**Files:**

- Create: `crm7/src/lib/roleMappingService.ts`
- Create: `crm7/src/lib/__tests__/roleMappingService.test.ts`

**Step 1: Write the failing test**

Create `crm7/src/lib/__tests__/roleMappingService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  mapPortalRoleToOperational,
  DEFAULT_ROLE_MAPPING,
  type PortalRole,
  type OperationalRole,
} from '../roleMappingService';

describe('roleMappingService', () => {
  describe('DEFAULT_ROLE_MAPPING', () => {
    it('maps owner to gto_admin', () => {
      expect(DEFAULT_ROLE_MAPPING.owner).toBe('gto_admin');
    });

    it('maps admin to gto_admin', () => {
      expect(DEFAULT_ROLE_MAPPING.admin).toBe('gto_admin');
    });

    it('maps manager to field_officer', () => {
      expect(DEFAULT_ROLE_MAPPING.manager).toBe('field_officer');
    });

    it('maps external roles directly', () => {
      expect(DEFAULT_ROLE_MAPPING.host_employer).toBe('host_employer');
      expect(DEFAULT_ROLE_MAPPING.training_provider).toBe('training_provider');
      expect(DEFAULT_ROLE_MAPPING.apprentice).toBe('apprentice');
    });
  });

  describe('mapPortalRoleToOperational', () => {
    it('uses default mapping when no tenant override', () => {
      expect(mapPortalRoleToOperational('owner')).toBe('gto_admin');
    });

    it('uses tenant override when provided', () => {
      const override = { admin: 'field_officer' as OperationalRole };
      expect(mapPortalRoleToOperational('admin', override)).toBe('field_officer');
    });

    it('falls back to default for roles not in override', () => {
      const override = { admin: 'field_officer' as OperationalRole };
      expect(mapPortalRoleToOperational('owner', override)).toBe('gto_admin');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd crm7 && npx vitest run src/lib/__tests__/roleMappingService.test.ts`
Expected: FAIL — module not found

**Step 3: Implement roleMappingService.ts**

Create `crm7/src/lib/roleMappingService.ts`:

```typescript
/**
 * Maps BSU portal roles to CRM7 operational roles.
 * Default mapping can be overridden per-tenant via tenant settings.
 */

export type PortalRole =
  | 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'guest'
  | 'host_employer' | 'training_provider' | 'apprentice';

export type OperationalRole =
  | 'gto_admin' | 'gto_staff' | 'field_officer' | 'claims_records'
  | 'hr_coordinator' | 'finance' | 'host_employer' | 'training_provider'
  | 'apprentice' | 'viewer';

export const DEFAULT_ROLE_MAPPING: Record<PortalRole, OperationalRole> = {
  owner: 'gto_admin',
  admin: 'gto_admin',
  manager: 'field_officer',
  member: 'gto_staff',
  viewer: 'viewer',
  guest: 'viewer',
  host_employer: 'host_employer',
  training_provider: 'training_provider',
  apprentice: 'apprentice',
};

/**
 * Map a BSU portal role to a CRM7 operational role.
 * @param portalRole - The user's role from BSU (user_tenants.role)
 * @param tenantOverrides - Optional per-tenant mapping overrides from tenant settings
 */
export function mapPortalRoleToOperational(
  portalRole: PortalRole,
  tenantOverrides?: Partial<Record<PortalRole, OperationalRole>>,
): OperationalRole {
  if (tenantOverrides && portalRole in tenantOverrides) {
    return tenantOverrides[portalRole]!;
  }
  return DEFAULT_ROLE_MAPPING[portalRole] ?? 'viewer';
}
```

**Step 4: Run test to verify it passes**

Run: `cd crm7 && npx vitest run src/lib/__tests__/roleMappingService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
cd crm7
git add src/lib/roleMappingService.ts src/lib/__tests__/roleMappingService.test.ts
git commit -m "feat(crm7): add portal-to-operational role mapping service"
```

---

## Task 4: Verify Conduit BSU SSO

Conduit already has BSU SSO inline in its login page using `NEXT_PUBLIC_BSU_OAUTH_CLIENT_ID`. Verify it works and ensure the shared cookie is configured.

**Files:**

- Read: `conduit/src/app/auth/login/page.tsx` (verify OAuth flow)
- Read: `conduit/src/app/auth/callback/route.ts` (verify code exchange)
- Modify: `conduit/src/lib/supabase/client.ts` (verify shared cookie domain if needed)

**Step 1: Verify login page has BSU OAuth**

Run: `grep -n 'BSU_OAUTH\|bsu_url\|oauth/consent' conduit/src/app/auth/login/page.tsx`
Expected: Lines showing BSU OAuth client ID and redirect to BSU consent screen

**Step 2: Verify callback handles BSU OAuth code exchange**

Run: `grep -n 'code\|exchangeCode\|bs_oauth\|access_token' conduit/src/app/auth/callback/route.ts`
Expected: Lines showing authorization code exchange

**Step 3: Verify PKCE is configured (already done in Wave 0)**

Run: `grep -n 'flowType' conduit/src/lib/supabase/client.ts conduit/src/lib/supabase/server.ts conduit/src/lib/supabase/middleware.ts`
Expected: `flowType: 'pkce'` in all three files

**Step 4: Check if Conduit needs shared cookie domain**

Conduit uses `@supabase/ssr` which manages cookies server-side. For `.crm7.app` cookie sharing, the middleware needs to set cookies with `domain=.crm7.app`. Check current state:

Run: `grep -n 'domain\|crm7.app\|cookie' conduit/src/lib/supabase/middleware.ts`

If no `.crm7.app` domain is set, the cookie will default to `conduit.crm7.app` which means SSO won't share with BSU/CRM7. This may need a follow-up task to add `getCookieDomain()` logic to the Conduit middleware cookie options.

**Step 5: Document findings**

If SSO is fully working: no changes needed, just document.
If cookie domain needs fixing: create a follow-up task.

**Step 6: Commit any findings as a comment in the design doc or code**

```bash
# Only if changes were made
git add -A && git commit -m "fix(conduit): [describe fix]"
```

---

## Task 5: New CRM7 Entity Migrations

Create 6 new tables for GTO operations: training_providers, rto_assignments, site_inspections, training_schedules, escalation_log, welfare_reports.

**Files:**

- Create: `crm7/supabase/migrations/20260301200100_create_training_providers.sql`
- Create: `crm7/supabase/migrations/20260301200200_create_rto_assignments.sql`
- Create: `crm7/supabase/migrations/20260301200300_create_site_inspections.sql`
- Create: `crm7/supabase/migrations/20260301200400_create_training_schedules.sql`
- Create: `crm7/supabase/migrations/20260301200500_create_escalation_log.sql`
- Create: `crm7/supabase/migrations/20260301200600_create_welfare_reports.sql`

**Step 1: Create training_providers migration**

```sql
-- Training providers (RTOs) — internal or external
-- GTOs blend between RTOs based on qualification scope and location.
-- A GTO uses many RTOs; an RTO serves many GTOs.

CREATE TABLE IF NOT EXISTS public.training_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  rto_code TEXT,                         -- National RTO identifier
  provider_type TEXT NOT NULL DEFAULT 'external'
    CHECK (provider_type IN ('internal', 'external', 'tafe')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address_line1 TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  website TEXT,
  -- Scope: what qualifications this RTO can deliver
  qualification_scope JSONB DEFAULT '[]'::jsonb,  -- Array of qualification codes
  -- Scope: where this RTO operates
  location_scope JSONB DEFAULT '[]'::jsonb,       -- Array of regions/postcodes
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_providers_tenant_isolation" ON public.training_providers
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

CREATE INDEX idx_training_providers_tenant ON public.training_providers(tenant_id);
CREATE INDEX idx_training_providers_rto_code ON public.training_providers(rto_code);
CREATE INDEX idx_training_providers_status ON public.training_providers(status);
```

**Step 2: Create rto_assignments migration**

```sql
-- Per-apprentice RTO assignment
-- Links an apprentice to their specific training provider
-- based on their qualification and location.

CREATE TABLE IF NOT EXISTS public.rto_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  apprentice_id UUID NOT NULL,
  training_provider_id UUID NOT NULL,
  qualification_id UUID,
  placement_id UUID,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'transferred', 'cancelled')),
  assignment_reason TEXT,            -- Why this RTO (e.g. "internal scope", "nearest TAFE")
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rto_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rto_assignments_tenant_isolation" ON public.rto_assignments
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

CREATE INDEX idx_rto_assignments_tenant ON public.rto_assignments(tenant_id);
CREATE INDEX idx_rto_assignments_apprentice ON public.rto_assignments(apprentice_id);
CREATE INDEX idx_rto_assignments_provider ON public.rto_assignments(training_provider_id);
CREATE INDEX idx_rto_assignments_status ON public.rto_assignments(status);
```

**Step 3: Create site_inspections migration**

```sql
-- Site inspections — pre-placement and periodic (every 4-6 weeks)
-- GTO must inspect host sites before placing an apprentice
-- and periodically during the placement.

CREATE TABLE IF NOT EXISTS public.site_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  host_site_id UUID,                   -- FK to host_sites
  host_employer_id UUID NOT NULL,      -- FK to clients (type=host)
  placement_id UUID,                   -- NULL for pre-placement inspections
  inspector_id UUID NOT NULL,          -- The field officer who conducted
  inspection_type TEXT NOT NULL
    CHECK (inspection_type IN ('pre_placement', 'periodic', 'follow_up', 'complaint_response')),
  inspection_date DATE NOT NULL,
  next_due_date DATE,                  -- 4-6 weeks from inspection_date
  result TEXT NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pass', 'fail', 'conditional', 'pending')),
  -- Checklist items stored as JSONB for flexibility
  checklist JSONB DEFAULT '[]'::jsonb,
  findings TEXT,
  corrective_actions TEXT,
  corrective_deadline DATE,
  photos JSONB DEFAULT '[]'::jsonb,    -- Array of storage URLs
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_inspections_tenant_isolation" ON public.site_inspections
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

CREATE INDEX idx_site_inspections_tenant ON public.site_inspections(tenant_id);
CREATE INDEX idx_site_inspections_host ON public.site_inspections(host_employer_id);
CREATE INDEX idx_site_inspections_placement ON public.site_inspections(placement_id);
CREATE INDEX idx_site_inspections_inspector ON public.site_inspections(inspector_id);
CREATE INDEX idx_site_inspections_next_due ON public.site_inspections(next_due_date);
```

**Step 4: Create training_schedules migration**

```sql
-- Training schedule entries — set by RTO, consumed by host and field officer
-- These represent blocks of training an apprentice must attend.
-- Hosts need to know when apprentices will be absent.

CREATE TABLE IF NOT EXISTS public.training_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  apprentice_id UUID NOT NULL,
  rto_assignment_id UUID,              -- Which RTO assignment this relates to
  training_provider_id UUID,
  block_name TEXT,                     -- e.g. "Block 1 - Semester 1 2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,                       -- Where training is held
  delivery_mode TEXT DEFAULT 'face_to_face'
    CHECK (delivery_mode IN ('face_to_face', 'online', 'mixed', 'workplace')),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  host_notified BOOLEAN DEFAULT false,
  host_notified_at TIMESTAMPTZ,
  reschedule_reason TEXT,              -- If rescheduled, why
  reschedule_requested_by TEXT,        -- 'apprentice', 'host', 'rto', 'gto'
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_schedules_tenant_isolation" ON public.training_schedules
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

CREATE INDEX idx_training_schedules_tenant ON public.training_schedules(tenant_id);
CREATE INDEX idx_training_schedules_apprentice ON public.training_schedules(apprentice_id);
CREATE INDEX idx_training_schedules_dates ON public.training_schedules(start_date, end_date);
CREATE INDEX idx_training_schedules_status ON public.training_schedules(status);
```

**Step 5: Create escalation_log migration**

```sql
-- Escalation log — tracks the discipline/escalation chain per placement
-- Day-to-day discipline: host → field officer escalation → GTO internal chain
-- Unions audit this — must be documented per-placement.

CREATE TABLE IF NOT EXISTS public.escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  placement_id UUID NOT NULL,
  apprentice_id UUID NOT NULL,
  reported_by UUID NOT NULL,           -- User who raised the escalation
  reported_by_role TEXT,               -- 'host_employer', 'field_officer', 'apprentice', etc.
  escalation_level INT NOT NULL DEFAULT 1
    CHECK (escalation_level BETWEEN 1 AND 5),
  -- Level 1: informal discussion (host)
  -- Level 2: field officer involved
  -- Level 3: GTO office manager
  -- Level 4: GTO GM / senior management
  -- Level 5: formal disciplinary / termination proceedings
  category TEXT NOT NULL
    CHECK (category IN (
      'performance', 'attendance', 'conduct', 'safety',
      'bullying', 'discrimination', 'substance', 'other'
    )),
  summary TEXT NOT NULL,
  details TEXT,
  action_taken TEXT,
  outcome TEXT,
  outcome_date DATE,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  attachments JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalation_log_tenant_isolation" ON public.escalation_log
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

CREATE INDEX idx_escalation_log_tenant ON public.escalation_log(tenant_id);
CREATE INDEX idx_escalation_log_placement ON public.escalation_log(placement_id);
CREATE INDEX idx_escalation_log_apprentice ON public.escalation_log(apprentice_id);
CREATE INDEX idx_escalation_log_category ON public.escalation_log(category);
CREATE INDEX idx_escalation_log_resolved ON public.escalation_log(is_resolved);
```

**Step 6: Create welfare_reports migration**

```sql
-- Welfare reports — confidential channel for apprentices to report
-- safety concerns, bullying, discrimination directly to GTO.
-- CRITICAL: Host employer CANNOT see reports flagged as confidential.
-- This is enforced at the RLS level, not just UI.

CREATE TABLE IF NOT EXISTS public.welfare_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  apprentice_id UUID NOT NULL,         -- Who is reporting
  placement_id UUID,                   -- Which placement context
  reported_by UUID NOT NULL,           -- auth.uid() of reporter
  category TEXT NOT NULL
    CHECK (category IN (
      'safety', 'bullying', 'harassment', 'discrimination',
      'welfare', 'mental_health', 'substance', 'other'
    )),
  is_confidential BOOLEAN NOT NULL DEFAULT true,
  -- When confidential: invisible to host_employer and training_provider roles
  summary TEXT NOT NULL,
  details TEXT,
  -- Investigation tracking
  assigned_to UUID,                    -- Field officer or HR coordinator
  investigation_status TEXT DEFAULT 'new'
    CHECK (investigation_status IN (
      'new', 'assigned', 'investigating', 'action_taken', 'resolved', 'referred'
    )),
  investigation_notes TEXT,            -- GTO-internal only
  action_taken TEXT,
  outcome TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  -- External referrals (e.g. to support services)
  external_referral BOOLEAN DEFAULT false,
  referral_details TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welfare_reports ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation for internal GTO users
CREATE POLICY "welfare_reports_tenant_isolation" ON public.welfare_reports
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

-- CRITICAL: Block host_employer and training_provider from seeing confidential reports
-- This policy DENIES access when:
-- 1. The report is confidential AND
-- 2. The user's role is host_employer or training_provider
CREATE POLICY "welfare_reports_confidential_block" ON public.welfare_reports
  AS RESTRICTIVE
  FOR SELECT
  USING (
    NOT (
      is_confidential = true
      AND EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = welfare_reports.tenant_id
          AND ut.role IN ('host_employer', 'training_provider')
      )
    )
  );

-- Apprentices can only see their own reports
CREATE POLICY "welfare_reports_apprentice_own" ON public.welfare_reports
  AS RESTRICTIVE
  FOR SELECT
  USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = welfare_reports.tenant_id
          AND ut.role = 'apprentice'
      )
      AND reported_by != auth.uid()
    )
  );

CREATE INDEX idx_welfare_reports_tenant ON public.welfare_reports(tenant_id);
CREATE INDEX idx_welfare_reports_apprentice ON public.welfare_reports(apprentice_id);
CREATE INDEX idx_welfare_reports_status ON public.welfare_reports(investigation_status);
CREATE INDEX idx_welfare_reports_confidential ON public.welfare_reports(is_confidential);
CREATE INDEX idx_welfare_reports_assigned ON public.welfare_reports(assigned_to);
```

**Step 7: Verify all 6 migration files exist**

Run: `ls -la crm7/supabase/migrations/20260301200*.sql | wc -l`
Expected: 7 (6 new + the role constraint from Task 1)

**Step 8: Commit all migrations**

```bash
cd crm7
git add supabase/migrations/20260301200100_create_training_providers.sql \
        supabase/migrations/20260301200200_create_rto_assignments.sql \
        supabase/migrations/20260301200300_create_site_inspections.sql \
        supabase/migrations/20260301200400_create_training_schedules.sql \
        supabase/migrations/20260301200500_create_escalation_log.sql \
        supabase/migrations/20260301200600_create_welfare_reports.sql
git commit -m "feat(crm7): add GTO operations tables — training providers, inspections, escalation, welfare"
```

---

## Task 5b: Entity-Scoping RLS Policies + Configurable Permissions Table

External parties (host_employer, training_provider, apprentice) should only see records related to them — not all records in the tenant. Internal permissions (who can update wages, charges) should be configurable per-tenant.

**Files:**

- Create: `crm7/supabase/migrations/20260301200700_entity_scoping_rls.sql`
- Create: `crm7/supabase/migrations/20260301200800_create_tenant_role_permissions.sql`

**Step 1: Create entity-scoping RLS migration**

This adds RESTRICTIVE policies to key tables so external roles only see related records:

```sql
-- Entity-level scoping for external portal roles.
-- Layer 2: Beyond tenant isolation, external parties only see records related to them.
-- host_employer → only apprentices placed with them
-- training_provider → only apprentices assigned to them via rto_assignments
-- apprentice → only own records

-- HOST EMPLOYER scoping for site_inspections (sees own sites only)
CREATE POLICY "site_inspections_host_scoped" ON public.site_inspections
  AS RESTRICTIVE FOR SELECT USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = site_inspections.tenant_id
          AND ut.role = 'host_employer'
      )
      AND host_employer_id NOT IN (
        SELECT utl.linked_entity_id FROM public.user_tenant_links utl
        WHERE utl.user_id = auth.uid() AND utl.link_type = 'host_employer'
      )
    )
  );

-- TRAINING PROVIDER scoping for rto_assignments (sees own assignments only)
CREATE POLICY "rto_assignments_provider_scoped" ON public.rto_assignments
  AS RESTRICTIVE FOR SELECT USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = rto_assignments.tenant_id
          AND ut.role = 'training_provider'
      )
      AND training_provider_id NOT IN (
        SELECT utl.linked_entity_id FROM public.user_tenant_links utl
        WHERE utl.user_id = auth.uid() AND utl.link_type = 'training_provider'
      )
    )
  );

-- TRAINING PROVIDER scoping for training_schedules
CREATE POLICY "training_schedules_provider_scoped" ON public.training_schedules
  AS RESTRICTIVE FOR SELECT USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = training_schedules.tenant_id
          AND ut.role = 'training_provider'
      )
      AND training_provider_id NOT IN (
        SELECT utl.linked_entity_id FROM public.user_tenant_links utl
        WHERE utl.user_id = auth.uid() AND utl.link_type = 'training_provider'
      )
    )
  );

-- APPRENTICE scoping for escalation_log (sees own only)
CREATE POLICY "escalation_log_apprentice_scoped" ON public.escalation_log
  AS RESTRICTIVE FOR SELECT USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = escalation_log.tenant_id
          AND ut.role = 'apprentice'
      )
      AND reported_by != auth.uid()
      AND apprentice_id NOT IN (
        SELECT utl.linked_entity_id FROM public.user_tenant_links utl
        WHERE utl.user_id = auth.uid() AND utl.link_type = 'apprentice'
      )
    )
  );

-- HOST EMPLOYER scoping for escalation_log (sees non-confidential, own placement only)
CREATE POLICY "escalation_log_host_scoped" ON public.escalation_log
  AS RESTRICTIVE FOR SELECT USING (
    NOT (
      EXISTS (
        SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = escalation_log.tenant_id
          AND ut.role = 'host_employer'
      )
      AND placement_id NOT IN (
        SELECT p.id FROM public.apprentice_placements p
        JOIN public.user_tenant_links utl ON utl.linked_entity_id = p.host_employer_id
        WHERE utl.user_id = auth.uid() AND utl.link_type = 'host_employer'
      )
    )
  );

-- user_tenant_links: maps a user to the entity they represent
-- e.g. host employer user linked to their client/host record
CREATE TABLE IF NOT EXISTS public.user_tenant_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  link_type TEXT NOT NULL
    CHECK (link_type IN ('host_employer', 'training_provider', 'apprentice')),
  linked_entity_id UUID NOT NULL,  -- FK to clients/training_providers/apprentices
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tenant_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tenant_links_own" ON public.user_tenant_links
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX idx_user_tenant_links_unique
  ON public.user_tenant_links(user_id, tenant_id, link_type, linked_entity_id);
CREATE INDEX idx_user_tenant_links_entity
  ON public.user_tenant_links(linked_entity_id);
```

**Step 2: Create tenant_role_permissions migration**

```sql
-- Configurable internal permissions per-tenant.
-- Layer 3: Org admins configure which operational roles can perform
-- which actions on which entities. Overrides defaults from roleMappingService.
-- Managed in Organisation Settings → Permissions section.

CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role TEXT NOT NULL,              -- operational role (gto_admin, field_officer, etc.)
  entity TEXT NOT NULL,            -- entity name (charge_rates, payroll, funding_claims, etc.)
  actions TEXT[] NOT NULL DEFAULT ARRAY['read'],
  -- Valid actions: read, create, update, delete, approve, export
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_role_permissions_unique UNIQUE (tenant_id, role, entity)
);

ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_role_permissions_tenant_isolation" ON public.tenant_role_permissions
  USING (tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid()
  ));

-- Only owner/admin can modify permission config
CREATE POLICY "tenant_role_permissions_admin_write" ON public.tenant_role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = tenant_role_permissions.tenant_id
        AND ut.role IN ('owner', 'admin')
    )
  );

CREATE INDEX idx_tenant_role_permissions_lookup
  ON public.tenant_role_permissions(tenant_id, role);

COMMENT ON TABLE public.tenant_role_permissions IS
  'Per-tenant configurable permissions. Overrides default role→action mapping. '
  'Managed by org admins in Organisation Settings → Permissions.';
```

**Step 3: Verify both migration files**

Run: `ls -la crm7/supabase/migrations/20260301200[78]*.sql`
Expected: 2 files

**Step 4: Commit**

```bash
cd crm7
git add supabase/migrations/20260301200700_entity_scoping_rls.sql \
        supabase/migrations/20260301200800_create_tenant_role_permissions.sql
git commit -m "feat(crm7): add entity-scoping RLS for external roles + configurable permissions table"
```

---

## Task 6: Zod Schemas for New Entities

Create Zod v4 validation schemas for all 6 new entities.

**Files:**

- Create: `crm7/src/schemas/trainingProvider.ts`
- Create: `crm7/src/schemas/rtoAssignment.ts`
- Create: `crm7/src/schemas/siteInspection.ts`
- Create: `crm7/src/schemas/trainingSchedule.ts`
- Create: `crm7/src/schemas/escalation.ts`
- Create: `crm7/src/schemas/welfareReport.ts`
- Modify: `crm7/src/schemas/index.ts` (add barrel exports)
- Create: `crm7/src/schemas/__tests__/newEntities.test.ts`

**Step 1: Write the failing test**

Create `crm7/src/schemas/__tests__/newEntities.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  trainingProviderSchema,
  rtoAssignmentSchema,
  siteInspectionSchema,
  trainingScheduleSchema,
  escalationSchema,
  welfareReportSchema,
} from '../index';

describe('new entity schemas', () => {
  it('trainingProviderSchema validates valid provider', () => {
    const result = trainingProviderSchema.safeParse({
      name: 'South Metro TAFE',
      provider_type: 'tafe',
      rto_code: '52787',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('trainingProviderSchema rejects invalid provider_type', () => {
    const result = trainingProviderSchema.safeParse({
      name: 'Test',
      provider_type: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('rtoAssignmentSchema validates valid assignment', () => {
    const result = rtoAssignmentSchema.safeParse({
      apprentice_id: '00000000-0000-0000-0000-000000000001',
      training_provider_id: '00000000-0000-0000-0000-000000000002',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('siteInspectionSchema validates valid inspection', () => {
    const result = siteInspectionSchema.safeParse({
      host_employer_id: '00000000-0000-0000-0000-000000000001',
      inspector_id: '00000000-0000-0000-0000-000000000002',
      inspection_type: 'pre_placement',
      inspection_date: '2026-03-01',
      result: 'pass',
    });
    expect(result.success).toBe(true);
  });

  it('trainingScheduleSchema validates valid schedule', () => {
    const result = trainingScheduleSchema.safeParse({
      apprentice_id: '00000000-0000-0000-0000-000000000001',
      start_date: '2026-03-15',
      end_date: '2026-03-19',
      delivery_mode: 'face_to_face',
      status: 'scheduled',
    });
    expect(result.success).toBe(true);
  });

  it('escalationSchema validates valid escalation', () => {
    const result = escalationSchema.safeParse({
      placement_id: '00000000-0000-0000-0000-000000000001',
      apprentice_id: '00000000-0000-0000-0000-000000000002',
      reported_by: '00000000-0000-0000-0000-000000000003',
      escalation_level: 2,
      category: 'attendance',
      summary: 'Repeated lateness to site',
    });
    expect(result.success).toBe(true);
  });

  it('escalationSchema rejects level > 5', () => {
    const result = escalationSchema.safeParse({
      placement_id: '00000000-0000-0000-0000-000000000001',
      apprentice_id: '00000000-0000-0000-0000-000000000002',
      reported_by: '00000000-0000-0000-0000-000000000003',
      escalation_level: 6,
      category: 'conduct',
      summary: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('welfareReportSchema validates valid report', () => {
    const result = welfareReportSchema.safeParse({
      apprentice_id: '00000000-0000-0000-0000-000000000001',
      reported_by: '00000000-0000-0000-0000-000000000001',
      category: 'bullying',
      is_confidential: true,
      summary: 'Experiencing workplace bullying from supervisor',
    });
    expect(result.success).toBe(true);
  });

  it('welfareReportSchema defaults is_confidential to true', () => {
    const result = welfareReportSchema.safeParse({
      apprentice_id: '00000000-0000-0000-0000-000000000001',
      reported_by: '00000000-0000-0000-0000-000000000001',
      category: 'safety',
      summary: 'Unsafe equipment on site',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_confidential).toBe(true);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd crm7 && npx vitest run src/schemas/__tests__/newEntities.test.ts`
Expected: FAIL — schemas not exported from index

**Step 3: Create all 6 schema files**

Each schema should follow the pattern established by existing schemas in the project (e.g. `crm7/src/schemas/award.ts`). Use Zod v4 (`import { z } from 'zod'`).

See the migration SQL for exact field names, types, and constraints. Each schema should have:

- A `create` schema (for form validation — required fields only)
- A `full` schema (for DB records — includes id, tenant_id, timestamps)
- Exported as `{entity}Schema` (the create schema) and `{entity}FullSchema`

**Step 4: Update barrel exports**

Add all 6 schemas to `crm7/src/schemas/index.ts`:

```typescript
export { trainingProviderSchema } from './trainingProvider';
export { rtoAssignmentSchema } from './rtoAssignment';
export { siteInspectionSchema } from './siteInspection';
export { trainingScheduleSchema } from './trainingSchedule';
export { escalationSchema } from './escalation';
export { welfareReportSchema } from './welfareReport';
```

**Step 5: Run test to verify it passes**

Run: `cd crm7 && npx vitest run src/schemas/__tests__/newEntities.test.ts`
Expected: PASS — all 9 tests

**Step 6: Commit**

```bash
cd crm7
git add src/schemas/trainingProvider.ts src/schemas/rtoAssignment.ts \
        src/schemas/siteInspection.ts src/schemas/trainingSchedule.ts \
        src/schemas/escalation.ts src/schemas/welfareReport.ts \
        src/schemas/index.ts src/schemas/__tests__/newEntities.test.ts
git commit -m "feat(crm7): add Zod v4 schemas for GTO operations entities"
```

---

## Task 7: Update Parent Repo & Push

**Step 1: Stage submodule updates**

```bash
cd /home/braden/Desktop/Dev/bsuite
git add crm7 business-suite-unified
git commit -m "chore: update submodules — Phase 1 role unification + GTO entity tables"
```

**Step 2: Push all**

```bash
cd crm7 && git push origin development
cd ../business-suite-unified && git push origin development
cd .. && git push origin development
```

---

## Phase 2 Preview (Future Plan)

After Phase 1 is complete, Phase 2 covers:

- Task 9: Request/mediation workflow engine (generic)
- Task 10: Conduit custom fields infrastructure
- Task 11: BSU Field Sharing admin panel
- Task 12: External portal views (host, RTO, apprentice) — uses `user_tenant_links` from Task 5b
- Task 13: Org identity migration (CRM7 → BSU)
- Task 14: Notification flows (training schedule → host alerts)
- Task 15: BSU auth UI upgrade — add Google + MS social login (CRM7 as reference)
- Task 16: Organisation Settings → Permissions UI (reads/writes `tenant_role_permissions` from Task 5b)
- Task 17: Field officer workload partitioning (filters + optional `assigned_to` columns)

These will be planned in a separate document after Phase 1 is reviewed.
