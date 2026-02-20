/**
 * Configuration Presets — Unit Tests
 *
 * Validates preset retrieval, structure, and .env file generation.
 * Presets are pure data objects with no external dependencies.
 */

import { describe, it, expect } from 'vitest'
import {
  getPreset,
  generateEnvFile,
  externalPreset,
  developmentPreset,
} from './presets.js'

describe('getPreset', () => {
  it('should return the external (SAML) preset', () => {
    const preset = getPreset('external')
    expect(preset).toBe(externalPreset)
    expect(preset.variables.AUTH_DRIVER).toBe('saml')
  })

  it('should return the development (Mock) preset', () => {
    const preset = getPreset('development')
    expect(preset).toBe(developmentPreset)
    expect(preset.variables.AUTH_DRIVER).toBe('mock')
  })

  it('should throw for an unknown preset name', () => {
    // @ts-expect-error — testing invalid input
    expect(() => getPreset('unknown')).toThrow('Unknown preset')
  })
})

describe('generateEnvFile', () => {
  it('should include comment header when includeComments is true', () => {
    const output = generateEnvFile(developmentPreset, true)

    // Header lines
    expect(output).toContain('# =====')
    expect(output).toContain(`# ${developmentPreset.name}`)
    expect(output).toContain(`# ${developmentPreset.description}`)
  })

  it('should omit comment header when includeComments is false', () => {
    const output = generateEnvFile(developmentPreset, false)

    expect(output).not.toContain('#')
  })

  it('should contain every preset variable as KEY=value', () => {
    const output = generateEnvFile(developmentPreset, false)

    for (const [key, value] of Object.entries(developmentPreset.variables)) {
      expect(output).toContain(`${key}=${value}`)
    }
  })

  it('should produce different output for each preset', () => {
    const external = generateEnvFile(externalPreset, false)
    const development = generateEnvFile(developmentPreset, false)

    expect(external).toContain('AUTH_DRIVER=saml')
    expect(development).toContain('AUTH_DRIVER=mock')
    expect(external).not.toEqual(development)
  })
})

describe('preset structure', () => {
  it.each([externalPreset, developmentPreset])(
    'should have name, description, and variables ($name)',
    (preset) => {
      expect(preset.name).toBeTruthy()
      expect(preset.description).toBeTruthy()
      expect(Object.keys(preset.variables).length).toBeGreaterThan(0)
    }
  )

  it('should set NODE_ENV=production for external preset', () => {
    expect(externalPreset.variables.NODE_ENV).toBe('production')
  })

  it('should set NODE_ENV=development for development preset', () => {
    expect(developmentPreset.variables.NODE_ENV).toBe('development')
  })
})
