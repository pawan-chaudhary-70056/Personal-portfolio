import { useCallback, useState } from 'react'
import type { LoginMonitoring } from '@/@types/admin'
import { getLoginMonitoring } from '@/api/admin.api'
import { ErrorState } from '@/components/feedback/ErrorState'
import { selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { auditActionLabel } from '@/utils/auditLabels'
import { formatDateTime } from '@/utils/formatDate'
import { describeUserAgent } from '@/utils/userAgent'

const WINDOW_OPTIONS = [
  { value: 1, label: 'Last 24 hours' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
] as const

const REASON_LABELS: Record<string, string> = {
  unknown_account: 'No such account',
  bad_password: 'Wrong password',
}

function reasonLabel(reason: string | null): string | null {
  if (!reason) {
    return null
  }
  return REASON_LABELS[reason] ?? reason
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/**
 * Failed-login monitoring summary shown above the activity log. It aggregates
 * the same append-only audit trail, so it is read-only, owner-gated by the
 * route, and never displays passwords, tokens, or session identifiers.
 */
export function LoginMonitoringPanel() {
  const [days, setDays] = useState<number>(7)

  const fetcher = useCallback(
    (signal: AbortSignal) => getLoginMonitoring(days, signal),
    [days],
  )
  const { status, data, error, reload } = useApiResource<LoginMonitoring>(fetcher, {
    errorMessage: 'Sign-in activity could not be loaded. Please try again.',
  })

  return (
    <section aria-labelledby="login-monitoring-heading" className="mt-8 border border-charcoal/15 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="login-monitoring-heading" className="text-h3">
            Sign-in monitoring
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-charcoal/70">
            Failed and successful sign-ins recorded in the activity log, over a rolling window
            ending now.
          </p>
        </div>

        <div>
          <label
            htmlFor="login-monitoring-window"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Window
          </label>
          <select
            id="login-monitoring-window"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={`${selectClassName} mt-2`}
          >
            {WINDOW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === 'loading' ? (
        <p role="status" className="mt-6 text-body-sm text-charcoal/70">
          Loading sign-in activity…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-6">
          <ErrorState message={error ?? 'Sign-in activity could not be loaded.'} onRetry={reload} />
        </div>
      ) : null}

      {status === 'ready' && data ? (
        <>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="border border-charcoal/15 p-4">
              <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Failed sign-ins
              </dt>
              <dd className="mt-2 text-h3">{data.totals.failedLogins}</dd>
            </div>
            <div className="border border-charcoal/15 p-4">
              <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Failed verification codes
              </dt>
              <dd className="mt-2 text-h3">{data.totals.failedMfaCodes}</dd>
            </div>
            <div className="border border-charcoal/15 p-4">
              <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Successful sign-ins
              </dt>
              <dd className="mt-2 text-h3">{data.totals.successfulLogins}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Failed sign-ins by source
            </h3>
            {data.bySource.length === 0 ? (
              <p className="mt-2 text-body-sm text-charcoal/70">
                No failed sign-ins in this window.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-charcoal/10 border-t border-charcoal/10">
                {data.bySource.map((source) => (
                  <li
                    key={source.ipAddress ?? 'unknown'}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-body-sm"
                  >
                    <span className="font-mono text-charcoal">{source.ipAddress ?? 'Unknown source'}</span>
                    <span className="text-charcoal/70">
                      {plural(source.failures, 'failure')} · last{' '}
                      {formatDateTime(source.lastFailureAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-caption tracking-[0.14em] text-muted-light uppercase">
              Recent failed sign-ins
            </h3>
            {data.recent.length === 0 ? (
              <p className="mt-2 text-body-sm text-charcoal/70">Nothing to report.</p>
            ) : (
              <ul className="mt-2 divide-y divide-charcoal/10 border-t border-charcoal/10">
                {data.recent.map((failure) => {
                  const reason = reasonLabel(failure.reason)

                  return (
                    <li key={failure.id} className="py-3 text-body-sm">
                      <p className="text-charcoal">
                        {auditActionLabel(failure.action)} — {failure.email ?? 'Unknown account'}
                        {reason ? ` · ${reason}` : ''}
                      </p>
                      <p className="mt-1 text-caption text-muted-light">
                        {formatDateTime(failure.createdAt)}
                        {failure.ipAddress ? ` · ${failure.ipAddress}` : ''} ·{' '}
                        {describeUserAgent(failure.userAgent)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
