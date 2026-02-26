'use client'

import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your Conduit workspace
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <Settings className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipeline stages, templates, integrations, and team settings.
        </p>
      </div>
    </div>
  )
}
