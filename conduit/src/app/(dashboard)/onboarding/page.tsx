'use client'

import { ConfirmDialog, useConfirmDialog } from '@/components/common/ConfirmDialog'
import { useTenantId } from '@/hooks/useTenantId'
import { cn } from '@/lib/utils'
import { useOnboardingStore } from '@/stores/onboardingStore'
import {
    CheckCircle2,
    ClipboardCheck,
    Clock,
    FileText,
    Plus,
    Trash2,
    Users,
    XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type Tab = 'instances' | 'templates'

const INSTANCE_STATUS_ICON: Record<string, typeof Clock> = {
  not_started: Clock,
  in_progress: ClipboardCheck,
  completed: CheckCircle2,
  cancelled: XCircle,
}

const INSTANCE_STATUS_COLOR: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function OnboardingPage() {
  const { requestConfirm, dialogProps } = useConfirmDialog()
  const { tenantId } = useTenantId()
  const {
    templates,
    instances,
    loading,
    fetchTemplates,
    fetchInstances,
    createTemplate,
    deleteTemplate,
  } = useOnboardingStore()
  const [tab, setTab] = useState<Tab>('instances')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    entity_type: 'candidate' as 'candidate' | 'employer',
  })

  useEffect(() => {
    if (tenantId) {
      fetchTemplates(tenantId)
      fetchInstances(tenantId)
    }
  }, [tenantId, fetchTemplates, fetchInstances])

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    const created = await createTemplate(tenantId, {
      name: form.name,
      description: form.description || undefined,
      entity_type: form.entity_type,
      tasks: [],
    })
    if (created) {
      toast.success('Template created')
      setShowCreate(false)
      setForm({ name: '', description: '', entity_type: 'candidate' })
    } else {
      toast.error('Failed to create template')
    }
  }

  function handleDeleteTemplate(id: string, name: string) {
    requestConfirm(
      { title: 'Delete Template', description: `Delete template "${name}"?` },
      async () => {
        const ok = await deleteTemplate(id)
        if (ok) toast.success('Template deleted')
        else toast.error('Failed to delete')
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-sm text-muted-foreground">
            Track onboarding progress for candidates and employers
          </p>
        </div>
        {tab === 'templates' && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Template
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('instances')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            tab === 'instances'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Active Onboarding ({instances.length})
        </button>
        <button
          onClick={() => setTab('templates')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            tab === 'templates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Templates ({templates.length})
        </button>
      </div>

      {/* Create Template Form */}
      {showCreate && tab === 'templates' && (
        <form onSubmit={handleCreateTemplate} className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">New Onboarding Template</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="onboarding-template-name" className="text-sm font-medium">Name *</label>
              <input
                id="onboarding-template-name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. New Apprentice Onboarding"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="onboarding-entity-type" className="text-sm font-medium">Entity Type</label>
              <select
                id="onboarding-entity-type"
                value={form.entity_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, entity_type: e.target.value as 'candidate' | 'employer' }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="candidate">Candidate</option>
                <option value="employer">Employer</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="onboarding-template-desc" className="text-sm font-medium">Description</label>
            <textarea
              id="onboarding-template-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create Template
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tab === 'instances' ? (
        instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-medium">No active onboarding</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Onboarding instances will appear here when candidates are hired.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {instances.map((inst) => {
              const StatusIcon = INSTANCE_STATUS_ICON[inst.status] ?? Clock
              return (
                <div key={inst.id} className="flex items-center gap-4 p-4">
                  <StatusIcon className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Instance #{inst.id.slice(0, 8)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          INSTANCE_STATUS_COLOR[inst.status] ?? 'bg-gray-100 text-gray-800'
                        )}
                      >
                        {inst.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Progress: {inst.progress_percent}%</span>
                      {inst.started_at && (
                        <span>
                          Started {new Date(inst.started_at).toLocaleDateString('en-AU')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-24 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${inst.progress_percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-medium">No templates yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create onboarding templates to standardize your process.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="group rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h3 className="font-medium">{tmpl.name}</h3>
                </div>
                <button
                  onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                  className="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                  aria-label={`Delete ${tmpl.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                </button>
              </div>
              {tmpl.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{tmpl.description}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {tmpl.entity_type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tmpl.tasks.length} task{tmpl.tasks.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
