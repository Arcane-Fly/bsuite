---
kind: plan
authority: operator
owner: bsuite
evidence:
  - supabase/migrations/20261103000000_workflow_definitions.sql
  - supabase/seeds/20260901_apprentice_placement_workflow_seed.sql
  - scripts/generate-apprentice-placement-workflow-seed.mjs
  - scripts/__tests__/apprentice-placement-workflow-seed.test.mjs
  - packages/workflow-canvas/src/validation/connection.ts
  - packages/workflow-canvas/src/nodes/registry.ts
  - docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json
---

# Workflow Canvas — Implementation Plan

Owner: Braden Lang · Started 2026-09-01 · Status: ACTIVE, all phases to completion

**This finishes work approved in MAY.** `docs/plans/20260510-universal-canvas-capability-implementation-v1.00F.md`
(755 lines, red-teamed, finalised) scoped this exact feature and named two follow-on plan files
that were never written. Only the Sales Pipeline slice shipped. **Read that file before editing.**

Operator ruling 2026-09-01: *"when i set the goal and said e2e i meant all phases all complete.
this is how we miss things becasue you keep stopping and asking for confirmation."* No confirmation
gates. All phases. Includes deleting dead UI and wiring everything associated.

## 0. THE ANTI-REBUILD LIST — read before writing any code

| Thing | Where | State | Rule |
|---|---|---|---|
| `@bsuite/schema-builder` v1.8.0 — the ONE fully-persisted realtime xyflow canvas | `packages/schema-builder/` | works | **The architectural template.** Copy controller+service+optimistic-mutation shape. It already "consolidated the 4 previously-duplicated React Flow schema builders" — do NOT make a fifth. |
| `RelationshipCanvas` | `business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx` (519) | half-wired | Borrow `ReactFlowProvider` wrapper + `xyflowThemeTokens.ts` ONLY. Its `field.type !== 'uuid' → refuse` and cycle-rejection are FK-specific. |
| crm7 workflow engine + templates — `new-apprentice-onboarding` ALREADY MODELLED | `crm7/src/lib/workflows/workflow-engine.ts` (463), `workflow-templates.ts` (395) | half-wired | **Keep the step/trigger TYPE schema.** Delete `workflow-store.ts` (localStorage) and the list UI. |
| conduit r7 automation runtime — the ONLY real execution engine | `conduit/supabase/functions/r7-automation-processor/` (527), pg_cron `* * * * *` live | works, inert | **Generalise it. Do NOT write a second queue or cron.** All 9 `auto_actions` = `{}`. |
| Jodie chat + 49-tool registry, mounted on every authenticated page | `crm7/api/ai/chat.ts`, `crm7/src/lib/ai/tools/` (17 files) | works | The substrate. Do not rebuild. |
| `workflow-automation` Jodie skill — right name, right triggers, `toolIds: []` | `crm7/src/lib/ai/jodie-skills.ts:521-539` | stub | **Fill the array. Do NOT add a second workflow skill.** |
| `ui-builder-tools.ts` output-equivalence pattern | `crm7/src/lib/ai/tools/ui-builder-tools.ts` (691) | works | One engine, two callers. The pattern for "Jodie designs it". |
| AI gate `subscriptions.ai_addon` | `business-suite-unified/src/hooks/useSubscription.ts:112` | works in BSU only | crm7 hardcodes `aiEnabled = true`; `api/ai/chat.ts` has no server check. |
| `form_layouts` RLS shape | `public.form_layouts` | works | **Copy verbatim.** Four separate policies. Never `FOR ALL`. |
| `useUndoRedo` 50-snapshot buffer | `crm7/src/pages/sales/pipeline-flow-inner.tsx` | inert | Lift as-is. |
| `@dagrejs/dagre` auto-layout | `packages/schema-builder/src/utils/autoLayout.ts` | works | Already paid for in the bundle. Reuse; add no dependency. |
| `@bsuite/jodie` v1.0.0 (dev-ops ticket triage) | `packages/jodie/` | inert | **OUT OF SCOPE.** Different Jodie. Do not touch. |

## 1. THE GAP LIST — what genuinely does not exist

1. Process-shaped node vocabulary (step / decision / swimlane / handoff / delay). No generic `nodeTypes` registry.
2. Workflow persistence schema. No `workflows` / `workflow_definitions` / `workflow_runs` table.
3. Graph→execution bridge. `workflow-engine.ts` runs a flat array; a graph has branches and loops.
4. The emission trigger. Nothing fires `apprentice.created` — the string has no call site anywhere.
5. Workflow-shaped Zod schema + AI tool. `feature-builder-ai` declares `generate-workflow` but the handler is a hard 501.
6. crm7's AI licence read.
7. A `platform_webhooks` dispatcher (only if an HTTP-out node ships).

## 2. VERDICT — workflow-sdk.dev: REJECT for v1

It is Vercel Workflow (Apache-2.0). Server-only TS functions with `"use workflow"` directives —
**no canvas at all**, so it cannot satisfy "like langflow or n8n". 0 KB client, and 0 KB of the
problem solved. 5 of 6 apps are Vite SPAs with no server layer; adopting it means bolting on Nitro.
conduit's queue already provides durable execution on the same Postgres.

## 3. PHASES — all of them, to completion

### Phase 1 — the apprentice workflow on screen, from the database
- Migration `20261103000000_workflow_definitions.sql` — NOTE: `20261102000000` was ALREADY TAKEN by the training_contracts FK migration the same day; a colliding version is silently skipped (global max was `20261102000000`; one shared
  `schema_migrations` keyed on version alone across 8 applier scopes — a colliding version is
  SILENTLY SKIPPED). Tables: `workflow_definitions`, `workflow_definition_versions` (own `tenant_id`
  column, flat RLS predicate, never join-through; `graph jsonb` in xyflow's native
  `{nodes,edges,viewport}` shape; `ai_context jsonb`). Every FK-shaped uuid gets a btree index in
  the SAME file (pgTAP A1). RLS copied verbatim from `form_layouts`.
- `packages/workflow-canvas` v0.1.0 — `WorkflowCanvas.tsx` + `useWorkflowController.ts` +
  `service.ts`, mirroring `useSchemaController.ts`. Node types `step`/`decision`/`terminator`/`handoff`,
  swimlanes as xyflow parent nodes. Dagre via schema-builder's `autoLayout.ts`. Theme via `xyflowThemeTokens.ts`.
- Seed the Apprentice Placement template from `docs/design-inputs/20260901-apprentice-onboarding-journey-lucidchart-v1.00A.json`:
  32 steps, 2 decisions, 2 terminators, 6 swimlanes, 41 edges, **including both loops** and the
  four-way branch out of *Host accepted placement?*. The 6 decision rationale notes go into
  `ai_context` verbatim — Jodie's grounding in Phase 4.
- crm7 route `/workflows/:id` renders it. Positions save back to the draft.

### Phase 2 — editable, versioned, and the dead UI RETIRED
- Node palette, `onConnect` with **loop-permissive** validation, inline rename, delete, undo/redo.
- Draft→Publish: new version row, `current_published_version_id` moves; consumers read only through it.
- **Same PR, non-negotiable deletions:** `crm7/src/lib/workflows/workflow-store.ts`,
  `workflow-templates.ts`, `crm7/src/components/workflows/{WorkflowBuilder,WorkflowList,WorkflowCard}.tsx`;
  repoint `/workflows`; delete `crm7/src/components/whs/workflow-manager.tsx` + its route + BOTH nav
  entries (`config/navigation.ts:444`, `lib/navigation.ts:345`) + the two unreachable siblings.
  Keep `workflow-engine.ts`'s step/trigger types, moved into the package.

### Phase 3 — execution, by generalising conduit's queue
- Generalise `r7_automation_queue` → pg_cron → edge function to accept a workflow graph.
- Graph→step bridge handling branches and loops.
- The emission trigger that actually fires on placement/apprentice creation.

### Phase 4 — Jodie designs workflows, and the billing hole closes
- Fill `jodie-skills.ts` `toolIds: []` with workflow authoring tools following the
  `ui-builder-tools.ts` one-engine-two-callers pattern.
- Workflow-shaped Zod schema; replace the `generate-workflow` 501.
- **Fix the AI billing hole**: crm7 must read `subscriptions.ai_addon`; `api/ai/chat.ts` needs a
  server-side check. Currently AI is billable in BSU and free in crm7.

## 4. Constraints
- Demo tenant `aaaaaaaa-0000-0000-0000-000000000001` holds the anonymised FutureBuild mirror
  (8 placements, 9 plans, 16 schedules, 119 qualification_units, 539 training_plan_units).
  **Build and demo against it.**
- **NEVER write FutureBuild Academy (`b550d66c-…`).** All 8 real apprentice placements are theirs.
- Bundle: operator constraint. `@xyflow/react` and dagre are already paid for. Lazy-load the canvas route.
- feature branch → PR to development → PR to main. GPG-signed. Never push main directly.
