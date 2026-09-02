-- =============================================================================
-- The three platform_branding WRITE policies, asserted ABOVE the floor.
-- =============================================================================
--
-- WHY THIS FILE EXISTS. 20260414120000_platform_branding.sql creates INSERT,
-- UPDATE and DELETE policies on public.platform_branding whose predicates read
-- public.profiles. But profiles is created by
-- business-suite-unified/20260421050000 — SEVEN DAYS LATER in version order.
--
-- On production that never mattered: 20260414120000 is not in the ledger, sits
-- below the 20260611000000 floor, and so will never be applied. The five
-- platform_branding policies reached production by another route and are all
-- present today (verified 2026-09-02 against pg_policies).
--
-- Where it DID matter is Supabase Preview, which replays the whole history onto
-- a fresh branch. Every preview branch died at statement 11 of that file with
--   ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)
-- which is why the Supabase Preview check has been red on every open PR.
--
-- So 20260414120000 now defers those three when profiles is absent, and this
-- file — ABOVE the floor, therefore actually applied — asserts them once
-- profiles exists.
--
-- ON PRODUCTION THIS IS A NO-OP IN EFFECT. The predicates below are transcribed
-- from what production ALREADY holds, read out of pg_policies rather than copied
-- from the April file: the initplan-optimised `(SELECT auth.uid())` and
-- `= ANY (ARRAY[...])` forms, not the April file's bare `auth.uid()` and `IN`.
-- Writing the April form here would have silently DE-optimised three live
-- policies — the estate has a whole archived migration
-- (fix_rls_initplan_platform_branding) undoing exactly that.
--
-- Idempotent: DROP IF EXISTS then CREATE, so a re-run is safe.
-- =============================================================================

-- NO EXPLICIT BEGIN/COMMIT. The applier already wraps each migration in its own
-- transaction, so wrapping again buys nothing — and it actively costs something:
-- a file containing its own COMMIT, when \i-ed inside a rehearsal transaction,
-- COMMITS THAT OUTER TRANSACTION. On 2026-09-02 that turned a "run it and roll
-- back to compare" rehearsal of this very file into a real production write. The
-- ROLLBACK that followed had nothing left to roll back and said so, in a WARNING
-- that is easy to read past.

-- rehearsal: guarded-no-op
--
-- On PRODUCTION platform_branding and profiles both exist, and the three DROP/CREATE
-- POLICY statements move the ACL census. On a from-scratch replay platform_branding
-- does not exist — its creating migration is one of the 37 unreplayable applied
-- migrations — the to_regclass guard returns early, and nothing moves. That asymmetry
-- is precisely what this marker claims, and it is checkable in the diff.

DO $assert_platform_branding_write_policies$
BEGIN
  -- Both must exist. On a replay this file runs after 20260421050000 created
  -- profiles; if either is somehow absent, say so rather than fail the branch.
  IF to_regclass('public.platform_branding') IS NULL THEN
    RAISE NOTICE 'platform_branding absent — nothing to police';
    RETURN;
  END IF;
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE 'profiles STILL absent at 20261107000000 — write policies not asserted';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "platform_branding_insert" ON public.platform_branding;
  CREATE POLICY "platform_branding_insert"
    ON public.platform_branding FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = (SELECT auth.uid())
           AND p.platform_role = ANY (ARRAY['developer'::text, 'platform_admin'::text])
      )
    );

  DROP POLICY IF EXISTS "platform_branding_update" ON public.platform_branding;
  CREATE POLICY "platform_branding_update"
    ON public.platform_branding FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = (SELECT auth.uid())
           AND p.platform_role = ANY (ARRAY['developer'::text, 'platform_admin'::text])
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = (SELECT auth.uid())
           AND p.platform_role = ANY (ARRAY['developer'::text, 'platform_admin'::text])
      )
    );

  -- DELETE is `false` on production, deliberately: the singleton platform row is
  -- not deletable by anyone through the API. Transcribed, not invented.
  DROP POLICY IF EXISTS "platform_branding_delete" ON public.platform_branding;
  CREATE POLICY "platform_branding_delete"
    ON public.platform_branding FOR DELETE
    TO authenticated
    USING (false);
END
$assert_platform_branding_write_policies$;

