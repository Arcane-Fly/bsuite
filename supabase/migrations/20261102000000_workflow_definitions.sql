-- =============================================================================
-- workflow_definitions + workflow_definition_versions — the persistence layer
-- the workflow canvas has never had.
-- =============================================================================
--
-- WHY THIS EXISTS. `docs/plans/20260901-workflow-canvas-implementation-v1.00A.md`
-- §1 GAP LIST item 2: "Workflow persistence schema. No `workflows` /
-- `workflow_definitions` / `workflow_runs` table." Verified 2026-09-01 against
-- the live catalogue — no relation of any of those names exists in `public`.
--
-- crm7 already models the apprentice-onboarding workflow
-- (`crm7/src/lib/workflows/workflow-templates.ts`, 395 lines) and already has a
-- step/trigger engine (`workflow-engine.ts`, 463 lines), but the only place a
-- workflow has ever been STORED is `workflow-store.ts` — browser localStorage.
-- Nothing survives a device change, nothing is shared between users, and
-- nothing is visible to the server, so no automation could ever read one.
--
-- This file is Phase 1 of that plan and stops at persistence. It deliberately
-- creates NO `workflow_runs` table: execution is Phase 3, and is specified to
-- generalise conduit's existing `r7_automation_queue` -> pg_cron -> edge
-- function rather than to grow a second queue.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY TWO TABLES, AND WHY THE VERSION ROW OWNS ITS OWN tenant_id
-- ─────────────────────────────────────────────────────────────────────────────
-- A workflow has an identity that outlives any one drawing of it. Splitting
-- definition from version is what lets a draft be edited while the published
-- graph keeps running, which is the whole point of the Draft -> Publish step in
-- Phase 2.
--
-- `workflow_definition_versions.tenant_id` is DUPLICATED from the parent rather
-- than reached through the FK. That is not denormalisation by accident — it is
-- the RLS predicate's shape. A policy written as
--
--     tenant_id IN (SELECT ... FROM workflow_definitions WHERE id = ...)
--
-- is a join-through predicate: it re-enters a second RLS-protected table for
-- every row considered, and its correctness then depends on the OTHER table's
-- policies staying right forever. This estate has been bitten by that shape
-- before. A flat `tenant_id IN (SELECT auth_tenant_id())` reads one column of
-- the row in front of it and cannot be undermined from another table.
--
-- The cost of the duplicate is that the two can drift. `workflow_definition_
-- versions_tenant_matches_parent` (a trigger-free FK to the parent's
-- (id, tenant_id) pair) makes drift impossible rather than merely discouraged.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY `graph` IS xyflow's NATIVE SHAPE AND NOT A BESPOKE ONE
-- ─────────────────────────────────────────────────────────────────────────────
-- `{ nodes, edges, viewport }` is exactly what `reactFlowInstance.toObject()`
-- returns and exactly what `<ReactFlow defaultNodes/defaultEdges/defaultViewport>`
-- consumes. Storing that verbatim means the canvas round-trips with no
-- translation layer — no mapper to write, no mapper to keep in sync, and no
-- class of bug where the saved graph and the rendered graph disagree.
--
-- Inventing a bespoke node/edge shape would have bought nothing: the graph is
-- read by the canvas far more often than by anything else, and Phase 3's
-- execution bridge has to walk a graph either way.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — COPIED FROM public.form_layouts, READ FROM THE LIVE CATALOGUE
-- ─────────────────────────────────────────────────────────────────────────────
-- `form_layouts` is the estate's reference shape for "a tenant-owned record
-- that also has platform-level template rows with tenant_id IS NULL", which is
-- exactly what a workflow definition is. Its policies were read from pg_policy
-- on 2026-09-01 (not from an old migration file) and are reproduced here:
--
--   SELECT  tenant_id IS NULL OR tenant_id IN (SELECT auth_tenant_id())
--   INSERT  tenant_id IN (SELECT auth_tenant_id_with_role(ARRAY['owner','admin']))
--   UPDATE  same, as both USING and WITH CHECK
--   DELETE  same, as USING
--
-- ...plus a fifth policy, `form_layouts_platform_rows_developer_write`, which
-- grants a platform developer write access to the tenant_id IS NULL rows.
-- Without it NOBODY can ever create a platform template: the INSERT predicate
-- is `tenant_id IN (SELECT ...)`, and `NULL IN (...)` is never true. That was a
-- real production defect (four PATCHes returning 406 Not Acceptable, operator,
-- 2026-08-24) and its fix is migration 20260902000000.
--
-- THE ONE DEVIATION FROM VERBATIM, AND WHY IT IS SAFER RATHER THAN LOOSER.
-- That fifth policy is declared `FOR ALL`. This file splits it into three
-- per-command policies — INSERT, UPDATE, DELETE — and creates no `FOR ALL`
-- policy at all. The grants are IDENTICAL, provably:
--
--   * FOR ALL's USING branch would add SELECT on
--       (tenant_id IS NULL AND is_platform_developer())
--   * the SELECT policy above ALREADY admits every `tenant_id IS NULL` row to
--     every authenticated user
--   * so the FOR ALL SELECT branch is a strict subset of a grant that is
--     already there, and dropping it removes no access from anyone.
--
-- What splitting it DOES remove is a failure mode. A permissive `FOR ALL`
-- policy applies to SELECT, so if a later edit ever widens that predicate, the
-- read path widens with it silently. In this estate a `FOR ALL` policy has
-- previously re-granted a SELECT that a per-command policy had just closed,
-- leaving 4 of 6 tables readable across tenants while `pg_policies` looked
-- correct. Three per-command policies cannot fail that way — there is no SELECT
-- branch to widen. `20261008000000_host_capacity_assessments.sql` made the same
-- call for the same reason and states it in its own header.
--
-- ANON IS REVOKED BY NAME. This project's ALTER DEFAULT PRIVILEGES grants anon
-- ALL on every new public-schema object at CREATE time, and `REVOKE ... FROM
-- PUBLIC` does not remove an explicit role grant. `form_layouts` still carries
-- the resulting stray `anon SELECT` (confirmed live, 2026-09-01); the estate
-- has been sweeping those since 20260924000000. These two tables do not
-- acquire one.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- VERSION SAFETY
-- ─────────────────────────────────────────────────────────────────────────────
-- All 8 applier scopes share ONE `supabase_migrations.schema_migrations` keyed
-- on the 14-digit version string ALONE, and a second file at an existing
-- version is SILENTLY SKIPPED. Checked before authoring, 2026-09-01:
--
--   * on disk — 0 files at 20261102000000 across all 10 migration directories
--     in the estate, including crm7's archive/ and baseline/ and the root
--     baseline/
--   * in the ledger — `SELECT count(*) ... WHERE version = '20261102000000'`
--     returned 0 against the shared project (tuybltdrdefjblnplpqo); global max
--     applied is 20261101000000 across 798 rows
--
-- This file is checked into THREE scopes (root, crm7, business-suite-unified)
-- byte-for-byte identically so each app's migration history is self-contained.
-- That is a deliberate cross-scope duplicate of the same shape as
-- 20260728120000 and 20260707000020/21, and it carries a matching entry in
-- scripts/migration-collision-allowlist.txt. Applying it once and skipping the
-- other two copies is a harmless no-op: there is nothing distinct to lose.
--
-- NOT APPLIED BY THIS CHANGE. Authored only; the estate applies migrations
-- through its merge pipeline.
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. workflow_definitions — the identity of a workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULLABLE on purpose: a NULL tenant_id is a PLATFORM TEMPLATE, the shared
  -- starting point every tenant can see and copy. That is the same convention
  -- form_layouts, picklists and tenant_field_definitions already use, and it is
  -- what the SELECT policy's `tenant_id IS NULL OR ...` branch is for.
  tenant_id    uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,

  key          text        NOT NULL,
  name         text        NOT NULL,
  description  text,

  app_scope    text        NOT NULL DEFAULT 'all',
  is_system    boolean     NOT NULL DEFAULT false,

  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workflow_definitions_key_not_blank_check
    CHECK (length(btrim(key)) > 0),

  -- NULLS NOT DISTINCT is load-bearing, not decoration. Under the default
  -- (NULLS DISTINCT) two PLATFORM templates could both take the key
  -- 'apprentice-placement', because NULL <> NULL — the uniqueness rule would
  -- hold for every tenant and silently not hold for the platform rows, which
  -- are precisely the rows every tenant inherits. Postgres 15+; this project
  -- declares major_version = 17 (supabase/config.toml) and production runs
  -- 17.6.
  CONSTRAINT workflow_definitions_tenant_key_unique
    UNIQUE NULLS NOT DISTINCT (tenant_id, key)
);

COMMENT ON TABLE public.workflow_definitions IS
  'The identity of a workflow, separate from any one drawing of it. One row per
  workflow per tenant; a row with tenant_id IS NULL is a platform template that
  every tenant can see and copy. The graph itself lives in
  workflow_definition_versions — this table holds only what stays true across
  versions. Phase 1 of docs/plans/20260901-workflow-canvas-implementation-v1.00A.md.';

COMMENT ON COLUMN public.workflow_definitions.tenant_id IS
  'Owning tenant, or NULL for a platform template. NULL rows are readable by
  every authenticated user and writable only by a platform developer — see the
  four _platform_rows_developer_* policies below.';

COMMENT ON COLUMN public.workflow_definitions.key IS
  'Stable machine identifier, e.g. ''new-apprentice-onboarding''. Unique per
  tenant, and unique across platform templates (NULLS NOT DISTINCT). This is
  what an automation trigger names, so it must not change when the display name
  is edited.';

COMMENT ON COLUMN public.workflow_definitions.app_scope IS
  'Which app surfaces this workflow: ''all'' (default), or an app slug such as
  ''crm7'' / ''bsu'' / ''conduit''. Free text rather than a CHECK — the app list
  is .gitmodules, it has changed twice this year (R80.3 -> R80.4), and a CHECK
  here would turn adding an app into a migration.';

COMMENT ON COLUMN public.workflow_definitions.is_system IS
  'True for workflows the platform ships and maintains. A system workflow is
  still editable by a developer; this flags provenance, not permission.';

-- The composite FK in section 2 needs (id, tenant_id) to be a unique key on
-- this table, and a referenced unique constraint must EXIST BEFORE the
-- referencing table is created — declaring it later fails with "there is no
-- unique constraint matching given keys for referenced table". `id` alone is
-- already the primary key, so this adds no restriction that was not already
-- true; it only makes the pair addressable as an FK target.
ALTER TABLE public.workflow_definitions
  ADD CONSTRAINT workflow_definitions_id_tenant_unique UNIQUE (id, tenant_id);

-- ============================================================================
-- 2. workflow_definition_versions — the graph, one row per version
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_definition_versions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  workflow_definition_id uuid        NOT NULL
                                     REFERENCES public.workflow_definitions(id)
                                     ON DELETE CASCADE,

  -- ITS OWN COLUMN, deliberately duplicated from the parent. See the file
  -- header: this is what keeps the RLS predicate flat instead of joining back
  -- through workflow_definitions. Kept honest by the composite FK below, so it
  -- can never disagree with the parent.
  --
  -- The direct FK to tenants is redundant with that composite FK (which reaches
  -- tenants transitively through the parent) and is declared anyway: it is what
  -- makes the column's meaning legible in `\d workflow_definition_versions`,
  -- and it holds for platform-template rows, where the composite FK is skipped
  -- because MATCH SIMPLE does not check a pair containing NULL.
  tenant_id              uuid        REFERENCES public.tenants(id) ON DELETE CASCADE,

  version                integer     NOT NULL,

  status                 text        NOT NULL DEFAULT 'draft',

  -- xyflow's NATIVE shape, verbatim: exactly what toObject() emits and exactly
  -- what <ReactFlow defaultNodes/defaultEdges/defaultViewport> consumes.
  graph                  jsonb       NOT NULL
                                     DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}'::jsonb,

  trigger_config         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ai_context             jsonb       NOT NULL DEFAULT '{}'::jsonb,

  created_by             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workflow_definition_versions_version_positive_check
    CHECK (version > 0),

  CONSTRAINT workflow_definition_versions_status_check
    CHECK (status = ANY (ARRAY['draft', 'published', 'archived'])),

  -- The canvas cannot render a graph that lacks either array, and a row shaped
  -- like anything else can only have come from a caller that bypassed the
  -- editor. Asserting the two arrays is enough to guarantee the round-trip;
  -- `viewport` is deliberately NOT required, because xyflow tolerates its
  -- absence and a seeded template legitimately has no saved camera position.
  --
  -- THE coalesce() IS THE CONSTRAINT. Without it this check FAILS OPEN on
  -- exactly the input it exists to reject. `graph -> 'nodes'` returns SQL NULL
  -- when the key is ABSENT, `jsonb_typeof(NULL)` is NULL, `NULL = 'array'` is
  -- NULL, and a CHECK whose expression evaluates to NULL PASSES — only FALSE
  -- fails. Verified by rehearsal on 2026-09-01: the first draft of this
  -- constraint accepted `{"steps": []}`, a bespoke shape with no nodes key at
  -- all, which is precisely the shape the column exists to forbid.
  CONSTRAINT workflow_definition_versions_graph_shape_check
    CHECK (
      jsonb_typeof(graph) = 'object'
      AND coalesce(jsonb_typeof(graph -> 'nodes'), 'missing') = 'array'
      AND coalesce(jsonb_typeof(graph -> 'edges'), 'missing') = 'array'
    ),

  CONSTRAINT workflow_definition_versions_definition_version_unique
    UNIQUE (workflow_definition_id, version),

  -- Makes the duplicated tenant_id unfalsifiable rather than merely
  -- conventional: the pair must exist on the parent, so a version row cannot
  -- claim a tenant its definition does not have. Relies on the
  -- workflow_definitions_id_tenant_unique constraint added at the end of
  -- section 1.
  --
  -- MATCH SIMPLE (the default) means this is NOT checked when tenant_id is
  -- NULL — i.e. for platform-template versions. That is the correct behaviour
  -- and not a hole: the single-column FK on workflow_definition_id above still
  -- enforces that the parent exists, and a NULL tenant_id is the one value
  -- that cannot disagree with a parent, because it names no tenant at all.
  CONSTRAINT workflow_definition_versions_tenant_matches_parent
    FOREIGN KEY (workflow_definition_id, tenant_id)
    REFERENCES public.workflow_definitions (id, tenant_id)
    ON DELETE CASCADE
);

COMMENT ON TABLE public.workflow_definition_versions IS
  'One row per version of one workflow''s graph. Draft rows are edited freely;
  publishing writes a new row and moves
  workflow_definitions.current_published_version_id to it, so consumers reading
  through that pointer never observe a half-edited graph.';

COMMENT ON COLUMN public.workflow_definition_versions.tenant_id IS
  'Copied from the parent definition so the RLS predicate is FLAT. A policy
  that reached the tenant through workflow_definitions would be a join-through
  predicate whose correctness depended on that table''s policies staying right;
  this reads one column of the row in front of it. The composite FK to
  workflow_definitions (id, tenant_id) stops the two ever disagreeing.';

COMMENT ON COLUMN public.workflow_definition_versions.graph IS
  'xyflow''s native { nodes, edges, viewport } — the exact output of
  reactFlowInstance.toObject() and the exact input of <ReactFlow defaultNodes
  ... />. Stored verbatim so the canvas round-trips with NO translation layer:
  no mapper to keep in sync, and no class of bug where the saved graph and the
  rendered graph disagree.';

COMMENT ON COLUMN public.workflow_definition_versions.trigger_config IS
  'What starts this workflow — event name, schedule, or manual. Read by Phase
  3''s execution bridge; inert until then.';

COMMENT ON COLUMN public.workflow_definition_versions.ai_context IS
  'Grounding for Jodie: the human rationale behind each decision node, keyed by
  node id, plus any free-text notes captured when the workflow was designed.
  This is what lets the assistant explain WHY a branch exists rather than only
  describing its shape.';

COMMENT ON COLUMN public.workflow_definition_versions.status IS
  'draft | published | archived. Only one version per definition is pointed at
  by current_published_version_id at a time; ''published'' here records that a
  version was published, not that it is the current one.';

-- ============================================================================
-- 3. The published-version pointer
-- ============================================================================
--
-- Added by ALTER rather than declared in section 1 because the FK target
-- (workflow_definition_versions) does not exist until section 2 has run. The
-- ordering is the reason this is a separate statement.

ALTER TABLE public.workflow_definitions
  ADD COLUMN IF NOT EXISTS current_published_version_id uuid
    REFERENCES public.workflow_definition_versions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workflow_definitions.current_published_version_id IS
  'The version consumers should read. NULL means the workflow has never been
  published — a definition with only a draft is invisible to any runtime.
  ON DELETE SET NULL rather than CASCADE: deleting a version must unpublish the
  workflow, never delete the workflow.';

-- ============================================================================
-- 4. Indexes — pgTAP A1: every FK-shaped uuid column has a LEADING btree index
-- ============================================================================
--
-- The seven FK-shaped uuid columns across these two tables, and the index that
-- serves each. Postgres only uses an index for an FK lookup (and for the
-- ON DELETE referential-action scan) when the FK column is the index's FIRST
-- column, so leading position is the whole requirement.
--
--   workflow_definitions.tenant_id                     -> idx_..._tenant_id (below)
--   workflow_definitions.created_by                    -> idx_..._created_by (below)
--   workflow_definitions.current_published_version_id  -> idx_..._current_published_version_id (below)
--   workflow_definition_versions.workflow_definition_id-> idx_..._workflow_definition_id (below)
--   workflow_definition_versions.tenant_id             -> idx_..._tenant_id (below)
--   workflow_definition_versions.created_by            -> idx_..._created_by (below)
--   workflow_definition_versions.published_by          -> idx_..._published_by (below)
--
-- The two composite FKs are covered by their own constraint-backed indexes:
--   workflow_definitions (id, tenant_id)               -> workflow_definitions_id_tenant_unique
--   versions (workflow_definition_id, tenant_id)       -> idx_..._workflow_definition_id_tenant_id (below)

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant_id
  ON public.workflow_definitions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by
  ON public.workflow_definitions (created_by);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_current_published_version_id
  ON public.workflow_definitions (current_published_version_id);

CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_workflow_definition_id
  ON public.workflow_definition_versions (workflow_definition_id);

CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_tenant_id
  ON public.workflow_definition_versions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_created_by
  ON public.workflow_definition_versions (created_by);

CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_published_by
  ON public.workflow_definition_versions (published_by);

-- Leading-column cover for the composite tenant-matching FK. Without it, the
-- ON DELETE CASCADE from a definition scans the whole versions table.
CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_workflow_definition_id_tenant_id
  ON public.workflow_definition_versions (workflow_definition_id, tenant_id);

-- The editor's own query: the newest version of one workflow, whatever its
-- status. Descending so `ORDER BY version DESC LIMIT 1` reads the first index
-- entry instead of sorting the workflow's whole history.
CREATE INDEX IF NOT EXISTS idx_workflow_definition_versions_latest
  ON public.workflow_definition_versions (workflow_definition_id, version DESC);

-- "Which workflows does this tenant have" — the list page, and the platform
-- templates every tenant inherits.
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant_app_scope
  ON public.workflow_definitions (tenant_id, app_scope);

-- ============================================================================
-- 5. updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_workflow_definitions_updated_at
  ON public.workflow_definitions;
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_definition_versions_updated_at
  ON public.workflow_definition_versions;
CREATE TRIGGER update_workflow_definition_versions_updated_at
  BEFORE UPDATE ON public.workflow_definition_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. RLS — public.form_layouts' shape, per command, never FOR ALL
-- ============================================================================
--
-- A table without RLS in this estate is a tenant leak. Both tables get it, and
-- every policy below names `TO authenticated` explicitly: a policy with no TO
-- clause defaults to PUBLIC, which includes anon.

ALTER TABLE public.workflow_definitions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definition_versions  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6a. workflow_definitions — the four tenant policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS workflow_definitions_select ON public.workflow_definitions;
CREATE POLICY workflow_definitions_select
  ON public.workflow_definitions
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT public.auth_tenant_id())
  );

DROP POLICY IF EXISTS workflow_definitions_insert ON public.workflow_definitions;
CREATE POLICY workflow_definitions_insert
  ON public.workflow_definitions
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  );

DROP POLICY IF EXISTS workflow_definitions_update ON public.workflow_definitions;
CREATE POLICY workflow_definitions_update
  ON public.workflow_definitions
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  )
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  );

DROP POLICY IF EXISTS workflow_definitions_delete ON public.workflow_definitions;
CREATE POLICY workflow_definitions_delete
  ON public.workflow_definitions
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  );

-- ---------------------------------------------------------------------------
-- 6b. workflow_definitions — platform template writes, split from FOR ALL
-- ---------------------------------------------------------------------------
-- form_layouts_platform_rows_developer_write is `FOR ALL`; these three are its
-- INSERT / UPDATE / DELETE branches with identical predicates. The SELECT
-- branch is intentionally absent because workflow_definitions_select above
-- already admits every `tenant_id IS NULL` row to every authenticated user, so
-- it would grant nothing. See the file header for the full argument.

DROP POLICY IF EXISTS workflow_definitions_platform_rows_developer_insert
  ON public.workflow_definitions;
CREATE POLICY workflow_definitions_platform_rows_developer_insert
  ON public.workflow_definitions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NULL AND public.is_platform_developer());

DROP POLICY IF EXISTS workflow_definitions_platform_rows_developer_update
  ON public.workflow_definitions;
CREATE POLICY workflow_definitions_platform_rows_developer_update
  ON public.workflow_definitions
  FOR UPDATE TO authenticated
  USING (tenant_id IS NULL AND public.is_platform_developer())
  WITH CHECK (tenant_id IS NULL AND public.is_platform_developer());

DROP POLICY IF EXISTS workflow_definitions_platform_rows_developer_delete
  ON public.workflow_definitions;
CREATE POLICY workflow_definitions_platform_rows_developer_delete
  ON public.workflow_definitions
  FOR DELETE TO authenticated
  USING (tenant_id IS NULL AND public.is_platform_developer());

-- ---------------------------------------------------------------------------
-- 6c. workflow_definition_versions — the same four, on its OWN tenant_id
-- ---------------------------------------------------------------------------
-- Every predicate below reads this table's own tenant_id column. None of them
-- reaches into workflow_definitions.

DROP POLICY IF EXISTS workflow_definition_versions_select
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_select
  ON public.workflow_definition_versions
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT public.auth_tenant_id())
  );

DROP POLICY IF EXISTS workflow_definition_versions_insert
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_insert
  ON public.workflow_definition_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  );

DROP POLICY IF EXISTS workflow_definition_versions_update
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_update
  ON public.workflow_definition_versions
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  )
  WITH CHECK (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  );

DROP POLICY IF EXISTS workflow_definition_versions_delete
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_delete
  ON public.workflow_definition_versions
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (SELECT public.auth_tenant_id_with_role(ARRAY['owner', 'admin']))
  );

-- ---------------------------------------------------------------------------
-- 6d. workflow_definition_versions — platform template writes
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS workflow_definition_versions_platform_rows_developer_insert
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_platform_rows_developer_insert
  ON public.workflow_definition_versions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NULL AND public.is_platform_developer());

DROP POLICY IF EXISTS workflow_definition_versions_platform_rows_developer_update
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_platform_rows_developer_update
  ON public.workflow_definition_versions
  FOR UPDATE TO authenticated
  USING (tenant_id IS NULL AND public.is_platform_developer())
  WITH CHECK (tenant_id IS NULL AND public.is_platform_developer());

DROP POLICY IF EXISTS workflow_definition_versions_platform_rows_developer_delete
  ON public.workflow_definition_versions;
CREATE POLICY workflow_definition_versions_platform_rows_developer_delete
  ON public.workflow_definition_versions
  FOR DELETE TO authenticated
  USING (tenant_id IS NULL AND public.is_platform_developer());

-- ============================================================================
-- 7. Grants
-- ============================================================================
--
-- anon BY NAME, not merely PUBLIC: this project's default privileges grant anon
-- ALL on new public objects at CREATE time, and REVOKE ... FROM PUBLIC leaves an
-- explicit role grant untouched. That is exactly the stray `anon SELECT`
-- form_layouts still carries.
--
-- `authenticated` IS REVOKED FIRST TOO, then granted back exactly four verbs.
-- The default privileges decide what a new table starts with, so inheriting
-- them silently makes this table's grant set a property of the database rather
-- than of this file. TRUNCATE is the reason it matters: it is included in a
-- GRANT ALL, it BYPASSES row-level security entirely, and no policy above would
-- stop an authenticated caller emptying either table. Revoke-then-grant makes
-- the four verbs the whole set, whatever the defaults happen to be.

REVOKE ALL ON public.workflow_definitions         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.workflow_definition_versions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_definitions         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_definition_versions TO authenticated;

GRANT ALL ON public.workflow_definitions         TO service_role;
GRANT ALL ON public.workflow_definition_versions TO service_role;

-- ============================================================================
-- 8. Assert the result, in the same transaction
-- ============================================================================
--
-- A migration that reports success and applied nothing is the estate's most
-- expensive recurring failure. These checks make that impossible for this file:
-- if any invariant below is not true, the whole transaction rolls back.

DO $$
DECLARE
  n_forall  int;
  n_norls   int;
  n_unindexed int;
BEGIN
  -- 8a. No FOR ALL policy on either table. This is the non-negotiable the file
  -- header argues at length; asserting it means a later edit that reintroduces
  -- one cannot land quietly.
  SELECT count(*) INTO n_forall
    FROM pg_policy p
   WHERE p.polrelid IN ('public.workflow_definitions'::regclass,
                        'public.workflow_definition_versions'::regclass)
     AND p.polcmd = '*';
  IF n_forall > 0 THEN
    RAISE EXCEPTION 'workflow schema: % FOR ALL policy(ies) present; per-command only', n_forall;
  END IF;

  -- 8b. RLS enabled on both.
  SELECT count(*) INTO n_norls
    FROM pg_class c
   WHERE c.oid IN ('public.workflow_definitions'::regclass,
                   'public.workflow_definition_versions'::regclass)
     AND NOT c.relrowsecurity;
  IF n_norls > 0 THEN
    RAISE EXCEPTION 'workflow schema: % table(s) without RLS enabled', n_norls;
  END IF;

  -- 8c. pgTAP A1, scoped to these two tables: every foreign key has a valid,
  -- ready btree index whose LEADING columns are the FK column list.
  SELECT count(*) INTO n_unindexed
    FROM (
      SELECT con.conrelid, con.conkey
        FROM pg_constraint con
       WHERE con.contype = 'f'
         AND con.conrelid IN ('public.workflow_definitions'::regclass,
                              'public.workflow_definition_versions'::regclass)
    ) fk
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_index i
       JOIN pg_class idx ON idx.oid = i.indexrelid
       JOIN pg_am am ON am.oid = idx.relam
      WHERE i.indrelid = fk.conrelid
        AND i.indisvalid
        AND i.indisready
        AND am.amname = 'btree'
        AND (i.indkey::int2[])[0:cardinality(fk.conkey) - 1] = fk.conkey::int2[]
   );
  IF n_unindexed > 0 THEN
    RAISE EXCEPTION 'workflow schema: % foreign key(s) without a leading btree index', n_unindexed;
  END IF;

  RAISE NOTICE 'workflow schema: 2 tables, RLS on both, 0 FOR ALL policies, all FKs indexed';
END $$;

COMMIT;
