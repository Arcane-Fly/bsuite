'use client'

import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/types/entities'
import { create } from 'zustand'

interface JobFilters {
  search: string
  status: JobStatus | 'all'
}

interface JobState {
  jobs: Job[]
  loading: boolean
  error: string | null
  filters: JobFilters
  totalCount: number

  setFilters: (filters: Partial<JobFilters>) => void
  fetchJobs: (tenantId: string) => Promise<void>
  createJob: (tenantId: string, data: Partial<Job>) => Promise<Job | null>
  updateJob: (id: string, data: Partial<Job>) => Promise<boolean>
  deleteJob: (id: string) => Promise<boolean>
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  loading: false,
  error: null,
  totalCount: 0,
  filters: { search: '', status: 'all' },

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchJobs: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { filters } = get()

    let query = supabase
      .from('r7_jobs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
    }

    const { data, error, count } = await query.limit(50)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ jobs: (data as Job[]) ?? [], totalCount: count ?? 0, loading: false })
  },

  createJob: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_jobs')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) { set({ error: error.message }); return null }
    set((s) => ({ jobs: [created as Job, ...s.jobs], totalCount: s.totalCount + 1 }))
    return created as Job
  },

  updateJob: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_jobs').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)) }))
    return true
  },

  deleteJob: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_jobs').delete().eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id), totalCount: s.totalCount - 1 }))
    return true
  },
}))
