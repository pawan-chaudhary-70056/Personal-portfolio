import { useCallback, useEffect, useState } from 'react'
import type { ContentEntityType, SchedulableItem, SchedulingListResponse } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { listScheduling, schedulePublication } from '@/api/contentAdmin.api'
import { useSession } from '@/auth/useSession'
import { EmptyState } from '@/components/feedback/EmptyState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const typeLabels: Record<ContentEntityType, string> = {
  project: 'Project',
  skill: 'Skill',
  experience: 'Experience',
  education: 'Education',
  certification: 'Certification',
}

function itemKey(item: SchedulableItem): string {
  return `${item.type}:${item.id}`
}

/** Converts an ISO timestamp to the local value a datetime-local input expects. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''

  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** Kept outside the component so the render path stays free of clock reads. */
function isFutureTimestamp(value: string): boolean {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()
}

export function AdminSchedulingPage() {
  const { signOutAndClear } = useSession()

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: 'Scheduling — Portfolio admin',
      description: 'Schedule unpublished content to go live automatically.',
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

  const { status, data, error: loadError, reload } = useApiResource<SchedulingListResponse>(
    listScheduling,
    {
      errorMessage: 'Scheduled content could not be loaded. Please try again.',
      onError: handleUnauthorized,
    },
  )

  async function apply(item: SchedulableItem, publishAt: string | null) {
    const key = itemKey(item)
    setBusyKey(key)
    setNotice(null)
    setActionError(null)

    try {
      await schedulePublication(item.type, item.id, publishAt)
      setNotice(
        publishAt
          ? `“${item.title}” will publish automatically at the scheduled time.`
          : `The schedule for “${item.title}” was cancelled.`,
      )
      setDrafts((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The schedule could not be saved.',
        )
      }
    } finally {
      setBusyKey(null)
    }
  }

  function schedule(item: SchedulableItem) {
    const key = itemKey(item)
    const value = drafts[key] ?? toLocalInput(item.publishAt)

    if (!value) {
      setActionError('Choose a date and time before scheduling.')
      return
    }

    if (!isFutureTimestamp(value)) {
      setActionError('Choose a time in the future.')
      return
    }

    void apply(item, new Date(value).toISOString())
  }

  const items = data?.items ?? []
  const loading = status === 'loading'
  const error = actionError ?? (status === 'error' ? loadError : null)

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Publishing</p>
        <h1 className="mt-3 text-h2">Scheduling</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          Unpublished content appears here. Pick a time and the server publishes it automatically
          within 30 seconds of that moment, then clears the schedule. Already published content must
          be unpublished before it can be scheduled again.
        </p>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
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
          Loading unpublished content…
        </p>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing is waiting to be published"
            description="Every project, skill, experience entry, education record, and certification is already live."
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">
              Unpublished content with its schedule and publishing controls
            </caption>
            <thead>
              <tr className="border-b border-charcoal/20">
                <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                  Item
                </th>
                <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                  Type
                </th>
                <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                  Schedule
                </th>
                <th scope="col" className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const key = itemKey(item)
                const value = drafts[key] ?? toLocalInput(item.publishAt)
                const busy = busyKey === key

                return (
                  <tr key={key} className="border-b border-charcoal/10 align-top">
                    <td className="py-4 pr-4">
                      <p className="text-body-sm font-medium text-charcoal">{item.title}</p>
                      {item.subtitle ? (
                        <p className="mt-1 text-caption text-muted-light">{item.subtitle}</p>
                      ) : null}
                      <p className="mt-1 text-caption text-muted-light">
                        {item.publishAt
                          ? `Scheduled for ${formatDateTime(item.publishAt)}`
                          : 'Not scheduled'}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                      {typeLabels[item.type]}
                    </td>
                    <td className="py-4 pr-4">
                      <label className="sr-only" htmlFor={`schedule-${key}`}>
                        Publish {item.title} at
                      </label>
                      <input
                        id={`schedule-${key}`}
                        type="datetime-local"
                        value={value}
                        disabled={busy}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [key]: event.target.value }))
                        }
                        className={`${inputClassName} max-w-xs`}
                      />
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => schedule(item)}
                          disabled={busy}
                          className="text-caption text-charcoal underline underline-offset-4 disabled:opacity-50"
                        >
                          {busy ? 'Saving…' : item.publishAt ? 'Update schedule' : 'Schedule'}
                        </button>
                        {item.publishAt ? (
                          <button
                            type="button"
                            onClick={() => void apply(item, null)}
                            disabled={busy}
                            className="text-caption text-error underline underline-offset-4 disabled:opacity-50"
                          >
                            Cancel schedule
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
