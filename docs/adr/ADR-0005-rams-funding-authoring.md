# ADR-0005 — RAMS Funding Authoring

> ## ⚠️ SUPERSEDED BY OPERATOR RULING (2026-08-06) — DO NOT BUILD THIS
>
> **Status: Superseded.** This ADR was never implemented, and it must not be. A later
> operator ruling reversed its central premise. Building it now would violate standing
> doctrine, not close a gap.
>
> **What this ADR mandated:** funding amounts *derived* from a `(qualification, criteria)`
> tuple via `rams_funding_for(...)`, propagated **read-only** into every downstream
> surface, with user-editable funding fields explicitly disallowed.
>
> **What the operator ruled on 2026-08-06** (recorded in
> `crm7/src/lib/funding/index.ts`, shipped as migration `20260806120000_funding_claim_payee`,
> verified applied in the live ledger):
>
> - *"an engine shouldnt check eligability. this is for the user to determine."*
> - *"pre-seeding funding that changes so frequently would be foolish."*
>
> Four modules totalling ~2,056 lines (`eligibilityEngine.ts`, `programCatalog.ts`,
> `milestoneGenerator.ts`, `claimSubmissionService.ts`) were **removed** on that date.
> They were not inert: `/claims/new` auto-filled `claim_amount` from a hardcoded
> catalogue and **blocked submission on its own verdict** — a user could be stopped
> from filing a legitimate claim by a dead COVID-era scheme table, and a real claim
> could be pre-filled with an invented figure.
>
> **Why no engine can do this job:** federal amounts are date-effective **and
> grandfathered**. From 1 Jan 2027 the Key Apprenticeship Program Employer Incentive
> drops $5,000 → $4,000, but an apprenticeship that commenced earlier keeps the old
> rate — one scheme name pays both amounts simultaneously, decided by a commencement
> date. Eligibility also turns on a Priority List whose *methodology* changes, and on
> a 200+ employee exclusion that exempts GTOs.
>
> **The replacement doctrine:**
> - The **user** determines eligibility and enters the amount. crm7 *records*; it does
>   not decide.
> - Funding **calculation**, where wanted at all, belongs to **R80.4**, which already
>   owns versioned date-effective figures.
> - The only acceptable eligibility feature is **advisory** Jodie AI guidance read live
>   from user-supplied sources — it must never block, and must disclaim that AI can err.
>
> **Measured state (live catalog, project `tuybltdrdefjblnplpqo`, 2026-08-17):**
> `rams_funding_matrix` — absent. `rams_funding_overrides` — absent. `rams_funding_for(...)`
> / `rams_funding_diagnose(...)` — absent. Route `crm7/src/pages/developer/funding-rules/`
> — absent. Positive control: `funding_claims` and `placements` both present via the same
> probe, so the probe finds what exists.
>
> Superseding record: `crm7/src/lib/funding/index.ts` (operator ruling, 2026-08-06);
> migration `20260806120000_funding_claim_payee`.
>
> The text below is retained unaltered as the historical record of a decision the estate
> later reversed. Do not treat any of it as current instruction.

**Status:** Superseded (ratified 2026-05-01; superseded by operator ruling 2026-08-06)
**Related:** WS-E.4 in consolidated plan; `docs/20260227-dry-one-shot-architecture-v1.04A.md` §1 (`funding_claims`); P1.J Payday Super (1-July-2026 deadline)

---

## Context

The user's one-shot clarification (Phase 0 round 2) established that RAMS funding amounts must be **derived from a (qualification, criteria) tuple** and propagated read-only into placement costing, invoicing, timesheet-derived charges, and forecast views. Today funding amounts are hand-entered on placement creation, which is a one-shot violation — the same value gets re-keyed into multiple downstream records.

Two candidate homes for the RAMS matrix authoring UI exist:

- **Option A — CRM7 Developer Portal.** Authoring co-located with consumers (`funding_claims`, `apprentices`, `placements`, `qualifications`).
- **Option B — BSU Platform admin.** Authoring co-located with other platform-wide reference data.

The canonical one-shot spec §1 already places `funding_claims` under CRM7 ownership with BSU as a read-only aggregator of revenue tracking. This is the pattern we extend.

## Decision

**CRM7 Developer Portal hosts the RAMS funding matrix authoring UI. The matrix is a CRM7-owned entity, consumed read-only by every downstream surface.**

- Table: `rams_funding_matrix` (owner: `crm7`)
- Authoring route: `crm7/src/pages/developer/funding-rules/` (new sub-route under Developer Portal)
- Access control: `owner` / `admin` / `platform_admin` roles only. Every other role reads via `rams_funding_for(...)` SQL function.
- Import tool: CSV upload + review + commit flow at the same authoring route. Template generator reads the current matrix schema.

## Rationale

1. **CRM7 owns adjacent entities.** `funding_claims`, `qualifications`, `placements`, `apprentices` are all CRM7-owned per §1 of the one-shot spec. Putting the authoring surface in the same app keeps all funding-related operational work in one place.
2. **RAMS is operational reference data, not platform configuration.** It changes when government rules change (RAMS updates, state DoE changes, Payday-Super phase-ins) — this is compliance work, not platform admin. The operational team lives in CRM7.
3. **BSU Platform admin is for super-admin surfaces** (tenant provisioning, platform-wide feature flags, cross-tenant billing aggregates). Adding operational reference data to that surface dilutes its purpose.
4. **Payday Super deadline (1 July 2026)** pressures us to pick a home and ship. CRM7 has the mature Developer Portal chrome (Schema, Tables, Logs, Functions tabs already present — confirmed by file-picker 2026-04-29). BSU Developer Portal is less mature and currently broken on `Pages.tsx` (per ADR-0001).
5. **`rams_funding_for(...)` SQL function is the API boundary.** Every downstream surface calls this function; none reads the matrix directly. This means the authoring-UI location is orthogonal to consumption — but operational co-location with CRM7 still wins for the authoring user's workflow.

## Consequences

### Consumer-side call sites (enumerated)

The matrix + function are authoring infrastructure. The *replacement* scope — what currently hand-enters funding amounts and atomically swaps to `rams_funding_for(...)` — covers every call site below. WS-E.4 PR set touches all of these in the same coordinated release:

1. **Placement costing UI** — `crm7/src/pages/placements/costing/` (or equivalent). Current free-text / hand-entered `funding_amount` input replaced atomically with derived read-only display.
2. **Invoice generation** — `crm7/src/lib/pipelines/xeroInvoiceAdapter.ts` or downstream invoice-line constructor. Current hand-entered funding line swapped for function call.
3. **Timesheet-derived charges** — R80.3 timesheet → charge pipeline (e.g. `R80.3/src/services/chargeCalculator.ts`). Funding component derived, not hand-entered.
4. **Forecast views** — any CRM7 forecasting dashboard that multiplies apprentice-count × funding-per-milestone. Currently may use spec-hardcoded values or hand-entered — swapped for `rams_funding_for(...)`.
5. **funding_claims.amount on row creation** — `crm7/src/services/fundingClaimsService.ts`. The `amount` column is populated from the function, not from UI input.
6. **Payday Super calculations (R80.3)** — P1.J's Phase 2 ship uses spec-hardcoded or hand-entered rules; WS-E.4 atomically replaces these with the derived path per the merged backlog governance note on P1.J.

Phase 0 discovery did not read every file above; Phase 4 WS-E.4 discovery opens this ADR's enumeration as a work-checklist and verifies each call site, extending the list if the matrix grows.

### Rollback procedure

If the WS-E.4 atomic PR set fails partway:

1. **Matrix table lands but function fails to deploy:** revert the migration via `down()` (empty matrix safely droppable); re-queue.
2. **Function deploys but a consumer-side swap breaks in CI:** revert consumer-side commits; `rams_funding_matrix` and function remain harmlessly unused; the hand-entry pathways remain live.
3. **Seed data corruption:** matrix rows restorable from the seed script (CSV backed into the repo per ADR-0005 consequence). No downstream data loss because the funding-amount columns on `funding_claims` etc. remain populated from the prior source.
4. **Consumer-side swap partially lands (e.g. invoice-generation swaps but placement-costing doesn't):** this is a dual-path interim state and violates governance. Revert all partial swaps; re-queue the full WS-E.4 PR set as a unit.

### Atomic removal disallows

- A `TODO: swap to rams_funding_for()` comment left in any hand-entry call site post-WS-E.4.
- A feature-flag toggle switching between hand-entry and derived paths.
- A "read-only" display of the derived value alongside a still-editable hand-entry field for the same column.
- Keeping `funding_amount` as a user-editable column on any form post-WS-E.4; it becomes derived-only everywhere.

### Atomic replace-and-remove

Single coordinated PR set ships:

1. **Supabase migration** creates `rams_funding_matrix` table with columns: `id uuid pk`, `qualification_id uuid fk`, `criteria jsonb` (state, apprenticeship type, trade/non-trade, school-based, existing-worker, regional-loading discriminators), `milestone_type text` (commencement / mid-point / completion), `funding_amount numeric`, `effective_from date`, `effective_to date nullable`, `source_reference text` (RAMS document section citation), `created_by uuid`, `created_at`, `updated_at`. Composite unique constraint on (`qualification_id`, `criteria`, `milestone_type`, `effective_from`).
2. **Supabase migration** creates `rams_funding_overrides` table for the rare legitimate override case: `placement_id uuid fk`, `funding_amount numeric`, `reason text not null`, `approved_by uuid not null`, `approved_at timestamptz not null`. Read-only audit trail.
3. **Supabase SQL function** `rams_funding_for(p_qualification_id uuid, p_criteria jsonb, p_milestone_type text, p_claim_date date default current_date) returns numeric` — `STABLE` `SECURITY DEFINER` with `search_path = public, pg_temp`. Resolves the applicable matrix row within the effective-date window; returns NULL if no match, with diagnostic reason via a companion `rams_funding_diagnose(...)` function.
4. **RLS on `rams_funding_matrix`:** SELECT to `authenticated`; INSERT / UPDATE / DELETE to roles `owner` / `admin` / `platform_admin` only, enforced via `auth_has_role(ARRAY['owner','admin','platform_admin'])` helper.
5. **CRM7 authoring UI** at `crm7/src/pages/developer/funding-rules/` — list view + edit form + CSV import. Shipped with 80% test coverage on the lookup resolution logic.
6. **CRM7 placement form** rewrites the funding-amount input as a read-only badge driven by `rams_funding_for(...)`. Hand-entered funding field removed in the same PR. If a legitimately-needed override exists, the audit-trail UI writes to `rams_funding_overrides`.
7. **Invoice generation, timesheet-derived charges, GTO billing reports (WS-A), funding-forecast views** all switch to `rams_funding_for(...)` in the same PR set. Hand-entered funding fields removed everywhere.
8. **Realtime subscription** on `rams_funding_matrix` so downstream views refresh without reload when the matrix is updated.
9. **Documentation:** `docs/20260227-dry-one-shot-architecture-v1.04A.md` §1 gains a `rams_funding_matrix` row under CRM7 ownership; §4 Auto-Population Rules gains a row for funding amount derivation.

### Security

- `rams_funding_matrix` is tenant-agnostic reference data (RAMS is Commonwealth-level). No tenant_id column. RLS allows all authenticated users to SELECT.
- Writes are restricted to platform-level roles. Per-tenant admins cannot modify.
- `rams_funding_overrides` IS tenant-scoped (via `placements.tenant_id` → placement join). RLS matches parent `placements` policy.
- Audit trail: `rams_funding_matrix` has `created_by`, `updated_by`, timestamps. Every update emits a `bi_metrics` event.

### Atomic removal disallows

- Keeping any hand-entered funding-amount input as a "manual override" field outside `rams_funding_overrides`.
- Shipping the matrix UI without the placement-form rewrite in the same PR set.
- `@deprecated` on the old hand-entered funding fields — they get deleted, not marked.
- Parallel "legacy hand-entry mode" toggle.

## What this unblocks

Ratification of this ADR unblocks the following Phase 1+ items:

- **WS-E.4** (one-shot propagation completeness — RAMS derivation pipeline) — cannot start without this decision
- **P1.J** (R80.3 Payday Super regulatory ship, 1-July-2026 deadline) — Payday Super funding-amount calculations feed off `rams_funding_for(...)`; deadline-fence rule auto-interrupts later phases if Phase 2 slips past 2026-06-01
- **WS-A** (GTO billing / payroll / reporting 6-week workstream) — billing totals must call `rams_funding_for(...)` rather than read hand-entered amounts
- **P1-75** (`tenant_field_definitions.entity_id` FK) — blocked separately by ADR-0002 but shares Phase 4 sequencing
- **CRM7 Developer Portal Functions tab** gains a `rams_funding_for` live-test affordance (minor Phase 4 item)

## RAMS seed-data gate

**This ADR cannot be executed until the RAMS criteria columns are validated by a domain expert (user or named operator) and the initial matrix is seeded.** The CSV template + schema validation is designed to enable this seed to happen in parallel with engineering work on the authoring UI, but the UI cannot ship without populated data to test against. Phase 0 default timing: seed validation happens in parallel with Phase 1-3 engineering; seed row-count acceptance criteria = minimum 100 active rows covering the top-3 qualifications by placement count.

## Compliance Gate

Ratified on user sign-off. Execution begins in Phase 4 WS-E.4 of the consolidated plan. Deadline-fence rule applies: if Phase 2 slips past 2026-06-01, this item auto-promotes ahead of later-phase work to preserve the 1-July-2026 Payday Super deadline.
