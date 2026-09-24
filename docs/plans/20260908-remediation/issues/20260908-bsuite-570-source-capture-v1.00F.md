---
kind: record
authority: none
owner: bsuite
---

# feat(payroll): MYOB payroll adapter completion + Astute payroll adapter (new) + STP EOFY finalisation (domains L — critical adapter gaps)

https://github.com/GaryOcean428/bsuite/issues/570

Snapshot updatedAt: 2026-07-28T08:57:36Z. Open at capture; re-read live.

> **Filed by Perplexity Computer · 2026-05-06 · Codehouse parity audit**
> Source: /home/user/workspace/competitor/parity-matrix.md (rows 93, 99–100) + bsuite-inventory.md §5 items 1–2
> Plan: GaryOcean428/bsuite/docs/plans/20260506-codehouse-parity-and-platform-360-v1.00W.md (TBD — being authored in parallel PR)

## Mandatory before merge

This issue requires the following skills loaded by the implementing agent:
- `supabase` — edge function for STP submission; Supabase secrets for MYOB/Astute credentials
- `supabase-auth-comprehensive` — tenant-scoped credential management for MYOB and Astute
- `tanstack-query` — data layer for export trigger UI
- `qa-and-verification` — integration tests with mocked MYOB and Astute APIs

## Red-team requirements (rulebook §6)

1. UX-DX agent — MYOB and Astute connection status must be visible in `settings/integrations.tsx`; STP EOFY finalisation must have a confirmation modal with summary of affected employees before submission
2. Security agent — MYOB API credentials and Astute credentials stored in Supabase Vault (not plain env vars); adapter methods must not log raw payroll data to console; RLS on `payroll_exports` table
3. Performance agent — Payroll export must stream large employee sets in pages of 100; MYOB API rate-limit handling required (429 retry with backoff)
4. Reliability agent — Failed export must roll back to previous state; partial success must list failed employees; STP submission must be idempotent (retry-safe)
5. Quality agent — Conventional commits; `myobAdapter.ts` and `astuteAdapter.ts` must implement every method of the `PayrollAdapter` interface with no throws; xeroAdapter.ts serves as reference implementation

## Codehouse evidence

- **WF1 FAQ "Payroll – STP Phase 2 User Guide"**: Full STP Phase 2 ATO reporting workflow documented; includes EOFY finalisation process.
- **WF1 FAQ "Payroll – Single Touch Payroll – End of Year" (WF1_Pay_018)**: EOFY finalisation flow — mark all employees' income as finalised with ATO.
- **WF1 FAQ "Payroll – Single Touch Payroll – Event Management"**: Pay event dispatch, update event, and finalisation event types.
- **bsuite-inventory.md §5 item 1**: "MYOB payroll export is a stub — `crm7/src/lib/payroll/myobAdapter.ts` has all methods throwing 'not yet implemented'. Any customer on MYOB AccountRight / Business cannot export payroll."
- **bsuite-inventory.md §5 item 2**: "Astute payroll adapter is entirely absent — No file matching `astute` exists anywhere in the suite. Codehouse explicitly supports Astute as a payroll export target for many labour-hire GTOs."

## Current BSuite state

- **Matrix row 93** (🔴 gap): `crm7/src/lib/payroll/myobAdapter.ts` — ALL methods throw `"not yet implemented"`; `PayrollAdapter` interface and Xero reference implementation exist — `bsuite-inventory.md §L`
- **Matrix row 99** (🟡 partial): `crm7/src/lib/payroll/xeroAdapter.ts` STP Phase 2 types present; `crm7/src/pages/settings/govt-integrations.tsx` ATO/ADMS RAM credential UI exists; no STP submission edge function confirmed — `bsuite-inventory.md §L + §5 item 6`
- **Matrix row 100** (🟡 partial): STP types in `crm7/src/types/payroll.ts`; EOFY finalisation UI not confirmed — `bsuite-inventory.md §L`
- **Astute** (⛔ missing): `crm7/src/lib/payroll/astuteAdapter.ts` does not exist anywhere in the suite — `bsuite-inventory.md §5 item 2`

## Task list (parity gaps to close)

- [ ] Matrix row 93 (MYOB): Complete all methods in `crm7/src/lib/payroll/myobAdapter.ts` implementing `PayrollAdapter` interface — `exportPayroll()`, `submitSTP()`, `finaliseEOFY()` using MYOB API v2; add MYOB connection credentials to `crm7/src/pages/settings/integrations.tsx` — owning app: crm7 — target file: `src/lib/payroll/myobAdapter.ts` — target package: crm7
- [ ] Astute adapter (new): Create `crm7/src/lib/payroll/astuteAdapter.ts` implementing `PayrollAdapter` interface; model on `xeroAdapter.ts`; Astute connection credentials in `crm7/src/pages/settings/integrations.tsx` — owning app: crm7 — target file: `src/lib/payroll/astuteAdapter.ts` (new) — target package: crm7
- [ ] Matrix row 99 (STP submit): Ship or confirm `crm7/supabase/functions/stp-submit/` edge function; function posts STP Phase 2 pay events to ATO ADMS endpoint using RAM credentials from `govt-integrations.tsx` — owning app: crm7 — target file: `supabase/functions/stp-submit/` (new) — target package: crm7
- [ ] Matrix row 100 (EOFY): Add EOFY STP finalisation UI flow to `crm7/src/pages/settings/govt-integrations.tsx`; button triggers finalisation event via `stp-submit` edge function; employee summary modal before submission — owning app: crm7 — target file: `src/pages/settings/govt-integrations.tsx` — target package: crm7

## Acceptance criteria

- [ ] `myobAdapter.ts`: all `PayrollAdapter` interface methods implemented (no throws); MYOB AccountRight / Business OAuth 2.0 connection authenticated via settings; payroll export creates valid MYOB IIF or REST API payload; STP Phase 2 categories mapped; unit test with mocked MYOB response passes
- [ ] `astuteAdapter.ts`: all `PayrollAdapter` interface methods implemented; Astute credentials managed in settings; timesheet export produces valid Astute-format file; STP Phase 2 category mapping applied; unit test with mocked Astute responses passes
- [ ] STP submission edge function deploys; posts valid ATO STP Phase 2 pay event JSON; idempotent on retry; submission status displayed in `govt-integrations.tsx`
- [ ] EOFY finalisation: confirmation modal lists affected employees + total gross; on confirm, sends finalisation event to ATO; status updated in `govt-integrations.tsx`; audit event written to `timesheet_events`

## Suggested team

Per Cron A routing matrix: HEAVY (two new payroll adapters + ATO edge function) — add both MYOB and Astute items to `bsuite_heavy_work_queue` + label `needs-team`. STP EOFY medium — assign `@claude` with "open a PR for review" wording.

## Citations

- [WF1 FAQ — Payroll STP Phase 2 User Guide](https://help.codehouseworkforce.com.au) (WF1_Pay_018)
- [MYOB AccountRight API v2 — 2026 docs](https://developer.myob.com/api/accountright/v2/)
- [ATO STP Phase 2 — employer obligations 2026](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll)
- [Supabase Edge Functions 2026](https://supabase.com/docs/guides/functions)
- Internal: parity-matrix.md rows 93, 99–100
- Internal: bsuite-inventory.md §L (Export), §5 items 1–2, 6
