import type { Metadata } from 'next'
import { NewCandidateView } from './_view'

export const metadata: Metadata = {
  title: 'New Candidate',
  description: 'Add a new candidate to your talent pool',
}

export default function NewCandidatePage() {
  return <NewCandidateView />
}
