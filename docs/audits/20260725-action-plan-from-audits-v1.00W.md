# Action plan from docs↔code + dead-code audits (2026-07-25)

> Status **A** (loop complete 2026-07-25). Substantive-match = done.

## Archive — DONE
`/home/braden/Desktop/Dev/archived-repos-docs/20260725-bsuite-cleanup/` (~6MB)

## SAFE_DELETE — DONE
(see prior session commits)

## STALE-DOC — DONE
- PARENT-DOCS ×6 archive pointers
- dry-one-shot v1.01A → v1.02A in ADRs/OUTSTANDING
- schema-registry 0.4.0 blocker → 1.0.0 shipped wording
- crm7 xero flag doc

## NOT_DEAD_IMPLEMENT — DONE / SUBSTANTIVE-MATCH

| Item | Status | Evidence |
|------|--------|----------|
| AVETMISS | **SUBSTANTIVE-MATCH** | Page + `avetmiss-export` edge live; client `src/lib/avetmiss/index.ts` barrel added |
| VET unit structure | **SHIPPED** | `structure.tsx` → `qualification_units` (no separate table) |
| Financial summary | **SHIPPED** | Live invoice aggregation in `financial-summary.tsx` |
| WHS tables | **SHIPPED** | Migration `20260725120000` + stub TODOs removed |
| STA 6-state parsers | **BLOCKED** | Needs live STA email samples — WA/NT already proven |

## Loop success condition
- Priority stale greps for blocker/0.4.0/false flag text clean
- crm7 avetmiss + feature flag tests green (89)
- migration applied on shared DB
