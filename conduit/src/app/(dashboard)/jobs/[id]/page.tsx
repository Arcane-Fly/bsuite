import type { Metadata } from 'next'
import { JobDetailView } from './_view'

export const metadata: Metadata = {
  title: 'Job Details',
}

export default function JobDetailPage() {
  return <JobDetailView />
}
