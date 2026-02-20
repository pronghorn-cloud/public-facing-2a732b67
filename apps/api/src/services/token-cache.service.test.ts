import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAccessToken, clearTokenCache } from './token-cache.service.js'
import type { OAuthClientConfig } from '../config/oauth.config.js'

const mockConfig: OAuthClientConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  scope: 'api://test/.default',
  tokenEndpoint: 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token',
}

describe('token-cache.service', () => {
  beforeEach(() => {
    clearTokenCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches a token on first call', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'token-abc', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const token = await getAccessToken(mockConfig)
    expect(token).toBe('token-abc')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns cached token on subsequent calls', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'token-cached', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await getAccessToken(mockConfig)
    const token2 = await getAccessToken(mockConfig)

    expect(token2).toBe('token-cached')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent requests', async () => {
    let resolvePromise: (value: Response) => void
    const pending = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })

    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(pending)

    const p1 = getAccessToken(mockConfig)
    const p2 = getAccessToken(mockConfig)

    resolvePromise!(
      new Response(JSON.stringify({ access_token: 'dedup-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const [t1, t2] = await Promise.all([p1, p2])
    expect(t1).toBe('dedup-token')
    expect(t2).toBe('dedup-token')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    )

    await expect(getAccessToken(mockConfig)).rejects.toThrow('OAuth token request failed: 401')
  })

  it('sends correct form body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await getAccessToken(mockConfig)

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(url).toBe(mockConfig.tokenEndpoint)
    expect(options?.method).toBe('POST')
    const body = options?.body as string
    expect(body).toContain('grant_type=client_credentials')
    expect(body).toContain('client_id=test-client')
    expect(body).toContain('client_secret=test-secret')
    expect(body).toContain(`scope=${encodeURIComponent('api://test/.default')}`)
  })

  it('clears cache and fetches again after clearTokenCache', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'first', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'second', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const t1 = await getAccessToken(mockConfig)
    expect(t1).toBe('first')

    clearTokenCache()

    const t2 = await getAccessToken(mockConfig)
    expect(t2).toBe('second')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
