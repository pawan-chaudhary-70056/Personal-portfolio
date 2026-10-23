import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '@/api/system.api'

/**
 * Counts one view per pathname per browser session. The API stores only a daily
 * aggregate per route, so nothing here identifies a visitor. Admin routes are
 * never counted, and analytics failures never affect the page.
 */
export function PageViewTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      return
    }

    const key = `portfolio:view:${pathname}`

    try {
      if (sessionStorage.getItem(key)) {
        return
      }
      sessionStorage.setItem(key, '1')
    } catch {
      // Storage can be unavailable (private mode); counting once is still fine.
    }

    void trackPageView(pathname).catch(() => undefined)
  }, [pathname])

  return null
}
