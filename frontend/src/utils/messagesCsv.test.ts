import { describe, expect, it } from 'vitest'
import type { AdminMessage } from '@/@types/admin'
import { messagesToCsv } from '@/utils/messagesCsv'

const message: AdminMessage = {
  id: 'm1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Hello',
  message: 'A line 1\nA line 2',
  status: 'NEW',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  reviewedAt: null,
}

describe('messagesToCsv', () => {
  it('starts with a UTF-8 BOM and the documented header row', () => {
    const csv = messagesToCsv([message])

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('"Received","Name","Email","Subject","Message","Status"')
  })

  it('quotes fields and escapes embedded quotes', () => {
    const csv = messagesToCsv([{ ...message, subject: 'He said "hi"' }])

    expect(csv).toContain('"He said ""hi"""')
  })

  it('neutralises formula-like cells', () => {
    const csv = messagesToCsv([{ ...message, subject: '=1+1', message: '@SUM(A1)' }])

    expect(csv).toContain(`"'=1+1"`)
    expect(csv).toContain(`"'@SUM(A1)"`)
  })

  it('emits CRLF row separators and a trailing newline', () => {
    const csv = messagesToCsv([message])

    expect(csv.endsWith('\r\n')).toBe(true)
    expect(csv.split('\r\n')).toHaveLength(3)
  })
})
