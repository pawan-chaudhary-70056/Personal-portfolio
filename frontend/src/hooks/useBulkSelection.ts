import { useCallback, useState } from 'react'

export interface BulkSelection {
  selectedIds: string[]
  allSelected: boolean
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
  isSelected: (id: string) => boolean
}

/**
 * Selection for a table's visible rows. Ids that are no longer rendered (after a
 * reload or filter change) are ignored, so a stale selection can never be sent
 * to the API.
 */
export function useBulkSelection(ids: string[]): BulkSelection {
  const [selected, setSelected] = useState<string[]>([])

  const selectedIds = selected.filter((id) => ids.includes(id))

  const toggle = useCallback((id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((current) => {
      const remaining = current.filter((id) => ids.includes(id))
      return remaining.length === ids.length ? [] : [...ids]
    })
  }, [ids])

  const clear = useCallback(() => setSelected([]), [])

  const isSelected = useCallback((id: string) => selectedIds.includes(id), [selectedIds])

  return {
    selectedIds,
    allSelected: ids.length > 0 && selectedIds.length === ids.length,
    toggle,
    toggleAll,
    clear,
    isSelected,
  }
}
