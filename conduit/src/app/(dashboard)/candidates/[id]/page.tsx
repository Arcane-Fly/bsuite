'use client'

import { CommunicationTimeline, ComposeDialog } from '@/components/communications'
import { useTenantId } from '@/hooks/useTenantId'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useCandidateStore } from '@/stores/candidateStore'
import type { Candidate } from '@/types/entities'
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    Clock,
    Edit,
    Mail,
    MapPin,
    MessageSquarePlus,
    Phone,
    Star,
    Trash2,
    User,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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

export default function CandidateProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { tenantId } = useTenantId()
  const { updateCandidate, deleteCandidate } = useCandidateStore()
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Candidate>>({})
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('conduit_candidates')
        .select('*')
        .eq('id', params.id as string)
        .single()

      if (error || !data) {
        toast.error('Candidate not found')
        router.push('/candidates')
        return
      }
      setCandidate(data as Candidate)
      setEditForm(data as Candidate)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function handleSave() {
    if (!candidate) return
    const ok = await updateCandidate(candidate.id, editForm)
    if (ok) {
      setCandidate({ ...candidate, ...editForm })
      setEditing(false)
      toast.success('Candidate updated')
    } else {
      toast.error('Failed to update')
    }
  }

  async function handleDelete() {
    if (!candidate) return
    if (!confirm('Delete this candidate? This cannot be undone.')) return
    const ok = await deleteCandidate(candidate.id)
    if (ok) {
      toast.success('Candidate deleted')
      router.push('/candidates')
    }
  }

  if (loading || !candidate) {
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
          <Link href="/candidates" className="rounded-md p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
            {candidate.first_name[0]}{candidate.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {candidate.first_name} {candidate.last_name}
              </h1>
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                STATUS_COLORS[candidate.status] ?? 'bg-gray-100 text-gray-800'
              )}>
                {candidate.status}
              </span>
            </div>
            {candidate.source && (
              <p className="text-sm text-muted-foreground">Source: {candidate.source}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Edit className="h-4 w-4" />
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={candidate.email} editing={editing} field="email" form={editForm} setForm={setEditForm} />
              <InfoRow icon={Phone} label="Phone" value={candidate.phone} editing={editing} field="phone" form={editForm} setForm={setEditForm} />
              <InfoRow icon={MapPin} label="Location" value={[candidate.suburb, candidate.state, candidate.postcode].filter(Boolean).join(', ') || undefined} />
              <InfoRow icon={Calendar} label="Date of Birth" value={candidate.date_of_birth} />
            </div>
          </div>

          {/* Additional Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Additional Details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={Clock} label="Availability" value={candidate.availability} editing={editing} field="availability" form={editForm} setForm={setEditForm} />
              <InfoRow icon={Briefcase} label="Source" value={candidate.source} />
              <InfoRow icon={Star} label="Rating" value={candidate.rating ? `${candidate.rating}/5` : undefined} />
              <InfoRow icon={User} label="Status" value={candidate.status} />
            </div>
            {candidate.notes && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                {editing ? (
                  <textarea
                    value={editForm.notes ?? ''}
                    onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{candidate.notes}</p>
                )}
              </div>
            )}
          </div>

          {editing && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Save Changes
              </button>
              <button
                onClick={() => { setEditing(false); setEditForm(candidate) }}
                className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Skills */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Skills</h2>
            {candidate.skills && candidate.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills added</p>
            )}
          </div>

          {/* Qualifications */}
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Qualifications</h2>
            {candidate.qualifications && candidate.qualifications.length > 0 ? (
              <div className="space-y-1">
                {candidate.qualifications.map((q) => (
                  <p key={q} className="text-sm">{q}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No qualifications added</p>
            )}
          </div>

          {/* Communications */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Communications</h2>
              <button
                onClick={() => setComposeOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <MessageSquarePlus className="h-3 w-3" />
                New
              </button>
            </div>
            {tenantId && (
              <CommunicationTimeline
                tenantId={tenantId}
                candidateId={candidate.id}
              />
            )}
            <p className="text-xs text-muted-foreground border-t pt-2">
              Created {new Date(candidate.created_at).toLocaleDateString('en-AU')} · Updated {new Date(candidate.updated_at).toLocaleDateString('en-AU')}
            </p>
          </div>
        </div>
      </div>

      {/* Compose dialog */}
      {tenantId && (
        <ComposeDialog
          tenantId={tenantId}
          candidateId={candidate.id}
          recipientEmail={candidate.email ?? undefined}
          recipientPhone={candidate.phone ?? undefined}
          recipientName={`${candidate.first_name} ${candidate.last_name}`}
          open={composeOpen}
          onOpenChange={setComposeOpen}
        />
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  editing,
  field,
  form,
  setForm,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
  editing?: boolean
  field?: string
  form?: Partial<Candidate>
  setForm?: React.Dispatch<React.SetStateAction<Partial<Candidate>>>
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {editing && field && form && setForm ? (
          <input
            value={(form[field as keyof Candidate] as string) ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : (
          <p className="text-sm font-medium truncate">{value || '—'}</p>
        )}
      </div>
    </div>
  )
}
