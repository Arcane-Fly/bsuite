---
kind: record
authority: none
owner: bsuite
---

# [P1][integrations] Link BSuite bookings, interviews, portal visits and training milestones to calendars and workflows

https://github.com/GaryOcean428/bsuite/issues/3211

Snapshot updatedAt: 2026-09-08T05:23:48Z. Open at capture; re-read live.

## Required outcome
Deliver the September 3 booking programme: BSuite bookings first, synchronized into calendars; then Microsoft Bookings / Google appointment capabilities where supported. Conduit interviews, worker/apprentice portals, site visits and training milestones consume it. Configure all booking steps, confirmations, reminders, reschedules and follow-ups visually through workflows.

## Source and existing scope
Copilot operator requests 14–15 (06:22–06:23 UTC). `conduit/src/lib/recruitment/calendarInvite.ts` already builds three-party ICS and points to calendar-integration; an ICS download is useful but is not evidence of the complete booking lifecycle. Reuse it and canonical interview/event records. GaryOcean428/crm7#1702 owns training-year/wage-anniversary notices, and the current site-visit/recurrence tickets retain their scope.

## Acceptance
- [ ] Visually create booking types, permitted hosts/officers, availability, duration/buffers, questions, booking limits and workflow; save/reload and preview as the relevant portal user.
- [ ] Candidate/worker/apprentice books from the appropriate entitled portal with person/host/placement context prefilled. Availability is checked authoritatively on submission; simultaneous bookings cannot overbook.
- [ ] Accepted booking produces one canonical record, provider event and correctly scoped participant invitations; expose each stage and retry a partial failure without duplicate invitations.
- [ ] Reschedule, decline, cancel and recurring changes update the linked booking, calendar and workflow consistently while preserving history and required confirmation policy.
- [ ] Interview, site-visit and milestone use cases each show their next task/status at the originating record and return automatically from authorized cross-app steps.
- [ ] Provider-native booking support is checked against current official documentation and access grants. Where unsupported, clearly retain the working BSuite booking route, without fake provider buttons.
- [ ] Reminders, sign-off and follow-up are visual workflow configuration, editable by the permitted tenant administrator. Evidence includes a full booking → completion → follow-up trace.


## Evidence boundary and ownership
These are explicit September 3 operator requirements recovered from VS Code Copilot session 936c315f-fd75-4f36-8a21-5644ebd0612f, not a claim that every underlying adapter is absent. The referenced separate full-integrations checkout/plan was unavailable at audit time. Start by reconciling current code, live schema/functions, provider capabilities, historical PRs and existing issues; credit working limbs. Preserve the operator requirements below in a checked acceptance matrix. Parent: https://github.com/GaryOcean428/bsuite/issues/3204; executable workflow connection: https://github.com/GaryOcean428/bsuite/issues/3209.

## Closure contract
Assign one accountable implementation lane. Test actual authorized provider sandboxes/accounts and intended roles, capture deployed SHA, input/output IDs with sensitive data redacted, UI save/reload and partial-failure/retry. Check same-tenant delegated access and other-tenant denial server-side. Include clear pending/error/recovery states and preserve user context. No secrets in browser/storage logs. User-visible controls and workflow nodes must call the same canonical service. Do not close on adapter exports or component screenshots. Record unavailable provider access as a specific blocker with the rest completed; do not fabricate integration success.


## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.
