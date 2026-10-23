import type { AdminMessage, MessageListResponse, MessageStatus } from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface MessageListParams {
  search?: string
  status?: MessageStatus
  page?: number
  pageSize?: number
}

export async function listMessages(
  params: MessageListParams = {},
  signal?: AbortSignal,
): Promise<MessageListResponse> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<MessageListResponse>(`/admin/messages${suffix}`, { signal })
}

/**
 * Collects every message matching the filters for export. The admin list is
 * paginated (maximum 50 per request), so this walks the pages in order.
 */
export async function listAllMessages(
  params: Omit<MessageListParams, 'page' | 'pageSize'> = {},
): Promise<AdminMessage[]> {
  const pageSize = 50
  const firstPage = await listMessages({ ...params, page: 1, pageSize })
  const messages = [...firstPage.items]

  for (let page = 2; page <= firstPage.pageCount; page += 1) {
    const nextPage = await listMessages({ ...params, page, pageSize })
    messages.push(...nextPage.items)
  }

  return messages
}

export async function updateMessageStatus(
  id: string,
  status: MessageStatus,
): Promise<AdminMessage> {
  const response = await apiRequest<{ message: AdminMessage }>(`/admin/messages/${id}`, {
    method: 'PATCH',
    body: { status },
  })
  return response.message
}

export async function deleteMessage(id: string): Promise<void> {
  await apiRequest<void>(`/admin/messages/${id}`, { method: 'DELETE' })
}
