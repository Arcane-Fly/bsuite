import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { generateObject } from 'npm:ai@6';
import { gateway } from 'npm:@ai-sdk/gateway@1';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

// Direct imports from leaf modules to keep Deno bundle small and avoid
// transitive `import { ... } from 'ai'` in agent.ts (which is a Node-only
// MCP runtime). classify-issue only needs the classifier + taxonomy types.
import {
  classifyIssue,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MODEL_ID,
} from '../../../packages/jodie/src/classifier.ts';

const requestSchema = z.object({
  issueUrl: z.string().url(),
  issueNumber: z.number().int().positive(),
  repo: z.string().min(1).max(200),
  agentRole: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  body: z.string().max(50_000).default(''),
  labels: z.array(z.string()).default([]),
});

const DEFAULT_ALLOWED_ORIGINS = [
  'https://suite.crm7.app',
  'https://d.suite.crm7.app',
  'https://crm.crm7.app',
  'https://d.crm.crm7.app',
  'https://r8.crm7.app',
  'https://d.r8.crm7.app',
  'https://ideas.crm7.app',
  'https://d.ideas.crm7.app',
  'https://conduit.crm7.app',
  'https://d.conduit.crm7.app',
  'https://www.braden.com.au',
  'https://d.braden.com.au',
  'http://localhost:3000',
  'http://localhost:5173',
] as const;

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, x-client-info, apikey, x-jodie-internal-secret',
  Vary: 'Origin',
};

const parseAllowedOrigins = (): Set<string> => {
  const raw = Deno.env.get('JODIE_ALLOWED_ORIGINS');
  const configuredOrigins = raw
    ? raw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins]);
};

const withCorsHeaders = (origin: string | null, allowedOrigins: Set<string>) => {
  if (origin && allowedOrigins.has(origin)) {
    return {
      ...baseHeaders,
      'Access-Control-Allow-Origin': origin,
    };
  }

  return baseHeaders;
};

const allowedOrigins = parseAllowedOrigins();
const textEncoder = new TextEncoder();

const constantTimeEqual = (
  left: string | null | undefined,
  right: string | null | undefined
): boolean => {
  const leftBytes = textEncoder.encode(left ?? '');
  const rightBytes = textEncoder.encode(right ?? '');
  const maxLength = Math.max(leftBytes.length, rightBytes.length);

  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = withCorsHeaders(origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rawThreshold = Deno.env.get('JODIE_CONFIDENCE_THRESHOLD');
  const confidenceThreshold =
    rawThreshold === undefined ? DEFAULT_CONFIDENCE_THRESHOLD : Number(rawThreshold);
  const modelId = Deno.env.get('JODIE_CLASSIFIER_MODEL') ?? DEFAULT_MODEL_ID;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers }
    );
  }

  if (
    Number.isNaN(confidenceThreshold) ||
    confidenceThreshold < 0 ||
    confidenceThreshold > 1
  ) {
    return new Response(
      JSON.stringify({ error: 'Invalid JODIE_CONFIDENCE_THRESHOLD (must be 0..1)' }),
      { status: 500, headers }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  const bearerToken =
    authHeader && /^bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^bearer\s+/i, '').trim()
      : null;
  const internalSecret = Deno.env.get('JODIE_INTERNAL_SECRET');
  const suppliedInternalSecret = req.headers.get('x-jodie-internal-secret');
  const internalAuthPassed =
    Boolean(internalSecret) &&
    Boolean(suppliedInternalSecret) &&
    constantTimeEqual(internalSecret, suppliedInternalSecret);

  if (!bearerToken && !internalAuthPassed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  if (bearerToken) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(bearerToken);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      });
    }
  }

  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers,
    });
  }

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers,
    });
  }

  const parsedRequest = requestSchema.safeParse(requestBody);
  if (!parsedRequest.success) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Invalid request payload',
        details: parsedRequest.error.issues,
      }),
      {
        status: 400,
        headers,
      }
    );
  }

  try {
    const classificationResult = await classifyIssue(parsedRequest.data, {
      modelId,
      confidenceThreshold,
      generateObject: async ({ system, prompt, schema, metadata }) => {
        const generated = await generateObject({
          model: gateway(modelId),
          schema,
          system,
          prompt,
          experimental_telemetry: {
            isEnabled: true,
            metadata: {
              issueNumber: metadata.issueNumber,
              repo: metadata.repo,
              agentRole: metadata.agentRole,
            },
          },
        });

        return {
          object: generated.object,
          usage: generated.usage,
          modelId,
        };
      },
    });

    const { error: insertError } = await supabase.from('jodie_classifications').insert({
      issue_url: classificationResult.auditRecord.issueUrl,
      classification: classificationResult.auditRecord.classification,
      confidence: classificationResult.auditRecord.confidence,
      model_id: classificationResult.auditRecord.modelId,
      taxonomy_version: classificationResult.auditRecord.taxonomyVersion,
      latency_ms: classificationResult.auditRecord.latencyMs,
      cost_usd: classificationResult.auditRecord.costUsd,
      created_at: classificationResult.auditRecord.createdAt,
    });

    if (insertError) {
      throw new Error(`Failed to write audit row: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        issue_url: parsedRequest.data.issueUrl,
        classification: classificationResult.classification,
        confidence: classificationResult.classification.confidence,
        confidence_threshold: classificationResult.confidenceThreshold,
        routing_decision: classificationResult.routingDecision,
        routing_labels: classificationResult.routingLabels,
        retry_count: classificationResult.retryCount,
        latency_ms: classificationResult.latencyMs,
        cost_usd: classificationResult.costUsd,
        model_id: classificationResult.modelId,
        taxonomy_version: classificationResult.taxonomyVersion,
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Classification failed',
        details:
          Deno.env.get('JODIE_DEBUG') === 'true' ? message : 'See edge logs for details',
      }),
      {
        status: 500,
        headers,
      }
    );
  }
});
