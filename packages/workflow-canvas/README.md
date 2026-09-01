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
import { WorkflowCanvas, useWorkflowController } from '@bsuite/workflow-canvas';

function WorkflowPage({ id }: { id: string }) {
  const controller = useWorkflowController({
    supabase,
    tenantId,
    definitionId: id,
    onError: (message, err) => toast.error(message, err),
    onConnectionRefused: (v) => toast.info(v.reason),
  });

  return <WorkflowCanvas controller={controller} />;
}
```

Lazy-load the route. `@xyflow/react` must never reach the entry chunk — Phase C.2 of the May plan
made that a hard rule with a bundle-analyser proof.

---

## The table contract

This package does **not** create its tables. The `workflow_definitions` migration owns
`workflow_definitions` and `workflow_definition_versions` (its own `tenant_id` column, flat RLS
predicate copied verbatim from `public.form_layouts`, `graph jsonb`, `ai_context jsonb`). If a
column name in `src/types.ts` disagrees with that file, the migration is right.

> **Version collision.** The plan reserves `20261102000000`, and that version is already taken on
> `development` by `20261102000000_training_contracts_training_plan_fk.sql` (#2896, merged
> 2026-09-01). `schema_migrations` is keyed on version alone across eight applier scopes, so a
> colliding version is **silently skipped** — success reported, nothing applied. The workflow
> migration must take a later version.

Readers must go through `current_published_version_id`, never "the highest version number" — that
is what makes publishing atomic and reversible, and what stops a half-finished draft reaching
production.

---

## Tests

`pnpm test` — 80 tests over five files:

- `nodeRegistry.test.ts` — the vocabulary, `nodeTypes` stability, data-driven handles, openness
- `connectionValidation.test.ts` — **a cycle is accepted**, both apprentice loops, the four-way
  branch, and each refusal
- `swimlaneLayout.test.ts` — parenting, lane order, parents-before-children, and a spy proving the
  dagre call is schema-builder's rather than a reimplementation
- `graphRoundTrip.test.ts` — serialise → deserialise → deep-equal, including through `JSON`
- `undoRedo.test.ts` — the 50-snapshot cap, batching correctness, one-drag-one-step
