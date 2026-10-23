import type { AdminMedia, MediaListResponse } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface MediaListParams {
  search?: string
  page?: number
  pageSize?: number
}

export async function listMedia(
  params: MediaListParams = {},
  signal?: AbortSignal,
): Promise<MediaListResponse> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<MediaListResponse>(`/admin/media${suffix}`, { signal })
}

export async function getMedia(id: string, signal?: AbortSignal): Promise<AdminMedia> {
  const response = await apiRequest<{ media: AdminMedia }>(`/admin/media/${id}`, { signal })
  return response.media
}

export async function uploadMedia(file: File): Promise<AdminMedia> {
  const form = new FormData()
  form.append('file', file, file.name)

  const response = await apiRequest<{ media: AdminMedia }>('/admin/media', {
    method: 'POST',
    body: form,
  })
  return response.media
}

export async function updateMedia(
  id: string,
  payload: { altText: string | null },
): Promise<AdminMedia> {
  const response = await apiRequest<{ media: AdminMedia }>(`/admin/media/${id}`, {
    method: 'PATCH',
    body: payload,
  })
  return response.media
}

export async function deleteMedia(id: string): Promise<void> {
  await apiRequest<void>(`/admin/media/${id}`, { method: 'DELETE' })
}
