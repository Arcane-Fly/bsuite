# Conduit schema-gap decision — backward (rename canonical-map slots)

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research lane per protocol §11)
**Status:** **DECIDED — backward (rename slots from `conduit_*` to `r7_*`)**
**Closes:** queue item `CONDUIT-SCHEMA-GAP` (codebuff finding)
**Implements:** ownership-map.json edit in same PR

---

## Executive summary

Codebuff's table-usage audit identified 9 `conduit_*` table slots in `packages/dry-lint/src/ownership-map.json` that have no corresponding live tables. The gap is real, but the framing was inverted: it is **not** "9 missing tables" but "**1 naming-convention mismatch + 7 over-deliveries**".

**Direction chosen: BACKWARD** — rename the 9 `conduit_*` canonical slots to their actual production prefix `r7_*`, AND register 7 additional `r7_*` tables that live in production but were absent from the canonical map.

**Net change:** 9 slots renamed + 7 slots added = 16 slots representing the live conduit ATS schema.

---

## Evidence trail (all verified live)

### 1. Live Supabase schema (project `tuybltdrdefjblnplpqo`)

Query result (`information_schema.tables`, `public` schema, table_name LIKE 'conduit%' OR schema = 'conduit'):

```
[]
```

**Zero conduit_* tables exist live. Zero `conduit` schema namespace exists.**

Query result (`table_name LIKE 'r7_%'`, public schema):

```
r7_applications
r7_candidate_pool_memberships
r7_candidates
r7_communications
r7_compliance_checks
r7_documents
r7_interviews
r7_job_distributions
r7_jobs
r7_offers
r7_onboarding_instances
r7_onboarding_tasks
r7_onboarding_templates
r7_pipeline_entries
r7_pipeline_stages
r7_talent_pools
```

**16 r7_* tables exist live.** All 9 canonical-map `conduit_*` names map cleanly to existing `r7_*` tables. 7 additional r7_* tables (interviews, offers, onboarding-templates/instances/tasks, candidate_pool_memberships, job_distributions) are over-deliveries to surface in the canonical map.

### 2. Production code references

| Search target | Repo | Hits |
|---|---|---|
| `conduit_candidates` | conduit | 0 |
| `conduit_jobs` | conduit | 0 |
| `conduit_applications` | conduit | 0 |
| `conduit_pipeline_stages` | conduit | 0 |
| `conduit_pipeline_entries` | conduit | 0 |
| `conduit_compliance_checks` | conduit | 0 |
| `conduit_communications` | conduit | 0 |
| `conduit_documents` | conduit | 0 |
| `conduit_talent_pools` | conduit | 0 |
| same set | crm7 | 0 |
| same set | business-suite-unified | 0 |

**Zero production code references the canonical-map `conduit_*` names.** The slots are speculative.

### 3. Migration history (conduit submodule)

`supabase/migrations/` directory inventory shows tables created with `r7_` prefix throughout:

- `20260304040000_add_rls_to_r7_tables.sql` — applies tenant-scoped RLS to all r7_* tables using `r7_current_tenant_id()` function
- `20260418170000_r7_candidates_contact_id_not_null_expand.sql` — schema evolution
- `20260504010000_fix_r7_current_tenant_id_search_path.sql` — search-path hardening (advisor remediation)
- 6 additional migrations all using `r7_` prefix

The `r7_` prefix has been the production convention since at least 2026-03-04. The `conduit_` slots in the canonical map predate this convention and were never reconciled.

### 4. RLS architecture

The `add_rls_to_r7_tables.sql` migration creates policies of the form:

```sql
CREATE POLICY <name> ON <r7_table>
  FOR ALL
  USING (tenant_id = r7_current_tenant_id())
  WITH CHECK (tenant_id = r7_current_tenant_id())
```

Renaming the canonical-map slots from `conduit_*` to `r7_*` aligns the canonical map with the actual RLS enforcement surface. AUTH_CANONICAL.md compliance is preserved (tenant-scoped, no cookie SSO, RLS as source of truth).

---

## Forward vs backward analysis (why backward)

### Cost of forward (create the 9 conduit_* tables)

- 9 new migrations creating duplicate tables
- 9 new RLS policies duplicating logic from `r7_*`
- Data migration logic (impossible without business decision on which set is canonical)
- Refactor every reference in conduit submodule code, type generation, RLS, GraphQL
- Risk of split-brain (writes go to one set, reads go to other)
- Estimated effort: **20-30 PRs across conduit + canonical map + dry-lint baseline**
- Risk: **HIGH** (production data migration, dual-source-of-truth window)

### Cost of backward (rename canonical-map slots)

- One canonical-map edit (this PR): 9 slots renamed + 7 added
- One `dry-lint` baseline regeneration (next CI run picks up automatically — no manual file changes)
- Zero production code changes (production already uses `r7_*`)
- Zero data migration
- Estimated effort: **this PR + automatic baseline refresh**
- Risk: **LOW** (canonical-map drift correction; production schema unchanged)

### Decision criterion (per Universal AI Agent Rulebook §5)

> Default to: latest, most complete, highest standard, most beautiful intuitive UX.

Production code = ground truth. The canonical map should reflect what is, not what someone speculated. Backward direction:

- ✓ **latest** (matches 2026-03-04 onwards production convention)
- ✓ **most complete** (covers 16 tables, not 9)
- ✓ **highest standard** (zero data risk, zero migration ambiguity)
- ✓ **most beautiful UX** (developers reading the canonical map see what's actually in the database)

---

## Implementation (this PR)

### File changed

`packages/dry-lint/src/ownership-map.json`

### Diff summary

**Removed (9 slots):**
- `conduit_candidates`, `conduit_talent_pools`, `conduit_jobs`, `conduit_applications`, `conduit_pipeline_stages`, `conduit_pipeline_entries`, `conduit_compliance_checks`, `conduit_communications`, `conduit_documents`

**Added (16 slots):**
- `r7_candidates`, `r7_candidate_pool_memberships`, `r7_talent_pools`, `r7_jobs`, `r7_job_distributions`, `r7_applications`, `r7_pipeline_stages`, `r7_pipeline_entries`, `r7_compliance_checks`, `r7_communications`, `r7_documents`, `r7_interviews`, `r7_offers`, `r7_onboarding_templates`, `r7_onboarding_instances`, `r7_onboarding_tasks`

All retain `owner: "conduit"` (no governance change). The 5 readable-by-crm7 slots are preserved + 2 new (r7_offers, r7_onboarding_instances) added per cross-app handoff requirements documented in conduit migrations.

Comment block on `r7_candidates` cites this decision doc.

---

## Post-merge follow-up

1. **dry-lint baseline auto-refresh** — next CI pipeline run will regenerate the dry-run-report; no manual action.
2. **Codebuff doc reconciliation** — `docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md` (codebuff's audit) should be marked complete in any tracking dashboard once this lands.
3. **Visual Feature Builder Phase 6** (FB-PHASE-6 portal targeting) can register conduit ATS routes against the now-correct canonical-map entries.
4. **Workqueue update** — `CONDUIT-SCHEMA-GAP` flips to `status=review` pending claude-code cross-validation per protocol §17.

---

## §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve (paths verified to exist in repo)
2. ✓ All external URL citations checked (only AUTH_CANONICAL.md reference, internal)
3. ✓ No placeholders (no TBD/TODO without owner+ETA)
4. ✓ Conventional commit `docs(dry-lint):` prefix in PR
5. ✓ Naming `20260506-conduit-schema-gap-decision-v1.00W.md`

## §17 mutual-reminder (cross-validation by claude-code requested)

- ✓ red-team table present (forward vs backward analysis above)
- ✓ smoke test documented (live Supabase query results inlined as evidence)
- ✓ no orphan branches expected (will delete `perplexity/codehouse/conduit-schema-gap-research` after merge)
- ✓ no dead code introduced (canonical-map edit only; comment cites this doc)

## AUTH_CANONICAL.md compliance

Canonical-map renaming preserves the existing RLS architecture exactly. No auth-flow changes. The `r7_*` tables already enforce tenant-scoped RLS via `r7_current_tenant_id()` per `20260304040000_add_rls_to_r7_tables.sql`. No cookie SSO, no client-side auth checks introduced.
