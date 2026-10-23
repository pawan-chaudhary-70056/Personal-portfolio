import { z } from 'zod'
import { optionalHttpUrlSchema } from './common.schema.js'

/**
 * Editable site metadata (docs/07-backend-api.md §11, docs/09 §19).
 *
 * The allowlist is deliberately small: credentials, connection strings, storage
 * paths, and other infrastructure settings have no representation here and are
 * rejected by `.strict()`.
 */
const siteSettingsFields = {
  siteTitle: z
    .string()
    .trim()
    .max(120, 'Keep the site title to 120 characters or fewer.'),
  siteDescription: z
    .string()
    .trim()
    .max(320, 'Keep the description to 320 characters or fewer.'),
  canonicalUrl: optionalHttpUrlSchema,
  socialImageUrl: optionalHttpUrlSchema,
} as const

/** Full stored shape, used when merging a partial update. */
export const siteSettingsValuesSchema = z.object(siteSettingsFields).strict()

export const updateSiteSettingsSchema = z
  .object(siteSettingsFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type SiteSettingsValues = z.infer<typeof siteSettingsValuesSchema>
export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>

export const DEFAULT_SITE_SETTINGS: SiteSettingsValues = {
  siteTitle: '',
  siteDescription: '',
  canonicalUrl: null,
  socialImageUrl: null,
}
