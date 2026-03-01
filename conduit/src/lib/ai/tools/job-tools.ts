/**
 * Job Tools for Jodie — Conduit AI
 *
 * 4 tools for searching jobs, viewing applications, drafting descriptions, and metrics.
 */

import { createClient } from '@supabase/supabase-js';
import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext, ToolResult } from './index';

function getSupabase(ctx: ToolExecutionContext) {
  return createClient(ctx.supabaseUrl, ctx.supabaseKey);
}

export function createJobTools(context: ToolExecutionContext): Record<string, Tool> {
  return {
    search_jobs: tool({
      description: 'Search open, draft, closed, or filled jobs by title, location, or status.',
      inputSchema: z.object({
        query: z.string().optional().describe('Search by title or location'),
        status: z
          .enum(['draft', 'open', 'closed', 'filled', 'cancelled'])
          .optional()
          .describe('Filter by job status'),
        limit: z.number().default(10).describe('Maximum results'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          let query = sb
            .from('r7_jobs')
            .select('id, title, location, employment_type, salary_min, salary_max, status, created_at, closing_date', { count: 'exact' })
            .eq('tenant_id', context.tenantId);

          if (params.status) query = query.eq('status', params.status);
          if (params.query) {
            query = query.or(`title.ilike.%${params.query}%,location.ilike.%${params.query}%`);
          }

          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .limit(params.limit);

          if (error) return { success: false, message: 'Job search failed', error: error.message };

          return {
            success: true,
            message: `Found ${count ?? data?.length ?? 0} job(s)`,
            data: { jobs: data ?? [], totalCount: count ?? 0 },
          };
        } catch (err) {
          return { success: false, message: 'Job search error', error: String(err) };
        }
      },
    }),

    get_job_applications: tool({
      description: 'List all applications for a specific job with candidate details and status.',
      inputSchema: z.object({
        job_id: z.string().uuid().describe('The job ID'),
        status: z
          .enum(['received', 'screening', 'shortlisted', 'interviewing', 'assessment', 'reference_check', 'offered', 'accepted', 'rejected', 'withdrawn'])
          .optional()
          .describe('Filter by application status'),
        limit: z.number().default(20).describe('Maximum results'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          let query = sb
            .from('r7_applications')
            .select('id, status, applied_at, candidate:r7_candidates(id, first_name, last_name, email, rating)')
            .eq('tenant_id', context.tenantId)
            .eq('job_id', params.job_id);

          if (params.status) query = query.eq('status', params.status);

          const { data, error } = await query
            .order('applied_at', { ascending: false })
            .limit(params.limit);

          if (error) return { success: false, message: 'Applications fetch failed', error: error.message };

          return {
            success: true,
            message: `${(data ?? []).length} application(s) for this job`,
            data: { applications: data ?? [] },
          };
        } catch (err) {
          return { success: false, message: 'Applications error', error: String(err) };
        }
      },
    }),

    draft_job_description: tool({
      description:
        'AI-generate a job description from requirements. Returns a draft for review — content is AI-generated.',
      inputSchema: z.object({
        title: z.string().describe('Job title'),
        location: z.string().optional().describe('Job location'),
        employment_type: z
          .enum(['full_time', 'part_time', 'contract', 'casual', 'internship'])
          .optional()
          .describe('Employment type'),
        key_responsibilities: z.array(z.string()).describe('Key responsibilities'),
        required_qualifications: z.array(z.string()).optional().describe('Required qualifications'),
        preferred_skills: z.array(z.string()).optional().describe('Preferred skills'),
        salary_range: z.string().optional().describe('Salary range (e.g., "$80k-$100k")'),
      }),
      execute: async (params): Promise<ToolResult> => {
        // This tool generates a draft — it does NOT call an LLM itself.
        // The AI model (Jodie) will use the structured input to compose the description in its response.
        const sections: string[] = [];

        sections.push(`# ${params.title}`);
        if (params.location) sections.push(`**Location:** ${params.location}`);
        if (params.employment_type) {
          sections.push(`**Type:** ${params.employment_type.replace(/_/g, ' ')}`);
        }
        if (params.salary_range) sections.push(`**Salary:** ${params.salary_range}`);

        sections.push('\n## Key Responsibilities');
        params.key_responsibilities.forEach((r) => sections.push(`- ${r}`));

        if (params.required_qualifications?.length) {
          sections.push('\n## Required Qualifications');
          params.required_qualifications.forEach((q) => sections.push(`- ${q}`));
        }

        if (params.preferred_skills?.length) {
          sections.push('\n## Preferred Skills');
          params.preferred_skills.forEach((s) => sections.push(`- ${s}`));
        }

        return {
          success: true,
          message: '[AI-generated draft] Job description created — review before publishing',
          data: {
            draft: sections.join('\n'),
            ai_generated: true,
          },
        };
      },
    }),

    get_job_metrics: tool({
      description:
        'Get recruitment metrics for a job: application count, conversion rates, and time-to-fill estimate.',
      inputSchema: z.object({
        job_id: z.string().uuid().describe('The job ID'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const [jobRes, appsRes] = await Promise.all([
            sb
              .from('r7_jobs')
              .select('id, title, status, created_at, closing_date')
              .eq('id', params.job_id)
              .eq('tenant_id', context.tenantId)
              .single(),
            sb
              .from('r7_applications')
              .select('id, status, applied_at')
              .eq('job_id', params.job_id),
          ]);

          if (jobRes.error) return { success: false, message: 'Job not found', error: jobRes.error.message };

          const apps = appsRes.data ?? [];
          const statusCounts: Record<string, number> = {};
          apps.forEach((a) => {
            statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
          });

          const hiredCount = (statusCounts['accepted'] ?? 0);
          const rejectedCount = (statusCounts['rejected'] ?? 0) + (statusCounts['withdrawn'] ?? 0);
          const activeCount = apps.length - hiredCount - rejectedCount;

          const daysSincePost = jobRes.data.created_at
            ? Math.floor((Date.now() - new Date(jobRes.data.created_at).getTime()) / (24 * 60 * 60 * 1000))
            : 0;

          return {
            success: true,
            message: `Metrics for "${jobRes.data.title}"`,
            data: {
              job: jobRes.data,
              total_applications: apps.length,
              status_breakdown: statusCounts,
              active_applications: activeCount,
              hired: hiredCount,
              rejected_or_withdrawn: rejectedCount,
              days_since_posted: daysSincePost,
              conversion_rate: apps.length > 0
                ? `${Math.round((hiredCount / apps.length) * 100)}%`
                : 'N/A',
            },
          };
        } catch (err) {
          return { success: false, message: 'Metrics error', error: String(err) };
        }
      },
    }),
  };
}
