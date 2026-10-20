import { useContext } from 'react'
import { SessionContext, type SessionValue } from '@/auth/session-context'

export function useSession(): SessionValue {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSession must be used inside a SessionProvider')
  }

  return context
}
