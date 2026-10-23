import { describe, expect, it } from 'vitest'
import { formatSnapshotValue, snapshotDiff } from '@/utils/revisionDiff'

describe('snapshotDiff', () => {
  it('returns no rows when the snapshots are identical', () => {
    const snapshot = { title: 'Same', published: true, tags: ['a', 'b'] }
    expect(snapshotDiff(snapshot, { ...snapshot })).toEqual([])
  })

  it('reports each changed field once, sorted by field name', () => {
    const rows = snapshotDiff(
      { title: 'Old title', sortOrder: 1, published: false },
      { title: 'New title', sortOrder: 2, published: false },
    )

    expect(rows).toEqual([
      { field: 'sortOrder', before: '1', after: '2' },
      { field: 'title', before: 'Old title', after: 'New title' },
    ])
  })

  it('compares arrays and objects by their serialized value', () => {
    const rows = snapshotDiff(
      { technologies: ['React', 'CSS'], screenshots: [{ url: 'a' }] },
      { technologies: ['React', 'CSS', 'Node'], screenshots: [{ url: 'a' }] },
    )

    expect(rows).toEqual([
      {
        field: 'technologies',
        before: '["React","CSS"]',
        after: '["React","CSS","Node"]',
      },
    ])
  })

  it('includes fields that exist on only one side', () => {
    const rows = snapshotDiff({ removed: 'value' }, { added: 'value' })

    expect(rows).toEqual([
      { field: 'added', before: '—', after: 'value' },
      { field: 'removed', before: 'value', after: '—' },
    ])
  })
})

describe('formatSnapshotValue', () => {
  it('renders absent, null, and empty values as an em dash', () => {
    expect(formatSnapshotValue(undefined)).toBe('—')
    expect(formatSnapshotValue(null)).toBe('—')
    expect(formatSnapshotValue('')).toBe('—')
  })

  it('keeps strings verbatim and serializes everything else', () => {
    expect(formatSnapshotValue('plain text')).toBe('plain text')
    expect(formatSnapshotValue(false)).toBe('false')
    expect(formatSnapshotValue({ nested: true })).toBe('{"nested":true}')
  })
})
