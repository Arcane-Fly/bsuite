import { describe, expect, it, vi } from 'vitest'
import { getJodieInstallationToken } from '../github-app-token'

describe('getJodieInstallationToken', () => {
  const baseConfig = {
    appId: 123,
    privateKey: 'dummy-private-key-value',
    installationId: 456,
    supabaseUrl: 'https://example.supabase.co',
    supabaseServiceRoleKey: 'service-role',
  }

  it('returns cached token when it is still fresh', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              access_token: 'cached-token',
              token_expires_at: '2026-05-12T16:00:00.000Z',
            },
          ]),
          { status: 200 },
        ),
      )

    const authFactory = vi.fn()

    const result = await getJodieInstallationToken(baseConfig, {
      fetchImpl,
      authFactory,
      now: () => new Date('2026-05-12T15:50:00.000Z'),
    })

    expect(result.cacheHit).toBe(true)
    expect(result.token).toBe('cached-token')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(authFactory).not.toHaveBeenCalled()
  })

  it('refreshes and stores a token when cache is stale', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              access_token: 'stale-token',
              token_expires_at: '2026-05-12T15:50:30.000Z',
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('', { status: 201 }))

    const auth = vi.fn().mockResolvedValue({
      token: 'fresh-token',
      expiresAt: '2026-05-12T16:50:00.000Z',
    })
    const authFactory = vi.fn().mockReturnValue(auth)

    const result = await getJodieInstallationToken(baseConfig, {
      fetchImpl,
      authFactory,
      now: () => new Date('2026-05-12T15:50:00.000Z'),
    })

    expect(result.cacheHit).toBe(false)
    expect(result.token).toBe('fresh-token')
    expect(authFactory).toHaveBeenCalledWith({
      appId: 123,
      privateKey: baseConfig.privateKey,
    })
    expect(auth).toHaveBeenCalledWith({
      type: 'installation',
      installationId: 456,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
