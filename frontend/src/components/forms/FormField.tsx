import type { ReactNode } from 'react'

interface FormFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ id, label, error, hint, required, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div>
      <label htmlFor={id} className="block text-body-sm font-medium text-charcoal">
        {label}
        {required ? (
          <span className="ml-1 text-gold-ink" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-caption text-muted-light">
          {hint}
        </p>
      ) : null}

      <div className="mt-2">{children}</div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
