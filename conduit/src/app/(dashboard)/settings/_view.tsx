'use client'

import {
    GeneralSection,
    IntegrationsSection,
    PipelineStagesSection,
    TeamSection,
} from '@/components/settings'
import { useTenantId } from '@/hooks/useTenantId'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'
import { useQuery } from '@tanstack/react-query'
import * as Tabs from '@radix-ui/react-tabs'
import { KanbanSquare, Loader2, Plug, Settings, Sliders, Users } from 'lucide-react'

const tabs = [
  { value: 'pipeline', label: 'Pipeline Stages', icon: KanbanSquare },
  { value: 'integrations', label: 'Integrations', icon: Plug },
  { value: 'general', label: 'General', icon: Sliders },
  { value: 'team', label: 'Team', icon: Users },
] as const

export function SettingsView() {
  const { tenantId, loading: tenantLoading } = useTenantId()

  // Fetch stages and integrations via React Query; seed the store so child
  // components (PipelineStagesSection, IntegrationsSection) can read them.
  const { isLoading: loading } = useQuery({
    queryKey: ['settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null
      const supabase = createClient()

      const [stagesRes, integrationsRes] = await Promise.all([
        supabase
          .from('r7_pipeline_stages')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('order', { ascending: true }),
        supabase
          .from('email_integrations')
          .select('id, tenant_id, provider, email, is_active, scopes, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
      ])

      if (stagesRes.error) throw stagesRes.error

      // Seed the Zustand store so child section components can read the data
      useSettingsStore.setState({
        stages: stagesRes.data ?? [],
        integrations: integrationsRes.data ?? [],
        loading: false,
      })

      return { stages: stagesRes.data, integrations: integrationsRes.data }
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  })

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Settings className="h-8 w-8 text-muted-foreground/50 mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Unable to load workspace settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Conduit workspace — pipeline stages, integrations, and preferences.
        </p>
      </div>

      <Tabs.Root defaultValue="pipeline" className="space-y-6">
        <Tabs.List className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Settings sections">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="pipeline" className="focus-visible:outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : (
            <PipelineStagesSection tenantId={tenantId} />
          )}
        </Tabs.Content>

        <Tabs.Content value="integrations" className="focus-visible:outline-none">
          <IntegrationsSection />
        </Tabs.Content>

        <Tabs.Content value="general" className="focus-visible:outline-none">
          <GeneralSection tenantId={tenantId} />
        </Tabs.Content>

        <Tabs.Content value="team" className="focus-visible:outline-none">
          <TeamSection tenantId={tenantId} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
