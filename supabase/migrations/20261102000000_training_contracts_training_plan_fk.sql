-- 20261102000000_training_contracts_training_plan_fk.sql
--
-- Make `training_contracts.training_plan_id` an actual foreign key.
--
-- WHAT IS BROKEN
--
--   The column exists and is read in production. crm7 walks
--       placements.training_contract_id
--         -> training_contracts.training_plan_id
--           -> training_plans.id
--             -> training_plan_units.training_plan_id
--   in src/services/timeCreditService.ts and
--   src/components/placements/TimeCreditCard.tsx, and the code comment there
--   describes training_plan_id as "a direct FK ... not an inferred join".
--
--   Measured on tuybltdrdefjblnplpqo 2026-09-01: there is NO foreign key on
--   that column, and no index on it either. The comment is stale against the
--   live schema. Nothing stops a training contract from pointing at a
--   training_plans row that has been deleted, or at another tenant's plan.
--
-- ORPHAN CHECK, AND WHAT IS DONE ABOUT IT
--
--   Measured immediately before authoring:
--     training_contracts                                 24 rows
--     training_contracts WHERE training_plan_id IS NOT NULL     0 rows
--     ...of those, referencing a missing training_plans row      0
--     ...of those, referencing another tenant's plan             0
--
--   So there is nothing to clean up: the constraint validates vacuously and
--   the ADD CONSTRAINT cannot fail on today's data. It is added VALIDATED
--   (not NOT VALID) precisely because there is no backlog to defer.
--
--   The guard below still runs, because "0 rows now" is a fact about the
--   moment I measured it, not about the moment the pipeline applies it. If a
--   row lands in between, the migration REFUSES rather than either failing
--   with a bare 23503 or — worse — quietly dropping the row's reference. A
--   dangling training_plan_id is a data question for whoever created it, not
--   something a schema migration should decide on its own.
--
-- ON DELETE SET NULL, not CASCADE
--
--   A training contract is the instrument registered with the State Training
--   Authority. A training plan is a separate document. Deleting the plan must
--   never delete the contract — it detaches, and the contract survives with a
--   NULL plan reference, which is exactly the state 24 of 24 live rows are
--   already in.
--
-- CROSS-TENANT: NOT CLOSED HERE, DELIBERATELY
--
--   A single-column FK cannot stop tenant A's contract referencing tenant B's
--   plan. The estate has a stronger pattern for this — a composite FK on
--   (tenant_id, <column>) referencing (tenant_id, id), as used by
--   placements_ots_rule_same_tenant_fkey — and both sides here have a NOT NULL
--   tenant_id, so it would apply cleanly. It is NOT done in this migration:
--   the scope given was the FK the code already claims exists, and widening it
--   to a composite would also require a new UNIQUE (tenant_id, id) on
--   training_plans. Raised as a finding instead of taken unilaterally.
--
-- pgTAP RULE A1 (crm7 supabase/tests/database/09_missing_fk_indexes.sql)
--   Every public FK needs a valid btree index whose leading columns match the
--   FK column list. `training_contracts` has 13 indexes and NOT ONE of them
--   covers training_plan_id, so adding the constraint without the index in
--   this same file would take A1 from failing-on-2 to failing-on-3.

BEGIN;

DO $$
DECLARE
  v_dangling bigint;
BEGIN
  SELECT count(*) INTO v_dangling
  FROM public.training_contracts tc
  WHERE tc.training_plan_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.training_plans tp WHERE tp.id = tc.training_plan_id
    );

  IF v_dangling > 0 THEN
    RAISE EXCEPTION
      'training_contracts holds % row(s) whose training_plan_id does not resolve in public.training_plans. Resolve or clear those references before constraining the column — this migration will not decide for you.',
      v_dangling
      USING ERRCODE = '23503';
  END IF;
END
$$;

-- A1 index FIRST, so the constraint is never briefly present without its
-- index (and so a re-run that fails at the constraint still leaves the index).
CREATE INDEX IF NOT EXISTS idx_training_contracts_training_plan_id
  ON public.training_contracts USING btree (training_plan_id);

ALTER TABLE public.training_contracts
  DROP CONSTRAINT IF EXISTS training_contracts_training_plan_id_fkey;

ALTER TABLE public.training_contracts
  ADD CONSTRAINT training_contracts_training_plan_id_fkey
  FOREIGN KEY (training_plan_id)
  REFERENCES public.training_plans (id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.training_contracts.training_plan_id IS
  'Training plan for this contract (public.training_plans). Constrained as a real foreign key on 2026-09-01 (20261102000000) — it had been an unconstrained uuid since the column was introduced, while crm7 code described it as a direct FK. ON DELETE SET NULL: deleting a training plan detaches it, and never deletes the STA-registered contract.';

COMMIT;
