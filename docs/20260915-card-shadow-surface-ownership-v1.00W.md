---
kind: record
authority: none
owner: bsuite
evidence:
  - packages/page-builder/src/__tests__/PageGridLayout.chrome.test.tsx
  - packages/page-builder/src/__tests__/PageGridLayout.save.test.tsx
  - .github/workflows/publish-page-builder.yml
---

# Card shadow surface ownership

A saved elevation applied an inline box-shadow to every PageGridLayout surface, including layout-only headers and wrappers around a consumer-owned Card. Once the runtime token is present, that paints a second shadow outside the card. The shared grid now paints its override only when it owns chrome. Layout-only wrappers still pass `--card-shadow` to their contained card.

The real mounted-grid regression fails for chrome-off before and passes after. The chrome-on control prevents disabling all shadows. All 317 package tests (26 files), build and typecheck pass. Existing committed-editor-event changes from PR3271 remain the base; they are not independently re-approved here.

Development canary 2.7.1-next.2. Deploy only with a consumer that reads the inherited shadow token and with theme runtime depths available (theme PR3272). BSU Card already reads it; CRM/Conduit and the other consumers need their own verified adoption. Padding behavior is unchanged and its lost-save defect remains open. No package merge, production release or complete D8 approval is claimed.

The mounted regression is `packages/page-builder/src/__tests__/PageGridLayout.chrome.test.tsx`. Publication evidence: `.github/workflows/publish-page-builder.yml`, run [34923548527](https://github.com/GaryOcean428/bsuite/actions/runs/34923548527), published 2.7.1-next.2 from commit `a4d16f896d1d01c227b9baa341ef462b9eea3221`. Registry integrity and the compiled PageGridLayout bytes match the signed build. These receipts do not approve the dependent consumer journeys.

## Save acknowledgement

Save & Exit previously closed the editor while remote preference writes could still be pending. Canary 2.7.1-next.3 adds an optional `flush(): Promise<void>` to the existing preference adapter. The control waits for all seven groups: layout version, layout, columns, base columns, layer names, hidden layers and card appearance. While waiting it shows Saving; a failure keeps the editor and draft visible with a retry instruction. A completion from an earlier page or editing session cannot close a later one. Appearance field updates now compose functionally.

Ten mounted-component tests cover each group, failure/retry, page change and batched field edits. The initial implementation fails eight of the first nine cases; the correction passes all ten, and the complete package suite passes 327 tests in 27 files. Build and typecheck pass. BSU's real controls and persistence hook also pass two HTTP browser journeys against this local compiled package: acknowledged save then reload, and failed save, reload with the retained draft, retry and reload. That is integration-fixture evidence, not live account or RLS acceptance.

Synchronous adapters remain compatible. Remote consumer adapters must implement `flush`; omission does not turn a background save into an acknowledged save. BSU adoption, other app adapters, deployed UX, selected-tenant/page/platform inheritance and production remain separate open criteria. This branch includes the unmerged 3271 and 3273 changes and requires independent review.

Publication evidence for 2.7.1-next.3: `.github/workflows/publish-page-builder.yml`, run [34926853976](https://github.com/GaryOcean428/bsuite/actions/runs/34926853976), signed source `85f7505b27e1eb36a67c9b915d15c062a94e6456`. npm initially returned 404 while processing the version, then served its metadata and tarball. The tarball integrity and the compiled PageGridLayout, usePageGridLayout and type declaration bytes match the signed build. Stable `latest` remains 2.7.0.

## Card inset and measured height

Canary 2.7.1-next.4 keeps an explicit padding choice on the painted surface. A chrome-owning grid item applies it directly; a layout-only wrapper exposes `data-card-padding` and the existing `--card-padding` value for consumer Cards. A consumer must scope padding to the first painted Card, stopping at inner Cards and nested grids; a broad descendant selector also restyles internal panels and is invalid. BSU and Conduit use a bounded CSS `@scope`. This pairing must ship together; the marker alone does not update a consumer's Card.

BSU's paired Card also reads the border width, style and role-bound colour variables. Its compiled browser contract checks a 3px dashed primary border, an 8px inset, explicit zero, reset, unchanged ordinary-card padding, four distinct depths and interaction elevation in both modes. The preceding shared wrapper fails both inset cases; reverting the BSU consumer separately also fails both. Initial local SSR replay resolved a second React through react-grid-layout; the fixture now deduplicates those hook-owning peers to the consumer's installed versions.

Changing padding also exposed a height defect: auto-height reserved a fixed two pixels outside the measured content, regardless of the chrome's actual padding and border. It now reads the painted surface's computed vertical padding and borders, and remeasures when appearance changes. A real two-card browser journey selects 48px padding and 8px borders, checks containment and separation, saves and reloads. It fails before the measurement correction and passes after. Together, eleven BSU browser cases pass against the local compiled package. A mounted package test independently checks the added inset reservation. All 330 package tests in 27 files, build and typecheck pass. These fixtures do not replace authenticated development verification or all-app acceptance.

The CSS approach follows [Tailwind padding](https://tailwindcss.com/docs/padding), [border width](https://tailwindcss.com/docs/border-width), and the [CSS custom-property cascade](https://www.w3.org/TR/css-variables-1/#using-variables), checked against installed Tailwind 4.3.3. Context7 returned its monthly quota limit. Applying padding unconditionally to all consumer Cards was rejected because BSU already defines a global 24px token; it would silently restyle ordinary cards.


## Header save and interaction feedback follow-up

Canary 2.7.1-next.5 adds `PAGE_GRID_SAVE_EVENT` with a required page key. It reaches the same seven-group save operation as the canvas button. A synchronous in-flight guard coalesces repeated clicks; rejection retains the canvas, and success sends the existing committed editing notification. Legacy route-close events remain separate so navigating to another record cannot save or close the wrong canvas. BSU and Conduit headers must adopt this request and wait for confirmation before changing their own state.

Saved depth previously overrode every interaction fallback. The style mapper now emits separate light and dark interaction variables: the selected neutral depth plus elevation 1 in light, or the selected depth plus the role-bound glow in dark. Explicit zero remains flat. The chrome-owning grid uses these classes directly instead of an inline box-shadow, and defaults to neutral elevation 2. Layout-only wrappers remain unpainted. This is an intentional default-elevation correction under the operator's September 15 clarification.

All 333 package tests in 27 files pass. A new targeted-save test fails before the event is wired; it also covers duplicate requests, failure/retry and a still-open sibling. A permission test preserves the implicit editable default and rejects a save after permission is withdrawn. Consumer browser, publication and independent review are still pending. Current research used [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) and [Tailwind state variants](https://tailwindcss.com/docs/hover-focus-and-other-states); Context7's preserved monthly quota blocker remains unchanged.

## Padding ownership across supported browsers

BSU's refreshed PR1251 review identified that its `@scope` inset rule is unsupported by part of the stated Safari/Firefox baseline. Conduit used the same rule. Canary next.6 supplies a React padding context from each grid item instead. The first app Card reads the inset and establishes a boundary for its children. Nested grids supply their own value, including an unset value; chrome-owning grids retain their own inset without passing it to inner panels. The narrow `card-padding` entry point is client-compatible and adds no DOM wrapper or storage change.

Three mounted-grid tests cover wrapper traversal, nested Cards, independently configured and unset nested grids, chrome ownership, explicit zero and reset on the same mounted node. Removing the grid's provider makes two fail while the chrome control still passes. The complete suite passes 336 tests in 28 files. Consumer adoption, compiled-browser tests and publication remain in progress; the earlier next.5 consumer CI and screenshots remain evidence of that exact source only. This change does not approve full customization inheritance or deployed D8.
