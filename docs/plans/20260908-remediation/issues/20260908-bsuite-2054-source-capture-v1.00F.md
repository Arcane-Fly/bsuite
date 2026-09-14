---
kind: record
authority: none
owner: bsuite
---

# [G-6 impl] Xero Payroll AU STP V1 — build the path ratified in the 2026-05-19 ADR (the ticket promised but never filed)

https://github.com/GaryOcean428/bsuite/issues/2054

Snapshot updatedAt: 2026-08-31T02:49:23Z. Open at capture; re-read live.

## Why this exists

The ADR `docs/20260519-xero-payroll-au-stp-path-decision-v1.00A.md` is **Approved**. Its closing comment on #495 said:

> The implementation PR is a separate ticket (out of scope for this ADR).

**That ticket was never created.** #495 was closed as "completed" on 2026-05-19 — the same day the ADR was written — so approving the decision closed the tracking issue while the build went untracked for three months. This issue is that missing ticket.

Superseding #495 (whose scope was the *decision*, legitimately made). Audit + doc corrections: PR #2053.

## Measured state (live catalog `tuybltdrdefjblnplpqo` + repo, 2026-08-17)

Every probe below was run with a positive control proving it finds what exists.

| §4 prescribed artefact | Measured |
|---|---|
| `crm7/supabase/functions/xero-payroll-submit/` | **absent** (control: `xero-invoice-submit/` present) |
| `_shared/xero-payroll-mapping.ts` | **absent** |
| `pay_run_submissions` table (§4.3) | **absent from every schema** (control: `pay_runs` present) |
| `pay_runs` passthrough columns | present — `xero_pay_run_id`, `stp_status`, `stp_submitted_at` |
| `pay_runs` data | 2 rows, **both `stp_status='pending'`**, **0** with `xero_pay_run_id` |

**Nothing has ever been lodged.** Both pay runs sit at the column default.

## This is not a greenfield build — first you must reconcile two competing dead adapters

Substantial payroll code exists. None of it is reachable in production:

- **`crm7/src/lib/payroll/xeroAdapter.ts`** (38 KB) — a real Xero Payroll AU adapter. `submitPayRun()` POSTs `/PayRuns`, drafts payslips, implements STP Phase 2 disaggregation (casual loading, bonuses). **No production caller.**
- **`crm7/src/lib/pipelines/xeroPayrollAdapter.ts`** (435 lines) — a *second*, overlapping adapter taking an injected `XeroPayrollClient`. `pushPayRunToXero` is called **only from its own test file**; `XeroPayrollClient` is implemented **only by a test fake**. Its own header comment acknowledges the sibling.
- **`crm7/src/pages/payroll/index.tsx`** imports only `eofyFinalisation` + `stpEofyStatus` — status display, **no submission path**.
- **`crm7/src/lib/payroll/providerCredentials.ts`** supports `'myob' | 'astute'` **only — Xero is not a supported payroll credential provider.**

**Decide which adapter survives before writing anything new.** Shipping a third implementation alongside two dead ones is the failure mode to avoid.

## The ADR's own safety argument rests on tables that do not exist

§3.5 justifies the design as safe because *"BSuite retains the canonical `pay_runs` / `pay_run_lines` audit trail"*, with rationale written to `pay_audit_events`.

**`pay_run_lines` and `pay_audit_events` do not exist in any schema.**

Consequences:
- The stated Xero-outage fallback (BSuite-side data survives; re-submission is straightforward) is currently unfounded.
- §4.4's acceptance criterion — Xero YTD totals reconciled **to the cent** against `pay_run_lines` — **is not executable**. The table it reconciles against is absent.

Either these tables are part of this build, or §3.5/§4.4 need a ratified replacement. Do not declare the acceptance criterion met against a table you created solely to satisfy it without operator sign-off on the shape.

## Compliance framing — precise, not inflated

STP is an ATO **on-or-before-payday** reporting obligation, so an Approved-but-unbuilt lodgement path is a compliance matter, not tidiness. Measured honestly:

- **NOT a live breach today.** Pilot scale only — 7 tenants, 34 placements, 14 timesheets, 2 pay runs, 0 funding claims. No employer currently relies on BSuite to lodge STP, so no deadline is being missed.
- **IS an absolute go-live gate.** The moment one real employer runs one real pay run through BSuite, an ATO obligation attaches immediately with no lodgement path, no credential provider, and no audit trail. There is no partial-credit position: a pay event is either reported on time or it is not.

**Therefore: do not enable BSuite payroll for any production tenant until this ships or a replacement is ratified.**

## Scope (from ADR §4.5)

1. Reconcile the two adapters — pick one, delete the other (no dual-path interim state).
2. Migration: `pay_run_submissions` per §4.3, plus a ruling on `pay_run_lines` / `pay_audit_events`.
3. Pure mapping helpers + vitest unit tests.
4. Edge function `xero-payroll-submit` on the proven `xero-invoice-submit` pattern (vaulted tokens, refresh-on-expire, idempotent batches, per-user rate limit, generic error responses).
5. Xero payroll credential path (`providerCredentials.ts` currently excludes Xero).
6. Client wiring: submit action + TanStack Query mutation + filing-status polling.
7. Docs + dashboard row.

**Migration authoring note:** floor `20260611000000`; re-check version collisions against `origin/development` **and every open PR branch** immediately before committing — the check goes stale in about an hour. Any new public function reaches `anon` by two routes (this DB's `ALTER DEFAULT PRIVILEGES` and Postgres's built-in `EXECUTE TO PUBLIC`), so issue **both** `REVOKE ALL … FROM PUBLIC` and `REVOKE ALL … FROM anon`, then `GRANT`, then assert the ACL back in a `DO` block that `RAISE`s.

## Still-open operator questions (unanswered since 2026-05-19)

1. **ADR §6.1 / V3+** — commit to a long-term Direct-STP (Option A) roadmap, or treat passthrough as permanent?
2. **ADR §6.2** — confirm the V2 trigger thresholds (10 tenants / 3 outages / regulatory signal) before they become operational metrics.
3. **ADR §6.3** — tenant-facing positioning: name Xero explicitly, or stay provider-opaque?

## Acceptance criteria

- One adapter, one path. No `@deprecated` markers, no dual-path interim state.
- A pay run posts to Xero and returns a real filing status; `pay_runs.xero_pay_run_id` populated and `stp_status` advances off `pending`.
- §4.4 output-equivalence proven against a real reconciliation target, or a ratified replacement criterion.
- Lint, typecheck, tests, build green on `development`; PR cites this issue with verification evidence.
