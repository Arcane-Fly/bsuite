'use client'

import { Building2, Save } from 'lucide-react'

interface GeneralSectionProps {
  tenantId: string
}

export function GeneralSection({ tenantId }: GeneralSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">General</h3>
        <p className="text-sm text-muted-foreground">
          Workspace-level configuration for your Conduit instance.
        </p>
      </div>

      {/* Workspace Info */}
      <div className="rounded-lg border bg-background p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium">Workspace</p>
            <p className="text-xs text-muted-foreground font-mono">{tenantId}</p>
          </div>
        </div>
      </div>

      {/* Default Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Default Settings</h4>

        <div className="space-y-4 rounded-lg border bg-background p-4">
          <div>
            <label className="text-sm font-medium" htmlFor="default-timezone">
              Default Timezone
            </label>
            <select
              id="default-timezone"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="Australia/Brisbane"
            >
              <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              <option value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</option>
              <option value="Australia/Perth">Australia/Perth (AWST)</option>
              <option value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</option>
              <option value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="default-currency">
              Default Currency
            </label>
            <select
              id="default-currency"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="AUD"
            >
              <option value="AUD">AUD — Australian Dollar</option>
              <option value="NZD">NZD — New Zealand Dollar</option>
              <option value="USD">USD — US Dollar</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="date-format">
              Date Format
            </label>
            <select
              id="date-format"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="dd/MM/yyyy"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY (Australian)</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY (US)</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Notifications</h4>

        <div className="space-y-3 rounded-lg border bg-background p-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New application alerts</p>
              <p className="text-xs text-muted-foreground">Notify when candidates apply for jobs</p>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
          </label>

          <div className="border-t" />

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Pipeline movement alerts</p>
              <p className="text-xs text-muted-foreground">Notify when candidates are moved between stages</p>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
          </label>

          <div className="border-t" />

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Compliance expiry warnings</p>
              <p className="text-xs text-muted-foreground">Alert before compliance documents expire</p>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
          </label>

          <div className="border-t" />

          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Daily digest</p>
              <p className="text-xs text-muted-foreground">Receive a daily summary of pipeline activity</p>
            </div>
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
          </label>
        </div>
      </div>

      {/* Save button — disabled until persistence is implemented */}
      <div className="flex justify-end gap-2 items-center">
        <span className="text-xs text-muted-foreground">
          Settings persistence coming soon
        </span>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-lg bg-primary/50 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed opacity-60"
          title="Settings saving is coming soon"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>
      </div>
    </div>
  )
}
