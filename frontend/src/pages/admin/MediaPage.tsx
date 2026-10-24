import { useCallback, useEffect, useState } from 'react'
import type { AdminMedia, MediaListResponse } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { deleteMedia, listMedia, updateMedia, uploadMedia } from '@/api/media.api'
import { useSession } from '@/auth/useSession'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Pagination } from '@/components/admin/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'
import { formatDateTime } from '@/utils/formatDate'
import { setPageMetadata } from '@/utils/metadata'

const PAGE_SIZE = 20
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}

export function AdminMediaPage() {
  const { signOutAndClear } = useSession()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [uploading, setUploading] = useState(false)

  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<AdminMedia | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPageMetadata({
      title: 'Media library — Portfolio admin',
      description: 'Upload, describe, and remove images used across the portfolio.',
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      listMedia({ search: debouncedSearch, page, pageSize: PAGE_SIZE }, signal),
    [debouncedSearch, page],
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
  } = useApiResource<MediaListResponse>(fetcher, {
    errorMessage: 'The media library could not be loaded. Please try again.',
    onError: handleUnauthorized,
  })

  function selectFile(file: File | null) {
    setActionError(null)

    if (file && file.type && !ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(null)
      setFileInputKey((key) => key + 1)
      setActionError('Choose a JPEG, PNG, or WebP image.')
      return
    }

    setSelectedFile(file)
  }

  async function handleUpload() {
    if (!selectedFile) return

    setUploading(true)
    setActionError(null)
    setNotice(null)

    try {
      await uploadMedia(selectedFile)
      setNotice(`“${selectedFile.name}” uploaded. Add a description so it is ready to use.`)
      setSelectedFile(null)
      setFileInputKey((key) => key + 1)
      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(
        caught instanceof ApiError
          ? caught.message
          : 'The image could not be uploaded. Please try again.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveAlt(asset: AdminMedia) {
    const value = altDrafts[asset.id] ?? asset.altText ?? ''

    setSavingId(asset.id)
    setActionError(null)
    setNotice(null)

    try {
      await updateMedia(asset.id, { altText: value.trim() || null })
      setNotice('Image description saved.')
      setAltDrafts((current) => {
        const next = { ...current }
        delete next[asset.id]
        return next
      })
      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(
        caught instanceof ApiError
          ? caught.message
          : 'The description could not be saved. Please try again.',
      )
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    setActionError(null)
    setNotice(null)

    try {
      await deleteMedia(deleteTarget.id)
      setNotice(`“${deleteTarget.originalFilename}” deleted.`)
      setDeleteTarget(null)
      reload()
    } catch (caught) {
      if (await handleUnauthorized(caught)) return
      setActionError(
        caught instanceof ApiError
          ? caught.message
          : 'The image could not be deleted. Please try again.',
      )
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <header>
        <p className="eyebrow text-gold-ink">Content</p>
        <h1 className="mt-3 text-h2">Media library</h1>
        <p className="mt-3 max-w-2xl text-body-sm text-charcoal/70">
          Uploaded images and their descriptions. Files are validated on the server and stored
          outside the database. An image still used by a project, the profile, or the homepage
          cannot be deleted until it is replaced or removed there.
        </p>
      </header>

      <div aria-live="polite" className="mt-6 space-y-3">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {actionError ? (
          <InlineAlert tone="error">
            {actionError}{' '}
            <button type="button" onClick={reload} className="underline">
              Retry
            </button>
          </InlineAlert>
        ) : null}
      </div>

      <section aria-labelledby="upload-heading" className="mt-10 border border-charcoal/15 p-5">
        <h2 id="upload-heading" className="text-caption tracking-[0.14em] text-muted-light uppercase">
          Upload an image
        </h2>
        <p className="mt-2 text-body-sm text-charcoal/70">
          JPEG, PNG, or WebP only. The server checks the actual file contents, not the filename
          or declared type.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="min-w-64 flex-1">
            <label htmlFor="media-file" className="block text-body-sm font-medium text-charcoal">
              Choose a file
            </label>
            <input
              key={fileInputKey}
              id="media-file"
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-body-sm text-charcoal file:mr-4 file:min-h-11 file:border file:border-charcoal/30 file:bg-ivory file:px-4 file:text-body-sm file:text-charcoal"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!selectedFile || uploading}
            className="min-h-12 bg-gold px-6 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload image'}
          </button>
        </div>
      </section>

      <section aria-labelledby="library-heading" className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="library-heading" className="text-h3">
              Library
            </h2>
            {data ? (
              <p className="mt-1 text-caption text-muted-light">
                {data.total} {data.total === 1 ? 'image' : 'images'}
              </p>
            ) : null}
          </div>

          <div className="w-full max-w-xs">
            <label htmlFor="media-search" className="sr-only">
              Search media
            </label>
            <input
              id="media-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search filename or description"
              className={inputClassName}
            />
          </div>
        </div>

        {status === 'loading' && !data ? (
          <p role="status" className="mt-8 text-body-sm text-muted-light">
            Loading media…
          </p>
        ) : status === 'error' || !data ? (
          <div className="mt-8">
            <InlineAlert tone="error">{loadError ?? 'The library could not be loaded.'}</InlineAlert>
          </div>
        ) : data.items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={debouncedSearch ? 'No images match that search.' : 'No images yet.'}
              description={
                debouncedSearch
                  ? 'Try a different filename or description.'
                  : 'Upload an image above to start the library.'
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((asset) => {
              const altValue = altDrafts[asset.id] ?? asset.altText ?? ''
              const altChanged = altValue.trim() !== (asset.altText ?? '')

              return (
                <li key={asset.id} className="flex flex-col border border-charcoal/15">
                  <img
                    src={asset.url}
                    alt={asset.altText ?? ''}
                    loading="lazy"
                    decoding="async"
                    width={asset.width}
                    height={asset.height}
                    className="aspect-4/3 w-full border-b border-charcoal/10 bg-charcoal/5 object-contain"
                  />

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <p className="truncate text-body-sm font-medium text-charcoal" title={asset.originalFilename}>
                        {asset.originalFilename}
                      </p>
                      <p className="mt-1 text-caption text-muted-light">
                        {asset.width} × {asset.height} px · {formatBytes(asset.sizeBytes)} ·{' '}
                        {formatDateTime(asset.createdAt)}
                      </p>
                      {asset.referenced ? (
                        <p className="mt-1 text-caption text-gold-ink">
                          In use — remove it from that content first
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label
                        htmlFor={`media-alt-${asset.id}`}
                        className="block text-caption tracking-[0.14em] text-muted-light uppercase"
                      >
                        Description
                      </label>
                      <input
                        id={`media-alt-${asset.id}`}
                        value={altValue}
                        maxLength={200}
                        onChange={(event) =>
                          setAltDrafts((current) => ({ ...current, [asset.id]: event.target.value }))
                        }
                        placeholder="Describe the image for screen readers"
                        className={`${inputClassName} mt-2`}
                      />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => void handleSaveAlt(asset)}
                          disabled={!altChanged || savingId === asset.id}
                          className="min-h-10 border border-charcoal/30 px-3 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40"
                        >
                          {savingId === asset.id ? 'Saving…' : 'Save description'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(asset)}
                          className="text-caption text-error underline underline-offset-4"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {data && data.pageCount > 1 ? (
          <div className="mt-8">
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this image?"
        description={
          deleteTarget
            ? `“${deleteTarget.originalFilename}” will be removed from storage and cannot be restored.${
                deleteTarget.referenced
                  ? ' It is still used by the portfolio, so the server will refuse the deletion.'
                  : ''
              }`
            : ''
        }
        confirmLabel="Delete image"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
