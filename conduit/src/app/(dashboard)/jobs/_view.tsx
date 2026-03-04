'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchJobsClient } from '@/services/jobService.client'
import { cn } from '@/lib/utils'
import type { Job, JobStatus } from '@/types/entities'
import {
  Briefcase,
  Calendar,
  DollarSign,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const STATUS_OPTIONS: { value: JobStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
]

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
  filled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-amber-100 text-amber-800',
}

function formatSalary(min?: number | null, max?: number | null, type?: string | null) {
  if (!min && !max) return null
  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
  const suffix = type === 'hourly' ? '/hr' : type === 'weekly' ? '/wk' : '/yr'
  if (min && max) return `${fmt(min)} – ${fmt(max)}${suffix}`
  if (min) return `From ${fmt(min)}${suffix}`
  return `Up to ${fmt(max!)}${suffix}`
}

interface JobsViewProps {
  tenantId: string
  initialJobs: Job[]
  initialTotalCount: number
}

export function JobsView({ tenantId, initialJobs, initialTotalCount }: JobsViewProps) {
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', tenantId, statusFilter, debouncedSearch],
    queryFn: () => fetchJobsClient(tenantId, { status: statusFilter, search: debouncedSearch }),
    initialData:
      statusFilter === 'all' && !debouncedSearch
        ? { jobs: initialJobs, totalCount: initialTotalCount }
        : undefined,
    staleTime: 30_000,
  })

  const jobs = data?.jobs ?? []
  const totalCount = data?.totalCount ?? initialTotalCount

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} job{totalCount !== 1 ? 's' : ''} across your pipeline
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Post Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="job-search" className="sr-only">Search jobs</label>
          <input
            id="job-search"
            type="text"
            placeholder="Search by title or location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Briefcase className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No jobs posted yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first job posting to start sourcing candidates.
          </p>
          <Link
            href="/jobs/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Post Job
          </Link>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{job.title}</span>
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-800'
                  )}>
                    {job.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {job.employment_type && (
                    <span className="capitalize">{job.employment_type.replace('_', ' ')}</span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" /> {job.location}
                    </span>
                  )}
                  {formatSalary(job.salary_min, job.salary_max, job.salary_type) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" aria-hidden="true" />
                      {formatSalary(job.salary_min, job.salary_max, job.salary_type)}
                    </span>
                  )}
                  {job.closing_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      Closes {new Date(job.closing_date).toLocaleDateString('en-AU')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {job.application_count ?? 0} applicants
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
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
