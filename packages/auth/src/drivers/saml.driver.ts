/**
 * SamlAuthDriver - SAML 2.0 authentication for external users
 *
 * Implements SAML authentication flow using @node-saml/passport-saml
 * Suitable for external users (citizens, businesses) via SAML-compliant IdPs
 */

import type { Request, Response } from 'express'
import { Strategy as SamlStrategy, type Profile, type VerifiedCallback } from '@node-saml/passport-saml'
import { BaseAuthDriver, type AuthUser, type AuthConfig } from './base.driver.js'
import { parseSamlConfig, type SamlConfig } from '../config/saml.config.js'

export class SamlAuthDriver extends BaseAuthDriver {
  private strategy: SamlStrategy
  private samlConfig: SamlConfig

  constructor(config: AuthConfig) {
    super(config)

    // Parse and validate SAML configuration
    this.samlConfig = parseSamlConfig()

    // Initialize SAML strategy
    // Note: Type assertions used due to @node-saml/passport-saml v5.x type definitions
    this.strategy = new SamlStrategy(
      {
        callbackUrl: this.samlConfig.callbackUrl,
        entryPoint: this.samlConfig.entryPoint,
        issuer: this.samlConfig.issuer,
        cert: this.samlConfig.cert,
        privateKey: this.samlConfig.privateKey,
        decryptionPvk: this.samlConfig.decryptionPvk,
        signatureAlgorithm: this.samlConfig.signatureAlgorithm,
        digestAlgorithm: this.samlConfig.digestAlgorithm,
        identifierFormat: this.samlConfig.identifierFormat,
        wantAssertionsSigned: this.samlConfig.wantAssertionsSigned,
        wantAuthnResponseSigned: this.samlConfig.wantAuthnResponseSigned,
        logoutUrl: this.samlConfig.logoutUrl,
        logoutCallbackUrl: this.samlConfig.logoutCallbackUrl
      } as any,
      this.verifyProfile.bind(this) as any,
      this.verifyProfile.bind(this) as any
    )
  }

  getDriverName(): string {
    return 'saml'
  }

  /**
   * Initiate SAML authentication - redirect to IdP
   */
  async login(_req: Request, res: Response): Promise<void> {
    // Use the SAML entry point directly for authentication
    // The Strategy will handle the authentication request generation
    const loginUrl = this.samlConfig.entryPoint
    res.redirect(loginUrl)
  }

  /**
   * Handle SAML callback - parse and validate assertion
   */
  async callback(req: Request, _res: Response): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      // Verify SAML response using Strategy
      // Note: This is a simplified implementation. For production, integrate with Passport.js
      (this.strategy as any).authenticate(req as any, {}, (err: any, user: any) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }

        if (!user) {
          reject(new Error('No user returned from SAML assertion'))
          return
        }

        // Map SAML profile to AuthUser
        const authUser = this.mapProfileToUser(user)

        // Save to session (async due to session regeneration)
        this.saveUserToSession(req, authUser).then(() => {
          resolve(authUser)
        }).catch(reject)
      })
    })
  }

  /**
   * Perform SAML logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    const user = this.getUser(req)

    // Clear local session first
    this.clearUserFromSession(req)

    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }

        res.clearCookie('connect.sid')

        // If SAML logout URL is configured, redirect to IdP logout
        if (this.samlConfig.logoutUrl && user) {
          (this.strategy as any).logout(req as any, (err: any, url?: string) => {
            if (err) {
              reject(err instanceof Error ? err : new Error(String(err)))
            } else if (url) {
              res.redirect(url)
              resolve()
            } else {
              resolve()
            }
          })
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Verify SAML profile (passport callback)
   */
  private verifyProfile(profile: Profile, done: VerifiedCallback): void {
    try {
      const user = this.mapProfileToUser(profile)
      done(null, user as any)
    } catch (error) {
      done(error as Error)
    }
  }

  /**
   * Map SAML profile to AuthUser
   */
  private mapProfileToUser(profile: Profile | any): AuthUser {
    const attrs = this.samlConfig.attributeMapping

    // Extract attributes from SAML assertion
    const getAttribute = (key: string): string => {
      const attrName = (attrs as any)[key]
      if (!attrName) return ''

      // Try direct property access
      if (profile[attrName]) {
        return Array.isArray(profile[attrName]) ? profile[attrName][0] : profile[attrName]
      }

      // Try nested attributes object
      if (profile.attributes && profile.attributes[attrName]) {
        const val = profile.attributes[attrName]
        return Array.isArray(val) ? val[0] : val
      }

      return ''
    }

    const id = getAttribute('id') || profile.nameID || profile.ID || ''
    const email = getAttribute('email') || profile.email || ''
    const firstName = getAttribute('firstName') || ''
    const lastName = getAttribute('lastName') || ''
    const name = getAttribute('name') || `${firstName} ${lastName}`.trim() || email

    // Extract roles from SAML assertion
    let roles: string[] = []
    const roleAttr = getAttribute('roles')
    if (roleAttr) {
      roles = Array.isArray(roleAttr) ? roleAttr : [roleAttr]
    } else if (profile.attributes && profile.attributes[attrs.roles]) {
      const roleVal = profile.attributes[attrs.roles]
      roles = Array.isArray(roleVal) ? roleVal : [roleVal]
    }

    return {
      id,
      email,
      name,
      roles: roles.filter(Boolean),
      // REQ-P1-02: Explicit attribute whitelist (no ...profile.attributes spread)
      attributes: {
        firstName,
        lastName,
        samlNameId: profile.nameID,
        samlSessionIndex: profile.sessionIndex,
      }
    }
  }
}
