import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { conflict, notFound } from '../lib/errors.js'
import { projectCoverUrl, projectScreenshotUrl } from '../lib/media-url.js'
import { slugify } from '../lib/slug.js'
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from '../schemas/project.schema.js'
import {
  findOrCreateProjectCategoryId,
  requireProjectCategoryId,
} from './categories.service.js'
import { recordContentRevision } from './content.service.js'
import { requireMediaAssetId } from './media.service.js'

/** Category names are stored on a relation but exposed as the documented string. */
function withCategoryName<T extends { category: { name: string } }>(project: T) {
  const { category, ...rest } = project
  return { ...rest, category: category.name }
}

/**
 * Public projection: an uploaded cover or gallery image is exposed as its public
 * media URL, so clients never need to know whether an image came from the
 * library or an external URL. The internal references stay administrative.
 */
function withPublicImages<
  T extends {
    coverMediaId: string | null
    imageUrl: string | null
    screenshots: Array<{ mediaId: string | null; url: string | null } & Record<string, unknown>>
  },
>(project: T) {
  const { coverMediaId, screenshots, ...rest } = project

  return {
    ...rest,
    imageUrl: coverMediaId ? projectCoverUrl(coverMediaId) : project.imageUrl,
    screenshots: screenshots.map(({ mediaId, ...screenshot }) => ({
      ...screenshot,
      url: mediaId ? projectScreenshotUrl(mediaId) : screenshot.url,
    })),
  }
}

const PUBLIC_PROJECT_SELECT = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  description: true,
  category: { select: { name: true } },
  year: true,
  technologies: true,
  liveUrl: true,
  repositoryUrl: true,
  imageUrl: true,
  coverMediaId: true,
  imageAlt: true,
  featured: true,
  publishedAt: true,
  screenshots: {
    select: {
      id: true,
      url: true,
      mediaId: true,
      alt: true,
      caption: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ProjectSelect

/**
 * Validates each picked gallery asset and normalizes the row so the database
 * never holds two sources. The field path points at the offending screenshot,
 * which is what the dashboard form maps back onto its rows.
 */
async function screenshotRows(
  screenshots: Array<{ url: string | null; mediaId: string | null; alt: string; caption: string | null }>,
) {
  return Promise.all(
    screenshots.map(async (screenshot, index) => {
      const mediaId = screenshot.mediaId
        ? await requireMediaAssetId(screenshot.mediaId, `screenshots.${index}.mediaId`)
        : null

      return {
        url: mediaId ? null : screenshot.url,
        mediaId,
        alt: screenshot.alt,
        caption: screenshot.caption,
        sortOrder: index,
      }
    }),
  )
}

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
  const coverMediaId = input.coverMediaId
    ? await requireMediaAssetId(input.coverMediaId, 'coverMediaId')
    : null
  const gallery = await screenshotRows(input.screenshots ?? [])

  return prisma.$transaction(async (tx) => {
    const categoryId = await findOrCreateProjectCategoryId(tx, input.category ?? 'Full-stack')

    const project = await tx.project.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        description: input.description ?? '',
        categoryId,
        year: input.year,
        technologies: input.technologies ?? [],
        liveUrl: input.liveUrl ?? null,
        repositoryUrl: input.repositoryUrl ?? null,
        // The schema rejects both at once; picking an asset clears the URL.
        imageUrl: coverMediaId ? null : (input.imageUrl ?? null),
        coverMediaId,
        imageAlt: input.imageAlt ?? null,
        status,
        featured: input.featured ?? false,
        sortOrder: input.sortOrder ?? 0,
        publishedAt: status === 'PUBLISHED' ? now : null,
        archivedAt: status === 'ARCHIVED' ? now : null,
        screenshots: { create: gallery },
      },
      include: { category: { select: { name: true } } },
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

    await recordContentRevision(tx, 'project', project.id, 'CREATED', ctx.adminId)

    return withCategoryName(project)
  })
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  ctx: RequestContext,
) {
  const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } })

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
  if (input.year !== undefined) data.year = input.year
  if (input.technologies !== undefined) data.technologies = input.technologies
  if (input.liveUrl !== undefined) data.liveUrl = input.liveUrl
  if (input.repositoryUrl !== undefined) data.repositoryUrl = input.repositoryUrl
  if (input.coverMediaId !== undefined) {
    data.coverMedia = input.coverMediaId
      ? {
          connect: {
            id: await requireMediaAssetId(input.coverMediaId, 'coverMediaId'),
          },
        }
      : { disconnect: true }

    if (input.coverMediaId) data.imageUrl = null
  }
  if (input.imageUrl !== undefined) {
    data.imageUrl = input.imageUrl
    // Switching back to an external URL detaches the uploaded cover.
    if (input.imageUrl) data.coverMedia = { disconnect: true }
  }
  if (input.imageAlt !== undefined) data.imageAlt = input.imageAlt
  if (input.featured !== undefined) data.featured = input.featured
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
  // A screenshot array always replaces the whole gallery, so list order becomes
  // the public display order and removed rows cannot linger.
  if (input.screenshots !== undefined) {
    data.screenshots = {
      deleteMany: {},
      create: await screenshotRows(input.screenshots),
    }
  }

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

  const changedFields = input.category === undefined ? Object.keys(data) : [...Object.keys(data), 'category']

  return prisma.$transaction(async (tx) => {
    if (input.category !== undefined) {
      data.category = { connect: { id: await requireProjectCategoryId(tx, input.category) } }
    }

    const project = await tx.project.update({
      where: { id },
      data,
      include: { category: { select: { name: true } } },
    })

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

    await recordContentRevision(tx, 'project', project.id, 'UPDATED', ctx.adminId)

    return withCategoryName(project)
  })
}

export async function deleteProject(id: string, ctx: RequestContext): Promise<void> {
  const existing = await prisma.project.findFirst({ where: { id, deletedAt: null } })

  if (!existing) {
    throw notFound('Project')
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id }, data: { deletedAt: new Date() } })

    await recordAudit(
      {
        action: 'PROJECT_DELETED',
        entityType: 'Project',
        entityId: existing.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          title: existing.title,
          slug: existing.slug,
          status: existing.status,
          trashed: true,
        },
      },
      tx,
    )

    await recordContentRevision(tx, 'project', existing.id, 'DELETED', ctx.adminId)
  })
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    // The edit form manages the gallery, so the admin read must return it.
    include: {
      category: { select: { name: true } },
      screenshots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
    },
  })

  if (!project) {
    throw notFound('Project')
  }

  return withCategoryName(project)
}

export async function listProjects(query: ListProjectsQuery) {
  const where: Prisma.ProjectWhereInput = { deletedAt: null }

  if (query.status) {
    where.status = query.status
  }

  if (query.category) {
    where.category = { name: query.category }
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { slug: { contains: query.search, mode: 'insensitive' } },
      { summary: { contains: query.search, mode: 'insensitive' } },
      { category: { name: { contains: query.search, mode: 'insensitive' } } },
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
      include: { category: { select: { name: true } } },
    }),
    prisma.project.count({ where }),
  ])

  return {
    items: items.map(withCategoryName),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

/** Public listing: published records only, with administrative fields omitted. */
export async function listPublishedProjects(category?: string) {
  const projects = await prisma.project.findMany({
    where: {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(category ? { category: { name: category } } : {}),
    },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }],
    select: PUBLIC_PROJECT_SELECT,
  })

  return projects.map((project) => withCategoryName(withPublicImages(project)))
}

/**
 * Public detail by slug. Drafts, archived records, and unknown slugs are all
 * reported as not found so the endpoint never reveals unpublished work.
 */
export async function getPublishedProjectBySlug(slug: string) {
  const project = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED', deletedAt: null },
    select: PUBLIC_PROJECT_SELECT,
  })

  if (!project) {
    throw notFound('Project')
  }

  return withCategoryName(withPublicImages(project))
}
