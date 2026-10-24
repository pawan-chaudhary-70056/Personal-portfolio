import type { AdminHomepage, HomepageDraftPayload } from '@/@types/admin'
import { apiRequest } from '@/api/client'

interface HomepageResponse {
  homepage: AdminHomepage
}

export async function getAdminHomepage(signal?: AbortSignal): Promise<AdminHomepage> {
  const response = await apiRequest<HomepageResponse>('/admin/homepage', { signal })
  return response.homepage
}

export async function updateHomepageDraft(
  payload: HomepageDraftPayload,
): Promise<AdminHomepage> {
  const response = await apiRequest<HomepageResponse>('/admin/homepage', {
    method: 'PATCH',
    body: payload,
  })
  return response.homepage
}

/** Uploads one image; validation and storage happen on the server. */
export async function uploadHeroPortrait(file: File): Promise<AdminHomepage> {
  const form = new FormData()
  form.append('file', file, file.name)

  const response = await apiRequest<HomepageResponse>('/admin/homepage/portrait', {
    method: 'POST',
    body: form,
  })
  return response.homepage
}

/** Reuses an existing library image as the draft portrait. */
export async function selectHeroPortrait(mediaId: string): Promise<AdminHomepage> {
  const response = await apiRequest<HomepageResponse>('/admin/homepage/portrait/library', {
    method: 'POST',
    body: { mediaId },
  })
  return response.homepage
}

export async function removeHeroPortrait(): Promise<AdminHomepage> {
  const response = await apiRequest<HomepageResponse>('/admin/homepage/portrait', {
    method: 'DELETE',
  })
  return response.homepage
}

export async function publishHomepage(): Promise<AdminHomepage> {
  const response = await apiRequest<HomepageResponse>('/admin/homepage/publish', {
    method: 'POST',
  })
  return response.homepage
}
