/**
 * Communication Tools for Jodie — Conduit AI
 *
 * 2 tools for sending candidate emails and drafting outreach messages.
 */

import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { ToolExecutionContext, ToolResult } from './index';

function getSupabase(ctx: ToolExecutionContext) {
  return createClient(ctx.supabaseUrl, ctx.supabaseKey);
}

export function createCommunicationTools(context: ToolExecutionContext): Record<string, Tool> {
  return {
    send_candidate_email: tool({
      description:
        'Send an email to a candidate via the email-dispatcher Edge Function. Requires candidate ID and message content.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        subject: z.string().describe('Email subject line'),
        body: z.string().describe('Email body (plain text or HTML)'),
        reply_to: z.string().email().optional().describe('Reply-to address'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          // Get candidate email
          const { data: candidate, error: candErr } = await sb
            .from('r7_candidates')
            .select('id, first_name, last_name, email')
            .eq('id', params.candidate_id)
            .eq('tenant_id', context.tenantId)
            .single();

          if (candErr || !candidate?.email) {
            return { success: false, message: 'Candidate not found or has no email', error: candErr?.message };
          }

          // Call email-dispatcher Edge Function
          const { data: fnData, error: fnErr } = await sb.functions.invoke('email-dispatcher', {
            body: {
              to: candidate.email,
              subject: params.subject,
              body: params.body,
              reply_to: params.reply_to ?? null,
              metadata: {
                source: 'conduit-ai',
                candidate_id: params.candidate_id,
                tenant_id: context.tenantId,
              },
            },
          });

          if (fnErr) return { success: false, message: 'Email send failed', error: fnErr.message };

          return {
            success: true,
            message: `Email sent to ${candidate.first_name} ${candidate.last_name} (${candidate.email})`,
            data: { recipient: candidate.email, response: fnData },
          };
        } catch (err) {
          return { success: false, message: 'Email error', error: String(err) };
        }
      },
    }),

    draft_outreach: tool({
      description:
        'Generate a personalised outreach message for a candidate based on their profile and a job opening. Content is AI-generated.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        job_id: z.string().uuid().optional().describe('Optional: job to reference in outreach'),
        tone: z
          .enum(['formal', 'friendly', 'casual'])
          .default('friendly')
          .describe('Message tone'),
        channel: z
          .enum(['email', 'sms', 'linkedin'])
          .default('email')
          .describe('Communication channel'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const { data: candidate, error: candErr } = await sb
            .from('r7_candidates')
            .select('id, first_name, last_name, email, skills, qualifications, preferred_locations')
            .eq('id', params.candidate_id)
            .eq('tenant_id', context.tenantId)
            .single();

          if (candErr || !candidate) {
            return { success: false, message: 'Candidate not found', error: candErr?.message };
          }

          let jobInfo = null;
          if (params.job_id) {
            const { data: job } = await sb
              .from('r7_jobs')
              .select('id, title, location, employment_type')
              .eq('id', params.job_id)
              .single();
            jobInfo = job;
          }

          // Return structured data for the AI model to compose the actual message
          return {
            success: true,
            message: '[AI-generated draft] Outreach context gathered — compose the message using this data',
            data: {
              ai_generated: true,
              candidate: {
                name: `${candidate.first_name} ${candidate.last_name}`,
                skills: candidate.skills,
                qualifications: candidate.qualifications,
                preferred_locations: candidate.preferred_locations,
              },
              job: jobInfo,
              tone: params.tone,
              channel: params.channel,
            },
          };
        } catch (err) {
          return { success: false, message: 'Outreach draft error', error: String(err) };
        }
      },
    }),
  };
}
