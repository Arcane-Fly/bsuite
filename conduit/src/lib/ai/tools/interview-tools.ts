/**
 * Interview Tools for Jodie — Conduit AI
 *
 * 4 tools for scheduling, viewing, cancelling, and suggesting interview times.
 */

import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { ToolExecutionContext, ToolResult } from './index';

function getSupabase(ctx: ToolExecutionContext) {
  return createClient(ctx.supabaseUrl, ctx.supabaseKey);
}

export function createInterviewTools(context: ToolExecutionContext): Record<string, Tool> {
  return {
    schedule_interview: tool({
      description: 'Schedule an interview for a candidate. Creates an interview record.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        job_id: z.string().uuid().describe('The job ID'),
        interview_type: z
          .enum(['phone_screen', 'video', 'in_person', 'panel', 'technical', 'culture_fit'])
          .describe('Type of interview'),
        scheduled_at: z.string().describe('ISO 8601 datetime for the interview'),
        duration_minutes: z.number().default(60).describe('Duration in minutes'),
        location: z.string().optional().describe('Location or video link'),
        interviewers: z.array(z.string()).optional().describe('Interviewer names or IDs'),
        notes: z.string().optional().describe('Additional notes'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const { data, error } = await sb
            .from('r7_interviews')
            .insert({
              candidate_id: params.candidate_id,
              job_id: params.job_id,
              interview_type: params.interview_type,
              scheduled_at: params.scheduled_at,
              duration_minutes: params.duration_minutes,
              location: params.location ?? null,
              interviewers: params.interviewers ?? [],
              notes: params.notes ?? null,
              status: 'scheduled',
              created_by: context.userId,
              tenant_id: context.tenantId,
            })
            .select('id, interview_type, scheduled_at, duration_minutes, status')
            .single();

          if (error) return { success: false, message: 'Scheduling failed', error: error.message };

          return {
            success: true,
            message: `Interview scheduled for ${params.scheduled_at}`,
            data: { interview: data },
          };
        } catch (err) {
          return { success: false, message: 'Scheduling error', error: String(err) };
        }
      },
    }),

    get_upcoming_interviews: tool({
      description: 'List upcoming interviews, optionally filtered by candidate or job.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().optional().describe('Filter by candidate'),
        job_id: z.string().uuid().optional().describe('Filter by job'),
        days_ahead: z.number().default(7).describe('How many days ahead to look'),
        limit: z.number().default(20).describe('Maximum results'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const now = new Date().toISOString();
          const futureDate = new Date(Date.now() + params.days_ahead * 24 * 60 * 60 * 1000).toISOString();

          let query = sb
            .from('r7_interviews')
            .select('id, interview_type, scheduled_at, duration_minutes, status, location, notes, candidate:r7_candidates(id, first_name, last_name), job:r7_jobs(id, title)')
            .eq('tenant_id', context.tenantId)
            .gte('scheduled_at', now)
            .lte('scheduled_at', futureDate)
            .in('status', ['scheduled', 'confirmed']);

          if (params.candidate_id) query = query.eq('candidate_id', params.candidate_id);
          if (params.job_id) query = query.eq('job_id', params.job_id);

          const { data, error } = await query
            .order('scheduled_at', { ascending: true })
            .limit(params.limit);

          if (error) return { success: false, message: 'Interview fetch failed', error: error.message };

          return {
            success: true,
            message: `${(data ?? []).length} upcoming interview(s) in the next ${params.days_ahead} day(s)`,
            data: { interviews: data ?? [] },
          };
        } catch (err) {
          return { success: false, message: 'Interview fetch error', error: String(err) };
        }
      },
    }),

    cancel_interview: tool({
      description: 'Cancel a scheduled interview.',
      inputSchema: z.object({
        interview_id: z.string().uuid().describe('The interview ID to cancel'),
        reason: z.string().optional().describe('Cancellation reason'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const { data, error } = await sb
            .from('r7_interviews')
            .update({
              status: 'cancelled',
              notes: params.reason ? `Cancelled: ${params.reason}` : 'Cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', params.interview_id)
            .eq('tenant_id', context.tenantId)
            .select('id, status, scheduled_at')
            .single();

          if (error) return { success: false, message: 'Cancel failed', error: error.message };

          return {
            success: true,
            message: 'Interview cancelled',
            data: { interview: data },
          };
        } catch (err) {
          return { success: false, message: 'Cancel error', error: String(err) };
        }
      },
    }),

    suggest_interview_times: tool({
      description:
        'Suggest available interview time slots by checking existing interviews for conflicts. Returns open slots.',
      inputSchema: z.object({
        date: z.string().describe('Date to check (YYYY-MM-DD)'),
        duration_minutes: z.number().default(60).describe('Required duration'),
        start_hour: z.number().default(9).describe('Earliest hour (24h format)'),
        end_hour: z.number().default(17).describe('Latest hour (24h format)'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const dayStart = `${params.date}T00:00:00.000Z`;
          const dayEnd = `${params.date}T23:59:59.999Z`;

          const { data: existing } = await sb
            .from('r7_interviews')
            .select('scheduled_at, duration_minutes')
            .eq('tenant_id', context.tenantId)
            .gte('scheduled_at', dayStart)
            .lte('scheduled_at', dayEnd)
            .in('status', ['scheduled', 'confirmed']);

          // Build busy intervals
          const busy = (existing ?? []).map((i) => {
            const start = new Date(i.scheduled_at).getTime();
            const end = start + (i.duration_minutes ?? 60) * 60 * 1000;
            return { start, end };
          });

          // Generate available slots
          const slots: string[] = [];
          const slotDuration = params.duration_minutes * 60 * 1000;

          for (let hour = params.start_hour; hour < params.end_hour; hour++) {
            for (const minute of [0, 30]) {
              const slotStart = new Date(`${params.date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).getTime();
              const slotEnd = slotStart + slotDuration;

              // Check for end-of-day overflow
              const endOfDay = new Date(`${params.date}T${String(params.end_hour).padStart(2, '0')}:00:00`).getTime();
              if (slotEnd > endOfDay) continue;

              // Check for conflicts
              const hasConflict = busy.some(
                (b) => slotStart < b.end && slotEnd > b.start,
              );

              if (!hasConflict) {
                slots.push(new Date(slotStart).toISOString());
              }
            }
          }

          return {
            success: true,
            message: `${slots.length} available slot(s) on ${params.date}`,
            data: {
              date: params.date,
              available_slots: slots,
              duration_minutes: params.duration_minutes,
              existing_interviews: (existing ?? []).length,
            },
          };
        } catch (err) {
          return { success: false, message: 'Slot suggestion error', error: String(err) };
        }
      },
    }),
  };
}
