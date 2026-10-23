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
    educationTotal,
    educationPublished,
    certificationTotal,
    certificationPublished,
  ] = await Promise.all([
    // Trashed records are excluded everywhere: they are not part of the portfolio.
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { status: 'DRAFT', deletedAt: null } }),
    prisma.project.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    prisma.project.count({ where: { status: 'ARCHIVED', deletedAt: null } }),
    prisma.project.count({ where: { featured: true, deletedAt: null } }),
    prisma.skill.count({ where: { deletedAt: null } }),
    prisma.skill.count({ where: { published: true, deletedAt: null } }),
    prisma.experience.count({ where: { deletedAt: null } }),
    prisma.experience.count({ where: { published: true, deletedAt: null } }),
    prisma.education.count({ where: { deletedAt: null } }),
    prisma.education.count({ where: { published: true, deletedAt: null } }),
    prisma.certification.count({ where: { deletedAt: null } }),
    prisma.certification.count({ where: { published: true, deletedAt: null } }),
  ])

  const recentEvents = await listRecentAuditEvents(8)

  return {
    projects: { total, draft, published, archived, featured },
    content: {
      skills: { total: skillTotal, published: skillPublished },
      experience: { total: experienceTotal, published: experiencePublished },
      education: { total: educationTotal, published: educationPublished },
      certifications: { total: certificationTotal, published: certificationPublished },
    },
    recentEvents,
  }
}
