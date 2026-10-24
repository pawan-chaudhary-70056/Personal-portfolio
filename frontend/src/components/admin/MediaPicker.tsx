import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminMedia, MediaListResponse } from '@/@types/admin'
import { listMedia } from '@/api/media.api'
import { Pagination } from '@/components/admin/Pagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { inputClassName } from '@/components/ui/fieldStyles'
import { useApiResource } from '@/hooks/useApiResource'

const PAGE_SIZE = 8

interface MediaPickerProps {
  open: boolean
  /** Id of the current selection, highlighted in the grid. */
  selectedId: string | null
  onSelect: (asset: AdminMedia) => void
  onClose: () => void
}

/**
 * Chooses an uploaded image for a content record. Uses the native <dialog>
 * element, so focus trapping, Escape handling, and focus restoration come from
 * the browser. The listing is only requested while the dialog is open.
 */
export function MediaPicker({ open, selectedId, onSelect, onClose }: MediaPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!open) {
        return Promise.resolve<MediaListResponse>({
          items: [],
          total: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          pageCount: 0,
        })
      }

      return listMedia({ search: debouncedSearch, page, pageSize: PAGE_SIZE }, signal)
    },
    [open, debouncedSearch, page],
  )

  const { status, data, error } = useApiResource<MediaListResponse>(fetcher, {
    errorMessage: 'The media library could not be loaded. Please try again.',
  })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="media-picker-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
      className="m-auto w-[min(94vw,60rem)] border border-charcoal/20 bg-ivory p-0 text-charcoal backdrop:bg-charcoal/70"
    >
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="media-picker-title" className="text-h3">
              Choose an image
            </h2>
            <p className="mt-2 max-w-xl text-body-sm text-charcoal/70">
              Images uploaded through the media library. Selecting one replaces the external image
              URL for this record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-10 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60"
          >
            Close
          </button>
        </div>

        <div className="mt-5 max-w-sm">
          <label htmlFor="media-picker-search" className="sr-only">
            Search media
          </label>
          <input
            id="media-picker-search"
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

        <div className="mt-6 max-h-[55vh] overflow-y-auto pr-1">
          {status === 'loading' && !data ? (
            <p role="status" className="text-body-sm text-muted-light">
              Loading media…
            </p>
          ) : status === 'error' || !data ? (
            <InlineAlert tone="error">{error ?? 'The media library could not be loaded.'}</InlineAlert>
          ) : data.items.length === 0 ? (
            <EmptyState
              title={debouncedSearch ? 'No images match that search.' : 'No images yet.'}
              description={
                debouncedSearch
                  ? 'Try a different filename or description.'
                  : 'Upload an image in the media library, then return here.'
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((asset) => {
                const selected = asset.id === selectedId

                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(asset)
                        onClose()
                      }}
                      aria-pressed={selected}
                      className={`flex h-full w-full flex-col border text-left transition-colors duration-150 ease-standard ${
                        selected
                          ? 'border-gold bg-gold/10'
                          : 'border-charcoal/15 hover:border-charcoal/45'
                      }`}
                    >
                      <img
                        src={asset.url}
                        alt={asset.altText ?? ''}
                        loading="lazy"
                        decoding="async"
                        width={asset.width}
                        height={asset.height}
                        className="aspect-4/3 w-full border-b border-charcoal/10 bg-charcoal/5 object-contain"
                      />
                      <span className="flex flex-1 flex-col gap-1 p-3">
                        <span className="truncate text-body-sm font-medium" title={asset.originalFilename}>
                          {asset.originalFilename}
                        </span>
                        <span className="text-caption text-muted-light">
                          {asset.width} × {asset.height} px
                          {selected ? ' · Selected' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {data && data.pageCount > 1 ? (
          <div className="mt-6">
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </dialog>
  )
}
