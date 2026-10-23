import { z } from 'zod'

/** Optional external link: empty values are stored as null, otherwise http(s) only. */
export const optionalHttpUrlSchema = z
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

/** Optional trimmed text: empty values are stored as null. */
export const optionalTextSchema = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null))

/** Identifiers are cuids; bound the length so oversized input is rejected early. */
export const recordIdSchema = z.string().trim().min(1).max(64)

/** Date-only values, stored in PostgreSQL as `date`. */
export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.')
  // Round-trip so impossible dates like 2025-02-31 are rejected instead of
  // silently rolling over to the next month.
  .refine(
    (value) =>
      !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) &&
      toDateOnly(value).toISOString().slice(0, 10) === value,
    { message: 'Enter a real calendar date.' },
  )

/** Optional date-only value, stored as null when absent. */
export const optionalDateOnlySchema = dateOnlySchema
  .nullish()
  .transform((value) => (value ? value : null))

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function toDateOnlyString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}
