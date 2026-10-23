import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AdminEducation } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  deleteEducation,
  listEducation,
  updateEducation,
  type EducationListResponse,
} from '@/api/education.api'
import { useSession } from '@/auth/useSession'
import { BulkActionsBar } from '@/components/admin/BulkActionsBar'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { VisibilityBadge } from '@/components/admin/VisibilityBadge'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { useBulkContentActions } from '@/hooks/useBulkContentActions'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { formatDate } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

function displayDates(entry: AdminEducation): string {
  if (!entry.startDate && !entry.endDate) {
    return '—'
  }

  if (entry.startDate && entry.endDate) {
    return `${formatDate(entry.startDate)} — ${formatDate(entry.endDate)}`
  }

  return formatDate(entry.startDate ?? entry.endDate ?? '')
}

export function AdminEducationPage() {
  const { signOutAndClear } = useSession()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminEducation | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Education — Portfolio admin',
      description: 'Manage academic qualifications.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) => listEducation({ search: debouncedSearch }, signal),
    [debouncedSearch],
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
    status,
    data,
    error: loadError,
    reload,
  } = useApiResource<EducationListResponse>(fetcher, {
    errorMessage: 'Could not load education entries. Please try again.',
    onError: handleUnauthorized,
  })

  async function togglePublished(entry: AdminEducation) {
    setBusyId(entry.id)
    setNotice(null)
    setActionError(null)

    try {
      await updateEducation(entry.id, { published: !entry.published })
      setNotice(
        entry.published
          ? `“${entry.qualification}” is hidden from the public site.`
          : `“${entry.qualification}” is now published.`,
      )
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError
            ? caught.message
            : 'The education entry could not be updated.',
        )
      }
    } finally {
      setBusyId(null)
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
      await deleteEducation(deleteTarget.id)
      setNotice(`“${deleteTarget.qualification}” was moved to the trash.`)
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError
            ? caught.message
            : 'The education entry could not be deleted.',
        )
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const entries = data?.education ?? []
  const selection = useBulkSelection(entries.map((entry) => entry.id))
  const bulk = useBulkContentActions({
    type: 'education',
    noun: 'education record',
    selectedIds: selection.selectedIds,
    clearSelection: selection.clear,
    reload,
    onNotice: setNotice,
    onError: setActionError,
    onUnauthorized: handleUnauthorized,
  })
  const loading = status === 'loading'
  const showEmpty = !loading && entries.length === 0
  const error = actionError ?? (status === 'error' ? loadError : null)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Content</p>
          <h1 className="mt-3 text-h2">Education</h1>
          <p className="mt-3 max-w-xl text-body-sm text-charcoal/70">
            Academic qualifications shown on the public credentials section. Dates are
            optional when historical records are incomplete.
          </p>
        </div>
        <Link
          to="/admin/education/new"
          className="min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
        >
          New qualification
        </Link>
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

      <div className="mt-8 max-w-md">
        <label
          htmlFor="education-search"
          className="block text-caption tracking-[0.14em] text-muted-light uppercase"
        >
          Search
        </label>
        <input
          id="education-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Qualification, institution, or field"
          className={`${inputClassName} mt-2`}
        />
      </div>

      <BulkActionsBar
        count={selection.selectedIds.length}
        noun="education record"
        busy={bulk.busy}
        onPublish={bulk.publish}
        onUnpublish={bulk.unpublish}
        onDelete={bulk.requestDelete}
        onClear={selection.clear}
      />

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading education…
          </p>
        ) : showEmpty ? (
          <div className="border border-charcoal/15 px-6 py-12 text-center">
            <p className="font-serif text-h3 text-charcoal">No education entries found</p>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-charcoal/70">
              {search
                ? 'No entries match this search. Try a different term.'
                : 'Add a qualification so it can appear in the public credentials.'}
            </p>
            <Link
              to="/admin/education/new"
              className="mt-6 inline-block min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal"
            >
              New qualification
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">
                Academic qualifications with institution, dates, visibility, and available
                actions
              </caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th scope="col" className="w-10 py-3 pr-4">
                    <input
                      type="checkbox"
                      aria-label="Select all education entries"
                      checked={selection.allSelected}
                      onChange={selection.toggleAll}
                      className="size-4 accent-gold"
                    />
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Qualification
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Dates
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Visibility
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
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-charcoal/10 align-top">
                    <td className="py-4 pr-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${entry.qualification}`}
                        checked={selection.isSelected(entry.id)}
                        onChange={() => selection.toggle(entry.id)}
                        className="size-4 accent-gold"
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <Link
                        to={`/admin/education/${entry.id}`}
                        className="text-body-sm font-medium text-charcoal underline-offset-4 hover:underline"
                      >
                        {entry.qualification}
                      </Link>
                      <p className="mt-1 text-caption text-muted-light">
                        {entry.institution}
                        {entry.fieldOfStudy ? ` · ${entry.fieldOfStudy}` : ''}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                      {displayDates(entry)}
                    </td>
                    <td className="py-4 pr-4 text-caption text-muted-light">{entry.sortOrder}</td>
                    <td className="py-4 pr-4">
                      <VisibilityBadge published={entry.published} />
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Link
                          to={`/admin/education/${entry.id}`}
                          className="text-caption text-charcoal underline underline-offset-4"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => void togglePublished(entry)}
                          disabled={busyId === entry.id}
                          aria-label={`${entry.published ? 'Hide' : 'Publish'} ${entry.qualification}`}
                          className="text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-50"
                        >
                          {entry.published ? 'Hide' : 'Publish'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(entry)}
                          aria-label={`Delete ${entry.qualification}`}
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
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this education entry?"
        description={
          deleteTarget
            ? `“${deleteTarget.qualification}” at ${deleteTarget.institution} will be moved to the trash and hidden from the portfolio. You can restore it from Trash. To keep it private instead, hide it.`
            : ''
        }
        confirmLabel="Move to trash"
        destructive
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={bulk.deleteOpen}
        title="Move these education records to the trash?"
        description={`${selection.selectedIds.length} selected education record${
          selection.selectedIds.length === 1 ? '' : 's'
        } will be hidden from the portfolio and can be restored from Trash.`}
        confirmLabel="Move to trash"
        destructive
        busy={bulk.busy}
        onConfirm={bulk.confirmDelete}
        onCancel={bulk.cancelDelete}
      />
    </>
  )
}
