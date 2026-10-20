import type { ProjectStatus } from '@/@types/admin'
import { cn } from '@/utils/cn'

const statusClasses: Record<ProjectStatus, string> = {
  DRAFT: 'border-gold-ink/40 text-gold-ink',
  PUBLISHED: 'border-success/40 text-success-ink',
  ARCHIVED: 'border-charcoal/25 text-muted-light',
}

const statusLabels: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-caption tracking-wide uppercase',
        statusClasses[status],
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
