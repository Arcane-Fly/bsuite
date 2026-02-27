'use client'

import { createClient } from '@/lib/supabase/client'
import type { Offer, OfferStatus } from '@/types/entities'
import { create } from 'zustand'

interface OfferFilters {
  status?: OfferStatus
  search?: string
}

interface OfferState {
  offers: Offer[]
  loading: boolean
  error: string | null

  fetchOffers: (tenantId: string, filters?: OfferFilters) => Promise<void>
  createOffer: (tenantId: string, data: Partial<Offer>) => Promise<Offer | null>
  updateOffer: (id: string, data: Partial<Offer>) => Promise<boolean>
  deleteOffer: (id: string) => Promise<boolean>
  sendOffer: (id: string) => Promise<boolean>
  respondToOffer: (id: string, status: 'accepted' | 'declined') => Promise<boolean>
  withdrawOffer: (id: string) => Promise<boolean>
}

export const useOfferStore = create<OfferState>((set, get) => ({
  offers: [],
  loading: false,
  error: null,

  fetchOffers: async (tenantId, filters) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    let query = supabase
      .from('r7_offers')
      .select('*, candidate:r7_candidates(id, first_name, last_name, email, avatar_url), job:r7_jobs(id, title, location)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.search) {
      query = query.ilike('position_title', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ offers: (data as Offer[]) ?? [], loading: false })
  },

  createOffer: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_offers')
      .insert({ ...data, tenant_id: tenantId })
      .select('*, candidate:r7_candidates(id, first_name, last_name, email, avatar_url), job:r7_jobs(id, title, location)')
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ offers: [created as Offer, ...s.offers] }))
    return created as Offer
  },

  updateOffer: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_offers').update(data).eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({
      offers: s.offers.map((o) => (o.id === id ? { ...o, ...data } : o)),
    }))
    return true
  },

  deleteOffer: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_offers').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({ offers: s.offers.filter((o) => o.id !== id) }))
    return true
  },

  sendOffer: async (id) => {
    const now = new Date().toISOString()
    return get().updateOffer(id, { status: 'sent' as OfferStatus, sent_at: now })
  },

  respondToOffer: async (id, status) => {
    const now = new Date().toISOString()
    return get().updateOffer(id, { status, responded_at: now })
  },

  withdrawOffer: async (id) => {
    return get().updateOffer(id, { status: 'withdrawn' as OfferStatus })
  },
}))
