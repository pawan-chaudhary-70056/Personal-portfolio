import type { RouteObject } from 'react-router-dom'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { ExperiencePage } from '@/pages/public/ExperiencePage'
import { HomePage } from '@/pages/public/HomePage'
import { ProjectDetailPage } from '@/pages/public/ProjectDetailPage'
import { ProjectsPage } from '@/pages/public/ProjectsPage'
import { PublicLayout } from '@/templates/PublicLayout'

export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:slug', element: <ProjectDetailPage /> },
      { path: 'experience', element: <ExperiencePage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
