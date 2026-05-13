-- =====================================================
-- Migration: jodie_sla_tracking table
-- =====================================================

-- Keep severity/effort check constraints aligned with packages/jodie/src/routing-matrix.ts.
CREATE TABLE IF NOT EXISTS public.jodie_sla_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number    BIGINT NOT NULL UNIQUE,
  severity        TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  effort          TEXT NOT NULL CHECK (effort IN ('XS', 'S', 'M', 'L')),
  owner           TEXT NOT NULL,
  deadline_at     TIMESTAMPTZ NOT NULL,
  breach_count    INTEGER NOT NULL DEFAULT 0 CHECK (breach_count >= 0),
  escalated       BOOLEAN NOT NULL DEFAULT false,
  escalated_at    TIMESTAMPTZ,
  human_paged_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_jodie_sla_tracking_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jodie_sla_tracking_updated_at ON public.jodie_sla_tracking;
CREATE TRIGGER jodie_sla_tracking_updated_at
  BEFORE UPDATE ON public.jodie_sla_tracking
  FOR EACH ROW EXECUTE FUNCTION public.set_jodie_sla_tracking_updated_at();

ALTER TABLE public.jodie_sla_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jodie_sla_tracking_select" ON public.jodie_sla_tracking;
CREATE POLICY "jodie_sla_tracking_select"
  ON public.jodie_sla_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "jodie_sla_tracking_insert" ON public.jodie_sla_tracking;
CREATE POLICY "jodie_sla_tracking_insert"
  ON public.jodie_sla_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  );

DROP POLICY IF EXISTS "jodie_sla_tracking_update" ON public.jodie_sla_tracking;
CREATE POLICY "jodie_sla_tracking_update"
  ON public.jodie_sla_tracking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND platform_role IN ('developer', 'platform_admin')
    )
  );
