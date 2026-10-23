import { Router } from 'express'
import { getPublicHomepage } from '../../services/homepage.service.js'

/**
 * Public homepage configuration (docs/07-backend-api.md §7.2 and §27).
 *
 * Values come from the existing HomepageSettings draft/published columns; nothing
 * here reads draft state. Site metadata is the allowlisted public subset.
 */
export function createPublicHomepageRouter(): Router {
  const router = Router()

  // The layout changes when the administrator publishes; do not cache it.
  router.get('/homepage', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ homepage: await getPublicHomepage() })
  })

  return router
}
