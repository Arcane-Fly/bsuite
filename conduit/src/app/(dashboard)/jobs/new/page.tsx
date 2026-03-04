import type { Metadata } from 'next'
import { NewJobView } from './_view'

export const metadata: Metadata = {
  title: 'New Job',
  description: 'Create a new job posting',
}

export default function NewJobPage() {
  return <NewJobView />
}
