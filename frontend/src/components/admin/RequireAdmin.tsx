import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '@/auth/useSession'

/**
 * Client-side convenience only. The backend independently enforces
 * authentication on every admin endpoint.
 */
export function RequireAdmin() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-ivory">
        <p role="status" className="text-body-sm text-muted-light">
          Checking your session…
        </p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
