import { useCallback, useEffect, useState } from 'react'
import type { AnalyticsSummary } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { getAnalytics } from '@/api/system.api'
import { useSession } from '@/auth/useSession'
import { EmptyState } from '@/components/feedback/EmptyState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDate } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const rangeOptions = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

export function AdminAnalyticsPage() {
  const { signOutAndClear } = useSession()
  const [days, setDays] = useState(30)

  useEffect(() => {
    setPageMetadata({
      title: 'Analytics — Portfolio admin',
      description: 'Aggregate public page views for the portfolio.',
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

  const fetcher = useCallback(
    (signal: AbortSignal) => getAnalytics(days, signal),
    [days],
  )

  const { status, data, error, reload } = useApiResource<AnalyticsSummary>(fetcher, {
    errorMessage: 'Analytics could not be loaded. Please try again.',
    onError: handleUnauthorized,
  })

  const loading = status === 'loading'
  const total = data?.total ?? 0
  const busiest = data?.daily.reduce(
    (best, point) => (point.count > best.count ? point : best),
    { date: '', count: 0 },
  )

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Operations</p>
          <h1 className="mt-3 text-h2">Analytics</h1>
          <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
            Aggregate views of the public portfolio. Only a daily count per route is stored — no IP
            addresses, cookies, referrers, or visitor identifiers.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <label
            htmlFor="analytics-range"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Range
          </label>
          <select
            id="analytics-range"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={`${selectClassName} mt-2`}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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
          Loading analytics…
        </p>
      ) : data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="border border-charcoal/15 px-5 py-4">
              <p className="text-caption tracking-[0.14em] text-muted-light uppercase">Page views</p>
              <p className="mt-2 font-serif text-h2 text-charcoal">{total}</p>
            </div>
            <div className="border border-charcoal/15 px-5 py-4">
              <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Daily average
              </p>
              <p className="mt-2 font-serif text-h2 text-charcoal">
                {Math.round((total / Math.max(data.days, 1)) * 10) / 10}
              </p>
            </div>
            <div className="border border-charcoal/15 px-5 py-4">
              <p className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Busiest day
              </p>
              <p className="mt-2 text-body text-charcoal">
                {busiest && busiest.count > 0
                  ? `${formatDate(`${busiest.date}T00:00:00Z`)} · ${busiest.count}`
                  : 'No views yet'}
              </p>
            </div>
          </div>

          {total === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No views recorded yet"
                description="Views are counted once per public page in each browser session. Open the portfolio in a new session to see them appear here."
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section aria-label="Views per day">
                <h2 className="text-h3 text-charcoal">Views per day</h2>
                <div className="mt-3 max-h-96 overflow-auto border border-charcoal/15">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-charcoal/20">
                        <th scope="col" className="px-4 py-2 text-caption tracking-[0.14em] text-muted-light uppercase">
                          Date
                        </th>
                        <th scope="col" className="px-4 py-2 text-caption tracking-[0.14em] text-muted-light uppercase">
                          Views
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.daily].reverse().map((point) => (
                        <tr key={point.date} className="border-b border-charcoal/10">
                          <th scope="row" className="px-4 py-2 text-left text-body-sm font-normal text-charcoal">
                            {formatDate(`${point.date}T00:00:00Z`)}
                          </th>
                          <td className="px-4 py-2 text-body-sm text-charcoal/70">{point.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-label="Most viewed routes">
                <h2 className="text-h3 text-charcoal">Most viewed routes</h2>
                {data.topPaths.length === 0 ? (
                  <p className="mt-3 text-body-sm text-muted-light">No routes recorded yet.</p>
                ) : (
                  <ol className="mt-3 divide-y divide-charcoal/10 border border-charcoal/15">
                    {data.topPaths.map((entry) => (
                      <li key={entry.path} className="flex items-center justify-between gap-4 px-4 py-2">
                        <span className="font-mono text-caption break-all text-charcoal">
                          {entry.path}
                        </span>
                        <span className="text-body-sm text-charcoal/70">{entry.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}

          <p className="mt-8 max-w-2xl text-caption text-muted-light">
            Counting starts when this release is deployed. Dynamic project pages are grouped as
            <span className="font-mono"> /projects/:slug</span>. Daily aggregates older than{' '}
            {data.retentionDays} days are deleted automatically.
          </p>
        </>
      ) : null}
    </>
  )
}
