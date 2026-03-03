'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGate } from '@/components/common/PermissionGate'
import type { PortalRole } from '@/lib/roleMappingService'
import { mapPortalRoleToConduit } from '@/lib/roleMappingService'
import {
  Crown,
  Loader2,
  Mail,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

interface TeamSectionProps {
  tenantId: string
}

interface TeamMember {
  user_id: string
  role: PortalRole
  status: string
  created_at: string
  email: string | null
  full_name: string | null
}

const ASSIGNABLE_ROLES: { value: PortalRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'guest', label: 'Guest' },
]

function roleBadge(role: PortalRole) {
  const conduitRole = mapPortalRoleToConduit(role)
  switch (conduitRole) {
    case 'conduit_admin':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Crown className="h-3 w-3" />
          {role === 'owner' ? 'Owner' : 'Admin'}
        </span>
      )
    case 'recruiter':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <ShieldCheck className="h-3 w-3" />
          {role === 'manager' ? 'Manager' : 'Staff'}
        </span>
      )
    case 'hiring_manager':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Shield className="h-3 w-3" />
          Hiring Manager
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <Shield className="h-3 w-3" />
          {role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      )
  }
}

export function TeamSection({ tenantId }: TeamSectionProps) {
  const { can } = usePermissions()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<PortalRole>('staff')
  const [inviting, setInviting] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_tenants')
      .select('user_id, role, status, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load team members')
      setLoading(false)
      return
    }

    // Fetch user profiles for display names and emails
    const userIds = (data ?? []).map((m) => m.user_id)
    let profiles: Record<string, { email: string | null; full_name: string | null }> = {}

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)

      if (profileData) {
        profiles = Object.fromEntries(
          profileData.map((p) => [p.id, { email: p.email, full_name: p.full_name }])
        )
      }
    }

    setMembers(
      (data ?? []).map((m) => ({
        ...m,
        role: m.role as PortalRole,
        email: profiles[m.user_id]?.email ?? null,
        full_name: profiles[m.user_id]?.full_name ?? null,
      }))
    )
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleRoleChange = async (userId: string, newRole: PortalRole) => {
    setUpdatingRole(userId)
    const supabase = createClient()

    const { error } = await supabase
      .from('user_tenants')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) {
      toast.error('Failed to update role')
    } else {
      toast.success('Role updated')
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      )
    }
    setUpdatingRole(null)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    const supabase = createClient()

    // Look up user by email in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail.trim().toLowerCase())
      .single()

    if (!profile) {
      toast.error('No user found with that email. They must have a BSuite account first.')
      setInviting(false)
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('user_tenants')
      .select('user_id')
      .eq('user_id', profile.id)
      .eq('tenant_id', tenantId)
      .single()

    if (existing) {
      toast.error('This user is already a team member.')
      setInviting(false)
      return
    }

    const { error } = await supabase
      .from('user_tenants')
      .insert({
        user_id: profile.id,
        tenant_id: tenantId,
        role: inviteRole,
        status: 'active',
      })

    if (error) {
      toast.error('Failed to add team member')
    } else {
      toast.success(`Invited ${inviteEmail} as ${inviteRole}`)
      setInviteEmail('')
      setInviteRole('staff')
      fetchMembers()
    }
    setInviting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Team</h3>
        <p className="text-sm text-muted-foreground">
          Manage team members and their roles in Conduit.
        </p>
      </div>

      {/* Member List */}
      <div className="rounded-lg border bg-background">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted-foreground">No team members found.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {(member.full_name ?? member.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.full_name ?? 'Unnamed User'}
                    </p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {can('manage_users') ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.user_id, e.target.value as PortalRole)
                      }
                      disabled={updatingRole === member.user_id}
                      className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      aria-label={`Change role for ${member.full_name ?? member.email ?? 'user'}`}
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roleBadge(member.role)
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite Form (admin only) */}
      <PermissionGate permission="manage_users">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Invite Team Member</h4>

          <form
            onSubmit={handleInvite}
            className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground">
                Email Address
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:w-36">
              <label htmlFor="invite-role" className="text-xs font-medium text-muted-foreground">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as PortalRole)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              Invite
            </button>
          </form>
        </div>
      </PermissionGate>
    </div>
  )
}
