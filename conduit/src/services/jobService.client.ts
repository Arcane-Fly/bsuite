'use client'

import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/types/entities'

export interface JobFilters {
  search?: string
  status?: JobStatus | 'all'
}

/**
 * Client-side job fetcher for use in React Query inside client components.
 * Uses the browser Supabase client (no server cookies / next/headers).
 */
export async function fetchJobsClient(
  tenantId: string,
  filters?: JobFilters,
): Promise<{ jobs: Job[]; totalCount: number }> {
  const supabase = createClient()

  let query = supabase
    .from('r7_jobs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,location.ilike.%${filters.search}%`
    )
  }

  const { data, count, error } = await query.limit(50)
  if (error) throw new Error(error.message)
  return { jobs: (data as Job[]) ?? [], totalCount: count ?? 0 }
}
