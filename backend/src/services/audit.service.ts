import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import type { ListAuditLogsQuery } from '../schemas/audit.schema.js'
import { toDateOnly } from '../schemas/common.schema.js'

const AUDIT_EVENT_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  admin: { select: { name: true, email: true } },
} satisfies Prisma.AuditEventSelect

export type AuditEventRecord = Prisma.AuditEventGetPayload<{ select: typeof AUDIT_EVENT_SELECT }>

/** End of the selected UTC day, so a `to` date includes its own events. */
function endOfDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999Z`)
}

export async function listRecentAuditEvents(limit: number): Promise<AuditEventRecord[]> {
  return prisma.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: AUDIT_EVENT_SELECT,
  })
}

/**
 * Reads the append-only audit trail. Audit records are never returned from a
 * mutable endpoint; this service only supports filtered, paginated reads.
 */
export async function listAuditEvents(query: ListAuditLogsQuery) {
  const where: Prisma.AuditEventWhereInput = {}

  if (query.action) {
    where.action = query.action
  }

  if (query.entityType) {
    where.entityType = query.entityType
  }

  if (query.search) {
    where.OR = [
      { action: { contains: query.search, mode: 'insensitive' } },
      { entityId: { contains: query.search, mode: 'insensitive' } },
      {
        admin: {
          is: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      },
    ]
  }

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: toDateOnly(query.from) } : {}),
      ...(query.to ? { lte: endOfDay(query.to) } : {}),
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: AUDIT_EVENT_SELECT,
    }),
    prisma.auditEvent.count({ where }),
  ])

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}
