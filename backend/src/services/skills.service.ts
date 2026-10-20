import { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import { conflict, notFound } from '../lib/errors.js'
import type {
  CreateSkillInput,
  ListSkillsQuery,
  UpdateSkillInput,
} from '../schemas/skill.schema.js'
import type { RequestContext } from '../lib/auth-types.js'

const duplicateSkill = () =>
  conflict('That skill already exists in this category.', [
    { path: 'name', message: 'Skill names must be unique within a category.' },
  ])

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function listSkills(query: ListSkillsQuery) {
  const where: Prisma.SkillWhereInput = {}

  if (query.category) {
    where.category = query.category
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  return prisma.skill.findMany({
    where,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
}

/** Public listing: published skills only, grouped by category in the UI. */
export async function listPublishedSkills() {
  return prisma.skill.findMany({
    where: { published: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, category: true, description: true, sortOrder: true },
  })
}

export async function getSkill(id: string) {
  const skill = await prisma.skill.findUnique({ where: { id } })

  if (!skill) {
    throw notFound('Skill')
  }

  return skill
}

export async function createSkill(input: CreateSkillInput, ctx: RequestContext) {
  try {
    return await prisma.$transaction(async (tx) => {
      const skill = await tx.skill.create({
        data: {
          name: input.name,
          category: input.category,
          description: input.description ?? null,
          sortOrder: input.sortOrder ?? 0,
          published: input.published ?? true,
        },
      })

      await recordAudit(
        {
          action: 'SKILL_CREATED',
          entityType: 'Skill',
          entityId: skill.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: skill.name, category: skill.category },
        },
        tx,
      )

      return skill
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateSkill()
    }
    throw error
  }
}

export async function updateSkill(id: string, input: UpdateSkillInput, ctx: RequestContext) {
  const existing = await prisma.skill.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Skill')
  }

  const data: Prisma.SkillUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.category !== undefined) data.category = input.category
  if (input.description !== undefined) data.description = input.description
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
  if (input.published !== undefined) data.published = input.published

  try {
    return await prisma.$transaction(async (tx) => {
      const skill = await tx.skill.update({ where: { id }, data })

      await recordAudit(
        {
          action: 'SKILL_UPDATED',
          entityType: 'Skill',
          entityId: skill.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: {
            name: skill.name,
            category: skill.category,
            fields: Object.keys(data),
          },
        },
        tx,
      )

      return skill
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw duplicateSkill()
    }
    throw error
  }
}

export async function deleteSkill(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.skill.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Skill')
  }

  await prisma.$transaction(async (tx) => {
    await tx.skill.delete({ where: { id } })

    await recordAudit(
      {
        action: 'SKILL_DELETED',
        entityType: 'Skill',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { name: existing.name, category: existing.category },
      },
      tx,
    )
  })
}
