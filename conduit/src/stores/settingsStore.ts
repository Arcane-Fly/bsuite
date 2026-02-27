'use client'

import { createClient } from '@/lib/supabase/client'
import type { PipelineStage } from '@/types/entities'
import { create } from 'zustand'

interface EmailIntegration {
  id: string
  tenant_id: string
  provider: 'google' | 'microsoft' | 'smtp'
  email: string
  is_active: boolean
  scopes?: string[]
  created_at: string
  updated_at: string
}

interface SettingsState {
  stages: PipelineStage[]
  integrations: EmailIntegration[]
  loading: boolean
  saving: boolean
  error: string | null

  fetchStages: (tenantId: string) => Promise<void>
  createStage: (tenantId: string, stage: { name: string; color?: string; is_terminal: boolean }) => Promise<boolean>
  updateStage: (stageId: string, updates: Partial<Pick<PipelineStage, 'name' | 'color' | 'is_terminal' | 'order'>>) => Promise<boolean>
  deleteStage: (stageId: string) => Promise<boolean>
  reorderStages: (tenantId: string, stageIds: string[]) => Promise<boolean>

  fetchIntegrations: (tenantId: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  stages: [],
  integrations: [],
  loading: false,
  saving: false,
  error: null,

  fetchStages: async (tenantId: string) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('r7_pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('order', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ stages: (data as PipelineStage[]) ?? [], loading: false })
  },

  createStage: async (tenantId, stage) => {
    set({ saving: true, error: null })
    const supabase = createClient()

    const currentStages = get().stages
    const maxOrder = currentStages.length > 0
      ? Math.max(...currentStages.map((s) => s.order))
      : 0

    const { data, error } = await supabase
      .from('r7_pipeline_stages')
      .insert({
        tenant_id: tenantId,
        name: stage.name,
        color: stage.color ?? '#3b82f6',
        is_terminal: stage.is_terminal,
        order: maxOrder + 1,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message, saving: false })
      return false
    }

    set((state) => ({
      stages: [...state.stages, data as PipelineStage],
      saving: false,
    }))
    return true
  },

  updateStage: async (stageId, updates) => {
    set({ saving: true, error: null })
    const supabase = createClient()

    const { error } = await supabase
      .from('r7_pipeline_stages')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', stageId)

    if (error) {
      set({ error: error.message, saving: false })
      return false
    }

    set((state) => ({
      stages: state.stages.map((s) =>
        s.id === stageId ? { ...s, ...updates } : s
      ),
      saving: false,
    }))
    return true
  },

  deleteStage: async (stageId) => {
    set({ saving: true, error: null })
    const supabase = createClient()

    const { error } = await supabase
      .from('r7_pipeline_stages')
      .delete()
      .eq('id', stageId)

    if (error) {
      set({ error: error.message, saving: false })
      return false
    }

    set((state) => ({
      stages: state.stages.filter((s) => s.id !== stageId),
      saving: false,
    }))
    return true
  },

  reorderStages: async (tenantId, stageIds) => {
    set({ saving: true, error: null })
    const supabase = createClient()

    const updates = stageIds.map((id, index) => ({
      id,
      tenant_id: tenantId,
      order: index + 1,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('r7_pipeline_stages')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      set({ error: error.message, saving: false })
      return false
    }

    set((state) => ({
      stages: state.stages
        .map((s) => {
          const idx = stageIds.indexOf(s.id)
          return idx >= 0 ? { ...s, order: idx + 1 } : s
        })
        .sort((a, b) => a.order - b.order),
      saving: false,
    }))
    return true
  },

  fetchIntegrations: async (tenantId: string) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('email_integrations')
      .select('id, tenant_id, provider, email, is_active, scopes, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      set({ error: error.message })
      return
    }

    set({ integrations: (data as EmailIntegration[]) ?? [] })
  },
}))
