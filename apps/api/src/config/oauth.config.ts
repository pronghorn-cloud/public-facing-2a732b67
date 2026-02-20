/**
 * OAuth Client Credentials Configuration
 *
 * Validates environment variables for service-to-service OAuth authentication
 * used by the API Gateway (BFF) to call the private backend.
 */

import { z } from 'zod'

export const oauthClientConfigSchema = z.object({
  tenantId: z.string().min(1).describe('Azure AD tenant ID for S2S auth'),
  clientId: z.string().min(1).describe('OAuth client ID for S2S auth'),
  clientSecret: z.string().min(1).describe('OAuth client secret'),
  scope: z.string().min(1).describe('OAuth scope (e.g. api://private-app/.default)'),
  tokenEndpoint: z.string().url().optional().describe('Custom token endpoint (auto-derived from tenantId if omitted)'),
})

export type OAuthClientConfig = z.infer<typeof oauthClientConfigSchema>

/**
 * Parse OAuth Client Credentials configuration from environment variables.
 * Returns null if the required variables are not set (gateway not configured).
 */
export function parseOAuthClientConfig(): OAuthClientConfig | null {
  const tenantId = process.env.OAUTH_TENANT_ID
  const clientId = process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.OAUTH_CLIENT_SECRET
  const scope = process.env.OAUTH_SCOPE

  // All four are required together — if none are set, gateway is disabled
  if (!tenantId && !clientId && !clientSecret && !scope) {
    return null
  }

  const config = oauthClientConfigSchema.parse({
    tenantId,
    clientId,
    clientSecret,
    scope,
    tokenEndpoint: process.env.OAUTH_TOKEN_ENDPOINT,
  })

  // Derive token endpoint from tenantId if not explicitly set
  if (!config.tokenEndpoint) {
    config.tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`
  }

  return config
}
