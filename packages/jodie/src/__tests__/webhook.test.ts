import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { processGitHubWebhook } from '../webhook'

function sign(secret: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

describe('processGitHubWebhook', () => {
  const webhookSecret = 'top-secret'
  const payload = JSON.stringify({ action: 'opened', issue: { number: 1 } })

  it('returns 401 when signature is invalid', async () => {
    const result = await processGitHubWebhook({
      headers: new Headers({
        'x-hub-signature-256': 'sha256=deadbeef',
        'x-github-delivery': 'delivery-1',
        'x-github-event': 'issues',
      }),
      body: payload,
      config: {
        webhookSecret,
        supabaseUrl: 'https://example.supabase.co',
        supabaseServiceRoleKey: 'service-role',
      },
    })

    expect(result.status).toBe(401)
    expect(result.body.accepted).toBe(false)
  })

  it('acknowledges duplicate delivery idempotently', async () => {
    const enqueueDelivery = vi.fn().mockResolvedValue(false)

    const result = await processGitHubWebhook({
      headers: new Headers({
        'x-hub-signature-256': sign(webhookSecret, payload),
        'x-github-delivery': 'delivery-2',
        'x-github-event': 'issues',
      }),
      body: payload,
      config: {
        webhookSecret,
        supabaseUrl: 'https://example.supabase.co',
        supabaseServiceRoleKey: 'service-role',
        enqueueDelivery,
      },
    })

    expect(enqueueDelivery).toHaveBeenCalledTimes(1)
    expect(result.status).toBe(200)
    expect(result.body.accepted).toBe(true)
    expect(result.body.duplicate).toBe(true)
  })

  it('returns 202 for unsupported events without enqueueing', async () => {
    const enqueueDelivery = vi.fn()

    const result = await processGitHubWebhook({
      headers: new Headers({
        'x-hub-signature-256': sign(webhookSecret, payload),
        'x-github-delivery': 'delivery-3',
        'x-github-event': 'release',
      }),
      body: payload,
      config: {
        webhookSecret,
        supabaseUrl: 'https://example.supabase.co',
        supabaseServiceRoleKey: 'service-role',
        enqueueDelivery,
      },
    })

    expect(result.status).toBe(202)
    expect(result.body.accepted).toBe(false)
    expect(enqueueDelivery).not.toHaveBeenCalled()
  })
})
