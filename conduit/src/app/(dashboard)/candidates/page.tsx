import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/getTenantContext'
import { fetchCandidates } from '@/services/candidateService'
import { CandidatesView } from './_view'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Candidates',
  description: 'Manage candidate pipeline and talent pool',
}

export default async function CandidatesPage() {
  const context = await getTenantContext()
  if (!context) redirect('/auth/login')

  // Fetch default view (no filters) for initial render
  const initialData = await fetchCandidates(context.tenantId, {}, true)

  return (
    <CandidatesView
      tenantId={context.tenantId}
      initialCandidates={initialData.candidates}
      initialTotalCount={initialData.totalCount}
    />
  )
}
