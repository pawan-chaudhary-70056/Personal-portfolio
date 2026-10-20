/** Types for the admin API. Field names mirror the backend responses. */

export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface AdminIdentity {
  id: string
  email: string
  name: string
}

export interface AdminProject {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  category: string
  year: string
  technologies: string[]
  liveUrl: string | null
  repositoryUrl: string | null
  imageUrl: string | null
  imageAlt: string | null
  status: ProjectStatus
  featured: boolean
  sortOrder: number
  publishedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectListResponse {
  items: AdminProject[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface ProjectPayload {
  title: string
  slug?: string
  summary: string
  description: string
  category: string
  year: string
  technologies: string[]
  liveUrl: string | null
  repositoryUrl: string | null
  imageUrl: string | null
  imageAlt: string | null
  status: ProjectStatus
  featured: boolean
  sortOrder: number
}

export interface AuditEvent {
  id: string
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  admin: { name: string; email: string } | null
}

export interface AuditLogQuery {
  page?: number
  pageSize?: number
  action?: string
  entityType?: string
  search?: string
  from?: string
  to?: string
}

export interface AuditLogPage {
  items: AuditEvent[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface AdminSession {
  /** Short, non-reversible fingerprint. Never the raw session identifier. */
  id: string
  current: boolean
  createdAt: string | null
  expiresAt: string
  userAgent: string | null
}

export interface OverviewResponse {
  projects: {
    total: number
    draft: number
    published: number
    archived: number
    featured: number
  }
  content: {
    skills: { total: number; published: number }
    experience: { total: number; published: number }
  }
  recentEvents: AuditEvent[]
}

export interface AdminSkill {
  id: string
  name: string
  category: string
  description: string | null
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface SkillPayload {
  name: string
  category: string
  description: string | null
  sortOrder: number
  published: boolean
}

export interface AdminExperience {
  id: string
  role: string
  organization: string
  employmentType: string | null
  location: string | null
  description: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ExperiencePayload {
  role: string
  organization: string
  employmentType: string | null
  location: string | null
  description: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  published: boolean
  sortOrder: number
}

export interface ValidationIssue {
  path: string
  message: string
}
