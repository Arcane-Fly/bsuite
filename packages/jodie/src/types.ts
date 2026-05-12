export interface JodieSupabaseConfig {
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

export interface JodieWebhookQueueInsert {
  deliveryGuid: string
  eventName: string
  action: string | null
  payload: unknown
}

export interface WebhookProcessConfig extends JodieSupabaseConfig {
  webhookSecret: string
  enqueueDelivery?: (delivery: JodieWebhookQueueInsert) => Promise<boolean>
}

export interface WebhookProcessInput {
  headers: Headers
  body: string
  config: WebhookProcessConfig
}

export interface WebhookProcessResult {
  status: number
  body: {
    accepted: boolean
    duplicate?: boolean
    message: string
  }
}

export interface JodieInstallationTokenConfig extends JodieSupabaseConfig {
  appId: number
  privateKey: string
  installationId: number
  refreshSkewSeconds?: number
}

export interface JodieCachedInstallationToken {
  accessToken: string
  tokenExpiresAt: string
}

export interface JodieInstallationTokenResult {
  token: string
  expiresAt: string
  cacheHit: boolean
}
