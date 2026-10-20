import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdSchema,
  updateProjectSchema,
} from '../../schemas/project.schema.js'
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject,
} from '../../services/projects.service.js'

export function createAdminProjectsRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = parseInput(listProjectsQuerySchema, req.query)
    res.json(await listProjects(query))
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createProjectSchema, req.body)
    const project = await createProject(input, requestContext(req))
    res.status(201).json({ project })
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(projectIdSchema, req.params.id)
    res.json({ project: await getProjectById(id) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(projectIdSchema, req.params.id)
    const input = parseInput(updateProjectSchema, req.body)
    res.json({ project: await updateProject(id, input, requestContext(req)) })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(projectIdSchema, req.params.id)
    await deleteProject(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
