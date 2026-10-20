import type { AdminIdentity } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export async function fetchSession(): Promise<{ admin: AdminIdentity }> {
  return apiRequest<{ admin: AdminIdentity }>('/auth/session')
}

export async function signIn(email: string, password: string): Promise<{ admin: AdminIdentity }> {
  return apiRequest<{ admin: AdminIdentity }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function signOut(): Promise<void> {
  await apiRequest<void>('/auth/logout', { method: 'POST' })
}
