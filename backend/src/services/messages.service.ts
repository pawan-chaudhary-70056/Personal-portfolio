import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { notFound } from '../lib/errors.js'
import type {
  ContactMessageInput,
  ListMessagesQuery,
  MessageStatusValue,
} from '../schemas/contact.schema.js'

/**
 * Stores an accepted submission. Only the fields the visitor supplied are kept;
 * no IP address or user agent is stored with the message itself.
 */
export async function createContactMessage(input: ContactMessageInput) {
  return prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
    },
    select: { id: true, createdAt: true },
  })
}

export async function listMessages(query: ListMessagesQuery) {
  const where: Prisma.ContactMessageWhereInput = {}

  if (query.status) {
    where.status = query.status
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { subject: { contains: query.search, mode: 'insensitive' } },
      { message: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.contactMessage.count({ where }),
  ])

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getMessage(id: string) {
  const message = await prisma.contactMessage.findUnique({ where: { id } })

  if (!message) {
    throw notFound('Message')
  }

  return message
}

export async function updateMessageStatus(
  id: string,
  status: MessageStatusValue,
  ctx: RequestContext,
) {
  const existing = await getMessage(id)

  // Keep the original review timestamp when moving between non-new states.
  const reviewedAt =
    status === 'NEW' ? null : (existing.reviewedAt ?? new Date())

  return prisma.$transaction(async (tx) => {
    const message = await tx.contactMessage.update({
      where: { id },
      data: { status, reviewedAt },
    })

    await recordAudit(
      {
        action: 'MESSAGE_STATUS_CHANGED',
        entityType: 'ContactMessage',
        entityId: message.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        // Message bodies are personal data and are never copied into the log.
        metadata: { status, previousStatus: existing.status },
      },
      tx,
    )

    return message
  })
}

export async function deleteMessage(id: string, ctx: RequestContext): Promise<void> {
  const existing = await getMessage(id)

  await prisma.$transaction(async (tx) => {
    await tx.contactMessage.delete({ where: { id } })

    await recordAudit(
      {
        action: 'MESSAGE_DELETED',
        entityType: 'ContactMessage',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { status: existing.status },
      },
      tx,
    )
  })
}
