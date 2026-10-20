const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

/** Formats an experience date range, e.g. “1 Feb 2025 — Present”. */
export function formatDateRange(start: string, end: string | null, isCurrent: boolean): string {
  const startLabel = formatDate(start)

  if (isCurrent) {
    return `${startLabel} — Present`
  }

  return end ? `${startLabel} — ${formatDate(end)}` : startLabel
}
