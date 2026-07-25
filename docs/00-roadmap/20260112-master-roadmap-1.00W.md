# Master roadmap entrypoint — BSuite (planning layer)

> Companion to `docs/20260227-bsuite-master-roadmap-v5.00W.md`  
> Updated: 2026-07-25 after excellence close-out red-team planning

## Active implementation plan

- **[20260725-excellence-closeout-implementation-plan-1.00W.md](./20260725-excellence-closeout-implementation-plan-1.00W.md)** — ship remaining excellence gaps (ui sanitize publish, enterprise Jodie tools, KAP amount windows, manuals, advisor track, Sydney/STA honesty)

## Recently completed (2026-07-24 → 2026-07-25)

- Documentation Program L1–L4  
- conduit#338 STA email ingestion + confirm_sta_email RPC  
- Bug-hunt 48 REAL + one-shot DRY audit  
- Email links + handover + funding_offsets  
- Host capacity gate + Jodie leave/FO tools (crm7#1207)  
- STA parser enrich (conduit#379)  
- sanitizeCustomCss source in @bsuite/ui (publish pending T1)  
- Sydney readiness runbook (no cutover)

## Backlog (explicit defer)

| Item | Status | Rationale |
|------|--------|-----------|
| Sydney #1322 cutover | OPERATOR | Runbook ready |
| STA PROVEN_STATES expand | BLOCKED | Live email samples |
| LocalisedDateInput full package | DEFER | ISO blur shipped; calendar deps |
| Payslip Jodie tool | DEFER | Payroll document model |
| Mass auth_rls_initplan | TRACK #1542 | Perf-only |
| apply_feature_migration via Jodie | DEFER | Privilege surface |
| Timesheet employee submit via Jodie | DEFER | After enterprise tools |

## Doctrine reminders

- development first; promote `--merge` never squash; FF development  
- one mutation lane per repo  
- publish @bsuite packages before consumer pins  
- manuals = user how-tos only  
- RLS: `tenant_id IN (SELECT auth_tenant_id())`  
