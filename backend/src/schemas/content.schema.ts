import { z } from 'zod'
import { recordIdSchema } from './common.schema.js'

/** The soft-deletable content collections that share bulk, trash, and revision support. */
export const contentEntitySchema = z.enum([
  'project',
  'skill',
  'experience',
  'education',
  'certification',
])

export type ContentEntityParam = z.infer<typeof contentEntitySchema>

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}

export const bulkActionSchema = z
  .object({
    action: z.enum(['publish', 'unpublish', 'delete']),
    // Bounded so one request cannot scan or lock an unbounded set of rows.
    ids: z.array(z.string().trim().min(1).max(64)).min(1).max(50),
  })
  .strict()

export type BulkActionInput = z.infer<typeof bulkActionSchema>

export const trashQuerySchema = z
  .object({
    type: contentEntitySchema.optional(),
    ...pagination,
  })
  .strict()

export type TrashQuery = z.infer<typeof trashQuerySchema>

/**
 * Bulk trash operations mix content types, so every entry carries its own type
 * rather than relying on a type in the path. Capped like the content bulk
 * endpoint so one request cannot lock an unbounded set of rows.
 */
export const bulkTrashSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            type: contentEntitySchema,
            id: recordIdSchema,
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()

export type BulkTrashInput = z.infer<typeof bulkTrashSchema>

/** `null` cancels a pending schedule. */
export const schedulePublicationSchema = z
  .object({
    publishAt: z.string().trim().min(1).max(40).nullable(),
  })
  .strict()

export const revisionQuerySchema = z
  .object({
    entityType: z.enum(['Project', 'Skill', 'Experience', 'Education', 'Certification']).optional(),
    entityId: z.string().trim().min(1).max(64).optional(),
    ...pagination,
  })
  .strict()

export type RevisionQuery = z.infer<typeof revisionQuerySchema>
