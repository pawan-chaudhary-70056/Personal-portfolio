import { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { ApiError, conflict, notFound } from '../lib/errors.js'
import { slugify } from '../lib/slug.js'
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/category.schema.js'

type SlugLookup = (slug: string) => Promise<{ id: string } | null>

/** Returns the offending column of a unique-constraint failure, if any. */
function uniqueViolationField(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null
  }

  const target = error.meta?.target
  if (Array.isArray(target)) {
    return target.map(String).join(',')
  }

  return typeof target === 'string' ? target : ''
}

function duplicateName(label: string): ApiError {
  return conflict(`A ${label} with that name already exists.`, [
    { path: 'name', message: 'Category names must be unique.' },
  ])
}

function duplicateSlug(): ApiError {
  return conflict('That slug is already used by another category.', [
    { path: 'slug', message: 'Slug must be unique.' },
  ])
}

/** Field-level error used when a project or skill names an unknown category. */
export function unknownCategoryError(): ApiError {
  return new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
    { path: 'category', message: 'Choose one of the managed categories.' },
  ])
}

/** True when a delete is blocked by a foreign key that still references the row. */
function isReferenced(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
}

function categoryConflict(error: unknown, label: string): ApiError | null {
  const field = uniqueViolationField(error)

  if (field === null) {
    return null
  }

  return field.includes('slug') ? duplicateSlug() : duplicateName(label)
}

/**
 * Slugs are generated from the name unless supplied. An explicit slug is
 * validated for uniqueness first so the error points at the right field.
 */
async function resolveUniqueSlug(
  lookup: SlugLookup,
  requested: string | undefined,
  name: string,
  excludeId?: string,
): Promise<string> {
  if (requested) {
    const existing = await lookup(requested)

    if (existing && existing.id !== excludeId) {
      throw duplicateSlug()
    }

    return requested
  }

  const root = slugify(name).slice(0, 70)

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`
    const existing = await lookup(candidate)

    if (!existing || existing.id === excludeId) {
      return candidate
    }
  }

  return `${root}-${Date.now().toString(36)}`
}

/* -------------------------------------------------------------------------- */
/* Project categories                                                          */
/* -------------------------------------------------------------------------- */

export async function listProjectCategories() {
  const categories = await prisma.projectCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { projects: true } } },
  })

  return categories.map(({ _count, ...category }) => ({
    ...category,
    projectCount: _count.projects,
  }))
}

/** Public listing: only categories that currently group published projects. */
export async function listPublicProjectCategories() {
  return prisma.projectCategory.findMany({
    where: { projects: { some: { status: 'PUBLISHED' } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, sortOrder: true },
  })
}

export async function createProjectCategory(input: CreateCategoryInput, ctx: RequestContext) {
  const slug = await resolveUniqueSlug(
    (candidate) =>
      prisma.projectCategory.findUnique({ where: { slug: candidate }, select: { id: true } }),
    input.slug,
    input.name,
  )

  try {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.projectCategory.create({
        data: { name: input.name, slug, sortOrder: input.sortOrder ?? 0 },
      })

      await recordAudit(
        {
          action: 'PROJECT_CATEGORY_CREATED',
          entityType: 'ProjectCategory',
          entityId: category.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: category.name, slug: category.slug },
        },
        tx,
      )

      return category
    })
  } catch (error) {
    throw categoryConflict(error, 'project category') ?? error
  }
}

export async function updateProjectCategory(
  id: string,
  input: UpdateCategoryInput,
  ctx: RequestContext,
) {
  const existing = await prisma.projectCategory.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Project category')
  }

  const slug =
    input.slug !== undefined || input.name !== undefined
      ? await resolveUniqueSlug(
          (candidate) =>
            prisma.projectCategory.findUnique({
              where: { slug: candidate },
              select: { id: true },
            }),
          input.slug,
          input.name ?? existing.name,
          id,
        )
      : undefined

  const data: Prisma.ProjectCategoryUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (slug !== undefined) data.slug = slug
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  try {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.projectCategory.update({ where: { id }, data })

      await recordAudit(
        {
          action: 'PROJECT_CATEGORY_UPDATED',
          entityType: 'ProjectCategory',
          entityId: category.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: category.name, fields: Object.keys(data) },
        },
        tx,
      )

      return category
    })
  } catch (error) {
    throw categoryConflict(error, 'project category') ?? error
  }
}

/**
 * Deletion is refused while projects still reference the category. The database
 * enforces the same rule with `onDelete: Restrict`.
 */
export async function deleteProjectCategory(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.projectCategory.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Project category')
  }

  const [projectCount, trashedProjects] = await Promise.all([
    prisma.project.count({ where: { categoryId: id, deletedAt: null } }),
    prisma.project.count({ where: { categoryId: id, deletedAt: { not: null } } }),
  ])

  if (projectCount > 0) {
    throw conflict(
      `This category still groups ${projectCount} project${projectCount === 1 ? '' : 's'}. Move them to another category first.`,
    )
  }

  if (trashedProjects > 0) {
    throw conflict(
      'This category still has projects in the trash. Restore or permanently delete them first.',
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectCategory.delete({ where: { id } })

      await recordAudit(
        {
          action: 'PROJECT_CATEGORY_DELETED',
          entityType: 'ProjectCategory',
          entityId: existing.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: existing.name, slug: existing.slug },
        },
        tx,
      )
    })
  } catch (error) {
    // A project was attached between the count above and this delete.
    if (isReferenced(error)) {
      throw conflict('This category is still in use. Move its projects first.')
    }

    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* Skill categories                                                            */
/* -------------------------------------------------------------------------- */

export async function listSkillCategories() {
  const categories = await prisma.skillCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { skills: true } } },
  })

  return categories.map(({ _count, ...category }) => ({
    ...category,
    skillCount: _count.skills,
  }))
}

/** Public listing: only categories that currently group published skills. */
export async function listPublicSkillCategories() {
  return prisma.skillCategory.findMany({
    where: { skills: { some: { published: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, sortOrder: true },
  })
}

export async function createSkillCategory(input: CreateCategoryInput, ctx: RequestContext) {
  const slug = await resolveUniqueSlug(
    (candidate) =>
      prisma.skillCategory.findUnique({ where: { slug: candidate }, select: { id: true } }),
    input.slug,
    input.name,
  )

  try {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.skillCategory.create({
        data: { name: input.name, slug, sortOrder: input.sortOrder ?? 0 },
      })

      await recordAudit(
        {
          action: 'SKILL_CATEGORY_CREATED',
          entityType: 'SkillCategory',
          entityId: category.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: category.name, slug: category.slug },
        },
        tx,
      )

      return category
    })
  } catch (error) {
    throw categoryConflict(error, 'skill category') ?? error
  }
}

export async function updateSkillCategory(
  id: string,
  input: UpdateCategoryInput,
  ctx: RequestContext,
) {
  const existing = await prisma.skillCategory.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Skill category')
  }

  const slug =
    input.slug !== undefined || input.name !== undefined
      ? await resolveUniqueSlug(
          (candidate) =>
            prisma.skillCategory.findUnique({ where: { slug: candidate }, select: { id: true } }),
          input.slug,
          input.name ?? existing.name,
          id,
        )
      : undefined

  const data: Prisma.SkillCategoryUpdateInput = {}

  if (input.name !== undefined) data.name = input.name
  if (slug !== undefined) data.slug = slug
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  try {
    return await prisma.$transaction(async (tx) => {
      const category = await tx.skillCategory.update({ where: { id }, data })

      await recordAudit(
        {
          action: 'SKILL_CATEGORY_UPDATED',
          entityType: 'SkillCategory',
          entityId: category.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: category.name, fields: Object.keys(data) },
        },
        tx,
      )

      return category
    })
  } catch (error) {
    throw categoryConflict(error, 'skill category') ?? error
  }
}

export async function deleteSkillCategory(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.skillCategory.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Skill category')
  }

  const [skillCount, trashedSkills] = await Promise.all([
    prisma.skill.count({ where: { categoryId: id, deletedAt: null } }),
    prisma.skill.count({ where: { categoryId: id, deletedAt: { not: null } } }),
  ])

  if (skillCount > 0) {
    throw conflict(
      `This category still groups ${skillCount} skill${skillCount === 1 ? '' : 's'}. Reassign or delete them first.`,
    )
  }

  if (trashedSkills > 0) {
    throw conflict(
      'This category still has skills in the trash. Restore or permanently delete them first.',
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.skillCategory.delete({ where: { id } })

      await recordAudit(
        {
          action: 'SKILL_CATEGORY_DELETED',
          entityType: 'SkillCategory',
          entityId: existing.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { name: existing.name, slug: existing.slug },
        },
        tx,
      )
    })
  } catch (error) {
    if (isReferenced(error)) {
      throw conflict('This category is still in use. Reassign its skills first.')
    }

    throw error
  }
}

/* -------------------------------------------------------------------------- */
/* Category resolution for projects and skills                                 */
/* -------------------------------------------------------------------------- */

async function nextProjectCategoryOrder(tx: Prisma.TransactionClient): Promise<number> {
  const aggregate = await tx.projectCategory.aggregate({ _max: { sortOrder: true } })
  return (aggregate._max.sortOrder ?? -1) + 1
}

async function nextSkillCategoryOrder(tx: Prisma.TransactionClient): Promise<number> {
  const aggregate = await tx.skillCategory.aggregate({ _max: { sortOrder: true } })
  return (aggregate._max.sortOrder ?? -1) + 1
}

/**
 * Creating content with a new category name also creates the category, so the
 * documented `category` string contract keeps working. Renames and reordering
 * happen in the category manager, which then updates every linked record.
 */
export async function findOrCreateProjectCategoryId(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const existing = await tx.projectCategory.findUnique({ where: { name }, select: { id: true } })

  if (existing) {
    return existing.id
  }

  try {
    const category = await tx.projectCategory.create({
      data: {
        name,
        slug: await resolveUniqueSlug(
          (candidate) =>
            tx.projectCategory.findUnique({ where: { slug: candidate }, select: { id: true } }),
          undefined,
          name,
        ),
        sortOrder: await nextProjectCategoryOrder(tx),
      },
      select: { id: true },
    })

    return category.id
  } catch (error) {
    // A concurrent create won the race: reuse the row it inserted.
    if (uniqueViolationField(error) !== null) {
      const raced = await tx.projectCategory.findUnique({
        where: { name },
        select: { id: true },
      })

      if (raced) {
        return raced.id
      }
    }

    throw error
  }
}

export async function requireProjectCategoryId(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const existing = await tx.projectCategory.findUnique({ where: { name }, select: { id: true } })

  if (!existing) {
    throw unknownCategoryError()
  }

  return existing.id
}

export async function findOrCreateSkillCategoryId(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const existing = await tx.skillCategory.findUnique({ where: { name }, select: { id: true } })

  if (existing) {
    return existing.id
  }

  try {
    const category = await tx.skillCategory.create({
      data: {
        name,
        slug: await resolveUniqueSlug(
          (candidate) =>
            tx.skillCategory.findUnique({ where: { slug: candidate }, select: { id: true } }),
          undefined,
          name,
        ),
        sortOrder: await nextSkillCategoryOrder(tx),
      },
      select: { id: true },
    })

    return category.id
  } catch (error) {
    if (uniqueViolationField(error) !== null) {
      const raced = await tx.skillCategory.findUnique({ where: { name }, select: { id: true } })

      if (raced) {
        return raced.id
      }
    }

    throw error
  }
}

export async function requireSkillCategoryId(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const existing = await tx.skillCategory.findUnique({ where: { name }, select: { id: true } })

  if (!existing) {
    throw unknownCategoryError()
  }

  return existing.id
}
