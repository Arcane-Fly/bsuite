import type { Metadata } from 'next'
import { EditJobView } from './_view'

export const metadata: Metadata = {
  title: 'Edit Job',
}

export default function EditJobPage() {
  return <EditJobView />
}
