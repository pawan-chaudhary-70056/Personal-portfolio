import type { RouteObject } from 'react-router-dom'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { HomePage } from '@/pages/public/HomePage'
import { PublicLayout } from '@/templates/PublicLayout'

export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
