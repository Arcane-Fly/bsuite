---
kind: record
authority: none
owner: bsuite
---

# [#667 child 5/8] Federal AASS overlay status (factsheets + ADMS portal + RAM expiry)

https://github.com/GaryOcean428/crm7/issues/731

Snapshot updatedAt: 2026-07-28T08:57:43Z. Open at capture; re-read live.

Builds 'federal-aass-overlay' card. State factsheet links from state_ir_config. ADMS portal API health (ping). RAM M2M credential expiry countdown (alerts at 90/60/30 days). Surface AASS contact per state.

Child of #667 (parent dashboard scaffold). Each card's data layer ships as one PR.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- Validation loop: §9.1 (data) + §9.2 (card render with real data, not 'Awaiting data' badge)
- Equivalence target: live counts on /compliance/gto-dashboard for the card_id this issue covers
- Cross red-team: claude-code wave 3
- Skills: supabase-postgres-best-practices, qa-and-verification
