/**
 * Analytics Tools for Jodie — Conduit AI
 *
 * 3 tools for recruitment summaries, source effectiveness, and compliance overview.
 */

import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { ToolExecutionContext, ToolResult } from './index';

function getSupabase(ctx: ToolExecutionContext) {
  return createClient(ctx.supabaseUrl, ctx.supabaseKey);
}

export function createAnalyticsTools(context: ToolExecutionContext): Record<string, Tool> {
  return {
    recruitment_summary: tool({
      description:
        'Get a high-level recruitment summary: active jobs, pipeline conversion, candidate counts by status.',
      inputSchema: z.object({
        days: z.number().default(30).describe('Number of days to look back'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString();

          const [jobsRes, candidatesRes, appsRes, interviewsRes] = await Promise.all([
            sb
              .from('r7_jobs')
              .select('id, status', { count: 'exact' })
              .eq('tenant_id', context.tenantId),
            sb
              .from('r7_candidates')
              .select('id, status', { count: 'exact' })
              .eq('tenant_id', context.tenantId),
            sb
              .from('r7_applications')
              .select('id, status, applied_at')
              .gte('applied_at', since),
            sb
              .from('r7_interviews')
              .select('id, status, scheduled_at')
              .eq('tenant_id', context.tenantId)
              .gte('scheduled_at', since),
          ]);

          const jobs = jobsRes.data ?? [];
          const candidates = candidatesRes.data ?? [];
          const apps = appsRes.data ?? [];
          const interviews = interviewsRes.data ?? [];

          const jobsByStatus: Record<string, number> = {};
          jobs.forEach((j) => { jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1; });

          const candidatesByStatus: Record<string, number> = {};
          candidates.forEach((c) => { candidatesByStatus[c.status] = (candidatesByStatus[c.status] ?? 0) + 1; });

          const appsByStatus: Record<string, number> = {};
          apps.forEach((a) => { appsByStatus[a.status] = (appsByStatus[a.status] ?? 0) + 1; });

          return {
            success: true,
            message: `Recruitment summary for the last ${params.days} days`,
            data: {
              period_days: params.days,
              jobs: {
                total: jobs.length,
                by_status: jobsByStatus,
              },
              candidates: {
                total: candidates.length,
                by_status: candidatesByStatus,
              },
              applications: {
                total_in_period: apps.length,
                by_status: appsByStatus,
              },
              interviews: {
                total_in_period: interviews.length,
                scheduled: interviews.filter((i) => i.status === 'scheduled').length,
                completed: interviews.filter((i) => i.status === 'completed').length,
              },
            },
          };
        } catch (err) {
          return { success: false, message: 'Summary error', error: String(err) };
        }
      },
    }),

    source_effectiveness: tool({
      description:
        'Analyse which candidate sources (referral, job board, direct, agency, etc.) produce the most hires.',
      inputSchema: z.object({
        days: z.number().default(90).describe('Number of days to analyse'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString();

          const { data: candidates } = await sb
            .from('r7_candidates')
            .select('id, source, status, created_at')
            .eq('tenant_id', context.tenantId)
            .gte('created_at', since);

          const sourceStats: Record<string, { total: number; hired: number; rate: string }> = {};

          (candidates ?? []).forEach((c) => {
            const src = c.source || 'unknown';
            if (!sourceStats[src]) sourceStats[src] = { total: 0, hired: 0, rate: '0%' };
            sourceStats[src].total += 1;
            if (c.status === 'hired' || c.status === 'placed') {
              sourceStats[src].hired += 1;
            }
          });

          // Calculate rates
          Object.values(sourceStats).forEach((s) => {
            s.rate = s.total > 0 ? `${Math.round((s.hired / s.total) * 100)}%` : '0%';
          });

          // Sort by hired count
          const ranked = Object.entries(sourceStats)
            .sort(([, a], [, b]) => b.hired - a.hired)
            .map(([source, stats]) => ({ source, ...stats }));

          return {
            success: true,
            message: `Source effectiveness over ${params.days} days`,
            data: { sources: ranked, period_days: params.days },
          };
        } catch (err) {
          return { success: false, message: 'Source analysis error', error: String(err) };
        }
      },
    }),

    compliance_overview: tool({
      description:
        'Check compliance status across candidates: expiring documents, missing checks, overdue items.',
      inputSchema: z.object({
        days_until_expiry: z.number().default(30).describe('Flag items expiring within this many days'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const expiryDate = new Date(Date.now() + params.days_until_expiry * 24 * 60 * 60 * 1000).toISOString();
          const now = new Date().toISOString();

          const { data: checks } = await sb
            .from('r7_compliance_checks')
            .select('id, check_type, status, expires_at, candidate_id, candidate:r7_candidates(first_name, last_name)')
            .order('expires_at', { ascending: true });

          const allChecks = checks ?? [];
          const expired = allChecks.filter((c) => c.expires_at && c.expires_at < now);
          const expiringSoon = allChecks.filter(
            (c) => c.expires_at && c.expires_at >= now && c.expires_at <= expiryDate,
          );
          const missing = allChecks.filter((c) => c.status === 'missing' || c.status === 'not_started');

          const byType: Record<string, number> = {};
          [...expired, ...expiringSoon, ...missing].forEach((c) => {
            byType[c.check_type] = (byType[c.check_type] ?? 0) + 1;
          });

          return {
            success: true,
            message: `${expired.length} expired, ${expiringSoon.length} expiring soon, ${missing.length} missing`,
            data: {
              expired: expired.slice(0, 20),
              expiring_soon: expiringSoon.slice(0, 20),
              missing: missing.slice(0, 20),
              issues_by_type: byType,
              total_issues: expired.length + expiringSoon.length + missing.length,
              threshold_days: params.days_until_expiry,
            },
          };
        } catch (err) {
          return { success: false, message: 'Compliance overview error', error: String(err) };
        }
      },
    }),
  };
}
