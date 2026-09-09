# Schema Builder canvas is held up by its 420px emergency floor, not the layout — <main> breaks the flex cascade for all 43 routes

https://github.com/GaryOcean428/business-suite-unified/issues/1193

Snapshot updatedAt: 2026-09-07T11:36:13Z. Open at capture; re-read live.

## What was asked, and what is actually true now

Operator note **D-6** records the Schema Builder canvas as rendering at **zero height** in
production, citing `cd9c901e` (2026-08-26): *".react-flow 1136x0, 44 nodes in the DOM, 16
inside the window, toolbar reporting 44 entities, canvas blank."*

**That claim is no longer true, and I measured it rather than inferring it.** On production
`suite.crm7.app` at commit `56a95ca` (built 2026-09-07T11:03:07Z — identical to
`business-suite-unified` `main` tip and to the parent's gitlink on `main`), signed in as
`braden@braden.com.au` (`platform_role=developer`, `is_super_admin=t`), viewport 1440x900:

```
.react-flow          1136 x 420      <- NOT 1136x0. Zero-height defect is FIXED.
nodes in DOM         44
nodes inside window  3
empty state          false
toolbar              "44 entities"
```

The `cd9c901e9` fix is present and correct in `@bsuite/schema-builder@1.9.1` (published
2026-09-03, which all three consumers resolve to): a `relative h-full min-h-[420px] flex-1`
wrapper with `absolute inset-0` on a div we own, so React Flow's `height:100%` resolves
against a definite box instead of the `style` prop the library overwrites.

**So D-6's literal symptom is closed.** What follows is the residual, which is a different
defect with the same root.

## The residual: the canvas is held up by its emergency floor, not by the layout

The full height chain, root to canvas, measured on the same page load:

```
  900px  block   <html>
  900px  flex    <div class="relative isolate flex h-svh w-full …">
  900px  flex    <div class="relative z-10 flex min-w-0 flex-1 flex-col">
  835px  block   <div class="min-h-0 flex-1 overflow-auto">      <- scroll container, definite
  549px  block   <main class="px-4 pb-6 pt-4 md:px-6">           <- ***THE BREAK***
  509px  flex    <div class="flex flex-1 min-h-0 flex-col">         (page root)
  420px  block   <div class="min-h-0 flex-1">
  420px  block   <div class="relative h-full w-full">
  420px  flex    <div class="flex h-full w-full">
  420px  block   <div class="relative h-full min-h-[420px] flex-1">  <- the FLOOR
  420px  block   <div class="absolute inset-0">
  420px  block   <div class="react-flow light">
```

Read it bottom-up and the mechanism is unambiguous: **every height in that subtree is 420px
because the `min-h-[420px]` floor supplies it.** Nothing above hands down a definite height.
`<main>` is `display:block` with no height and no flex, sitting inside an 835px `overflow-auto`
container, so the page root's `flex-1` has nothing to stretch against and `main`'s own 549px is
derived bottom-up from the floor (420 canvas + 89 page header + 40 padding).

**The page's own comment asserts the opposite, and is false as deployed.**
`src/pages/Settings/SchemaBuilder.tsx:61-63`:

> `// INVARIANT 2: parent shell (AppContent layout) provides h-svh + flex-col;`
> `// this page fills the remainder via flex-1 + min-h-0.`

The shell does provide `h-svh + flex-col` — but two levels above `<main>`, and `<main>` breaks
the chain. The page does not fill the remainder. The floor is the only reason it is not zero.

## What the user sees

Screenshot attached. The canvas occupies 420px of the ~835px available: entity cards are
**clipped at the canvas bottom edge** mid-field-list, and roughly **300px of empty page** sits
below the canvas. **3 of 44 entities are inside the window** — worse than the 16 of 44 recorded
when the canvas was zero-height, because the opening-fit zoom floor now renders cards larger
inside a letterboxed box.

This is the surface the operator screenshotted and called an unfinished job. It is no longer
blank, but it is still not usable at 44 entities.

## Sibling surfaces — method stated, because the count decides the fix

- **1** page uses the exact fill idiom (`flex flex-1 min-h-0 flex-col` at page root):
  `src/pages/Settings/SchemaBuilder.tsx`. Method: `grep -rln` for both class orderings across
  `src/pages` and `src/components`.
- **43** routes share the single `<main class="px-4 pb-6 pt-4 md:px-6">` at
  `src/components/AppContent.tsx:265`. Method: `grep -c '<Route path=' AppContent.tsx`.
- **10** pages use `h-full` at a page root with **no** `min-h-[…]` floor, and are the latent
  class — they currently resolve to content height rather than collapsing, so they do not bite
  today, but they are sized by the same broken cascade:
  `Docs.tsx`, `Documents.tsx`, `Developer/Routing.tsx`, `GTO.tsx`, `Admin/UserManagement.tsx`,
  `Admin/SystemOverview.tsx`, `Admin/AuditLog.tsx`, `Onboarding/index.tsx`, `Analytics.tsx`,
  `settings/locale.tsx`.

**This is why the fix is not a one-line change to the Schema Builder page.** The break is in
the shared shell, so the correct fix (`<main>` participates in the flex cascade — e.g.
`flex min-h-full flex-col`) changes the box model for all 43 routes, and would stretch any
page root carrying `flex-1` or `h-full`. That blast radius must be measured, not assumed:
**those 10 pages plus a representative sample of the remaining routes need a
theme x breakpoint visual pass before such a change ships.**

A page-local workaround (a `calc()` viewport height on the Schema Builder page alone) would
close this one surface without touching the other 42, at the cost of a magic number that
re-breaks whenever the header or banner stack changes height. I do not recommend it, but it is
the cheap option if the shell change is judged too broad for this run.

## Note on ownership before anyone starts

#303 (ADR-0002) and #675 both propose the Schema Builder move to the CRM7 Developer Portal /
be rebuilt. If that relocation is going ahead, the **shell** fix is still worth doing on its
own merits (it is 43 routes, not this page), but the page-local workaround would be wasted
work. Worth settling which before this is picked up.

## Acceptance criteria

1. `.react-flow` height on `suite.crm7.app/settings/schema-builder` at 1440x900 is
   **> 700px**, not 420px, and tracks the viewport when it is resized.
2. No entity card is clipped by the canvas bottom edge; no dead band below the canvas.
3. A **planted control**: temporarily remove `min-h-[420px]` from the package wrapper and
   confirm the canvas still has a real height. If it collapses, the cascade was not fixed —
   the floor was just raised, and the same defect returns the next time a consumer nests it
   in `height:auto` chrome.
4. The false `INVARIANT 2` comment at `SchemaBuilder.tsx:61-63` is corrected to describe what
   the shell actually does.
5. Visual pass over the 10 latent pages above at light+dark x 1440/1024/768/390, evidencing
   that making `<main>` a flex column changed nothing on them.

## Evidence

- Production commit `56a95ca` = BSU `main` tip `56a95cabf467ea6d86003e0f1cd6421ec12d6927`
  = parent gitlink on `main`. All three agree, so this is the deployed code.
- Signed in as `braden@braden.com.au` (address recorded; password never printed or persisted,
  no `storageState` written to disk).
- Measurements taken via local Playwright against production, read-only; no DDL, no writes.

