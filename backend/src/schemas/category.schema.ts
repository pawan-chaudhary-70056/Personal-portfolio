import { z } from 'zod'

/** Category slugs are used in URLs, mirroring project slugs. */
const categorySlugSchema = z
  .string()
  .trim()
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only.')

const categoryFields = {
  name: z.string().trim().min(1, 'Enter a category name.').max(60),
  slug: categorySlugSchema,
  sortOrder: z.number().int().min(0).max(9999),
} as const

export const createCategorySchema = z
  .object(categoryFields)
  .partial({ slug: true, sortOrder: true })
  .strict()

export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
