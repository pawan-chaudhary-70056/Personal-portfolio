/**
 * Human-readable labels for the audit actions the backend writes. Shared by the
 * overview and the activity log so both read the same way.
 */
export const auditActionLabels: Record<string, string> = {
  PROJECT_CREATED: 'Project created',
  PROJECT_UPDATED: 'Project updated',
  PROJECT_STATUS_CHANGED: 'Project status changed',
  PROJECT_DELETED: 'Project deleted',
  SKILL_CREATED: 'Skill created',
  SKILL_UPDATED: 'Skill updated',
  SKILL_DELETED: 'Skill deleted',
  EXPERIENCE_CREATED: 'Experience added',
  EXPERIENCE_UPDATED: 'Experience updated',
  EXPERIENCE_DELETED: 'Experience removed',
  AUTH_LOGIN_SUCCEEDED: 'Signed in',
  AUTH_LOGIN_FAILED: 'Failed sign-in',
  AUTH_LOGOUT: 'Signed out',
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
    ],
  },
  {
    label: 'Skills',
    actions: ['SKILL_CREATED', 'SKILL_UPDATED', 'SKILL_DELETED'],
  },
  {
    label: 'Experience',
    actions: ['EXPERIENCE_CREATED', 'EXPERIENCE_UPDATED', 'EXPERIENCE_DELETED'],
  },
]

export const auditEntityTypes = [
  { value: 'Project', label: 'Projects' },
  { value: 'Skill', label: 'Skills' },
  { value: 'Experience', label: 'Experience' },
  { value: 'Admin', label: 'Accounts and sessions' },
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
