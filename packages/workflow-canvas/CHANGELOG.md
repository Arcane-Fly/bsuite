# `@bsuite/workflow-canvas` Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.3] (unreleased; 0.3.3-next.N on development) — 2026-09-26 — a refused publish or copy is shown, not thrown at the page

### Fixed

- `WorkflowToolbar` called `controller.publish()` and `controller.duplicateToTenant()`
  (React Query `mutateAsync`) without handling the rejection. The controller's
  `onError` already showed the reason, but the same error also escaped as an
  unhandled page error on every refused publish (seen on d.crm: "Nothing leads to
  New step…"). Both now catch after `onError` has reported it. (bsuite#3208 C6, D6)

---

## [0.3.2] — 2026-09-25 — a published workflow with no draft is no longer silently editable

### Fixed

- **Editing a published workflow that had no draft looked saved and then vanished.**
  The canvas seeded the published graph, reported the editor as writable, and
  accepted local changes. Flush then dropped them because the published seed
  never sets a save target, `isDirty` flipped back to false, and the toolbar
  said "All changes saved". The controller now exposes `needsDraft` for that
  state, treats it as read-only, and refuses `commit` / `addNode` /
  `updateNodeData` / `scheduleSave` until `createDraft()` creates a draft to
  write to. The inspector says to create a draft instead of claiming the
  workflow belongs to another organisation.
- **Publishing accepted a step that nothing leads to.** A run starts at the
  Start terminator when the graph has one, and otherwise at every node with
  nothing coming in. A step off to the side was still published, and its
  action never ran. Publish now refuses that graph, names the step, and
  writes nothing until it is connected from Start or removed. A workflow
  that is a single step, with no Start or End, still publishes. A swimlane
  is a container and is never treated as a step that failed to connect.

## [0.3.1] — 2026-09-25 — an edit before the draft loads can no longer overwrite it

### Fixed

- **Reopening a workflow and clicking the palette at once overwrote the saved
  draft.** Measured on crm7 production: a 4-node, 1-edge draft, reopened and
  clicked as soon as the palette rendered, was saved as 1 node and 0 edges.
  The draft read was correct. The palette accepted the click while the local
  graph was still the empty placeholder, `scheduleSave` queued that graph with
  no target version, the draft then seeded, and the timer's `flush` read the
  newly seeded version at fire time and wrote the pre-load graph into it.
  - A pending save now carries the version it was made against, taken when it
    is scheduled; `flush` and the unmount flush refuse a save whose version is
    missing or no longer the one on screen. Both seed effects drop any pending
    save, which by definition predates the graph just read.
  - The controller is not editable until the saved graph is on screen:
    `isGraphReady` (new) is false until the draft — or, with no draft, the
    published version, or neither exists — has seeded, and `isReadOnly` is
    true meanwhile, so the palette renders nothing. `commit`, the drag-start
    path, undo and redo refuse; `addNode` and "Create draft" throw rather than
    act on the placeholder. A published version that fails to load does not
    lock the editor for ever.

## [0.3.0-rc.4] — 2026-09-10 — ai_context NOT NULL, orphan-safe duplicate (bsuite-3205)

**Version choice.** Bugfix on top of `0.3.0-rc.3`. Not published to npm as part of
this change — crm7 still pins `0.3.0-rc.2`; repinning consumers is the separate,
later step `docs/20260824-preview-canary-publishing-standard-v1.00A.md` governs.

### Fixed

- **`createDraftVersion` sent an explicit `ai_context: null`.**
  `workflow_definition_versions.ai_context` is `jsonb NOT NULL DEFAULT
  '{}'::jsonb`; a column default only fires when the insert OMITS the key,
  and `args.aiContext ?? null` turned "the caller supplied nothing" into
  exactly the explicit `null` that overrides it. Reachable from the shipped
  canvas: `useWorkflowController.ts`'s `createDraftMutation` calls this with
  no `aiContext` on every "Create draft" click from `WorkflowCanvasInner.tsx`
  (`editable && publishedLock`). Now `args.aiContext ?? {}`.
- **`duplicateWorkflowDefinition` had the same `?? null` and no cleanup at
  all.** Its `aiContext: sourceVersion?.ai_context ?? null` carried the same
  defect (latent — `duplicateToTenant`/this function has no crm7 caller
  today) and, unlike `createDraftVersion`, a failed draft insert left the
  just-created definition row permanently orphaned: two separate
  supabase-js REST calls, no RPC, no transaction. The draft insert is now
  wrapped in try/catch with a compensating delete of the definition on
  failure; if the delete itself also fails, the thrown error names the
  orphaned definition id explicitly instead of hiding it. Ported from
  crm7#2602/#2605's `createWorkflowWithDraft`, the proven-correct reference
  for this exact shape.

### Consumer notes

- No API change. `createDraftVersion` and `duplicateWorkflowDefinition` keep
  their existing signatures; only the value written to `ai_context` and the
  duplicate path's failure behaviour changed.

---

## [0.3.0-rc.3] — 2026-09-09 — reserved chrome regions (crm7#2604)

Layout follow-up named from 0.3.0's known gap (`canvas-overlays-collide-narrow`).

**Version choice.** Registry at this commit: `latest` = `0.2.3`, `next` = `0.3.0-rc.2`. Local source already carried an unreleased `0.3.0` promotion of rc.2 with **no layout change**. This is `0.3.0-rc.3` on `next` so crm7 can pin it without claiming a `0.3.0` latest that is not on the registry, and without rewriting that 0.3.0 promotion entry. Semver: rc.3 < 0.3.0; when 0.3.0 latest does publish it must include these src changes or skip to 0.3.1.

### Fixed

- **Surface is not optional.** `WorkflowToolbar` / `WorkflowPalette` / `WorkflowInspector` always apply `bg-card`, `border-border`, padding, flex/width. `className` is extras only. `className ?? fullDefault` discarded the card when crm7 passed placement-only `absolute left-2 top-2`.
- **Regions, not overlay.** `WorkflowCanvas` lays out `toolbar` / `palette` / `diagram` / `inspector` as reserved cells. `<ReactFlow>` (Background, Controls, MiniMap) lives only in the diagram cell, so Fit View and edge hits see the remaining box. MiniMap stays `bottom-right` of *that* pane. Inspector column collapses when the inspector returns null (`empty:hidden`).
- **Container width, not viewport.** Compact chip-row palette below 800px of *canvas* (1024 viewport + expanded nav). Three columns at 1220/1440 expanded (~884px / ~1184px canvas). Tokens stay `--role-*` / `bg-card`; Braden does not pick up D2C glow (`dark:shadow-[var(--glow-card,none)]` already no-ops there).
- **Nested width (SEND_BACK on b92517dff).** Region `w-56 p-2` wrapping palette `w-56` (and inspector `w-72` in `w-72 p-2`) overflowed 16px (measured 224/240 and 288/304). The region now owns the column width with no padding; slotted chrome is `w-full min-w-0` and keeps `bg-card` padding on the card. Standalone chrome still uses `w-56`/`w-72`.
- **Draft cache is the live graph owner.** `scheduleSave` / `saveMutation` write the same graph to `workflow-draft` AND the draft row in `workflow-versions`, and roll both back on save error. Published rows in the list are not touched. Pane click clears selection so the inspector slot can collapse. Toolbar accepts `children` for host controls (fullscreen) in the reserved row.
- **Same-tick add+select** no longer `replaceGraph`s the pre-add list: `commit` updates `graphRef` immediately and `addNode` selects the new node.
- **Overlapped saves:** an older in-flight `onSuccess`/`onError` does not overwrite a newer `scheduleSave` cache write; saves are chained so server order is A then B.

### Not chosen

- `cn()` / `tailwind-merge` — restores surface, still an overlay, still steals START→END, still Fit View on the full box. Package `dependencies` stay `{}`.
- xyflow `<Panel>` — documented as overlay in screen space; does not reserve space.
- Raising `z-index` — the missing layout is a grid, not a stacking context.

### Consumer notes

- Stop passing positioning-only `className`s. Chrome no longer self-positions.
- Children API is unchanged: tagged chrome is sorted into slots (Fragments flattened); `FocusNodeBridge` stays in the diagram cell. A post-publish banner can set `data-workflow-region="toolbar"`.
- Backward compatible: omitting `className` still renders a card; extras compose rather than replace.

---

## [0.3.0] — 2026-09-09 — the inspector authors what the engine executes (crm7#2594 C6, crm7#2603)

Promotes `0.3.0-rc.2` (dist-tag `next`, consumed and verified by crm7#2608 on d.crm.crm7.app)
to `latest`. No code change from rc.2; this entry records what the two rc commits shipped.

### Added — terminator role and step actions are visual, not SQL-only (a61e20041, rc.1)

- `WorkflowInspector` authors a **terminator's role** (`start` / `end`) and a **step's action**
  from a typed vocabulary (`WORKFLOW_ACTION_VOCABULARY`: `notify_internal`, `create_task`,
  `send_email`, `send_sms`, `wait`, …) with per-kind fields (message, priority, assignee,
  template, delay). What the inspector writes to `node.data.action` / `node.data.actionKey` is
  exactly what `workflow_run_advance` enqueues onto `r7_automation_queue` — the visual and the
  executable representation are one object. Closes the parity gap in crm7#2603.
- `schemas.ts` / `types.ts` carry `action` and `role` on node data; `actionVocabulary.ts` is the
  single vocabulary both the picker and consumers read.

### Fixed — rc.2 (b6ec7769b)

- **`commitActionPatch` no longer drops untouched fields.** Editing one action field (say the
  priority) previously rebuilt the whole `action` object from the visible inputs and lost every
  key the form did not render (`ext`, consumer-added metadata). The patch is now spread over the
  existing object; unknown keys survive a round trip. (CODEX_ACCOUNTABILITY_20260909_INITIAL
  correction 1.)
- **Action availability is gated by subject context.** New `WorkflowActionContext`
  (`subjectTable`, `hasCandidate`, `hasPipelineEntry`) and vocabulary `requires` entries;
  `unmetActionRequirement()` / `describeUnmetRequirement()` disable and explain an action that
  the run's subject cannot satisfy (a candidate-only action on an `sms.inbound` trigger). A
  consumer that passes no `actionContext` gets the old ungated behaviour.
- **Real selectors instead of free text.** `assigneeOptions` (`WorkflowAssigneeOption[]`) and
  `emailTemplateOptions` (`WorkflowEmailTemplateOption[]`) props replace the free-text assignee
  and template inputs, per the one-shot rule (§7: no free text where a canonical entity exists).

### Consumer notes

- crm7 wires `actionContext` from the trigger subject (`sms.*` → `communications`, `placement.*`
  → `placements`; candidate/pipeline flags only for those subjects), `assigneeOptions` from tenant
  users and `emailTemplateOptions` from the email service (crm7#2608).
- Known, filed, not in this release: the inspector overlay collides with the palette and the
  Full-screen control under ~760px canvas width and does not close on pane click (crm7#2604;
  ledger `canvas-overlays-collide-narrow`) — a layout follow-up (rc.3 / 0.3.1).

---

## [0.2.0] — 2026-09-01 — Phase 2: editable, versioned, and talking to the right columns

Phase 2 of `docs/plans/20260901-workflow-canvas-implementation-v1.00A.md`.

### Fixed — three contract breaks between this package and its own tables

Every one of these is a runtime PostgREST failure, and all 80 of the 0.1.0 tests passed the whole
time, because all of them stub the Supabase client. A stub answers what it is told to answer; it
cannot know the database would have refused the query.

- **`label` is not a column.** `workflow_definitions` declares `name`. 0.1.0 ordered
  `listWorkflowDefinitions` by `label`, SET `label` in the rename mutation, and inserted it from
  `createWorkflowDefinition`. Each returned `42703 column workflow_definitions.label does not
  exist`, so **listing, renaming and creating a workflow all failed**. `WorkflowDefinitionRow.label`
  is gone and `rename()` now takes a `name`.
- **`published_at` was never created.** `publishVersion()` SETs it and the merged apprentice seed
  INSERTs it, but `20261103000000` declares `published_by` and no `published_at` — so **publishing
  failed, and the seed could never land the template Phase 1 exists to ship**. Added by
  `supabase/migrations/20261105000000_workflow_definition_versions_published_at.sql` (a new version,
  not an edit to the merged one: the ledger is keyed on version alone across eight applier scopes
  and a re-used version is silently skipped — as this file itself then demonstrated, having been
  authored at `20261104000000` and renumbered when business-suite-unified#1085 took that version an
  hour later).
- **Platform templates were unrepresentable and unreachable.** `tenant_id` is NULLABLE and a NULL is
  a platform template — the entire subject of "Duplicate to my tenant". 0.1.0 typed it `string` and
  filtered the list with `.eq('tenant_id', …)`, which excludes every NULL row, so the feature had
  nothing to act on. `listWorkflowDefinitions` now returns the tenant's workflows **and** the
  templates in one request, which is exactly what the SELECT policy already admits.

`WorkflowDefinitionRow` also gained `key`, `app_scope`, `is_system` and `created_by`, and
`WorkflowDefinitionVersionRow` gained `trigger_config`, `published_by` and `created_by` — all
declared by the migration and all previously missing here. `createWorkflowDefinition` now takes an
explicit `CreateWorkflowDefinitionArgs` instead of an `Omit<Row, …>`, which had been requiring
`created_by` from the caller and permitting `label`.

### Added

- **`tableContract.test.ts` — the gate that would have caught all three.** It parses the columns out
  of the migration FILES and asserts the service names nothing else. It strips SQL comments first
  (140 lines of header prose in `20261103000000` discuss `label` while explaining it), it fails when
  a migration is missing rather than passing vacuously, and it carries a control assertion on the
  parsed column count so a parser that matched nothing cannot report clean.
- **`WorkflowPalette`** — add a step, decision, handoff or terminator. Built FROM `registry.palette`,
  so a kind added through `registry.extend()` appears without touching the palette; containers are
  excluded, because a lane is the frame of the diagram rather than a step in it. Click places the
  node at the centre of the current viewport (projected through `screenToFlowPosition`, so it lands
  where the user is looking rather than at the graph origin); no drag is required, so it works from a
  keyboard.
- **`WorkflowInspector`** — inline rename, notes, and delete for the selected node. The field holds a
  local draft and commits on blur or Enter: `updateNodeData` checkpoints, so a per-keystroke commit
  would fill the 50-slot undo stack with one word. Deleting a lane asks first, because the controller
  removes its children with it.
- **`WorkflowToolbar`** — undo, redo, tidy, a live `aria-live` save-state indicator, and
  Draft → Publish. Publish names the version it will publish, and is disabled while an edit is still
  unsaved: publishing mid-debounce freezes a version whose last edits are still in a timer.
- **`duplicateWorkflowDefinition` / `controller.duplicateToTenant`** — "Copy to my organisation".
  The copy lands as a DRAFT with `current_published_version_id` NULL, so nothing downstream picks it
  up until a person publishes it; the source graph is read THROUGH the published pointer, never as
  `max(version)`, so copying a template while somebody has a draft open does not copy their
  half-finished work; the rationale notes travel with the graph; and a second copy bumps the key
  rather than surfacing a 23505 the user cannot act on.
- **`controller.isPlatformTemplate` / `controller.isReadOnly`** — computed from the loaded row rather
  than passed in, so a consumer cannot forget them. The palette and the destructive controls render
  nothing when the workflow belongs to another tenant, instead of accepting edits RLS would refuse.

### Not in this release

Execution (Phase 3 — generalises conduit's `r7_automation_queue` → pg_cron → edge function rather
than growing a second queue) and the Jodie authoring tools (Phase 4).

**crm7 still cannot import this package.** Apps are submodules that Vercel builds standalone with no
parent directory, so they resolve the published tarball, and `@bsuite/workflow-canvas` is not on npm
(404, 2026-09-01). It cannot be published yet either: it peer-depends on `@bsuite/schema-builder`
>= 1.9.0 for the `/xyflow` and `/auto-layout` subpaths, and npm's newest schema-builder is 1.8.0.
Publishing schema-builder 1.9.0 and then this package is what unblocks the crm7 canvas; until then
crm7's `/workflows/:id` reads the same graph and renders the process as a lane-by-lane outline.

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

### Two things this release deliberately does NOT do

- **`sideEffects` is an array, not `false`.** `WorkflowCanvas.tsx` imports
  `@xyflow/react/dist/style.css`, and a bare import of a module with no used exports is exactly what
  `sideEffects: false` licenses a bundler to remove — the canvas would ship unstyled with nothing in
  the build log to say why. The array keeps tree-shaking everywhere else and protects the one file
  that genuinely has a side effect.
- **The viewport is saved only when a person moved it.** `OnMoveEnd` is typed
  `(event: MouseEvent | TouchEvent | null, viewport)` and the `null` marks a PROGRAMMATIC move.
  `fitView` fires one on mount, so without that guard merely opening a workflow would write the
  fitted viewport back — a database write on every page load, by every viewer, last-one-wins on a
  shared draft, for a camera position nobody chose.

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
