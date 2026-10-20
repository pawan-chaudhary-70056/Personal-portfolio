import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Request, RequestHandler } from 'express'
import { env } from '../config/env.js'
import { ApiError } from '../lib/errors.js'

export const CSRF_COOKIE = 'csrf_token'
export const CSRF_HEADER = 'x-csrf-token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Issues a random double-submit token. The cookie is readable by JavaScript on
 * purpose so the SPA can echo it in the request header; it is not an
 * authentication secret and carries no privileges on its own.
 */
export const issueCsrfToken: RequestHandler = (_req, res) => {
  const token = randomBytes(32).toString('hex')

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
  })

  res.json({ token })
}

function allowedOrigins(req: Request): Set<string> {
  const allowed = new Set<string>()

  if (env.FRONTEND_ORIGIN) {
    try {
      allowed.add(new URL(env.FRONTEND_ORIGIN).origin)
    } catch {
      // Configuration validation covers malformed origins elsewhere.
    }
  }

  const host = req.get('host')
  if (host) {
    allowed.add(`${req.protocol}://${host}`)
  }

  return allowed
}

/**
 * Rejects state-changing requests that are missing a matching CSRF token or
 * that arrive from an origin outside the allowlist. Non-browser clients that
 * omit the Origin header are still required to present the token.
 */
export const verifyCsrf: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const cookieToken: unknown = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get(CSRF_HEADER)

  const tokensMatch =
    typeof cookieToken === 'string' &&
    typeof headerToken === 'string' &&
    cookieToken.length > 0 &&
    cookieToken.length === headerToken.length &&
    timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))

  if (!tokensMatch) {
    next(new ApiError(403, 'csrf_failed', 'Invalid or missing CSRF token.'))
    return
  }

  const origin = req.get('origin')
  if (origin && !allowedOrigins(req).has(origin)) {
    next(new ApiError(403, 'origin_rejected', 'Request origin is not allowed.'))
    return
  }

  next()
}
