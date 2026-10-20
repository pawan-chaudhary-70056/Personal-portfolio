import type {
  AdminExperience,
  AdminSkill,
  ExperiencePayload,
  SkillPayload,
} from '@/@types/admin'
import { apiRequest } from '@/api/client'

export interface SkillListParams {
  search?: string
  category?: string
}

export interface SkillListResponse {
  skills: AdminSkill[]
}

export async function listSkills(
  params: SkillListParams = {},
  signal?: AbortSignal,
): Promise<SkillListResponse> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.category) query.set('category', params.category)

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<SkillListResponse>(`/admin/skills${suffix}`, { signal })
}

export async function getSkill(id: string, signal?: AbortSignal): Promise<AdminSkill> {
  const response = await apiRequest<{ skill: AdminSkill }>(`/admin/skills/${id}`, { signal })
  return response.skill
}

export async function createSkill(payload: SkillPayload): Promise<AdminSkill> {
  const response = await apiRequest<{ skill: AdminSkill }>('/admin/skills', {
    method: 'POST',
    body: payload,
  })
  return response.skill
}

export async function updateSkill(
  id: string,
  payload: Partial<SkillPayload>,
): Promise<AdminSkill> {
  const response = await apiRequest<{ skill: AdminSkill }>(`/admin/skills/${id}`, {
    method: 'PATCH',
    body: payload,
  })
  return response.skill
}

export async function deleteSkill(id: string): Promise<void> {
  await apiRequest<void>(`/admin/skills/${id}`, { method: 'DELETE' })
}

export interface ExperienceListParams {
  search?: string
}

export interface ExperienceListResponse {
  experience: AdminExperience[]
}

export async function listExperience(
  params: ExperienceListParams = {},
  signal?: AbortSignal,
): Promise<ExperienceListResponse> {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)

  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return apiRequest<ExperienceListResponse>(`/admin/experience${suffix}`, { signal })
}

export async function getExperience(
  id: string,
  signal?: AbortSignal,
): Promise<AdminExperience> {
  const response = await apiRequest<{ experience: AdminExperience }>(`/admin/experience/${id}`, {
    signal,
  })
  return response.experience
}

export async function createExperience(payload: ExperiencePayload): Promise<AdminExperience> {
  const response = await apiRequest<{ experience: AdminExperience }>('/admin/experience', {
    method: 'POST',
    body: payload,
  })
  return response.experience
}

export async function updateExperience(
  id: string,
  payload: Partial<ExperiencePayload>,
): Promise<AdminExperience> {
  const response = await apiRequest<{ experience: AdminExperience }>(`/admin/experience/${id}`, {
    method: 'PATCH',
    body: payload,
  })
  return response.experience
}

export async function deleteExperience(id: string): Promise<void> {
  await apiRequest<void>(`/admin/experience/${id}`, { method: 'DELETE' })
}
