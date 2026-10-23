import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { ApiError, notFound } from '../lib/errors.js'
import type {
  CreateCertificationInput,
  ListCertificationsQuery,
  UpdateCertificationInput,
} from '../schemas/certification.schema.js'
import { toDateOnly } from '../schemas/common.schema.js'
import { recordContentRevision } from './content.service.js'

const PUBLIC_CERTIFICATION_SELECT = {
  id: true,
  name: true,
  issuingOrganization: true,
  issueDate: true,
  expiryDate: true,
  credentialId: true,
  credentialUrl: true,
  sortOrder: true,
} satisfies Prisma.CertificationSelect

function assertDates(issueDate: Date | null, expiryDate: Date | null): void {
  if (issueDate && expiryDate && issueDate > expiryDate) {
    throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
      { path: 'expiryDate', message: 'The expiry date must be on or after the issue date.' },
    ])
  }
}

export async function listCertifications(query: ListCertificationsQuery) {
  const where: Prisma.CertificationWhereInput = { deletedAt: null }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { issuingOrganization: { contains: query.search, mode: 'insensitive' } },
      { credentialId: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  return prisma.certification.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { issueDate: 'desc' }],
  })
}

/** Public listing: published credentials only, in display order. */
export async function listPublishedCertifications() {
  return prisma.certification.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { issueDate: 'desc' }],
    select: PUBLIC_CERTIFICATION_SELECT,
  })
}

export async function getCertification(id: string) {
  const certification = await prisma.certification.findFirst({ where: { id, deletedAt: null } })

  if (!certification) {
    throw notFound('Certification')
  }

  return certification
}

export async function createCertification(
  input: CreateCertificationInput,
  ctx: RequestContext,
) {
  const issueDate = input.issueDate ? toDateOnly(input.issueDate) : null
  const expiryDate = input.expiryDate ? toDateOnly(input.expiryDate) : null

  assertDates(issueDate, expiryDate)

  return prisma.$transaction(async (tx) => {
    const certification = await tx.certification.create({
      data: {
        name: input.name,
        issuingOrganization: input.issuingOrganization,
        issueDate,
        expiryDate,
        credentialId: input.credentialId ?? null,
        credentialUrl: input.credentialUrl ?? null,
        sortOrder: input.sortOrder ?? 0,
        published: input.published ?? true,
      },
    })

    await recordAudit(
      {
        action: 'CERTIFICATION_CREATED',
        entityType: 'Certification',
        entityId: certification.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: certification.name,
          issuingOrganization: certification.issuingOrganization,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'certification', certification.id, 'CREATED', ctx.adminId)

    return certification
  })
}

export async function updateCertification(
  id: string,
  input: UpdateCertificationInput,
  ctx: RequestContext,
) {
  const existing = await prisma.certification.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Certification')
  }

  const nextIssueDate =
    input.issueDate !== undefined
      ? input.issueDate
        ? toDateOnly(input.issueDate)
        : null
      : existing.issueDate
  const nextExpiryDate =
    input.expiryDate !== undefined
      ? input.expiryDate
        ? toDateOnly(input.expiryDate)
        : null
      : existing.expiryDate

  assertDates(nextIssueDate, nextExpiryDate)

  const data: Prisma.CertificationUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.issuingOrganization !== undefined) {
    data.issuingOrganization = input.issuingOrganization
  }
  if (input.issueDate !== undefined) data.issueDate = nextIssueDate
  if (input.expiryDate !== undefined) data.expiryDate = nextExpiryDate
  if (input.credentialId !== undefined) data.credentialId = input.credentialId
  if (input.credentialUrl !== undefined) data.credentialUrl = input.credentialUrl
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
  if (input.published !== undefined) data.published = input.published

  return prisma.$transaction(async (tx) => {
    const certification = await tx.certification.update({ where: { id }, data })

    await recordAudit(
      {
        action: 'CERTIFICATION_UPDATED',
        entityType: 'Certification',
        entityId: certification.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: certification.name,
          issuingOrganization: certification.issuingOrganization,
          fields: Object.keys(data),
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'certification', certification.id, 'UPDATED', ctx.adminId)

    return certification
  })
}

export async function deleteCertification(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.certification.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Certification')
  }

  await prisma.$transaction(async (tx) => {
    await tx.certification.update({ where: { id }, data: { deletedAt: new Date() } })

    await recordAudit(
      {
        action: 'CERTIFICATION_DELETED',
        entityType: 'Certification',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: existing.name,
          issuingOrganization: existing.issuingOrganization,
          trashed: true,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'certification', existing.id, 'DELETED', ctx.adminId)
  })
}
