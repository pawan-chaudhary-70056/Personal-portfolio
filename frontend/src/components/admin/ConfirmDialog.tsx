import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Uses the native <dialog> element so focus trapping, Escape handling, and
 * focus restoration are provided by the browser rather than reimplemented.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) {
          onCancel()
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) {
          onCancel()
        }
      }}
      className="m-auto w-[min(92vw,30rem)] border border-charcoal/20 bg-ivory p-0 text-charcoal backdrop:bg-charcoal/70"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-h3">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-3 text-body-sm text-charcoal/75">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 border border-charcoal/30 px-4 text-body-sm text-charcoal transition-colors duration-150 ease-standard hover:border-charcoal/60 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              destructive
                ? 'min-h-11 bg-error px-4 text-body-sm font-medium text-white transition-colors duration-150 ease-standard hover:bg-[#9c1e14] disabled:opacity-60'
                : 'min-h-11 bg-gold px-4 text-body-sm font-medium text-charcoal transition-colors duration-150 ease-standard hover:bg-[#d3bb8d] disabled:opacity-60'
            }
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
