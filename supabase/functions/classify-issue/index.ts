import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { generateObject } from 'npm:ai@5';
import { gateway } from 'npm:@ai-sdk/gateway@1';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@4';

import {
  classifyIssue,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MODEL_ID,
} from '../../../packages/jodie/src/index.ts';

const requestSchema = z.object({
  issueUrl: z.string().url(),
  issueNumber: z.number().int().positive(),
  repo: z.string().min(1).max(200),
  agentRole: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  body: z.string().max(50_000).default(''),
  labels: z.array(z.string()).default([]),
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

serve(async (req) => {
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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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
