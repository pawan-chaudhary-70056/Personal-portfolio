import type {
  AdminProjectCategory,
  AdminSkillCategory,
  CategoryPayload,
} from '@/@types/admin'
import { apiRequest } from '@/api/client'

async function listCategories<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const response = await apiRequest<{ categories: T[] }>(path, { signal })
  return response.categories
}

export function listProjectCategories(signal?: AbortSignal): Promise<AdminProjectCategory[]> {
  return listCategories<AdminProjectCategory>('/admin/project-categories', signal)
}

export async function createProjectCategory(
  payload: CategoryPayload,
): Promise<AdminProjectCategory> {
  const response = await apiRequest<{ category: AdminProjectCategory }>(
    '/admin/project-categories',
    { method: 'POST', body: payload },
  )
  return response.category
}

export async function updateProjectCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<AdminProjectCategory> {
  const response = await apiRequest<{ category: AdminProjectCategory }>(
    `/admin/project-categories/${id}`,
    { method: 'PATCH', body: payload },
  )
  return response.category
}

export async function deleteProjectCategory(id: string): Promise<void> {
  await apiRequest<void>(`/admin/project-categories/${id}`, { method: 'DELETE' })
}

export function listSkillCategories(signal?: AbortSignal): Promise<AdminSkillCategory[]> {
  return listCategories<AdminSkillCategory>('/admin/skill-categories', signal)
}

export async function createSkillCategory(payload: CategoryPayload): Promise<AdminSkillCategory> {
  const response = await apiRequest<{ category: AdminSkillCategory }>('/admin/skill-categories', {
    method: 'POST',
    body: payload,
  })
  return response.category
}

export async function updateSkillCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<AdminSkillCategory> {
  const response = await apiRequest<{ category: AdminSkillCategory }>(
    `/admin/skill-categories/${id}`,
    { method: 'PATCH', body: payload },
  )
  return response.category
}

export async function deleteSkillCategory(id: string): Promise<void> {
  await apiRequest<void>(`/admin/skill-categories/${id}`, { method: 'DELETE' })
}
