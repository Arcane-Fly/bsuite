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

## 16 September — client/host record parity and linking

Operator-directed implementation owns the record itself (create/edit/detail), distinct from editing the page layout under ADR-0011. Existing prompt ownership remains C02/C06 → bsuite#3206, C03 → bsuite#3207 with crm7#2477/#2061 for CRM related records; Callibre duplicate correction is a bounded part of crm7#2474 (D-114).

**Verified data correction:** Callibre now has one client record with the existing host employer linked. The original client ID, lead and client-owned agreement survive; the one person formerly attached to the duplicate now references the survivor. Guarded rollback rehearsal, independent review, transactional before-image audit events, fresh database reads and signed-in production reload are recorded in [crm7#2474](https://github.com/GaryOcean428/crm7/issues/2474#issuecomment-5692979299). This does not merge tenant organisations: MBAWA remains the parent and FutureBuild the GTO.

**Acceptance for the current code work:** create, edit and detail consume one client field contract and status set; omitted optional fields remain available later; names represent primary contacts; errors retain drafts. A combined client/host shows documents owned by both records. Related records use canonical foreign keys, the shared data grid and an in-place selector; removing a link keeps the related record. Scope follows the actual record's tenant under server authorization, including authorized parent/platform views. Competing edits must not overwrite a relationship silently. A missing catalogue/read permission must be visible, not disguised as an empty collection.

**Implementation evidence (16 September):** [crm7#2645](https://github.com/GaryOcean428/crm7/pull/2645) at signed head `1a3d7303a` adds the 16-field client contract, four shared related-record route consumers and in-place contact creation. The shared contact modal has six direct consumers. Client-first host conversion uses one RLS-preserving transaction with snapshot checks, same-tenant relationships, existing-employer reuse and rollback. Ordinary-client conflicts expose an explicit reload while retaining the draft; temporary connection failures retain normal retry. Independent reviews accepted the changes, Qodo resolved all four findings, 260 focused tests plus the final 15-test caller/hydration regression passed, and browser CI executed 112 tests with 51 skipped. All 22 final PR checks passed, including 9,499 unit tests (68 skipped), and the PR merged to development as `f8e56559b`. These counts are test evidence, not full D8 acceptance.

**Database and release evidence:** migration `20261206160000/client_save_as_host_atomic` is applied to the shared database. Live and isolated-test function definitions match (`8980403201dd7a55537e4dabee134110`), authenticated execution is allowed and anonymous execution denied. Thirty-one real-schema pgTAP assertions and concurrent transactions verify rollback, stale-write rejection and one employer after competing saves. Function removal/replay recovery preserved its definition, permissions and client/employer row counts. An independent release candidate (`8978d8d53`) contains only the eight reviewed feature commits on production's stable dependency set; all 27 changed file contents match the development feature, with manifests unchanged. This candidate still needs the acceptance corrections below; production promotion remains pending and the wider development branch's unrelated release gates are not waived.

**Deployed acceptance, partial (16 September):** signed-in development `f8e56559b` verified FutureBuild's client list contains one Callibre; create/edit/view expose the 16-field contract; both original document scopes and existing person/lead links remain visible. An actual client save survived hard reload. Invalid website validation retained the draft; cancelling in-place contact creation preserved it. Pointer unlink/relink of an existing lead kept the lead record, stayed on the client and persisted after reload; authenticated database readback confirmed retained references. Page columns passed 12 → 24 → save/reload → 12 → save/reload, with original card spans restored. The person's placement picker opens and cancels in place, but its empty candidate list does not establish a link round trip.

**Acceptance corrections remain open:** [crm7#2649](https://github.com/GaryOcean428/crm7/pull/2649) corrects grid interception of Enter/Space/Tab on related-record actions and responsive client headers. The first expanded browser run exposed an empty relationship catalogue in its exact-SHA preview despite a ready marker. Signed correction `0a3a353ae` adds the explicit 12-entity/14-relationship/20-vacancy-field seed and verifies platform endpoints, real single-column foreign keys and conflicting candidates before readiness. Independent review, 63 provisioning tests and 12 pgTAP assertions passed; generated readiness SQL rejected missing, incorrect, extra, foreign-scope and dropped-FK cases. Fresh hosted provisioning and the browser suite passed at `0a3a353ae` (112 passed, 51 skipped). The migration-only pgTAP job exposed a seed assumption, corrected in `239fbe2fa` by a separate rollback fixture over the actual seed. Its 12 assertions pass and 19 affected table snapshots/public constraints remain unchanged after success or forced failure. `35c44beb6` also persists the eight header screenshots to explicit PNG paths; the previous byte-only attachments were not retained. Final-head hosted checks and exact deployed keyboard/header retest remain pending.

**Vacancy relationship dependency repaired:** [crm7#2650](https://github.com/GaryOcean428/crm7/pull/2650) merged to development as `303c64a75` after all checks passed. The reviewed catalogue migration is applied live: one entity, 20 fields and both canonical client/host-employer relationships, with unchanged policies, grants and business row count. Callibre's vacancy picker opens and cancels in place. The live table has no vacancies, so an actual vacancy-link round trip remains unverified. This resolves the missing metadata dependency within C03/[bsuite#3207](https://github.com/GaryOcean428/bsuite/issues/3207), not the whole worklist criterion.

**Card visual and save-recovery dependency:** [crm7#2653](https://github.com/GaryOcean428/crm7/pull/2653) adopts the published theme/canvas corrections and replaces CRM7's remaining resting accent shadow. Local source/type/build checks and Chrome computed-style checks passed for neutral Light/Dark rest, interaction feedback and focus-ring composition. Exact deployed acceptance remains open under [crm7#2506](https://github.com/GaryOcean428/crm7/issues/2506). Signed `94735ca7c` makes Save & Exit wait for database confirmation and retain the draft on failure. Its 36 focused tests and independent deferred-read/write review passed: failed drafts survive remount, cross-instance hydration preserves newer edits, and stale account callbacks cannot retry writes. Integration uses the actual hook and installed page builder. Signed integration head `60bcb626d` includes the record corrections; 105 combined tests passed before push. Full D8 is not approved.

**Round-trip proof required before acceptance:** open Callibre from the client list, inspect both original client and host agreements and its linked person; edit an optional field, save and reload; select or create a related record in place, reload to prove its canonical link, remove the link and prove the record survives. Exercise denied writes, concurrent changes, retry, keyboard, narrow viewport and both themes. Record exact deployed SHA, sibling enumeration and action counts. Local suites and the data correction do not establish deployed UI completion.

The broader bsuite#3206 contract remains open for all indexed entities, visual field/layout authoring, tables and workflow inputs. Its 146-row intake denominator is historical inventory evidence, not a claim that all siblings have passed. Full issue closure requires refreshed class-wide evidence.
