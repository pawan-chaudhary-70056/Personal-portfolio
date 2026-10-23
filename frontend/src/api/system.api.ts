import type { AnalyticsSummary, SystemHealth } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export async function getSystemHealth(signal?: AbortSignal): Promise<SystemHealth> {
  return apiRequest<SystemHealth>('/admin/health', { signal })
}

/** Anonymous page-view ping: the body carries only the pathname. */
export async function trackPageView(path: string): Promise<void> {
  await apiRequest<void>('/analytics/view', { method: 'POST', body: { path } })
}

export async function getAnalytics(
  days: number,
  signal?: AbortSignal,
): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>(`/admin/analytics?days=${days}`, { signal })
}
