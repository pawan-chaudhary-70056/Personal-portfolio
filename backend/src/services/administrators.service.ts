import { Prisma } from '@prisma/client'
import type { RequestContext } from '../lib/auth-types.js'
import { recordAudit } from '../lib/audit.js'
import { prisma } from '../db/prisma.js'
import { conflict, notFound } from '../lib/errors.js'
import { hashPassword } from '../lib/password.js'
import type {
  CreateAdministratorInput,
  UpdateAdministratorInput,
} from '../schemas/administrator.schema.js'

const ADMIN_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.AdminSelect

type AdminRow = Prisma.AdminGetPayload<{ select: typeof ADMIN_SELECT }>

function view(admin: AdminRow) {
  return {
    ...admin,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
  }
}

const duplicateEmail = () =>
  conflict('An account with that email already exists.', [
    { path: 'email', message: 'Use a different email address.' },
  ])

export async function listAdministrators() {
  const admins = await prisma.admin.findMany({
    orderBy: [{ createdAt: 'asc' }],
    select: ADMIN_SELECT,
  })

  return admins.map(view)
}

export async function createAdministrator(
  input: CreateAdministratorInput,
  ctx: RequestContext,
) {
  const passwordHash = await hashPassword(input.password)

  try {
    return await prisma.$transaction(async (tx) => {
      const admin = await tx.admin.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          role: input.role,
        },
        select: ADMIN_SELECT,
      })

      await recordAudit(
        {
          action: 'ADMIN_CREATED',
          entityType: 'Admin',
          entityId: admin.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { email: admin.email, role: admin.role },
        },
        tx,
      )

      return view(admin)
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw duplicateEmail()
    }
    throw error
  }
}

async function activeOwnerCount(): Promise<number> {
  return prisma.admin.count({ where: { role: 'OWNER', isActive: true } })
}

export async function updateAdministrator(
  id: string,
  input: UpdateAdministratorInput,
  ctx: RequestContext,
) {
  const existing = await prisma.admin.findUnique({ where: { id }, select: ADMIN_SELECT })

  if (!existing) {
    throw notFound('Administrator')
  }

  const losingOwner =
    existing.role === 'OWNER' &&
    existing.isActive &&
    ((input.role !== undefined && input.role !== 'OWNER') || input.isActive === false)

  if (losingOwner && (await activeOwnerCount()) <= 1) {
    throw conflict('At least one active owner account is required.')
  }

  if (existing.id === ctx.adminId && input.isActive === false) {
    throw conflict('You cannot deactivate your own account.')
  }

  const data: Prisma.AdminUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.role !== undefined) data.role = input.role
  if (input.isActive !== undefined) data.isActive = input.isActive

  return prisma.$transaction(async (tx) => {
    const admin = await tx.admin.update({ where: { id }, data, select: ADMIN_SELECT })

    // Deactivation must take effect immediately, not at cookie expiry.
    if (input.isActive === false) {
      await tx.$executeRaw`DELETE FROM "session" WHERE sess ->> 'adminId' = ${id}`
    }

    await recordAudit(
      {
        action: 'ADMIN_UPDATED',
        entityType: 'Admin',
        entityId: id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { email: admin.email, fields: Object.keys(input) },
      },
      tx,
    )

    return view(admin)
  })
}

export async function resetAdministratorPassword(
  id: string,
  password: string,
  ctx: RequestContext,
) {
  const existing = await prisma.admin.findUnique({ where: { id }, select: { id: true } })

  if (!existing) {
    throw notFound('Administrator')
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction(async (tx) => {
    await tx.admin.update({ where: { id }, data: { passwordHash } })

    // A password reset invalidates every existing session for that account.
    await tx.$executeRaw`DELETE FROM "session" WHERE sess ->> 'adminId' = ${id}`

    await recordAudit(
      {
        action: 'ADMIN_PASSWORD_RESET',
        entityType: 'Admin',
        entityId: id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { sessionsRevoked: true },
      },
      tx,
    )
  })
}
