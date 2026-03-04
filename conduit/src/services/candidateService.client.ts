'use client'

import { createClient } from '@/lib/supabase/client'
import type { Candidate, CandidateStatus } from '@/types/entities'

export interface CandidateFilters {
  search?: string
  status?: CandidateStatus | 'all'
  pool_id?: string | null
}

/**
 * Client-side candidate fetcher for use in React Query inside client components.
 * Uses the browser Supabase client (no server cookies / next/headers).
 */
export async function fetchCandidatesClient(
  tenantId: string,
  filters?: CandidateFilters,
): Promise<{ candidates: Candidate[]; totalCount: number }> {
  const supabase = createClient()

  let query = supabase
    .from('r7_candidates')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    )
  }
  if (filters?.pool_id) {
    query = query.eq('pool_id', filters.pool_id)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { candidates: data ?? [], totalCount: count ?? 0 }
}
