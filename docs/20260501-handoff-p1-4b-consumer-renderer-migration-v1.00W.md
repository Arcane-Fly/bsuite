# HANDOFF — P1-4(b) Consumer-Renderer Migration

**Document**: `20260501-handoff-p1-4b-consumer-renderer-migration-v1.00W.md`
**Status**: W (Working) — planning, no execution yet
**Author**: Claude Code lead session, 2026-05-01
**Backlog item**: P1-4(b) per `docs/20260501-merged-execution-backlog-v1.00W.md`
**ADR refs**: ADR-0001 (page-builder ownership), ADR-0003 (consumer-renderer pattern)
**Predecessor migration**: 2026-04-29 production drop of `tenant_page_layouts` (BSU PR #218 → migration applied via Supabase MCP `apply_migration` recorded as `{version: 20260429045143, name: 20260502000000_drop_tenant_page_layouts}`)

---

## Overview

The 2026-04-29 production drop removed `public.tenant_page_layouts` from `tuybltdrdefjblnplpqo`. Three production-code consumers were left in degraded state:

1. **BSU `Pages.tsx`** (Developer › Design Studio) — Save button errors on `upsert` (admin-only, dev-role-gated)
2. **BSU PR #220 Developer/* pages** (Notices/RateLimits/Routing/Schema/index) — query the dropped table (admin-only)
3. **conduit `DashboardShell.tsx`** — realtime channel subscription set up but never fires (silent degradation)

Per **ADR-0001**: BSU's `tenant_page_layouts` authoring is *deleted*, not re-targeted. CRM7 `custom_pages` becomes the canonical authoring surface.

Per **ADR-0003**: each consumer app ships its **own** `CustomPageRenderer` component (no shared npm package — option A rejected). Renderers query `custom_pages` directly via Supabase.

This handoff coordinates the multi-PR cleanup and migration across BSU + conduit + R80.3 + braden + throughput + `packages/schema-registry`.

---

## Live state (pre-flight, 2026-04-29 via Supabase MCP)

### `public.custom_pages` schema (CRM7-owned, 20 columns)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` default |
| `tenant_id` | uuid (nullable) | tenant scope |
| `scope` | text NOT NULL, default `'tenant'` | `'tenant'` or `'platform'` |
| `slug` | text NOT NULL | routing key |
| `title` | text NOT NULL | |
| `description` | text | |
| `icon` | text | |
| `entity_type` | text | |
| `page_type` | text NOT NULL, default `'form'` | |
| `layout` | jsonb NOT NULL | **page block structure lives here** (no separate `custom_page_blocks` table) |
| `nav_config` | jsonb default `'{}'` | |
| `is_published` | boolean NOT NULL default `false` | |
| `is_locked` | boolean NOT NULL default `false` | |
| `version` | integer NOT NULL default `1` | |
| `created_by` | uuid | |
| `created_at` / `updated_at` | timestamptz NOT NULL | |
| `show_in_nav` | boolean NOT NULL default `false` | |
| `nav_label` | text | |
| `nav_order` | integer NOT NULL default `100` | |

### Related tables

- **`custom_page_revisions`** exists (7 columns) — optional version-history surface
- **`custom_page_blocks`** does **NOT** exist as a separate table — blocks live in `custom_pages.layout` jsonb. Consumer renderers parse the jsonb directly.

### Row count

`select count(*) from public.custom_pages` → **0** at introspection time. Consumers should handle the empty-state gracefully.

### TODO for implementer (Phase 0 verification)

Re-query RLS state on `custom_pages` before any consumer ships. ADR-0003 §"Atomic replace-and-remove" item 3 requires the consumer renderer to "Query `custom_pages` + ... via each app's Supabase client" — implementer must confirm RLS is configured for cross-tenant isolation. SQL to run:

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'custom_pages';
```

If RLS is missing/insufficient, file a sub-handoff to add the policies before proceeding with consumer renderers.

---

## Cross-cutting tools (MCPs + skills)

Use these throughout the workstream — pick the right one per phase.

### MCPs

| MCP | When |
|---|---|
| **Supabase MCP** (`mcp__claude_ai_Supabase__*`) | RLS policy verification, schema introspection, any DB read/write. Use `execute_sql` for read-only checks; `apply_migration` for any DDL (RLS additions, etc.) |
| **GitHub MCP** (`mcp__claude_ai_github__*`) | PR ops, status checks, bot review triage |
| **Vercel MCP** (`mcp__claude_ai_Vercel__*`) | Preview deployment health, build/runtime logs after each consumer renderer ships |

### Skills

| Skill | When |
|---|---|
| `supabase` | General DB ops, migration patterns, RLS policy authoring |
| `supabase-auth-comprehensive` | If consumer renderers need OAuth-aware RLS or session checks |
| `supabase-postgres-best-practices` | RLS policy review, performance |
| `dry-one-shot-architecture` | Ownership-map updates (Phase 5); cross-app reads must use Supabase tables only, no app-local mirror |
| `verification-before-completion` | Mandatory before marking any phase complete — run typecheck/lint/test, view actual output |
| `qa-and-verification` | Test suite design + run for new renderers |
| `requesting-code-review` | After each consumer renderer PR, run a reviewer pass before merge |
| `playwright` | E2E smoke tests (sign in → see rendered custom page) |
| `chrome-devtools-mcp` (with `mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) | Runtime smoke test on Vercel preview previews |
| `tanstack-query` | Cache invalidation pattern when realtime fires (replaces conduit's prior `tenant_page_layouts` invalidation) |
| `framer-motion` | If consumer renderers animate block transitions |

---

## Phase 1 — BSU broken authoring deletion

Removes the BSU `tenant_page_layouts` authoring UI that's been broken in production since the schema/client divergence (ADR-0001 §Context). Currently after the drop, the Save action errors silently — better to remove the surface entirely than leave a broken admin tool.

### Owner

Codebuff or lead session. Single-repo.

### Files to delete

```
business-suite-unified/
├── src/pages/Developer/Pages.tsx                 (the design studio surface)
├── src/pages/Developer/__tests__/Pages.test.tsx  (its test)
├── src/pages/Developer/Notices.tsx               (PR #220, queries tenant_page_layouts)
├── src/pages/Developer/RateLimits.tsx            (PR #220, queries tenant_page_layouts)
├── src/pages/Developer/Routing.tsx               (PR #220, queries tenant_page_layouts)
├── src/pages/Developer/Schema.tsx                (PR #220, queries tenant_page_layouts)
├── src/pages/Developer/index.tsx                 (sub-nav controller — REWRITE rather than delete; remove just the sub-tabs that depended on tenant_page_layouts)
├── src/pages/Developer/__tests__/DeveloperPortalRoutes.test.ts  (PR #220 test)
├── src/components/platform/LayoutCanvas.tsx      (only the JSDoc reference; safe to keep but obsolete — likely delete)
└── src/config/tenantRoutes.ts                    (REMOVE entries: /developer/pages, /developer/nav; KEEP non-page-related routes)
└── src/config/__tests__/tenantRoutes.test.ts     (UPDATE to match the trimmed map)
```

### Files to update (don't delete)

- `src/components/Header.tsx` — if it surfaces a "Pages" or "Design Studio" link, remove
- `src/config/navigation.ts` (if it exists) — remove the Developer › Pages entry from the sub-nav
- Any `src/config/tenantRoutes.ts` consumer that depended on `/developer/pages` route

### Steps

```bash
cd /home/braden/Desktop/Dev/bsuite/business-suite-unified
git checkout -b chore/bsu-delete-broken-page-authoring-20260501 origin/development

# Read each deletion candidate before removing — confirm it queries tenant_page_layouts
git grep -l tenant_page_layouts src/

# Delete
git rm src/pages/Developer/Pages.tsx
git rm src/pages/Developer/__tests__/Pages.test.tsx
# (etc. per file list above)

# Update — open in editor and remove relevant entries
# - src/config/tenantRoutes.ts
# - src/config/__tests__/tenantRoutes.test.ts
# - src/pages/Developer/index.tsx (sub-nav controller)

# Verify no remaining references
git grep tenant_page_layouts src/
# Expected: zero matches

corepack enable
pnpm typecheck
pnpm lint src/
pnpm test src/pages/Developer/ src/config/

git commit -m "..."
git push -u origin chore/bsu-delete-broken-page-authoring-20260501
gh pr create --base development --title "chore(bsu): delete broken tenant_page_layouts authoring UI" --body "..."
```

### Verification gates (Phase 1)

- [ ] `git grep tenant_page_layouts business-suite-unified/src/` returns zero matches
- [ ] `pnpm typecheck` clean (no missing-import errors from deletions)
- [ ] `pnpm test` clean (or updated to match new structure)
- [ ] CI green
- [ ] Vercel preview renders the (smaller) Developer portal without the deleted tabs

### Stop-short

Merge into BSU `development`. Don't open a dev→main release until Phase 2–4 also land — keep BSU production unchanged until the consumer renderers are ready.

---

## Phase 2 — Per-app `CustomPageRenderer` components

Five PRs (one per consumer app). Each app implements its own renderer. **No shared package** per ADR-0003.

### Common contract (every renderer must)

1. **Query `custom_pages`** via the app's existing Supabase client. Filter by `tenant_id` (current user's tenant) and `is_published = true` and the relevant `slug` for the route being rendered.
2. **Parse `layout` jsonb** — block structure is in the layout column, NOT a separate `custom_page_blocks` table.
3. **Render against a whitelisted widget catalogue** — each app maintains its own catalogue (DataTable, StatGrid, Card, FormRenderer, EntitySelector are the common minimum per phase-5 docs).
4. **Subscribe to realtime updates** on `custom_pages` filtered by tenant + slug. Use TanStack Query for cache invalidation.
5. **Respect `is_developer_only` flag** if present (currently not in custom_pages schema — check during implementation; may need to use `scope='platform'` instead).
6. **Empty state** — `custom_pages` table is currently empty (0 rows). Render a useful no-content state.

### Files to create per app

| App | Component path |
|---|---|
| BSU | `business-suite-unified/src/components/CustomPageRenderer/index.tsx` |
| Conduit | `conduit/src/components/custom-page-renderer/CustomPageRenderer.tsx` (Next.js client component) |
| R80.3 | `R80.3/src/components/CustomPageRenderer.tsx` |
| Braden | `braden/src/components/CustomPageRenderer.tsx` |
| Throughput | `throughput/src/components/CustomPageRenderer.tsx` |

Plus tests per app (`__tests__/CustomPageRenderer.test.tsx`).

### Conduit-specific (Phase 2.B): update `DashboardShell.tsx`

Currently `src/components/DashboardShell.tsx` subscribes to `tenant_page_layouts` realtime — re-target to `custom_pages`:

```typescript
// Before
.on('postgres_changes', {
  event: '*', schema: 'public', table: 'tenant_page_layouts',
  filter: 'app_scope=eq.conduit',
}, ...)

// After
.on('postgres_changes', {
  event: '*', schema: 'public', table: 'custom_pages',
  // No app_scope on custom_pages — filter by tenant_id at the row level
}, async () => {
  await queryClient.invalidateQueries({ queryKey: ['custom-page'] })
  // Layer 2: Next.js Data Cache
  if (tenantId) await revalidateTenantSchema(tenantId)
  // Layer 3: RSC re-render
  router.refresh()
})
```

### Steps (per consumer app — repeat 5 times)

```bash
cd /home/braden/Desktop/Dev/bsuite/<app>
git checkout -b feat/<app>-custom-page-renderer-20260501 origin/development

# Create the renderer component, hooks, types, tests
# See ADR-0003 §"Atomic replace-and-remove" item 3 for the contract

# Verify
pnpm typecheck && pnpm lint && pnpm test src/components/CustomPageRenderer/

git commit -m "..."
git push -u origin feat/<app>-custom-page-renderer-20260501
gh pr create --base development --title "feat(<app>): CustomPageRenderer (ADR-0003)" --body "..."
```

### Verification gates (Phase 2, per consumer)

- [ ] `git grep tenant_page_layouts <app>/src/` → zero matches
- [ ] `git grep TenantLayoutSlot <app>/src/` → zero matches (no schema-registry usage of the old slot)
- [ ] Local typecheck + lint + tests green
- [ ] Vercel preview renders an empty-state custom page route correctly
- [ ] Realtime subscription doesn't error in browser console

### Stop-short

Merge each into the app's `development` branch. Hold dev→main releases until Phase 4 schema-registry consumer-bumps also land.

---

## Phase 3 — `@bsuite/schema-registry` 0.2.0 bump

Removes `TenantLayoutSlot` export. **Breaking change** — every consumer must update.

### Owner

Lead session (the package source-of-truth lives in `packages/schema-registry/` per parent monorepo).

### Steps

```bash
cd /home/braden/Desktop/Dev/bsuite/packages/schema-registry  # or wherever the package source lives — verify first

# 1. Find and remove TenantLayoutSlot export
git grep TenantLayoutSlot

# 2. Update package.json: 0.1.x → 0.2.0
# 3. Update CHANGELOG.md with breaking change note
# 4. Verify all internal consumers (within the package) updated
pnpm typecheck && pnpm test

# 5. Build + publish (npm)
pnpm build
npm publish --access public

# 6. Verify on npm
npm view @bsuite/schema-registry versions --json | jq '.[-3:]'
```

### Verification gates (Phase 3)

- [ ] `npm view @bsuite/schema-registry@0.2.0` exists
- [ ] CHANGELOG entry mentions `TenantLayoutSlot` removal
- [ ] No internal package code still references `TenantLayoutSlot`

---

## Phase 4 — Consumer dependency bumps

Each consumer app updates `@bsuite/schema-registry` to `^0.2.0` and removes any `TenantLayoutSlot` import.

### Per-app steps

```bash
cd /home/braden/Desktop/Dev/bsuite/<app>
git checkout -b chore/<app>-schema-registry-0.2.0-20260501 origin/development

# Update version in package.json
# Then regenerate lockfile per AGENTS.md § pnpm Lockfile Generation (isolated dir)
mkdir ~/<app>_lockgen
cp <app>/package.json ~/<app>_lockgen/
cd ~/<app>_lockgen && pnpm install
cp ~/<app>_lockgen/pnpm-lock.yaml /home/braden/Desktop/Dev/bsuite/<app>/pnpm-lock.yaml
rm -rf ~/<app>_lockgen
cd /home/braden/Desktop/Dev/bsuite/<app>

# Find and replace any TenantLayoutSlot import
git grep TenantLayoutSlot src/
# For each: import the new local CustomPageRenderer instead

pnpm typecheck && pnpm lint && pnpm test
git commit -m "..."
git push
gh pr create --base development --title "chore(<app>): bump @bsuite/schema-registry to 0.2.0" --body "..."
```

### Verification gates (Phase 4)

- [ ] `git grep "@bsuite/schema-registry" <app>/package.json` shows `^0.2.0`
- [ ] `git grep TenantLayoutSlot <app>/src/` → zero matches
- [ ] Vercel preview builds clean

---

## Phase 5 — Doctrine updates

### 5.A — `ownership-map.json` (dry-lint config)

The `@bsuite/dry-lint` package has an `ownership-map.json` that records which app owns which entity. Update to reflect:

- `custom_pages`, `custom_page_blocks` (jsonb in layout), `custom_page_revisions` → owner: `crm7`
- `tenant_page_layouts` → entry **removed** (table no longer exists)

```bash
cd /home/braden/Desktop/Dev/bsuite/packages/dry-lint
# Edit ownership-map.json
# Bump dry-lint version (patch bump — non-breaking)
pnpm build && npm publish --access public
```

### 5.B — One-shot architecture spec bump

`docs/20260227-dry-one-shot-architecture-v1.01A.md` → bump to v1.02A. The bump is the moment ADR-0001's "atomic" doctrine is fully implemented. Document changes:

- Remove any reference to `tenant_page_layouts` (now-dropped table)
- Add `custom_pages` to the §3 Tier-1 owned-entity table
- Reference per-app `CustomPageRenderer` pattern (ADR-0003)

### 5.C — Update `docs/20260501-merged-execution-backlog-v1.00W.md`

Mark **P1-4(b)** as DONE with citations to all the PRs from Phase 1–5. Move from "Phase 2 outstanding" to "Phase 2 complete".

---

## Phase 6 — 90-day backup retention cleanup

After **2026-08-02** (90 days from drop date 2026-05-02 per backup table comment):

```sql
-- Verify still empty
select count(*) from public.tenant_page_layouts_backup_20260502;
-- Expected: 0 (confirmed at drop time)

drop table public.tenant_page_layouts_backup_20260502;
```

Run via Supabase MCP `apply_migration` with name `drop_tenant_page_layouts_backup_20260502_after_90_day_retention`. Update `supabase_migrations` name field if needed for path alignment (per the AGENTS.md guard added 2026-04-29).

Track: add a calendar reminder OR a CronCreate scheduled task for 2026-08-02.

---

## Verification — overall exit criteria (per merged-execution-backlog Phase 2)

After all phases complete, these grep checks must all pass:

```bash
cd /home/braden/Desktop/Dev/bsuite

# 1. BSU Pages.tsx is gone
test ! -f business-suite-unified/src/pages/Developer/Pages.tsx
# Expected: command exits 0 (file does not exist)

# 2. No consumer app writes to custom_pages (only CRM7 does)
rg ".from\(.custom_pages.\).*\.(insert|update|upsert)" -g "!crm7/**" -g "!docs/**"
# Expected: 0 matches

# 3. tenant_page_layouts gone from all code
rg "tenant_page_layouts" -g "*.{ts,tsx,sql,md}" -g "!docs/**"
# Expected: 0 matches (docs reference is OK in archived ADRs/handoffs)

# 4. TenantLayoutSlot gone from all consumer apps
rg "TenantLayoutSlot" -g "!packages/**" -g "!docs/**"
# Expected: 0 matches

# 5. Realtime publication includes custom_pages
# Run via Supabase MCP execute_sql:
#   select tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='custom_pages';
# Expected: 1 row

# 6. realtime publication does NOT include tenant_page_layouts (already verified — table dropped)
```

---

## Stop conditions

| Condition | Action |
|---|---|
| RLS missing on `custom_pages` (Phase 0 check fails) | Halt; file a sub-handoff to add RLS before any consumer renderer |
| Phase 3 (schema-registry 0.2.0) breaks an existing app's typecheck | Hold consumer apps on 0.1.x; investigate and patch the package, ship 0.2.1 |
| Conduit DashboardShell update breaks the existing realtime cache invalidation | Roll back to subscribing on `tenant_page_layouts` → no, that's gone. Roll forward to a fix; do NOT revert the renderer migration |
| Any consumer app's preview deploy errors after Phase 2 ship | Use Vercel MCP `get_runtime_logs` to triage; small fix-PR. Never revert |
| User requests scope change (add data migration from tenant_page_layouts to custom_pages) | The drop already happened; tenant_page_layouts had row_count=0. No data to migrate. If user disagrees, query `public.tenant_page_layouts_backup_20260502` (still exists, 0 rows) |

---

## Done definition

- [ ] All 6 verification grep checks pass (above)
- [ ] All 5 consumer-app `development` branches carry their CustomPageRenderer + schema-registry 0.2.0
- [ ] BSU `development` carries the deletion (Phase 1)
- [ ] `@bsuite/schema-registry@0.2.0` published to npm
- [ ] `@bsuite/dry-lint` patch published with updated ownership-map
- [ ] `docs/20260227-dry-one-shot-architecture-v1.02A.md` exists and is referenced from the backlog
- [ ] Merged-execution-backlog item P1-4(b) marked DONE
- [ ] Calendar reminder set for 2026-08-02 backup table cleanup (Phase 6)

---

## Estimated effort

| Phase | PRs | Repos touched | Effort |
|---|---|---|---|
| 1 — BSU deletion | 1 | BSU | ~2 hrs |
| 2 — Per-app renderers | 5 | BSU, conduit, R80.3, braden, throughput | ~4 hrs each = 20 hrs |
| 3 — schema-registry 0.2.0 | 1 | packages/schema-registry | ~1 hr |
| 4 — Consumer dep bumps | 5 | each consumer | ~30 min each = 2.5 hrs |
| 5 — Doctrine updates | 1 | parent (docs + dry-lint) | ~1.5 hrs |
| 6 — Backup cleanup | 1 (manual) | Supabase | ~5 min on 2026-08-02 |
| **Total** | **~13 PRs** | **6+ repos** | **~27 hours code work** |

This is a substantial workstream — should be ratified by user before execution. Recommend scheduling Phase 1+3+5.A as a single batch (low complexity, mostly deletions + a package bump) and Phase 2 as a follow-up batch (the 5 renderer implementations). Phase 4 is mechanical after 3 ships.

---

## References

- ADR-0001 — `docs/adr/ADR-0001-page-builder-ownership.md`
- ADR-0003 — `docs/adr/ADR-0003-consumer-renderer-pattern.md`
- Merged backlog item P1-4(b) — `docs/20260501-merged-execution-backlog-v1.00W.md`
- Predecessor handoffs — `docs/20260501-handoff-3c-bsu-developer-routes-deferred-v1.00W.md` (un-deferred and shipped via PR #220 — that work is undone in Phase 1 here), `docs/20260501-handoff-3d-drop-tenant-page-layouts-v1.00W.md`
- One-shot doctrine — `docs/20260227-dry-one-shot-architecture-v1.01A.md` (will bump to v1.02A in Phase 5.B)
- Production drop migration record — `supabase_migrations.schema_migrations` `{version: 20260429045143, name: 20260502000000_drop_tenant_page_layouts}`
- Backup table — `public.tenant_page_layouts_backup_20260502` (retain until 2026-08-02)
