import { Router } from 'express'
import { listPublishedExperience } from '../../services/experience.service.js'
import { listPublishedSkills } from '../../services/skills.service.js'

export function createPublicContentRouter(): Router {
  const router = Router()

  // Published records only, with public fields selected explicitly.
  router.get('/skills', async (_req, res) => {
    res.json({ skills: await listPublishedSkills() })
  })

  router.get('/experience', async (_req, res) => {
    res.json({ experience: await listPublishedExperience() })
  })

  return router
}
