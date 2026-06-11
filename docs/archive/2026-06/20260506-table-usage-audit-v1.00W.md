# Table Usage Audit — 2026-05-06

**Status:** Working (W) — audit complete with blind-spot closure + pass-3 resolution (2026-05-06). **Zero drop candidates**: the only pass-2 candidate (`apprentice_placements`) was rejected by the user as a legitimate-but-unwired GTO feature and reclassified `NEEDS_WIRING`. DRY canonical-map Conduit gap resolved: Conduit's tables exist under the `r7_*` prefix (spec-doc bug, not implementation gap) — see companion `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md`. Additional finding: `apprentice_placements` live schema has diverged from its originating migration (16 typed columns → 4 columns with JSONB blob); flagged for restoration.
**DB Project:** `tuybltdrdefjblnplpqo` (shared CRM7 / BSU / R80.3 / throughput / conduit / braden Supabase instance)
**Scope:** All 229 `public.*` tables, audited for usage across 12 independent signal dimensions (7 pass-1 + 5 pass-2).

## Executive summary

**Verdict after pass-3 resolution: ZERO tables are drop candidates. All 229 tables are either wired in, or legitimately awaiting implementation (not duplicates).**

The user's constraint: *drop ONLY if a suitable replacement is already in active use.* Pass-1 found zero candidates. Pass-2 blind-spot closure re-classified 11 of 12 previously-UNCLEAR tables into USED_STRONG or USED_WEAK, surfacing `apprentice_placements` as the sole candidate. **Pass-3 review with the user rejected that candidate**: `apprentice_placements` is a key Group Training Organisation (GTO) feature — apprentice and trainee placements require substantial VET compliance tracking (training contracts, host employer rotations, state training authority reporting, AVETMISS exports) that the generic `placements` table does not model. It is a legitimate-but-unwired entity, not a duplicate of `placements`. See §apprentice_placements: NEEDS_WIRING for the apprentice-vs-placement distinction and remediation plan.

**Bonus finding from pass-3:** `apprentice_placements` live schema has collapsed from the originating migration's 16 typed columns (`apprentice_id`, `host_employer_id`, `mentor_id`, `start_date`, `end_date`, `is_current`, `status`, `termination_reason`, `termination_category`, `performance_rating`, `attendance_rating`, `notes`, timestamps + FKs) to a 4-column JSONB shell (`id`, `engagement_id`, `tenant_id`, `placement_details jsonb`). This is a regression that must be investigated before any wiring work begins. See §apprentice_placements → Schema-collapse finding.

**Conduit gap RESOLVED:** The 9 missing `conduit_*` tables from DRY v1.02A §1 are not missing — Conduit owns 16 `r7_*` tables in the same Supabase project. This is a spec-doc naming bug. See companion report `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md`.

| Verdict | Pass-1 count | Pass-2 count (post closure) | Safe to drop? |
|---|---:|---:|---|
| `USED_STRONG` (app/edge refs AND DB-internal refs) | 143 | **149** (+5 from UNCLEAR via Edge Functions, +1 from pass-1 false positive `invoice_batch_items`) | No — actively used |
| `USED_WEAK` (one signal only, incl. migrations/types/docs) | 73 | **79** (+6 from UNCLEAR via indirect surfaces) | No — used, less cross-referenced |
| `UNCLEAR` (unresolved after closure) | 12 | **0** | — |
| `DROP_ELIGIBLE_PENDING_APPROVAL` | 0 | 1 (pass-2) → **0** (pass-3, user rejected) | n/a |
| `NEEDS_WIRING` (legitimate entity, not yet populated by app code) | — | **1** (`apprentice_placements`) | **No** — wire it up instead (see §NEEDS_WIRING) |
| `DROP_CANDIDATE` (pass-1 false-positive, reclassified to USED_STRONG in pass-2) | 1 | 0 | No (kept) |
| **Total** | **229** (143+73+12+1)[^2] | **229** (149+79+0+1)[^3] | **0 drop candidates** |

[^2]: Pass-1 `+1` = `invoice_batch_items` (classified `DROP_CANDIDATE` at pass-1, later confirmed as a strict-grep false positive and reclassified to `USED_STRONG` in pass-2).
[^3]: Pass-2 `+1` = `apprentice_placements`, now reclassified `NEEDS_WIRING` in pass-3 (rejected as a drop candidate by the user on GTO-compliance grounds). Different table from the pass-1 `+1`.

**DRY canonical-map divergences (pass-3 update):** Of the 11 originally-surfaced divergences, the 9 `conduit_*` entries have been RESOLVED — Conduit owns 16 `r7_*` tables in the shared Supabase project (spec-doc naming bug, not implementation gap). See companion report `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md`. Remaining unresolved: `supervisors`, `role_permissions`, `business_plan_sections`, and `users` (spec says public.users; actually `auth.users`) — these need spec-owner action. Details in §DRY canonical-map verification.

## Methodology

For every table in the `public` schema, 7 independent pass-1 signals + 5 pass-2 extensions were collected:

### Pass-1 signals (7)

| # | Signal | Source | What it catches |
|---|---|---|---|
| 1 | App-code refs | `grep -rIF "'<table>'"` across 6 app `/src/` roots | Explicit `.from('table')` Supabase calls |
| 2 | Incoming FKs | `pg_constraint` WHERE `confrelid = <table>` | Referential dependencies |
| 3 | RLS policies | `pg_policies` | RLS presence (weak signal; all tables have it) |
| 4 | Triggers | `pg_trigger` (non-internal) | Active DB-side logic |
| 5 | Functions | `pg_proc.pg_get_functiondef ~* name` | RPCs / procedures that read or write |
| 6 | Views / matviews | `pg_get_viewdef ~* name` | Read-surface composition |
| 7 | Stats activity | `pg_stat_user_tables.n_tup_ins/upd/del/seq_scan/idx_scan` | Actual runtime usage |

### Pass-2 extensions (5)

| # | Extension | What it caught |
|---|---|---|
| 8 | Loose grep (no quote anchoring) across all 6 apps including `supabase/functions/`, `migrations/`, `scripts/`, `docs/`, tests | Edge-function refs, nested-select syntax, migration references |
| 9 | Edge Functions inventory | 68 `.ts` files across 5 apps (crm7=21, BSU=19, R80.3=6, throughput=3, braden=4; conduit=0) |
| 10 | Generated types grep (`database.types.ts`, `supabase.types.ts`) | Presence in the typed surface |
| 11 | `.rpc()` call inventory across `/src/` roots | **No `.rpc()` calls found** — apps use `.from(table)` builder exclusively |
| 12 | DRY canonical-map cross-check against live DB | 11 of 35 canonical tables absent from live DB |

### Classification rules

- `USED_STRONG` — app/edge-function refs ≥ 1 AND (FKs + views + functions + triggers) ≥ 1
- `USED_WEAK` — any evidence present but NOT the strong AND-combination. Covers: app/edge refs alone (no DB-internal refs), DB-internal refs alone (no app/edge refs), loose-grep / generated-types / migration-only refs in any combination, or any mix of the three that doesn't satisfy `USED_STRONG`
- `UNCLEAR` — no code/DB refs but `pg_stat_user_tables` shows activity (pass-1 only; pass-2 resolves to one of the above)
- `NEEDS_WIRING` — zero signals anywhere AND the entity represents a legitimate future feature (human judgment required; e.g. `apprentice_placements` as a GTO/VET compliance entity distinct from generic `placements`)
- `DROP_ELIGIBLE_PENDING_APPROVAL` — zero signals anywhere AND a canonical replacement is in active use AND human confirmation that the entity is deprecated (not merely unwired). Requires per-table human sign-off.

RLS policy presence alone does NOT count as "used" — every table has RLS under Supabase by default.

### Verdict vocabulary: script output vs audit-doc classifications

The automated `scripts/audit-tables.sh` emits four verdicts (`USED_STRONG`, `USED_WEAK`, `UNCLEAR`, `NEEDS_REVIEW`). The pass-3 audit-doc taxonomy extends this with two human-judgment classifications the script cannot produce automatically:

| Script verdict (in `audit-merged.tsv`) | Audit-doc classification | Who decides |
|---|---|---|
| `USED_STRONG` | `USED_STRONG` | Script |
| `USED_WEAK` | `USED_WEAK` | Script |
| `UNCLEAR` | `UNCLEAR` — stats show activity but pass-2 code/DB signals remain zero; needs human investigation (may reveal an external service-role writer, Supabase Studio-only usage, or stats-reset masking) | Script + human follow-up |
| `NEEDS_REVIEW` (zero signals anywhere) | **`NEEDS_WIRING`** (legitimate-but-unwired feature, e.g. `apprentice_placements`) OR **`DROP_ELIGIBLE_PENDING_APPROVAL`** (deprecated / duplicated entity) | **Human judgment only** — the script cannot distinguish a legitimate-waiting-to-be-wired entity from a deprecated one |

Re-runs of `scripts/audit-tables.sh` will emit `NEEDS_REVIEW` in `audit-merged.tsv`. A human must then apply the GTO/DRY/product-owner context from this audit doc to split each `NEEDS_REVIEW` row into `NEEDS_WIRING` (keep + wire up) or `DROP_ELIGIBLE_PENDING_APPROVAL` (separate per-table PR with explicit approval). **No script output is a drop recommendation.**

**Always run `--pass all` (the default) before interpreting `NEEDS_REVIEW` or `UNCLEAR`.** A `--pass 1` run over-flags tables because the app-side signals (strict/loose grep, edge functions, generated types) are not collected. Treat pass-1-only output as a DB-activity snapshot, not a usage verdict.

### Permanent blind spots (signals no grep or DB query can close)

Even with 12 signal dimensions, the following surfaces remain invisible to this audit and must be considered before ANY drop migration:

1. **External service-role writers** — Stripe webhooks, Xero sync daemons, MAPD/TGA/Fairwork integrations, CI jobs, and third-party automations that hit the REST/RPC endpoints with a service-role key from outside the monorepo leave no trace in app code. `pg_stat_statements` catches them only if the extension is enabled and the stats window covers their activity.
2. **Supabase Studio saved queries + dashboard tiles** — table references embedded in saved SQL snippets, chart definitions, or RLS-policy debug sessions are invisible to repo greps. Check Studio before dropping.
3. **Supabase Realtime channel subscriptions** — `supabase.channel(...).on('postgres_changes', { table: tableName })` where `tableName` is a variable or comes from config is invisible to strict grep.
4. **tRPC / server-action / API-route closures** — covered by the `/src/` grep for in-repo apps, but NOT for any external caller (mobile apps, partner integrations, internal tools) that hits the Supabase REST API directly.
5. **Stats-reset masking** — `pg_stat_user_tables` counters reset on Supabase maintenance windows and on `pg_stat_reset()` calls. A table with zero stats may have been hot-used a week ago.

**Rule of thumb:** these blind spots mean "zero signals" is necessary but not sufficient for a drop. The `apprentice_placements` candidate clears this bar because **two independent signals converge**: (a) `pg_stat_user_tables` counters have been zero across every observation window in this audit (acknowledging stats-reset caveat #5), AND (b) parent `engagements` is ALSO empty (n_live_tup=0), which means even if stats reset masked a past burst, the actual on-disk heap is empty — no writer (in-repo or external) has ever left persisted rows in either table of the subtree.

## Blind-spot closure findings: re-classifying the 12 UNCLEAR tables

Pass-2 loose-grep + Edge Functions inventory + generated-types grep definitively resolved all 12 UNCLEAR tables.

### Promoted to USED_STRONG via Edge Functions (5 tables)

| Table | Edge functions touching it |
|---|---|
| `api_keys` | R80.3/functions/get-fairwork-api-key, R80.3/functions/sync-award-rates, R80.3/functions/auth-fairwork, BSU/functions/fairwork-enhanced, BSU/functions/process-webhook-queue |
| `email_audit_log` | BSU/functions/oauth-google-email, BSU/functions/oauth-microsoft-email, BSU/functions/email-dispatcher |
| `mapd_webhook_queue` | crm7/functions/mapd-sync, BSU/functions/fairwork-enhanced, BSU/functions/process-webhook-queue, BSU/functions/fairwork-webhook |
| `mapd_webhook_subscriptions` | crm7/functions/mapd-sync, BSU/functions/fairwork-enhanced, BSU/functions/fairwork-webhook |
| `tga_sync_runs` | crm7/functions/tga-organisation-sync, crm7/functions/tga-sync |

**Implication:** these 5 tables were only "UNCLEAR" because pass-1 grep did not cover `supabase/functions/`. They are fully wired in. Future audits MUST include the Edge Functions tree.

### Promoted to USED_WEAK via generated types / migrations / docs (6 tables)

| Table | Evidence surfaces | Likely owner |
|---|---|---|
| `business_suite_subscriptions` | crm7/src/types/supabase.ts, BSU schema + migrations | BSU |
| `funding_claim_items` | crm7 migrations + crm7/src/types/supabase.ts | CRM7 (child of `funding_claims`) |
| `host_contracts` | BSU migration guides, crm7 docs + types | CRM7 (host employer domain) |
| `inspection_reminders` | crm7 archive docs + migrations | CRM7 (Phase 3 Reminder entity per DRY v1.02A §11) |
| `vet_training_packages` | BSU migrations + crm7 types | CRM7 (spec canonicalises as `training_packages` — see §DRY canonical-map verification) |
| `wic_rate_lookup` | BSU + R80.3 migrations + crm7 types | R80.3 (rate lookup) |

**Implication:** these tables have DDL-level wiring (real columns exported in Supabase-generated types, migrations maintaining them) but no runtime JS/TS code path yet. They are *defined and ready* but the feature that writes/reads them may be incomplete or served exclusively by Edge Functions / Studio. None are drop candidates.

### Remaining: apprentice_placements → reclassified NEEDS_WIRING in pass-3

This was the sole pass-2 drop candidate. Pass-3 user review rejected the drop on GTO-compliance grounds; the table is a legitimate-but-unwired feature, not a duplicate of `placements`. See §apprentice_placements: NEEDS_WIRING (not a drop candidate) below for the full analysis, schema-collapse finding, and wiring plan. The pre-rejection evidence dossier is preserved as an appendix subsection there.

**Pass-4 update (2026-05-06, codebuff reconciliation):** Forensic investigation confirmed the schema collapse (16 typed columns → 4-column JSONB shell) was caused by **out-of-band DDL** — zero migrations in `crm7/supabase/migrations/` produce the live 4-col shape. The originating migration `20250614000002_crm7_apprenticeship_tables.sql` §5 defines the canonical 16-col schema correctly; the live divergence was introduced via Supabase Studio UI, direct `psql` ALTER, or an applied-then-deleted migration. Reconciliation artifacts staged by codebuff (all drafts, not yet applied): restoration migration `crm7/supabase/migrations/20260507000001_apprentice_placements_schema_restoration.sql` (guarded, transactional, 0-row safe); Zod schema `crm7/src/schemas/apprenticePlacementSchema.ts`; state machine `crm7/src/lib/workflows/apprenticePlacementWorkflow.ts`. Implementation layers (service, UI, AVETMISS export, State Training Authority hooks, audit trail, tests) handed off to claude-code per BSuite Agent Coordination Protocol v1.2 §13 — see `docs/20260506-handoff-apprentice-placements-wiring-sleep-packet-v1.00W.md`.

## apprentice_placements: NEEDS_WIRING (not a drop candidate)

**Classification:** `NEEDS_WIRING`. User review 2026-05-06 rejected the drop proposal: this is a legitimate Group Training Organisation (GTO) feature that has never been wired up by the app code, NOT a duplicate of `placements`.

### Why apprentice_placements is distinct from placements

| Dimension | `placements` (staff / labour-hire workers) | `apprentice_placements` (apprentices / trainees) |
|---|---|---|
| Target worker type | Staff, labour-hire, contractors | Apprentices and trainees (under VET Training Contracts) |
| Regulatory regime | Fair Work + industrial awards only | Fair Work + State Training Authority + National VET Regulator + AVETMISS + USI |
| Required compliance artifacts | Award-code mapping, supervisor contact, WHS induction | Training Contract, Training Plan (with host rotations), RTO linkage, USI, Qualification + Units of Competency, State Training Authority approval, AVETMISS export rows |
| Lifecycle events to track | start, end, rate change, supervisor change | start, end, **rotation between hosts**, competency achievement, suspension, **termination with VET-specific category** (completion/mutual/employer/apprentice/transfer), transfer to another GTO |
| Canonical parent entity | `clients` + `contacts` | `apprentices` + `training_contracts` + `training_plans` |
| Performance tracking | n/a in the placement row | `performance_rating` + `attendance_rating` per placement period (per original migration design) |
| Owning app | CRM7 | CRM7 (GTO-specific module) |

**Rule of thumb:** a staff placement asks "who works where, for how much, starting when". An apprentice placement additionally asks "which training contract is this against, which host is hosting this rotation, which competencies will be developed here, and does the State Training Authority approve this host?". These are different entities with different compliance surfaces.

### Schema-collapse finding (new in pass-3)

The originating migration `crm7/supabase/migrations/20250614000002_crm7_apprenticeship_tables.sql` defined `apprentice_placements` with a **16-column typed schema**:

```sql
CREATE TABLE IF NOT EXISTS apprentice_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apprentice_id UUID NOT NULL REFERENCES apprentices(id) ON DELETE CASCADE,
  host_employer_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mentor_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN
    ('planned','active','completed','terminated','transferred')),
  termination_reason TEXT,
  termination_category TEXT CHECK (termination_category IN
    ('completion','mutual','employer_initiated','apprentice_initiated','transfer','other')),
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  attendance_rating INTEGER CHECK (attendance_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

The **live DB schema has only 4 columns**: `id`, `engagement_id`, `tenant_id`, `placement_details jsonb`. An intermediate migration — not yet identified — dropped the typed columns and replaced them with a JSONB blob, rewiring the parent from `apprentices` to `engagements`. This is a regression that effectively disabled the table: no app code can populate a JSONB shell without a schema contract, which is why writes have stayed at zero.

**Investigative action required before wiring work:**
1. Identify the collapse migration (`rg -lF 'apprentice_placements' crm7/supabase/migrations/ | xargs rg -lE 'DROP COLUMN|ALTER COLUMN|placement_details'`).
2. Determine whether the collapse was intentional (JSONB flexibility for varying state regimes) or accidental (bad ADR / incomplete DDL refactor).
3. If accidental: restore the typed columns via a new migration that preserves `tenant_id` and any in-flight data (currently zero rows, so a pure restore is safe).
4. If intentional: document the JSONB shape as a typed Zod schema in `crm7/src/schemas/apprentice-placement.ts` so the app layer can populate it meaningfully.

### GTO wiring plan (when schema is restored)

Assuming the typed schema is restored per step 3 above:

1. **Service layer:** add `crm7/src/lib/services/apprentice-placement-service.ts` with CRUD + state-machine helpers, mirroring the shape of the existing `crm7/src/lib/workflows/placementWorkflow.ts`.
2. **UI:** extend `crm7/src/pages/placements/[id].tsx` (or add `pages/apprentice-placements/[id].tsx`) with tabs for training-contract linkage, competency progress, host-rotation history, and termination-with-category. The existing `crm7/src/lib/trainingContractLifecycle.ts` state machine is the upstream dependency.
3. **AVETMISS export:** wire `apprentice_placements` rows into `crm7/src/lib/avetmiss/validate.ts` so termination events flow through to the AVETMISS `NAT00080` (Training Activity) and `NAT00120` (Program Completion) extracts.
4. **State Training Authority hooks:** `crm7/src/lib/integrations/stateAuthorities/dtwdAdapter.ts` already templates DTWD-WA submissions; add parallel adapters for each state and trigger them from the apprentice_placement lifecycle (rotation, completion, termination).
5. **Audit trail:** add an `apprentice_placement_changes` audit table (mirroring the existing `coy_apprentice_changes` pattern) so variations required by state training authorities are reportable.
6. **Tests:** unit tests for the placement-workflow state transitions (mirroring the existing `placementWorkflow.test.ts` if present); integration test populating one apprentice_placement end-to-end and verifying the AVETMISS export row appears.

### DRY compliance during wiring

- The apprentice and host-employer FKs must point at the canonical DRY entities: `apprentices(id)` and `clients(id)` respectively (NOT a new apprentice-only contacts table).
- Training contracts, training plans, qualifications, and units of competency are owned by the existing `training_contracts`, `training_plans`, `qualifications`, `units_of_competency` tables — do not re-model them inside `apprentice_placements`.
- Per the DRY one-shot doctrine, only CRM7 should have write paths to `apprentice_placements`. Other apps read via Supabase.

### Current state of the GTO compliance surface (reference)

The live DB already has the supporting VET compliance tables that `apprentice_placements` will link into: `apprentices`, `apprentice_competencies`, `apprentice_ir_profile`, `apprentice_profiles`, `apprentice_rate_configs`, `training_contracts`, `training_plans`, `training_plan_signatures`, `training_providers`, `qualifications`, `qualification_units`, `units_of_competency`, `competencies`, `vet_assessments`, `vet_training_packages`, `state_training_authorities`, `tga_sync_runs`, `avetmiss_exports`, `gto_compliance_assessments`, `gto_compliance_evidence`, `gto_compliance_standards`, `host_preferred_qualifications`. The scaffolding is ready; only the central `apprentice_placements` join/history entity needs restoration + wiring.

### Appendix: pre-rejection evidence dossier (pass-2, historical — SUPERSEDED)

> **This subsection is preserved as historical audit evidence. Pass-3 user review (2026-05-06) REJECTED the drop proposal these signals supported. Treat this block as archive, not as current guidance. The authoritative verdict for `apprentice_placements` is `NEEDS_WIRING` — see the sections above.**

#### Live schema at pass-2 (4 columns, regressed from 17)

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `engagement_id uuid NOT NULL REFERENCES engagements(id) ON DELETE CASCADE`
- `tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE`
- `placement_details jsonb`

See §Schema-collapse finding above for why this is a regression rather than a stable design.

#### Zero-reference evidence at pass-2 (what led to the drop proposal)

| Signal | Result |
|---|---|
| `pg_stat_user_tables` | n_live_tup=0, n_dead_tup=0, n_tup_ins=0, n_tup_upd=0, n_tup_del=0, last_vacuum/last_analyze = NULL |
| `pg_stat_statements` | One query only: `SELECT * FROM public.apprentice_placements LIMIT $1` (manual Studio inspection) |
| App code (6 app `/src/` roots, loose grep) | 0 matches |
| Edge Functions (5 app `/supabase/functions/` roots, 68 files) | 0 matches |
| Incoming FKs / views / triggers / DB functions | 0 |

**Why this evidence did NOT justify a drop (pass-3 interpretation):** the zero-reference signals correctly identified that the table is not populated today, but they did not distinguish between *deprecated* (drop) and *feature-waiting-to-be-wired* (keep and wire). The GTO compliance context above is the distinguishing signal that no automated audit can capture.

#### Parent-entity check

`engagements` (parent via `engagement_id` FK) is ALSO empty (n_live_tup=0). Under the pass-2 reading this supported the drop; under the pass-3 reading this indicates the engagement subtree is also awaiting GTO feature wiring.

#### Historical context

Originally defined in `crm7/supabase/migrations/20250614000002_crm7_apprenticeship_tables.sql`. Later touched by FK-add + RLS-fix + index-add migrations; at some point the 16 typed columns were collapsed to a 4-column JSONB shell (see §Schema-collapse finding).

#### Superseded: drop-eligibility checklist and procedure (DO NOT EXECUTE)

The pre-rejection dossier contained a nine-point drop-eligibility checklist and a rename-first drop procedure. Both are withdrawn. The action on `apprentice_placements` is **wire it up** per §GTO wiring plan above, not drop it. No drop migration is to be authored.

## DRY canonical-map verification

> **This section is a findings report, NOT a drop recommendation.** Missing canonical tables are architectural gaps to be resolved by the spec owner or owning app team — they are never drop candidates. Do not act on anything in this section inside an audit PR.

Cross-checked every entity in `docs/20260227-dry-one-shot-architecture-v1.02A.md` §1 against the live DB.

### Present and wired (24 of 35)

All canonical CRM7-owned entities exist in the DB with correct ownership: `contacts`, `clients`, `apprentices`, `placements`, `qualifications`, `training_plans`, `assessments`, `award_rates`, `charge_calculations`, `financial_records`, `ideas`, `projects`, `tenants`, `user_tenants`, `permissions`, `bi_metrics`, `incidents`, `compliance_records`, `timesheets`, `funding_claims`, `custom_pages`, `tenant_navigation`.

Row counts as of 2026-05-06: contacts=33, clients=12, apprentices=15, placements=12, qualifications=1, tenants=6, user_tenants=7, permissions=22, ideas=4, projects=3. Most other canonical tables are schema-present but data-empty — expected for a pre-production instance.

### Canonical-map divergences (11 of 35)

| Entity (per spec) | Spec owner | Status in live DB | Recommendation |
|---|---|---|---|
| `supervisors` | CRM7 | **MISSING** — no substitute | Doc ticket: drop from spec §1 or create migration |
| `users` | BSU | Correctly lives in `auth.users` (8 rows) | Update spec §1 to say `auth.users` |
| `role_permissions` | BSU | **MISSING** — no substitute | Drop from spec or create; check if `permissions` already covers the join |
| `business_plan_sections` | Throughput | **MISSING** (confirmed: no `business_plan%` table exists under any name in public schema) | Throughput may use its own DB OR entity is aspirational. Clarify with Throughput maintainer. |
| `conduit_candidates` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_talent_pools` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_jobs` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_applications` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_pipeline_stages` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_pipeline_entries` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_compliance_checks` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_communications` | Conduit | **MISSING** | See Conduit-specific gap below |
| `conduit_documents` | Conduit | **MISSING** | See Conduit-specific gap below |

### Conduit-specific gap — RESOLVED (pass-3)

**The 9 `conduit_*` entries in DRY v1.02A §1 are a naming bug, not an implementation gap.** Conduit owns 16 `r7_*` tables in the SAME Supabase project as CRM7/BSU (shared project `tuybltdrdefjblnplpqo`). Conduit is an active, partially-populated domain with its own migrations, RLS, and live data (`r7_candidates`=8, `r7_jobs`=7, `r7_pipeline_stages`=9).

Full evidence and action items are in the companion report: `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md`. Summary:

- Recommended resolution: **Option A** — rename the spec doc entries from `conduit_*` to `r7_*` and add the 7 previously-undocumented Conduit tables.
- Owner: DRY architecture spec maintainer. **Not** this audit session. **Not** a DDL change.

### Action items for DRY canonical-map resolution (separate from drops)

These are deliverables for a separate PR/ticket owned by the architecture team — NOT part of this audit PR:

1. **Conduit (9 tables)** — determine which of the three resolution paths applies:
   - (a) Conduit uses a separate Supabase project → update DRY v1.02A §1 with project ref + note.
   - (b) Conduit schema is aspirational → mark the 9 rows in §1 as `Planned (not yet deployed)` with a target phase.
   - (c) Migrations exist but weren't applied → `cd conduit && supabase db push` against the correct project.
   - **Owner:** Conduit app maintainer. **Blocker for:** any Conduit feature work that assumes DRY one-shot compliance.
2. **`supervisors` (CRM7-owned per spec)** — decide: drop from spec §1, OR create migration. Check if `contacts` with a role filter already covers the concept.
3. **`role_permissions` (BSU-owned per spec)** — decide: drop from spec §1, OR create migration. Verify whether `permissions` (22 rows, active) already provides the join surface.
4. **`business_plan_sections` (Throughput-owned per spec)** — confirmed absent from the shared DB. Clarify with Throughput maintainer whether the entity lives in a separate DB, is aspirational, or should be added.
5. **`users` (spec says BSU-owned)** — update spec §1 to point to `auth.users` (8 rows, Supabase-managed). This is a spec-text fix, not a schema change.

### Action on this audit doc

No canonical-map edit is applied here. The DRY spec doc is authoritative for ownership doctrine and must be edited by the spec owner, not by an audit tool.

## Strict-grep escapes (why invoice_batch_items is not a drop candidate)

The pass-1 classifier flagged exactly 1 table as `DROP_CANDIDATE`: `invoice_batch_items`. Manual inspection revealed:

- `crm7/src/types/billing.ts` defines the TypeScript `InvoiceBatchItem` interface
- `crm7/src/lib/pipelines/xeroInvoiceAdapter.ts` imports and uses it
- Table has 2 outbound FKs (`batch_id` → `invoice_batches.id`, `invoice_id` → `invoices.id`)
- Tracks Xero batch-submission status (distinct from `invoice_line_items` which stores line-item content)

**Why the grep missed it:** case-sensitive single-quote grep `grep -rIF "'invoice_batch_items'"` only catches Supabase client-builder calls. The table is consumed via a typed TS interface with a different spelling (`InvoiceBatchItem`).

**Verdict: keep.** Not a drop candidate.

## Similar-name groups (the "replacement" analysis)

| Group | Members | Analysis |
|---|---|---|
| **person** | `people` (63 refs), `apprentices` (57 refs), `workers` (2 refs, 50 writes) | Generic contact vs trainee-specific vs different surface — all distinct |
| **placement** | `placements` (35 refs, 28 cols, 12 rows, CRM7-owned per DRY v1.02A §1), `apprentice_placements` (0 refs, 4 cols JSONB, 0 rows) | Pass-2 confirmed `apprentice_placements` has ZERO code refs, ZERO Edge Function refs, ZERO rows, ZERO writes ever. Parent `engagements` also empty. `placements` actively used. **Pass-3 reclassified `apprentice_placements` as `NEEDS_WIRING`** — distinct GTO/VET compliance entity, NOT a duplicate of `placements`. See §apprentice_placements: NEEDS_WIRING (not a drop candidate). |
| **org** | `organizations` (5 refs, 16 FKs), `enterprises` (1 ref, 1 FK), `gto_organizations` (1 ref, 2 FKs) | Hub + domain subtypes, not duplicates |
| **membership** | `org_members`, `organization_members`, `enterprise_memberships` | Three legacy membership models; candidates for future *consolidation* (not drop) |
| **payroll-run** | `pay_runs` (6 refs), `payroll_records` (6 refs) | Run header vs per-employee line — different concepts |
| **inspection** | `inspections` (51 writes), `workplace_inspections` (0 writes), `site_inspections` | Watch-list; not yet deprecable |
| **whs** | whs_audits, whs_records, whs_incidents, whs_documents, whs_policies, whs_risk_assessments, whs_witnesses | All distinct compliance entities |
| **report** | report_configs, report_templates, report_preferences | Config vs template vs per-user preference |
| **cms** | `custom_pages` (22 refs, 6510 idx_scans), `content_pages` (19 refs, 2 writes), `content_blocks` (2 refs) | custom_pages is canonical per DRY v1.02A §11 (ADR-0001); content_pages legacy precursor |
| **notify** | `notifications` (18 refs), `app_notifications` (8 refs, 225 writes), `system_notices` (21 refs, 230 writes) | Three-tier by audience |
| **invoice-items** | `invoice_line_items` (17 refs), `invoice_batch_items` (0 direct, used via TS interface) | Line content vs Xero batch status — see §Strict-grep escapes |
| **contact** | `contacts` (53 refs, 18 FKs) + activity/message satellites | Hub-and-spoke, not duplicates |
| **doc** | `documents`, `document_records`, `document_metadata` | Layered (record=storage, document=entity, metadata=attributes) |
| **tenant-ext** | `tenant_entities`, `tenant_entity_relations`, `tenant_field_definitions` | Custom-schema extension meta-model; all active |
| **user-tenant** | `user_tenants` only | Only real table; `user_tenant_links` seen in migrations doesn't exist in live DB |

## Action items

**No migration is authored in this changeset.** One drop-eligible table (`apprentice_placements`) identified; explicit user approval + separate PR required.

### Do now

1. **Park this doc** as the authoritative 2026-05-06 post-blind-spot-closure snapshot.
2. **Wire up `apprentice_placements`** (see §apprentice_placements: NEEDS_WIRING). First identify and address the schema-collapse regression (16 typed columns → 4-column JSONB shell), then execute the GTO wiring plan (service layer → UI → AVETMISS export → State Training Authority hooks → audit trail → tests). The pre-rejection drop proposal has been withdrawn (pass-3 user review 2026-05-06); do **NOT** author a drop migration for this table.
3. **Open a ticket to reconcile DRY spec §1 with live DB** — see the 5 enumerated action items in §DRY canonical-map verification → *Action items for DRY canonical-map resolution*. Do NOT modify the spec inside this audit PR.
4. **Extend the grep patterns for the next audit** to include PascalCase singulars, type-only TS imports, `database.types.ts` generated types, and `supabase/functions/` trees. Commit a reusable `scripts/audit-tables.sh`.
5. **Surface findings to the user** — this doc contains two open decision points (schema-collapse investigation ownership for `apprentice_placements` + DRY canonical-map reconciliation ownership) that require human input before follow-up work is scheduled. The drop-approval question for `apprentice_placements` is CLOSED — user rejected the drop on GTO-compliance grounds (2026-05-06).

### Do later (when budget allows)

1. **`engagements` re-evaluation** — same JSONB-sync subtree as `apprentice_placements`; empty in production. With `apprentice_placements` now `NEEDS_WIRING` rather than drop-eligible, `engagements` is also likely legitimate-but-unwired as the parent of the GTO placement subtree. Re-evaluate only AFTER the `apprentice_placements` schema-collapse is addressed and the GTO wiring plan is underway; do not treat as a drop candidate in isolation.
2. **Promote the 6 USED_WEAK-via-migrations-only tables** to USED_STRONG by either (a) wiring up the feature that reads them, or (b) retiring if the feature is cancelled.
3. **Consolidation candidates** (refactor, not drop): membership group (`org_members` / `organization_members` / `enterprise_memberships`); inspection group (`workplace_inspections` vs `inspections`).
4. **Re-run this audit quarterly** alongside Phase-3 unused-index snapshot in `docs/20260506-supabase-linter-action-plan-v1.00W.md` (when that doc is authored).

### NEVER do

1. **Never** mass-drop tables with zero app refs. Pass-2 proved 11 of 12 pass-1 UNCLEAR tables are wired in via Edge Functions, migrations, or generated types.
2. **Never** drop one side of a "similar-name group" without per-schema semantic review.
3. **Never** trust `pg_stat_user_tables.idx_scan = 0` as proof of disuse — stats reset on Supabase maintenance windows.
4. **Never** drop a table invisible to crm7 without cross-checking the DRY entity-ownership map (`docs/20260227-dry-one-shot-architecture-v1.02A.md` §1) AND pinging the likely-owning app's maintainer. Invisible-to-crm7 ≠ unused.
5. **Never** use this audit as a basis for a bulk DROP migration. Any drop proposal must be a separate, per-table PR with explicit human sign-off citing which specific replacement is in use and which owning app was consulted. (Note: `apprentice_placements` is NOT a drop proposal — it is `NEEDS_WIRING`. Do not reopen that decision.)
6. **Never** act on the DRY canonical-map divergences inside this audit PR. The spec doc is owned by the architecture team; this audit surfaces divergences for them to resolve.

## Appendix A — Signal source queries (pass-1)

### Table inventory + stats

```sql
SELECT t.relname,
       pg_size_pretty(pg_total_relation_size(t.oid)),
       COALESCE(s.n_tup_ins,0) + COALESCE(s.n_tup_upd,0) + COALESCE(s.n_tup_del,0) AS writes,
       COALESCE(s.seq_scan,0), COALESCE(s.idx_scan,0)
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = t.oid
WHERE n.nspname = 'public' AND t.relkind = 'r'
ORDER BY t.relname;
```

### Incoming FK count

```sql
SELECT confrelid::regclass, count(*)
FROM pg_constraint WHERE contype = 'f'
GROUP BY confrelid;
```

### View/function references (lexical scan)

```sql
WITH tbls AS (
  SELECT relname FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
), fns AS (
  SELECT p.proname, pg_get_functiondef(p.oid) AS src
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
)
SELECT t.relname, count(DISTINCT f.proname)
FROM tbls t LEFT JOIN fns f
  ON f.src ~* ('\\m' || t.relname || '\\M')
GROUP BY t.relname
HAVING count(DISTINCT f.proname) > 0;
```

## Appendix B — Pass-2 reproducibility commands

### Loose-grep across all surfaces (no quote anchoring)

```bash
for t in api_keys apprentice_placements business_suite_subscriptions email_audit_log \
         funding_claim_items host_contracts inspection_reminders mapd_webhook_queue \
         mapd_webhook_subscriptions tga_sync_runs vet_training_packages wic_rate_lookup; do
  echo "### $t ###"
  rg -lIF "$t" crm7/ business-suite-unified/ R80.3/ throughput/ conduit/ braden/ \
    --glob '!node_modules' --glob '!.next' --glob '!dist' --glob '!build' \
    --glob '!.turbo' --glob '!pnpm-lock.yaml' --glob '!package-lock.json' | head -20
done
```

### Edge Functions table cross-ref

```bash
for t in <table-list>; do
  rg -lIF "$t" crm7/supabase/functions business-suite-unified/supabase/functions \
    R80.3/supabase/functions throughput/supabase/functions braden/supabase/functions
done
```

### DRY canonical-map live-DB cross-check

> **Pass-3 note:** expect all 9 `conduit_*` entries to return MISSING. This is a known spec-doc naming bug — Conduit owns `r7_*` tables in the shared project. See companion `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md` before re-opening this as a gap.

```bash
for t in contacts clients apprentices placements qualifications training_plans \
         assessments supervisors award_rates charge_calculations financial_records \
         ideas business_plan_sections projects users tenants user_tenants \
         permissions role_permissions bi_metrics incidents compliance_records \
         timesheets funding_claims conduit_candidates conduit_talent_pools \
         conduit_jobs conduit_applications conduit_pipeline_stages \
         conduit_pipeline_entries conduit_compliance_checks conduit_communications \
         conduit_documents custom_pages tenant_navigation; do
  exists=$(psql "$POSTGRES_URL_NON_POOLING" -A -t --quiet -c \
    "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace \
     WHERE n.nspname='public' AND c.relname='$t' AND c.relkind='r' LIMIT 1;")
  [ "$exists" = "1" ] && echo "✅ $t" || echo "❌ MISSING: $t"
done
```

### Schema-level non-public namespace discovery

```sql
SELECT nspname, count(*) FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND nspname NOT IN ('pg_catalog','information_schema','pg_toast','pg_temp_1','pg_toast_temp_1')
GROUP BY nspname ORDER BY 2 DESC;
```

## Appendix C — Relationship to the FK-index migration

This audit is orthogonal to `crm7/supabase/migrations/20260506091830_unindexed_foreign_keys.nontx.sql` (the 22-FK-cover migration from the same day). That migration adds performance infrastructure to existing wired-in tables; this audit verifies those tables are actually used at all (yes, they are).

## References

- FK-index migration: `crm7/supabase/migrations/20260506091830_unindexed_foreign_keys.nontx.sql`
- DRY One-Shot architecture spec (entity-ownership model): `docs/20260227-dry-one-shot-architecture-v1.02A.md`
- CRM7 entity crosswalk (selectors + gaps): `docs/20260319-entity-crosswalk-v1.00D.md`
- Linter categorization taxonomy: Supabase DB Linter v0005 (`unused_index`) + v0001 (`unindexed_foreign_keys`)
- Audit TSV artifacts (not committed; produced by `scripts/audit-tables.sh`): `./audit-out-<timestamp>/audit-merged.tsv`, `./audit-out-<timestamp>/{inventory,fk-incoming,rls-policies,triggers,fn-refs,view-refs,stats-activity,app-refs-strict,app-refs-loose,edge-fn-refs,types-refs}.tsv`, `./audit-out-<timestamp>/summary.tsv`, `./audit-out-<timestamp>/attention.txt`, `./audit-out-<timestamp>/rpc-calls.txt`. Override the location with `--out <dir>`.
