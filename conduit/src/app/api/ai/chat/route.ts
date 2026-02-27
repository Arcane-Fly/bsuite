/**
 * Conduit AI Chat API Route
 *
 * Edge Runtime streaming endpoint for Jodie (AI assistant).
 * Handles authentication, tenant isolation, model routing, and tool execution.
 */

import { JODIE_SYSTEM_PROMPT } from '@/lib/ai/jodie-persona';
import { classifyComplexity, createModelInstance, getModelSelection } from '@/lib/ai/model-router';
import { createToolRegistry, type ToolExecutionContext } from '@/lib/ai/tools';
import { createClient } from '@supabase/supabase-js';
import { stepCountIs, streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Extract auth token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.slice(7);

    // Validate user with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get tenant ID from user metadata
    const tenantId = (user.user_metadata?.tenant_id as string) ||
      (user.app_metadata?.tenant_id as string);

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'No tenant context' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Route model based on last user message complexity
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
    const complexity = classifyComplexity(lastUserMessage?.content ?? '', 0);
    const modelSelection = getModelSelection(complexity);
    const model = createModelInstance(modelSelection);

    // Create tool execution context
    const toolContext: ToolExecutionContext = {
      tenantId,
      userId: user.id,
      supabaseUrl,
      supabaseKey,
    };

    // Create tool registry
    const tools = createToolRegistry(toolContext);

    // Stream the response
    const result = streamText({
      model,
      system: JODIE_SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(5),
      temperature: modelSelection.temperature,
      maxOutputTokens: modelSelection.maxTokens,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error('[Conduit AI] Chat error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
