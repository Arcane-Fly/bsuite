'use client'

import { useEffect } from 'react'
import { useCommunicationStore } from '@/stores/communicationStore'
import { CommunicationItem } from './CommunicationItem'
import { EmptyState } from '@/components/common/EmptyState'
import { MessageSquare, Loader2 } from 'lucide-react'

interface CommunicationTimelineProps {
  tenantId: string
  candidateId?: string
  employerId?: string
}

export function CommunicationTimeline({
  tenantId,
  candidateId,
  employerId,
}: CommunicationTimelineProps) {
  const {
    communications,
    loading,
    error,
    fetchForCandidate,
    fetchForEmployer,
    fetchCommunications,
  } = useCommunicationStore()

  useEffect(() => {
    if (candidateId) {
      fetchForCandidate(tenantId, candidateId)
    } else if (employerId) {
      fetchForEmployer(tenantId, employerId)
    } else {
      fetchCommunications(tenantId)
    }
  }, [tenantId, candidateId, employerId, fetchForCandidate, fetchForEmployer, fetchCommunications])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load communications: {error}
      </div>
    )
  }

  if (communications.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No communications yet"
        description="Send an email, SMS, or log a note to start the conversation history."
      />
    )
  }

  return (
    <div className="divide-y">
      {communications.map((comm) => (
        <CommunicationItem key={comm.id} communication={comm} />
      ))}
    </div>
  )
}
