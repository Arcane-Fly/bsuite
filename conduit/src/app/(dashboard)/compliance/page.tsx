import type { Metadata } from 'next'
import { ComplianceView } from './_view'

export const metadata: Metadata = {
  title: 'Compliance',
  description: 'GTO compliance checks and standards monitoring',
}

export default function CompliancePage() {
  return <ComplianceView />
}
