# `@bsuite/workflow-canvas` Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-09-01 — Phase 1: a process canvas that permits loops

First release. Phase 1 of `docs/plans/20260901-workflow-canvas-implementation-v1.00A.md`, which
finishes work scoped, red-teamed and approved in
`docs/plans/20260510-universal-canvas-capability-implementation-v1.00F.md` in May and never built —
only the Sales Pipeline slice of that plan shipped.

### Added

- **A generic node-type registry** (`nodes/registry.ts`). The gap this package exists to fill: the
  estate had no such thing. `SchemaCanvas` is `{ entity: EntityNode }` and `RelationshipCanvas` is
  `{ entity, reference }` — both correct for a schema diagram, both closed. Ships `step`,
  `decision`, `terminator`, `handoff` and `swimlane`; `extend()` returns a new registry so a
  consumer can add a kind without forking.
- **Loop-permissive connection validation** (`validation/connection.ts`). Cycles are accepted;
  self-loops, wrong-end-of-a-terminator, handle-kind mismatches, edges touching a lane container
  and exact duplicates are refused, each with a sentence the UI can show.
- **Swimlanes as xyflow parent nodes**, with `extent: 'parent'` so a step cannot be dragged out of
  the lane that owns it.
- `computeSwimlaneLayout` — dagre for process order, lanes for ownership.
- `useWorkflowController` — the schema-builder controller shape: TanStack optimistic mutations with
  per-item rollback, Realtime cross-tab sync, debounced graph saves, draft/publish versioning.
- `WorkflowCanvas` — `ReactFlowProvider`-wrapped surface, themed through `XY_TOKEN_BINDINGS`.
- `serialiseGraph` / `deserialiseGraph` — Zod-validated round trip over xyflow's native
  `{nodes, edges, viewport}`, the shape stored in `workflow_definition_versions.graph`.
- `useUndoRedo` — the 50-snapshot buffer from `crm7/src/pages/sales/pipeline-flow-inner.tsx`, which
  had shipped in May and never been called (that canvas is `nodesDraggable={false}`).

### Fixed, in the code that was lifted

Both found by writing the first tests `useUndoRedo` has ever had:

- **History was corrupted by React batching.** The original held `past`/`present`/`future` as three
  `useState`s and read `present` from the render closure, so two `set` calls in one tick both
  pushed the same stale value and a step was silently lost. Now one state object behind a single
  functional updater.
- **The drag checkpoint was one frame too late.** Checkpointing at drag END banks the
  second-to-last pointer-move, so undo nudged a node back a pixel instead of returning it to where
  the drag began. The checkpoint is now taken at drag START.

### Dependencies

**None.** `dependencies` is `{}` — an explicit operator constraint ("hopefully it doesnt take up
more space since its already a big app"). `@dagrejs/dagre` is reached through
`@bsuite/schema-builder/auto-layout`, a subpath added in schema-builder 1.9.0 so this import does
not also drag in `html-to-image`. `@xyflow/react`, `zod`, `@tanstack/react-query`,
`@supabase/supabase-js` and `lucide-react` are peers already installed in every consumer.

### Not in this release

Table creation (the `workflow_definitions` migration, authored in parallel — note that the
version the plan reserved, `20261102000000`, was taken on `development` by #2896 on the same
day, and a colliding version is silently skipped), the
apprentice template seed, the crm7 `/workflows/:id` route, the node palette and properties panel
(Phase 2), execution (Phase 3), and the Jodie authoring tools (Phase 4).
