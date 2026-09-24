---
kind: record
authority: none
owner: bsuite
---

## Outcome required by Braden, 8 September 2026
Anything that can be delivered in product code must be achievable visually through the customization features, under the same permissions. Forms, records, pages, tables, fields, approvals, signatures, notices, follow-ups and escalations must all connect through visually editable, executable workflows. The current tools are disparate, lacklustre and half-complete; implementing another isolated form does not satisfy this requirement.

The **Record of Discussion is a formal disciplinary discussion**, not a variation to a training contract. Use it and the General Site Visit form as acceptance journeys. The attachment bearing the variation filename contains discussion text; that is a source-file mismatch, not a domain equivalence.

## Evidence and current position
- Latest supplied notes: 423 text paragraphs, 104 embedded images; September 6 comparison adds 21 paragraphs and replaces one widget-centre wording. New reports include unusable contextual placements, create/view/edit mismatch, workflow creation failure, poor schema/canvas UX and inability to author these forms visually.
- Current feature index: **661 rows: 618 not-evaluated, 40 in-progress, 3 approved**. These are recorded verdicts, not a fresh live audit. Existing #3198 owns that index verification debt.
- Existing proposed consolidation: `docs/20260903-visual-authoring-consolidation-decision-v1.00D.md`; current follow-up: `docs/audits/20260904-customization-authoring-genuine-validation-v1.00W.md`. Recheck their dated claims before implementation; retain the capable parts and canonical stores. Do not launch a competing builder or silently delete a feature.
- Representative current seams: `crm7/src/lib/page-builder/EntityTableWidget.tsx`, `crm7/src/lib/authoring/fk-relationships.ts`, `crm7/src/components/platform/pageGridLayoutAdapter.tsx`, `crm7/src/lib/workflows/workflowDefinitionService.ts`, `packages/workflow-canvas/src/service.ts`.

## Deliverable: one product experience, composable internals
Start from the record/page being used, or the customization workspace when creating something new. A consistent inspector and vocabulary must expose the following capabilities; existing specialist views can remain where useful, but navigation must preserve context and saved work:

| Capability | Required visual operation | Workflow connection |
|---|---|---|
| Records and fields | Create/reuse entities, typed fields, validation, relationships, defaults and calculated values | Record created/changed, read/write fields, pass typed records |
| Forms | Sections, repeatable actions, conditional fields, attachments, declarations and signature blocks | Start/complete a form, route its values and documents |
| Pages and widgets | Add, bind, configure, resize, reorder and remove in place | Start a process or show the current process/tasks/history |
| Lists and reports | Select related rows, filter/sort/group, choose columns, edit and bulk-update permitted fields | Triggers/actions on selected records and report outcomes |
| Appearance | Font, size, weight, italic, headings, spacing, roles, borders, light/dark and responsive layout | Versioned customization publishing and application |
| Permissions | View/edit/act rights, defaults, delegated roles, tenant/subtenant overrides and reset | Human task assignment, approval authority and escalation |
| Process design | Steps, conditions, branches, loops, delays, recurrence, hand-offs and reusable subflows | Typed inputs/outputs; real execution, not just a diagram |
| Delivery | Preview, validate, publish, revise, compare and restore a version | Activation state, run version, safe changes to active processes |

## Acceptance journeys
- [ ] A tenant admin visually recreates the supplied disciplinary Record of Discussion, changes a field and conditional HR branch, publishes, completes, signs, assigns actions, schedules follow-up and sees the resulting restricted HR record and process history—without code, JSON, SQL or an agent completing a hidden step.
- [ ] The same primitives create the General Site Visit form, bind apprentice/host/placement/training plan, record findings and signatures, and create recurring follow-up work. No duplicate person/host data is re-entered.
- [ ] From a person's page, add a placements-history widget scoped to that person, select columns, save and reload; add a workflow action beside it. Repeat with a host and training contract and verify no unrelated records appear.
- [ ] Map **every feature-index row** to its visual configuration entry point, workflow relationship/action/trigger, permission scope and runtime evidence. State non-applicable infrastructure rows explicitly with reasons; do not convert all rows to workflow implementations merely because a graph exists.
- [ ] All six app consumers are included. Shared capabilities use published `@bsuite/*` packages; app-specific capabilities retain their owning app and appear through entitlement-aware links.
- [ ] Create, view and edit expose the same applicable record fields; derived/system fields are visibly read-only with a route to their true owner, not silently omitted.
- [ ] Draft/save/reload/publish/version restoration work; denied writes and interrupted saves retain work; concurrent edits report conflicts. Runtime rechecks authority and tenant/host/caseload scope, not only editor visibility.
- [ ] Forms, workflow nodes, field selectors and preview speak the user's nouns. Keyboard operation, four responsive widths and both themes pass; count actions and remove avoidable trips.
- [ ] Workflow runs persist version, state, linked records, assigned tasks and failures; retries cannot duplicate notices, signatures, HR cases or assignments.

## Sequence and ownership
Accountable role: visual-authoring product/engineering lead, to be claimed explicitly by the implementation lane; not an invented assignee. First fix persistence and record-scope foundations, then compose form + workflow primitives, then prove the two operator journeys, then sweep all consumers and indexed capabilities. Child issues are linked below after creation.

Reuse and reconcile existing work: #3198 (feature coverage), #3111 (delivery ownership), #3104/#3110/#3155 (appearance), #2334 (grid behavior), GaryOcean428/crm7#2488 / GaryOcean428/crm7#2489 (columns/widget centre), GaryOcean428/crm7#2450 / GaryOcean428/crm7#2451 / GaryOcean428/crm7#2459 / GaryOcean428/crm7#2460 (form/page/schema authoring), GaryOcean428/crm7#2302 (shared workflow package), GaryOcean428/crm7#2062 / GaryOcean428/crm7#1477 (data workspace). These remain their canonical tickets; this programme integrates their user outcomes.

## Closure evidence
One linked evidence pack per journey and consumer: deployed SHA, sign-in role/tenant, actual entry route, interaction trace, screenshots, saved/reloaded records and workflow-run IDs (redacted where appropriate), failed-path proof and sibling denominator. Completion requires actual use, not package publication or a screenshot of an empty canvas. Track issues in GitHub; do not revive the retired plan dashboard.

## Remediation work packages
- [[P1][workflow] Draft creation writes ai_context=NULL against live NOT NULL schema and can leave a definition without a draft](https://github.com/GaryOcean428/bsuite/issues/3205)
- [[P1][records] Make create, detail and edit expose one canonical field set across all record surfaces](https://github.com/GaryOcean428/bsuite/issues/3206)
- [[P1][customization] Visually bind widgets, selectors and workflow steps to the current person, host or contract—including related collections](https://github.com/GaryOcean428/bsuite/issues/3207)
- [[P1][visual-authoring] Build disciplinary discussions and general site visits visually, then run signatures, follow-ups and HR escalation](https://github.com/GaryOcean428/bsuite/issues/3208)
- [[P1][workflow] Connect every visual capability to typed executable workflows with human tasks, durable state and in-context history](https://github.com/GaryOcean428/bsuite/issues/3209)
- [[P1][Jodie] File attachment reports success but forwards only filenames; complete training-plan import through the real authoring workflow](https://github.com/GaryOcean428/crm7/issues/2586)
- [[P1][site-visits] Verify and complete schedule → form → signatures → findings → follow-up journey after the latest fixes](https://github.com/GaryOcean428/crm7/issues/2587)
- [[P1][integrations] Complete configurable Google/Microsoft calendar sync with conflict and deletion review](https://github.com/GaryOcean428/bsuite/issues/3210)
- [[P1][integrations] Link BSuite bookings, interviews, portal visits and training milestones to calendars and workflows](https://github.com/GaryOcean428/bsuite/issues/3211)
- [[P1][integrations] Deliver visual Maps/travel planning and consent-aware workforce tracking connected to workflows](https://github.com/GaryOcean428/bsuite/issues/3212)

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.


## Operator scope addition — inbound SMS (8 September)

Priority live defect: https://github.com/GaryOcean428/crm7/issues/2594. Mobile Message inbound replies currently enter usage storage while CRM reads communications. Deliver reliable full-message capture, historical recovery, inbox/record conversations, inline reply and visually configurable workflow events. Independent of any deal. Added as first eligible queued remediation after existing Hermes work; 333 discrete prompts now pass release-contract validation.
