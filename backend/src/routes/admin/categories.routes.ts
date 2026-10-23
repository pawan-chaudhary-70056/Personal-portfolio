import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import { createCategorySchema, updateCategorySchema } from '../../schemas/category.schema.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  createProjectCategory,
  createSkillCategory,
  deleteProjectCategory,
  deleteSkillCategory,
  listProjectCategories,
  listSkillCategories,
  updateProjectCategory,
  updateSkillCategory,
} from '../../services/categories.service.js'

export function createAdminProjectCategoriesRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json({ categories: await listProjectCategories() })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createCategorySchema, req.body)
    const category = await createProjectCategory(input, requestContext(req))
    res.status(201).json({ category })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateCategorySchema, req.body)
    const category = await updateProjectCategory(id, input, requestContext(req))
    res.json({ category })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteProjectCategory(id, requestContext(req))
    res.status(204).end()
  })

  return router
}

export function createAdminSkillCategoriesRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    res.json({ categories: await listSkillCategories() })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createCategorySchema, req.body)
    const category = await createSkillCategory(input, requestContext(req))
    res.status(201).json({ category })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateCategorySchema, req.body)
    const category = await updateSkillCategory(id, input, requestContext(req))
    res.json({ category })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteSkillCategory(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
