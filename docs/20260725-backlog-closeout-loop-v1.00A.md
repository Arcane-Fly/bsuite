# Backlog close-out loop — Jodie · host capacity · STA · de-dupe · Sydney

> Status **A** (loop complete 2026-07-25) · Silo seed: `bsuite_go_loop_2026-07-25`

## Goal

Ship remaining excellence backlog items with binary verifiers; document blocked ops items honestly.

## Outcomes

| Item | Status | Evidence |
|------|--------|----------|
| Host capacity gate | **SHIPPED** | `crm7/src/lib/hostCapacityGate.ts` + placement create blocks; 4 unit tests |
| Jodie leave tools | **SHIPPED** | `leave-tools.ts` → `submit_leave_request`, `list_pending_leave_requests` |
| Jodie FO tools | **SHIPPED** | `field-officer-tools.ts` → `create_case_note`, `check_host_capacity` |
| STA 6-state parsers | **ENRICHED** (not auto-proven) | Expanded labels/hints + portal boost; still manual-confirm until live samples; 24 tests green |
| Package de-dupe | **PARTIAL** | `@bsuite/ui` `sanitizeCustomCss` canonical; apps annotated; dates already has `tryParseCalendarDateToIso` |
| Sydney migration | **RUNBOOK_READY** | `docs/20260725-sydney-migration-readiness-v1.00W.md` — no cutover |

## Success condition (verifier)

- [x] `npx vitest run src/lib/hostCapacityGate.test.ts` → 4 passed  
- [x] `npx tsc --noEmit` crm7 clean  
- [x] conduit staParsers + registry tests 24 passed  
- [x] Placement create calls `assertHostCapacityForPlacement`  
- [x] Tool registry includes new tools  
- [x] Sydney cutover **not** executed without operator  

## Remaining honest gaps

- Enterprise-admin Jodie tools (sub-org / tenant provision / feature assign) — product surface is BSU portal; no thin API yet  
- Payslip tool — needs payroll document model  
- STA PROVEN_STATES expansion — needs live emails from VIC/NSW/QLD/SA/TAS/ACT  
- Full LocalisedDateInput → package extract — calendar deps  
- Sydney dry-run dump/restore — operator + maintenance window  

## Commits expected

crm7 · conduit · packages/ui · parent docs
