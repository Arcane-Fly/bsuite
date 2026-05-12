import { createAppAuth } from '@octokit/auth-app'
import type {
  JodieCachedInstallationToken,
  JodieInstallationTokenConfig,
  JodieInstallationTokenResult,
  JodieSupabaseConfig,
} from './types'

interface InstallationAuthResponse {
  token: string
  expiresAt: string
}

interface AuthFunction {
  (options: { type: 'installation'; installationId: number }): Promise<InstallationAuthResponse>
}

interface AuthFactory {
  (options: { appId: number; privateKey: string }): AuthFunction
}

interface TokenDeps {
  fetchImpl?: typeof fetch
  authFactory?: AuthFactory
  now?: () => Date
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

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value
}

async function readCachedToken(
  config: JodieInstallationTokenConfig,
  deps: TokenDeps,
): Promise<JodieCachedInstallationToken | null> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const endpoint = `${trimTrailingSlash(
    config.supabaseUrl,
  )}/rest/v1/jodie_app_installations?installation_id=eq.${config.installationId}&select=access_token,token_expires_at&limit=1`

  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: supabaseHeaders(config),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed reading installation cache (${response.status}): ${body}`)
  }

  const rows = (await response.json()) as Array<{
    access_token: string
    token_expires_at: string
  }>

  if (rows.length === 0) {
    return null
  }

  return {
    accessToken: rows[0].access_token,
    tokenExpiresAt: rows[0].token_expires_at,
  }
}

async function writeCachedToken(
  config: JodieInstallationTokenConfig,
  deps: TokenDeps,
  token: string,
  expiresAt: string,
): Promise<void> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const endpoint = `${trimTrailingSlash(config.supabaseUrl)}/rest/v1/jodie_app_installations?on_conflict=installation_id`

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      ...supabaseHeaders(config),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      installation_id: config.installationId,
      access_token: token,
      token_expires_at: expiresAt,
      refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed writing installation cache (${response.status}): ${body}`)
  }
}

function isTokenFresh(
  cachedToken: JodieCachedInstallationToken,
  currentTime: Date,
  refreshSkewSeconds: number,
): boolean {
  const refreshCutoff = new Date(cachedToken.tokenExpiresAt)
  refreshCutoff.setSeconds(refreshCutoff.getSeconds() - refreshSkewSeconds)
  return refreshCutoff.getTime() > currentTime.getTime()
}

export async function getJodieInstallationToken(
  config: JodieInstallationTokenConfig,
  deps: TokenDeps = {},
): Promise<JodieInstallationTokenResult> {
  const now = deps.now ?? (() => new Date())
  const currentTime = now()
  const refreshSkewSeconds = config.refreshSkewSeconds ?? 300

  const cached = await readCachedToken(config, deps)
  if (cached && isTokenFresh(cached, currentTime, refreshSkewSeconds)) {
    return {
      token: cached.accessToken,
      expiresAt: toIso(cached.tokenExpiresAt),
      cacheHit: true,
    }
  }

  const authFactory = deps.authFactory ?? ((createAppAuth as unknown) as AuthFactory)
  const auth = authFactory({
    appId: config.appId,
    privateKey: config.privateKey,
  })

  const installationAuth = await auth({
    type: 'installation',
    installationId: config.installationId,
  })

  await writeCachedToken(config, deps, installationAuth.token, installationAuth.expiresAt)

  return {
    token: installationAuth.token,
    expiresAt: toIso(installationAuth.expiresAt),
    cacheHit: false,
  }
}
