# [P1][records] Make create, detail and edit expose one canonical field set across all record surfaces

https://github.com/GaryOcean428/bsuite/issues/3206

Snapshot updatedAt: 2026-09-08T05:23:34Z. Open at capture; re-read live.

## User problem
8 September notes: placements, hosts, clients and all records display different fields in create/detail/edit. An omitted creation value cannot reliably be added later. Host owner cannot be assigned and safety rating is reported missing. This is a cross-cutting record/visual-authoring contract, not a placement-only patch.

## Current evidence and distinction
- `crm7/src/pages/placements/[id]/edit.tsx:65–98` has a separate edit schema and ten-field order; create lives in a separate `create.tsx` and view in `[id].tsx`. The rates card now mounts on edit, so do not repeat the already-addressed claim that it is absent: crm7#2565 closed today.
- Host view, create and edit have separate implementations: `crm7/src/pages/hosts/[id].tsx`, `hosts/create.tsx`, `hosts/[id]/edit.tsx`. Current edit DOES expose safety_rating (around line 619), and view reads it (around line 510). The report therefore needs persistence/route/role reproduction, not another duplicate rating field.
- Feature index has **146 entity-crud rows**: CRM7 123, BSU 14, conduit 9 (JSON count by sibling_class, 8 September). That is a starting denominator; it can miss wizards, embedded dialogs and token-less routes. Reconcile router and form registry axes before declaring full coverage.

## Required implementation
Define one field contract per canonical record: editable, derived/read-only, permission-restricted, lifecycle-specific, validation/default, display label, owning record and workflow binding. Create/view/edit and visual customization consume it. Every applicable field appears consistently; legitimate differences must be explained on-screen, e.g. a computed R8 rate links to its owning calculation. Do not make system-managed fields writable or copy fields from linked records into a second owner.

## Acceptance and failure cases
- [ ] Inventory the 146 starting rows plus wizards/dialogs and record exceptions; attach counts, routes and schemas, not only filename matches.
- [ ] For placement, host, client, person and training contract, leave an optional field empty at create, add it in edit, save/reload and verify it in detail, table and linked workflow.
- [ ] Host owner uses a scoped canonical selector; safety rating loads and saves including zero/null where valid. Establish actual faulty path before modifying working controls.
- [ ] Custom fields/layouts appear in all three modes with the same validation and permission model; workflow forms reuse them rather than fork a second schema.
- [ ] Changes to a linked record refresh consuming views without re-keying; unsaved work remains on failed save, record switch, tab switch and concurrency conflict.
- [ ] Read-only/host/field-officer/admin roles have the intended visible fields and server-side write restrictions. Never infer a hidden field is protected by UI alone.
- [ ] Contract/route tests fail when one mode omits a normal field, points at a different record owner or silently drops a persisted value. Also prove read-only fields cannot be edited.
- [ ] Deployed role-based create → view → edit → reload traces on named starting records; complete the enumerated siblings before class closure.

Owner role: canonical records/forms lead. Part of https://github.com/GaryOcean428/bsuite/issues/3204; related crm7#2565 (merged rate-edit fix), GaryOcean428/crm7#2107 (stale-error edit class), GaryOcean428/crm7#2456 / GaryOcean428/crm7#2458 (lost settings drafts), GaryOcean428/crm7#2462 (schema casts). Preserve those issues and credit their fixed limbs.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.
