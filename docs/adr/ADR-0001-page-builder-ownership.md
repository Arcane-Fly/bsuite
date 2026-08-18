# ADR-0001 — Page-Builder Ownership

**Status:** Accepted (2026-05-01)
**Supersedes:** P1-4 in `docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` (AUDIT MISMATCH entry)
**Related:** `docs/20260227-dry-one-shot-architecture-v1.04A.md` §1, §11 Phase 5; `docs/plans/20260422-entity-linkage-schema-builder-uplift-v1.02W.md`

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Context

The BSuite monorepo currently has two parallel page-authoring systems that overlap materially:

| System | Tables | Owner (today) | Authoring UI |
|---|---|---|---|
| **CRM7 custom-pages** | `custom_pages`, `custom_page_blocks`, `custom_page_revisions` | `crm7` (per `packages/dry-lint/src/ownership-map.json` L25) | `crm7/src/pages/settings/custom-page-{create,edit,detail}.tsx` + `customPageService.ts` |
| **BSU tenant-page-layouts** | `tenant_page_layouts`, `tenant_navigation` | `bsu` (per Phase 5 of entity-linkage plan) | `business-suite-unified/src/pages/Developer/Pages.tsx` |

The BSU surface is currently broken in production: `Pages.tsx:136` upserts with `on_conflict=tenant_id,app_scope,route_path,layout_version`, but the shipped migration `20260408000000_phase5_create_tenant_page_layouts.sql` declared the unique constraint as `UNIQUE (tenant_id, route, app_scope)` with column name `route` and no `layout_version` column — so every save 400s in a tight retry loop (observed in console dumps 2026-04-29).

Finish-line roadmap P1-4 flagged the overlap as "AUDIT MISMATCH, NEEDS RESCOPE" with a decision gate on either (i) building BSU `custom_pages` authoring in `/developer/pages` and converting CRM7 to consumer-only, or (ii) accepting `custom_pages` as CRM7-owned and updating the DRY ownership matrix accordingly.

## Decision

**CRM7 `custom_pages` / `custom_page_blocks` / `custom_page_revisions` is the single canonical page-authoring surface across BSuite.**

- BSU `tenant_page_layouts` + `tenant_navigation` tables are deprecated and will be dropped.
- BSU `/developer/pages` authoring UI and `Pages.tsx` / `Pages.test.tsx` will be removed.
- Every other app (BSU, conduit, R80.3, braden, throughput) becomes a **read-only consumer** of `custom_pages`, rendering tenant-authored layouts via per-app consumer components (not a shared npm package — see ADR-0003).

## Rationale

1. **CRM7 `custom_pages` is production-mature.** The table, schema, RLS, revisions, and authoring UI have been live since `20260304100000_ui_customization_system.sql` (March 2026). It has real tenant data.
2. **BSU `tenant_page_layouts` is broken.** The schema/client divergence in Phase 5 (migration vs authored-against plan) has never reached working state in production.
3. **Consolidation removes two tables, one authoring UI, one migration, one test suite, and one broken code path** — net reduction in surface area.
4. **CRM7 is the canonical entity owner for the adjacent surfaces** (apprentices, clients, placements, qualifications, timesheets, invoices). Keeping authoring UX co-located with entity ownership reduces cross-app navigation for the primary user.
5. **The one-shot doctrine** (`20260227-dry-one-shot-architecture-v1.04A.md` §1) requires single-owner CRUD per entity. Having both `custom_pages` and `tenant_page_layouts` violates this.

## Consequences

### Atomic removal disallows

- Keeping BSU `Developer/Pages.tsx` alongside CRM7 authoring as a "read-only preview" or "fallback". Either BSU's page is deleted in the Phase 2 PR set or the ADR is not ratified.
- Adding a `@deprecated` JSDoc marker to `tenant_page_layouts` Postgres table or to the Pages.tsx component — they both get dropped/deleted outright.
- Retaining `@bsuite/schema-registry.TenantLayoutSlot` as a thin wrapper delegating to the new renderer. The old export is removed in the package bump; consumers update their import in the same PR set that ships the bump.
- A feature-flag toggle to route tenant layout reads between the two tables during migration. The migration is an atomic `DROP TABLE` (with prior data-migration script), not a flag-gated switch.

### Rollback procedure

The Phase 2 atomic PR set spans 3+ repos (BSU, CRM7, packages/schema-registry, plus every consumer app). If any leg of the merge fails:

1. **DB migration applied but a code merge fails:** the migration's `down()` step recreates `tenant_page_layouts` (empty — prior rows preserved in the backup taken by the migration's pre-DROP step); revert the partial code merges; re-queue the PR set.
2. **DB migration fails:** no code merge happens (coordinated merge order: DB first, gate on success). Revert the migration via its `down()` step; re-queue.
3. **Merge order:** DB migration lands first in a dedicated maintenance window; consumer-app and package PRs merge within the same day; BSU `Pages.tsx` deletion merges last (so users don't lose the authoring UI before CRM7 authoring is live — but since `Pages.tsx` is currently broken, this is a theoretical concern).
4. **Data-loss backstop:** the pre-DROP step exports `tenant_page_layouts` rows to `docs/20260502-phase2-tenant_page_layouts-backup.jsonl` in the commit that lands the migration, so a human-readable record exists even if the backup table is lost.

### Pinned migration filename

The atomic migration lands as `supabase/migrations/20260502000000_drop_tenant_page_layouts.sql`. The filename is pinned in this ADR so:

- Phase 2 executor cannot use a drifting date.
- Pre-DROP backup script + DROP + realtime-publication removal all land in this single file.
- The migration includes an `up()` DROP plus a `down()` CREATE-table-shell (empty rows — original data preserved in the `.jsonl` backup committed alongside).

### Atomic replace-and-remove (per governance constraint)

A single coordinated PR set ships:

1. **Supabase migration** — `DROP TABLE tenant_page_layouts CASCADE;` `DROP TABLE tenant_navigation CASCADE;` Data-migration step: if any rows exist in production `tenant_page_layouts`, a one-time script translates them into equivalent `custom_pages` + `custom_page_blocks` rows before the drop.
2. **BSU removal** — delete `business-suite-unified/src/pages/Developer/Pages.tsx`, `Pages.test.tsx`, remove `/developer/pages` route from `App.tsx`, remove the Pages tab from the Developer portal nav.
3. **Realtime subscription cleanup** — remove `tenant_page_layouts` entry from `business-suite-unified/supabase/migrations/20260409000003_enable_realtime_all_tables.sql` via new migration that revokes publication membership.
4. **Shared-package cleanup** — `@bsuite/schema-registry@^0.1.0` removes the `TenantLayoutSlot` component that queried `tenant_page_layouts`; replacement `CustomPageRenderer` component queries `custom_pages` + `custom_page_blocks`. Bump to 0.2.0 with breaking-change note. All consumer apps bump in the same PR set.
5. **Ownership map update** — `packages/dry-lint/src/ownership-map.json` updated to remove the "P1-4 pending decision" `$comment` on `custom_pages` and `custom_page_blocks`; comment replaced with an ADR-0001 citation.
6. **DRY spec update** — `docs/20260227-dry-one-shot-architecture-v1.04A.md` bumped to `v1.02A`, §1 ownership map updated, §11 Phase 5 entry struck-through with ADR-0001 citation, new entry in §11 documenting the consolidation.
7. **Finish-line roadmap update** — P1-4 "AUDIT MISMATCH" entry replaced with P1-4(b) "CRM7 canonical + BSU removal" linked to this ADR.

No dual-mode interim state. No `@deprecated` markers. No "we'll delete it later" shims. The BSU surface is removed atomically in the same PR that consolidates CRM7 as canonical.

### Follow-on features (CRM7-side)

- `custom_pages.app_scope` column needed on `custom_pages` if not already present (for per-consumer-app targeting). Verify against current schema; add migration if missing.
- `custom_pages.is_developer_only` column (for platform-admin-only surfaces) — carried over from `tenant_page_layouts` spec.

### Security

- RLS on `custom_pages` already enforces tenant isolation (per `20260304100000_ui_customization_system.sql`). No RLS change required.
- `is_developer_only=true` rows must be filtered in the four-persona matrix test (owner / admin / staff / viewer) — add to existing RLS test suite.

### Atomic removal disallows

- Shipping BSU `Pages.tsx` with a "coming soon" message.
- Shipping both tables in parallel during a "migration window".
- Leaving `tenant_page_layouts` in place as a legacy read-only table.
- Any `@deprecated` JSDoc on `TenantLayoutSlot` — it gets deleted, not marked.

## Compliance Gate

This ADR is ratified once the user signs off. Execution of the consequences begins in Phase 2 of the consolidated plan (`docs/20260501-merged-execution-backlog-v1.00W.md`). The tenant data migration step (consequence #1) must be dry-run against production on a staging branch before the live migration.
