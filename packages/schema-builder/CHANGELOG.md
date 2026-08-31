# `@bsuite/schema-builder` Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.4] — 2026-08-31 — Dev fixtures for the hardened forward migrations

No source change. Adds the two dev-fixture copies of the forward migrations that
landed canonically in BSU (`business-suite-unified#1056`), so `supabase start`
against this package reproduces the same schema the estate runs:

- `20261009000000_schema_builder_reorder_entity_fields_forward.sql`
- `20261009000100_schema_builder_rename_physical_column_hardened.sql`

The second is the privilege-escalation fix: `rename_physical_column` took its
`ALTER TABLE` target from caller-controlled `tenant_entities.name`, so any tenant
admin could rename a column on any `public` table — `user_tenants.role` included.
It is now constrained by a `schema_builder_physical_tables` allowlist, which ships
empty, so the RPC is inert until a table is explicitly opted in.

Both files are **DEV-FIXTURE COPIES**; BSU remains canonical. Content below the
`-- @sync-boundary-below` marker is byte-identical to the BSU originals, which is
what `schema-builder-migration-parity` Check 3 enforces.

---

## [1.6.3] — 2026-08-29 — Republish so the tarball carries the REVOKE

No source change. `1.6.2` was published **before** the 2026-08-28 REVOKE was appended
to `supabase/migrations/20260505000000_field_sort_order_and_reorder_rpc.sql`, so the
tarball on npm and the source in this repo disagreed on that one file — the published
copy created the SECURITY DEFINER `reorder_entity_fields` RPC while leaving the default
`GRANT EXECUTE ... TO PUBLIC` that PostgreSQL attaches on creation.

Found by `scripts/check-published-matches-source.mjs`, which unpacks each published
tarball and diffs it against source: 15 packages examined, this was the only file
differing anywhere in the estate.

**No live exposure.** The only deployable copy of this migration is
`business-suite-unified/supabase/migrations/`, which already carries the REVOKE; no
migration path applies package-shipped SQL out of `node_modules`. This closes the gap
between the artifact and its source before that stops being true.

## [1.6.2] — 2026-08-27 — Tidy stopped stacking cards on top of each other

Operator report **D-6**: *"Schema builder makes no sense. I have no idea how to
use it. Selecting 'tidy' icon just puts the schema cards into a column. Super
un-usefull. 'Fit' icon does nothing."*

### What was actually still broken, measured rather than assumed

Measured on `crm.crm7.app/settings/schema-builder`, signed in, 1440x900,
2026-08-27:

| Sub-complaint | State on production today |
| --- | --- |
| Canvas renders at zero height | **Already fixed.** `.react-flow` is 1184x836. Shipped in 1.6.0. |
| "'Fit' icon does nothing" | **Already fixed.** Pressing Fit moves the viewport transform from `scale(0.282)` to `scale(0.338)`; 44 of 44 cards framed. |
| "Tidy just puts the cards into a column" | **STILL BROKEN — this release.** |

At the canvas's opening zoom of 0.75 — the band where `EntityNode` still draws
field rows — the 44 cards sitting on `computeGridLayout`'s persisted output had
**69 of their 946 pairs physically overlapping**, the worst intruding 257px into
its neighbour. Cards stacked five deep on a 220px pitch do not read as a grid.
They read as a column, which is the word the operator used.

### Fixed

- **`computeGridLayout` sizes rows from the tallest card in the row, and columns
  from the widest card anywhere.** It was `(i % columns) * 320` by
  `floor(i / columns) * 220` — a fixed pitch, against cards whose measured
  heights on that tenant run from 103px to 1275px and whose widths reach 351px.
  Every row buried the row beneath it and every column clipped its neighbour.
  Card size now comes from React Flow's `measured` dimensions when it has them
  and from `estimateCardHeight(fieldCount)` before that, which is the same
  estimate `computeDefaultGridPositions` has always used — one model of how tall
  a card is, not two that can drift.

  Verified on the production card sizes: **69 overlapping pairs → 0**.

  `gapX`/`gapY` are replaced by `gutterX`/`gutterY` rather than retuned. The old
  names meant PITCH, the new ones mean GUTTER; keeping the names would silently
  change what a caller's number does. Nothing outside this package could call
  it — it is not re-exported from `utils/index.ts` or the package root.

- **Why this survived every previous check.** Tidy ends with a `fitView`, which
  for 44 cards settles at zoom 0.28 — below `LOD_FIELDS_VISIBLE` (0.7), so the
  cards collapse to header-only and stop overlapping. The damage is invisible at
  the zoom Tidy leaves you at and appears the moment you zoom in far enough to
  read anything. A screenshot taken straight after pressing Tidy shows a clean
  grid. The old unit test made the same mistake from the other end: it asserted
  the exact pitch constants on nodes given no size at all, and nodes with no
  size cannot overlap. It is now an outcome assertion — no two cards share
  space — so retuning the gutters is free and reintroducing the bug is not.

- **The canvas no longer opens in the middle of the diagram.** React Flow's
  `fitView` centres the bounding box, and when `fitViewOptions.minZoom` stops
  everything from fitting, centring guarantees clipping on all four sides and
  hides the top-left corner — the one landmark that says where the diagram
  begins. Measured: opening translate `(122.875, -445.625)` at zoom 0.75, with
  14 of 44 cards rendered whole and the rest sliced by the frame. New
  `computeOpeningViewport` keeps the library's zoom exactly — the legibility
  floor is unchanged and deliberately so — and anchors any axis that overflows
  to the content's leading edge, one padding in. An axis with room to spare is
  still centred. The control for that test is `getViewportForBounds` imported
  from the installed `@xyflow/react`, not a paraphrase of it.

### Sibling surfaces

Four React Flow canvases in the estate, enumerated by
`git grep -l ReactFlow origin/development -- '*.tsx'` in each of the six app
submodules plus `grep -rl '@xyflow/react' packages/*/src` in the monorepo —
reading each repo's `origin/development` ref, not a local working tree. Only
this one has an auto-layout at all. `crm7`'s `pipeline-flow-inner.tsx` uses a
fixed 260px pitch against a 180px `minWidth` node with no maximum, which is the
same class with a much smaller blast radius and follows separately in its own
repo. BSU's `RelationshipCanvas` and `SchemaVisualizer` derive no positions.

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
- **All five modal `<dialog>`s now close on a backdrop click** — Field create,
  Field edit, the rename-confirm, Relationship config, and the entity
  delete-confirm. The same operator report covered these ("menues ... dont close
  when the user clicks away"), and the reason they shipped this way is written
  into the sibling hook's own docblock: it said a native `<dialog>` "gets
  Escape-to-close and a backdrop for free from the browser". `showModal()` gives
  you a backdrop ELEMENT; it does not give you backdrop-click dismissal. That is
  `closedby="any"`, which is not yet safe to rely on across the browsers this
  estate supports. New `useLightDismissDialog` hook closes via the element's own
  `close()`, so a backdrop click travels the exact path Escape already does and
  the two cannot drift apart.

  Two deliberate exclusions: a keyboard-synthesised click (Enter on a focused
  button reports coordinates `0,0`, outside every rect) does not dismiss, and the
  rename-confirm does not light-dismiss while the rename is actually running
  against the database — `confirming` and `error` are states a user may safely
  back out of, `running-wet` is not.

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
