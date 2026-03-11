# D2C Theme & Capability Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all hardcoded business data from production routes, create a real demo user in Supabase, wire financial report editing to a dedicated route backed by real persistence, expand Add Person for apprentice/trainee completeness, and install the approved Magic UI components with per-app accent tokens.

**Architecture:** Claude Code owns A1 (demo user + data removal), A2 (financial report routes), A3 (person form completeness), and Phases 4+5 (Magic UI installs + per-app tokens for all four D2C apps). Cascade owns B1–B3 (visual shell). No shared files are touched simultaneously. Each chunk commits independently and leaves typecheck clean.

**RLS write behavior note:** The demo write block uses RESTRICTIVE RLS that hard-fails at the DB layer when `persist_demo_data = false`. This means write attempts return a Supabase error (visible in error toasts). The `DemoBanner` sets the expectation that changes won't save — users who see an error toast have the same information. This is simpler and more reliable than an optimistic-UI layer that silently swallows writes.

**Tech Stack:** React 18, Vite 6, TypeScript strict, Zustand 5, TanStack Query v5, wouter, shadcn/ui, supabase-js v2, Vitest, pnpm

---

## Chunk 1: Demo User Architecture + Remove Hardcoded Data (A1)

### Context

`Dashboard.tsx` lines 54–63 contain `DEMO_METRICS` (hardcoded revenue/pipeline numbers used as a fallback). `financial/reports/index.tsx` lines 69–119 contain `DUMMY_REPORTS`. The goal is:

1. Create a real "Demo Tenant" in Supabase seeded with GTO-realistic data
2. Add "Impersonate Demo" to the `DeveloperToolbar` footer — same flow as existing tenant impersonation
3. Add a `persist_demo_data` flag in `tenant_settings` for the demo tenant
4. Show a persistent toast banner whenever viewing the demo tenant
5. Remove `DEMO_METRICS` from `Dashboard.tsx` — show empty state if live query returns zeros
6. Remove `DUMMY_REPORTS` from `financial/reports/index.tsx`

### Task 1: Migration — demo tenant, RLS write block, persist flag

**Files:**
- Create: `crm7/supabase/migrations/20260311000000_create_demo_tenant.sql`

- [ ] **Step 1.1: Write the migration**

```sql
-- 20260311000000_create_demo_tenant.sql
-- Creates the Demo tenant with seeded GTO data.
-- RLS write restriction: demo tenant's authenticated users cannot
-- INSERT/UPDATE/DELETE on any core business table.

BEGIN;

-- ─── 1. Demo tenant ───────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, settings)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Demo Organisation — CRM7',
  'demo',
  jsonb_build_object(
    'persist_demo_data', false,
    'demo_tenant', true,
    'white_label', jsonb_build_object()
  )
)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Demo user account ─────────────────────────────────────────────────
-- auth.users row is created via Supabase dashboard / admin API
-- (cannot be inserted directly from SQL migrations).
-- After running migration, create the user via:
--   supabase auth admin create-user \
--     --email demo@crm7.app \
--     --password <strong-password> \
--     --no-auto-confirm
-- Then run the seed script (Task 2) which wires user_tenants.

-- ─── 3. RLS write restriction for demo tenant ─────────────────────────────
-- All write operations (INSERT/UPDATE/DELETE) on core tables are blocked
-- when the acting user belongs to the demo tenant AND
-- persist_demo_data is false.

CREATE OR REPLACE FUNCTION is_demo_write_blocked() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (
      SELECT (t.settings->>'demo_tenant')::boolean = true
        AND (t.settings->>'persist_demo_data')::boolean = false
      FROM user_tenants ut
      JOIN tenants t ON t.id = ut.tenant_id
      WHERE ut.user_id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

-- Apply to people table as example (repeat pattern for other core tables):
CREATE POLICY demo_no_insert ON people
  AS RESTRICTIVE FOR INSERT TO authenticated
  USING (NOT is_demo_write_blocked());

CREATE POLICY demo_no_update ON people
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT is_demo_write_blocked());

CREATE POLICY demo_no_delete ON people
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT is_demo_write_blocked());

-- Apply same pattern to: financial_reports, contacts, opportunities
-- (add additional policies below as tables are implemented)

COMMIT;
```

- [ ] **Step 1.2: Apply to local Supabase**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
npx supabase db push
```

Expected: migration applies without errors.

- [ ] **Step 1.3: Commit migration**

```bash
git add crm7/supabase/migrations/20260311000000_create_demo_tenant.sql
git commit -m "feat(crm7): add demo tenant migration with RLS write block"
```

---

### Task 2: Demo seed data script

**Files:**
- Create: `crm7/scripts/seed-demo-tenant.ts`

- [ ] **Step 2.1: Write the seed script**

```typescript
// crm7/scripts/seed-demo-tenant.ts
// Run with: pnpm tsx scripts/seed-demo-tenant.ts
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const DEMO_TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getDemoUserId(): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find(u => u.email === 'demo@crm7.app');
  if (!user) throw new Error('Demo user not found — create via supabase auth admin create-user first');
  return user.id;
}

async function seed() {
  const demoUserId = await getDemoUserId();

  // Wire user to tenant
  await supabase.from('user_tenants').upsert({
    user_id: demoUserId,
    tenant_id: DEMO_TENANT_ID,
    role: 'admin',
  }, { onConflict: 'user_id,tenant_id' });

  // Seed contacts (10 realistic GTO contacts)
  const contacts = [
    { tenant_id: DEMO_TENANT_ID, first_name: 'James', last_name: 'Nguyen', email: 'james.nguyen@demo.crm7.app', status: 'active' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah.mitchell@demo.crm7.app', status: 'active' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Liam', last_name: 'O\'Brien', email: 'liam.obrien@demo.crm7.app', status: 'prospect' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Emma', last_name: 'Patel', email: 'emma.patel@demo.crm7.app', status: 'active' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Noah', last_name: 'Williams', email: 'noah.williams@demo.crm7.app', status: 'active' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Ava', last_name: 'Thompson', email: 'ava.thompson@demo.crm7.app', status: 'inactive' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Oliver', last_name: 'Brown', email: 'oliver.brown@demo.crm7.app', status: 'active' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Isabella', last_name: 'Davis', email: 'isabella.davis@demo.crm7.app', status: 'active' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'William', last_name: 'Taylor', email: 'william.taylor@demo.crm7.app', status: 'prospect' },
    { tenant_id: DEMO_TENANT_ID, first_name: 'Mia', last_name: 'Anderson', email: 'mia.anderson@demo.crm7.app', status: 'active' },
  ];

  const { error: contactsError } = await supabase.from('contacts').upsert(contacts, { onConflict: 'email' });
  if (contactsError) console.error('contacts:', contactsError.message);
  else console.log('✅ Seeded contacts');

  // Seed apprentices (people table, training type)
  const apprentices = [
    {
      tenant_id: DEMO_TENANT_ID,
      first_name: 'Jake', last_name: 'Henderson',
      employment_type: 'apprentice', status: 'active',
      qualification_code: 'CPC30220', qualification_title: 'Certificate III in Carpentry',
      training_contract_number: 'WA-2024-00123', start_date: '2024-01-15',
      usi: 'ABCDE12345',
    },
    {
      tenant_id: DEMO_TENANT_ID,
      first_name: 'Priya', last_name: 'Sharma',
      employment_type: 'trainee', status: 'active',
      qualification_code: 'BSB30120', qualification_title: 'Certificate III in Business',
      training_contract_number: 'WA-2024-00456', start_date: '2024-03-01',
      usi: 'FGHIJ67890',
    },
  ];

  const { error: apprenticeError } = await supabase.from('people').upsert(apprentices, { onConflict: 'tenant_id,training_contract_number' });
  if (apprenticeError) console.error('people:', apprenticeError.message);
  else console.log('✅ Seeded apprentices');

  // Seed financial reports
  const reports = [
    {
      tenant_id: DEMO_TENANT_ID, title: 'Quarterly P&L — Q1 2026',
      type: 'profit-loss', period: 'Q1 2026', status: 'final',
      revenue: 248500, expenses: 186200, profit: 62300,
      created_at: '2026-04-05',
    },
    {
      tenant_id: DEMO_TENANT_ID, title: 'Balance Sheet — March 2026',
      type: 'balance-sheet', period: 'March 2026', status: 'final',
      created_at: '2026-04-05',
    },
    {
      tenant_id: DEMO_TENANT_ID, title: 'Monthly P&L — March 2026',
      type: 'profit-loss', period: 'March 2026', status: 'draft',
      revenue: 83200, expenses: 61800, profit: 21400,
      created_at: '2026-04-01',
    },
  ];

  const { error: reportError } = await supabase.from('financial_reports').upsert(reports, { onConflict: 'tenant_id,title' });
  if (reportError) console.error('financial_reports:', reportError.message);
  else console.log('✅ Seeded financial reports');

  console.log('\nDemo tenant seeded. Tenant ID:', DEMO_TENANT_ID);
}

seed().catch(console.error);
```

- [ ] **Step 2.2: Verify the script runs**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm tsx scripts/seed-demo-tenant.ts
```

Expected: `✅ Seeded contacts`, `✅ Seeded apprentices`, `✅ Seeded financial reports`

- [ ] **Step 2.3: Commit seed script**

```bash
git add crm7/scripts/seed-demo-tenant.ts
git commit -m "feat(crm7): add demo tenant seed script"
```

---

### Task 3: Add "Impersonate Demo" to DeveloperToolbar + demo banner

**Files:**
- Modify: `crm7/src/components/platform/DeveloperToolbar.tsx`
- Create: `crm7/src/components/platform/DemoBanner.tsx`
- Modify: `crm7/src/layouts/MainLayout.tsx`

- [ ] **Step 3.1: Create DemoBanner component**

```tsx
// crm7/src/components/platform/DemoBanner.tsx
import { Button } from '@/components/ui/button';
import { usePlatformRole } from '@/hooks/usePlatformRole';
import { useTenantId } from '@/hooks/useTenantId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FlaskConical, X } from 'lucide-react';

const DEMO_TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

export function DemoBanner() {
  const { tenantId } = useTenantId();
  const { endImpersonation } = usePlatformRole();

  const { data: isDemoTenant } = useQuery({
    queryKey: ['is-demo-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return false;
      const { data } = await supabase
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .single();
      return data?.settings?.demo_tenant === true;
    },
    enabled: !!tenantId,
  });

  if (!isDemoTenant) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-sm text-amber-200"
    >
      <span className="flex items-center gap-2">
        <FlaskConical className="size-4 shrink-0 text-amber-400" aria-hidden />
        <strong className="font-medium">Demo mode</strong>
        <span className="opacity-70">— changes won&apos;t be saved beyond this session.</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-amber-300 hover:text-amber-100 hover:bg-amber-500/20"
        onClick={endImpersonation}
        aria-label="Exit demo mode"
      >
        <X className="size-4" />
        Exit demo
      </Button>
    </div>
  );
}
```

- [ ] **Step 3.2: Add DemoBanner to MainLayout**

Find the return in `crm7/src/layouts/MainLayout.tsx`. Add `<DemoBanner />` as the first child inside the outermost layout wrapper, before the sidebar/content:

```tsx
import { DemoBanner } from '@/components/platform/DemoBanner';

// Inside the layout JSX, as first child:
<DemoBanner />
```

- [ ] **Step 3.3: Add "Impersonate Demo" + "Persist demo data" toggle to DeveloperToolbar**

In `crm7/src/components/platform/DeveloperToolbar.tsx`, after the existing impersonation items in the dropdown, add:

```tsx
import { useState, useCallback } from 'react';
import { FlaskConical, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DEMO_TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Add local state in the DeveloperToolbar component:
const [persistDemo, setPersistDemo] = useState(false);

const togglePersistDemo = useCallback(async () => {
  const next = !persistDemo;
  setPersistDemo(next);
  await supabase
    .from('tenants')
    .update({ settings: { persist_demo_data: next, demo_tenant: true } })
    .eq('id', DEMO_TENANT_ID);
}, [persistDemo]);

// Inside the DropdownMenuContent, add a dedicated Demo section:
<DropdownMenuSeparator />
<DropdownMenuLabel className="text-xs text-muted-foreground">Demo</DropdownMenuLabel>
<DropdownMenuItem
  onClick={() => startImpersonation(DEMO_TENANT_ID, 'Demo mode')}
>
  <FlaskConical className="mr-2 size-4 text-amber-400" />
  Impersonate Demo Tenant
</DropdownMenuItem>
<DropdownMenuItem onClick={togglePersistDemo}>
  {persistDemo
    ? <ToggleRight className="mr-2 size-4 text-emerald-400" />
    : <ToggleLeft className="mr-2 size-4 text-muted-foreground" />
  }
  Persist demo data {persistDemo ? '(ON)' : '(OFF)'}
</DropdownMenuItem>
```

Note: `togglePersistDemo` uses a raw JSONB update. In production the `settings` merge should preserve existing keys — use `jsonb_set` in a Supabase RPC if needed, but for the developer-only toolbar this direct update is acceptable.

- [ ] **Step 3.4: Run typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 3.5: Commit**

```bash
git add crm7/src/components/platform/DemoBanner.tsx \
  crm7/src/components/platform/DeveloperToolbar.tsx \
  crm7/src/layouts/MainLayout.tsx
git commit -m "feat(crm7): add demo tenant banner and DeveloperToolbar shortcut"
```

---

### Task 4: Remove DEMO_METRICS from Dashboard.tsx

**Files:**
- Modify: `crm7/src/pages/Dashboard.tsx`

The `DEMO_METRICS` constant (lines 54–63) is used as a fallback when live query data is absent. Remove it and replace with an explicit empty-state path.

- [ ] **Step 4.1: Locate the DEMO_METRICS usage**

```bash
grep -n "DEMO_METRICS" /home/braden/Desktop/Dev/bsuite/crm7/src/pages/Dashboard.tsx
```

- [ ] **Step 4.2: Remove the constant and replace fallbacks**

Delete lines 54–63 (the `DEMO_METRICS` constant).

Find all uses of `DEMO_METRICS` in the file. They will be in the query fallback or metrics display. Replace the pattern:

```tsx
// BEFORE (typical pattern):
const metrics = data ?? DEMO_METRICS;

// AFTER:
const metrics = data ?? null;
```

In the JSX, anywhere `metrics` might be null, render the existing `EmptyState` or a skeleton. The dashboard already handles `isLoading` — ensure `!metrics` also shows the empty/skeleton state:

```tsx
if (isLoading || !metrics) {
  return <DashboardSkeleton />;
}
```

If there is no `DashboardSkeleton`, use the existing loading spinner pattern already present in the file.

- [ ] **Step 4.3: Typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4.4: Commit**

```bash
git add crm7/src/pages/Dashboard.tsx
git commit -m "fix(crm7): remove DEMO_METRICS hardcoded fallback from Dashboard"
```

---

### Task 5: Remove DUMMY_REPORTS from financial/reports/index.tsx

**Files:**
- Modify: `crm7/src/pages/financial/reports/index.tsx`
- Modify: `crm7/src/lib/data/financialQueries.ts`

- [ ] **Step 5.1: Add real report query to financialQueries.ts**

Append to `crm7/src/lib/data/financialQueries.ts`:

```typescript
export interface FinancialReport {
  id: string;
  tenant_id: string;
  title: string;
  type: 'profit-loss' | 'balance-sheet' | 'cash-flow' | 'tax' | 'custom';
  period: string;
  status: 'draft' | 'final';
  revenue?: number | null;
  expenses?: number | null;
  profit?: number | null;
  created_at: string;
  updated_at?: string;
}

export async function getFinancialReports(tenantId: string): Promise<FinancialReport[]> {
  const { data, error } = await supabase
    .from('financial_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 5.2: Replace DUMMY_REPORTS usage in reports/index.tsx**

In `crm7/src/pages/financial/reports/index.tsx`:

1. Delete `const DUMMY_REPORTS: FinancialReport[] = [...]` (lines 69–119)
2. Delete the local `type FinancialReport = ...` definition (lines 56–66) — import from `financialQueries.ts` instead
3. Replace the `queryFn` with a real query:

```tsx
import { getFinancialReports, type FinancialReport } from '@/lib/data/financialQueries';
import { useTenantId } from '@/hooks/useTenantId';

// Inside component:
const { tenantId } = useTenantId();
const { data: reports, isLoading, isError, error, refetch } = useQuery<FinancialReport[]>({
  queryKey: ['financial-reports', tenantId],
  queryFn: () => getFinancialReports(tenantId!),
  enabled: !!tenantId,
});
```

4. When `reports` is empty array (not loading, no error), show `<EmptyState>` — import from `@/components/common/EmptyState`.

- [ ] **Step 5.3: Typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5.4: Commit**

```bash
git add crm7/src/pages/financial/reports/index.tsx \
  crm7/src/lib/data/financialQueries.ts
git commit -m "fix(crm7): remove DUMMY_REPORTS, wire financial reports to live query"
```

---

## Chunk 2: Financial Report Lifecycle — Dedicated Routes (A2)

### Context

`financial/reports/index.tsx` currently has "Edit Report" actions that are inert (open the existing `ReportFormDialog` which simulates generation). Replace with a dedicated route flow:

- `/financial/reports` — list (done in Chunk 1)
- `/financial/reports/new` — create via new page
- `/financial/reports/:id` — read-only detail
- `/financial/reports/:id/edit` — edit form backed by Supabase

### Task 6: Migration — financial_reports table

**Files:**
- Create: `crm7/supabase/migrations/20260311000001_create_financial_reports.sql`

- [ ] **Step 6.1: Write the migration**

```sql
-- 20260311000001_create_financial_reports.sql

BEGIN;

CREATE TABLE IF NOT EXISTS financial_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title       text NOT NULL,
  type        text NOT NULL CHECK (type IN ('profit-loss','balance-sheet','cash-flow','tax','custom')),
  period      text NOT NULL,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  revenue     numeric(14,2),
  expenses    numeric(14,2),
  profit      numeric(14,2),
  notes       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY fin_reports_tenant_select ON financial_reports
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY fin_reports_tenant_insert ON financial_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND NOT is_demo_write_blocked()
  );

CREATE POLICY fin_reports_tenant_update ON financial_reports
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()))
  WITH CHECK (NOT is_demo_write_blocked());

CREATE POLICY fin_reports_tenant_delete ON financial_reports
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND NOT is_demo_write_blocked()
  );

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER financial_reports_updated_at
  BEFORE UPDATE ON financial_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

- [ ] **Step 6.2: Apply migration**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
npx supabase db push
```

Expected: applied without errors.

- [ ] **Step 6.3: Commit**

```bash
git add crm7/supabase/migrations/20260311000001_create_financial_reports.sql
git commit -m "feat(crm7): add financial_reports table with RLS"
```

---

### Task 7: Financial report service

**Files:**
- Create: `crm7/src/services/financialReportService.ts`

- [ ] **Step 7.1: Write the service**

```typescript
// crm7/src/services/financialReportService.ts
import { supabase } from '@/lib/supabase';
import type { FinancialReport } from '@/lib/data/financialQueries';

export type CreateReportInput = Omit<FinancialReport, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & {
  tenant_id: string;
};

export type UpdateReportInput = Partial<Omit<FinancialReport, 'id' | 'created_at' | 'tenant_id'>>;

export async function createFinancialReport(input: CreateReportInput): Promise<FinancialReport> {
  const { data, error } = await supabase
    .from('financial_reports')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFinancialReport(
  id: string,
  input: UpdateReportInput
): Promise<FinancialReport> {
  const { data, error } = await supabase
    .from('financial_reports')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFinancialReport(id: string): Promise<FinancialReport> {
  const { data, error } = await supabase
    .from('financial_reports')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFinancialReport(id: string): Promise<void> {
  const { error } = await supabase
    .from('financial_reports')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 7.2: Write a focused test**

```typescript
// crm7/src/services/financialReportService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFinancialReport, updateFinancialReport } from './financialReportService';

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: mockSelect })) }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: mockInsert, update: mockUpdate })),
  },
}));

describe('financialReportService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createFinancialReport returns data on success', async () => {
    const fakeReport = { id: 'r1', title: 'Test', type: 'profit-loss', period: 'Q1', status: 'draft', tenant_id: 't1', created_at: '' };
    mockSingle.mockResolvedValueOnce({ data: fakeReport, error: null });
    const result = await createFinancialReport({ title: 'Test', type: 'profit-loss', period: 'Q1', status: 'draft', tenant_id: 't1' });
    expect(result.id).toBe('r1');
  });

  it('createFinancialReport throws on supabase error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    await expect(createFinancialReport({ title: 'T', type: 'tax', period: 'Q2', status: 'draft', tenant_id: 't1' })).rejects.toMatchObject({ message: 'DB error' });
  });

  it('updateFinancialReport returns updated data', async () => {
    const updated = { id: 'r1', title: 'Updated', status: 'final' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });
    const result = await updateFinancialReport('r1', { title: 'Updated', status: 'final' });
    expect(result.title).toBe('Updated');
  });
});
```

- [ ] **Step 7.3: Run the test**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm test src/services/financialReportService.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 7.4: Commit**

```bash
git add crm7/src/services/financialReportService.ts \
  crm7/src/services/financialReportService.test.ts
git commit -m "feat(crm7): add financialReportService with CRUD and tests"
```

---

### Task 8: Report detail and edit pages

**Files:**
- Create: `crm7/src/pages/financial/reports/[id]/index.tsx` (read-only detail)
- Create: `crm7/src/pages/financial/reports/[id]/edit.tsx` (edit form)
- Modify: `crm7/src/App.tsx` (register new routes)
- Modify: `crm7/src/pages/financial/reports/index.tsx` (wire Edit/View action links)

- [ ] **Step 8.1: Create the report detail page**

```tsx
// crm7/src/pages/financial/reports/[id]/index.tsx
import { PermissionGate } from '@/components/common/PermissionGate';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { getFinancialReport } from '@/lib/data/financialQueries';
import { formatters } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { Pencil, ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'wouter';

export default function FinancialReportDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['financial-report', id],
    queryFn: () => getFinancialReport(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading report…</div>;
  if (isError || !report) return <div className="p-8 text-destructive">Report not found.</div>;

  return (
    <PermissionGate permission="view_financial">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title={report.title}
          description={`${report.period} · ${report.type}`}
          actions={
            <Link href={`/financial/reports/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 size-4" />
                Edit Report
              </Button>
            </Link>
          }
          breadcrumbs={[
            { label: 'Financial', href: '/financial' },
            { label: 'Reports', href: '/financial/reports' },
            { label: report.title },
          ]}
        />
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {report.revenue != null && (
              <div><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-semibold">{formatters.currency(report.revenue)}</p></div>
            )}
            {report.expenses != null && (
              <div><p className="text-sm text-muted-foreground">Expenses</p><p className="text-2xl font-semibold">{formatters.currency(report.expenses)}</p></div>
            )}
            {report.profit != null && (
              <div><p className="text-sm text-muted-foreground">Profit</p><p className="text-2xl font-semibold text-emerald-500">{formatters.currency(report.profit)}</p></div>
            )}
          </CardContent>
        </Card>
        <div className="flex">
          <Link href="/financial/reports">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 size-4" />Back to Reports</Button>
          </Link>
        </div>
      </div>
    </PermissionGate>
  );
}
```

- [ ] **Step 8.2: Create the report edit page**

```tsx
// crm7/src/pages/financial/reports/[id]/edit.tsx
import { PermissionGate } from '@/components/common/PermissionGate';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getFinancialReport } from '@/lib/data/financialQueries';
import { updateFinancialReport } from '@/services/financialReportService';
import { queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, ArrowLeft } from 'lucide-react';
import { Link, useParams, useLocation } from 'wouter';

const editReportSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['profit-loss', 'balance-sheet', 'cash-flow', 'tax', 'custom']),
  period: z.string().min(1, 'Period is required'),
  status: z.enum(['draft', 'final']),
  revenue: z.number().nonnegative().optional().nullable(),
  expenses: z.number().nonnegative().optional().nullable(),
  profit: z.number().optional().nullable(),
  notes: z.string().optional(),
});

type EditReportForm = z.infer<typeof editReportSchema>;

export default function FinancialReportEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: report, isLoading } = useQuery({
    queryKey: ['financial-report', id],
    queryFn: () => getFinancialReport(id!),
    enabled: !!id,
  });

  const form = useForm<EditReportForm>({
    resolver: zodResolver(editReportSchema),
    values: report
      ? {
          title: report.title,
          type: report.type,
          period: report.period,
          status: report.status,
          revenue: report.revenue ?? null,
          expenses: report.expenses ?? null,
          profit: report.profit ?? null,
          notes: '',
        }
      : undefined,
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (values: EditReportForm) => updateFinancialReport(id!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-report', id] });
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      toast({ title: 'Report saved', description: 'Changes have been saved.' });
      navigate(`/financial/reports/${id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!report) return <div className="p-8 text-destructive">Report not found.</div>;

  return (
    <PermissionGate permission="manage_financial">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Edit Report"
          description={report.title}
          breadcrumbs={[
            { label: 'Financial', href: '/financial' },
            { label: 'Reports', href: '/financial/reports' },
            { label: report.title, href: `/financial/reports/${id}` },
            { label: 'Edit' },
          ]}
        />
        <Card>
          <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(values => save(values))} className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                        <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                        <SelectItem value="cash-flow">Cash Flow</SelectItem>
                        <SelectItem value="tax">Tax Report</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl><Input placeholder="e.g. Q1 2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="revenue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expenses" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expenses ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={isPending}>
                    <Save className="mr-2 size-4" />
                    {isPending ? 'Saving…' : 'Save Changes'}
                  </Button>
                  <Link href={`/financial/reports/${id}`}>
                    <Button type="button" variant="outline">
                      <ArrowLeft className="mr-2 size-4" />
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
```

- [ ] **Step 8.3: Register routes in App.tsx**

In `crm7/src/App.tsx`, add lazy imports and routes:

```tsx
// After FinancialReportsRaw import (around line 180):
const FinancialReportDetailRaw = lazy(() => retryImport(() => import('./pages/financial/reports/[id]/index')));
const FinancialReportDetail = withFeatureGate(FinancialReportDetailRaw, 'financial_dashboard', 'Financial Dashboard');
const FinancialReportEditRaw = lazy(() => retryImport(() => import('./pages/financial/reports/[id]/edit')));
const FinancialReportEdit = withFeatureGate(FinancialReportEditRaw, 'financial_dashboard', 'Financial Dashboard');
```

```tsx
// After the /financial/reports route (around line 709), ADD before /financial:
<ProtectedRoute path="/financial/reports/:id/edit" component={() => <S component={FinancialReportEdit} />} routeName="Edit Report" permission="manage_financial" />
<ProtectedRoute path="/financial/reports/:id" component={() => <S component={FinancialReportDetail} />} routeName="Report Detail" permission="view_financial" />
```

**Important:** In wouter, more specific paths must come before more general ones. `/financial/reports/:id/edit` must be before `/financial/reports/:id` which must be before `/financial/reports`.

- [ ] **Step 8.4: Wire list page action links**

In `crm7/src/pages/financial/reports/index.tsx`, find the "Edit Report" dropdown item. Replace the `onClick` that opened the dialog with:

```tsx
import { Link } from 'wouter';

// In the DropdownMenuItem for Edit:
<Link href={`/financial/reports/${report.id}/edit`}>
  <DropdownMenuItem>Edit Report</DropdownMenuItem>
</Link>

// In the DropdownMenuItem for View:
<Link href={`/financial/reports/${report.id}`}>
  <DropdownMenuItem>View Report</DropdownMenuItem>
</Link>
```

Also remove the `reportFormOpen` state and `<ReportFormDialog>` from the page — it's replaced by the dedicated routes. Wire the "New Report" button to `/financial/reports/new` (implemented in Task 8.7 below).

- [ ] **Step 8.7: Create /financial/reports/new page**

Create `crm7/src/pages/financial/reports/new.tsx`:

```tsx
// crm7/src/pages/financial/reports/new.tsx
import { PermissionGate } from '@/components/common/PermissionGate';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';
import { createFinancialReport } from '@/services/financialReportService';
import { queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';

const newReportSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['profit-loss', 'balance-sheet', 'cash-flow', 'tax', 'custom']),
  period: z.string().min(1, 'Period is required'),
  status: z.enum(['draft', 'final']),
  revenue: z.number().nonnegative().optional().nullable(),
  expenses: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional(),
});

type NewReportForm = z.infer<typeof newReportSchema>;

export default function FinancialReportNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { tenantId } = useTenantId();

  const form = useForm<NewReportForm>({
    resolver: zodResolver(newReportSchema),
    defaultValues: { status: 'draft' },
  });

  const { mutate: create, isPending } = useMutation({
    mutationFn: (values: NewReportForm) =>
      createFinancialReport({ ...values, tenant_id: tenantId! }),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      toast({ title: 'Report created' });
      navigate(`/financial/reports/${report.id}`);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create report', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <PermissionGate permission="manage_financial">
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="New Report"
          breadcrumbs={[
            { label: 'Financial', href: '/financial' },
            { label: 'Reports', href: '/financial/reports' },
            { label: 'New' },
          ]}
        />
        <Card>
          <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(v => create(v))} className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Quarterly P&L — Q2 2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                        <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                        <SelectItem value="cash-flow">Cash Flow</SelectItem>
                        <SelectItem value="tax">Tax Report</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="period" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl><Input placeholder="Q2 2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="revenue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expenses" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expenses ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea rows={3} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={isPending || !tenantId}>
                    <Save className="mr-2 size-4" />
                    {isPending ? 'Creating…' : 'Create Report'}
                  </Button>
                  <Link href="/financial/reports">
                    <Button type="button" variant="outline"><ArrowLeft className="mr-2 size-4" />Cancel</Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
```

Register the route in App.tsx alongside the others:

```tsx
const FinancialReportNewRaw = lazy(() => retryImport(() => import('./pages/financial/reports/new')));
const FinancialReportNew = withFeatureGate(FinancialReportNewRaw, 'financial_dashboard', 'Financial Dashboard');

// Route (must come before /financial/reports/:id):
<ProtectedRoute path="/financial/reports/new" component={() => <S component={FinancialReportNew} />} routeName="New Report" permission="manage_financial" />
```

Also add "New Report" button to the list page header (if not already present):

```tsx
<Link href="/financial/reports/new">
  <Button size="sm"><Plus className="mr-2 size-4" />New Report</Button>
</Link>
```

- [ ] **Step 8.5: Typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 8.6: Commit**

```bash
git add \
  crm7/src/pages/financial/reports/[id]/index.tsx \
  crm7/src/pages/financial/reports/[id]/edit.tsx \
  crm7/src/pages/financial/reports/index.tsx \
  crm7/src/App.tsx
git commit -m "feat(crm7): wire financial report edit/detail to dedicated routes"
```

---

## Chunk 3: Add Person — Apprentice/Trainee Completeness (A3)

### Context

`people/new.tsx` already has an `isTraining` boolean and some qualification fields, but is missing required GTO fields: employer ABN, supervisor details, STA notification status, funding body. The Zod schema in `schemas/person.ts` has these as optional — they need to be required for training types via `superRefine`.

### Task 9: Expand person schema for training types

**Files:**
- Modify: `crm7/src/schemas/person.ts`

- [ ] **Step 9.1: Read the full superRefine section**

```bash
grep -n "superRefine\|training_contract\|employer_abn\|supervisor" \
  /home/braden/Desktop/Dev/bsuite/crm7/src/schemas/person.ts
```

- [ ] **Step 9.2: Add missing base fields and superRefine rules**

In `personBaseSchema`, add these fields if not already present:

```typescript
// Employer / GTO
employer_abn: z.string().optional(),
host_employer_abn: z.string().optional(),

// Supervisor
supervisor_name: z.string().optional(),
supervisor_phone: z.string().optional(),

// RTO (denormalised — needed at record creation even if RTO not pre-registered)
rto_name: z.string().optional(),
rto_toid: z.string().optional(),   // Training Organisation ID — used by STAs to identify the RTO

// STA + funding
sta_notification_status: z.enum(['not_notified', 'notified', 'acknowledged']).optional(),
funding_body_id: z.string().uuid().optional(),
```

In the `superRefine` block, add required checks for training types:

```typescript
// Inside superRefine, after/alongside existing qualification checks:
if (data.employment_type === 'apprentice' || data.employment_type === 'trainee') {
  if (!data.training_contract_number) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['training_contract_number'], message: 'Training contract number is required' });
  }
  if (!data.training_provider_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['training_provider_id'], message: 'Training provider (RTO) is required' });
  }
  if (!data.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start_date'], message: 'Employment start date is required' });
  }
  if (!data.employer_abn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employer_abn'], message: 'Host employer ABN is required' });
  }
  if (!data.supervisor_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['supervisor_name'], message: 'Supervisor name is required' });
  }
  if (!data.usi) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['usi'], message: 'USI is required for apprentices and trainees' });
  }
}
```

- [ ] **Step 9.3: Write schema tests**

Create `crm7/src/schemas/person.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { personSchema } from './person';

const baseTraining = {
  employment_type: 'apprentice' as const,
  first_name: 'Jake',
  last_name: 'Smith',
  email: 'jake@test.com',
};

describe('personSchema — training type validation', () => {
  it('rejects apprentice missing training_contract_number', () => {
    const result = personSchema.safeParse({ ...baseTraining });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('training_contract_number');
    }
  });

  it('rejects apprentice missing usi', () => {
    const result = personSchema.safeParse({ ...baseTraining, training_contract_number: 'WA-2024-001' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0]);
      expect(paths).toContain('usi');
    }
  });

  it('accepts apprentice with all required fields', () => {
    const result = personSchema.safeParse({
      ...baseTraining,
      training_contract_number: 'WA-2024-001',
      training_provider_id: '11111111-0000-0000-0000-000000000001',
      start_date: '2024-01-15',
      employer_abn: '12 345 678 901',
      supervisor_name: 'John Manager',
      usi: 'ABCDE12345',
    });
    expect(result.success).toBe(true);
  });

  it('accepts non-training type without training fields', () => {
    const result = personSchema.safeParse({
      employment_type: 'labour_hire_ft',
      hourly_rate: 35.5,
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 9.4: Run schema tests**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm test src/schemas/person.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add crm7/src/schemas/person.ts crm7/src/schemas/person.test.ts
git commit -m "feat(crm7): require training fields in personSchema for apprentice/trainee"
```

---

### Task 10: Expand people/new.tsx with training-required fields

**Files:**
- Modify: `crm7/src/pages/people/new.tsx`

- [ ] **Step 10.1: Add employer ABN, supervisor, and STA sections to the form**

Find the `isTraining` conditional block in `people/new.tsx`. Add new Card sections after the existing qualification fields:

```tsx
{isTraining && (
  <>
    {/* --- Existing qualification section (already present) --- */}

    {/* --- Employer / Host --- */}
    <Card>
      <CardHeader><CardTitle>Host Employer</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="employer_abn">
            Host Employer ABN <span className="text-destructive">*</span>
          </Label>
          <Input
            id="employer_abn"
            placeholder="12 345 678 901"
            value={(formData.employer_abn as string) ?? ''}
            onChange={e => setFormData(prev => ({ ...prev, employer_abn: e.target.value }))}
          />
          {errors.employer_abn && <p className="text-sm text-destructive">{errors.employer_abn}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="host_employer_abn">Host Employer (if different)</Label>
          <EmployerSelector
            value={(formData.current_host_employer_id as string) ?? ''}
            onChange={id => setFormData(prev => ({ ...prev, current_host_employer_id: id }))}
          />
        </div>
      </CardContent>
    </Card>

    {/* --- Supervisor --- */}
    <Card>
      <CardHeader><CardTitle>Supervisor</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="supervisor_name">
            Supervisor Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="supervisor_name"
            placeholder="Jane Smith"
            value={(formData.supervisor_name as string) ?? ''}
            onChange={e => setFormData(prev => ({ ...prev, supervisor_name: e.target.value }))}
          />
          {errors.supervisor_name && <p className="text-sm text-destructive">{errors.supervisor_name}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="supervisor_phone">Supervisor Phone</Label>
          <Input
            id="supervisor_phone"
            type="tel"
            placeholder="04XX XXX XXX"
            value={(formData.supervisor_phone as string) ?? ''}
            onChange={e => setFormData(prev => ({ ...prev, supervisor_phone: e.target.value }))}
          />
        </div>
      </CardContent>
    </Card>

    {/* --- STA Notification --- */}
    <Card>
      <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sta_notification_status">STA Notification Status</Label>
          <Select
            value={(formData.sta_notification_status as string) ?? ''}
            onValueChange={v => setFormData(prev => ({ ...prev, sta_notification_status: v }))}
          >
            <SelectTrigger id="sta_notification_status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_notified">Not Notified</SelectItem>
              <SelectItem value="notified">Notified</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  </>
)}
```

- [ ] **Step 10.2: Typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 10.3: Commit**

```bash
git add crm7/src/pages/people/new.tsx
git commit -m "feat(crm7): expand Add Person with required apprentice/trainee GTO fields"
```

---

## Chunk 4: Magic UI Installs + Per-App Accent Tokens

### Context

Three Magic UI components are already hand-copied: `blur-fade.tsx`, `border-beam.tsx`, `number-ticker.tsx`. Five more need installing via `npx shadcn@canary add`. Per-app accent tokens (`--app-primary`, `--app-accent`, `--app-primary-glow`, `--app-accent-glow`) need adding to each D2C app's `theme.css`.

Cascade handles the layout/visual work (B1–B3). Claude Code installs components and sets up tokens.

### Task 11: Install Magic UI components

**Files:**
- Create: `crm7/src/components/magicui/dot-pattern.tsx`
- Create: `crm7/src/components/magicui/animated-gradient-text.tsx`
- Create: `crm7/src/components/magicui/shine-border.tsx`
- Create: `crm7/src/components/magicui/meteors.tsx`
- Create: `crm7/src/components/magicui/typing-animation.tsx`

- [ ] **Step 11.1: Install dot-pattern**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
npx shadcn@canary add dot-pattern
```

Expected: `crm7/src/components/magicui/dot-pattern.tsx` created.

- [ ] **Step 11.2: Install animated-gradient-text**

```bash
npx shadcn@canary add animated-gradient-text
```

- [ ] **Step 11.3: Install shine-border**

```bash
npx shadcn@canary add shine-border
```

- [ ] **Step 11.4: Install meteors**

```bash
npx shadcn@canary add meteors
```

- [ ] **Step 11.5: Install typing-animation**

```bash
npx shadcn@canary add typing-animation
```

- [ ] **Step 11.6: Typecheck after installs**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

Expected: 0 errors. If any component has an import error, fix the alias manually (e.g., `@/lib/utils` → correct path).

- [ ] **Step 11.7: Commit**

```bash
git add crm7/src/components/magicui/
git commit -m "feat(crm7): install dot-pattern, animated-gradient-text, shine-border, meteors, typing-animation Magic UI components"
```

---

### Task 12: Per-app accent tokens in theme.css

**Files:**
- Modify: `crm7/src/styles/theme.css`
- Modify: `business-suite-unified/src/index.css` (or equivalent theme file)
- Modify: `conduit/src/app/globals.css` (or equivalent)
- Modify: `R80.3/src/styles/index.css` (or equivalent)

- [ ] **Step 12.1: Locate each app's CSS entry point**

```bash
find /home/braden/Desktop/Dev/bsuite/business-suite-unified/src -name "*.css" | head -5
find /home/braden/Desktop/Dev/bsuite/conduit/src -name "*.css" | head -5
find /home/braden/Desktop/Dev/bsuite/R80.3/src -name "*.css" | head -5
```

- [ ] **Step 12.2: Add CRM7 tokens to theme.css**

In `crm7/src/styles/theme.css`, inside the `:root` block (or add a new `:root` block if tokens don't exist yet):

```css
/* ─── Per-app D2C accent tokens — CRM7 ──────────────────────────────────── */
:root {
  --app-primary: #2563eb;        /* Electric Blue */
  --app-accent: #00cec9;         /* Cyan */
  --app-primary-glow: rgba(37, 99, 235, 0.15);
  --app-accent-glow: rgba(0, 206, 201, 0.12);
}
```

- [ ] **Step 12.3: Add BSU tokens**

In `business-suite-unified/src/index.css`:

```css
/* ─── Per-app D2C accent tokens — BSU Portal ────────────────────────────── */
:root {
  --app-primary: #7c3aed;        /* Purple */
  --app-accent: #a78bfa;         /* Lavender */
  --app-primary-glow: rgba(124, 58, 237, 0.15);
  --app-accent-glow: rgba(167, 139, 250, 0.12);
}
```

- [ ] **Step 12.4: Add Conduit tokens**

In `conduit/src/app/globals.css` (or wherever the app-level CSS lives):

```css
/* ─── Per-app D2C accent tokens — Conduit ATS ───────────────────────────── */
:root {
  --app-primary: #059669;        /* Emerald */
  --app-accent: #34d399;         /* Green */
  --app-primary-glow: rgba(5, 150, 105, 0.15);
  --app-accent-glow: rgba(52, 211, 153, 0.12);
}
```

- [ ] **Step 12.5: Add R80.3 tokens**

R80.3 has two CSS files: `R80.3/src/index.css` and `R80.3/src/styles/theme.css`. Add tokens to `R80.3/src/styles/theme.css` (the theme-specific file):

```css
/* ─── Per-app D2C accent tokens — R80.3 Wage Calculator ─────────────────── */
:root {
  --app-primary: #d97706;        /* Amber */
  --app-accent: #fbbf24;         /* Gold */
  --app-primary-glow: rgba(217, 119, 6, 0.15);
  --app-accent-glow: rgba(251, 191, 36, 0.12);
}
```

- [ ] **Step 12.6: Typecheck each app**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7 && pnpm typecheck
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified && pnpm typecheck
cd /home/braden/Desktop/Dev/bsuite/R80.3 && pnpm typecheck
```

Conduit: `cd /home/braden/Desktop/Dev/bsuite/conduit && pnpm typecheck`

Expected: 0 errors in each.

- [ ] **Step 12.7: Commit**

```bash
cd /home/braden/Desktop/Dev/bsuite
git add \
  crm7/src/styles/theme.css \
  business-suite-unified/src/index.css \
  R80.3/src/styles/theme.css
# conduit path may vary — add whatever CSS file was modified
git add conduit/src/app/globals.css 2>/dev/null || true
git commit -m "feat(shared): add per-app D2C accent CSS tokens to all four D2C apps"
```

---

### Task 13: Apply ShineBorder to CRM7 auth card

Cascade owns B3 (auth visual reference), but the `shine-border` component install is Claude Code's. As a handoff token, apply ShineBorder to the CRM7 login card so Cascade has a working reference.

**Files:**
- Modify: `crm7/src/pages/auth/login.tsx`

- [ ] **Step 13.1: Find the login card wrapper**

```bash
grep -n "Card\|card\|LoginCard\|form" crm7/src/pages/auth/login.tsx | head -20
```

- [ ] **Step 13.2: Wrap login card in ShineBorder**

Import and wrap the outermost card container:

```tsx
import { ShineBorder } from '@/components/magicui/shine-border';

// Wrap the existing Card:
<ShineBorder
  className="rounded-xl"
  color={["#2563eb", "#00cec9", "#7c3aed"]}
  borderWidth={1.5}
>
  <Card className="...existing classes...">
    {/* existing card content */}
  </Card>
</ShineBorder>
```

The rainbow sweep on auth is intentional (per the reference login screenshot). Do not apply ShineBorder anywhere else.

- [ ] **Step 13.3: Typecheck**

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7
pnpm typecheck
```

- [ ] **Step 13.4: Commit**

```bash
git add crm7/src/pages/auth/login.tsx
git commit -m "feat(crm7): apply ShineBorder to auth login card — B3 reference handoff"
```

---

## Verification Checklist (run after all chunks)

- [ ] `cd crm7 && pnpm typecheck` — 0 errors
- [ ] `cd business-suite-unified && pnpm typecheck` — 0 errors
- [ ] `cd conduit && pnpm typecheck` — 0 errors
- [ ] `cd R80.3 && pnpm typecheck` — 0 errors
- [ ] `grep -rn "DEMO_METRICS" crm7/src/pages/` — 0 matches
- [ ] `grep -rn "DUMMY_REPORTS" crm7/src/` — 0 matches
- [ ] DeveloperToolbar shows "Impersonate Demo Tenant" item
- [ ] Demo banner appears when impersonating demo tenant
- [ ] `/financial/reports/:id` renders without errors
- [ ] `/financial/reports/:id/edit` renders, saves, redirects to detail
- [ ] ShineBorder visible on `/auth/login` card only
- [ ] `--app-primary` resolves correctly in each app's dev tools (CRM7=blue, BSU=purple, Conduit=green, R80.3=amber)
- [ ] `pnpm test crm7/src/services/financialReportService.test.ts` — 3 pass
- [ ] `pnpm test crm7/src/schemas/person.test.ts` — 4 pass

---

## Handoff to Cascade

After all chunks are committed, update the shared coordination log at `/home/braden/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md` with:

1. Magic UI component installs complete (list components)
2. `--app-primary` / `--app-accent` tokens ready in all four apps
3. ShineBorder on login as B3 reference
4. `financial_reports` table live with RLS
5. Dashboard `DEMO_METRICS` removed — dashboard shows live data or empty state
6. Demo tenant created — impersonate from DeveloperToolbar footer

Cascade can proceed with B1 (bento grid + glow system using `--app-primary-glow` / `--app-accent-glow` tokens) and B2 (Jodie meteors + typing animation).
