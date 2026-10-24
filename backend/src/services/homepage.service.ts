import type { Prisma } from '@prisma/client'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { ApiError } from '../lib/errors.js'
import { ALLOWED_IMAGE_TYPES, inspectImage } from '../lib/image.js'
import {
  DEFAULT_SECTION_ORDER,
  HOMEPAGE_SECTIONS,
  MAX_FEATURED_PROJECTS,
  SECTION_KEYS,
  type HomepageDraftInput,
  type SectionKey,
} from '../schemas/homepage.schema.js'
import { readMediaFile } from './media.service.js'
import { removeImage, storeImage } from './media-storage.js'
import { getPublicSiteSettings } from './site-settings.service.js'

/** Singleton row, matching the Profile pattern. */
const SETTINGS_ID = 'primary'

const PORTRAIT_COLUMNS = {
  id: true,
  width: true,
  height: true,
  mimeType: true,
  sizeBytes: true,
} satisfies Prisma.MediaAssetSelect

interface HeroState {
  portrait: {
    id: string
    url: string
    alt: string
    width: number
    height: number
    mimeType: string
    sizeBytes: number
  } | null
  portraitVisible: boolean
  effectEnabled: boolean
  tiltIntensity: number
  animationIntensity: number
  floatingEnabled: boolean
}

/** Draft/published homepage presentation: the hero plus ordered sections. */
interface HomepageState extends HeroState {
  sectionOrder: SectionKey[]
  hiddenSections: SectionKey[]
  featuredProjectIds: string[]
}

const DEFAULT_STATE = {
  portraitVisible: true,
  effectEnabled: true,
  tiltIntensity: 40,
  animationIntensity: 50,
  floatingEnabled: true,
} as const

const SECTION_KEY_SET = new Set<string>(SECTION_KEYS)

function isSectionKey(value: string): value is SectionKey {
  return SECTION_KEY_SET.has(value)
}

/**
 * Keeps only known, unique keys and appends any section missing from the stored
 * value. Rows created before a section existed, or hand-edited data, therefore
 * still render every section exactly once instead of dropping content.
 */
function normalizeSectionOrder(order: readonly string[] | null | undefined): SectionKey[] {
  const seen = new Set<SectionKey>()
  const normalized: SectionKey[] = []

  for (const key of order ?? []) {
    if (isSectionKey(key) && !seen.has(key)) {
      seen.add(key)
      normalized.push(key)
    }
  }

  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) {
      normalized.push(key)
    }
  }

  return normalized
}

function normalizeHiddenSections(
  hidden: readonly string[] | null | undefined,
): SectionKey[] {
  return [...new Set((hidden ?? []).filter(isSectionKey))]
}

type SettingsWithPortraits = Prisma.HomepageSettingsGetPayload<{
  include: { draftPortrait: { select: typeof PORTRAIT_COLUMNS }; publishedPortrait: { select: typeof PORTRAIT_COLUMNS } }
}>

function portraitView(
  asset: { id: string; width: number; height: number; mimeType: string; sizeBytes: number } | null,
  alt: string | null,
  scope: 'admin' | 'public',
) {
  if (!asset) {
    return null
  }

  return {
    id: asset.id,
    url:
      scope === 'admin' ? `/api/admin/media/${asset.id}/file` : `/api/media/hero-portrait/${asset.id}`,
    alt: alt ?? '',
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  }
}

function draftState(settings: SettingsWithPortraits | null): HomepageState {
  return {
    portrait: portraitView(settings?.draftPortrait ?? null, settings?.draftPortraitAlt ?? null, 'admin'),
    portraitVisible: settings?.draftPortraitVisible ?? DEFAULT_STATE.portraitVisible,
    effectEnabled: settings?.draftEffectEnabled ?? DEFAULT_STATE.effectEnabled,
    tiltIntensity: settings?.draftTiltIntensity ?? DEFAULT_STATE.tiltIntensity,
    animationIntensity: settings?.draftAnimationIntensity ?? DEFAULT_STATE.animationIntensity,
    floatingEnabled: settings?.draftFloatingEnabled ?? DEFAULT_STATE.floatingEnabled,
    sectionOrder: normalizeSectionOrder(settings?.draftSectionOrder),
    hiddenSections: normalizeHiddenSections(settings?.draftHiddenSections),
    featuredProjectIds: settings?.draftFeaturedProjectIds ?? [],
  }
}

function publishedState(settings: SettingsWithPortraits | null): HomepageState | null {
  if (!settings?.publishedAt) {
    return null
  }

  return {
    portrait: portraitView(
      settings.publishedPortrait ?? null,
      settings.publishedPortraitAlt ?? null,
      'admin',
    ),
    portraitVisible: settings.publishedPortraitVisible,
    effectEnabled: settings.publishedEffectEnabled,
    tiltIntensity: settings.publishedTiltIntensity,
    animationIntensity: settings.publishedAnimationIntensity,
    floatingEnabled: settings.publishedFloatingEnabled,
    sectionOrder: normalizeSectionOrder(settings.publishedSectionOrder),
    hiddenSections: normalizeHiddenSections(settings.publishedHiddenSections),
    featuredProjectIds: settings.publishedFeaturedProjectIds ?? [],
  }
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function statesMatch(draft: HomepageState, published: HomepageState): boolean {
  return (
    draft.portrait?.id === published.portrait?.id &&
    draft.portrait?.alt === published.portrait?.alt &&
    draft.portraitVisible === published.portraitVisible &&
    draft.effectEnabled === published.effectEnabled &&
    draft.tiltIntensity === published.tiltIntensity &&
    draft.animationIntensity === published.animationIntensity &&
    draft.floatingEnabled === published.floatingEnabled &&
    arraysEqual(draft.sectionOrder, published.sectionOrder) &&
    arraysEqual(draft.hiddenSections, published.hiddenSections) &&
    arraysEqual(draft.featuredProjectIds, published.featuredProjectIds)
  )
}

function loadSettings(): Promise<SettingsWithPortraits | null> {
  return prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    include: {
      draftPortrait: { select: PORTRAIT_COLUMNS },
      publishedPortrait: { select: PORTRAIT_COLUMNS },
    },
  })
}

/**
 * Deletes an asset only when no draft or published reference remains. The
 * database row goes first so a failure to unlink cannot leave a dangling record.
 */
async function deleteIfUnreferenced(mediaId: string | null): Promise<void> {
  if (!mediaId) {
    return
  }

  const references = await prisma.homepageSettings.count({
    where: { OR: [{ draftPortraitId: mediaId }, { publishedPortraitId: mediaId }] },
  })

  if (references > 0) {
    return
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { storageKey: true },
  })

  if (!asset) {
    return
  }

  try {
    await prisma.mediaAsset.delete({ where: { id: mediaId } })
  } catch {
    // A concurrent reference appeared; leave the asset alone.
    return
  }

  await removeImage(asset.storageKey)
}

export async function getAdminHomepage() {
  const settings = await loadSettings()
  const draft = draftState(settings)
  const published = publishedState(settings)

  // Only published projects may be featured, so the picker matches what the
  // public homepage is actually able to render.
  const featuredCandidates = await prisma.project.findMany({
    where: { status: 'PUBLISHED', deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    select: { id: true, title: true, slug: true },
  })

  return {
    draft,
    published,
    hasUnpublishedChanges: published === null || !statesMatch(draft, published),
    publishedAt: settings?.publishedAt?.toISOString() ?? null,
    limits: {
      maxBytes: env.MEDIA_MAX_BYTES,
      allowedTypes: [...ALLOWED_IMAGE_TYPES],
    },
    sectionCatalog: HOMEPAGE_SECTIONS.map((section) => ({ ...section })),
    featuredCandidates,
    maxFeaturedProjects: MAX_FEATURED_PROJECTS,
  }
}

/** Public state. Draft uploads and draft effect values are never included. */
export async function getPublicHero() {
  const settings = await prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    include: { publishedPortrait: { select: PORTRAIT_COLUMNS } },
  })

  const portrait =
    settings?.publishedPortrait && settings.publishedPortraitVisible
      ? portraitView(
          settings.publishedPortrait,
          settings.publishedPortraitAlt ?? null,
          'public',
        )
      : null

  return {
    portrait: portrait
      ? {
          url: portrait.url,
          alt: portrait.alt,
          width: portrait.width,
          height: portrait.height,
          mimeType: portrait.mimeType,
        }
      : null,
    effect: {
      enabled: settings?.publishedEffectEnabled ?? DEFAULT_STATE.effectEnabled,
      tiltIntensity: settings?.publishedTiltIntensity ?? DEFAULT_STATE.tiltIntensity,
      animationIntensity:
        settings?.publishedAnimationIntensity ?? DEFAULT_STATE.animationIntensity,
      floating: settings?.publishedFloatingEnabled ?? DEFAULT_STATE.floatingEnabled,
    },
  }
}

function fieldError(path: string, message: string): ApiError {
  return new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
    { path, message },
  ])
}

/**
 * Applies a partial update to the draft homepage configuration. The section order
 * must be a complete permutation of the documented catalog, and every featured
 * project must exist and currently be published so the public homepage can
 * always render the saved selection.
 */
/**
 * Public homepage configuration. Only the published section layout and approved
 * site metadata are exposed; draft ordering, hidden drafts, and unpublished
 * featured references never leave the admin API.
 */
export async function getPublicHomepage() {
  const settings = await prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      publishedAt: true,
      publishedSectionOrder: true,
      publishedHiddenSections: true,
      publishedFeaturedProjectIds: true,
    },
  })

  const isPublished = Boolean(settings?.publishedAt)
  const sectionOrder = isPublished
    ? normalizeSectionOrder(settings?.publishedSectionOrder)
    : DEFAULT_SECTION_ORDER
  const hiddenSections = new Set(
    isPublished ? normalizeHiddenSections(settings?.publishedHiddenSections) : [],
  )
  const featuredProjectIds = isPublished ? (settings?.publishedFeaturedProjectIds ?? []) : []

  const featured = featuredProjectIds.length
    ? await prisma.project.findMany({
        where: { id: { in: featuredProjectIds }, status: 'PUBLISHED', deletedAt: null },
        select: { id: true, title: true, slug: true },
      })
    : []

  const featuredById = new Map(featured.map((project) => [project.id, project]))

  return {
    sections: sectionOrder.map((key) => ({ key, visible: !hiddenSections.has(key) })),
    featuredProjects: featuredProjectIds.flatMap((id) => {
      const project = featuredById.get(id)
      return project ? [project] : []
    }),
    site: await getPublicSiteSettings(),
  }
}

export async function updateHomepageDraft(input: HomepageDraftInput, ctx: RequestContext) {
  const existing = await prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      draftPortraitAlt: true,
      draftSectionOrder: true,
      draftHiddenSections: true,
      draftFeaturedProjectIds: true,
    },
  })

  const portraitAlt =
    input.portraitAlt === undefined
      ? (existing?.draftPortraitAlt ?? null)
      : input.portraitAlt?.trim()
        ? input.portraitAlt.trim()
        : null

  const sectionOrder =
    input.sectionOrder === undefined
      ? normalizeSectionOrder(existing?.draftSectionOrder)
      : input.sectionOrder

  if (sectionOrder.length !== SECTION_KEYS.length) {
    throw fieldError('sectionOrder', 'Arrange every section exactly once.')
  }

  const hiddenSections =
    input.hiddenSections === undefined
      ? normalizeHiddenSections(existing?.draftHiddenSections)
      : input.hiddenSections

  const featuredProjectIds =
    input.featuredProjectIds === undefined
      ? (existing?.draftFeaturedProjectIds ?? [])
      : input.featuredProjectIds

  if (featuredProjectIds.length > 0) {
    const published = await prisma.project.count({
      where: { id: { in: featuredProjectIds }, status: 'PUBLISHED', deletedAt: null },
    })

    if (published !== featuredProjectIds.length) {
      throw fieldError(
        'featuredProjectIds',
        'Only published projects can be featured. Publish the project first.',
      )
    }
  }

  const data: Prisma.HomepageSettingsUpdateInput = {
    draftPortraitAlt: portraitAlt,
    draftSectionOrder: sectionOrder,
    draftHiddenSections: hiddenSections,
    draftFeaturedProjectIds: featuredProjectIds,
  }

  if (input.portraitVisible !== undefined) data.draftPortraitVisible = input.portraitVisible
  if (input.effectEnabled !== undefined) data.draftEffectEnabled = input.effectEnabled
  if (input.tiltIntensity !== undefined) data.draftTiltIntensity = input.tiltIntensity
  if (input.animationIntensity !== undefined) {
    data.draftAnimationIntensity = input.animationIntensity
  }
  if (input.floatingEnabled !== undefined) data.draftFloatingEnabled = input.floatingEnabled

  await prisma.$transaction(async (tx) => {
    await tx.homepageSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        draftPortraitAlt: portraitAlt,
        draftPortraitVisible: input.portraitVisible ?? DEFAULT_STATE.portraitVisible,
        draftEffectEnabled: input.effectEnabled ?? DEFAULT_STATE.effectEnabled,
        draftTiltIntensity: input.tiltIntensity ?? DEFAULT_STATE.tiltIntensity,
        draftAnimationIntensity:
          input.animationIntensity ?? DEFAULT_STATE.animationIntensity,
        draftFloatingEnabled: input.floatingEnabled ?? DEFAULT_STATE.floatingEnabled,
        draftSectionOrder: sectionOrder,
        draftHiddenSections: hiddenSections,
        draftFeaturedProjectIds: featuredProjectIds,
      },
      update: data,
    })

    await recordAudit(
      {
        action: 'HOMEPAGE_DRAFT_UPDATED',
        entityType: 'HomepageSettings',
        entityId: SETTINGS_ID,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { fields: Object.keys(input) },
      },
      tx,
    )
  })

  return getAdminHomepage()
}

export interface UploadedPortrait {
  buffer: Buffer
  originalName: string
}

/** Validates, stores, and records the uploaded image as the draft portrait. */
export async function uploadDraftPortrait(file: UploadedPortrait, ctx: RequestContext) {
  const info = inspectImage(file.buffer)

  if (!info) {
    throw new ApiError(400, 'invalid_image', 'Upload a JPEG, PNG, or WebP image.', [
      {
        path: 'file',
        message: 'Only JPEG, PNG, and WebP images are accepted.',
      },
    ])
  }

  const storageKey = await storeImage(file.buffer, info.extension)
  let previousDraftId: string | null = null

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          storageKey,
          originalFilename: file.originalName.slice(0, 200) || 'portrait',
          mimeType: info.mimeType,
          sizeBytes: file.buffer.byteLength,
          width: info.width,
          height: info.height,
        },
      })

      const existing = await tx.homepageSettings.findUnique({
        where: { id: SETTINGS_ID },
        select: { draftPortraitId: true },
      })
      previousDraftId = existing?.draftPortraitId ?? null

      await tx.homepageSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, draftPortraitId: asset.id },
        update: { draftPortraitId: asset.id },
      })

      await recordAudit(
        {
          action: 'MEDIA_UPLOADED',
          entityType: 'MediaAsset',
          entityId: asset.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: {
            mimeType: info.mimeType,
            sizeBytes: file.buffer.byteLength,
            width: info.width,
            height: info.height,
            replaced: previousDraftId !== null,
          },
        },
        tx,
      )
    })
  } catch (error) {
    // The file is only reachable once the database row exists.
    await removeImage(storageKey)
    throw error
  }

  await deleteIfUnreferenced(previousDraftId)

  return getAdminHomepage()
}

/**
 * Reuses an image already in the library as the draft portrait. The library
 * description fills the draft alt text only when it is currently empty, so an
 * intentional description is never overwritten. The previously selected draft
 * asset is removed when nothing else references it.
 */
export async function selectDraftPortrait(mediaId: string, ctx: RequestContext) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { id: true, altText: true },
  })

  if (!asset) {
    throw new ApiError(400, 'invalid_media', 'Choose an image from the media library.', [
      { path: 'mediaId', message: 'That image is no longer in the library.' },
    ])
  }

  const existing = await prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { draftPortraitId: true, draftPortraitAlt: true },
  })

  const previousDraftId = existing?.draftPortraitId ?? null
  const draftPortraitAlt = existing?.draftPortraitAlt?.trim()
    ? existing.draftPortraitAlt
    : (asset.altText ?? null)

  await prisma.$transaction(async (tx) => {
    await tx.homepageSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        draftPortraitId: asset.id,
        draftPortraitAlt,
      },
      update: { draftPortraitId: asset.id, draftPortraitAlt },
    })

    await recordAudit(
      {
        action: 'HOMEPAGE_DRAFT_UPDATED',
        entityType: 'HomepageSettings',
        entityId: SETTINGS_ID,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { fields: ['portrait'], source: 'library', mediaId: asset.id },
      },
      tx,
    )
  })

  if (previousDraftId && previousDraftId !== asset.id) {
    await deleteIfUnreferenced(previousDraftId)
  }

  return getAdminHomepage()
}

export async function removeDraftPortrait(ctx: RequestContext) {
  const existing = await prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { draftPortraitId: true },
  })

  const previousId = existing?.draftPortraitId ?? null

  if (previousId) {
    await prisma.$transaction(async (tx) => {
      await tx.homepageSettings.update({
        where: { id: SETTINGS_ID },
        data: { draftPortraitId: null, draftPortraitAlt: null },
      })

      await recordAudit(
        {
          action: 'HOMEPAGE_DRAFT_UPDATED',
          entityType: 'HomepageSettings',
          entityId: SETTINGS_ID,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: { fields: ['portrait'], removedPortrait: true },
        },
        tx,
      )
    })

    await deleteIfUnreferenced(previousId)
  }

  return getAdminHomepage()
}

/** Copies the draft state to the published state in one transaction. */
export async function publishHomepage(ctx: RequestContext) {
  const existing = await prisma.homepageSettings.findUnique({ where: { id: SETTINGS_ID } })

  if (!existing) {
    throw new ApiError(400, 'nothing_to_publish', 'There are no draft changes to publish.')
  }

  if (
    existing.draftPortraitId &&
    existing.draftPortraitVisible &&
    !existing.draftPortraitAlt?.trim()
  ) {
    throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', [
      {
        path: 'portraitAlt',
        message: 'Describe the portrait before publishing it.',
      },
    ])
  }

  const previousPublishedId = existing.publishedPortraitId

  // A featured project may have been unpublished or deleted since the draft was
  // saved. Publishing drops those references instead of failing the whole page.
  const publishableFeatured =
    existing.draftFeaturedProjectIds.length > 0
      ? (
          await prisma.project.findMany({
            where: {
              id: { in: existing.draftFeaturedProjectIds },
              status: 'PUBLISHED',
              deletedAt: null,
            },
            select: { id: true },
          })
        ).map((project) => project.id)
      : []

  const featuredProjectIds = existing.draftFeaturedProjectIds.filter((id) =>
    publishableFeatured.includes(id),
  )

  await prisma.$transaction(async (tx) => {
    await tx.homepageSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        publishedPortraitId: existing.draftPortraitId,
        publishedPortraitAlt: existing.draftPortraitAlt,
        publishedPortraitVisible: existing.draftPortraitVisible,
        publishedEffectEnabled: existing.draftEffectEnabled,
        publishedTiltIntensity: existing.draftTiltIntensity,
        publishedAnimationIntensity: existing.draftAnimationIntensity,
        publishedFloatingEnabled: existing.draftFloatingEnabled,
        publishedSectionOrder: existing.draftSectionOrder,
        publishedHiddenSections: existing.draftHiddenSections,
        publishedFeaturedProjectIds: featuredProjectIds,
        publishedAt: new Date(),
      },
    })

    await recordAudit(
      {
        action: 'HOMEPAGE_PUBLISHED',
        entityType: 'HomepageSettings',
        entityId: SETTINGS_ID,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: {
          portraitId: existing.draftPortraitId,
          portraitVisible: existing.draftPortraitVisible,
          effectEnabled: existing.draftEffectEnabled,
        },
      },
      tx,
    )
  })

  await deleteIfUnreferenced(previousPublishedId)

  return getAdminHomepage()
}

/**
 * Public reads are limited to the published, visible portrait. Every other id
 * returns 404 so drafts cannot be fetched by guessing identifiers.
 */
export async function readPublishedPortrait(
  id: string,
): Promise<{ asset: { mimeType: string; sizeBytes: number }; buffer: Buffer } | null> {
  const settings = await prisma.homepageSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { publishedPortraitId: true, publishedPortraitVisible: true },
  })

  if (
    !settings?.publishedPortraitId ||
    settings.publishedPortraitId !== id ||
    !settings.publishedPortraitVisible
  ) {
    return null
  }

  return readMediaFile(id)
}
