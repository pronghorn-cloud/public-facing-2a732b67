import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create the mock function before vi.mock hoists
const { mockGetAccessToken } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn().mockResolvedValue('mock-bearer-token'),
}))

vi.mock('./token-cache.service.js', () => ({
  getAccessToken: mockGetAccessToken,
}))

import { proxyRequest } from './api-gateway.service.js'
import type { OAuthClientConfig } from '../config/oauth.config.js'

const mockConfig: OAuthClientConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  scope: 'api://test/.default',
  tokenEndpoint: 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token',
}

const baseUrl = 'http://private-api:3001/api/v1'

describe('api-gateway.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAccessToken.mockResolvedValue('mock-bearer-token')
  })

  it('proxies GET requests with Bearer token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: [{ id: 1 }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await proxyRequest(baseUrl, mockConfig, {
      method: 'GET',
      path: '/items',
    })

    expect(result.status).toBe(200)
    expect(result.data).toEqual({ success: true, data: [{ id: 1 }] })

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(url).toBe('http://private-api:3001/api/v1/items')
    expect((options?.headers as Record<string, string>).Authorization).toBe('Bearer mock-bearer-token')
  })

  it('proxies POST requests with body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: 2 } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await proxyRequest(baseUrl, mockConfig, {
      method: 'POST',
      path: '/items',
      body: { name: 'test item' },
    })

    expect(result.status).toBe(201)

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(JSON.stringify({ name: 'test item' }))
  })

  it('returns error status from private API without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: { message: 'Not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await proxyRequest(baseUrl, mockConfig, {
      method: 'GET',
      path: '/items/999',
    })

    expect(result.status).toBe(404)
    expect(result.data).toEqual({ success: false, error: { message: 'Not found' } })
  })

  it('passes custom headers along with Authorization', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await proxyRequest(baseUrl, mockConfig, {
      method: 'GET',
      path: '/items',
      headers: { 'X-Request-Id': 'req-123' },
    })

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer mock-bearer-token')
    expect(headers['X-Request-Id']).toBe('req-123')
  })
})
