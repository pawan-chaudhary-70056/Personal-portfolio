import { z } from 'zod'

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

export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function toDateOnlyString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}
