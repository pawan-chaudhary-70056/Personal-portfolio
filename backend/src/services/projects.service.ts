import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { conflict, notFound } from '../lib/errors.js'
import { slugify } from '../lib/slug.js'
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from '../schemas/project.schema.js'

const PUBLIC_PROJECT_SELECT = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  description: true,
  category: true,
  year: true,
  technologies: true,
  liveUrl: true,
  repositoryUrl: true,
  imageUrl: true,
  imageAlt: true,
  featured: true,
  publishedAt: true,
} satisfies Prisma.ProjectSelect

async function resolveSlug(
  inputSlug: string | undefined,
  title: string,
  excludeId?: string,
): Promise<string> {
  if (inputSlug) {
    const existing = await prisma.project.findUnique({
      where: { slug: inputSlug },
      select: { id: true },
    })

    if (existing && existing.id !== excludeId) {
      throw conflict('That slug is already used by another project.', [
        { path: 'slug', message: 'Slug must be unique.' },
      ])
    }

    return inputSlug
  }

  const root = slugify(title).slice(0, 150)

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`
    const existing = await prisma.project.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!existing || existing.id === excludeId) {
      return candidate
    }
  }

  return `${root}-${Date.now().toString(36)}`
}

export async function createProject(input: CreateProjectInput, ctx: RequestContext) {
  const slug = await resolveSlug(input.slug, input.title)
  const status = input.status ?? 'DRAFT'
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        description: input.description ?? '',
        category: input.category ?? 'Full-stack',
        year: input.year,
        technologies: input.technologies ?? [],
        liveUrl: input.liveUrl ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        imageUrl: input.imageUrl ?? null,
        imageAlt: input.imageAlt ?? null,
        status,
        featured: input.featured ?? false,
        sortOrder: input.sortOrder ?? 0,
        publishedAt: status === 'PUBLISHED' ? now : null,
        archivedAt: status === 'ARCHIVED' ? now : null,
      },
    })

    await recordAudit(
      {
        action: 'PROJECT_CREATED',
        entityType: 'Project',
        entityId: project.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { title: project.title, status: project.status },
      },
      tx,
    )

    return project
  })
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  ctx: RequestContext,
) {
  const existing = await prisma.project.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Project')
  }

  const data: Prisma.ProjectUpdateInput = {}

  if (input.title !== undefined) data.title = input.title
  if (input.slug !== undefined) {
    data.slug = await resolveSlug(input.slug, input.title ?? existing.title, id)
  }
  if (input.summary !== undefined) data.summary = input.summary
  if (input.description !== undefined) data.description = input.description
  if (input.category !== undefined) data.category = input.category
  if (input.year !== undefined) data.year = input.year
  if (input.technologies !== undefined) data.technologies = input.technologies
  if (input.liveUrl !== undefined) data.liveUrl = input.liveUrl
  if (input.repositoryUrl !== undefined) data.repositoryUrl = input.repositoryUrl
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl
  if (input.imageAlt !== undefined) data.imageAlt = input.imageAlt
  if (input.featured !== undefined) data.featured = input.featured
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  let statusChanged = false

  if (input.status !== undefined && input.status !== existing.status) {
    statusChanged = true
    data.status = input.status

    if (input.status === 'PUBLISHED') {
      data.publishedAt = existing.publishedAt ?? new Date()
      data.archivedAt = null
    } else if (input.status === 'ARCHIVED') {
      data.archivedAt = new Date()
    } else {
      data.publishedAt = null
      data.archivedAt = null
    }
  }

  const changedFields = Object.keys(data)

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({ where: { id }, data })

    await recordAudit(
      {
        action: statusChanged ? 'PROJECT_STATUS_CHANGED' : 'PROJECT_UPDATED',
        entityType: 'Project',
        entityId: project.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          title: project.title,
          fields: changedFields,
          from: existing.status,
          to: project.status,
        },
      },
      tx,
    )

    return project
  })
}

export async function deleteProject(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.project.findUnique({ where: { id } })

  if (!existing) {
    throw notFound('Project')
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.delete({ where: { id } })

    await recordAudit(
      {
        action: 'PROJECT_DELETED',
        entityType: 'Project',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { title: existing.title, slug: existing.slug, status: existing.status },
      },
      tx,
    )
  })
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({ where: { id } })

  if (!project) {
    throw notFound('Project')
  }

  return project
}

export async function listProjects(query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = {}

  if (query.status) {
    where.status = query.status
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
      { summary: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    query.sort === 'title'
      ? [{ title: 'asc' }]
      : query.sort === 'created'
        ? [{ createdAt: 'desc' }]
        : [{ updatedAt: 'desc' }]

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.project.count({ where }),
  ])

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

/** Public listing: published records only, with administrative fields omitted. */
export async function listPublishedProjects() {
  return prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
    select: PUBLIC_PROJECT_SELECT,
  })
}
