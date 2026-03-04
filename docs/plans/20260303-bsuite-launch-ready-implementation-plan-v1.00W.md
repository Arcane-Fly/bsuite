# BSuite Launch-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Make BSuite launch-ready by hiding broken features, fixing critical stubs, adding feature flag infrastructure, and replacing fake data with real data or proper empty states.

**Architecture:** Feature flags stored as JSONB in `tenant_settings` table, gated via `useFeatureFlags()` hook. Navigation items hidden via the existing data-driven `navigation.ts` config. Broken CRUD replaced with honest empty states or disabled UI. All changes are additive — no features deleted, only hidden behind flags.

**Tech Stack:** React + Vite, Supabase (Postgres + RLS), wouter router, shadcn/ui + Radix, React Query (TanStack), Zustand, Zod, Vitest

**Design Doc:** `docs/plans/20260303-bsuite-launch-ready-design-v1.00D.md`

---

## Phase 0: Feature Flag Infrastructure

### Task 1: Add Feature Flags Hook

**Files:**
- Create: `crm7/src/hooks/useFeatureFlags.ts`
- Modify: `crm7/src/hooks/useTenantSettings.ts` (add `feature_flags` to TenantSettings type)
- Test: `crm7/src/hooks/__tests__/useFeatureFlags.test.ts`

**Context:** The `useTenantSettings` hook (at `crm7/src/hooks/useTenantSettings.ts`) reads from the `tenant_settings` Supabase table. The `TenantSettings` interface has `enterprise_cost_only_mode?: boolean` and an index signature `[key: string]: unknown`. We'll add a `feature_flags` JSONB field.

**Step 1: Write the failing test**

Create `crm7/src/hooks/__tests__/useFeatureFlags.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureFlags, useFeatureFlag, LAUNCH_FLAGS } from '../useFeatureFlags';

// Mock useTenantSettings
vi.mock('../useTenantSettings', () => ({
  useTenantSettings: vi.fn(),
}));

import { useTenantSettings } from '../useTenantSettings';

const mockUseTenantSettings = vi.mocked(useTenantSettings);

describe('useFeatureFlags', () => {
  it('returns default flags when tenant_settings has no feature_flags', () => {
    mockUseTenantSettings.mockReturnValue({
      data: { tenant_id: 't1' },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantSettings>);

    const { result } = renderHook(() => useFeatureFlags());

    // All launch-hidden features should be OFF by default
    expect(result.current.flags.email_integration).toBe(false);
    expect(result.current.flags.sms_integration).toBe(false);
    expect(result.current.flags.vet_assessments).toBe(false);
    expect(result.current.flags.report_generation).toBe(false);
    expect(result.current.flags.user_management_crud).toBe(false);
    expect(result.current.flags.portal_pages).toBe(false);
    expect(result.current.flags.whs_module).toBe(false);

    // Core features should be ON by default
    expect(result.current.flags.people_crud).toBe(true);
    expect(result.current.flags.contacts_crud).toBe(true);
    expect(result.current.flags.ai_assistant).toBe(true);
  });

  it('merges DB flags over defaults', () => {
    mockUseTenantSettings.mockReturnValue({
      data: {
        tenant_id: 't1',
        feature_flags: { email_integration: true, people_crud: false },
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantSettings>);

    const { result } = renderHook(() => useFeatureFlags());

    expect(result.current.flags.email_integration).toBe(true); // overridden
    expect(result.current.flags.people_crud).toBe(false); // overridden
    expect(result.current.flags.sms_integration).toBe(false); // default
  });

  it('returns isLoading while tenant settings are loading', () => {
    mockUseTenantSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useTenantSettings>);

    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current.isLoading).toBe(true);
  });
});

describe('useFeatureFlag', () => {
  it('returns single flag value', () => {
    mockUseTenantSettings.mockReturnValue({
      data: { tenant_id: 't1', feature_flags: { ai_assistant: false } },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantSettings>);

    const { result } = renderHook(() => useFeatureFlag('ai_assistant'));
    expect(result.current).toBe(false);
  });

  it('returns default when flag not in DB', () => {
    mockUseTenantSettings.mockReturnValue({
      data: { tenant_id: 't1' },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTenantSettings>);

    const { result } = renderHook(() => useFeatureFlag('dark_mode'));
    expect(result.current).toBe(true); // default is true
  });
});

describe('LAUNCH_FLAGS', () => {
  it('exports the default flag configuration', () => {
    expect(LAUNCH_FLAGS).toBeDefined();
    expect(typeof LAUNCH_FLAGS.people_crud).toBe('boolean');
    expect(typeof LAUNCH_FLAGS.email_integration).toBe('boolean');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd crm7 && pnpm vitest run src/hooks/__tests__/useFeatureFlags.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `crm7/src/hooks/useFeatureFlags.ts`:

```typescript
import { useMemo } from 'react';
import { useTenantSettings } from './useTenantSettings';

/**
 * Default feature flags for launch.
 *
 * TRUE = feature is visible to users.
 * FALSE = feature is hidden behind a flag (not ready for launch).
 *
 * These defaults apply when no tenant_settings.feature_flags override exists.
 * To enable a hidden feature for a specific tenant, set its flag to true
 * in the tenant_settings.feature_flags JSONB column.
 */
export const LAUNCH_FLAGS = {
  // Core features — always on
  people_crud: true,
  contacts_crud: true,
  host_employers: true,
  charge_rates: true,
  claims: true,
  compliance: true,
  tasks: true,
  dashboard: true,

  // Launch features — on by default
  ai_assistant: true,
  boot_engine: true,
  gto_standards: true,
  dark_mode: true,
  training_contracts: true,
  field_officers: true,
  leads_pipeline: true,
  deals_pipeline: true,

  // Not ready for launch — hidden by default
  email_integration: false,
  sms_integration: false,
  vet_assessments: false,
  report_generation: false,
  user_management_crud: false,
  portal_pages: false,
  whs_module: false,
  financial_dashboard: false,
  document_upload: false,
  settings_configuration: false,
  settings_permissions: false,
  settings_integrations: false,
  notification_settings: false,
  calendar_module: false,
  invoicing: false,
  payroll: false,
  timesheets: false,
  custom_reports: false,
  advanced_whs_reports: false,
} as const;

export type FeatureFlagKey = keyof typeof LAUNCH_FLAGS;
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

/**
 * Returns all feature flags, merging DB overrides over defaults.
 *
 * Usage:
 * ```tsx
 * const { flags, isLoading } = useFeatureFlags();
 * if (flags.ai_assistant) { ... }
 * ```
 */
export function useFeatureFlags() {
  const { data: settings, isLoading, error } = useTenantSettings();

  const flags = useMemo<FeatureFlags>(() => {
    const dbFlags = (settings?.feature_flags ?? {}) as Partial<FeatureFlags>;
    return { ...LAUNCH_FLAGS, ...dbFlags };
  }, [settings?.feature_flags]);

  return { flags, isLoading, error };
}

/**
 * Returns a single feature flag value.
 *
 * Usage:
 * ```tsx
 * const canUseAI = useFeatureFlag('ai_assistant');
 * ```
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { flags } = useFeatureFlags();
  return flags[key];
}
```

**Step 4: Update TenantSettings type**

In `crm7/src/hooks/useTenantSettings.ts`, add to the `TenantSettings` interface:

```typescript
feature_flags?: Partial<Record<string, boolean>>;
```

**Step 5: Run test to verify it passes**

Run: `cd crm7 && pnpm vitest run src/hooks/__tests__/useFeatureFlags.test.ts`
Expected: PASS — all tests green

**Step 6: Commit**

```bash
git add crm7/src/hooks/useFeatureFlags.ts crm7/src/hooks/__tests__/useFeatureFlags.test.ts crm7/src/hooks/useTenantSettings.ts
git commit -m "feat(crm7): add feature flag system with launch defaults"
```

---

### Task 2: Create FeatureGate Component

**Files:**
- Create: `crm7/src/components/common/FeatureGate.tsx`
- Test: `crm7/src/components/common/__tests__/FeatureGate.test.tsx`

**Context:** A wrapper component that conditionally renders children based on feature flags. Used to gate UI elements like nav items, buttons, and page sections.

**Step 1: Write the failing test**

Create `crm7/src/components/common/__tests__/FeatureGate.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGate } from '../FeatureGate';

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(),
}));

import { useFeatureFlag } from '@/hooks/useFeatureFlags';
const mockUseFeatureFlag = vi.mocked(useFeatureFlag);

describe('FeatureGate', () => {
  it('renders children when flag is true', () => {
    mockUseFeatureFlag.mockReturnValue(true);

    render(
      <FeatureGate flag="ai_assistant">
        <div>AI Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('AI Content')).toBeDefined();
  });

  it('renders nothing when flag is false', () => {
    mockUseFeatureFlag.mockReturnValue(false);

    render(
      <FeatureGate flag="email_integration">
        <div>Email Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Email Content')).toBeNull();
  });

  it('renders fallback when flag is false and fallback is provided', () => {
    mockUseFeatureFlag.mockReturnValue(false);

    render(
      <FeatureGate flag="email_integration" fallback={<div>Not Available</div>}>
        <div>Email Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Email Content')).toBeNull();
    expect(screen.getByText('Not Available')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd crm7 && pnpm vitest run src/components/common/__tests__/FeatureGate.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `crm7/src/components/common/FeatureGate.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useFeatureFlag, type FeatureFlagKey } from '@/hooks/useFeatureFlags';

interface FeatureGateProps {
  flag: FeatureFlagKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on a feature flag.
 *
 * Usage:
 * ```tsx
 * <FeatureGate flag="ai_assistant">
 *   <AIPanel />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback}</>;
}
```

**Step 4: Run test to verify it passes**

Run: `cd crm7 && pnpm vitest run src/components/common/__tests__/FeatureGate.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add crm7/src/components/common/FeatureGate.tsx crm7/src/components/common/__tests__/FeatureGate.test.tsx
git commit -m "feat(crm7): add FeatureGate wrapper component"
```

---

### Task 3: Gate Navigation Items with Feature Flags

**Files:**
- Modify: `crm7/src/config/navigation.ts` (add `featureFlag` field to nav items)
- Modify: `crm7/src/components/layout/AppSidebar.tsx` (filter by feature flag)
- Test: `crm7/src/config/__tests__/navigation-flags.test.ts`

**Context:** The navigation config at `crm7/src/config/navigation.ts` defines 16 top-level sections in `SHARED_SECTIONS`. Each section has optional `permission` for RBAC. We need to add an optional `featureFlag` field so sections can be hidden when their feature flag is off.

**Step 1: Write the failing test**

Create `crm7/src/config/__tests__/navigation-flags.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SHARED_SECTIONS } from '../navigation';
import { LAUNCH_FLAGS } from '@/hooks/useFeatureFlags';

describe('navigation feature flags', () => {
  it('all referenced feature flags exist in LAUNCH_FLAGS', () => {
    for (const section of SHARED_SECTIONS) {
      if (section.featureFlag) {
        expect(
          section.featureFlag in LAUNCH_FLAGS,
          `Section "${section.label}" references unknown flag "${section.featureFlag}"`
        ).toBe(true);
      }
    }
  });

  it('WHS section has featureFlag: whs_module', () => {
    const whs = SHARED_SECTIONS.find(s => s.label === 'WHS & Compliance');
    expect(whs?.featureFlag).toBe('whs_module');
  });

  it('Communication section has featureFlag: email_integration', () => {
    const comms = SHARED_SECTIONS.find(s => s.label === 'Communication');
    expect(comms?.featureFlag).toBe('email_integration');
  });

  it('VET & Training section has featureFlag: vet_assessments', () => {
    const vet = SHARED_SECTIONS.find(s => s.label === 'VET & Training');
    expect(vet?.featureFlag).toBe('vet_assessments');
  });

  it('Portal section has featureFlag: portal_pages', () => {
    const portal = SHARED_SECTIONS.find(s => s.label === 'Portal');
    expect(portal?.featureFlag).toBe('portal_pages');
  });

  it('Dashboard section has no featureFlag (always visible)', () => {
    const dashboard = SHARED_SECTIONS.find(s => s.label === 'Dashboard');
    expect(dashboard?.featureFlag).toBeUndefined();
  });

  it('People section has no featureFlag (always visible)', () => {
    const people = SHARED_SECTIONS.find(s => s.label === 'People');
    expect(people?.featureFlag).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd crm7 && pnpm vitest run src/config/__tests__/navigation-flags.test.ts`
Expected: FAIL — `featureFlag` property doesn't exist

**Step 3: Add featureFlag field to navigation config**

In `crm7/src/config/navigation.ts`, add `featureFlag?: string` to the `SharedNavSection` type (or equivalent), then add the flag to each section that should be hidden:

```typescript
// Add to the SharedNavSection type/interface:
featureFlag?: string;

// Add featureFlag to these sections in SHARED_SECTIONS:
// WHS & Compliance → featureFlag: 'whs_module'
// Communication → featureFlag: 'email_integration'
// VET & Training → featureFlag: 'vet_assessments'
// Portal → featureFlag: 'portal_pages'
// Financial → featureFlag: 'financial_dashboard'
// Analytics & Reporting → featureFlag: 'report_generation'
```

Sections that should NOT have a featureFlag (always visible):
- Dashboard, Contacts & Clients, People, Sales Pipeline, Host Employers, Field Officers, AI & Automation, Settings, Documents, Enrichment

**Step 4: Update AppSidebar to filter by feature flag**

In `crm7/src/components/layout/AppSidebar.tsx`, add filtering logic in the section rendering:

```typescript
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

// Inside AppSidebar component:
const { flags } = useFeatureFlags();

// In the section filter (around line 136-143 where permissions are checked):
const visibleSections = sections.filter(section => {
  // Check permission (existing logic)
  if (section.permission && !can(section.permission)) return false;
  // Check feature flag (new logic)
  if (section.featureFlag && !flags[section.featureFlag as keyof typeof flags]) return false;
  return true;
});
```

**Step 5: Run test to verify it passes**

Run: `cd crm7 && pnpm vitest run src/config/__tests__/navigation-flags.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add crm7/src/config/navigation.ts crm7/src/components/layout/AppSidebar.tsx crm7/src/config/__tests__/navigation-flags.test.ts
git commit -m "feat(crm7): gate navigation sections with feature flags"
```

---

## Phase 1: Kill List — Hide Broken Features

### Task 4: Replace Hardcoded Dashboard Financial Summary

**Files:**
- Modify: `crm7/src/components/dashboard/financial-summary.tsx`
- Test: Verify visually after change

**Context:** The financial summary widget at `crm7/src/components/dashboard/financial-summary.tsx` (line 61-74) returns hardcoded `$527,850` revenue. The entire widget should be gated behind the `financial_dashboard` feature flag. Since the flag defaults to `false`, this widget will be hidden at launch.

**Step 1: Wrap the financial summary with FeatureGate**

Find where `FinancialSummary` is rendered (likely in the Dashboard page). Wrap it:

```tsx
import { FeatureGate } from '@/components/common/FeatureGate';

<FeatureGate flag="financial_dashboard">
  <FinancialSummary />
</FeatureGate>
```

Alternatively, gate it at the component level by adding to the top of the `FinancialSummary` component:

```tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

export function FinancialSummary() {
  const enabled = useFeatureFlag('financial_dashboard');
  if (!enabled) return null;
  // ... rest of component
}
```

**Step 2: Verify the dashboard renders without the financial summary**

Run: `cd crm7 && pnpm dev` → Navigate to `/dashboard` → Confirm no fake revenue numbers are visible.

**Step 3: Commit**

```bash
git add crm7/src/components/dashboard/financial-summary.tsx
git commit -m "fix(crm7): hide hardcoded financial summary behind feature flag"
```

---

### Task 5: Replace Settings Mutation Stubs with Honest Disabled State

**Files:**
- Modify: `crm7/src/pages/settings/configuration.tsx`
- Modify: `crm7/src/pages/settings/user-management.tsx`
- Modify: `crm7/src/pages/settings/permissions.tsx`
- Modify: `crm7/src/pages/settings/integrations.tsx`

**Context:** These 4 settings pages have 24+ mutations that show success toasts when nothing is saved. This is the most dangerous pattern — users believe data is persisted. There are two approaches:

**Approach A (Recommended — fastest):** Gate the entire settings nav section sub-items that are broken. Keep the Settings page accessible but hide the broken sub-pages from navigation. Users can still access Settings → Profile (if that works) but can't navigate to Configuration, Permissions, or Integrations.

**Approach B:** Replace each mutation's `onSuccess` toast with a disabled-state banner: "Configuration saving is coming soon. Your changes won't be saved yet."

**Step 1: Gate broken settings sub-pages via feature flags**

In `crm7/src/config/navigation.ts`, the Settings section (lines 265-276) has sub-items for Users, Permissions, Configuration. Add `featureFlag` to each sub-item that's broken:

```typescript
// Modify the Settings section groups:
groups: [
  [
    { label: 'General', href: '/settings' },  // keep - may work
    { label: 'Role Overrides', href: '/settings/role-overrides' }, // keep - works
  ],
],
// Remove from nav: Users, Permissions, Configuration
// (these are the broken ones with logger.warn stubs)
```

**Step 2: Add "not yet available" banner to broken settings pages**

For each of the 4 broken settings pages, add a banner at the top of the component:

```tsx
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// At the top of the page component's return:
<Alert variant="destructive" className="mb-6">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Read-Only Preview</AlertTitle>
  <AlertDescription>
    Settings on this page cannot be saved yet. This feature is under development.
  </AlertDescription>
</Alert>
```

Then disable all save/submit buttons by adding `disabled` prop.

**Step 3: Remove the fake success toasts**

In each mutation's `onSuccess` callback, either remove the toast entirely or replace with an info toast:

```typescript
// BEFORE (dangerous):
onSuccess: () => {
  toast({ title: 'Configuration saved', variant: 'default' });
},

// AFTER (honest):
// Remove onSuccess entirely — the mutation won't fire because buttons are disabled
```

**Step 4: Verify settings pages show honest state**

Run: `cd crm7 && pnpm dev` → Navigate to each settings page → Confirm banner visible and save buttons disabled.

**Step 5: Commit**

```bash
git add crm7/src/pages/settings/configuration.tsx crm7/src/pages/settings/user-management.tsx crm7/src/pages/settings/permissions.tsx crm7/src/pages/settings/integrations.tsx crm7/src/config/navigation.ts
git commit -m "fix(crm7): disable broken settings pages, remove fake success toasts"
```

---

### Task 6: Hide ComingSoonPage Routes from Navigation

**Files:**
- Modify: `crm7/src/config/navigation.ts`

**Context:** Six pages render `ComingSoonPage` directly. Many more are lazy-loaded as stub pages in `App.tsx` (lines 90-116). The routes should stay in App.tsx (so deep links show a proper page, not a 404), but the nav items leading to these stub pages should be removed from the sidebar.

**Step 1: Identify all nav items that lead to stub pages**

Cross-reference the ComingSoonPage imports in `App.tsx` with nav items in `navigation.ts`. Remove or comment out nav sub-items whose href matches a stub page route.

Key items to remove from nav sub-items:

```
/activities/create        → Remove from nav (ComingSoonPage)
/reports/custom/create    → Remove from nav (ComingSoonPage)
/notifications/settings   → Remove from nav (ComingSoonPage)
/whs/reports/advanced     → Hidden by whs_module flag already
/whs/training/assign      → Hidden by whs_module flag already
/settings/integrations/*  → Hidden in Task 5
```

Also check for sub-items leading to:
- `/documents/upload` (document upload stub)
- `/timesheets/create` (timesheet create stub)
- `/invoicing/create` (invoice create stub)

**Step 2: Remove the identified sub-items from navigation.ts**

For each stub route found in nav, either remove the sub-item entirely or add a `featureFlag` to it.

**Step 3: Verify nav doesn't show broken links**

Run: `cd crm7 && pnpm dev` → Check sidebar → Confirm no nav items lead to "Coming Soon" pages.

**Step 4: Commit**

```bash
git add crm7/src/config/navigation.ts
git commit -m "fix(crm7): remove ComingSoonPage routes from navigation"
```

---

### Task 7: Fix Host Reports Hardcoded Chart

**Files:**
- Modify: `crm7/src/pages/hosts/reports.tsx`

**Context:** `crm7/src/pages/hosts/reports.tsx` (lines 123-160) has a hardcoded `monthlyProgressData` array for a 12-month performance chart. This should be replaced with an empty state until real data is available.

**Step 1: Replace hardcoded chart with empty state**

```tsx
import { EmptyState } from '@/components/common/EmptyState';
import { BarChart3 } from 'lucide-react';

// Replace the hardcoded chart section with:
<EmptyState
  icon={BarChart3}
  title="Host performance reports"
  description="Performance data will appear here once host employers have active placements with tracked metrics."
/>
```

**Step 2: Verify the page shows the empty state**

Run: `cd crm7 && pnpm dev` → Navigate to a host's reports tab → Confirm empty state appears, no fake chart.

**Step 3: Commit**

```bash
git add crm7/src/pages/hosts/reports.tsx
git commit -m "fix(crm7): replace hardcoded host reports chart with empty state"
```

---

### Task 8: Fix BSU Analytics Mock Data

**Files:**
- Modify: `business-suite-unified/src/lib/analyticsService.ts`
- Modify: The analytics page that consumes this service

**Context:** `business-suite-unified/src/lib/analyticsService.ts` exports 6 functions that all return hardcoded mock data (DAU 342, MAU 4,891, etc.). The CSV export downloads fabricated data. Two options:

**Option A (Recommended):** Replace the analytics page content with an empty state: "Analytics will be available once you have active users across BSuite apps." Keep the `analyticsService.ts` file but add `// STUB:` comments to all mock functions.

**Option B:** Wire the functions to real Supabase queries (requires analytics tables to exist).

**Step 1: Add prominent stub warning to analyticsService.ts**

At the top of each exported function, add a clear comment:

```typescript
/** STUB: Returns mock data. Wire to Supabase analytics views when tables exist. */
```

**Step 2: Gate analytics page behind AccessGuard (already done)**

The analytics page is already gated by `<AccessGuard serviceKey="analytics">`. If the user's tier doesn't include analytics, they won't see it. For launch, ensure the free tier does NOT include analytics access so mock data is never shown.

Alternatively, add an admin-only gate so only Braden sees analytics during early launch.

**Step 3: Add "Preview Data" banner if analytics page is accessible**

If the analytics page IS accessible (e.g., for admin users), add a banner:

```tsx
<Alert className="mb-6">
  <Info className="h-4 w-4" />
  <AlertTitle>Preview Mode</AlertTitle>
  <AlertDescription>
    Analytics data shown below is sample data. Real metrics will appear once BSuite is live with active users.
  </AlertDescription>
</Alert>
```

**Step 4: Commit**

```bash
git add business-suite-unified/src/lib/analyticsService.ts
git commit -m "fix(bsu): mark analytics service as stub data with preview banner"
```

---

### Task 9: Fix Conduit GeneralSection Fake Save

**Files:**
- Modify: `conduit/src/components/settings/GeneralSection.tsx`

**Context:** `conduit/src/components/settings/GeneralSection.tsx` (lines 140-159) has a `setTimeout(500)` fake save pattern. The comment in source says "placeholder — settings persistence is future work."

**Step 1: Replace fake save with disabled state**

```tsx
{/* Save button — disabled until persistence is implemented */}
<div className="flex justify-end">
  <button
    disabled
    className="inline-flex items-center gap-2 rounded-lg bg-primary/50 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed"
    title="Settings saving is coming soon"
  >
    <Save className="h-4 w-4" />
    Save Settings
  </button>
  <p className="mt-2 text-xs text-muted-foreground">
    Settings persistence is coming soon. Changes are not saved.
  </p>
</div>
```

Remove the `saving` state variable and `setSaving` calls since they're no longer needed.

**Step 2: Verify the button is disabled**

Run: `cd conduit && pnpm dev` → Navigate to Settings → General tab → Confirm save button is disabled with explanation text.

**Step 3: Commit**

```bash
git add conduit/src/components/settings/GeneralSection.tsx
git commit -m "fix(conduit): replace fake setTimeout save with disabled button"
```

---

### Task 10: Audit and Hide Broken Export Buttons

**Files:**
- Multiple CRM7 pages with export functionality

**Context:** Some export buttons work (real CSV generation), some do nothing. Need to audit each and hide broken ones.

**Step 1: Search for all export buttons**

Search CRM7 for: `export`, `Export`, `download`, `Download`, `CSV`, `csv`, `exportToCsv`.

**Step 2: Test each export button**

For each export button found:
1. Does clicking it trigger a file download?
2. Does the downloaded file contain real data (not hardcoded)?

**Step 3: Disable or hide broken export buttons**

For any export button that doesn't work:
- Add `disabled` attribute
- Add tooltip: "Export coming soon"

For any export that downloads fake data:
- Add `disabled` attribute
- Or gate behind `report_generation` feature flag

**Step 4: Commit**

```bash
git add -A  # Stage all modified export files
git commit -m "fix(crm7): disable non-functional export buttons"
```

---

## Phase 2: Empty States on All List Pages

### Task 11: Audit Empty State Coverage

**Files:**
- Multiple CRM7 list pages

**Context:** The canonical `EmptyState` component exists at `crm7/src/components/common/EmptyState/EmptyState.tsx`. Need to ensure every list page uses it when data is empty.

**Step 1: Find all list pages**

Search for pages that use `useQuery` with table data that could be empty. Key pages:

```
pages/people/index.tsx          → People list
pages/contacts/index.tsx        → Contacts list
pages/hosts/index.tsx           → Host employers list
pages/claims/index.tsx          → Claims list
pages/contracts/index.tsx       → Training contracts list
pages/tasks/index.tsx           → Tasks list
pages/compliance/index.tsx      → Compliance list
pages/deals/index.tsx           → Deals pipeline
pages/leads/index.tsx           → Leads pipeline
pages/quotes/index.tsx          → Quotes list
pages/charge-rates/index.tsx    → Charge rates list
```

**Step 2: For each list page, verify empty state exists**

Check if the page renders an `<EmptyState>` when the query returns an empty array. If not, add one:

```tsx
import { EmptyState } from '@/components/common/EmptyState';

// In the component, after the data query:
if (data && data.length === 0) {
  return (
    <EmptyState
      icon={RelevantIcon}
      title="No [entities] yet"
      description="[Action-oriented description of what to do]."
      action={{ label: 'Add [Entity]', onClick: () => navigate('/[entity]/new') }}
    />
  );
}
```

**Step 3: Run the app and verify each list page**

Navigate to each list page in an empty tenant. Confirm empty state appears with appropriate messaging and action button.

**Step 4: Commit per batch**

```bash
git commit -m "feat(crm7): add empty states to all list pages"
```

---

### Task 12: Consolidate Duplicate EmptyState Components

**Files:**
- Keep: `crm7/src/components/common/EmptyState/EmptyState.tsx` (canonical)
- Remove: `crm7/src/components/ui/empty-state.tsx` (duplicate)
- Modify: Any files importing from the duplicate

**Context:** Two EmptyState implementations exist (flagged by red-team docs). The canonical one in `components/common/EmptyState/` supports a single `action` prop. The duplicate in `components/ui/empty-state.tsx` supports `actions[]` (plural) and `compact` mode.

**Step 1: Check if any files import from the duplicate**

```bash
cd crm7 && grep -r "from.*ui/empty-state" src/ --include="*.tsx" --include="*.ts"
```

**Step 2: If imports exist, update them to use canonical EmptyState**

Change imports from `@/components/ui/empty-state` to `@/components/common/EmptyState`.

If any consumer needs the `actions[]` array or `compact` mode, add those props to the canonical EmptyState component first.

**Step 3: Delete the duplicate**

```bash
rm crm7/src/components/ui/empty-state.tsx
```

**Step 4: Run tests**

Run: `cd crm7 && pnpm vitest run`
Expected: All tests pass with no import errors

**Step 5: Commit**

```bash
git commit -m "refactor(crm7): consolidate duplicate EmptyState components"
```

---

## Phase 3: Dashboard and Onboarding

### Task 13: Replace Dashboard Hardcoded Metrics with Real Queries or Empty States

**Files:**
- Modify: `crm7/src/pages/Dashboard.tsx` (or wherever the dashboard page is)
- Modify: Dashboard widget components that show hardcoded data

**Context:** Beyond the financial summary (Task 4), the dashboard likely has other hardcoded metrics like "+12.5% growth", "+8.2% engagement". Each widget that shows fake data needs to either:
1. Query real data from Supabase (preferred if the table exists)
2. Show an empty state with a setup action

**Step 1: Audit dashboard widgets**

Read the Dashboard page and all imported widget components. For each widget, check:
- Does the `useQuery` fetch from a real Supabase table?
- Are the displayed numbers coming from the query or hardcoded?

**Step 2: For widgets with real data sources — keep as-is**

Widgets that query `people`, `contacts`, `claims`, `tasks` tables and show counts — these are fine.

**Step 3: For widgets with hardcoded data — replace with empty states**

Each hardcoded widget should show an empty state until real data exists:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Revenue Overview</CardTitle>
  </CardHeader>
  <CardContent>
    <EmptyState
      icon={DollarSign}
      title="No financial data yet"
      description="Revenue tracking will appear here once invoicing is set up."
    />
  </CardContent>
</Card>
```

**Step 4: Verify dashboard shows only real data**

Run: `cd crm7 && pnpm dev` → Navigate to dashboard → Confirm every number is either:
- From a real Supabase query, OR
- An empty state with clear messaging

**Step 5: Commit**

```bash
git commit -m "fix(crm7): replace hardcoded dashboard metrics with real data or empty states"
```

---

### Task 14: Improve Onboarding Wizard

**Files:**
- Modify: Existing onboarding components (referenced in `App.tsx` as `OnboardingWizard` and `OrgSetupWizard`)

**Context:** The onboarding wizard exists but currently stores state in localStorage. For launch, the wizard should guide users through: company setup → import or add first record → see populated dashboard.

**Step 1: Read and audit existing onboarding flow**

Read the `OnboardingWizard` and `OrgSetupWizard` components to understand current state.

**Step 2: Ensure onboarding wizard:**

1. Asks for company name, ABN (persists to Supabase `tenants` table)
2. Offers: "Import CSV" or "Add first apprentice" or "Explore first"
3. On completion, navigates to dashboard
4. Dashboard shows real data from whatever was imported/added
5. Persistent setup checklist on dashboard (not modal) showing progress

**Step 3: Test the full flow**

Run: `cd crm7 && pnpm dev` → Sign up as new user → Complete onboarding → Verify dashboard shows real data.

**Step 4: Commit**

```bash
git commit -m "feat(crm7): improve onboarding wizard to guide first-time setup"
```

---

## Phase 4: Differentiator Polish (Stretch Goals)

### Task 15: Add Command Palette (Cmd+K)

**Files:**
- Create: `crm7/src/components/common/CommandPalette.tsx`
- Modify: `crm7/src/App.tsx` (add to root)

**Context:** The `cmdk` package is already in CRM7's dependencies (confirmed in `package.json`). This is a high-impact, low-effort addition.

**Step 1: Create command palette component**

Use the `cmdk` library to create a Cmd+K palette that supports:
- Navigation: search and navigate to any page
- Record search: find people, contacts, hosts by name
- Quick actions: "Create Apprentice", "Create Contact", "Open Charge Rate Calculator"

**Step 2: Register keyboard shortcut**

Add a `useEffect` in `App.tsx` (or a dedicated hook) that listens for `Cmd+K` / `Ctrl+K` and opens the command palette.

**Step 3: Wire navigation commands**

Use the `SHARED_SECTIONS` data from `navigation.ts` to populate navigation commands. Use `wouter`'s `useLocation` for navigation.

**Step 4: Test**

Run: `cd crm7 && pnpm dev` → Press Cmd+K → Type "people" → Confirm navigation to People page.

**Step 5: Commit**

```bash
git commit -m "feat(crm7): add Cmd+K command palette for quick navigation"
```

---

### Task 16: Add Activity Timeline to Record Views

**Files:**
- Create: `crm7/src/components/common/ActivityTimeline.tsx`
- Modify: `crm7/src/pages/people/[id].tsx` (add timeline tab)
- Modify: `crm7/src/pages/contacts/[id].tsx` (add timeline tab)

**Context:** Modern CRMs show an activity timeline as the primary record view. When you open a contact or person, you see a chronological log of all interactions.

**Step 1: Create ActivityTimeline component**

```tsx
// Shows chronological list of activities for a record
// Activities: notes, status changes, communications, compliance events
// Fetches from: activities table, filtered by entity_type + entity_id
```

**Step 2: Add to person detail page**

Add an "Activity" tab to the person detail page tabs.

**Step 3: Test**

Verify timeline shows real activities (or empty state if none).

**Step 4: Commit**

```bash
git commit -m "feat(crm7): add activity timeline to person and contact records"
```

---

## Verification Checklist

After all tasks are complete, verify:

### Must Pass (Launch Blockers)

- [ ] `cd crm7 && pnpm tsc --noEmit` → 0 errors
- [ ] `cd crm7 && pnpm vitest run` → All tests pass
- [ ] `cd crm7 && pnpm dev` → App loads, navigate all pages
- [ ] No "Coming Soon" pages reachable from sidebar navigation
- [ ] No fake success toasts on settings pages
- [ ] Dashboard shows zero hardcoded numbers
- [ ] Financial summary widget hidden
- [ ] WHS, VET, Communication, Portal sections hidden from nav
- [ ] Host reports chart replaced with empty state
- [ ] Conduit settings save button disabled with explanation
- [ ] BSU analytics shows "Preview Mode" banner

### Should Pass (Desired)

- [ ] All list pages show `<EmptyState>` when empty
- [ ] Only one `EmptyState` component exists (duplicate removed)
- [ ] Cmd+K command palette opens and navigates
- [ ] Onboarding wizard guides to first real data entry

### TypeScript Verification

```bash
cd crm7 && pnpm tsc --noEmit 2>&1 | head -20
cd business-suite-unified && pnpm tsc --noEmit 2>&1 | head -20
cd conduit && pnpm tsc --noEmit 2>&1 | head -20
```

All must return 0 errors.

---

## Execution Notes

**Task dependency graph:**

```
Task 1 (useFeatureFlags)
  → Task 2 (FeatureGate) — depends on Task 1
  → Task 3 (Nav gating) — depends on Task 1
    → Task 4 (Financial summary) — depends on Task 2
    → Task 5 (Settings stubs) — depends on Task 3
    → Task 6 (ComingSoonPage routes) — depends on Task 3
Task 7 (Host reports) — independent
Task 8 (BSU analytics) — independent
Task 9 (Conduit fake save) — independent
Task 10 (Export buttons) — independent
Task 11 (Empty state audit) — after Task 1-6
Task 12 (EmptyState consolidation) — independent
Task 13 (Dashboard metrics) — after Task 4
Task 14 (Onboarding) — after Task 11
Task 15 (Command palette) — independent
Task 16 (Activity timeline) — independent
```

**Parallelizable groups:**
- Tasks 7, 8, 9, 10, 12 can all run in parallel
- Tasks 15, 16 can run in parallel
- Tasks 4, 5, 6 can run in parallel (after Task 3)

**Estimated effort:**
- Phase 0 (Tasks 1-3): ~2-3 hours
- Phase 1 (Tasks 4-10): ~3-4 hours
- Phase 2 (Tasks 11-12): ~2 hours
- Phase 3 (Tasks 13-14): ~3-4 hours
- Phase 4 (Tasks 15-16): ~3-4 hours
- **Total: ~13-18 hours of implementation**
