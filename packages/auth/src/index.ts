/**
 * @template/auth - Authentication package
 *
 * Provides authentication drivers and utilities for the enterprise template
 */

export { BaseAuthDriver, type AuthUser, type AuthConfig, AuthUserSchema } from './drivers/base.driver.js'
export { MockAuthDriver, type MockAuthConfig } from './drivers/mock.driver.js'
export { SamlAuthDriver } from './drivers/saml.driver.js'

// Configuration exports
export { parseSamlConfig, type SamlConfig } from './config/saml.config.js'
