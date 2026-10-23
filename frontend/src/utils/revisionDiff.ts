export interface RevisionDiffRow {
  field: string
  before: string
  after: string
}

/** Snapshot values are JSON, so absent, null, and empty strings all read as empty. */
export function formatSnapshotValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

/** Compares two snapshots field by field; arrays compare by their serialized value. */
export function snapshotDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): RevisionDiffRow[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()

  return keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      field: key,
      before: formatSnapshotValue(before[key]),
      after: formatSnapshotValue(after[key]),
    }))
}
