import type { JodieSupabaseConfig, JodieWebhookQueueInsert } from './types'

interface SupabaseRpcResponse {
  inserted: boolean
}

function isSupabaseRpcResponse(value: unknown): value is SupabaseRpcResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'inserted' in value && typeof value.inserted === 'boolean'
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function supabaseHeaders(config: JodieSupabaseConfig): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
  }
}

export async function enqueueWebhookDelivery(
  config: JodieSupabaseConfig,
  delivery: JodieWebhookQueueInsert,
): Promise<boolean> {
  const endpoint = `${trimTrailingSlash(config.supabaseUrl)}/rest/v1/rpc/enqueue_jodie_webhook`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: supabaseHeaders(config),
    body: JSON.stringify({
      p_delivery_guid: delivery.deliveryGuid,
      p_event_name: delivery.eventName,
      p_action: delivery.action,
      p_payload: delivery.payload,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Supabase enqueue failed (${response.status}): ${body}`)
  }

  const data = await response.json()
  if (!isSupabaseRpcResponse(data)) {
    throw new Error('Supabase enqueue response did not include inserted boolean')
  }

  return data.inserted
}
