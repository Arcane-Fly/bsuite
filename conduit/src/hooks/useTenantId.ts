'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PortalRole } from '@/lib/roleMappingService'

export function useTenantId() {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['tenant-context'],
    queryFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!data) return null
      return { tenantId: data.tenant_id as string, role: data.role as PortalRole }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — tenant context is stable
    retry: 1,
  })

  return {
    tenantId: data?.tenantId ?? null,
    role: data?.role ?? null,
    loading,
  }
}
