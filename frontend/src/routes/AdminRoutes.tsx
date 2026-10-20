import type { RouteObject } from 'react-router-dom'
import { RequireAdmin } from '@/components/admin/RequireAdmin'
import { AdminAuditLogPage } from '@/pages/admin/AuditLogPage'
import { AdminExperienceEditPage } from '@/pages/admin/ExperienceEditPage'
import { AdminExperiencePage } from '@/pages/admin/ExperiencePage'
import { AdminLoginPage } from '@/pages/admin/LoginPage'
import { AdminOverviewPage } from '@/pages/admin/OverviewPage'
import { AdminProjectCreatePage } from '@/pages/admin/ProjectCreatePage'
import { AdminProjectEditPage } from '@/pages/admin/ProjectEditPage'
import { AdminProjectsPage } from '@/pages/admin/ProjectsPage'
import { AdminSkillEditPage } from '@/pages/admin/SkillEditPage'
import { AdminSessionsPage } from '@/pages/admin/SessionsPage'
import { AdminSkillsPage } from '@/pages/admin/SkillsPage'
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
          { path: '/admin/projects', element: <AdminProjectsPage /> },
          { path: '/admin/projects/new', element: <AdminProjectCreatePage /> },
          { path: '/admin/projects/:id', element: <AdminProjectEditPage /> },
          { path: '/admin/skills', element: <AdminSkillsPage /> },
          { path: '/admin/skills/new', element: <AdminSkillEditPage /> },
          { path: '/admin/skills/:id', element: <AdminSkillEditPage /> },
          { path: '/admin/experience', element: <AdminExperiencePage /> },
          { path: '/admin/experience/new', element: <AdminExperienceEditPage /> },
          { path: '/admin/experience/:id', element: <AdminExperienceEditPage /> },
          { path: '/admin/audit-logs', element: <AdminAuditLogPage /> },
          { path: '/admin/sessions', element: <AdminSessionsPage /> },
        ],
      },
    ],
  },
]
