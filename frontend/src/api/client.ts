import type { ValidationIssue } from '@/@types/admin'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

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

let csrfToken: string | null = null

export function resetCsrfToken(): void {
  csrfToken = null
}

/**
 * Fetches a double-submit CSRF token once per page load. The token is not a
 * credential: the session cookie remains HttpOnly and never touches JavaScript.
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken
  }

  const response = await fetch(`${API_BASE}/auth/csrf`, {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new ApiError(response.status, 'csrf_unavailable', 'Could not start a secure session.')
  }

  const data = (await response.json()) as { token: string }
  csrfToken = data.token
  return csrfToken
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { accept: 'application/json' }

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }

  if (method !== 'GET') {
    headers['x-csrf-token'] = await getCsrfToken()
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const payload = data as { error?: string; message?: string; details?: ValidationIssue[] } | null

    if (response.status === 403 && payload?.error === 'csrf_failed') {
      resetCsrfToken()
    }

    throw new ApiError(
      response.status,
      payload?.error ?? 'request_failed',
      payload?.message ?? 'The request could not be completed.',
      payload?.details,
    )
  }

  return data as T
}
