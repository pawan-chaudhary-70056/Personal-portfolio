import type { AdminAccount, AdminRole, AdministratorListResponse } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export async function listAdministrators(
  signal?: AbortSignal,
): Promise<AdministratorListResponse> {
  return apiRequest<AdministratorListResponse>('/admin/administrators', { signal })
}

export async function createAdministrator(payload: {
  name: string
  email: string
  password: string
  role: AdminRole
}): Promise<AdminAccount> {
  const response = await apiRequest<{ administrator: AdminAccount }>('/admin/administrators', {
    method: 'POST',
    body: payload,
  })
  return response.administrator
}

export async function updateAdministrator(
  id: string,
  payload: { name?: string; role?: AdminRole; isActive?: boolean },
): Promise<AdminAccount> {
  const response = await apiRequest<{ administrator: AdminAccount }>(
    `/admin/administrators/${id}`,
    { method: 'PATCH', body: payload },
  )
  return response.administrator
}

export async function resetAdministratorPassword(id: string, password: string): Promise<void> {
  await apiRequest<void>(`/admin/administrators/${id}/password`, {
    method: 'POST',
    body: { password },
  })
}
