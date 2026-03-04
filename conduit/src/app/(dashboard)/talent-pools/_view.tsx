'use client'

import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog'
import { useTenantId } from '@/hooks/useTenantId'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useTalentPoolStore } from '@/stores/talentPoolStore'
import type { TalentPool } from '@/types/entities'
import {
    Edit,
    FolderOpen,
    GraduationCap,
    MapPin,
    Plus,
    Trash2,
    Users,
    Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

const POOL_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#6366f1', '#10b981', '#ef4444', '#06b6d4', '#d946ef',
]

export function TalentPoolsView() {
  const { tenantId } = useTenantId()
  const { createPool, updatePool, deletePool } = useTalentPoolStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { requestConfirm, dialogProps } = useConfirmDialog()
  const [form, setForm] = useState({
    name: '',
    description: '',
    qualification_area: '',
    trade: '',
    region: '',
    color: POOL_COLORS[0],
  })

  const { data: pools = [], isLoading: loading } = useQuery<TalentPool[]>({
    queryKey: ['talent-pools', tenantId],
    queryFn: async () => {
      if (!tenantId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('r7_talent_pools')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
      if (error) throw error
      return (data as TalentPool[]) ?? []
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  })

  function resetForm() {
    setForm({ name: '', description: '', qualification_area: '', trade: '', region: '', color: POOL_COLORS[0] })
    setShowCreate(false)
    setEditingId(null)
  }

  function startEdit(pool: TalentPool) {
    setEditingId(pool.id)
    setForm({
      name: pool.name,
      description: pool.description ?? '',
      qualification_area: pool.qualification_area ?? '',
      trade: pool.trade ?? '',
      region: pool.region ?? '',
      color: pool.color ?? POOL_COLORS[0],
    })
    setShowCreate(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return

    if (editingId) {
      const ok = await updatePool(editingId, form)
      if (ok) {
        toast.success('Pool updated')
        void queryClient.invalidateQueries({ queryKey: ['talent-pools', tenantId] })
      } else {
        toast.error('Failed to update pool')
      }
    } else {
      const created = await createPool(tenantId, { ...form, status: 'active' })
      if (created) {
        toast.success('Pool created')
        void queryClient.invalidateQueries({ queryKey: ['talent-pools', tenantId] })
      } else {
        toast.error('Failed to create pool')
      }
    }
    resetForm()
  }

  function handleDelete(id: string, name: string) {
    requestConfirm(
      { title: 'Delete Pool', description: `Delete "${name}"? Candidates will be removed from this pool.` },
      async () => {
        const ok = await deletePool(id)
        if (ok) {
          toast.success('Pool deleted')
          void queryClient.invalidateQueries({ queryKey: ['talent-pools', tenantId] })
        } else {
          toast.error('Failed to delete pool')
        }
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Talent Pools</h1>
          <p className="text-sm text-muted-foreground">
            Organize candidates by trade, region, or qualification area
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Pool
        </button>
      </div>

      {/* Create / Edit Form */}
      {showCreate && (
        <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">
            {editingId ? 'Edit Pool' : 'Create New Pool'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="pool-name" className="text-sm font-medium">Name *</label>
              <input
                id="pool-name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Electrical Trade Pool"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pool-region" className="text-sm font-medium">Region</label>
              <input
                id="pool-region"
                value={form.region}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                placeholder="e.g. Sydney Metro"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pool-qualification" className="text-sm font-medium">Qualification Area</label>
              <input
                id="pool-qualification"
                value={form.qualification_area}
                onChange={(e) => setForm((p) => ({ ...p, qualification_area: e.target.value }))}
                placeholder="e.g. Cert III"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pool-trade" className="text-sm font-medium">Trade</label>
              <input
                id="pool-trade"
                value={form.trade}
                onChange={(e) => setForm((p) => ({ ...p, trade: e.target.value }))}
                placeholder="e.g. Plumbing"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="pool-description" className="text-sm font-medium">Description</label>
            <textarea
              id="pool-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label id="pool-color-label" className="text-sm font-medium">Color</label>
            <div className="flex gap-2" role="group" aria-labelledby="pool-color-label">
              {POOL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform',
                    form.color === c && 'scale-125 ring-2 ring-offset-2 ring-primary'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                  aria-pressed={form.color === c}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {editingId ? 'Update Pool' : 'Create Pool'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Pool Grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : pools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No talent pools yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create pools to organize candidates by trade, region, or qualification.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <Link
              key={pool.id}
              href={`/talent-pools/${pool.id}`}
              className="group rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: pool.color ?? '#6b7280' }}
                  />
                  <h3 className="font-medium group-hover:underline">{pool.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(pool) }}
                    className="rounded p-1 hover:bg-muted"
                    aria-label={`Edit ${pool.name}`}
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(pool.id, pool.name) }}
                    className="rounded p-1 hover:bg-destructive/10"
                    aria-label={`Delete ${pool.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {pool.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{pool.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {pool.trade && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                    <Wrench className="h-3 w-3" aria-hidden="true" /> {pool.trade}
                  </span>
                )}
                {pool.region && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                    <MapPin className="h-3 w-3" aria-hidden="true" /> {pool.region}
                  </span>
                )}
                {pool.qualification_area && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                    <GraduationCap className="h-3 w-3" aria-hidden="true" /> {pool.qualification_area}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" aria-hidden="true" />
                <span>View candidates</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
