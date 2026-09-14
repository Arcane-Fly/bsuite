---
kind: standard
authority: engineering
owner: bsuite
evidence:
  - scripts/check-plan-currency-markers.mjs
  - scripts/check-doc-classification.mjs
---

# Customization capability register and documentation contract

Date: 8 September 2026. Status: Working requirements and remediation map; **not a claim of implementation or live usability**.

Operator direction: anything deliverable in product code must be visually achievable through customization under the appropriate authority, and **all linked through workflows**. All customization features belong in the project `docs/` and `docs/plans/`, referencing and improving existing specifications. A formal disciplinary Record of Discussion is not a training-contract variation.

This register makes the existing specifications navigable and adds missing cross-feature acceptance requirements. It does not replace their detailed design or authorize arbitrary database/infrastructure changes through an end-user screen. Capable existing builders and canonical services must be connected and completed. One shared experience need not be one giant component.

## Capability map

Each row is required scope. Implementation status remains **unverified/partial until the owning issue carries fresh evidence**. These 20 capability families are an organizing map, not a census claiming exactly 20 controls or complete route coverage. The 661-row feature index and independent route/action/form/package inventories must reconcile to it under bsuite#3198.

| ID | Capability | Required visual behavior and workflow connection | Delivery issue | Existing specification |
|---|---|---|---|---|
| C01 | Unified authoring entry | Edit the record/page in place; common palette and inspector; add existing, create new or choose a near-match without losing work. | [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C02 | Entities and typed fields | Create/reuse entity types and fields, labels, help, defaults, validation and permissions. Same contract feeds create/view/edit and workflow inputs. | [bsuite#3206](https://github.com/GaryOcean428/bsuite/issues/3206) | [Schema UX remediation](20260822-schema-builder-ux-remediation-spec-v1.00D.md) |
| C03 | Relationships and context | Choose direct, reverse collection and approved junction relationships in business language; bind current person/host/contract; preview, paginate and scope securely. | [bsuite#3207](https://github.com/GaryOcean428/bsuite/issues/3207) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C04 | Page and widget canvas | Add/configure/reorder/resize/remove widgets; configure columns, record actions and related collections; save/reload layout and context across apps. | [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) | [WYSIWYG and schema master plan](plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) |
| C05 | Forms and documents | Arrange sections, long answers, conditional/repeating fields, attachments and signatures; draft, preview and publish; retain completed versions. | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208) | [WYSIWYG and schema master plan](plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) |
| C06 | Record mode parity | Applicable fields work in create, view, edit, tables and workflow forms; derived fields explain ownership; empty optional fields remain editable later. | [bsuite#3206](https://github.com/GaryOcean428/bsuite/issues/3206) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C07 | Lists, data workspace and reports | Select/filter/sort/group columns, related records, saved views, accessible row actions and exports; apply approved bulk operations with preview and recovery. | [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) | [Reporting and bulk data](plans/20260806-reporting-bulk-data-tiered-schema-program-v1.00D.md) |
| C08 | Appearance and branding | Edit fonts, sizes, weight, emphasis, headings, spacing, borders and semantic color roles; platform/app/tenant inheritance, preview and reset must be explicit. | [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C09 | Permissions and delegation | Visually express allowed visibility/actions/assignees within existing authority; server enforces tenant, host, caseload, role and entitlement. No SQL input required. | [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) | [Feature builder](plans/20260811-feature-builder-world-class-refined-v1.00W.md) |
| C10 | Workflow design | Typed searchable steps, decisions, loops, delays, recurrence, handoffs and subflows with clear mapping, undo, validation, preview and publishing. | [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) | [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md) |
| C11 | Workflow runtime and recovery | Trigger actual canonical operations; durable run/version/task state, idempotent side effects, failure/retry/cancellation and in-context history. | [bsuite#3209](https://github.com/GaryOcean428/bsuite/issues/3209) | [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md) |
| C12 | Approvals and signatures | Configure authorized participants and approvals; pending/refused/cancelled states; exact signed version; restricted records and audit trail. | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C13 | Disciplinary discussion | Visually recreate the supplied Record of Discussion, record response/actions, signatures, follow-up and controlled HR escalation. Distinct from contract variation. | [bsuite#3208](https://github.com/GaryOcean428/bsuite/issues/3208) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C14 | General site visits | Recreate full supplied questionnaire; schedule and complete with linked person/host/placement, findings, signatures, actions and recurring follow-up. | [crm7#2587](https://github.com/GaryOcean428/crm7/issues/2587) | [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md) |
| C15 | Jodie and visual import parity | Upload real bytes, extract with provenance, review/correct and save through the same canonical authoring/workflow services; every operation also has a visual path. | [crm7#2586](https://github.com/GaryOcean428/crm7/issues/2586) | [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md) |
| C16 | Versioning and publication | Draft/save/reload/compare/publish/restore; preserve signed history and active run versions; handle concurrent edits and failed saves without losing work. | [bsuite#3205](https://github.com/GaryOcean428/bsuite/issues/3205) | [WYSIWYG and schema master plan](plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md) |
| C17 | Calendar synchronization | Choose calendars/direction; preserve independent secondary events; pause conflicts/deletions for review; workflow nodes share policy. | [bsuite#3210](https://github.com/GaryOcean428/bsuite/issues/3210) | [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md) |
| C18 | Bookings and portal journeys | Visually configure availability and booking lifecycle for interviews/visits/training; calendar linkage, reminders and workflow outcomes. | [bsuite#3211](https://github.com/GaryOcean428/bsuite/issues/3211) | [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md) |
| C19 | Maps and workforce location | Configure travel planning and separately consented tracking, delegated scope and retention; visible accuracy/status; authorized workflow events. | [bsuite#3212](https://github.com/GaryOcean428/bsuite/issues/3212) | [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md) |
| C20 | Configuration reuse across apps | One canonical capability definition with entitlement-aware consumers, shared published packages, permission-safe previews and automatic return with work intact. | [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204) | [Shared schema package](adr/ADR-0008-schema-builder-consolidation.md) |

## Required documentation for every capability

The implementer updates the applicable existing specification and this register with: user purpose and nouns; actual visual entry route and role; controls and defaults; an illustrated worked example; canonical data and relationship owner; permission and tenant/delegation boundaries; save/reload/version behavior; workflow inputs, triggers, actions and outputs; failure/retry/cancellation; keyboard and responsive use; app/consumer applicability; owning issue; deployed evidence and verification date. Record proposed, source-confirmed, deployed-tested and accepted separately.

For customization, complete the literal test: **can the operator make the same change visually, then use it through the connected workflow without code, JSON, SQL or an agent doing a hidden step?** Also ask: **does finishing this task require leaving the page?** Prefer inline creation; any necessary departure returns automatically to the same state with the new detail applied.

**Acceptance correction, 14 September 2026:** E2E, 360-degree review and DoD already
require the complete customization chain. Checking default theme consistency or
page editing alone misses C08; the operator must not need to restate platform,
Developer Portal, app, enterprise tenant and sub-organisation inheritance. For
each changed capability, trace its actual authoring entry, precedence and
permission scope through save, publish where applicable, the affected consumers,
reload, explicit override and reset to inherited values. Include page/widget and
personal overrides, denied writes, tenant/app isolation and preserved drafts.
Verify the current implementation rather than assuming every layer exists or
works. Braden Corporate remains separate from enterprise white-label overrides.
Canonical owners remain [bsuite#3204](https://github.com/GaryOcean428/bsuite/issues/3204),
[bsuite#3104](https://github.com/GaryOcean428/bsuite/issues/3104) and
[BSU#1160](https://github.com/GaryOcean428/business-suite-unified/issues/1160).
These checks are open until their linked deployed evidence passes.

## Specifications to read and improve

- [WYSIWYG and schema master plan](plans/20260501-universal-wysiwyg-schema-ux-v1.00W.md): Core visual edit mode, inspector, relationships, defaults and persistence. September 2 checkbox reconciliation is dated evidence, not present-day acceptance.
- [Approved in-context authoring](plans/20260703-unified-authoring-surface-plan-v1.03A.md): Add-or-create-or-warn, bind existing entities, AI parity, branding inheritance. Preserve the approved user outcome; verify current permission policy before exposing writes.
- [Workflow canvas implementation](plans/20260901-workflow-canvas-implementation-v1.00A.md): Read the anti-rebuild list and existing graph/executor before changing architecture. Landed phases do not prove the new full-capability requirement is met.
- [Visual consolidation decision](20260903-visual-authoring-consolidation-decision-v1.00D.md): Proposed choice of strongest internals. Its September 3 zero-writer census was superseded in part by September 4; do not treat all builders as absent.
- [Genuine customization validation](audits/20260904-customization-authoring-genuine-validation-v1.00W.md): Records the CRM7 writer and cross-consumer gaps; fresh consumer verification remains required.
- [Schema UX remediation](20260822-schema-builder-ux-remediation-spec-v1.00D.md): Detailed relationship, zoom, dialog, contrast and persistence behavior. Historical failure counts require reproduction.
- [Feature builder](plans/20260811-feature-builder-world-class-refined-v1.00W.md): Entity/policy visual vocabulary, preview/rollback, canonical registration; client graph validation is never a replacement for server authorization.
- [Reporting and bulk data](plans/20260806-reporting-bulk-data-tiered-schema-program-v1.00D.md): Fuller analysis of data workspace and ownership. Follow successor references and reconcile unanswered decisions rather than restarting shipped phases.
- [Data workspace](00-roadmap/20260808-data-workspace-implementation-plan-v1.00W.md): Grid/report/import/export work and current user journeys.
- [Page ownership](adr/ADR-0001-page-builder-ownership.md): Canonical ownership history; read subsequent ADRs before following an older consumer rule.
- [Schema ownership](adr/ADR-0002-schema-builder-ownership.md): Entities and custom-field ownership; co-located authoring does not imply duplicate data owners.
- [Shared schema package](adr/ADR-0008-schema-builder-consolidation.md): Published shared package and consumer contract.
- [Current page presentation decision](adr/ADR-0011-one-custom-page-renderer.md): Read alongside ADR-0001; supersession must be explicit.

## Required reconciliation of older guidance

- The September 3 consolidation document is proposed and contains dated zero-writer findings. The September 4 audit records a CRM7 writer. Keep both records, add current operational links, and recheck consumers; never rebuild because an old audit says nothing exists.
- The September 1 workflow plan reports landed phases but also records interop gaps. Its anti-rebuild list remains essential; the September 8 requirement expands end-to-end capability linkage rather than replacing the engine.
- The July 3 plan is approved. Do not ask again whether its existing user outcome is wanted. Reconcile implementation details with current ownership, permissions and schema rather than copying stale table/role assumptions.
- Visual relation metadata and physical database constraints are different. Explain their effect to the operator; server-side authorization and schema safety remain mandatory.
- A form layout writer alone does not satisfy page/widget layout editing. Each representation needs a tested canonical save and renderer path.
- Historical reports and numerical counts retain their dates. GitHub issues/PRs and fresh runtime evidence own current delivery status; the retired plan dashboard must not be restored.

## Two required acceptance examples

**Disciplinary discussion:** from a person, visually create the supplied sections, discussion type, reason, details, apprentice response, repeatable agreed actions and three signatory groups. Configure confidential HR escalation, due dates and follow-up. Publish, complete, sign, reload, and follow a resulting action back to the exact signed source version. Change a field and branch visually and prove only the new version changes.

**General site visit:** from a placement, schedule the visit, reuse canonical person/host/officer context, visually build the supplied 14 apprentice and six host questions plus explanations/support/signatures, and route findings to responsible people. Complete, sign, recur, cancel a future occurrence and retain prior evidence. Record-context isolation must hold between two apprentices in the same tenant and across tenants.

The supplied variation-named file has the same extracted discussion text as the discussion file. Preserve that mismatch as an intake fact; it supplies no variation-specific schema.

## Execution and evidence

See [remediation plan and launch prompts](plans/20260908-estate-remediation-plan-v1.00W.md), [audit](audits/20260908-estate-remediation-audit-v1.00W.md), and [all discovered related document paths](plans/20260908-remediation/20260908-remediation-documentation-inventory-v1.00F.md). The document-path inventory is discovery, not an assertion that every paragraph was revalidated. Implementation must widen it through backlinks, feature-index rows and app documentation.

## 8 September addition — inbound SMS

crm7#2594 (https://github.com/GaryOcean428/crm7/issues/2594) is a P1 live defect independent of deal work: Mobile Message inbound capture → canonical conversation → inbox/record timeline → visually configured workflow. Includes full-content recovery, correlation, consent, unread/reply controls, tenant isolation and operational replay. See docs/plans/20260908-remediation/prompts/crm7-2594.md. Source audit found usage-only writes and a separate communications reader; deployed bridge/catalog verification remains required.
