'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCandidateStore } from '@/stores/candidateStore'
import { useTenantId } from '@/hooks/useTenantId'
import type { CandidateStatus } from '@/types/entities'
import {
  Plus,
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  MapPin,
  Star,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: { value: CandidateStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offered' },
  { value: 'hired', label: 'Hired' },
  { value: 'placed', label: 'Placed' },
  { value: 'pooled', label: 'Pooled' },
]

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  screening: 'bg-amber-100 text-amber-800',
  shortlisted: 'bg-purple-100 text-purple-800',
  interviewing: 'bg-indigo-100 text-indigo-800',
  offered: 'bg-emerald-100 text-emerald-800',
  hired: 'bg-green-100 text-green-800',
  placed: 'bg-teal-100 text-teal-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  pooled: 'bg-cyan-100 text-cyan-800',
}

export default function CandidatesPage() {
  const { tenantId, loading: tenantLoading } = useTenantId()
  const {
    candidates,
    loading,
    filters,
    totalCount,
    setFilters,
    fetchCandidates,
  } = useCandidateStore()
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (tenantId) {
      fetchCandidates(tenantId)
    }
  }, [tenantId, filters.status, filters.pool_id, fetchCandidates])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters({ search: searchInput })
      if (tenantId) fetchCandidates(tenantId)
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  if (tenantLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} candidate{totalCount !== 1 ? 's' : ''} in your talent pool
          </p>
        </div>
        <Link
          href="/candidates/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Candidate
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="candidate-search" className="sr-only">Search candidates</label>
          <input
            id="candidate-search"
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilters({ status: opt.value })}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filters.status === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No candidates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first candidate to get started.
          </p>
          <Link
            href="/candidates/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Candidate
          </Link>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {candidates.map((candidate) => (
            <Link
              key={candidate.id}
              href={`/candidates/${candidate.id}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                {candidate.first_name?.[0]}
                {candidate.last_name?.[0]}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {candidate.first_name} {candidate.last_name}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_COLORS[candidate.status] ?? 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {candidate.status}
                  </span>
                  {candidate.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                      {candidate.rating}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {candidate.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {candidate.email}
                    </span>
                  )}
                  {candidate.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      {candidate.phone}
                    </span>
                  )}
                  {candidate.suburb && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {candidate.suburb}, {candidate.state}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
