import type { RequestHandler } from 'express'
import { prisma } from '../db/prisma.js'
import { ABSOLUTE_SESSION_MS } from '../lib/auth-types.js'
import { unauthorized } from '../lib/errors.js'

/**
 * Enforces authentication on the server for every admin route. Hiding buttons
 * in the frontend is not authorization.
 */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const adminId = req.session?.adminId

    if (!adminId) {
      throw unauthorized()
    }

    const loggedInAt = req.session.loggedInAt ?? 0
    if (!loggedInAt || Date.now() - loggedInAt > ABSOLUTE_SESSION_MS) {
      req.session.destroy(() => undefined)
      throw unauthorized('Your session has expired. Please sign in again.')
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true, isActive: true },
    })

    if (!admin || !admin.isActive) {
      req.session.destroy(() => undefined)
      throw unauthorized('Your session is no longer valid. Please sign in again.')
    }

    req.admin = { id: admin.id, email: admin.email, name: admin.name }
    next()
  } catch (error) {
    next(error)
  }
}
