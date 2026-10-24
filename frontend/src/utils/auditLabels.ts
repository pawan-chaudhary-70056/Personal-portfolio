/**
 * Human-readable labels for the audit actions the backend writes. Shared by the
 * overview and the activity log so both read the same way.
 */
export const auditActionLabels: Record<string, string> = {
  PROJECT_CREATED: 'Project created',
  PROJECT_UPDATED: 'Project updated',
  PROJECT_STATUS_CHANGED: 'Project status changed',
  PROJECT_DELETED: 'Project moved to trash',
  PROJECT_RESTORED: 'Project restored',
  PROJECT_PURGED: 'Project permanently deleted',
  PROJECT_CATEGORY_CREATED: 'Project category created',
  PROJECT_CATEGORY_UPDATED: 'Project category updated',
  PROJECT_CATEGORY_DELETED: 'Project category deleted',
  SKILL_CREATED: 'Skill created',
  SKILL_UPDATED: 'Skill updated',
  SKILL_DELETED: 'Skill moved to trash',
  SKILL_RESTORED: 'Skill restored',
  SKILL_PURGED: 'Skill permanently deleted',
  SKILL_CATEGORY_CREATED: 'Skill category created',
  SKILL_CATEGORY_UPDATED: 'Skill category updated',
  SKILL_CATEGORY_DELETED: 'Skill category deleted',
  EXPERIENCE_CREATED: 'Experience added',
  EXPERIENCE_UPDATED: 'Experience updated',
  EXPERIENCE_DELETED: 'Experience moved to trash',
  EXPERIENCE_RESTORED: 'Experience restored',
  EXPERIENCE_PURGED: 'Experience permanently deleted',
  EDUCATION_CREATED: 'Education added',
  EDUCATION_UPDATED: 'Education updated',
  EDUCATION_DELETED: 'Education moved to trash',
  EDUCATION_RESTORED: 'Education restored',
  EDUCATION_PURGED: 'Education permanently deleted',
  CERTIFICATION_CREATED: 'Certification added',
  CERTIFICATION_UPDATED: 'Certification updated',
  CERTIFICATION_DELETED: 'Certification moved to trash',
  CERTIFICATION_RESTORED: 'Certification restored',
  CERTIFICATION_PURGED: 'Certification permanently deleted',
  PROFILE_UPDATED: 'Profile updated',
  HOMEPAGE_DRAFT_UPDATED: 'Homepage draft updated',
  HOMEPAGE_PUBLISHED: 'Homepage published',
  SITE_SETTINGS_UPDATED: 'Site settings updated',
  MEDIA_UPLOADED: 'Image uploaded',
  MEDIA_UPDATED: 'Image description updated',
  MEDIA_DELETED: 'Image deleted',
  REVISION_RESTORED: 'Revision restored',
  MESSAGE_STATUS_CHANGED: 'Message status changed',
  MESSAGE_DELETED: 'Message deleted',
  AUTH_LOGIN_SUCCEEDED: 'Signed in',
  AUTH_LOGIN_FAILED: 'Failed sign-in',
  AUTH_LOGOUT: 'Signed out',
  AUTH_MFA_CHALLENGE: 'Second factor requested',
  AUTH_MFA_FAILED: 'Failed verification code',
  MFA_ENABLED: 'Two-factor authentication enabled',
  MFA_DISABLED: 'Two-factor authentication disabled',
  MFA_RECOVERY_CODES_REGENERATED: 'Recovery codes regenerated',
  SESSION_REVOKED: 'Session revoked',
  SESSION_REVOKED_OTHERS: 'Other sessions revoked',
}

export interface AuditActionGroup {
  label: string
  actions: string[]
}

export const auditActionGroups: AuditActionGroup[] = [
  {
    label: 'Security',
    actions: [
      'AUTH_LOGIN_SUCCEEDED',
      'AUTH_LOGIN_FAILED',
      'AUTH_LOGOUT',
      'AUTH_MFA_CHALLENGE',
      'AUTH_MFA_FAILED',
      'MFA_ENABLED',
      'MFA_DISABLED',
      'MFA_RECOVERY_CODES_REGENERATED',
      'SESSION_REVOKED',
      'SESSION_REVOKED_OTHERS',
    ],
  },
  {
    label: 'Projects',
    actions: [
      'PROJECT_CREATED',
      'PROJECT_UPDATED',
      'PROJECT_STATUS_CHANGED',
      'PROJECT_DELETED',
      'PROJECT_RESTORED',
      'PROJECT_PURGED',
      'PROJECT_CATEGORY_CREATED',
      'PROJECT_CATEGORY_UPDATED',
      'PROJECT_CATEGORY_DELETED',
    ],
  },
  {
    label: 'Skills',
    actions: [
      'SKILL_CREATED',
      'SKILL_UPDATED',
      'SKILL_DELETED',
      'SKILL_RESTORED',
      'SKILL_PURGED',
      'SKILL_CATEGORY_CREATED',
      'SKILL_CATEGORY_UPDATED',
      'SKILL_CATEGORY_DELETED',
    ],
  },
  {
    label: 'Experience',
    actions: [
      'EXPERIENCE_CREATED',
      'EXPERIENCE_UPDATED',
      'EXPERIENCE_DELETED',
      'EXPERIENCE_RESTORED',
      'EXPERIENCE_PURGED',
    ],
  },
  {
    label: 'Credentials',
    actions: [
      'EDUCATION_CREATED',
      'EDUCATION_UPDATED',
      'EDUCATION_DELETED',
      'EDUCATION_RESTORED',
      'EDUCATION_PURGED',
      'CERTIFICATION_CREATED',
      'CERTIFICATION_UPDATED',
      'CERTIFICATION_DELETED',
      'CERTIFICATION_RESTORED',
      'CERTIFICATION_PURGED',
    ],
  },
  { label: 'Profile', actions: ['PROFILE_UPDATED'] },
  {
    label: 'Homepage',
    actions: [
      'HOMEPAGE_DRAFT_UPDATED',
      'HOMEPAGE_PUBLISHED',
      'SITE_SETTINGS_UPDATED',
      'MEDIA_UPLOADED',
      'MEDIA_UPDATED',
      'MEDIA_DELETED',
    ],
  },
  { label: 'Inbox', actions: ['MESSAGE_STATUS_CHANGED', 'MESSAGE_DELETED'] },
  { label: 'Revisions', actions: ['REVISION_RESTORED'] },
]

export const auditEntityTypes = [
  { value: 'Project', label: 'Projects' },
  { value: 'ProjectCategory', label: 'Project categories' },
  { value: 'Skill', label: 'Skills' },
  { value: 'SkillCategory', label: 'Skill categories' },
  { value: 'Experience', label: 'Experience' },
  { value: 'Education', label: 'Education' },
  { value: 'Certification', label: 'Certifications' },
  { value: 'Profile', label: 'Profile' },
  { value: 'HomepageSettings', label: 'Homepage' },
  { value: 'SiteSettings', label: 'Site settings' },
  { value: 'MediaAsset', label: 'Images' },
  { value: 'Admin', label: 'Accounts and sessions' },
  { value: 'ContactMessage', label: 'Messages' },
] as const

export function auditActionLabel(action: string): string {
  return (
    auditActionLabels[action] ??
    action
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^./, (character) => character.toUpperCase())
  )
}
