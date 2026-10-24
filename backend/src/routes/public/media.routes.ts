import { Router, type Response } from 'express'
import { notFound } from '../../lib/errors.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  readProfilePortrait,
  readPublishedProjectCover,
  readPublishedProjectScreenshot,
} from '../../services/media.service.js'

interface ReadableImage {
  asset: { mimeType: string; sizeBytes: number }
  buffer: Buffer
}

/**
 * Public bytes for images attached to content (docs/14 §10). Only assets that
 * the public site actually displays are readable; drafts and library uploads
 * that were never attached return 404 instead of leaking unreviewed images.
 */
export function createPublicMediaRouter(): Router {
  const router = Router()

  function sendImage(res: Response, result: ReadableImage) {
    res.set({
      'Content-Type': result.asset.mimeType,
      'Content-Length': String(result.asset.sizeBytes),
      // Asset ids are unique per upload, so the bytes never change for this URL.
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    res.end(result.buffer)
  }

  router.get('/media/project-cover/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const result = await readPublishedProjectCover(id)

    if (!result) {
      throw notFound('Image')
    }

    sendImage(res, result)
  })

  router.get('/media/project-screenshot/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const result = await readPublishedProjectScreenshot(id)

    if (!result) {
      throw notFound('Image')
    }

    sendImage(res, result)
  })

  router.get('/media/profile-portrait/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const result = await readProfilePortrait(id)

    if (!result) {
      throw notFound('Image')
    }

    sendImage(res, result)
  })

  return router
}
