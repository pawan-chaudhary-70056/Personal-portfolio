import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { updateProfileSchema } from '../../schemas/profile.schema.js'
import { getProfile, updateProfile } from '../../services/profile.service.js'

export function createAdminProfileRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json({ profile: await getProfile() })
  })

  router.patch('/', async (req, res) => {
    const input = parseInput(updateProfileSchema, req.body)
    res.json({ profile: await updateProfile(input, requestContext(req)) })
  })

  return router
}
