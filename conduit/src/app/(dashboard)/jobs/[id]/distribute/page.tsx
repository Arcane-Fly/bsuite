'use client'

import { useTenantId } from '@/hooks/useTenantId'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useJobDistributionStore } from '@/stores/jobDistributionStore'
import type { Job, JobDistribution } from '@/types/entities'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Globe,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const CHANNELS = [
  { value: 'seek', label: 'SEEK', icon: '🔵' },
  { value: 'indeed', label: 'Indeed', icon: '🟣' },
  { value: 'linkedin', label: 'LinkedIn', icon: '🔷' },
  { value: 'jora', label: 'Jora', icon: '🟠' },
  { value: 'career_one', label: 'CareerOne', icon: '🔴' },
  { value: 'company_website', label: 'Company Website', icon: '🌐' },
  { value: 'social_media', label: 'Social Media', icon: '📱' },
  { value: 'other', label: 'Other', icon: '📋' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50' },
  posted: { label: 'Posted', color: 'text-green-600', bg: 'bg-green-50' },
  expired: { label: 'Expired', color: 'text-gray-500', bg: 'bg-gray-50' },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50' },
}

export default function JobDistributePage() {
  const params = useParams()
  const router = useRouter()
  const { tenantId } = useTenantId()
  const { distributions, loading, error, fetchDistributions, createDistribution, markPosted, markExpired, deleteDistribution } = useJobDistributionStore()

  const [job, setJob] = useState<Job | null>(null)
  const [jobLoading, setJobLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    async function loadJob() {
      const supabase = createClient()
      const { data, error: jobError } = await supabase
        .from('r7_jobs')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (jobError || !data) {
        toast.error('Job not found')
        router.push('/jobs')
        return
      }
      setJob(data as Job)
      setJobLoading(false)
    }
    loadJob()
  }, [params.id, router])

  useEffect(() => {
    if (tenantId && params.id) {
      fetchDistributions(tenantId, { jobId: params.id as string })
    }
  }, [tenantId, params.id, fetchDistributions])

  const jobDistributions = distributions.filter((d) => d.job_id === params.id)

  async function handleMarkPosted(id: string) {
    const url = prompt('Enter the posting URL (optional):')
    await markPosted(id, url || undefined)
    setActiveMenu(null)
  }

  async function handleMarkExpired(id: string) {
    await markExpired(id)
    setActiveMenu(null)
  }

  async function handleDelete(id: string) {
    if (confirm('Remove this distribution record?')) {
      await deleteDistribution(id)
    }
    setActiveMenu(null)
  }

  if (jobLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/jobs/${params.id}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to job
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Distribute: {job?.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Post this job to external boards and track performance
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Channel
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      {jobDistributions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <span className="text-xs font-medium text-muted-foreground">Channels</span>
            <p className="text-xl font-bold">{jobDistributions.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-xs font-medium text-muted-foreground">Total Impressions</span>
            <p className="text-xl font-bold tabular-nums">
              {jobDistributions.reduce((sum, d) => sum + (d.impressions ?? 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-xs font-medium text-muted-foreground">Total Clicks</span>
            <p className="text-xl font-bold tabular-nums">
              {jobDistributions.reduce((sum, d) => sum + (d.clicks ?? 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <span className="text-xs font-medium text-muted-foreground">Applications</span>
            <p className="text-xl font-bold tabular-nums">
              {jobDistributions.reduce((sum, d) => sum + (d.applications ?? 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Distribution List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : jobDistributions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Globe className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No distribution channels</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add channels to start posting this job to external boards.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {jobDistributions.map((dist) => {
            const cfg = STATUS_CONFIG[dist.status] ?? STATUS_CONFIG.pending
            const channel = CHANNELS.find((c) => c.value === dist.channel)
            return (
              <div
                key={dist.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                {/* Channel icon & name */}
                <span className="text-lg" aria-hidden="true">{channel?.icon ?? '📋'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{channel?.label ?? dist.channel}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {dist.posted_at && (
                      <span>Posted {new Date(dist.posted_at).toLocaleDateString('en-AU')}</span>
                    )}
                    {dist.expires_at && (
                      <span>· Expires {new Date(dist.expires_at).toLocaleDateString('en-AU')}</span>
                    )}
                    {dist.url && (
                      <a
                        href={dist.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                  <span className="tabular-nums">{dist.impressions ?? 0} views</span>
                  <span className="tabular-nums">{dist.clicks ?? 0} clicks</span>
                  <span className="tabular-nums">{dist.applications ?? 0} apps</span>
                </div>

                {/* Status */}
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>

                {/* Actions */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setActiveMenu(activeMenu === dist.id ? null : dist.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Distribution actions"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {activeMenu === dist.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border bg-popover py-1 shadow-lg">
                        {dist.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPosted(dist.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-muted"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Mark Posted
                          </button>
                        )}
                        {dist.status === 'posted' && (
                          <button
                            onClick={() => handleMarkExpired(dist.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-amber-600 hover:bg-muted"
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Mark Expired
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(dist.id)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Distribution Dialog */}
      {showCreateDialog && tenantId && (
        <CreateDistributionDialog
          existingChannels={jobDistributions.map((d) => d.channel)}
          onSave={async (data) => {
            await createDistribution(tenantId, {
              ...data,
              job_id: params.id as string,
            })
            setShowCreateDialog(false)
          }}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  )
}

function CreateDistributionDialog({
  existingChannels,
  onSave,
  onClose,
}: {
  existingChannels: string[]
  onSave: (data: Partial<JobDistribution>) => Promise<void>
  onClose: () => void
}) {
  const [channel, setChannel] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const availableChannels = CHANNELS.filter((c) => !existingChannels.includes(c.value))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!channel) return
    setSaving(true)
    await onSave({
      channel,
      expires_at: expiresAt || undefined,
      url: url || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Add distribution channel">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Distribution Channel</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Channel <span className="text-destructive">*</span>
            </label>
            {availableChannels.length === 0 ? (
              <p className="text-sm text-muted-foreground">All channels have been added.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableChannels.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => setChannel(ch.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                      channel === ch.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span>{ch.icon}</span>
                    {ch.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Posting URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Expires At</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !channel}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
