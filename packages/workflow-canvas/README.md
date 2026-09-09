# `@bsuite/workflow-canvas`

A process-shaped xyflow canvas: `step` / `decision` / `terminator` / `handoff` nodes, swimlanes as
real xyflow parent nodes, **loop-permissive** connection validation, and a controller + service that
persist xyflow's native `{nodes, edges, viewport}` into `workflow_definition_versions.graph`.

Phase 1 of `docs/plans/20260901-workflow-canvas-implementation-v1.00A.md`, which finishes work
scoped and red-teamed in `docs/plans/20260510-universal-canvas-capability-implementation-v1.00F.md`
back in May.

---

## What this is NOT a rebuild of

| Thing | Where | What was taken |
|---|---|---|
| `@bsuite/schema-builder` v1.9.0 | `packages/schema-builder/` | **The architecture.** Controller hook + RPC-backed service + TanStack optimistic mutations with rollback + Realtime cross-tab sync + a thin per-app wrapper. Also `computeDagreLayout` and `XY_TOKEN_BINDINGS`, **imported, not copied**. |
| `RelationshipCanvas` | `business-suite-unified/src/components/feature-builder/` | The `ReactFlowProvider` wrapper only. |
| `useUndoRedo` | `crm7/src/pages/sales/pipeline-flow-inner.tsx` | The 50-snapshot hook, lifted and corrected. |

**Zero new runtime dependencies.** `package.json`'s `dependencies` is `{}`. `@dagrejs/dagre`,
`@xyflow/react`, `zod` and `@tanstack/react-query` are all already in every consumer's bundle.

---

## The rule that matters most: LOOPS ARE PERMITTED

`RelationshipCanvas` runs a cycle-detecting DFS and **refuses** cycles. That is right for foreign
keys and wrong here. The apprentice placement process requires loops, and the Lucidchart source
names two:

- *"Change rates or placement and resend for e-signing"* → back to *"Send placement for
  CRM-triggered e-signing"*
- *"Cancel placement and seek a new host"* → back to *"Create or confirm host placement"*

`wouldCreateCycle` is never called from this package. `__tests__/connectionValidation.test.ts`
asserts a cycle **is accepted** — a suite that only proved rejection would be the bug.

### What is still refused

| # | Refusal | Why it is not a loop question |
|---|---|---|
| R1 | No source or no target | Nothing to attach |
| R2 | **Self-loop** (`source === target`) | A step looping into itself changes no state between iterations. A **two**-node cycle `A → B → A` is accepted — both apprentice loops are that shape |
| R3 | Wrong end of a terminator | A `start` declares only a source handle, an `end` only a target, so there is no port to grab. Enforced through the registry's handle set, not as a special case |
| R4 | Handle-kind or handle-role mismatch | One kind (`flow`) exists today; the axis is named now so a later data edge is refused by this same code |
| R5 | An edge touching a swimlane | A lane groups steps; edges attach to the work inside it |
| R6 | Exact duplicate edge | A second copy renders on top of the first, so the drag looks inert while the graph grows |

Explicitly **not** refused: cycles of any length ≥ 2, several edges leaving one decision (the
apprentice process branches four ways out of *Host accepted placement?*), several edges arriving at
one step, and edges crossing swimlanes — that last one is what a handoff *is*.

---

## The node-type registry

There is no generic `nodeTypes` registry anywhere else in the estate: `SchemaCanvas` is
`{ entity: EntityNode }` and `RelationshipCanvas` is `{ entity, reference }`. Both are right for a
schema diagram and closed. This one is open.

```ts
import { workflowNodeTypeRegistry } from '@bsuite/workflow-canvas';

// Add a kind without forking the package. Returns a NEW registry.
const registry = workflowNodeTypeRegistry.extend([myDelayDescriptor]);
```

A descriptor answers four questions in one place so they cannot drift: what it looks like
(`component`), what it can connect to (`handles(data)`, read by both the card and
`isValidConnection`), what it means (`dataSchema`, enforced on save), and how it behaves
(`container`, `defaultSize`, `defaultData`).

Handles follow the node's **data**, not just its kind — a decision's ports track its branch list, a
terminator's track its start/end role.

---

## Swimlanes

Lanes are xyflow **parent nodes** with `extent: 'parent'` on their members, not background bands.
The difference is that xyflow then enforces the lane during the drag itself, so the graph cannot
express a step that has drifted out of the lane that owns it. `parentId` and `extent` are native
xyflow fields, so they round-trip through `graph jsonb` for free.

`computeSwimlaneLayout` asks dagre for the **x axis only** — process order — and takes y from the
node's lane, because ownership is not something a layout algorithm gets a vote on.

The six apprentice lanes: Apprentice · GTO / Labour Hire Team · Apprentice Connect Provider · DEWR
and State Training Authority · Training Provider · Host Employer.

---

## Usage

```tsx
import {
  WorkflowCanvas,
  WorkflowInspector,
  WorkflowPalette,
  WorkflowToolbar,
  useWorkflowController,
} from '@bsuite/workflow-canvas';

function WorkflowPage({ id }: { id: string }) {
  const controller = useWorkflowController({
    supabase,
    tenantId,
    definitionId: id,
    onError: (message, err) => toast.error(message, err),
    onConnectionRefused: (v) => toast.info(v.reason),
  });

  return (
    <WorkflowCanvas controller={controller}>
      <WorkflowPalette controller={controller} activeLaneId={activeLane} />
      <WorkflowToolbar controller={controller} onDuplicated={(id) => navigate(`/workflows/${id}`)} />
      <WorkflowInspector
        controller={controller}
        selectedNodeId={selected}
        onNodeDeleted={() => setSelected(null)}
      />
    </WorkflowCanvas>
  );
}
```

The three chrome components are children of the canvas. The canvas sorts them into reserved
regions (toolbar / palette / diagram / inspector) so they do not paint over the flow pane —
Fit View and edge clicks see the remaining box. Each chrome component still renders nothing
when it has nothing to do — no selection, or a workflow the session cannot edit — so a consumer
never has to gate them itself. Do not pass placement-only `className`s; surface classes are
always applied and extras compose rather than replace. Below ~800px of *canvas* width the
palette becomes a chip row; the inspector column is reserved when a step is selected.

Lazy-load the route. `@xyflow/react` must never reach the entry chunk — Phase C.2 of the May plan
made that a hard rule with a bundle-analyser proof.

### Editing, drafts and publishing

- **The palette is built from the registry**, not from a list. A kind added through
  `registry.extend()` appears without the palette being touched; containers (swimlanes) are excluded
  because a lane is the frame of the diagram rather than a step in it.
- **A rename commits on blur or Enter, not per keystroke.** `updateNodeData` checkpoints the undo
  stack, so a per-keystroke commit would spend the whole 50-slot buffer on one word.
- **Publish is disabled while an edit is unsaved.** The graph saves on a 900 ms debounce; publishing
  inside that window would freeze a version whose last edits are still in a timer. The controller
  flushes first as a second guard.
- **`duplicateToTenant()` copies a template as a DRAFT**, reading the source THROUGH
  `current_published_version_id` so it never copies somebody's open draft, and bumping the key rather
  than surfacing a 23505 when the same template is copied twice.

---

## The table contract

This package does **not** create its tables. The `workflow_definitions` migration owns
`workflow_definitions` and `workflow_definition_versions` (its own `tenant_id` column, flat RLS
predicate copied verbatim from `public.form_layouts`, `graph jsonb`, `ai_context jsonb`). If a
column name in `src/types.ts` disagrees with that file, the migration is right.

The tables are created by `20261103000000_workflow_definitions.sql` and extended by
`20261105000000_workflow_definition_versions_published_at.sql`. Both are checked into three scopes
(root, crm7, business-suite-unified) byte-identically, with paired entries in
`scripts/migration-collision-allowlist.txt`.

> **Version collisions are silent.** `schema_migrations` is keyed on the 14-digit version ALONE
> across eight applier scopes, so a file at a version already in the ledger is **skipped without a
> word** — success reported, nothing applied. The plan reserved `20261102000000` and #2896 took it
> the same day; `published_at` is a new file for the same reason, rather than an edit to the merged
> `20261103000000` — and it was itself renumbered from `20261104000000` to `20261105000000` when
> business-suite-unified#1085 merged the execution bridge at that version an hour after this one had
> checked it free. A census is a snapshot, not a reservation, in both directions.

> **0.1.0 disagreed with its own tables, and every test passed.** The service ordered by, SET and
> inserted `label` — a column that has never existed — and `publishVersion()` wrote `published_at`,
> which `20261103000000` never created. Listing, renaming, creating and publishing a workflow each
> returned a PostgREST error, and the merged apprentice seed could not land at all. Nothing caught it
> because every test stubbed the Supabase client. `src/__tests__/tableContract.test.ts` now parses
> the migration files and fails when the service names a column the DDL does not declare.

Readers must go through `current_published_version_id`, never "the highest version number" — that
is what makes publishing atomic and reversible, and what stops a half-finished draft reaching
production.

---

## Tests

`pnpm test` — 105 tests over eight files:

- `nodeRegistry.test.ts` — the vocabulary, `nodeTypes` stability, data-driven handles, openness
- `connectionValidation.test.ts` — **a cycle is accepted**, both apprentice loops, the four-way
  branch, and each refusal
- `swimlaneLayout.test.ts` — parenting, lane order, parents-before-children, and a spy proving the
  dagre call is schema-builder's rather than a reimplementation
- `graphRoundTrip.test.ts` — serialise → deserialise → deep-equal, including through `JSON`
- `undoRedo.test.ts` — the 50-snapshot cap, batching correctness, one-drag-one-step
- `tableContract.test.ts` — the service may only name columns the migration FILES declare, with a
  control assertion so a parser that matched nothing cannot report clean
- `duplicateDefinition.test.ts` — the copy lands as a draft, comes from the published pointer rather
  than `max(version)`, carries the rationale notes, bumps a colliding key, and does **not** retry an
  error that is not a unique violation
- `editorChrome.test.tsx` — the palette follows the registry, a rename is one undo step, deleting a
  lane asks first, and publish is refused while an edit is unsaved
