'use client'

import {
    GeneralSection,
    IntegrationsSection,
    PipelineStagesSection,
    TeamSection,
} from '@/components/settings'
import { useTenantId } from '@/hooks/useTenantId'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'
import * as Tabs from '@radix-ui/react-tabs'
import { KanbanSquare, Loader2, Plug, Settings, Sliders, Users } from 'lucide-react'
import { useEffect } from 'react'

const tabs = [
  { value: 'pipeline', label: 'Pipeline Stages', icon: KanbanSquare },
  { value: 'integrations', label: 'Integrations', icon: Plug },
  { value: 'general', label: 'General', icon: Sliders },
  { value: 'team', label: 'Team', icon: Users },
] as const

export default function SettingsPage() {
  const { tenantId, loading: tenantLoading } = useTenantId()
  const { fetchStages, fetchIntegrations, loading } = useSettingsStore()

  useEffect(() => {
    if (tenantId) {
      fetchStages(tenantId)
      fetchIntegrations(tenantId)
    }
  }, [tenantId, fetchStages, fetchIntegrations])

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
