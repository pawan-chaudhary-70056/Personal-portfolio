import { createContext } from 'react'
import type { AdminIdentity } from '@/@types/admin'

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface SessionValue {
  status: SessionStatus
  admin: AdminIdentity | null
  refresh: () => Promise<void>
  signInAs: (admin: AdminIdentity) => void
  signOutAndClear: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)
