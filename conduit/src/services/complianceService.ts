import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { ComplianceCheck } from '@/types/entities'

export interface ComplianceFilters {
  status?: string
  check_type?: string
}

export async function fetchComplianceChecks(
  tenantId: string,
  filters?: ComplianceFilters,
): Promise<ComplianceCheck[]> {
  const supabase = createBrowserClient()
  let query = supabase
    .from('r7_compliance_checks')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.check_type && filters.check_type !== 'all') {
    query = query.eq('check_type', filters.check_type)
  }

  const { data, error } = await query.limit(100)
  if (error) throw new Error(error.message)
  return data ?? []
}
