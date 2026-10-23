import type { RequestContext } from '../lib/auth-types.js'
import { recordAudit } from '../lib/audit.js'
import { prisma } from '../db/prisma.js'
import { conflict, notFound } from '../lib/errors.js'
import type { BulkTrashInput, TrashQuery } from '../schemas/content.schema.js'
import {
  CONTENT_TYPES,
  buildSnapshot,
  contentAuditPrefix,
  contentEntityType,
  contentLabel,
  contentTitle,
  findContentState,
  markContentRestored,
  purgeContentRecord,
  recordContentRevision,
  type ContentType,
  type DbClient,
} from './content.service.js'

export interface TrashItem {
  type: ContentType
  entityType: string
  id: string
  title: string
  subtitle: string | null
  deletedAt: string
  published: boolean
  status?: string
}

/** Trash is small by design, so each collection is read bounded and merged. */
const PER_TYPE_LIMIT = 200

async function listTrashed(type: ContentType, client: DbClient): Promise<TrashItem[]> {
  const where = { deletedAt: { not: null } }

  switch (type) {
    case 'project': {
      const rows = await client.project.findMany({
        where,
        orderBy: [{ deletedAt: 'desc' }],
        take: PER_TYPE_LIMIT,
        select: { id: true, title: true, slug: true, status: true, deletedAt: true },
      })

      return rows.map((row) => ({
        type,
        entityType: contentEntityType(type),
        id: row.id,
        title: row.title,
        subtitle: row.slug,
        deletedAt: row.deletedAt!.toISOString(),
        published: row.status === 'PUBLISHED',
        status: row.status,
      }))
    }
    case 'skill': {
      const rows = await client.skill.findMany({
        where,
        orderBy: [{ deletedAt: 'desc' }],
        take: PER_TYPE_LIMIT,
        select: {
          id: true,
          name: true,
          published: true,
          deletedAt: true,
          category: { select: { name: true } },
        },
      })

      return rows.map((row) => ({
        type,
        entityType: contentEntityType(type),
        id: row.id,
        title: row.name,
        subtitle: row.category.name,
        deletedAt: row.deletedAt!.toISOString(),
        published: row.published,
      }))
    }
    case 'experience': {
      const rows = await client.experience.findMany({
        where,
        orderBy: [{ deletedAt: 'desc' }],
        take: PER_TYPE_LIMIT,
        select: {
          id: true,
          role: true,
          organization: true,
          published: true,
          deletedAt: true,
        },
      })

      return rows.map((row) => ({
        type,
        entityType: contentEntityType(type),
        id: row.id,
        title: row.role,
        subtitle: row.organization,
        deletedAt: row.deletedAt!.toISOString(),
        published: row.published,
      }))
    }
    case 'education': {
      const rows = await client.education.findMany({
        where,
        orderBy: [{ deletedAt: 'desc' }],
        take: PER_TYPE_LIMIT,
        select: {
          id: true,
          institution: true,
          qualification: true,
          published: true,
          deletedAt: true,
        },
      })

      return rows.map((row) => ({
        type,
        entityType: contentEntityType(type),
        id: row.id,
        title: row.qualification,
        subtitle: row.institution,
        deletedAt: row.deletedAt!.toISOString(),
        published: row.published,
      }))
    }
    case 'certification': {
      const rows = await client.certification.findMany({
        where,
        orderBy: [{ deletedAt: 'desc' }],
        take: PER_TYPE_LIMIT,
        select: {
          id: true,
          name: true,
          issuingOrganization: true,
          published: true,
          deletedAt: true,
        },
      })

      return rows.map((row) => ({
        type,
        entityType: contentEntityType(type),
        id: row.id,
        title: row.name,
        subtitle: row.issuingOrganization,
        deletedAt: row.deletedAt!.toISOString(),
        published: row.published,
      }))
    }
  }
}

export async function listTrash(query: TrashQuery) {
  const types: readonly ContentType[] = query.type ? [query.type] : CONTENT_TYPES
  const groups = await Promise.all(types.map((type) => listTrashed(type, prisma)))

  const items = groups
    .flat()
    .sort((left, right) => right.deletedAt.localeCompare(left.deletedAt))

  const start = (query.page - 1) * query.pageSize
  const total = items.length

  return {
    items: items.slice(start, start + query.pageSize),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

/** Trash requests mix content types, so every entry carries its own type. */
export interface TrashReference {
  type: ContentType
  id: string
}

/**
 * Duplicate entries are collapsed so a caller cannot make one record appear
 * several times in a request or count it twice in the response.
 */
function uniqueReferences(items: readonly TrashReference[]): TrashReference[] {
  return [...new Map(items.map((item) => [`${item.type}:${item.id}`, item])).values()]
}

async function assertTrashed(
  tx: DbClient,
  { type, id }: TrashReference,
  message: string,
): Promise<void> {
  const state = await findContentState(type, id, tx)

  if (!state) {
    throw notFound(contentLabel(type))
  }

  if (!state.deletedAt) {
    throw conflict(message)
  }
}

async function restoreTrashedRecord(
  tx: DbClient,
  type: ContentType,
  id: string,
  ctx: RequestContext,
): Promise<void> {
  const snapshot = await buildSnapshot(type, id, tx)

  await markContentRestored(tx, type, id)

  await recordAudit(
    {
      action: `${contentAuditPrefix(type)}_RESTORED`,
      entityType: contentEntityType(type),
      entityId: id,
      adminId: ctx.adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { title: contentTitle(type, snapshot) },
    },
    tx,
  )

  await recordContentRevision(tx, type, id, 'RESTORED', ctx.adminId)
}

/** Permanent deletion is only reachable from the trash. */
async function purgeTrashedRecord(
  tx: DbClient,
  type: ContentType,
  id: string,
  ctx: RequestContext,
): Promise<void> {
  const title = contentTitle(type, await buildSnapshot(type, id, tx))

  await purgeContentRecord(tx, type, id)

  await recordAudit(
    {
      action: `${contentAuditPrefix(type)}_PURGED`,
      entityType: contentEntityType(type),
      entityId: id,
      adminId: ctx.adminId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { title },
    },
    tx,
  )
}

export async function restoreTrashed(
  type: ContentType,
  id: string,
  ctx: RequestContext,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertTrashed(tx, { type, id }, `${contentLabel(type)} is not in the trash.`)
    await restoreTrashedRecord(tx, type, id, ctx)
  })
}

export async function purgeTrashed(
  type: ContentType,
  id: string,
  ctx: RequestContext,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertTrashed(
      tx,
      { type, id },
      'Move the record to the trash before deleting it permanently.',
    )
    await purgeTrashedRecord(tx, type, id, ctx)
  })
}

/** Restores every selected record in one transaction, or none of them. */
export async function restoreTrashedMany(input: BulkTrashInput, ctx: RequestContext) {
  const items = uniqueReferences(input.items)

  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      await assertTrashed(tx, item, `${contentLabel(item.type)} is not in the trash.`)
    }

    for (const { type, id } of items) {
      await restoreTrashedRecord(tx, type, id, ctx)
    }

    return { restored: items.length }
  })
}

/** Permanently deletes every selected record in one transaction, or none. */
export async function purgeTrashedMany(input: BulkTrashInput, ctx: RequestContext) {
  const items = uniqueReferences(input.items)

  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      await assertTrashed(
        tx,
        item,
        'Move the record to the trash before deleting it permanently.',
      )
    }

    for (const { type, id } of items) {
      await purgeTrashedRecord(tx, type, id, ctx)
    }

    return { purged: items.length }
  })
}
