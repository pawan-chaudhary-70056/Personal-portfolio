import type { AdminSiteSettings, SiteSettingsPayload } from '@/@types/admin'
import { apiRequest } from '@/api/client'

interface SettingsResponse {
  settings: AdminSiteSettings
}

export async function getSiteSettings(signal?: AbortSignal): Promise<AdminSiteSettings> {
  const response = await apiRequest<SettingsResponse>('/admin/settings', { signal })
  return response.settings
}

export async function updateSiteSettings(
  payload: SiteSettingsPayload,
): Promise<AdminSiteSettings> {
  const response = await apiRequest<SettingsResponse>('/admin/settings', {
    method: 'PATCH',
    body: payload,
  })
  return response.settings
}
