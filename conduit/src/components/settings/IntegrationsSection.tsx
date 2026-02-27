'use client'

import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import {
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plug,
} from 'lucide-react'
import { format } from 'date-fns'

const providerConfig: Record<string, { label: string; color: string; icon: string }> = {
  google: { label: 'Google', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: '🔴' },
  microsoft: { label: 'Microsoft', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: '🔵' },
  smtp: { label: 'SMTP', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', icon: '📧' },
}

export function IntegrationsSection() {
  const { integrations } = useSettingsStore()

  const emailIntegrations = integrations.filter(
    (i) => i.scopes?.some((s) => s.includes('mail') || s.includes('gmail') || s.includes('smtp')) ?? true
  )
  const calendarIntegrations = integrations.filter(
    (i) => i.scopes?.some((s) => s.includes('calendar')) ?? false
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connected email and calendar accounts for communications and scheduling.
        </p>
      </div>

      {/* Email Integrations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h4 className="text-sm font-medium">Email Accounts</h4>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {emailIntegrations.length}
          </span>
        </div>

        {emailIntegrations.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center justify-center">
            <Plug className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No email accounts connected. Connect via CRM7 email settings.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {emailIntegrations.map((integration) => {
              const config = providerConfig[integration.provider] ?? providerConfig.smtp
              return (
                <IntegrationCard
                  key={integration.id}
                  email={integration.email}
                  provider={config.label}
                  providerColor={config.color}
                  isActive={integration.is_active}
                  connectedAt={integration.created_at}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Calendar Integrations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h4 className="text-sm font-medium">Calendar Accounts</h4>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {calendarIntegrations.length}
          </span>
        </div>

        {calendarIntegrations.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center justify-center">
            <Plug className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No calendar accounts connected. Connect via CRM7 calendar settings.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {calendarIntegrations.map((integration) => {
              const config = providerConfig[integration.provider] ?? providerConfig.smtp
              return (
                <IntegrationCard
                  key={integration.id}
                  email={integration.email}
                  provider={config.label}
                  providerColor={config.color}
                  isActive={integration.is_active}
                  connectedAt={integration.created_at}
                  type="calendar"
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="rounded-lg bg-muted/50 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Email and calendar integrations are managed through the CRM7 settings page.
          Connected accounts are shared across BSuite applications for your tenant.
        </p>
      </div>
    </div>
  )
}

function IntegrationCard({
  email,
  provider,
  providerColor,
  isActive,
  connectedAt,
  type = 'email',
}: {
  email: string
  provider: string
  providerColor: string
  isActive: boolean
  connectedAt: string
  type?: 'email' | 'calendar'
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3">
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg',
        type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
      )}>
        {type === 'email' ? (
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        ) : (
          <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{email}</p>
        <p className="text-xs text-muted-foreground">
          Connected {format(new Date(connectedAt), 'MMM d, yyyy')}
        </p>
      </div>

      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', providerColor)}>
        {provider}
      </span>

      {isActive ? (
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Active
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Inactive
        </span>
      )}
    </div>
  )
}
