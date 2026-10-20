import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { sessionFingerprintSchema } from '../../schemas/session.schema.js'
import {
  listAdminSessions,
  revokeOtherSessions,
  revokeSession,
} from '../../services/sessions.service.js'

export function createAdminSessionsRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const sessions = await listAdminSessions(req.admin!.id, req.sessionID)
    res.json({ sessions })
  })

  /** Revokes every other session for the signed-in administrator. */
  router.delete('/', async (req, res) => {
    const revoked = await revokeOtherSessions(
      req.admin!.id,
      req.sessionID,
      requestContext(req),
    )
    res.json({ revoked })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(sessionFingerprintSchema, req.params.id)
    await revokeSession(id, req.admin!.id, req.sessionID, requestContext(req))
    res.status(204).end()
  })

  return router
}
