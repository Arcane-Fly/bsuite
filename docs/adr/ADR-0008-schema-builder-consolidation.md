# ADR-0008: Schema Builder Consolidation — `@bsuite/schema-builder`

> **RENUMBERED 2026-08-17 — was ADR-0004, filename `ADR-0004-schema-builder-consolidation.md`.**
>
> This ADR was ratified on 2026-05-01 as "ADR-0004", colliding with
> [ADR-0004 — OAuth Allow-List Doctrine](ADR-0004-oauth-allowlist-doctrine.md), which
> was ratified the same day and took the index row. The collision left this document
> **absent from the ADR index and therefore unreachable** by anyone browsing
> `docs/adr/README.md` — flagged in the 2026-07-25 and 2026-07-27 documentation audits
> and never fixed until now.
>
> The decision itself is unchanged and remains **Accepted**; only the number and
> filename moved, to the next free number. Citations to "ADR-0004 (schema builder)"
> in documents predating this date refer to this file. The OAuth Allow-List Doctrine
> keeps 0004 because it holds the index row and the wider inbound-citation surface.

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

- **Status:** Accepted (2026-05-01; renumbered 0004 → 0008 on 2026-08-17)
- **Supersedes:** N/A
- **Superseded by:** N/A
- **Context PRs:** parent bsuite #334 (schema-registry 0.3.1 shim), #335 (Phase 0), #336 (plan v1.04W), #337 (plan v1.05W + archival)
- **Scope PR:** parent bsuite `feat/phase-1a-schema-builder-package` + 4 consumer PRs (crm7, BSU, conduit, R80.3)
- **Plan reference:** [`docs/plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md`](../plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) §3.2 + §3.6 + §3.7 + §3.9 + §4 Phase 1a

## Context

Four near-identical React Flow schema builders existed across the BSuite:

| App | File | Lines |
|---|---|---|
| crm7 (canonical) | `crm7/src/pages/settings/schema-builder/*` | ~1 620 |
| business-suite-unified | `src/pages/Settings/SchemaBuilder.tsx` | ~480 |
| conduit | `src/app/(dashboard)/settings/schema-builder/_view.tsx` | ~480 |
| R80.3 | ~~`src/components/SchemaBuilderView.tsx`~~ (R80.3 path — that repo left the submodule set on 2026-08-06; this row is the pre-consolidation record) | ~440 |

All four implemented the same drag-to-connect, relationship dialog, smoothstep
edges, position persistence, and delete handling. None implemented field-level
handles, crow's-foot cardinality markers, dagre auto-layout, or live
information_schema reflection.

The DRY violation blocked every subsequent change: a fix applied to one copy
had to be replicated in three others, with silent drift inevitable. The plan's
Phase 1b Airtable upgrades (§3.6) would have required re-implementing the
same features four times. Phase 1a is the Hot-Sync carve-out that eliminates
this debt before any feature work lands.

## Decision

1. **New shared package** `@bsuite/schema-builder@0.1.0` lands in
   `packages/schema-builder/` mirroring `@bsuite/schema-registry`'s build
   conventions (tsc + vitest + strict TS + liberal React peer range + aligned
   React 19 devDependencies per the Dependency Version Policy in Phase 0).

2. **Canonical controller hook** `useSchemaController` owns load / save /
   persist / delete / position-update + Supabase Realtime subscription. It is
   the single source of truth for schema state. Mutations use TanStack Query
   native optimistic (`onMutate` / `onError` / `onSettled`) — transition-safe,
   rollback-safe, and cache-consistent. `useEffect`-for-persist is banned
   inside the package and disallowed in consumer wrappers by the red-team
   pass (`dry-one-shot-architecture` lens).

3. **Query keys** follow the TanStack Query v5 `queryOptions` factory pattern:
   `schemaEntitiesOptions(client, tenantId, appScope)` and
   `schemaRelationsOptions(...)`. Consumers import the factories from
   `@bsuite/schema-builder/hooks` rather than hand-rolling `['schema-entities',
   tenantId]` tuples, eliminating invalidation drift.

4. **Zod shape contract** per plan §3.9: `CardinalitySchema`,
   `EntityFieldSchema`, `EntityNodeDataSchema`, `SchemaRelationSchema`.
   `toDbRelation` / `fromDbRelation` translate between the Zod shape and the
   DB row shape per the alias table — the test suite asserts every column is
   covered. Field-level shapes (`source.fieldId`, `target.fieldId`) are
   authored in 1a but kept optional so Phase 1b can populate them without a
   schema break.

5. **Prerequisite migration** `20260503000000_add_field_level_relations.sql`
   ships as a reference copy in `packages/schema-builder/supabase/migrations/`
   and is applied via a BSU-owned PR per the package README. Adds
   `source_field_id`, `target_field_id`, `on_delete`, `on_update` to
   `tenant_entity_relations` (all nullable; legacy rows unaffected).

6. **Thin wrappers in every consumer app** collapse each existing schema-
   builder route file to ~30 lines calling `<SchemaBuilder supabase={...}
   tenantId={...} appScope={...} navigationTargets={...} onNavigate={...} />`.
   Net deletion: ~1 500 lines across the suite.

7. **Phase 1a Cmd+K palette** is scoped to `Find Entity <name>` +
   `Go to <page-path>` only. Everything else (`Add Column`, `Connect Tables`,
   `Tidy Up Layout`, `Add to Page`, `Toggle Edit Mode`, `Undo`, `Redo`,
   `Publish`) ships in Phase 1b / 3 / 5 per §3.10.

8. **Brand neutrality:** the package uses plain HTML + Tailwind utility
   classes (no shadcn deps beyond `cmdk` as an optional peer). Consumer apps
   wrap with their own shadcn-themed chrome (permission gates, toasts,
   container cards). This lets braden's Corporate palette and crm7's D2C
   palette both consume the same runtime without contaminating each other.

## Consequences

**Positive:**

- Single implementation of Schema Builder. Any fix or feature propagates to
  all 4 consumers via a package version bump.
- Phase 1b's Airtable upgrades (§3.6) implement once in the package rather
  than four times.
- Supabase Realtime subscription centralized — two open tabs on the same
  tenant see each other's schema mutations within one tick.
- TanStack Query cache canonical — no more stringly-typed query-key drift.
- ~1 500 lines removed; test coverage concentrated in one package; strict
  TypeScript end-to-end.

**Trade-offs:**

- Consumers now depend on one more shared package with its own release
  cadence. Mitigated by the Dependency Version Policy (v1.05W §5) and the
  monthly `chore(deps)` sweep.
- The package's `@xyflow/react`, `@tanstack/react-query`, `@supabase/supabase-js`
  peer deps must match what consumers ship. All four consumers already carry
  compatible versions per the compatibility matrix (§6).
- Brand-specific theming moves from per-app to CSS-variable-driven (the
  `accentColor` field on `EntityNodeDataSchema` must be a `var(--token-name)`
  reference, never a hex). Validated by the Phase 3 red-team `bsuite-brand-
  system` lens.

**Risks + mitigations:**

- **Migration drift** — the reference migration in the package must stay in
  sync with the BSU canonical copy. Mitigation: `check-migration-parity.sh`
  CI check added in Phase 6 per plan §5 item 7.

  > **The mitigation named above did not exist until 2026-08-22.** This ADR carried a
  > named control for its own top risk for nearly four months with nothing behind the
  > name — and an ADR is precisely the document a later reader trusts without
  > re-deriving it.
  >
  > It exists now: `scripts/check-migration-parity.sh`, run by
  > `.github/workflows/estate-invariants.yml` on every push to `main` and `development`.
  > All five dev-fixture migrations were measured in sync when it was built, so it banks
  > a good state rather than reporting a bad one. That was luck.
  >
  > It compares executable content, not bytes. The two copies differ **by design** in
  > their provenance headers — each states which one it is, so neither can be edited in
  > the wrong place by accident — and a byte-compare gate would have been red on day one
  > and switched off within the week.
- **Realtime channel leak** — the `useRealtimeSubscription` hook owns
  cleanup via the effect's return. Verified by the Vitest suite's cleanup
  assertions.
- **Phase 1b field-level additions** require the migration to be live first.
  Mitigation: Phase 1a's `Definition of Done` includes the migration
  confirmation in dev Supabase before any Phase 1b work starts.

## Related ADRs

- ADR-0001: Custom Pages canonical ownership (CRM7)
- ADR-0003: Consumer Renderer Pattern (per-app thin wrappers for shared
  rendering primitives)
- Future ADR-0005: Shared-package `peerDependencies` strategy (Phase 6
  re-evaluation per plan §4 Phase 6 deliverable 5)
