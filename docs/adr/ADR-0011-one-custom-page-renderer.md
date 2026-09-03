---
kind: decision
authority: proposed
owner: bsuite
evidence:
  - crm7/src/components/CustomPageRenderer.tsx
  - business-suite-unified/src/components/CustomPageRenderer.tsx
  - braden/src/components/CustomPageRenderer.tsx
  - conduit/src/components/custom-page-renderer/CustomPageRenderer.tsx
  - packages/page-builder/src/CustomPageView.tsx
  - docs/adr/ADR-0003-consumer-renderer-pattern.md
---

# ADR-0011 — One custom-page renderer, with a per-app widget catalogue

**Status:** Proposed (2026-09-03)
**Supersedes:** ADR-0003 (Consumer-Renderer Pattern)
**Related:** ADR-0001 (Page-Builder Ownership); `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`

---

## Context

ADR-0003 decided, on 2026-05-01, that each consumer app ships its own `CustomPageRenderer` and
that there is **no shared package** for custom-page rendering. It gave six reasons. This ADR does
not dispute that the reasoning was sound at the time; it records what the decision produced when
measured sixteen weeks later, and replaces it on that evidence.

**Measured 2026-09-03 across all six app trees, excluding `dist/` and `coverage/` build artefacts:**

| app | renderer | lines | what it actually paints |
|---|---|---|---|
| crm7 | `src/components/CustomPageRenderer.tsx` | 211 | **real interactive content** — resolves `entity_type` field definitions and feeds `layout.sections`/`.tabs` into `FormLayoutRenderer` |
| conduit | `src/components/custom-page-renderer/CustomPageRenderer.tsx` | 310 | the shared `@bsuite/page-builder` grid with a working edit toggle, but every cell renders a literal `"Widget placeholder"` div; saves reach `localStorage` only |
| braden | `src/components/CustomPageRenderer.tsx` | 129 | `JSON.stringify(page.layout, null, 2)` inside a `<pre>` |
| business-suite-unified | `src/components/CustomPageRenderer.tsx` | 138 | `JSON.stringify(page.layout, null, 2)` inside a `<pre>` |

**Two of the four renderers print raw JSON at users on live, routed screens** — braden at
`pages/Contact.tsx`, BSU at `/p/:slug` (registered `AppContent.tsx:348`). This is not a case of an
app not having got to it: it is the same capability implemented four times and finished once.

## The decision

**One renderer, published in the package every consumer already depends on
(`@bsuite/page-builder`), taking a per-app widget catalogue as an injected prop.**

- The **core** — loading / missing / error states, the `silent` versus `message` miss contract, the
  page header, and a readable default rendering — is app-agnostic and lives in the package. It is
  cored on crm7's implementation, which is the only one of the four that draws real content.
- **Fetching stays in each app, deliberately.** An earlier draft of this ADR put fetch and Supabase
  Realtime invalidation in the package too. Building it showed that to be the wrong cut: all four
  apps already fetch `custom_pages` correctly with their own client and their own cache. It is the
  RENDERING that diverged, and it is the rendering that puts `JSON.stringify` in front of a user.
  Moving the fetch would have forced a Supabase peer dependency and a TanStack Query peer
  dependency onto a layout package to solve a problem neither of them causes.
- The **widget catalogue** is passed in by each app. This is ADR-0003's one genuinely durable
  point — *"each consumer app has different widget catalogues, different routing conventions,
  different styling primitives"* — and it is preserved as an extension point rather than paid for
  four times.

## Why ADR-0003's reasoning no longer holds

| ADR-0003's reason | status in 2026-09 |
|---|---|
| 1. "User explicitly chose this path" in a Phase 0 clarification | **Superseded by a later operator ruling**, 2026-09-03: *"we should end up with consolidated best in class features not half duplicates of the same intended capability."* The newer instruction governs. |
| 2. Apps have different widget catalogues | **Still true, and preserved** — it becomes the injected prop, which is why this is a seam and not a monolith. |
| 3. "Adding another package increases release friction" | **No longer applies.** No new package is proposed. `@bsuite/page-builder` already exists at 2.6.0 and **all five consumer apps already depend on it** (`^2.5.0` in each `package.json`). The release cost ADR-0003 wanted to avoid has already been paid. |
| 4. "Supabase is the shared integration boundary; the schema is the API contract" | **Correct, and it is exactly what failed.** A shared schema guarantees every app can *read* the layout. It guarantees nothing about whether an app *renders* it, and two apps chose `JSON.stringify`. A contract that cannot be violated by printing raw JSON at a user is not constraining the thing that matters. |
| 5. "Per-app components evolve at per-app pace" | **What happened instead was divergence, not evolution.** Sixteen weeks produced one good renderer, one placeholder shell, and two JSON dumps. |
| 6. "User preference confirms the technical read" | Same as (1). |

## Consequences

- The two JSON-dump renderers are **deleted**, not maintained in parallel.
- conduit keeps its grid and edit-mode wiring, which is the best plumbing of the four; it gains
  real widgets instead of `"Widget placeholder"`.
- `@bsuite/page-builder` gains a `CustomPageView` export and **no new peer dependencies**. Consumers
  adopt it on their own schedule, so ADR-0003's release-friction concern is bounded even though it
  no longer applies. Because the fetch stays in the app, adoption is a render swap rather than a
  data-layer migration — which is what makes step 2 small enough to be safe.
- `TenantLayoutSlot` in `@bsuite/schema-registry` — a no-op shim three major versions past its own
  promised deletion — is removed in the same sweep.

## Atomic replace-and-remove plan

1. **DONE.** `CustomPageView` lands in `@bsuite/page-builder`, taking the already-fetched page and a
   `renderLayout` widget-catalogue prop, with a readable structural default for an app that has no
   catalogue yet. Folded into the unpublished 2.6.0 rather than bumped, because npm's latest is
   2.5.0 and a bump would leave a version that never existed on the registry.
2. **business-suite-unified and braden adopt it and their local renderers are deleted from disk in
   the same pull request.** Not deprecated, not left beside it — deleted. This is the step that
   ends the raw-JSON screens.
3. conduit adopts it, passing its widget catalogue, and its `"Widget placeholder"` div goes.
4. crm7 adopts it last, since its local copy is the source of the core and removing it is a pure
   de-duplication with no behavioural change to verify.
5. `TenantLayoutSlot` deleted from `@bsuite/schema-registry`.

**No step deletes a renderer before its replacement is in the tree.** The estate's own history is
that a surface removed ahead of its successor leaves a dead route, and a dead route is unbuilt work
nobody can find again.

## What this ADR does not decide

It does not decide who may *author* a page — ADR-0001 already made crm7 `custom_pages` the single
canonical authoring surface, and this ADR leaves that untouched. It governs **rendering only**.
