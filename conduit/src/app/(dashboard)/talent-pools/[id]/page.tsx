import type { Metadata } from 'next'
import { TalentPoolDetailView } from './_view'

export const metadata: Metadata = {
  title: 'Talent Pool',
}

export default function TalentPoolDetailPage() {
  return <TalentPoolDetailView />
}
