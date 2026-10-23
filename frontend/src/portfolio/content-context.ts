import { createContext } from 'react'
import type { PortfolioContent } from '@/@types/portfolio'

export type PortfolioStatus = 'loading' | 'ready' | 'error'

export interface PortfolioContextValue {
  status: PortfolioStatus
  content: PortfolioContent | null
  error: string | null
  reload: () => void
}

export const PortfolioContentContext = createContext<PortfolioContextValue | null>(null)
