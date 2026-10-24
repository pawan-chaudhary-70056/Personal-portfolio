import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import { env } from '../../config/env.js'
import { ApiError } from '../../lib/errors.js'
import { requestContext } from '../../lib/request-context.js'
import { mapUploadError } from '../../lib/upload.js'
import { parseInput } from '../../lib/validate.js'
import { homepageDraftSchema, selectPortraitSchema } from '../../schemas/homepage.schema.js'
import {
  getAdminHomepage,
  publishHomepage,
  removeDraftPortrait,
  selectDraftPortrait,
  updateHomepageDraft,
  uploadDraftPortrait,
} from '../../services/homepage.service.js'

export function createAdminHomepageRouter(): Router {
  const router = Router()

  // Buffered in memory only for the duration of the request; the storage
  // service writes the validated bytes and the buffer is released.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.MEDIA_MAX_BYTES, files: 1, fields: 2 },
  })

  const portraitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: env.MEDIA_UPLOAD_LIMIT_PER_HOUR,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'rate_limited',
      message: 'Too many uploads have been attempted. Please try again later.',
    },
  })

  router.get('/', async (_req, res) => {
    res.json({ homepage: await getAdminHomepage() })
  })

  router.patch('/', async (req, res) => {
    const input = parseInput(homepageDraftSchema, req.body)
    res.json({ homepage: await updateHomepageDraft(input, requestContext(req)) })
  })

  router.post(
    '/portrait',
    portraitLimiter,
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

      const homepage = await uploadDraftPortrait(
        { buffer: req.file.buffer, originalName: req.file.originalname },
        requestContext(req),
      )

      res.status(201).json({ homepage })
    },
  )

  // Reuses an existing library image instead of uploading another copy.
  router.post('/portrait/library', async (req, res) => {
    const input = parseInput(selectPortraitSchema, req.body)
    res.json({
      homepage: await selectDraftPortrait(input.mediaId, requestContext(req)),
    })
  })

  router.delete('/portrait', async (req, res) => {
    res.json({ homepage: await removeDraftPortrait(requestContext(req)) })
  })

  router.post('/publish', async (req, res) => {
    res.json({ homepage: await publishHomepage(requestContext(req)) })
  })

  return router
}

