import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBulkSelection } from '@/hooks/useBulkSelection'

describe('useBulkSelection', () => {
  it('toggles a single id', () => {
    const { result } = renderHook(() => useBulkSelection(['a', 'b']))

    act(() => result.current.toggle('a'))
    expect(result.current.selectedIds).toEqual(['a'])
    expect(result.current.isSelected('a')).toBe(true)

    act(() => result.current.toggle('a'))
    expect(result.current.selectedIds).toEqual([])
  })

  it('selects and clears every visible id', () => {
    const { result } = renderHook(() => useBulkSelection(['a', 'b']))

    act(() => result.current.toggleAll())
    expect(result.current.allSelected).toBe(true)

    act(() => result.current.toggleAll())
    expect(result.current.selectedIds).toEqual([])
    expect(result.current.allSelected).toBe(false)
  })

  it('drops ids that are no longer rendered so stale selections are never sent', () => {
    const { result, rerender } = renderHook(
      ({ ids }) => useBulkSelection(ids),
      { initialProps: { ids: ['a', 'b'] } },
    )

    act(() => result.current.toggle('a'))
    rerender({ ids: ['b', 'c'] })

    expect(result.current.selectedIds).toEqual([])
    expect(result.current.allSelected).toBe(false)

    act(() => result.current.clear())
    expect(result.current.selectedIds).toEqual([])
  })

  it('reports nothing selected for an empty table', () => {
    const { result } = renderHook(() => useBulkSelection([]))

    expect(result.current.allSelected).toBe(false)
    expect(result.current.selectedIds).toEqual([])
  })
})
