'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { sendEmail, sendSms, recordNote } from '@/lib/communicationService'
import { useCommunicationStore } from '@/stores/communicationStore'
import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Send,
  Loader2,
  X,
} from 'lucide-react'

const composeSchema = z.object({
  channel: z.enum(['email', 'sms', 'phone', 'note']),
  to: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body is required'),
})

type ComposeFormData = z.infer<typeof composeSchema>

interface ComposeDialogProps {
  tenantId: string
  candidateId?: string
  employerId?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const channelTabs = [
  { value: 'email' as const, icon: Mail, label: 'Email' },
  { value: 'sms' as const, icon: MessageSquare, label: 'SMS' },
  { value: 'phone' as const, icon: Phone, label: 'Phone Log' },
  { value: 'note' as const, icon: StickyNote, label: 'Note' },
]

export function ComposeDialog({
  tenantId,
  candidateId,
  employerId,
  recipientEmail,
  recipientPhone,
  recipientName,
  open,
  onOpenChange,
  onSuccess,
}: ComposeDialogProps) {
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const { fetchForCandidate, fetchForEmployer } = useCommunicationStore()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      channel: 'email',
      to: recipientEmail ?? '',
      subject: '',
      body: '',
    },
  })

  const channel = watch('channel')

  const onSubmit = async (data: ComposeFormData) => {
    setSending(true)
    setSendError(null)

    let result: { success: boolean; error?: string }

    if (data.channel === 'email') {
      result = await sendEmail(tenantId, {
        to: data.to ?? recipientEmail ?? '',
        subject: data.subject ?? '',
        body: data.body,
        candidate_id: candidateId,
        employer_id: employerId,
      })
    } else if (data.channel === 'sms') {
      result = await sendSms(tenantId, {
        to: data.to ?? recipientPhone ?? '',
        body: data.body,
        candidate_id: candidateId,
        employer_id: employerId,
      })
    } else {
      result = await recordNote(tenantId, {
        candidate_id: candidateId,
        employer_id: employerId,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
      })
    }

    setSending(false)

    if (!result.success) {
      setSendError(result.error ?? 'Failed to send')
      return
    }

    // Refresh the timeline
    if (candidateId) {
      await fetchForCandidate(tenantId, candidateId)
    } else if (employerId) {
      await fetchForEmployer(tenantId, employerId)
    }

    reset()
    onOpenChange(false)
    onSuccess?.()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="compose-dialog-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="compose-dialog-title" className="text-lg font-semibold">
            New Communication
            {recipientName && (
              <span className="text-muted-foreground font-normal">
                {' '}— {recipientName}
              </span>
            )}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 mb-4 rounded-lg bg-muted p-1">
          {channelTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setValue('channel', tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                channel === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* To field — email/sms only */}
          {(channel === 'email' || channel === 'sms') && (
            <div>
              <label className="text-sm font-medium" htmlFor="compose-to">
                {channel === 'email' ? 'To (email)' : 'To (phone)'}
              </label>
              <input
                id="compose-to"
                {...register('to')}
                placeholder={
                  channel === 'email'
                    ? recipientEmail ?? 'email@example.com'
                    : recipientPhone ?? '+61 400 000 000'
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Subject — email/phone/note only */}
          {channel !== 'sms' && (
            <div>
              <label className="text-sm font-medium" htmlFor="compose-subject">
                Subject
              </label>
              <input
                id="compose-subject"
                {...register('subject')}
                placeholder="Subject line..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Body */}
          <div>
            <label className="text-sm font-medium" htmlFor="compose-body">
              {channel === 'note' ? 'Note' : 'Message'}
            </label>
            <textarea
              id="compose-body"
              {...register('body')}
              rows={6}
              placeholder={
                channel === 'note'
                  ? 'Add a note...'
                  : channel === 'phone'
                    ? 'Log call details...'
                    : 'Type your message...'
              }
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.body && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                {errors.body.message}
              </p>
            )}
          </div>

          {/* Error */}
          {sendError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" role="alert">
              {sendError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {channel === 'note'
                ? 'Save Note'
                : channel === 'phone'
                  ? 'Log Call'
                  : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
