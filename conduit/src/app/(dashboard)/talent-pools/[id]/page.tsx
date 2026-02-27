'use client'

import { useTenantId } from '@/hooks/useTenantId'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useCandidateStore } from '@/stores/candidateStore'
import { useTalentPoolStore } from '@/stores/talentPoolStore'
import type { TalentPool } from '@/types/entities'
import {
    ArrowLeft,
    Mail,
    Search,
    Star,
    UserPlus,
    Users,
    X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function TalentPoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { tenantId } = useTenantId()
  const { memberships, fetchMemberships, addCandidate, removeCandidate } = useTalentPoolStore()
  const { candidates, fetchCandidates } = useCandidateStore()
  const [pool, setPool] = useState<TalentPool | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('r7_talent_pools')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (error || !data) {
        toast.error('Pool not found')
        router.push('/talent-pools')
        return
      }
      setPool(data as TalentPool)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  useEffect(() => {
    if (params.id) fetchMemberships(params.id as string)
  }, [params.id, fetchMemberships])

  useEffect(() => {
    if (tenantId && showAddPanel) fetchCandidates(tenantId)
  }, [tenantId, showAddPanel, fetchCandidates])

  const memberCandidateIds = new Set(memberships.map((m) => m.candidate_id))
  const availableCandidates = candidates.filter(
    (c) =>
      !memberCandidateIds.has(c.id) &&
      (searchInput === '' ||
        `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchInput.toLowerCase()))
  )

  async function handleAdd(candidateId: string) {
    const ok = await addCandidate(candidateId, params.id as string)
    if (ok) toast.success('Candidate added to pool')
    else toast.error('Failed to add candidate')
  }

  async function handleRemove(membershipId: string) {
    const ok = await removeCandidate(membershipId)
    if (ok) toast.success('Candidate removed')
    else toast.error('Failed to remove')
  }

  if (loading || !pool) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/talent-pools" className="rounded-md p-2 hover:bg-muted" aria-label="Back to talent pools">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="h-5 w-5 rounded-full"
              style={{ backgroundColor: pool.color ?? '#6b7280' }}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{pool.name}</h1>
              {pool.description && (
                <p className="text-sm text-muted-foreground">{pool.description}</p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add Candidates
        </button>
      </div>

      {/* Add Candidates Panel */}
      {showAddPanel && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Add Candidates</h2>
            <button onClick={() => setShowAddPanel(false)} className="rounded p-1 hover:bg-muted" aria-label="Close add candidates panel">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <label htmlFor="pool-candidate-search" className="sr-only">Search candidates to add</label>
            <input
              id="pool-candidate-search"
              type="text"
              placeholder="Search candidates..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y rounded-md border">
            {availableCandidates.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">
                No candidates available to add
              </p>
            ) : (
              availableCandidates.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {c.first_name[0]}{c.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(c.id)}
                    className="rounded-md bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/80"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pool Members */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          {memberships.length} candidate{memberships.length !== 1 ? 's' : ''} in pool
        </h2>
        {memberships.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <Users className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              No candidates in this pool yet. Click &quot;Add Candidates&quot; above.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {memberships.map((m) => {
              const c = m.candidate
              if (!c) return null
              return (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                    {c.first_name[0]}{c.last_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/candidates/${c.id}`} className="font-medium hover:underline">
                        {c.first_name} {c.last_name}
                      </Link>
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        c.status === 'hired' ? 'bg-green-100 text-green-800' :
                        c.status === 'pooled' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-gray-100 text-gray-800'
                      )}>
                        {c.status}
                      </span>
                      {c.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" /> {c.rating}
                        </span>
                      )}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" aria-hidden="true" /> {c.email}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Added {new Date(m.added_at).toLocaleDateString('en-AU')}
                  </div>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${c.first_name} ${c.last_name} from pool`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
