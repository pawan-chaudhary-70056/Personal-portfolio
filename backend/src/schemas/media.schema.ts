import { z } from 'zod'

/** Bounded pagination keeps a single request from scanning the whole library. */
export const listMediaQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .strict()

/**
 * The only editable asset metadata is its alternative text. Storage keys,
 * MIME types, dimensions, and filenames are facts about the stored bytes and are
 * never writable through the API.
 */
export const updateMediaSchema = z
  .object({
    altText: z
      .string()
      .trim()
      .max(200, 'Describe the image in 200 characters or fewer.')
      .nullable(),
  })
  .strict()

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>
