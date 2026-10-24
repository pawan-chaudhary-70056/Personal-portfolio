import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { profilePortraitUrl } from '../lib/media-url.js'
import { validationError } from '../lib/validate.js'
import {
  profileValuesSchema,
  type ProfileValues,
  type UpdateProfileInput,
} from '../schemas/profile.schema.js'
import { requireMediaAssetId } from './media.service.js'

/** Enforces the singleton in application code; there is no create endpoint. */
const PROFILE_ID = 'primary'

/** Explicit allowlist of fields the public site may receive. */
const PUBLIC_PROFILE_SELECT = {
  displayName: true,
  headline: true,
  biography: true,
  location: true,
  publicEmail: true,
  websiteUrl: true,
  linkedinUrl: true,
  githubUrl: true,
  portraitUrl: true,
  portraitMediaId: true,
  portraitAlt: true,
} satisfies Prisma.ProfileSelect

export async function getProfile() {
  return prisma.profile.findUnique({ where: { id: PROFILE_ID } })
}

export async function getPublicProfile() {
  const profile = await prisma.profile.findUnique({
    where: { id: PROFILE_ID },
    select: PUBLIC_PROFILE_SELECT,
  })

  if (!profile) {
    return null
  }

  // An uploaded portrait is exposed as its public media URL; the reference
  // itself stays administrative.
  const { portraitMediaId, ...rest } = profile

  return {
    ...rest,
    portraitUrl: portraitMediaId ? profilePortraitUrl(portraitMediaId) : rest.portraitUrl,
  }
}

function storedValues(profile: Awaited<ReturnType<typeof getProfile>>): ProfileValues {
  return {
    displayName: profile?.displayName ?? '',
    headline: profile?.headline ?? '',
    biography: profile?.biography ?? '',
    location: profile?.location ?? null,
    publicEmail: profile?.publicEmail ?? null,
    websiteUrl: profile?.websiteUrl ?? null,
    linkedinUrl: profile?.linkedinUrl ?? null,
    githubUrl: profile?.githubUrl ?? null,
    portraitUrl: profile?.portraitUrl ?? null,
    portraitMediaId: profile?.portraitMediaId ?? null,
    portraitAlt: profile?.portraitAlt ?? null,
  }
}

/**
 * Applies the patch to the current record and validates the complete result, so
 * required fields and cross-field rules hold for both creation and partial
 * updates. A profile is created on the first successful save.
 */
export async function updateProfile(input: UpdateProfileInput, ctx: RequestContext) {
  const existing = await prisma.profile.findUnique({ where: { id: PROFILE_ID } })
  const merged = profileValuesSchema.safeParse({ ...storedValues(existing), ...input })

  if (!merged.success) {
    throw validationError(merged.error)
  }

  const data = merged.data

  // The dashboard offers two portrait inputs; the stored record keeps exactly
  // one source so the public result is unambiguous.
  if (data.portraitMediaId) {
    await requireMediaAssetId(data.portraitMediaId, 'portraitMediaId')
    data.portraitUrl = null
  } else if (data.portraitUrl) {
    data.portraitMediaId = null
  }

  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, ...data },
      update: data,
    })

    await recordAudit(
      {
        action: 'PROFILE_UPDATED',
        entityType: 'Profile',
        entityId: profile.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { fields: Object.keys(input), created: !existing },
      },
      tx,
    )

    return profile
  })
}
