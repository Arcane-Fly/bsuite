# xyflow dark-token CSS bindings (XY_TOKEN_BINDINGS) duplicated across schema-builder, crm7 and BSU — export from @bsuite/schema-builder

https://github.com/GaryOcean428/bsuite/issues/2550

Snapshot updatedAt: 2026-08-31T02:49:36Z. Open at capture; re-read live.

## The duplication

`@xyflow/react` v12 guards its entire dark palette behind `.react-flow.dark`, a
class the library only adds when a `colorMode` prop is passed. Apps that put
`dark` on `<html>` via their own theme system (every BSuite app) but never
pass `colorMode` get every dark-mode xyflow default (minimap background,
Controls button background, etc.) stuck at the LIGHT value even in a dark
app — a pure-white minimap, near-invisible Controls icons.

The fix is a small `XY_TOKEN_BINDINGS` object that binds the library's
`-props` CSS custom properties to `@bsuite/theme` role tokens
(`var(--role-bg-panel)`, …), applied via `style={XY_TOKEN_BINDINGS}` on
`<ReactFlow>`. This object now exists **three times**, independently
authored, in three different repos:

1. **Canonical / most complete** — `packages/schema-builder/src/components/SchemaCanvas.tsx`
   (`business-suite-unified` monorepo's shared package), paired with
   `colorMode` via `useDocumentColorMode()`. 11 bindings (5 minimap + 6
   controls, including the one non-`-props` `--xy-controls-button-
   background-color` variable the base Controls rule doesn't chain).
2. `crm7/src/pages/sales/pipeline-flow-inner.tsx` — same 11 bindings, no
   `colorMode` (crm7#2086, commits `998232f7e` and `dd66a0a4f`).
3. `business-suite-unified/src/lib/xyflowThemeTokens.ts` — added by this PR
   to fix `SchemaVisualizer.tsx` and `RelationshipCanvas.tsx` (BSU's own two
   xyflow instances), again the same 11 bindings, with a comment pointing
   back at copy #1 as canonical.

Three independent copies of one CSS-custom-property map is exactly what this
estate's DRY doctrine (`general-dry-one-shot-architecture`) exists to
prevent. A future `@xyflow/react` bump that changes one of these variable
names (or adds a new dark-guarded surface) has to be caught and fixed in
three places by three different people who each have to rediscover the same
"read the installed stylesheet" investigation.

## Proposed fix

Export `XY_TOKEN_BINDINGS` (and ideally `useDocumentColorMode`, which has the
same three-copy problem in miniature — crm7 and BSU each read
`document.documentElement`'s class/`data-theme` themselves rather than
sharing one hook) from `@bsuite/schema-builder`'s public entry point
(`./hooks` and a new small export, or a dedicated `./xyflow-theme`
subpath so consumers that don't need the rest of schema-builder aren't
forced to pull it in). Once published, collapse all three copies down to one
import in each of:

- `packages/schema-builder/src/components/SchemaCanvas.tsx`
- `crm7/src/pages/sales/pipeline-flow-inner.tsx`
- `business-suite-unified/src/lib/xyflowThemeTokens.ts` (delete the file,
  import from the package instead)

## Guard test to carry over

`packages/schema-builder/src/__tests__/SchemaCanvas.sizing.test.tsx` already
asserts `XY_TOKEN_BINDINGS` never declares a sizing key
(width/height/overflow/position/zIndex) that `@xyflow/react` would silently
discard. That test should move with the export so it protects the shared
copy directly instead of one repo's local duplicate.

## Cross-references

- crm7#2086 (findings 2 + 3) — the live minimap/Controls-contrast defect,
  fixed in crm7's own file.
- BSU PR (this issue is linked from): fixes BSU's two xyflow instances
  (`SchemaVisualizer.tsx`, `RelationshipCanvas.tsx`) using a third local
  copy, per the DRY-debt note in that PR's description.
