# Xero Payroll AU — STP Phase 2 Path Decision (ADR)

> ## ⚠️ APPROVED BUT NOT SHIPPED — no STP event has ever been lodged from BSuite
>
> **Audit 2026-08-17.** The decision below is sound and stands. Its **§4 implementation
> plan was never executed**, and the tracking issue
> [bsuite#495](https://github.com/GaryOcean428/bsuite/issues/495) was **closed as
> "completed" on 2026-05-19** — the same day this ADR was written. The closing comment
> stated *"The implementation PR is a separate ticket (out of scope for this ADR)."*
> **That ticket was never created.** Approving the decision closed the issue; building
> it was never tracked.
>
> ### Measured state (live catalog `tuybltdrdefjblnplpqo` + repo, 2026-08-17)
>
> | §4 prescribed artefact | Measured |
> |---|---|
> | `crm7/supabase/functions/xero-payroll-submit/` | **absent** (positive control: `xero-invoice-submit/` present) |
> | `_shared/xero-payroll-mapping.ts` | **absent** |
> | `pay_run_submissions` table (§4.3) | **absent from every schema** (positive control: `pay_runs` present) |
> | `pay_runs` passthrough columns | ✅ present — `xero_pay_run_id`, `stp_status`, `stp_submitted_at` |
> | `pay_runs` data | 2 rows, **both `stp_status='pending'`**, **0** with `xero_pay_run_id` |
>
> **Nothing has ever been lodged.** Both pay runs sit at the column default.
>
> ### It is not a void — it is worse: two competing, unwired implementations
>
> Contrary to a "nothing was built" reading, substantial payroll code exists. None of
> it is reachable in production:
>
> - **`crm7/src/lib/payroll/xeroAdapter.ts`** (38 KB) — a real Xero Payroll AU adapter.
>   `submitPayRun()` POSTs `/PayRuns`, drafts payslips, and implements STP Phase 2
>   disaggregation (casual loading, bonuses). **`submitPayRun` has no production
>   caller.**
> - **`crm7/src/lib/pipelines/xeroPayrollAdapter.ts`** (435 lines) — a *second*,
>   overlapping adapter taking an injected `XeroPayrollClient`. `pushPayRunToXero` is
>   called **only from its own test file**; `XeroPayrollClient` is implemented **only
>   by a test fake**. Its own header comment acknowledges the sibling adapter.
> - **`crm7/src/pages/payroll/index.tsx`** imports only `eofyFinalisation` and
>   `stpEofyStatus` — **status display, no submission path.**
> - **`crm7/src/lib/payroll/providerCredentials.ts`** supports `'myob' | 'astute'`
>   **only — Xero is not a supported payroll credential provider.**
>
> This is the more expensive failure mode: two partial adapters must be reconciled or
> one deleted before either can ship, and neither has a credential path.
>
> ### The §3.5 risk mitigation does not exist
>
> §3.5 argues the design is safe because *"BSuite retains the canonical `pay_runs` /
> `pay_run_lines` audit trail"* and writes rationale to `pay_audit_events`. Measured:
> **`pay_run_lines` and `pay_audit_events` do not exist in any schema.** The stated
> fallback — that BSuite-side data survives a Xero outage and re-submission is
> straightforward — is currently unfounded. §4.4's acceptance criterion (Xero YTD
> totals reconciled to the cent against `pay_run_lines`) is **not executable**: the
> table it reconciles against is absent.
>
> ### Compliance exposure — stated precisely
>
> STP is an ATO reporting obligation: an employer must report each pay event **on or
> before payday**. Being Approved-but-unbuilt here is therefore a compliance matter,
> not tidiness — **but the honest measurement is conditional, and I will not overstate
> it**:
>
> - **This is NOT a live breach today.** Measured scale is pilot-only: 7 tenants,
>   34 placements, 14 timesheets, 2 pay runs, 0 funding claims. No employer is
>   currently relying on BSuite to lodge STP, so no lodgement deadline is being missed.
> - **It IS an absolute go-live gate.** The moment one real employer runs one real pay
>   run through BSuite, an ATO obligation attaches immediately and there is no working
>   lodgement path — no edge function, no credential provider, no submissions table,
>   and an audit trail whose tables do not exist. There is no partial-credit position:
>   a pay event is either reported on time or it is not.
>
> **The gate belongs on payroll go-live, not on this ADR.** Do not enable BSuite
> payroll for any production tenant until the §4 path (or a ratified replacement) is
> built and reconciled.
>
> Tracking issue re-opened / superseded with this evidence — see the audit comment on
> bsuite#495.

- **Status:** Approved (A) — decision stands; **§4 implementation NOT BUILT** (audit 2026-08-17)
- **Original status line:** Approved (A) — V1 implementation path locked; V2/V3 triggers documented
- **Date:** 2026-05-19
- **Decision owner:** Operator (Braden) + Architecture
- **Tracks:** `bsuite#495` (G-6 Finish-Line backlog item) — Xero Payroll AU — direct STP path vs passthrough
- **Doctrines invoked:** §1 Anti-Laziness / Zero-Defer, DRY One-Shot Architecture, FF-SELF-VALIDATION-20260507
- **Validation loop:** §9.1 (output-equivalence — passthrough YTD totals must match BSuite charge-calc YTD totals to the cent)

---

## 1. Context

BSuite already owns a substantial fraction of the payroll computation stack:

- `@bsuite/charge-calc` (R80.3) — wage and on-cost computation, BOOT-aware, EA-aware, custom-award-aware
- `crm7` timesheet state machine — approvals, leave, allowances, classification mapping
- Fair Work award interpretation — free tier (operator competitive moat)
- Enterprise Agreement enforcement — FWC-approved EAs are BOOT-exempt; custom rates require BOOT
- Xero integration shipped — `xero-token-exchange`, `xero-token-exchange-cc`, `xero-invoice-submit`, `xero-webhook` (multi-org, vaulted refresh tokens, idempotent batch submission)

The open question (`bsuite#495` / G-6): when an Australian tenant runs payroll, which path should Single Touch Payroll (STP) Phase 2 submissions take?

Three options were on the table:

| Option | Path | Who lodges to ATO | Tenant subscription burden | Compliance burden on BSuite |
|--------|------|-------------------|----------------------------|------------------------------|
| **A** Direct STP | BSuite → ATO STP endpoint (PAYEVNT) | BSuite (as a registered DSP / SSP) | BSuite only | Full — DSP OSF, ISO/IEC 27001, ECT certification, PAYEVNT schema maintenance |
| **B** Xero Passthrough | BSuite → Xero Payroll AU API → ATO (via Xero) | Xero | BSuite + Xero Payroll AU per-employee per-month | Minimal — piggyback on Xero's existing DSP whitelisting |
| **C** Hybrid | Per-tenant choice between A and B | BSuite OR Xero | Variable | Highest — both stacks live |

This ADR records the V1 decision and the explicit triggers for migrating to Option C in V2+.

---

## 2. Decision

**V1: ship Option B (Xero Passthrough).**

Implementation path:

1. Add a new Supabase edge function `xero-payroll-submit` modelled on the existing `xero-invoice-submit` pattern (vaulted token retrieval, refresh-on-expire, idempotent batch records, per-user rate limit, generic error responses).
2. Map BSuite payroll state (timesheet → charge-calc output → pay summary) to Xero Payroll AU API resources: `Employees`, `PayrollCalendars`, `Timesheets`, `PayRuns`, `PaySlips`, `LeaveApplications`.
3. The lodge / update / finalisation lifecycle (the "STP event" model) is handled by Xero on the tenant's behalf — BSuite does not generate PAYEVNT XML, does not hold an ATO Software ID, and does not need DSP OSF whitelisting.
4. BSuite still owns the **computation** and **audit trail** (charge-calc outputs, BOOT decision rationale, EA enforcement, allowance breakdown) — these are written to `pay_runs`, `pay_run_lines`, and `pay_audit_events` and survive independently of Xero.

**V2 trigger: migrate to Option C (Hybrid) when any of the following fire:**

1. **Demand signal** — 10+ active tenants are running BSuite payroll but do not subscribe to Xero Payroll AU (i.e. they are paying Xero only because BSuite forced them to). Tracked via a `tenants.payroll_passthrough_only` flag plus a monthly Stripe / Xero subscription cross-reference report.
2. **Reliability signal** — three or more Xero API outages of 60+ minutes during a calendar-month STP submission window (the 24-hour pay-event-on-or-before-payday window). Tracked via `xero_api_health` time-series + alerting on `xero-payroll-submit` 5xx rate.
3. **Regulatory signal** — ATO opens a "Lite SSP" / "small DSP" path that materially reduces the OSF and ECT burden (e.g. waives the independent ISO/IEC 27001 certification for products below a tenant-count threshold). The ATO has historically iterated the framework annually — re-evaluate at each `DSP OSF` revision.

**V3+ open question (escalated to operator below):** maintain a long-term migration plan to Option A (Direct STP) or stay on passthrough indefinitely?

---

## 3. Reasoning

### 3.1 V1 must ship in months, not years

The ATO's Digital Service Provider Operational Security Framework (DSP OSF) is mandatory for any product that wants to call ATO digital services directly, including the STP `PAYEVNT` web service.[^osf] Confirmed Category A/C/D requirements include:

- **Audit Logging**
- **Multi-Factor Authentication**
- **Independent Certification against ISO/IEC 27001:2022** (third-party audit, not self-attestation)
- **Data Hosting** (declared and assessed)
- **Encryption Key Management**
- **Encryption at Rest**
- **Encryption in Transit**
- **Entity Validation** (proof end-users are legitimate businesses)
- **Personnel Security**
- **Security Monitoring Practices** (network, application, transaction layers)
- **Supply Chain Visibility**
- **Third-Party Add-on Marketplace** (security review of every plug-in partner)

The independent ISO/IEC 27001:2022 audit alone is documented in industry guidance as a 6–12 month process from gap assessment through Stage 1 + Stage 2 certification, with audit-preparation cost commonly cited at AUD $15k–$90k and recurring annual surveillance audits thereafter.[^iso] The OSF letter of confirmation is reviewed annually by the ATO Digital Partnership Office.[^pronto]

On top of OSF, a DSP that wants to send STP reports directly must also:

- Register the product via Online services for DSPs (MyID + RAM authorisation flow).[^sbr-dsp]
- Complete the PAYEVNT Business Implementation Guide (BIG) build, including `submit`, `update`, and (where applicable) `adjust` actions.[^sbr-eo]
- Pass ATO Extended Conformance Testing (ECT) before being whitelisted on the Product Register.[^sapphireone]
- For SSPs specifically (sending platforms/gateways), additional obligations apply: SSID generation and issuance per DSP product, signed-and-recorded SSID audit trail, separate testing and certification track.[^ssp-guide]

The ATO's published guide for SSPs is unambiguous about the scope:

> "This guide is for sending service providers (SSPs) operating a platform or gateway that submits Single Touch Payroll (STP) on behalf of payroll digital service providers (DSPs)."[^ssp-guide]

The combined timeline (OSF questionnaire + ISO/IEC 27001 audit + ECT + product registration) is realistic at **6–12 months from a standing start**, with ongoing yearly recertification and a non-trivial supply-chain attestation burden.

BSuite's V1 finish-line target is months, not years. The operator's stated competitive moat is **BOOT automation + EA / award interpretation + AI assistant + modern UX** — not STP plumbing. Spending the next 6–12 months on STP accreditation is the wrong opportunity cost.

### 3.2 The BSuite competitive position is preserved

Per operator-confirmed business-model facts:

- Fair Work awards, wages, and conditions are **freely available** in BSuite — competitor differentiator (ReadyRecruit and others gate this).
- R80.3 **rate calculation is subscription-gated** — calc engine requires a subscription; award data is free.
- CRM7 is **subscription-gated to access** — payroll section natively pulls from Fair Work.
- Manual addition of EBAs and custom awards is supported — FWC-approved EAs are exempt from BOOT; custom award rates require BOOT assessment.

Option B preserves the moat exactly. BSuite owns the entire **payroll-determination** stack (rate, on-costs, allowances, leave, BOOT-pass, EA enforcement). Xero is reduced to a **transport layer to the ATO** — a commodity layer that is already in every GTO-sized tenant's accounting stack.

### 3.3 Tenant economics

Most GTO-sized BSuite clients already maintain a Xero accounting subscription. Adding Xero Payroll AU to an existing Xero subscription is one of the lowest-friction commercial up-sells in the AU SaaS market and most BSuite clients in the operator's target segment will have done it. For the minority who haven't, the V2 demand-signal trigger captures the threshold at which BSuite should invest in Option A or C.

### 3.4 The Xero Payroll AU API surface is well-documented and stable

The Xero Payroll AU API exposes the resources BSuite needs to drive the full lifecycle:[^xero-au]

| Resource | BSuite responsibility | Xero responsibility |
|----------|----------------------|----------------------|
| `Employees` | Upsert from CRM7 apprentice / employee records (DRY one-shot: BSuite is owner; Xero is mirror) | Hold ATO-required tax declaration fields |
| `PayrollCalendars` | Resolve from BSuite pay frequency | Drive Xero `PayRun` posting cadence |
| `Timesheets` | Push approved CRM7 timesheets, one entry per day per earnings rate | Validate against pay-period structure |
| `LeaveApplications` | Push NES leave events (annual, personal, LSL) | Apply against employee balances |
| `PayRuns` | Create a `PayRun` per pay-period close; populated via Timesheets + Payslip Earnings/Deduction lines | Compute slip totals; expose `PayRunStatus` (`Draft` → `Posted`) |
| `PaySlips` | Inject earnings lines (incl. salaried EarningsLines for non-hourly), deductions, super, reimbursements | Compute YTD running totals |
| **STP submission** | Trigger via `PayRun` post (Xero submits the pay event to the ATO; BSuite reads the filing status from Xero) | Lodge `submit`, `update`, and `final` STP events to ATO; surface filing state (`Pending` / `Filed` / `Failed`) |

Required OAuth scopes: `payroll.employees`, `payroll.timesheets`, `payroll.payruns`, `payroll.payslip`, `payroll.leaveapplications`, `payroll.settings`, `offline_access`.[^xero-au] All scopes are already covered under BSuite's existing Xero OAuth app — adding payroll-au scopes is a config-only change, not a new app registration.

End-of-financial-year **finalisation** (the STP "final event") is also driven from Xero — BSuite triggers the finalise action via Xero's UI or API and Xero lodges the `final` PAYEVNT to the ATO.[^xero-finalisation] This means BSuite avoids the failure-mode of getting EOFY finalisation wrong, which is one of the highest-stakes single-event compliance moments of the year.

### 3.5 Risk mitigation already designed in

The risk profile of Option B is dominated by **Xero API uptime during the on-or-before-payday window**. The mitigations baked into V1:

- Idempotent batch records mirror the `xero-invoice-submit` pattern — re-tries are safe against the same `idempotency_key`.
- BSuite retains the canonical `pay_runs` / `pay_run_lines` audit trail. If Xero is unavailable, the BSuite-side data survives and re-submission is straightforward.
- BSuite charge-calc outputs are written to `pay_audit_events` with full BOOT / EA / allowance rationale — independent of whether Xero ever receives the data.
- The `xero_api_health` time series feeds the V2 reliability trigger — three 60+ min outages in a submission window flips the architecture to Option C.

---

## 4. Implementation plan for V1

Mirrors the proven `xero-invoice-submit` pattern (`crm7/supabase/functions/xero-invoice-submit/index.ts`):

```
crm7/supabase/functions/
  xero-payroll-submit/
    index.ts                   # PayRun + PaySlips + STP submission orchestrator
  _shared/
    xero-payroll-mapping.ts    # Pure mapping helpers (vitest-unit-testable)
    xero-vault.ts              # Re-used (vault decrypt / rotate)
    rate-limiter.ts            # Re-used (pre-auth IP rate limit)
```

### 4.1 Edge function contract

**Request:**

```jsonc
{
  "xeroTenantId": "<xero org id>",
  "payRunId": "<bsuite pay_runs.id>",
  "idempotencyKey": "<optional>",
  "crm7TenantId": "<bsuite tenant id>",
  "action": "submit" | "update" | "final"
}
```

**Response:**

```jsonc
{
  "batchId": "<bsuite pay_run_submissions.id>",
  "status": "submitted" | "partial_failure" | "failed",
  "xeroPayRunId": "<xero pay run id>",
  "xeroFilingStatus": "Pending" | "Filed" | "Failed",
  "submittedEmployees": 42,
  "failedEmployees": 0,
  "errors": []
}
```

### 4.2 Mapping rules (DRY one-shot)

- **Employees:** BSuite is the owner. Push via `POST /Employees` on first encounter (sync `crm7.apprentices.xero_employee_id`). Never re-write Xero-side tax-declaration fields from BSuite — those are tenant-bookkeeper-managed in Xero (write-once policy).
- **Timesheets:** Push one entry per day per earnings rate. Hourly employees use the standard `Timesheets` endpoint; salaried employees use `PaySlip.EarningsLines` (per the Xero Payroll AU API quirk).[^so-salaried]
- **PayRun:** Create one `PayRun` per pay-period close. Use a deterministic idempotency key: `<engagement_id>:<period_start>:<YYYY-MM>` (same shape as `xero-invoice-submit`).
- **STP filing status:** Poll Xero for `PayRun.STPStatus` after post; cache in `pay_run_submissions.xero_filing_status`; surface in CRM7 payroll UI with the green-tick / amber-pending / red-fail pattern.

### 4.3 BSuite-side schema (new)

```sql
-- migration: pay_run_submissions tracking + STP filing status
create table pay_run_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  pay_run_id uuid not null references pay_runs(id),
  xero_tenant_id text not null,
  xero_pay_run_id text,
  idempotency_key text not null,
  status text not null check (status in ('pending','submitting','submitted','partial_failure','failed')),
  xero_filing_status text check (xero_filing_status in ('Pending','Filed','Failed')),
  submitted_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);
-- RLS: tenant-scoped read; service-role write
```

### 4.4 Acceptance criteria (FF-SELF-VALIDATION-20260507)

- **§9.1 Output-equivalence target:** for a representative pay-period sample (10 employees × 1 fortnight including hourly + salaried + leave + allowance + custom-rate cases), the YTD totals reported by Xero after PayRun post must match BSuite `pay_run_lines` YTD totals **to the cent**, for: gross, PAYG, super (SG + RESC), allowances (per ATO STP Phase 2 disaggregated allowance categories), deductions.
- **§9.2 Visual-equivalence target:** CRM7 payroll page shows pay-period close → push-to-Xero → STP filing status with the canonical D2C UX pattern (Electric Blue primary, Electric Cyan accent, Electric Purple error/destructive — no coral / red).
- **Cross red-team:** claude-code → perplexity-computer → copilot before flip-to-done.
- **Skills to load:** `xero-integration`, `supabase-postgres-best-practices`, `dry-one-shot-architecture`, `qa-and-verification`, `verification-before-completion`, `tanstack-query`, `shadcn-ui`.

### 4.5 Sequencing

1. Migration: `pay_run_submissions` + `pay_audit_events` augmentation
2. Pure mapping: `_shared/xero-payroll-mapping.ts` + vitest unit tests
3. Edge function: `xero-payroll-submit/index.ts`
4. Client wiring: CRM7 `PayrollSubmitButton` + TanStack Query mutation + status polling
5. Per-tenant Xero org → BSuite tenant link sanity check (existing `xero_connections`)
6. Documentation: README in `crm7/supabase/functions/xero-payroll-submit/`
7. Dashboard: bump `summary.*` counter, add G-6 row to `feature_360_status`

---

## 5. Trade-offs

| Dimension | Option A (Direct) | **Option B (Passthrough — V1)** | Option C (Hybrid — V2 trigger) |
|-----------|-------------------|--------------------------------|-------------------------------|
| Time to V1 | 6–12 months | **~2 weeks** | Same as B + opt-in A path |
| BSuite compliance burden | DSP OSF, ISO/IEC 27001:2022, ECT, PAYEVNT schema | **Vaulted Xero tokens + idempotent batch** | Both |
| Tenant cost surface | BSuite only | **BSuite + Xero Payroll AU (per-employee)** | Per-tenant choice |
| ATO audit-trail ownership | BSuite | **Xero (primary) + BSuite (shadow)** | Either, per-tenant |
| Failure-mode | BSuite-internal | **Xero API uptime dependency** | Both |
| EOFY finalisation risk | BSuite | **Xero** | Per-tenant |
| Competitive moat preservation | Yes | **Yes** | Yes |
| Per-tenant friction | None | One Xero subscription | Per-tenant onboarding choice |

---

## 6. Open questions for the operator

1. **Long-term plan for V3+ Direct STP** — do we commit to a multi-year roadmap to eventually take Option A in-house (once tenant volume justifies the ISO/IEC 27001 + OSF + ECT investment), or do we stay on passthrough indefinitely and treat STP as a commoditised transport layer we will never own? This decision shapes:
   - Whether to start the DSP OSF questionnaire now as a slow-burn 12-month track
   - Whether to keep the PAYEVNT schema close to BSuite's payroll output structure (cheaper future migration) or diverge for short-term velocity
   - Whether to negotiate a long-term API partnership with Xero (e.g. dedicated rate-limit allocation in exchange for volume commitment) vs treating Xero as replaceable
2. **V2 trigger thresholds** — the 10-tenant / 3-outage / regulatory-signal numbers are defaults. Confirm or adjust before they become operational metrics.
3. **Tenant-facing positioning** — should the BSuite payroll page name Xero ("Powered by Xero Payroll AU for STP lodgement") or stay opaque ("STP lodgement to ATO via integrated provider")? Affects sales narrative and renewal-friction stories.

---

## 7. References

[^osf]: ATO Software Developers — DSP Operational Security Framework. https://softwaredevelopers.ato.gov.au/operational_framework — sets out the mandatory security controls (Audit Logging, MFA, ISO/IEC 27001 certification, Encryption at rest / in transit / key mgmt, Entity Validation, Personnel Security, Security Monitoring, Supply Chain, Third-Party Add-on Marketplace).
[^pronto]: ATO Digital Partnership Office — DSP OSF Letter of Confirmation (Pronto Software, STPD), 26 May 2025. Confirms the Category A / C / D control set and an annual review cycle. https://www.pronto.net/wp-content/uploads/2025/05/PRONTO-SOFTWARE-LIMITED-STPD-Letter-of-Confirmation-2025.pdf
[^iso]: ISO 27001 Audit Timeline — Konfirmity 2026 reference. Documents the typical 6–12 month phase plan (Gap Assessment → Policy Development → Internal Audit → Stage 1 → Stage 2 → Certification) and the AUD $15k–$90k cost band. https://www.konfirmity.com/blog/iso-27001-audit-timeline
[^sbr-dsp]: Standard Business Reporting — Online services for DSPs. https://www.sbr.gov.au/digital-service-providers/software-development-steps/online-services-dsps — registration prerequisites (MyID + RAM authorisation), intended-use disclosure, and Online services for DSPs onboarding.
[^sbr-eo]: Standard Business Reporting — Employer Obligations (EO) / PAYEVNT. https://www.sbr.gov.au/digital-service-providers/developer-tools/australian-taxation-office-ato/employer-obligations-eo — PAYEVNT submit / update / adjust service actions; PAYEVNTRECON is restricted to DSPs connecting directly to the ATO (not available via SSP).
[^sapphireone]: SapphireOne Blog — STP Phase 2 Certification (April 2022). Documents the ECT (Extended Conformance Testing) gate that precedes Product Register listing, and the ATO's ongoing post-whitelist monitoring at network / application / transaction layers. https://www.sapphireone.com/blog/2022/04/single-touch-payroll-phase-2-certification/
[^ssp-guide]: ATO Software Developers — Guide for SSPs to submit STP reports. https://softwaredevelopers.ato.gov.au/guide-ssps-submit-stp-reports — SSP-specific obligations: SSID generation per DSP product, SSID issuance audit trail, separate testing track, integration-model differences (Product ID / Reporting Party / End User Declaration).
[^xero-au]: Xero Developer — Payroll AU API reference. https://xeroapi.github.io/xero-node/payroll-au/index.html — full endpoint inventory (Employees, PayrollCalendars, Timesheets, PayRuns, PaySlips, LeaveApplications, EarningsRates, DeductionTypes, SuperFunds, etc.), OAuth scopes (`payroll.employees`, `payroll.timesheets`, `payroll.payruns`, `payroll.payslip`, `payroll.leaveapplications`, `payroll.settings`), and `Xero-Tenant-Id` header contract.
[^xero-finalisation]: EEA Advisory — Finalise Single Touch Payroll in XERO, FY2025 guide. https://eea-advisory.com.au/article/finalise-single-touch-payroll-xero-2025/ — documents the Xero-side STP finalisation flow that lodges the `final` PAYEVNT event to the ATO at EOFY.
[^so-salaried]: Stack Overflow — "How do I create payroll items in Xero for salaried employees in Payroll AU API". https://stackoverflow.com/questions/76117699/ — documented quirk: salaried earnings go to `PaySlip.EarningsLines`, not the `Timesheets` endpoint (which validates one entry per day).
