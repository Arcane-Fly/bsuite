'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useJobStore } from '@/stores/jobStore'
import { useTenantId } from '@/hooks/useTenantId'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contract', label: 'Contract' },
  { value: 'apprenticeship', label: 'Apprenticeship' },
  { value: 'traineeship', label: 'Traineeship' },
]

const SALARY_TYPES = [
  { value: 'hourly', label: 'Per Hour' },
  { value: 'weekly', label: 'Per Week' },
  { value: 'annual', label: 'Per Year' },
]

export function NewJobView() {
  const router = useRouter()
  const { tenantId } = useTenantId()
  const { createJob } = useJobStore()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    short_description: '',
    location: '',
    employment_type: '',
    salary_min: '',
    salary_max: '',
    salary_type: 'annual',
    closing_date: '',
    award_code: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return

    setSaving(true)
    const job = await createJob(tenantId, {
      title: form.title,
      description: form.description || undefined,
      short_description: form.short_description || undefined,
      location: form.location || undefined,
      employment_type: (form.employment_type || undefined) as
        | 'full_time' | 'part_time' | 'casual' | 'contract' | 'apprenticeship' | 'traineeship'
        | undefined,
      salary_min: form.salary_min ? parseFloat(form.salary_min) : undefined,
      salary_max: form.salary_max ? parseFloat(form.salary_max) : undefined,
      salary_type: (form.salary_type || undefined) as 'hourly' | 'weekly' | 'annual' | undefined,
      closing_date: form.closing_date || undefined,
      award_code: form.award_code || undefined,
      status: 'draft',
    })
    setSaving(false)

    if (job) {
      toast.success('Job created as draft')
      router.push(`/jobs/${job.id}`)
    } else {
      toast.error('Failed to create job')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs" className="rounded-md p-2 hover:bg-muted" aria-label="Back to jobs">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Job Posting</h1>
          <p className="text-sm text-muted-foreground">
            Job will be saved as draft — publish when ready
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Job Details */}
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 text-sm font-medium">Job Details</legend>
          <div className="space-y-1">
            <label htmlFor="job-title" className="text-sm font-medium">Job Title *</label>
            <input
              id="job-title"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Electrical Apprentice — Year 1"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="job-short-desc" className="text-sm font-medium">Short Description</label>
            <input
              id="job-short-desc"
              value={form.short_description}
              onChange={(e) => updateField('short_description', e.target.value)}
              placeholder="Brief one-liner for listing cards"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="job-description" className="text-sm font-medium">Full Description</label>
            <textarea
              id="job-description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={6}
              placeholder="Detailed job description, responsibilities, requirements..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </fieldset>

        {/* Employment & Location */}
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 text-sm font-medium">Employment & Location</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="job-employment-type" className="text-sm font-medium">Employment Type</label>
              <select
                id="job-employment-type"
                value={form.employment_type}
                onChange={(e) => updateField('employment_type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="job-location" className="text-sm font-medium">Location</label>
              <input
                id="job-location"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. Sydney CBD"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="job-award-code" className="text-sm font-medium">Award Code</label>
            <input
              id="job-award-code"
              value={form.award_code}
              onChange={(e) => updateField('award_code', e.target.value)}
              placeholder="e.g. MA000027"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="job-closing-date" className="text-sm font-medium">Closing Date</label>
            <input
              id="job-closing-date"
              type="date"
              value={form.closing_date}
              onChange={(e) => updateField('closing_date', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </fieldset>

        {/* Salary */}
        <fieldset className="space-y-4 rounded-lg border p-4">
          <legend className="px-2 text-sm font-medium">Salary</legend>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="job-salary-min" className="text-sm font-medium">Minimum ($)</label>
              <input
                id="job-salary-min"
                type="number"
                step="0.01"
                value={form.salary_min}
                onChange={(e) => updateField('salary_min', e.target.value)}
                placeholder="e.g. 55000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="job-salary-max" className="text-sm font-medium">Maximum ($)</label>
              <input
                id="job-salary-max"
                type="number"
                step="0.01"
                value={form.salary_max}
                onChange={(e) => updateField('salary_max', e.target.value)}
                placeholder="e.g. 70000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="job-salary-type" className="text-sm font-medium">Rate Type</label>
              <select
                id="job-salary-type"
                value={form.salary_type}
                onChange={(e) => updateField('salary_type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SALARY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !form.title}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <Link
            href="/jobs"
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
