import { cn } from '@/utils/cn'

/** Visibility state for content that is published or hidden from the site. */
export function VisibilityBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-caption tracking-wide uppercase',
        published ? 'border-success/40 text-success-ink' : 'border-charcoal/25 text-muted-light',
      )}
    >
      {published ? 'Published' : 'Hidden'}
    </span>
  )
}
