import type { Metadata } from 'next'
import { PipelineView } from './_view'

export const metadata: Metadata = {
  title: 'Pipeline',
  description: 'Visualise and manage your candidate pipeline',
}

export default function PipelinePage() {
  return <PipelineView />
}
