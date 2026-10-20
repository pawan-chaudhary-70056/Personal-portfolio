import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AdminIdentity } from '@/@types/admin'
import { fetchSession, signOut } from '@/api/auth.api'
import { SessionContext, type SessionStatus } from '@/auth/session-context'

interface SessionState {
  status: SessionStatus
  admin: AdminIdentity | null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', admin: null })

  useEffect(() => {
    let active = true

    fetchSession()
      .then(({ admin }) => {
        if (active) {
          setState({ status: 'authenticated', admin })
        }
      })
      .catch(() => {
        // 401 is the expected signed-out state. Any transport failure is treated
        // the same way so admin content is never rendered optimistically.
        if (active) {
          setState({ status: 'unauthenticated', admin: null })
        }
      })

    return () => {
      active = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { admin } = await fetchSession()
      setState({ status: 'authenticated', admin })
    } catch {
      setState({ status: 'unauthenticated', admin: null })
    }
  }, [])

  const signInAs = useCallback((admin: AdminIdentity) => {
    setState({ status: 'authenticated', admin })
  }, [])

  const signOutAndClear = useCallback(async () => {
    try {
      await signOut()
    } finally {
      setState({ status: 'unauthenticated', admin: null })
    }
  }, [])

  const value = useMemo(
    () => ({ ...state, refresh, signInAs, signOutAndClear }),
    [state, refresh, signInAs, signOutAndClear],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
