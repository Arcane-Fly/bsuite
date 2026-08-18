# ADR-0003 — Consumer-Renderer Pattern

**Status:** Accepted (2026-05-01)
**Related:** ADR-0001 (Page-Builder Ownership); `docs/20260227-dry-one-shot-architecture-v1.04A.md` §3 Tier-1

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

---

## Context

With ADR-0001 making CRM7 `custom_pages` the canonical authoring surface, every other app (BSU, conduit, R80.3, braden, throughput) needs to render tenant-authored layouts. Two deployment patterns are possible:

- **Option A — shared npm package** (e.g. `@bsuite/custom-pages-renderer`) that every consumer app imports.
- **Option B — per-app consumer components** that each app implements locally, reading directly from Supabase.

## Decision

**Option B — per-app consumer components. No shared npm package for custom-page rendering.**

## Rationale

1. **User explicitly chose this path** during Phase 0 clarification round ("Consumer-only components inside each app — no shared package").
2. **Each consumer app has different widget catalogues, different routing conventions, different styling primitives.** A shared package would need a complex configuration surface to accommodate all five apps, negating the benefit.
3. **Cross-submodule npm coordination is painful.** The existing `@bsuite/charge-calc` + `@bsuite/nav-core` + `@bsuite/auth` + `@bsuite/theme` chain already forces `pnpm install` cascades on every release. Adding another package for a single responsibility increases release friction.
4. **Supabase is the shared integration boundary.** Both the authoring app (CRM7) and every consumer read the same tables with the same RLS. The schema is the API contract; package code is not.
5. **Per-app components can evolve at per-app pace.** A breaking consumer-renderer feature doesn't block five other apps on a coordinated release.
6. **User preference confirms the technical read.** The user explicitly chose Option B during Phase 0 clarification round 1 — a confirming tiebreaker, not the primary justification.

### Option A (shared package) — rejected

Option A (`@bsuite/custom-pages-renderer` npm package) was considered and rejected for the reasons above. The shared-package pattern is already stressed by `@bsuite/charge-calc`, `@bsuite/nav-core`, `@bsuite/auth`, and `@bsuite/theme` — every release forces a `pnpm install` cascade across consumers. Adding a renderer package for a single-responsibility surface would multiply this friction without commensurate code-reuse benefit, because each app's widget catalogue and routing conventions diverge.

### Rollback procedure

If an atomic per-app consumer-renderer PR fails partway (e.g. the renderer component merges but the route wiring breaks), the single-commit revert removes the component + the route addition together. Because no old renderer code was replaced, there is no "restore the old behaviour" step — the app returns to its pre-ADR state (static hand-written pages).

## Consequences

### Atomic removal scope

**Net-new pattern. No pre-existing shared renderer code exists for removal under this ADR.**

At the time of this ADR's ratification (2026-05-01), no `@bsuite/custom-pages-renderer` package, no shared `CustomPageRenderer` source, and no cross-app renderer helper exists in the monorepo. Every consumer app currently renders its own pages via hand-written JSX, untouched by this ADR. The atomic-replace-and-remove governance therefore applies only to the per-app additions below — there is no old surface to atomically delete.

One narrow exception: the BSU `Pages.tsx` developer UI that currently writes `tenant_page_layouts` is removed atomically per ADR-0001, not by this ADR. The two ADRs execute in the same Phase 2 PR set but track separately.

### Atomic replace-and-remove

1. **Each consumer app ships its own `CustomPageRenderer` component** at whatever path fits its conventions (e.g. `business-suite-unified/src/components/CustomPageRenderer.tsx`, `conduit/src/components/custom-page-renderer/`, etc.).
2. **The existing `@bsuite/schema-registry.TenantLayoutSlot`** (which rendered `tenant_page_layouts`) is deleted outright — see ADR-0001 consequence #4. Package bumped with breaking-change note.
3. **Per-app renderers share a mental pattern but not code:**
   - Query `custom_pages` + `custom_page_blocks` via each app's Supabase client
   - Render a whitelisted widget catalogue (each app's catalogue may differ; minimum common set documented in §3 Tier-1 of DRY spec)
   - Subscribe to realtime updates on `custom_pages` for live preview
   - Respect `is_developer_only` flag (hide for non-platform-admin users)
4. **No cross-app mock or abstraction layer** — each renderer is its own self-contained implementation. Tests are per-app.
5. **Documentation:** `docs/20260227-dry-one-shot-architecture-v1.04A.md` §3 Tier-1 updated to document the canonical renderer pattern (Supabase query shape + widget catalogue contract) without prescribing shared code.

### When we'd revisit this decision

If three or more consumer apps converge on identical renderer code after implementation, revisit whether extraction to a shared package is now low-risk. Do not extract prematurely.

### Atomic removal disallows

- Creating `@bsuite/custom-pages-renderer` package as a "just in case" abstraction.
- Shipping one app with a shared component and another with a per-app component "for now".
- `@deprecated` on `TenantLayoutSlot` — it gets deleted in the same PR as the BSU page-builder removal (ADR-0001).

## Compliance Gate

Ratified on user sign-off. Execution begins in Phase 2 (first consumer-renderer ships alongside ADR-0001 execution; remaining four apps ship their renderers in Phase 4 per the WS-E workstream).
