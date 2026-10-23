import type { AdminEducation, EducationPayload } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface EducationListResponse {
  education: AdminEducation[]
}

export async function listEducation(
  params: { search?: string } = {},
  signal?: AbortSignal,
): Promise<EducationListResponse> {
  const query = new URLSearchParams()

  if (params.search) {
    query.set('search', params.search)
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<EducationListResponse>(`/admin/education${suffix}`, { signal })
}

export async function getEducation(
  id: string,
  signal?: AbortSignal,
): Promise<AdminEducation> {
  const response = await apiRequest<{ education: AdminEducation }>(
    `/admin/education/${id}`,
    { signal },
  )
  return response.education
}

export async function createEducation(payload: EducationPayload): Promise<AdminEducation> {
  const response = await apiRequest<{ education: AdminEducation }>('/admin/education', {
    method: 'POST',
    body: payload,
  })
  return response.education
}

export async function updateEducation(
  id: string,
  payload: Partial<EducationPayload>,
): Promise<AdminEducation> {
  const response = await apiRequest<{ education: AdminEducation }>(
    `/admin/education/${id}`,
    { method: 'PATCH', body: payload },
  )
  return response.education
}

export async function deleteEducation(id: string): Promise<void> {
  await apiRequest<void>(`/admin/education/${id}`, { method: 'DELETE' })
}
