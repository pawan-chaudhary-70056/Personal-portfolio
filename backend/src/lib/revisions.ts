import type { Prisma, RevisionAction } from '@prisma/client'

export interface RevisionInput {
  entityType: string
  entityId: string
  action: RevisionAction
  snapshot: Prisma.InputJsonValue
  adminId: string | null
}

/**
 * Writes a point-in-time copy of a content record. Always call this inside the
 * same transaction as the change it records, so history cannot diverge from the
 * data (docs/13-admin-advanced-features.md §6).
 */
export async function recordRevision(
  tx: Prisma.TransactionClient,
  input: RevisionInput,
): Promise<void> {
  await tx.contentRevision.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      snapshot: input.snapshot,
      adminId: input.adminId,
    },
  })
}
