import { useCallback, useEffect, useState } from 'react'
import type { AdminMessage, MessageListResponse, MessageStatus } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  deleteMessage,
  listAllMessages,
  listMessages,
  updateMessageStatus,
} from '@/api/messages.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { MessageStatusBadge } from '@/components/admin/MessageStatusBadge'
import { Pagination } from '@/components/admin/Pagination'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName, selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'
import { downloadMessagesCsv, messagesToCsv } from '@/utils/messagesCsv'

const PAGE_SIZE = 20

export function AdminMessagesPage() {
  const { signOutAndClear } = useSession()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<MessageStatus | ''>('')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<AdminMessage | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminMessage | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Messages — Portfolio admin',
      description: 'Read and manage contact form submissions.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      listMessages(
        {
          search: debouncedSearch,
          status: status || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    [debouncedSearch, status, page],
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

  const {
    status: loadStatus,
    data,
    error: loadError,
    reload,
  } = useApiResource<MessageListResponse>(fetcher, {
    errorMessage: 'Could not load messages. Please try again.',
    onError: handleUnauthorized,
  })

  function reportActionFailure(caught: unknown, fallback: string) {
    setActionError(caught instanceof ApiError ? caught.message : fallback)
  }

  function changeFilter(update: () => void) {
    update()
    setSelected(null)
    setPage(1)
  }

  async function changeStatus(message: AdminMessage, next: MessageStatus) {
    setBusyId(message.id)
    setNotice(null)
    setActionError(null)

    try {
      const updated = await updateMessageStatus(message.id, next)
      setSelected((current) => (current?.id === updated.id ? updated : current))
      setNotice(
        next === 'READ'
          ? `Message from ${message.name} marked as read.`
          : next === 'ARCHIVED'
            ? `Message from ${message.name} archived.`
            : `Message from ${message.name} moved back to the inbox.`,
      )
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        reportActionFailure(caught, 'The message could not be updated.')
      }
    } finally {
      setBusyId(null)
    }
  }

  async function exportCsv() {
    setExporting(true)
    setNotice(null)
    setActionError(null)

    try {
      const messages = await listAllMessages({
        search: debouncedSearch,
        status: status || undefined,
      })

      if (messages.length === 0) {
        setNotice('There are no messages to export.')
        return
      }

      downloadMessagesCsv(
        `messages-${new Date().toISOString().slice(0, 10)}.csv`,
        messagesToCsv(messages),
      )
      setNotice(
        `${messages.length} ${messages.length === 1 ? 'message' : 'messages'} exported as CSV.`,
      )
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        reportActionFailure(caught, 'The messages could not be exported.')
      }
    } finally {
      setExporting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    setActionError(null)
    setNotice(null)

    try {
      await deleteMessage(deleteTarget.id)
      setNotice(`Message from ${deleteTarget.name} was deleted.`)
      setSelected((current) => (current?.id === deleteTarget.id ? null : current))
      setDeleteTarget(null)

      if (data && data.items.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        reload()
      }
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        reportActionFailure(caught, 'The message could not be deleted.')
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const messages = data?.items ?? []
  const loading = loadStatus === 'loading'
  const showEmpty = !loading && messages.length === 0
  const error = actionError ?? (loadStatus === 'error' ? loadError : null)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Inbox</p>
          <h1 className="mt-3 text-h2">Messages</h1>
          <p className="mt-3 max-w-xl text-body-sm text-charcoal/70">
            Contact form submissions are private. They are visible only to signed-in administrators
            and are never returned by a public endpoint.
          </p>
          <p className="mt-2 text-caption text-muted-light">
            CSV export includes every message matching the current search and status filters.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={exporting || loading || (data?.total ?? 0) === 0}
          className="min-h-11 border border-charcoal/30 px-5 py-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
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

      {selected ? (
        <article
          aria-labelledby="message-detail-heading"
          className="mt-8 border border-charcoal/20 bg-white p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-gold-ink">Message</p>
              <h2 id="message-detail-heading" className="mt-2 text-h3">
                {selected.subject ?? 'No subject'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <MessageStatusBadge status={selected.status} />
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-caption text-charcoal underline underline-offset-4"
              >
                Close
              </button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-charcoal/10 pt-4 text-body-sm sm:grid-cols-3">
            <div>
              <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">From</dt>
              <dd className="mt-1 text-charcoal">{selected.name}</dd>
            </div>
            <div>
              <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">Email</dt>
              <dd className="mt-1 break-all text-charcoal">
                <a href={`mailto:${selected.email}`} className="link-underline hover:text-gold-ink">
                  {selected.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-caption tracking-[0.14em] text-muted-light uppercase">
                Received
              </dt>
              <dd className="mt-1 text-charcoal">
                <time dateTime={selected.createdAt}>{formatDateTime(selected.createdAt)}</time>
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-charcoal/10 pt-5">
            <h3 className="sr-only">Message contents</h3>
            <p className="max-w-reading whitespace-pre-wrap break-words text-body text-charcoal/80">
              {selected.message}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-charcoal/10 pt-5">
            {selected.status === 'READ' ? (
              <button
                type="button"
                onClick={() => void changeStatus(selected, 'NEW')}
                disabled={busyId === selected.id}
                className="text-caption text-charcoal underline underline-offset-4 disabled:opacity-50"
              >
                Mark as unread
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void changeStatus(selected, 'READ')}
                disabled={busyId === selected.id}
                className="text-caption text-charcoal underline underline-offset-4 disabled:opacity-50"
              >
                Mark as read
              </button>
            )}

            {selected.status === 'ARCHIVED' ? (
              <button
                type="button"
                onClick={() => void changeStatus(selected, 'READ')}
                disabled={busyId === selected.id}
                className="text-caption text-charcoal underline underline-offset-4 disabled:opacity-50"
              >
                Move to inbox
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void changeStatus(selected, 'ARCHIVED')}
                disabled={busyId === selected.id}
                className="text-caption text-charcoal underline underline-offset-4 disabled:opacity-50"
              >
                Archive
              </button>
            )}

            <button
              type="button"
              onClick={() => setDeleteTarget(selected)}
              className="text-caption text-error underline underline-offset-4"
            >
              Delete
            </button>

            <a
              href={`mailto:${selected.email}?subject=${encodeURIComponent(
                `Re: ${selected.subject ?? 'Your enquiry'}`,
              )}`}
              className="link-underline ml-auto text-body-sm text-gold-ink hover:text-charcoal"
            >
              Reply by email ↗
            </a>
          </div>
        </article>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="message-search"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Search
          </label>
          <input
            id="message-search"
            type="search"
            value={search}
            onChange={(event) => changeFilter(() => setSearch(event.target.value))}
            placeholder="Name, email, subject, or message"
            className={`${inputClassName} mt-2`}
          />
        </div>

        <div className="sm:w-48">
          <label
            htmlFor="message-status-filter"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Status
          </label>
          <select
            id="message-status-filter"
            value={status}
            onChange={(event) =>
              changeFilter(() => setStatus(event.target.value as MessageStatus | ''))
            }
            className={`${selectClassName} mt-2`}
          >
            <option value="">All messages</option>
            <option value="NEW">New</option>
            <option value="READ">Read</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading messages…
          </p>
        ) : showEmpty ? (
          <div className="border border-charcoal/15 px-6 py-12 text-center">
            <p className="font-serif text-h3 text-charcoal">No messages found</p>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-charcoal/70">
              {search || status
                ? 'No messages match these filters. Try clearing the search or status filter.'
                : 'New contact form submissions will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <caption className="sr-only">
                  Contact messages with sender, subject, received date, status, and actions
                </caption>
                <thead>
                  <tr className="border-b border-charcoal/20">
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      From
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Subject
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Received
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Status
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
                  {messages.map((message) => (
                    <tr key={message.id} className="border-b border-charcoal/10 align-top">
                      <td className="py-4 pr-4">
                        <p className="text-body-sm font-medium text-charcoal">{message.name}</p>
                        <p className="mt-1 break-all text-caption text-muted-light">
                          {message.email}
                        </p>
                      </td>
                      <td className="max-w-xs py-4 pr-4 text-body-sm text-charcoal/70">
                        {message.subject ?? <span className="text-muted-light">No subject</span>}
                      </td>
                      <td className="py-4 pr-4 text-caption text-muted-light">
                        <time dateTime={message.createdAt}>
                          {formatDateTime(message.createdAt)}
                        </time>
                      </td>
                      <td className="py-4 pr-4">
                        <MessageStatusBadge status={message.status} />
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <button
                            type="button"
                            onClick={() => setSelected(message)}
                            aria-label={`Open message from ${message.name}`}
                            className="text-caption text-charcoal underline underline-offset-4"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(message)}
                            aria-label={`Delete message from ${message.name}`}
                            className="text-caption text-error underline underline-offset-4"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                onPageChange={(next) => {
                  setSelected(null)
                  setPage(next)
                }}
              />
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this message?"
        description={
          deleteTarget
            ? `The message from ${deleteTarget.name} will be permanently deleted. This cannot be undone. Archive it instead if you want to keep it.`
            : ''
        }
        confirmLabel="Delete message"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
