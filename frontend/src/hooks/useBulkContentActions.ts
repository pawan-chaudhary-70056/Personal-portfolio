import { useCallback, useState } from 'react'
import type { BulkContentAction, ContentEntityType } from '@/@types/admin'
import { ApiError } from '@/api/client'
import { bulkContentAction } from '@/api/contentAdmin.api'

interface BulkContentActionOptions {
  type: ContentEntityType
  noun: string
  selectedIds: string[]
  clearSelection: () => void
  reload: () => void
  onNotice: (message: string | null) => void
  onError: (message: string | null) => void
  onUnauthorized: (caught: unknown) => Promise<boolean>
}

/**
 * Runs one bulk request for the current selection and reports it in the page's
 * existing notice/error area. Destructive runs stay behind a confirmation.
 */
export function useBulkContentActions({
  type,
  noun,
  selectedIds,
  clearSelection,
  reload,
  onNotice,
  onError,
  onUnauthorized,
}: BulkContentActionOptions) {
  const [busy, setBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const run = useCallback(
    async (action: BulkContentAction) => {
      if (selectedIds.length === 0) {
        return
      }

      setBusy(true)
      onNotice(null)
      onError(null)

      try {
        const result = await bulkContentAction(type, { action, ids: selectedIds })
        const plural = result.updated === 1 ? noun : `${noun}s`
        const message =
          action === 'publish'
            ? `${result.updated} ${plural} published.`
            : action === 'unpublish'
              ? `${result.updated} ${plural} hidden from the public site.`
              : `${result.updated} ${plural} moved to the trash.`

        onNotice(message)
        clearSelection()
        reload()
      } catch (caught) {
        if (!(await onUnauthorized(caught))) {
          onError(
            caught instanceof ApiError
              ? caught.message
              : 'The bulk action could not be completed. Please try again.',
          )
        }
      } finally {
        setBusy(false)
        setDeleteOpen(false)
      }
    },
    [type, noun, selectedIds, clearSelection, reload, onNotice, onError, onUnauthorized],
  )

  return {
    busy,
    deleteOpen,
    requestDelete: () => setDeleteOpen(true),
    cancelDelete: () => setDeleteOpen(false),
    publish: () => void run('publish'),
    unpublish: () => void run('unpublish'),
    confirmDelete: () => void run('delete'),
  }
}
