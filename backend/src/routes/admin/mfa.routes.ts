import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { mfaCodeSchema, mfaPasswordCodeSchema } from '../../schemas/mfa.schema.js'
import {
  disableMfa,
  enableMfa,
  getMfaStatus,
  regenerateRecoveryCodes,
  startMfaSetup,
} from '../../services/mfa.service.js'

/**
 * Two-factor management for the current administrator. Mounted behind
 * `requireAdmin`; every operation acts on `req.admin.id` only, so an editor can
 * enrol or reset their own account but cannot touch anyone else's.
 */
export function createAdminMfaRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    res.json({ mfa: await getMfaStatus(req.admin!.id) })
  })

  router.post('/setup', async (req, res) => {
    res.json({ setup: await startMfaSetup(req.admin!.id) })
  })

  router.post('/enable', async (req, res) => {
    const input = parseInput(mfaCodeSchema, req.body)
    const result = await enableMfa(req.admin!.id, input.code, requestContext(req), req.sessionID)
    res.json(result)
  })

  router.post('/disable', async (req, res) => {
    const input = parseInput(mfaPasswordCodeSchema, req.body)
    await disableMfa(req.admin!.id, input, requestContext(req), req.sessionID)
    res.status(204).end()
  })

  router.post('/recovery-codes', async (req, res) => {
    const input = parseInput(mfaPasswordCodeSchema, req.body)
    res.json(await regenerateRecoveryCodes(req.admin!.id, input, requestContext(req)))
  })

  return router
}
