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
import { findOrCreateSkillCategoryId, requireSkillCategoryId } from './categories.service.js'
import { recordContentRevision } from './content.service.js'

/** Category names are stored on a relation but exposed as the documented string. */
function withCategoryName<T extends { category: { name: string } }>(skill: T) {
  const { category, ...rest } = skill
  return { ...rest, category: category.name }
}

const categoryName = { select: { name: true } } as const

const duplicateSkill = () =>
  conflict('That skill already exists in this category.', [
    { path: 'name', message: 'Skill names must be unique within a category.' },
  ])

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function listSkills(query: ListSkillsQuery) {
  const where: Prisma.SkillWhereInput = { deletedAt: null }

  if (query.category) {
    where.category = { name: query.category }
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { category: { name: { contains: query.search, mode: 'insensitive' } } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const skills = await prisma.skill.findMany({
    where,
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { category: { name: 'asc' } },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
    include: { category: categoryName },
  })

  return skills.map(withCategoryName)
}

/** Public listing: published skills only, grouped by category in the UI. */
export async function listPublishedSkills() {
  const skills = await prisma.skill.findMany({
    where: { published: true, deletedAt: null },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { category: { name: 'asc' } },
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      category: categoryName,
      description: true,
      sortOrder: true,
    },
  })

  return skills.map(withCategoryName)
}

export async function getSkill(id: string) {
  const skill = await prisma.skill.findFirst({
    where: { id, deletedAt: null },
    include: { category: categoryName },
  })

  if (!skill) {
    throw notFound('Skill')
  }

  return withCategoryName(skill)
}

export async function createSkill(input: CreateSkillInput, ctx: RequestContext) {
  try {
    return await prisma.$transaction(async (tx) => {
      const categoryId = await findOrCreateSkillCategoryId(tx, input.category)

      const created = await tx.skill.create({
        data: {
          name: input.name,
          categoryId,
          description: input.description ?? null,
          sortOrder: input.sortOrder ?? 0,
          published: input.published ?? true,
        },
        include: { category: categoryName },
      })

      const skill = withCategoryName(created)

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

      await recordContentRevision(tx, 'skill', skill.id, 'CREATED', ctx.adminId)

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
  const existing = await prisma.skill.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Skill')
  }

  const data: Prisma.SkillUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
  if (input.published !== undefined) data.published = input.published

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.category !== undefined) {
        data.category = { connect: { id: await requireSkillCategoryId(tx, input.category) } }
      }

      const updated = await tx.skill.update({
        where: { id },
        data,
        include: { category: categoryName },
      })

      const skill = withCategoryName(updated)

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
            fields: Object.keys(input),
          },
        },
        tx,
      )

      await recordContentRevision(tx, 'skill', skill.id, 'UPDATED', ctx.adminId)

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
  const existing = await prisma.skill.findFirst({
    where: { id, deletedAt: null },
    include: { category: categoryName },
  })

  if (!existing) {
    throw notFound('Skill')
  }

  await prisma.$transaction(async (tx) => {
    await tx.skill.update({ where: { id }, data: { deletedAt: new Date() } })

    await recordAudit(
      {
        action: 'SKILL_DELETED',
        entityType: 'Skill',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          name: existing.name,
          category: existing.category.name,
          trashed: true,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'skill', existing.id, 'DELETED', ctx.adminId)
  })
}
