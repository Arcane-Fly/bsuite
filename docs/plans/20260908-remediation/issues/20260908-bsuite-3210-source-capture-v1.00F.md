---
kind: record
authority: none
owner: bsuite
---

# [P1][integrations] Complete configurable Google/Microsoft calendar sync with conflict and deletion review

https://github.com/GaryOcean428/bsuite/issues/3210

Snapshot updatedAt: 2026-09-08T05:23:46Z. Open at capture; re-read live.

## Required outcome
From the visual integration settings choose Google/Microsoft accounts, calendars, direction (bidirectional or primary → secondary), mappings and delegated access. Preserve secondary-calendar events owned independently. Surface the same choices and events in workflows.

## Source and existing scope
Copilot operator requests 10–13, 3 September 06:06–06:20 UTC explicitly require cross-provider synchronization, pause on conflicts, and confirmation on deletion. CRM7 `src/services/calendarService.ts` already provides provider calls through `calendar-integration`; `src/pages/calendar/index.tsx` is a real existing surface. Closed GaryOcean428/crm7#480 covered integration UI/scaffolding, not evidence of this complete policy. Reuse GaryOcean428/crm7#1705 for account connection and GaryOcean428/crm7#2054 for inbox rather than duplicating their ownership.

## Acceptance
- [ ] Connected accounts/calendars, scope, direction and last sync can be configured, saved, reloaded and changed visually; no environment edits needed for tenant setup.
- [ ] Create/update/move a mapped event and verify its exact intended destination, including time zones, recurring-series exceptions, attendees and provider IDs. Independent secondary events survive one-way sync.
- [ ] Concurrent conflicting edits PAUSE the affected synchronization and ask the authorized user which version to retain; no silent last-write-wins. Resolution resumes safely.
- [ ] Deletion propagation PAUSES for confirmation by default. Optional future automatic directional deletion is explicit and opt-in, never the default. Cancelled confirmation preserves both records.
- [ ] Token expiry/revocation, provider limits, duplicated/out-of-order webhooks and interrupted polling recover without loops or duplicate events. Show actionable status and audit history.
- [ ] Workflow trigger/action configuration shares the same policy, authority and conflict queue; no background path bypasses decisions.
- [ ] Test delegated calendars, least-privilege reconnect and disconnect cleanup without deleting independently owned remote data.


## Evidence boundary and ownership
These are explicit September 3 operator requirements recovered from VS Code Copilot session 936c315f-fd75-4f36-8a21-5644ebd0612f, not a claim that every underlying adapter is absent. The referenced separate full-integrations checkout/plan was unavailable at audit time. Start by reconciling current code, live schema/functions, provider capabilities, historical PRs and existing issues; credit working limbs. Preserve the operator requirements below in a checked acceptance matrix. Parent: https://github.com/GaryOcean428/bsuite/issues/3204; executable workflow connection: https://github.com/GaryOcean428/bsuite/issues/3209.

## Closure contract
Assign one accountable implementation lane. Test actual authorized provider sandboxes/accounts and intended roles, capture deployed SHA, input/output IDs with sensitive data redacted, UI save/reload and partial-failure/retry. Check same-tenant delegated access and other-tenant denial server-side. Include clear pending/error/recovery states and preserve user context. No secrets in browser/storage logs. User-visible controls and workflow nodes must call the same canonical service. Do not close on adapter exports or component screenshots. Record unavailable provider access as a specific blocker with the rest completed; do not fabricate integration success.


## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.
