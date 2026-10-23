import type {
  BulkActionResult,
  BulkContentAction,
  BulkPurgeResult,
  BulkRestoreResult,
  ContentEntityType,
  RevisionDetail,
  RevisionListResponse,
  SchedulingListResponse,
  TrashItemRef,
  TrashListResponse,
} from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface TrashListParams {
  type?: ContentEntityType
  page?: number
  pageSize?: number
}

export async function bulkContentAction(
  type: ContentEntityType,
  payload: { action: BulkContentAction; ids: string[] },
): Promise<BulkActionResult> {
  return apiRequest<BulkActionResult>(`/admin/bulk/${type}`, {
    method: 'POST',
    body: payload,
  })
}

export async function listTrash(
  params: TrashListParams = {},
  signal?: AbortSignal,
): Promise<TrashListResponse> {
  const query = new URLSearchParams()

  if (params.type) query.set('type', params.type)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<TrashListResponse>(`/admin/trash${suffix}`, { signal })
}

export async function restoreTrash(type: ContentEntityType, id: string): Promise<void> {
  await apiRequest<void>(`/admin/trash/${type}/${id}/restore`, { method: 'POST' })
}

export async function purgeTrash(type: ContentEntityType, id: string): Promise<void> {
  await apiRequest<void>(`/admin/trash/${type}/${id}`, { method: 'DELETE' })
}

export async function restoreTrashItems(items: TrashItemRef[]): Promise<BulkRestoreResult> {
  return apiRequest<BulkRestoreResult>('/admin/trash/restore', {
    method: 'POST',
    body: { items },
  })
}

export async function purgeTrashItems(items: TrashItemRef[]): Promise<BulkPurgeResult> {
  return apiRequest<BulkPurgeResult>('/admin/trash/purge', {
    method: 'POST',
    body: { items },
  })
}

export async function listScheduling(signal?: AbortSignal): Promise<SchedulingListResponse> {
  return apiRequest<SchedulingListResponse>('/admin/scheduling', { signal })
}

export async function schedulePublication(
  type: ContentEntityType,
  id: string,
  publishAt: string | null,
): Promise<void> {
  await apiRequest<void>(`/admin/schedule/${type}/${id}`, {
    method: 'PATCH',
    body: { publishAt },
  })
}

export interface RevisionListParams {
  entityType?: string
  entityId?: string
  page?: number
  pageSize?: number
}

export async function listRevisions(
  params: RevisionListParams = {},
  signal?: AbortSignal,
): Promise<RevisionListResponse> {
  const query = new URLSearchParams()

  if (params.entityType) query.set('entityType', params.entityType)
  if (params.entityId) query.set('entityId', params.entityId)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<RevisionListResponse>(`/admin/revisions${suffix}`, { signal })
}

export async function getRevision(id: string, signal?: AbortSignal): Promise<RevisionDetail> {
  const response = await apiRequest<{ revision: RevisionDetail }>(`/admin/revisions/${id}`, {
    signal,
  })
  return response.revision
}

export async function restoreRevision(id: string): Promise<void> {
  await apiRequest<void>(`/admin/revisions/${id}/restore`, { method: 'POST' })
}
