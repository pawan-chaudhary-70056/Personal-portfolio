import { Router } from 'express'
import { requestContext } from '../../lib/request-context.js'
import { parseInput } from '../../lib/validate.js'
import {
  createCertificationSchema,
  listCertificationsQuerySchema,
  updateCertificationSchema,
} from '../../schemas/certification.schema.js'
import { recordIdSchema } from '../../schemas/common.schema.js'
import {
  createCertification,
  deleteCertification,
  getCertification,
  listCertifications,
  updateCertification,
} from '../../services/certification.service.js'

export function createAdminCertificationsRouter(): Router {
  const router = Router()

  router.get('/', async (req, res) => {
    const query = parseInput(listCertificationsQuerySchema, req.query)
    res.json({ certifications: await listCertifications(query) })
  })

  router.post('/', async (req, res) => {
    const input = parseInput(createCertificationSchema, req.body)
    const certification = await createCertification(input, requestContext(req))
    res.status(201).json({ certification })
  })

  router.get('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    res.json({ certification: await getCertification(id) })
  })

  router.patch('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    const input = parseInput(updateCertificationSchema, req.body)
    res.json({
      certification: await updateCertification(id, input, requestContext(req)),
    })
  })

  router.delete('/:id', async (req, res) => {
    const id = parseInput(recordIdSchema, req.params.id)
    await deleteCertification(id, requestContext(req))
    res.status(204).end()
  })

  return router
}
