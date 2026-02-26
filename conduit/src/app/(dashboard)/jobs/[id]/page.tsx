'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useJobStore } from '@/stores/jobStore'
import type { Job } from '@/types/entities'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Globe,
  Archive,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Users,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  open: 'bg-green-100 text-green-800',
  closed: 'bg-red-100 text-red-800',
  filled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-amber-100 text-amber-800',
}

function formatSalary(min?: number | null, max?: number | null, type?: string | null) {
  if (!min && !max) return null
  const fmt = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
  const suffix =
    type === 'hourly' ? '/hr' : type === 'weekly' ? '/wk' : '/yr'
  if (min && max) return `${fmt(min)} – ${fmt(max)}${suffix}`
  if (min) return `From ${fmt(min)}${suffix}`
  return `Up to ${fmt(max!)}${suffix}`
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { updateJob, deleteJob } = useJobStore()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('r7_jobs')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (error || !data) {
        toast.error('Job not found')
        router.push('/jobs')
        return
      }
      setJob(data as Job)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function handleStatusChange(newStatus: string) {
    if (!job) return
    const updates: Partial<Job> = { status: newStatus as Job['status'] }
    if (newStatus === 'open' && !job.published_at) {
      updates.published_at = new Date().toISOString()
    }
    const ok = await updateJob(job.id, updates)
    if (ok) {
      setJob({ ...job, ...updates })
      toast.success(`Job ${newStatus === 'open' ? 'published' : newStatus}`)
    } else {
      toast.error('Failed to update status')
    }
  }

  async function handleDelete() {
    if (!job) return
    if (!confirm('Delete this job posting? This cannot be undone.')) return
    const ok = await deleteJob(job.id)
    if (ok) {
      toast.success('Job deleted')
      router.push('/jobs')
    }
  }

  if (loading || !job) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_type)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/jobs" className="rounded-md p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-800'
                )}
              >
                {job.status}
              </span>
            </div>
            {job.location && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('open')}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Globe className="h-4 w-4" />
              Publish
            </button>
          )}
          {job.status === 'open' && (
            <button
              onClick={() => handleStatusChange('closed')}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Archive className="h-4 w-4" />
              Close
            </button>
          )}
          <Link
            href={`/jobs/${job.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            {job.short_description && (
              <p className="text-sm font-medium">{job.short_description}</p>
            )}
            {job.description ? (
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
                {job.description}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No description provided
              </p>
            )}
          </div>

          {/* Applications placeholder */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Applications
              </h2>
              <span className="text-sm text-muted-foreground">
                {job.application_count ?? 0} total
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Applications will appear here when candidates apply
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </h2>
            <div className="space-y-3">
              {job.employment_type && (
                <DetailRow
                  icon={Briefcase}
                  label="Type"
                  value={job.employment_type.replace('_', ' ')}
                />
              )}
              {salary && (
                <DetailRow icon={DollarSign} label="Salary" value={salary} />
              )}
              {job.award_code && (
                <DetailRow icon={Briefcase} label="Award" value={job.award_code} />
              )}
              {job.closing_date && (
                <DetailRow
                  icon={Calendar}
                  label="Closes"
                  value={new Date(job.closing_date).toLocaleDateString('en-AU')}
                />
              )}
              {job.published_at && (
                <DetailRow
                  icon={Globe}
                  label="Published"
                  value={new Date(job.published_at).toLocaleDateString('en-AU')}
                />
              )}
              <DetailRow
                icon={Clock}
                label="Created"
                value={new Date(job.created_at).toLocaleDateString('en-AU')}
              />
            </div>
          </div>

          {/* Distribution placeholder */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Distribution
            </h2>
            <p className="text-sm text-muted-foreground">
              Multi-channel job distribution coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  )
}
