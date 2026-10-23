import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { parseInput } from '../../lib/validate.js'
import { trackViewSchema } from '../../schemas/analytics.schema.js'
import { recordPageView } from '../../services/analytics.service.js'

/**
 * Public page-view counter. It stores no identifier of any kind: the body is
 * only the pathname, and unknown paths are ignored. CSRF protection still
 * applies because it is a state-changing POST under /api.
 */
export function createAnalyticsRouter(): Router {
  const router = Router()

  const viewLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'rate_limited',
      message: 'Too many requests. Please try again later.',
    },
  })

  router.post('/view', viewLimiter, async (req, res) => {
    const input = parseInput(trackViewSchema, req.body)
    await recordPageView(input.path)
    // Always 204 so the endpoint cannot be used to probe tracked routes.
    res.status(204).end()
  })

  return router
}
