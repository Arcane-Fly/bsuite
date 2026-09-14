---
kind: record
authority: none
owner: bsuite
---

# [P1][site-visits] Verify and complete schedule → form → signatures → findings → follow-up journey after the latest fixes

https://github.com/GaryOcean428/crm7/issues/2587

Snapshot updatedAt: 2026-09-08T05:23:44Z. Open at capture; re-read live.

## User report and scope
8 September notes: “Site Visit Forms broken”, “Schedule visit page lacks proper layout”, and follow-up needs date tracking and recurrence. This issue owns the remaining full journey and form usability, not a duplicate implementation of recurrence.

## Recent work must be credited and verified
#2577 was automatically closed when #2579 merged into development at a2a6bd7bd5b00d7c7085bc0b87f21e9615303c1f (8 September). Current `src/pages/field-officers/actions/create.tsx` imports FollowUpScheduler/ReviewChecklist and accepts follow_up_rule/occurrence dates. This proves source changed; it does not prove production usability or that generated work completes. `src/pages/field-officers/site-visits/index.tsx` and create/edit action routes consume the same lifecycle. #2435 tracks signer-identity test recovery. #2581 tracks placement-driven inspection scheduling.

## Required investigation and completion
Reproduce from the apprentice/host/placement entry point, capture the first actual failing request/control, and fix the smallest shared cause across schedule, create/edit and visit detail. Bind all forms to the generalized visual authoring + workflow programme. The supplied General Site Visit document is the field/section acceptance reference; it is not satisfied by two fixed review checkboxes.

## Acceptance
- [ ] Schedule from a placement/person/host with those records preselected; select officer, date/type, save/reload and open the resulting visit. Missing context is explained without accepting an unrelated record.
- [ ] Complete the visually configured general visit form, retain answers/explanations/attachments, collect authorized signatories and persist the signed version.
- [ ] Findings create the configured WHS/welfare/training actions with owners, dates and source links; a failed follow-up creation is visible and recoverable, not a success toast for the visit alone.
- [ ] Recurrence from #2577 generates visible work items once, handles timezone/weekend/holiday rules, edits/cancels the intended future occurrences and preserves completed history. Verify the existing implementation before adding more.
- [ ] Schedule layout and long forms are usable at four widths, both themes and by keyboard; clear checklist meanings and links to the training plan/assessment.
- [ ] Drafts survive invalid/denied/interrupted saves and navigation; create/view/edit expose the same applicable fields.
- [ ] Server-side tenant, host, caseload, signer and action permissions are exercised; client-provided signer identity cannot impersonate another participant.
- [ ] Publish a deployed-SHA/role/route evidence pack covering the full journey plus failure/retry. Mark #2577's limb verified only after its actual generated rows and notices are checked; never close this from that PR alone.

Owner role: field-officer journey maintainer. Depends on https://github.com/GaryOcean428/bsuite/issues/3208, https://github.com/GaryOcean428/bsuite/issues/3206, https://github.com/GaryOcean428/bsuite/issues/3207, and #2581 for placement-origin scheduling. The new issue distinguishes unresolved journey evidence from known merged recurrence work.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.
