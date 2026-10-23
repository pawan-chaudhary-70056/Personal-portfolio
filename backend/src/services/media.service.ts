import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { ApiError, conflict, notFound } from '../lib/errors.js'
import { inspectImage } from '../lib/image.js'
import type { ListMediaQuery, UpdateMediaInput } from '../schemas/media.schema.js'
import { readImage, removeImage, storeImage } from './media-storage.js'

const ADMIN_MEDIA_SELECT = {
  id: true,
  storageKey: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  altText: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaAssetSelect

interface MediaViewInput {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  altText: string | null
  createdAt: Date
  updatedAt: Date
}

function mediaView(asset: MediaViewInput) {
  return {
    id: asset.id,
    // Administrative access only: the file route requires a signed-in session.
    url: `/api/admin/media/${asset.id}/file`,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    altText: asset.altText,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  }
}

/** Library listing with validated pagination and a filename/alt-text search. */
export async function listMedia({ page, pageSize, search }: ListMediaQuery) {
  const where: Prisma.MediaAssetWhereInput = search
    ? {
        OR: [
          { originalFilename: { contains: search, mode: 'insensitive' } },
          { altText: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {}

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        ...ADMIN_MEDIA_SELECT,
        _count: { select: { draftFor: true, publishedFor: true } },
      },
    }),
    prisma.mediaAsset.count({ where }),
  ])

  return {
    items: assets.map(({ _count, ...asset }) => ({
      ...mediaView(asset),
      referenced: _count.draftFor + _count.publishedFor > 0,
    })),
    total,
    page,
    pageSize,
    pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

export async function getMediaAsset(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } })

  if (!asset) {
    throw notFound('Image')
  }

  return asset
}

export async function getMedia(id: string) {
  return mediaView(await getMediaAsset(id))
}

export interface UploadedMedia {
  buffer: Buffer
  originalName: string
}

/**
 * Validates the actual bytes, stores them under a generated key, then records the
 * metadata. A database failure removes the new file so nothing is orphaned.
 */
export async function uploadMedia(file: UploadedMedia, ctx: RequestContext) {
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

  try {
    const asset = await prisma.$transaction(async (tx) => {
      const created = await tx.mediaAsset.create({
        data: {
          storageKey,
          originalFilename: file.originalName.slice(0, 200) || 'upload',
          mimeType: info.mimeType,
          sizeBytes: file.buffer.byteLength,
          width: info.width,
          height: info.height,
        },
        select: ADMIN_MEDIA_SELECT,
      })

      await recordAudit(
        {
          action: 'MEDIA_UPLOADED',
          entityType: 'MediaAsset',
          entityId: created.id,
          adminId: ctx.adminId,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          metadata: {
            mimeType: info.mimeType,
            sizeBytes: file.buffer.byteLength,
            width: info.width,
            height: info.height,
          },
        },
        tx,
      )

      return created
    })

    return mediaView(asset)
  } catch (error) {
    // The file is only reachable once the metadata row exists.
    await removeImage(storageKey)
    throw error
  }
}

export async function updateMedia(id: string, input: UpdateMediaInput, ctx: RequestContext) {
  await getMediaAsset(id)

  const altText = input.altText ? input.altText.trim() : null

  const asset = await prisma.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.update({
      where: { id },
      data: { altText },
      select: ADMIN_MEDIA_SELECT,
    })

    await recordAudit(
      {
        action: 'MEDIA_UPDATED',
        entityType: 'MediaAsset',
        entityId: id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { fields: Object.keys(input) },
      },
      tx,
    )

    return updated
  })

  return mediaView(asset)
}

export async function readMediaFile(
  id: string,
): Promise<{ asset: { mimeType: string; sizeBytes: number }; buffer: Buffer }> {
  const asset = await getMediaAsset(id)
  const buffer = await readImage(asset.storageKey)

  return { asset, buffer }
}

/**
 * Deletion is refused while the homepage still references the asset. The
 * database row goes first so a storage failure cannot leave a dangling record.
 */
export async function deleteMediaAsset(id: string, ctx: RequestContext): Promise<void> {
  const asset = await getMediaAsset(id)

  const references = await prisma.homepageSettings.count({
    where: { OR: [{ draftPortraitId: id }, { publishedPortraitId: id }] },
  })

  if (references > 0) {
    throw conflict('This image is still used by the homepage. Replace or remove it there first.')
  }

  await prisma.$transaction(async (tx) => {
    await tx.mediaAsset.delete({ where: { id } })

    await recordAudit(
      {
        action: 'MEDIA_DELETED',
        entityType: 'MediaAsset',
        entityId: asset.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { mimeType: asset.mimeType, sizeBytes: asset.sizeBytes },
      },
      tx,
    )
  })

  await removeImage(asset.storageKey)
}
