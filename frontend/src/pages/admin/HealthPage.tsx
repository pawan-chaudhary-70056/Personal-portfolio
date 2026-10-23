import { useCallback, useEffect } from 'react'
import type { HealthStatus, SystemHealth } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { getSystemHealth } from '@/api/system.api'
import { useSession } from '@/auth/useSession'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const statusStyles: Record<HealthStatus, string> = {
  ok: 'border-green-700/30 bg-green-700/10 text-green-800',
  degraded: 'border-gold/60 bg-gold/15 text-charcoal',
  error: 'border-error/40 bg-error/10 text-error',
}

const statusLabels: Record<HealthStatus, string> = {
  ok: 'Operational',
  degraded: 'Degraded',
  error: 'Failing',
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function AdminHealthPage() {
  const { signOutAndClear } = useSession()

  useEffect(() => {
    setPageMetadata({
      title: 'System health — Portfolio admin',
      description: 'Check database, session, media, and migration status.',
    })
  }, [])

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

  const { status, data, error, reload } = useApiResource<SystemHealth>(getSystemHealth, {
    errorMessage: 'System health could not be checked. Please try again.',
    onError: handleUnauthorized,
  })

  const loading = status === 'loading'

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Operations</p>
          <h1 className="mt-3 text-h2">System health</h1>
          <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
            Live checks for the services the dashboard depends on. Only status is shown here — no
            connection strings, file paths, or credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
        >
          {loading ? 'Checking…' : 'Check again'}
        </button>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {error ? (
          <InlineAlert tone="error">
            {error}{' '}
            <button type="button" onClick={reload} className="underline">
              Retry
            </button>
          </InlineAlert>
        ) : null}
      </div>

      {loading && !data ? (
        <p role="status" className="mt-8 text-body-sm text-muted-light">
          Running checks…
        </p>
      ) : data ? (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-4 border border-charcoal/15 px-5 py-4">
            <span
              className={`border px-3 py-1 text-caption tracking-[0.14em] uppercase ${statusStyles[data.status]}`}
            >
              {statusLabels[data.status]}
            </span>
            <p className="text-body-sm text-charcoal/70">
              Checked {formatDateTime(data.checkedAt)}
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <caption className="sr-only">Service health checks and their current status</caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Service
                  </th>
                  <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Status
                  </th>
                  <th scope="col" className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.checks.map((check) => (
                  <tr key={check.id} className="border-b border-charcoal/10 align-top">
                    <th
                      scope="row"
                      className="py-4 pr-4 text-left text-body-sm font-medium text-charcoal"
                    >
                      {check.label}
                    </th>
                    <td className="py-4 pr-4">
                      <span className={`border px-2 py-1 text-caption ${statusStyles[check.status]}`}>
                        {statusLabels[check.status]}
                      </span>
                    </td>
                    <td className="py-4 text-body-sm text-charcoal/70">{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section aria-label="Runtime information" className="mt-8 border border-charcoal/15 px-5 py-4">
            <h2 className="text-h3 text-charcoal">Runtime</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                  Environment
                </dt>
                <dd className="mt-1 text-body-sm text-charcoal">{data.runtime.environment}</dd>
              </div>
              <div>
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                  Node.js
                </dt>
                <dd className="mt-1 text-body-sm text-charcoal">{data.runtime.nodeVersion}</dd>
              </div>
              <div>
                <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                  Uptime
                </dt>
                <dd className="mt-1 text-body-sm text-charcoal">
                  {formatUptime(data.runtime.uptimeSeconds)}
                </dd>
              </div>
            </dl>
          </section>

          <p className="mt-6 max-w-2xl text-caption text-muted-light">
            Database backups run outside the application. Check the deployment guide for the
            backup and restore procedure; this page cannot verify that a backup completed.
          </p>
        </>
      ) : null}
    </>
  )
}
