'use client'

import { createClient } from '@/lib/supabase/client'
import type { Candidate, Job, PipelineEntry, PipelineStage } from '@/types/entities'
import { create } from 'zustand'

interface AnalyticsSummary {
  totalCandidates: number
  totalJobs: number
  activeJobs: number
  totalPipelineEntries: number
  totalCommunications: number
  candidatesByStatus: Record<string, number>
  candidatesBySource: Record<string, number>
  jobsByStatus: Record<string, number>
  pipelineByStage: Array<{ stage: PipelineStage; count: number }>
  recentCandidates: Candidate[]
  recentJobs: Job[]
}

interface AnalyticsState {
  summary: AnalyticsSummary | null
  loading: boolean
  error: string | null
  fetchAnalytics: (tenantId: string) => Promise<void>
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalCandidates: 0,
  totalJobs: 0,
  activeJobs: 0,
  totalPipelineEntries: 0,
  totalCommunications: 0,
  candidatesByStatus: {},
  candidatesBySource: {},
  jobsByStatus: {},
  pipelineByStage: [],
  recentCandidates: [],
  recentJobs: [],
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  summary: null,
  loading: false,
  error: null,

  fetchAnalytics: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    try {
      const [
        candidatesRes,
        jobsRes,
        stagesRes,
        entriesRes,
        commsCountRes,
      ] = await Promise.all([
        supabase
          .from('r7_candidates')
          .select('id, status, source, first_name, last_name, email, created_at', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('r7_jobs')
          .select('id, title, status, location, employment_type, created_at', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('r7_pipeline_stages')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('order', { ascending: true }),
        supabase
          .from('r7_pipeline_entries')
          .select('id, stage_id')
          .eq('tenant_id', tenantId),
        supabase
          .from('r7_communications')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
      ])

      if (candidatesRes.error || jobsRes.error || stagesRes.error || entriesRes.error || commsCountRes.error) {
        const msg = candidatesRes.error?.message
          || jobsRes.error?.message
          || stagesRes.error?.message
          || entriesRes.error?.message
          || commsCountRes.error?.message
          || 'Failed to load analytics'
        set({ error: msg, loading: false })
        return
      }

      const candidates = (candidatesRes.data ?? []) as Candidate[]
      const jobs = (jobsRes.data ?? []) as Job[]
      const stages = (stagesRes.data ?? []) as PipelineStage[]
      const entries = (entriesRes.data ?? []) as Pick<PipelineEntry, 'id' | 'stage_id'>[]

      // Aggregate candidates by status
      const candidatesByStatus: Record<string, number> = {}
      for (const c of candidates) {
        candidatesByStatus[c.status] = (candidatesByStatus[c.status] ?? 0) + 1
      }

      // Aggregate candidates by source
      const candidatesBySource: Record<string, number> = {}
      for (const c of candidates) {
        const src = c.source || 'Unknown'
        candidatesBySource[src] = (candidatesBySource[src] ?? 0) + 1
      }

      // Aggregate jobs by status
      const jobsByStatus: Record<string, number> = {}
      for (const j of jobs) {
        jobsByStatus[j.status] = (jobsByStatus[j.status] ?? 0) + 1
      }

      // Pipeline entries per stage
      const entryCountByStage: Record<string, number> = {}
      for (const e of entries) {
        entryCountByStage[e.stage_id] = (entryCountByStage[e.stage_id] ?? 0) + 1
      }

      const pipelineByStage = stages.map((stage) => ({
        stage,
        count: entryCountByStage[stage.id] ?? 0,
      }))

      set({
        summary: {
          totalCandidates: candidatesRes.count ?? candidates.length,
          totalJobs: jobsRes.count ?? jobs.length,
          activeJobs: jobs.filter((j) => j.status === 'open').length,
          totalPipelineEntries: entries.length,
          totalCommunications: commsCountRes.count ?? 0,
          candidatesByStatus,
          candidatesBySource,
          jobsByStatus,
          pipelineByStage,
          recentCandidates: candidates.slice(0, 5),
          recentJobs: jobs.slice(0, 5),
        },
        loading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, loading: false, summary: EMPTY_SUMMARY })
    }
  },
}))
