import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/getTenantContext'
import { createClient } from '@/lib/supabase/server'
import { fetchAnalytics } from '@/services/analyticsService'
import { AnalyticsView } from './_view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Sourcing metrics, pipeline velocity, and conversion rates',
}

export default async function AnalyticsPage() {
  const context = await getTenantContext()
  if (!context) redirect('/auth/login')

  const supabase = await createClient()
  const initialData = await fetchAnalytics(context.tenantId, supabase)

  return <AnalyticsView tenantId={context.tenantId} initialData={initialData} />
}
