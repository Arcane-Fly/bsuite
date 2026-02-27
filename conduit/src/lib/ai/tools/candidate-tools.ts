/**
 * Candidate Tools for Jodie — Conduit AI
 *
 * 7 tools for searching, filtering, scoring, and managing candidates.
 */

import { createClient } from '@supabase/supabase-js';
import type { Tool } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import type { ToolExecutionContext, ToolResult } from './index';

function getSupabase(ctx: ToolExecutionContext) {
  return createClient(ctx.supabaseUrl, ctx.supabaseKey);
}

export function createCandidateTools(context: ToolExecutionContext): Record<string, Tool> {
  return {
    search_candidates: tool({
      description:
        'Search candidates by name, email, phone, skills, or qualifications. Returns matching candidates with key details.',
      inputSchema: z.object({
        query: z.string().describe('Search query (name, email, phone, skill, or qualification)'),
        limit: z.number().default(10).describe('Maximum results to return'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const { data, error, count } = await sb
            .from('r7_candidates')
            .select('id, first_name, last_name, email, phone, status, skills, qualifications, rating, availability', { count: 'exact' })
            .eq('tenant_id', context.tenantId)
            .or(
              `first_name.ilike.%${params.query}%,last_name.ilike.%${params.query}%,email.ilike.%${params.query}%,phone.ilike.%${params.query}%`,
            )
            .order('updated_at', { ascending: false })
            .limit(params.limit);

          if (error) return { success: false, message: 'Search failed', error: error.message };

          return {
            success: true,
            message: `Found ${count ?? data?.length ?? 0} candidate(s) matching "${params.query}"`,
            data: { candidates: data ?? [], totalCount: count ?? 0 },
          };
        } catch (err) {
          return { success: false, message: 'Search error', error: String(err) };
        }
      },
    }),

    get_candidate_profile: tool({
      description:
        'Get a detailed candidate profile including talent pools, applications, and compliance status.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          const [candidateRes, poolsRes, applicationsRes, complianceRes] = await Promise.all([
            sb
              .from('r7_candidates')
              .select('*')
              .eq('id', params.candidate_id)
              .eq('tenant_id', context.tenantId)
              .single(),
            sb
              .from('r7_candidate_pool_memberships')
              .select('*, pool:r7_talent_pools(id, name, trade, region)')
              .eq('candidate_id', params.candidate_id),
            sb
              .from('r7_applications')
              .select('id, status, applied_at, job:r7_jobs(id, title, location)')
              .eq('candidate_id', params.candidate_id)
              .order('applied_at', { ascending: false })
              .limit(10),
            sb
              .from('r7_compliance_checks')
              .select('id, check_type, status, expires_at')
              .eq('candidate_id', params.candidate_id)
              .order('expires_at', { ascending: true }),
          ]);

          if (candidateRes.error) {
            return { success: false, message: 'Candidate not found', error: candidateRes.error.message };
          }

          return {
            success: true,
            message: `Profile for ${candidateRes.data.first_name} ${candidateRes.data.last_name}`,
            data: {
              candidate: candidateRes.data,
              pools: poolsRes.data ?? [],
              applications: applicationsRes.data ?? [],
              compliance: complianceRes.data ?? [],
            },
          };
        } catch (err) {
          return { success: false, message: 'Profile fetch error', error: String(err) };
        }
      },
    }),

    filter_candidates: tool({
      description:
        'Advanced filtering of candidates by status, skills, location, pool, availability, or rating.',
      inputSchema: z.object({
        status: z
          .enum(['new', 'screening', 'shortlisted', 'interviewing', 'offered', 'hired', 'placed', 'rejected', 'withdrawn', 'pooled'])
          .optional()
          .describe('Filter by status'),
        skills: z.array(z.string()).optional().describe('Filter by skills (any match)'),
        state: z.string().optional().describe('Filter by state/territory'),
        suburb: z.string().optional().describe('Filter by suburb'),
        min_rating: z.number().min(1).max(5).optional().describe('Minimum rating'),
        availability: z.string().optional().describe('Filter by availability'),
        pool_id: z.string().uuid().optional().describe('Filter by talent pool ID'),
        limit: z.number().default(20).describe('Maximum results'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          let query = sb
            .from('r7_candidates')
            .select('id, first_name, last_name, email, status, skills, rating, state, suburb, availability', { count: 'exact' })
            .eq('tenant_id', context.tenantId);

          if (params.status) query = query.eq('status', params.status);
          if (params.state) query = query.ilike('state', `%${params.state}%`);
          if (params.suburb) query = query.ilike('suburb', `%${params.suburb}%`);
          if (params.min_rating) query = query.gte('rating', params.min_rating);
          if (params.availability) query = query.ilike('availability', `%${params.availability}%`);
          if (params.skills && params.skills.length > 0) {
            query = query.overlaps('skills', params.skills);
          }

          const { data, error, count } = await query
            .order('rating', { ascending: false, nullsFirst: false })
            .limit(params.limit);

          if (error) return { success: false, message: 'Filter failed', error: error.message };

          // If pool filter, do a second query
          let filtered = data ?? [];
          if (params.pool_id && filtered.length > 0) {
            const { data: memberships } = await sb
              .from('r7_candidate_pool_memberships')
              .select('candidate_id')
              .eq('pool_id', params.pool_id)
              .in('candidate_id', filtered.map((c) => c.id));

            const poolIds = new Set((memberships ?? []).map((m) => m.candidate_id));
            filtered = filtered.filter((c) => poolIds.has(c.id));
          }

          return {
            success: true,
            message: `Found ${filtered.length} candidate(s) matching filters`,
            data: { candidates: filtered, totalCount: count ?? 0 },
          };
        } catch (err) {
          return { success: false, message: 'Filter error', error: String(err) };
        }
      },
    }),

    update_candidate_status: tool({
      description: 'Update a candidate\'s status (e.g., from "new" to "screening").',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        new_status: z
          .enum(['new', 'screening', 'shortlisted', 'interviewing', 'offered', 'hired', 'placed', 'rejected', 'withdrawn', 'pooled'])
          .describe('The new status'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const { data, error } = await sb
            .from('r7_candidates')
            .update({ status: params.new_status, updated_at: new Date().toISOString() })
            .eq('id', params.candidate_id)
            .eq('tenant_id', context.tenantId)
            .select('id, first_name, last_name, status')
            .single();

          if (error) return { success: false, message: 'Status update failed', error: error.message };

          return {
            success: true,
            message: `Updated ${data.first_name} ${data.last_name} to "${params.new_status}"`,
            data: { candidate: data },
          };
        } catch (err) {
          return { success: false, message: 'Update error', error: String(err) };
        }
      },
    }),

    add_candidate_to_pool: tool({
      description: 'Add a candidate to a talent pool.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        pool_id: z.string().uuid().describe('The talent pool ID'),
        notes: z.string().optional().describe('Optional notes about why they were added'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          // Check if already in pool
          const { data: existing } = await sb
            .from('r7_candidate_pool_memberships')
            .select('id')
            .eq('candidate_id', params.candidate_id)
            .eq('pool_id', params.pool_id)
            .maybeSingle();

          if (existing) {
            return { success: false, message: 'Candidate is already in this pool' };
          }

          const { error } = await sb.from('r7_candidate_pool_memberships').insert({
            candidate_id: params.candidate_id,
            pool_id: params.pool_id,
            added_by: context.userId,
            notes: params.notes ?? null,
          });

          if (error) return { success: false, message: 'Failed to add to pool', error: error.message };

          return {
            success: true,
            message: 'Candidate added to talent pool',
            data: { candidate_id: params.candidate_id, pool_id: params.pool_id },
          };
        } catch (err) {
          return { success: false, message: 'Pool add error', error: String(err) };
        }
      },
    }),

    score_candidate: tool({
      description: 'Rate a candidate from 1 to 5 stars with optional notes.',
      inputSchema: z.object({
        candidate_id: z.string().uuid().describe('The candidate ID'),
        rating: z.number().min(1).max(5).describe('Rating from 1 to 5'),
        notes: z.string().optional().describe('Optional rating notes'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);
          const updateData: Record<string, unknown> = {
            rating: params.rating,
            updated_at: new Date().toISOString(),
          };
          if (params.notes) updateData.notes = params.notes;

          const { data, error } = await sb
            .from('r7_candidates')
            .update(updateData)
            .eq('id', params.candidate_id)
            .eq('tenant_id', context.tenantId)
            .select('id, first_name, last_name, rating')
            .single();

          if (error) return { success: false, message: 'Rating failed', error: error.message };

          return {
            success: true,
            message: `Rated ${data.first_name} ${data.last_name}: ${params.rating}/5`,
            data: { candidate: data },
          };
        } catch (err) {
          return { success: false, message: 'Rating error', error: String(err) };
        }
      },
    }),

    suggest_candidates_for_job: tool({
      description:
        'Match candidates to a job by comparing skills, qualifications, and preferred locations. Returns ranked suggestions.',
      inputSchema: z.object({
        job_id: z.string().uuid().describe('The job ID to match against'),
        limit: z.number().default(10).describe('Maximum suggestions'),
      }),
      execute: async (params): Promise<ToolResult> => {
        try {
          const sb = getSupabase(context);

          // Get job details
          const { data: job, error: jobErr } = await sb
            .from('r7_jobs')
            .select('id, title, location, employment_type, qualification_id')
            .eq('id', params.job_id)
            .eq('tenant_id', context.tenantId)
            .single();

          if (jobErr || !job) {
            return { success: false, message: 'Job not found', error: jobErr?.message };
          }

          // Get available candidates (not rejected, withdrawn, or already hired)
          const { data: candidates, error: candErr } = await sb
            .from('r7_candidates')
            .select('id, first_name, last_name, email, skills, qualifications, preferred_locations, rating, status, availability')
            .eq('tenant_id', context.tenantId)
            .not('status', 'in', '("rejected","withdrawn","hired")')
            .order('rating', { ascending: false, nullsFirst: false })
            .limit(100);

          if (candErr) return { success: false, message: 'Candidate fetch failed', error: candErr.message };

          // Check who already applied
          const { data: existingApps } = await sb
            .from('r7_applications')
            .select('candidate_id')
            .eq('job_id', params.job_id);

          const appliedIds = new Set((existingApps ?? []).map((a) => a.candidate_id));

          // Simple scoring: location match + rating + not already applied
          const scored = (candidates ?? [])
            .filter((c) => !appliedIds.has(c.id))
            .map((c) => {
              let score = 0;
              if (c.rating) score += c.rating * 2;
              if (
                job.location &&
                c.preferred_locations &&
                c.preferred_locations.some((loc: string) =>
                  loc.toLowerCase().includes(job.location!.toLowerCase()),
                )
              ) {
                score += 5;
              }
              if (c.availability === 'immediate') score += 3;
              return { ...c, match_score: score };
            })
            .sort((a, b) => b.match_score - a.match_score)
            .slice(0, params.limit);

          return {
            success: true,
            message: `Found ${scored.length} suggested candidate(s) for "${job.title}"`,
            data: { job, suggestions: scored },
          };
        } catch (err) {
          return { success: false, message: 'Suggestion error', error: String(err) };
        }
      },
    }),
  };
}
