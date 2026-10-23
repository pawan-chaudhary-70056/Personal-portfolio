import { z } from 'zod'

/** A public pathname only: no query string, hash, or absolute URL. */
export const trackViewSchema = z
  .object({
    path: z.string().trim().min(1).max(200),
  })
  .strict()

export const analyticsQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(365).default(30),
  })
  .strict()

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
