-- =============================================================================
-- apprentice_competencies gains a PERSON path, because the operator's ruling
-- made the person the placement entity and this table never caught up.
-- =============================================================================
--
-- THE RULING (operator, 2026-09-01, verbatim): "trainee is same as apprentice,
-- and worker is same without the training." One placement entity; training is an
-- optional component, not a different table. The estate already lives it —
-- measured 2026-09-02: `placements` holds 42 rows, 42 with `person_id` and 13
-- with `apprentice_id`.
--
-- WHAT THAT LEFT BROKEN. `apprentice_competencies.apprentice_id` is NOT NULL with
-- a FK to `apprentices`, so recording a unit of competency requires an
-- `apprentices` row. FutureBuild Academy — the only tenant in the estate with
-- real training data, 8 placements and 8 training contracts — has ZERO
-- `apprentices` rows, because their records were built person-first and are
-- CORRECT under the ruling. The operator's requirement was "the ability to link
-- in training schedules and units of competancy"; schedules already hang off
-- `person_id`, and this was the one that could not.
--
-- WHY THIS IS SAFE TO CHANGE AT ALL: `apprentice_competencies` holds ZERO rows
-- estate-wide (verified against production immediately before writing this).
-- There is nothing to backfill and nothing to break, which is exactly why the
-- change is worth making now rather than after someone depends on the old shape.
--
-- SCOPE, STATED: this is ONE table of the FOURTEEN that carry a NOT NULL FK to
-- `apprentices`. The other thirteen are NOT touched here. They hold real rows,
-- and converting them is a schema decision with a blast radius that belongs to
-- the operator, not to a migration written alongside a workflow feature. This
-- file fixes the one the operator's stated requirement actually needs, and says
-- plainly that the class remains.
-- =============================================================================

-- NO EXPLICIT BEGIN/COMMIT. The applier already wraps each migration in its own
-- transaction, so wrapping again buys nothing — and it actively costs something:
-- a file containing its own COMMIT, when \i-ed inside a rehearsal transaction,
-- COMMITS THAT OUTER TRANSACTION. On 2026-09-02 that turned a "run it and roll
-- back to compare" rehearsal of this very file into a real production write. The
-- ROLLBACK that followed had nothing left to roll back and said so, in a WARNING
-- that is easy to read past.

-- 1. The person path. Nullable, because a row may legitimately arrive either way.
ALTER TABLE public.apprentice_competencies
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people (id) ON DELETE CASCADE;

-- 2. apprentice_id stops being mandatory. It is NOT dropped: 20 `apprentices`
--    rows exist estate-wide and a future row may still key off one.
ALTER TABLE public.apprentice_competencies
  ALTER COLUMN apprentice_id DROP NOT NULL;

-- 3. Exactly one subject, never zero and never both. Written as a CHECK rather
--    than left to convention, because "one of these two" enforced by convention
--    is how a table ends up with rows that answer to nobody.
--
--    `num_nonnulls` rather than a hand-written OR pair: the OR form reads as
--    correct while quietly allowing BOTH to be set.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'apprentice_competencies_one_subject'
       AND conrelid = 'public.apprentice_competencies'::regclass
  ) THEN
    ALTER TABLE public.apprentice_competencies
      ADD CONSTRAINT apprentice_competencies_one_subject
      CHECK (num_nonnulls(apprentice_id, person_id) = 1);
  END IF;
END
$guard$;

-- 4. Every FK-shaped uuid gets an index in the SAME file (estate rule A1).
CREATE INDEX IF NOT EXISTS idx_apprentice_competencies_person_id
  ON public.apprentice_competencies (person_id);

-- 5. A person's record of one unit is one row. NULLS NOT DISTINCT is deliberate:
--    without it every NULL person_id is distinct from every other, ON CONFLICT
--    never fires, and a re-run duplicates silently — a trap this estate has
--    already been bitten by on a nullable column in a unique constraint.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'apprentice_competencies_person_competency_unique'
       AND conrelid = 'public.apprentice_competencies'::regclass
  ) THEN
    ALTER TABLE public.apprentice_competencies
      ADD CONSTRAINT apprentice_competencies_person_competency_unique
      UNIQUE NULLS NOT DISTINCT (person_id, competency_id);
  END IF;
END
$guard$;

COMMENT ON COLUMN public.apprentice_competencies.person_id IS
  'The person this competency belongs to. Added 2026-11-06 because the operator ruled '
  'the person is the placement entity ("trainee is same as apprentice, worker is same '
  'without the training") and this table still required an `apprentices` row. Exactly '
  'one of person_id / apprentice_id is set — see apprentice_competencies_one_subject.';

