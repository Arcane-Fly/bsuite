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
