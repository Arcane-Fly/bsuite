import type { Metadata } from 'next'
import { OnboardingView } from './_view'

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Track apprentice and candidate onboarding progress',
}

export default function OnboardingPage() {
  return <OnboardingView />
}
