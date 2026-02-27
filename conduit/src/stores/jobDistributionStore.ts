'use client'

import { createClient } from '@/lib/supabase/client'
import type { JobDistribution } from '@/types/entities'
import { create } from 'zustand'

type DistributionStatus = 'pending' | 'posted' | 'expired' | 'failed'

interface JobDistributionFilters {
  jobId?: string
  channel?: string
  status?: DistributionStatus
}

interface JobDistributionState {
  distributions: JobDistribution[]
  loading: boolean
  error: string | null

  fetchDistributions: (tenantId: string, filters?: JobDistributionFilters) => Promise<void>
  createDistribution: (tenantId: string, data: Partial<JobDistribution>) => Promise<JobDistribution | null>
  updateDistribution: (id: string, data: Partial<JobDistribution>) => Promise<boolean>
  deleteDistribution: (id: string) => Promise<boolean>
  markPosted: (id: string, url?: string) => Promise<boolean>
  markExpired: (id: string) => Promise<boolean>
}

export const useJobDistributionStore = create<JobDistributionState>((set, get) => ({
  distributions: [],
  loading: false,
  error: null,

  fetchDistributions: async (tenantId, filters) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    let query = supabase
      .from('r7_job_distributions')
      .select('*, job:r7_jobs(id, title, status, location)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters?.jobId) {
      query = query.eq('job_id', filters.jobId)
    }
    if (filters?.channel) {
      query = query.eq('channel', filters.channel)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ distributions: (data as JobDistribution[]) ?? [], loading: false })
  },

  createDistribution: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_job_distributions')
      .insert({
        ...data,
        tenant_id: tenantId,
        status: 'pending',
      })
      .select('*, job:r7_jobs(id, title, status, location)')
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ distributions: [created as JobDistribution, ...s.distributions] }))
    return created as JobDistribution
  },

  updateDistribution: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_job_distributions').update(data).eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({
      distributions: s.distributions.map((d) => (d.id === id ? { ...d, ...data } : d)),
    }))
    return true
  },

  deleteDistribution: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_job_distributions').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({ distributions: s.distributions.filter((d) => d.id !== id) }))
    return true
  },

  markPosted: async (id, url) => {
    const now = new Date().toISOString()
    return get().updateDistribution(id, { status: 'posted' as JobDistribution['status'], posted_at: now, url })
  },

  markExpired: async (id) => {
    return get().updateDistribution(id, { status: 'expired' as JobDistribution['status'] })
  },
}))
