'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { TalentPool } from '@/types/entities'

interface PoolMembership {
  id: string
  candidate_id: string
  pool_id: string
  added_at: string
  notes: string | null
  candidate?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    status: string
    avatar_url: string | null
    rating: number | null
  }
}

interface TalentPoolState {
  pools: TalentPool[]
  memberships: PoolMembership[]
  loading: boolean
  error: string | null

  fetchPools: (tenantId: string) => Promise<void>
  createPool: (tenantId: string, data: Partial<TalentPool>) => Promise<TalentPool | null>
  updatePool: (id: string, data: Partial<TalentPool>) => Promise<boolean>
  deletePool: (id: string) => Promise<boolean>
  fetchMemberships: (poolId: string) => Promise<void>
  addCandidate: (candidateId: string, poolId: string, notes?: string) => Promise<boolean>
  removeCandidate: (membershipId: string) => Promise<boolean>
}

export const useTalentPoolStore = create<TalentPoolState>((set, get) => ({
  pools: [],
  memberships: [],
  loading: false,
  error: null,

  fetchPools: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('r7_talent_pools')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ pools: (data as TalentPool[]) ?? [], loading: false })
  },

  createPool: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_talent_pools')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }
    set((s) => ({ pools: [...s.pools, created as TalentPool] }))
    return created as TalentPool
  },

  updatePool: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('r7_talent_pools')
      .update(data)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({
      pools: s.pools.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }))
    return true
  },

  deletePool: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_talent_pools').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({ pools: s.pools.filter((p) => p.id !== id) }))
    return true
  },

  fetchMemberships: async (poolId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('r7_candidate_pool_memberships')
      .select('*, candidate:r7_candidates(id, first_name, last_name, email, status, avatar_url, rating)')
      .eq('pool_id', poolId)
      .order('added_at', { ascending: false })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ memberships: (data as PoolMembership[]) ?? [], loading: false })
  },

  addCandidate: async (candidateId, poolId, notes) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('r7_candidate_pool_memberships')
      .insert({ candidate_id: candidateId, pool_id: poolId, notes: notes ?? null })

    if (error) {
      set({ error: error.message })
      return false
    }
    // Refresh memberships
    await get().fetchMemberships(poolId)
    return true
  },

  removeCandidate: async (membershipId) => {
    const supabase = createClient()
    const membership = get().memberships.find((m) => m.id === membershipId)
    const { error } = await supabase
      .from('r7_candidate_pool_memberships')
      .delete()
      .eq('id', membershipId)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({ memberships: s.memberships.filter((m) => m.id !== membershipId) }))
    if (membership) {
      await get().fetchMemberships(membership.pool_id)
    }
    return true
  },
}))
