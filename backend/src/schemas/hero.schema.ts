import { z } from 'zod'

const intensity = z.number().int().min(0).max(100)

/** Draft hero fields, shared with the homepage configuration schema. */
export const heroDraftFields = {
  portraitAlt: z
    .string()
    .trim()
    .max(200, 'Describe the portrait in 200 characters or fewer.')
    .nullable(),
  portraitVisible: z.boolean(),
  effectEnabled: z.boolean(),
  tiltIntensity: intensity,
  animationIntensity: intensity,
  floatingEnabled: z.boolean(),
} as const

/**
 * Partial update of the draft hero state. Every field is optional so a PATCH may
 * change only alt text or one slider, but an empty body is rejected.
 */
export const heroDraftSchema = z
  .object(heroDraftFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type HeroDraftInput = z.infer<typeof heroDraftSchema>
