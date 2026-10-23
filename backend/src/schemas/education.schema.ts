import { z } from 'zod'
import { optionalDateOnlySchema, optionalTextSchema } from './common.schema.js'

const educationFields = {
  institution: z
    .string()
    .trim()
    .min(1, 'Enter the institution.')
    .max(160, 'Institution is too long.'),
  qualification: z
    .string()
    .trim()
    .min(1, 'Enter the qualification.')
    .max(160, 'Qualification is too long.'),
  fieldOfStudy: optionalTextSchema(160),
  description: optionalTextSchema(5000),
  startDate: optionalDateOnlySchema,
  endDate: optionalDateOnlySchema,
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
} as const

const baseEducationSchema = z.object(educationFields)

function refineDates(
  value: { startDate?: string | null; endDate?: string | null },
  context: z.RefinementCtx,
): void {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'The end date must be on or after the start date.',
    })
  }
}

export const createEducationSchema = baseEducationSchema
  .partial({
    fieldOfStudy: true,
    description: true,
    startDate: true,
    endDate: true,
    sortOrder: true,
    published: true,
  })
  .strict()
  .superRefine(refineDates)

export const updateEducationSchema = baseEducationSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
  .superRefine(refineDates)

export const listEducationQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
  })
  .strict()

export type CreateEducationInput = z.infer<typeof createEducationSchema>
export type UpdateEducationInput = z.infer<typeof updateEducationSchema>
export type ListEducationQuery = z.infer<typeof listEducationQuerySchema>
