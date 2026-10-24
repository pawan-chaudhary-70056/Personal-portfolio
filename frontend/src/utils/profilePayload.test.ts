import { describe, expect, it } from 'vitest'
import { toProfileFormValues, toProfilePayload } from '@/utils/profilePayload'

describe('toProfilePayload', () => {
  const base = toProfileFormValues(null)

  it('sends a picked library portrait and clears the external URL', () => {
    const payload = toProfilePayload({
      ...base,
      portraitUrl: '',
      portraitMediaId: ' asset-1 ',
    })

    expect(payload.portraitMediaId).toBe('asset-1')
    expect(payload.portraitUrl).toBeNull()
  })

  it('gives a typed URL precedence over a stale library pick', () => {
    const payload = toProfilePayload({
      ...base,
      portraitUrl: ' https://example.com/me.png ',
      portraitMediaId: 'asset-1',
    })

    expect(payload.portraitUrl).toBe('https://example.com/me.png')
    expect(payload.portraitMediaId).toBeNull()
  })

  it('maps a stored portrait reference into the form values', () => {
    const values = toProfileFormValues({ portraitMediaId: 'asset-1' } as never)

    expect(values.portraitMediaId).toBe('asset-1')
  })
})
