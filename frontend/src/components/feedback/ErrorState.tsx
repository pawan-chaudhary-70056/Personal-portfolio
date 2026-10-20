interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="border border-error/30 bg-error/5 px-4 py-3">
      <p className="text-body-sm text-error">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-11 border border-error/40 px-4 text-body-sm text-error transition-colors duration-150 ease-standard hover:border-error"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
