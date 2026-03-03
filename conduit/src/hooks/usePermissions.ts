'use client'

/**
 * usePermissions — Unified RBAC hook for Conduit ATS
 *
 * Maps the user's portal role (from user_tenants.role) to a Conduit
 * operational role, then resolves fine-grained ATS permissions.
 *
 * @example
 * ```tsx
 * const { can, canAny, role } = usePermissions()
 * if (can('manage_candidates')) { ... }
 * if (canAny(['view_jobs', 'manage_jobs'])) { ... }
 * ```
 */

import { useMemo } from 'react'
import { useTenantId } from '@/hooks/useTenantId'
import { mapPortalRoleToConduit } from '@/lib/roleMappingService'
import type { ConduitRole } from '@/lib/roleMappingService'
import type { Permission } from '@/lib/permissionConstants'
import { ALL_PERMISSIONS } from '@/lib/permissionConstants'

// ---------------------------------------------------------------------------
// Role → Permission mapping
// ---------------------------------------------------------------------------

const rolePermissions: Record<ConduitRole, readonly Permission[]> = {
  // Full access
  conduit_admin: [...ALL_PERMISSIONS],

  // Recruiter — manage everything except settings/admin
  recruiter: [
    'view_candidates', 'manage_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
    'view_jobs', 'manage_jobs', 'create_job', 'edit_job', 'delete_job', 'distribute_job',
    'view_pipeline', 'manage_pipeline', 'move_candidates',
    'view_offers', 'manage_offers', 'create_offer', 'approve_offer',
    'view_interviews', 'manage_interviews', 'schedule_interview',
    'view_onboarding', 'manage_onboarding', 'create_onboarding_template',
    'view_compliance', 'manage_compliance',
    'view_analytics', 'export_analytics',
    'view_talent_pools', 'manage_talent_pools',
    'view_communications', 'manage_communications',
    'use_ai_assistant',
    'view_settings',
  ],

  // Hiring manager — view + limited manage on jobs/interviews/pipeline
  hiring_manager: [
    'view_candidates',
    'view_jobs', 'edit_job',
    'view_pipeline', 'move_candidates',
    'view_offers',
    'view_interviews', 'schedule_interview',
    'view_onboarding',
    'view_compliance',
    'view_analytics',
    'view_talent_pools',
    'view_communications',
    'use_ai_assistant',
  ],

  // Employer — view candidates placed with their organisation
  employer: [
    'view_candidates',
    'view_jobs',
    'view_pipeline',
    'view_offers',
    'view_interviews',
    'view_onboarding',
    'view_compliance',
  ],

  // Candidate — self-service portal (future)
  candidate: [
    'view_jobs',
    'view_interviews',
    'view_offers',
    'view_onboarding',
  ],

  // Viewer — read-only across all domains
  viewer: [
    'view_candidates',
    'view_jobs',
    'view_pipeline',
    'view_offers',
    'view_interviews',
    'view_onboarding',
    'view_compliance',
    'view_analytics',
    'view_talent_pools',
    'view_communications',
  ],
}

// ---------------------------------------------------------------------------
// Pure functions (non-React, testable)
// ---------------------------------------------------------------------------

export function checkPermission(role: ConduitRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission)
}

export function checkAnyPermission(role: ConduitRole, permissions: readonly Permission[]): boolean {
  const perms = rolePermissions[role]
  return permissions.some((p) => perms.includes(p))
}

export function checkAllPermissions(role: ConduitRole, permissions: readonly Permission[]): boolean {
  const perms = rolePermissions[role]
  return permissions.every((p) => perms.includes(p))
}

export function getPermissionsForRole(role: ConduitRole): readonly Permission[] {
  return rolePermissions[role]
}

// ---------------------------------------------------------------------------
// React Hook
// ---------------------------------------------------------------------------

export interface UsePermissionsReturn {
  can: (permission: Permission) => boolean
  canAny: (permissions: readonly Permission[]) => boolean
  canAll: (permissions: readonly Permission[]) => boolean
  cannot: (permission: Permission) => boolean
  role: ConduitRole
  permissions: readonly Permission[]
  loading: boolean
}

export function usePermissions(): UsePermissionsReturn {
  const { role: portalRole, loading } = useTenantId()

  const role = useMemo<ConduitRole>(() => {
    if (!portalRole) return 'viewer'
    return mapPortalRoleToConduit(portalRole)
  }, [portalRole])

  const permissions = useMemo<readonly Permission[]>(() => {
    return rolePermissions[role]
  }, [role])

  const can = useMemo(() => {
    return (permission: Permission): boolean => rolePermissions[role].includes(permission)
  }, [role])

  const canAny = useMemo(() => {
    return (perms: readonly Permission[]): boolean => {
      const rolePerms = rolePermissions[role]
      return perms.some((p) => rolePerms.includes(p))
    }
  }, [role])

  const canAll = useMemo(() => {
    return (perms: readonly Permission[]): boolean => {
      const rolePerms = rolePermissions[role]
      return perms.every((p) => rolePerms.includes(p))
    }
  }, [role])

  const cannot = useMemo(() => {
    return (permission: Permission): boolean => !can(permission)
  }, [can])

  return {
    can,
    canAny,
    canAll,
    cannot,
    role,
    permissions,
    loading,
  }
}
