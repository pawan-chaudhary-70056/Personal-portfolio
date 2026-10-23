import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { updateSiteSettingsSchema } from '../../schemas/site-settings.schema.js'
import { getSiteSettings, updateSiteSettings } from '../../services/site-settings.service.js'

/**
 * Only the allowlisted presentation fields documented in `docs/07 §11` are
 * readable or writable here. Infrastructure configuration has no endpoint.
 */
export function createAdminSettingsRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json({ settings: await getSiteSettings() })
  })

  router.patch('/', async (req, res) => {
    const input = parseInput(updateSiteSettingsSchema, req.body)
    res.json({ settings: await updateSiteSettings(input, requestContext(req)) })
  })

  return router
}
