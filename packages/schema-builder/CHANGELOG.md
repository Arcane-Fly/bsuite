# `@bsuite/schema-builder` Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] — 2026-08-20 — Quick-start tip is dismissible; canvas gets a height floor

An operator report against conduit's Schema Builder page showed the "Schema
Builder quick start" tip rendering on top of the page's own header and
breadcrumb, with no way to dismiss it — not by clicking away, not with
Escape, and it had no close button.

### Fixed

- **Quick-start tip is now dismissible three ways**: an outside pointer-down,
  the Escape key, and a visible close button with the accessible name
  "Dismiss quick start tips". Previously it had zero dismiss affordances —
  it rendered unconditionally whenever the toolbar was shown.
- **Canvas wrapper gets a `min-h-[420px]` floor.** The real root cause of the
  header overlap: the wrapper this tip is `absolute`-positioned inside
  relies on every ancestor correctly cascading `height: 100%`. conduit's
  Schema Builder route mounts this package inside a content-flow container
  with no definite height (a normal scrolling page, not a fixed-height
  shell), which collapsed the entire `h-full`/`flex-1` chain down to `0px` —
  and an `absolute bottom-3` child of a 0-height box renders flush against
  whatever sits directly above it, which is how the tip ended up over the
  header instead of near the canvas. A fixed `min-height` doesn't
  participate in that percentage-of-auto collapse, so it holds a sane floor
  regardless of what a consumer's own layout does — protecting BSU, crm7,
  R80.3 and conduit alike from the same class of bug, not just conduit.
- **Command palette (Cmd/Ctrl+K) now has a visible close button** in addition
  to its existing outside-click and Escape handling, plus `role="dialog"` +
  `aria-modal="true"` + an accessible name, and focus is returned to
  whatever was focused before the palette opened.

### Added

- `useDismissOnOutsideOrEscape` hook (`hooks/index.ts`) — small,
  dependency-free outside-click + Escape dismiss behaviour for non-modal
  floating surfaces. Kept local to this package (not pulled from
  `@bsuite/ui`) to preserve the "zero design-system dependency" property
  documented in `EntityPropertiesPanel`'s file header.

## [1.3.1] — 2026-08-17 — WCAG AA: entity card ARIA contract

Fixes the three axe rules that blocked crm7's WCAG AA E2E gate on
`/settings/schema-builder` in BOTH themes (crm7#1770). All three originated in
this package — not in React Flow, which was the initial suspicion.

### Fixed

- **`aria-prohibited-attr` (serious) — ~14,016 nodes, the single largest source
  of violations in the entire crm7 E2E run.** `FieldRow` and `EntityNode` put
  `aria-label` on `<Handle>`. `@xyflow/react` 12.11.2 renders `<Handle>` as a
  **role-less `<div>`** and spreads caller props straight onto it (its body is
  `jsx("div", { "data-handleid": ..., ...rest })`); it contributes **no**
  `aria-label` of its own. `aria-label` on a generic-role element is prohibited
  by ARIA and is never exposed by assistive tech, so those labels announced
  nothing while emitting four violations per field row on every entity. The six
  handles (four per field row, two entity-level) are now `aria-hidden="true"`,
  which states the truth: they are mouse-drag-only affordances. The `title`
  tooltip is retained for mouse users.
- **`aria-required-children` (critical).** `EntityNode` wraps field rows in
  `role="list"`, but the rows were plain `<div>`s. `FieldRow`'s root now carries
  `role="listitem"`.
- **`aria-allowed-attr` (critical).** `EntityNode`'s root used `aria-selected`
  on `role="group"`; ARIA permits `aria-selected` only on roles such as
  `option`/`row`/`tab`/`treeitem`. Replaced with `aria-current`, which conveys
  the same "active card" meaning and is valid here.

### Added

- `src/__tests__/EntityNode.aria.test.tsx` — locks all three rules in
  structurally (no axe dependency added; the authoritative axe check remains
  crm7's E2E gate against the real page).
- `FieldRow.test.tsx` gained handle-`aria-hidden` and `role="listitem"` guards,
  and its `@xyflow/react` mock now **spreads** `...rest` like the real Handle
  instead of cherry-picking named props — the old mock would have hidden this
  entire defect class.

### Known gap (NOT fixed here)

- There is still **no keyboard or assistive-tech path to create a
  relationship**: `RelationshipConfigDialog` only opens from a pointer-drag
  `onConnect`. `aria-hidden` does not shrink that gap — it stops the DOM from
  advertising an affordance assistive tech could never reach. Tracked
  separately as a feature gap.

### Verification

- Rules confirmed against **axe-core 4.12.1** — the exact version
  `@axe-core/playwright` 4.12.1 resolves for the crm7 E2E suite.
- Before: `aria-prohibited-attr` (serious) + `aria-required-children`
  (critical) + `aria-allowed-attr` (critical) reproduced on the rendered
  component. After: **0 violations at any severity** (26 handles, 6 listitems).
- 143/143 package tests pass; `typecheck` and `build` clean.

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
