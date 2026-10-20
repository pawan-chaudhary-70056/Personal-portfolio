import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  createSkillSchema,
  listSkillsQuerySchema,
  updateSkillSchema,
} from '../../schemas/skill.schema.js'
import {
  createSkill,
  deleteSkill,
  getSkill,
  listSkills,
  updateSkill,
} from '../../services/skills.service.js'

export function createAdminSkillsRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = parseInput(listSkillsQuerySchema, req.query)
    res.json({ skills: await listSkills(query) })
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json({ skill: await getSkill(id) })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createSkillSchema, req.body)
    res.status(201).json({ skill: await createSkill(input, requestContext(req)) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateSkillSchema, req.body)
    res.json({ skill: await updateSkill(id, input, requestContext(req)) })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteSkill(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
