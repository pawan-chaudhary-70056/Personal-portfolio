import type { RouteObject } from 'react-router-dom'
import { RequireAdmin } from '@/components/admin/RequireAdmin'
import { RequireOwner } from '@/components/admin/RequireOwner'
import { AdminAdministratorsPage } from '@/pages/admin/AdministratorsPage'
import { AdminAnalyticsPage } from '@/pages/admin/AnalyticsPage'
import { AdminAuditLogPage } from '@/pages/admin/AuditLogPage'
import { AdminCertificationEditPage } from '@/pages/admin/CertificationEditPage'
import { AdminCertificationsPage } from '@/pages/admin/CertificationsPage'
import { AdminEducationEditPage } from '@/pages/admin/EducationEditPage'
import { AdminEducationPage } from '@/pages/admin/EducationPage'
import { AdminExperienceEditPage } from '@/pages/admin/ExperienceEditPage'
import { AdminExperiencePage } from '@/pages/admin/ExperiencePage'
import { AdminHealthPage } from '@/pages/admin/HealthPage'
import { AdminHomepagePage } from '@/pages/admin/HomepagePage'
import { AdminLoginPage } from '@/pages/admin/LoginPage'
import { AdminMediaPage } from '@/pages/admin/MediaPage'
import { AdminMessagesPage } from '@/pages/admin/MessagesPage'
import { AdminOverviewPage } from '@/pages/admin/OverviewPage'
import { AdminProfilePage } from '@/pages/admin/ProfilePage'
import { AdminRevisionsPage } from '@/pages/admin/RevisionsPage'
import { AdminProjectCategoriesPage } from '@/pages/admin/ProjectCategoriesPage'
import { AdminProjectCreatePage } from '@/pages/admin/ProjectCreatePage'
import { AdminProjectEditPage } from '@/pages/admin/ProjectEditPage'
import { AdminProjectsPage } from '@/pages/admin/ProjectsPage'
import { AdminSkillCategoriesPage } from '@/pages/admin/SkillCategoriesPage'
import { AdminSkillEditPage } from '@/pages/admin/SkillEditPage'
import { AdminSchedulingPage } from '@/pages/admin/SchedulingPage'
import { AdminSecurityPage } from '@/pages/admin/SecurityPage'
import { AdminSessionsPage } from '@/pages/admin/SessionsPage'
import { AdminSettingsPage } from '@/pages/admin/SettingsPage'
import { AdminSkillsPage } from '@/pages/admin/SkillsPage'
import { AdminTrashPage } from '@/pages/admin/TrashPage'
import { AdminLayout } from '@/templates/AdminLayout'

export const adminRoutes: RouteObject[] = [
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <AdminOverviewPage /> },
          { path: '/admin/profile', element: <AdminProfilePage /> },
          { path: '/admin/homepage', element: <AdminHomepagePage /> },
          { path: '/admin/projects', element: <AdminProjectsPage /> },
          { path: '/admin/projects/new', element: <AdminProjectCreatePage /> },
          { path: '/admin/projects/:id', element: <AdminProjectEditPage /> },
          { path: '/admin/project-categories', element: <AdminProjectCategoriesPage /> },
          { path: '/admin/media', element: <AdminMediaPage /> },
          { path: '/admin/trash', element: <AdminTrashPage /> },
          { path: '/admin/revisions', element: <AdminRevisionsPage /> },
          {
            element: <RequireOwner />,
            children: [
              { path: '/admin/settings', element: <AdminSettingsPage /> },
              { path: '/admin/health', element: <AdminHealthPage /> },
              { path: '/admin/analytics', element: <AdminAnalyticsPage /> },
              { path: '/admin/administrators', element: <AdminAdministratorsPage /> },
              { path: '/admin/audit-logs', element: <AdminAuditLogPage /> },
              { path: '/admin/sessions', element: <AdminSessionsPage /> },
            ],
          },
          { path: '/admin/scheduling', element: <AdminSchedulingPage /> },
          { path: '/admin/skills', element: <AdminSkillsPage /> },
          { path: '/admin/skill-categories', element: <AdminSkillCategoriesPage /> },
          { path: '/admin/skills/new', element: <AdminSkillEditPage /> },
          { path: '/admin/skills/:id', element: <AdminSkillEditPage /> },
          { path: '/admin/experience', element: <AdminExperiencePage /> },
          { path: '/admin/experience/new', element: <AdminExperienceEditPage /> },
          { path: '/admin/experience/:id', element: <AdminExperienceEditPage /> },
          { path: '/admin/education', element: <AdminEducationPage /> },
          { path: '/admin/education/new', element: <AdminEducationEditPage /> },
          { path: '/admin/education/:id', element: <AdminEducationEditPage /> },
          { path: '/admin/certifications', element: <AdminCertificationsPage /> },
          { path: '/admin/certifications/new', element: <AdminCertificationEditPage /> },
          { path: '/admin/certifications/:id', element: <AdminCertificationEditPage /> },
          { path: '/admin/messages', element: <AdminMessagesPage /> },
          { path: '/admin/security', element: <AdminSecurityPage /> },
        ],
      },
    ],
  },
]
