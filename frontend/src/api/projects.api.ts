import type {
  AdminProject,
  ProjectListResponse,
  ProjectPayload,
  ProjectStatus,
} from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface ProjectListParams {
  search?: string
  status?: ProjectStatus | ''
  category?: string
  page?: number
  pageSize?: number
  sort?: 'updated' | 'created' | 'title'
}

export function listProjects(
  params: ProjectListParams = {},
  signal?: AbortSignal,
): Promise<ProjectListResponse> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.category) query.set('category', params.category)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.sort) query.set('sort', params.sort)

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<ProjectListResponse>(`/admin/projects${suffix}`, { signal })
}

export async function getProject(id: string, signal?: AbortSignal): Promise<AdminProject> {
  const response = await apiRequest<{ project: AdminProject }>(`/admin/projects/${id}`, { signal })
  return response.project
}

export async function createProject(payload: ProjectPayload): Promise<AdminProject> {
  const response = await apiRequest<{ project: AdminProject }>('/admin/projects', {
    method: 'POST',
    body: payload,
  })
  return response.project
}

export async function updateProject(
  id: string,
  payload: Partial<ProjectPayload>,
): Promise<AdminProject> {
  const response = await apiRequest<{ project: AdminProject }>(`/admin/projects/${id}`, {
    method: 'PATCH',
    body: payload,
  })
  return response.project
}

export async function deleteProject(id: string): Promise<void> {
  await apiRequest<void>(`/admin/projects/${id}`, { method: 'DELETE' })
}
