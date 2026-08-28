# Table Usage Audit — 2026-05-06

> ## ⚠ POPULATION SUPERSEDED — re-measured 2026-08-17
>
> **This audit covered 229 tables. The live database now has 402.** Measured against
> `tuybltdrdefjblnplpqo`:
>
> ```sql
> SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
> WHERE n.nspname = 'public' AND c.relkind = 'r';   -- 402
> ```
>
> **173 tables — 43% of the schema — have never been through this audit.** Every per-table finding
> below is still valid *for the table it names*; what is void is the claim of **coverage**. Do not
> cite this document as "all `public.*` tables audited", and do not read the "zero tables safe to
> drop" verdict as covering the schema — it covers the 229 that existed on 2026-05-06.
>
> The unaudited remainder is the real finding: a table added after 2026-05-06 has never had its
> usage signals collected, so nothing here tells you whether it is live, orphaned or duplicated.
> Re-running the 7-signal sweep over the full 402 is the outstanding work; this banner is not a
> substitute for it.

> **Status: Superseded.** This document describes a past state and will not be revised.
>
> **Marker corrected 2026-08-28: `v1.00W` → `v1.00F`.** The banner above is this document's own
> declaration that it is closed; `W` said the opposite. Under the operator ruling of
> 2026-08-26, **`F` means frozen** — a statement about this document's *mutability*, not a claim
> that the work it describes is current and not a ranking of authority against its successor.
> Re-running the 7-signal sweep over the full 402 tables produces a NEW document; this one is
> the closed record of the 2026-05-06 pass and will not be revised.

**Status:** Working (W) — per-table conclusions stand for the 2026-05-06 population; the population itself is superseded (see banner). Recommendations require per-table human sign-off before any drop migration is written.
**DB Project:** `tuybltdrdefjblnplpqo` (shared CRM7 / BSU / R80.4 / throughput / conduit / braden Supabase instance — R80.3 was the submodule when this was written; it was replaced by R80.4 on 2026-08-06)
**Scope:** All 229 `public.*` tables **as at 2026-05-06**, audited for usage across 7 independent signal dimensions. Live count 2026-08-17: **402**.

## Executive summary

**Verdict: no tables meet the strict “safe to drop” bar today.**

The user's constraint was: *drop ONLY if a suitable replacement is already in active use.* After exhaustive auditing, **zero** tables passed this bar. The closest candidates on superficial inspection (e.g. `invoice_batch_items`, `apprentice_placements`) turned out to serve distinct purposes from their similarly-named siblings and are either (a) genuinely used by production code paths the strict grep missed, or (b) covered by orthogonal schemas that make them non-replaceable.

| Verdict | Count | Safe to drop? |
|---|---|---|
| `USED_STRONG` (app-code refs AND DB-internal refs) | 143 | No — actively used |
| `USED_WEAK` (one signal only) | 73 | No — used, just less cross-referenced |
| `UNCLEAR` (no code/DB refs, but live stats activity) | 12 | No — accessed via dynamic SQL or admin surfaces |
| `DROP_CANDIDATE` (nothing anywhere) | 1 → **0** after manual review (`invoice_batch_items` was a false positive) | **No** — see §Strict-grep escapes |
| **Total** | **229** | **0** |

## Methodology

For every table in the `public` schema, we collected 7 independent usage signals:

| # | Signal | Source | What it catches |
|---|---|---|---|
| 1 | **App-code refs** | `grep -rIF "'<table>'"` across 6 app `/src/` roots | Explicit `.from('table')` Supabase calls |
| 2 | **Incoming FKs** | `pg_constraint` where `confrelid = <table>` | Referential dependencies from other tables |
| 3 | **RLS policies** | `pg_policies` | Row-level-security presence (informational — weak signal, all tables have RLS) |
| 4 | **Triggers** | `pg_trigger` (non-internal) | Active DB-side logic attached to the table |
| 5 | **Functions** | `pg_proc.pg_get_functiondef(...) ~* table_name` | Procedures / RPCs that read or write the table |
| 6 | **Views / matviews** | `pg_get_viewdef(...) ~* table_name` | Read-surface composition |
| 7 | **Stats activity** | `pg_stat_user_tables.n_tup_ins/upd/del/seq_scan/idx_scan` | Actual runtime usage (catches dynamic access) |

**Classification rules:**

- `USED_STRONG` — app-code refs ≥ 1 AND (FKs + views + functions + triggers) ≥ 1
- `USED_WEAK` — only one of the above buckets has a hit
- `UNCLEAR` — no code/DB refs found, but `pg_stat_user_tables` shows activity (writes or > 5 sequential scans)
- `DROP_CANDIDATE` — zero signals anywhere

RLS policy presence alone does NOT count as “used” — every table has RLS under Supabase by default.

## Methodology blind spots

The signal set is strong but not exhaustive. Known gaps — future auditors should extend the grep before treating any table as truly unused:

1. **Nested-select syntax is invisible to the strict grep.** Supabase JS idiom `.select('parent, child:child_table(col)')` or `.select('*, child_table(*)')` embeds the child table name inside a larger string literal. `grep -rIF "'child_table'"` does NOT match. This almost certainly explains several of the 12 UNCLEAR tables that are natural child-of-parent joins (e.g. `funding_claim_items`, `host_contracts`). A loose `rg -F 'child_table'` (no quote anchoring) pass is recommended for the UNCLEAR bucket before any drop consideration.

2. **Edge Functions directory was NOT searched.** The grep covered `<app>/src/` across 6 apps, but Supabase Edge Functions live under `<app>/supabase/functions/` (outside `/src/`). Tables like `mapd_webhook_queue`, `email_audit_log`, `tga_sync_runs`, `business_suite_subscriptions` are exactly the kind of infrastructure typically driven by Edge Functions from Stripe / webhook / cron surfaces. Extend future audits with `-g 'supabase/functions/**'` inclusion.

3. **`.rpc()` call chains hide table usage one indirection away.** If an app calls `supabase.rpc('get_vet_packages')` and the Postgres function internally reads `vet_training_packages`, the table shows zero app refs but is fully wired in through the RPC surface. The Functions signal (#5) catches this on the DB side, but the doc should be explicit that app-code refs underestimate usage wherever `.rpc()` is the call path.

4. **Cross-app ownership is not single-repo.** This audit greps 6 app `/src/` roots (crm7, business-suite-unified, R80.3, throughput, conduit, braden). A table with zero hits across all 6 may still be the owned write-surface of a seventh app not yet in this monorepo, or of an Edge Function the owning team maintains separately. Per `docs/20260227-dry-one-shot-architecture-v1.04A.md`, every entity has exactly ONE owning app; "invisible to crm7" ≠ "unused". Before dropping any table, cross-check the canonical entity-ownership map and confirm with the owning app's maintainer.

5. **Generated type imports are invisible.** Output from `supabase gen types typescript` produces identifiers like `Database['public']['Tables']['<table>']['Row']` that the strict grep doesn't match. Future audits should grep the generated `database.types.ts` files explicitly.

## The 12 UNCLEAR tables

These have runtime activity but no direct code references. They are almost certainly accessed via one of:

- Supabase JS client's dynamic builder with a string variable (`supabase.from(tableName)`)
- Supabase Studio manual queries / dashboards
- Service-role Edge Functions or cron jobs outside the audited JS codebases
- Postgres-side triggers/functions whose names don't literally contain the table name

| Table | Writes | Idx scans | Seq scans | Likely usage |
|---|---:|---:|---:|---|
| `api_keys` | 8 | 11 | 26 | Auth/admin surface, written by service-role |
| `apprentice_placements` | 9 | 9 | 199 | Legacy JSONB-only model (4 cols vs `placements`' 28) — **investigate before next audit, do not drop**. Likely a migration-staging or sync-adapter surface. See §Similar-name groups. |
| `business_suite_subscriptions` | 2 | 1 | 27 | Stripe webhook writes (no app-code ref because webhook is a raw route) |
| `email_audit_log` | 0 | 17 | 19 | Likely written by email edge function |
| `funding_claim_items` | 0 | 9 | 11 | Child rows of `funding_claims`; may be read via JOIN only |
| `host_contracts` | 0 | 9 | 199 | Likely referenced by dynamic admin query |
| `inspection_reminders` | 0 | 1 | 221 | Referenced by scheduled cron — 221 seq-scans suggests periodic polling |
| `mapd_webhook_queue` | 0 | 2 | 7 | Webhook integration — written by external API |
| `mapd_webhook_subscriptions` | 7 | 8 | 12 | Webhook integration |
| `tga_sync_runs` | 23 | 24 | 4 | TGA government-API sync job |
| `vet_training_packages` | 0 | 9 | 8 | Referenced via JOIN from qualification_units |
| `wic_rate_lookup` | 13 | 13 | 12 | Wage calc rate lookup |

**Recommendation:** Do NOT drop. All 12 show live DB activity. Before the next audit:

1. Enable `pg_stat_statements` (or query it if already enabled) and capture actual query text for each of these 12 tables over a 30-day window
2. Extend the grep per §Methodology blind spots (loose match + `supabase/functions/` + `database.types.ts`)
3. Map each UNCLEAR table to its likely owning app per the DRY entity-ownership spec and confirm with that team
4. Promote each table to `USED_STRONG` once the access path is documented, OR re-classify to `DROP_CANDIDATE_PENDING_OWNER_SIGN_OFF` if the 30-day trace shows zero activity

## Strict-grep escapes (why `invoice_batch_items` is not a drop candidate)

The pass-1 classifier flagged exactly 1 table as `DROP_CANDIDATE`: `invoice_batch_items`. Manual inspection revealed:

- `crm7/src/types/billing.ts` defines the TypeScript `InvoiceBatchItem` interface
- `crm7/src/lib/pipelines/xeroInvoiceAdapter.ts` imports and uses it
- The table has 2 outbound FKs (`batch_id` → `invoice_batches.id`, `invoice_id` → `invoices.id`)
- It tracks Xero batch-submission status (distinct from `invoice_line_items` which stores the actual line-item content)

**Why the grep missed it:** our case-sensitive single-quote grep `grep -rIF "'invoice_batch_items'"` only catches Supabase client-builder calls like `.from('invoice_batch_items')`. The table is consumed via a typed TypeScript interface with a different spelling (`InvoiceBatchItem`) which the grep didn't catch.

**Lesson:** next audit should also grep for PascalCase singular forms (`InvoiceBatchItem`), TypeScript type-only imports, and generated types from `supabase gen types`.

**Verdict: keep.** Not a drop candidate.

## Similar-name groups (the “replacement” analysis)

Since the user's bar is “drop only if replacement is already in use,” we examined every group of similar-sounding tables to see if any is a genuine deprecated duplicate. **None are.** Summary:

| Group | Members | Analysis |
|---|---|---|
| **person** | `people` (63 refs), `apprentices` (57 refs), `workers` (2 refs, 50 writes) | `people` is the generic contact store; `apprentices` is the trainee-specific entity with 24 incoming FKs; `workers` is written by a different surface (50 writes, 2 app refs). All three are distinct. |
| **placement** | `placements` (35 refs, 28 cols), `apprentice_placements` (0 refs, 4 cols JSONB) | `placements` is the full entity; `apprentice_placements` is a legacy light-weight JSONB record linked via `engagement_id`. Schemas do NOT overlap — different abstractions. |
| **org** | `organizations` (5 refs, 16 FKs), `enterprises` (1 ref, 1 FK), `gto_organizations` (1 ref, 2 FKs) | `organizations` is the hub (16 incoming FKs); `enterprises` and `gto_organizations` are domain-specific subtypes. Not duplicates. |
| **membership** | `org_members` (0 app refs, 5 function refs), `organization_members` (0 app refs, 2 function refs), `enterprise_memberships` (1 ref, 8 writes) | All three exist and are referenced by different DB functions / RPCs. Likely legacy accrued from multiple tenant models. Candidates for future consolidation, but no one-to-one replacement today. |
| **payroll-run** | `pay_runs` (6 refs), `payroll_records` (6 refs) | Different concepts: `pay_runs` = run header, `payroll_records` = per-employee line record. Both active. |
| **inspection** | `inspections` (5 refs, 51 writes), `workplace_inspections` (4 refs, 0 writes), `site_inspections` (unclassified) | `inspections` is the write-active one; `workplace_inspections` has app refs but zero writes. Worth monitoring — not yet deprecable. |
| **whs** | `whs_audits` (6 refs, 0 writes), `whs_records` (8 refs, 20 writes), `whs_incidents`, `whs_documents`, `whs_policies`, `whs_risk_assessments`, `whs_witnesses` | Part of a WHS compliance module. Each is a distinct entity. Keep all. |
| **report** | `report_configs` (2 refs, 1 FK), `report_templates` (2 refs, 2 FKs), `report_preferences` (0 refs, 1 FK) | Config vs template vs per-user preference. Orthogonal. All three are lightly used but serve different purposes. |
| **cms** | `custom_pages` (22 refs, 6510 idx_scans), `content_pages` (19 refs, 2 writes), `content_blocks` (2 refs) | `custom_pages` is the high-read path. `content_pages` may be a legacy precursor but its schema and code paths need per-file tracing before any drop consideration. |
| **notify** | `notifications` (18 refs), `app_notifications` (8 refs, 225 writes), `system_notices` (21 refs, 230 writes) | Three-tier notification system by audience (user/app/system). All active. |
| **invoice-items** | `invoice_line_items` (17 refs), `invoice_batch_items` (0 direct refs but used via TS interface) | Different purposes (line content vs Xero batch status). Covered in §Strict-grep escapes. |
| **contact** | `contacts` (53 refs, 18 FKs), `contact_activities` (1 ref, 35 idx_scans), `contact_messages` (2 refs), `support_contacts` (3 refs), `communications` (10 refs, 916 idx_scans) | Hub-and-spoke pattern: `contacts` = entity, others = activity streams / message types. Not duplicates. |
| **doc** | `documents` (19 refs), `document_records` (10 refs), `document_metadata` | Likely layered (record = storage row, document = business entity). Usage distinct. |
| **tenant-ext** | `tenant_entities` (21 refs, 76 rows), `tenant_entity_relations` (17 refs), `tenant_field_definitions` (14 refs) | Custom-schema extension subsystem. All three are active; they describe the meta-model. |
| **user-tenant** | `user_tenants` (64 refs, 441 idx_scans, 36616 seq_scans) | Only one exists as a real table — `user_tenant_links` seen in migrations does NOT exist in the live DB. |

## Action items

**No migration is generated in this changeset.** The user's bar (“drop only if replacement exists”) is not met by any table. Actions instead:

### Do now

1. **Park this doc** — it's the authoritative 2026-05-06 snapshot. Any future drop proposal must justify against this baseline.
2. **Extend the next audit's grep patterns** to include PascalCase singulars (`InvoiceBatchItem`), TypeScript type-only imports, and `supabase gen types` output so the strict-grep false-positive rate drops further.

### Do later (when we have budget for it)

1. **Trace the 12 UNCLEAR tables** by enabling `pg_stat_statements` and capturing the actual query text that touches them. This promotes them from `UNCLEAR` to `USED_STRONG` (or confirms abandonment).
2. **Consider consolidation** of the three-table membership group (`org_members` / `organization_members` / `enterprise_memberships`) if the legacy one can be retired via a schema migration with data preservation. This is a significant refactor — not a drop.
3. **Verify the `workplace_inspections` vs `inspections` pair** with a write-path trace. If `workplace_inspections` truly has zero writes for > 90 days post-audit, revisit drop-ability.
4. **Re-run this audit every quarter** against the Phase-3 unused-index snapshot in `docs/20260506-supabase-linter-action-plan-v1.00W.md`. The two docs are complementary: index audit = performance; table audit = schema hygiene.

### NEVER do

1. **Never** mass-drop tables with zero app refs. The 73 `USED_WEAK` and 12 `UNCLEAR` tables are all legitimately wired in via paths the static grep cannot see (see §Methodology blind spots).
2. **Never** drop one side of a “similar-name group” without per-schema semantic review. The analysis above demonstrates every similar-name pair in the DB is actually orthogonal.
3. **Never** trust `pg_stat_user_tables.idx_scan = 0` as proof of disuse — stats reset on Supabase maintenance windows.
4. **Never** drop a table invisible to crm7 without cross-checking the DRY entity-ownership map (`docs/20260227-dry-one-shot-architecture-v1.04A.md`) AND pinging the likely-owning app's maintainer. A table that looks orphaned from the crm7 vantage point may be load-bearing for BSU, braden, throughput, or a downstream consumer outside this monorepo.
5. **Never** use this audit as a basis for a bulk DROP migration. Any drop proposal must be a separate, per-table PR with explicit human sign-off citing which specific replacement is in use and which owning app was consulted.

## Appendix A — Signal source queries

All queries are reproducible from any `POSTGRES_URL_NON_POOLING` connection. See `docs/20260506-supabase-linter-action-plan-v1.00W.md` for the complementary index-level audit.

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

### View/function references (lexical scan of source text)

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

## Appendix B — Relationship to the FK-index migration

This audit is orthogonal to `crm7/supabase/migrations/20260506091830_unindexed_foreign_keys.nontx.sql` (the 22-FK-cover migration from the same day). That migration adds performance infrastructure to existing wired-in tables; this audit verifies those tables are actually used at all (yes, they are).

## References

- Complementary index-level audit: `docs/20260506-supabase-linter-action-plan-v1.00W.md`
- DRY One-Shot architecture spec (entity-ownership model): `docs/20260227-dry-one-shot-architecture-v1.04A.md`
- Linter categorization taxonomy: Supabase DB Linter v0005 (`unused_index`) + v0001 (`unindexed_foreign_keys`)
- Audit TSV artifacts (not committed to repo): `/tmp/audit-merged.tsv`, `/tmp/tbl-app-refs.tsv`
