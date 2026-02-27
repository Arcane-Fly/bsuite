'use client'

import { createClient } from '@/lib/supabase/client'
import type {
    OnboardingInstance,
    OnboardingTask,
    OnboardingTemplate,
} from '@/types/entities'
import { create } from 'zustand'

interface OnboardingState {
  templates: OnboardingTemplate[]
  instances: OnboardingInstance[]
  tasks: OnboardingTask[]
  loading: boolean
  error: string | null

  fetchTemplates: (tenantId: string) => Promise<void>
  createTemplate: (tenantId: string, data: Partial<OnboardingTemplate>) => Promise<OnboardingTemplate | null>
  updateTemplate: (id: string, data: Partial<OnboardingTemplate>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>

  fetchInstances: (tenantId: string) => Promise<void>
  createInstance: (tenantId: string, data: Partial<OnboardingInstance>) => Promise<OnboardingInstance | null>
  updateInstance: (id: string, data: Partial<OnboardingInstance>) => Promise<boolean>

  fetchTasks: (instanceId: string) => Promise<void>
  updateTask: (id: string, data: Partial<OnboardingTask>) => Promise<boolean>
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  templates: [],
  instances: [],
  tasks: [],
  loading: false,
  error: null,

  fetchTemplates: async (tenantId) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('r7_onboarding_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message, loading: false }); return }
    set({ templates: (data as OnboardingTemplate[]) ?? [], loading: false })
  },

  createTemplate: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_onboarding_templates')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) { set({ error: error.message }); return null }
    set((s) => ({ templates: [created as OnboardingTemplate, ...s.templates] }))
    return created as OnboardingTemplate
  },

  updateTemplate: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_onboarding_templates').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...data } : t)) }))
    return true
  },

  deleteTemplate: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_onboarding_templates').delete().eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
    return true
  },

  fetchInstances: async (tenantId) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('r7_onboarding_instances')
      .select('*, template:r7_onboarding_templates(id, name, entity_type)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) { set({ error: error.message, loading: false }); return }
    set({ instances: (data as OnboardingInstance[]) ?? [], loading: false })
  },

  createInstance: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_onboarding_instances')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single()

    if (error) { set({ error: error.message }); return null }
    set((s) => ({ instances: [created as OnboardingInstance, ...s.instances] }))
    return created as OnboardingInstance
  },

  updateInstance: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_onboarding_instances').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ instances: s.instances.map((i) => (i.id === id ? { ...i, ...data } : i)) }))
    return true
  },

  fetchTasks: async (instanceId) => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('r7_onboarding_tasks')
      .select('*')
      .eq('instance_id', instanceId)
      .order('created_at', { ascending: true })

    if (error) { set({ error: error.message, loading: false }); return }
    set({ tasks: (data as OnboardingTask[]) ?? [], loading: false })
  },

  updateTask: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_onboarding_tasks').update(data).eq('id', id)
    if (error) { set({ error: error.message }); return false }
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)) }))
    return true
  },
}))
