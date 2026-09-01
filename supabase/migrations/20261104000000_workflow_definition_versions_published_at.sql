-- =============================================================================
-- workflow_definition_versions.published_at — the column the seed and every
-- publish already write, and which 20261103000000 never created.
-- =============================================================================
--
-- WHY THIS EXISTS. Phase 1 of the workflow canvas shipped three artefacts that
-- disagree with each other about one column, and nothing caught it because none
-- of the three had been run against a database:
--
--   * `supabase/migrations/20261103000000_workflow_definitions.sql` creates
--     `workflow_definition_versions` with `published_by` and no `published_at`.
--   * `supabase/seeds/20260901_apprentice_placement_workflow_seed.sql` INSERTs
--     `(workflow_definition_id, version, status, graph, ai_context, tenant_id,
--     published_at)`. Against the table as created, that is
--     `42703 column "published_at" of relation "workflow_definition_versions"
--     does not exist`, and the apprentice template — the whole point of Phase 1
--     — never lands.
--   * `packages/workflow-canvas/src/service.ts` `publishVersion()` SETs
--     `published_at`, so publishing a workflow fails the same way. Publishing
--     is the headline act of Phase 2.
--
-- Verified against the live catalogue on 2026-09-01 before authoring: neither
-- table exists in `public` on tuybltdrdefjblnplpqo yet, and
-- `supabase_migrations.schema_migrations` has no row for 20261103000000 (798
-- rows, max version 20261101000000). So the Phase 1 migration has not been
-- applied anywhere and this file will run immediately after it.
--
-- WHY A NEW FILE RATHER THAN AN EDIT TO 20261103000000. The ledger is keyed on
-- the 14-digit version ALONE across all eight applier scopes, and a file whose
-- version is already recorded is SILENTLY SKIPPED — it reports success and
-- applies nothing. 20261103000000 is merged. Editing it would be correct only
-- on the environments that have not seen it and a no-op everywhere else, and
-- there is no way to tell those apart from a diff. A new version is the only
-- shape that is right in both cases.
--
-- WHY `published_at` AND NOT "just use updated_at". `updated_at` moves on every
-- edit to the row; a published version is immutable by policy (`saveVersionGraph`
-- guards with `.eq('status','draft')`) but not by constraint, and an archive
-- sweep or a backfill would move it. "When did this version go into force" is a
-- fact somebody will need to answer about a process that was running at the
-- time, and it must not be derivable from a column that means something else.
--
-- NULLABLE, with no default. A draft has never been published, and `now()` as a
-- default would stamp every draft with a publication date it does not have —
-- the same shape of lie as a status column that defaults to 'published'. It is
-- set by `publishVersion()`, at the same moment the status flips.
--
-- NO GRANT OR REVOKE. Privileges on these two tables are table-level and were
-- settled by 20261103000000 (anon and PUBLIC revoked by name; `authenticated`
-- holds exactly SELECT/INSERT/UPDATE/DELETE). A new column inherits them, and
-- re-issuing them here would only create a second place they could drift.
--
-- CHECKED INTO THREE SCOPES byte-for-byte identically — root, crm7 and
-- business-suite-unified — matching 20261103000000, whose tables these are.
-- Carries a paired `n=3 intentional-duplicate` entry in
-- scripts/migration-collision-allowlist.txt.
--
-- NOT APPLIED BY THIS CHANGE. Authored only; the estate applies migrations
-- through its merge pipeline.
-- =============================================================================

BEGIN;

ALTER TABLE public.workflow_definition_versions
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

COMMENT ON COLUMN public.workflow_definition_versions.published_at IS
  'When this version was published — set by publishVersion() at the same moment
  status flips to ''published''. NULL for a version that has never been
  published, which is every draft. Deliberately not defaulted to now(): a
  default would stamp a publication date onto rows that have none. Distinct from
  updated_at, which moves on any edit and so cannot answer "what was in force
  then".';

-- The published-history read is "the versions of this workflow that went live,
-- newest first". Without this it is a sequential scan of every version row the
-- caller can see; a partial index keeps it to the published ones, which is the
-- minority of rows and the only ones the predicate can match.
CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_published_at
  ON public.workflow_definition_versions (workflow_definition_id, published_at DESC)
  WHERE published_at IS NOT NULL;

COMMIT;
