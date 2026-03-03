'use client'

/**
 * PermissionGate — Declarative RBAC guard for Conduit UI elements
 *
 * Conditionally renders children based on the current user's permissions.
 *
 * @example Single permission
 * ```tsx
 * <PermissionGate permission="manage_candidates">
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 *
 * @example Multiple permissions (any)
 * ```tsx
 * <PermissionGate permissions={['view_jobs', 'manage_jobs']} require="any">
 *   <JobsSidebar />
 * </PermissionGate>
 * ```
 */

import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { Permission } from '@/lib/permissionConstants'
import { AlertTriangle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PermissionGateBaseProps {
  children: ReactNode
  fallback?: ReactNode
  showAccessDenied?: boolean
}

interface SinglePermissionProps extends PermissionGateBaseProps {
  permission: Permission
  permissions?: never
  require?: never
}

interface MultiPermissionProps extends PermissionGateBaseProps {
  permission?: never
  permissions: readonly Permission[]
  require?: 'any' | 'all'
}

export type PermissionGateProps = SinglePermissionProps | MultiPermissionProps

// ---------------------------------------------------------------------------
// Access Denied fallback
// ---------------------------------------------------------------------------

function AccessDenied() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4"
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-medium text-destructive">Access Denied</p>
        <p className="text-xs text-muted-foreground">
          You do not have permission to view this content. Contact your
          administrator if you believe this is an error.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionGate(props: PermissionGateProps) {
  const { children, fallback = null, showAccessDenied = false } = props
  const { can, canAny, canAll } = usePermissions()

  let hasAccess: boolean

  if ('permission' in props && props.permission !== undefined) {
    hasAccess = can(props.permission)
  } else if ('permissions' in props && props.permissions !== undefined) {
    const mode = props.require ?? 'any'
    hasAccess = mode === 'all'
      ? canAll(props.permissions)
      : canAny(props.permissions)
  } else {
    hasAccess = true
  }

  if (!hasAccess) {
    if (showAccessDenied) {
      return <AccessDenied />
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
