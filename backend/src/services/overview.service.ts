import { prisma } from '../db/prisma.js'
import { listRecentAuditEvents } from './audit.service.js'

export async function getOverview() {
  const [
    total,
    draft,
    published,
    archived,
    featured,
    skillTotal,
    skillPublished,
    experienceTotal,
    experiencePublished,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: 'DRAFT' } }),
    prisma.project.count({ where: { status: 'PUBLISHED' } }),
    prisma.project.count({ where: { status: 'ARCHIVED' } }),
    prisma.project.count({ where: { featured: true } }),
    prisma.skill.count(),
    prisma.skill.count({ where: { published: true } }),
    prisma.experience.count(),
    prisma.experience.count({ where: { published: true } }),
  ])

  const recentEvents = await listRecentAuditEvents(8)

  return {
    projects: { total, draft, published, archived, featured },
    content: {
      skills: { total: skillTotal, published: skillPublished },
      experience: { total: experienceTotal, published: experiencePublished },
    },
    recentEvents,
  }
}
