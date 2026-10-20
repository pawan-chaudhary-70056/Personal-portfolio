import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  createExperienceSchema,
  listExperienceQuerySchema,
  updateExperienceSchema,
} from '../../schemas/experience.schema.js'
import {
  createExperience,
  deleteExperience,
  getExperience,
  listExperience,
  updateExperience,
} from '../../services/experience.service.js'

export function createAdminExperienceRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = parseInput(listExperienceQuerySchema, req.query)
    res.json({ experience: await listExperience(query) })
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json({ experience: await getExperience(id) })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createExperienceSchema, req.body)
    res.status(201).json({ experience: await createExperience(input, requestContext(req)) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateExperienceSchema, req.body)
    res.json({ experience: await updateExperience(id, input, requestContext(req)) })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteExperience(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
