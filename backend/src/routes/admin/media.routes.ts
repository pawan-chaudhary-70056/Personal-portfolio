import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import { env } from '../../config/env.js'
import { ApiError } from '../../lib/errors.js'
import { requestContext } from '../../lib/request-context.js'
import { mapUploadError } from '../../lib/upload.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import { listMediaQuerySchema, updateMediaSchema } from '../../schemas/media.schema.js'
import {
  deleteMediaAsset,
  getMedia,
  listMedia,
  readMediaFile,
  updateMedia,
  uploadMedia,
} from '../../services/media.service.js'

/**
 * The general media library (docs/07-backend-api.md §10,
 * docs/09-admin-dashboard.md §17). Every route requires a signed-in
 * administrator; the router is mounted behind `requireAdmin`.
 */
export function createAdminMediaRouter(): Router {
  const router = Router()

  // Buffered in memory only for the duration of the request.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.MEDIA_MAX_BYTES, files: 1, fields: 0 },
  })

  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: env.MEDIA_UPLOAD_LIMIT_PER_HOUR,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'rate_limited',
      message: 'Too many uploads have been attempted. Please try again later.',
    },
  })

  router.get('/', async (req, res) => {
    const query = parseInput(listMediaQuerySchema, req.query)
    res.json(await listMedia(query))
  })

  router.post(
    '/',
    uploadLimiter,
    (req, res, next) => {
      upload.single('file')(req, res, (error: unknown) => {
        if (error) {
          next(mapUploadError(error))
          return
        }

        next()
      })
    },
    async (req, res) => {
      if (!req.file) {
        throw new ApiError(400, 'invalid_upload', 'Choose an image to upload.', [
          { path: 'file', message: 'Choose a JPEG, PNG, or WebP image.' },
        ])
      }

      const media = await uploadMedia(
        { buffer: req.file.buffer, originalName: req.file.originalname },
        requestContext(req),
      )

      res.status(201).json({ media })
    },
  )

  router.get('/:id/file', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const { asset, buffer } = await readMediaFile(id)

    res.set({
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.sizeBytes),
      // Library previews are served only to the signed-in administrator.
      'Cache-Control': 'private, no-store',
    })
    res.end(buffer)
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json({ media: await getMedia(id) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateMediaSchema, req.body)
    res.json({ media: await updateMedia(id, input, requestContext(req)) })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteMediaAsset(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
