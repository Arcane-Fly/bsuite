# Supabase Linter Action Plan — 2026-05-06

**Status:** Working (W) — Phases 1+2 ready to ship; Phase 3 deferred for production observation.
**DB Project:** tuybltdrdefjblnplpqo (shared CRM7 / BSU / R80.3 / throughput / conduit Supabase instance)
**Linter snapshot:** 2026-05-06 (~430 INFO findings)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

## Executive summary

The Supabase DB linter surfaced three categories of INFO-level findings on the shared production database:

| Category | Count | Action |
|---|---|---|
| `unindexed_foreign_keys` | 22 | ✅ Phase 1 — covered by migration `20260506091830_unindexed_foreign_keys.nontx.sql` |
| `unused_index` | ~405 | ⏸️ Phase 3 — DEFERRED for 30-day production observation |
| `auth_db_connections_absolute` | 1 | ⚙️ Phase 2 — Supabase Studio dashboard change required (see below) |

## Phase 1 — Add covering indexes for unindexed FKs ✅

Migration: `crm7/supabase/migrations/20260506091830_unindexed_foreign_keys.nontx.sql`

Adds 22 b-tree indexes via `CREATE INDEX CONCURRENTLY IF NOT EXISTS` (non-transactional, idempotent). All covers are plain — no unique/partial constraints.

**Why this is safe:** every index is purely additive. Worst case is a small disk-space increase; no read or write paths regress.

**Operational caveats:**

- **Disk impact:** < 200 MB total across all 22 indexes. Most target tables (avetmiss_exports, credit_notes, induction_records, financial_viability_snapshots, whs_audits, report_preferences, etc.) are low-row-count admin/audit surfaces — none are in the hot engagement/apprentice/placement core.
- **Stall warning:** `CREATE INDEX CONCURRENTLY` waits for all in-flight transactions on the target table to complete before each of its two build phases. A single long-running analytics query or open psql session can stall a statement for minutes. If the migration hangs > 10 minutes on any index, check `SELECT pid, query_start, state, query FROM pg_stat_activity WHERE query_start < now() - interval '5 min' ORDER BY query_start;` and decide whether to terminate the blocker or wait.

**Why these matter:** without a covering index on a FK column, Postgres must seq-scan the child table whenever the parent row is updated/deleted (cascade evaluation) and whenever a JOIN drives from parent→child. On a multi-tenant table like `report_preferences.tenant_id` or `email_integrations.*_vault_id` this becomes O(N) per parent mutation.

## Phase 2 — Auth DB connection strategy ⚙️

Finding: `auth_db_connections_absolute` — Auth server is configured for at most 10 absolute connections.

**Why this is INFO not WARN:** at the current instance size 10 is fine. The lint fires because if you scale up the Supabase instance later, the Auth pool stays at 10 and won't benefit from the larger DB. Scaling becomes a silent no-op for Auth performance.

**Action (manual, no SQL):**

1. Open Supabase Studio → Project Settings → **Database**
2. Scroll to the 'Auth Connection Management' section (setting name: *Auth Connection Management allocation strategy*)
3. Switch from **absolute** (current: `10`) to **percentage-based** allocation (Supabase recommends ~15% of `max_connections`)
4. Save and let Auth restart (~30s)

There is no documented Supabase Management API or `supabase` CLI command for this toggle as of 2026-05-06 — it must be done through Studio.

Reference: https://supabase.com/docs/guides/deployment/going-into-prod

**No code change needed.** This entry is a checkbox for the operator (Braden) to action when next visiting the Supabase dashboard.

## Phase 3 — Unused indexes ⏸️ DEFERRED

The linter flagged ~405 indexes with `idx_scan = 0` since the last `pg_stat_user_indexes` reset. **We are not dropping any of these yet.**

### Why mass-dropping is dangerous

`idx_scan = 0` means "no SELECT used this index since stats reset". It does NOT mean the index is unused. False positives include:

1. **FK cascade indexes** — Postgres consults them during DELETE/UPDATE on the parent, but the read isn't always counted as `idx_scan`. Drop = O(N) seq-scan on every parent mutation.
2. **Unique / partial / GIN constraint indexes** — even with zero reads, dropping breaks data integrity guarantees.
3. **RLS predicate indexes** — `_tenant_id` indexes used inside RLS policies show inconsistent stats counting.
4. **Recently-deployed feature indexes** — e.g. `idx_r7_*`, `idx_ideas_*`, `idx_launch_*`, `idx_coy_*`, `idx_aass_*`, `idx_mapd_*`, `idx_apprentice_handoff_tokens_*`. These features shipped in the past few weeks; the indexes haven't accumulated reads yet ≠ never needed.
5. **Stats-window edge cases** — `pg_stat_user_indexes` resets on Supabase maintenance windows, version bumps, or manual `pg_stat_reset()`. Counters may be much younger than the index.
6. **Trigram / GIN search indexes** — `idx_clients_name_trgm`, `idx_units_of_competency_code_trgm`, `wage_calc_snapshots_config_gin`, `wage_calc_snapshots_result_gin` — used by features that may be enabled but not yet exercised in production.

### Categorization of the 405 unused indexes

Spot-checking the 2026-05-06 list, findings group as:

#### 🔴 KEEP — FK-covering, do NOT drop

Indexes on FK columns where dropping would force seq-scan on parent cascade. Includes (non-exhaustive):
`idx_email_integrations_tenant_id`, `idx_clients_employer_id`, `idx_clients_primary_contact_id`, `idx_apprentices_contact_id`, `idx_apprentices_current_host_employer_id`, `idx_apprentices_qualification_id`, `idx_award_classifications_award_id`, `idx_award_rates_classification_id`, `idx_placements_employer_id`, `idx_placements_client_id`, `idx_placements_apprentice_id`, `idx_placements_award_rate_id`, `idx_engagements_*` (training_provider_id, worker_id, project_id, qualification_id, host_org_id, training_contract, award_rate_id), `idx_funding_claims_employer_id`, `idx_invoices_engagement`, `idx_invoices_host_employer`, `idx_payments_invoice`, `idx_apprentice_placements_engagement_id`, `idx_collab_docs_owner_id`, `idx_aht_*`, `idx_billing_history_subscription_id`, `idx_apprentice_handoff_tokens_*`, `idx_email_audit_log_*`, etc.

**Estimate:** ~150 of the 405 indexes are FK-covering and should be kept regardless of `idx_scan` counter.

#### 🟡 OBSERVE — recently deployed features (≤ 90 days old)

Feature areas that shipped recently and haven't accumulated production reads:

- R7 recruitment domain (`idx_r7_*` ~ 25 indexes)
- Ideas / launch / collaboration domain (`idx_ideas_*`, `idx_launch_*`, `idx_workspace_ideas_*`, `idx_idea_versions_*`, `idx_collaboration_sessions_*`, `idx_collab_docs_*`)
- Apprentice handoff tokens (`idx_aht_*`, `idx_apprentice_handoff_tokens_*`)
- COY / AASS / MAPD compliance (`idx_coy_*`, `idx_aass_*`, `idx_mapd_*`)
- GTO compliance assessments (`idx_gto_*`)
- AI sessions / messages (`idx_ai_*`)
- Tenant entity relations / field definitions (`idx_tenant_entity_*`, `idx_tfd_*`, `idx_tenant_field_definitions_*`)
- Custom pages / page sections (`idx_custom_pages_*`, `idx_page_sections_*`, `custom_pages_nav_idx`, `cms_*_idx`)
- Wage calc / charge rate / WIC (`wage_calc_snapshots_*`, `idx_crs_*`, `idx_hcr_*`, `idx_wic_*`, `idx_charge_rate_quotes_*`)

**Estimate:** ~180 of the 405 are in this bucket. Re-run the linter after 30+ days of production traffic before deciding.

#### 🟢 CANDIDATE — possibly droppable, but verify per-index

Indexes that look like duplicates of more-selective combined indexes, or partial indexes for conditions that are no longer queried. Examples to spot-check (NOT a green-light list):

- `idx_people_*` — many single-column indexes on `people` (status, host, name, contact, user, qualification, field_officer, search, anzsco, gender, school_based, type, tenant). Probably superseded by combined indexes; needs query-plan review.
- `idx_user_tenants_*` — multiple overlapping single-column indexes
- `idx_tenants_*` — many redundant filter indexes (status, allowed_domains, parent_tenant_id, organization_id, region, state, branding, owner_user_id, type_status)
- `idx_audit_logs_created_at`, `idx_user_activity_logs_created_at` — date indexes that may be superseded by BRIN or composite indexes
- `idx_*_custom_fields` — JSONB GIN indexes that may not be actively queried
- `inspections_org_id_idx`, `workflow_triggers_org_id_idx`, `report_configs_org_id_idx` — possibly redundant with combined RLS indexes

**Estimate:** ~75 of the 405 are in this bucket. Even these need per-index review before any DROP.

### Recommended Phase 3 procedure (when ready)

1. **Wait ≥ 30 days** of full production traffic from today (2026-05-06)
2. **Re-run** `select * from supabase.lint('unused_index')` and diff against this snapshot
3. **Filter** the new list to indexes that are (a) still flagged AND (b) not in the 🔴 KEEP bucket above AND (c) not unique/partial/constraint-bound
4. **For each candidate**: check `pg_stat_all_indexes.idx_tup_read` AND `pg_stat_all_indexes.idx_tup_fetch` are both `0` (catches reads that don't show in `idx_scan`)
5. **Soft-drop via rename first** — Postgres has no native 'invisible index' feature (that's MySQL). The safe pattern is:
   a. `ALTER INDEX <name> RENAME TO _deprecated_<name>_<yyyymmdd>;` — pure metadata change, fast.
   b. Observe production for ≥ 1 week. Most OLTP queries that depended on the index will surface as mean-exec-time regressions in `pg_stat_statements`. Rarely-run reports / admin queries may not surface within a week — extend the soak to 30+ days for indexes on tables used mostly by scheduled jobs (audit logs, launch metrics, compliance snapshots).
   c. If anything regresses, `ALTER INDEX _deprecated_<name>_<yyyymmdd> RENAME TO <name>;` restores it instantly with no REINDEX needed.
   d. If nothing regresses after a full week, `DROP INDEX CONCURRENTLY _deprecated_<name>_<yyyymmdd>;` as the hard drop.

   DO NOT manually UPDATE `pg_index SET indisvalid = false` — it's catalog tampering, causes maintenance overhead, and needs REINDEX to recover.

   Alternative for hypothetical analysis only: the `hypopg` extension lets you reason about *adding* indexes without creating them, but it does not help soft-drop existing indexes.

   > **Identifier-length footnote:** Postgres caps identifiers at 63 bytes. `_deprecated_` is 12 chars and a `_YYYYMMDD` suffix is 9 chars, so the original index name must be ≤ 42 chars to rename without truncation. For longer names (e.g. `idx_apprentice_handoff_tokens_*`), use a shorter tag like `_dep_<yyyymmdd>` (14 chars overhead) or skip the date suffix entirely.
6. **Batch the renames (step 5a) in groups of ≤ 10 per migration**, with at least one full week of production observation between batches. The final `DROP INDEX CONCURRENTLY` (step 5d) for a given batch happens only after that batch's soak window completes with no regressions.
7. **Roll back** any drop that triggers a slow-query alert

No Phase 3 migration is being generated in this changeset.

## Apply order

1. Phase 1 migration ships in the next CRM7 PR → `pnpm supabase db push` (or whatever the runner is) picks up the `.nontx.sql`
2. **Post-migration: check for INVALID indexes.** `IF NOT EXISTS` does NOT protect against a partially-completed `CREATE INDEX CONCURRENTLY` — if any statement was interrupted (deadlock, session disconnect, runner timeout) the index will exist with `indisvalid = false` and a re-run will silently skip it. Run:

   ```sql
   SELECT n.nspname || '.' || c.relname AS invalid_index
   FROM pg_index i
   JOIN pg_class c      ON c.oid = i.indexrelid
   JOIN pg_namespace n  ON n.oid = c.relnamespace
   WHERE i.indisvalid = false
     AND n.nspname = 'public';
   ```

   If any row returns, `DROP INDEX CONCURRENTLY <name>;` the invalid ones and re-run the migration. Don't `REINDEX` — the partial index is faster to drop than repair.

3. **24–48h later: confirm the 22 new indexes are being exercised.** Spot-check with:

   ```sql
   SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
     AND indexrelname IN (
       'idx_avetmiss_exports_lodged_by',
       'idx_avetmiss_exports_tenant_id',
       'idx_credit_notes_tenant_id',
       'idx_email_integrations_access_token_vault_id',
       'idx_email_integrations_imap_password_vault_id',
       'idx_email_integrations_refresh_token_vault_id',
       'idx_email_integrations_smtp_password_vault_id',
       'idx_financial_viability_snapshots_declaring_officer',
       'idx_induction_records_conducted_by',
       'idx_induction_records_engagement_id',
       'idx_invoice_batches_created_by',
       'idx_invoices_created_by',
       'idx_lln_assessments_assessor_user_id',
       'idx_org_members_created_by',
       'idx_pay_runs_created_by',
       'idx_payments_recorded_by',
       'idx_report_deliveries_preference_id',
       'idx_report_deliveries_requested_by',
       'idx_report_preferences_tenant_id',
       'idx_timesheet_events_actor_user_id',
       'idx_wage_calculation_snapshots_created_by',
       'idx_whs_audits_auditor_user_id'
     )
   ORDER BY idx_scan DESC;
   ```

   Any index still at `idx_scan = 0` after a full week of production traffic is expected for low-mutation tables (audit/admin surfaces) — the value of the index is only realized under parent DELETE/UPDATE cascades, which may be rare. No action required — informational only.

4. Phase 2 dashboard change is performed manually after the migration deploys.
5. Phase 3 review document is parked here for a 30-day observation window.

## References

- Original linter dump: dropped into the 2026-05-06 working session (Buffy/Codebuff)
- Supabase docs — unindexed FKs: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- Supabase docs — unused indexes: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index
- Supabase docs — going into prod: https://supabase.com/docs/guides/deployment/going-into-prod
- `.nontx.sql` convention: `crm7/supabase/migrations/MIGRATION_NOTE_20260504020200.md`
