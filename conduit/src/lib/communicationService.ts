'use client'

import { createClient } from '@/lib/supabase/client'

export interface SendEmailPayload {
  to: string
  subject: string
  body: string
  from_name?: string
  reply_to?: string
  candidate_id?: string
  employer_id?: string
  template_id?: string
}

export interface SendSmsPayload {
  to: string
  body: string
  candidate_id?: string
  employer_id?: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: 'candidate' | 'employer' | 'general'
  variables: string[]
}

/**
 * Send an email via the shared email-dispatcher Edge Function.
 * Records the communication in r7_communications.
 */
export async function sendEmail(
  tenantId: string,
  payload: SendEmailPayload
): Promise<{ success: boolean; communicationId?: string; error?: string }> {
  const supabase = createClient()

  // Call the shared email-dispatcher Edge Function
  const { data: dispatchResult, error: dispatchError } =
    await supabase.functions.invoke('email-dispatcher', {
      body: {
        to: payload.to,
        subject: payload.subject,
        html: payload.body,
        from_name: payload.from_name,
        reply_to: payload.reply_to,
        source: 'conduit',
      },
    })

  if (dispatchError) {
    return { success: false, error: dispatchError.message }
  }

  // Record the communication
  const { data: comm, error: recordError } = await supabase
    .from('r7_communications')
    .insert({
      tenant_id: tenantId,
      candidate_id: payload.candidate_id ?? null,
      employer_id: payload.employer_id ?? null,
      channel: 'email' as const,
      direction: 'outbound' as const,
      subject: payload.subject,
      body: payload.body,
      sent_at: new Date().toISOString(),
      template_id: payload.template_id ?? null,
    })
    .select('id')
    .single()

  if (recordError) {
    // Email was sent but recording failed — log but don't fail
    console.error('Failed to record communication:', recordError.message)
    return { success: true, error: `Email sent but recording failed: ${recordError.message}` }
  }

  return { success: true, communicationId: comm.id }
}

/**
 * Send an SMS via the shared sms-dispatcher Edge Function.
 * Records the communication in r7_communications.
 */
export async function sendSms(
  tenantId: string,
  payload: SendSmsPayload
): Promise<{ success: boolean; communicationId?: string; error?: string }> {
  const supabase = createClient()

  const { data: dispatchResult, error: dispatchError } =
    await supabase.functions.invoke('sms-dispatcher', {
      body: {
        to: payload.to,
        body: payload.body,
        source: 'conduit',
      },
    })

  if (dispatchError) {
    return { success: false, error: dispatchError.message }
  }

  const { data: comm, error: recordError } = await supabase
    .from('r7_communications')
    .insert({
      tenant_id: tenantId,
      candidate_id: payload.candidate_id ?? null,
      employer_id: payload.employer_id ?? null,
      channel: 'sms' as const,
      direction: 'outbound' as const,
      body: payload.body,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (recordError) {
    console.error('Failed to record SMS communication:', recordError.message)
    return { success: true, error: `SMS sent but recording failed: ${recordError.message}` }
  }

  return { success: true, communicationId: comm.id }
}

/**
 * Record a manual note or phone call on a candidate/employer timeline.
 */
export async function recordNote(
  tenantId: string,
  data: {
    candidate_id?: string
    employer_id?: string
    channel: 'phone' | 'note'
    subject?: string
    body: string
    sent_by?: string
  }
): Promise<{ success: boolean; communicationId?: string; error?: string }> {
  const supabase = createClient()

  const { data: comm, error } = await supabase
    .from('r7_communications')
    .insert({
      tenant_id: tenantId,
      candidate_id: data.candidate_id ?? null,
      employer_id: data.employer_id ?? null,
      channel: data.channel,
      direction: 'outbound' as const,
      subject: data.subject ?? null,
      body: data.body,
      sent_at: new Date().toISOString(),
      sent_by: data.sent_by ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, communicationId: comm.id }
}

/**
 * Fetch email templates for the current tenant.
 */
export async function fetchEmailTemplates(
  tenantId: string
): Promise<{ templates: EmailTemplate[]; error?: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) {
    return { templates: [], error: error.message }
  }

  return { templates: (data as EmailTemplate[]) ?? [] }
}

/**
 * Interpolate template variables into a template body/subject.
 * Variables use {{variable_name}} syntax.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    // Simple literal replacement — no regex needed per BSuite standards
    while (result.includes(placeholder)) {
      result = result.replace(placeholder, value)
    }
  }
  return result
}
