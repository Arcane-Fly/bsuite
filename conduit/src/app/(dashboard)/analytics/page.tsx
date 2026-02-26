'use client'

import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Sourcing metrics, pipeline velocity, and conversion rates
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Analytics coming soon</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add candidates and jobs to start seeing sourcing and pipeline analytics.
        </p>
      </div>
    </div>
  )
}
