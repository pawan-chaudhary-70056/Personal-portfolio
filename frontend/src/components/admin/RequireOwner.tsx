import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '@/auth/useSession'

/**
 * Client-side convenience only. The backend independently enforces the owner
 * role on every owner-only endpoint, so redirecting here just avoids showing an
 * editor a page that can only fail.
 */
export function RequireOwner() {
  const { admin } = useSession()
  const location = useLocation()

  if (admin?.role !== 'OWNER') {
    return <Navigate to="/admin" replace state={{ denied: location.pathname }} />
  }

  return <Outlet />
}
