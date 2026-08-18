-- 20260827030000_tenant_settings_oncost_config.sql
--
-- Estate ledger M-1 — per-tenant superannuation and workers' compensation.
--
-- WHAT WAS WRONG. Live measurement 2026-08-18 against tuybltdrdefjblnplpqo:
--
--   select count(distinct super_rate), count(distinct workers_comp_rate)
--     from public.charge_rate_snapshots;   -- 13 snapshots, 1 distinct each
--
-- Every quote in the estate carries the same two platform constants —
-- @bsuite/charge-calc's DEFAULT_CONFIG.superRate = 0.12 and
-- DEFAULT_WC_RATE = 0.047 — because there was no tenant-level on-cost column
-- anywhere in public. crm7/src/lib/chargeRateDefaults.ts:24 names the seam in
-- its own TODO: "Load super/WC/payroll-tax from org's tenant_settings once
-- per-org config lands." This migration is that landing.
--
-- Payroll tax needs nothing here. It is already state-resolved on both live
-- quote paths and snapshot-carried, and its apprentice/trainee relief is a
-- legislative rule about the EMPLOYEE, not a tenant preference — see
-- packages/charge-calc/src/payroll-tax-relief.ts, whose precedence guard
-- expressly forbids a tenant-scoped source from bypassing it.
--
-- WHY tenant_settings AND NOT A NEW TABLE. It is already the estate's
-- tenant-preference store (packages/charge-calc/src/sources.ts names it by
-- name: "tenant preference (saved in tenant_settings)"), it is already
-- tenant-scoped, and its policy set is already correct. Three nullable
-- columns inherit all of that. A new table would have had to re-derive the
-- policies and would have been GRANTed to anon at CREATE time (see
-- reference_every_new_table_is_granted_to_anon_at_create_time) — a risk this
-- change simply does not take.
--
-- AUTHZ VERDICT (bsuite-rls-authz-red-team; all four commands stated, RC6).
-- Live policy set on public.tenant_settings, read from pg_policy 2026-08-18:
--   SELECT  tenant_settings_select_members
--             USING tenant_id IN (select ut.tenant_id from user_tenants ut
--                   where ut.user_id = (select auth.uid()) and ut.status='active')
--   INSERT  tenant_settings_insert_admin   -- WITH CHECK, owner/admin of the tenant
--   UPDATE  tenant_settings_update_admin   -- owner/admin of the tenant
--   DELETE  tenant_settings_delete_admin   -- owner/admin of the tenant
--   ALL     tenant_settings_service_role
-- Grants: authenticated + service_role + postgres. NO anon grant (verified via
-- information_schema.role_table_grants). No GUC predicate anywhere, so RC1
-- (dead current_setting policy) does not apply. The layer being changed here
-- is SCHEMA only — no policy, no grant, no query scope, no client gate is
-- touched by this file, and the three above are what already governs the new
-- columns. Read is tenant-members; write is owner/admin, which is right: a
-- change to either rate moves every quote the tenant issues.

alter table public.tenant_settings
  add column if not exists super_rate numeric(6, 5),
  add column if not exists wc_rate    numeric(6, 5),
  add column if not exists wic_code   text;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS; guard each one.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_settings_super_rate_is_a_fraction'
      and conrelid = 'public.tenant_settings'::regclass
  ) then
    -- A FRACTION, not a percentage. 12% is 0.12, never 12. The bound is what
    -- catches the paste of a percent into a rate field before it multiplies
    -- every super figure the tenant quotes by one hundred.
    alter table public.tenant_settings
      add constraint tenant_settings_super_rate_is_a_fraction
      check (super_rate is null or (super_rate >= 0 and super_rate <= 1));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_settings_wc_rate_is_a_fraction'
      and conrelid = 'public.tenant_settings'::regclass
  ) then
    alter table public.tenant_settings
      add constraint tenant_settings_wc_rate_is_a_fraction
      check (wc_rate is null or (wc_rate >= 0 and wc_rate <= 1));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tenant_settings_wic_code_not_blank'
      and conrelid = 'public.tenant_settings'::regclass
  ) then
    -- '' and '   ' are not "no WIC code" — NULL is. A blank string would join
    -- nothing in wic_rate_lookup and read as a configured value that resolves
    -- to a silent platform fallback.
    alter table public.tenant_settings
      add constraint tenant_settings_wic_code_not_blank
      check (wic_code is null or length(btrim(wic_code)) > 0);
  end if;
end $$;

comment on column public.tenant_settings.super_rate is
  'Superannuation guarantee rate for this tenant, as a FRACTION (0.12 = 12%). '
  'NULL means not configured — @bsuite/charge-calc''s resolveTenantOncosts() '
  'falls back to the platform default and reports the fallback rather than '
  'presenting the constant as the tenant''s own figure.';

comment on column public.tenant_settings.wc_rate is
  'Workers'' compensation premium rate for this tenant, as a FRACTION '
  '(0.047 = 4.7%). Takes precedence over wic_code when both are set: an '
  'explicitly negotiated premium beats a scheme lookup. NULL means not '
  'configured.';

comment on column public.tenant_settings.wic_code is
  'WorkCover Industry Classification code for this tenant, joining '
  'public.wic_rate_lookup(wic_code, state_code) for premium_rate. Used only '
  'when wc_rate is NULL. NULL means not configured.';

-- No policy, no grant, and no index is created here on purpose. tenant_settings
-- is read by primary key / tenant_id, both already indexed, and at 1 row for 7
-- tenants an index on a preference column would cost more than it saves.
