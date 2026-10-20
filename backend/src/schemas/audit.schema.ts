import { z } from 'zod'
import { dateOnlySchema } from './common.schema.js'

/** Entity types currently written by the audit service. */
export const auditEntityTypeSchema = z.enum(['Project', 'Skill', 'Experience', 'Admin'])
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>

const blankToUndefined = (value: string | undefined) => (value ? value : undefined)

/**
 * Query contract for `GET /api/admin/audit-logs`.
 *
 * Filters are optional and combine with AND semantics, matching the filtering
 * rules in docs/13-admin-advanced-features.md §8.5.
 */
export const listAuditLogsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    action: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform(blankToUndefined),
    entityType: z
      .union([z.literal(''), auditEntityTypeSchema])
      .optional()
      .transform(blankToUndefined),
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform(blankToUndefined),
    from: z
      .union([z.literal(''), dateOnlySchema])
      .optional()
      .transform(blankToUndefined),
    to: z
      .union([z.literal(''), dateOnlySchema])
      .optional()
      .transform(blankToUndefined),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'The end date must be on or after the start date.',
  })

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>
