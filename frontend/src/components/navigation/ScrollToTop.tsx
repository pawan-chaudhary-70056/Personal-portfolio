import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { usePortfolio } from '@/portfolio/usePortfolio'

/**
 * Scrolls to the top when the path changes and honours deep links to in-page
 * sections. Public content is fetched once for the whole shell, so a hash target
 * may only exist after that request settles; `status` is a dependency so the
 * lookup retries when content becomes ready.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const { status } = usePortfolio()
  const lastPathname = useRef(pathname)

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))

      if (target) {
        target.scrollIntoView()
        return
      }
    }

    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname
      window.scrollTo({ top: 0 })
    }
  }, [pathname, hash, status])

  return null
}
