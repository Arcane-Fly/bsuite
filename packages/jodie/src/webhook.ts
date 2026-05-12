import { enqueueWebhookDelivery } from './supabase-rest'
import { dispatchWebhookEvent } from './event-handlers'
import { verifyGitHubWebhookSignature } from './signature'
import type { WebhookProcessInput, WebhookProcessResult } from './types'

export async function processGitHubWebhook(input: WebhookProcessInput): Promise<WebhookProcessResult> {
  const { headers, body, config } = input

  const signature = headers.get('x-hub-signature-256')
  const deliveryGuid = headers.get('x-github-delivery')
  const eventName = headers.get('x-github-event')

  const isSignatureValid = verifyGitHubWebhookSignature({
    webhookSecret: config.webhookSecret,
    payload: body,
    signatureHeader: signature,
  })

  if (!isSignatureValid) {
    return {
      status: 401,
      body: {
        accepted: false,
        message: 'Invalid webhook signature',
      },
    }
  }

  if (!deliveryGuid || !eventName) {
    return {
      status: 400,
      body: {
        accepted: false,
        message: 'Missing required GitHub delivery metadata',
      },
    }
  }

  let parsedPayload: Record<string, unknown>
  try {
    parsedPayload = JSON.parse(body) as Record<string, unknown>
  } catch {
    return {
      status: 400,
      body: {
        accepted: false,
        message: 'Invalid JSON payload',
      },
    }
  }

  const actionValue = parsedPayload.action
  const action = typeof actionValue === 'string' ? actionValue : null
  const handledEvent = dispatchWebhookEvent(eventName, action, parsedPayload)

  if (!handledEvent) {
    return {
      status: 202,
      body: {
        accepted: false,
        message: `Event not subscribed for Jodie: ${eventName}.${action ?? 'unknown'}`,
      },
    }
  }

  const enqueue =
    config.enqueueDelivery ??
    ((delivery) =>
      enqueueWebhookDelivery(
        {
          supabaseUrl: config.supabaseUrl,
          supabaseServiceRoleKey: config.supabaseServiceRoleKey,
        },
        delivery,
      ))

  const inserted = await enqueue({
    deliveryGuid,
    eventName: handledEvent.eventKey,
    action,
    payload: handledEvent.payload,
  })

  if (!inserted) {
    return {
      status: 200,
      body: {
        accepted: true,
        duplicate: true,
        message: 'Delivery already processed',
      },
    }
  }

  return {
    status: 200,
    body: {
      accepted: true,
      message: 'Webhook enqueued',
    },
  }
}
