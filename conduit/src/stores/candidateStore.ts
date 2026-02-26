'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Candidate, CandidateStatus } from '@/types/entities'

interface CandidateFilters {
  search: string
  status: CandidateStatus | 'all'
  pool_id: string | null
}

interface CandidateState {
  candidates: Candidate[]
  loading: boolean
  error: string | null
  filters: CandidateFilters
  totalCount: number

  setFilters: (filters: Partial<CandidateFilters>) => void
  fetchCandidates: (tenantId: string) => Promise<void>
  createCandidate: (tenantId: string, data: Partial<Candidate>) => Promise<Candidate | null>
  updateCandidate: (id: string, data: Partial<Candidate>) => Promise<boolean>
  deleteCandidate: (id: string) => Promise<boolean>
}

export const useCandidateStore = create<CandidateState>((set, get) => ({
  candidates: [],
  loading: false,
  error: null,
  totalCount: 0,
  filters: {
    search: '',
    status: 'all',
    pool_id: null,
  },

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchCandidates: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { filters } = get()

    let query = supabase
      .from('r7_candidates')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query.limit(50)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({
      candidates: (data as Candidate[]) ?? [],
      totalCount: count ?? 0,
      loading: false,
    })
  },

  createCandidate: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_candidates')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set((state) => ({
      candidates: [created as Candidate, ...state.candidates],
      totalCount: state.totalCount + 1,
    }))
    return created as Candidate
  },

  updateCandidate: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('r7_candidates')
      .update(data)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set((state) => ({
      candidates: state.candidates.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    }))
    return true
  },

  deleteCandidate: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_candidates').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set((state) => ({
      candidates: state.candidates.filter((c) => c.id !== id),
      totalCount: state.totalCount - 1,
    }))
    return true
  },
}))
