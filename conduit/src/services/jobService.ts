import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/types/entities'

export interface JobFilters {
  search?: string
  status?: JobStatus | 'all'
}

export async function fetchJobs(
  tenantId: string,
  filters?: JobFilters,
  isServer = false,
): Promise<{ jobs: Job[]; totalCount: number }> {
  const supabase = isServer ? await createServerClient() : createBrowserClient()

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
