import { prisma } from '../db/prisma.js'
import { recordAudit } from '../lib/audit.js'
import type { RequestContext } from '../lib/auth-types.js'
import { validationError } from '../lib/validate.js'
import {
  DEFAULT_SITE_SETTINGS,
  siteSettingsValuesSchema,
  type SiteSettingsValues,
  type UpdateSiteSettingsInput,
} from '../schemas/site-settings.schema.js'

/** Enforces the singleton in application code; there is no create endpoint. */
const SETTINGS_ID = 'primary'

export interface AdminSiteSettings extends SiteSettingsValues {
  updatedAt: string | null
}

function toValues(
  row: {
    siteTitle: string
    siteDescription: string
    canonicalUrl: string | null
    socialImageUrl: string | null
  } | null,
): SiteSettingsValues {
  return {
    siteTitle: row?.siteTitle ?? DEFAULT_SITE_SETTINGS.siteTitle,
    siteDescription: row?.siteDescription ?? DEFAULT_SITE_SETTINGS.siteDescription,
    canonicalUrl: row?.canonicalUrl ?? DEFAULT_SITE_SETTINGS.canonicalUrl,
    socialImageUrl: row?.socialImageUrl ?? DEFAULT_SITE_SETTINGS.socialImageUrl,
  }
}

async function loadSettings() {
  return prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } })
}

/** Editable settings for the admin form. */
export async function getSiteSettings(): Promise<AdminSiteSettings> {
  const row = await loadSettings()
  return { ...toValues(row), updatedAt: row?.updatedAt.toISOString() ?? null }
}

/** Only these fields are exposed publicly; the row has no other columns. */
export async function getPublicSiteSettings(): Promise<SiteSettingsValues> {
  return toValues(await loadSettings())
}

/**
 * Applies the patch to the stored values and validates the complete result, so a
 * partial update can never leave an invalid combination behind. The row is
 * created on the first successful save.
 */
export async function updateSiteSettings(
  input: UpdateSiteSettingsInput,
  ctx: RequestContext,
): Promise<AdminSiteSettings> {
  const existing = await loadSettings()

  const merged = siteSettingsValuesSchema.safeParse({
    ...DEFAULT_SITE_SETTINGS,
    ...(existing ? toValues(existing) : {}),
    ...input,
  })

  if (!merged.success) {
    throw validationError(merged.error)
  }

  const data = merged.data

  const saved = await prisma.$transaction(async (tx) => {
    const row = await tx.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    })

    await recordAudit(
      {
        action: 'SITE_SETTINGS_UPDATED',
        entityType: 'SiteSettings',
        entityId: row.id,
        adminId: ctx.adminId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { fields: Object.keys(input), created: !existing },
      },
      tx,
    )

    return row
  })

  return { ...toValues(saved), updatedAt: saved.updatedAt.toISOString() }
}
