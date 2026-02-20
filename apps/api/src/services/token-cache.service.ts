/**
 * OAuth Client Credentials Token Cache
 *
 * Acquires, caches, and refreshes OAuth tokens for service-to-service
 * communication with the private backend. Deduplicates concurrent requests
 * to avoid thundering herd on token refresh.
 */

import { logger } from '../utils/logger.js'
import type { OAuthClientConfig } from '../config/oauth.config.js'

interface CachedToken {
  accessToken: string
  expiresAt: number // Unix timestamp (ms)
}

/** Buffer before actual expiry to trigger early refresh (60 seconds) */
const EXPIRY_BUFFER_MS = 60_000

let cachedToken: CachedToken | null = null
let fetchPromise: Promise<string> | null = null

/**
 * Get a valid access token, fetching a new one if the cached token is expired.
 * Concurrent calls during a fetch will share the same promise (deduplication).
 */
export async function getAccessToken(config: OAuthClientConfig): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt - EXPIRY_BUFFER_MS > Date.now()) {
    return cachedToken.accessToken
  }

  // Deduplicate concurrent fetches
  if (fetchPromise) {
    return fetchPromise
  }

  fetchPromise = fetchToken(config)
    .finally(() => {
      fetchPromise = null
    })

  return fetchPromise
}

/**
 * Fetch a new token from the OAuth token endpoint using Client Credentials flow.
 */
async function fetchToken(config: OAuthClientConfig): Promise<string> {
  const tokenEndpoint = config.tokenEndpoint
    || `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: config.scope,
  })

  logger.debug({ endpoint: tokenEndpoint }, 'Fetching OAuth token')

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(
      { status: response.status, body: errorText },
      'OAuth token request failed'
    )
    throw new Error(`OAuth token request failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  logger.info({ expiresIn: data.expires_in }, 'OAuth token acquired')

  return data.access_token
}

/** Clear cached token (useful for testing or forced refresh) */
export function clearTokenCache(): void {
  cachedToken = null
  fetchPromise = null
}
