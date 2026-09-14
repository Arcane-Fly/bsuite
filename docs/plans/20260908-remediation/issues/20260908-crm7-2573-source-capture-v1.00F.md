---
kind: record
authority: none
owner: bsuite
---

# [class] 26 tables still FK to the legacy apprentices table — a tenant whose workers are people rows (FutureBuild: 0 apprentices, 8 placements) cannot write any of them

https://github.com/GaryOcean428/crm7/issues/2573

Snapshot updatedAt: 2026-09-08T02:11:44Z. Open at capture; re-read live.

## Measured 2026-09-08 02:08Z (live, read-only)
FutureBuild has **0** `apprentices` rows and 8 placements whose workers are `people` rows. `aass_registrations.apprentice_id → apprentices(id)` made the meeting's registration create fail (with the phantom-column 400 in front of it). Every `apprentices.id` (20) also exists in `people.id` (shared ids from the migration), so repointing is data-safe per table once its rows are checked.

## The class (live `pg_constraint`, `confrelid = apprentices`)
apprentice_competencies, apprentice_handoff_tokens, apprentice_ir_profile, apprentice_placements, assessments, boot_assessments (person_id), charge_rate_schedules, funding_claims, guardian_consents, host_charge_rates, incidents, induction_records, invoice_line_items, lln_assessments, mentor_assignments, payroll_records, placements (apprentice_id; person_id already exists), reimbursements, site_visits, support_contacts, training_contracts, training_plans, vet_assessments, wage_calculation_snapshots, return_to_work_plans (person_id), funding_milestones — **26** (aass_registrations is the 27th and is fixed on `fix/aass-registration-create-phantom-columns-and-people-fk`).

## Ask
One migration per scope-owner, Expand-only: for each table, verify `count(rows whose apprentice_id ∉ people.id) = 0`, then drop and re-add the FK against `people(id)` with the same ON DELETE; any UI that reads `apprentices` to resolve the id switches to `people`. Do not rename columns. Sibling count: 26, method: the `pg_constraint` query above.

## Mandatory before merge (FF-SELF-VALIDATION-20260507)
- **Validation loop**: §9.1 — per table, the row-check query = 0 before the FK swap; pgTAP asserts the new FK target.
- **Equivalence target**: writes from a `people`-only tenant succeed on each table.
- **Cross red-team**: takeover lane (claude-code).
- **Skills to load**: `bsuite-supabase-migrations`, `bsuite-rls-authz-red-team`, `general-dry-one-shot-architecture`, `bsuite-fix-the-class-not-the-page`
- **Self-report on divergence**: yes
