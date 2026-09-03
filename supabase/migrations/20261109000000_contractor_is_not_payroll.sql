-- ===========================================================================
-- build_pay_run_from_timesheets — a contractor is not payroll
-- (bsuite au-compliance audit §, and register row W-12's real half)
-- ===========================================================================
-- The function computed a superannuation guarantee amount and wrote
-- income_type 'SAL' (Salary and Wages) for EVERY approved timesheet, without
-- ever consulting the worker's employment type. Measured live 2026-09-03:
-- `pg_get_functiondef` contains no reference to employment_type or
-- abn_contractor, and does compute super.
--
-- THE APPLICATION SAYS THE OPPOSITE, IN TWO PLACES.
--   crm7 src/types/employmentTypes.ts:269 declares abn_contractor with
--   hasSuperannuation, hasWorkersComp, hasPayrollTax, hasLeaveEntitlements,
--   hasLeaveLoading, hasCasualLoading, hasTraining and hasFunding ALL FALSE,
--   and bootRequired 'never'.
--   crm7 src/lib/pipelines/chargeToPayroll.ts:50 puts abn_contractor in
--   PAYROLL_EXCLUDED_TYPES — "excluded from payroll. Appears in billing only."
-- The database consulted neither.
--
-- THE FINANCIAL ERROR IS THE SMALLER HALF. A payroll_records row treating an
-- ABN contractor as salary and wages, with employer super computed, is the
-- Group Training Organisation's OWN contemporaneous record that it treated the
-- relationship as employment. Under the s.15AA whole-of-relationship test that
-- is precisely the class of business record that undermines a genuine-
-- contractor position, and it goes to s.357 sham-contracting exposure.
--
-- LATENT, NOT LIVE. Measured 2026-09-03: zero people carry employment_type
-- 'abn_contractor' and payroll_records holds 2 rows, so nothing has been
-- mis-recorded. This closes the path before anyone can walk it — the only time
-- such a fix is cheap, and the reason it is worth doing now rather than when
-- the first contractor is onboarded.
--
-- SKIPPED, NOT SILENTLY DROPPED. The guard joins the existing v_skipped list
-- with an actionable reason, exactly like the untiered-overtime and
-- ambiguous-rate cases already in the loop. A contractor's hours still need
-- invoicing — through billing, where the application already says they belong.
--
-- METHOD: this body is `pg_get_functiondef` of the live function with TWO
-- additions — employment_type carried into the `rated` CTE, and the guard at
-- the top of the loop. Everything else is byte-identical to what is deployed,
-- because retyping a SECURITY DEFINER payroll function by hand is how an
-- unrelated behaviour changes without anyone noticing.
--
-- NO TRANSACTION OF ITS OWN: the applier wraps each file in
-- --single-transaction, and a BEGIN/COMMIT here would end that early and
-- half-migrate. Gated by scripts/check-migration-owns-no-transaction.mjs.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.build_pay_run_from_timesheets(p_tenant_id uuid, p_period_start date, p_period_end date, p_payment_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_pay_run_id        uuid;
  v_payment_date      date := COALESCE(p_payment_date, p_period_end + 7);
  v_sg_rate           numeric;
  v_created           int := 0;
  v_skipped           jsonb := '[]'::jsonb;
  v_total_gross       numeric := 0;
  v_total_super       numeric := 0;
  v_ts_count          int := 0;
  v_ord_earn          numeric;
  v_ot_earn           numeric;
  v_gross             numeric;
  v_rate              numeric;
  v_rate_source       text;
  -- FIX (Defect 2): populated by reading back this call's OWN inserted rows,
  -- after the loop, instead of recomputing via super_due_date_for().
  v_super_due_earliest date;
  v_super_due_latest   date;
  r                   record;
BEGIN
  IF p_tenant_id IS NULL OR p_period_start IS NULL OR p_period_end IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'build_pay_run_from_timesheets: tenant_id, period_start and period_end are all required';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('build_pay_run_from_timesheets: period_end %s precedes period_start %s',
                       p_period_end, p_period_start);
  END IF;

  IF p_tenant_id NOT IN (SELECT auth_tenant_id_with_role(ARRAY['owner','admin','manager'])) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = format('build_pay_run_from_timesheets: caller lacks owner/admin/manager on tenant %s', p_tenant_id);
  END IF;

  SELECT MAX(hd.super_guarantee_rate) / 100.0 INTO v_sg_rate
    FROM public.hiring_divisions hd
   WHERE hd.tenant_id = p_tenant_id AND hd.super_guarantee_rate IS NOT NULL;

  IF v_sg_rate IS NOT NULL AND v_sg_rate <= 0.01 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('build_pay_run_from_timesheets: hiring_divisions.super_guarantee_rate for tenant %s '
                       'converted to %s, which is not a plausible SG fraction. Refusing rather than '
                       'under-paying super.', p_tenant_id, v_sg_rate);
  END IF;

  v_sg_rate := COALESCE(v_sg_rate, 0.12);

  INSERT INTO public.pay_runs (
    tenant_id, pay_period_start, pay_period_end, payment_date, status,
    total_gross, total_tax, total_super, total_net, timesheet_count, notes, created_by
  )
  VALUES (
    p_tenant_id, p_period_start, p_period_end, v_payment_date, 'draft',
    0, 0, 0, 0, 0,
    'Built from approved timesheets by build_pay_run_from_timesheets', auth.uid()
  )
  RETURNING id INTO v_pay_run_id;

  FOR r IN
    WITH approved AS (
      SELECT t.person_id,
             SUM(COALESCE(t.ordinary_hours, GREATEST(COALESCE(t.total_hours,0) - COALESCE(t.overtime_hours,0), 0))) AS ord_hours,
             SUM(COALESCE(t.overtime_hours, 0)) AS ot_hours,
             array_agg(t.id) AS ts_ids,
             CASE WHEN count(DISTINCT t.placement_id) = 1
                  THEN (array_agg(t.placement_id) FILTER (WHERE t.placement_id IS NOT NULL))[1]
             END AS named_placement_id,
             bool_and(COALESCE(t.overtime_hours,0) = 0 OR t.overtime_tiers IS NOT NULL) AS ot_fully_tiered,
             (SELECT jsonb_agg(jsonb_build_object('tier', tier, 'multiplier', mult, 'hours', hrs))
                FROM (
                  SELECT e.key AS tier,
                         (e.value->>'multiplier')::numeric AS mult,
                         SUM((e.value->>'hours')::numeric) AS hrs
                    FROM unnest(array_agg(t.overtime_tiers)) AS ot(j),
                         LATERAL jsonb_each(COALESCE(ot.j, '{}'::jsonb)) e
                   GROUP BY e.key, (e.value->>'multiplier')::numeric
                ) lines) AS ot_lines
        FROM public.timesheets t
       WHERE t.tenant_id = p_tenant_id
         AND t.state = 'approved'
         AND t.week_ending BETWEEN p_period_start AND p_period_end
         AND NOT EXISTS (
               SELECT 1 FROM public.payroll_records pr
                WHERE pr.timesheet_ids @> ARRAY[t.id]
             )
       GROUP BY t.person_id
    ),
    rated AS (
      SELECT a.*,
             (SELECT p.hourly_rate FROM public.placements p
               WHERE p.id = a.named_placement_id AND p.hourly_rate IS NOT NULL) AS named_rate,
             (SELECT count(*) FROM public.placements p
               WHERE p.person_id = a.person_id AND p.tenant_id = p_tenant_id
                 AND p.hourly_rate IS NOT NULL) AS rate_matches,
             (SELECT MIN(p.hourly_rate) FROM public.placements p
               WHERE p.person_id = a.person_id AND p.tenant_id = p_tenant_id
                 AND p.hourly_rate IS NOT NULL) AS fallback_rate,
             (SELECT ap.id FROM public.apprentices ap
               WHERE ap.person_id = a.person_id LIMIT 1) AS apprentice_id,
             -- The worker's own employment type. This function never read it,
             -- which is the whole of the defect guarded below.
             (SELECT pe.employment_type FROM public.people pe
               WHERE pe.id = a.person_id LIMIT 1) AS employment_type
        FROM approved a
    )
    SELECT * FROM rated
  LOOP
    v_ts_count := v_ts_count + COALESCE(array_length(r.ts_ids, 1), 0);

    -- A CONTRACTOR IS NOT PAYROLL, AND THE RECORD MATTERS AS MUCH AS THE MONEY.
    --
    -- This function computed a superannuation guarantee amount and wrote
    -- income_type 'SAL' (Salary and Wages) for every approved timesheet, without
    -- ever consulting the worker's employment type. The application says the
    -- opposite in two places: crm7 src/types/employmentTypes.ts declares
    -- abn_contractor with hasSuperannuation, hasWorkersComp, hasPayrollTax and
    -- hasLeaveEntitlements all FALSE, and src/lib/pipelines/chargeToPayroll.ts
    -- excludes the type from payroll entirely -- "Appears in billing only".
    --
    -- The financial error is the smaller half. A payroll_records row treating an
    -- ABN contractor as salary and wages, with employer super computed, is the
    -- Group Training Organisation's OWN contemporaneous record that it treated
    -- the relationship as employment. Under the s.15AA whole-of-relationship
    -- test that is exactly the class of business record that undermines a
    -- genuine-contractor position, and it goes to s.357 sham-contracting
    -- exposure. The system would have been generating evidence against its own
    -- operator, silently, one approved timesheet at a time.
    --
    -- LATENT, NOT LIVE when this was written: measured 2026-09-03, zero people
    -- carry employment_type 'abn_contractor' and payroll_records holds 2 rows.
    -- So nothing has been mis-recorded. This closes the path before anyone can
    -- walk it, which is the only time such a fix is cheap.
    --
    -- SKIPPED, NOT SILENTLY DROPPED. It joins the existing v_skipped list with a
    -- reason the caller can act on, exactly like the untiered-overtime and
    -- ambiguous-rate cases below. A contractor's hours still need invoicing --
    -- through billing, which is where the application already says they belong.
    IF r.employment_type = 'abn_contractor' THEN
      v_skipped := v_skipped || jsonb_build_object(
        'person_id', r.person_id, 'reason', 'abn_contractor_not_payroll',
        'detail', 'This worker is an ABN contractor. Contractors are billed, not paid through '
                  'payroll: no superannuation guarantee, no workers compensation, no payroll tax '
                  'and no leave accrue to them, and a payroll record asserting otherwise is a '
                  'business record that the relationship was employment. Invoice these hours '
                  'through billing instead.',
        'ordinary_hours', r.ord_hours, 'overtime_hours', r.ot_hours);
      CONTINUE;
    END IF;

    IF r.ot_hours > 0 AND NOT r.ot_fully_tiered THEN
      v_skipped := v_skipped || jsonb_build_object(
        'person_id', r.person_id, 'reason', 'overtime_untiered',
        'detail', format('%s overtime hours carry no tier breakdown. Record them against a tier '
                         'WITH the multiplier that applies under this worker''s award or EBA — '
                         'penalties are not constants and nothing here will supply one.', r.ot_hours),
        'ordinary_hours', r.ord_hours, 'overtime_hours', r.ot_hours);
      CONTINUE;
    END IF;

    IF r.named_rate IS NOT NULL THEN
      v_rate := r.named_rate;
      v_rate_source := 'timesheets.placement_id -> placements.hourly_rate';
    ELSIF r.rate_matches = 1 THEN
      v_rate := r.fallback_rate;
      v_rate_source := 'placements.hourly_rate via person_id (timesheet named no placement)';
    ELSIF r.rate_matches = 0 THEN
      v_skipped := v_skipped || jsonb_build_object(
        'person_id', r.person_id, 'reason', 'no_rate',
        'detail', 'No placement for this person in this tenant carries an hourly_rate.',
        'ordinary_hours', r.ord_hours);
      CONTINUE;
    ELSE
      v_skipped := v_skipped || jsonb_build_object(
        'person_id', r.person_id, 'reason', 'ambiguous_rate',
        'detail', format('%s placements carry an hourly_rate for this person and the timesheets '
                         'do not all name the same placement. Set placement_id on the timesheets.',
                         r.rate_matches),
        'ordinary_hours', r.ord_hours);
      CONTINUE;
    END IF;

    v_ord_earn := round(r.ord_hours * v_rate, 2);

    SELECT COALESCE(SUM(round(v_rate * (l->>'multiplier')::numeric * (l->>'hours')::numeric, 2)), 0)
      INTO v_ot_earn
      FROM jsonb_array_elements(COALESCE(r.ot_lines, '[]'::jsonb)) l;

    v_gross := v_ord_earn + v_ot_earn;

    INSERT INTO public.payroll_records (
      tenant_id, pay_run_id, apprentice_id, person_id, income_type,
      ordinary_hours, ordinary_earnings, overtime_hours, overtime_earnings,
      gross_earnings, qualifying_earnings,
      paye_tax, super_guarantee_rate, super_guarantee_amount, net_pay,
      super_due_date, timesheet_ids, metadata
    )
    VALUES (
      p_tenant_id, v_pay_run_id, r.apprentice_id, r.person_id, 'SAL',
      r.ord_hours, v_ord_earn, r.ot_hours, v_ot_earn,
      v_gross,
      v_ord_earn,
      0, v_sg_rate, round(v_ord_earn * v_sg_rate, 2), 0,
      -- FIX (Defect 1): NULL, not super_due_date_for(v_payment_date). Lets
      -- the existing BEFORE INSERT trigger (set_payroll_super_due_date,
      -- 20260730270200) apply the real Payday Super rule — 20 business days
      -- for this worker's first contribution, 7 otherwise — instead of
      -- silently pre-empting it with the retired quarterly figure.
      NULL,
      r.ts_ids,
      jsonb_build_object(
        'source', 'build_pay_run_from_timesheets',
        'hourly_rate', v_rate,
        'paye_status', 'not_calculated',
        'net_pay_status', 'pending_paye',
        'worker_type', CASE WHEN r.apprentice_id IS NULL THEN 'non_apprentice' ELSE 'apprentice' END,
        'placement_id', r.named_placement_id,
        'overtime_lines', r.ot_lines,
        'overtime_multiplier_source', 'supplied on the timesheet (award/EBA/R8 or user-entered)',
        'super_basis', 'ordinary_earnings_only (overtime excluded from OTE)',
        'rate_source', v_rate_source
      )
    );

    v_created := v_created + 1;
    v_total_gross := v_total_gross + v_gross;
    v_total_super := v_total_super + round(v_ord_earn * v_sg_rate, 2);
  END LOOP;

  UPDATE public.pay_runs
     SET total_gross = v_total_gross, total_super = v_total_super, total_net = 0,
         timesheet_count = v_ts_count, updated_at = now()
   WHERE id = v_pay_run_id;

  -- FIX (Defect 2): read back what was ACTUALLY stamped on THIS run's own
  -- records (both the BEFORE and AFTER triggers have already fired — each
  -- INSERT above is a single-row statement, and row triggers fire
  -- synchronously per statement, so this SELECT sees post-trigger state).
  -- v_created = 0 leaves both variables NULL, which serialises as JSON null
  -- — never a fabricated date for a run that paid nobody.
  SELECT MIN(pr.super_due_date), MAX(pr.super_due_date)
    INTO v_super_due_earliest, v_super_due_latest
    FROM public.payroll_records pr
   WHERE pr.pay_run_id = v_pay_run_id;

  RETURN jsonb_build_object(
    'pay_run_id', v_pay_run_id, 'status', 'draft',
    'records_created', v_created,
    'people_skipped', jsonb_array_length(v_skipped),
    'skipped', v_skipped,
    'total_gross', v_total_gross, 'total_super', v_total_super,
    'super_guarantee_rate', v_sg_rate,
    -- The earliest deadline actually stamped on this run's records — the
    -- conservative figure to show, since acting on it never misses the
    -- soonest obligation. NOT a fresh super_due_date_for() recompute.
    'super_due_date', v_super_due_earliest,
    -- Only present when this run mixed first-contribution (20 business day)
    -- and repeat (7 business day) workers, so the UI/operator can tell a
    -- single figure from a range without guessing.
    'super_due_date_latest',
      CASE WHEN v_super_due_latest IS DISTINCT FROM v_super_due_earliest
           THEN v_super_due_latest END,
    'paye_status', 'not_calculated',
    'refusal_reasons', jsonb_build_array('overtime_untiered','no_rate','ambiguous_rate'),
    'note', 'Draft. PAYG is not calculated here and net_pay is 0 by design — do not treat this as a payable run.'
  );
END;
$function$

