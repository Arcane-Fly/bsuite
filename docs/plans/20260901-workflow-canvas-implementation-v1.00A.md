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
  - crm7/src/lib/workflows/runService.ts
  - crm7/src/pages/workflows/runs.tsx
  - supabase/migrations/20261106000000_apprentice_competencies_person_path.sql
  - supabase/migrations/20261107000000_platform_branding_write_policies_after_profiles.sql
  - scripts/check-migration-collisions-across-open-prs.mjs
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

## 5. STATUS — 2026-09-02

### Shipped and verified live

| | evidence |
|---|---|
| Canvas renders the apprentice workflow | 42 nodes / 41 edges in production |
| Minimap | fixed at the render boundary — xyflow's `nodeHasDimensions` reads `measured/width/initialWidth`, never `style.width`, so the canvas drew fine while the minimap skipped every node. 0 → 42 rects |
| `@bsuite/workflow-canvas` | 0.2.0 published (one manual bootstrap — `npm trust` requires the package to already exist), then 0.2.1 and 0.2.2 by CI through the Trusted Publisher |
| Terminator roles | corrected in the production graph in a guarded transaction (`UPDATE 1`). A missing `role` silently became END, which declares only `FLOW_IN` |
| `trigger_config` | `{"events": ["placement.created"]}` set — without it `workflow_emit_event` could never fire |
| Phase 3 execution | proven end to end on the demo tenant: inserting a placement produced runs 0→1, steps 0→2, status `waiting`, first step `start` — then rolled back |
| Runs surface | `runService.ts` + `runs.tsx` — writes go **only** through the `workflow_run_step_complete` RPC, because `authenticated` holds SELECT-only on `workflow_runs`/`workflow_run_steps` |

### FutureBuild Academy — what "transitioned" actually means

The operator asked for FutureBuild's 8 live placements to be transitioned, and explicitly
overrode the standing "never write FutureBuild" constraint in §4 to do it. That override is
recorded here because it contradicts a written constraint and must not be inferred later.

**Measured, not assumed:** all 8 placements are already on the person-based model —
8 of 8 carry `person_id`, 0 carry `apprentice_id`. FutureBuild has **zero `apprentices`
rows**. Under the operator's ruling (*"trainee is same as apprentice, and worker is same
without the training"*) that is the CORRECT shape, not a defect.

So there is no structural migration to run. Two things were genuinely blocking:

1. **Units of competency could not be linked at all.** `apprentice_competencies.apprentice_id`
   was `NOT NULL` with an FK to `apprentices`, so recording a competency required a row
   FutureBuild does not and should not have. Fixed by `20261106000000`, safe because the
   table holds zero rows estate-wide.
2. **The tenant is not opted in.** `workflow_definition_activations` gates
   `workflow_emit_event` per tenant; only the demo tenant has a row.

**Activation is rehearsed and proven, and deliberately NOT yet applied.** In a rolled-back
transaction against production: un-activated emit started 0 runs (the opt-in holds),
activated emit started 1 run with 2 steps at status `waiting` and first step `Start`, a
re-emit for the same subject started 0 (`uniq_workflow_runs_live_per_subject` holds), and
the RPC the page uses advanced it 2 → 4 steps. FutureBuild ended the rehearsal at 0 runs,
0 activations.

It waits on one thing: **the runs surface reaching production.** Activation only affects
NEW placements, and a run started with no page to advance it sits `waiting` forever — and
because of `uniq_workflow_runs_live_per_subject`, permanently blocks that subject from ever
starting another. Activating before the page ships would break the thing it enables.

### Deliberately NOT done, with the reason

- **No backfill of runs for the existing 8.** It would create 8 unadvanceable runs that
  permanently block those subjects, against people who were onboarded months ago, and
  produce 8 false compliance items. Their onboarding is history, not work in progress.
- **The other 13 tables with a `NOT NULL` FK to `apprentices` are untouched.** They hold
  real rows; converting them is a schema decision whose blast radius belongs to the operator.

### Open

- crm7#2334 (development → main) carries the runs surface to production — checks running
- bsuite#2936 `trigger_config`; bsuite#2937 competencies + gate fixes
- bsuite gitlink for crm7 advances to crm7/**main** once #2334 lands, which also clears the
  `Lockfile pin vs repo-declared version` failure (bsuite/development pins crm7 `3630295`,
  whose lockfile resolves 0.2.2's predecessor 0.2.1)
- then FutureBuild activation, then `/ops-ship-close-out`

## 6. PHASE 4 — verified complete, 2026-09-02

Measured rather than assumed, because the plan listed three items and two were already done
by work that landed earlier in this run.

| plan item | state | evidence |
|---|---|---|
| Fill `jodie-skills.ts` `toolIds: []` with workflow authoring tools | **DONE** | the `workflow-automation` skill carries `list_workflows`, `get_workflow`, `validate_workflow_outline`, `create_workflow`, `add_workflow_version` |
| Workflow-shaped Zod schema; replace the `generate-workflow` 501 | **DONE** | `feature-builder-ai/index.ts` — *"generate-workflow (fully implemented — emits a workflow-canvas graph)"*. The remaining 501 is `generate-page`, a different action |
| Fix the AI billing hole | **DONE** | `crm7/api/ai/chat.ts` imports `resolveAiEntitlement` and gates on `subscriptions.ai_addon` with an explicit **fail-closed** read: an unreachable or failed entitlement lookup is treated as *not entitled*, with a 5s abort |

**A correction worth keeping:** `createWorkflowTools` first looked like an inert surface —
grepping `api/ai/chat.ts` and `authoringDispatch.ts` for it found nothing. It is wired, via the
barrel at `src/lib/ai/tools/index.ts:108`. Checking the two call sites a tool "should" appear in
is not the same as checking whether it is reachable.

**Still empty, and NOT workflow work:** `toolIds: []` on `mentoring` and `general-assistant`.
Pre-existing, unrelated to this plan, and named here so the next reader does not re-derive it.

## 7. Visual gate — agent-performed, 2026-09-02

Account `braden@braden.com.au`, host `d.crm.crm7.app`, `build-matrix-runner.mjs` + `visual-probe.js`.

- **`/workflows/runs`** — 8/8 cells PASS (light and dark × 1440/1024/768/390), 0 unknown,
  0 console errors, 0 HTTP 4xx/5xx, no horizontal overflow.
- **`/workflows`** — `canvasColumns` came back INCOMPLETE. The interaction test showed the
  control reachable but producing one layout, which reads as INERT and is not: every widget
  there is full-width, so no column count can move it. Positive control on `/dashboard`, same
  session and viewport, gave **three distinct layouts** — the control acts. Not applicable, not
  inert.
- **One FAIL, fixed:** steps rendered `node_id` (`accept-employment-offer`) where `node_label`
  held *"Accept employment offer"* on the same row. The decision input's `aria-label` carried
  the same slug. Fixed in crm7#2336.

**Two method corrections, recorded because both would have produced a false PASS:**

1. Driving the theme *toggle* left all four "dark" cells reporting `measuredTheme: light`.
   Brand tokens flip on `prefers-color-scheme`, not a class — the theme is now emulated on the
   browser context and the page loaded fresh.
2. The empty state alone would have passed every check. A run was created on the **demo**
   tenant so the populated state could be inspected — which is the only reason the slug defect
   was found — then removed, verified back to 0 runs / 0 steps.

BSuite Customization Surfaces — Audit and Recommendation
0. The headline, before the inventory
Almost everything the operator asked for is already built, published to npm, and not rendered. @bsuite/workflow-canvas@0.2.2 ships a complete editor — WorkflowPalette (add step/decision/handoff), WorkflowToolbar (undo/redo/tidy/save-state/publish), WorkflowInspector (inline rename, describe, guarded delete) — all public exports (packages/workflow-canvas/src/index.ts:2-13). crm7's adapter (crm7/src/components/workflows/WorkflowCanvasInner.tsx:82-88) renders `PackageCanvas` with the `controller`, `readOnly`, and `showMiniMap` props, but no children. Grep for WorkflowPalette|WorkflowToolbar|WorkflowInspector across crm7/src: 0 hits. So on an editable workflow the user can drag existing nodes and draw validated edges, but cannot add a node, rename one, see save state, or publish — and on a platform template (the only kind a fresh tenant has), nothing drags at all. That is the operator's entire complaint, mechanically explained.

Second headline: create-from-blank is half-wired in the same file that hides it. crm7/src/pages/workflows/index.tsx imports createWorkflowWithDraft (line 47), defines starterGraph() (line 73, a publishable Start→End graph) and keyFromName() (line 95), imports the Plus icon (line 53) — and none of them appear in the JSX. The page copy even asserts the limitation: "New ones start as a copy of a platform template below." The service (src/lib/workflows/workflowDefinitionService.ts:374) is finished and tested.

Third: the AI lane is more capable than the visual lane. Jodie's workflow-tools.ts exposes create_workflow, add_workflow_version, publish_workflow_version; ui-builder-tools.ts exposes add_layout_section, add_layout_field, authoring_find_or_create_entity, authoring_add_page_widget. The chat can do what the screen cannot.

Also: the stale header in crm7/src/pages/workflows/[id].tsx:1-35 still says the package "is not on npm (404)" and "crm7 cannot import it" while the file imports the component that wraps that exact package — the sibling file index.tsx header says the opposite (both are current, one is false). This is precisely the "agents forget and rebuild" vector: the next reader of [id].tsx is being told to rebuild.

1. Complete inventory
Method: route-registration grep (grep 'path="' crm7/src/App.tsx, router files per app), package-import grep (@bsuite/page-builder|schema-builder|workflow-canvas|@xyflow/react|@dnd-kit), then reading each surface's source. The other five apps were enumerated by a fanned-out search agent whose two most load-bearing claims (braden SiteEditor unrouted; BSU wraps the shared schema-builder) I re-verified by hand.

Count: 27 customization surfaces across 6 apps + 3 shared engines. (Route-level: my grep of crm7's App.tsx finds 31 customization-shaped route registrations; your 23 is the same lanes counted without the picklists/custom-fields/reports-custom rows.)

# Surface App / route Engine DnD/visual today? Reachable from siblings?

1 Workflow list crm7 /workflows forms + DraggableCardPage list only → /workflows/:id, /dashboard only
2 Workflow editor crm7 /workflows/:id @bsuite/workflow-canvas (xyflow) canvas, drag+connect when editable; no palette/toolbar/inspector, no fullscreen → /workflows only
3 Workflow runs crm7 /workflows/runs forms; live engine (in-place step completion — D8-correct) no back-link only
4 Schema Builder crm7 /settings/schema-builder @bsuite/schema-builder (xyflow) full canvas, chromeless full-bleed, Cmd+K, PNG export Cmd+K navigationTargets prop exists; crm7 passes none (page: 0 hits)
5 Schema Builder BSU /settings/schema-builder (page src/pages/Settings/SchemaBuilder.tsx) same package yes thin wrapper
6 Schema Builder conduit /settings/schema-builder same package yes thin wrapper
7 Form Layouts crm7 /settings/form-layouts(+create/:id/:id/edit) dnd-kit (FormLayoutBuilder.tsx) yes — sortable sections/fields absent from persistent sidebar (src/config/navigation.ts: 0 hits); hub card only
8 Custom Pages crm7 /settings/custom-pages(+create/:id/edit) plain forms; no layout editor at all no — metadata only; renderer (src/components/CustomPageRenderer.tsx:133) shows layout as JSON.stringify in a <pre> detail page names "the Form Layout Builder, or Jodie AI" with no link
9 Custom fields crm7 /settings/custom-fields (+-admin) forms over tenant_field_definitions no none
10 Picklists crm7 /settings/picklists ×4 forms no none
11 Page canvas editor ("Edit page"/"Add element") crm7, every DraggableCardPage route @bsuite/page-builder + PageEditorLauncher + WidgetPalette (widget registry, resolveOrCreateEntity inline entity creation) yes — the estate's best round-trip exemplar AI parity via authoring_add_page_widget
12 Comms templates crm7 /communications/templates ×3 forms + Textarea no none
13 Document templates crm7 /documents/templates ×2 Plate.js rich editor w/ merge fields visual (text), not canvas none
14 Progress-review templates crm7 /progress-reviews/templates ×3 forms + Textarea no none
15 Branding (crm7) /settings/branding redirect out of the app to BSU /branding (Phase 12/CAW-V7a) — one-way; no automatic return
16 Tenant branding BSU /branding forms on DraggableCardPage card-drag only —
17 Platform branding BSU /admin/branding forms on DraggableCardPage card-drag only —
18 Developer branding tier BSU /developer/branding forms no —
19 Feature Builder BSU /developer/feature-builder own 519-line RelationshipCanvas.tsx on raw @xyflow — a third canvas yes LogicPanel.tsx:10: "React Flow workflow canvas … remain future" — a 4th canvas waiting to be wrongly built
20 Permissions editor BSU src/pages/Admin/PermissionsEditor.tsx forms no —
21 Nav editor BSU /developer/nav dnd-kit SortableList yes overlaps #22
22 Route Inspector DB-nav tab BSU /developer/route-inspector forms/inline edit no writes the same tenant_navigation as #21
23 Lead-routing rules BSU /developer/routing dnd-kit + react-grid-layout yes —
24 Website/CMS ("site editor", live) BSU /developer/website forms + native HTML5 row drag forms-over-tables (operator ruled it FAILS D8, 2026-08-30) authors page_sections consumed read-only by braden's DynamicPage.tsx — cross-app authoring with no return path
25 braden branding admin braden /admin/branding DraggableCardPage port card-drag "Back" navigates to unrouted /admin/dashboard (dead link)
26 braden page builder braden /admin/page-builder @bsuite/page-builder PageGridLayout canvas mounted, empty palette — Phase 2b never built —
27 conduit in-place page edit /candidates, /pipeline @bsuite/page-builder PageEditorLauncher yes but preview-only, persists to localStorage; comment says "publishing requires CRM7 Page Editor" links out to a different app
Not surfaces but relevant: BSU SchemaVisualizer (read-only xyflow ER view, /developer/database); throughput and R80.4 have zero builder surfaces beyond the shared card grid (R80.4's one dnd-kit hit is tile reorder inside the calculator).

The "site editor" memory item, measured today: braden's SiteEditor.tsx + SiteEditorLayout.tsx + the whole AdminLayout.tsx nav map (Site Editor, CMS, Site Settings…) are unrouted dead code — braden/src/Routes.tsx registers only /admin/auth and /admin. site_settings is a retired table: every live-code reference is a comment recording its replacement by site_metadata. The live "site editor" is BSU /developer/website (#24). So the memory line remains true in spirit (forms-over-tables, D8 fail) but the writes-to-a-missing-table half now describes dead code, not a live defect.

2. Overlap and duplication
Three-and-a-bit React Flow canvases. 21 files importing @xyflow/react in packages/schema-builder/src, 18 in packages/workflow-canvas/src (verified grep -rl | wc -l), plus BSU's RelationshipCanvas.tsx (519 lines, raw xyflow), plus read-only SchemaVisualizer. Credit where due: workflow-canvas deliberately reused schema-builder's XY_TOKEN_BINDINGS + useDocumentColorMode (via the @bsuite/schema-builder/xyflow subpath) and dagre (via /auto-layout) instead of copying. But it still duplicated:

Chrome schema-builder file workflow-canvas file Verdict
Realtime invalidation hook hooks/useRealtimeSubscription.ts hooks/useRealtimeSubscription.ts — header admits "Straight port of packages/schema-builder/…" extract
LOD zoom bands EntityNode.tsx:47-48 (0.7/0.35) nodes/shared.ts LOD_DETAIL_VISIBLE=0.55 — "Ported from EntityNode's level-of-detail bands" extract (one useLodBands + shared thresholds)
Node card shell EntityNode's inline class strings nodes/shared.ts cardShellClass() extract
Floating toolbar chrome SchemaToolbar.tsx (Tidy/Fit/PNG/search) WorkflowToolbar.tsx (undo/redo/Tidy/save/publish) extract the shell + Tidy/Fit; keep publish vs PNG domain-specific
Properties panel pattern EntityPropertiesPanel.tsx (359 ln) WorkflowInspector.tsx (193 ln) pattern-share only; fields are domain-specific
Delete-key wiring, Controls/MiniMap/Background assembly, opening-fit clamp, absolute inset-0 sizing note SchemaCanvas.tsx:883-930, OPENING_FIT WorkflowCanvas.tsx OPENING_FIT, same block extract a CanvasFrame
Undo/redo absent (0 hits in schema-builder src beyond unrelated names) hooks/useUndoRedo.ts (127 ln) asymmetry — move UP so schema gets it
Cmd+K palette, PNG export, fuzzy search schema-builder only absent asymmetry — sharable
Connection validation R-rules in workflow-canvas/src/validation/connection.ts + open registry nodes/registry.ts schema has its own inline onConnect registry pattern is the keeper
Recommendation: a @bsuite/canvas-kit holding CanvasFrame (provider + sizing + Controls/MiniMap/Background + colorMode + token bindings + delete-key + opening-fit), useUndoRedo, useRealtimeInvalidation, useLodBands, cardShellClass, useDocumentColorMode, XY_TOKEN_BINDINGS, toolbar/panel shells. Migration cost is real: 2 package majors + 2 consumer bumps across 3 apps (crm7, BSU, conduit), plus the schema-builder /xyflow subpath must keep re-exporting from canvas-kit or workflow-canvas 0.x breaks. Do this after the crm7 wiring wins, not before — no user-visible feature depends on it, and the operator's complaints are all consumer-side. The exception worth doing early: BSU FeatureBuilder's LogicPanel must consume @bsuite/workflow-canvas, and RelationshipCanvas should be scheduled for replacement by SchemaCanvas — those are the "rebuild beside the half-wired setup" incidents in progress.

Duplicated non-canvas surfaces: BSU Nav editor vs Route Inspector DB-nav tab (same tenant_navigation table, two UIs); crm7 /settings/custom-fields forms vs the schema-builder canvas (same tenant_field_definitions — package service reads it at service.ts:196,217); crm7 custom-pages lane vs the live page canvas editor (#8 vs #11 — the settings lane is the worse, forms-only sibling of a working WYSIWYG system, the exact anti-pattern).

3. Round-trip failures (D8 §5, asked literally)
Journey Leave the page? Smallest fix
Building a form layout, need a field that doesn't exist Yes — to /settings/schema-builder or custom-fields; FormLayoutBuilder holds unsaved state in a zustand store, and there is no return path FieldCreateDialog is already a public export of @bsuite/schema-builder (index.ts). Import it into the layout builder's field palette behind "+ New field". No publish cycle.
Designing an entity, want it on a form Yes, and no forward link from schema-builder Package already has the affordance: SchemaBuilder's navigationTargets/onNavigate Cmd+K props — crm7 passes neither (settings/schema-builder/index.tsx: 0 hits). One prop.
Custom page → give it content Cannot be finished anywhere. Create/edit are metadata-only; detail says "Edit the layout in the Form Layout Builder, or use Jodie AI" with no link; renderer dumps JSON Short term: link + embed. Right answer: retire the lane's own editor and make "Edit page" open the existing PageEditorLauncher canvas on /custom/:slug.
Workflow step → the entity/form it acts on No binding exists; actionKey is a free string in StepNode Inspector select fed by getSchemaEntities (once inspector is mounted at all).
Templates ↔ workflows/pages No links either way Nav group (see below).
Branding from crm7 Leaves the app (BSU redirect); return is manual Deliberate (CAW-V7a). Add ?return_to= handling in BSU + a back affordance; don't re-own writes.
Copy template → edit ✅ Done right — duplicate.onSuccess navigates onto the copy ("Land the user ON the copy") —
Advance a run ✅ Done right — in place (runs.tsx header cites D8.5 explicitly) —
"Click the card" Templates list: only the name text is a button; the row is inert (index.tsx:271-283). "Mine" rows are full-width buttons — inconsistent siblings Make the whole <li> the click target; keep Copy as a stop-propagation button.
Add-widget needs a new entity ✅ The exemplar — WidgetPalette → resolveOrCreateEntity creates inline This is the pattern the rest should copy.
The interconnect layer as a whole: schema-builder ↔ form-layouts share data (getSchemaEntities + getEntityFieldDefsWithInheritance — the plumbing exists) but share zero navigation; workflows share nothing with anything. All four lanes sit in three different nav sections (AI & Automation vs Settings sidebar vs Settings-hub-only — Form Layouts is in no sidebar at all, config/navigation.ts: 0 hits, hub card only, the same defect that file's comments record fixing for Feature Flags and Custom Pages).

4. World-class bar (Langflow / n8n / Retool / Figma)
Create-from-blank: all four open a named blank canvas in ≤2 clicks. BSuite: service exists, button doesn't. Gap = 1 button.
Drag to connect: n8n's signature move is drop-on-empty-pane opens a node picker (onConnectStart/onConnectEnd — current reactflow.dev docs cover it verbatim). The package validates connections with toast reasons (better than n8n's silent refusal) but crm7 users can't reach it. Palette drag-to-place: reactflow.dev's DnD example is native HTML5 drag + screenToFlowPosition (touch caveat — keep click-to-place, which WorkflowPalette already has and correctly defends).
Shape language: the one pair that must differ at a glance — step vs decision — renders the identical shell (cardShellClass(selected,'rounded-lg') in both StepNode.tsx and DecisionNode.tsx; the differences are a 14px glyph and a branch list hidden below zoom 0.55). Terminator (stadium) and handoff (dashed) already differ. The fix, respecting the no-rotation constraint (documented in DecisionNode.tsx:3-9, and validated by reactflow.dev's official Shapes example: draw SVG paths inside a normally-positioned node, handles on the wrapper): keep the rectangular hit box, add a shape-cued left rail/notched SVG backdrop per kind — decision gets angled/chamfered ends (hexagon-ish backdrop) + text-primary accent, step stays a plain rectangle, terminator stays a stadium. Distinct at minimap scale, zero handle-math risk.
Fullscreen: Langflow/n8n/Retool all have expand/maximize. BSuite: 0 occurrences of fullscreen in either package or crm7 pages (grep verified). The estate already has the pattern — the schema-builder page is full-bleed via useChromeless(); the workflow canvas sits in a 46vh max-h-[560px] card (WorkflowCanvasInner.tsx:81). React Flow needs only a sized container; a fixed inset-0 overlay toggle re-measures automatically.
Moving between builders without losing context: Figma's model is panels-in-place, never navigation. The estate's equivalents exist piecemeal (Cmd+K palette, FieldCreateDialog, resolveOrCreateEntity) and are unwired.
Two current-API defects found while checking the docs (both worth a live-test before fixing): (a) WorkflowHandles unmounts handles below zoom 0.55 (handles.tsx: if (!visible) return null) — reactflow.dev explicitly warns hidden handles must use visibility/opacity, never removal, or edges misrender; the opening fit clamps to 0.2–0.75, so big graphs can open below the threshold with every handle gone and connecting impossible with no explanation. (b) DecisionNode branch handles move when branches change and nothing calls useUpdateNodeInternals (0 hits in the package) — the documented requirement for dynamic handles.

5. Ranked, sequenced recommendation
All of P0 is crm7-only — no npm publish cycle. That is the deepest point of this audit: the packages are ahead of the apps.

P0.1 — Mount the editor chrome. crm7/src/components/workflows/WorkflowCanvasInner.tsx: render WorkflowPalette, WorkflowToolbar, WorkflowInspector as PackageCanvas children; derive selectedNodeId from controller.nodes. Also delete the false "cannot import" header in pages/workflows/[id].tsx. Effort: S (half a day + visual pass). This alone answers "how do I connect and drag parts together", "why can't I move parts", publish, rename, undo buttons.

P0.2 — "New workflow" button. pages/workflows/index.tsx: wire the already-imported createWorkflowWithDraft + starterGraph() behind a name dialog; navigate onto the result; fix the "New ones start as a copy" copy. Effort: S (hours).

P0.3 — Fullscreen toggle. WorkflowCanvasInner.tsx: expand button swapping the container to fixed inset-0 z-50 (or reuse the chromeless pattern); Esc to exit. Effort: S.

P0.4 — Whole-card click target on the templates list (pages/workflows/index.tsx:265-295). Effort: XS.

P1.1 — One nav story. Add a "Customization" grouping (or cross-links panel) covering schema-builder / form-layouts / custom-pages / workflows / templates; put Form Layouts in the persistent sidebar (src/config/navigation.ts); pass navigationTargets + onNavigate to SchemaBuilder in pages/settings/schema-builder/index.tsx. Effort: S.

P1.2 — Inline field create in the layout builder. Import FieldCreateDialog from @bsuite/schema-builder into FormLayoutBuilder's palette. Effort: M (dialog expects the package's service context — verify prop shape; still no publish).

P1.3 — Decision shape language + handle-LOD fix. packages/workflow-canvas/src/nodes/{DecisionNode,StepNode,shared,handles}.tsx: SVG shape backdrops per the Shapes-example pattern; change handle LOD from unmount to visibility; add useUpdateNodeInternals on branch-count change. Needs a publish (workflow-canvas 0.3.0) + crm7 bump. Effort: M (1–2 days incl. visual pass both themes).

P1.4 — Custom pages: stop the JSON dump. Either mount PageEditorLauncher on /custom/:slug and link it from the detail page, or at minimum render layout through the widget registry instead of <pre>{JSON.stringify} (src/components/CustomPageRenderer.tsx). Effort: M–L; the right shape is convergence with surface #11, not a new builder.

P2 — canvas-kit extraction (section 2 list). 2 majors + 3 consumer bumps. Effort: L (a week-class refactor). Do after P0/P1 ship.

P2.b — Point BSU at the packages. FeatureBuilder LogicPanel consumes @bsuite/workflow-canvas when built; plan RelationshipCanvas → SchemaCanvas. Prevents canvases 4 and 5.

Traps:

Do not build a workflow editor, palette, inspector, or a custom-page canvas anywhere. Every one exists. The stale [id].tsx header actively invites the rebuild — fix it in P0.1's PR.
The publish cycle is real friction: packages are consumed from npm by standalone-built submodules; npm uses trusted publishing (tokens revoked); schema-builder's /xyflow subpath is a cross-package contract that canvas-kit must not break.
DraggableCardPage cards wrap these pages — the estate has two autoHeight contracts with separate allowlists and 13 page-scanning tests; a fullscreen overlay that escapes the card must be checked against the DOM-layout lint.
The editable draft vs published-version split: the detail page renders the published pointer while the controller edits the draft — when the toolbar mounts, make sure the page's "At a glance" copy ("a draft somebody is editing is never displayed here") is reconciled with an editing surface, or users will edit a draft while reading stats about the published version.
Platform templates are read-only by design — don't "fix" dragging on them; fix the empty-tenant path (P0.2) so there's always something editable to land on.
Key files: crm7/src/components/workflows/WorkflowCanvasInner.tsx, crm7/src/pages/workflows/{index,[id]}.tsx, crm7/src/config/navigation.ts, crm7/src/components/ui-customization/FormLayoutBuilder.tsx, crm7/src/components/CustomPageRenderer.tsx, packages/workflow-canvas/src/{components,nodes,hooks,validation}/, packages/schema-builder/src/{components/SchemaBuilder.tsx,index.ts,xyflow.ts}, business-suite-unified/src/components/feature-builder/RelationshipCanvas.tsx, business-suite-unified/src/pages/Developer/FeatureBuilder/panels/LogicPanel.tsx, braden/src/Routes.tsx (SiteEditor orphan).

## 8. THE AUDIT, AND THE CLASS IT EXPOSED — 2026-09-02

The operator opened the shipped builder and called it **"1/3 baked"**: no drag-and-drop node
creation, no way to make a new workflow, every box the same shape, no full screen, and no
connection to the other customization surfaces. A Fable-model audit of all 27 customization
surfaces followed. Its headline was worse, and more useful, than the complaint:

> **Almost everything the operator asked for was already built, published to npm, and not
> rendered.** `@bsuite/workflow-canvas` ships `WorkflowPalette`, `WorkflowToolbar` and
> `WorkflowInspector` as public exports. crm7 rendered `<WorkflowCanvas>` with no children.
> `grep -rn "WorkflowPalette|WorkflowToolbar|WorkflowInspector" crm7/src` → **0**.

### The systemic fix comes first

`scripts/check-exported-not-mounted.mjs` (bsuite#2943) — a package may not export a component
nobody mounts. **Typecheck, lint and tests were each structurally blind to this class**: an unused
import is not a type error; nothing was imported so nothing was unused; the tests asserted the
canvas got the right props and the package mock did not even declare those exports.

Self-test 20/20 · live run 3 findings, 0 false positives · positive control both directions.
BANKED = 3, which **must go to 0 in the same commit that advances the crm7 gitlink past
crm7#2337**.

### Shipped

| item | where |
|---|---|
| editor chrome mounted (palette / toolbar / inspector) | crm7#2337 |
| create-from-blank (`createWorkflowWithDraft` had no caller) | crm7#2337 |
| whole-card click — stretched-link pattern | crm7#2337 |
| full screen, with the `fullscreenchange` listener | crm7#2337 |
| step labels show `node_label`, not the slug | crm7#2336 (merged) |
| a link from `/workflows` to the entity builder | crm7#2337 |
| canvas moved to card **1 of 7** at 72vh, cap removed (was card 7, capped 560px) | crm7#2339 |
| both workflow lists became `@bsuite/data-grid`; `<ul>`/`<ol>` count 2 -> 0 | crm7#2339 |
| **a step row now centres and selects that step on the canvas** — it reached nothing before | crm7#2339 |
| **P1.1** `navigationTargets`/`onNavigate` wired; 5 targets, each asserted against a real route | crm7#2339 |
| schema builder says in English what changes elsewhere when you add a field | crm7#2339 |
| `/reports` cells made single-line; stacked-`renderCell` class 3 -> 0 | crm7#2339 |
| first tests for either workflow page — presence and wiring, not appearance | crm7#2339 |

### Outstanding, ranked by the audit

1. **P1.3** decision shape language — decision and step both render
   `cardShellClass(selected,'rounded-lg')`. Must **not** rotate the node (breaks xyflow handle
   hit-testing; the widest decision has four labelled branch ports). Needs a package publish.
   Two real API defects ride along: handles **unmount** below zoom 0.55 (React Flow requires
   `visibility`, not removal) and dynamic branch handles never call `useUpdateNodeInternals`.
2. **P1.1** one nav story — ~~`SchemaBuilder` accepts `navigationTargets`/`onNavigate` and crm7
   passes neither~~ **DONE, crm7#2339**: five targets, each asserted in the test against a route
   `App.tsx` actually registers, so it cannot silently return to zero. **Still open in this item:**
   Form Layouts is in **no sidebar at all**.
3. **P1.2** inline field create — `FieldCreateDialog` is already a public export of
   `@bsuite/schema-builder`; the layout builder sends you to another page instead.
4. **P1.4** custom pages — the renderer dumps layout as `JSON.stringify` in a `<pre>`.
5. **P2** `@bsuite/canvas-kit` extraction — schema-builder and workflow-canvas duplicate
   realtime invalidation, LOD bands, card shell, toolbar chrome, delete-key wiring and the
   opening-fit clamp. Undo/redo exists in one and not the other.
6. **P2.b** BSU `FeatureBuilder` — `LogicPanel.tsx` says a React Flow workflow canvas "remains
   future", i.e. **a fourth canvas is about to be built beside the published one**. This is the
   operator's standing complaint, in writing, before it happens.
7. The stale "cannot import" header in `crm7/src/pages/workflows/[id].tsx` (the sibling in
   `index.tsx` was fixed; this one was missed).
8. Website positioning — notes 141/142. The meta description reads *"Braden Group provides
   workforce solutions including apprenticeships, traineeships, recruitment"*, and the IA is
   `apprenticeships.tsx` / `recruitment.tsx` / `traineeships.tsx`. Structural, not copy.

Everything in:
/home/braden/Downloads/bsuite notes.docx
completed/addressed before you finish this plan.


## 9. THE OPERATOR'S 2026-09-02 DIRECTIVE — visual editing, and the readability class

Two reports arrived while §8 was being worked, and both are **larger than the rows in §8**.

### 9.1 "everything on the page is eduitable"

> "I'm sick of seeing buttons that go the full width of cards and not being able to meidify it
> visually. same with almost every aspect of the on page customization features. half baked. shows
> the intent but stopped short of being good let alone world class."

This is not a page. It is the shape of every customization surface in the estate: built to the
point where the intent is legible, then stopped before the control exists. A surface that
advertises itself as customizable and then fixes a button at 100% width is **worse** than one that
never offered.

**Status: MEASURED AND DESIGNED, 2026-09-02.** Three read-only lanes (surface inventory against the
eight visual properties; full-width button census and the mechanism behind it; what visual-editing
primitives already exist), then an adversarial design pass. Hard constraints carried into that
design, from standing rulings:

- **Reuse, do not rebuild.** `DraggableCardPage`/`CanvasCard`, the React Flow canvases, the form
  layout builder and the custom-pages widget palette already exist. A second mechanism beside any
  of them is the exact failure this project keeps repeating.
- **The round trip is the test.** Changing how something looks must not mean leaving the page for a
  settings form and navigating back to look at the result.
- **Scope must be visible** — this element / this page / everywhere — or someone makes a
  tenant-wide change by accident.
- **Decide, do not enumerate.** Do not expose all eight of width / height / alignment / spacing /
  size / colour / order / visibility because they were on a list. Say which one lost, and why.

### 9.2 The readability class — closed, crm7#2339

> "just make sure the tax is readable not like Name column in the reports."

Root cause measured, not guessed: `GridCell` renders content inside a `truncate`
(`white-space: nowrap`) wrapper in a box of exactly `rowHeight` — default **32px**, `overflow-hidden`.
**A cell can only ever show one line.** Three cells on `/reports` stacked two-to-four lines into it
and were clipped mid-glyph, which reads on screen as text overlapping text.

Fixed by making every cell single-line and giving each hidden field **its own sortable column** —
nothing was dropped. Estate-wide stacked-`renderCell` count: **3 -> 0** across the 21 files that
use `renderCell`.

The rule now lives in memory, because nothing in the type system can express it: a caller writing
`renderCell` gets no signal that block content is illegal, and typecheck, lint and tests are all
structurally blind to it.

### 9.3 The interop gap, stated plainly

The operator asked whether the schema builder ties into the workflow builder. Measured: **it does
not.** `packages/workflow-canvas/src/schemas.ts` gives **0 of 5** node kinds any entity or field
reference. `actionKey` is a free-text string with **zero readers** anywhere in crm7 — it is
documented as a marker for a Phase 3 execution bridge that does not exist.

So a workflow step cannot act on data defined in the schema builder. Item P1.1 made the two pages
reachable from each other; it did not make them *work together*, and saying otherwise would be the
same false-complete this plan exists to prevent. This is the next substantive piece of work.

#### The measurement — 18 surfaces, and what the operator can actually change

| property | surfaces where a person can set it |
|---|---|
| alignment | **0 of 18** |
| per-element size or width (the full-width buttons) | **0 of 18** |
| everything else | only ever at whole-**card** granularity |

- **270 full-width buttons**; **236 of them sit on a page the operator can already rearrange** — so
  the mouse obeys him on the card's outside edge and ignores him on its inside.
- **Nothing in the estate has ever stored a per-element property** except `colSpan` on a form field.
- **4 of the 18 surfaces write settings that nothing in the application ever renders.**

#### The three that are worse than half-built — they are inert or actively wrong

1. **Form Layout Builder** — a real drag-and-drop builder with a property panel whose output has
   **zero render sites**. `resolveFormLayout` (`formLayoutService.ts:39`) is reached only by a store
   action no component destructures. Every layout an admin builds, versions and deploys is inert.
2. **Custom Pages** — content can never be authored through the interface at all. `savePageRevision`
   (`customPageService.ts:124`) has **zero callers**; `custom_page_revisions` has **0 production
   rows**. And `CustomPageRenderer.tsx:132` prints `JSON.stringify(page.layout, null, 2)` inside a
   `<pre>` at **four live mount sites** — the Dashboard and three Contacts screens. Real users are
   being shown raw JSON today.
3. **Custom Fields and Picklists** — both render a `GripVertical` drag handle with a `cursor-grab`,
   and **neither file contains any drag-and-drop code**. Order is written once at creation and can
   never be changed. Picklists' one colour control is a free-text box in which you type an `oklch()`
   string by hand, offered when adding an option and never when editing one.

Also: **Branding is not a crm7 surface at all** — `branding.tsx:22` re-exports a component that
does `window.location.replace` to another application on mount, with no return path. It is still
the first Settings item in the sidebar.

#### The diagnosis, in one line

> The estate has **a working editor with no audience** — 750 saved layouts in production, every one
> keyed to a single `user_id` with no tenant column, so each is visible to exactly one human being —
> **and a publishable store with no renderer.**

The fix is therefore **not another builder**. It is to give elements a name, extend the editor that
already works down one level to reach them, and give the personal store a second rung so an admin's
afternoon of work reaches the team.

#### The plan, ordered, each step shipping on its own

| # | step | effort | what he can do afterwards that he cannot do now |
|---|---|---|---|
| 1 | Give every element a name — a card-key/page-key context in `GridItem`, an `elementRef()` helper, `Button` reading it. **No stored styles, no visual change at rest.** | M | In edit mode, hovering shows *"Add contact button, in the Contacts card"*. The app can finally name the thing he points at. |
| 2 | **Width, personal scope only.** `elementStyle.ts` beside `cardStyle.ts`; right-edge drag handle **plus arrow-key stepping plus a labelled numeric input**. | L | Drag the full-width *Add contact* button to a third, reload, it is still a third — or do it with the keyboard alone. |
| 3 | The rest in the same popover: alignment, space above/below, the three named sizes and five token-bound roles already in `button.tsx`. **Colour and free height deliberately absent.** | M | A narrow, centred, quiet *Export* button under a table, without leaving the page and without an engineer. |
| 4 | Card appearance becomes **per-card** instead of per-page: the stored value at `PageGridLayout.tsx:787` becomes a map keyed by `cardKey`, each card defaulting to today's page-wide value. | M | One card heavy-bordered, the card beside it light — what the existing seven controls have appeared to offer and never delivered. |
| 5 | **The organisation rung.** Widen `ui_config_overrides`; resolver reads tenant override, then personal, then default; an admin-only *"Apply to everyone in this organisation"*; a badge naming which rung a value came from. | L | An admin narrows a button once and a colleague on another machine sees it narrow — **the first time any layout change in this product has affected anyone but its author.** |
| 6 | **Stop the surfaces that lie.** Replace the JSON-dumping renderer at its four live sites; delete the prose sending people to a builder that writes a different table; wire or remove the three decorative drag handles; add a store-has-a-reader gate — **shipped as the `persistence` detector inside `scripts/check-zero-consumers.mjs` (bsuite#2944)** rather than as a separate script, because that file already owns the "built and wired to nothing" class and a second script beside it would have been the duplication this plan exists to stop. | M | No screen shows raw JSON, no handle moves nothing, and **CI fails the next time anyone ships a settings table with no reader.** |

#### Rejected, and why — so nobody re-proposes them

- **Another builder under Settings.** The estate has done this twice and both are measurably inert.
  Building a third beside two dead ones is the operator's standing complaint, executed again.
- **A `width` prop on each of the 270 call sites.** That is a developer editing code, not a person
  editing a page. The pattern was already invented and already abandoned (`ActionButton.tsx:31`).
- **Extend the free-text `custom_css` box on `tenant_branding`.** Real and sanitised, but it is
  editing code by another name, and its scope is the whole tenant — the opposite of what is needed.
- **Store overrides in `custom_pages.layout` or `form_layouts`.** Both have a publish path, and
  **building on them inherits their deadness**: 0 callers, 0 revisions, 0 render sites.
- **A fourth drag library.** `wysiwygContract.ts:24-53` already assigns each library its surface:
  React Flow owns node graphs, react-grid-layout owns the card canvas, dnd-kit owns sortable lists.

#### Risks carried forward — the first is the one that matters

1. **Step 5 is the part that will get built, look finished, and be wired to nothing.** It is the
   exact shape of every failure measured above. It does not ship without a reader and a test.
2. **Alignment has zero precedent anywhere** (0 matches across crm7 and all three builder packages)
   and no renderer to hang on — most likely to ship as a control that sets a value nobody reads.
3. **DO NOT bump `LAYOUT_EPOCH`** (currently 101). Its own docblock records that 100 -> 101
   deliberately reset every saved layout. A bump here **wipes all 750 production layouts.**
4. **autoHeight re-measure.** Any node or margin added inside a card changes the `ResizeObserver`
   measurement and can re-trigger the loop.
5. **Render hot path.** `Button` renders 2,097 times in crm7 — once per row per action column on the
   34 `EnhancedDataTable` pages. A context read plus a string build on every one is not free.
6. **Label-derived refs orphan when a label changes.** The panel must list orphans explicitly
   ("no longer on this page — remove"), never silently drop them.
