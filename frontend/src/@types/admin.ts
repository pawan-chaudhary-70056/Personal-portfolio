/** Types for the admin API. Field names mirror the backend responses. */

export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type AdminRole = 'OWNER' | 'EDITOR'

export interface AdminIdentity {
  id: string
  email: string
  name: string
  role: AdminRole
}

export interface AdminAccount {
  id: string
  email: string
  name: string
  role: AdminRole
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface AdministratorListResponse {
  administrators: AdminAccount[]
}

export interface AdminScreenshot {
  id: string
  url: string
  alt: string
  caption: string | null
  sortOrder: number
}

export interface ScreenshotPayload {
  url: string
  alt: string
  caption: string | null
}

export interface AdminProject {
  id: string
  title: string
  slug: string
  summary: string
  description: string
  categoryId: string
  category: string
  year: string
  technologies: string[]
  liveUrl: string | null
  repositoryUrl: string | null
  imageUrl: string | null
  imageAlt: string | null
  screenshots: AdminScreenshot[]
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
  screenshots: ScreenshotPayload[]
  status: ProjectStatus
  featured: boolean
  sortOrder: number
}

export interface AdminProjectCategory {
  id: string
  name: string
  slug: string
  sortOrder: number
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminSkillCategory {
  id: string
  name: string
  slug: string
  sortOrder: number
  skillCount: number
  createdAt: string
  updatedAt: string
}

export interface CategoryPayload {
  name: string
  slug?: string
  sortOrder: number
}

export interface AdminHeroPortrait {
  id: string
  url: string
  alt: string
  width: number
  height: number
  mimeType: string
  sizeBytes: number
}

export type HomepageSectionKey =
  | 'about'
  | 'work'
  | 'skills'
  | 'experience'
  | 'credentials'
  | 'contact'

export interface HomepageSectionConfig {
  key: HomepageSectionKey
  label: string
}

export interface HomepageFeaturedCandidate {
  id: string
  title: string
  slug: string
}

export interface AdminHeroState {
  portrait: AdminHeroPortrait | null
  portraitVisible: boolean
  effectEnabled: boolean
  tiltIntensity: number
  animationIntensity: number
  floatingEnabled: boolean
  sectionOrder: HomepageSectionKey[]
  hiddenSections: HomepageSectionKey[]
  featuredProjectIds: string[]
}

export interface AdminHomepage {
  draft: AdminHeroState
  /** Null until the first publish. */
  published: AdminHeroState | null
  hasUnpublishedChanges: boolean
  publishedAt: string | null
  limits: { maxBytes: number; allowedTypes: string[] }
  sectionCatalog: HomepageSectionConfig[]
  /** Published projects only; drafts cannot be featured. */
  featuredCandidates: HomepageFeaturedCandidate[]
  maxFeaturedProjects: number
}

export interface HeroDraftPayload {
  portraitAlt: string | null
  portraitVisible: boolean
  effectEnabled: boolean
  tiltIntensity: number
  animationIntensity: number
  floatingEnabled: boolean
}

export interface HomepageLayoutPayload {
  sectionOrder: HomepageSectionKey[]
  hiddenSections: HomepageSectionKey[]
  featuredProjectIds: string[]
}

export type HomepageDraftPayload = Partial<HeroDraftPayload> & Partial<HomepageLayoutPayload>

export interface AdminSiteSettings {
  siteTitle: string
  siteDescription: string
  canonicalUrl: string | null
  socialImageUrl: string | null
  updatedAt: string | null
}

export type SiteSettingsPayload = Pick<
  AdminSiteSettings,
  'siteTitle' | 'siteDescription' | 'canonicalUrl' | 'socialImageUrl'
>

export interface AdminMedia {
  id: string
  /** Administrative file URL; requires the signed-in session. */
  url: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  altText: string | null
  createdAt: string
  updatedAt: string
  /** True while the homepage still references the asset. */
  referenced: boolean
}

export interface MediaListResponse {
  items: AdminMedia[]
  total: number
  page: number
  pageSize: number
  pageCount: number
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
    education: { total: number; published: number }
    certifications: { total: number; published: number }
  }
  recentEvents: AuditEvent[]
}

export interface AdminProfile {
  id: string
  displayName: string
  headline: string
  biography: string
  location: string | null
  publicEmail: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  portraitUrl: string | null
  portraitAlt: string | null
  createdAt: string
  updatedAt: string
}

/** Fields the admin form may write; system fields are never sent. */
export type ProfilePayload = Omit<AdminProfile, 'id' | 'createdAt' | 'updatedAt'>

export interface AdminSkill {
  id: string
  name: string
  categoryId: string
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

export interface AdminEducation {
  id: string
  institution: string
  qualification: string
  fieldOfStudy: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface EducationPayload {
  institution: string
  qualification: string
  fieldOfStudy: string | null
  description: string | null
  startDate: string | null
  endDate: string | null
  sortOrder: number
  published: boolean
}

export interface AdminCertification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string | null
  expiryDate: string | null
  credentialId: string | null
  credentialUrl: string | null
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface CertificationPayload {
  name: string
  issuingOrganization: string
  issueDate: string | null
  expiryDate: string | null
  credentialId: string | null
  credentialUrl: string | null
  sortOrder: number
  published: boolean
}

export type MessageStatus = 'NEW' | 'READ' | 'ARCHIVED'

export interface AdminMessage {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  status: MessageStatus
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageListResponse {
  items: AdminMessage[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface ValidationIssue {
  path: string
  message: string
}

/** Collections that support bulk actions, the trash, and revision history. */
export type ContentEntityType =
  | 'project'
  | 'skill'
  | 'experience'
  | 'education'
  | 'certification'

export type BulkContentAction = 'publish' | 'unpublish' | 'delete'

export interface BulkActionResult {
  type: ContentEntityType
  action: BulkContentAction
  updated: number
}

export interface TrashItem {
  type: ContentEntityType
  entityType: string
  id: string
  title: string
  subtitle: string | null
  deletedAt: string
  published: boolean
  status?: ProjectStatus
}

export interface TrashListResponse {
  items: TrashItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface TrashItemRef {
  type: ContentEntityType
  id: string
}

export interface BulkRestoreResult {
  restored: number
}

export interface BulkPurgeResult {
  purged: number
}

export type RevisionAction = 'CREATED' | 'UPDATED' | 'DELETED' | 'RESTORED'

export interface RevisionSummary {
  id: string
  entityType: string
  entityId: string
  action: RevisionAction
  createdAt: string
  adminName: string | null
}

export interface RevisionListResponse {
  items: RevisionSummary[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface RevisionSnapshot {
  id: string
  action: RevisionAction
  createdAt: string
  snapshot: Record<string, unknown>
}

export interface RevisionDetail extends RevisionSummary {
  snapshot: Record<string, unknown>
  /** The snapshot written immediately before this one, if any. */
  previous: RevisionSnapshot | null
}

export type HealthStatus = 'ok' | 'degraded' | 'error'

export interface HealthCheck {
  id: string
  label: string
  status: HealthStatus
  detail: string
}

export interface SchedulableItem {
  type: ContentEntityType
  id: string
  title: string
  subtitle: string | null
  publishAt: string | null
}

export interface SchedulingListResponse {
  items: SchedulableItem[]
}

export interface AnalyticsDailyPoint {
  date: string
  count: number
}

export interface AnalyticsTopPath {
  path: string
  count: number
}

export interface AnalyticsSummary {
  days: number
  total: number
  daily: AnalyticsDailyPoint[]
  topPaths: AnalyticsTopPath[]
  retentionDays: number
}

export interface SystemHealth {
  status: HealthStatus
  checks: HealthCheck[]
  runtime: {
    environment: string
    nodeVersion: string
    uptimeSeconds: number
  }
  checkedAt: string
}
