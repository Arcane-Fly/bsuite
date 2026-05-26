# @bsuite/page-builder — CHANGELOG

All notable changes to `@bsuite/page-builder` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 0.3.0 — 2026-05-26 — Canvas editor UX & resize performance

### Fixed

- **Resize handle hit an artificial ceiling at ~512px.** `DEFAULT_RESIZE_BOUNDS.maxH` was 16 rows (≈32px each), which clipped data tables holding more than ~7 rows. Operators reported the resize handle "hits a wall before all my data fits" on the WHS Host Employers page where the card claimed `(9)` rows but only ~3 were visible. Bumped to 48 rows (≈1536px) which fits ~20–30 rows of any density and matches typical maximum viewport heights. Cards still needing more data should rely on their own internal scroll container.
- **6–7 second INP block during drag/resize.** `onLayoutChange` was committing to the preference adapter on every drag tick (≈60Hz), causing long-task warnings on `.react-grid-layout` and `.react-resizable-handle-se`. Now coalesces a burst of ticks into a single trailing-rAF commit — final position is still persisted when the gesture ends, but adapter calls drop from ~60/sec to ~1/sec. Eliminates the 6–7s main-thread blocks observed in the perf overlay.
- **Canvas editor banner pushed page content below the fold.** The banner now uses `sticky top-0` with a translucent (`bg-card/95` + `backdrop-blur`) background so the form behind stays partially visible. The Create New Host Employer header and form fields are no longer pushed off-screen when the editor is active.

### Added

- **`PAGE_GRID_EDITING_EVENT` window event.** Broadcast on every `isEditing` transition with `{ pageKey, editing }` detail. Floating launchers (e.g. crm7's "Edit Page" FAB) subscribe so they can hide themselves while the editor is already open — removes the redundant-affordance UX where the FAB sat in the corner while the editor banner was visible at the top.
- **`data-page-grid-editing` attribute** on the grid scroll container. Lets consumers style the surrounding chrome when the editor is active without inspecting React state.

### Notes

- All 28 unit tests pass against these changes.
- Minor version bump (0.2.9 → 0.3.0) reflects the new exported event API and behavioral change to `onLayoutChange` throttling; existing call sites continue to work unchanged.

---

## 0.2.5 — 2026-05-06

### Fixed

- **D2C theme on canvas-editor chrome.** Column-preset chips, Compact Layout / Reset to Default / Add-widget buttons no longer fall through to hardcoded gray hex (#2563eb / #f3f4f6 / #6b7280 / #e5e7eb) when consumer apps use shadcn-style `--primary`/`--muted`/`--border` tokens instead of the legacy `--accent-primary`/`--bg-tertiary`/`--text-secondary`/`--border-shell` names. Replaced inline `style={...}` with Tailwind classes that resolve via every BSuite consumer's `@theme inline` block. Closes bsuite operator UX issue (BSU walkthrough 2026-05-06).

### Notes

- 0.2.4 was published with no source change; 0.2.5 carries the actual fix.

---

## [0.2.2] — 2026-05-05 — Toolchain refresh

### Changed

- Bumped dev toolchain: Vite 6 → 8, TypeScript 5.9 → 6.0, `@vitejs/plugin-react` 5 → 6. No public API changes.
- Lockfile regenerated. All 17 tests passing on Node 24.

### Notes

- Part of the bsuite-wide toolchain refresh (2026-05-05). See `@bsuite/nav-core` 0.5.2.

---

## [0.2.1] — 2026-05-04 — React 19 attestation

### Changed

- Formal attestation that `@bsuite/page-builder` is tested against and
  compatible with React 19. No public API changes.

### Notes

- `peerDependencies.react` and `peerDependencies.react-dom` remain
  `">=18 <21"` (unchanged). The range already admitted React 19; this patch
  bump documents the attestation after all four page-builder consumer apps
  (business-suite-unified, conduit, crm7, R80.3) landed on React `^19.2.4`
  or `^19.2.5`.
- `devDependencies.react` and `devDependencies.react-dom` remain `^19.2.4`
  (unchanged).
- Satisfies AGENTS.md §Dependency Version Policy rule 2: shared packages must
  keep parity with the lowest consumer React version. All consumers are now on
  React 19.
- Accompanies `@bsuite/nav-core` 0.5.1 (adds missing React `peerDependencies`)
  and `@bsuite/schema-registry` 0.3.2 (same attestation bump).

---

## [0.2.0] — Pre-changelog (retrospective) — Initial public release

- First publish to npm as `@bsuite/page-builder`.
- Shared responsive page-builder grid and layout persistence primitives,
  with optional `@dnd-kit` integration (peer-dependency, optional).
- Exports: root entry for React components/hooks, plus
  `./styles.css` subpath for `react-grid-layout` token overrides.
