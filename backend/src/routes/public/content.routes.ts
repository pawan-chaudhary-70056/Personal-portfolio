import { Router } from 'express'
import {
  listPublicProjectCategories,
  listPublicSkillCategories,
} from '../../services/categories.service.js'
import { listPublishedCertifications } from '../../services/certification.service.js'
import { listPublishedEducation } from '../../services/education.service.js'
import { listPublishedExperience } from '../../services/experience.service.js'
import { getPublicProfile } from '../../services/profile.service.js'
import { listPublishedSkills } from '../../services/skills.service.js'

export function createPublicContentRouter(): Router {
  const router = Router()

  // Categories are public only while they still group published content.
  router.get('/project-categories', async (_req, res) => {
    res.json({ categories: await listPublicProjectCategories() })
  })

  router.get('/skill-categories', async (_req, res) => {
    res.json({ categories: await listPublicSkillCategories() })
  })

  // Published records only, with public fields selected explicitly.
  router.get('/skills', async (_req, res) => {
    res.json({ skills: await listPublishedSkills() })
  })

  router.get('/experience', async (_req, res) => {
    res.json({ experience: await listPublishedExperience() })
  })

  router.get('/education', async (_req, res) => {
    res.json({ education: await listPublishedEducation() })
  })

  router.get('/certifications', async (_req, res) => {
    res.json({ certifications: await listPublishedCertifications() })
  })

  // Only approved public profile fields; null until the owner saves one.
  router.get('/profile', async (_req, res) => {
    res.json({ profile: await getPublicProfile() })
  })

  return router
}
