import type { Prisma, RevisionAction } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { notFound } from '../lib/errors.js'
import { recordRevision } from '../lib/revisions.js'

/**
 * Shared behaviour for the soft-deletable content collections. Trash, bulk
 * actions, and revisions all operate on the same five entity types, so the
 * per-type details live here instead of being repeated in three services.
 */

export const CONTENT_TYPES = [
  'project',
  'skill',
  'experience',
  'education',
  'certification',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export type DbClient = Prisma.TransactionClient

const LABELS: Record<ContentType, string> = {
  project: 'Project',
  skill: 'Skill',
  experience: 'Experience entry',
  education: 'Education entry',
  certification: 'Certification',
}

/** Audit actions keep the existing `<ENTITY>_<VERB>` naming from docs/07. */
const AUDIT_PREFIX: Record<ContentType, string> = {
  project: 'PROJECT',
  skill: 'SKILL',
  experience: 'EXPERIENCE',
  education: 'EDUCATION',
  certification: 'CERTIFICATION',
}

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value)
}

export function contentLabel(type: ContentType): string {
  return LABELS[type]
}

export function contentAuditPrefix(type: ContentType): string {
  return AUDIT_PREFIX[type]
}

/** Prisma model / audit entity names, kept in sync with the snapshot data. */
const ENTITY_TYPE: Record<ContentType, string> = {
  project: 'Project',
  skill: 'Skill',
  experience: 'Experience',
  education: 'Education',
  certification: 'Certification',
}

export function contentEntityType(type: ContentType): string {
  return ENTITY_TYPE[type]
}

/** Snapshot writer used by every create, update, trash, and restore path. */
export async function recordContentRevision(
  tx: DbClient,
  type: ContentType,
  id: string,
  action: RevisionAction,
  adminId: string | null,
): Promise<void> {
  const snapshot = await buildSnapshot(type, id, tx)

  await recordRevision(tx, {
    entityType: ENTITY_TYPE[type],
    entityId: id,
    action,
    snapshot: snapshot as Prisma.InputJsonValue,
    adminId,
  })
}

/** A short human label for audit metadata; every entity has one obvious title. */
export function contentTitle(type: ContentType, snapshot: Record<string, unknown>): string {
  switch (type) {
    case 'project':
      return String(snapshot.title ?? '')
    case 'skill':
      return String(snapshot.name ?? '')
    case 'experience':
      return `${String(snapshot.role ?? '')} at ${String(snapshot.organization ?? '')}`
    case 'education':
      return String(snapshot.qualification ?? '')
    case 'certification':
      return String(snapshot.name ?? '')
  }
}

function dateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

export interface ContentState {
  id: string
  deletedAt: Date | null
}

/** Existence check that deliberately includes trashed rows. */
export async function findContentState(
  type: ContentType,
  id: string,
  client: DbClient = prisma,
): Promise<ContentState | null> {
  switch (type) {
    case 'project':
      return client.project.findUnique({ where: { id }, select: { id: true, deletedAt: true } })
    case 'skill':
      return client.skill.findUnique({ where: { id }, select: { id: true, deletedAt: true } })
    case 'experience':
      return client.experience.findUnique({ where: { id }, select: { id: true, deletedAt: true } })
    case 'education':
      return client.education.findUnique({ where: { id }, select: { id: true, deletedAt: true } })
    case 'certification':
      return client.certification.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      })
  }
}

/** Administrative representation of a record, used as its revision snapshot. */
export async function buildSnapshot(
  type: ContentType,
  id: string,
  client: DbClient = prisma,
): Promise<Record<string, unknown>> {
  switch (type) {
    case 'project': {
      const project = await client.project.findUnique({
        where: { id },
        include: {
          category: { select: { name: true } },
          screenshots: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
        },
      })

      if (!project) throw notFound('Project')

      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        summary: project.summary,
        description: project.description,
        category: project.category.name,
        year: project.year,
        technologies: project.technologies,
        liveUrl: project.liveUrl,
        repositoryUrl: project.repositoryUrl,
        imageUrl: project.imageUrl,
        coverMediaId: project.coverMediaId,
        imageAlt: project.imageAlt,
        status: project.status,
        featured: project.featured,
        sortOrder: project.sortOrder,
        publishAt: project.publishAt?.toISOString() ?? null,
        screenshots: project.screenshots.map((screenshot) => ({
          url: screenshot.url,
          mediaId: screenshot.mediaId,
          alt: screenshot.alt,
          caption: screenshot.caption,
          sortOrder: screenshot.sortOrder,
        })),
      }
    }
    case 'skill': {
      const skill = await client.skill.findUnique({
        where: { id },
        include: { category: { select: { name: true } } },
      })

      if (!skill) throw notFound('Skill')

      return {
        id: skill.id,
        name: skill.name,
        category: skill.category.name,
        description: skill.description,
        sortOrder: skill.sortOrder,
        publishAt: skill.publishAt?.toISOString() ?? null,
        published: skill.published,
      }
    }
    case 'experience': {
      const experience = await client.experience.findUnique({ where: { id } })
      if (!experience) throw notFound('Experience entry')

      return {
        id: experience.id,
        role: experience.role,
        organization: experience.organization,
        employmentType: experience.employmentType,
        location: experience.location,
        description: experience.description,
        startDate: dateOnly(experience.startDate),
        endDate: dateOnly(experience.endDate),
        isCurrent: experience.isCurrent,
        published: experience.published,
        sortOrder: experience.sortOrder,
        publishAt: experience.publishAt?.toISOString() ?? null,
      }
    }
    case 'education': {
      const education = await client.education.findUnique({ where: { id } })
      if (!education) throw notFound('Education entry')

      return {
        id: education.id,
        institution: education.institution,
        qualification: education.qualification,
        fieldOfStudy: education.fieldOfStudy,
        description: education.description,
        startDate: dateOnly(education.startDate),
        endDate: dateOnly(education.endDate),
        sortOrder: education.sortOrder,
        publishAt: education.publishAt?.toISOString() ?? null,
        published: education.published,
      }
    }
    case 'certification': {
      const certification = await client.certification.findUnique({ where: { id } })
      if (!certification) throw notFound('Certification')

      return {
        id: certification.id,
        name: certification.name,
        issuingOrganization: certification.issuingOrganization,
        issueDate: dateOnly(certification.issueDate),
        expiryDate: dateOnly(certification.expiryDate),
        credentialId: certification.credentialId,
        credentialUrl: certification.credentialUrl,
        sortOrder: certification.sortOrder,
        publishAt: certification.publishAt?.toISOString() ?? null,
        published: certification.published,
      }
    }
  }
}

/**
 * Publish/unpublish. Projects use the status enum (with `publishedAt`), the
 * other collections use their boolean `published` flag.
 */
export async function setContentPublished(
  tx: DbClient,
  type: ContentType,
  id: string,
  published: boolean,
): Promise<void> {
  switch (type) {
    case 'project': {
      if (published) {
        const current = await tx.project.findUnique({
          where: { id },
          select: { publishedAt: true },
        })
        await tx.project.update({
          where: { id },
          data: {
            status: 'PUBLISHED',
            publishedAt: current?.publishedAt ?? new Date(),
            archivedAt: null,
          },
        })
      } else {
        await tx.project.update({
          where: { id },
          data: { status: 'DRAFT', publishedAt: null, archivedAt: null },
        })
      }
      return
    }
    case 'skill':
      await tx.skill.update({ where: { id }, data: { published } })
      return
    case 'experience':
      await tx.experience.update({ where: { id }, data: { published } })
      return
    case 'education':
      await tx.education.update({ where: { id }, data: { published } })
      return
    case 'certification':
      await tx.certification.update({ where: { id }, data: { published } })
      return
  }
}

export async function setContentPublishAt(
  tx: DbClient,
  type: ContentType,
  id: string,
  publishAt: Date | null,
): Promise<void> {
  switch (type) {
    case 'project':
      await tx.project.update({ where: { id }, data: { publishAt } })
      return
    case 'skill':
      await tx.skill.update({ where: { id }, data: { publishAt } })
      return
    case 'experience':
      await tx.experience.update({ where: { id }, data: { publishAt } })
      return
    case 'education':
      await tx.education.update({ where: { id }, data: { publishAt } })
      return
    case 'certification':
      await tx.certification.update({ where: { id }, data: { publishAt } })
      return
  }
}

export async function markContentDeleted(
  tx: DbClient,
  type: ContentType,
  id: string,
): Promise<void> {
  switch (type) {
    case 'project':
      await tx.project.update({ where: { id }, data: { deletedAt: new Date() } })
      return
    case 'skill':
      await tx.skill.update({ where: { id }, data: { deletedAt: new Date() } })
      return
    case 'experience':
      await tx.experience.update({ where: { id }, data: { deletedAt: new Date() } })
      return
    case 'education':
      await tx.education.update({ where: { id }, data: { deletedAt: new Date() } })
      return
    case 'certification':
      await tx.certification.update({ where: { id }, data: { deletedAt: new Date() } })
      return
  }
}

export async function markContentRestored(
  tx: DbClient,
  type: ContentType,
  id: string,
): Promise<void> {
  switch (type) {
    case 'project':
      await tx.project.update({ where: { id }, data: { deletedAt: null } })
      return
    case 'skill':
      await tx.skill.update({ where: { id }, data: { deletedAt: null } })
      return
    case 'experience':
      await tx.experience.update({ where: { id }, data: { deletedAt: null } })
      return
    case 'education':
      await tx.education.update({ where: { id }, data: { deletedAt: null } })
      return
    case 'certification':
      await tx.certification.update({ where: { id }, data: { deletedAt: null } })
      return
  }
}

/** Permanent delete. The row and its dependent rows are gone after this. */
export async function purgeContentRecord(
  tx: DbClient,
  type: ContentType,
  id: string,
): Promise<void> {
  switch (type) {
    case 'project':
      await tx.project.delete({ where: { id } })
      return
    case 'skill':
      await tx.skill.delete({ where: { id } })
      return
    case 'experience':
      await tx.experience.delete({ where: { id } })
      return
    case 'education':
      await tx.education.delete({ where: { id } })
      return
    case 'certification':
      await tx.certification.delete({ where: { id } })
      return
  }
}
