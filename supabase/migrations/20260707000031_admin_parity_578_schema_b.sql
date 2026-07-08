-- Admin parity schema B: Payroll-tax extensions (TFN, FBT, ETP, Lump Sum, CITB)
-- Closes bsuite#578 (matrix rows 111-114)
-- Creates: pay_item_types, pay_items, tfn_declarations, citb_levy_config
-- Adds columns to apprentices: fbt_reportable_amount, termination_date

-- Enable pgcrypto for TFN encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Pay item types (seed data for ATO STP Phase 2)
CREATE TABLE IF NOT EXISTS public.pay_item_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('ordinary','overtime','allowance','leave','etp','lump_sum','fbt','other')),
  stp_phase2_code text,
  is_taxable bool NOT NULL DEFAULT true,
  is_super_eligible bool NOT NULL DEFAULT true
);

INSERT INTO public.pay_item_types (code,label,category,stp_phase2_code,is_taxable,is_super_eligible) VALUES
  ('ordinary','Ordinary time earnings','ordinary','GROSS',true,true),
  ('overtime','Overtime','overtime','OVERTIME',true,false),
  ('allowance','Allowance','allowance','ALLOW',true,false),
  ('leave','Leave','leave','PAID_LEAVE',true,true),
  ('etp_r','ETP Type R (genuine redundancy)','etp','ETP_R',true,false),
  ('etp_o','ETP Type O (other)','etp','ETP_O',true,false),
  ('lump_a','Lump Sum A (long service)','lump_sum','LUMP_A',true,false),
  ('lump_b','Lump Sum B (pre-1983 leave)','lump_sum','LUMP_B',false,false),
  ('lump_d','Lump Sum D (tax-free redundancy)','lump_sum','LUMP_D',false,false),
  ('lump_e','Lump Sum E (back pay >12mo)','lump_sum','LUMP_E',true,false),
  ('fbt','Reportable Fringe Benefit','fbt','RFBA',false,false)
ON CONFLICT (code) DO NOTHING;

-- Pay items (tenant-scoped)
CREATE TABLE IF NOT EXISTS public.pay_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type_id uuid NOT NULL REFERENCES public.pay_item_types(id),
  gl_account text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
ALTER TABLE public.pay_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.pay_items FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- TFN declarations (per employee, encrypted)
CREATE TABLE IF NOT EXISTS public.tfn_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprentice_id uuid NOT NULL REFERENCES public.apprentices(id) ON DELETE CASCADE,
  tfn_encrypted bytea NOT NULL,
  residency_status text NOT NULL CHECK (residency_status IN ('resident','foreign_resident','working_holiday')),
  tax_free_threshold_claimed bool NOT NULL DEFAULT false,
  help_debt bool NOT NULL DEFAULT false,
  vsl_debt bool NOT NULL DEFAULT false,
  medicare_levy_exemption text CHECK (medicare_levy_exemption IN ('none','half','full')),
  declared_date date NOT NULL,
  signed_pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tfn_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tfn_admin_only ON public.tfn_declarations FOR ALL
  USING (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin')
         AND EXISTS (SELECT 1 FROM public.apprentices a
                     WHERE a.id = tfn_declarations.apprentice_id
                       AND a.tenant_id = public.current_tenant_id()))
  WITH CHECK (auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin')
              AND EXISTS (SELECT 1 FROM public.apprentices a
                          WHERE a.id = tfn_declarations.apprentice_id
                            AND a.tenant_id = public.current_tenant_id()));

-- Add columns to apprentices for payroll-tax tracking
ALTER TABLE public.apprentices
  ADD COLUMN IF NOT EXISTS fbt_reportable_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS termination_date date;

-- CITB levy config (single-row-per-tenant)
CREATE TABLE IF NOT EXISTS public.citb_levy_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  is_active bool NOT NULL DEFAULT true,
  levy_rate numeric(5,4) NOT NULL CHECK (levy_rate >= 0 AND levy_rate <= 1),
  threshold_amount numeric(12,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX citb_one_active_per_tenant
  ON public.citb_levy_config(tenant_id) WHERE is_active = true;
ALTER TABLE public.citb_levy_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.citb_levy_config FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id()
              AND auth.jwt() #>> '{app_metadata,role}' IN ('org_admin','gto_admin'));

-- Encrypted TFN helpers (SECURITY DEFINER to access vault)
CREATE OR REPLACE FUNCTION public.encrypt_tfn(plain text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  k text;
BEGIN
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'tfn_encryption_key';
  IF k IS NULL THEN RAISE EXCEPTION 'tfn_encryption_key missing in vault'; END IF;
  RETURN extensions.pgp_sym_encrypt(plain, k);
END $$;

CREATE OR REPLACE FUNCTION public.decrypt_tfn_last4(enc bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  k text;
  p text;
BEGIN
  -- only org_admin/gto_admin allowed
  IF (auth.jwt() #>> '{app_metadata,role}') NOT IN ('org_admin','gto_admin') THEN
    RETURN '****';
  END IF;
  SELECT decrypted_secret INTO k FROM vault.decrypted_secrets WHERE name = 'tfn_encryption_key';
  p := extensions.pgp_sym_decrypt(enc, k);
  RETURN repeat('*', greatest(length(p)-4, 0)) || right(p, 4);
END $$;

REVOKE EXECUTE ON FUNCTION public.encrypt_tfn(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_tfn(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.decrypt_tfn_last4(bytea) FROM anon;
GRANT EXECUTE ON FUNCTION public.decrypt_tfn_last4(bytea) TO authenticated;
