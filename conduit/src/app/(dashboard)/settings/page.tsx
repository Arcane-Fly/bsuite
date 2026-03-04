import type { Metadata } from 'next'
import { SettingsView } from './_view'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your Conduit workspace',
}

export default function SettingsPage() {
  return <SettingsView />
}
