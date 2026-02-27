'use client'

import { createClient } from '@/lib/supabase/client'
import type { PipelineEntry, PipelineStage } from '@/types/entities'
import { create } from 'zustand'

interface PipelineState {
  stages: PipelineStage[]
  entries: PipelineEntry[]
  loading: boolean
  error: string | null

  fetchPipeline: (tenantId: string) => Promise<void>
  moveEntry: (entryId: string, newStageId: string, userId?: string) => Promise<boolean>
  addEntry: (tenantId: string, candidateId: string, stageId: string, jobId?: string) => Promise<boolean>
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  stages: [],
  entries: [],
  loading: false,
  error: null,

  fetchPipeline: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const [stagesRes, entriesRes] = await Promise.all([
      supabase
        .from('r7_pipeline_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order', { ascending: true }),
      supabase
        .from('r7_pipeline_entries')
        .select('*, candidate:r7_candidates(id, first_name, last_name, email, avatar_url, rating), stage:r7_pipeline_stages(id, name, color, "order")')
        .eq('tenant_id', tenantId)
        .order('entered_at', { ascending: false }),
    ])

    if (stagesRes.error || entriesRes.error) {
      set({ error: stagesRes.error?.message || entriesRes.error?.message || 'Failed to load pipeline', loading: false })
      return
    }

    set({
      stages: (stagesRes.data as PipelineStage[]) ?? [],
      entries: (entriesRes.data as PipelineEntry[]) ?? [],
      loading: false,
    })
  },

  moveEntry: async (entryId: string, newStageId: string, userId?: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('r7_pipeline_entries')
      .update({ stage_id: newStageId, entered_at: new Date().toISOString(), moved_by: userId })
      .eq('id', entryId)

    if (error) {
      set({ error: error.message })
      return false
    }

    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, stage_id: newStageId, entered_at: new Date().toISOString() } : e
      ),
    }))
    return true
  },

  addEntry: async (tenantId: string, candidateId: string, stageId: string, jobId?: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('r7_pipeline_entries')
      .insert({
        tenant_id: tenantId,
        candidate_id: candidateId,
        stage_id: stageId,
        job_id: jobId ?? null,
      })
      .select('*, candidate:r7_candidates(id, first_name, last_name, email, avatar_url, rating), stage:r7_pipeline_stages(id, name, color, "order")')
      .single()

    if (error) {
      set({ error: error.message })
      return false
    }

    set((state) => ({
      entries: [data as PipelineEntry, ...state.entries],
    }))
    return true
  },
}))
