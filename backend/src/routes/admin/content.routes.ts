import { Router } from 'express'
import { ApiError } from '../../lib/errors.js'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  bulkActionSchema,
  bulkTrashSchema,
  contentEntitySchema,
  revisionQuerySchema,
  schedulePublicationSchema,
  trashQuerySchema,
} from '../../schemas/content.schema.js'
import { applyBulkAction } from '../../services/bulk.service.js'
import { getRevisionById, listRevisions, restoreRevision } from '../../services/revisions.service.js'
import {
  listSchedulableContent,
  scheduleContentPublication,
} from '../../services/scheduling.service.js'
import {
  listTrash,
  purgeTrashed,
  purgeTrashedMany,
  restoreTrashed,
  restoreTrashedMany,
} from '../../services/trash.service.js'

/**
 * Cross-collection administration: bulk actions, the trash, and revision
 * history. Mounted behind `requireAdmin` like every other admin route.
 */
export function createContentAdminRouter(): Router {
  const router = Router()

  router.post('/bulk/:type', async (req, res) => {
    const type = parseInput(contentEntitySchema, req.params.type)
    const input = parseInput(bulkActionSchema, req.body)
    res.json(await applyBulkAction(type, input, requestContext(req)))
  })

  router.patch('/schedule/:type/:id', async (req, res) => {
    const type = parseInput(contentEntitySchema, req.params.type)
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(schedulePublicationSchema, req.body)

    let publishAt: Date | null = null

    if (input.publishAt !== null) {
      publishAt = new Date(input.publishAt)

      if (Number.isNaN(publishAt.getTime())) {
        throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
          { path: 'publishAt', message: 'Enter a valid date and time.' },
        ])
      }
    }

    const snapshot = await scheduleContentPublication(type, id, publishAt, requestContext(req))
    res.json({ type, id, publishAt: snapshot.publishAt ?? null })
  })

  router.get('/scheduling', async (_req, res) => {
    res.json({ items: await listSchedulableContent() })
  })

  router.get('/trash', async (req, res) => {
    const query = parseInput(trashQuerySchema, req.query)
    res.json(await listTrash(query))
  })

  // Bulk operations span content types, so the type travels with each entry.
  router.post('/trash/restore', async (req, res) => {
    const input = parseInput(bulkTrashSchema, req.body)
    res.json(await restoreTrashedMany(input, requestContext(req)))
  })

  router.post('/trash/purge', async (req, res) => {
    const input = parseInput(bulkTrashSchema, req.body)
    res.json(await purgeTrashedMany(input, requestContext(req)))
  })

  router.post('/trash/:type/:id/restore', async (req, res) => {
    const type = parseInput(contentEntitySchema, req.params.type)
    const id = parseInput(recordIdSchema, req.params.id)
    await restoreTrashed(type, id, requestContext(req))
    res.json({ restored: true })
  })

  router.delete('/trash/:type/:id', async (req, res) => {
    const type = parseInput(contentEntitySchema, req.params.type)
    const id = parseInput(recordIdSchema, req.params.id)
    await purgeTrashed(type, id, requestContext(req))
    res.status(204).end()
  })

  router.get('/revisions', async (req, res) => {
    const query = parseInput(revisionQuerySchema, req.query)
    res.json(await listRevisions(query))
  })

  router.get('/revisions/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json({ revision: await getRevisionById(id) })
  })

  router.post('/revisions/:id/restore', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json(await restoreRevision(id, requestContext(req)))
  })

  return router
}
