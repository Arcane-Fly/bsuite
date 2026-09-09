# [P1][workflow] Connect every visual capability to typed executable workflows with human tasks, durable state and in-context history

https://github.com/GaryOcean428/bsuite/issues/3209

Snapshot updatedAt: 2026-09-08T05:23:40Z. Open at capture; re-read live.

## Operator requirement
8 September clarification: **all linked through workflows**. Forms, record edits, widgets, reports, approvals, signatures, messaging, recurrence and HR escalation cannot remain disconnected builders and services. A Lucid-like diagram is useful only when its configured steps execute and their results are visible at the originating record.

## Evidence and existing work to reconcile
The latest notes say workflow creation fails and the canvas is barren. `packages/workflow-canvas` provides graph/service/controller infrastructure; CRM7 also has `src/lib/workflows/workflowDefinitionService.ts`. Existing #3198 tracks the 661-feature coverage gap; crm7#2302 tracks shared package adoption. These show partial foundations, not absence of all workflow code. Take a fresh live run/activation and caller inventory before claiming the engine is unused: historical zero-run counts must not be repeated as current facts.

## Implementation contract
One catalog connects the product capability, visual editor, typed inputs/outputs, trigger/action, authority, owning app and executor. Canvas nodes configure this catalog. The executor validates the same contract server-side and stores the precise published version. Reuse the existing authoritative engine/bridge after checking the September 1 consolidation record; no second workflow engine.

Provide:
- searchable steps in business language, forms/records/actions usable as typed nodes;
- explicit start/end, decisions/conditions, loops, delays, scheduled/recurring work, subflows and role hand-offs;
- field/record/relationship mapping with selectors, validation, sample preview and helpful errors;
- assignment, due date, approval, signature and escalation nodes, plus authorized integration actions;
- run history in the form/record and canvas: active step, assignee, next action, failures and recovery;
- draft/preview/publish/activate/version/restore with impact preview for running instances;
- useful fit/zoom/layout/connect/reconnect, undo/redo, keyboard navigation, responsive controls and substantial-graph performance evidence.

## Acceptance
- [ ] Reconcile all 661 feature rows against the live capability catalog and workflow links. Keep an explicit disposition and owner for infrastructure/non-applicable rows; every product capability has its visual configuration and process relationship described.
- [ ] Run the two operator form journeys and a placement → inspection → action closure journey with persisted state and records; do not accept a painted graph or a mock executor.
- [ ] Show failed, waiting, approved, cancelled and completed states from the originating record without losing context; links land on the relevant task/step.
- [ ] Typed connections reject incompatible data visually and on the server. No arbitrary SQL/script execution or caller-controlled tenant/role authority.
- [ ] Duplicate triggers, retried webhooks and concurrent workers cannot duplicate money movements, notices, signatures or HR cases. Each external side effect has an idempotency/reconciliation strategy and visible delivery status.
- [ ] A version change does not silently mutate active or signed historical runs; restart/resume/cancel behavior is explicit and audited.
- [ ] Cross-app transitions preserve tenant/entitlement and return context using canonical SSO, not shared-cookie shortcuts.
- [ ] Tests exercise exact handlers and persistence paths, authorization denial, unavailable integration, overdue/holiday scheduling and partial failure. Remove a node executor or disconnect its caller and the integration test must fail.
- [ ] Published package versions resolve in actual consumers; deployed d.* and approved production-use evidence identifies run/version IDs and the exact SHAs.

Owner role: workflow integration lead. Depends on https://github.com/GaryOcean428/bsuite/issues/3205 and https://github.com/GaryOcean428/bsuite/issues/3207; parent https://github.com/GaryOcean428/bsuite/issues/3204. Supporting canonical work: #3198, GaryOcean428/crm7#2302 / GaryOcean428/crm7#2581 / GaryOcean428/crm7#2428 / GaryOcean428/crm7#2560, GaryOcean428/business-suite-unified#1162, R80.4#231. Workflow catalog must link those implementations rather than duplicate them.

Primary-source guidance: React Flow's computing-flows documentation distinguishes flow data/connection behavior from what an application implements around it: https://reactflow.dev/learn/advanced-use/computing-flows . BSuite must prove durable business execution itself.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.

