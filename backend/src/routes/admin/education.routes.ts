import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  createEducationSchema,
  listEducationQuerySchema,
  updateEducationSchema,
} from '../../schemas/education.schema.js'
import {
  createEducation,
  deleteEducation,
  getEducation,
  listEducation,
  updateEducation,
} from '../../services/education.service.js'

export function createAdminEducationRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = parseInput(listEducationQuerySchema, req.query)
    res.json({ education: await listEducation(query) })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createEducationSchema, req.body)
    const education = await createEducation(input, requestContext(req))
    res.status(201).json({ education })
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json({ education: await getEducation(id) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateEducationSchema, req.body)
    res.json({ education: await updateEducation(id, input, requestContext(req)) })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteEducation(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
