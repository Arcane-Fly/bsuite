'use client'

import { createClient } from '@/lib/supabase/client'
import type { Communication } from '@/types/entities'
import { create } from 'zustand'

interface CommunicationFilters {
  search: string
  channel: Communication['channel'] | 'all'
  direction: Communication['direction'] | 'all'
  candidate_id: string | null
  employer_id: string | null
}

interface CommunicationState {
  communications: Communication[]
  loading: boolean
  error: string | null
  filters: CommunicationFilters
  totalCount: number

  setFilters: (filters: Partial<CommunicationFilters>) => void
  fetchCommunications: (tenantId: string) => Promise<void>
  fetchForCandidate: (tenantId: string, candidateId: string) => Promise<void>
  fetchForEmployer: (tenantId: string, employerId: string) => Promise<void>
  createCommunication: (
    tenantId: string,
    data: Partial<Communication>
  ) => Promise<Communication | null>
  updateCommunication: (
    id: string,
    data: Partial<Communication>
  ) => Promise<boolean>
  deleteCommunication: (id: string) => Promise<boolean>
}

export const useCommunicationStore = create<CommunicationState>((set, get) => ({
  communications: [],
  loading: false,
  error: null,
  totalCount: 0,
  filters: {
    search: '',
    channel: 'all',
    direction: 'all',
    candidate_id: null,
    employer_id: null,
  },

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  fetchCommunications: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { filters } = get()

    let query = supabase
      .from('conduit_communications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters.channel !== 'all') {
      query = query.eq('channel', filters.channel)
    }

    if (filters.direction !== 'all') {
      query = query.eq('direction', filters.direction)
    }

    if (filters.candidate_id) {
      query = query.eq('candidate_id', filters.candidate_id)
    }

    if (filters.employer_id) {
      query = query.eq('employer_id', filters.employer_id)
    }

    if (filters.search) {
      query = query.or(
        `subject.ilike.%${filters.search}%,body.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query.limit(100)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({
      communications: (data as Communication[]) ?? [],
      totalCount: count ?? 0,
      loading: false,
    })
  },

  fetchForCandidate: async (tenantId: string, candidateId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error, count } = await supabase
      .from('conduit_communications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({
      communications: (data as Communication[]) ?? [],
      totalCount: count ?? 0,
      loading: false,
    })
  },

  fetchForEmployer: async (tenantId: string, employerId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error, count } = await supabase
      .from('conduit_communications')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({
      communications: (data as Communication[]) ?? [],
      totalCount: count ?? 0,
      loading: false,
    })
  },

  createCommunication: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('conduit_communications')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    set((state) => ({
      communications: [created as Communication, ...state.communications],
      totalCount: state.totalCount + 1,
    }))
    return created as Communication
  },

  updateCommunication: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('conduit_communications')
      .update(data)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set((state) => ({
      communications: state.communications.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    }))
    return true
  },

  deleteCommunication: async (id) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('conduit_communications')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }

    set((state) => ({
      communications: state.communications.filter((c) => c.id !== id),
      totalCount: state.totalCount - 1,
    }))
    return true
  },
}))
