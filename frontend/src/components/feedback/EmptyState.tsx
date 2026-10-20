import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-charcoal/15 px-6 py-12 text-center">
      <p className="font-serif text-h3 text-charcoal">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-body-sm text-charcoal/70">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
