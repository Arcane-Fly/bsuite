import type { Metadata } from 'next'
import { InterviewsView } from './_view'

export const metadata: Metadata = {
  title: 'Interviews',
  description: 'Schedule and manage candidate interviews',
}

export default function InterviewsPage() {
  return <InterviewsView />
}
