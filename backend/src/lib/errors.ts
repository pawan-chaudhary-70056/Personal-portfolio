import type { NextFunction, Request, Response } from 'express'

export interface ValidationIssue {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ValidationIssue[]

  constructor(status: number, code: string, message: string, details?: ValidationIssue[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const unauthorized = (message = 'Authentication required.') =>
  new ApiError(401, 'unauthorized', message)

export const forbidden = (message = 'You do not have permission to do that.') =>
  new ApiError(403, 'forbidden', message)

export const notFound = (entity = 'Resource') =>
  new ApiError(404, 'not_found', `${entity} could not be found.`)

export const conflict = (message: string, details?: ValidationIssue[]) =>
  new ApiError(409, 'conflict', message, details)

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Endpoint not found.' })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    })
    return
  }

  // Unknown failures are logged server-side without request bodies or secrets.
  console.error(
    'Unhandled API error:',
    error instanceof Error ? error.stack ?? error.message : String(error),
  )

  res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong. Please try again.',
  })
}
