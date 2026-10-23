import type { ZodError, ZodType } from 'zod'
import { ApiError, type ValidationIssue } from './errors.js'

/** Maps a Zod failure to the API's field-level validation response. */
export function validationError(error: ZodError): ApiError {
  const details: ValidationIssue[] = error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }))

  return new ApiError(400, 'validation_error', 'Please correct the highlighted fields.', details)
}

/**
 * Parses untrusted input with a Zod schema and throws a 400 ApiError carrying
 * field-level issues when validation fails. Express 5 forwards the throw to the
 * central error handler.
 */
export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)

  if (!result.success) {
    throw validationError(result.error)
  }

  return result.data
}
