import { Router } from 'express'
import { parseInput } from '../../lib/validate.js'
import { requireAdmin } from '../../middleware/require-admin.js'
import { listAuditLogsQuerySchema } from '../../schemas/audit.schema.js'
import { listAuditEvents } from '../../services/audit.service.js'
import { getOverview } from '../../services/overview.service.js'
import { createAdminExperienceRouter } from './experience.routes.js'
import { createAdminProjectsRouter } from './projects.routes.js'
import { createAdminSessionsRouter } from './sessions.routes.js'
import { createAdminSkillsRouter } from './skills.routes.js'

export function createAdminRouter(): Router {
  const router = Router()

  // Every admin route is authenticated and authorized on the server.
  router.use(requireAdmin)

  router.get('/overview', async (_req, res) => {
    res.json(await getOverview())
  })

  // Read-only: audit records are append-only and have no mutable endpoints.
  router.get('/audit-logs', async (req, res) => {
    const query = parseInput(listAuditLogsQuerySchema, req.query)
    res.json(await listAuditEvents(query))
  })

  router.use('/projects', createAdminProjectsRouter())
  router.use('/skills', createAdminSkillsRouter())
  router.use('/experience', createAdminExperienceRouter())
  router.use('/sessions', createAdminSessionsRouter())

  return router
}
