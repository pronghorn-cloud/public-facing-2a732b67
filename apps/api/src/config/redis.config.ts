/**
 * Redis Configuration
 *
 * Creates and configures a Redis client for session storage.
 * Supports two authentication modes:
 *   - accesskey (default): Traditional connection via REDIS_URL
 *   - entraid: Microsoft Entra ID token auth via @redis/entraid (UAT/PROD)
 */

import { createClient, type RedisClientType } from 'redis'
import { logger } from '../utils/logger.js'

/** Shared reconnect strategy for both auth modes */
function reconnectStrategy(retries: number) {
  if (retries > 10) {
    logger.error('Redis: max reconnect attempts reached')
    return new Error('Redis max reconnect attempts reached')
  }
  const delay = Math.min(retries * 100, 5000)
  logger.warn({ retries, delay }, 'Redis: reconnecting')
  return delay
}

/**
 * Create a Redis client configured for access-key authentication.
 * Uses REDIS_URL environment variable.
 */
function createAccessKeyClient(): RedisClientType {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  logger.info({ authMode: 'accesskey' }, 'Redis: creating access-key client')

  return createClient({
    url: redisUrl,
    socket: { reconnectStrategy },
  }) as RedisClientType
}

/**
 * Create a Redis client configured for Entra ID token authentication.
 *
 * Dynamically imports @azure/identity and @redis/entraid so that
 * dev environments running in access-key mode don't need these packages.
 *
 * Entra ID auth requires TLS (rediss:// on port 6380 for Azure Cache for Redis).
 */
async function createEntraIdClient(): Promise<RedisClientType> {
  const redisHost = process.env.REDIS_HOST
  if (!redisHost) {
    throw new Error('REDIS_HOST is required when REDIS_AUTH_MODE=entraid')
  }
  const redisPort = parseInt(process.env.REDIS_PORT || '6380', 10)
  const redisUsername = process.env.REDIS_USERNAME || undefined

  logger.info(
    { authMode: 'entraid', host: redisHost, port: redisPort },
    'Redis: creating Entra ID client'
  )

  const { DefaultAzureCredential } = await import('@azure/identity')
  const { EntraIdCredentialsProviderFactory, REDIS_SCOPE_DEFAULT } =
    await import('@redis/entraid')

  const credential = new DefaultAzureCredential()
  const credentialsProvider =
    EntraIdCredentialsProviderFactory.createForDefaultAzureCredential({
      credential,
      scopes: REDIS_SCOPE_DEFAULT,
      tokenManagerConfig: {
        expirationRefreshRatio: 0.8,
      },
    })

  return createClient({
    username: redisUsername,
    credentialsProvider,
    socket: {
      host: redisHost,
      port: redisPort,
      tls: true,
      reconnectStrategy,
    },
  }) as RedisClientType
}

/**
 * Create a Redis client with reconnection strategy and logging.
 *
 * Auth mode is determined by REDIS_AUTH_MODE env var:
 *   - 'accesskey' (default): uses REDIS_URL
 *   - 'entraid': uses REDIS_HOST + REDIS_PORT with Entra ID token auth
 *
 * @returns Configured Redis client (not yet connected — call .connect())
 */
export async function createRedisClient(): Promise<RedisClientType> {
  const authMode = process.env.REDIS_AUTH_MODE || 'accesskey'

  const client =
    authMode === 'entraid'
      ? await createEntraIdClient()
      : createAccessKeyClient()

  client.on('error', (err: Error) => logger.error({ err }, 'Redis client error'))
  client.on('connect', () => logger.info('Redis client connected'))
  client.on('reconnecting', () => logger.info('Redis client reconnecting'))

  return client
}
