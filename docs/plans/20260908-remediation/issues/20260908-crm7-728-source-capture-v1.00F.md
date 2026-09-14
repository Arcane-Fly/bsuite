---
kind: record
authority: none
owner: bsuite
---

# [#667 child 2/8] Field Officer KPI rollup view (5 metrics)

https://github.com/GaryOcean428/crm7/issues/728

Snapshot updatedAt: 2026-07-28T08:57:47Z. Open at capture; re-read live.

Builds gto_compliance_status row for 'field-officer-kpis'. Compute ≥80% goals met from progress_reviews; ≥75% completion from completed_apprenticeships; ≥85% apprentice + ≥90% host satisfaction from satisfaction_surveys; ≤5% incidents from whs_incidents. Materialised view refreshed daily.

Child of #667 (parent dashboard scaffold). Each card's data layer ships as one PR.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- Validation loop: §9.1 (data) + §9.2 (card render with real data, not 'Awaiting data' badge)
- Equivalence target: live counts on /compliance/gto-dashboard for the card_id this issue covers
- Cross red-team: claude-code wave 3
- Skills: supabase-postgres-best-practices, qa-and-verification
