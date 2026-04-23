# Phase 5 — Schema + page-builder + navigation uplift: implementation plan

**Status:** W (Working — drafted 2026-04-23, design decisions resolved 2026-04-23, red-team hardened via parallel security + architecture/DX subagents 2026-04-22, pre-conditions verified from schema audit 2026-04-22)
**Revision:** v1.00W — initial working draft incorporating all resolved design decisions (D-01–D-06), 7-PR breakdown, security hardening, and consumer integration specifics
**Applies to:** BSU (authoring), CRM7, conduit, R80.3, braden (consumers); throughput deferred to Phase 5.5
**Parent plan:** [docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md](20260422-entity-linkage-schema-builder-uplift-v1.02W.md) §6 Phase 5
**Source audits:**
- [audit-bsu.md](../../audit-bsu.md)
- [audit-consumers.md](../../audit-consumers.md)
- [audit-supabase-schema.md](../../audit-supabase-schema.md)
- [audit-phase5-plan.md](../../audit-phase5-plan.md)
- [redteam-security-reliability.md](../../redteam-security-reliability.md)
- [redteam-architecture-dx.md](../../redteam-architecture-dx.md)

---

## Table of Contents

- [§1 Context and scope](#1-context-and-scope)
- [§2 Design decisions (resolved)](#2-design-decisions-resolved)
- [§S Pre-conditions gate](#s-pre-conditions-gate)
- [§3 PR chain overview](#3-pr-chain-overview)
- [§4 PR 5.0 — Database pre-conditions](#4-pr-50--database-pre-conditions)
- [§5 PR 5.1 — @bsuite/nav-core@0.5.0](#5-pr-51--bsuitenavcore050)
- [§6 PR 5.2 — @bsuite/schema-registry@0.1.0](#6-pr-52--bsuiteschema-registry010)
- [§7 PR 5.3 — BSU PageComposer + NavigationEditor](#7-pr-53--bsu-pagecomposer--navigationeditor)
- [§8 PR 5.4 — Consumer: crm7](#8-pr-54--consumer-crm7)
- [§9 PR 5.5 — Consumer: conduit](#9-pr-55--consumer-conduit)
- [§10 PR 5.6 — Consumer: R80.3 + braden + embed route](#10-pr-56--consumer-r803--braden--embed-route)
- [§R Security hardening](#r-security-hardening)
- [§A Acceptance criteria (overall Phase 5)](#a-acceptance-criteria-overall-phase-5)
- [§D Division of work](#d-division-of-work)
- [§Z Deferred backlog](#z-deferred-backlog)

---

## 1. Context and scope

Phase 5 ships the schema + page-builder + navigation uplift described in §6 of the parent plan. The delivery statement from the parent plan is:

> Ship §5.7 tables + `@bsuite/schema-registry` package + BSU page-builder UI (Platform mode + Enterprise mode) + consumer hooks in 4 non-BSU apps + enterprise embed routes.

**What changed between parent plan and this implementation plan:**

1. The original parent plan described Phase 5 as 4 PRs. Audit work and red-team review identified 7 mandatory pre-conditions, type/architecture conflicts, and consumer-specific implementation differences that require 7 PRs.
2. throughput is explicitly deferred to Phase 5.5 (see D-05, §Z).
3. Six concrete design decisions (D-01–D-06) are resolved below — each one closes a blocker or high-severity finding from the architecture/DX and security/reliability red-team reports.

**What Phase 5 does NOT do:**
- Migrate `ui_configurations` data (D-01 — it stays for per-user personal widget arrangements)
- Replace `@bsuite/nav-core` (D-03 — schema-registry extends it)
- Drive R80.3 or braden navigation from DB (D-04, D-06)
- Touch throughput (D-05)
- Ship Phase 4 lead-capture consolidation (CC owns that — Phase 5 /embed/lead-form depends on it being done; see §R S-03)

---

## 2. Design decisions (resolved)

All six decisions below are final. They are not open for re-negotiation during Phase 5 without a new plan revision.

### D-01: `ui_configurations` vs `tenant_page_layouts` — `tenant_page_layouts` WINS

`ui_configurations` (generic JSONB, `config_type IN ('page_layout','navigation',...)`) was created in BSU migration `20260306000003` and remains intact. **It is not deprecated and not migrated.** It serves as the legacy/personal-config store. Per `audit-bsu.md §4`, zero application code currently reads or writes it for `page_layout` or `navigation` config_types — it was never wired up for those types.

Phase 5 creates `tenant_page_layouts` as the authoritative tenant-scoped, Realtime-enabled layout store. No data migration from `ui_configurations` to `tenant_page_layouts` is performed.

**Coexistence rule:**
- `usePageGridLayout` (existing BSU hook) continues reading/writing `user_preferences` for personal per-user widget arrangements. It is not modified.
- New `useTenantPageLayout` hook (in `@bsuite/schema-registry`) reads `tenant_page_layouts` for tenant-authored layouts.
- Both can coexist on the same route: personal layout overlays tenant default. Consumer apps render `<TenantLayoutSlot>` for the tenant baseline; BSU users additionally have their personal drag-drop override via the existing `usePageGridLayout` path.

### D-02: Extend `PageGridLayout`, do NOT rebuild

The existing `PageGridLayout` component (`src/components/platform/PageGridLayout.tsx`), `widgetRegistry` (`src/lib/page-builder/widgetRegistry.tsx`), and `EntityTableWidget` are production-grade and are **reused as rendering primitives**.

Phase 5 adds:
1. A new `TenantLayoutSlot` wrapper (in `@bsuite/schema-registry`) that fetches from `tenant_page_layouts` and renders via `PageGridLayout` in read-only mode (no drag for non-admin consumers).
2. A `PageComposer` mode in BSU that uses the **same** `PageGridLayout` but writes to `tenant_page_layouts` instead of `user_preferences`. This is achieved by adding an `editorMode: 'personal' | 'tenant'` prop to `PageGridLayout` — when `'tenant'`, the save callback writes to `tenant_page_layouts` via Supabase upsert instead of calling `useScopedPreference`.
3. No duplication of widget rendering logic. The same 5 Phase 5 widgets are registered once in `widgetRegistry` and rendered by both paths.

### D-03: `@bsuite/schema-registry` extends `@bsuite/nav-core`, does NOT replace it

`@bsuite/nav-core` (currently v0.4.0, to be bumped to v0.5.0 in PR 5.1) owns:
- TYPE definitions: `NavItem`, `NavSection`, `NavConfig`, `GatedNavSection`
- Static rendering utilities: `useFilteredNav`, `useSidebarState`, `AppSwitcher`

`@bsuite/schema-registry` adds **DB-layer hooks only**:
- `useTenantNavigation(appScope)` returns a `NavConfig` sourced from `tenant_navigation` table, typed against `@bsuite/nav-core` types
- Consumers merge it with static config using `mergeNavConfigs(static, dynamic)` exported from `@bsuite/nav-core@0.5.0`

No nav type duplication. `@bsuite/schema-registry` declares `@bsuite/nav-core ^0.5.0` as a peer dependency.

**Merge semantics** (additive, never destructive):
- DB sections whose `label` matches a static section → their items are appended to the static section's items
- DB sections with a new label → appended after all static sections
- Static sections are never removed or reordered by a DB override

### D-04: R80.3 gets `TenantLayoutSlot` (page content only), NOT nav DB-driving

R80.3 uses `useState<'calculator'|'manage'|...>` for navigation — no router, no URL changes. Wiring `useTenantNavigation()` to R80.3 would require defining `route_path` as a view-key convention separate from all other apps, and R80.3's sidebar calls `setActiveView(item.href)` not `navigate(item.href)`. This is architecturally incompatible without a full R80.3 rewrite.

Resolution: R80.3 nav stays static. R80.3 can still render `<TenantLayoutSlot route='calculator' appScope='r80'>` to allow BSU authors to add widgets to the calculator page. The view-switching `useState` is unchanged.

### D-05: throughput is DEFERRED from Phase 5

throughput is the only app still on React 18.3.1 (all others are React 19.2.x). It also has no `QueryClientProvider` (no TanStack Query at all), and its nav is defined inline inside `Navigation.tsx` rather than in a config file. Wiring `@bsuite/schema-registry` into throughput requires three sequential prerequisites that are not budgeted in Phase 5: (1) upgrade to React 19, (2) install TanStack Query + `QueryClientProvider`, (3) extract inline nav to `navigation.ts`. These prerequisites add at least one full sprint and are being deferred.

**Explicitly deferred to Phase 5.5**, after throughput upgrades to React 19. This is documented in §Z.

### D-06: braden gets `TenantLayoutSlot` (content widgets only), NOT nav DB-driving

braden uses a top-nav layout (`<Navigation>` → `<DesktopMenu>`) with `action: 'scroll' | 'navigate'` items for single-page scroll behaviour. `useTenantNavigation()` returns `tenant_navigation` rows that have no concept of scroll actions. Converting braden nav to DB-driven would require rewriting the `NavigationItem` type and the `DesktopMenu` adapter, which is Phase 6 work.

Resolution: braden nav stays static. `<TenantLayoutSlot route='/contact' appScope='braden'>` is added to the contact page only, so BSU authors can add widgets above the contact form.

---

## S. Pre-conditions gate (§S.1)

The following items **must all be verified as complete before any Phase 5 PR is opened**. This is a hard gate — PR 5.0 cannot open until items 1–7 below are confirmed addressable, and no subsequent PR opens until PR 5.0 passes `supabase db reset` cleanly.

| # | Pre-condition | Source finding | How to verify |
|---|---|---|---|
| S.1.1 | `tenant_field_definitions` CREATE TABLE migration exists in crm7 `supabase/migrations/` with `CREATE TABLE IF NOT EXISTS` | red-team R-02; schema-audit §1.1 | `supabase db reset` exits 0 on a fresh branch; `\d tenant_field_definitions` succeeds |
| S.1.2 | `tenant_page_layouts` CREATE TABLE migration exists in BSU `supabase/migrations/` **and is timestamped before** `20260409000003` | red-team S-01; schema-audit §8 item 4 | `supabase db reset` exits 0; three existing referencing migrations (`20260409000003`, `20260410000000`, `20260420050000`) all succeed after it |
| S.1.3 | `tenant_navigation` CREATE TABLE migration exists in BSU `supabase/migrations/` with `ALTER PUBLICATION supabase_realtime ADD TABLE` | schema-audit §1.2, §7.2 | Table queryable on fresh branch; Realtime subscription to it does not error |
| S.1.4 | `descendants_of(uuid)` and `ancestors_of(uuid)` PLPGSQL functions exist in a tracked migration, using recursive CTEs on `tenants(id, parent_tenant_id)` | red-team S-04; schema-audit §6.3 | `\df descendants_of` and `\df ancestors_of` return rows; test with a 3-level seeded tenant tree |
| S.1.5 | `tenants.parent_tenant_id uuid REFERENCES tenants(id)` captured in a tracked migration (ADD COLUMN IF NOT EXISTS) | schema-audit §5.5; red-team S-04 | `\d tenants` shows `parent_tenant_id` column; migration is idempotent on live DB |
| S.1.6 | `mergeNavConfigs(base, overlay)` utility added to `@bsuite/nav-core@0.5.0` and published to npm before `@bsuite/schema-registry` is created | D-03; arch-dx Probe 5 | `npm info @bsuite/nav-core@0.5.0` returns 200; `import { mergeNavConfigs } from '@bsuite/nav-core'` resolves |
| S.1.7 | `ui_configurations` has zero production rows with `config_type IN ('page_layout','navigation')` (or a deprecation CHECK constraint is in place) | arch-dx Probe 2 | `SELECT count(*) FROM ui_configurations WHERE config_type IN ('page_layout','navigation')` returns 0; OR migration adds `CHECK (config_type NOT IN ('page_layout','navigation'))` |

**Gate rule:** Phase 5 does not start until all 7 boxes are checked with evidence attached to the Phase 5 kick-off PR body.

---

## 3. PR chain overview

| PR | Title | Owner | Effort | Depends on |
|---|---|---|---|---|
| **5.0** | Database pre-conditions | Perplexity | ~0.5 day | Nothing — this is the gate |
| **5.1** | `@bsuite/nav-core@0.5.0` | Perplexity | ~0.5 day | PR 5.0 merged |
| **5.2** | `@bsuite/schema-registry@0.1.0` | Perplexity | ~1.5 days | PR 5.1 published to npm |
| **5.3** | BSU PageComposer + NavigationEditor | Perplexity | ~2 days | PR 5.2 published to npm |
| **5.4** | Consumer: crm7 | Perplexity | ~1 day | PR 5.2 published to npm |
| **5.5** | Consumer: conduit | Perplexity | ~1.5 days | PR 5.2 published to npm |
| **5.6** | Consumer: R80.3 + braden + embed route | Perplexity | ~1 day | PR 5.2 published; Phase 4 lead-capture consolidated |

PRs 5.3, 5.4, 5.5, 5.6 may open in parallel once PR 5.2 is published. PRs 5.4–5.6 do not depend on PR 5.3 completing.

**Branch naming:** `feat/phase5-db-preconditions`, `feat/phase5-nav-core`, `feat/phase5-schema-registry`, `feat/phase5-bsu-pagecomposer`, `feat/phase5-consumer-crm7`, `feat/phase5-consumer-conduit`, `feat/phase5-consumer-r80-braden-embed`

---

## 4. PR 5.0 — Database pre-conditions

**Owner: Perplexity**
**Branch:** `feat/phase5-db-preconditions`
**Effort:** ~0.5 day
**Pre-condition gate:** This PR IS the gate. No other PR opens until `supabase db reset` passes on a fresh branch.
**Applies to:** BSU `supabase/migrations/` and CRM7 `supabase/migrations/`

CC does NOT touch these migrations. All Phase 5 migrations from Perplexity carry the naming prefix `20260423_phase5_`.

### Tasks

**Task 5.0.1 — `20260423_phase5_backfill_tenant_field_definitions.sql`** (CRM7 migrations)

Create `tenant_field_definitions` with `CREATE TABLE IF NOT EXISTS` using all columns currently referenced in CRM7 ALTER migrations (derived from `crm7/supabase/migrations/20260304100000_ui_customization_system.sql` and subsequent ALTERs). The `IF NOT EXISTS` guard makes it idempotent on live environments where the table was hand-created in Studio. This migration must be timestamped before any CRM7 migration that issues `ALTER TABLE tenant_field_definitions`.

Minimum column set (verify against live CRM7 ALTER migrations):
```sql
CREATE TABLE IF NOT EXISTS public.tenant_field_definitions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id     uuid        REFERENCES public.tenant_entities(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  label         text        NOT NULL,
  field_type    text        NOT NULL,  -- 'text','number','date','boolean','select','entity_ref'
  is_required   boolean     NOT NULL DEFAULT false,
  is_system     boolean     NOT NULL DEFAULT false,
  sort_order    int         NOT NULL DEFAULT 0,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_id, name)
);
ALTER TABLE public.tenant_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tenant_field_defs_entity ON public.tenant_field_definitions (entity_id);
```

**Task 5.0.2 — `20260423_phase5_create_tenant_page_layouts.sql`** (BSU migrations)

Timestamp must be **before** `20260409000003`. Use `20260408000000` or lower to satisfy ordering. This is the primary S-01 fix.

```sql
CREATE TABLE IF NOT EXISTS public.tenant_page_layouts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_scope         text        NOT NULL CHECK (app_scope IN (
                                  'all','bsu','crm7','conduit','r80','braden','throughput')),
  route_path        text        NOT NULL,
  layout_version    integer     NOT NULL DEFAULT 1,
  layout_json       jsonb       NOT NULL DEFAULT '{}',
  is_published      boolean     NOT NULL DEFAULT false,
  is_developer_only boolean     NOT NULL DEFAULT false,
  created_by        uuid        NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, app_scope, route_path, layout_version)
);
ALTER TABLE public.tenant_page_layouts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tenant_page_layouts_tenant ON public.tenant_page_layouts (tenant_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_page_layouts;
```

Note: `20260409000003` already adds `tenant_page_layouts` to `supabase_realtime` — the new migration's `ALTER PUBLICATION ... ADD TABLE` will be a no-op if it runs on a live DB where `20260409000003` already ran. Both must be idempotent.

**Task 5.0.3 — `20260423_phase5_create_tenant_navigation.sql`** (BSU migrations)

```sql
CREATE TABLE IF NOT EXISTS public.tenant_navigation (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  app_scope         text        NOT NULL CHECK (app_scope IN (
                                  'all','bsu','crm7','conduit','r80','braden','throughput')),
  nav_json          jsonb       NOT NULL DEFAULT '{}',
  version           integer     NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, app_scope)
);
ALTER TABLE public.tenant_navigation ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tenant_navigation_tenant ON public.tenant_navigation (tenant_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_navigation;
```

Design note: `nav_json` stores the full `NavConfig`-shaped overlay as JSONB (sections array) rather than a normalized rows-per-item structure. This matches the `mergeNavConfigs` input shape and avoids a complex JOIN on every nav fetch. The `UNIQUE(tenant_id, app_scope)` means one overlay per app per tenant, upserted on save.

**Task 5.0.4 — `20260423_phase5_tenant_hierarchy_helpers.sql`** (BSU migrations)

Creates `descendants_of` and `ancestors_of` as `SECURITY DEFINER` functions. These must exist before any RLS policy references them.

```sql
CREATE OR REPLACE FUNCTION public.descendants_of(root_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM public.tenants WHERE id = root_id
    UNION ALL
    SELECT t.id FROM public.tenants t
    INNER JOIN tree ON t.parent_tenant_id = tree.id
  )
  SELECT id FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.ancestors_of(child_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id, parent_tenant_id FROM public.tenants WHERE id = child_id
    UNION ALL
    SELECT t.id, t.parent_tenant_id FROM public.tenants t
    INNER JOIN tree ON t.id = tree.parent_tenant_id
  )
  SELECT id FROM tree;
$$;
```

Performance note: both functions are called inside RLS `USING` clauses. On large tenant trees, an unindexed recursive CTE runs on every row access. Add an index on `tenants(parent_tenant_id)` in this migration:

```sql
CREATE INDEX IF NOT EXISTS idx_tenants_parent_tenant_id ON public.tenants (parent_tenant_id);
```

**Task 5.0.5 — `20260423_phase5_tenant_page_layouts_rls.sql`** (BSU migrations)

RLS policies using `descendants_of`/`ancestors_of`. This migration runs **after** 5.0.4 so the functions exist.

```sql
-- SELECT: tenant members can read published layouts where tenant is in their ancestor chain
CREATE POLICY "tenant_page_layouts_select"
ON public.tenant_page_layouts FOR SELECT TO authenticated
USING (
  tenant_id IN (SELECT ancestors_of(public.auth_tenant_id()))
  AND (NOT is_developer_only OR public.auth_platform_role() IN ('developer','platform_admin'))
  AND (app_scope = 'all' OR app_scope = public.auth_app_scope())
  AND is_published = true
);

-- INSERT/UPDATE: platform roles unrestricted; enterprise owners scoped to their tree
-- Critical: WITH CHECK prevents is_developer_only=true and braden scope for non-platform roles
CREATE POLICY "tenant_page_layouts_write"
ON public.tenant_page_layouts FOR INSERT TO authenticated
WITH CHECK (
  public.auth_platform_role() IN ('developer','platform_admin')
  OR (
    tenant_id IN (SELECT descendants_of(public.auth_tenant_id()))
    AND app_scope != 'braden'
    AND (is_developer_only = false OR public.auth_platform_role() IN ('developer','platform_admin'))
  )
);

CREATE POLICY "tenant_page_layouts_update"
ON public.tenant_page_layouts FOR UPDATE TO authenticated
USING (
  public.auth_platform_role() IN ('developer','platform_admin')
  OR tenant_id IN (SELECT descendants_of(public.auth_tenant_id()))
)
WITH CHECK (
  public.auth_platform_role() IN ('developer','platform_admin')
  OR (
    tenant_id IN (SELECT descendants_of(public.auth_tenant_id()))
    AND app_scope != 'braden'
    AND (is_developer_only = false OR public.auth_platform_role() IN ('developer','platform_admin'))
  )
);
```

Apply the same pattern for `tenant_navigation`.

**Task 5.0.6 — `20260423_phase5_backfill_tenants_parent_tenant_id.sql`** (BSU migrations)

Captures the untracked `parent_tenant_id` column and other studio-created columns:

```sql
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'gto',
  ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS join_policy text NOT NULL DEFAULT 'invite_only',
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

All columns use `ADD COLUMN IF NOT EXISTS` — idempotent on the live DB where these columns were created in Studio.

**Task 5.0.7 — `mergeNavConfigs` note**

No SQL migration needed. This is the reminder: `mergeNavConfigs` must be added to `@bsuite/nav-core` in PR 5.1 before PR 5.2 can use it. Task 5.0.7 creates a `TODO: nav-core@0.5.0` comment in the Phase 5 kick-off PR body linking to PR 5.1.

### Acceptance criteria for PR 5.0

- [ ] `supabase db reset` completes with zero errors on a fresh Supabase branch across all 33 + new BSU migrations
- [ ] `supabase db reset` completes with zero errors across all 101 + new CRM7 migrations
- [ ] `SELECT public.descendants_of('<any-uuid>')` returns rows without error
- [ ] `SELECT public.ancestors_of('<any-uuid>')` returns rows without error
- [ ] `\d public.tenant_page_layouts` shows all columns including `is_developer_only`, `is_published`, `created_by`
- [ ] `\d public.tenant_navigation` shows `nav_json jsonb`, `version integer`, `UNIQUE(tenant_id, app_scope)`
- [ ] `\d public.tenants` shows `parent_tenant_id`, `tier`, `tenant_type`, `allowed_domains`, `join_policy`, `owner_user_id`
- [ ] `mcp__claude_ai_Supabase__get_advisors` returns zero warnings on all Phase 5 tables

---

## 5. PR 5.1 — `@bsuite/nav-core@0.5.0`

**Owner: Perplexity**
**Branch:** `feat/phase5-nav-core`
**Effort:** ~0.5 day
**Depends on:** PR 5.0 merged (no DB dependency, but logical sequencing)
**Package location:** `/home/user/workspace/bsuite/packages/nav-core/`

`@bsuite/nav-core` is currently v0.4.0 (published, `UNLICENSED`). v0.5.0 adds the `mergeNavConfigs` utility required by D-03.

### Tasks

**Task 5.1.1 — `src/merge.ts`**

```typescript
import type { NavConfig, NavSection, NavItem } from './types';

/**
 * Merge a DB-sourced overlay NavConfig into a static base NavConfig.
 * Rules (additive only — static sections are never removed):
 * - Overlay sections whose label matches a base section → items appended
 * - Overlay sections with a new label → appended after all base sections
 * - is_active, icon, href on base items are preserved unless overlay explicitly sets them
 */
export function mergeNavConfigs(
  base: NavConfig,
  overlay: Partial<NavConfig>
): NavConfig {
  if (!overlay.sections?.length) return base;

  const merged = base.sections.map((baseSection) => {
    const overlaySec = overlay.sections?.find(
      (s) => s.label === baseSection.label
    );
    if (!overlaySec) return baseSection;
    return {
      ...baseSection,
      items: [...(baseSection.items ?? []), ...(overlaySec.items ?? [])],
    };
  });

  const newSections = (overlay.sections ?? []).filter(
    (s) => !base.sections.some((b) => b.label === s.label)
  );

  return {
    ...base,
    sections: [...merged, ...newSections],
  };
}
```

**Task 5.1.2 — Export from `src/index.ts`**

Add `export { mergeNavConfigs } from './merge';` to the existing index.

**Task 5.1.3 — Unit tests** (`src/merge.test.ts`)

Test cases (all must pass):
1. Empty overlay → base returned unchanged
2. Overlay with matching section → items appended to that section
3. Overlay with new section label → section appended after base sections
4. `is_active` on base items preserved when overlay section merges
5. Null/undefined overlay sections → base returned unchanged

**Task 5.1.4 — Version bump and publish**

- `package.json`: bump `version` from `0.4.0` to `0.5.0`
- Confirm `publish-nav-core.yml` CI workflow exists and path-triggers on `packages/nav-core/**`; if missing, create it mirroring `publish-theme.yml` pattern
- Tag `@bsuite/nav-core@0.5.0` on merge to `main`

### Acceptance criteria for PR 5.1

- [ ] `@bsuite/nav-core@0.5.0` published to npm
- [ ] `import { mergeNavConfigs } from '@bsuite/nav-core'` resolves with correct TypeScript types
- [ ] All 5 unit test cases pass
- [ ] `pnpm lint && pnpm typecheck` green in `packages/nav-core/`
- [ ] No existing consumers of `@bsuite/nav-core@0.4.0` break (backwards-compatible addition only)

---

## 6. PR 5.2 — `@bsuite/schema-registry@0.1.0`

**Owner: Perplexity**
**Branch:** `feat/phase5-schema-registry`
**Effort:** ~1.5 days
**Depends on:** `@bsuite/nav-core@0.5.0` published (PR 5.1)
**Package location:** `/home/user/workspace/bsuite/packages/schema-registry/`

This is the new shared consumer package. It mirrors the `@bsuite/theme` publish pattern. No existing package exists — built from scratch.

### Tasks

**Task 5.2.1 — Package scaffold**

Create `packages/schema-registry/` with:

`package.json`:
```json
{
  "name": "@bsuite/schema-registry",
  "version": "0.1.0",
  "description": "Tenant schema, page layout, and navigation hooks for BSuite consumer apps",
  "access": "public",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./react": "./dist/react/index.js",
    "./server": "./dist/server/index.js"
  },
  "peerDependencies": {
    "react": ">=18 <21",
    "@supabase/supabase-js": "^2",
    "@bsuite/nav-core": "^0.5.0",
    "@tanstack/react-query": "^5"
  },
  "devDependencies": {
    "@bsuite/tsconfig": "^0.1.0",
    "typescript": "^5",
    "vitest": "^2",
    "bundlesize": "^0.18"
  }
}
```

Key constraints:
- ESM only — no CJS output
- `@supabase/supabase-js`, `@tanstack/react-query`, `@bsuite/nav-core` are ALL peer dependencies — never bundled
- Deep import subpaths (`./react`, `./server`) to enable tree-shaking; no barrel `export *` from root

**Task 5.2.2 — Hook: `useTenantSchema`** (`src/react/useTenantSchema.ts`)

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AppScope = 'bsu' | 'crm7' | 'conduit' | 'r80' | 'braden' | 'all';

export function useTenantSchema(supabase: SupabaseClient, scope: AppScope) {
  return useQuery({
    queryKey: ['tenant-schema', scope],
    queryFn: async () => {
      const { data: entities, error: eErr } = await supabase
        .from('tenant_entities')
        .select('*')
        .in('app_scope', [scope, 'all'])
        .order('name');
      if (eErr) throw eErr;

      const { data: relations, error: rErr } = await supabase
        .from('tenant_entity_relations')
        .select('*')
        .in('app_scope', [scope, 'all']);
      if (rErr) throw rErr;

      return { entities: entities ?? [], relations: relations ?? [] };
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
```

The `supabase` client is passed in (not imported globally) so the hook works in both SPA and SSR contexts.

**Task 5.2.3 — Hook: `useTenantPageLayout`** (`src/react/useTenantPageLayout.ts`)

```typescript
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './useTenantSchema';

export function useTenantPageLayout(
  supabase: SupabaseClient,
  routePath: string,
  appScope: AppScope
) {
  const queryClient = useQueryClient();
  const queryKey = ['tenant-page-layout', appScope, routePath];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_page_layouts')
        .select('*')
        .eq('route_path', routePath)
        .eq('app_scope', appScope)
        .eq('is_published', true)
        .order('layout_version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 30 * 1000,
  });

  // Realtime: postgres_changes on tenant_page_layouts row update
  // Uses postgres_changes (not broadcast) — consistent with BrandingProvider pattern
  useEffect(() => {
    const channel = supabase
      .channel(`tenant-page-layout:${appScope}:${routePath}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_page_layouts',
          filter: `route_path=eq.${routePath}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, routePath, appScope, queryClient]);

  return query;
}
```

**Task 5.2.4 — Hook: `useTenantNavigation`** (`src/react/useTenantNavigation.ts`)

```typescript
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NavConfig } from '@bsuite/nav-core';
import type { AppScope } from './useTenantSchema';

export function useTenantNavigation(
  supabase: SupabaseClient,
  appScope: AppScope
): { navConfig: NavConfig | null; isLoading: boolean; error: Error | null } {
  const queryClient = useQueryClient();
  const queryKey = ['tenant-navigation', appScope];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_navigation')
        .select('nav_json, version')
        .eq('app_scope', appScope)
        .maybeSingle();
      if (error) throw error;
      // nav_json is stored as a NavConfig-shaped object
      return (data?.nav_json as NavConfig) ?? null;
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`tenant-navigation:${appScope}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_navigation',
          filter: `app_scope=eq.${appScope}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, appScope, queryClient]);

  return { navConfig: data ?? null, isLoading, error: error as Error | null };
}
```

**Task 5.2.5 — `TenantLayoutSlot` component** (`src/react/TenantLayoutSlot.tsx`)

```tsx
'use client';
import React from 'react';
import { useTenantPageLayout } from './useTenantPageLayout';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from './useTenantSchema';

interface TenantLayoutSlotProps {
  supabase: SupabaseClient;
  route: string;
  appScope: AppScope;
  /** Optional: data passed to widgets as context (e.g. current entity ID) */
  context?: Record<string, unknown>;
}

export function TenantLayoutSlot({
  supabase,
  route,
  appScope,
  context,
}: TenantLayoutSlotProps) {
  const { data: layout, isLoading, error } = useTenantPageLayout(
    supabase,
    route,
    appScope
  );

  if (isLoading) return null; // Render nothing while loading — does not block page
  if (error || !layout) return null; // No layout → no-op, never throws

  // layout.layout_json is validated by Zod before rendering
  const parseResult = LayoutJsonSchema.safeParse(layout.layout_json);
  if (!parseResult.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TenantLayoutSlot] Invalid layout_json — skipping render', parseResult.error);
    }
    return null;
  }

  return (
    <ErrorBoundary fallback={null}>
      <WidgetRenderer widgets={parseResult.data.widgets} context={context} />
    </ErrorBoundary>
  );
}
```

Key design points:
- Always wrapped in `ErrorBoundary` with `fallback={null}` — a crash in a widget never takes down the host page
- Zod-validates `layout_json` before rendering — a malformed payload from realtime returns null, never crashes (R-01 fix)
- Returns `null` (not an error) when no layout found — silent no-op on unregistered routes (arch-dx Probe 9 fallback spec)
- In development, logs a console warning after 2 seconds if no layout is found for the route

**Task 5.2.6 — Widget renderer + `UnknownWidget` fallback** (`src/react/widgets/`)

Each widget is a separate file with `'use client'` at the top:
- `DataTable.tsx` — `'use client'`; renders via `EntityTableWidget` pattern
- `StatGrid.tsx` — `'use client'`; reads count/sum/avg via Supabase RPC or direct query
- `EntitySelector.tsx` — `'use client'`; searchable dropdown
- `Card.tsx` — `'use client'`; container with title + collapsible children
- `FormRenderer.tsx` — `'use client'`; React Hook Form + Zod
- `UnknownWidget.tsx` — `'use client'`; grey placeholder card rendering `Widget type unknown: ${type}`, never throws

`WidgetRenderer` dispatches on `widget.type` via a `Map` lookup into the widget registry. If `type` is not in the registry, it renders `<UnknownWidget type={widget.type} />` — never crashes (arch-dx Probe 10 fix).

**Task 5.2.7 — Zod schemas for widget props** (`src/schemas/widgetProps.ts`)

```typescript
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Sanitized string — all text props rendered to DOM pass through this
const SafeText = z.string().transform((val) =>
  typeof window !== 'undefined' ? DOMPurify.sanitize(val, { ALLOWED_TAGS: [] }) : val
);

export const DataTablePropsSchema = z.object({
  type: z.literal('DataTable'),
  entity: z.string().min(1), // validated server-side against tenant_entities allowlist
  columns: z.array(z.string()),
  filters: z.array(z.object({ column: z.string(), op: z.string(), value: z.unknown() })).optional(),
  sort: z.object({ column: z.string(), direction: z.enum(['asc','desc']) }).optional(),
  page_size: z.number().int().min(1).max(100).default(25),
});

export const StatGridPropsSchema = z.object({
  type: z.literal('StatGrid'),
  entity: z.string().min(1),
  metric: z.union([
    z.literal('count'),
    z.string().regex(/^(sum|avg):[a-zA-Z_]+$/),
  ]),
  group_by: SafeText.optional(),
  filters: z.array(z.object({ column: z.string(), op: z.string(), value: z.unknown() })).optional(),
});

export const EntitySelectorPropsSchema = z.object({
  type: z.literal('EntitySelector'),
  entity: z.string().min(1),
  display_field: z.string().min(1),
  // target_field blocklist: must NOT be tenant_id, id, or any auth.users FK
  target_field: z.string().min(1).refine(
    (v) => !['tenant_id', 'id', 'user_id', 'auth_id'].includes(v),
    { message: 'target_field cannot be a system column' }
  ),
});

export const CardPropsSchema = z.object({
  type: z.literal('Card'),
  title: SafeText,
  collapsible: z.boolean().default(false),
  children: z.array(z.unknown()).optional(), // nested widgets, validated recursively
});

export const FormRendererPropsSchema = z.object({
  type: z.literal('FormRenderer'),
  entity: z.string().min(1),
  // fields validated against tenant_field_definitions at render time
  fields: z.array(z.string()).min(1),
  submit_label: SafeText.default('Submit'),
});

// Discriminated union — unknown type falls back to UnknownWidget
export const WidgetPropsSchema = z.discriminatedUnion('type', [
  DataTablePropsSchema,
  StatGridPropsSchema,
  EntitySelectorPropsSchema,
  CardPropsSchema,
  FormRendererPropsSchema,
]);

export const LayoutJsonSchema = z.object({
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.unknown()),
    position: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  })),
});
```

Security notes:
- `SafeText` runs `DOMPurify.sanitize()` with `ALLOWED_TAGS: []` — strips all HTML. This is the S-02 fix. Applied to every prop that renders to DOM as text.
- `target_field` blocklist (S-02 vector C fix).
- `entity` prop validated server-side at query execution time against `tenant_entities` allowlist — client-side Zod is UX, not security (S-02 vector B).

**Task 5.2.8 — Server-safe pre-fetch helpers** (`src/server/prefetch.ts`)

```typescript
// Not 'use client' — runs in RSC/Node context
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppScope } from '../react/useTenantSchema';

export async function prefetchTenantPageLayout(
  supabase: SupabaseClient,
  routePath: string,
  appScope: AppScope
) {
  const { data, error } = await supabase
    .from('tenant_page_layouts')
    .select('*')
    .eq('route_path', routePath)
    .eq('app_scope', appScope)
    .eq('is_published', true)
    .order('layout_version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data;
}
```

Used by conduit RSC pages to pre-fetch layout server-side and pass as `initialData` to `HydrationBoundary`.

**Task 5.2.9 — `createMinimalClient` export** (`src/react/minimalClient.ts`)

For R80.3 (which has no `QueryClientProvider`):

```typescript
'use client';
import { QueryClient } from '@tanstack/react-query';

let _client: QueryClient | null = null;

export function createMinimalClient(): QueryClient {
  if (!_client) {
    _client = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
    });
  }
  return _client;
}
```

Used as: `<QueryClientProvider client={createMinimalClient()}>` wrapping `<TenantLayoutSlot>` in R80.3 (see PR 5.6).

**Task 5.2.10 — Publish workflow** (`.github/workflows/publish-schema-registry.yml`)

Copy from `publish-nav-core.yml` pattern. Triggers on `push` to `main` affecting `packages/schema-registry/**`. Steps: typecheck → test → build → bundlesize check → version-idempotency check → `npm publish --access public --provenance`.

**Bundle size CI step:**
```yaml
- name: Check bundle size
  run: |
    gzip -c packages/schema-registry/dist/react/index.js | wc -c | \
    awk '{ if ($1 > 35840) { print "Bundle exceeds 35KB gzip: " $1 " bytes"; exit 1 } }'
```

(35 KB = 35,840 bytes)

### Acceptance criteria for PR 5.2

- [ ] `@bsuite/schema-registry@0.1.0` published to npm; `npm info @bsuite/schema-registry` returns metadata
- [ ] `@bsuite/schema-registry/react` gzip bundle ≤35 KB (CI bundlesize step passes)
- [ ] `supabase-js` and `@tanstack/react-query` are NOT in the bundle (peer deps only)
- [ ] All 3 hooks (`useTenantSchema`, `useTenantPageLayout`, `useTenantNavigation`) fully typed — `tsc --noEmit` passes
- [ ] `TenantLayoutSlot` renders `null` (no crash) on null layout
- [ ] `TenantLayoutSlot` renders `<UnknownWidget>` for an unrecognised widget type — no throw
- [ ] `ErrorBoundary` wraps every widget render — a throwing widget does not crash the page
- [ ] DOMPurify imported and called on all text props rendered to DOM
- [ ] `publish-schema-registry.yml` exists and dry-run passes

---

## 7. PR 5.3 — BSU PageComposer + NavigationEditor

**Owner: Perplexity**
**Branch:** `feat/phase5-bsu-pagecomposer`
**Effort:** ~2 days
**Depends on:** `@bsuite/schema-registry@0.1.0` published (PR 5.2)
**Applies to:** `bsuite/business-suite-unified/`

### Tasks

**Task 5.3.1 — Rename existing "Schema" tab to "Entities"**

In `src/pages/Developer/index.tsx` (sub-nav definition at lines 37–50):
- Change tab label `Schema` → `Entities`, path `schema` → `entities`
- Update route reference in `src/components/AppContent.tsx` and any `<Link to="schema">` hrefs

This keeps the Developer Portal tab count from growing to 14 (arch-dx Probe 7 fix). The two new tabs replace the renamed slot conceptually and are added at indices after the existing 11 remaining tabs.

**Task 5.3.2 — Add "Pages" tab (index 12)** → `src/pages/Developer/Pages.tsx`

Tab label: `Pages`, path: `pages`.

`Pages.tsx` implements the `PageComposer` UI:

```
┌─────────────────────────────────────────────────────────┐
│  App scope: [crm7 ▾]   Route: [/dashboard        ]      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Mode: ● Platform  ○ Enterprise preview          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [Widget palette]     [PageGridLayout canvas]           │
│  ┌──────────────┐    ┌─────────────────────────────┐   │
│  │ DataTable    │    │  (drag/drop widgets here)    │   │
│  │ StatGrid     │    │                              │   │
│  │ EntitySelector│   └─────────────────────────────┘   │
│  │ Card         │                                       │
│  │ FormRenderer │    [Saved ✓] / [Unsaved changes]      │
│  └──────────────┘    [Save layout]  [Publish]           │
└─────────────────────────────────────────────────────────┘
```

Key implementation points:
- App scope dropdown: values from `AppScope` type — `['bsu','crm7','conduit','r80','braden','all']`
- Route path input: text field with autocomplete from `TENANT_LAYOUT_ROUTES` constants per app (a `src/config/tenantRoutes.ts` file that lists eligible routes for each app)
- Mode toggle: Platform mode (full edit, auto-detected for `platform_admin`/`developer`) vs Enterprise preview (read-only render). Mode auto-detected from `user.platform_role`; Enterprise admins can only see Enterprise mode
- Uses existing `PageGridLayout` component with new `editorMode='tenant'` prop. When `editorMode='tenant'`, save callback calls `supabase.from('tenant_page_layouts').upsert(...)` instead of `useScopedPreference`
- Widget palette: renders `WidgetPalette` component from `src/lib/page-builder/widgetRegistry` showing only the 5 Phase 5 widgets
- Save/unsaved state: indicated by **text label + icon** (e.g. "Unsaved changes ●"), NOT red/green colour alone (colourblind-safe, as per phase requirement)
- Props validation on save: each widget's props pass through the Zod schema from `@bsuite/schema-registry`; invalid props block save and show field-level error messages inline

**`PageGridLayout` changes (add `editorMode` prop):**
```typescript
interface PageGridLayoutProps {
  // ... existing props ...
  editorMode?: 'personal' | 'tenant';
  onTenantSave?: (layoutJson: LayoutJson) => Promise<void>;
}
```
When `editorMode='tenant'`, the layout is not persisted to `user_preferences`; instead `onTenantSave` is called.

**Task 5.3.3 — Add "Nav" tab (index 13)** → `src/pages/Developer/Nav.tsx`

Tab label: `Nav`, path: `nav`.

`Nav.tsx` implements the `NavigationEditor` UI:
- App scope selector (same dropdown as PageComposer)
- Renders current `nav_json` from `tenant_navigation` for the selected scope; if no row exists, shows empty state
- Drag-to-reorder sections using `@dnd-kit/core` (already present in BSU for existing drag-drop; verify import)
- Add section, remove section, rename section
- Per section: add/remove/rename nav items, set `route_path`, set `icon` (Lucide icon picker)
- On save: `supabase.from('tenant_navigation').upsert({ tenant_id, app_scope, nav_json: <updated>, version: prev + 1 })`
- Live preview column showing how the nav would appear after merge with static config (calls `mergeNavConfigs(STATIC_CONFIG, edited_overlay)` and renders a mini sidebar preview)

**Task 5.3.4 — Register 5 Phase 5 widgets in `widgetRegistry`**

In `src/lib/page-builder/widgetRegistry.tsx`, add:
```typescript
registerWidget({
  type: 'DataTable',
  category: 'entity',
  label: 'Data Table',
  description: 'Tabular list of any entity',
  defaultProps: { entity: '', columns: [], page_size: 25 },
  PropsEditor: DataTablePropsEditor,
});
// repeat for StatGrid, EntitySelector, Card, FormRenderer
```

Each widget also requires a `PropsEditor` component (a form rendered in the widget palette drawer when the widget is selected in the composer).

**Task 5.3.5 — Realtime publish step**

After a successful upsert to `tenant_page_layouts`, the PageComposer fires the Supabase realtime broadcast via the postgres_changes mechanism (no manual broadcast needed — the `useTenantPageLayout` hooks in consumers subscribe to `postgres_changes` on the table, so any INSERT/UPDATE fires them automatically). No additional code needed beyond the DB write.

Debounce: the Save button is debounced at 500ms to prevent rapid consecutive writes (≤1/5s as required by R.5).

**Task 5.3.6 — Developer Portal tab overflow check**

After adding "Pages" and "Nav" tabs (total: 13 tabs), run a Lighthouse mobile audit on the Developer Portal to confirm no tab bar overflow or clipping on 1280px viewport. If overflow is detected, apply a tab grouping strategy (e.g. group "Entities", "Tables", "Pages" under a "Data" group header).

### Acceptance criteria for PR 5.3

- [ ] PageComposer renders in BSU at `/developer/pages`, gated to `platform_role IN ('developer','platform_admin')`
- [ ] NavigationEditor renders at `/developer/nav`
- [ ] Platform admin can select `app_scope='crm7'`, route `/dashboard`, drag 2 widgets, save — row appears in `tenant_page_layouts` within 2 seconds
- [ ] Saving a widget with invalid props (e.g. empty `entity`) shows inline Zod field error; save is blocked
- [ ] Save/unsaved state uses text label + icon (no colour-only indicator)
- [ ] NavigationEditor save writes `nav_json` to `tenant_navigation` with incremented `version`
- [ ] Consumer app (crm7 in PR 5.4) reflects the layout change within 5 seconds via realtime (validated in combined testing)
- [ ] `pnpm lint && pnpm typecheck` green in `business-suite-unified/`
- [ ] Developer Portal tab bar does not overflow on 1280px (Lighthouse screenshot attached)

---

## 8. PR 5.4 — Consumer integration: crm7

**Owner: Perplexity**
**Branch:** `feat/phase5-consumer-crm7`
**Effort:** ~1 day
**Depends on:** `@bsuite/schema-registry@0.1.0` published (PR 5.2); PR 5.3 can be open concurrently
**Applies to:** `bsuite/crm7/`

### Context

crm7 is a Vite + React 19 SPA with TanStack Query v5.91.2 already installed (`audit-consumers.md §1`). It has 15 nav sections in `NAV_CONFIG`. It has `PageGridLayout` but no `TenantLayoutSlot`. This is the reference consumer integration.

### Tasks

**Task 5.4.1 — Install `@bsuite/schema-registry@0.1.0`**

```
pnpm add @bsuite/schema-registry@0.1.0 --filter crm7
```

Verify `pnpm install` succeeds. `QueryClientProvider` is already present in crm7 `src/App.tsx` (via TanStack Query v5.91.2, `audit-bsu.md §8`).

**Task 5.4.2 — Add `TenantLayoutSlot` to Dashboard**

In `src/pages/Dashboard.tsx`, below the existing hardcoded widgets:

```tsx
import { TenantLayoutSlot } from '@bsuite/schema-registry/react';
import { supabase } from '@/lib/supabase';

// Inside the component JSX, after existing content:
<TenantLayoutSlot
  supabase={supabase}
  route='/dashboard'
  appScope='crm7'
/>
```

The slot renders `null` if no layout is authored — existing page content is unaffected.

Also add `<TenantLayoutSlot route='/contacts' appScope='crm7'>` to `src/pages/Contacts/index.tsx` and `<TenantLayoutSlot route='/contacts/:id' appScope='crm7'>` to `src/pages/Contacts/ContactDetail.tsx`.

**Task 5.4.3 — Wire `useTenantNavigation` in navigation config**

In `src/config/navigation.ts`:

```typescript
import { mergeNavConfigs } from '@bsuite/nav-core';
import { useTenantNavigation } from '@bsuite/schema-registry/react';

// Existing static config remains unchanged:
export const STATIC_NAV_CONFIG: NavConfig = { sections: [...] };

// New hook-based export for AppSidebar to use:
export function useMergedNavConfig(supabase: SupabaseClient): NavConfig {
  const { navConfig: dbNav } = useTenantNavigation(supabase, 'crm7');
  if (!dbNav) return STATIC_NAV_CONFIG;
  return mergeNavConfigs(STATIC_NAV_CONFIG, dbNav);
}
```

In `src/components/layout/AppSidebar.tsx`, replace `NAV_CONFIG` import with `useMergedNavConfig(supabase)`.

**Additive-only constraint:** Static sections are never removed or reordered by DB content. The existing 15 sections remain at their positions; DB can only append new items to existing sections or add new sections.

**Task 5.4.4 — Realtime subscription cleanup**

`useTenantNavigation` and `useTenantPageLayout` both create Supabase channels. Verify unmount cleanup by checking `supabase.removeChannel()` calls in each hook's `useEffect` return function. Test via React DevTools: navigate away from a page using `TenantLayoutSlot`; confirm no `GoAway` errors in browser console.

**Task 5.4.5 — `TENANT_LAYOUT_ROUTES` constant**

Create `src/config/tenantRoutes.ts`:
```typescript
export const TENANT_LAYOUT_ROUTES: string[] = [
  '/dashboard',
  '/contacts',
  '/contacts/:id',
  '/clients',
  '/clients/:id',
  '/leads',
  '/pipeline',
];
```

This list is consumed by BSU's PageComposer route path autocomplete to prevent authors from entering invalid routes.

### Acceptance criteria for PR 5.4

- [ ] `pnpm build` in crm7 exits 0 with zero TypeScript errors
- [ ] `/dashboard` renders `<TenantLayoutSlot>` without crashing
- [ ] When no layout is authored for `crm7 /dashboard`, the slot is invisible (null render, no layout)
- [ ] When BSU PageComposer publishes a layout for `crm7 /dashboard`, crm7 reflects it within 5 seconds (realtime)
- [ ] Nav updates from BSU NavigationEditor appear in crm7 sidebar within 5 seconds
- [ ] Existing 15 nav sections remain in original order after merging an empty DB overlay
- [ ] Realtime channel is cleaned up on component unmount (no memory leak)
- [ ] `pnpm lint && pnpm test` green

---

## 9. PR 5.5 — Consumer integration: conduit

**Owner: Perplexity**
**Branch:** `feat/phase5-consumer-conduit`
**Effort:** ~1.5 days
**Depends on:** `@bsuite/schema-registry@0.1.0` published (PR 5.2)
**Applies to:** `bsuite/conduit/`

### Context

conduit is the most complex consumer. It uses Next.js 16 App Router with RSC, `unstable_cache` + `revalidateTag` for server-side data, and `DashboardShell` (`'use client'`) as the interactive shell. Key red-team findings: R-04 (tree-shaking + `'use client'` directives), R-05 (two-layer cache invalidation — TanStack Query + Next.js Data Cache).

### Tasks

**Task 5.5.1 — Install `@bsuite/schema-registry@0.1.0`**

```
pnpm add @bsuite/schema-registry@0.1.0 --filter conduit
```

TanStack Query v5.99.0 and React 19.2.5 are already installed (`audit-consumers.md §2`). `QueryClientProvider` is confirmed present.

**Task 5.5.2 — Server-side layout pre-fetch in RSC pages**

In `src/app/(dashboard)/page.tsx` (Talent dashboard RSC):

```tsx
// RSC — no 'use client'
import { prefetchTenantPageLayout } from '@bsuite/schema-registry/server';
import { HydrationBoundary, dehydrate, QueryClient } from '@tanstack/react-query';
import { TenantLayoutSlot } from '@bsuite/schema-registry/react';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function TalentPage() {
  const supabase = await createServerSupabaseClient();
  const queryClient = new QueryClient();
  const initialLayout = await prefetchTenantPageLayout(supabase, '/', 'conduit');

  await queryClient.prefetchQuery({
    queryKey: ['tenant-page-layout', 'conduit', '/'],
    queryFn: () => Promise.resolve(initialLayout),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* existing page content */}
      <TenantLayoutSlot supabase={supabase} route='/' appScope='conduit' />
    </HydrationBoundary>
  );
}
```

Repeat for `src/app/(dashboard)/pipeline/page.tsx` with `route='/pipeline'`.

**Task 5.5.3 — Two-layer cache invalidation in `DashboardShell`**

`DashboardShell.tsx` is `'use client'`. It receives realtime events. Per R-05 finding, invalidating only TanStack Query is insufficient — conduit also has `unstable_cache` layers that must be busted via a Server Action.

```tsx
// src/app/actions/revalidateSchema.ts
'use server';
import { revalidateTag } from 'next/cache';

export async function revalidateTenantSchema(tenantId: string) {
  revalidateTag(`tenant-schema-${tenantId}`);
  revalidateTag('tenant-page-layouts');
}
```

In `DashboardShell.tsx`, wire the realtime handler:

```tsx
// Inside the realtime subscription useEffect:
const channel = supabase
  .channel('tenant-schema-conduit')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tenant_page_layouts',
    filter: `app_scope=eq.conduit`,
  }, async () => {
    // Layer 1: TanStack Query client cache
    await queryClient.invalidateQueries({ queryKey: ['tenant-page-layout'] });
    // Layer 2: Next.js Data Cache (RSC layer)
    await revalidateTenantSchema(tenantId);
    // Layer 3: trigger RSC re-render via router.refresh()
    router.refresh();
  })
  .subscribe();
```

`router.refresh()` must be called from a `'use client'` component — `DashboardShell` satisfies this requirement.

**Task 5.5.4 — Tag `unstable_cache` calls**

All `unstable_cache`-wrapped fetches in conduit that could be affected by schema/layout changes must be tagged:

```typescript
export const fetchCandidatesCached = unstable_cache(
  async (tenantId: string) => { /* ... */ },
  ['candidates'],
  { tags: [`tenant-schema-${tenantId}`, 'tenant-page-layouts'] }
);
```

This ensures `revalidateTag('tenant-page-layouts')` busts the correct cached responses.

**Task 5.5.5 — Nav integration in `DashboardShell`**

`DashboardShell.tsx` is already `'use client'`. Wire `useTenantNavigation`:

```tsx
import { useTenantNavigation } from '@bsuite/schema-registry/react';
import { mergeNavConfigs } from '@bsuite/nav-core';
import { STATIC_NAV_CONFIG } from '@/config/navigation';

// Inside DashboardShell:
const { navConfig: dbNav } = useTenantNavigation(supabase, 'conduit');
const mergedNav = dbNav ? mergeNavConfigs(STATIC_NAV_CONFIG, dbNav) : STATIC_NAV_CONFIG;
// pass mergedNav to sidebar nav rendering
```

**Task 5.5.6 — Verify all widget components have `'use client'`**

Before `pnpm build`, run:
```bash
grep -rL "'use client'" packages/schema-registry/src/react/widgets/
```

Any widget file missing the directive will cause a Next.js 16 build error (`useEffect in Server Component`). All 5 widget files + `TenantLayoutSlot` must have `'use client'` as first line.

**Task 5.5.7 — `TENANT_LAYOUT_ROUTES` constant for conduit**

Create `src/config/tenantRoutes.ts`:
```typescript
export const TENANT_LAYOUT_ROUTES: string[] = ['/', '/pipeline', '/operations', '/insights'];
```

### Acceptance criteria for PR 5.5

- [ ] `pnpm build` in conduit exits 0 with zero TypeScript errors and zero Next.js build errors
- [ ] RSC page renders with server-prefetched layout (no loading flash on first paint)
- [ ] When BSU publishes a layout change, conduit dashboard updates within 5 seconds (realtime → `router.refresh()` → RSC re-render)
- [ ] TanStack Query AND Next.js Data Cache are both invalidated on realtime event (two-layer test: after layout change, `fetchCandidatesCached` is called fresh)
- [ ] `pnpm lint && pnpm typecheck` green
- [ ] No `You're importing a component that needs useEffect` Next.js build errors (all widgets have `'use client'`)

---

## 10. PR 5.6 — Consumer integration: R80.3 + braden + embed route

**Owner: Perplexity**
**Branch:** `feat/phase5-consumer-r80-braden-embed`
**Effort:** ~1 day
**Depends on:** `@bsuite/schema-registry@0.1.0` published (PR 5.2); Phase 4 lead-capture consolidation complete (for embed route)
**Applies to:** `bsuite/r80/`, `bsuite/braden/`, `bsuite/business-suite-unified/`

### Tasks

**Task 5.6.1 — R80.3: install schema-registry**

```
pnpm add @bsuite/schema-registry@0.1.0 --filter r80
```

R80.3 has React 19.2.4 and no TanStack Query. Use `createMinimalClient()` from `@bsuite/schema-registry/react` to bootstrap a minimal `QueryClient` wrapping the slot only.

In `src/App.tsx`, add around the main calculator view:

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { createMinimalClient, TenantLayoutSlot } from '@bsuite/schema-registry/react';
import { supabase } from '@/lib/supabase';

const schemaQueryClient = createMinimalClient();

// Inside main calculator view render, below existing content:
<QueryClientProvider client={schemaQueryClient}>
  <TenantLayoutSlot
    supabase={supabase}
    route='calculator'
    appScope='r80'
  />
</QueryClientProvider>
```

No nav DB-driving for R80.3 (D-04). The `useState`-based view switching stays as-is.

**Task 5.6.2 — braden: install schema-registry**

```
pnpm add @bsuite/schema-registry@0.1.0 --filter braden
```

braden has React 19.2.4 and no TanStack Query. Use `createMinimalClient()` as in R80.3.

In `src/pages/Contact.tsx` (or wherever the contact page renders), add:

```tsx
<QueryClientProvider client={createMinimalClient()}>
  <TenantLayoutSlot
    supabase={supabase}
    route='/contact'
    appScope='braden'
  />
  {/* existing contact form below */}
  <ContactForm />
</QueryClientProvider>
```

No nav DB-driving for braden (D-06).

**Task 5.6.3 — BSU embed route: `/embed/lead-form`**

Create `src/pages/Embed/LeadForm.tsx` at route `/embed/lead-form?tenant=<uuid>`.

Key implementation points, reusing patterns from `src/pages/Embed/Contact.tsx` (existing `EmbedContact`):
- Anonymous auth (no logged-in user required)
- Fetch tenant branding from `tenant_settings` or `tenants.branding` using tenant UUID from query param
- Render branded lead form (name, email, phone, message fields)
- On submit: call `supabase.from('leads').insert({ ..., tenant_id: tenantUUID })` using anon JWT — NEVER service-role
- Rate limiting: import and apply `_shared/rate-limiter.ts` pattern (10 requests/minute per IP)
- Tenant enumeration protection: both valid and invalid tenant UUIDs return a 200 with either the form or a "form unavailable" placeholder — no distinguishable 404/error response (S-03 fix)
- Admin notification email: after successful insert, trigger notification to `tenant_settings.lead_notification_email` for that tenant

CSP headers: add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/embed/:path*",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" },
        { "key": "Content-Security-Policy", "value": "frame-ancestors *" }
      ]
    }
  ]
}
```

Verify existing `/embed/contact` route still works after adding new header rule.

**Task 5.6.4 — Snippet generator in Developer Portal `Embed` tab**

In `src/pages/Developer/Embed.tsx`, add a second snippet section below the existing contact widget snippet generator:

```
Lead Form Embed URL:
https://suite.crm7.app/embed/lead-form?tenant=<your-tenant-uuid>

<iframe
  src="https://suite.crm7.app/embed/lead-form?tenant=<your-tenant-uuid>"
  width="100%"
  height="600"
  frameborder="0"
  title="Contact Form"
></iframe>
```

Include a copy-to-clipboard button. The tenant UUID is auto-populated from the authenticated user's `tenant_id`.

**Task 5.6.5 — `TENANT_LAYOUT_ROUTES` constants**

Create in R80.3:
```typescript
// r80/src/config/tenantRoutes.ts
export const TENANT_LAYOUT_ROUTES = ['calculator', 'manage', 'awards'];
```

Create in braden:
```typescript
// braden/src/config/tenantRoutes.ts
export const TENANT_LAYOUT_ROUTES = ['/contact', '/about'];
```

### Acceptance criteria for PR 5.6

- [ ] R80.3 renders `<TenantLayoutSlot route='calculator'>` without crashing; existing calculator view unaffected
- [ ] braden renders `<TenantLayoutSlot route='/contact'>` without crashing; existing contact form unaffected
- [ ] `/embed/lead-form?tenant=<valid-uuid>` renders a branded lead form in an iframe
- [ ] `/embed/lead-form?tenant=<invalid-uuid>` renders a "form unavailable" placeholder — same 200 status as valid UUID (no tenant enumeration)
- [ ] Rate limit: >10 requests/minute from same IP returns rate-limit response without leaking tenant info
- [ ] Lead form submit writes a row to `leads` with correct `tenant_id`; uses anon JWT (not service-role)
- [ ] Existing `/embed/contact` route still works (no regression)
- [ ] CSP header `frame-ancestors *` present on `/embed/lead-form` response
- [ ] `pnpm lint && pnpm typecheck` green in both R80.3 and braden and BSU

---

## R. Security hardening

Security hardening tasks are **not deferred** — each must be complete within the PR that introduces the surface.

### S-01 (CRITICAL) — Missing CREATE TABLE migrations (PR 5.0)

`tenant_page_layouts` CREATE TABLE migration must run before `20260409000003`, `20260410000000`, and `20260420050000`. `tenant_field_definitions` CREATE TABLE IF NOT EXISTS in CRM7. `supabase db reset` exits 0 as the hard gate before any other PR opens. See PR 5.0 task 5.0.2 and 5.0.1.

### S-02 (CRITICAL) — JSONB widget props XSS / SSRF / IDOR vectors (PR 5.2)

Three vectors from red-team:

**Vector A (Stored XSS):** All text props rendered to DOM pass through `DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })` via the `SafeText` Zod transform in `widgetProps.ts`. This must be in `@bsuite/schema-registry/react` v0.1.0 — not deferred to v2. Any prop that flows from `layout_json` to a React text node must use `SafeText`.

**Vector B (SSRF via `DataTable.entity`):** `entity` prop is validated on the **server side** (not only client) against a whitelist of allowed table names read from `tenant_entities WHERE tenant_id IN descendants_of(auth.uid()::uuid)`. The `DataTable` component must reject any `entity` value not present in this whitelist and render `<UnknownWidget>` instead. Client-side Zod is UX only; the server-side check is the security layer.

**Vector C (IDOR via `EntitySelector.target_field`):** `target_field` must never be `tenant_id`, `id`, `user_id`, `auth_id`, or any FK to `auth.users`. The Zod schema in `EntitySelectorPropsSchema` enforces this blocklist. The `FormRenderer.fields[]` array must apply the same blocklist.

### S-02b — `DataTable.entity` server-side whitelist

The `DataTable` widget's fetch function, before calling `supabase.from(entity)`, must validate `entity` against `tenant_entities` for the current app scope:

```typescript
const { data: entityDef } = await supabase
  .from('tenant_entities')
  .select('id')
  .eq('name', props.entity)
  .in('app_scope', [appScope, 'all'])
  .maybeSingle();

if (!entityDef) {
  throw new Error(`Entity '${props.entity}' is not in the allowed whitelist for scope '${appScope}'`);
}
```

This check runs inside the `DataTable` widget component before any data fetch.

### S-03 (HIGH) — `/embed/lead-form` tenant enumeration and cross-embedding (PR 5.6)

Three mitigations:
1. **Identical response shape for valid/invalid tenants:** `LeadForm.tsx` always returns 200; for invalid/non-existent tenant UUIDs, renders a "form unavailable" placeholder component rather than a 404 or error page.
2. **Rate limiting:** 10 requests/minute per IP using `_shared/rate-limiter.ts`. Applies to both page load and form submit separately.
3. **No `Referer`/`Origin` allowlist in v1** (D-06 scope: v1 ships the form; `allowed_embed_domains` validation is Phase 5 widget v2). The rate limiter is the primary spam mitigation in v1.

### S-04 (CRITICAL) — `descendants_of`/`ancestors_of` absent; RLS fallback risk (PR 5.0)

Created in PR 5.0 task 5.0.4 as `SECURITY DEFINER` functions with recursive CTEs. The RLS migration (PR 5.0 task 5.0.5) runs after task 5.0.4 in the same branch, guaranteeing the functions exist before any policy references them. Zero permissive fallbacks — all `WITH CHECK` clauses are reviewed in the PR.

### S-05 (HIGH) — `is_developer_only` writable by Enterprise admins (PR 5.0 RLS + PR 5.3 UI)

**DB-level fix (PR 5.0):** The `WITH CHECK` on `tenant_page_layouts` INSERT and UPDATE includes:
```sql
(is_developer_only = false OR public.auth_platform_role() IN ('developer','platform_admin'))
```
This prevents any non-platform role from setting `is_developer_only = true`.

**UI-level fix (PR 5.3):** The PageComposer in Enterprise mode does not render the `is_developer_only` toggle at all. It is only visible in Platform mode.

**Stop-ship gate:** Playwright test — enterprise owner attempts `INSERT INTO tenant_page_layouts (is_developer_only) VALUES (true)` via the composer → receives 403.

---

## A. Acceptance criteria (overall Phase 5)

1. **DB reset:** `supabase db reset` completes with zero errors on a fresh Supabase branch (BSU and CRM7 migration chains independently)
2. **Package published:** `@bsuite/schema-registry@0.1.0` on npm; `npm info @bsuite/schema-registry` confirms publication; bundle ≤35 KB gzip
3. **PageComposer end-to-end:** BSU platform_admin can author a layout for `crm7 /dashboard`, publish it, and see it reflected in crm7 within 5 seconds (realtime postgres_changes trigger)
4. **NavigationEditor end-to-end:** BSU platform_admin can add a nav section to `crm7` scope, save it, and see the new section appear in crm7 sidebar within 5 seconds
5. **Consumer renders:** crm7, conduit, R80.3, braden all render `<TenantLayoutSlot>` without regressions on their existing content
6. **conduit build:** `pnpm build` in conduit passes with zero TypeScript errors and zero Next.js build errors
7. **Widget safety:** All 5 widgets validate props through Zod discriminated union; no XSS vectors (DOMPurify on all text props; `entity` whitelist enforced server-side)
8. **Embed route:** `/embed/lead-form` renders in an iframe; rate-limited; no tenant enumeration (valid/invalid UUIDs return identical response shape)
9. **Enterprise isolation:** Enterprise owner in BSU Enterprise mode cannot write `app_scope='braden'` or `is_developer_only=true` to `tenant_page_layouts` — returns 403 (Playwright seeded enterprise test user)
10. **throughput:** Explicitly documented as deferred to Phase 5.5 in §Z; no code changes to throughput in Phase 5
11. **CI green:** All development branch CIs green across BSU, crm7, conduit, R80.3, braden after respective PRs merge
12. **Realtime debounce:** PageComposer save is debounced ≤500ms; consumer invalidation selective by `(app_scope, route_path)` not full schema key
13. **Keyboard accessibility:** Page-builder drag-drop keyboard-navigable (Tab/Space/arrow keys via `@dnd-kit`); Lighthouse accessibility ≥95 on a BSU-authored CRM7 dashboard with 5 widgets
14. **`prefers-reduced-motion`:** Any realtime animation (widget re-render, slot shimmer) respects `prefers-reduced-motion` media query

### Stop-ship gates (R.5 additions from red-team, must be verified before Phase 5 marks done)

- [ ] Zod widget-props schemas reject unknown keys (exhaustive discriminated union with `strict()`)
- [ ] `DataTable.entity` server-side whitelist enforced — `supabase.from('auth.users')` attempt returns widget error, not data
- [ ] DOMPurify wraps every tenant-authored text string on render
- [ ] RLS four-persona matrix PASSES for `tenant_page_layouts` + `tenant_navigation` including `is_developer_only=true` isolation
- [ ] Playwright: enterprise-owner attempts write to `app_scope='braden'` layout → 403
- [ ] Playwright: enterprise-owner creates/edits layout in own scope → success
- [ ] Playwright: enterprise-owner attempts INSERT with `is_developer_only=true` → 403
- [ ] Playwright: tenant-B user does NOT see tenant-A's `is_developer_only=true` nav items
- [ ] Playwright: keyboard-only navigation through page-builder drag-drop (Tab/Space/arrows)
- [ ] Realtime publish debounced ≤500ms (≤1/5s); consumer invalidation selective by `(app_scope, route_path)`
- [ ] Bundle delta ≤35 KB gzip for `@bsuite/schema-registry/react`
- [ ] Lighthouse accessibility ≥95 on BSU-authored crm7 dashboard with 5 widgets
- [ ] `prefers-reduced-motion` respected on realtime animation
- [ ] `ui_configurations` has zero rows with `config_type IN ('page_layout','navigation')` (or deprecation CHECK is in place)
- [ ] conduit's realtime handler calls `router.refresh()` in addition to TanStack Query invalidation
- [ ] `<TenantLayoutSlot>` renders null (no crash) for all 5 consumer apps when layout_json is null or malformed
- [ ] `publish-schema-registry.yml` CI workflow ran successfully (dry-run) before consumer PRs open

---

## D. Division of work

### Perplexity owns (Phase 5 — all 7 PRs)

| PR | Scope |
|---|---|
| **PR 5.0** | All 6 SQL migration files (BSU + CRM7); `tenants.parent_tenant_id` backfill; `descendants_of`/`ancestors_of` functions; `tenant_page_layouts` + `tenant_navigation` CREATE TABLE; RLS policies |
| **PR 5.1** | `@bsuite/nav-core@0.5.0` — `mergeNavConfigs` utility + tests + publish |
| **PR 5.2** | `@bsuite/schema-registry@0.1.0` — all 3 hooks, `TenantLayoutSlot`, 5 widget implementations, Zod schemas, DOMPurify integration, publish workflow |
| **PR 5.3** | BSU PageComposer (`/developer/pages`) + NavigationEditor (`/developer/nav`) + `PageGridLayout` `editorMode` prop + 5 widget `PropsEditor` components |
| **PR 5.4** | crm7 `TenantLayoutSlot` mount points + `useTenantNavigation` nav merge + `TENANT_LAYOUT_ROUTES` constant |
| **PR 5.5** | conduit RSC pre-fetch + `HydrationBoundary` + two-layer cache invalidation + `DashboardShell` nav merge |
| **PR 5.6** | R80.3 `TenantLayoutSlot` + braden `TenantLayoutSlot` + BSU `/embed/lead-form` route + CSP headers + snippet generator |

### CC owns (concurrent — Perplexity does NOT overlap)

| Work item | Notes |
|---|---|
| **Phase 4:** V1 candidate→contact backfill | crm7 only |
| **Phase 4:** V5 lead-capture consolidation | **Hard dependency** — `/embed/lead-form` in PR 5.6 cannot ship until the canonical CRM7 `lead-capture` edge function is the only deployed instance |
| **Phase 4:** V3/V4 grep audit | cross-app read verification |
| **Phase 6:** DRY doc refresh + CI lint rule | post-Phase 5 |
| **crm7 Phase 4 entity work** | PRs branched from `crm7/development` — Perplexity will NOT touch `crm7/development` except for PR 5.4 consumer integration |
| **Operator Supabase steps for Phase 3** | `pg_cron` + TGA sync GUCs — requires human Supabase console access |

### Shared resources and coordination

- **Supabase project `tuybltdrdefjblnplpqo`:** Both Perplexity and CC apply migrations. Naming convention: Perplexity migrations `20260423_phase5_*`; CC migrations use their existing naming. Both use `supabase migrations apply` via the Supabase MCP.
- **pnpm lockfiles:** Generated OUTSIDE the bsuite tree per `AGENTS.md` — do not commit lockfiles from inside app subdirectories.
- **`crm7/development` branch:** Perplexity's PR 5.4 branches from the latest `crm7/development` (which may include CC's Phase 4 entity work). Perplexity must rebase PR 5.4 onto the latest `crm7/development` before opening the consumer PR.
- **Merge ordering:** PR 5.4 must not merge before CC's Phase 4 entity work is merged to `crm7/development`, to avoid rebase conflicts on `src/config/navigation.ts` and `src/pages/Dashboard.tsx`.

---

## Z. Deferred backlog

| Item | Reason deferred | Target phase |
|---|---|---|
| **throughput Phase 5 integration** | React 18 (all others React 19); no TanStack Query; nav defined inline in `Navigation.tsx` (not in a config file). Three prerequisite tasks required before schema-registry can be installed: (1) upgrade to React 19, (2) add `QueryClientProvider`, (3) extract nav to `navigation.ts`. Total estimated effort: 1–2 days of non-Phase-5 work. | Phase 5.5 — after throughput React 19 upgrade |
| **braden nav DB-driving** | Top-nav + scroll-action architecture is incompatible with `tenant_navigation` `route_path`-based model; requires rewriting `NavigationItem` type and `DesktopMenu` adapter | Phase 5.5 |
| **R80.3 nav DB-driving** | No router; state-based navigation; `route_path` has no URL semantics in R80.3 | Phase 5.5 or later |
| **DOMPurify v2 extended allowlists** | v1 needs only `ALLOWED_TAGS: []` (plain text). Extended HTML allowlists (e.g. for rich-text `Card` content) require a separate security review of the allowlist | Phase 5 widget v2 |
| **Chart / map / timeline / kanban widgets** | v2 widget catalogue; v1 ships only the 5 core widgets. Broader library deferred until v1 is stable in production | Phase 5 widget v2 |
| **Playwright E2E for page-builder** | Current test suite is unit + smoke only; E2E for drag-drop requires significant fixture work | After Phase 5 ships stable |
| **Widget marketplace (tenant-installable third-party widgets)** | Large surface area; needs separate security model for third-party code execution | Phase 6+ |
| **`allowed_embed_domains` validation on `/embed/lead-form` `Origin` header** | v1 ships rate limiting as primary spam mitigation; origin allowlist requires `allowed_embed_domains` column on `tenant_settings` | Phase 5 widget v2 |
| **Layout version history + revert UI** | v1 UNIQUE constraint overwrites previous version; no rollback path. Append-only version retention + \"revert to previous\" BSU UI | Phase 5 widget v2 |
| **`catalogue_version` column on `tenant_page_layouts`** | Needed for consumer apps to detect when a layout references widget types from a newer package version; v1 `layout_version int` is not sufficient | Phase 5 widget v2 |
| **Separate `/enterprise/*` route subtree in BSU** | Enterprise admins currently share the Developer Portal with a mode toggle. A dedicated `/enterprise/*` subtree with only enterprise-relevant tabs would improve UX; requires route restructure | Phase 6 |

---

*Plan drafted: 2026-04-23. Derived from: `audit-phase5-plan.md`, `audit-bsu.md`, `audit-consumers.md`, `audit-supabase-schema.md`, `redteam-security-reliability.md`, `redteam-architecture-dx.md`, parent plan §6 Phase 5.*
