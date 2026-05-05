# `@bsuite/schema-builder` Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.7.1] — 2026-05-05 — Toolchain refresh

### Changed

- Bumped dev toolchain: Vite 6 → 8, TypeScript 5.9 → 6.0, `@vitejs/plugin-react` 5 → 6. No public API changes.
- Lockfile regenerated. All 104 tests passing on Node 24.

### Notes

- Part of the bsuite-wide toolchain refresh (2026-05-05). See `@bsuite/nav-core` 0.5.2.
- Note: `0.6.0` (Phase 3A field reorder) and `0.7.0` (Phase 3B opt-in ALTER TABLE RENAME COLUMN) shipped without CHANGELOG entries; see the `package.json` `description` field and `git log` for those changes.

---

## [0.5.1] — 2026-05-01

### Fixed

- **SQL bug in Phase 1a migration.** `20260503000000_add_field_level_relations.sql` previously declared the `source_field_id` / `target_field_id` foreign keys with `ON DELETE SET NULL`, which interacted badly with the paired-NULL `chk_field_level_pair` CHECK constraint — deleting any field that participated in a field-level relation would be aborted by Postgres with a confusing check-violation error. Changed to `ON DELETE CASCADE` so deleting a field cleanly removes its relations. The migration now includes an idempotent repair block that drops any pre-existing SET NULL / RESTRICT FK constraints from the old draft and replaces them with CASCADE, so dev environments that applied the earlier version heal automatically on re-apply.
- **`reflect_entity_schema` RPC security hardening.** The `p_schema` parameter was previously unconstrained despite the function running as `SECURITY DEFINER`. Added a schema whitelist (currently `public` only) via a CASE expression in the WHERE clause; non-whitelisted schemas now return an empty result set rather than exposing metadata for `pg_catalog`, `auth`, or `storage`. To extend the whitelist, edit both the BSU canonical copy and the package dev-fixture copy.

### Changed — Dev infrastructure

- **Migration canonicalisation.** The three Phase 1a migrations (`20260503000000_add_field_level_relations.sql`, `20260503000001_revert_field_level_relations.sql`, `20260504000000_schema_reflection_rpc.sql`) now have their canonical home in `business-suite-unified/supabase/migrations/` — BSU is the DB-migration owner for the whole BSuite monorepo. The copies in `packages/schema-builder/supabase/migrations/` are explicitly labelled dev-fixtures (see that directory's `README.md` for the hard rule and sync workflow). Pre-0.5.1 the migrations lived only inside this package, so `supabase db push` in consumer-app CI never applied them to BSU staging or production.
- **Single dev-fixture location.** The `20260504000000_schema_reflection_rpc.sql` file previously lived at `packages/schema-builder/src/supabase/migrations/` (inside `src/`, inconsistent with the other two). It has been moved to `packages/schema-builder/supabase/migrations/` so all dev-fixture copies share one directory.
- **`-- @sync-boundary-below` marker.** Each SQL file now carries a sentinel marker comment. Content below the marker must be byte-identical between the package dev-fixture and the BSU canonical copy. The annotation header above the marker is allowed to differ (package says `DEV-FIXTURE COPY`, BSU says `CANONICAL location`).

### Added — Documentation & tooling

- `packages/schema-builder/supabase/migrations/README.md` — documents the canonical-vs-fixture relationship and the sync workflow. Prominent `⚠️ HARD RULE` banner at the top is the anti-regression guard.
- `packages/schema-builder/CHANGELOG.md` — this file. Backfills version history for 0.1.0 → 0.5.1.
- `.github/workflows/schema-builder-migration-parity.yml` — CI parity check in the parent bsuite repo. Runs three verifications on every PR touching either migrations directory: (1) every package dev-fixture has a BSU canonical twin, (2) every BSU migration that opts-in by including the `-- @sync-boundary-below` marker has a dev-fixture twin — marker-based opt-in correctly ignores pre-existing BSU migrations that touch Schema-Builder tables for broader concerns (blanket RLS sweeps, Realtime publication toggles, FK index additions) without being Schema-Builder-owned, (3) content below `-- @sync-boundary-below` is byte-identical across both copies. Fails with informative error messages that point at BOTH recovery paths — Fix A (land a dev-fixture twin if the migration is genuinely Schema-Builder-managed) and Fix B (remove the marker if it was added by mistake).
- `business-suite-unified/supabase/migrations/SCHEMA_BUILDER_SYNC.md` — cross-reference README in BSU's migrations dir so contributors who start from BSU (rather than the package) also see the sync rule.

### Safety

No public API changes. Consumers depending on `@bsuite/schema-builder@^0.5.0` will pick up 0.5.1 on next `pnpm install` with zero behaviour change in TypeScript. The only runtime difference is in applied SQL (CASCADE replaces SET NULL), and that change is gated by the repair block — a clean dev-Supabase that never applied the SET NULL draft will land the CASCADE constraints for the first time.

---

## [0.5.0] — 2026-04-30

### Added

- `FieldEditDialog` component for editing existing fields via double-click on a field row (Phase 2).
- Rounded out the field CRUD surface so all four consumer apps (crm7, BSU, conduit, R80.3) can collapse their schema-builder pages to thin wrappers passing only `supabase` + `tenantId`.

## [0.4.0] — 2026-04-29

### Added

- `FieldCreateDialog` component (Phase 1c) — Zod-validated field creation with inline type picker.

## [0.3.0] — 2026-04-29

### Added

- Column-level React Flow handles on `FieldRow` (Phase 1b.2).
- `useSchemaReflection` hook backed by the `reflect_entity_schema` RPC.
- PNG export via `html-to-image`.
- Full field CRUD surface.

## [0.2.0] — 2026-04-29

### Added

- Dagre auto-layout (`@dagrejs/dagre` network-simplex ranker).
- Crow's-foot cardinality markers on `SmartEdge`.
- Floating toolbar and inline entity rename.

## [0.1.0] — 2026-04-29

### Added

- Initial release: shared Schema Builder canvas, entity nodes, edges, Zod schemas, and data-layer service consolidating the 4 previously-duplicated implementations across crm7, BSU, conduit, and R80.3.

---

<!--
  Compare-link footer intentionally omitted.

  The scoped-package git-tag convention (e.g. `@bsuite/schema-builder@0.5.1`)
  is not currently created by any release workflow in this monorepo, so
  GitHub compare URLs referencing those tags would 404.

  Reinstate this footer once a release-tagging convention lands (e.g.
  release-please, changesets, or manual `git tag @bsuite/schema-builder@X.Y.Z`
  in a post-merge workflow). Until then, navigate version history via:

      git log --follow packages/schema-builder/CHANGELOG.md
      git log --follow packages/schema-builder/package.json

  Keep a Changelog 1.1.0 does NOT require compare-link footers — they are
  a convenience for readers, not a spec requirement.
-->
