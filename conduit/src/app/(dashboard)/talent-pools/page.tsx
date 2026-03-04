import type { Metadata } from 'next'
import { TalentPoolsView } from './_view'

export const metadata: Metadata = {
  title: 'Talent Pools',
  description: 'Manage curated talent pools for placement',
}

export default function TalentPoolsPage() {
  return <TalentPoolsView />
}
