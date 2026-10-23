import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AuditLogPage as AuditLogPageData } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { listAuditLogs } from '@/api/admin.api'
import { useSession } from '@/auth/useSession'
import { Pagination } from '@/components/admin/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { inputClassName, selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import {
  auditActionGroups,
  auditActionLabel,
  auditEntityTypes,
} from '@/utils/auditLabels'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'
import { describeUserAgent } from '@/utils/userAgent'

const PAGE_SIZE = 20

function metadataLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}

function metadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

export function AdminAuditLogPage() {
  const { signOutAndClear } = useSession()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: 'Activity log — Portfolio admin',
      description: 'Review administrative and security events.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      listAuditLogs(
        {
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch || undefined,
          entityType: entityType || undefined,
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
        },
        signal,
      ),
    [page, debouncedSearch, entityType, action, from, to],
  )

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

  const { status, data, error, reload } = useApiResource<AuditLogPageData>(fetcher, {
    errorMessage: 'Could not load the activity log. Please try again.',
    onError: handleUnauthorized,
  })

  const hasFilters =
    search !== '' || entityType !== '' || action !== '' || from !== '' || to !== ''

  // Changing a filter always returns to the first page of the new results.
  function clearFilters() {
    setSearch('')
    setEntityType('')
    setAction('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  const events = data?.items ?? []
  const loading = status === 'loading'
  const areaLabels = new Map<string, string>(
    auditEntityTypes.map((type) => [type.value, type.label]),
  )

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Security</p>
          <h1 className="mt-3 text-h2">Activity log</h1>
          <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
            Every administrative change and security event, newest first. The log is
            append-only: entries cannot be edited or removed here.
          </p>
        </div>
        <Link
          to="/admin/sessions"
          className="min-h-11 border border-charcoal/30 px-5 py-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
        >
          Manage sessions
        </Link>
      </header>

      <section aria-labelledby="audit-filters-heading" className="mt-8 border border-charcoal/15 p-4">
        <h2 id="audit-filters-heading" className="sr-only">
          Filter activity
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="sm:col-span-2">
            <label
              htmlFor="audit-search"
              className="block text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              Search
            </label>
            <input
              id="audit-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Action, record, or administrator"
              className={`${inputClassName} mt-2`}
            />
          </div>

          <div>
            <label
              htmlFor="audit-area"
              className="block text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              Area
            </label>
            <select
              id="audit-area"
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value)
                setPage(1)
              }}
              className={`${selectClassName} mt-2`}
            >
              <option value="">All areas</option>
              {auditEntityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="audit-action"
              className="block text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              Action
            </label>
            <select
              id="audit-action"
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                setPage(1)
              }}
              className={`${selectClassName} mt-2`}
            >
              <option value="">All actions</option>
              {auditActionGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.actions.map((groupAction) => (
                    <option key={groupAction} value={groupAction}>
                      {auditActionLabel(groupAction)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="audit-from"
              className="block text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              From
            </label>
            <input
              id="audit-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
              className={`${inputClassName} mt-2`}
            />
          </div>

          <div>
            <label
              htmlFor="audit-to"
              className="block text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              To
            </label>
            <input
              id="audit-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
              className={`${inputClassName} mt-2`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
          className="mt-4 min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
        >
          Clear filters
        </button>
      </section>

      <div className="mt-8">
        {loading && !data ? (
          <LoadingState message="Loading activity…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : events.length === 0 ? (
          <EmptyState
            title="No activity found"
            description={
              hasFilters
                ? 'No events match these filters. Try a wider date range or clear the filters.'
                : 'Administrative changes and security events will appear here once they are recorded.'
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div aria-busy={loading}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <caption className="sr-only">
                  Administrative and security events, newest first
                </caption>
                <thead>
                  <tr className="border-b border-charcoal/20">
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Time
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Activity
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Record
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Administrator
                    </th>
                    <th
                      scope="col"
                      className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const expanded = expandedId === event.id
                    const detailsId = `audit-event-${event.id}`
                    const metadata = Object.entries(event.metadata ?? {})

                    return (
                      <Fragment key={event.id}>
                        <tr className="border-b border-charcoal/10 align-top">
                          <td className="py-4 pr-4 text-caption whitespace-nowrap text-muted-light">
                            <time dateTime={event.createdAt}>
                              {formatDateTime(event.createdAt)}
                            </time>
                          </td>
                          <td className="py-4 pr-4 text-body-sm text-charcoal">
                            {auditActionLabel(event.action)}
                          </td>
                          <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                            {areaLabels.get(event.entityType) ?? event.entityType}
                          </td>
                          <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                            {event.admin?.name ?? 'System'}
                          </td>
                          <td className="py-4">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={detailsId}
                              onClick={() => setExpandedId(expanded ? null : event.id)}
                              className="text-caption text-charcoal underline underline-offset-4"
                            >
                              {expanded ? 'Hide details' : 'View details'}
                            </button>
                          </td>
                        </tr>

                        {expanded ? (
                          <tr id={detailsId} className="border-b border-charcoal/10 bg-charcoal/[0.025]">
                            <td colSpan={5} className="px-4 py-5">
                              <dl className="grid gap-x-6 gap-y-3 text-caption sm:grid-cols-2">
                                <div>
                                  <dt className="tracking-[0.14em] text-muted-light uppercase">
                                    Event
                                  </dt>
                                  <dd className="mt-1 break-all text-charcoal">
                                    {event.action}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="tracking-[0.14em] text-muted-light uppercase">
                                    Record identifier
                                  </dt>
                                  <dd className="mt-1 break-all text-charcoal">
                                    {event.entityId ?? '—'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="tracking-[0.14em] text-muted-light uppercase">
                                    Administrator
                                  </dt>
                                  <dd className="mt-1 break-all text-charcoal">
                                    {event.admin
                                      ? `${event.admin.name} (${event.admin.email})`
                                      : 'System'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="tracking-[0.14em] text-muted-light uppercase">
                                    Device
                                  </dt>
                                  <dd className="mt-1 text-charcoal">
                                    {describeUserAgent(event.userAgent)}
                                  </dd>
                                </div>
                                {event.ipAddress ? (
                                  <div>
                                    <dt className="tracking-[0.14em] text-muted-light uppercase">
                                      IP address
                                    </dt>
                                    <dd className="mt-1 text-charcoal">{event.ipAddress}</dd>
                                  </div>
                                ) : null}
                                {metadata.map(([key, value]) => (
                                  <div key={key}>
                                    <dt className="tracking-[0.14em] text-muted-light uppercase">
                                      {metadataLabel(key)}
                                    </dt>
                                    <dd className="mt-1 break-words text-charcoal">
                                      {metadataValue(value)}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {data ? (
              <Pagination
                page={data.page}
                pageCount={data.pageCount}
                total={data.total}
                pageSize={data.pageSize}
                disabled={loading}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}
