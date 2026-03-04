import type { Metadata } from 'next'
import { OffersView } from './_view'

export const metadata: Metadata = {
  title: 'Offers',
  description: 'Manage employment offers and acceptances',
}

export default function OffersPage() {
  return <OffersView />
}
