import { useCallback, useEffect, useState } from 'react'
import type { ContentEntityType, TrashItem, TrashListResponse } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  listTrash,
  purgeTrash,
  purgeTrashItems,
  restoreTrash,
  restoreTrashItems,
} from '@/api/contentAdmin.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Pagination } from '@/components/admin/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const PAGE_SIZE = 20

const typeOptions: { value: ContentEntityType | ''; label: string }[] = [
  { value: '', label: 'All content' },
  { value: 'project', label: 'Projects' },
  { value: 'skill', label: 'Skills' },
  { value: 'experience', label: 'Experience' },
  { value: 'education', label: 'Education' },
  { value: 'certification', label: 'Certifications' },
]

const typeLabels: Record<ContentEntityType, string> = {
  project: 'Project',
  skill: 'Skill',
  experience: 'Experience',
  education: 'Education',
  certification: 'Certification',
}

/** Trash rows mix types, so selection is keyed by type and id together. */
function itemKey(item: TrashItem): string {
  return `${item.type}:${item.id}`
}

export function AdminTrashPage() {
  const { signOutAndClear } = useSession()

  const [type, setType] = useState<ContentEntityType | ''>('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null)
  const [purging, setPurging] = useState(false)
  const [bulkBusy, setBulkBusy] = useState<'restore' | 'purge' | null>(null)
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Trash — Portfolio admin',
      description: 'Restore or permanently delete removed portfolio content.',
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
    (signal: AbortSignal) => listTrash({ type: type || undefined, page, pageSize: PAGE_SIZE }, signal),
    [type, page],
  )

  const { status, data, error: loadError, reload } = useApiResource<TrashListResponse>(fetcher, {
    errorMessage: 'The trash could not be loaded. Please try again.',
    onError: handleUnauthorized,
  })

  const items = data?.items ?? []
  const selection = useBulkSelection(items.map(itemKey))
  const selectedItems = items.filter((item) => selection.isSelected(itemKey(item)))

  async function handleRestore(item: TrashItem) {
    setBusyId(item.id)
    setNotice(null)
    setActionError(null)

    try {
      await restoreTrash(item.type, item.id)
      setNotice(`“${item.title}” was restored.`)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The record could not be restored.',
        )
      }
    } finally {
      setBusyId(null)
    }
  }

  async function confirmPurge() {
    if (!purgeTarget) {
      return
    }

    setPurging(true)
    setActionError(null)
    setNotice(null)

    try {
      await purgeTrash(purgeTarget.type, purgeTarget.id)
      setNotice(`“${purgeTarget.title}” was permanently deleted.`)
      setPurgeTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The record could not be deleted.',
        )
      }
      setPurgeTarget(null)
    } finally {
      setPurging(false)
    }
  }

  async function handleBulkRestore() {
    if (selectedItems.length === 0) {
      return
    }

    setBulkBusy('restore')
    setNotice(null)
    setActionError(null)

    try {
      const result = await restoreTrashItems(
        selectedItems.map((item) => ({ type: item.type, id: item.id })),
      )
      setNotice(
        result.restored === 1 ? '1 record was restored.' : `${result.restored} records were restored.`,
      )
      selection.clear()
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The records could not be restored.',
        )
      }
    } finally {
      setBulkBusy(null)
    }
  }

  async function confirmBulkPurge() {
    const targets = selectedItems

    if (targets.length === 0) {
      setBulkPurgeOpen(false)
      return
    }

    setBulkBusy('purge')
    setActionError(null)
    setNotice(null)

    try {
      const result = await purgeTrashItems(
        targets.map((item) => ({ type: item.type, id: item.id })),
      )
      setNotice(
        result.purged === 1
          ? '1 record was permanently deleted.'
          : `${result.purged} records were permanently deleted.`,
      )
      setBulkPurgeOpen(false)
      selection.clear()
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The records could not be deleted.',
        )
      }
      setBulkPurgeOpen(false)
    } finally {
      setBulkBusy(null)
    }
  }

  const loading = status === 'loading'
  const showEmpty = !loading && items.length === 0
  const error = actionError ?? (status === 'error' ? loadError : null)
  const selectionCount = selectedItems.length

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Maintenance</p>
          <h1 className="mt-3 text-h2">Trash</h1>
          <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
            Removed projects, skills, experience, education, and certifications wait here. Deleted
            records are hidden from the public site and from their normal lists, but their names and
            slugs stay reserved until they are permanently deleted.
          </p>
        </div>
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

      <div className="mt-8 max-w-xs">
        <label
          htmlFor="trash-type"
          className="block text-caption tracking-[0.14em] text-muted-light uppercase"
        >
          Content type
        </label>
        <select
          id="trash-type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as ContentEntityType | '')
            setPage(1)
          }}
          className={`${selectClassName} mt-2`}
        >
          {typeOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectionCount > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-gold/60 bg-gold/10 px-4 py-3"
        >
          <p aria-live="polite" className="text-body-sm text-charcoal">
            {selectionCount} {selectionCount === 1 ? 'item' : 'items'} selected
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleBulkRestore()}
              disabled={bulkBusy !== null}
              className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
            >
              {bulkBusy === 'restore' ? 'Restoring…' : 'Restore selected'}
            </button>
            <button
              type="button"
              onClick={() => setBulkPurgeOpen(true)}
              disabled={bulkBusy !== null}
              className="min-h-11 border border-error/50 px-4 text-body-sm text-error transition-colors duration-150 ease-standard hover:border-error disabled:opacity-40"
            >
              Delete permanently
            </button>
            <button
              type="button"
              onClick={selection.clear}
              disabled={bulkBusy !== null}
              className="min-h-11 px-2 text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-40"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading the trash…
          </p>
        ) : showEmpty ? (
          <EmptyState
            title="The trash is empty"
            description="Records you remove from the content lists appear here and can be restored."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[50rem] border-collapse text-left">
                <caption className="sr-only">
                  Removed content with the time it was deleted, plus restore and delete actions
                </caption>
                <thead>
                  <tr className="border-b border-charcoal/20">
                    <th scope="col" className="w-12 py-3 pr-4">
                      <input
                        type="checkbox"
                        aria-label="Select all items on this page"
                        checked={selection.allSelected}
                        onChange={selection.toggleAll}
                        className="size-4 accent-charcoal"
                      />
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Item
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                    >
                      Deleted
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
                  {items.map((item) => {
                    const key = itemKey(item)

                    return (
                      <tr key={key} className="border-b border-charcoal/10 align-top">
                        <td className="py-4 pr-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.title}`}
                            checked={selection.isSelected(key)}
                            onChange={() => selection.toggle(key)}
                            className="size-4 accent-charcoal"
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <p className="text-body-sm font-medium text-charcoal">{item.title}</p>
                          {item.subtitle ? (
                            <p className="mt-1 text-caption text-muted-light">{item.subtitle}</p>
                          ) : null}
                          <p className="mt-1 text-caption text-muted-light">
                            {item.published ? 'Was published' : 'Was hidden'}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                          {typeLabels[item.type]}
                        </td>
                        <td className="py-4 pr-4 text-caption text-muted-light">
                          {formatDateTime(item.deletedAt)}
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <button
                              type="button"
                              onClick={() => void handleRestore(item)}
                              disabled={busyId === item.id || bulkBusy !== null}
                              className="text-caption text-charcoal underline underline-offset-4 disabled:opacity-50"
                            >
                              Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => setPurgeTarget(item)}
                              disabled={busyId === item.id || bulkBusy !== null}
                              className="text-caption text-error underline underline-offset-4 disabled:opacity-50"
                            >
                              Delete permanently
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data?.page ?? 1}
              pageCount={data?.pageCount ?? 1}
              total={data?.total ?? 0}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={purgeTarget !== null}
        title="Delete permanently?"
        description={
          purgeTarget
            ? `“${purgeTarget.title}” will be deleted permanently. This cannot be undone, and any gallery images attached to it are removed too.`
            : ''
        }
        confirmLabel="Delete permanently"
        destructive
        busy={purging}
        onConfirm={() => void confirmPurge()}
        onCancel={() => setPurgeTarget(null)}
      />

      <ConfirmDialog
        open={bulkPurgeOpen}
        title={
          selectionCount === 1
            ? 'Delete this item permanently?'
            : `Delete these ${selectionCount} items permanently?`
        }
        description={`Every selected record will be removed for good, along with any gallery images attached to it. This cannot be undone.`}
        confirmLabel={
          selectionCount === 1 ? 'Delete permanently' : `Delete ${selectionCount} items`
        }
        destructive
        busy={bulkBusy === 'purge'}
        onConfirm={() => void confirmBulkPurge()}
        onCancel={() => setBulkPurgeOpen(false)}
      />
    </>
  )
}
