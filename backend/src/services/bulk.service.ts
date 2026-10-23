import type { RequestContext } from '../lib/auth-types.js'
import { recordAudit } from '../lib/audit.js'
import { prisma } from '../db/prisma.js'
import { conflict, notFound } from '../lib/errors.js'
import type { BulkActionInput } from '../schemas/content.schema.js'
import {
  contentAuditPrefix,
  contentEntityType,
  contentLabel,
  findContentState,
  markContentDeleted,
  recordContentRevision,
  setContentPublished,
  type ContentType,
} from './content.service.js'

/**
 * Applies one action to every selected record in a single transaction: either
 * all requested records change or none do. Every record is authorized by the
 * router, validated here, audited individually, and stored as a revision
 * (docs/13-admin-advanced-features.md §5, docs/09-admin-dashboard.md §24).
 */
export async function applyBulkAction(
  type: ContentType,
  input: BulkActionInput,
  ctx: RequestContext,
) {
  const ids = [...new Set(input.ids)]

  return prisma.$transaction(async (tx) => {
    for (const id of ids) {
      const state = await findContentState(type, id, tx)

      if (!state) {
        throw notFound(contentLabel(type))
      }

      if (state.deletedAt) {
        throw conflict(
          `One of the selected ${contentLabel(type).toLowerCase()} records is in the trash. Restore it first.`,
        )
      }
    }

    for (const id of ids) {
      if (input.action === 'delete') {
        await markContentDeleted(tx, type, id)

        await recordAudit(
          {
            action: `${contentAuditPrefix(type)}_DELETED`,
            entityType: contentEntityType(type),
            entityId: id,
            adminId: ctx.adminId,
            ip: ctx.ip,
            userAgent: ctx.userAgent,
            metadata: { bulk: true, trashed: true },
          },
          tx,
        )

        await recordContentRevision(tx, type, id, 'DELETED', ctx.adminId)
        continue
      }

      const published = input.action === 'publish'
      await setContentPublished(tx, type, id, published)

      await recordAudit(
        {
          action:
            type === 'project'
              ? 'PROJECT_STATUS_CHANGED'
              : `${contentAuditPrefix(type)}_UPDATED`,
          entityType: contentEntityType(type),
          entityId: id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { bulk: true, fields: ['published'], to: published ? 'published' : 'draft' },
        },
        tx,
      )

      await recordContentRevision(tx, type, id, 'UPDATED', ctx.adminId)
    }

    return { type, action: input.action, updated: ids.length }
  })
}
