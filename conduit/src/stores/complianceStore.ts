'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { ComplianceCheck } from '@/types/entities'

interface ComplianceFilters {
  search: string
  status: string
  check_type: string
}

interface ComplianceState {
  checks: ComplianceCheck[]
  loading: boolean
  error: string | null
  filters: ComplianceFilters

  setFilters: (filters: Partial<ComplianceFilters>) => void
  fetchChecks: (tenantId: string) => Promise<void>
  createCheck: (tenantId: string, data: Partial<ComplianceCheck>) => Promise<ComplianceCheck | null>
  updateCheck: (id: string, data: Partial<ComplianceCheck>) => Promise<boolean>
}

export const useComplianceStore = create<ComplianceState>((set, get) => ({
  checks: [],
  loading: false,
  error: null,
  filters: { search: '', status: 'all', check_type: 'all' },

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),

  fetchChecks: async (tenantId) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { filters } = get()

    let query = supabase
      .from('r7_compliance_checks')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('expires_at', { ascending: true, nullsFirst: false })

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.check_type !== 'all') {
      query = query.eq('check_type', filters.check_type)
    }

    const { data, error } = await query.limit(100)

    if (error) { set({ error: error.message, loading: false }); return }
    set({ checks: (data as ComplianceCheck[]) ?? [], loading: false })
  },

  createCheck: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_compliance_checks')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) { set({ error: error.message }); return null }
    set((s) => ({ checks: [created as ComplianceCheck, ...s.checks] }))
    return created as ComplianceCheck
  },

  updateCheck: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_compliance_checks').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ checks: s.checks.map((c) => (c.id === id ? { ...c, ...data } : c)) }))
    return true
  },
}))
