import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminSession } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { listSessions, revokeOtherSessions, revokeSession } from '@/api/admin.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'
import { describeUserAgent } from '@/utils/userAgent'

function sessionLabel(session: AdminSession): string {
  const device = describeUserAgent(session.userAgent)
  const signedIn = session.createdAt ? formatDateTime(session.createdAt) : 'an unknown time'
  return `${device}, signed in ${signedIn}`
}

export function AdminSessionsPage() {
  const { signOutAndClear } = useSession()

  const [revokeTarget, setRevokeTarget] = useState<AdminSession | null>(null)
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: 'Sessions — Portfolio admin',
      description: 'Review and revoke active administrative sessions.',
    })
  }, [])

  const fetcher = useCallback((signal: AbortSignal) => listSessions(signal), [])

  const handleUnauthorized = useCallback(
    async (caught: unknown) => {
      if (caught instanceof ApiError && caught.status === 401) {
        await signOutAndClear()
        return true
      }
      return false
    },
    [signOutAndClear],
  )

  const { status, data, error, reload } = useApiResource<AdminSession[]>(fetcher, {
    errorMessage: 'Could not load your sessions. Please try again.',
    onError: handleUnauthorized,
  })

  async function handleRevoke() {
    if (!revokeTarget) {
      return
    }

    setBusy(true)
    setNotice(null)
    setActionError(null)

    try {
      await revokeSession(revokeTarget.id)
      setNotice('That session was revoked.')
      setRevokeTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The session could not be revoked.',
        )
      }
      setRevokeTarget(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevokeOthers() {
    setBusy(true)
    setNotice(null)
    setActionError(null)

    try {
      const revoked = await revokeOtherSessions()
      setNotice(
        revoked === 0
          ? 'No other sessions were active.'
          : `${revoked} other ${revoked === 1 ? 'session was' : 'sessions were'} revoked.`,
      )
      setConfirmRevokeOthers(false)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The sessions could not be revoked.',
        )
      }
      setConfirmRevokeOthers(false)
    } finally {
      setBusy(false)
    }
  }

  const sessions = data ?? []
  const otherSessions = sessions.filter((session) => !session.current)
  const loading = status === 'loading'
  const current = sessions.find((session) => session.current) ?? null

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Security</p>
          <h1 className="mt-3 text-h2">Sessions</h1>
          <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
            Browsers currently signed in to this account. Revoking a session signs that
            browser out immediately; the session cookie stops working on the next request.
          </p>
        </div>
        <Link
          to="/admin/audit-logs"
          className="min-h-11 border border-charcoal/30 px-5 py-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
        >
          View activity log
        </Link>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {actionError ? <InlineAlert tone="error">{actionError}</InlineAlert> : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-body-sm text-charcoal/70">
          {loading && !data
            ? 'Checking active sessions…'
            : `${sessions.length} active ${sessions.length === 1 ? 'session' : 'sessions'}${
                otherSessions.length > 0 ? ` · ${otherSessions.length} other` : ''
              }`}
        </p>
        <button
          type="button"
          onClick={() => setConfirmRevokeOthers(true)}
          disabled={busy || otherSessions.length === 0}
          className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
        >
          Sign out other sessions
        </button>
      </div>

      <div className="mt-6">
        {loading && !data ? (
          <LoadingState message="Loading sessions…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No active sessions"
            description="This browser no longer has a server-side session. Sign in again to continue."
            action={
              <Link
                to="/admin/login"
                className="inline-block min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal"
              >
                Sign in
              </Link>
            }
          />
        ) : (
          <div aria-busy={loading} className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <caption className="sr-only">
                Active administrative sessions with signed-in time, expiry, and revoke
                actions
              </caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Device
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Signed in
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Expires
                  </th>
                  <th
                    scope="col"
                    className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b border-charcoal/10 align-top">
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body-sm text-charcoal">
                          {describeUserAgent(session.userAgent)}
                        </span>
                        {session.current ? (
                          <span className="inline-flex items-center border border-gold-ink/40 px-2 py-0.5 text-caption tracking-wide text-gold-ink uppercase">
                            This device
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                      {session.createdAt ? formatDateTime(session.createdAt) : 'Unknown'}
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                      {formatDateTime(session.expiresAt)}
                    </td>
                    <td className="py-4">
                      {session.current ? (
                        <span className="text-caption text-muted-light">
                          Use Sign out to end this session
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(session)}
                          disabled={busy}
                          aria-label={`Revoke session: ${sessionLabel(session)}`}
                          className="text-caption text-error underline underline-offset-4 disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-8 max-w-2xl text-caption text-muted-light">
        Sessions are listed with a short, non-reversible reference. The session cookie is
        never exposed to the dashboard.
        {current?.createdAt
          ? ` This device signed in ${formatDateTime(current.createdAt)}.`
          : ''}
      </p>

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Revoke this session?"
        description={
          revokeTarget
            ? `${sessionLabel(revokeTarget)}. That browser will be signed out immediately and must sign in again.`
            : ''
        }
        confirmLabel="Revoke session"
        destructive
        busy={busy}
        onConfirm={() => void handleRevoke()}
        onCancel={() => setRevokeTarget(null)}
      />

      <ConfirmDialog
        open={confirmRevokeOthers}
        title="Sign out other sessions?"
        description="Every other browser signed in to this account will be signed out immediately. This device stays signed in."
        confirmLabel="Revoke other sessions"
        destructive
        busy={busy}
        onConfirm={() => void handleRevokeOthers()}
        onCancel={() => setConfirmRevokeOthers(false)}
      />
    </>
  )
}
