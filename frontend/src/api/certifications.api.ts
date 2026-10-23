import type { AdminCertification, CertificationPayload } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface CertificationListResponse {
  certifications: AdminCertification[]
}

export async function listCertifications(
  params: { search?: string } = {},
  signal?: AbortSignal,
): Promise<CertificationListResponse> {
  const query = new URLSearchParams()

  if (params.search) {
    query.set('search', params.search)
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<CertificationListResponse>(`/admin/certifications${suffix}`, { signal })
}

export async function getCertification(
  id: string,
  signal?: AbortSignal,
): Promise<AdminCertification> {
  const response = await apiRequest<{ certification: AdminCertification }>(
    `/admin/certifications/${id}`,
    { signal },
  )
  return response.certification
}

export async function createCertification(
  payload: CertificationPayload,
): Promise<AdminCertification> {
  const response = await apiRequest<{ certification: AdminCertification }>(
    '/admin/certifications',
    { method: 'POST', body: payload },
  )
  return response.certification
}

export async function updateCertification(
  id: string,
  payload: Partial<CertificationPayload>,
): Promise<AdminCertification> {
  const response = await apiRequest<{ certification: AdminCertification }>(
    `/admin/certifications/${id}`,
    { method: 'PATCH', body: payload },
  )
  return response.certification
}

export async function deleteCertification(id: string): Promise<void> {
  await apiRequest<void>(`/admin/certifications/${id}`, { method: 'DELETE' })
}
