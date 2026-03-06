# BSuite Unified SSO + Enterprise RBAC

Implement seamless cross-app SSO via shared Supabase cookies on `.crm7.app`, eliminate all legacy per-app login pages, and deploy a 3-tier enterprise RBAC hierarchy with `org_admin` as the primary admin role.

**Decisions confirmed:**

1. braden.com.au admin login stays independent (different TLD, developer-gated)
2. Enterprise tables first, then full stack
3. "Admin" maps to `org_admin`

---

## Phase 1: Fix Conduit Cookie Domain (SSO bug)

Conduit's `@supabase/ssr` clients have **no cookie domain** set. Logging into `suite.crm7.app` then navigating to `conduit.crm7.app` drops the session.

### 1a. `conduit/src/lib/supabase/client.ts`

Add `cookieOptions` with `domain: '.crm7.app'` to `createBrowserClient()`:

```ts
// Before (line 6-14)
return createBrowserClient(url, key, { auth: { flowType: 'pkce' } })

// After
return createBrowserClient(url, key, {
  auth: { flowType: 'pkce' },
  cookieOptions: { domain: '.crm7.app', path: '/', sameSite: 'lax', secure: true },
})
```

### 1b. `conduit/src/lib/supabase/server.ts`

Add `domain: '.crm7.app'` to cookie `options` in `setAll`:

```ts
cookiesToSet.forEach(({ name, value, options }) =>
  cookieStore.set(name, value, { ...options, domain: '.crm7.app' })
)
```

### 1c. `conduit/src/lib/supabase/middleware.ts`

Same for the middleware `setAll` — inject `domain: '.crm7.app'` into cookie options:

```ts
cookiesToSet.forEach(({ name, value, options }) =>
  supabaseResponse.cookies.set(name, value, { ...options, domain: '.crm7.app' })
)
```

---

## Phase 2: Database Migrations (Enterprise + Expanded Roles)

Migrations run against shared Supabase. Use Expand → Migrate → Contract per AGENTS.md.

### 2a. Create `enterprises` table

```sql
CREATE TABLE IF NOT EXISTS public.enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;

-- Link tenants to enterprises (nullable — solo tenants have no enterprise)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS enterprise_id UUID REFERENCES public.enterprises(id);
```

### 2b. Create `enterprise_memberships` table

```sql
CREATE TABLE IF NOT EXISTS public.enterprise_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id UUID NOT NULL REFERENCES public.enterprises(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('enterprise_super_admin', 'enterprise_it_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, enterprise_id)
);

ALTER TABLE public.enterprise_memberships ENABLE ROW LEVEL SECURITY;
```

### 2c. Expand `user_tenants.role` — add new org-level roles

The current `user_tenants` table uses a TEXT column with CHECK constraint (not a Postgres ENUM). We expand the CHECK:

```sql
ALTER TABLE public.user_tenants DROP CONSTRAINT IF EXISTS user_tenants_role_check;
ALTER TABLE public.user_tenants ADD CONSTRAINT user_tenants_role_check
  CHECK (role IN (
    'org_owner', 'org_admin', 'org_it_admin',
    'executive', 'manager', 'hr', 'payroll',
    'gto_admin', 'gto_staff', 'field_officer', 'finance',
    'host_employer', 'training_provider', 'apprentice',
    'member', 'viewer',
    -- Legacy values kept for backward compat during migration
    'owner', 'admin'
  ));

-- Migrate legacy values
UPDATE public.user_tenants SET role = 'org_owner' WHERE role = 'owner';
UPDATE public.user_tenants SET role = 'org_admin' WHERE role = 'admin';
```

### 2d. RLS policies for new tables

```sql
-- enterprises: visible to members of any tenant in the enterprise, or platform devs
CREATE POLICY "Enterprise members can view their enterprise"
  ON public.enterprises FOR SELECT TO authenticated
  USING (
    is_platform_developer(auth.uid())
    OR id IN (
      SELECT t.enterprise_id FROM public.tenants t
      JOIN public.user_tenants ut ON ut.tenant_id = t.id
      WHERE ut.user_id = auth.uid() AND t.enterprise_id IS NOT NULL
    )
  );

-- enterprise_memberships: visible to enterprise members, manageable by enterprise_super_admin
CREATE POLICY "Enterprise members can view memberships"
  ON public.enterprise_memberships FOR SELECT TO authenticated
  USING (
    is_platform_developer(auth.uid())
    OR enterprise_id IN (
      SELECT t.enterprise_id FROM public.tenants t
      JOIN public.user_tenants ut ON ut.tenant_id = t.id
      WHERE ut.user_id = auth.uid() AND t.enterprise_id IS NOT NULL
    )
  );

CREATE POLICY "Enterprise super admins can manage memberships"
  ON public.enterprise_memberships FOR ALL TO authenticated
  USING (
    is_platform_developer(auth.uid())
    OR (enterprise_id IN (
      SELECT enterprise_id FROM public.enterprise_memberships
      WHERE user_id = auth.uid() AND role = 'enterprise_super_admin'
    ))
  );
```

---

## Phase 3: BSU Login — `return_to` Redirect Flow

### 3a. New file: `business-suite-unified/src/lib/redirectTargets.ts`

```ts
export const REDIRECT_TARGETS = {
  crm7: 'https://crm.crm7.app',
  conduit: 'https://conduit.crm7.app',
  r80: 'https://r8.crm7.app',
  suite: 'https://suite.crm7.app',
} as const;

export type AppKey = keyof typeof REDIRECT_TARGETS;

/** Build the full redirect URL, sanitized against the allowlist. */
export function buildReturnUrl(appKey: string | null, returnPath: string | null): string | null {
  if (!appKey) return null;
  const base = REDIRECT_TARGETS[appKey as AppKey];
  if (!base) return null; // Unknown app — refuse to redirect
  const safePath = (returnPath ?? '/').replace(/^\/+/, '/');
  // Block protocol-relative or absolute URL injection
  if (safePath.includes('//') || safePath.includes(':')) return base;
  return `${base}${safePath}`;
}
```

### 3b. Modify `business-suite-unified/src/components/AppContent.tsx`

In `AuthScreen`, read `return_to` and `return_path` from URL query params. After successful login, redirect externally:

```ts
function AuthScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('return_to')
  const returnPath = searchParams.get('return_path')

  const handleSuccess = () => {
    const externalUrl = buildReturnUrl(returnTo, returnPath)
    if (externalUrl) {
      window.location.href = externalUrl // Cross-origin redirect
    } else {
      const from = (location.state as { from?: string })?.from
      navigate(from ?? '/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen neon-theme flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
```

Also update the `/login` route to use `useSearchParams`.

### 3c. BSU AuthContext — pass `return_to` through OAuth flow

In `signInWithOAuth`, preserve `return_to`/`return_path` in the `redirectTo` URL:

```ts
const params = new URLSearchParams()
if (returnTo) params.set('return_to', returnTo)
if (returnPath) params.set('return_path', returnPath)
const redirectTo = `${window.location.origin}/auth/callback?${params.toString()}`
```

And in BSU's `AuthCallback` page, read these params and redirect accordingly after token exchange.

---

## Phase 4: Remove Legacy Login Pages

### 4a. CRM7 — Replace `LoginModal.tsx` + `protected-route.tsx` auth card with BSU redirect

**`crm7/src/components/auth/protected-route.tsx`** — In the `!user` block (lines 119-152 and 241-273), replace the "Authentication Required" card with a redirect to BSU:

```ts
if (!user) {
  const currentPath = window.location.pathname;
  window.location.href = `https://suite.crm7.app/login?return_to=crm7&return_path=${encodeURIComponent(currentPath)}`;
  return <LoadingSpinner />; // Show spinner while redirecting
}
```

Same for `ProtectedLayout`.

**`crm7/src/App.tsx`** — The `MarketingHome` at `/` for unauthenticated users stays (it's the public marketing page). But remove the `LoginModal` import and any references to it.

**`crm7/src/components/LoginModal.tsx`** — Delete file (or gut it to a redirect stub for backward compat if imported elsewhere).

### 4b. Conduit — Replace login/register pages with BSU redirect

**`conduit/src/app/auth/login/page.tsx`** — Replace entire content with:

```tsx
'use client'
import { useEffect } from 'react'

export default function LoginPage() {
  useEffect(() => {
    const returnPath = window.location.pathname
    window.location.href = `https://suite.crm7.app/login?return_to=conduit&return_path=${encodeURIComponent(returnPath)}`
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to Business Suite login...</p>
    </div>
  )
}
```

**`conduit/src/app/auth/register/page.tsx`** — Same redirect pattern (to BSU signup).

**`conduit/src/lib/supabase/middleware.ts`** — Change the unauthenticated redirect (line 40-43) from `/auth/login` to BSU:

```ts
if (!user && !isPublic && request.nextUrl.pathname !== '/') {
  const returnPath = request.nextUrl.pathname
  return NextResponse.redirect(
    `https://suite.crm7.app/login?return_to=conduit&return_path=${encodeURIComponent(returnPath)}`
  )
}
```

**Keep `conduit/src/app/auth/callback/route.ts`** — Still needed for PKCE token exchange.

### 4c. R80.3 — Replace `LoginModal.tsx` with BSU redirect

**`R80.3/src/components/LoginModal.tsx`** — Replace with a redirect component:

```tsx
const LoginModal: React.FC<LoginModalProps> = ({ isOpen }) => {
  useEffect(() => {
    if (isOpen) {
      window.location.href = `https://suite.crm7.app/login?return_to=r80&return_path=${encodeURIComponent(window.location.pathname)}`
    }
  }, [isOpen])

  return isOpen ? <div>Redirecting to Business Suite login...</div> : null
}
```

### 4d. braden — No change

`AdminAuth.tsx` stays. Different TLD, developer-gated.

---

## Phase 5: Update Permission Maps

### 5a. BSU `permissionsService.ts` — Expand `Role` type and `ROLE_PERMISSIONS`

Add new roles to the type:

```ts
export type Role =
  | 'org_owner' | 'org_admin' | 'org_it_admin'
  | 'executive' | 'manager' | 'hr' | 'payroll'
  | 'gto_admin' | 'gto_staff' | 'field_officer' | 'finance'
  | 'host_employer' | 'training_provider' | 'apprentice'
  | 'member' | 'viewer'
  // Legacy aliases
  | 'owner' | 'admin';
```

Add matching permission maps for each new role. Keep legacy `owner`→`org_owner` and `admin`→`org_admin` aliases.

### 5b. CRM7 `permissionConstants.ts` — Add new `OperationalRole` values

```ts
export const ALL_OPERATIONAL_ROLES = [
  'org_admin', 'org_it_admin',
  'executive', 'manager', 'hr', 'payroll',
  'gto_admin', 'gto_staff', 'field_officer',
  'host_employer', 'apprentice', 'training_provider',
  'finance', 'member', 'viewer',
] as const;
```

### 5c. CRM7 `usePermissions.ts` — Add permission maps for new roles

Add `rolePermissions` entries for `org_admin`, `org_it_admin`, `executive`, `manager`, `hr`, `payroll`, `member`, `viewer`.

- `org_admin` → same as current `gto_admin` (all permissions)
- `org_it_admin` → admin + system management, no financial
- `executive` → all view permissions + analytics, no operational write
- `manager` → view + approve + team management, no delete/admin
- `hr` → apprentice/host/compliance/document management
- `payroll` → financial + timesheet + reporting
- `member` → view dashboard + basic CRM
- `viewer` → view dashboard only

### 5d. CRM7 legacy `permissions.ts` — Update `UserRole` to map to new values

```ts
export const UserRole = {
  ORG_ADMIN: 'org_admin',        // was 'admin'
  DEVELOPER: 'developer',
  ORG_IT_ADMIN: 'org_it_admin',  // was 'organization_admin'
  FIELD_OFFICER: 'field_officer',
  HOST_EMPLOYER: 'host_employer',
  APPRENTICE: 'apprentice',
  TRAINING_PROVIDER: 'training_provider', // was 'rto_admin'
  FREE: 'free',
  EXECUTIVE: 'executive',        // new
  MANAGER: 'manager',            // new
  HR: 'hr',                      // new
  PAYROLL: 'payroll',            // new
} as const;
```

---

## Phase 6: Update CRM7 Create User Dialog

### 6a. Find and update the role dropdown

Replace the current 6 flat roles with categorized options:

```
── Internal Roles ──
  Org Admin
  Org IT Admin
  Executive
  Manager
  HR
  Payroll
  GTO Admin
  GTO Staff
  Field Officer
  Finance
  Member
  Viewer

── External Roles ──
  Host Employer
  Training Provider (RTO/TAFE)
  Apprentice
```

`Developer` is NOT in this dropdown — it's a platform role, set via DB migration only.

### 6b. Update BSU `UserManagement.tsx` role options

Same categorized dropdown in BSU's admin panel.

---

## Phase 7: Solo Org ↔ Enterprise Logic

### 7a. New utility: `getEffectiveRole()`

```ts
export function getEffectiveRole(
  orgRole: string,
  enterpriseRole: string | null,
  isSoloOrg: boolean
): string {
  if (isSoloOrg && orgRole === 'org_owner') return 'enterprise_super_admin';
  if (enterpriseRole) return enterpriseRole;
  return orgRole;
}
```

### 7b. Hook into BSU's `usePermissions` and CRM7's `usePermissions`

When checking permissions, call `getEffectiveRole()` to determine the active role. This ensures a solo org_owner sees all admin features without needing an explicit enterprise_memberships row.

---

## Files Affected

### Modified

| File | Change |
|------|--------|
| `conduit/src/lib/supabase/client.ts` | Add `.crm7.app` cookie domain |
| `conduit/src/lib/supabase/server.ts` | Add `.crm7.app` cookie domain |
| `conduit/src/lib/supabase/middleware.ts` | Add cookie domain + redirect to BSU |
| `conduit/src/app/auth/login/page.tsx` | Replace with BSU redirect |
| `conduit/src/app/auth/register/page.tsx` | Replace with BSU redirect |
| `crm7/src/components/auth/protected-route.tsx` | Redirect to BSU when unauthenticated |
| `crm7/src/components/LoginModal.tsx` | Delete or gut to redirect |
| `R80.3/src/components/LoginModal.tsx` | Replace with BSU redirect |
| `business-suite-unified/src/components/AppContent.tsx` | Add return_to handling |
| `business-suite-unified/src/components/AuthForm.tsx` | Pass return_to to onSuccess |
| `business-suite-unified/src/contexts/AuthContext.tsx` | Preserve return_to through OAuth |
| `business-suite-unified/src/lib/permissionsService.ts` | Expand roles + permissions |
| `business-suite-unified/src/pages/Admin/UserManagement.tsx` | New role dropdown |
| `crm7/src/lib/permissionConstants.ts` | Add new roles |
| `crm7/src/hooks/usePermissions.ts` | Add permission maps for new roles |
| `crm7/src/lib/permissions.ts` | Update UserRole values |

### New

| File | Purpose |
|------|---------|
| `business-suite-unified/src/lib/redirectTargets.ts` | Sanitized redirect target registry |
| Migration: `20260303_enterprise_tables.sql` | `enterprises` + `enterprise_memberships` + RLS |
| Migration: `20260303_expand_org_roles.sql` | Expand `user_tenants.role` CHECK constraint |

### Unchanged

| File | Reason |
|------|--------|
| `braden/src/pages/auth/AdminAuth.tsx` | Different TLD, developer-gated |
| `braden/src/hooks/useAdminAuth.ts` | Different TLD, developer-gated |
| `conduit/src/app/auth/callback/route.ts` | Still needed for PKCE exchange |
