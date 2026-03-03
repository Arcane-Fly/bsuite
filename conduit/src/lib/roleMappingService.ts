/**
 * Maps BSU portal roles to Conduit ATS operational roles.
 *
 * Portal roles come from user_tenants.role (shared across all BSuite apps).
 * Conduit maps these to ATS-specific operational roles for fine-grained
 * permission checks within the recruitment domain.
 */

/**
 * Identity-level portal roles — matches the DB CHECK constraint on
 * `user_tenants.role` exactly:
 *   owner, admin, manager, staff, guest, host_employer, training_provider, apprentice
 */
export type PortalRole =
  | 'owner' | 'admin' | 'manager' | 'staff' | 'guest'
  | 'host_employer' | 'training_provider' | 'apprentice'

/**
 * Conduit ATS operational roles:
 * - conduit_admin: Full access to all ATS features + settings
 * - recruiter: Manage candidates, jobs, pipeline, offers, interviews, onboarding
 * - hiring_manager: View + limited manage on own jobs/interviews
 * - employer: View candidates placed with their organisation
 * - candidate: Self-service portal access
 * - viewer: Read-only access
 */
export type ConduitRole =
  | 'conduit_admin' | 'recruiter' | 'hiring_manager'
  | 'employer' | 'candidate' | 'viewer'

export const DEFAULT_ROLE_MAPPING: Record<PortalRole, ConduitRole> = {
  owner: 'conduit_admin',
  admin: 'conduit_admin',
  manager: 'recruiter',
  staff: 'recruiter',
  guest: 'viewer',
  host_employer: 'employer',
  training_provider: 'viewer',
  apprentice: 'candidate',
}

/**
 * Map a BSU portal role to a Conduit operational role.
 * @param portalRole - The user's role from BSU (user_tenants.role)
 * @param tenantOverrides - Optional per-tenant mapping overrides
 */
export function mapPortalRoleToConduit(
  portalRole: PortalRole,
  tenantOverrides?: Partial<Record<PortalRole, ConduitRole>>,
): ConduitRole {
  if (tenantOverrides && portalRole in tenantOverrides) {
    return tenantOverrides[portalRole]!
  }
  return DEFAULT_ROLE_MAPPING[portalRole] ?? 'viewer'
}
