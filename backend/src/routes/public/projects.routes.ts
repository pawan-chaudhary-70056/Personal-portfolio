import { Router } from 'express'
import { listPublishedProjects } from '../../services/projects.service.js'

export function createPublicProjectsRouter(): Router {
  const router = Router()

  // Only published projects are exposed, and only public fields are selected.
  router.get('/', async (_req, res) => {
    res.json({ projects: await listPublishedProjects() })
  })

  return router
}
