/**
 * SAML Configuration Schema
 *
 * Validates SAML authentication configuration using Zod
 */

import { z } from 'zod'

export const samlConfigSchema = z.object({
  // Required SAML settings
  callbackUrl: z.string().url(),
  entryPoint: z.string().url().describe('IdP SSO URL'),
  issuer: z.string().describe('Service Provider entity ID (URN format)'),
  cert: z.string().describe('IdP certificate (base64 or PEM format)'),

  // Optional SAML settings
  privateKey: z.string().optional().describe('SP private key for signing'),
  decryptionPvk: z.string().optional().describe('SP private key for decryption'),
  signatureAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).default('sha256'),
  digestAlgorithm: z.enum(['sha1', 'sha256', 'sha512']).default('sha256'),

  // Attribute mapping
  identifierFormat: z.string().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
  wantAssertionsSigned: z.boolean().default(true),
  wantAuthnResponseSigned: z.boolean().default(true),

  // Logout settings
  logoutUrl: z.string().url().optional(),
  logoutCallbackUrl: z.string().url().optional(),

  // Attribute mappings for user profile
  attributeMapping: z.object({
    id: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'),
    email: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'),
    name: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'),
    firstName: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'),
    lastName: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'),
    roles: z.string().default('http://schemas.microsoft.com/ws/2008/06/identity/claims/role')
  }).default({})
})

export type SamlConfig = z.infer<typeof samlConfigSchema>

/**
 * Parse and validate SAML configuration from environment variables
 */
export function parseSamlConfig(): SamlConfig {
  return samlConfigSchema.parse({
    callbackUrl: process.env.SAML_CALLBACK_URL || process.env.AUTH_CALLBACK_URL,
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    cert: process.env.SAML_CERT,
    privateKey: process.env.SAML_PRIVATE_KEY,
    decryptionPvk: process.env.SAML_DECRYPTION_KEY,
    signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || 'sha256',
    digestAlgorithm: process.env.SAML_DIGEST_ALGORITHM || 'sha256',
    identifierFormat: process.env.SAML_IDENTIFIER_FORMAT,
    wantAssertionsSigned: process.env.SAML_WANT_ASSERTIONS_SIGNED !== 'false',
    wantAuthnResponseSigned: process.env.SAML_WANT_RESPONSE_SIGNED !== 'false',
    logoutUrl: process.env.SAML_LOGOUT_URL,
    logoutCallbackUrl: process.env.SAML_LOGOUT_CALLBACK_URL,
    attributeMapping: {
      id: process.env.SAML_ATTR_ID,
      email: process.env.SAML_ATTR_EMAIL,
      name: process.env.SAML_ATTR_NAME,
      firstName: process.env.SAML_ATTR_FIRSTNAME,
      lastName: process.env.SAML_ATTR_LASTNAME,
      roles: process.env.SAML_ATTR_ROLES
    }
  })
}
