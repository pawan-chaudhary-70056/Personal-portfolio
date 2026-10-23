import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  createAdministratorSchema,
  resetAdministratorPasswordSchema,
  updateAdministratorSchema,
} from '../../schemas/administrator.schema.js'
import {
  createAdministrator,
  listAdministrators,
  resetAdministratorPassword,
  updateAdministrator,
} from '../../services/administrators.service.js'

/** Owner-only account management; mounted behind `requireOwner`. */
export function createAdministratorsRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json({ administrators: await listAdministrators() })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createAdministratorSchema, req.body)
    res.status(201).json({ administrator: await createAdministrator(input, requestContext(req)) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateAdministratorSchema, req.body)
    res.json({ administrator: await updateAdministrator(id, input, requestContext(req)) })
  })

  router.post('/:id/password', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(resetAdministratorPasswordSchema, req.body)
    await resetAdministratorPassword(id, input.password, requestContext(req))
    res.status(204).end()
  })

  return router
}
