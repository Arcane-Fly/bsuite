import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PermissionGate } from '../PermissionGate'
import { usePermissions } from '@/hooks/usePermissions'
import type { UsePermissionsReturn } from '@/hooks/usePermissions'
import type { Permission } from '@/lib/permissionConstants'

// ---------------------------------------------------------------------------
// Mock usePermissions
// ---------------------------------------------------------------------------

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock return value for usePermissions with the given granted permissions. */
function mockPermissions(
  granted: Permission[],
  role: UsePermissionsReturn['role'] = 'recruiter',
): UsePermissionsReturn {
  return {
    can: (p: Permission) => granted.includes(p),
    canAny: (perms: readonly Permission[]) => perms.some((p) => granted.includes(p)),
    canAll: (perms: readonly Permission[]) => perms.every((p) => granted.includes(p)),
    cannot: (p: Permission) => !granted.includes(p),
    role,
    permissions: granted,
    loading: false,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PermissionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // 1. Renders children when user HAS the single required permission
  // -------------------------------------------------------------------------
  it('renders children when user has the single required permission', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates', 'manage_candidates']),
    )

    render(
      <PermissionGate permission="view_candidates">
        <p>Protected content</p>
      </PermissionGate>,
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 2. Hides children when user LACKS the single required permission
  // -------------------------------------------------------------------------
  it('hides children when user lacks the single required permission', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    render(
      <PermissionGate permission="manage_settings">
        <p>Admin settings</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Admin settings')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 3. Shows fallback when permission denied and fallback provided
  // -------------------------------------------------------------------------
  it('shows fallback content when permission denied and fallback is provided', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    render(
      <PermissionGate
        permission="manage_settings"
        fallback={<p>You need admin access</p>}
      >
        <p>Admin settings</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Admin settings')).not.toBeInTheDocument()
    expect(screen.getByText('You need admin access')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 4. Shows AccessDenied alert when showAccessDenied={true}
  // -------------------------------------------------------------------------
  it('shows AccessDenied alert when showAccessDenied is true and permission denied', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    render(
      <PermissionGate permission="manage_settings" showAccessDenied>
        <p>Admin settings</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Admin settings')).not.toBeInTheDocument()

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(
      screen.getByText(
        'You do not have permission to view this content. Contact your administrator if you believe this is an error.',
      ),
    ).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 5. Multi-permission with require="any" — renders if user has at least one
  // -------------------------------------------------------------------------
  it('renders children with require="any" when user has at least one permission', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_jobs']),
    )

    render(
      <PermissionGate
        permissions={['view_jobs', 'manage_jobs', 'delete_job']}
        require="any"
      >
        <p>Jobs sidebar</p>
      </PermissionGate>,
    )

    expect(screen.getByText('Jobs sidebar')).toBeInTheDocument()
  })

  it('hides children with require="any" when user has none of the permissions', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    render(
      <PermissionGate
        permissions={['manage_settings', 'manage_users', 'manage_roles']}
        require="any"
      >
        <p>Admin panel</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 6. Multi-permission with require="all" — only renders if user has ALL
  // -------------------------------------------------------------------------
  it('renders children with require="all" when user has every permission', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates', 'manage_candidates', 'delete_candidate']),
    )

    render(
      <PermissionGate
        permissions={['view_candidates', 'manage_candidates']}
        require="all"
      >
        <p>Full candidate access</p>
      </PermissionGate>,
    )

    expect(screen.getByText('Full candidate access')).toBeInTheDocument()
  })

  it('hides children with require="all" when user is missing at least one permission', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    render(
      <PermissionGate
        permissions={['view_candidates', 'manage_candidates']}
        require="all"
      >
        <p>Full candidate access</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Full candidate access')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 7. Multi-permission defaults to "any" mode when require prop not specified
  // -------------------------------------------------------------------------
  it('defaults to "any" mode when require prop is not specified on multi-permission', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['manage_jobs']),
    )

    // User has manage_jobs but NOT view_jobs — should still render since
    // default mode is "any" and the user satisfies at least one.
    render(
      <PermissionGate permissions={['view_jobs', 'manage_jobs']}>
        <p>Jobs section</p>
      </PermissionGate>,
    )

    expect(screen.getByText('Jobs section')).toBeInTheDocument()
  })

  it('defaults to "any" mode — hides when user has none of the listed permissions', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    render(
      <PermissionGate permissions={['manage_settings', 'manage_users']}>
        <p>Settings panel</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Settings panel')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // 8. Renders when no permission/permissions props provided (passthrough)
  // -------------------------------------------------------------------------
  it('renders children when neither permission nor permissions props are provided', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions(['view_candidates']),
    )

    // TypeScript would flag this for the strict union props, but at runtime
    // the component treats the absence of both props as a passthrough.
    // We cast to satisfy TS while testing the runtime behavior.
    render(
      <PermissionGate {...({} as { permission: never })}>
        <p>Always visible</p>
      </PermissionGate>,
    )

    expect(screen.getByText('Always visible')).toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Edge: showAccessDenied takes precedence over fallback
  // -------------------------------------------------------------------------
  it('shows AccessDenied instead of fallback when both showAccessDenied and fallback are provided', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions([]),
    )

    render(
      <PermissionGate
        permission="manage_settings"
        showAccessDenied
        fallback={<p>Custom fallback</p>}
      >
        <p>Protected</p>
      </PermissionGate>,
    )

    // showAccessDenied triggers the AccessDenied component before fallback is checked
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByText('Custom fallback')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------------------
  // Edge: renders nothing (no fallback, no AccessDenied) when denied by default
  // -------------------------------------------------------------------------
  it('renders nothing when permission denied with no fallback and showAccessDenied=false', () => {
    vi.mocked(usePermissions).mockReturnValue(
      mockPermissions([]),
    )

    const { container } = render(
      <PermissionGate permission="manage_settings">
        <p>Secret content</p>
      </PermissionGate>,
    )

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
  })
})
