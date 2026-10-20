import { z } from 'zod'

export const projectStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export type ProjectStatusValue = z.infer<typeof projectStatusSchema>

const httpUrlSchema = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .max(2048, 'URL is too long.')
      .regex(/^https?:\/\/[^\s]+$/i, 'Enter a valid http(s) URL.'),
  ])
  .nullish()
  .transform((value) => (value ? value : null))

const slugSchema = z
  .string()
  .trim()
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only.')

/**
 * Field definitions shared by create and update. Defaults are applied in the
 * service layer instead of through Zod, so a PATCH never silently resets
 * fields the client did not send.
 */
const projectFields = {
  title: z.string().trim().min(2, 'Title needs at least 2 characters.').max(120),
  slug: slugSchema,
  summary: z.string().trim().min(10, 'Summary needs at least 10 characters.').max(300),
  description: z.string().max(20_000, 'Description is too long.'),
  category: z.string().trim().min(2).max(60),
  year: z
    .string()
    .trim()
    .regex(/^\d{4}(–\d{4})?$/, 'Use a year like 2026 or 2024–2026.'),
  technologies: z.array(z.string().trim().min(1).max(40)).max(20, 'List at most 20 technologies.'),
  liveUrl: httpUrlSchema,
  repositoryUrl: httpUrlSchema,
  imageUrl: httpUrlSchema,
  imageAlt: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((value) => (value ? value : null)),
  status: projectStatusSchema,
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
} as const

const baseProjectSchema = z.object(projectFields)

export const createProjectSchema = baseProjectSchema
  .partial({
    slug: true,
    description: true,
    category: true,
    technologies: true,
    liveUrl: true,
    repositoryUrl: true,
    imageUrl: true,
    imageAlt: true,
    status: true,
    featured: true,
    sortOrder: true,
  })
  .strict()

export const updateProjectSchema = baseProjectSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const listProjectsQuerySchema = z
  .object({
    search: z.string().trim().max(100).optional(),
    status: projectStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(10),
    sort: z.enum(['updated', 'created', 'title']).default('updated'),
  })
  .strict()

export const projectIdSchema = z.string().trim().min(1).max(64)

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
