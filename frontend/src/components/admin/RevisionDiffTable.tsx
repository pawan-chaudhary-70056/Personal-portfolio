import type { RevisionDiffRow } from '@/utils/revisionDiff'

interface RevisionDiffTableProps {
  rows: RevisionDiffRow[]
  caption: string
  /** Rendered when there are no rows; omit to render nothing. */
  emptyMessage?: string
  beforeLabel?: string
  afterLabel?: string
}

/** Field-level snapshot diff shared by the revision preview and comparison. */
export function RevisionDiffTable({
  rows,
  caption,
  emptyMessage,
  beforeLabel = 'Earlier',
  afterLabel = 'Later',
}: RevisionDiffTableProps) {
  if (rows.length === 0) {
    return emptyMessage ? (
      <p className="px-4 py-4 text-caption text-muted-light">{emptyMessage}</p>
    ) : null
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-charcoal/15">
            <th
              scope="col"
              className="px-4 py-2 text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              Field
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              {beforeLabel}
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-caption tracking-[0.14em] text-muted-light uppercase"
            >
              {afterLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field} className="border-b border-charcoal/10 align-top">
              <th scope="row" className="px-4 py-3 font-mono text-caption text-charcoal">
                {row.field}
              </th>
              <td className="max-w-xs px-4 py-3 text-caption break-words text-charcoal/70">
                {row.before}
              </td>
              <td className="max-w-xs px-4 py-3 text-caption break-words text-charcoal">
                {row.after}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
