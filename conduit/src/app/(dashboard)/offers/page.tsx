'use client'

import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog'
import { useTenantId } from '@/hooks/useTenantId'
import { cn } from '@/lib/utils'
import { useCandidateStore } from '@/stores/candidateStore'
import { useJobStore } from '@/stores/jobStore'
import { useOfferStore } from '@/stores/offerStore'
import type { Offer, OfferStatus } from '@/types/entities'
import {
    ArrowRight,
    Check,
    FileText,
    MoreHorizontal,
    Plus,
    Search,
    Send,
    Trash2,
    X,
    XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  sent: { label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-50' },
  accepted: { label: 'Accepted', color: 'text-green-600', bg: 'bg-green-50' },
  declined: { label: 'Declined', color: 'text-red-600', bg: 'bg-red-50' },
  expired: { label: 'Expired', color: 'text-amber-600', bg: 'bg-amber-50' },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-500', bg: 'bg-gray-50' },
}

const STATUS_TABS: Array<{ value: OfferStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function OffersPage() {
  const { tenantId } = useTenantId()
  const { offers, loading, error, fetchOffers, createOffer, sendOffer, withdrawOffer, respondToOffer, deleteOffer } = useOfferStore()
  const { candidates, fetchCandidates } = useCandidateStore()
  const { jobs, fetchJobs } = useJobStore()
  const { requestConfirm, dialogProps } = useConfirmDialog()

  const [statusFilter, setStatusFilter] = useState<OfferStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  useEffect(() => {
    if (tenantId) {
      fetchOffers(tenantId)
      fetchCandidates(tenantId)
      fetchJobs(tenantId)
    }
  }, [tenantId, fetchOffers, fetchCandidates, fetchJobs])

  const filteredOffers = useMemo(() => {
    let result = offers
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (o) =>
          o.position_title.toLowerCase().includes(q) ||
          o.candidate?.first_name?.toLowerCase().includes(q) ||
          o.candidate?.last_name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [offers, statusFilter, searchQuery])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: offers.length }
    for (const o of offers) {
      counts[o.status] = (counts[o.status] ?? 0) + 1
    }
    return counts
  }, [offers])

  async function handleSend(id: string) {
    await sendOffer(id)
    setActiveMenu(null)
  }

  async function handleWithdraw(id: string) {
    await withdrawOffer(id)
    setActiveMenu(null)
  }

  async function handleAccept(id: string) {
    await respondToOffer(id, 'accepted')
    setActiveMenu(null)
  }

  async function handleDecline(id: string) {
    await respondToOffer(id, 'declined')
    setActiveMenu(null)
  }

  function handleDelete(id: string) {
    setActiveMenu(null)
    requestConfirm(
      { title: 'Delete Offer', description: 'Delete this offer? This cannot be undone.' },
      async () => { await deleteOffer(id) },
    )
  }

  function formatCurrency(amount?: number, type?: string) {
    if (!amount) return '—'
    const formatted = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(amount)
    const suffix = type === 'hourly' ? '/hr' : type === 'weekly' ? '/wk' : '/yr'
    return `${formatted}${suffix}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage job offers for candidates
          </p>
        </div>
        <button
          onClick={() => { setEditingOffer(null); setShowCreateDialog(true) }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Offer
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
          placeholder="Search offers by position or candidate..."
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
      ) : filteredOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">
            {offers.length === 0 ? 'No offers yet' : 'No matching offers'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {offers.length === 0
              ? 'Create your first offer to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {filteredOffers.map((offer) => {
            const cfg = STATUS_CONFIG[offer.status]
            return (
              <div
                key={offer.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                {/* Status badge */}
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.bg, cfg.color)}>
                  {cfg.label}
                </span>

                {/* Position & candidate */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{offer.position_title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {offer.candidate
                      ? `${offer.candidate.first_name} ${offer.candidate.last_name}`
                      : 'No candidate linked'}
                    {offer.job && (
                      <>
                        <span className="mx-1">·</span>
                        {offer.job.title}
                      </>
                    )}
                  </p>
                </div>

                {/* Salary */}
                <span className="hidden shrink-0 text-sm tabular-nums text-muted-foreground sm:block">
                  {formatCurrency(offer.salary_amount, offer.salary_type)}
                </span>

                {/* Start date */}
                {offer.start_date && (
                  <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
                    Start: {new Date(offer.start_date).toLocaleDateString('en-AU')}
                  </span>
                )}

                {/* Actions menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setActiveMenu(activeMenu === offer.id ? null : offer.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Offer actions"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {activeMenu === offer.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                      <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-popover py-1 shadow-lg">
                        <button
                          onClick={() => { setEditingOffer(offer); setShowCreateDialog(true); setActiveMenu(null) }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit Details
                        </button>

                        {offer.status === 'draft' && (
                          <button
                            onClick={() => handleSend(offer.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-muted"
                          >
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            Send Offer
                          </button>
                        )}

                        {offer.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleAccept(offer.id)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-muted"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              Mark Accepted
                            </button>
                            <button
                              onClick={() => handleDecline(offer.id)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-muted"
                            >
                              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              Mark Declined
                            </button>
                          </>
                        )}

                        {(offer.status === 'draft' || offer.status === 'sent') && (
                          <button
                            onClick={() => handleWithdraw(offer.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-amber-600 hover:bg-muted"
                          >
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            Withdraw
                          </button>
                        )}

                        {offer.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(offer.id)}
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

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <OfferDialog
          offer={editingOffer}
          candidates={candidates}
          jobs={jobs}
          onSave={async (data) => {
            if (editingOffer) {
              const ok = await useOfferStore.getState().updateOffer(editingOffer.id, data)
              if (ok && tenantId) await fetchOffers(tenantId)
            } else if (tenantId) {
              await createOffer(tenantId, data)
            }
            setShowCreateDialog(false)
            setEditingOffer(null)
          }}
          onClose={() => { setShowCreateDialog(false); setEditingOffer(null) }}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}

function OfferDialog({
  offer,
  candidates,
  jobs,
  onSave,
  onClose,
}: {
  offer: Offer | null
  candidates: Array<{ id: string; first_name: string; last_name: string; email?: string }>
  jobs: Array<{ id: string; title: string }>
  onSave: (data: Partial<Offer>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    candidate_id: offer?.candidate_id ?? '',
    job_id: offer?.job_id ?? '',
    position_title: offer?.position_title ?? '',
    salary_amount: offer?.salary_amount?.toString() ?? '',
    salary_type: offer?.salary_type ?? 'annual',
    start_date: offer?.start_date ?? '',
    expiry_date: offer?.expiry_date ?? '',
    terms: offer?.terms ?? '',
    notes: offer?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.candidate_id || !form.position_title) return
    setSaving(true)
    await onSave({
      candidate_id: form.candidate_id,
      job_id: form.job_id || undefined,
      position_title: form.position_title,
      salary_amount: form.salary_amount ? Number(form.salary_amount) : undefined,
      salary_type: form.salary_type as 'hourly' | 'weekly' | 'annual',
      start_date: form.start_date || undefined,
      expiry_date: form.expiry_date || undefined,
      terms: form.terms || undefined,
      notes: form.notes || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={offer ? 'Edit offer' : 'Create offer'}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {offer ? 'Edit Offer' : 'New Offer'}
          </h2>
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
                  {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ''}
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

          {/* Position Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Position Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.position_title}
              onChange={(e) => setForm((f) => ({ ...f, position_title: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Senior Developer"
              required
            />
          </div>

          {/* Salary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Salary Amount</label>
              <input
                type="number"
                value={form.salary_amount}
                onChange={(e) => setForm((f) => ({ ...f, salary_amount: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="85000"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Salary Type</label>
              <select
                value={form.salary_type}
                onChange={(e) => setForm((f) => ({ ...f, salary_type: e.target.value as 'hourly' | 'weekly' | 'annual' }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="annual">Annual</option>
                <option value="hourly">Hourly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Expiry Date</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Terms */}
          <div>
            <label className="mb-1 block text-sm font-medium">Terms & Conditions</label>
            <textarea
              value={form.terms}
              onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Key terms of employment..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Internal notes (not visible to candidate)..."
            />
          </div>

          {/* Actions */}
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
              disabled={saving || !form.candidate_id || !form.position_title}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : offer ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
