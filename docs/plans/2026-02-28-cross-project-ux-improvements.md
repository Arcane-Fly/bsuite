# Cross-Project UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix UX gaps in R80.3, BSU, and braden — 14 items covering view toggles, dead UI fixes, honest health checks, real forms, DB tables, search/filter, admin sidebar, and kanban boards.

**Architecture:** Three independent project streams that can run as parallel subagents. R80.3 uses raw Tailwind + Zustand (no shadcn). BSU uses custom `.glass-card` CSS + Tailwind (no shadcn). braden has full shadcn/ui (50+ components) + React Router v7 + Supabase. Within braden, tasks are sequential: sidebar → forms → DB tables → status field → search → kanban boards.

**Tech Stack:** React, TypeScript, Tailwind CSS, Zustand (R80.3), Supabase (braden/BSU), shadcn/ui (braden only), @dnd-kit (braden kanban), lucide-react (all), React Router v7 (braden)

**Design Doc:** `docs/plans/2026-02-28-cross-project-ux-improvements-design.md`

---

## Stream A: R80.3 (4 tasks, independent)

### Task A1: ApprenticeManager Year Filter (R4)

**Files:**
- Modify: `R80.3/src/components/ApprenticeManager.tsx`

**Step 1: Add year filter state and UI**

In `ApprenticeManager.tsx`, add a year filter state and filter button group above the apprentice list. Reuse the existing `getYearBadgeColor()` function (lines 81-89) for consistent badge styling.

```tsx
// Add to existing state declarations (after line 36):
const [yearFilter, setYearFilter] = useState<ApprenticeYear | 'all'>(
  () => (localStorage.getItem('r8-apprentice-year-filter') as ApprenticeYear | 'all') || 'all'
);

// Add effect to persist:
useEffect(() => {
  localStorage.setItem('r8-apprentice-year-filter', String(yearFilter));
}, [yearFilter]);

// Add filtered list before the render:
const filteredApprentices = yearFilter === 'all'
  ? apprentices
  : apprentices.filter(a => a.year === Number(yearFilter));
```

Add import for `useEffect` if not already imported (it is — check top of file).

Add the filter UI between the title section and the apprentice list (around line 116). Follow the existing year selector pattern from lines 402-420:

```tsx
{/* Year Filter */}
<div className="flex items-center gap-2 px-4 pb-3">
  <span className="text-xs text-theme-muted font-medium">Filter:</span>
  <div className="flex gap-1">
    {(['all', 1, 2, 3, 4] as const).map((year) => (
      <button
        key={year}
        type="button"
        className={`px-3 py-1 text-xs rounded-md transition-colors ${
          yearFilter === (year === 'all' ? 'all' : year)
            ? year === 'all'
              ? 'bg-interactive text-white'
              : getYearBadgeColor(year as ApprenticeYear)
            : 'bg-interactive text-theme-secondary hover:bg-interactive'
        }`}
        onClick={() => setYearFilter(year === 'all' ? 'all' : (year as ApprenticeYear))}
      >
        {year === 'all' ? 'All' : `Y${year}`}
      </button>
    ))}
  </div>
  {yearFilter !== 'all' && (
    <span className="text-xs text-theme-muted">
      ({filteredApprentices.length} of {apprentices.length})
    </span>
  )}
</div>
```

**Step 2: Replace `apprentices.map` with `filteredApprentices.map`**

In the render section (around line 132), change `apprentices.map(...)` to `filteredApprentices.map(...)`. Also add an empty state when the filter produces zero results:

```tsx
{filteredApprentices.length === 0 ? (
  <div className="text-center py-8 text-theme-muted">
    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
    <p className="text-sm">No Year {yearFilter} apprentices</p>
  </div>
) : (
  filteredApprentices.map((apprentice) => (
    // ... existing card render
  ))
)}
```

Import `Users` from lucide-react if not already imported.

**Step 3: Verify**

Run: `cd R80.3 && pnpm build`
Expected: Build passes with no errors.

**Step 4: Commit**

```bash
git add R80.3/src/components/ApprenticeManager.tsx
git commit -m "feat(r80): add year filter to ApprenticeManager with localStorage persistence"
```

---

### Task A2: ApprenticeManager View Toggle (R1)

**Files:**
- Modify: `R80.3/src/components/ApprenticeManager.tsx`

**Step 1: Add view mode state**

```tsx
// Add to state declarations:
const [viewMode, setViewMode] = useState<'list' | 'grid'>(
  () => (localStorage.getItem('r8-apprentice-view') as 'list' | 'grid') || 'list'
);

useEffect(() => {
  localStorage.setItem('r8-apprentice-view', viewMode);
}, [viewMode]);
```

Add imports for `LayoutList` and `LayoutGrid` from lucide-react.

**Step 2: Add toggle buttons to header**

In the header area (around line 98), add toggle buttons alongside the existing "Calculate All" and "Add New" buttons:

```tsx
{/* View Toggle */}
<div className="flex items-center gap-1 border border-theme-border rounded-md p-0.5">
  <button
    type="button"
    className={`p-1.5 rounded transition-colors ${
      viewMode === 'list'
        ? 'bg-interactive text-white'
        : 'text-theme-muted hover:text-theme-primary'
    }`}
    onClick={() => setViewMode('list')}
    aria-label="List view"
    aria-pressed={viewMode === 'list'}
  >
    <LayoutList className="w-4 h-4" />
  </button>
  <button
    type="button"
    className={`p-1.5 rounded transition-colors ${
      viewMode === 'grid'
        ? 'bg-interactive text-white'
        : 'text-theme-muted hover:text-theme-primary'
    }`}
    onClick={() => setViewMode('grid')}
    aria-label="Grid view"
    aria-pressed={viewMode === 'grid'}
  >
    <LayoutGrid className="w-4 h-4" />
  </button>
</div>
```

**Step 3: Add grid card layout**

Wrap the existing apprentice list render in a conditional. The list view remains as-is. For grid view, render compact cards in a responsive grid:

```tsx
{viewMode === 'grid' ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
    {filteredApprentices.map((apprentice) => (
      <div
        key={apprentice.id}
        className="rounded-lg border border-theme-border bg-card p-4 hover:border-blue-500/50 transition-colors cursor-pointer"
        onClick={() => setActiveApprenticeId(
          activeApprenticeId === apprentice.id ? null : apprentice.id
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getYearBadgeColor(apprentice.year)}`}>
            {apprentice.year}
          </span>
          <h3 className="font-medium text-sm text-theme-primary truncate">{apprentice.name}</h3>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-theme-muted">Pay Rate</span>
            <span className="font-medium text-theme-primary">{formatCurrency(apprentice.basePayRate)}/hr</span>
          </div>
          {apprentice.result && (
            <>
              <div className="flex justify-between">
                <span className="text-theme-muted">Charge Rate</span>
                <span className="font-medium text-green-500">{formatCurrency(apprentice.result.chargeRate)}/hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">Cost/Hr</span>
                <span className="font-medium text-theme-primary">{formatCurrency(apprentice.result.costPerHour)}/hr</span>
              </div>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
) : (
  // existing list render (the divide-y container)
)}
```

Import `formatCurrency` — check if it's already imported from `../utils/calculationUtils` (it is in ComparativeView but may need adding here).

**Step 4: Verify**

Run: `cd R80.3 && pnpm build`
Expected: Build passes.

**Step 5: Commit**

```bash
git add R80.3/src/components/ApprenticeManager.tsx
git commit -m "feat(r80): add list/grid view toggle to ApprenticeManager"
```

---

### Task A3: Fix Dead Export Button in ComparativeView (R2)

**Files:**
- Modify: `R80.3/src/components/ComparativeView.tsx`

**Step 1: Wire the Export button**

The `exportApprenticeData()` function in `R80.3/src/services/exportImportService.ts` (line 61) already handles `ApprenticeProfile[]` export. Just import and wire it.

In `ComparativeView.tsx`, add import:

```tsx
import { exportApprenticeData } from '../services/exportImportService';
```

At the dead button (lines 56-62), add the `onClick`:

```tsx
<button
  className="py-1 px-3 text-xs bg-interactive text-theme-secondary rounded-md hover:bg-interactive transition-colors flex items-center gap-1"
  aria-label="Export comparison data"
  onClick={() => {
    const withResults = apprentices.filter(a => a.result);
    if (withResults.length > 0) {
      exportApprenticeData(withResults);
    }
  }}
>
  <Download className="w-3 h-3" />
  Export
</button>
```

Note: `apprentices` is already available from `useApprentices()` (line 7). The `apprenticesWithResults` filtering is done in the `onClick` handler to match what the table displays.

**Step 2: Verify**

Run: `cd R80.3 && pnpm build`
Expected: Build passes.

**Step 3: Commit**

```bash
git add R80.3/src/components/ComparativeView.tsx
git commit -m "fix(r80): wire dead Export button in ComparativeView to exportApprenticeData"
```

---

### Task A4: ComparativeView Sortable Table Columns (R3)

**Files:**
- Modify: `R80.3/src/components/ComparativeView.tsx`

**Step 1: Add sort state and sort logic**

Add sort state and a sorting function. Add `ArrowUp`, `ArrowDown`, `ChevronsUpDown` to lucide imports:

```tsx
import { ArrowUp, ArrowDown, ChevronsUpDown, /* ...existing */ } from 'lucide-react';

// Add type and state (inside component):
type SortKey = 'name' | 'year' | 'payRate' | 'totalOnCosts' | 'costPerHour' | 'margin' | 'chargeRate';
type SortDir = 'asc' | 'desc';

const [sortKey, setSortKey] = useState<SortKey | null>(null);
const [sortDir, setSortDir] = useState<SortDir>('asc');

const handleSort = (key: SortKey) => {
  if (sortKey === key) {
    setSortDir(d => d === 'asc' ? 'desc' : 'asc');
  } else {
    setSortKey(key);
    setSortDir('asc');
  }
};

const getSortValue = (a: ApprenticeProfile, key: SortKey): number | string => {
  switch (key) {
    case 'name': return a.name;
    case 'year': return a.year;
    case 'payRate': return a.result?.payRate ?? 0;
    case 'totalOnCosts': return a.result ? Object.values(a.result.oncosts).reduce((sum, v) => sum + v, 0) : 0;
    case 'costPerHour': return a.result?.costPerHour ?? 0;
    case 'margin': return a.costConfig.defaultMargin;
    case 'chargeRate': return a.result?.chargeRate ?? 0;
  }
};

// Sort the data:
const sortedApprentices = [...apprenticesWithResults].sort((a, b) => {
  if (!sortKey) return 0;
  const aVal = getSortValue(a, sortKey);
  const bVal = getSortValue(b, sortKey);
  const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
  return sortDir === 'asc' ? cmp : -cmp;
});
```

You'll need to import the `ApprenticeProfile` type from `../types`.

**Step 2: Replace static headers with sortable buttons**

Replace each `<th>` with a clickable header. Create a helper:

```tsx
const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
  <th
    scope="col"
    className="px-3 py-2 text-left text-xs font-medium text-theme-muted uppercase tracking-wider cursor-pointer select-none hover:text-theme-primary transition-colors"
    onClick={() => handleSort(sortKeyName)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      {sortKey === sortKeyName ? (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-30" />
      )}
    </span>
  </th>
);
```

Replace the existing `<thead>` (lines 114-121):

```tsx
<thead>
  <tr>
    <SortHeader label="Apprentice" sortKeyName="name" />
    <SortHeader label="Base Pay" sortKeyName="payRate" />
    <SortHeader label="Total On-costs" sortKeyName="totalOnCosts" />
    <SortHeader label="Cost per Hour" sortKeyName="costPerHour" />
    <SortHeader label="Profit Margin" sortKeyName="margin" />
    <SortHeader label="Final Rate" sortKeyName="chargeRate" />
  </tr>
</thead>
```

**Step 3: Use `sortedApprentices` in the table body**

In the `<tbody>` (around line 123), change `apprenticesWithResults.map(...)` to `sortedApprentices.map(...)`.

**Step 4: Verify**

Run: `cd R80.3 && pnpm build`
Expected: Build passes.

**Step 5: Commit**

```bash
git add R80.3/src/components/ComparativeView.tsx
git commit -m "feat(r80): add sortable columns to ComparativeView comparison table"
```

---

## Stream B: BSU (2 tasks, independent)

### Task B1: Fix Misleading DashboardStats Sample Data (B1)

**Files:**
- Modify: `business-suite-unified/src/components/DashboardStats.tsx`

**Step 1: Replace SAMPLE_DATA fallbacks with empty state cards**

The problem is at every stat that falls back to `SAMPLE_DATA` (lines 87-100 for users, lines 134-147 for revenue, and similar for other stats). When no real data exists, the component should show "No data yet" instead of fake numbers.

First, find every place where `SAMPLE_DATA[METRIC_NAMES.xxx].current` is used as a fallback value. Replace each with an empty state value.

Create a helper function for empty stat cards:

```tsx
const createEmptyStat = (label: string, icon: React.ElementType) => ({
  label,
  value: '—',
  change: 'No data yet',
  trend: 'neutral' as const,
  icon,
  description: 'Set up analytics to see real data',
  isEmpty: true,
});
```

Then in each stat block, instead of:
```tsx
value: hasXxxData
  ? formatNumber(xxxData.current)
  : formatNumber(SAMPLE_DATA[METRIC_NAMES.XXX].current),  // fake number
```

Change to:
```tsx
value: hasXxxData
  ? formatNumber(xxxData.current)
  : '—',
change: hasXxxData
  ? `${formatChange(xxxData.change)} vs last month`
  : 'No data yet',
```

Apply this pattern to ALL stat blocks that use `SAMPLE_DATA` as fallback (Total Users, Compliance Score, Calculations, Monthly Revenue, System Uptime).

**Step 2: Add visual distinction for empty state cards**

In the card render (where stats are mapped to JSX), add an opacity/style indicator when data is empty. The stat objects need an `isEmpty` boolean. Alternatively, check `value === '—'`:

```tsx
<div className={cn('glass-card p-4', stat.value === '—' && 'opacity-60')}>
  {/* existing card content */}
  {stat.value === '—' && (
    <p className="text-xs text-amber-400/70 mt-1">Set up analytics to track this</p>
  )}
</div>
```

Note: BSU uses raw `className` string concatenation, not `cn()`. Use template literals:

```tsx
className={`glass-card p-4 ${stat.value === '—' ? 'opacity-60' : ''}`}
```

**Step 3: Remove or keep SAMPLE_DATA**

Keep `SAMPLE_DATA` as a reference comment but do not use it in production rendering. Or delete it entirely if no other code references it. Check with grep first.

**Step 4: Verify**

Run: `cd business-suite-unified && pnpm build`
Expected: Build passes.

**Step 5: Commit**

```bash
git add business-suite-unified/src/components/DashboardStats.tsx
git commit -m "fix(bsu): replace misleading sample data with honest empty state in DashboardStats"
```

---

### Task B2: Fix Faked Health Checks in SystemOverview (B2)

**Files:**
- Modify: `business-suite-unified/src/pages/Admin/SystemOverview.tsx`

**Step 1: Replace hardcoded health checks with real + honest checks**

Replace the static `healthChecks` array (lines 74-80) with a `useState` + `useEffect` that performs real connectivity checks against Supabase endpoints.

```tsx
const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
  { name: 'Database',       status: 'warning', message: 'Checking...' },
  { name: 'Authentication', status: 'warning', message: 'Checking...' },
  { name: 'Storage',        status: 'warning', message: 'Not monitored' },
  { name: 'API',            status: 'warning', message: 'Not monitored' },
]);
```

Add a health check function that runs real probes for Database and Auth:

```tsx
const checkHealth = async () => {
  const checks: HealthCheck[] = [];

  // Database: try a lightweight Supabase query
  try {
    const start = performance.now();
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const latency = Math.round(performance.now() - start);
    checks.push({
      name: 'Database',
      status: error ? 'error' : 'healthy',
      message: error ? `Error: ${error.message}` : `Connected (${latency}ms)`,
    });
  } catch {
    checks.push({ name: 'Database', status: 'error', message: 'Unreachable' });
  }

  // Authentication: check session
  try {
    const { data, error } = await supabase.auth.getSession();
    checks.push({
      name: 'Authentication',
      status: error ? 'error' : data.session ? 'healthy' : 'warning',
      message: error ? `Error: ${error.message}` : data.session ? 'Operational' : 'No active session',
    });
  } catch {
    checks.push({ name: 'Authentication', status: 'error', message: 'Unreachable' });
  }

  // Storage & API: honest "Not monitored"
  checks.push({ name: 'Storage', status: 'warning', message: 'Not monitored' });
  checks.push({ name: 'API', status: 'warning', message: 'Not monitored' });

  setHealthChecks(checks);
};
```

Call `checkHealth()` inside the existing `loadData()` function (line 54) or in a separate `useEffect`.

**Step 2: Fix the unconditional "All systems operational" banner**

Replace the hardcoded green banner (lines 219-224) with a conditional based on actual health status:

```tsx
{(() => {
  const allHealthy = healthChecks.every(c => c.status === 'healthy');
  const hasError = healthChecks.some(c => c.status === 'error');
  const hasWarning = healthChecks.some(c => c.status === 'warning');

  if (hasError) return (
    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg" role="status">
      <div className="flex items-center gap-2 text-red-400">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">System issues detected</span>
      </div>
    </div>
  );

  if (hasWarning) return (
    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg" role="status">
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">Some services not monitored</span>
      </div>
    </div>
  );

  return (
    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg" role="status">
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">All systems operational</span>
      </div>
    </div>
  );
})()}
```

Ensure `AlertTriangle` is imported from lucide-react (check existing imports).

**Step 3: Verify**

Run: `cd business-suite-unified && pnpm build`
Expected: Build passes.

**Step 4: Commit**

```bash
git add business-suite-unified/src/pages/Admin/SystemOverview.tsx
git commit -m "fix(bsu): replace faked health checks with real Supabase probes and honest status"
```

---

## Stream C: braden (8 tasks, sequential)

### Task C1: Admin Layout — Proper Sidebar (BR6)

This is structural — do it first so all subsequent work benefits from proper navigation.

**Files:**
- Create: `braden/src/components/admin/AdminLayout.tsx`
- Modify: `braden/src/Routes.tsx`
- Modify: `braden/src/pages/admin/Dashboard.tsx`

**Step 1: Create AdminLayout with shadcn sidebar**

Create `braden/src/components/admin/AdminLayout.tsx` using the existing shadcn `sidebar.tsx` components:

```tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarInset, SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, FileText, Users, Briefcase, ListTodo,
  Mail, Settings, PenTool, UserCog, Contact,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Content Manager', path: '/admin/content', icon: FileText },
      { label: 'CMS', path: '/admin/cms', icon: PenTool },
      { label: 'Site Editor', path: '/admin/editor', icon: PenTool },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Leads', path: '/admin/leads', icon: Contact },
      { label: 'Clients', path: '/admin/clients', icon: Briefcase },
      { label: 'Staff', path: '/admin/staff', icon: Users },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Tasks', path: '/admin/tasks', icon: ListTodo },
      { label: 'Emails', path: '/admin/emails', icon: Mail },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Site Settings', path: '/admin/settings', icon: Settings },
      { label: 'User Management', path: '/admin/users', icon: UserCog },
    ],
  },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-3">
          <h2 className="font-semibold text-lg">Admin</h2>
        </SidebarHeader>
        <SidebarContent>
          {NAV_SECTIONS.map((section) => (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={location.pathname === item.path}
                        onClick={() => navigate(item.path)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

**Step 2: Update Routes.tsx**

Wrap all `/admin` routes with `AdminLayout` instead of the public `Layout`:

```tsx
import { AdminLayout } from '@/components/admin/AdminLayout';

// Replace the admin route group's layout wrapper:
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<RequirePermission permission="dashboard.view"><Dashboard /></RequirePermission>} />
  <Route path="dashboard" element={<RequirePermission permission="dashboard.view"><Dashboard /></RequirePermission>} />
  {/* ... all other admin routes stay the same ... */}
</Route>
```

**Step 3: Simplify Dashboard.tsx**

Remove the hand-rolled nav sidebar (lines 80-166) from `Dashboard.tsx`. The navigation is now handled by `AdminLayout`. Dashboard should only render its content cards (the Hero, Content, Users, Settings tabs can stay as inline tab content or become their own routes — keep as tabs for now to minimize changes).

Remove:
- The outer `<div className="grid grid-cols-1 md:grid-cols-4">` layout
- The left nav column with all the `<Button variant="ghost/outline">` items
- The "Back to Dashboard" buttons from Leads, Clients, Staff, Tasks pages (they're now redundant with the sidebar)

**Step 4: Verify**

Run: `cd braden && pnpm build`
Expected: Build passes.

**Step 5: Commit**

```bash
git add braden/src/components/admin/AdminLayout.tsx braden/src/Routes.tsx braden/src/pages/admin/Dashboard.tsx
git commit -m "feat(braden): add persistent admin sidebar using shadcn sidebar component"
```

---

### Task C2: Fix Add Lead/Client Forms (BR1)

**Files:**
- Create: `braden/src/components/admin/AddLeadDialog.tsx`
- Create: `braden/src/components/admin/AddClientDialog.tsx`
- Modify: `braden/src/pages/admin/Leads.tsx`
- Modify: `braden/src/pages/admin/Clients.tsx`

**Step 1: Create AddLeadDialog**

Follow the `AddAdminDialog.tsx` pattern. Use shadcn `Dialog`, `Input`, `Label`, `Button`, `Select`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddLeadDialog({ open, onOpenChange, onSuccess }: AddLeadDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', service_type: '', source: '', notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Name and email are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('leads').insert([{
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      service_type: form.service_type || null,
    }]).select();

    setLoading(false);
    if (error) {
      toast({ title: 'Failed to add lead', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lead added successfully' });
    setForm({ name: '', email: '', phone: '', service_type: '', source: '', notes: '' });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Name *</Label>
            <Input id="lead-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-email">Email *</Label>
            <Input id="lead-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone</Label>
            <Input id="lead-phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0400 000 000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-service">Service Interest</Label>
            <Input id="lead-service" value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))} placeholder="e.g. Web Development" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create AddClientDialog**

Same pattern, different fields (name, email, company, phone):

```tsx
// Same structure as AddLeadDialog but with:
// - form: { name, email, company, phone }
// - supabase.from('clients').insert([{ name, email, phone }])
// - Fields: Name*, Email*, Company, Phone
```

**Step 3: Wire into Leads.tsx**

Replace the hard-coded `handleAddLead` function (lines 56-65) with dialog state:

```tsx
const [addDialogOpen, setAddDialogOpen] = useState(false);

// Remove the old handleAddLead function entirely

// In the JSX, replace the Button onClick:
<Button onClick={() => setAddDialogOpen(true)}>Add Lead</Button>

// Add the dialog at the end of the component return:
<AddLeadDialog
  open={addDialogOpen}
  onOpenChange={setAddDialogOpen}
  onSuccess={fetchLeads}
/>
```

**Step 4: Wire into Clients.tsx**

Same pattern — replace hard-coded `handleAddClient` with `AddClientDialog`.

**Step 5: Verify**

Run: `cd braden && pnpm build`
Expected: Build passes.

**Step 6: Commit**

```bash
git add braden/src/components/admin/AddLeadDialog.tsx braden/src/components/admin/AddClientDialog.tsx braden/src/pages/admin/Leads.tsx braden/src/pages/admin/Clients.tsx
git commit -m "fix(braden): replace hard-coded dummy data with real Add Lead/Client forms"
```

---

### Task C3: Create Tasks DB Table (BR3)

**Files:**
- Create: `braden/supabase/migrations/20260228000001_create_tasks_table.sql`
- Modify: `braden/src/pages/admin/Tasks.tsx`
- Modify: `braden/src/integrations/supabase/types.ts` (after migration runs)

**Step 1: Write the migration**

```sql
-- Create tasks table for braden admin
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (refine per your auth model)
CREATE POLICY "Authenticated users can manage tasks"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_tasks_updated_at();
```

**Step 2: Rewrite Tasks.tsx to use Supabase**

Replace the mock data fetch (lines 38-56) with real Supabase queries:

```tsx
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const fetchTasks = async () => {
  setLoading(true);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    toast({ title: 'Error fetching tasks', variant: 'destructive' });
  } else {
    setTasks(data || []);
  }
  setLoading(false);
};
```

Replace `handleAddTask` with a real insert (or better, create an `AddTaskDialog` following the pattern from C2).

Replace `handleDeleteTask` with a real Supabase delete.

Add status update function for later kanban use:

```tsx
const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId);

  if (error) {
    toast({ title: 'Failed to update task', variant: 'destructive' });
  } else {
    fetchTasks();
  }
};
```

**Step 3: Add status badge column to the table**

Show status as colored badges using shadcn `Badge`:

```tsx
import { Badge } from '@/components/ui/badge';

const statusBadgeVariant = (status: Task['status']) => {
  switch (status) {
    case 'todo': return 'secondary';
    case 'in_progress': return 'default';
    case 'done': return 'outline';
  }
};

const statusLabel = (status: Task['status']) => {
  switch (status) {
    case 'todo': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'done': return 'Done';
  }
};
```

**Step 4: Verify**

Run: `cd braden && pnpm build`
Expected: Build passes. (Migration needs to be applied separately via `supabase db push` or CI.)

**Step 5: Commit**

```bash
git add braden/supabase/migrations/20260228000001_create_tasks_table.sql braden/src/pages/admin/Tasks.tsx
git commit -m "feat(braden): create tasks DB table and wire Tasks page to Supabase"
```

---

### Task C4: Create Staff DB Table (BR4)

**Files:**
- Create: `braden/supabase/migrations/20260228000002_create_staff_table.sql`
- Modify: `braden/src/pages/admin/Staff.tsx`

**Step 1: Write the migration**

```sql
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  position TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage staff"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Step 2: Rewrite Staff.tsx to use Supabase**

Same pattern as Tasks — replace mock data with real Supabase queries, add CRUD operations.

**Step 3: Verify & Commit**

```bash
cd braden && pnpm build
git add braden/supabase/migrations/20260228000002_create_staff_table.sql braden/src/pages/admin/Staff.tsx
git commit -m "feat(braden): create staff DB table and wire Staff page to Supabase"
```

---

### Task C5: Add Status Field to Leads (BR2)

**Files:**
- Create: `braden/supabase/migrations/20260228000003_add_leads_status.sql`
- Modify: `braden/src/pages/admin/Leads.tsx`

**Step 1: Write the migration**

```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'
  CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'));
```

**Step 2: Update Lead interface and table columns in Leads.tsx**

Add `status` to the `Lead` interface:

```tsx
interface Lead {
  id: string;
  name: string;
  email: string;
  service: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
}
```

Update the transform function to include `status`:

```tsx
const leads = (data || []).map(d => ({
  id: d.id,
  name: d.name,
  email: d.email,
  service: d.service_type || '',
  status: (d.status || 'new') as Lead['status'],
}));
```

Add status column to the table with colored badges:

```tsx
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-indigo-100 text-indigo-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};
```

Add status filter buttons above the table:

```tsx
const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all');

const filteredLeads = statusFilter === 'all'
  ? leads
  : leads.filter(l => l.status === statusFilter);
```

**Step 3: Update AddLeadDialog to include status field**

Add a `Select` for initial status (default: 'new').

**Step 4: Verify & Commit**

```bash
cd braden && pnpm build
git add braden/supabase/migrations/20260228000003_add_leads_status.sql braden/src/pages/admin/Leads.tsx braden/src/components/admin/AddLeadDialog.tsx
git commit -m "feat(braden): add status field to leads with colored badges and filter"
```

---

### Task C6: Search + Filter on Leads/Clients (BR5)

**Files:**
- Modify: `braden/src/pages/admin/Leads.tsx`
- Modify: `braden/src/pages/admin/Clients.tsx`

**Step 1: Add search to Leads.tsx**

Add a search input above the table using shadcn `Input` and the lucide `Search` icon:

```tsx
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const [searchTerm, setSearchTerm] = useState('');

const filteredLeads = leads
  .filter(l => statusFilter === 'all' || l.status === statusFilter)
  .filter(l => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return l.name.toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || l.service.toLowerCase().includes(q);
  });
```

Search UI (place above the table, alongside or below the status filter):

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search leads..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="pl-9 pr-9"
  />
  {searchTerm && (
    <button
      onClick={() => setSearchTerm('')}
      className="absolute right-3 top-1/2 -translate-y-1/2"
    >
      <X className="h-4 w-4 text-muted-foreground" />
    </button>
  )}
</div>
```

**Step 2: Add search to Clients.tsx**

Same pattern — filter on name, email, company.

**Step 3: Verify & Commit**

```bash
cd braden && pnpm build
git add braden/src/pages/admin/Leads.tsx braden/src/pages/admin/Clients.tsx
git commit -m "feat(braden): add search and filter to Leads and Clients pages"
```

---

### Task C7: Leads Kanban Board (BR7)

**Files:**
- Run: `cd braden && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Create: `braden/src/components/admin/kanban/LeadCard.tsx`
- Create: `braden/src/components/admin/kanban/KanbanColumn.tsx`
- Create: `braden/src/components/admin/kanban/LeadsKanban.tsx`
- Modify: `braden/src/pages/admin/Leads.tsx`

**Step 1: Install @dnd-kit**

```bash
cd braden && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Create LeadCard component**

A draggable card showing lead name, email, service interest, and date:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface LeadCardProps {
  lead: { id: string; name: string; email: string; service: string };
}

export function LeadCard({ lead }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-3 cursor-grab active:cursor-grabbing">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
          {lead.service && <p className="text-xs text-muted-foreground mt-1">{lead.service}</p>}
        </div>
      </div>
    </Card>
  );
}
```

**Step 3: Create KanbanColumn component**

A droppable column with title and count:

```tsx
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  items: string[];
}

export function KanbanColumn({ id, title, count, children, items }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`flex flex-col min-w-[280px] max-w-[320px] rounded-lg border bg-muted/30 ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[100px] overflow-y-auto">
          {children}
        </div>
      </SortableContext>
    </div>
  );
}
```

**Step 4: Create LeadsKanban component**

Main board with `DndContext`, `DragOverlay`, and column mapping:

```tsx
import { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', won: 'Won', lost: 'Lost',
};

interface Lead {
  id: string; name: string; email: string; service: string;
  status: typeof STATUSES[number];
}

interface LeadsKanbanProps {
  leads: Lead[];
  onRefresh: () => void;
}

export function LeadsKanban({ leads, onRefresh }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;

    // Only update if dropped on a column (status) and status changed
    if (STATUSES.includes(newStatus as typeof STATUSES[number])) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.status !== newStatus) {
        const { error } = await supabase
          .from('leads')
          .update({ status: newStatus })
          .eq('id', leadId);

        if (!error) onRefresh();
      }
    }
  };

  const activeLead = leads.find(l => l.id === activeId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const columnLeads = leads.filter(l => l.status === status);
          return (
            <KanbanColumn key={status} id={status} title={STATUS_LABELS[status]} count={columnLeads.length} items={columnLeads.map(l => l.id)}>
              {columnLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </KanbanColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

**Step 5: Add view toggle to Leads.tsx**

Add a view toggle (table vs kanban) at the top of the Leads page:

```tsx
import { LayoutList, Kanban } from 'lucide-react';
import { LeadsKanban } from '@/components/admin/kanban/LeadsKanban';

const [viewMode, setViewMode] = useState<'table' | 'kanban'>(
  () => (localStorage.getItem('braden-leads-view') as 'table' | 'kanban') || 'table'
);

useEffect(() => {
  localStorage.setItem('braden-leads-view', viewMode);
}, [viewMode]);

// In JSX — toggle buttons + conditional render:
<div className="flex gap-1">
  <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
    <LayoutList className="h-4 w-4 mr-1" /> Table
  </Button>
  <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('kanban')}>
    <Kanban className="h-4 w-4 mr-1" /> Board
  </Button>
</div>

{viewMode === 'kanban' ? (
  <LeadsKanban leads={filteredLeads} onRefresh={fetchLeads} />
) : (
  /* existing table render */
)}
```

**Step 6: Verify**

Run: `cd braden && pnpm build`
Expected: Build passes.

**Step 7: Commit**

```bash
git add braden/package.json braden/pnpm-lock.yaml braden/src/components/admin/kanban/ braden/src/pages/admin/Leads.tsx
git commit -m "feat(braden): add Leads kanban board with @dnd-kit drag-and-drop"
```

---

### Task C8: Tasks Kanban Board (BR8)

**Files:**
- Create: `braden/src/components/admin/kanban/TaskCard.tsx`
- Create: `braden/src/components/admin/kanban/TasksKanban.tsx`
- Modify: `braden/src/pages/admin/Tasks.tsx`

**Step 1: Create TaskCard**

Same pattern as LeadCard but showing title, assigned_to, due_date:

```tsx
// Similar to LeadCard but with task-specific fields
export function TaskCard({ task }: { task: Task }) {
  // useSortable, CSS transform, etc.
  return (
    <Card ref={setNodeRef} style={style} className="p-3 cursor-grab active:cursor-grabbing">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{task.title}</p>
          {task.assigned_to && <p className="text-xs text-muted-foreground">{task.assigned_to}</p>}
          {task.due_date && <p className="text-xs text-muted-foreground mt-1">{format(new Date(task.due_date), 'MMM d')}</p>}
        </div>
      </div>
    </Card>
  );
}
```

**Step 2: Create TasksKanban**

3 columns: To Do → In Progress → Done. Same DndContext pattern as LeadsKanban:

```tsx
const STATUSES = ['todo', 'in_progress', 'done'] as const;
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
```

The `handleDragEnd` updates `tasks.status` in Supabase.

**Step 3: Add view toggle to Tasks.tsx**

Same pattern as Leads — table/kanban toggle with localStorage persistence.

**Step 4: Verify & Commit**

```bash
cd braden && pnpm build
git add braden/src/components/admin/kanban/TaskCard.tsx braden/src/components/admin/kanban/TasksKanban.tsx braden/src/pages/admin/Tasks.tsx
git commit -m "feat(braden): add Tasks kanban board with @dnd-kit drag-and-drop"
```

---

## Execution Strategy

### Parallel Streams

| Stream | Tasks | Estimated Steps |
|--------|-------|----------------|
| **A: R80.3** | A1 → A2 → A3 → A4 | 4 tasks, ~16 steps |
| **B: BSU** | B1 → B2 | 2 tasks, ~8 steps |
| **C: braden** | C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8 | 8 tasks, ~30 steps |

Streams A, B, C are fully independent — run as 3 parallel subagents.

Within each stream, tasks are sequential (especially braden where later tasks depend on earlier ones).

### Verification

After all streams complete:
1. `cd R80.3 && pnpm build` ✓
2. `cd business-suite-unified && pnpm build` ✓
3. `cd braden && pnpm build` ✓
4. Visual spot-check: year filter, view toggle, export button, sortable headers, empty states, health checks, admin sidebar, lead forms, kanban boards

### Final Commit

```bash
git add -A
git commit -m "feat(shared): cross-project UX improvements — R80.3 views/sort/filter, BSU honest health, braden admin overhaul"
```
