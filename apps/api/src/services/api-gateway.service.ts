/**
 * API Gateway Service (BFF Proxy)
 *
 * Proxies requests from the public-facing app to the private backend,
 * injecting OAuth Bearer tokens for service-to-service authentication.
 */

import { logger } from '../utils/logger.js'
import { getAccessToken } from './token-cache.service.js'
import type { OAuthClientConfig } from '../config/oauth.config.js'

export interface GatewayRequestOptions {
  method: string
  path: string
  body?: unknown
  headers?: Record<string, string>
}

export interface GatewayResponse<T = unknown> {
  status: number
  data: T
}

/**
 * Send a proxied request to the private backend.
 *
 * @param baseUrl   - Private backend base URL (e.g. http://private-api:3001/api/v1)
 * @param oauthConfig - OAuth Client Credentials config for token acquisition
 * @param options   - Request method, path, body, and optional headers
 * @returns Parsed response with status and data
 */
export async function proxyRequest<T = unknown>(
  baseUrl: string,
  oauthConfig: OAuthClientConfig,
  options: GatewayRequestOptions
): Promise<GatewayResponse<T>> {
  const token = await getAccessToken(oauthConfig)
  const url = `${baseUrl}${options.path}`

  const fetchHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  }

  logger.debug({ method: options.method, url }, 'Gateway proxy request')

  const response = await fetch(url, {
    method: options.method,
    headers: fetchHeaders,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = (await response.json()) as T

  if (!response.ok) {
    logger.warn(
      { status: response.status, url, method: options.method },
      'Gateway received error from private API'
    )
  }

  return { status: response.status, data }
}
