import type { Metadata } from 'next'
import { CandidateDetailView } from './_view'

export const metadata: Metadata = {
  title: 'Candidate Details',
}

export default function CandidateDetailsPage() {
  return <CandidateDetailView />
}
