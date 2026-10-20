import type { Request } from 'express'
import { unauthorized } from './errors.js'
import type { RequestContext } from './auth-types.js'

/** Builds the audit context. Assumes `requireAdmin` already ran. */
export function requestContext(req: Request): RequestContext {
  if (!req.admin) {
    throw unauthorized()
  }

  return {
    adminId: req.admin.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }
}
