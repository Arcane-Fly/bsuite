CREATE TABLE IF NOT EXISTS public.jodie_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_url TEXT NOT NULL CHECK (char_length(trim(issue_url)) > 0),
  classification JSONB NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  model_id TEXT NOT NULL,
  taxonomy_version TEXT NOT NULL,
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jodie_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jodie_classifications_insert_service_role" ON public.jodie_classifications;
CREATE POLICY "jodie_classifications_insert_service_role"
  ON public.jodie_classifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "jodie_classifications_select_authenticated" ON public.jodie_classifications;
CREATE POLICY "jodie_classifications_select_authenticated"
  ON public.jodie_classifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_jodie_classifications_issue_url_created_at
  ON public.jodie_classifications (issue_url, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jodie_classifications_created_at
  ON public.jodie_classifications (created_at DESC);
