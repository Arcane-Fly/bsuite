# @bsuite/page-builder

Shared BSuite responsive page-builder grid primitives.

Exports:

- `PageGridLayout`
- `usePageGridLayout`
- `rescaleLayout`
- `computeAutoHeightRows`
- `GridLayouts`, `GridLayoutItem`, `WidgetMeta`, and related types

Consumer apps must depend on the published npm package, not `workspace:*` or
`file:` links, because each app deploys independently.

## Measured auto-height (`autoHeight`, 0.5.0+)

Opt a widget into content-driven height by setting `autoHeight: true` on its
`GridLayoutItem`:

```ts
const defaultLayouts: GridLayouts = {
  lg: [
    // Fixed card — user resizes it manually, height persists.
    { i: 'summary', x: 0, y: 0, w: 6, h: 8 },
    // Measured card — height tracks rendered content; `h` is only the
    // initial seed used until the first measurement lands.
    { i: 'details', x: 6, y: 0, w: 6, h: 20, autoHeight: true },
  ],
};
```

Behaviour and guarantees:

- A `ResizeObserver` on an unconstrained measure wrapper reads the content's
  intrinsic height; `computeAutoHeightRows` converts px → rows using the
  same `rowHeight`/`margin` the grid renders with, so the loop converges to
  a fixed point instead of oscillating.
- Auto-height items render with `isResizable: false` automatically — do not
  also wire a manual resize path for them.
- Measured rows are **derived, in-memory-only state**: merged over the saved
  layout at render time for every viewer, and **never persisted**. A
  read-only viewer switching tabs inside a card produces zero preference
  writes. User-driven `x`/`y`/`w` (and `h` for non-autoHeight items)
  persistence is unchanged.
- Updates are rAF-batched (all cards settling in a frame apply as one state
  update) and suppressed mid-drag/mid-resize, then flushed on gesture end.

When adding `autoHeight` to an existing page's layout, bump that page's
`layoutVersion` so stale persisted layouts (without the flag) are reset.

## Edit-mode chrome (2.7.1-next.0+)

`PAGE_GRID_EDITING_EVENT` reports committed changes from `2.7.1-next.1`.
Its `{ pageKey, editing }` payload and event name are unchanged. The matching
canvas DOM is updated before listeners run, including when Save & Exit uses
a React transition. Initial mounting, unchanged state and abandoned transitions
do not emit notifications. Consumers must match the page key and preserve
focus on surviving inputs when synchronizing their header controls.

From `2.7.1-next.5`, a header Save & exit dispatches `PAGE_GRID_SAVE_EVENT`
with `{ pageKey }`. The canvas waits for all preference adapters, keeps its
controls and error visible on failure, and emits the existing committed editing
notification on success. Headers wait for that notification before clearing
edit mode. Existing open/close events remain available for route navigation.

Selected depths expose separate resting, light-interaction and dark-interaction
shadow variables. Light interaction adds neutral elevation; dark interaction
adds the role-bound glow while retaining the selected depth. Explicit zero
stays flat. Consumers must read all three variables; chrome-owning grid items
already do. Default painted grid cards now use neutral elevation 2, with
interaction feedback, matching the D2C card recovery.

While the canvas editor is open, each grid item renders an in-flow strip
(`[data-slot="grid-item-editor-chrome"]`) above the card content: the widget
name and a Hide control. The strip is **not** absolutely positioned over the
card heading. AutoHeight measures it with the content so the grid grows;
leaving edit mode removes it and restores the content-only measurement.
Do not restyle this in a consumer — it is the shared contract.

The label carries `min-w-0 truncate` and a `title` with the full name. That is
load-bearing on a narrow card, not decoration: without it the label's automatic
minimum size is its min-content, and a long unbroken widget name pushes the
`ml-auto` hide button outside the card box. Measured both ways in
`scripts/editor-chrome-geometry.mjs`, which reproduces the defect with the two
classes removed at run time.
