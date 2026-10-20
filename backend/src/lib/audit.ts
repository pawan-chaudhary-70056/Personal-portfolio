import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../db/prisma.js'

type AuditWriter = PrismaClient | Prisma.TransactionClient

export interface AuditInput {
  action: string
  entityType: string
  entityId?: string | null
  adminId?: string | null
  metadata?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
}

/**
 * Appends an audit event. Callers pass a transaction client when the audit
 * record must succeed atomically with the change it describes.
 */
export async function recordAudit(input: AuditInput, client: AuditWriter = prisma): Promise<void> {
  await client.auditEvent.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      adminId: input.adminId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ip ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    },
  })
}
