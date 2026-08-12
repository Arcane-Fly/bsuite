# Refined execution prompt — the Feature Builder, made genuinely no-code

**Tier:** Heavy · **2026-08-11** · Operator: *"100x improve its intuitive use… powerful, effective and
world class… consistent with other features… up and downstream impacts… best practice for 2026."*

## Intent

Turn a nine-panel form wizard that leaks SQL into a **node-based visual builder where an invalid
schema or an unsafe policy is unrepresentable** — not merely validated. Fix the live defects that make
it fail four of six jobs, and stop the capability matrix scoring it as finished.

## The core design move

The `custom_sql` textarea in `PermissionsPanel` exists because **the permission model has no visual
vocabulary**. Give it one and the escape hatch stops being needed.

React Flow's `isValidConnection` is the mechanism: a rule is expressed as a *connection between typed
handles*, and the library refuses the connection at drag time. **An invalid policy becomes impossible
to draw**, rather than possible to draw and then rejected. That is the difference between a form that
validates and a tool that cannot express the wrong thing.

## Decomposition

| # | Workstream | Depends on |
|---|---|---|
| A | **Entity canvas** — nodes are entities, edges are relationships, handles are typed columns | — |
| B | **Policy as connections** — replace `custom_sql` with a visual rule model | A |
| C | **Registry write** — `apply_feature_migration` must register into `tenant_entities` (0 inserts today) | — |
| D | **Idempotent emitter** — `drop policy if exists` before `create policy` | — |
| E | **Preview + rollback** — show the DDL, and be able to undo | C, D |
| F | **Consistency sweep** — tokens, CanvasCard, dnd-kit, nav | A, B |
| G | **Correct the capability matrix** — it scores 8/8 live; live testing says 2/6 | all |

## Best-practice citations — fetched from current docs, not memory

Source: React Flow docs via Context7 (`/websites/reactflow_dev`), 2026-08-11. Package is
**`@xyflow/react`** (v12 line), *not* the older `reactflow`.

- **`isValidConnection(connection) => boolean`** — per-canvas or per-`<Handle>`. Returns false to
  refuse the connection outright. *This is workstream B's whole foundation.*
- **`<Handle>`** takes `type` (`source`/`target`), `position`, `isConnectableStart`,
  `isConnectableEnd`, and its own `isValidConnection`. Typed column handles get per-handle rules —
  a `uuid` handle refuses a `text` handle without any code the user writes.
- **Cycle prevention via `getOutgoers`** — the documented recursive pattern. **Directly load-bearing
  here:** a schema with circular foreign keys is a real hazard this tool can currently create.
- **`colorMode="system"`** — first-class theme support; do not hand-roll it against `@bsuite/theme`.
- **`useNodeConnections` / `useNodesData` / `updateNodeData`** — reactive node data without lifting
  everything into one store.

Estate constraints (in-repo, already binding): `@bsuite/theme` OKLCH tokens only, **pure white and
pure black banned in every role**; ONE `CanvasCard` per logical card (enforced by
`card-unglue-contract.test.ts`); `@dnd-kit` is the estate's drag library — React Flow owns the canvas,
dnd-kit keeps owning card layout. Do not replace one with the other.

## Blindspots to counter — every one observed in this codebase today

1. **Building a second island.** `r80_charge_rate_builds` sits at 0 rows and 0 references because
   someone built a table nothing read. *Counter:* the canvas must read and write the SAME
   `tenant_entities` the three consumer screens already read. No parallel model.
2. **A tool that says it applied and did not.** `apply_feature_migration` creates real DDL and never
   registers it. *Counter:* every success state must be confirmed by reading back, not by the RPC
   returning 200.
3. **Generated SQL that cannot be re-run.** `CREATE POLICY IF NOT EXISTS` is invalid Postgres; the
   emitter's own doc comment wrongly claims idempotency. *Counter:* `drop policy if exists` then
   create — and fix the comment.
4. **Scoring a north-star feature as done.** The capability matrix says "8/8 live, BSuite advantage";
   live testing says 2 of 6 steps work. *Counter:* update the matrix in the same change.
5. **A gate satisfied by mentioning it.** Naming functions in a reachability comment flipped them to
   REACHED. *Counter:* after touching a gate's inputs, re-run it and check the result moved for the
   right reason.
6. **Claiming a layer you did not test.** Engine mistaken for product twice today, dev for production
   once. *Counter:* verify in the deployed app, and say which layer a claim is true at.
7. **No rollback on shared production.** This writes DDL to one Supabase serving six apps.
   *Counter:* preview before apply; a reversal path is a requirement, not a nicety.

## Skills & MCPs to use

`bsuite-developer-portal` (the 16 tabs and known gaps) · `bsuite-page-grid-layout` (CanvasCard
contract) · `web-dnd-kit` (keep card layout on dnd-kit) · `bsuite-brand-system` (tokens; no pure
white/black) · `general-dry-one-shot-architecture` + `check-dry-one-shot` (one owning app per entity)
· `bsuite-rls-authz-red-team` (anything emitting policy SQL) · `machine-design-web-guidelines` (a11y)
· `agent-definition-of-done` (D1–D7 at close).
**MCPs:** context7 (current `@xyflow/react` API — do not work from memory), supabase (live schema,
SELECT only from lanes), playwright (visual proof), vercel (deploy state).

## The refined prompt

> Rebuild the Feature Builder around a **node canvas** using `@xyflow/react`, and delete the SQL
> escape hatch by making the permission model expressible visually.
>
> **Entities are nodes. Relationships are edges. Columns are typed handles.** Use
> `isValidConnection` so a type-invalid relationship cannot be drawn, and the documented `getOutgoers`
> cycle check so a circular foreign key cannot be created. Use `colorMode="system"`.
>
> **Replace `custom_sql` with a visual rule model.** Every policy a GTO actually needs — own-tenant,
> own-record, role-gated, subtree, public-read — becomes a connection or a node property. If a rule
> genuinely cannot be expressed visually, the tool must **say so and refuse**, not hand the user a SQL
> box. A no-code tool that requires SQL for security policy is worse than no tool: it looks safe.
>
> **Fix the three live defects in the same change**: register the entity in `tenant_entities` (use an
> existence check — `UNIQUE(tenant_id, name)` is not `NULLS NOT DISTINCT`, so `ON CONFLICT` duplicates
> on platform-scope rows); emit `drop policy if exists` before `create policy`; show the generated DDL
> before applying and provide a reversal.
>
> **Consistency:** OKLCH tokens only, one CanvasCard per card, dnd-kit stays the card-layout library,
> React Flow owns only the canvas. The four-axis identity ruling and the global/tenant register test
> constrain any entity created.
>
> **Update `docs/20260723-bsuite-capability-matrix-v1.00W.md`** — it scores this 8/8 live and a
> competitive advantage. Score what is true.
>
> **Proof:** build an entity on the canvas, apply it, watch it appear in all three consumer screens,
> re-apply it to prove idempotency, then delete every artefact from production and confirm the delete.

## Definition of done

An invalid relationship cannot be drawn · no SQL input anywhere in the tool · entity appears in all
three consumer screens after one apply · double-apply is clean · DDL previewed before it runs ·
capability matrix reflects reality · both gates green · D1–D7 APPROVE.
