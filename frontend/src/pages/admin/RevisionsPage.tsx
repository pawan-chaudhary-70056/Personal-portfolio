import { useCallback, useEffect, useState } from 'react'
import type { RevisionDetail, RevisionListResponse, RevisionSummary } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { getRevision, listRevisions, restoreRevision } from '@/api/contentAdmin.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { RevisionDiffTable } from '@/components/admin/RevisionDiffTable'
import { Pagination } from '@/components/admin/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName, selectClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'
import { snapshotDiff } from '@/utils/revisionDiff'

const PAGE_SIZE = 20

const entityOptions = [
  { value: '', label: 'All content' },
  { value: 'Project', label: 'Projects' },
  { value: 'Skill', label: 'Skills' },
  { value: 'Experience', label: 'Experience' },
  { value: 'Education', label: 'Education' },
  { value: 'Certification', label: 'Certifications' },
]

const actionLabels: Record<string, string> = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  DELETED: 'Moved to trash',
  RESTORED: 'Restored from trash',
}

export function AdminRevisionsPage() {
  const { signOutAndClear } = useSession()

  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [debouncedEntityId, setDebouncedEntityId] = useState('')
  const [page, setPage] = useState(1)

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RevisionDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [restoreTarget, setRestoreTarget] = useState<RevisionSummary | null>(null)
  const [restoring, setRestoring] = useState(false)

  const [compareIds, setCompareIds] = useState<string[]>([])
  const [comparison, setComparison] = useState<{
    before: RevisionDetail
    after: RevisionDetail
  } | null>(null)
  const [comparing, setComparing] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)

  useEffect(() => {
    setPageMetadata({
      title: 'Revisions — Portfolio admin',
      description: 'Review and restore earlier versions of portfolio content.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEntityId(entityId.trim()), 300)
    return () => clearTimeout(timer)
  }, [entityId])

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
    (signal: AbortSignal) =>
      listRevisions(
        {
          entityType: entityType || undefined,
          entityId: debouncedEntityId || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        signal,
      ),
    [entityType, debouncedEntityId, page],
  )

  const { status, data, error: loadError, reload } = useApiResource<RevisionListResponse>(fetcher, {
    errorMessage: 'Revision history could not be loaded. Please try again.',
    onError: handleUnauthorized,
  })

  async function toggleDetail(revision: RevisionSummary) {
    if (expandedId === revision.id) {
      setExpandedId(null)
      setDetail(null)
      return
    }

    setExpandedId(revision.id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)

    try {
      setDetail(await getRevision(revision.id))
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setDetailError(
          caught instanceof ApiError ? caught.message : 'The snapshot could not be loaded.',
        )
      }
    } finally {
      setDetailLoading(false)
    }
  }

  function toggleCompare(revision: RevisionSummary) {
    setCompareError(null)

    setCompareIds((current) => {
      if (current.includes(revision.id)) {
        return current.filter((id) => id !== revision.id)
      }

      if (current.length === 2) {
        setCompareError('Select exactly two revisions to compare.')
        return current
      }

      return [...current, revision.id]
    })
  }

  async function compareSelected() {
    if (compareIds.length !== 2) {
      setCompareError('Select exactly two revisions to compare.')
      return
    }

    setComparing(true)
    setCompareError(null)

    try {
      const details = await Promise.all(compareIds.map((id) => getRevision(id)))
      const [first, second] = details.sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      )
      setComparison({ before: first, after: second })
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setCompareError(
          caught instanceof ApiError ? caught.message : 'The snapshots could not be compared.',
        )
      }
    } finally {
      setComparing(false)
    }
  }

  async function confirmRestore() {
    if (!restoreTarget) {
      return
    }

    setRestoring(true)
    setNotice(null)
    setActionError(null)

    try {
      await restoreRevision(restoreTarget.id)
      setNotice(
        `Revision from ${formatDateTime(restoreTarget.createdAt)} was restored. The record was saved again, so the change is reversible.`,
      )
      setRestoreTarget(null)
      setExpandedId(null)
      setDetail(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError ? caught.message : 'The revision could not be restored.',
        )
      }
      setRestoreTarget(null)
    } finally {
      setRestoring(false)
    }
  }

  const items = data?.items ?? []
  const differences = comparison
    ? snapshotDiff(comparison.before.snapshot, comparison.after.snapshot)
    : []
  const previewDiff = detail?.previous
    ? snapshotDiff(detail.previous.snapshot, detail.snapshot)
    : []
  const loading = status === 'loading'
  const showEmpty = !loading && items.length === 0
  const error = actionError ?? (status === 'error' ? loadError : null)

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Maintenance</p>
        <h1 className="mt-3 text-h2">Revision history</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          Every content change stores a snapshot. Restoring one re-applies that snapshot through the
          normal save path, so validation runs again and the restore itself becomes a new revision.
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

      <div className="mt-8 flex flex-wrap items-end gap-4">
        <div className="w-full max-w-xs">
          <label
            htmlFor="revision-type"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Content type
          </label>
          <select
            id="revision-type"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value)
              setPage(1)
            }}
            className={`${selectClassName} mt-2`}
          >
            {entityOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full max-w-sm">
          <label
            htmlFor="revision-entity"
            className="block text-caption tracking-[0.14em] text-muted-light uppercase"
          >
            Record id
          </label>
          <input
            id="revision-entity"
            type="search"
            value={entityId}
            onChange={(event) => {
              setEntityId(event.target.value)
              setPage(1)
            }}
            placeholder="Optional: a single record"
            className={`${inputClassName} mt-2`}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void compareSelected()}
          disabled={compareIds.length !== 2 || comparing}
          className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
        >
          {comparing ? 'Comparing…' : `Compare selected (${compareIds.length}/2)`}
        </button>
        {compareIds.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setCompareIds([])
              setComparison(null)
              setCompareError(null)
            }}
            className="text-caption text-charcoal/70 underline underline-offset-4"
          >
            Clear comparison
          </button>
        ) : (
          <p className="text-caption text-muted-light">Select two snapshots to compare them.</p>
        )}
        {compareError ? <p className="text-caption text-error">{compareError}</p> : null}
      </div>

      {comparison ? (
        <section aria-label="Revision comparison" className="mt-6 border border-charcoal/20">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/15 px-4 py-3">
            <div>
              <p className="text-body-sm font-medium text-charcoal">
                {comparison.before.entityType}{' '}
                <span className="font-mono text-caption text-muted-light">
                  {comparison.before.entityId}
                </span>
              </p>
              <p className="mt-1 text-caption text-muted-light">
                {formatDateTime(comparison.before.createdAt)} →{' '}
                {formatDateTime(comparison.after.createdAt)}
              </p>
            </div>
            <p className="text-caption text-muted-light">
              {differences.length === 0
                ? 'No differences between these snapshots.'
                : `${differences.length} field${differences.length === 1 ? '' : 's'} changed`}
            </p>
          </header>

          <RevisionDiffTable
            rows={differences}
            caption="Changed fields between the two selected revisions"
          />
        </section>
      ) : null}

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading revisions…
          </p>
        ) : showEmpty ? (
          <EmptyState
            title="No revisions found"
            description={
              entityId || entityType
                ? 'No saved versions match these filters. Clear them to see every revision.'
                : 'Revisions appear after content is created or edited.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left">
                <caption className="sr-only">
                  Saved content revisions with action, editor, time, and available actions
                </caption>
                <thead>
                  <tr className="border-b border-charcoal/20">
                    <th scope="col" className="w-10 py-3 pr-4">
                      <span className="sr-only">Compare</span>
                    </th>
                    <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                      When
                    </th>
                    <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                      Content
                    </th>
                    <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                      Change
                    </th>
                    <th scope="col" className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase">
                      Editor
                    </th>
                    <th scope="col" className="py-3 text-caption tracking-[0.14em] text-muted-light uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((revision) => (
                    <tr key={revision.id} className="border-b border-charcoal/10 align-top">
                      <td className="py-4 pr-4">
                        <input
                          type="checkbox"
                          aria-label={`Compare revision from ${formatDateTime(revision.createdAt)}`}
                          checked={compareIds.includes(revision.id)}
                          onChange={() => toggleCompare(revision)}
                          className="size-4 accent-gold"
                        />
                      </td>
                      <td className="py-4 pr-4 text-caption text-muted-light">
                        {formatDateTime(revision.createdAt)}
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-body-sm text-charcoal">{revision.entityType}</p>
                        <p className="mt-1 font-mono text-caption text-muted-light">
                          {revision.entityId}
                        </p>
                      </td>
                      <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                        {actionLabels[revision.action] ?? revision.action}
                      </td>
                      <td className="py-4 pr-4 text-caption text-muted-light">
                        {revision.adminName ?? 'Unknown'}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <button
                            type="button"
                            onClick={() => void toggleDetail(revision)}
                            className="text-caption text-charcoal underline underline-offset-4"
                          >
                            {expandedId === revision.id ? 'Hide snapshot' : 'View snapshot'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestoreTarget(revision)}
                            className="text-caption text-charcoal/70 underline underline-offset-4"
                          >
                            Restore
                          </button>
                        </div>

                        {expandedId === revision.id ? (
                          <div className="mt-3 max-w-3xl border border-charcoal/15 bg-charcoal/[0.03]">
                            {detailLoading ? (
                              <p role="status" className="px-4 py-3 text-caption text-muted-light">
                                Loading snapshot…
                              </p>
                            ) : detailError ? (
                              <p className="px-4 py-3 text-caption text-error">{detailError}</p>
                            ) : detail ? (
                              <>
                                <div className="border-b border-charcoal/15 px-4 py-3">
                                  <p className="text-body-sm font-medium text-charcoal">
                                    Changes in this revision
                                  </p>
                                  <p className="mt-1 text-caption text-muted-light">
                                    {detail.previous
                                      ? `Compared with the snapshot from ${formatDateTime(detail.previous.createdAt)}.`
                                      : 'This is the first snapshot for the record, so every field is new.'}
                                  </p>
                                </div>

                                <RevisionDiffTable
                                  rows={
                                    detail.previous
                                      ? previewDiff
                                      : snapshotDiff({}, detail.snapshot)
                                  }
                                  caption={
                                    detail.previous
                                      ? `Fields changed by the revision from ${formatDateTime(detail.createdAt)}`
                                      : `Fields stored by the initial revision from ${formatDateTime(detail.createdAt)}`
                                  }
                                  emptyMessage={
                                    detail.previous
                                      ? 'No fields changed compared with the previous snapshot.'
                                      : 'The first snapshot is empty.'
                                  }
                                  beforeLabel="Before"
                                  afterLabel="After"
                                />

                                <details className="border-t border-charcoal/15">
                                  <summary className="cursor-pointer px-4 py-2 text-caption text-charcoal underline underline-offset-4">
                                    Raw snapshot
                                  </summary>
                                  <pre className="max-h-72 overflow-auto px-4 pb-3 font-mono text-caption whitespace-pre-wrap text-charcoal/80">
                                    {JSON.stringify(detail.snapshot, null, 2)}
                                  </pre>
                                </details>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
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
        open={restoreTarget !== null}
        title="Restore this revision?"
        description={
          restoreTarget
            ? `The ${restoreTarget.entityType.toLowerCase()} will be saved again with the values from ${formatDateTime(restoreTarget.createdAt)}. The current values are kept in history, so this is reversible.`
            : ''
        }
        confirmLabel="Restore revision"
        busy={restoring}
        onConfirm={() => void confirmRestore()}
        onCancel={() => setRestoreTarget(null)}
      />
    </>
  )
}
