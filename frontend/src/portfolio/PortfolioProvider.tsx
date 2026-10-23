import { useCallback, useMemo, type ReactNode } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'
import { getPortfolioContent } from '@/api/portfolio.api'
import { useApiResource } from '@/hooks/useApiResource'
import { PortfolioContentContext } from '@/portfolio/content-context'

/**
 * One request per collection for the whole public shell, so the header, page,
 * and footer never fetch contradictory copies of the same record.
 */
export function PortfolioProvider({ children }: { children: ReactNode }) {
  const fetcher = useCallback((signal: AbortSignal) => getPortfolioContent(signal), [])
  const { status, data, error, reload } = useApiResource<PortfolioContent>(fetcher, {
    errorMessage: 'The portfolio could not be loaded. Please try again.',
  })

  const value = useMemo(
    () => ({ status, content: data, error, reload }),
    [status, data, error, reload],
  )

  return (
    <PortfolioContentContext.Provider value={value}>
      {children}
    </PortfolioContentContext.Provider>
  )
}
