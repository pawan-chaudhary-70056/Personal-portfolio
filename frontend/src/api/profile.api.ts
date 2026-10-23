import type { AdminProfile, ProfilePayload } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export async function getProfile(signal?: AbortSignal): Promise<AdminProfile | null> {
  const response = await apiRequest<{ profile: AdminProfile | null }>('/admin/profile', {
    signal,
  })
  return response.profile
}

export async function updateProfile(payload: ProfilePayload): Promise<AdminProfile> {
  const response = await apiRequest<{ profile: AdminProfile }>('/admin/profile', {
    method: 'PATCH',
    body: payload,
  })
  return response.profile
}
