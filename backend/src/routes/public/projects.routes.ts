import { Router } from 'express'
import { parseInput } from '../../lib/validate.js'
import { publicProjectListQuerySchema } from '../../schemas/project.schema.js'
import {
  getPublishedProjectBySlug,
  listPublishedProjects,
} from '../../services/projects.service.js'

export function createPublicProjectsRouter(): Router {
  const router = Router()

  // Only published projects are exposed, and only public fields are selected.
  router.get('/', async (req, res) => {
    const query = parseInput(publicProjectListQuerySchema, req.query)
    res.json({ projects: await listPublishedProjects(query.category) })
  })

  // Unpublished or unknown slugs return 404 rather than revealing draft content.
  router.get('/:slug', async (req, res) => {
    res.json({ project: await getPublishedProjectBySlug(req.params.slug) })
  })

  return router
}
