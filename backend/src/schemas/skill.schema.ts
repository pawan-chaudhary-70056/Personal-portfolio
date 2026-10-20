import { z } from 'zod'

const skillFields = {
  name: z.string().trim().min(1, 'Enter the skill name.').max(60),
  category: z.string().trim().min(1, 'Enter a category.').max(60),
  description: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((value) => (value ? value : null)),
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
} as const

const baseSkillSchema = z.object(skillFields)

export const createSkillSchema = baseSkillSchema
  .partial({ description: true, sortOrder: true, published: true })
  .strict()

export const updateSkillSchema = baseSkillSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const listSkillsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(60).optional(),
  })
  .strict()

export type CreateSkillInput = z.infer<typeof createSkillSchema>
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>
export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>
