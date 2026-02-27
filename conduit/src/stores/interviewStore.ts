'use client'

import { createClient } from '@/lib/supabase/client'
import type { Interview, InterviewStatus } from '@/types/entities'
import { create } from 'zustand'

interface InterviewFilters {
  candidateId?: string
  jobId?: string
  status?: InterviewStatus
  from?: string
  to?: string
}

interface InterviewState {
  interviews: Interview[]
  loading: boolean
  error: string | null

  fetchInterviews: (tenantId: string, filters?: InterviewFilters) => Promise<void>
  createInterview: (tenantId: string, data: Partial<Interview>) => Promise<Interview | null>
  updateInterview: (id: string, data: Partial<Interview>) => Promise<boolean>
  deleteInterview: (id: string) => Promise<boolean>
  cancelInterview: (id: string) => Promise<boolean>
  completeInterview: (id: string, feedback?: string, rating?: number) => Promise<boolean>
  syncToCalendar: (id: string, integrationId: string) => Promise<boolean>
}

const SELECT_WITH_JOINS =
  '*, candidate:r7_candidates(id, first_name, last_name, email, avatar_url), job:r7_jobs(id, title, location)'

export const useInterviewStore = create<InterviewState>((set, get) => ({
  interviews: [],
  loading: false,
  error: null,

  fetchInterviews: async (tenantId, filters) => {
    set({ loading: true, error: null })
    const supabase = createClient()

    let query = supabase
      .from('r7_interviews')
      .select(SELECT_WITH_JOINS)
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true })

    if (filters?.candidateId) query = query.eq('candidate_id', filters.candidateId)
    if (filters?.jobId) query = query.eq('job_id', filters.jobId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.from) query = query.gte('scheduled_at', filters.from)
    if (filters?.to) query = query.lte('scheduled_at', filters.to)

    const { data, error } = await query

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ interviews: (data as Interview[]) ?? [], loading: false })
  },

  createInterview: async (tenantId, data) => {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('r7_interviews')
      .insert({
        ...data,
        tenant_id: tenantId,
        status: data.status ?? 'scheduled',
      })
      .select(SELECT_WITH_JOINS)
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }
    const interview = created as Interview
    set((s) => ({ interviews: [...s.interviews, interview].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)) }))
    return interview
  },

  updateInterview: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_interviews').update(data).eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({
      interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }))
    return true
  },

  deleteInterview: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('r7_interviews').delete().eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    set((s) => ({ interviews: s.interviews.filter((i) => i.id !== id) }))
    return true
  },

  cancelInterview: async (id) => {
    return get().updateInterview(id, { status: 'cancelled' as InterviewStatus })
  },

  completeInterview: async (id, feedback, rating) => {
    const data: Partial<Interview> = { status: 'completed' as InterviewStatus }
    if (feedback !== undefined) data.feedback = feedback
    if (rating !== undefined) data.rating = rating
    return get().updateInterview(id, data)
  },

  syncToCalendar: async (id, integrationId) => {
    const interview = get().interviews.find((i) => i.id === id)
    if (!interview) return false

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      set({ error: 'Not authenticated' })
      return false
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      set({ error: 'Supabase URL not configured' })
      return false
    }

    try {
      const endTime = new Date(new Date(interview.scheduled_at).getTime() + interview.duration_minutes * 60000)

      const res = await fetch(`${supabaseUrl}/functions/v1/calendar-integration/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          integration_id: integrationId,
          title: interview.title,
          description: interview.notes || `Interview with ${interview.candidate?.first_name ?? 'candidate'}`,
          start_time: interview.scheduled_at,
          end_time: endTime.toISOString(),
          location: interview.meeting_url || interview.location,
          attendees: (interview.interviewer_emails ?? []).map((email) => ({ email })),
        }),
      })

      const result = await res.json()

      if (!result.success) {
        set({ error: result.error || 'Failed to create calendar event' })
        return false
      }

      await get().updateInterview(id, {
        calendar_event_id: result.event?.id,
        calendar_provider: result.event?.provider,
        calendar_integration_id: integrationId,
      })

      return true
    } catch (err) {
      set({ error: (err as Error).message })
      return false
    }
  },
}))
