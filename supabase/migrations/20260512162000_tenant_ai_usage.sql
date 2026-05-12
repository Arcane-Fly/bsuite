BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  cost_usd NUMERIC(10,6) NOT NULL CHECK (cost_usd >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_ai_usage_request_id_key
  ON public.tenant_ai_usage (request_id);

CREATE INDEX IF NOT EXISTS tenant_ai_usage_tenant_created_at_idx
  ON public.tenant_ai_usage (tenant_id, created_at DESC);

ALTER TABLE public.tenant_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant ai usage for their memberships" ON public.tenant_ai_usage;
CREATE POLICY "Users can view tenant ai usage for their memberships"
  ON public.tenant_ai_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_tenants
      WHERE user_tenants.user_id = auth.uid()
        AND user_tenants.tenant_id = tenant_ai_usage.tenant_id
    )
  );

DROP POLICY IF EXISTS "Service role can manage tenant ai usage" ON public.tenant_ai_usage;
CREATE POLICY "Service role can manage tenant ai usage"
  ON public.tenant_ai_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
