import type { Metadata } from 'next'
import { JobDistributeView } from './_view'

export const metadata: Metadata = {
  title: 'Distribute Job',
}

export default function JobDistributePage() {
  return <JobDistributeView />
}
