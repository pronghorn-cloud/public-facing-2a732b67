/**
 * API Configuration Schema
 *
 * Validates all environment variables required for the API application
 * Uses Zod for runtime validation and TypeScript type inference
 */

import { z } from 'zod'

/**
 * Node environment
 */
const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development')

/**
 * Authentication driver
 */
const authDriverSchema = z.enum(['mock', 'saml']).default('mock')

/**
 * Session store type
 */
const sessionStoreSchema = z.enum(['memory', 'redis']).default('memory')

/**
 * Log level
 */
const logLevelSchema = z.enum(['error', 'warn', 'info', 'debug']).default('info')

/**
 * Log format
 */
const logFormatSchema = z.enum(['combined', 'common', 'dev', 'short', 'tiny']).default('dev')

/**
 * Complete API Configuration Schema
 *
 * Covers environment variables for:
 * - Application settings
 * - Session management (Redis or memory)
 * - Authentication (Mock, SAML)
 * - API Gateway (BFF proxy to private backend)
 * - Security settings
 * - Logging
 */
export const apiConfigSchema = z.object({
  // Application
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().default('Alberta Government Public Application Template'),

  // Session Management
  SESSION_SECRET: z.string().min(32).describe('Secret key for session encryption (min 32 characters)'),
  SESSION_SECRET_PREVIOUS: z.string().min(32).optional().describe('Previous session secret for graceful key rotation (FINDING-007)'),
  SESSION_STORE: sessionStoreSchema,
  REDIS_URL: z.string().url().optional().describe('Redis connection URL (required when SESSION_STORE=redis and REDIS_AUTH_MODE=accesskey)'),
  REDIS_AUTH_MODE: z.enum(['accesskey', 'entraid']).default('accesskey').describe('Redis auth mode: accesskey (URL-based) or entraid (Entra ID token)'),
  REDIS_HOST: z.string().optional().describe('Redis hostname (required when REDIS_AUTH_MODE=entraid)'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6380).describe('Redis port (default 6380 for Azure Cache for Redis TLS)'),
  REDIS_USERNAME: z.string().optional().describe('Redis username / Entra ID principal object ID (for entraid mode)'),
  SESSION_MAX_AGE: z.coerce.number().int().min(60000).default(28800000), // 8 hours default (Protected B)
  SESSION_COOKIE_SECURE: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  SESSION_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  SESSION_COOKIE_NAME: z.string().default('connect.sid'),

  // Authentication - General
  AUTH_DRIVER: authDriverSchema,
  AUTH_CALLBACK_URL: z.string().url().describe('Authentication callback URL'),

  // Authentication - SAML
  SAML_ENTRY_POINT: z.string().url().optional().describe('SAML IdP SSO URL'),
  SAML_ISSUER: z.string().optional().describe('SAML Service Provider Entity ID'),
  SAML_CERT: z.string().optional().describe('SAML IdP X.509 Certificate (PEM format)'),
  SAML_PRIVATE_KEY: z.string().optional().describe('SAML SP Private Key (PEM format)'),
  SAML_CERT_SP: z.string().optional().describe('SAML SP Certificate (PEM format)'),
  SAML_PROTOCOL: z.string().default('saml2'),
  SAML_SIGN_REQUESTS: z.enum(['true', 'false']).transform((val) => val === 'true').default('false'),
  SAML_WANT_ASSERTIONS_SIGNED: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),
  SAML_FORCE_AUTHN: z.enum(['true', 'false']).transform((val) => val === 'true').default('false'),
  SAML_NAME_ID_FORMAT: z.string().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
  SAML_ATTRIBUTE_ID: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'),
  SAML_ATTRIBUTE_EMAIL: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'),
  SAML_ATTRIBUTE_NAME: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'),
  SAML_ATTRIBUTE_FIRST_NAME: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'),
  SAML_ATTRIBUTE_LAST_NAME: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'),
  SAML_ATTRIBUTE_ROLES: z.string().default('http://schemas.microsoft.com/ws/2008/06/identity/claims/role'),
  SAML_DEFAULT_ROLE: z.string().optional().describe('Default role if no roles in SAML assertion'),
  SAML_LOGOUT_URL: z.string().url().optional().describe('SAML Single Logout URL'),
  SAML_LOGOUT_CALLBACK_URL: z.string().url().optional().describe('SAML Logout Callback URL'),

  // Frontend
  WEB_URL: z.string().url().describe('Frontend application URL'),

  // CORS
  CORS_ORIGIN: z.string().describe('CORS allowed origin (should match WEB_URL)'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(1000).describe('Max requests per 15 minutes per IP'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10).describe('Max auth requests per 15 minutes'),
  HELMET_CSP: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
  ALLOWED_HOSTS: z.string().optional().describe('Comma-separated list of allowed Host header values (REQ-P1-01)'),

  // API Gateway (BFF proxy to private backend)
  PRIVATE_API_BASE_URL: z.string().url().optional().describe('Private backend API base URL'),
  OAUTH_TENANT_ID: z.string().optional().describe('Azure AD tenant ID for S2S OAuth'),
  OAUTH_CLIENT_ID: z.string().optional().describe('OAuth client ID for S2S auth'),
  OAUTH_CLIENT_SECRET: z.string().optional().describe('OAuth client secret for S2S auth'),
  OAUTH_SCOPE: z.string().optional().describe('OAuth scope for S2S auth (e.g. api://private-app/.default)'),

  // Logging
  LOG_LEVEL: logLevelSchema,
  LOG_FORMAT: logFormatSchema,
  LOG_PII: z.enum(['true', 'false']).transform((val) => val === 'true').default('false').describe('Log personally identifiable information (not recommended for production)'),

  // Feature Flags (optional)
  FEATURE_ANALYTICS: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),
  FEATURE_HEALTH_CHECK: z.enum(['true', 'false']).transform((val) => val === 'true').default('true'),
})

/**
 * Inferred TypeScript type from schema
 */
export type ApiConfig = z.infer<typeof apiConfigSchema>

/**
 * Parse and validate API configuration
 *
 * @param env - Environment variables (defaults to process.env)
 * @returns Validated and type-safe configuration
 * @throws ZodError if validation fails
 */
export function parseApiConfig(env: Record<string, string | undefined> = process.env): ApiConfig {
  return apiConfigSchema.parse(env)
}

/**
 * Safe parse API configuration (returns result object instead of throwing)
 *
 * @param env - Environment variables (defaults to process.env)
 * @returns Success result with data or error result with issues
 */
export function safeParseApiConfig(env: Record<string, string | undefined> = process.env) {
  return apiConfigSchema.safeParse(env)
}
