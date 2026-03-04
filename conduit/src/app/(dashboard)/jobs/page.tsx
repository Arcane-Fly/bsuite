import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/getTenantContext'
import { fetchJobs } from '@/services/jobService'
import { JobsView } from './_view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jobs',
  description: 'Manage job postings and recruitment pipeline',
}

export default async function JobsPage() {
  const context = await getTenantContext()
  if (!context) redirect('/auth/login')

  const initialData = await fetchJobs(context.tenantId, {}, true)

  return (
    <JobsView
      tenantId={context.tenantId}
      initialJobs={initialData.jobs}
      initialTotalCount={initialData.totalCount}
    />
  )
}
