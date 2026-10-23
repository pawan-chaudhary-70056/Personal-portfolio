import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { AdminCertification } from '@/@types/admin'
import { ApiError } from '@/api/client'
import {
  deleteCertification,
  listCertifications,
  updateCertification,
  type CertificationListResponse,
} from '@/api/certifications.api'
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

function displayDates(certification: AdminCertification): string {
  const parts: string[] = []

  if (certification.issueDate) {
    parts.push(`Issued ${formatDate(certification.issueDate)}`)
  }

  if (certification.expiryDate) {
    parts.push(`Expires ${formatDate(certification.expiryDate)}`)
  }

  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function AdminCertificationsPage() {
  const { signOutAndClear } = useSession()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminCertification | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Certifications — Portfolio admin',
      description: 'Manage professional certifications.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) => listCertifications({ search: debouncedSearch }, signal),
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
  } = useApiResource<CertificationListResponse>(fetcher, {
    errorMessage: 'Could not load certifications. Please try again.',
    onError: handleUnauthorized,
  })

  async function togglePublished(certification: AdminCertification) {
    setBusyId(certification.id)
    setNotice(null)
    setActionError(null)

    try {
      await updateCertification(certification.id, { published: !certification.published })
      setNotice(
        certification.published
          ? `“${certification.name}” is hidden from the public site.`
          : `“${certification.name}” is now published.`,
      )
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError
            ? caught.message
            : 'The certification could not be updated.',
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
      await deleteCertification(deleteTarget.id)
      setNotice(`“${deleteTarget.name}” was moved to the trash.`)
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      if (!(await handleUnauthorized(caught))) {
        setActionError(
          caught instanceof ApiError
            ? caught.message
            : 'The certification could not be deleted.',
        )
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const certifications = data?.certifications ?? []
  const selection = useBulkSelection(certifications.map((certification) => certification.id))
  const bulk = useBulkContentActions({
    type: 'certification',
    noun: 'certification',
    selectedIds: selection.selectedIds,
    clearSelection: selection.clear,
    reload,
    onNotice: setNotice,
    onError: setActionError,
    onUnauthorized: handleUnauthorized,
  })
  const loading = status === 'loading'
  const showEmpty = !loading && certifications.length === 0
  const error = actionError ?? (status === 'error' ? loadError : null)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-ink">Content</p>
          <h1 className="mt-3 text-h2">Certifications</h1>
          <p className="mt-3 max-w-xl text-body-sm text-charcoal/70">
            Earned credentials shown on the public credentials section. Only publish
            verification details you are comfortable making public.
          </p>
        </div>
        <Link
          to="/admin/certifications/new"
          className="min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d]"
        >
          New certification
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
          htmlFor="certification-search"
          className="block text-caption tracking-[0.14em] text-muted-light uppercase"
        >
          Search
        </label>
        <input
          id="certification-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, issuer, or credential ID"
          className={`${inputClassName} mt-2`}
        />
      </div>

      <BulkActionsBar
        count={selection.selectedIds.length}
        noun="certification"
        busy={bulk.busy}
        onPublish={bulk.publish}
        onUnpublish={bulk.unpublish}
        onDelete={bulk.requestDelete}
        onClear={selection.clear}
      />

      <div className="mt-8">
        {loading && !data ? (
          <p role="status" className="text-body-sm text-muted-light">
            Loading certifications…
          </p>
        ) : showEmpty ? (
          <div className="border border-charcoal/15 px-6 py-12 text-center">
            <p className="font-serif text-h3 text-charcoal">No certifications found</p>
            <p className="mx-auto mt-2 max-w-sm text-body-sm text-charcoal/70">
              {search
                ? 'No certifications match this search. Try a different term.'
                : 'Add an earned credential so it can appear in the public credentials.'}
            </p>
            <Link
              to="/admin/certifications/new"
              className="mt-6 inline-block min-h-11 bg-gold px-5 py-3 text-body-sm font-medium text-charcoal"
            >
              New certification
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left">
              <caption className="sr-only">
                Professional certifications with issuer, dates, visibility, and available
                actions
              </caption>
              <thead>
                <tr className="border-b border-charcoal/20">
                  <th scope="col" className="w-10 py-3 pr-4">
                    <input
                      type="checkbox"
                      aria-label="Select all certifications"
                      checked={selection.allSelected}
                      onChange={selection.toggleAll}
                      className="size-4 accent-gold"
                    />
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-caption tracking-[0.14em] text-muted-light uppercase"
                  >
                    Certification
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
                {certifications.map((certification) => (
                  <tr key={certification.id} className="border-b border-charcoal/10 align-top">
                    <td className="py-4 pr-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${certification.name}`}
                        checked={selection.isSelected(certification.id)}
                        onChange={() => selection.toggle(certification.id)}
                        className="size-4 accent-gold"
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <Link
                        to={`/admin/certifications/${certification.id}`}
                        className="text-body-sm font-medium text-charcoal underline-offset-4 hover:underline"
                      >
                        {certification.name}
                      </Link>
                      <p className="mt-1 text-caption text-muted-light">
                        {certification.issuingOrganization}
                        {certification.credentialId
                          ? ` · ${certification.credentialId}`
                          : ''}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-charcoal/70">
                      {displayDates(certification)}
                    </td>
                    <td className="py-4 pr-4 text-caption text-muted-light">
                      {certification.sortOrder}
                    </td>
                    <td className="py-4 pr-4">
                      <VisibilityBadge published={certification.published} />
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Link
                          to={`/admin/certifications/${certification.id}`}
                          className="text-caption text-charcoal underline underline-offset-4"
                        >
                          Edit
                        </Link>

                        {certification.credentialUrl ? (
                          <a
                            href={certification.credentialUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-caption text-charcoal/70 underline underline-offset-4"
                          >
                            Verify ↗
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void togglePublished(certification)}
                          disabled={busyId === certification.id}
                          aria-label={`${certification.published ? 'Hide' : 'Publish'} ${certification.name}`}
                          className="text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-50"
                        >
                          {certification.published ? 'Hide' : 'Publish'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(certification)}
                          aria-label={`Delete ${certification.name}`}
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
        title="Delete this certification?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” from ${deleteTarget.issuingOrganization} will be moved to the trash and hidden from the portfolio. You can restore it from Trash. To keep it private instead, hide it.`
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
        title="Move these certifications to the trash?"
        description={`${selection.selectedIds.length} selected certification${
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
