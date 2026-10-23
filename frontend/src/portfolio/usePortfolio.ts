import { useContext } from 'react'
import { PortfolioContentContext } from '@/portfolio/content-context'

export function usePortfolio() {
  const context = useContext(PortfolioContentContext)

  if (!context) {
    throw new Error('usePortfolio must be used inside PortfolioProvider.')
  }

  return context
}
