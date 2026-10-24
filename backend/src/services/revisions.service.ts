import type { RequestContext } from '../lib/auth-types.js'
import { recordAudit } from '../lib/audit.js'
import { prisma } from '../db/prisma.js'
import { conflict, notFound } from '../lib/errors.js'
import { parseInput } from '../lib/validate.js'
import {
  updateCertificationSchema,
} from '../schemas/certification.schema.js'
import { updateEducationSchema } from '../schemas/education.schema.js'
import { updateExperienceSchema } from '../schemas/experience.schema.js'
import { updateProjectSchema } from '../schemas/project.schema.js'
import { updateSkillSchema } from '../schemas/skill.schema.js'
import type { RevisionQuery } from '../schemas/content.schema.js'
import { updateCertification } from './certification.service.js'
import {
  contentEntityType,
  findContentState,
  type ContentType,
} from './content.service.js'
import { updateEducation } from './education.service.js'
import { updateExperience } from './experience.service.js'
import { updateProject } from './projects.service.js'
import { updateSkill } from './skills.service.js'

const TYPE_BY_ENTITY: Record<string, ContentType> = {
  Project: 'project',
  Skill: 'skill',
  Experience: 'experience',
  Education: 'education',
  Certification: 'certification',
}

export async function listRevisions(query: RevisionQuery) {
  const where = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.contentRevision.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        createdAt: true,
        admin: { select: { name: true } },
      },
    }),
    prisma.contentRevision.count({ where }),
  ])

  return {
    items: rows.map(({ admin, ...row }) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      adminName: admin?.name ?? null,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getRevisionById(id: string) {
  const revision = await prisma.contentRevision.findUnique({
    where: { id },
    include: { admin: { select: { name: true } } },
  })

  if (!revision) {
    throw notFound('Revision')
  }

  // The snapshot taken just before this one is what the preview diffs against.
  // Ids break ties so two revisions written in the same millisecond still have a
  // stable order, matching the list's createdAt/id ordering.
  const previous = await prisma.contentRevision.findFirst({
    where: {
      entityType: revision.entityType,
      entityId: revision.entityId,
      OR: [
        { createdAt: { lt: revision.createdAt } },
        { createdAt: revision.createdAt, id: { lt: revision.id } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, action: true, createdAt: true, snapshot: true },
  })

  return {
    id: revision.id,
    entityType: revision.entityType,
    entityId: revision.entityId,
    action: revision.action,
    createdAt: revision.createdAt.toISOString(),
    adminName: revision.admin?.name ?? null,
    snapshot: revision.snapshot,
    previous: previous
      ? {
          id: previous.id,
          action: previous.action,
          createdAt: previous.createdAt.toISOString(),
          snapshot: previous.snapshot,
        }
      : null,
  }
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function nullableValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function screenshots(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    const screenshot = item as Record<string, unknown>
    const mediaId = nullableValue(screenshot.mediaId)

    return {
      // A library image has no URL in the snapshot; the id is the source.
      url: mediaId ? null : stringValue(screenshot.url) || null,
      mediaId,
      alt: stringValue(screenshot.alt),
      caption: nullableValue(screenshot.caption),
    }
  })
}

/**
 * Restores a revision by re-applying its snapshot through the same service
 * update path as an administrator edit, so validation, audit events, and a new
 * revision all behave exactly as they do for normal saves.
 */
export async function restoreRevision(id: string, ctx: RequestContext) {
  const revision = await prisma.contentRevision.findUnique({ where: { id } })

  if (!revision) {
    throw notFound('Revision')
  }

  const type = TYPE_BY_ENTITY[revision.entityType]

  if (!type) {
    throw notFound('Revision')
  }

  const state = await findContentState(type, revision.entityId)

  if (!state) {
    throw notFound(revision.entityType)
  }

  if (state.deletedAt) {
    throw conflict('Restore the record from the trash before restoring an earlier revision.')
  }

  const snapshot = revision.snapshot as Record<string, unknown>

  switch (revision.entityType) {
    case 'Project': {
      const status = stringValue(snapshot.status, 'DRAFT')
      const input = parseInput(updateProjectSchema, {
        title: stringValue(snapshot.title),
        slug: stringValue(snapshot.slug),
        summary: stringValue(snapshot.summary),
        description: stringValue(snapshot.description),
        category: stringValue(snapshot.category),
        year: stringValue(snapshot.year),
        technologies: stringArray(snapshot.technologies),
        liveUrl: nullableValue(snapshot.liveUrl),
        repositoryUrl: nullableValue(snapshot.repositoryUrl),
        imageUrl: nullableValue(snapshot.imageUrl),
        coverMediaId: nullableValue(snapshot.coverMediaId),
        imageAlt: nullableValue(snapshot.imageAlt),
        status: status === 'PUBLISHED' || status === 'ARCHIVED' ? status : 'DRAFT',
        featured: snapshot.featured === true,
        sortOrder: typeof snapshot.sortOrder === 'number' ? snapshot.sortOrder : 0,
        screenshots: screenshots(snapshot.screenshots),
      })
      await updateProject(revision.entityId, input, ctx)
      break
    }
    case 'Skill': {
      const input = parseInput(updateSkillSchema, {
        name: stringValue(snapshot.name),
        category: stringValue(snapshot.category),
        description: nullableValue(snapshot.description),
        sortOrder: typeof snapshot.sortOrder === 'number' ? snapshot.sortOrder : 0,
        published: snapshot.published !== false,
      })
      await updateSkill(revision.entityId, input, ctx)
      break
    }
    case 'Experience': {
      const input = parseInput(updateExperienceSchema, {
        role: stringValue(snapshot.role),
        organization: stringValue(snapshot.organization),
        employmentType: nullableValue(snapshot.employmentType),
        location: nullableValue(snapshot.location),
        description: nullableValue(snapshot.description),
        startDate: stringValue(snapshot.startDate),
        endDate: nullableValue(snapshot.endDate),
        isCurrent: snapshot.isCurrent === true,
        published: snapshot.published !== false,
        sortOrder: typeof snapshot.sortOrder === 'number' ? snapshot.sortOrder : 0,
      })
      await updateExperience(revision.entityId, input, ctx)
      break
    }
    case 'Education': {
      const input = parseInput(updateEducationSchema, {
        institution: stringValue(snapshot.institution),
        qualification: stringValue(snapshot.qualification),
        fieldOfStudy: nullableValue(snapshot.fieldOfStudy),
        description: nullableValue(snapshot.description),
        startDate: nullableValue(snapshot.startDate),
        endDate: nullableValue(snapshot.endDate),
        sortOrder: typeof snapshot.sortOrder === 'number' ? snapshot.sortOrder : 0,
        published: snapshot.published !== false,
      })
      await updateEducation(revision.entityId, input, ctx)
      break
    }
    case 'Certification': {
      const input = parseInput(updateCertificationSchema, {
        name: stringValue(snapshot.name),
        issuingOrganization: stringValue(snapshot.issuingOrganization),
        issueDate: nullableValue(snapshot.issueDate),
        expiryDate: nullableValue(snapshot.expiryDate),
        credentialId: nullableValue(snapshot.credentialId),
        credentialUrl: nullableValue(snapshot.credentialUrl),
        sortOrder: typeof snapshot.sortOrder === 'number' ? snapshot.sortOrder : 0,
        published: snapshot.published !== false,
      })
      await updateCertification(revision.entityId, input, ctx)
      break
    }
  }

  await recordAudit({
    action: 'REVISION_RESTORED',
    entityType: revision.entityType,
    entityId: revision.entityId,
    adminId: ctx.adminId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: {
      revisionId: revision.id,
      snapshotAction: revision.action,
      contentEntity: contentEntityType(type),
    },
  })

  return { revisionId: revision.id, entityId: revision.entityId, entityType: revision.entityType }
}
