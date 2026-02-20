/**
 * Configuration Presets
 *
 * Provides pre-configured environment variable templates for different deployment scenarios
 */

export interface ConfigPreset {
  name: string
  description: string
  variables: Record<string, string>
}

/**
 * External Deployment Preset (SAML 2.0)
 *
 * For external-facing applications where citizens/businesses authenticate via SAML IdP
 */
export const externalPreset: ConfigPreset = {
  name: 'External (SAML)',
  description: 'Configuration for external-facing applications using SAML 2.0 authentication',
  variables: {
    // Application
    NODE_ENV: 'production',
    PORT: '3000',
    APP_NAME: 'Alberta Government Public Application',

    // Authentication
    AUTH_DRIVER: 'saml',
    AUTH_CALLBACK_URL: 'https://public.app.alberta.ca/api/v1/auth/callback',

    // SAML (requires additional variables in actual .env)
    // SAML_ENTRY_POINT, SAML_ISSUER, SAML_CERT must be provided
    SAML_PROTOCOL: 'saml2',
    SAML_SIGN_REQUESTS: 'false',
    SAML_WANT_ASSERTIONS_SIGNED: 'true',
    SAML_NAME_ID_FORMAT: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    SAML_ATTRIBUTE_ID: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
    SAML_ATTRIBUTE_EMAIL: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    SAML_ATTRIBUTE_NAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    SAML_ATTRIBUTE_FIRST_NAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    SAML_ATTRIBUTE_LAST_NAME: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    SAML_ATTRIBUTE_ROLES: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',

    // Frontend
    WEB_URL: 'https://public.app.alberta.ca',
    CORS_ORIGIN: 'https://public.app.alberta.ca',

    // Session
    SESSION_STORE: 'redis',
    SESSION_MAX_AGE: '86400000', // 24 hours
    SESSION_COOKIE_SAME_SITE: 'lax',

    // Security (lower limits for public-facing)
    RATE_LIMIT_MAX: '100',
    AUTH_RATE_LIMIT_MAX: '5',

    // Logging
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'combined',
    LOG_PII: 'false'
  }
}

/**
 * Development Preset (Mock Authentication)
 *
 * For local development without requiring real IdP
 */
export const developmentPreset: ConfigPreset = {
  name: 'Development (Mock)',
  description: 'Configuration for local development with mock authentication',
  variables: {
    // Application
    NODE_ENV: 'development',
    PORT: '3000',
    APP_NAME: 'Alberta Government Public Application Template',

    // Authentication
    AUTH_DRIVER: 'mock',
    AUTH_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/callback',

    // Frontend
    WEB_URL: 'http://localhost:5173',
    CORS_ORIGIN: 'http://localhost:5173',

    // Session
    SESSION_SECRET: 'dev-secret-change-in-production',
    SESSION_STORE: 'memory',
    SESSION_MAX_AGE: '86400000', // 24 hours
    SESSION_COOKIE_SAME_SITE: 'lax',
    SESSION_COOKIE_SECURE: 'false', // HTTP allowed in development

    // Security (relaxed for development)
    RATE_LIMIT_MAX: '10000',
    AUTH_RATE_LIMIT_MAX: '100',

    // Logging
    LOG_LEVEL: 'debug',
    LOG_FORMAT: 'dev',
    LOG_PII: 'true', // Allowed in development for debugging

    // Feature Flags
    FEATURE_ANALYTICS: 'true',
    FEATURE_HEALTH_CHECK: 'true'
  }
}

/**
 * Get preset by name
 */
export function getPreset(name: 'external' | 'development'): ConfigPreset {
  switch (name) {
    case 'external':
      return externalPreset
    case 'development':
      return developmentPreset
    default:
      throw new Error(`Unknown preset: ${name}`)
  }
}

/**
 * Generate .env file content from preset
 *
 * @param preset - Configuration preset
 * @param includeComments - Include descriptive comments (default: true)
 * @returns .env file content as string
 */
export function generateEnvFile(preset: ConfigPreset, includeComments = true): string {
  const lines: string[] = []

  if (includeComments) {
    lines.push('# =============================================================================')
    lines.push(`# ${preset.name}`)
    lines.push('# =============================================================================')
    lines.push(`# ${preset.description}`)
    lines.push('# =============================================================================')
    lines.push('')
  }

  for (const [key, value] of Object.entries(preset.variables)) {
    lines.push(`${key}=${value}`)
  }

  return lines.join('\n')
}
