interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

const buttonClassName =
  'min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors ' +
  'duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40'

/** Shared list pagination used by every administrative collection. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-charcoal/15 pt-4"
    >
      <p aria-live="polite" className="text-caption text-muted-light">
        {total === 0 ? 'No results' : `Showing ${first}–${last} of ${total}`}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className={buttonClassName}
        >
          Previous
        </button>
        <p className="text-caption text-muted-light">
          Page {page} of {pageCount}
        </p>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= pageCount}
          className={buttonClassName}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
