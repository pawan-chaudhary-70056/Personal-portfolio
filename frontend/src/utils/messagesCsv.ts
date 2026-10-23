import type { AdminMessage } from '@/@types/admin'

const COLUMNS = ['Received', 'Name', 'Email', 'Subject', 'Message', 'Status'] as const

/**
 * Spreadsheet applications treat a cell starting with one of these characters
 * as a formula. Contact messages are untrusted input, so prefix those cells
 * with an apostrophe to stop CSV formula injection.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function escapeField(value: string): string {
  const guarded = FORMULA_PREFIX.test(value) ? `'${value}` : value
  return `"${guarded.replaceAll('"', '""')}"`
}

/**
 * Serialises messages to RFC 4180-style CSV. The UTF-8 BOM keeps accented
 * characters readable when the file is opened in Excel.
 */
export function messagesToCsv(messages: AdminMessage[]): string {
  const rows = messages.map((message) =>
    [
      message.createdAt,
      message.name,
      message.email,
      message.subject ?? '',
      message.message,
      message.status,
    ]
      .map(escapeField)
      .join(','),
  )

  return `\uFEFF${[COLUMNS.map(escapeField).join(','), ...rows].join('\r\n')}\r\n`
}

/** Triggers a browser download without leaving the admin session. */
export function downloadMessagesCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
