import { z } from 'zod'
import { dateOnlySchema } from './common.schema.js'

const experienceFields = {
  role: z.string().trim().min(1, 'Enter the role.').max(120),
  organization: z.string().trim().min(1, 'Enter the organization.').max(120),
  employmentType: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((value) => (value ? value : null)),
  location: z
    .string()
    .trim()
    .max(120)
    .nullish()
    .transform((value) => (value ? value : null)),
  description: z
    .string()
    .trim()
    .max(5000)
    .nullish()
    .transform((value) => (value ? value : null)),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema
    .nullish()
    .transform((value) => (value ? value : null)),
  isCurrent: z.boolean(),
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
} as const

const baseExperienceSchema = z.object(experienceFields)

/** Cross-field rules: a current role has no end date, and dates must be ordered. */
function refineDates(
  value: { startDate?: string; endDate?: string | null; isCurrent?: boolean },
  context: z.RefinementCtx,
): void {
  if (value.isCurrent === true && value.endDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'A current role cannot have an end date.',
    })
  }

  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'The end date must be on or after the start date.',
    })
  }
}

export const createExperienceSchema = baseExperienceSchema
  .partial({ employmentType: true, location: true, description: true, endDate: true, isCurrent: true, published: true, sortOrder: true })
  .strict()
  .superRefine(refineDates)

export const updateExperienceSchema = baseExperienceSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const listExperienceQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
  })
  .strict()

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>
export type ListExperienceQuery = z.infer<typeof listExperienceQuerySchema>
