import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PortalRole } from '@/lib/roleMappingService'
import type { Permission } from '@/lib/permissionConstants'
import { ALL_PERMISSIONS } from '@/lib/permissionConstants'

// ---------------------------------------------------------------------------
// Mock useTenantId — controls the portal role returned to usePermissions
// ---------------------------------------------------------------------------
const mockUseTenantId = vi.fn<() => { tenantId: string | null; role: PortalRole | null; loading: boolean }>()

vi.mock('@/hooks/useTenantId', () => ({
  useTenantId: () => mockUseTenantId(),
}))

// Import after mocking so the hook picks up the mocked dependency
import {
  usePermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getPermissionsForRole,
} from '@/hooks/usePermissions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the hook with a given portal role */
function renderWithRole(portalRole: PortalRole | null, loading = false) {
  mockUseTenantId.mockReturnValue({
    tenantId: portalRole ? 'tenant_123' : null,
    role: portalRole,
    loading,
  })
  return renderHook(() => usePermissions())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================
// Loading state
// ===========================
describe('loading state', () => {
  it('passes through loading=true from useTenantId', () => {
    const { result } = renderWithRole('admin', true)
    expect(result.current.loading).toBe(true)
  })

  it('passes through loading=false from useTenantId', () => {
    const { result } = renderWithRole('admin', false)
    expect(result.current.loading).toBe(false)
  })
})

// ===========================
// Null / undefined portal role defaults to viewer
// ===========================
describe('null/undefined portal role defaults to viewer', () => {
  it('defaults to viewer role when portal role is null', () => {
    const { result } = renderWithRole(null)
    expect(result.current.role).toBe('viewer')
  })

  it('has viewer permissions when portal role is null', () => {
    const { result } = renderWithRole(null)
    // viewer can view_candidates
    expect(result.current.can('view_candidates')).toBe(true)
    // viewer cannot manage_candidates
    expect(result.current.can('manage_candidates')).toBe(false)
    // viewer cannot manage_settings (admin-only)
    expect(result.current.can('manage_settings')).toBe(false)
  })
})

// ===========================
// conduit_admin (mapped from portal 'owner' or 'admin')
// ===========================
describe('conduit_admin role', () => {
  it('maps portal "owner" to conduit_admin', () => {
    const { result } = renderWithRole('owner')
    expect(result.current.role).toBe('conduit_admin')
  })

  it('maps portal "admin" to conduit_admin', () => {
    const { result } = renderWithRole('admin')
    expect(result.current.role).toBe('conduit_admin')
  })

  it('has ALL permissions', () => {
    const { result } = renderWithRole('owner')
    for (const perm of ALL_PERMISSIONS) {
      expect(result.current.can(perm)).toBe(true)
    }
  })

  it('cannot() returns false for every permission', () => {
    const { result } = renderWithRole('owner')
    for (const perm of ALL_PERMISSIONS) {
      expect(result.current.cannot(perm)).toBe(false)
    }
  })

  it('permissions array contains all permissions', () => {
    const { result } = renderWithRole('owner')
    expect(result.current.permissions).toEqual(expect.arrayContaining([...ALL_PERMISSIONS]))
    expect(result.current.permissions.length).toBe(ALL_PERMISSIONS.length)
  })
})

// ===========================
// recruiter (mapped from portal 'manager' or 'staff')
// ===========================
describe('recruiter role', () => {
  it('maps portal "manager" to recruiter', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.role).toBe('recruiter')
  })

  it('maps portal "staff" to recruiter', () => {
    const { result } = renderWithRole('staff')
    expect(result.current.role).toBe('recruiter')
  })

  it('can manage candidates', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_candidates')).toBe(true)
    expect(result.current.can('manage_candidates')).toBe(true)
    expect(result.current.can('create_candidate')).toBe(true)
    expect(result.current.can('edit_candidate')).toBe(true)
    expect(result.current.can('delete_candidate')).toBe(true)
  })

  it('can manage jobs', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_jobs')).toBe(true)
    expect(result.current.can('manage_jobs')).toBe(true)
    expect(result.current.can('create_job')).toBe(true)
    expect(result.current.can('edit_job')).toBe(true)
    expect(result.current.can('delete_job')).toBe(true)
    expect(result.current.can('distribute_job')).toBe(true)
  })

  it('can manage pipeline', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_pipeline')).toBe(true)
    expect(result.current.can('manage_pipeline')).toBe(true)
    expect(result.current.can('move_candidates')).toBe(true)
  })

  it('can manage offers', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_offers')).toBe(true)
    expect(result.current.can('manage_offers')).toBe(true)
    expect(result.current.can('create_offer')).toBe(true)
    expect(result.current.can('approve_offer')).toBe(true)
  })

  it('can manage interviews', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_interviews')).toBe(true)
    expect(result.current.can('manage_interviews')).toBe(true)
    expect(result.current.can('schedule_interview')).toBe(true)
  })

  it('can manage onboarding', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_onboarding')).toBe(true)
    expect(result.current.can('manage_onboarding')).toBe(true)
    expect(result.current.can('create_onboarding_template')).toBe(true)
  })

  it('can manage compliance', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_compliance')).toBe(true)
    expect(result.current.can('manage_compliance')).toBe(true)
  })

  it('can view and export analytics', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_analytics')).toBe(true)
    expect(result.current.can('export_analytics')).toBe(true)
  })

  it('can manage talent pools and communications', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_talent_pools')).toBe(true)
    expect(result.current.can('manage_talent_pools')).toBe(true)
    expect(result.current.can('view_communications')).toBe(true)
    expect(result.current.can('manage_communications')).toBe(true)
  })

  it('can use AI assistant', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('use_ai_assistant')).toBe(true)
  })

  it('can view_settings but NOT manage settings/users/roles', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.can('view_settings')).toBe(true)
    expect(result.current.can('manage_settings')).toBe(false)
    expect(result.current.can('manage_users')).toBe(false)
    expect(result.current.can('manage_roles')).toBe(false)
  })

  it('cannot() is inverse of can()', () => {
    const { result } = renderWithRole('manager')
    expect(result.current.cannot('manage_settings')).toBe(true)
    expect(result.current.cannot('view_candidates')).toBe(false)
  })
})

// ===========================
// hiring_manager (mapped from no default portal role — tested via pure functions)
// ===========================
describe('hiring_manager role', () => {
  // No portal role maps to hiring_manager by default, so we test via pure functions
  // and also verify the hook with a custom scenario

  it('can view candidates but not manage them', () => {
    expect(checkPermission('hiring_manager', 'view_candidates')).toBe(true)
    expect(checkPermission('hiring_manager', 'manage_candidates')).toBe(false)
    expect(checkPermission('hiring_manager', 'create_candidate')).toBe(false)
    expect(checkPermission('hiring_manager', 'edit_candidate')).toBe(false)
    expect(checkPermission('hiring_manager', 'delete_candidate')).toBe(false)
  })

  it('can view jobs and edit them but not create/delete/manage', () => {
    expect(checkPermission('hiring_manager', 'view_jobs')).toBe(true)
    expect(checkPermission('hiring_manager', 'edit_job')).toBe(true)
    expect(checkPermission('hiring_manager', 'manage_jobs')).toBe(false)
    expect(checkPermission('hiring_manager', 'create_job')).toBe(false)
    expect(checkPermission('hiring_manager', 'delete_job')).toBe(false)
    expect(checkPermission('hiring_manager', 'distribute_job')).toBe(false)
  })

  it('can view pipeline and move candidates but not manage pipeline', () => {
    expect(checkPermission('hiring_manager', 'view_pipeline')).toBe(true)
    expect(checkPermission('hiring_manager', 'move_candidates')).toBe(true)
    expect(checkPermission('hiring_manager', 'manage_pipeline')).toBe(false)
  })

  it('can view offers but not manage them', () => {
    expect(checkPermission('hiring_manager', 'view_offers')).toBe(true)
    expect(checkPermission('hiring_manager', 'manage_offers')).toBe(false)
    expect(checkPermission('hiring_manager', 'create_offer')).toBe(false)
    expect(checkPermission('hiring_manager', 'approve_offer')).toBe(false)
  })

  it('can view interviews and schedule them but not manage', () => {
    expect(checkPermission('hiring_manager', 'view_interviews')).toBe(true)
    expect(checkPermission('hiring_manager', 'schedule_interview')).toBe(true)
    expect(checkPermission('hiring_manager', 'manage_interviews')).toBe(false)
  })

  it('can view onboarding/compliance/analytics/talent pools/communications', () => {
    expect(checkPermission('hiring_manager', 'view_onboarding')).toBe(true)
    expect(checkPermission('hiring_manager', 'view_compliance')).toBe(true)
    expect(checkPermission('hiring_manager', 'view_analytics')).toBe(true)
    expect(checkPermission('hiring_manager', 'view_talent_pools')).toBe(true)
    expect(checkPermission('hiring_manager', 'view_communications')).toBe(true)
  })

  it('cannot manage onboarding/compliance/analytics/talent pools/communications', () => {
    expect(checkPermission('hiring_manager', 'manage_onboarding')).toBe(false)
    expect(checkPermission('hiring_manager', 'manage_compliance')).toBe(false)
    expect(checkPermission('hiring_manager', 'export_analytics')).toBe(false)
    expect(checkPermission('hiring_manager', 'manage_talent_pools')).toBe(false)
    expect(checkPermission('hiring_manager', 'manage_communications')).toBe(false)
  })

  it('can use AI assistant', () => {
    expect(checkPermission('hiring_manager', 'use_ai_assistant')).toBe(true)
  })

  it('has no settings permissions', () => {
    expect(checkPermission('hiring_manager', 'view_settings')).toBe(false)
    expect(checkPermission('hiring_manager', 'manage_settings')).toBe(false)
    expect(checkPermission('hiring_manager', 'manage_users')).toBe(false)
    expect(checkPermission('hiring_manager', 'manage_roles')).toBe(false)
  })
})

// ===========================
// employer (mapped from portal 'host_employer')
// ===========================
describe('employer role', () => {
  it('maps portal "host_employer" to employer', () => {
    const { result } = renderWithRole('host_employer')
    expect(result.current.role).toBe('employer')
  })

  it('can view core ATS domains', () => {
    const { result } = renderWithRole('host_employer')
    const viewPermissions: Permission[] = [
      'view_candidates',
      'view_jobs',
      'view_pipeline',
      'view_offers',
      'view_interviews',
      'view_onboarding',
      'view_compliance',
    ]
    for (const perm of viewPermissions) {
      expect(result.current.can(perm)).toBe(true)
    }
  })

  it('cannot manage anything', () => {
    const { result } = renderWithRole('host_employer')
    const managePermissions: Permission[] = [
      'manage_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
      'manage_jobs', 'create_job', 'edit_job', 'delete_job', 'distribute_job',
      'manage_pipeline', 'move_candidates',
      'manage_offers', 'create_offer', 'approve_offer',
      'manage_interviews', 'schedule_interview',
      'manage_onboarding', 'create_onboarding_template',
      'manage_compliance',
      'export_analytics',
      'manage_talent_pools',
      'manage_communications',
      'manage_settings', 'manage_users', 'manage_roles',
    ]
    for (const perm of managePermissions) {
      expect(result.current.can(perm)).toBe(false)
    }
  })

  it('cannot view analytics, talent pools, communications', () => {
    const { result } = renderWithRole('host_employer')
    expect(result.current.can('view_analytics')).toBe(false)
    expect(result.current.can('view_talent_pools')).toBe(false)
    expect(result.current.can('view_communications')).toBe(false)
  })

  it('cannot use AI assistant', () => {
    const { result } = renderWithRole('host_employer')
    expect(result.current.can('use_ai_assistant')).toBe(false)
  })

  it('cannot() is inverse of can()', () => {
    const { result } = renderWithRole('host_employer')
    expect(result.current.cannot('view_candidates')).toBe(false)
    expect(result.current.cannot('manage_candidates')).toBe(true)
  })
})

// ===========================
// candidate (mapped from portal 'apprentice')
// ===========================
describe('candidate role', () => {
  it('maps portal "apprentice" to candidate', () => {
    const { result } = renderWithRole('apprentice')
    expect(result.current.role).toBe('candidate')
  })

  it('can only view jobs, interviews, offers, and onboarding', () => {
    const { result } = renderWithRole('apprentice')
    const allowed: Permission[] = [
      'view_jobs',
      'view_interviews',
      'view_offers',
      'view_onboarding',
    ]
    for (const perm of allowed) {
      expect(result.current.can(perm)).toBe(true)
    }
  })

  it('cannot view candidates, pipeline, compliance, analytics, talent pools, communications', () => {
    const { result } = renderWithRole('apprentice')
    const denied: Permission[] = [
      'view_candidates',
      'view_pipeline',
      'view_compliance',
      'view_analytics',
      'view_talent_pools',
      'view_communications',
    ]
    for (const perm of denied) {
      expect(result.current.can(perm)).toBe(false)
    }
  })

  it('cannot manage anything', () => {
    const { result } = renderWithRole('apprentice')
    const managePermissions: Permission[] = [
      'manage_candidates', 'create_candidate',
      'manage_jobs', 'create_job',
      'manage_pipeline', 'move_candidates',
      'manage_offers', 'create_offer', 'approve_offer',
      'manage_interviews', 'schedule_interview',
      'manage_onboarding', 'create_onboarding_template',
      'manage_compliance',
      'export_analytics',
      'manage_talent_pools',
      'manage_communications',
      'manage_settings', 'manage_users', 'manage_roles',
      'use_ai_assistant',
    ]
    for (const perm of managePermissions) {
      expect(result.current.can(perm)).toBe(false)
    }
  })

  it('has exactly 4 permissions', () => {
    const { result } = renderWithRole('apprentice')
    expect(result.current.permissions.length).toBe(4)
  })
})

// ===========================
// viewer (mapped from portal 'guest' or 'training_provider')
// ===========================
describe('viewer role', () => {
  it('maps portal "guest" to viewer', () => {
    const { result } = renderWithRole('guest')
    expect(result.current.role).toBe('viewer')
  })

  it('maps portal "training_provider" to viewer', () => {
    const { result } = renderWithRole('training_provider')
    expect(result.current.role).toBe('viewer')
  })

  it('can view all core domains', () => {
    const { result } = renderWithRole('guest')
    const viewPermissions: Permission[] = [
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
    ]
    for (const perm of viewPermissions) {
      expect(result.current.can(perm)).toBe(true)
    }
  })

  it('cannot manage anything', () => {
    const { result } = renderWithRole('guest')
    const denied: Permission[] = [
      'manage_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
      'manage_jobs', 'create_job', 'edit_job', 'delete_job', 'distribute_job',
      'manage_pipeline', 'move_candidates',
      'manage_offers', 'create_offer', 'approve_offer',
      'manage_interviews', 'schedule_interview',
      'manage_onboarding', 'create_onboarding_template',
      'manage_compliance',
      'export_analytics',
      'manage_talent_pools',
      'manage_communications',
      'manage_settings', 'manage_users', 'manage_roles',
      'use_ai_assistant',
    ]
    for (const perm of denied) {
      expect(result.current.can(perm)).toBe(false)
    }
  })

  it('cannot view_settings', () => {
    const { result } = renderWithRole('guest')
    expect(result.current.can('view_settings')).toBe(false)
  })

  it('cannot() is inverse of can()', () => {
    const { result } = renderWithRole('guest')
    expect(result.current.cannot('view_candidates')).toBe(true === !result.current.can('view_candidates'))
    expect(result.current.cannot('manage_settings')).toBe(true)
    expect(result.current.cannot('view_jobs')).toBe(false)
  })
})

// ===========================
// canAny()
// ===========================
describe('canAny()', () => {
  it('returns true when at least one permission matches', () => {
    const { result } = renderWithRole('guest') // viewer
    expect(
      result.current.canAny(['manage_settings', 'view_candidates'])
    ).toBe(true)
  })

  it('returns false when no permissions match', () => {
    const { result } = renderWithRole('guest') // viewer
    expect(
      result.current.canAny(['manage_settings', 'manage_users', 'manage_roles'])
    ).toBe(false)
  })

  it('returns true for admin with any permission array', () => {
    const { result } = renderWithRole('owner') // conduit_admin
    expect(
      result.current.canAny(['manage_settings', 'manage_users'])
    ).toBe(true)
  })

  it('handles single-element array', () => {
    const { result } = renderWithRole('apprentice') // candidate
    expect(result.current.canAny(['view_jobs'])).toBe(true)
    expect(result.current.canAny(['manage_settings'])).toBe(false)
  })

  it('returns false for empty array', () => {
    const { result } = renderWithRole('owner') // conduit_admin
    expect(result.current.canAny([])).toBe(false)
  })
})

// ===========================
// canAll()
// ===========================
describe('canAll()', () => {
  it('returns true when all permissions match', () => {
    const { result } = renderWithRole('owner') // conduit_admin
    expect(
      result.current.canAll(['manage_settings', 'manage_users', 'view_candidates'])
    ).toBe(true)
  })

  it('returns false when one permission does not match', () => {
    const { result } = renderWithRole('manager') // recruiter
    expect(
      result.current.canAll(['view_candidates', 'manage_settings'])
    ).toBe(false)
  })

  it('returns true for empty array (vacuous truth)', () => {
    const { result } = renderWithRole('apprentice') // candidate
    expect(result.current.canAll([])).toBe(true)
  })

  it('returns true for single permission the role has', () => {
    const { result } = renderWithRole('guest') // viewer
    expect(result.current.canAll(['view_jobs'])).toBe(true)
  })

  it('returns false for single permission the role lacks', () => {
    const { result } = renderWithRole('guest') // viewer
    expect(result.current.canAll(['manage_settings'])).toBe(false)
  })

  it('recruiter can do all candidate + job operations', () => {
    const { result } = renderWithRole('staff') // recruiter
    expect(
      result.current.canAll([
        'view_candidates', 'manage_candidates', 'create_candidate', 'edit_candidate', 'delete_candidate',
        'view_jobs', 'manage_jobs', 'create_job', 'edit_job', 'delete_job', 'distribute_job',
      ])
    ).toBe(true)
  })

  it('employer cannot do all view operations (missing analytics etc.)', () => {
    const { result } = renderWithRole('host_employer') // employer
    expect(
      result.current.canAll(['view_candidates', 'view_analytics'])
    ).toBe(false)
  })
})

// ===========================
// Pure function exports
// ===========================
describe('pure function: checkPermission()', () => {
  it('returns true for valid permission', () => {
    expect(checkPermission('conduit_admin', 'manage_settings')).toBe(true)
  })

  it('returns false for invalid permission', () => {
    expect(checkPermission('viewer', 'manage_settings')).toBe(false)
  })
})

describe('pure function: checkAnyPermission()', () => {
  it('returns true when at least one matches', () => {
    expect(checkAnyPermission('viewer', ['manage_settings', 'view_jobs'])).toBe(true)
  })

  it('returns false when none match', () => {
    expect(checkAnyPermission('candidate', ['manage_settings', 'manage_users'])).toBe(false)
  })
})

describe('pure function: checkAllPermissions()', () => {
  it('returns true when all match', () => {
    expect(checkAllPermissions('conduit_admin', ['manage_settings', 'manage_users'])).toBe(true)
  })

  it('returns false when not all match', () => {
    expect(checkAllPermissions('viewer', ['view_jobs', 'manage_settings'])).toBe(false)
  })
})

describe('pure function: getPermissionsForRole()', () => {
  it('returns all permissions for conduit_admin', () => {
    const perms = getPermissionsForRole('conduit_admin')
    expect(perms.length).toBe(ALL_PERMISSIONS.length)
    expect(perms).toEqual(expect.arrayContaining([...ALL_PERMISSIONS]))
  })

  it('returns 4 permissions for candidate', () => {
    const perms = getPermissionsForRole('candidate')
    expect(perms.length).toBe(4)
    expect(perms).toContain('view_jobs')
    expect(perms).toContain('view_interviews')
    expect(perms).toContain('view_offers')
    expect(perms).toContain('view_onboarding')
  })

  it('returns 10 view-only permissions for viewer', () => {
    const perms = getPermissionsForRole('viewer')
    expect(perms.length).toBe(10)
    for (const perm of perms) {
      expect(perm).toMatch(/^view_/)
    }
  })
})

// ===========================
// Portal role → Conduit role mapping exhaustiveness
// ===========================
describe('portal role mapping coverage', () => {
  const mappings: [PortalRole, string][] = [
    ['owner', 'conduit_admin'],
    ['admin', 'conduit_admin'],
    ['manager', 'recruiter'],
    ['staff', 'recruiter'],
    ['guest', 'viewer'],
    ['host_employer', 'employer'],
    ['training_provider', 'viewer'],
    ['apprentice', 'candidate'],
  ]

  it.each(mappings)(
    'portal role "%s" maps to Conduit role "%s"',
    (portalRole, expectedConduitRole) => {
      const { result } = renderWithRole(portalRole)
      expect(result.current.role).toBe(expectedConduitRole)
    },
  )
})
