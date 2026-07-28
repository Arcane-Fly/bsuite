// supabase/functions/charge-calc/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Note: In production, this would import from the shared package.
// For Deno edge functions, we'll inline the core calculate function
// or use an npm specifier: import { calculate } from 'npm:@bsuite/charge-calc';

const ALLOWED_ORIGINS = [
  'https://crm.crm7.app',
  'https://d.crm.crm7.app',
  'https://suite.crm7.app',
  'https://d.suite.crm7.app',
  'https://conduit.crm7.app',
  'https://d.conduit.crm7.app',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  try {
    const config = await req.json();

    // TODO: Import calculate from shared package when Deno npm support is stable
    // For now, this serves as the API contract definition.
    // const result = calculate(config);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Edge function scaffold ready. Calculation engine will be wired in Task 12.',
        config_received: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid calculation config', details: String(error) }),
      { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
