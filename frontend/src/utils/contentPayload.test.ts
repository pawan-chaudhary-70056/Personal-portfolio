import { describe, expect, it } from 'vitest'
import {
  toExperienceFormValues,
  toExperiencePayload,
  toSkillPayload,
} from '@/utils/contentPayload'

describe('toSkillPayload', () => {
  it('trims input, nulls blank descriptions, and falls back to sortOrder 0', () => {
    const payload = toSkillPayload({
      name: '  TypeScript  ',
      category: '  Languages ',
      description: '   ',
      sortOrder: 'abc',
      published: true,
    })

    expect(payload).toEqual({
      name: 'TypeScript',
      category: 'Languages',
      description: null,
      sortOrder: 0,
      published: true,
    })
  })
})

describe('experience payload conversion', () => {
  const base = {
    role: 'Engineer',
    organization: 'Acme',
    employmentType: 'Full-time',
    location: '',
    description: '   ',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    isCurrent: false,
    sortOrder: '2',
    published: true,
  }

  it('forces a null end date while the role is current', () => {
    const payload = toExperiencePayload({ ...base, isCurrent: true })

    expect(payload.isCurrent).toBe(true)
    expect(payload.endDate).toBeNull()
  })

  it('keeps the end date for past roles and nulls blank optional fields', () => {
    const payload = toExperiencePayload(base)

    expect(payload).toMatchObject({
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      location: null,
      description: null,
      employmentType: 'Full-time',
      sortOrder: 2,
    })
  })

  it('slices ISO timestamps from the API down to a date input value', () => {
    expect(toExperienceFormValues({ startDate: '2025-01-01T00:00:00.000Z', endDate: null } as never))
      .toMatchObject({ startDate: '2025-01-01', endDate: '' })
  })
})
