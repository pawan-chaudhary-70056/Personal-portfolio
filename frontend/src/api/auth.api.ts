import type { AdminIdentity } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export async function fetchSession(): Promise<{ admin: AdminIdentity }> {
  return apiRequest<{ admin: AdminIdentity }>('/auth/session')
}

/**
 * A password sign-in either completes or returns a second-factor challenge.
 * There is no authenticated session until the challenge is answered.
 */
export type SignInResult = { admin: AdminIdentity } | { mfaRequired: true }

export async function signIn(email: string, password: string): Promise<SignInResult> {
  return apiRequest<SignInResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

/** Accepts a six-digit authenticator code or a recovery code. */
export async function verifySecondFactor(code: string): Promise<{ admin: AdminIdentity }> {
  return apiRequest<{ admin: AdminIdentity }>('/auth/mfa', {
    method: 'POST',
    body: { code },
  })
}

export async function signOut(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' })
}
