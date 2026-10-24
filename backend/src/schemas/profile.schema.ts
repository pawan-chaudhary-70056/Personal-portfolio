import { z } from 'zod'
import { optionalHttpUrlSchema } from './common.schema.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null))

const profileFields = {
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter the display name.')
    .max(120, 'Display name is too long.'),
  headline: z
    .string()
    .trim()
    .min(2, 'Enter a professional headline.')
    .max(160, 'Headline is too long.'),
  biography: z
    .string()
    .trim()
    .min(10, 'Biography needs at least 10 characters.')
    .max(10_000, 'Biography is too long.'),
  location: optionalText(120),
  publicEmail: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .toLowerCase()
        .max(254, 'Email is too long.')
        .regex(EMAIL_PATTERN, 'Enter a valid public email address.'),
    ])
    .nullish()
    .transform((value) => (value ? value : null)),
  websiteUrl: optionalHttpUrlSchema,
  linkedinUrl: optionalHttpUrlSchema,
  githubUrl: optionalHttpUrlSchema,
  portraitUrl: optionalHttpUrlSchema,
  /** Uploaded portrait from the media library; an alternative to `portraitUrl`. */
  portraitMediaId: z.string().trim().min(1).max(64).nullable(),
  portraitAlt: optionalText(200),
} as const

const baseProfileSchema = z.object(profileFields)

/**
 * Validates the complete merged profile. The service applies partial updates to
 * the stored record first, so cross-field rules cannot be bypassed by sending
 * one field at a time.
 */
export const profileValuesSchema = baseProfileSchema.strict().superRefine((value, context) => {
  if (value.portraitUrl && value.portraitMediaId) {
    context.addIssue({
      code: 'custom',
      path: ['portraitUrl'],
      message: 'Choose either an uploaded portrait or an external URL.',
    })
  }

  if ((value.portraitUrl || value.portraitMediaId) && !value.portraitAlt) {
    context.addIssue({
      code: 'custom',
      path: ['portraitAlt'],
      message: 'Describe the portrait for screen readers.',
    })
  }
})

export const updateProfileSchema = baseProfileSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
  .refine((value) => !(value.portraitUrl && value.portraitMediaId), {
    path: ['portraitUrl'],
    message: 'Choose either an uploaded portrait or an external URL.',
  })

export type ProfileValues = z.infer<typeof profileValuesSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
