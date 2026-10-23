import { describe, expect, it } from 'vitest'
import { toFieldErrors } from '@/utils/apiErrors'

describe('toFieldErrors', () => {
  it('maps each issue to its top-level field, first message wins', () => {
    const errors = toFieldErrors([
      { path: 'title', message: 'Enter the title.' },
      { path: 'title', message: 'Ignored duplicate.' },
      { path: 'screenshots.0.url', message: 'Enter a valid URL.' },
    ])

    expect(errors).toEqual({
      title: 'Enter the title.',
      screenshots: 'Enter a valid URL.',
    })
  })

  it('returns an empty map for missing or unusable issues', () => {
    expect(toFieldErrors(undefined)).toEqual({})
    expect(toFieldErrors([{ path: '', message: 'Global error.' }])).toEqual({})
  })
})
