import type { RequestContext } from '../lib/auth-types.js'
import { recordAudit } from '../lib/audit.js'
import { prisma } from '../db/prisma.js'
import { ApiError, conflict, notFound } from '../lib/errors.js'
import {
  CONTENT_TYPES,
  buildSnapshot,
  contentAuditPrefix,
  contentEntityType,
  contentLabel,
  findContentState,
  recordContentRevision,
  setContentPublishAt,
  type ContentType,
} from './content.service.js'

function isPublishedSnapshot(type: ContentType, snapshot: Record<string, unknown>): boolean {
  return type === 'project' ? snapshot.status === 'PUBLISHED' : snapshot.published === true
}

/**
 * Sets or clears a future publication time. Scheduling is only meaningful for
 * unpublished records: publishing a live record happens immediately through the
 * normal publish action.
 */
export async function scheduleContentPublication(
  type: ContentType,
  id: string,
  publishAt: Date | null,
  ctx: RequestContext,
) {
  return prisma.$transaction(async (tx) => {
    const state = await findContentState(type, id, tx)

    if (!state) {
      throw notFound(contentLabel(type))
    }

    if (state.deletedAt) {
      throw conflict(`Restore this ${contentLabel(type).toLowerCase()} before scheduling it.`)
    }

    const snapshot = await buildSnapshot(type, id, tx)

    if (publishAt === null) {
      await setContentPublishAt(tx, type, id, null)

      await recordAudit(
        {
          action: `${contentAuditPrefix(type)}_SCHEDULE_CANCELLED`,
          entityType: contentEntityType(type),
          entityId: id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { previousPublishAt: snapshot.publishAt ?? null },
        },
        tx,
      )

      await recordContentRevision(tx, type, id, 'UPDATED', ctx.adminId)
      return buildSnapshot(type, id, tx)
    }

    if (isPublishedSnapshot(type, snapshot)) {
      throw conflict(
        `This ${contentLabel(type).toLowerCase()} is already published. Unpublish it before scheduling.`,
      )
    }

    if (publishAt.getTime() <= Date.now()) {
      throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
        { path: 'publishAt', message: 'Choose a time in the future.' },
      ])
    }

    await setContentPublishAt(tx, type, id, publishAt)

    await recordAudit(
      {
        action: `${contentAuditPrefix(type)}_SCHEDULED`,
        entityType: contentEntityType(type),
        entityId: id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { publishAt: publishAt.toISOString() },
      },
      tx,
    )

    await recordContentRevision(tx, type, id, 'UPDATED', ctx.adminId)
    return buildSnapshot(type, id, tx)
  })
}

async function findDueRecords(type: ContentType, now: Date) {
  const where = { publishAt: { lte: now }, deletedAt: null } as const

  switch (type) {
    case 'project':
      return prisma.project.findMany({
        where,
        select: { id: true, publishAt: true },
        take: 50,
      })
    case 'skill':
      return prisma.skill.findMany({ where, select: { id: true, publishAt: true }, take: 50 })
    case 'experience':
      return prisma.experience.findMany({ where, select: { id: true, publishAt: true }, take: 50 })
    case 'education':
      return prisma.education.findMany({ where, select: { id: true, publishAt: true }, take: 50 })
    case 'certification':
      return prisma.certification.findMany({
        where,
        select: { id: true, publishAt: true },
        take: 50,
      })
  }
}

/** Conditional update: returns 0 when another worker already promoted the row. */
async function promote(
  type: ContentType,
  id: string,
  now: Date,
  publishAt: Date,
): Promise<number> {
  const where = { id, publishAt: { lte: now }, deletedAt: null }

  switch (type) {
    case 'project':
      return (
        await prisma.project.updateMany({
          where,
          data: { status: 'PUBLISHED', publishedAt: publishAt, archivedAt: null, publishAt: null },
        })
      ).count
    case 'skill':
      return (await prisma.skill.updateMany({ where, data: { published: true, publishAt: null } }))
        .count
    case 'experience':
      return (
        await prisma.experience.updateMany({
          where,
          data: { published: true, publishAt: null },
        })
      ).count
    case 'education':
      return (
        await prisma.education.updateMany({ where, data: { published: true, publishAt: null } })
      ).count
    case 'certification':
      return (
        await prisma.certification.updateMany({
          where,
          data: { published: true, publishAt: null },
        })
      ).count
  }
}

export interface SchedulableItem {
  type: ContentType
  id: string
  title: string
  subtitle: string | null
  publishAt: string | null
}

/** Unpublished, live records that can be scheduled right now. */
export async function listSchedulableContent(): Promise<SchedulableItem[]> {
  const [projects, skills, experience, education, certifications] = await Promise.all([
    prisma.project.findMany({
      where: { status: { not: 'PUBLISHED' }, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
      select: { id: true, title: true, slug: true, publishAt: true },
    }),
    prisma.skill.findMany({
      where: { published: false, deletedAt: null },
      orderBy: [{ name: 'asc' }],
      take: 50,
      select: { id: true, name: true, publishAt: true, category: { select: { name: true } } },
    }),
    prisma.experience.findMany({
      where: { published: false, deletedAt: null },
      orderBy: [{ startDate: 'desc' }],
      take: 50,
      select: { id: true, role: true, organization: true, publishAt: true },
    }),
    prisma.education.findMany({
      where: { published: false, deletedAt: null },
      orderBy: [{ startDate: 'desc' }],
      take: 50,
      select: { id: true, qualification: true, institution: true, publishAt: true },
    }),
    prisma.certification.findMany({
      where: { published: false, deletedAt: null },
      orderBy: [{ issueDate: 'desc' }],
      take: 50,
      select: { id: true, name: true, issuingOrganization: true, publishAt: true },
    }),
  ])

  const toIso = (value: Date | null) => value?.toISOString() ?? null

  return [
    ...projects.map((row) => ({
      type: 'project' as const,
      id: row.id,
      title: row.title,
      subtitle: row.slug,
      publishAt: toIso(row.publishAt),
    })),
    ...skills.map((row) => ({
      type: 'skill' as const,
      id: row.id,
      title: row.name,
      subtitle: row.category.name,
      publishAt: toIso(row.publishAt),
    })),
    ...experience.map((row) => ({
      type: 'experience' as const,
      id: row.id,
      title: row.role,
      subtitle: row.organization,
      publishAt: toIso(row.publishAt),
    })),
    ...education.map((row) => ({
      type: 'education' as const,
      id: row.id,
      title: row.qualification,
      subtitle: row.institution,
      publishAt: toIso(row.publishAt),
    })),
    ...certifications.map((row) => ({
      type: 'certification' as const,
      id: row.id,
      title: row.name,
      subtitle: row.issuingOrganization,
      publishAt: toIso(row.publishAt),
    })),
  ]
}

export interface ScheduledRunResult {
  published: number
}

/**
 * Promotes every due record. Safe to run concurrently: the conditional update
 * means only one worker can claim a record, and instances that lose the race
 * write no duplicate audit or revision rows.
 */
export async function publishDueContent(now = new Date()): Promise<ScheduledRunResult> {
  let published = 0

  for (const type of CONTENT_TYPES) {
    const due = await findDueRecords(type, now)

    for (const record of due) {
      if (!record.publishAt) {
        continue
      }

      const changed = await promote(type, record.id, now, record.publishAt)

      if (changed === 0) {
        continue
      }

      published += 1

      await prisma.$transaction(async (tx) => {
        await recordAudit(
          {
            action:
              type === 'project'
                ? 'PROJECT_STATUS_CHANGED'
                : `${contentAuditPrefix(type)}_UPDATED`,
            entityType: contentEntityType(type),
            entityId: record.id,
            metadata: { scheduled: true, publishAt: record.publishAt?.toISOString() ?? null },
          },
          tx,
        )

        await recordContentRevision(tx, type, record.id, 'UPDATED', null)
      })
    }
  }

  return { published }
}
