import { Router } from 'express'
import { notFound } from '../../lib/errors.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import { getPublicHero, readPublishedPortrait } from '../../services/homepage.service.js'

export function createPublicHeroRouter(): Router {
  const router = Router()

  // The hero state changes when the administrator publishes; do not cache it.
  router.get('/hero', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ hero: await getPublicHero() })
  })

  // Only the currently published, visible portrait is readable. Every other
  // identifier returns 404, so drafts are not reachable by guessing ids.
  router.get('/media/hero-portrait/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const result = await readPublishedPortrait(id)

    if (!result) {
      throw notFound('Image')
    }

    res.set({
      'Content-Type': result.asset.mimeType,
      'Content-Length': String(result.asset.sizeBytes),
      // Asset ids are unique per upload, so the bytes never change for this URL.
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    res.end(result.buffer)
  })

  return router
}
