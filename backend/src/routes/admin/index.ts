import { Router } from 'express'
import { parseInput } from '../../lib/validate.js'
import { requireAdmin } from '../../middleware/require-admin.js'
import { requireOwner } from '../../middleware/require-owner.js'
import { analyticsQuerySchema } from '../../schemas/analytics.schema.js'
import { listAuditLogsQuerySchema, loginMonitoringQuerySchema } from '../../schemas/audit.schema.js'
import { listAuditEvents } from '../../services/audit.service.js'
import { getLoginMonitoring } from '../../services/login-monitoring.service.js'
import { getAnalytics } from '../../services/analytics.service.js'
import { getSystemHealth } from '../../services/health.service.js'
import { getOverview } from '../../services/overview.service.js'
import { createAdminProjectCategoriesRouter, createAdminSkillCategoriesRouter } from './categories.routes.js'
import { createAdministratorsRouter } from './administrators.routes.js'
import { createAdminCertificationsRouter } from './certifications.routes.js'
import { createContentAdminRouter } from './content.routes.js'
import { createAdminEducationRouter } from './education.routes.js'
import { createAdminExperienceRouter } from './experience.routes.js'
import { createAdminHomepageRouter } from './homepage.routes.js'
import { createAdminMediaRouter } from './media.routes.js'
import { createAdminMfaRouter } from './mfa.routes.js'
import { createAdminMessagesRouter } from './messages.routes.js'
import { createAdminProfileRouter } from './profile.routes.js'
import { createAdminProjectsRouter } from './projects.routes.js'
import { createAdminSessionsRouter } from './sessions.routes.js'
import { createAdminSettingsRouter } from './settings.routes.js'
import { createAdminSkillsRouter } from './skills.routes.js'

export function createAdminRouter(): Router {
  const router = Router()

  // Every admin route is authenticated and authorized on the server.
  router.use(requireAdmin)

  router.get('/overview', async (_req, res) => {
    res.json(await getOverview())
  })

  // Safe infrastructure indicators; no credentials, paths, or stack traces.
  router.get('/health', requireOwner, async (_req, res) => {
    res.json(await getSystemHealth())
  })

  // Aggregate page views only; never per-visitor data.
  router.get('/analytics', requireOwner, async (req, res) => {
    const query = parseInput(analyticsQuerySchema, req.query)
    res.json(await getAnalytics(query.days))
  })

  // Read-only: audit records are append-only and have no mutable endpoints.
  // The log reveals account and security activity, so it is owner-only.
  router.get('/audit-logs', requireOwner, async (req, res) => {
    const query = parseInput(listAuditLogsQuerySchema, req.query)
    res.json(await listAuditEvents(query))
  })

  // Failed-login monitoring aggregates the same append-only trail: failed
  // password attempts, failed second-factor codes, and successes per window.
  router.get('/login-monitoring', requireOwner, async (req, res) => {
    const query = parseInput(loginMonitoringQuerySchema, req.query)
    res.json(await getLoginMonitoring(query))
  })

  router.use(createContentAdminRouter())
  router.use('/administrators', requireOwner, createAdministratorsRouter())

  router.use('/mfa', createAdminMfaRouter())
  router.use('/profile', createAdminProfileRouter())
  router.use('/homepage', createAdminHomepageRouter())
  router.use('/settings', requireOwner, createAdminSettingsRouter())
  router.use('/media', createAdminMediaRouter())
  router.use('/projects', createAdminProjectsRouter())
  router.use('/project-categories', createAdminProjectCategoriesRouter())
  router.use('/skills', createAdminSkillsRouter())
  router.use('/skill-categories', createAdminSkillCategoriesRouter())
  router.use('/experience', createAdminExperienceRouter())
  router.use('/education', createAdminEducationRouter())
  router.use('/certifications', createAdminCertificationsRouter())
  router.use('/messages', createAdminMessagesRouter())
  router.use('/sessions', requireOwner, createAdminSessionsRouter())

  return router
}
