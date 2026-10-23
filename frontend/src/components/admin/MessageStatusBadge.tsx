import type { MessageStatus } from '@/@types/admin'
import { cn } from '@/utils/cn'

const styles: Record<MessageStatus, string> = {
  NEW: 'border-gold-ink/40 bg-gold/10 text-gold-ink',
  READ: 'border-charcoal/25 text-muted-light',
  ARCHIVED: 'border-charcoal/15 bg-charcoal/5 text-muted-light',
}

const labels: Record<MessageStatus, string> = {
  NEW: 'New',
  READ: 'Read',
  ARCHIVED: 'Archived',
}

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-caption tracking-wide uppercase',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  )
}
