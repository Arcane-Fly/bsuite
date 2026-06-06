# BSuite Parent Repo Migrations

This directory holds migrations that affect the **shared Supabase project `tuybltdrdefjblnplpqo`** (the same project all 6 BSuite apps connect to). Submodule migrations live under `<submodule>/supabase/migrations/`; shared package migrations may also live under `packages/<package>/supabase/migrations/`.

> **Current count:** see the generated parent control-plane manifest at [`../schema-manifest.json`](../schema-manifest.json). Refresh it with `node scripts/supabase/generate-schema-manifest.mjs > supabase/schema-manifest.json` from the parent repo root.

## Parent control-plane manifest

The parent repo is the schema/migration control plane for the single shared
Supabase project. The source of truth for migration scope discovery is:

- [`../migration-scopes.json`](../migration-scopes.json) — human-authored list
  of parent, app, and package migration scopes.
- [`../schema-manifest.json`](../schema-manifest.json) — generated inventory of
  migration files and Edge Function directories.

This manifest lets CI reason about preview-database requirements without
physically moving every migration into the parent `supabase/migrations/`
directory. Physical consolidation remains optional; the important invariant is
that the parent repo knows every scope and can plan/replay them in a stable
order.

Preview database planning lives in
`.github/workflows/supabase-preview-db.yml`. Native Supabase GitHub branching
should be connected to the parent repo with working directory `.` and required
check `Supabase Preview`; Vercel preview deployments must receive Vite-compatible
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` aliases in addition to any
Supabase-provided `NEXT_PUBLIC_*` names.

## Mandatory rule (NEW — 2026-05-13)

### Every new `CREATE TABLE public.<x>` MUST include explicit `GRANT` statements

Per **bsuite#964** + Supabase Data API change effective 2026-10-30: new public-schema tables will NOT be accessible via PostgREST/supabase-js/GraphQL unless explicitly granted to a Data API role. Without an explicit grant, clients hit `42501 permission denied`.

**Required template for every new table:**

```sql
CREATE TABLE public.<table_name> (
  ...
);

ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

GRANT SELECT                              ON public.<table_name> TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE      ON public.<table_name> TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE      ON public.<table_name> TO service_role;

-- ...then RLS policies
```

For service-role-only tables (internal webhook queues, encrypted credential stores, audit ledgers), grant only `service_role` and document the intent inline:

```sql
-- Service-role only: internal webhook receiver, never exposed to clients.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table_name> TO service_role;
```

CI guard: `.github/workflows/explicit-grant-lint.yml` (added in PR #965, script at [`scripts/explicit-grant-lint.sh`](../../scripts/explicit-grant-lint.sh)) fails any PR that adds a `CREATE TABLE public.<x>` without a matching `GRANT` in the same migration file.

**Grant audit baseline:** [`baseline/RECONCILIATION-INVENTORY.md`](baseline/RECONCILIATION-INVENTORY.md) — production audit performed 2026-05-13T12:30Z; all tables compliant except 2 intentionally service-role-only webhook tables.

## Auto-apply workflow status

`.github/workflows/supabase-migrate.yml` is the auto-apply workflow that runs on every push to `main` touching `**/supabase/migrations/**`.

**Current state (2026-05-15):**
- Issue 1 (PAT for private submodule clone): **FIXED** — PR #989 wired `BSUITE_CROSS_REPO_PAT`. However, prod migration history diverges in braden/throughput/BSU/conduit submodules (need per-submodule baseline-replay or `migration repair` — operator action, tracked in bsuite#961).
- Issue 2 (`.nontx.sql` CONCURRENTLY migrations): **FIXED** — PR #1008 adds a post-push psql step that applies `.nontx.sql` files via direct DB connection.

**Workaround for submodule history divergence:** apply migrations manually via Supabase MCP `apply_migration` (transactional) or `execute_sql` (for `CREATE INDEX CONCURRENTLY` and other non-transactional DDL). Then commit the migration file so source-prod parity is maintained.

## Per-migration guide for non-transactional DDL

`CREATE INDEX CONCURRENTLY`, `REINDEX CONCURRENTLY`, `ALTER TYPE … ADD VALUE`, `VACUUM`, `CLUSTER` — all of these cannot run inside a transaction block.

- **File naming:** suffix with `.nontx.sql` (per crm7's doctrine in `crm7/supabase/migrations/CLAUDE.md`).
- **Apply path:** the `supabase-migrate.yml` workflow now handles `.nontx.sql` files automatically (PR #1008) via a direct psql step — no manual intervention needed for root-level migrations.
- **Audit trail:** when applied via MCP or the workflow's psql step, each version is recorded in `supabase_migrations.schema_migrations` so a future re-push skips them.

## Recent migration history (Phase 2.x hardening — 2026-05-13)

| Migration | Phase | Effect |
|---|---|---|
| `20260513140000_annotate_secdef_triggers_phase21A.sql` | 2.1A | Annotated 14 trigger SECURITY DEFINER functions with `@SD-JUSTIFICATION` |
| `20260513150000_annotate_secdef_rls_helpers_phase21B.sql` | 2.1B | Annotated 25 RLS-helper SECURITY DEFINER functions with `@SD-JUSTIFICATION` |
| `20260513160000_rls_initplan_apprentice_placements.sql` | 2.2 | Wrapped `auth.uid()` → `(SELECT auth.uid())` on 2 policies |
| `20260513170000_rls_initplan_feature_builder_ai_usage.sql` | 2.2 | Same pattern, 1 policy |
| `20260513180000_rls_initplan_remaining_7_tables.sql` | 2.2 | Same pattern, 22 policies on 7 tables — closed Phase 2.2 EPIC bsuite#951 |
| `20260513200000_phase23_combine_permissive_batch1.sql` | 2.3 | Combined 5 PERMISSIVE policy overlaps on 3 tables (team_members + team_invitations + org_members); reduced `multiple_permissive_policies` 56→41 |
| `20260513210000_revoke_execute_secdef_categories_BE.sql` | 2.3 | Revoked public EXECUTE on SECURITY DEFINER helpers categorised as 2.1A/B |
| `20260514080000_phase23_combine_permissive_batch2_complete.sql` | 2.3 | Completed PERMISSIVE policy consolidation — 17 tables, 37 policy overlaps removed; closed bsuite#963 |
| `20260423100000_create_apprentice_rate_configs.sql` | backfill | Codified missing `apprentice_rate_configs` CREATE TABLE (WS-2 out-of-band provenance); closes bsuite#865 |

## Frozen migration rule (sibling to crm7's doctrine)

Once a migration is applied to prod (`supabase_migrations.schema_migrations` contains the version), it is **immutable**. Subsequent fixes go in NEW migrations.

Editing an applied migration in this directory will:
1. Have NO effect on prod (the workflow won't re-apply it)
2. Cause source-prod drift (local file ≠ what was actually executed)
3. Break the Phase 0 reconciliation invariant (crm7#770)

Reference: bsuite#961, crm7#771 (PG17 syntax break is a frozen-migration follow-up case).

## Cross-references

- bsuite#961 — supabase-migrate workflow fix history + remaining submodule history divergence
- bsuite#964 — explicit-grant CI guard implementation + Oct 30 2026 enforcement
- [`baseline/RECONCILIATION-INVENTORY.md`](baseline/RECONCILIATION-INVENTORY.md) — grant audit baseline (2026-05-13)
- crm7#770 — Phase 2 reconciliation inventory (crm7 submodule)
- crm7's `supabase/migrations/CLAUDE.md` — sister-repo doctrine (frozen-migration rule, `.nontx.sql` convention)
- AGENTS.md — global agent rules (Anti-Laziness, FF-SELF-VALIDATION-20260507, etc.)
