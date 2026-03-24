> **SOURCE:** Ported from `/home/braden/.windsurf/plans/bsuite-reconciliation-07fa37.md` on 2026-03-16. Original Windsurf plan file retained at source location.

---

# BSuite Full Reconciliation — Entity Inventory × Docs × Projects

Full cross-project reconciliation of the 198-entity Excel inventory against the CRM7 DB schema, migrations, stores, pages, and all bsuite docs/plans, producing a traceability map, gap report, and updated master roadmap.

---

## Scope

The Excel (`docs/plans/CRM7_entity_inventory_v2.xlsx`) defines **198 canonical entities** across 24 groups as the authoritative data model. This work audits every layer against it and against each project's actual implementation state.

**Entity groups (198 total):**

| Group | Count |
|-------|-------|
| Training contract | 26 |
| Person | 24 |
| Modern award / Pay data | 42 |
| Organisation | 12 |
| Worksite / Site | 12 |
| Technical / Integration | 11 |
| Program / Qualification | 11 |
| Unit / Subject / Activity | 11 |
| Assessment | 7 |
| Funding / Administration | 5 |
| Provider / Organisation | 5 |
| Placement | 5 |
| Apprenticeship / Traineeship | 3 |
| Training / Plan | 3 |
| Training / Progress | 3 |
| Commercial / Funding | 3 |
| Compliance / Case | 3 |
| Documents / Records | 3 |
| Credentials / Documents | 2 |
| Training / Support | 2 |
| Commercial / Workflow | 2 |
| Commercial / Payroll | 1 |
| Commercial / Billing | 1 |
| Compliance / Audit | 1 |

---

## Existing Docs Audited

- `docs/00-master-roadmap.md` — canonical roadmap (v4.11W, last updated 2026-03-10)
- `docs/20260309-bsuite-completeness-matrix-v1.00W.md`
- `crm7/docs/20260309-crm7-gto-owner-flow-completeness-matrix-v1.00W.md`
- `crm7/docs/20260228-crm7-feature-gap-audit-v1.00W.md`
- `docs/20260228-crm7-page-inventory-v1.00W.md` + `docs/20260301-crm7-page-inventory-v1.00W.md`
- `crm7/docs/plans/20260226-ux-oneshot-deep-dive-plan-v1.00W.md` (DRY / EntitySelector gaps)
- `crm7/docs/plans/wise-bouncing-map.md` (UI regression tracker)
- `crm7/docs/plans/20260225-cascade-claude-upgrade-coordination-plan-v1.00A.md`
- `~/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md`
- All `crm7/docs/00-roadmap/`, `architecture/`, `reference/`, `operations/` content

**Known stale / orphaned doc surfaces flagged for archival:**
- `docs/20260228-crm7-page-inventory-v1.00W.md` — superseded by 20260301 version
- `docs/20260228-crm7-rbac-matrix-v1.00W.md` — superseded by 20260301 version
- `docs/crm13-docs/**` — historical reference only; must not be linked as authoritative
- `docs/matrix.md` / `docs/navigation.md` / `docs/ui.md` — pre-bsuite donor docs, reference only

---

## Phase 1 — Entity Inventory × DB Schema Crosswalk

**What:** For each of the 198 canonical entities, determine whether the corresponding DB table/column exists in CRM7 migrations (which cover ~150 tables).

**Key groups requiring deep comparison:**
- **Training contract (26):** `training_contracts` table exists; check for `contract_number`, `contract_status`, `contract_start_date`, `contract_end_date`, TYIMS fields, STARS IDs
- **Person (24):** `people` + `apprentices` + `contacts` — check for USI, AVETMISS fields (`client_identifier`, `client_title`, date_of_birth), TCID, visa_expiry
- **Modern award / Pay data (42):** MAPD-derived fields; `award_rates`, `award_rate_cache` exist but full penalty/allowance/classification hierarchy may be incomplete
- **Organisation (12):** `host_employers`, `organisations`, `training_companies` — check for ABN, TOID, WorkforceOne IDs
- **Worksite / Site (12):** `host_sites` exists; check STARS Organisation IDs, WHS audit fields
- **Program / Qualification (11):** `training_packages`, `vet_assessments` — check TOID, program_identifier, ASCED codes
- **Technical / Integration (11):** webhook, correlation_id, callback_url, WorkforceOne IDs — partially in `mapd_webhook_*` tables
- **Funding / Administration (5):** `funding_claims`, `funding_sources` — check CTF/AASN/ASIP-specific fields
- **Commercial (payroll/billing/workflow):** `timesheets`, `invoices` — check against timesheet_id, invoice_id entities

**Output:** `docs/20260316-entity-db-crosswalk-v1.00W.md`
- Column A: Canonical entity / key from Excel
- Column B: DB table(s) and column(s) matched
- Column C: Match status (Exact / Renamed / Partial / Missing)
- Column D: Notes / alias used

---

## Phase 2 — Entity-to-Implementation Traceability Matrix

**What:** For each entity group, map the full stack:
`canonical_key → DB table/column → migration file → Zustand store → service layer → page route`

**CRM7 stores to audit (mapped to entity groups):**
- `useApprenticeStore` → Person + Training contract + Apprenticeship
- `useHostStore` / `useHostEmployerStore` → Organisation + Worksite
- `useContractStore` / `useTrainingContractStore` → Training contract
- `useVetStore` / `useQualificationStore` / `useUnitStore` → Program / Unit
- `useAssessmentStore` → Assessment
- `useTimesheetStore` → Commercial / Workflow
- `useInvoiceStore` / `useFundingStore` → Commercial / Billing + Funding
- `useGtoComplaintStore` / `useGtoAppealStore` → Compliance / Case
- `usePayrollStore` / `useAwardStore` → Modern award / Pay data

**Output:** `docs/20260316-entity-implementation-traceability-v1.00W.md`
- Per entity group: table showing canonical_key → DB → store → page → status

---

## Phase 3 — Per-Project Completeness Audit

### CRM7 (primary scope)
**Known gaps from prior audits (to verify and complete):**
- Dead links: `/contacts/:id`, `/contacts/:id/edit`, `/placements/:id`, `/placements/create` — no routes
- Awards section: `createEntityStore` queries wrong columns → classifications always empty
- EntitySelector components: architecture specifies 6, none confirmed built
- DataContextSimple (in-memory seed data) still used on some pages instead of Supabase
- Modern award full penalty/allowance hierarchy — 42 entities, only partial DB coverage
- Training plan co-development and sign-off evidence — no verified workflow
- Host employer agreement workflow — no proven host agreement sign-off route
- `training_plan_reviews` and `vet_assessments` tables exist but full traceability unverified
- UI issues (from user feedback): dashboard cards not filling space, bento drag/resize unverified

### Conduit
- Candidate documents UI route — confirmed missing in last audit pass
- Analytics — partial (route + server fetch exist, full domain parity unproven)

### business-suite-unified
- Stripe billing — partial (UI + checkout exist, end-to-end unverified)
- Session handoff + AppSwitcher — partial
- Idea Hub — missing
- Cross-app notifications — missing

### braden
- SEO + lead capture — partial (prerender, JSON-LD, GA4 partially wired)
- Visual customization — not started

### R80.3
- PWA + offline — partial
- Wage calc test suite — partial (70% target not proven)
- `@bsuite/charge-calc` convergence — partial

---

## Phase 4 — Gap Report

**Output:** `docs/20260316-bsuite-gap-report-v1.00W.md`

Structured as:
- **P0 — Data integrity blockers:** DB columns missing for entities that already have pages (e.g., training contract TYIMS fields displayed but not persisted)
- **P1 — Missing critical routes/flows:** Dead links + entity groups with no page
- **P2 — Naming mismatches:** Entities in Excel using different names than DB columns (e.g., `client_identifier` vs `apprentice_id`)
- **P3 — Coverage gaps:** Entities in DB with no page/store vs entities in Excel with no DB column

---

## Phase 5 — Stale Doc Deprecation

**What:** Mark clearly outdated docs as archived or reference-only so agents stop treating them as authoritative.

- Move `docs/20260228-crm7-page-inventory-v1.00W.md` → `docs/archive/crm7/`
- Move `docs/20260228-crm7-rbac-matrix-v1.00W.md` → `docs/archive/crm7/`
- Add `> **ARCHIVED**` header to `docs/crm13-docs/` and `docs/matrix.md` / `docs/ui.md` / `docs/navigation.md`
- Update `docs/README.md` to correctly reflect active vs archived

---

## Phase 6 — Master Roadmap Update

**What:** Update `docs/00-master-roadmap.md` with:
- Entity coverage status as a new section: "Entity Inventory Coverage"
- Corrected status for items verified in Phases 1-3 (Built / Partial / Missing)
- New P0-P1 entries for high-priority entity gaps found in Phase 4
- Stale items updated or removed
- Version bump to v5.00W, datestamp 2026-03-16

---

## Deliverables Summary

| # | Output | Location |
|---|--------|----------|
| 1 | Entity × DB crosswalk | `docs/20260316-entity-db-crosswalk-v1.00W.md` |
| 2 | Entity-to-implementation traceability matrix | `docs/20260316-entity-implementation-traceability-v1.00W.md` |
| 3 | Full gap report (P0-P3) | `docs/20260316-bsuite-gap-report-v1.00W.md` |
| 4 | Updated master roadmap | `docs/00-master-roadmap.md` (v5.00W) |
| 5 | Stale doc archival | `docs/archive/crm7/` + `docs/README.md` update |
| 6 | Updated coordination notes | `~/.windsurf/plans/crm7-broad-ui-refresh-ec965f.md` |

---

## Execution Order

1. Run entity × DB crosswalk (automated grep + Excel comparison) → produce doc 1
2. Map stores/pages against entity groups → produce doc 2
3. Per-project audit (combine CRM7 dead-link + entity coverage + other projects) → produce doc 3
4. Archive stale docs (step 5 above)
5. Rewrite master roadmap incorporating all findings → produce doc 4

No implementation (code changes) until gap report is reviewed and priorities confirmed.
