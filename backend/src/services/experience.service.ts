import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import { ApiError, notFound } from '../lib/errors.js'
import { toDateOnly } from '../schemas/common.schema.js'
import type {
  CreateExperienceInput,
  ListExperienceQuery,
  UpdateExperienceInput,
} from '../schemas/experience.schema.js'
import type { RequestContext } from '../lib/auth-types.js'
import { recordContentRevision } from './content.service.js'

interface DateRules {
  startDate: Date
  endDate: Date | null
  isCurrent: boolean
}

/**
 * Enforces the two cross-field rules from docs/08-database-schema.md §5.7.
 * Zod covers create payloads; this also covers merges during partial updates.
 */
function assertDateRules({ startDate, endDate, isCurrent }: DateRules): void {
  if (isCurrent && endDate) {
    throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
      { path: 'endDate', message: 'A current role cannot have an end date.' },
    ])
  }

  if (endDate && startDate > endDate) {
    throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
      { path: 'endDate', message: 'The end date must be on or after the start date.' },
    ])
  }
}

export async function listExperience(query: ListExperienceQuery) {
  const where: Prisma.ExperienceWhereInput = { deletedAt: null }

  if (query.search) {
    where.OR = [
      { role: { contains: query.search, mode: 'insensitive' } },
      { organization: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  return prisma.experience.findMany({
    where,
    orderBy: [{ startDate: 'desc' }],
  })
}

/** Public listing: published roles only, ordered for display. */
export async function listPublishedExperience() {
  return prisma.experience.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
    select: {
      id: true,
      role: true,
      organization: true,
      employmentType: true,
      location: true,
      description: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      sortOrder: true,
    },
  })
}

export async function getExperience(id: string) {
  const experience = await prisma.experience.findFirst({ where: { id, deletedAt: null } })

  if (!experience) {
    throw notFound('Experience')
  }

  return experience
}

export async function createExperience(input: CreateExperienceInput, ctx: RequestContext) {
  const startDate = toDateOnly(input.startDate)
  const endDate = input.endDate ? toDateOnly(input.endDate) : null
  const isCurrent = input.isCurrent ?? false

  assertDateRules({ startDate, endDate, isCurrent })

  return prisma.$transaction(async (tx) => {
    const experience = await tx.experience.create({
      data: {
        role: input.role,
        organization: input.organization,
        employmentType: input.employmentType ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        startDate,
        endDate,
        isCurrent,
        published: input.published ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    })

    await recordAudit(
      {
        action: 'EXPERIENCE_CREATED',
        entityType: 'Experience',
        entityId: experience.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { role: experience.role, organization: experience.organization },
      },
      tx,
    )

    await recordContentRevision(tx, 'experience', experience.id, 'CREATED', ctx.adminId)

    return experience
  })
}

export async function updateExperience(
  id: string,
  input: UpdateExperienceInput,
  ctx: RequestContext,
) {
  const existing = await prisma.experience.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Experience')
  }

  const nextDates: DateRules = {
    startDate: input.startDate ? toDateOnly(input.startDate) : existing.startDate,
    endDate:
      input.endDate === undefined
        ? existing.endDate
        : input.endDate
          ? toDateOnly(input.endDate)
          : null,
    isCurrent: input.isCurrent ?? existing.isCurrent,
  }

  assertDateRules(nextDates)

  const data: Prisma.ExperienceUpdateInput = {}

  if (input.role !== undefined) data.role = input.role
  if (input.organization !== undefined) data.organization = input.organization
  if (input.employmentType !== undefined) data.employmentType = input.employmentType
  if (input.location !== undefined) data.location = input.location
  if (input.description !== undefined) data.description = input.description
  if (input.startDate !== undefined) data.startDate = nextDates.startDate
  if (input.endDate !== undefined) data.endDate = nextDates.endDate
  if (input.isCurrent !== undefined) data.isCurrent = input.isCurrent
  if (input.published !== undefined) data.published = input.published
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  return prisma.$transaction(async (tx) => {
    const experience = await tx.experience.update({ where: { id }, data })

    await recordAudit(
      {
        action: 'EXPERIENCE_UPDATED',
        entityType: 'Experience',
        entityId: experience.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          role: experience.role,
          organization: experience.organization,
          fields: Object.keys(data),
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'experience', experience.id, 'UPDATED', ctx.adminId)

    return experience
  })
}

export async function deleteExperience(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.experience.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Experience')
  }

  await prisma.$transaction(async (tx) => {
    await tx.experience.update({ where: { id }, data: { deletedAt: new Date() } })

    await recordAudit(
      {
        action: 'EXPERIENCE_DELETED',
        entityType: 'Experience',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          role: existing.role,
          organization: existing.organization,
          trashed: true,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'experience', existing.id, 'DELETED', ctx.adminId)
  })
}
