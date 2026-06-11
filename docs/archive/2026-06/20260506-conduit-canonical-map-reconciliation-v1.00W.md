# Conduit Canonical-Map Reconciliation — 2026-05-06

**Status:** Working (W) — findings confirmed; two decision paths documented; spec-doc edit deferred to DRY architecture owner.
**Companion to:** `docs/20260506-table-usage-audit-v1.00W.md` §DRY canonical-map verification.
**DB Project:** `tuybltdrdefjblnplpqo` (shared) — NOT a separate Conduit project.

## Executive summary

**The Conduit domain is NOT missing. It lives under an `r7_*` table prefix in the shared Supabase project — not under the `conduit_*` prefix that `docs/20260227-dry-one-shot-architecture-v1.02A.md` §1 documents.**

This is a **spec-documentation bug**, not an implementation gap. Sixteen `r7_*` tables exist in `public.*`, with RLS policies, Conduit-owned migrations in `conduit/supabase/migrations/`, and live data in the core pipeline tables. The DRY spec must be updated to match the live schema naming.

| | Claim | Reality |
|---|---|---|
| DRY spec §1 | Conduit owns 9 `conduit_*` tables | These tables DO NOT EXIST in the live DB |
| DRY spec §1 | Conduit is a missing/unfinished domain | Conduit is a working app with live data |
| Actual | — | Conduit owns **16** `r7_*` tables in the SAME Supabase project as CRM7/BSU/R80.3/throughput/braden |

## Evidence

### 1. Conduit shares the CRM7 Supabase project

Both `conduit/.env.local` and `crm7/.env.local` point `NEXT_PUBLIC_SUPABASE_URL` at `https://tuybltdrdefjblnplpqo.supabase.co`. There is no separate Conduit Supabase project. Conduit therefore shares the `public` schema with the rest of BSuite.

### 2. `r7_*` tables are Conduit's actual owned surface

Live DB query:

```sql
SELECT relname, n_live_tup FROM pg_stat_user_tables
WHERE schemaname = 'public' AND relname LIKE 'r7_%'
ORDER BY 1;
```

Returns 16 tables:

| Table | Live rows | Role |
|---|---:|---|
| `r7_candidates` | 8 | Candidate records (core entity) |
| `r7_jobs` | 7 | Open roles being sourced |
| `r7_pipeline_stages` | 9 | ATS-style pipeline configuration |
| `r7_applications` | 0 | Candidate→job application events |
| `r7_candidate_pool_memberships` | 0 | Talent pool membership link table |
| `r7_communications` | 0 | Outbound messages / notes |
| `r7_compliance_checks` | 0 | Right-to-work / WWCC / screening |
| `r7_documents` | 0 | Resumes, credentials, attachments |
| `r7_interviews` | 0 | Interview events |
| `r7_job_distributions` | 0 | Job-board distribution targets |
| `r7_offers` | 0 | Offer documents |
| `r7_onboarding_instances` | 0 | Active onboarding runs |
| `r7_onboarding_tasks` | 0 | Individual onboarding steps |
| `r7_onboarding_templates` | 0 | Reusable onboarding flows |
| `r7_pipeline_entries` | 0 | Per-candidate pipeline-stage position |
| `r7_talent_pools` | 0 | Named candidate pools |

Three tables have real data (`r7_candidates`, `r7_jobs`, `r7_pipeline_stages`); the rest are schema-ready but awaiting feature wiring — expected for a staged rollout.

### 3. Conduit-owned migrations exist and target `r7_*` tables

In `conduit/supabase/migrations/`:

```
20260304040000_add_rls_to_r7_tables.sql
20260410090000_add_general_settings_columns.sql
20260412160000_add_interview_scorecards.sql
20260414040000_candidate_portal_rls.sql
20260414050000_public_careers_access.sql
20260418170000_r7_candidates_contact_id_not_null_expand.sql
20260427123000_resolve_bs_oauth_subject_portal_role.sql
20260427132000_fix_bs_oauth_subject_portal_role_union.sql
20260504010000_fix_r7_current_tenant_id_search_path.sql
```

These migrations:
- Add RLS to the full `r7_*` table set (candidate-portal gating, tenant scoping)
- Add scorecard structure (`r7_interviews` detail)
- Expand `r7_candidates` with `contact_id` → `public.contacts(id)` FK — **key DRY compliance: candidates link into the canonical `contacts` hub, they don't duplicate contact fields.**
- Reconcile OAuth subject portal roles (shared auth contract with the rest of BSuite)

This confirms Conduit is following the DRY one-shot doctrine correctly — it just does so under a different table-name prefix than the spec documents.

## Why the divergence exists (best-effort reconstruction)

The `r7` prefix almost certainly stands for **Recruit7** or **Radius7** — the Conduit product's internal code name — preceding the final `conduit` branding. When DRY v1.02A §1 was authored (2026-02-27), the spec team appears to have aliased the name to `conduit_*` for doctrinal consistency, without realizing the migrations had already shipped under `r7_*`. The migrations predate the spec and are therefore authoritative.

## Resolution paths

### Recommended: **Option A — update the spec to match the live schema**

Edit `docs/20260227-dry-one-shot-architecture-v1.02A.md` §1 to rename every `conduit_*` entity to its `r7_*` live-DB equivalent. Add a footnote explaining the historical `r7` prefix.

**Rationale:**
- Zero migration risk (no DDL change)
- Preserves historical git history attached to `r7_*` tables
- Conduit migrations already target `r7_*`; RLS, FKs, triggers, and 15 active rows would all need to be recreated under a rename
- Conduit has in-flight work against `r7_*` (latest migration 2026-05-04)

### Not recommended: Option B — rename live tables to `conduit_*`

Requires: 16 `ALTER TABLE ... RENAME TO` statements + re-pointing every RLS policy, FK, trigger, index, and the 9 Conduit migrations + all app code that hits `r7_*` via the Supabase JS client. Net-negative because the spec is the flexible doc, not the schema.

### Not recommended: Option C — leave divergence in place

Future audits will re-surface this as a false positive every quarter. The spec doc is the source of truth for entity ownership per the DRY doctrine; leaving it wrong silently costs future reviewer time.

## Action items

**Owner:** DRY architecture spec maintainer (NOT the audit session).

1. **Apply Option A** — update DRY v1.02A §1 rows for Conduit:
   - `conduit_candidates` → `r7_candidates`
   - `conduit_talent_pools` → `r7_talent_pools`
   - `conduit_jobs` → `r7_jobs`
   - `conduit_applications` → `r7_applications`
   - `conduit_pipeline_stages` → `r7_pipeline_stages`
   - `conduit_pipeline_entries` → `r7_pipeline_entries`
   - `conduit_compliance_checks` → `r7_compliance_checks`
   - `conduit_communications` → `r7_communications`
   - `conduit_documents` → `r7_documents`
   - **Plus add** the 7 tables missing from the original spec: `r7_candidate_pool_memberships`, `r7_interviews`, `r7_job_distributions`, `r7_offers`, `r7_onboarding_instances`, `r7_onboarding_tasks`, `r7_onboarding_templates`.
2. **Bump spec version** to v1.03A with changelog entry: *"Rename Conduit domain tables from `conduit_*` (aspirational) to `r7_*` (live-DB actual). Add 7 previously-undocumented Conduit tables to §1."*
3. **Add a cross-reference footnote** in v1.03A §1 Conduit rows: *"Historical `r7_` prefix preserved from the Recruit7 product code-name; do NOT rename in DB."*
4. **Notify the Conduit app maintainer** so any new tables follow the `r7_` prefix convention for consistency.

## What this report does NOT do

- Does not edit the DRY spec itself (that's the spec owner's job per DRY doctrine).
- Does not rename any live tables (that would be destructive).
- Does not touch `docs/20260506-table-usage-audit-v1.00W.md` (a separate update captures the resolved-divergence finding).
- Does not drop, add, or alter any tables in any schema.

## References

- DRY one-shot architecture spec (source of the `conduit_*` naming claim): `docs/20260227-dry-one-shot-architecture-v1.02A.md` §1
- Table audit that surfaced the divergence: `docs/20260506-table-usage-audit-v1.00W.md` §DRY canonical-map verification
- Conduit migrations (authoritative DDL for `r7_*`): `conduit/supabase/migrations/`
- Entity crosswalk: `docs/20260319-entity-crosswalk-v1.00D.md`
