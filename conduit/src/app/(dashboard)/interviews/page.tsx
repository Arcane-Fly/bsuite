'use client'

import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog'
import { useTenantId } from '@/hooks/useTenantId'
import { cn } from '@/lib/utils'
import { useCandidateStore } from '@/stores/candidateStore'
import { useInterviewStore } from '@/stores/interviewStore'
import { useJobStore } from '@/stores/jobStore'
import type { Interview, InterviewStatus, InterviewType } from '@/types/entities'
import {
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const STATUS_CONFIG: Record<InterviewStatus, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-50' },
  confirmed: { label: 'Confirmed', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  in_progress: { label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-50' },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-50' },
  no_show: { label: 'No Show', color: 'text-red-600', bg: 'bg-red-50' },
}

const TYPE_CONFIG: Record<InterviewType, { label: string; icon: string }> = {
  in_person: { label: 'In Person', icon: '🏢' },
  phone: { label: 'Phone', icon: '📞' },
  video: { label: 'Video', icon: '🎥' },
  panel: { label: 'Panel', icon: '👥' },
  technical: { label: 'Technical', icon: '💻' },
  group: { label: 'Group', icon: '👤' },
}

const STATUS_TABS: Array<{ value: InterviewStatus | 'all' | 'upcoming'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function InterviewsPage() {
  const { tenantId } = useTenantId()
  const { requestConfirm, dialogProps } = useConfirmDialog()
  const {
    interviews,
    loading,
    error,
    fetchInterviews,
    createInterview,
    cancelInterview,
    completeInterview,
    deleteInterview,
  } = useInterviewStore()
  const { candidates, fetchCandidates } = useCandidateStore()
  const { jobs, fetchJobs } = useJobStore()

  const [statusFilter, setStatusFilter] = useState<InterviewStatus | 'all' | 'upcoming'>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [feedbackDialog, setFeedbackDialog] = useState<Interview | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    if (tenantId) {
      fetchInterviews(tenantId)
      fetchCandidates(tenantId)
      fetchJobs(tenantId)
    }
  }, [tenantId, fetchInterviews, fetchCandidates, fetchJobs])

  const filteredInterviews = useMemo(() => {
    const now = new Date().toISOString()
    let result = interviews

    if (statusFilter === 'upcoming') {
      result = result.filter(
        (i) => i.scheduled_at >= now && i.status !== 'cancelled' && i.status !== 'completed' && i.status !== 'no_show'
      )
    } else if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.candidate?.first_name?.toLowerCase().includes(q) ||
          i.candidate?.last_name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [interviews, statusFilter, searchQuery])

  const statusCounts = useMemo(() => {
    const now = new Date().toISOString()
    const counts: Record<string, number> = { all: interviews.length }
    counts.upcoming = interviews.filter(
      (i) => i.scheduled_at >= now && i.status !== 'cancelled' && i.status !== 'completed' && i.status !== 'no_show'
    ).length
    for (const i of interviews) {
      counts[i.status] = (counts[i.status] ?? 0) + 1
    }
    return counts
  }, [interviews])

  function formatDateTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function isToday(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }

  function isPast(iso: string) {
    return new Date(iso) < new Date()
  }

  function handleCancel(id: string) {
    setActiveMenu(null)
    requestConfirm(
      { title: 'Cancel Interview', description: 'Cancel this interview?', confirmLabel: 'Cancel Interview', variant: 'warning' },
      async () => { await cancelInterview(id) },
    )
  }

  function handleDelete(id: string) {
    setActiveMenu(null)
    requestConfirm(
      { title: 'Delete Interview', description: 'Delete this interview? This cannot be undone.' },
      async () => { await deleteInterview(id) },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and manage candidate interviews
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Schedule Interview
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
            )}
          >
            {tab.label}
            {(statusCounts[tab.value] ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {statusCounts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by title or candidate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <CalendarDays className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">
            {interviews.length === 0 ? 'No interviews scheduled' : 'No matching interviews'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {interviews.length === 0
              ? 'Schedule your first interview to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filteredInterviews.map((interview) => {
            const cfg = STATUS_CONFIG[interview.status]
            const typeCfg = TYPE_CONFIG[interview.interview_type] ?? TYPE_CONFIG.in_person
            const today = isToday(interview.scheduled_at)
            const past = isPast(interview.scheduled_at)

            return (
              <div
                key={interview.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30',
                  today && interview.status !== 'cancelled' && 'border-l-2 border-l-primary'
                )}
              >
                {/* Type icon */}
                <span className="text-lg shrink-0" aria-hidden="true" title={typeCfg.label}>
                  {typeCfg.icon}
                </span>

                {/* Main info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{interview.title}</p>
                    {today && interview.status !== 'cancelled' && (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {interview.candidate && (
                      <span>{interview.candidate.first_name} {interview.candidate.last_name}</span>
                    )}
                    {interview.job && (
                      <span>· {interview.job.title}</span>
                    )}
                  </div>
                </div>

                {/* Date/time */}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className={cn('text-xs font-medium', past && interview.status === 'scheduled' ? 'text-amber-600' : 'text-muted-foreground')}>
                    {formatDateTime(interview.scheduled_at)}
                  </p>
                  <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {interview.duration_minutes}min
                  </p>
                </div>

                {/* Location */}
                {(interview.location || interview.meeting_url) && (
                  <div className="hidden shrink-0 md:block">
                    {interview.meeting_url ? (
                      <a
                        href={interview.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Video className="h-3 w-3" aria-hidden="true" />
                        Join
                        <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        <span className="max-w-[120px] truncate">{interview.location}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Rating */}
                {interview.rating && (
                  <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
                    {Array.from({ length: interview.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                )}

                {/* Status */}
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>

                {/* Actions */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setActiveMenu(activeMenu === interview.id ? null : interview.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Interview actions"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {activeMenu === interview.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-popover py-1 shadow-lg">
                        {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                          <button
                            onClick={() => { setFeedbackDialog(interview); setActiveMenu(null) }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-muted"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Complete & Rate
                          </button>
                        )}

                        {(interview.status === 'scheduled' || interview.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(interview.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-amber-600 hover:bg-muted"
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Cancel
                          </button>
                        )}

                        {(interview.status === 'cancelled' || interview.status === 'completed' || interview.status === 'no_show') && (
                          <button
                            onClick={() => handleDelete(interview.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Schedule Dialog */}
      {showCreateDialog && tenantId && (
        <ScheduleDialog
          candidates={candidates}
          jobs={jobs}
          onSave={async (data) => {
            await createInterview(tenantId, data)
            setShowCreateDialog(false)
          }}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {/* Feedback Dialog */}
      {feedbackDialog && (
        <FeedbackDialog
          interview={feedbackDialog}
          onSave={async (feedback, rating) => {
            await completeInterview(feedbackDialog.id, feedback, rating)
            setFeedbackDialog(null)
          }}
          onClose={() => setFeedbackDialog(null)}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

function ScheduleDialog({
  candidates,
  jobs,
  onSave,
  onClose,
}: {
  candidates: Array<{ id: string; first_name: string; last_name: string; email?: string }>
  jobs: Array<{ id: string; title: string }>
  onSave: (data: Partial<Interview>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    candidate_id: '',
    job_id: '',
    title: '',
    interview_type: 'video' as InterviewType,
    scheduled_at: '',
    duration_minutes: '60',
    location: '',
    meeting_url: '',
    interviewer_names: '',
    interviewer_emails: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.candidate_id || !form.title || !form.scheduled_at) return
    setSaving(true)
    await onSave({
      candidate_id: form.candidate_id,
      job_id: form.job_id || undefined,
      title: form.title,
      interview_type: form.interview_type,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes) || 60,
      location: form.location || undefined,
      meeting_url: form.meeting_url || undefined,
      interviewer_names: form.interviewer_names ? form.interviewer_names.split(',').map((s) => s.trim()) : undefined,
      interviewer_emails: form.interviewer_emails ? form.interviewer_emails.split(',').map((s) => s.trim()) : undefined,
      notes: form.notes || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Schedule interview">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Schedule Interview</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Candidate */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Candidate <span className="text-destructive">*</span>
            </label>
            <select
              value={form.candidate_id}
              onChange={(e) => setForm((f) => ({ ...f, candidate_id: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Select candidate...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Job */}
          <div>
            <label className="mb-1 block text-sm font-medium">Job (optional)</label>
            <select
              value={form.job_id}
              onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No job linked</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Technical Interview - Round 2"
              required
            />
          </div>

          {/* Type & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={form.interview_type}
                onChange={(e) => setForm((f) => ({ ...f, interview_type: e.target.value as InterviewType }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="video">Video</option>
                <option value="in_person">In Person</option>
                <option value="phone">Phone</option>
                <option value="panel">Panel</option>
                <option value="technical">Technical</option>
                <option value="group">Group</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Duration (min)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min="15"
                step="15"
              />
            </div>
          </div>

          {/* Date/Time */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Date & Time <span className="text-destructive">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Location / Meeting URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Office, Room 2A"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Meeting URL</label>
              <input
                type="url"
                value={form.meeting_url}
                onChange={(e) => setForm((f) => ({ ...f, meeting_url: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          {/* Interviewers */}
          <div>
            <label className="mb-1 block text-sm font-medium">Interviewer Names</label>
            <input
              type="text"
              value={form.interviewer_names}
              onChange={(e) => setForm((f) => ({ ...f, interviewer_names: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Jane Smith, John Doe (comma-separated)"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Interviewer Emails</label>
            <input
              type="text"
              value={form.interviewer_emails}
              onChange={(e) => setForm((f) => ({ ...f, interviewer_emails: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="jane@company.com, john@company.com"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Interview preparation notes..."
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
              disabled={saving || !form.candidate_id || !form.title || !form.scheduled_at}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeedbackDialog({
  interview,
  onSave,
  onClose,
}: {
  interview: Interview
  onSave: (feedback: string, rating: number) => Promise<void>
  onClose: () => void
}) {
  const [feedback, setFeedback] = useState(interview.feedback ?? '')
  const [rating, setRating] = useState(interview.rating ?? 3)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(feedback, rating)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Interview feedback">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Complete Interview</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {interview.title} — {interview.candidate?.first_name} {interview.candidate?.last_name}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="mb-2 block text-sm font-medium">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRating(val)}
                  className="rounded p-1 transition-colors hover:bg-muted"
                  aria-label={`${val} star${val > 1 ? 's' : ''}`}
                >
                  <Star
                    className={cn(
                      'h-6 w-6',
                      val <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    )}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="mb-1 block text-sm font-medium">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
              placeholder="How did the interview go? Strengths, weaknesses, recommendation..."
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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Mark Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
