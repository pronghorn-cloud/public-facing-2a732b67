import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock redis before importing
const mockClient = {
  on: vi.fn().mockReturnThis(),
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
}

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockClient),
}))

// Mock @azure/identity
const mockCredential = { getToken: vi.fn() }
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(() => mockCredential),
}))

// Mock @redis/entraid
const mockCredentialsProvider = {}
vi.mock('@redis/entraid', () => ({
  EntraIdCredentialsProviderFactory: {
    createForDefaultAzureCredential: vi.fn(() => mockCredentialsProvider),
  },
  REDIS_SCOPE_DEFAULT: 'https://redis.azure.com/.default',
}))

import { createRedisClient } from './redis.config.js'
import { createClient } from 'redis'

describe('createRedisClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.REDIS_URL
    delete process.env.REDIS_AUTH_MODE
    delete process.env.REDIS_HOST
    delete process.env.REDIS_PORT
    delete process.env.REDIS_USERNAME
  })

  describe('accesskey mode (default)', () => {
    it('creates a client with default URL when REDIS_URL is not set', async () => {
      await createRedisClient()
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'redis://localhost:6379',
        })
      )
    })

    it('creates a client with REDIS_URL when set', async () => {
      process.env.REDIS_URL = 'redis://custom-host:6380'
      await createRedisClient()
      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'redis://custom-host:6380',
        })
      )
    })

    it('registers error, connect, and reconnecting event handlers', async () => {
      await createRedisClient()
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
    })

    it('configures reconnect strategy with exponential backoff', async () => {
      await createRedisClient()
      const options = vi.mocked(createClient).mock.calls[0][0] as any
      const reconnectStrategy = options.socket.reconnectStrategy

      // First retry: 100ms
      expect(reconnectStrategy(1)).toBe(100)

      // Fifth retry: 500ms
      expect(reconnectStrategy(5)).toBe(500)

      // Tenth retry: 1000ms (still within max retries)
      expect(reconnectStrategy(10)).toBe(1000)
    })

    it('reconnect strategy returns error after 10 retries', async () => {
      await createRedisClient()
      const options = vi.mocked(createClient).mock.calls[0][0] as any
      const reconnectStrategy = options.socket.reconnectStrategy

      const result = reconnectStrategy(11)
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe('Redis max reconnect attempts reached')
    })
  })

  describe('entraid mode', () => {
    it('creates client with host, port, TLS, and credentialsProvider', async () => {
      process.env.REDIS_AUTH_MODE = 'entraid'
      process.env.REDIS_HOST = 'myredis.redis.cache.windows.net'
      process.env.REDIS_PORT = '6380'

      await createRedisClient()

      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialsProvider: mockCredentialsProvider,
          socket: expect.objectContaining({
            host: 'myredis.redis.cache.windows.net',
            port: 6380,
            tls: true,
          }),
        })
      )
    })

    it('throws if REDIS_HOST is not set in entraid mode', async () => {
      process.env.REDIS_AUTH_MODE = 'entraid'
      await expect(createRedisClient()).rejects.toThrow(
        'REDIS_HOST is required when REDIS_AUTH_MODE=entraid'
      )
    })

    it('defaults REDIS_PORT to 6380 in entraid mode', async () => {
      process.env.REDIS_AUTH_MODE = 'entraid'
      process.env.REDIS_HOST = 'myredis.redis.cache.windows.net'

      await createRedisClient()

      const options = vi.mocked(createClient).mock.calls[0][0] as any
      expect(options.socket.port).toBe(6380)
    })

    it('passes REDIS_USERNAME when set', async () => {
      process.env.REDIS_AUTH_MODE = 'entraid'
      process.env.REDIS_HOST = 'myredis.redis.cache.windows.net'
      process.env.REDIS_USERNAME = 'my-managed-identity-oid'

      await createRedisClient()

      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'my-managed-identity-oid',
        })
      )
    })

    it('does not pass url option in entraid mode', async () => {
      process.env.REDIS_AUTH_MODE = 'entraid'
      process.env.REDIS_HOST = 'myredis.redis.cache.windows.net'

      await createRedisClient()

      const options = vi.mocked(createClient).mock.calls[0][0] as any
      expect(options.url).toBeUndefined()
    })

    it('registers event handlers in entraid mode', async () => {
      process.env.REDIS_AUTH_MODE = 'entraid'
      process.env.REDIS_HOST = 'myredis.redis.cache.windows.net'

      await createRedisClient()

      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
    })
  })
})
