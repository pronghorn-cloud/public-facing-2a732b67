/**
 * API Gateway Routes (BFF Proxy)
 *
 * Example routes that proxy authenticated requests to the private backend.
 * Template consumers should replace these with their own data endpoints.
 *
 * All routes require authentication (requireAuth middleware).
 * The gateway injects OAuth Bearer tokens for S2S auth automatically.
 */

import express, { type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { proxyRequest } from '../services/api-gateway.service.js'
import { parseOAuthClientConfig } from '../config/oauth.config.js'
import { logger } from '../utils/logger.js'
import { logSecurityEvent } from '../middleware/logger.middleware.js'

/**
 * FINDING-002: Sanitize proxy path to prevent traversal beyond the intended base path.
 * Rejects paths containing '..' sequences that could escape the private backend's API prefix.
 * Returns the sanitized path with a single leading slash, or null if invalid.
 */
function sanitizePath(splat: string | string[] | undefined): string | null {
  const raw = Array.isArray(splat) ? splat.join('/') : splat ?? ''
  if (raw.includes('..')) return null
  return '/' + raw.replace(/^\/+/, '')
}

const router = express.Router()

// Resolve config once at module load
const oauthConfig = parseOAuthClientConfig()
const privateApiBaseUrl = process.env.PRIVATE_API_BASE_URL

/**
 * Middleware: Verify gateway is configured before handling any request
 */
router.use((_req: Request, res: Response, next) => {
  if (!oauthConfig || !privateApiBaseUrl) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'GATEWAY_NOT_CONFIGURED',
        message: 'API Gateway is not configured. Set PRIVATE_API_BASE_URL and OAUTH_* environment variables.',
      },
    })
  }
  next()
})

// All gateway routes require authentication
router.use(requireAuth)

/**
 * @route   GET /api/v1/data/*
 * @desc    Proxy GET requests to private backend
 * @access  Private (authenticated users)
 *
 * Example: GET /api/v1/data/items → private-backend/api/v1/items
 */
router.get('/{*splat}', async (req: Request, res: Response) => {
  const path = sanitizePath(req.params.splat)
  if (!path) {
    logSecurityEvent('gateway.blocked.path_traversal', (req as any).user?.id, {
      ip: req.ip, path: req.path, method: req.method,
    })
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PATH', message: 'Invalid path' },
    })
  }
  try {
    const result = await proxyRequest(privateApiBaseUrl!, oauthConfig!, {
      method: 'GET',
      path,
    })
    res.status(result.status).json(result.data)
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Gateway GET proxy failed')
    res.status(502).json({
      success: false,
      error: { code: 'BAD_GATEWAY', message: 'Failed to reach backend service' },
    })
  }
})

/**
 * @route   POST /api/v1/data/*
 * @desc    Proxy POST requests to private backend
 * @access  Private (authenticated users)
 */
router.post('/{*splat}', async (req: Request, res: Response) => {
  const path = sanitizePath(req.params.splat)
  if (!path) {
    logSecurityEvent('gateway.blocked.path_traversal', (req as any).user?.id, {
      ip: req.ip, path: req.path, method: req.method,
    })
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PATH', message: 'Invalid path' },
    })
  }
  try {
    const result = await proxyRequest(privateApiBaseUrl!, oauthConfig!, {
      method: 'POST',
      path,
      body: req.body,
    })
    res.status(result.status).json(result.data)
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Gateway POST proxy failed')
    res.status(502).json({
      success: false,
      error: { code: 'BAD_GATEWAY', message: 'Failed to reach backend service' },
    })
  }
})

/**
 * @route   PUT /api/v1/data/*
 * @desc    Proxy PUT requests to private backend
 * @access  Private (authenticated users)
 */
router.put('/{*splat}', async (req: Request, res: Response) => {
  const path = sanitizePath(req.params.splat)
  if (!path) {
    logSecurityEvent('gateway.blocked.path_traversal', (req as any).user?.id, {
      ip: req.ip, path: req.path, method: req.method,
    })
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PATH', message: 'Invalid path' },
    })
  }
  try {
    const result = await proxyRequest(privateApiBaseUrl!, oauthConfig!, {
      method: 'PUT',
      path,
      body: req.body,
    })
    res.status(result.status).json(result.data)
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Gateway PUT proxy failed')
    res.status(502).json({
      success: false,
      error: { code: 'BAD_GATEWAY', message: 'Failed to reach backend service' },
    })
  }
})

/**
 * @route   DELETE /api/v1/data/*
 * @desc    Proxy DELETE requests to private backend
 * @access  Private (authenticated users)
 */
router.delete('/{*splat}', async (req: Request, res: Response) => {
  const path = sanitizePath(req.params.splat)
  if (!path) {
    logSecurityEvent('gateway.blocked.path_traversal', (req as any).user?.id, {
      ip: req.ip, path: req.path, method: req.method,
    })
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PATH', message: 'Invalid path' },
    })
  }
  try {
    const result = await proxyRequest(privateApiBaseUrl!, oauthConfig!, {
      method: 'DELETE',
      path,
    })
    res.status(result.status).json(result.data)
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Gateway DELETE proxy failed')
    res.status(502).json({
      success: false,
      error: { code: 'BAD_GATEWAY', message: 'Failed to reach backend service' },
    })
  }
})

export default router
