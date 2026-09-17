---
kind: record
authority: none
owner: bsuite
---

# [#667 child 3/8] WA JSWA EIS milestone tracker (40/30/30, loadings stack)

https://github.com/GaryOcean428/crm7/issues/729

Snapshot updatedAt: 2026-07-28T08:57:46Z. Open at capture; re-read live.

Builds 'wa-jswa-eis' card data. Tracks Commencement (6mo)/Mid-point/Completion (75% nominal) milestones. Loadings: SPOL/Aboriginal/Disability/Regional/Age 21-30. Annual declaration generator. WA-only via tenant_locations.state_code='WA' filter.

Child of #667 (parent dashboard scaffold). Each card's data layer ships as one PR.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- Validation loop: §9.1 (data) + §9.2 (card render with real data, not 'Awaiting data' badge)
- Equivalence target: live counts on /compliance/gto-dashboard for the card_id this issue covers
- Cross red-team: claude-code wave 3
- Skills: supabase-postgres-best-practices, qa-and-verification
