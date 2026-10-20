import { BrowserRouter, useRoutes } from 'react-router-dom'
import { SessionProvider } from '@/auth/SessionProvider'
import { adminRoutes } from '@/routes/AdminRoutes'
import { publicRoutes } from '@/routes/PublicRoutes'

function AppRoutes() {
  return useRoutes([...publicRoutes, ...adminRoutes])
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  )
}
