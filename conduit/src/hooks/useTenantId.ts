'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PortalRole } from '@/lib/roleMappingService'

export function useTenantId() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [role, setRole] = useState<PortalRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTenantId() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (data) {
        setTenantId(data.tenant_id)
        setRole((data.role as PortalRole) ?? null)
      }
      setLoading(false)
    }

    fetchTenantId()
  }, [])

  return { tenantId, role, loading }
}
