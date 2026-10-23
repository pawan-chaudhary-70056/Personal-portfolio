import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { ApiError, notFound } from '../lib/errors.js'
import { toDateOnly } from '../schemas/common.schema.js'
import { recordContentRevision } from './content.service.js'
import type {
  CreateEducationInput,
  ListEducationQuery,
  UpdateEducationInput,
} from '../schemas/education.schema.js'

const PUBLIC_EDUCATION_SELECT = {
  id: true,
  institution: true,
  qualification: true,
  fieldOfStudy: true,
  description: true,
  startDate: true,
  endDate: true,
  sortOrder: true,
} satisfies Prisma.EducationSelect

function assertDates(startDate: Date | null, endDate: Date | null): void {
  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
      { path: 'endDate', message: 'The end date must be on or after the start date.' },
    ])
  }
}

export async function listEducation(query: ListEducationQuery) {
  const where: Prisma.EducationWhereInput = { deletedAt: null }

  if (query.search) {
    where.OR = [
      { institution: { contains: query.search, mode: 'insensitive' } },
      { qualification: { contains: query.search, mode: 'insensitive' } },
      { fieldOfStudy: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  return prisma.education.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
  })
}

/** Public listing: published records only, in display order. */
export async function listPublishedEducation() {
  return prisma.education.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
    select: PUBLIC_EDUCATION_SELECT,
  })
}

export async function getEducation(id: string) {
  const education = await prisma.education.findFirst({ where: { id, deletedAt: null } })

  if (!education) {
    throw notFound('Education entry')
  }

  return education
}

export async function createEducation(input: CreateEducationInput, ctx: RequestContext) {
  const startDate = input.startDate ? toDateOnly(input.startDate) : null
  const endDate = input.endDate ? toDateOnly(input.endDate) : null

  assertDates(startDate, endDate)

  return prisma.$transaction(async (tx) => {
    const education = await tx.education.create({
      data: {
        institution: input.institution,
        qualification: input.qualification,
        fieldOfStudy: input.fieldOfStudy ?? null,
        description: input.description ?? null,
        startDate,
        endDate,
        sortOrder: input.sortOrder ?? 0,
        published: input.published ?? true,
      },
    })

    await recordAudit(
      {
        action: 'EDUCATION_CREATED',
        entityType: 'Education',
        entityId: education.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          institution: education.institution,
          qualification: education.qualification,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'education', education.id, 'CREATED', ctx.adminId)

    return education
  })
}

export async function updateEducation(
  id: string,
  input: UpdateEducationInput,
  ctx: RequestContext,
) {
  const existing = await prisma.education.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Education entry')
  }

  const nextStartDate =
    input.startDate !== undefined
      ? input.startDate
        ? toDateOnly(input.startDate)
        : null
      : existing.startDate
  const nextEndDate =
    input.endDate !== undefined
      ? input.endDate
        ? toDateOnly(input.endDate)
        : null
      : existing.endDate

  assertDates(nextStartDate, nextEndDate)

  const data: Prisma.EducationUpdateInput = {}

  if (input.institution !== undefined) data.institution = input.institution
  if (input.qualification !== undefined) data.qualification = input.qualification
  if (input.fieldOfStudy !== undefined) data.fieldOfStudy = input.fieldOfStudy
  if (input.description !== undefined) data.description = input.description
  if (input.startDate !== undefined) data.startDate = nextStartDate
  if (input.endDate !== undefined) data.endDate = nextEndDate
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
  if (input.published !== undefined) data.published = input.published

  return prisma.$transaction(async (tx) => {
    const education = await tx.education.update({ where: { id }, data })

    await recordAudit(
      {
        action: 'EDUCATION_UPDATED',
        entityType: 'Education',
        entityId: education.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          institution: education.institution,
          qualification: education.qualification,
          fields: Object.keys(data),
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'education', education.id, 'UPDATED', ctx.adminId)

    return education
  })
}

export async function deleteEducation(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.education.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Education entry')
  }

  await prisma.$transaction(async (tx) => {
    await tx.education.update({ where: { id }, data: { deletedAt: new Date() } })

    await recordAudit(
      {
        action: 'EDUCATION_DELETED',
        entityType: 'Education',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          institution: existing.institution,
          qualification: existing.qualification,
          trashed: true,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'education', existing.id, 'DELETED', ctx.adminId)
  })
}
