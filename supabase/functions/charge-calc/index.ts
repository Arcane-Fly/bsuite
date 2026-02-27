// supabase/functions/charge-calc/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Note: In production, this would import from the shared package.
// For Deno edge functions, we'll inline the core calculate function
// or use an npm specifier: import { calculate } from 'npm:@bsuite/charge-calc';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid calculation config', details: String(error) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
