# @bsuite/page-builder — CHANGELOG

All notable changes to `@bsuite/page-builder` are recorded here.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.4] — 2026-08-25 — Changing the column count destroyed the saved layout

Changing the canvas column count rewrote the stored layout and offered no undo.
Driving the deployed crm7 dashboard through 11 → 4 → 8 → 2 → 11 flattened a
three-across arrangement into a single stacked column, permanently — and it
survived a cold browser context, because the layout is per-user server state.

Measured against `rescaleLayout` directly:

| | |
|---|---|
| before | `a(w4 @x0) b(w3 @x4) c(w4 @x7)` / `d(w6 @x0) e(w5 @x6)` |
| after | `a,b,c,d,e` — all w6, all x0, one per row |

The rescale is lossy at the **narrow** end: every item clamps to the one-column
minimum and the row-packer puts one per row, so coming back up cannot recover an
arrangement that no longer exists. Widening and returning *is* lossless — the
damage is done by any pass through a column count too small to hold the layout.

Two places wrote it back: `handleColumnChange`, and an effect firing on every
render where `baseCols !== layoutCols`. Both are gone. `currentLayouts` already
derived the display at `layoutCols` from the authored layout at `baseCols`, and
that path was always correct — so leaving storage alone makes the column control
a **view**, and the round trip exact.

Storage now moves only when the user edits. `commitLayout` and the new
`commitItems` are the only two places that persist, and the only two that re-base
`baseCols`.

**Consumer impact: none at the call site.** `handleColumnChange` keeps its
signature and still changes what is rendered. What changes is that it no longer
writes, so a user who explores column counts and returns gets their layout back.

---

## [1.0.3] — 2026-08-20 — Auto-height cards were one margin short, and clipped their own content

The operator's report was a screenshot of crm7's Add Client page: *"IS THIS WHAT
THE UI LOOKS LIKE? WHAT AN ABSOLUTE MESS."* He was right, and this is the part of
it that made the page non-functional.

### Fixed

- **`computeAutoHeightRows` credited every card with one margin it never
  receives.** react-grid-layout allocates `n` rows as
  `n * rowHeight + (n - 1) * marginY` — the margin sits BETWEEN rows — so `n`
  rows are worth one `marginY` LESS than the bare row unit suggests. The
  conversion divided by the bare unit, and `Math.ceil` cannot rescue that: the
  shortfall is inside the rounding, not beyond it.

  **Measured on production, 2026-08-20, crm7 `/clients/create` at 1366x768.** The
  card holding the form's Create/Cancel row came out **32px tall around a 36px
  button**, with `overflow-hidden`. The button was clipped, and a neighbouring
  card's helper text was painted over what remained — `elementFromPoint` at the
  button's centre returned a `<p>`, not the button. **A person could not submit
  the form.** `ceil((36 + 2) / 38) = 1` row, and one row is 32 pixels.

  The old form clipped whenever the needed height landed 1..`marginY` pixels
  above a row boundary — **60 of the first 401 content heights, about one card in
  six.** This package is consumed by crm7, conduit, BSU and throughput, and in
  crm7 alone **325 pages** render inside this grid.

- **The tests asserted the arithmetic, not the outcome.** They checked the
  division — "(300 + 2) / 38 -> ceil 8" — and never asked whether 8 rows buy
  enough pixels. They do not: 8 rows is 298px for 302px of content. **Three of
  the five encoded a clipping case as the expected answer**, which is how this
  survived a month with a green suite. Every test now measures against
  react-grid-layout's own allocation formula, so one can only pass if the content
  genuinely fits, plus a sweep over 0–400px and an over-allocation check that
  fails if one row fewer would also have fitted.

## 0.6.2 — 2026-07-31

### Fixed — card HEIGHT snapped back to its seed value on drop; WIDTH persisted correctly (crm7#744)

Reproduced in a real signed-in browser on `d.crm.crm7.app` (page-builder
0.6.1): dragging the SE resize handle on an `autoHeight` card tracked the
gesture live and resized visually, but the instant the gesture ended, height
reverted to its exact pre-drag value while width stuck. Deterministic across
every drag distance tested (+120px, +150px, +300px).

Root cause proved at the `usePageGridLayout` hook layer (not a render
artifact) — `stripAutoHeightRows`, which runs on every `onLayoutChange`
commit, unconditionally overwrote `h`/`minH` for ANY `autoHeight` item with
the value from *before* the current commit. It existed to stop a real hazard
— react-grid-layout renders `autoHeight` items with a merged
`h = max(saved, measured)` (see `activeLayouts` in `PageGridLayout.tsx`), so
`onLayoutChange` echoes that merged value back on every commit, and
persisting it verbatim would smuggle a derived measurement into storage. But
the guard had no way to tell "the render layer merged in a measured height"
apart from "the user just dragged the SE handle" — both arrive as an `h`
that differs from the base. It reverted both. `stripAutoHeightRows` never
touches `w`/`x`/`y`, which is exactly why width survived every gesture and
height never did.

Fix: only treat an incoming `h` as a measurement echo — and revert it — when
it exactly equals what react-grid-layout was actually rendered with
(`max(baseItem.h, measuredRows)`, using the live `autoHeightRows` map, not
the stale pre-commit base). Anything else is a deliberate resize, bigger or
smaller, and now persists — still floored by the measured content height so
nothing can clip.

Guarded by two new tests in `usePageGridLayout.persistence.test.tsx`
(`autoHeight resize height persistence (crm7#744)`), the first verified to
FAIL against 0.6.1 (`expected 6 to be 20`) before the fix. A third existing
test in `usePageGridLayout.test.tsx` that hand-crafted a measurement echo
without ever recording the measurement via `applyAutoHeightRows` was
corrected to match the real pipeline (a measurement can only appear in what
react-grid-layout renders because `applyAutoHeightRows` recorded it first),
and a sibling test was added proving a genuine resize with NO matching
recorded measurement survives. Suite 58/58.

---

## 0.6.1 — 2026-07-31

### Fixed — heal a PERSISTED `isResizable: false` (0.6.0 was not enough)

0.6.0 removed the render-layer `isResizable: false` override, but did not undo
what 0.5.2 had already written. That override leaked through
`onLayoutChange` into SAVED layouts, and react-grid-layout resolves:

```js
typeof l.isResizable === 'boolean' ? l.isResizable : !l.static && gridResizable
```

so an explicit persisted `false` beats the grid default permanently. Every user
who had ever loaded an affected page stayed stuck with no resize handles —
0.6.0 fixed only users with no saved layout.

Confirmed in a real signed-in browser: the saved preference for
`/financial/invoicing/:id` held `"isResizable":false` on all 6 cards, and
clearing it by hand did not help because the running build re-persisted it.

A per-item `false` on an `autoHeight` item cannot be a user choice — nothing in
the UI sets it, and page-level opt-out uses the `isResizable` PROP rather than
per-item layout — so dropping it is safe.

Guarded by `heals a PERSISTED isResizable:false on an autoHeight item`,
verified to FAIL without the heal. Suite 55/55.

---

## 0.6.0 — 2026-07-31

### Fixed — card resize restored on `autoHeight` items (regression)

`PageGridLayout`'s `activeLayouts` memo force-set `isResizable: false` on every
item with `autoHeight: true`, and overwrote `h` with the measured content
height on each re-measure. Because ordinary cards default to `autoHeight: true`,
this removed card resizing from effectively every consumer page — and would
have discarded any height a user did manage to set.

Resizable cards are an operator-mandated platform capability. The prior
internal note that traded resize away to stop a 192px content-clipping
regression posed a false choice; both properties hold at once:

| property | how |
|---|---|
| content can never be clipped | `minH = measuredRows` |
| a user-set height is preserved | `h = max(saved, measured)` |
| handles are present | `isResizable` no longer overridden |

`autoHeight` is now documented as a **floor**, not a lock.

Guarded by two tests in `PageGridLayout.autoHeight.test.tsx`, both verified to
FAIL against the previous implementation:
- `autoHeight does NOT disable resize handles`
- `a user-set height LARGER than the measured content is preserved, not stomped`

The existing auto-height regression tests (including the CRITICAL #1
same-frame settle and CRITICAL #2 zero-preference-write cases) continue to
pass — 54/54 across 8 files.

---

## 0.5.2 — 2026-07-16 — Fix: drag/resize gestures never persisted (bsuite#1588)

### Fixed

- **Edit-Page drag and resize gestures now persist.** Present since this
  package's first commit, the edit-mode compactor
  `{ ...noCompactor, preventCollision: true }` made react-grid-layout REVERT
  any gesture that landed on an occupied cell — and because `onDragStop` only
  emits `onLayoutChange` when the layout actually changed, a reverted gesture
  emitted **nothing at all**. No mutated value ever reached the preference
  adapter, so users' page customizations effectively never persisted on any
  layout with adjacent cards (every reorder target in a full-width stack —
  the dominant archetype on `/dashboard` and `/people/:id` — is occupied).

  react-grid-layout derives its knobs straight off the compactor object
  (`preventCollision = compactor.preventCollision ?? false`,
  `allowOverlap = compactor.allowOverlap`, `compactType = compactor.type`).
  With `compactType: null` there is no compaction to displace the colliding
  neighbour, so `preventCollision: true` left a full revert as the only
  possible outcome. Resize was rejected by the same lever. Gestures still
  *looked* live because react-draggable/react-resizable transform the DOM node
  directly, independent of whether the grid accepted the move.

  `usePageGridLayout` now hands react-grid-layout the **same
  `verticalCompactor` in edit mode and view mode**. Beyond unblocking the
  gesture, this removes a real editor/viewer mismatch: view mode always
  compacted vertically, so any free/overlapping arrangement the editor allowed
  was re-compacted away on Save & Exit regardless — "free placement" was never
  deliverable. One compactor for both modes means what the user arranges is
  what they get, and it also removes a spurious `onLayoutChange` that RGL fired
  on every edit-mode toggle purely because `compactType` changed (that echo
  carried the pre-gesture layout and was the only write reaching storage).

### Changed

- `usePageGridLayout().activeCompactor` is now always `verticalCompactor`
  (previously `noCompactor` + `preventCollision` while editing). The field
  remains on `UsePageGridLayoutResult` — no consumer API change. Cards now
  reflow/displace on drag instead of silently refusing to move.

---

## 0.5.0 — 2026-07-14 — Measured auto-height (derived, in-memory) + unconditional card border

### Added

- **`GridLayoutItem.autoHeight?: boolean`** — opt a widget into measured
  auto-height: the card's grid row count tracks its actual rendered content
  height instead of a fixed manual-resize value. `h` remains the initial
  seed row count used until the first measurement lands. Auto-height items
  are automatically rendered with `isResizable: false` (measurement owns
  their height; the manual resize handle would fight it).
- **Measurement pipeline**: each `autoHeight` `GridItem` wraps its content
  in an unconstrained measure div observed by a `ResizeObserver`. Measured
  pixel heights convert to rows via the exported pure function
  `computeAutoHeightRows({ contentPx, cardChromePx, rowHeightPx, marginYPx })`
  using the exact same `rowHeight`/`margin` the grid renders with. Updates
  are rAF-batched and suppressed during drag/resize gestures (queued, then
  flushed on gesture end) so measurement never fights the user.
- **`usePageGridLayout` API**: `applyAutoHeightRows(rowsByWidget)` applies a
  batch of measured row counts in ONE functional state update;
  `autoHeightRows` exposes the current in-memory map.
- Unconditional `border border-border` on every card surface.

### Design: measured heights are DERIVED, in-memory-only state

- Measured rows live in a separate in-memory map merged over the saved
  layout when producing the layouts handed to react-grid-layout — so every
  viewer (including read-only users) renders full-height cards.
- Measured heights are **never** written to the preference adapter, not
  even in edit mode: they re-derive on every mount, and persisting them
  would turn mere viewing (e.g. Radix tab switches inside a card, which
  remount panel content and fire the ResizeObserver) into storage upserts.
  A viewer switching tabs produces **zero** preference writes
  (integration-tested).
- The batch update is functional, so multiple auto-height cards settling in
  the same animation frame all keep their measured heights — no
  last-writer-wins through a stale closure (integration-tested).
- `onLayoutChange` strips measured `h`/`minH` back to the saved seed (and
  restores the `autoHeight` flag, which react-grid-layout does not
  round-trip) before persisting, so user-driven `x`/`y`/`w` changes — and
  `h` for non-autoHeight items — persist exactly as before while measured
  heights can never leak into storage through the drag/resize path.

### Notes for consumers

- Opting a card into `autoHeight` changes that page's default layout shape —
  bump the page's `layoutVersion` so previously-persisted user layouts
  (which predate the flag) are reset. See crm7 `/people/:id`
  (`layoutVersion` 1 → 2) for the reference rollout.
- All 6 consumer apps must bump their pinned `@bsuite/page-builder` version
  to `0.5.0` per `docs/DEPENDENCY-BUMP-CHECKLIST.md` — caret ranges do not
  auto-match a new minor in pinned consumers.

---

## 0.4.0 — 2026-05-26 — Remove vertical resize ceiling + internal card scroll

### Fixed

- **Cards stopped expanding before all content was visible.** Operator-flagged across the platform (CRM7 Contacts / Communications / Analytics / WHS, BSU GTO / Analytics): the bottom-right resize handle hit a wall well before the data inside fully fit. Live DOM inspection confirmed `.react-grid-item` reaching `height: 1536px` and refusing to grow further. Root cause: `DEFAULT_RESIZE_BOUNDS.maxH = 48` was applied as a *global* `maxSize(maxW, maxH)` constraint to **every** widget on **every** page, with no per-page or per-widget override path. The 0.3.0 bump (16 → 48) just moved the wall — it didn't remove it.

  **Fix:** removed the global ceiling entirely. `DEFAULT_RESIZE_BOUNDS` is now `{ minW: 2, minH: 1 }`. The `gridBounds` constraint already caps width at the active column count, so no separate `maxSize(...)` is required. Per-item `maxW`/`maxH` on `LayoutItem` remains the supported knob for "this widget should not grow past N units" — rgl v2's `minMaxSize` constraint reads each item's own `maxW`/`maxH` and is included in the constraint chain.

- **Card content clipped or fought the grid for height.** Without an internal scroll wrapper, tall content inside a `{content}` widget either overflowed the card chrome or forced the grid item to grow past the user's chosen size on the next layout pass. Fixed by wrapping `{content}` in `<div className="flex-1 min-h-0 overflow-auto">` inside the card's flex column. `min-h-0` is critical — flex children inherit `min-height: auto` and refuse to shrink below their content without it.

- **Consumer-page width starvation (platform-wide sweep).** Removed redundant `<div className="container mx-auto …">` wrappers from ~109 pages across CRM7 + BSU. These wrappers re-capped the page at Tailwind's 1280px breakpoint inside an app shell that already provides `max-w-[1680px]` (CRM7 `MainLayout`) or `px-4 md:px-6` (BSU `AppContent` `<main>`) + responsive horizontal padding, starving `<PageGridLayout>` of ~400px on wide displays.

  **Sweep rule (mechanical, applied via `/tmp/strip-container-mx-auto.py`):** strip `container mx-auto` *only* when the className contains NO `max-w-*` and NO `flex` modifier (those signal intentional narrow-form / centered layouts and were preserved). Standalone `px-N` was also dropped because the app shell already provides responsive horizontal padding; responsive variants like `sm:px-6` were kept (intentional page-level overrides). Vertical `py-*` and `space-y-*` were preserved (page rhythm).

  **Counts:** 84 files in `crm7/src/pages/` + 25 files in `business-suite-unified/src/pages/`. R80.3 and Conduit had zero hits (those apps don't use the pattern). Component-level files (`CRM7Footer.tsx`, `OneShotEntryDemo.tsx`, `PricingControls.tsx`, `PricingSections.tsx`) were over-reached by the initial run and reverted — those legitimately need `container mx-auto` for centering since they may render outside the main shell.

  **Visual delta on mobile:** BSU pages that had `container mx-auto px-6` previously rendered with 24px horizontal padding on mobile; they now inherit the app shell's `px-4` (16px) on `<md` viewports and `px-6` (24px) on `md+`. Acceptable per the BSU AppContent shell convention.

  Consumer cards should NOT apply their own `overflow:hidden` on a direct child of `{content}` or the scroll will be intercepted before reaching this container. Nested scroll regions (tab panels, data tables) compose cleanly with this outer scroll because pointer/wheel events bubble up only when the inner one is at its scroll edge — but if a consumer widget already wraps itself in `overflow-auto`, the result is a double-scroll which works but is awkward UX. Several existing widgets (e.g. `contactSidebarWidget`, sidebar/messages cards in CRM7) currently do this and should be retrofitted in a follow-up to drop their outer `overflow-auto` and rely on the new package-provided one.

### Notes

- **Width is still owned by the consumer's app shell.** rgl v2 measures the page-builder `containerRef` via `ResizeObserver` and feeds the pixel value into `<Responsive width=...>`. Setting `width: 100%` on `.react-grid-layout` does NOT expand the grid — only the parent measurement does. Consumer pages that wrap `<PageGridLayout>` in `<div className="container mx-auto …">` will starve the grid of horizontal space because Tailwind's `.container` caps at the breakpoint width (1280px on `lg`). The fix lives in consumer pages, not this package. CRM7 contacts / communications / analytics / WHS host-employers were corrected alongside this release; the remaining ~65 pages are tracked as a follow-up sweep with a precise removal rule (only strip `container mx-auto` when the wrapper has no `max-w-*` and no `flex` modifier — those signal intentional narrow-form / centered layouts).
- All existing unit tests pass against these changes. The 28-test suite covers per-item `maxW`/`maxH` resize honoring, drag-handle ancestry, and the trailing-rAF coalesced `onLayoutChange` from 0.3.0.
- Minor version bump (0.3.0 → 0.4.0) reflects the behavioral change to global resize bounds. Per-item `maxW`/`maxH` consumers continue to work unchanged. Pages that were silently relying on the 48-row ceiling to clamp resize behavior should set `maxH` explicitly on their `LayoutItem`s instead.

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
