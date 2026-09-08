# Edit action navigates to /settings when the page-editor event is unacknowledged, and there is no add-in-place affordance

https://github.com/GaryOcean428/throughput/issues/291

Snapshot updatedAt: 2026-08-24T03:29:08Z. Open at capture; re-read live.

Found while investigating crm7#1727 (ruling D-77, "edit-in-place on the current page") as part of the portals & surface-class remediation programme, Phase 1. crm7's instance turned out to be **already fixed**; throughput is where the operator's complaint is still literally true.

## The defect

`src/components/platform/PageEditorLauncher.tsx`, `handleEditPage()` (~L57-80):

The handler dispatches `throughput-open-page-editor` with an `ack()` preflight, and when the event goes **unacknowledged** it falls back to:

```ts
navigate('/settings')
```

So pressing "Edit" on a page whose grid did not register a listener does not report that the page is not editable — it **silently navigates the user to a different screen**. That is the operator's platform-wide complaint in its literal form:

> the edit action opens the page builder on a new screen and offers only new-page creation

There is also **no in-place add-element affordance at all** in throughput: no `WidgetPalette` equivalent exists, so even on pages where the editor does activate, a user can rearrange existing widgets but cannot add one.

Compounding it, throughput still uses the pre-fix **floating FAB** pattern (`FAB_PILL_CLASSES` / `FAB_ICON_CLASSES`, ~L40-47), which the 2026-07-23 operator card-surfaces doctrine retired in favour of a header button.

## The reference implementations already exist in this estate

- **BSU** solved the unacknowledged-event case correctly: a three-checkpoint ack probe (`bsu-probe-page-editor`, `PageEditorLauncher.tsx:104-174`) that shows an explicit *"editing is not available on this page"* toast **instead of navigating somewhere else**. That is the fix for bsuite#545 and it is the pattern to copy here.
- **crm7** solved add-in-place: header Pencil/Plus toggle → `WidgetPalette` **Sheet overlay** → dispatch `crm7-add-entity-widget`; the commit that fixed it (`5a4a9ddc`) says explicitly *"This keeps the add in-page — no navigation, no router.push."*

## Suggested fix

1. Replace the `navigate('/settings')` fallback with BSU's ack-probe + toast. Navigating away on a failed precondition is never the right failure mode: it takes the user somewhere they did not ask to go and hides the fact that the page is not editable.
2. Port crm7's palette-overlay + event-dispatch pattern for add-in-place.
3. Retire the two floating FABs for a header button, matching crm7 and BSU.

Steps 1 and 3 are throughput-local. **Step 2 should not be a fourth independent reimplementation** — four apps have now each built their own launcher and they have diverged badly (crm7 correct, BSU half-built with dead code, throughput redirecting, braden a separate screen). `@bsuite/page-builder` already ships a `PageEditorLauncher` that nobody uses. Converging on one implementation is the class fix; see bsuite#2005, which promotes the card primitives into the package for the same reason.

## Class sweep

- **Class:** an "edit this page" affordance that leaves the page, or that offers no way to add an element in place.
- **Surfaces enumerated:** 5 apps — crm7 **correct**, BSU **half-fixed** (palette exists, never mounted; plumbing already wired, so it is a UI-only gap), **throughput this issue**, conduit **not built at this surface**, braden **separate-screen `/admin/page-builder`, not yet wired to any dashboard edit action** (structurally the same anti-pattern the moment it is).
- **Not-applicable:** none — every app has or will have a page canvas.

