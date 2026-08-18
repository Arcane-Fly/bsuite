I now have all the data needed. Let me compile the full structured findings report.

---

# BSuite Developer Portal Investigation — Structured Findings Report

**Investigation Date:** 2026-07-22  
**Scope:** READ-ONLY analysis of 5 developer portal pages + cross-cutting workflow + conduit pipeline crash  
**Branches:** BSU `fix/developer-portal-sweep-2026-07-22`, Conduit `fix/pipeline-crash-2026-07-22`  
**No code changes were made.**

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## 1. Branding.tsx — Platform Branding (Tier 1)

| Dimension | Finding |
|---|---|
| **WHO** | `developer` + `platform_admin` roles only. Gated by the parent `DeveloperPortal` dispatcher (`index.tsx` line 86: `DEVELOPER_ROLES = ['developer', 'platform_admin']`). Enterprise/org admins cannot access this page. |
| **WHAT** | Author Tier-1 platform-level brand defaults (logos, colors) for each app + a master "platform" row. Each app has a `<BrandingCard>` with light/dark logo upload and primary/accent color editing. An "Apply to" toggle chooses whether the write targets the card's own app row or the global `platform` master row. These are **defaults** — they never override tenant-level branding (Tier 2/3). |
| **ENTRY** | `/developer/branding` via the Developer Portal sub-nav tab "Branding" (last tab in the 16-tab sub-nav). |
| **UPSTREAM** | Supabase table `platform_branding` (migration `20260414120000_platform_branding.sql`, extended by `20260703010000_platform_branding_per_app_and_precedence.sql`). Reads rows by `id IN ('platform','bsu','crm7','conduit','braden','r80','throughput','ideas')`. Logos uploaded to Supabase Storage bucket `tenant-logos` at path `platform/<slug>-<variant>.<ext>`. RLS: SELECT open to authenticated+anon; INSERT/UPDATE/DELETE require `platform_role IN ('developer','platform_admin')`. |
| **DOWNSTREAM** | Consumed by `branding_json_for_tenant()` SQL function (migration `20260703000000`) which resolves the 5-tier precedence: `tenant_app_branding` → `tenant_branding` → `platform_branding` → hardcoded fallback. All apps reading brand identity via `useBranding()` or `usePlatformLogo()` are downstream. Wrong data here → broken logos/colors across every app for tenants that haven't set their own Tier 2/3 overrides. |
| **CURRENT STATE** | **Functional.** The code is well-structured with proper error handling. The `saveColor` function has a known bug fix for Supabase PostgrestError not being an `Error` instance (lines 221-226). The `APP_SLUGS` list includes `'throughput'` and `'ideas'` which map to the same app (Throughput/Ideas Hub) — potential confusion. The `APP_LABELS` has `'r80'` but `schemaBuilderService` uses `'r8'` as the app scope — **slug mismatch** between branding (`r80`) and schema (`r8`). |
| **RECOMMENDED FIX** | 1. Align `APP_SLUGS` with canonical app keys from `@bsuite/nav-core` (`bsu`, `crm7`, `conduit`, `r8`, `throughput`) — the `r80` vs `r8` mismatch means R80.3 branding may not resolve correctly if the `platform_branding` row is keyed as `r80` but the app resolves brand by `r8`. 2. Remove `'ideas'` as a separate slug — it's the same app as `'throughput'`. 3. Consider importing the canonical app list from `nav-core` instead of hardcoding. |

---

## 2. Tables.tsx — Read-Only Schema Browser

| Dimension | Finding |
|---|---|
| **WHO** | `developer` + `platform_admin` (gated by parent dispatcher). |
| **WHAT** | Read-only browser for the Supabase `public` schema. Lists all tables, click a table to see top 50 rows. No inline edit — explicitly deferred to "J.5.6 RBAC manager" per the header comment. Uses TanStack Query v5 for caching. |
| **ENTRY** | `/developer/tables` via the "Tables" sub-nav tab. |
| **UPSTREAM** | Two data paths: (1) Primary: `platform-kit-proxy` edge function → Supabase Management API (`/db/tables`, `/db/rows/<table>`), requires `SBP_MGMT_TOKEN` function secret. (2) Fallback: Postgres RPCs `list_public_tables()` and `sample_public_table(p_table, p_limit)`, gated by `is_platform_admin()` server-side (migration `20260512143000`). The fallback fires when the proxy returns 4xx/5xx. |
| **DOWNSTREAM** | None — this is a pure read-only browser. No writes, no side effects. |
| **CURRENT STATE** | **Functional with operational caveat.** The proxy path depends on `SBP_MGMT_TOKEN` being provisioned — the code comment says it 500s with "Management API not configured" until set. The RPC fallback provides parity but depends on `is_platform_admin()` — meaning only `platform_admin` users get data; `developer` role users may see errors if the proxy isn't configured and they lack `platform_admin`. **Potential bug:** the `Authorization` header on line 62 uses `*** ${token}` which appears to be a Bearer token prefix — but the actual character sequence in the source is `***` (likely a redaction artifact or template literal issue). If this is literally sending `*** <token>` as the header value, the proxy would reject every request and force the RPC fallback. |
| **RECOMMENDED FIX** | 1. Verify the `Authorization` header value at line 62 — if it's literally `***`, replace with `Bearer ${token}`. 2. Clarify in the UI whether the current user will get data (i.e., whether the proxy is configured or the user has `platform_admin` for the RPC fallback). 3. Add a loading state to the rows query that differs from the error state (currently `rowsLoading` masks errors if the query is refetching). |

---

## 3. Nav.tsx — Navigation Editor

| Dimension | Finding |
|---|---|
| **WHO** | `developer` + `platform_admin` (gated by parent dispatcher). The DB table `tenant_navigation` also has RLS policies for `enterprise_admin` and `owner` roles (migrations `20260425000001` and `20260514080000`), so the data layer supports broader access, but the UI is developer-only. |
| **WHAT** | Structured UI for authoring DB-sourced navigation overlays stored in `tenant_navigation`. One row per section per `(tenant_id, app_scope)`. Sections are merged **additively** with static app nav config via `mergeNavConfigs` from `@bsuite/nav-core`. Supports add/remove/reorder sections, add/remove items per section, and a read-only JSON preview. |
| **ENTRY** | `/developer/nav` via the "Nav" sub-nav tab. |
| **UPSTREAM** | Supabase table `tenant_navigation` (migration `20260408000001_phase5_create_tenant_navigation.sql`). Schema: `id uuid, tenant_id uuid, app_scope text, section_label text, items jsonb, sort_order int, is_active bool, created_at, updated_at`. Unique constraint on `(tenant_id, app_scope, section_label)`. Realtime enabled. RLS: SELECT for authenticated; INSERT/UPDATE/DELETE for tenant owners + enterprise_admins + platform_admins. The `AppScope` type is imported from `@/lib/schemaBuilderService` which defines `APP_SCOPES = ['all', 'crm7', 'bsu', 'conduit', 'r80', 'braden']` — but the Nav.tsx component hardcodes `APP_SCOPES: AppScope[] = ['crm7', 'conduit', 'bsu']` (line 39), omitting `'r80'`, `'braden'`, and `'all'`. |
| **DOWNSTREAM** | Consumed by every app's navigation rendering pipeline: conduit's `DashboardShell.tsx` uses `useTenantNavigation(supabase, 'conduit')` + `mergeNavConfigs(NAV_CONFIG, dbNav)`; CRM7's `navigation.ts` does the same. Wrong data here → navigation sections appear in (or disappear from) every user's sidebar in the affected app. The merge is additive only — DB overlays can add sections/items but never remove or reorder static ones. |
| **CURRENT STATE** | **Functional but has scope gaps.** The structured editor (rebuilt from a raw JSON textarea per the 2026-05-12 regression fix) works well. The save logic correctly handles insert/update/delete per row with proper tenant_id resolution. **Key issue:** `APP_SCOPES` on line 39 only includes `['crm7', 'conduit', 'bsu']` — developers cannot edit navigation for R80.3, Braden, or Throughput apps. The `schemaBuilderService` type includes `'r80'` and `'braden'` but Nav.tsx doesn't expose them. Additionally, `nav-core`'s `BSUITE_APP_KEYS` uses `'r8'` (not `'r80'`) and `'throughput'` — so even if `'r80'` were added to the scope list, it wouldn't match the canonical key. |
| **RECOMMENDED FIX** | 1. Expand `APP_SCOPES` in Nav.tsx to include all apps that have a static nav config: add `'r8'` (not `'r80'`), `'braden'`, `'throughput'`. 2. Align the `AppScope` type in `schemaBuilderService.ts` with `nav-core`'s `BSUITE_APP_KEYS` — currently `schemaBuilderService` has `['all', 'crm7', 'bsu', 'conduit', 'r80', 'braden']` while `nav-core` has `['bsu', 'crm7', 'conduit', 'r8', 'throughput']`. These must be reconciled. 3. Consider importing the canonical app list from `@bsuite/nav-core` instead of maintaining a separate list. 4. The `tenant_navigation` query filters by `app_scope` but does NOT filter by `tenant_id` in the SELECT (line 106-109) — it loads ALL sections for that app_scope across ALL tenants. This is likely a bug: a developer editing nav for their tenant sees/edits sections from other tenants too. The save path correctly includes `tenant_id`, but the load path doesn't scope it. |

---

## 4. Marketing.tsx — Platform Marketing

| Dimension | Finding |
|---|---|
| **WHO** | `developer` + `platform_admin` (gated by parent dispatcher). |
| **WHAT** | The component header says it's for "Platform-level landing/hero marketing content for CRM7 and other apps" and that it was "moved here from crm7/src/components/marketing/MarketingHome.tsx." However, the actual implementation is a **static, hardcoded marketing landing page** for CRM7 — there is no editing capability, no dynamic data, no form inputs. It renders a fixed hero section, feature cards, benefits section, CTA, and footer with hardcoded text like "CRM7 Advanced Customer Relationship Management" and "Enterprise CRM platform for Australian GTOs." |
| **ENTRY** | `/developer/marketing` via the "Marketing" sub-nav tab. |
| **UPSTREAM** | **None.** This component reads from no database table, no API, no config file. All content is hardcoded in JSX with `useMemo` constants. The `platform_marketing` table referenced in the migration README (`000060_branding_inheritance_and_platform_marketing`) was **withdrawn** (never applied) per `supabase/migrations/README.md` line 130. No `platform_marketing` table exists in any migration file — search returned zero results for `CREATE TABLE.*platform_marketing` across all SQL files. |
| **DOWNSTREAM** | None — this page writes nothing and reads nothing. It's a display-only static page trapped in the developer portal. |
| **CURRENT STATE** | **Broken / non-functional as a developer tool.** This is a **static marketing page masquerading as a developer portal page**. A developer visiting `/developer/marketing` sees a CRM7 landing page (with "Start Free Trial" buttons) inside the developer portal shell — not a content editor. The page has no editing controls, no save buttons, no data binding. It's the wrong component in the wrong place. The `platform_marketing` table it was supposedly designed to manage doesn't exist. The migration that would have created it (`000060_branding_inheritance_and_platform_marketing`) was withdrawn and superseded by the BSU lane's 3-tier branding tables. |
| **RECOMMENDED FIX** | 1. **Replace this component entirely** with either (a) a proper marketing content editor backed by a new `platform_marketing` table, or (b) remove the route from the Developer Portal sub-nav and redirect to the CRM7 marketing page if that's where the content should be managed. 2. If a `platform_marketing` table is needed, create a migration with fields: `id (app_slug), hero_title, hero_subtitle, hero_badge, features jsonb, benefits jsonb, cta_title, cta_subtitle, meta_description, og_image_url, updated_at`. 3. The current static component should be moved to a public-facing route, not buried in the developer portal. |

---

## 5. FeatureBuilder/ — Visual Feature Builder

| Dimension | Finding |
|---|---|
| **WHO** | `developer` + `platform_admin` (gated by parent dispatcher). |
| **WHAT** | 8-layer visual feature builder for scaffolding new entities/features. Layers: (1) Entity — visual table designer with columns, indexes, RLS policies, live SQL preview; (2) Page — stub; (3) Logic — stub; (4) AI — stub; (5) Permissions — RLS template×operation matrix; (6) Portal — stub; (7) Export — generates migration SQL and opens a draft PR; (8) Verification — stub. Only layers 1, 5, and 7 are live (`live: true` in the `LAYERS` array). Drafts persist to `feature_builder_drafts` Supabase table via Zustand store. |
| **ENTRY** | `/developer/feature-builder` via the "Feature Builder" sub-nav tab. Lazy-loaded chunk. |
| **UPSTREAM** | **Draft persistence:** `feature_builder_drafts` table (RLS-scoped to authoring developer via `dev_user_id`). Fields: `id, dev_user_id, name, description, state (jsonb), deleted_at, updated_at`. **Entity types:** defined in `@/lib/feature-builder/types` with `EntitySchema`, `FeatureDraftSchema` (Zod schemas). **Existing entities:** `schemaBuilderService.ts` provides `getSchemaEntities(tenantId, appScope)` which queries `tenant_entities` table with tenant+scope filtering. `APP_SCOPES = ['all', 'crm7', 'bsu', 'conduit', 'r80', 'braden']`, `CURRENT_APP_SCOPE = 'bsu'`. The EntityPanel does NOT call `getSchemaEntities` — it starts from an `EMPTY_ENTITY` template. **Schema registry:** `@bsuite/schema-registry` package exists at `packages/schema-registry/` with `useTenantNavigation` hook. |
| **DOWNSTREAM** | The Export layer generates a Supabase migration SQL string from the entity definition via `generateEntityMigration(entity)`. The export dialog opens a draft PR. If the migration is applied, it creates a new table in the `public` schema with RLS policies. The `tenant_entities` and `tenant_entity_relations` tables track the metadata. Wrong data here → broken migrations applied to production Supabase, potentially creating tables with missing RLS policies (security hole) or wrong column types. |
| **CURRENT STATE** | **Partially functional (Phase 0.5).** Layers 1 (Entity), 5 (Permissions), 7 (Export) are production-ready. The Entity panel is sophisticated — Supabase Studio-tier with dnd-kit sortable columns, cmdk field picker, RHF+zod validation, scope chooser, live SQL preview. The Permissions panel implements a Hasura-inspired template×operation matrix. The Export panel supports entity-only exports. **Key gaps:** (a) The EntityPanel does not load or reference existing entities from `tenant_entities` — a developer starts from scratch every time, can't extend an existing table. (b) `schemaBuilderService.ts` has known DRY violations (triplicated across BSU, conduit, braden, R80.3 per the dry-lint report). (c) `CURRENT_APP_SCOPE = 'bsu'` in the service, but FeatureBuilder doesn't expose an app scope selector — all entities are implicitly BSU-scoped. (d) 5 of 8 layers are stubs (Page, Logic, AI, Portal, Verification). (e) No undo/history stack (per the red-team UX doc). |
| **RECOMMENDED FIX** | 1. Add an "Load existing entity" option to the EntityPanel that calls `getSchemaEntities()` and lets the developer import an existing `tenant_entities` row as a starting point. 2. Add an app scope selector to the FeatureBuilder header so the entity is scoped to the correct app. 3. Align `CURRENT_APP_SCOPE` and `APP_SCOPES` with `nav-core`'s canonical app keys. 4. Consider consolidating `schemaBuilderService.ts` into the `@bsuite/schema-registry` package to eliminate the triplicate DRY violation. 5. Document the Phase roadmap for the 5 stub layers — currently they show "Coming in Phase N" but no timeline is visible to the developer. |

---

## Cross-Cutting Developer Workflow Analysis

### End-to-End Developer Onboarding Workflow

The intended workflow for onboarding a new tenant, based on the available developer portal pages:

1. **Create tenant** — No UI in the Developer Portal for tenant creation. This requires manual DB access (inserting into `tenants` table + `user_tenants` for the first admin user). **GAP: no tenant creation UI.**

2. **Brand the tenant** — Three tiers available:
   - Tier 1 (platform defaults): `/developer/branding` — set logos/colors per app
   - Tier 2 (per-tenant): `/branding` (outside developer portal, `src/pages/Branding.tsx`)
   - Tier 3 (per-tenant-per-app): `/admin/branding` (via `tenant_app_branding` table)
   
   **Order:** Developer sets Tier 1 defaults → tenant admin sets Tier 2 overrides → org admin sets Tier 3 per-app overrides.

3. **Configure navigation** — `/developer/nav` — add custom sections/items per app scope. Overlays are additive to static nav config.

4. **Build features** — `/developer/feature-builder` — design entity, set RLS policies, export migration as PR.

5. **Configure tables** — `/developer/tables` — browse schema (read-only, no edit).

6. **Other configuration:**
   - `/developer/tenant` — Tenant settings
   - `/developer/routing` — Route configuration
   - `/developer/embed` — Embed configuration
   - `/developer/notices` — System notices
   - `/developer/rate-limits` — Rate limit configuration
   - `/developer/platform` — Platform settings
   - `/developer/access` — Access control (API keys, webhooks, users)
   - `/developer/logs` — Log viewer
   - `/developer/functions` — Edge function editor
   - `/developer/website` — Website configuration (default landing tab)
   - `/developer/marketing` — **Broken** (static landing page, not an editor)

### Workflow Gaps

| Gap | Severity | Description |
|---|---|---|
| **No tenant creation UI** | 🔴 High | Creating a new tenant requires manual SQL inserts into `tenants` and `user_tenants` tables. No developer portal page exists for this. |
| **Marketing page is non-functional** | 🔴 High | `/developer/marketing` renders a static CRM7 landing page instead of a content editor. The `platform_marketing` table doesn't exist (migration withdrawn). |
| **Tables page is read-only** | 🟡 Medium | No inline edit capability — explicitly deferred. Developers must use Supabase Studio or MCP for data edits. |
| **Nav editor missing app scopes** | 🟡 Medium | Only `crm7`, `conduit`, `bsu` are available. R80.3, Braden, Throughput nav cannot be edited from the UI. |
| **Nav editor loads cross-tenant data** | 🟡 Medium | The SELECT query doesn't filter by `tenant_id` — a developer sees all tenants' nav sections for the selected app scope. |
| **FeatureBuilder can't load existing entities** | 🟡 Medium | Developers start from scratch; can't extend or modify existing `tenant_entities` rows. |
| **App scope key mismatch** | 🟡 Medium | `r80` vs `r8` inconsistency across `schemaBuilderService`, `Branding.tsx`, and `nav-core`. |
| **5 of 8 FeatureBuilder layers are stubs** | 🟢 Low | Page, Logic, AI, Portal, Verification layers show "Coming in Phase N" — documented but not yet shipped. |
| **Schema authoring lives in CRM7** | 🟢 Low | Per ADR-0002, schema authoring is in CRM7's schema builder, not BSU. The BSU `/developer/schema` route was removed (bsu#303). This is by design but may confuse developers expecting it in the BSU portal. |

### Redundancies

| Redundancy | Description |
|---|---|
| **schemaBuilderService triplicate** | `schemaBuilderService.ts` is duplicated across BSU, conduit, braden, and R80.3 with near-identical code. The dry-lint report flagged 12 violations. Should be consolidated into `@bsuite/schema-registry`. |
| **Marketing page in wrong place** | The static marketing component exists both in the Developer Portal (`/developer/marketing`) and was originally in CRM7 (`crm7/src/components/marketing/MarketingHome.tsx`). It's a display component, not a developer tool. |
| **Branding across 3 pages** | Tier 1 (`/developer/branding`), Tier 2 (`/branding`), Tier 3 (`/admin/branding`) — this is intentional by design (3-tier precedence), not a true redundancy, but developers may be confused about which page to use. |

---

## Conduit Pipeline Crash Investigation

### Files Examined
- `conduit/src/app/(dashboard)/pipeline/page.tsx` — RSC server component
- `conduit/src/app/(dashboard)/pipeline/_view.tsx` — Client Kanban view
- `conduit/src/app/(dashboard)/pipeline/actions.ts` — Cache invalidation action
- `conduit/src/services/pipelineService.ts` — Server-side pipeline fetch (cached + uncached)
- `conduit/src/stores/pipelineStore.ts` — Zustand store for pipeline mutations
- `conduit/src/components/DashboardShell.tsx` — Shell that previously mounted PageEditorLauncher
- `conduit/src/app/(dashboard)/_components/LayoutSlotClient.tsx` — Custom page renderer mount

### PageEditorLauncher Investigation

**Was PageEditorLauncher recently deleted?** Yes. Commit `4f1e98c` (2026-07-21) deleted:
- `src/components/platform/PageEditorLauncher.tsx` (67 lines)
- `src/components/platform/PageEditorLauncher.test.tsx` (96 lines)
- Removed the `dynamic()` import and `<PageEditorLauncher />` mount from `DashboardShell.tsx`

**Does anything still import PageEditorLauncher?** No. `grep` across all `src/**/*.ts` and `src/**/*.tsx` files returned zero active imports. The only remaining reference is a code comment in `src/app/dashboard/page.tsx` line 9: `"the /dashboard references in middleware / PageEditorLauncher / older links)"` — this is a historical comment, not an import.

### Build Verification

- `npx tsc --noEmit` — **passes with zero errors**
- `npx next build` — **passes successfully**, pipeline route builds as Partial Prerender (`◐ /pipeline`)

### Likely Crash Cause Assessment

The conduit pipeline page does **NOT** crash due to a PageEditorLauncher import — that deletion was clean. The build and typecheck both pass. However, there are several **runtime crash vectors** worth investigating:

1. **`createServiceRoleCacheableClient()` env var dependency** — `fetchPipelineCached()` uses `'use cache'` with a service-role Supabase client. If `SUPABASE_SERVICE_ROLE_KEY` is missing at runtime, `createServiceRoleCacheableClient()` throws an error (line 117 of `cacheable.ts`). Under Cache Components (`cacheComponents: true`), this throw happens inside a cached function boundary during SSR. The `Suspense` fallback (`<PipelineShellSkeleton />`) should catch the React rendering error, but if the error is thrown during the cache function execution (not during render), it may propagate as an unhandled server error, crashing the route.

2. **`getTenantContext()` returning null** — If the user's session is invalid or expired, `getTenantContext()` returns `null`, and the page redirects to `/auth/login`. This is handled correctly (line 43: `if (!context) redirect('/auth/login')`), but a race condition between `getTenantContext()` and the Supabase session could cause an intermittent crash.

3. **`LayoutSlotClient` + `CustomPageRenderer` graceful degradation** — The `LayoutSlotClient` wraps `CustomPageRenderer` in a `<Suspense fallback={null}>`. The `CustomPageRenderer` queries `custom_pages` table which may not exist in all environments. If the table doesn't exist, the Supabase query returns an error, `CustomPageRenderer` catches it and returns `null` (line 136) — this is handled correctly.

4. **Most probable crash cause:** The `'use cache'` directive in `fetchPipelineCached()` (line 67 of `pipelineService.ts`) combined with a missing `SUPABASE_SERVICE_ROLE_KEY` environment variable. The `createServiceRoleCacheableClient()` function throws synchronously, and under Next.js 16 Cache Components, errors in cached functions may not be caught by the nearest `<Suspense>` boundary (they're thrown during the cache function execution, not during the React render pass). This would result in a 500 error on `/pipeline` with a stack trace pointing to `cacheable.ts:117`.

### Recommendation for Pipeline Crash

1. **Verify `SUPABASE_SERVICE_ROLE_KEY` is set** in the deployment environment. This is the most likely cause.
2. **Wrap `fetchPipelineCached` in a try/catch** that returns empty arrays on error (matching the pattern in the uncached `fetchPipeline` function which already does this on lines 40-42).
3. **Add an error boundary** around the `PipelineContent` component in `page.tsx` (in addition to the `Suspense` boundary) to catch runtime errors and render a fallback.
4. The `PageEditorLauncher` deletion is **not** the crash cause — it was cleanly removed with no dangling imports.

---

## Summary

- **5 developer portal pages investigated** with full WHO/WHAT/ENTRY/UPSTREAM/DOWNSTREAM/CURRENT/FIX analysis
- **Branding.tsx**: Functional, minor app slug mismatch (`r80` vs `r8`)
- **Tables.tsx**: Functional read-only browser, potential Authorization header bug, developer role may lack RPC fallback access
- **Nav.tsx**: Functional but missing 3 app scopes (R80.3, Braden, Throughput) and loads cross-tenant data
- **Marketing.tsx**: Non-functional — static landing page, not an editor; `platform_marketing` table doesn't exist (migration withdrawn)
- **FeatureBuilder/**: Phase 0.5 partial — 3 of 8 layers live, can't load existing entities, app scope hardcoded to BSU
- **Conduit pipeline crash**: Not caused by PageEditorLauncher deletion (clean removal, zero dangling imports, build+typecheck pass). Most likely cause is `SUPABASE_SERVICE_ROLE_KEY` missing at runtime, causing `createServiceRoleCacheableClient()` to throw inside a `'use cache'` boundary where `<Suspense>` can't catch it.
- **No code changes were made** — this was a read-only investigation.