import type { ValidationIssue } from '@/@types/admin'

/** Collapses server validation issues into a field -> first message map. */
export function toFieldErrors(details: ValidationIssue[] | undefined): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of details ?? []) {
    const field = issue.path.split('.')[0]
    if (field && !errors[field]) {
      errors[field] = issue.message
    }
  }

  return errors
}
