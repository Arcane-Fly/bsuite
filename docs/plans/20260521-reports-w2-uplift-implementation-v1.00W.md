# Reports W2 Uplift Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Reference doctrine `docs/plans/uplift/20260507-bsuite-uplift-design-language-v1.00A.md` §6.2.

**Goal:** Uplift CRM7 `/reports/*` to the W2 Airtable-style, fully-customizable reports pattern per uplift doctrine §6.2, replacing the bespoke-page approach in the parity spec.

**Architecture:** Template-driven reports backed by `report_templates` JSONB (`query_definition` discriminated union of `kind: "view" | "rpc"`). One generic `/reports/[key]` run page consumes any template. Builder is a 5-step StepperShell (Describe → Data → Access → Surface → Ship). The 7 Codehouse parity reports become system-seeded templates, not bespoke pages.

**Tech Stack:** React 19 + Vite + wouter + TanStack Query + Supabase RPC/views + shadcn + `@bsuite/data-export` + uplift primitives (StepperShell, EmptyState, PermissionMatrix, EntityPicker, FilterBar).

**Frozen Fact:** `FF-REPORTS-W2-20260521`. Supersedes `docs/20260506-reports-parity-spec-v1.00W.md` for any conflicting recommendation (parity spec's 7 bespoke pages → seeded templates instead).

---

## Status of PR #840 (foundation)

PR #840 shipped `ReportFilterForm`, `ReportTable`, `types.ts`, and a `reportParityService.ts`. **Refactor instead of close** — the components are genuinely doctrine-aligned (filter form + table + export bar are §6.2 row 3). The service needs renaming + signature change. Plan below evolves #840 in-place via Task 1.

---

## Operator decision point — parameter schema design

**Required input before Task 1 starts.** The template's `query_definition` JSONB needs a parameter contract. Two valid approaches; both fit the doctrine; the choice shapes every downstream filter form.

### Option A — Schema-driven (Airtable-pure)

Each template declares its parameter schema inline. The FilterForm reads the schema and auto-renders inputs.

```json
{
  "kind": "rpc",
  "name": "report_timesheet_summary",
  "params": [
    { "key": "startDate", "type": "date", "label": "Start date", "required": true },
    { "key": "endDate",   "type": "date", "label": "End date",   "required": true },
    { "key": "employeeIds", "type": "multi:person", "label": "Employees" },
    { "key": "workType",  "type": "select", "label": "Work type",
      "options": ["on-job", "off-job", "travel", "training"] }
  ]
}
```

Pros: maximum flexibility; user-built reports can declare any param shape; FilterForm is one generic component.
Cons: more code in the FilterForm renderer; need a `ParamSchema` Zod definition; harder to maintain consistency across reports.

### Option B — Fixed base + per-template extras

FilterForm always renders date-range + employee multi-picker + client multi-picker. Templates declare additional report-specific filters in `query_definition.extraFilters[]`.

```json
{
  "kind": "rpc",
  "name": "report_timesheet_summary",
  "baseFilters": ["dateRange", "employees", "clients"],
  "extraFilters": [
    { "key": "workType", "type": "select", "options": ["on-job", "off-job"] }
  ]
}
```

Pros: consistent UX across all reports (the GTO operator never wonders "where is my date range"); simpler renderer; matches existing crm7 FilterBar primitive.
Cons: less flexible; reports that don't want a date range still get one (could be hidden via flag, but that's a code smell).

**Operator decision (locked 2026-05-21):**

```
DECISION: Option A (pure schema-driven), plus a scope hierarchy
          for save/share/inherit:

  scope:
    platform    — super_admin only; visible to everyone
    enterprise  — enterprise super_admin; visible to enterprise tenant + its sub-orgs only
    tenant      — gto_admin; visible to tenant only (no sub-org inheritance)
    user        — any user; visible only to that user

  every saved report:
    - has a name + tags[]
    - can be marked is_default at its scope (auto-shown in /reports list)
    - has Option A's pure param schema (paramSchema[] per template)

  visibility test matrix (Task 8 Playwright):
    1. super_admin saves "Recommended weekly" at platform → visible to ALL users in ALL tenants
    2. enterprise super_admin saves "Acme custom" at enterprise (parent tenant)
       → visible to Acme HQ + its 3 sub-orgs; NOT visible to non-Acme tenants
    3. regular user saves "My Tuesday report" at user scope → visible only to that user
```

This shapes Task 1's `ReportTemplateDefinition` schema + adds a new Task 1.5 for the scope migration + Task 4 for the "Save as…" UI.

### Scope model — implementation detail

`report_templates` schema additions (Task 1.5):

| Column | Type | Notes |
|--------|------|-------|
| `scope` | `report_scope` enum (`platform`, `enterprise`, `tenant`, `user`) | NEW; replaces ad-hoc `is_system` (kept as computed boolean for back-compat) |
| `user_id` | `UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE` | NEW; set for `scope='user'`, NULL otherwise |
| `is_default` | `BOOLEAN NOT NULL DEFAULT false` | NEW; whether auto-shown in `/reports` list at this scope |
| `tags` | `TEXT[]` | EXISTS — already in WS-5 migration; reuse |

Relaxed CHECK constraint:

```sql
CHECK (
  (scope='platform'   AND tenant_id IS NULL  AND user_id IS NULL)
  OR (scope='enterprise' AND tenant_id IS NOT NULL AND user_id IS NULL)
  OR (scope='tenant'   AND tenant_id IS NOT NULL AND user_id IS NULL)
  OR (scope='user'     AND tenant_id IS NOT NULL AND user_id IS NOT NULL)
)
```

RLS read policy (one SELECT policy covers all):

```sql
CREATE POLICY report_templates_visibility ON public.report_templates
  FOR SELECT TO authenticated
  USING (
    scope = 'platform'
    OR (
      scope = 'enterprise'
      AND tenant_id IN (
        SELECT id FROM public.tenants
        WHERE id = auth_tenant_id() OR id = (SELECT parent_tenant_id FROM public.tenants WHERE id = auth_tenant_id())
      )
    )
    OR (scope = 'tenant' AND tenant_id = auth_tenant_id())
    OR (scope = 'user' AND user_id = auth.uid() AND tenant_id = auth_tenant_id())
  );
```

RLS write policies (split insert/update by scope):

```sql
-- platform: only platform_admin
CREATE POLICY report_templates_platform_write ON public.report_templates
  FOR ALL TO authenticated
  USING (scope = 'platform' AND is_platform_admin())
  WITH CHECK (scope = 'platform' AND is_platform_admin());

-- enterprise: only gto_admin of the parent (enterprise) tenant
CREATE POLICY report_templates_enterprise_write ON public.report_templates
  FOR ALL TO authenticated
  USING (
    scope = 'enterprise'
    AND tenant_id = auth_tenant_id()
    AND is_enterprise_admin()  -- helper to be added; checks parent_tenant_id IS NULL on the tenant row + gto_admin role
  )
  WITH CHECK (
    scope = 'enterprise'
    AND tenant_id = auth_tenant_id()
    AND is_enterprise_admin()
  );

-- tenant: gto_admin
CREATE POLICY report_templates_tenant_write ON public.report_templates
  FOR ALL TO authenticated
  USING (scope = 'tenant' AND tenant_id = auth_tenant_id() AND is_gto_staff())
  WITH CHECK (scope = 'tenant' AND tenant_id = auth_tenant_id() AND is_gto_staff());

-- user: any authenticated user, scoped to their tenant + own user_id
CREATE POLICY report_templates_user_write ON public.report_templates
  FOR ALL TO authenticated
  USING (scope = 'user' AND user_id = auth.uid() AND tenant_id = auth_tenant_id())
  WITH CHECK (scope = 'user' AND user_id = auth.uid() AND tenant_id = auth_tenant_id());
```

`is_enterprise_admin()` helper (new, Task 1.5):

```sql
CREATE OR REPLACE FUNCTION public.is_enterprise_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id IN (SELECT auth_tenant_id())
      AND t.parent_tenant_id IS NULL  -- enterprise = top of hierarchy
      AND EXISTS (
        SELECT 1 FROM public.org_members om
        WHERE om.user_id = auth.uid()
          AND om.tenant_id = t.id
          AND om.gto_role = 'gto_admin'
      )
  );
$$;
```

---

## Reference: existing infrastructure

- [crm7/src/components/reports/ReportBuilder.tsx](crm7/src/components/reports/ReportBuilder.tsx) — 685-line Airtable-style builder with source/field/join selection, RLS, TanStack preview, CSV/XLSX/JSON export. **Survives — gets integrated into the new stepper's Step 2 (Data)**.
- [crm7/src/pages/reports/custom/create.tsx](crm7/src/pages/reports/custom/create.tsx) — 332-line 5-step shell already uses StepperShell-style scaffolding. **Survives — gets the uplift design polish + W2 primitives**.
- [crm7/src/services/reportService.ts](crm7/src/services/reportService.ts) — preview/save service for the custom builder. **Survives — used by builder Step 2**.
- [crm7/src/components/reports/ReportFilterForm.tsx](crm7/src/components/reports/ReportFilterForm.tsx) (PR #840) — **Refactor in Task 1** to accept a `paramSchema` or `extraFilters` per operator decision.
- [crm7/src/components/reports/ReportTable.tsx](crm7/src/components/reports/ReportTable.tsx) (PR #840) — **Keep as-is**, already template-agnostic.
- [crm7/src/services/reportParityService.ts](crm7/src/services/reportParityService.ts) (PR #840) — **Rename + refactor** in Task 1 to `reportTemplateRunnerService.ts` with template-driven dispatch.
- `report_templates` migration `20260423160000_ws5_report_system.sql` — already seeds 8 GTO-compliance templates with `query_definition` JSONB. **Schema works; add 7 Codehouse parity rows in Task 6**.

---

## Task 1.5: Scope schema migration + RLS

**Files:**
- Create: `crm7/supabase/migrations/20260521080000_report_templates_scope_hierarchy.sql`
- Create: `crm7/supabase/tests/database/report_templates_scope.sql` (pgTAP)

**Step 1: enum + columns**

```sql
DO $$ BEGIN
  CREATE TYPE public.report_scope AS ENUM ('platform','enterprise','tenant','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.report_templates
  ADD COLUMN IF NOT EXISTS scope public.report_scope,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Backfill from existing is_system: system rows → 'platform', tenant rows → 'tenant'
UPDATE public.report_templates SET scope = 'platform' WHERE is_system = true AND scope IS NULL;
UPDATE public.report_templates SET scope = 'tenant'   WHERE is_system = false AND scope IS NULL;

ALTER TABLE public.report_templates ALTER COLUMN scope SET NOT NULL;
```

**Step 2: replace CHECK constraint**

Drop the old `chk_report_templates_tenant_or_system`, install the 4-way scope check from the plan above.

**Step 3: replace RLS policies**

Drop legacy `report_templates_*_read` / `report_templates_*_write` policies. Install the new ones (1 SELECT visibility policy + 4 scope-specific FOR ALL write policies, as in the plan above).

**Step 4: `is_enterprise_admin()` helper**

Defined above. SECURITY DEFINER + locked search_path. Tests: invoking as platform_admin returns false; invoking as gto_admin of an enterprise tenant (parent_tenant_id IS NULL) returns true; gto_admin of a sub-org returns false.

**Step 5: pgTAP tests**

- 4 scopes × {can_select, can_insert, can_update, can_delete} = 16 cases per persona × 4 personas (platform_admin / enterprise_admin / tenant_gto_admin / user)
- Specifically test the matrix in the operator decision section:
  - Sub-org user sees enterprise rows from parent_tenant_id
  - Non-enterprise tenant user does NOT see those rows
  - User's own scope='user' rows do NOT show to a sibling user in the same tenant

**Step 6: Commit**

```
feat(db): report_templates 4-scope hierarchy + RLS (platform/enterprise/tenant/user)
```

---

## Task 1: Refactor PR #840 — template-driven runner

**Files:**
- Rename: `crm7/src/services/reportParityService.ts` → `crm7/src/services/reportTemplateRunnerService.ts`
- Rename: `crm7/src/services/reportParityService.test.ts` → `crm7/src/services/reportTemplateRunnerService.test.ts`
- Modify: `crm7/src/components/reports/types.ts` — add `ReportTemplateDefinition`, `ReportParamSchema`, `ReportQueryDefinition` discriminated union
- Modify: `crm7/src/components/reports/ReportFilterForm.tsx` — accept `paramSchema?: ReportParamSchema[]` (renders dynamic inputs) OR `extraFilters?: ReactNode` slot (current API)
- Modify: `crm7/src/components/reports/ReportFilterForm.test.tsx` — add cases for schema-driven rendering
- Update: PR #840 description to reflect W2 doctrine alignment, not parity-spec

**Step 1: Add the discriminated union types**

In `types.ts`, after the existing types, add:

```ts
export type ReportParamType =
  | 'date' | 'string' | 'number' | 'select'
  | 'multi:person' | 'multi:client' | 'multi:host';

export interface ReportParamSchema {
  key: string;
  label: string;
  type: ReportParamType;
  required?: boolean;
  options?: string[]; // for select
}

export type ReportQueryDefinition =
  | { kind: 'view'; source: string }
  | { kind: 'rpc'; name: string };

export type ReportScope = 'platform' | 'enterprise' | 'tenant' | 'user';

export interface ReportTemplateDefinition {
  id: string;
  templateKey: string;
  name: string;
  type: 'compliance' | 'financial' | 'operational';
  description: string;
  queryDefinition: ReportQueryDefinition;
  paramSchema?: ReportParamSchema[];  // Option A: pure schema-driven
  columns: ReportColumn[];
  // Scope hierarchy (Task 1.5)
  scope: ReportScope;
  tenantId: string | null;
  userId: string | null;
  isDefault: boolean;
  tags: string[];
}
```

**Step 2: Rename service + add template-runner**

Move the file, then change the public API from:

```ts
fetchReport<TParams, TRow>({ rpcName, params, page, pageSize })
```

to:

```ts
runReportTemplate<TRow>({
  template: ReportTemplateDefinition,
  params: Record<string, unknown>,
  page?: number,
  pageSize?: number
}): Promise<ReportFetchResult<TRow>>
```

Implementation dispatches on `template.queryDefinition.kind`:
- `'view'` → `supabase.from(source).select('*').limit(pageSize).range(...)`
- `'rpc'` → `supabase.rpc(name, { ...params, p_tenant_id, p_page, p_page_size })`

**Step 3: Update FilterForm to accept paramSchema**

Per operator decision above. If hybrid: keep current `extraFilters` slot AND add optional `paramSchema` for schema-driven render. Both can coexist; consumer chooses.

**Step 4: Update tests**

All existing 24 tests pass with the rename. Add ~6 new tests for the schema-driven path.

**Step 5: Update PR #840 description + push**

Rewrite the PR body to reference this plan (`FF-REPORTS-W2-20260521`), remove the "parity spec foundation" framing, add the W2-doctrine alignment.

**Step 6: Commit**

```
refactor(crm7): rename reportParityService → reportTemplateRunnerService;
add ReportTemplateDefinition + paramSchema (W2 doctrine §6.2)
```

---

## Task 2: Generic `/reports/[key]` run page

**Files:**
- Create: `crm7/src/pages/reports/[key].tsx`
- Create: `crm7/src/services/reportTemplateQueries.ts` — TanStack Query hook `useReportTemplate(key)` that fetches one template row from `report_templates`
- Modify: `crm7/src/App.tsx` (or route definition) — wire the new dynamic route

**Step 1: Write the TanStack Query hook**

```ts
export function useReportTemplate(templateKey: string) {
  return useQuery({
    queryKey: ['report-template', templateKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('template_key', templateKey)
        .single();
      if (error) throw error;
      return data as ReportTemplateDefinition;
    },
  });
}
```

**Step 2: Build the run page**

Composition:
1. `<PageHeader title={template.name} description={template.description}>`
2. `<ReportFilterForm onApply={setParams} paramSchema={template.paramSchema} />`
3. `<ReportTable result={data} columns={template.columns} ... />`
4. `<TechnicalDetails>` showing template metadata (id, kind, source)

State: `params` lifted from filter form → fed to `useQuery(['report-run', templateKey, params], () => runReportTemplate(...))`. **LivePreview** = the query refetches on every `params` change with `keepPreviousData: true` for smoothness.

**Step 3: Add 300ms debounced live preview**

```ts
const debouncedParams = useDebounce(params, 300);
const { data, isFetching } = useQuery({
  queryKey: ['report-run', templateKey, debouncedParams],
  ...
});
```

**Step 4: Tests**

`crm7/src/pages/reports/[key].test.tsx` covers:
- Renders template name + description from the row
- FilterForm change → re-fetches after 300ms
- Error state when template not found (404 vibes)
- Loading state during template fetch + during data fetch

**Step 5: Wire route**

In `wouter` config: `<Route path="/reports/:key" component={ReportRunPage} />`.

**Step 6: Commit**

```
feat(crm7): generic /reports/[key] run page consumes any template (W2)
```

---

## Task 3: Uplift `/reports/custom/create` to W2 stepper

**Files:**
- Modify: `crm7/src/pages/reports/custom/create.tsx` — replace existing scaffold with canonical uplift primitives
- Verify: `crm7/src/components/uplift/*` has `StepperShell`, `EntityPicker`, `SortableList`, `PermissionMatrix`, `EmptyState`, `TechnicalDetails`
- Wire: existing `<ReportBuilder>` slots into Step 2 (Data)

**Step 1: Inventory the uplift primitives**

```bash
ls crm7/src/components/uplift/
```

If `StepperShell`, `EntityPicker`, `SortableList`, `PermissionMatrix` are missing, file an issue against bsuite#635 (the 9-wave uplift tracker) and stub them locally for now — do NOT block on missing primitives.

**Step 2: Compose the 5-step shell**

Per doctrine §5.1 (vertical stepper):

```tsx
<StepperShell
  steps={[
    { label: 'Describe', icon: FileText, content: <DescribeStep /> },
    { label: 'Data', icon: Database, content: <ReportBuilder ... /> },
    { label: 'Access', icon: ShieldCheck, content: <PermissionMatrix ... /> },
    { label: 'Surface', icon: Layout, content: <SurfaceStep ... /> },
    { label: 'Ship', icon: Rocket, content: <ShipStep onSave={saveTemplate} /> },
  ]}
/>
```

**Step 3: Wire save → `report_templates` insert with scope hierarchy**

Step 3 in the stepper ("Access") MUST render a scope picker. Options shown depend on caller's role:

| Caller role | Scope options shown |
|-------------|---------------------|
| `platform_admin` | All 4 — platform, enterprise, tenant, user |
| `enterprise_admin` (gto_admin of a `parent_tenant_id IS NULL` tenant) | enterprise, tenant, user |
| `gto_admin` (sub-org) | tenant, user |
| Regular user | user (only) |

```ts
async function saveTemplate(draft: ReportTemplateDraft) {
  const tenantId = draft.scope === 'platform' ? null : currentTenantId;
  const userId   = draft.scope === 'user' ? currentUserId : null;
  const { error } = await supabase.from('report_templates').insert({
    tenant_id: tenantId,
    user_id:   userId,
    scope:     draft.scope,
    is_default: draft.isDefault,
    template_key: draft.key,
    name: draft.name,
    type: draft.type,
    description: draft.description,
    query_definition: draft.queryDefinition,
    columns: draft.columns,
    tags: draft.tags,
    output_formats: ['csv', 'pdf', 'xlsx'],
  });
  // RLS write policy decides if this is allowed; user sees toast on denial.
  if (error) throw error;
}
```

**Step 4: Tests**

`crm7/src/pages/reports/custom/create.test.tsx` — flow through all 5 steps, save, verify insert call.

**Step 5: Commit**

```
feat(crm7): W2 stepper uplift on /reports/custom/create (5-step Describe→Ship)
```

---

## Task 4: Reports list uplift (`/reports`)

**Files:**
- Modify: `crm7/src/pages/reports/index.tsx` — replace existing list with `TanStackDataTable` of templates

**Step 1: Query scope-visible templates (RLS-scoped on the server)**

Because the RLS visibility policy already filters by scope (Task 1.5), the client just selects `*`; no client-side filtering needed. Group results visually in the list by scope.

```ts
useQuery({
  queryKey: ['report-templates', tenantId],
  queryFn: async () => {
    const { data } = await supabase
      .from('report_templates')
      .select('*')
      // RLS handles scope visibility; no .or() filter needed
      .order('scope', { ascending: true })
      .order('sort_order', { ascending: true });
    return data ?? [];
  },
});
```

**Step 2: Render with DataTable, grouped by scope**

Columns: name, scope chip (platform=blue / enterprise=purple / tenant=green / user=neutral), type chip, description, tags, last-run, owner.
Row click → `navigate(\`/reports/\${template.template_key}\`)`.
EmptyState when no templates.
FilterBar at top: search, scope-chip-filter, type-chip-filter, tag-chip-filter, owner-chip-filter.
Visual sections (collapsible): "Platform recommended" / "Enterprise" / "Tenant" / "Mine".

**Step 3: Tests + commit**

```
feat(crm7): /reports list uplift — TanStack DataTable + FilterBar + EmptyState
```

---

## Task 5: Seed 7 Codehouse parity reports as system templates

**Files:**
- Create: `crm7/supabase/migrations/20260521090000_seed_codehouse_parity_report_templates.sql`

**Step 1: Insert 7 system rows**

For each of `timesheet-summary`, `pay-item-group-hours`, `hours-by-work-type`, `rejected-timesheets`, `consultant-kpi`, `coinvest-lsl`, `pay-items-by-employee`:

All 7 rows seeded as `scope='platform'`, `is_default=true`, with Option A paramSchema embedded:

```sql
INSERT INTO public.report_templates
  (id, tenant_id, user_id, scope, is_default, template_key, name, type, description,
   query_definition, columns, tags, output_formats, sort_order)
VALUES
  (
    gen_random_uuid(), NULL, NULL, 'platform', true,
    'timesheet-summary',
    'Timesheet Summary',
    'operational',
    'Per-employee, per-week hours breakdown (ordinary + overtime + training + billable). Codehouse Workforce One parity row 86.',
    jsonb_build_object(
      'kind', 'rpc',
      'name', 'report_timesheet_summary',
      'paramSchema', jsonb_build_array(
        jsonb_build_object('key','startDate','label','Start date','type','date','required',true),
        jsonb_build_object('key','endDate','label','End date','type','date','required',true),
        jsonb_build_object('key','employeeIds','label','Employees','type','multi:person'),
        jsonb_build_object('key','clientIds','label','Clients','type','multi:client')
      )
    ),
    '[
      {"key":"employee_name","label":"Employee","type":"string"},
      {"key":"client_name","label":"Client","type":"string"},
      {"key":"week_ending","label":"Week ending","type":"date"},
      {"key":"ordinary_hours","label":"Ordinary","type":"duration","align":"right"},
      {"key":"overtime_hours","label":"Overtime","type":"duration","align":"right"},
      {"key":"training_hours","label":"Training","type":"duration","align":"right"},
      {"key":"billable_hours","label":"Billable","type":"duration","align":"right"},
      {"key":"total_hours","label":"Total","type":"duration","align":"right"},
      {"key":"state","label":"State","type":"string"}
    ]'::jsonb,
    ARRAY['parity','codehouse','workforce-one'],
    ARRAY['csv','pdf','xlsx'], 10
  ),
  -- ... 6 more rows with paramSchema tailored per report ...
ON CONFLICT (template_key) DO NOTHING;
```

`paramSchema` per report — guidance:
- `timesheet-summary`, `pay-item-group-hours`, `hours-by-work-type`, `rejected-timesheets`: startDate + endDate + employeeIds + clientIds
- `hours-by-work-type` adds: workType (select: 'on-job','off-job','travel','training')
- `consultant-kpi`: weekEnding (date) only — own-data role-gated
- `coinvest-lsl`: startDate + endDate + employeeIds (no clientIds — LSL is per-employee)
- `pay-items-by-employee`: startDate + endDate + employeeIds (+ optional payItemTypeFilter)

**Step 2: Tests**

`crm7/supabase/tests/database/seed_codehouse_parity_templates.sql` — pgTAP asserts 7 rows present with `is_system=true`.

**Step 3: Commit**

```
feat(db): seed 7 Codehouse parity reports as system templates (W2 doctrine)
```

---

## Task 6: Underlying RPCs / views for the 7 templates

**Files:**
- Create: 7 migration files `crm7/supabase/migrations/20260521091*_report_<key>_rpc.sql`

**Per-RPC contract:**
- `SECURITY INVOKER` + `SET search_path = public, pg_temp`
- Accepts `p_tenant_id`, the report's params, `p_page`, `p_page_size`
- Returns rows + `total_count bigint` carrier (per parity spec §2.2)
- Tenant-scoped via `auth_tenant_id()` (per `20260511043000` canonical pattern)
- RLS defense-in-depth on every underlying table

**Step 1-7: One RPC per report**

Each gets:
- Migration with `CREATE OR REPLACE FUNCTION`
- Performance index (e.g. `idx_timesheets_tenant_week_ending`)
- pgTAP test: tenant filter, paging boundary, RLS denial for cross-tenant

For `consultant-kpi`: additional role gate (`auth.jwt() ->> 'role' = 'field_officer'` in WHERE clause).

For `coinvest-lsl`: depends on `#573.7` — coordinate; do not duplicate.

For `hours-by-work-type`: requires `timesheets.work_type` column — add in this migration if missing.

**Step 8: Commit per RPC**

7 commits, one per RPC. Frequent commits per skill guidance.

---

## Task 7: Reliability hardening (independent — parity spec §6)

**Files:**
- Create: `crm7/supabase/migrations/20260521093000_report_deliveries_reliability.sql`
- Modify: `crm7/supabase/functions/report-delivery/index.ts` — honor timezone + retry once on failure

**Step 1: Migration adds columns**

```sql
ALTER TABLE report_deliveries
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS retry_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE report_deliveries
  ADD CONSTRAINT report_deliveries_retry_max CHECK (retry_count <= 1);
```

**Step 2: Edge function honors timezone**

When evaluating cron schedules, convert tenant `timezone` field → IANA → next-fire-time.

**Step 3: Implement 1-retry policy**

On delivery failure: increment `retry_count`, set `last_attempt_at` + `error_message`, schedule one retry after 5min. After the retry fails, `status = 'failed'`.

**Step 4: Tests**

`crm7/supabase/functions/report-delivery/index.test.ts` covers happy-path, timezone correctness, retry-then-fail, retry-then-succeed.

**Step 5: Commit**

```
feat(crm7): report_deliveries reliability hardening (timezone + retry) [§6 reports parity]
```

---

## Task 8: Playwright smoke (E2E)

**Files:**
- Create: `crm7/tests/e2e/reports-w2.spec.ts`

**Test matrix (operator-specified):**

**A — Basic round-trip:**
1. Open `/reports` → list renders → click "Timesheet Summary" row
2. `/reports/timesheet-summary` page renders → set date range → table populates within 300ms of last edit
3. Click "CSV" → file downloads
4. Open `/reports/custom/create` → step through 5 steps → save → row appears in `/reports`

**B — Scope hierarchy (the test you specified):**

5. **Platform save:** sign in as `platform_admin@test.dev` → `/reports/custom/create` → at Step 3 (Access) select scope=`platform` → save "Platform Test Report" → sign out
6. Sign in as `regular_user@some-tenant.dev` → open `/reports` → ASSERT "Platform Test Report" row visible
7. Sign in as `regular_user@different-tenant.dev` → open `/reports` → ASSERT "Platform Test Report" row visible (platform = everyone)

8. **Enterprise save:** set up enterprise tenant "Acme HQ" (`parent_tenant_id IS NULL`) with 3 sub-orgs (`parent_tenant_id = Acme HQ.id`) and one unrelated tenant "Beta Co"
9. Sign in as enterprise super_admin of Acme HQ → save "Acme Enterprise Report" with scope=`enterprise` → sign out
10. Sign in as a user IN Acme HQ → ASSERT row visible
11. Sign in as a user IN an Acme sub-org → ASSERT row visible
12. Sign in as a user IN Beta Co → ASSERT row NOT visible
13. Sign in as a user IN a non-enterprise tenant (no parent or sibling relationship to Acme) → ASSERT row NOT visible

14. **User save:** sign in as `user_a@tenant.dev` → save "User-A Tuesday Report" with scope=`user` → sign out
15. Sign in as `user_b@tenant.dev` (same tenant, different user) → ASSERT "User-A Tuesday Report" row NOT visible
16. Sign back in as `user_a@tenant.dev` → ASSERT "User-A Tuesday Report" row visible

**C — Permission UI:**

17. As regular user → open `/reports/custom/create` Step 3 → ASSERT only `user` scope chip available
18. As gto_admin (sub-org) → ASSERT `tenant`+`user` chips available, `platform`+`enterprise` disabled with tooltip
19. As enterprise super_admin → ASSERT `enterprise`+`tenant`+`user` chips available, `platform` disabled
20. As platform_admin → ASSERT all 4 chips available

**Step 1: Use `@bsuite/auth` test harness with 4 test personas:**
- `platform_admin@test.dev` (super admin / platform_admin role)
- `acme_enterprise_admin@acme.dev` (gto_admin of an enterprise tenant `parent_tenant_id IS NULL`)
- `tenant_admin@some-tenant.dev` (gto_admin of a non-enterprise tenant)
- `user_a@tenant.dev` + `user_b@tenant.dev` (regular users, same tenant)

Test tenants in seed:
- `Acme HQ` — parent_tenant_id NULL (enterprise)
- `Acme Site 1`, `Acme Site 2`, `Acme Site 3` — parent_tenant_id = Acme HQ.id
- `Beta Co` — parent_tenant_id NULL (different enterprise)
- `Gamma Inc` — parent_tenant_id NULL (non-enterprise — only 1 location)

**Step 2: Run against d.* dev domain per CLAUDE.md frozen fact** — auth callback is allowlisted there.

**Step 3: Commit**

```
test(e2e): W2 reports — full scope hierarchy matrix (platform/enterprise/tenant/user)
```

---

## Task 9: Documentation + dashboard

**Files:**
- Modify: `docs/dashboard/data/dashboard-data.json` — add `reports_w2_status` section with progress
- Modify: `docs/OUTSTANDING.md` — link this plan
- Modify: `docs/20260506-reports-parity-spec-v1.00W.md` — add superseded-by header pointing to this plan

**Step 1: Bump dashboard schema**

Add new section per `chore/dashboard` workflow in CLAUDE.md §10.

**Step 2: Commit + dashboard branch + PR**

```
chore(dashboard): track reports W2 uplift progress + link plan
```

---

## Verification gates (per PR)

- **TypeScript**: `pnpm typecheck` clean
- **Unit tests**: `pnpm vitest run` — all passing
- **pgTAP**: `supabase test db` — all passing for migration PRs
- **Playwright**: `pnpm playwright test reports-w2.spec.ts` — all passing for Task 8
- **Live verify** (per FF-SELF-VALIDATION-20260507 §9.2):
  - Open d.crm.crm7.app → sign in → navigate `/reports` → screenshot
  - Click a report → screenshot the run page
  - Open `/reports/custom/create` → step through → screenshot

---

## Out of scope (followup issues)

- BSU-side Reports nav additions (the operator may want a Reports surface in BSU too — separate plan)
- Report scheduling UI uplift (Task 7 only does the backend reliability; UI uplift is a separate W2.5)
- AI-assisted report builder (`p2 #556` already tracks this — separate roadmap item)
- Mobile-responsive run page layout (the doctrine recommises this but it's a follow-on after the desktop pattern lands)

---

## Addendum 1 — Schema Builder stepper primitives (Q1 decision, 2026-05-21)

**Decision:** Reuse the `@bsuite/schema-builder` stepper primitives. Do NOT clone.

The Schema Builder stepper has 11 test files behind it and is the proven pattern. If `Stepper`, `StepIndicator`, `StepPanel`, and the keyboard-navigation hook are not currently exported as a clean public surface, the right move in Task 3/4 is to **extract** them (either into `@bsuite/schema-builder`'s public exports or a new `@bsuite/schema-builder/stepper` sub-export), bump the package version, and bump the W2 consumer in the same PR or next per Dependency Version Policy §4 item 2.

**Task 3/4 ordering implication:** before the W2 stepper UI is built, Task 3a runs first:

- **Task 3a — Extract stepper primitives from `@bsuite/schema-builder`** — structural-only extraction (no visual changes; that's its own PR with §9.2 evidence per AGENTS.md §9). Publish patch version, update W2 consumer pin.
- **Task 3b — Compose the W2 5-step shell** with the extracted primitives.

**Anti-pattern banned by this addendum:** "I'll re-create a Stepper inside W2 because extracting is harder" — extraction *is* harder; doing it right means future Schema Builder + W2 + any other stepper-needing surface share one source of truth.

## Addendum 2 — `report_shares` table is deferred, not refused (Q2 decision, 2026-05-21)

**Decision:** Do NOT build a `report_shares(report_id, recipient_user_id)` join table now. The 4-scope hierarchy (platform / enterprise / tenant / user) is the contract. `scope='user'` reports are private to their creator — that is the whole point of that scope.

**Future extensibility — record at the top of the Task 1.5 migration:**

```sql
-- FUTURE EXTENSIBILITY (FF-REPORTS-W2-20260521 Addendum 2):
-- Per-recipient sharing of scope='user' reports is additive via a new
-- `report_shares(report_id uuid, recipient_user_id uuid, shared_by uuid,
--   shared_at timestamptz, expires_at timestamptz)` join table + an additional
-- RLS clause:
--   OR (scope='user' AND id IN (SELECT report_id FROM report_shares WHERE recipient_user_id = auth.uid()))
-- The scope='user' contract (visible-only-to-creator-by-default) stays intact;
-- sharing is opt-in per share row. Do NOT pre-build the table — wait for a
-- real user driver. This comment is the "doors-open" marker.
```

This addendum makes the future migration shorter (the schema author already knows the extensibility contract) and prevents the next agent from re-litigating the scope hierarchy.

## Addendum 3 — Development-target deployment (2026-05-22 operator directive)

**This session targets `development` only.** No `main`/`master` merges. All preview verification happens against the `d.*` URL aliases (per AGENTS.md Auth Routing Architecture):

| App | Dev preview URL |
|-----|-----------------|
| BSU | `d.suite.crm7.app` |
| CRM7 | `d.crm.crm7.app` |
| R80.3 | `d.r8.crm7.app` |
| Conduit | `d.conduit.crm7.app` |
| Throughput | `d.ideas.crm7.app` |
| Braden | `d.braden.com.au` |

**Task 8 Playwright matrix runs against `d.crm.crm7.app`** — auth callback is allowlisted on the `d.*` domains per ADR-0004, so the BS OAuth flow works end-to-end.

**Phase 5 — sync-back to `main`** is **deferred to a subsequent session.** This plan's PR chain stops at `development` for now. The `chore/promote-development-to-main-reports-w2-*` PR can be opened once operator signs off via the d.* verification.

**Verification gate addendum:** every PR's `## Evidence` block must include a screenshot taken from the `d.*` URL, not localhost. Localhost-only evidence does not satisfy §9.2.
