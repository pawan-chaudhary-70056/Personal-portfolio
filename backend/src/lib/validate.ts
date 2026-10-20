import type { ZodType } from 'zod'
import { ApiError, type ValidationIssue } from './errors.js'

/**
 * Parses untrusted input with a Zod schema and throws a 400 ApiError carrying
 * field-level issues when validation fails. Express 5 forwards the throw to the
 * central error handler.
 */
export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)

  if (!result.success) {
    const details: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }))

    throw new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', details)
  }

  return result.data
}
