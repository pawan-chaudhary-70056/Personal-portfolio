interface BulkActionsBarProps {
  count: number
  noun: string
  busy: boolean
  onPublish: () => void
  onUnpublish: () => void
  onDelete: () => void
  onClear: () => void
}

const buttonClassName =
  'min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors ' +
  'duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-40'

/** Shared selection toolbar; renders nothing until at least one row is selected. */
export function BulkActionsBar({
  count,
  noun,
  busy,
  onPublish,
  onUnpublish,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  if (count === 0) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-gold/60 bg-gold/10 px-4 py-3"
    >
      <p aria-live="polite" className="text-body-sm text-charcoal">
        {count} {noun}
        {count === 1 ? '' : 's'} selected
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onPublish} disabled={busy} className={buttonClassName}>
          Publish
        </button>
        <button type="button" onClick={onUnpublish} disabled={busy} className={buttonClassName}>
          Unpublish
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="min-h-11 border border-error/50 px-4 text-body-sm text-error transition-colors duration-150 ease-standard hover:border-error disabled:opacity-40"
        >
          Move to trash
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="min-h-11 px-2 text-caption text-charcoal/70 underline underline-offset-4 disabled:opacity-40"
        >
          Clear selection
        </button>
      </div>
    </div>
  )
}
