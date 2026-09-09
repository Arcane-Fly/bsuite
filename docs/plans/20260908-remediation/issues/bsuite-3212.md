# [P1][integrations] Deliver visual Maps/travel planning and consent-aware workforce tracking connected to workflows

https://github.com/GaryOcean428/bsuite/issues/3212

Snapshot updatedAt: 2026-09-08T05:23:51Z. Open at capture; re-read live.

## Required outcome
Provide Google Maps/travel-time planning and optional live workforce tracking in the actual scheduling/portal journey, with tenant enablement, individual consent, delegated access and tenant-configurable retention (operator default 30 days). This is the September 3 requirement, not merely a map component or clock-in coordinate.

## Source and canonical related work
Copilot operator requests 16–19 (06:24–06:34 UTC), reiterated as unfinished in request 30. GaryOcean428/bsuite#572 already owns attendance geofence/kiosk/photo clock-in; use its data boundary where suitable and do not duplicate it. `crm7/src/pages/field-officers/site-visits/index.tsx` is a consumer to verify. Presence of a route is not proof of map/tracking integration. No live tracking was tested in this audit.

## Acceptance
- [ ] Map a planned visit using canonical host/site addresses; view travel time, route and schedule implications in context, with useful unavailable-address/provider states.
- [ ] Tenant administrator enables the feature and eligible users grant individual tracking consent; UI clearly shows whether tracking is active, when location is stale, and how to stop it.
- [ ] Resolve operator retention/opt-out policy details from the full source conversation before implementation. Preserve the 30-day default and configurable retention, with transparent policy and deletion evidence; verify applicable requirements rather than invent a mandatory surveillance policy.
- [ ] Authorized managers/delegates see only their permitted workforce/site scope. Tenant membership alone is not universal permission; test direct API reads, role changes and revoked delegation.
- [ ] Offline/device-denied/revoked-consent/background-limited cases do not imply current location or silently fabricate coordinates. Show timestamp and accuracy; ingestion cannot trust arbitrary person/tenant IDs.
- [ ] Visually configure authorized arrival/late-visit/location-related workflow events and notifications; retries do not create duplicate attendance or disciplinary actions. Human review is required for consequential interpretations.
- [ ] Retention sweep, consent withdrawal and account offboarding are exercised against actual stored rows. Audit the authority/operation without unnecessarily retaining precise location history.
- [ ] Deployed scheduling and portal UI prove travel planning and explicitly consented tracking separately; capture test-account evidence without publishing location history.


## Evidence boundary and ownership
These are explicit September 3 operator requirements recovered from VS Code Copilot session 936c315f-fd75-4f36-8a21-5644ebd0612f, not a claim that every underlying adapter is absent. The referenced separate full-integrations checkout/plan was unavailable at audit time. Start by reconciling current code, live schema/functions, provider capabilities, historical PRs and existing issues; credit working limbs. Preserve the operator requirements below in a checked acceptance matrix. Parent: https://github.com/GaryOcean428/bsuite/issues/3204; executable workflow connection: https://github.com/GaryOcean428/bsuite/issues/3209.

## Closure contract
Assign one accountable implementation lane. Test actual authorized provider sandboxes/accounts and intended roles, capture deployed SHA, input/output IDs with sensitive data redacted, UI save/reload and partial-failure/retry. Check same-tenant delegated access and other-tenant denial server-side. Include clear pending/error/recovery states and preserve user context. No secrets in browser/storage logs. User-visible controls and workflow nodes must call the same canonical service. Do not close on adapter exports or component screenshots. Record unavailable provider access as a specific blocker with the rest completed; do not fabricate integration success.


## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.

