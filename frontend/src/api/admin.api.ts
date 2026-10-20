import type {
  AdminSession,
  AuditLogPage,
  AuditLogQuery,
  OverviewResponse,
} from '@/@types/admin'
import { apiRequest } from '@/api/client'

export function getOverview(signal?: AbortSignal): Promise<OverviewResponse> {
  return apiRequest<OverviewResponse>('/admin/overview', { signal })
}

export function listAuditLogs(
  query: AuditLogQuery = {},
  signal?: AbortSignal,
): Promise<AuditLogPage> {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return apiRequest<AuditLogPage>(`/admin/audit-logs${suffix}`, { signal })
}

export async function listSessions(signal?: AbortSignal): Promise<AdminSession[]> {
  const response = await apiRequest<{ sessions: AdminSession[] }>('/admin/sessions', { signal })
  return response.sessions
}

export async function revokeSession(id: string): Promise<void> {
  await apiRequest<void>(`/admin/sessions/${id}`, { method: 'DELETE' })
}

export async function revokeOtherSessions(): Promise<number> {
  const response = await apiRequest<{ revoked: number }>('/admin/sessions', {
    method: 'DELETE',
  })
  return response.revoked
}
