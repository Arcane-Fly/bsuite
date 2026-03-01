/**
 * Pipeline Tools for Jodie — Conduit AI
 *
 * 5 tools for managing the recruitment pipeline Kanban board.
 */

import { createClient } from '@supabase/supabase-js';
import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext, ToolResult } from './index';

function getSupabase(ctx: ToolExecutionContext) {
  return createClient(ctx.supabaseUrl, ctx.supabaseKey);
}

export function createPipelineTools(context: ToolExecutionContext): Record<string, Tool> {
  return {
    get_pipeline_overview: tool({
      description:
        'Get an overview of all pipeline stages with candidate counts. Helps identify bottlenecks.',
      inputSchema: z.object({
        job_id: z.string().uuid().optional().describe('Optional: filter by job ID'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const { data: stages, error: stageErr } = await sb
            .from('r7_pipeline_stages')
            .select('id, name, "order", color')
            .eq('tenant_id', context.tenantId)
            .order('order', { ascending: true });

          if (stageErr) return { success: false, message: 'Failed to fetch stages', error: stageErr.message };

          let entryQuery = sb
            .from('r7_pipeline_entries')
            .select('id, stage_id, candidate_id, moved_at, created_at')
            .eq('tenant_id', context.tenantId);

          if (params.job_id) {
            entryQuery = entryQuery.eq('job_id', params.job_id);
          }

          const { data: entries, error: entryErr } = await entryQuery;
          if (entryErr) return { success: false, message: 'Failed to fetch entries', error: entryErr.message };

          const entriesByStage = new Map<string, number>();
          (entries ?? []).forEach((e) => {
            entriesByStage.set(e.stage_id, (entriesByStage.get(e.stage_id) ?? 0) + 1);
          });

          const overview = (stages ?? []).map((s) => ({
            stage_id: s.id,
            stage_name: s.name,
            order: s.order,
            color: s.color,
            candidate_count: entriesByStage.get(s.id) ?? 0,
          }));

          const totalCandidates = overview.reduce((sum, s) => sum + s.candidate_count, 0);

          return {
            success: true,
            message: `Pipeline has ${totalCandidates} candidate(s) across ${overview.length} stage(s)`,
            data: { stages: overview, totalCandidates },
          };
        } catch (err) {
          return { success: false, message: 'Pipeline overview error', error: String(err) };
        }
      },
    }),

    move_candidate_in_pipeline: tool({
      description: 'Move a candidate to a different pipeline stage.',
      inputSchema: z.object({
        entry_id: z.string().uuid().describe('The pipeline entry ID'),
        target_stage_id: z.string().uuid().describe('The target stage ID'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const { data, error } = await sb
            .from('r7_pipeline_entries')
            .update({
              stage_id: params.target_stage_id,
              moved_at: new Date().toISOString(),
            })
            .eq('id', params.entry_id)
            .eq('tenant_id', context.tenantId)
            .select('id, stage_id, candidate_id, candidate:r7_candidates(first_name, last_name), stage:r7_pipeline_stages(name)')
            .single();

          if (error) return { success: false, message: 'Move failed', error: error.message };

          return {
            success: true,
            message: `Moved candidate to "${(data as Record<string, unknown>).stage ? ((data as Record<string, unknown>).stage as Record<string, string>).name : 'new stage'}"`,
            data: { entry: data },
          };
        } catch (err) {
          return { success: false, message: 'Move error', error: String(err) };
        }
      },
    }),

    add_to_pipeline: tool({
      description: 'Add a candidate to the pipeline at a specified stage.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        job_id: z.string().uuid().describe('The job ID'),
        stage_id: z.string().uuid().describe('The stage to place them in'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          // Check if candidate already in pipeline for this job
          const { data: existing } = await sb
            .from('r7_pipeline_entries')
            .select('id')
            .eq('tenant_id', context.tenantId)
            .eq('candidate_id', params.candidate_id)
            .eq('job_id', params.job_id)
            .maybeSingle();

          if (existing) {
            return { success: false, message: 'Candidate is already in the pipeline for this job' };
          }

          const { data, error } = await sb
            .from('r7_pipeline_entries')
            .insert({
              tenant_id: context.tenantId,
              candidate_id: params.candidate_id,
              job_id: params.job_id,
              stage_id: params.stage_id,
              added_by: context.userId,
            })
            .select('id, candidate_id, job_id, stage_id')
            .single();

          if (error) return { success: false, message: 'Failed to add to pipeline', error: error.message };

          return {
            success: true,
            message: 'Candidate added to pipeline',
            data: { entry: data },
          };
        } catch (err) {
          return { success: false, message: 'Pipeline add error', error: String(err) };
        }
      },
    }),

    get_stage_candidates: tool({
      description: 'List all candidates in a specific pipeline stage.',
      inputSchema: z.object({
        stage_id: z.string().uuid().describe('The pipeline stage ID'),
        job_id: z.string().uuid().optional().describe('Optional: filter by job'),
        limit: z.number().default(20).describe('Maximum results'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          let query = sb
            .from('r7_pipeline_entries')
            .select('id, moved_at, created_at, candidate:r7_candidates(id, first_name, last_name, email, status, rating), job:r7_jobs(id, title)')
            .eq('tenant_id', context.tenantId)
            .eq('stage_id', params.stage_id);

          if (params.job_id) query = query.eq('job_id', params.job_id);

          const { data, error } = await query
            .order('moved_at', { ascending: false })
            .limit(params.limit);

          if (error) return { success: false, message: 'Stage query failed', error: error.message };

          return {
            success: true,
            message: `${(data ?? []).length} candidate(s) in this stage`,
            data: { entries: data ?? [] },
          };
        } catch (err) {
          return { success: false, message: 'Stage candidates error', error: String(err) };
        }
      },
    }),

    pipeline_bottleneck_analysis: tool({
      description:
        'Identify pipeline stages where candidates are stuck (high dwell time). Helps optimize the hiring process.',
      inputSchema: z.object({
        job_id: z.string().uuid().optional().describe('Optional: analyse for a specific job'),
        days_threshold: z.number().default(7).describe('Number of days to consider a bottleneck'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const { data: stages } = await sb
            .from('r7_pipeline_stages')
            .select('id, name, "order"')
            .eq('tenant_id', context.tenantId)
            .order('order', { ascending: true });

          let entryQuery = sb
            .from('r7_pipeline_entries')
            .select('id, stage_id, moved_at, created_at')
            .eq('tenant_id', context.tenantId);

          if (params.job_id) entryQuery = entryQuery.eq('job_id', params.job_id);

          const { data: entries } = await entryQuery;

          const now = Date.now();
          const thresholdMs = params.days_threshold * 24 * 60 * 60 * 1000;
          const stageMap = new Map((stages ?? []).map((s) => [s.id, s]));

          // Calculate dwell times per stage
          const stageStats = new Map<string, { total: number; stuck: number; avgDwellDays: number }>();

          (entries ?? []).forEach((entry) => {
            const stageTime = entry.moved_at || entry.created_at;
            const dwellMs = now - new Date(stageTime).getTime();
            const stageId = entry.stage_id;

            if (!stageStats.has(stageId)) {
              stageStats.set(stageId, { total: 0, stuck: 0, avgDwellDays: 0 });
            }
            const stats = stageStats.get(stageId)!;
            stats.total += 1;
            if (dwellMs > thresholdMs) stats.stuck += 1;
            stats.avgDwellDays = (stats.avgDwellDays * (stats.total - 1) + dwellMs / (24 * 60 * 60 * 1000)) / stats.total;
          });

          const bottlenecks = (stages ?? [])
            .map((s) => {
              const stats = stageStats.get(s.id) ?? { total: 0, stuck: 0, avgDwellDays: 0 };
              return {
                stage_name: s.name,
                stage_id: s.id,
                order: s.order,
                total_candidates: stats.total,
                stuck_candidates: stats.stuck,
                avg_dwell_days: Math.round(stats.avgDwellDays * 10) / 10,
                is_bottleneck: stats.stuck > 0,
              };
            })
            .sort((a, b) => b.stuck_candidates - a.stuck_candidates);

          const totalStuck = bottlenecks.reduce((sum, b) => sum + b.stuck_candidates, 0);

          return {
            success: true,
            message: totalStuck > 0
              ? `${totalStuck} candidate(s) stuck beyond ${params.days_threshold} day threshold`
              : 'No bottlenecks detected',
            data: { bottlenecks, threshold_days: params.days_threshold },
          };
        } catch (err) {
          return { success: false, message: 'Bottleneck analysis error', error: String(err) };
        }
      },
    }),
  };
}
