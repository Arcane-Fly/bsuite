-- ===========================================================================
-- set_tenant_oncosts() — the write surface the on-cost columns never had
-- (bsuite estate register row W-8)
-- ===========================================================================
-- 20260827030000 added super_rate, wc_rate and wic_code to tenant_settings,
-- crm7 wired a reader (AdvancedConfigSection.tsx calls resolveTenantOncosts and
-- badges each figure "Tenant rate" or "Platform default"), and payroll tax was
-- made state-based. Three of four limbs done — and NOTHING COULD WRITE THE
-- COLUMNS.
--
-- Measured live 2026-09-02 (project tuybltdrdefjblnplpqo):
--
--   tenants                                   7
--   distinct tenant_id in tenant_settings     1
--   rows with super_rate    not null          0
--   rows with wc_rate       not null          0
--   rows with wic_code      not null          0
--   charge_rate_snapshots  13, distinct super_rate 1, distinct wc_rate 1
--
-- A grep of crm7/src for the three column names returns only generated types,
-- one comment and an unrelated AI field — no form, no .update(), no .upsert().
-- Positive control: that same grep DOES surface the generated-type occurrences,
-- so the zero is a working search rather than an empty one.
--
-- So every tenant is quoted superannuation 12% and workers' compensation 4.7%,
-- from @bsuite/charge-calc's DEFAULT_CONFIG. Workers' compensation is per
-- employer and per WIC (WorkCover Industry Classification) code and varies by
-- several multiples between a labour-hire Group Training Organisation and a
-- light-commercial host. The charge rate is therefore wrong for every tenant
-- whose real on-costs differ, in whichever direction they differ: under-recovery
-- against the host, or an over-quote that loses the placement.
--
-- WHY AN RPC AND NOT A DIRECT UPDATE. `tenant_settings` is owned by `bsu` in
-- packages/dry-lint/src/ownership-map.json and crm7 is a reader, so
-- `bsuite/no-cross-app-write` correctly rejects a raw write from crm7. The three
-- legacy pages that do write it directly are individually-suppressed debt, not a
-- pattern to extend. This follows the narrow-RPC precedent already set by
-- set_tenant_employee_number_format(uuid, text) (20260814020000) and
-- reorder_pay_item_rules.
--
-- SECURITY INVOKER — stated by omission of SECURITY DEFINER, and load-bearing.
-- The caller's own RLS governs every row: tenant_settings_update_admin and
-- tenant_settings_insert_admin both scope to
-- `user_tenants.tenant_id = tenant_settings.tenant_id AND role IN ('owner','admin')`
-- on USING and WITH CHECK. An org admin cannot set another tenant's rates,
-- because this function has no privileges its caller lacks.
--
-- NULL MEANS "USE THE PLATFORM DEFAULT", AND MUST STAY SETTABLE. All three
-- parameters are written unconditionally, so passing NULL CLEARS the value and
-- resolveTenantOncosts falls back to the platform floor. A "NULL means leave
-- unchanged" reading would make a tenant rate impossible to undo without direct
-- database access — and a wrong rate you cannot clear is worse than no rate.
-- A zero is NOT the same as NULL and is deliberately still accepted: a genuine
-- 0% workers' compensation rate is a real, if rare, arrangement, and refusing it
-- here would push that tenant back to the platform default silently.
--
-- VALIDATION duplicates the CHECK constraints from 20260827030000 on purpose,
-- to raise a sentence a person can act on instead of a constraint-violation
-- code. The constraints remain the actual guarantee; these are the message.
-- ===========================================================================

create or replace function public.set_tenant_oncosts(
  p_tenant_id  uuid,
  p_super_rate numeric,
  p_wc_rate    numeric,
  p_wic_code   text
) returns void
  language plpgsql
  set search_path to 'public', 'pg_temp'
  as $fn$
begin
  if p_tenant_id is null then
    raise exception 'Tenant context is required'
      using errcode = '42501';
  end if;

  -- A FRACTION, not a percentage. 12% is 0.12, never 12. Catching the pasted
  -- percent here is the difference between an error message and every super
  -- figure the tenant quotes being multiplied by one hundred.
  if p_super_rate is not null and (p_super_rate < 0 or p_super_rate > 1) then
    raise exception 'Superannuation rate must be a fraction between 0 and 1 (12%% is 0.12, not 12)'
      using errcode = '22023';
  end if;

  if p_wc_rate is not null and (p_wc_rate < 0 or p_wc_rate > 1) then
    raise exception 'Workers compensation rate must be a fraction between 0 and 1 (4.7%% is 0.047, not 4.7)'
      using errcode = '22023';
  end if;

  insert into public.tenant_settings (tenant_id, super_rate, wc_rate, wic_code)
  values (
    p_tenant_id,
    p_super_rate,
    p_wc_rate,
    -- An empty WIC code is an absent one. Storing '' would badge the figure as a
    -- tenant value while carrying no classification at all.
    nullif(btrim(coalesce(p_wic_code, '')), '')
  )
  on conflict (tenant_id) do update
    set super_rate = excluded.super_rate,
        wc_rate    = excluded.wc_rate,
        wic_code   = excluded.wic_code;
end;
$fn$;

comment on function public.set_tenant_oncosts(uuid, numeric, numeric, text) is
  'bsuite estate register W-8. SECURITY INVOKER — the caller''s own RLS on '
  'tenant_settings (tenant_settings_update_admin / tenant_settings_insert_admin: '
  'owner/admin members of that specific tenant, USING + WITH CHECK) governs every '
  'row this touches. All three values are written unconditionally, so NULL CLEARS '
  'a rate and resolveTenantOncosts falls back to the platform default. Rates are '
  'FRACTIONS: 12% is 0.12.';

grant execute on function public.set_tenant_oncosts(uuid, numeric, numeric, text)
  to authenticated;
