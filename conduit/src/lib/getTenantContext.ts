import { createClient } from '@/lib/supabase/server'
import type { PortalRole } from '@/lib/roleMappingService'

export interface TenantContext {
  userId: string
  tenantId: string
  role: PortalRole
}

/**
 * Resolves the current user's tenant context from the server-side Supabase session.
 * Returns null if the user is unauthenticated or has no active tenant.
 * Use in server components and route handlers only.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return null

  const { data, error } = await supabase
    .from('user_tenants')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    userId: user.id,
    tenantId: data.tenant_id,
    role: (data.role as PortalRole) ?? 'user',
  }
}
