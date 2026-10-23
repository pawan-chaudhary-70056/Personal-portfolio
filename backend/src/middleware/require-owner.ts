import type { RequestHandler } from 'express'
import { forbidden, unauthorized } from '../lib/errors.js'

/**
 * Owner-only actions: administrator management, session revocation, system
 * health, analytics, site settings, and audit logs. Editors keep full control of
 * portfolio content, media, and the inbox.
 */
export const requireOwner: RequestHandler = (req, _res, next) => {
  if (!req.admin) {
    next(unauthorized())
    return
  }

  if (req.admin.role !== 'OWNER') {
    next(forbidden('Only the portfolio owner can do that.'))
    return
  }

  next()
}
